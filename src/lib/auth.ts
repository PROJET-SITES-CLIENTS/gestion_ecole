// ====================================================================
// AUTHENTIFICATION — sessions réelles (P0)
// - Mots de passe : scrypt (node:crypto), format scrypt$N$r$p$salt$hash
// - Sessions : table SessionUtilisateur (token aléatoire, hash stocké)
// - Cookie HttpOnly `sg_session`, expiration 8 h
// - Verrouillage : 5 échecs → 15 min de verrouillage
// - Chaque tentative journalisée dans TentativeConnexion
// ====================================================================

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export const SESSION_COOKIE = 'sg_session';
const SESSION_DUREE_MS = 8 * 60 * 60 * 1000; // 8 heures
const MAX_TENTATIVES = 5;
const VERROU_MS = 15 * 60 * 1000; // 15 minutes

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// --------------------------------------------------------------------
// Mots de passe (scrypt)
// --------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const N = 16384, r = 8, p = 1;
  const hash = scryptSync(password, salt, 64, { N, r, p }).toString('hex');
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts[0] !== 'scrypt' || parts.length !== 6) return false;
    const [, N, r, p, salt, hash] = parts;
    const calc = scryptSync(password, salt, 64, { N: Number(N), r: Number(r), p: Number(p) });
    const attendu = Buffer.from(hash, 'hex');
    return calc.length === attendu.length && timingSafeEqual(calc, attendu);
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------
// Sessions
// --------------------------------------------------------------------

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Crée une session en base + pose le cookie HttpOnly. */
export async function creerSession(utilisateurId: string, userAgent?: string) {
  const token = randomBytes(32).toString('hex');
  const expiration = new Date(Date.now() + SESSION_DUREE_MS);
  await db.sessionUtilisateur.create({
    data: {
      utilisateurId,
      tokenHash: sha256(token),
      userAgent: userAgent?.slice(0, 255),
      dateDerniereActivite: new Date(),
      dateExpiration: expiration,
      active: true,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiration,
  });
  return token;
}

export type SessionInfo = {
  utilisateur: {
    id: string;
    ecoleId: string | null;
    email: string;
    nom: string;
    prenom: string;
    type: string; // super_admin/personnel/parent/eleve
  };
  permissions: Set<string>;
  roles: string[]; // codes des rôles actifs (direction, comptabilite, rh…)
  sessionId: string;
};

/** Lit la session courante (cookie → base). Retourne null si absente/expirée. */
export async function getSessionCourante(): Promise<SessionInfo | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.sessionUtilisateur.findFirst({
    where: { tokenHash: sha256(token), active: true, dateExpiration: { gt: new Date() } },
  });
  if (!session) return null;

  const utilisateur = await db.utilisateur.findFirst({
    where: { id: session.utilisateurId, actif: true, deletedAt: null },
    include: {
      roles: {
        where: { OR: [{ dateFin: null }, { dateFin: { gt: new Date() } }] },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      },
    },
  });
  if (!utilisateur) return null;

  const permissions = new Set<string>();
  const roles: string[] = [];
  if (utilisateur.type === 'super_admin') {
    // Le super-admin éditeur possède toutes les permissions de la plateforme.
    const toutes = await db.permission.findMany({ select: { code: true } });
    for (const p of toutes) permissions.add(p.code);
  }
  for (const ur of utilisateur.roles) {
    roles.push(ur.role.code);
    for (const rp of ur.role.permissions) permissions.add(rp.permission.code);
  }

  // Activité rafraîchie (pas bloquant si échec)
  db.sessionUtilisateur
    .update({ where: { id: session.id }, data: { dateDerniereActivite: new Date() } })
    .catch(() => {});

  return {
    utilisateur: {
      id: utilisateur.id,
      ecoleId: utilisateur.ecoleId,
      email: utilisateur.email,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      type: utilisateur.type,
    },
    permissions,
    roles,
    sessionId: session.id,
  };
}

/** Session obligatoire — lève AuthError sinon. */
export async function requireSession(): Promise<SessionInfo> {
  const s = await getSessionCourante();
  if (!s) throw new AuthError('Session expirée ou absente. Veuillez vous reconnecter.');
  return s;
}

/** Déconnecte : invalide la session en base + supprime le cookie. */
export async function detruireSessionCourante() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.sessionUtilisateur.updateMany({
      where: { tokenHash: sha256(token), active: true },
      data: { active: false, expireManuellement: true, dateExpiration: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
}

// --------------------------------------------------------------------
// Connexion (avec verrouillage + journalisation)
// --------------------------------------------------------------------

export type ResultatConnexion = { ok: true } | { ok: false; erreur: string };

export async function tenterConnexion(email: string, motDePasse: string, userAgent?: string): Promise<ResultatConnexion> {
  const emailNorm = email.trim().toLowerCase();
  await db.tentativeConnexion.create({
    data: { email: emailNorm, userAgent: userAgent?.slice(0, 255), succes: false, motifEchec: 'tentative' },
  }).catch(() => {});

  const utilisateur = await db.utilisateur.findFirst({
    where: { email: emailNorm, deletedAt: null },
  });

  if (!utilisateur || !utilisateur.actif) {
    return { ok: false, erreur: 'Identifiants incorrects.' };
  }

  if (utilisateur.verrouilleJusqua && utilisateur.verrouilleJusqua > new Date()) {
    const minutes = Math.ceil((utilisateur.verrouilleJusqua.getTime() - Date.now()) / 60000);
    return { ok: false, erreur: `Compte verrouillé. Réessayez dans ${minutes} minute(s).` };
  }

  if (!verifyPassword(motDePasse, utilisateur.motDePasseHash)) {
    const echecs = utilisateur.tentativesEchouees + 1;
    const verrou = echecs >= MAX_TENTATIVES ? new Date(Date.now() + VERROU_MS) : null;
    await db.utilisateur.update({
      where: { id: utilisateur.id },
      data: { tentativesEchouees: echecs, verrouilleJusqua: verrou },
    });
    if (verrou) {
      return { ok: false, erreur: `Trop de tentatives échouées. Compte verrouillé ${MAX_TENTATIVES > 0 ? '15 minutes' : ''}.` };
    }
    return { ok: false, erreur: 'Identifiants incorrects.' };
  }

  // Succès : réinitialisation des compteurs, session, journalisation
  await db.utilisateur.update({
    where: { id: utilisateur.id },
    data: { tentativesEchouees: 0, verrouilleJusqua: null, derniereConnexion: new Date() },
  });
  await db.tentativeConnexion.create({
    data: { utilisateurId: utilisateur.id, email: emailNorm, userAgent: userAgent?.slice(0, 255), succes: true },
  }).catch(() => {});
  await creerSession(utilisateur.id, userAgent);
  return { ok: true };
}

/** Portails disponibles (un par métier de l'école). */
export type PortailUtilisateur =
  | 'super_admin' | 'direction' | 'enseignant' | 'parent' | 'eleve'
  | 'comptabilite' | 'rh' | 'vie_scolaire' | 'secretariat' | 'sante' | 'assistant';

/** Rôle formel (Role.code) → portail dédié. Priorité décroissante. */
const PORTAIL_PAR_ROLE: [string, PortailUtilisateur][] = [
  ['direction', 'direction'],
  ['assistant_direction', 'assistant'],
  ['comptabilite', 'comptabilite'],
  ['rh', 'rh'],
  ['censeur', 'vie_scolaire'],
  ['surveillant', 'vie_scolaire'],
  ['secretariat', 'secretariat'],
  ['infirmier', 'sante'],
  ['enseignant', 'enseignant'],
];

/** Portail dérivé du compte : le RÔLE formel d'abord, repli sur les permissions. */
export function portailDuCompte(type: string, permissions: Set<string>, roles: string[] = []): PortailUtilisateur {
  switch (type) {
    case 'super_admin': return 'super_admin';
    case 'parent': return 'parent';
    case 'eleve': return 'eleve';
    default: {
      // 1) Le rôle formellement attribué détermine le portail métier.
      for (const [code, portail] of PORTAIL_PAR_ROLE) {
        if (roles.includes(code)) return portail;
      }
      // 2) Repli heuristique pour les comptes sans rôle (compatibilité).
      if (permissions.has('rh.gerer') || permissions.has('finances.voir') || permissions.has('admin.saas')) return 'direction';
      return 'enseignant';
    }
  }
}
