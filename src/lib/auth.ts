// ====================================================================
// AUTHENTIFICATION — sessions, 2FA TOTP, anti-énumération, comptes en attente
// ====================================================================

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, genererCodesSecours, genererSecretTotp } from './auth-hash';
export { hashPassword, verifyPassword, genererCodesSecours, genererSecretTotp };

export const SESSION_COOKIE = 'sg_session';
const SESSION_DUREE_MS = 8 * 60 * 60 * 1000;
const MAX_TENTATIVES = 5;
const VERROU_MS = 15 * 60 * 1000;
const MAX_ECHECS_IP = 20;
const FENETRE_IP_MS = 15 * 60 * 1000;
const JETON_2FA_MS = 5 * 60 * 1000;

export class AuthError extends Error {
  constructor(message: string) { super(message); this.name = 'AuthError'; }
}

// ═══ Sessions ═══

function sha256(s: string): string { return createHash('sha256').update(s).digest('hex'); }

export async function creerSession(utilisateurId: string, userAgent?: string, adresseIp?: string) {
  const token = randomBytes(32).toString('hex');
  const expiration = new Date(Date.now() + SESSION_DUREE_MS);
  await db.sessionUtilisateur.create({
    data: {
      utilisateurId, tokenHash: sha256(token),
      userAgent: userAgent?.slice(0, 255), adresseIp: adresseIp?.slice(0, 64),
      dateDerniereActivite: new Date(), dateExpiration: expiration, active: true,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/', expires: expiration,
  });
  return token;
}

export type SessionInfo = {
  utilisateur: { id: string; ecoleId: string | null; email: string; nom: string; prenom: string; type: string };
  permissions: Set<string>;
  roles: string[];
  sessionId: string;
};

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
      ecole: { select: { statut: true } },
      roles: {
        where: { OR: [{ dateFin: null }, { dateFin: { gt: new Date() } }] },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      },
    },
  });
  if (!utilisateur) return null;
  if (utilisateur.type !== 'super_admin' && utilisateur.ecole && ['suspendu', 'resilie'].includes(utilisateur.ecole.statut)) return null;

  const permissions = new Set<string>();
  const roles: string[] = [];
  if (utilisateur.type === 'super_admin') {
    const toutes = await db.permission.findMany({ select: { code: true } });
    for (const p of toutes) permissions.add(p.code);
  }
  for (const ur of utilisateur.roles) {
    roles.push(ur.role.code);
    for (const rp of ur.role.permissions) permissions.add(rp.permission.code);
  }
  db.sessionUtilisateur.update({ where: { id: session.id }, data: { dateDerniereActivite: new Date() } }).catch(() => {});
  return {
    utilisateur: { id: utilisateur.id, ecoleId: utilisateur.ecoleId, email: utilisateur.email, nom: utilisateur.nom, prenom: utilisateur.prenom, type: utilisateur.type },
    permissions, roles, sessionId: session.id,
  };
}

export async function requireSession(): Promise<SessionInfo> {
  const s = await getSessionCourante();
  if (!s) throw new AuthError('Session expirée ou absente. Veuillez vous reconnecter.');
  return s;
}

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

// ═══ TOTP (RFC 6238) ═══

const ALPHABET_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(s: string): Buffer {
  let bits = '';
  for (const c of s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')) {
    const idx = ALPHABET_BASE32.indexOf(c);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const octets: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) octets.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(octets);
}

function codeTotp(secretBase32: string, compteur: number): string {
  const cle = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(compteur / 2 ** 32), 0);
  buf.writeUInt32BE(compteur % 2 ** 32, 4);
  const hmac = createHmac('sha1', cle).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binaire = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(binaire % 1_000_000).padStart(6, '0');
}

export function verifierCodeTotp(secretBase32: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const pas = Math.floor(Date.now() / 30000);
  for (const delta of [-1, 0, 1]) {
    if (timingSafeEqual(Buffer.from(codeTotp(secretBase32, pas + delta)), Buffer.from(code))) return true;
  }
  return false;
}

// ═══ Connexion ═══

export type ResultatConnexion =
  | { ok: true }
  | { ok: false; erreur: string }
  | { ok: false; besoin2FA: true; jetonChallenge: string };

const MESSAGE_UNIQUE = 'Identifiants incorrects.';
const HASH_FACTICE = hashPassword('absorbe-le-temps-de-calcul');

async function ipSaturee(adresseIp: string | undefined): Promise<boolean> {
  if (!adresseIp) return false;
  const recents = await db.tentativeConnexion.count({
    where: { adresseIp, succes: false, date: { gte: new Date(Date.now() - FENETRE_IP_MS) } },
  });
  return recents >= MAX_ECHECS_IP;
}

export async function tenterConnexion(
  email: string, motDePasse: string, userAgent?: string, adresseIp?: string,
): Promise<ResultatConnexion> {
  const emailNorm = email.trim().toLowerCase();

  if (await ipSaturee(adresseIp)) {
    await db.tentativeConnexion.create({
      data: { email: emailNorm, userAgent: userAgent?.slice(0, 255), adresseIp, succes: false, motifEchec: 'ip_throttle' },
    }).catch(() => {});
    return { ok: false, erreur: 'Trop de tentatives depuis cette adresse. Réessayez dans un quart d\'heure.' };
  }

  const utilisateur = await db.utilisateur.findFirst({ where: { email: emailNorm, deletedAt: null } });

  if (!utilisateur) {
    verifyPassword(motDePasse, HASH_FACTICE);
    await db.tentativeConnexion.create({
      data: { email: emailNorm, userAgent: userAgent?.slice(0, 255), adresseIp, succes: false, motifEchec: 'compte_inconnu' },
    }).catch(() => {});
    return { ok: false, erreur: MESSAGE_UNIQUE };
  }

  if (!utilisateur.actif) {
    verifyPassword(motDePasse, HASH_FACTICE);
    return { ok: false, erreur: 'Votre compte est en attente de validation par l\'administration.' };
  }

  if (utilisateur.type !== 'super_admin' && utilisateur.ecoleId) {
    const ecole = await db.ecole.findUnique({ where: { id: utilisateur.ecoleId }, select: { statut: true } });
    if (ecole && ['suspendu', 'resilie'].includes(ecole.statut)) {
      return { ok: false, erreur: 'L\'établissement est momentanément indisponible.' };
    }
  }

  if (utilisateur.verrouilleJusqua && utilisateur.verrouilleJusqua > new Date()) {
    verifyPassword(motDePasse, HASH_FACTICE);
    return { ok: false, erreur: MESSAGE_UNIQUE };
  }

  if (!verifyPassword(motDePasse, utilisateur.motDePasseHash)) {
    const echecs = utilisateur.tentativesEchouees + 1;
    const verrou = echecs >= MAX_TENTATIVES ? new Date(Date.now() + VERROU_MS) : null;
    await db.utilisateur.update({ where: { id: utilisateur.id }, data: { tentativesEchouees: echecs, verrouilleJusqua: verrou } });
    await db.tentativeConnexion.create({
      data: { utilisateurId: utilisateur.id, email: emailNorm, userAgent: userAgent?.slice(0, 255), adresseIp, succes: false, motifEchec: 'mot_de_passe' },
    }).catch(() => {});
    return { ok: false, erreur: MESSAGE_UNIQUE };
  }

  if (!utilisateur.twofaActive && utilisateur.ecoleId) {
    const r = await db.utilisateurRole.findMany({
      where: { utilisateurId: utilisateur.id, OR: [{ dateFin: null }, { dateFin: { gt: new Date() } }] },
      include: { role: true },
    });
    if (r.some((ur) => ur.role.twofaRequis)) {
      return { ok: false, erreur: 'Double authentification obligatoire pour votre rôle. Contactez la direction.' };
    }
  }

  if (utilisateur.twofaActive) {
    const methode = await db.twoFactorMethod.findFirst({
      where: { utilisateurId: utilisateur.id, methode: 'totp', actif: true, secret: { not: null } },
    });
    if (methode?.secret) {
      const jeton = await db.jetonAuth.create({
        data: {
          utilisateurId: utilisateur.id, email: emailNorm, type: '2fa_challenge',
          tokenHash: sha256(randomBytes(32).toString('hex')),
          expireLe: new Date(Date.now() + JETON_2FA_MS),
        },
      });
      await db.utilisateur.update({ where: { id: utilisateur.id }, data: { tentativesEchouees: 0, verrouilleJusqua: null } });
      return { ok: false, besoin2FA: true, jetonChallenge: jeton.id };
    }
  }

  await db.utilisateur.update({
    where: { id: utilisateur.id },
    data: { tentativesEchouees: 0, verrouilleJusqua: null, derniereConnexion: new Date() },
  });
  await db.tentativeConnexion.create({
    data: { utilisateurId: utilisateur.id, email: emailNorm, userAgent: userAgent?.slice(0, 255), adresseIp, succes: true },
  }).catch(() => {});
  await creerSession(utilisateur.id, userAgent, adresseIp);
  return { ok: true };
}

export async function validerDefi2FA(jetonChallenge: string, code: string, userAgent?: string, adresseIp?: string): Promise<ResultatConnexion> {
  const jeton = await db.jetonAuth.findUnique({ where: { id: jetonChallenge } });
  if (!jeton || jeton.type !== '2fa_challenge' || jeton.utilise || jeton.expireLe < new Date() || !jeton.utilisateurId) {
    return { ok: false, erreur: 'Défi expiré. Reconnectez-vous.' };
  }
  const utilisateur = await db.utilisateur.findUnique({
    where: { id: jeton.utilisateurId },
    include: { ecole: { select: { statut: true } } },
  });
  if (!utilisateur || !utilisateur.actif) return { ok: false, erreur: MESSAGE_UNIQUE };
  if (utilisateur.type !== 'super_admin' && utilisateur.ecole && ['suspendu', 'resilie'].includes(utilisateur.ecole.statut)) {
    return { ok: false, erreur: 'Établissement indisponible.' };
  }

  let codeValide = false;
  const methode = await db.twoFactorMethod.findFirst({
    where: { utilisateurId: utilisateur.id, methode: 'totp', actif: true, secret: { not: null } },
  });
  if (methode?.secret) codeValide = verifierCodeTotp(methode.secret, code.trim().replace(/\s/g, ''));
  if (!codeValide) {
    const codeHash = sha256(code.trim().toUpperCase().replace(/\s/g, ''));
    const secours = await db.twoFactorBackupCode.findFirst({ where: { utilisateurId: utilisateur.id, codeHash, utilise: false } });
    if (secours) {
      await db.twoFactorBackupCode.update({ where: { id: secours.id }, data: { utilise: true, dateUtilisation: new Date() } });
      codeValide = true;
    }
  }
  if (!codeValide) return { ok: false, erreur: 'Code incorrect.' };

  await db.jetonAuth.update({ where: { id: jetonChallenge }, data: { utilise: true, dateUtilisation: new Date() } });
  await db.twoFactorMethod.updateMany({ where: { utilisateurId: utilisateur.id, methode: 'totp' }, data: { derniereUtilisation: new Date() } });
  await db.utilisateur.update({ where: { id: utilisateur.id }, data: { tentativesEchouees: 0, verrouilleJusqua: null, derniereConnexion: new Date() } });
  await creerSession(utilisateur.id, userAgent, adresseIp);
  return { ok: true };
}

export async function initierActivation2FA(ctx: { utilisateurId: string }) {
  const secret = genererSecretTotp();
  const existante = await db.twoFactorMethod.findFirst({ where: { utilisateurId: ctx.utilisateurId, methode: 'totp' } });
  if (existante && existante.actif) throw new AuthError('La 2FA est déjà active.');
  if (existante) await db.twoFactorMethod.update({ where: { id: existante.id }, data: { secret, actif: false } });
  else await db.twoFactorMethod.create({ data: { utilisateurId: ctx.utilisateurId, methode: 'totp', secret, actif: false } });
  return { secret };
}

export async function confirmerActivation2FA(ctx: { utilisateurId: string }, code: string) {
  const methode = await db.twoFactorMethod.findFirst({ where: { utilisateurId: ctx.utilisateurId, methode: 'totp', actif: false } });
  if (!methode?.secret) throw new AuthError('Aucune activation en cours.');
  if (!verifierCodeTotp(methode.secret, code.trim())) throw new AuthError('Code incorrect.');
  await db.$transaction(async (tx) => {
    await tx.twoFactorMethod.update({ where: { id: methode.id }, data: { actif: true, dateActivation: new Date() } });
    await tx.utilisateur.update({ where: { id: ctx.utilisateurId }, data: { twofaActive: true } });
    await tx.twoFactorBackupCode.deleteMany({ where: { utilisateurId: ctx.utilisateurId, utilise: false } });
    const codes = genererCodesSecours();
    await tx.twoFactorBackupCode.createMany({ data: codes.map((c) => ({ utilisateurId: ctx.utilisateurId, codeHash: sha256(c) })) });
  });
  return { actif: true, nbCodesSecours: 10 };
}

export async function desactiver2FA(ctx: { utilisateurId: string }, motDePasse: string) {
  const utilisateur = await db.utilisateur.findUnique({ where: { id: ctx.utilisateurId } });
  if (!utilisateur || !verifyPassword(motDePasse, utilisateur.motDePasseHash)) throw new AuthError('Mot de passe incorrect.');
  await db.$transaction(async (tx) => {
    await tx.twoFactorMethod.updateMany({ where: { utilisateurId: ctx.utilisateurId }, data: { actif: false } });
    await tx.utilisateur.update({ where: { id: ctx.utilisateurId }, data: { twofaActive: false } });
  });
  return { actif: false };
}

export type PortailUtilisateur =
  | 'super_admin' | 'direction' | 'enseignant' | 'parent' | 'eleve'
  | 'comptabilite' | 'rh' | 'vie_scolaire' | 'secretariat' | 'sante' | 'assistant';

const PORTAIL_PAR_ROLE: [string, PortailUtilisateur][] = [
  ['direction', 'direction'], ['assistant_direction', 'assistant'],
  ['comptabilite', 'comptabilite'], ['rh', 'rh'],
  ['censeur', 'vie_scolaire'], ['surveillant', 'vie_scolaire'],
  ['secretariat', 'secretariat'], ['infirmier', 'sante'], ['enseignant', 'enseignant'],
];

export function portailDuCompte(type: string, permissions: Set<string>, roles: string[] = []): PortailUtilisateur {
  switch (type) {
    case 'super_admin': return 'super_admin';
    case 'parent': return 'parent';
    case 'eleve': return 'eleve';
    default: {
      for (const [code, portail] of PORTAIL_PAR_ROLE) {
        if (roles.includes(code)) return portail;
      }
      if (permissions.has('rh.gerer') || permissions.has('finances.voir') || permissions.has('admin.saas')) return 'direction';
      return 'enseignant';
    }
  }
}
