// ====================================================================
// GESTION DES COMPTES — inscription publique + validation direction
// + création directe de comptes élèves/parents par l'administration
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, avecVerrou } from './commun';
import { hashPassword } from '@/lib/auth-hash';

// --------------------------------------------------------------------
// INSCRIPTION PUBLIQUE (sans session → file d'attente direction)
// --------------------------------------------------------------------

export type InscriptionInput = {
  ecoleSlug: string;
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  type: 'personnel' | 'parent' | 'eleve';
  roleDemande?: string;
  motivation?: string;
  telephone?: string;
  ip?: string;
};

export async function demanderCompteCore(input: InscriptionInput) {
  const école = await db.ecole.findUnique({ where: { slug: input.ecoleSlug } });
  if (!école || ['suspendu', 'resilie'].includes(école.statut)) {
    throw new ActionError('Établissement introuvable ou non ouvert aux inscriptions.', 'INTROUVABLE');
  }

  // Validations
  const email = input.email?.trim().toLowerCase() ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ActionError('Email invalide.', 'CHAMP_INVALIDE');
  if (input.motDePasse?.length < 8) throw new ActionError('Le mot de passe doit comporter au moins 8 caractères.', 'MDP_FAIBLE');
  if (!input.nom?.trim() || !input.prenom?.trim()) throw new ActionError('Nom et prénom obligatoires.', 'CHAMP_MANQUANT');
  if (!['personnel', 'parent', 'eleve'].includes(input.type)) throw new ActionError('Type de compte invalide.', 'CHAMP_INVALIDE');
  if (input.type === 'personnel' && !input.roleDemande) {
    throw new ActionError('Indiquez le rôle souhaité (enseignant, comptable…).', 'CHAMP_MANQUANT');
  }

  // Throttle : max 3 demandes / 24h / IP
  if (input.ip) {
    const dernières24h = new Date(Date.now() - 86400000);
    const nb = await db.demandeCompte.count({
      where: { sourceIp: input.ip, dateDemande: { gte: dernières24h } },
    });
    if (nb >= 3) throw new ActionError('Trop de demandes depuis cette adresse. Réessayez demain.', 'LIMITE_ATTEINTE');
  }

  // Email déjà pris (compte actif OU demande en attente)
  const existant = await db.utilisateur.findFirst({ where: { email, deletedAt: null } });
  if (existant) {
    // Si compte en attente → message spécifique
    if (!existant.actif) {
      throw new ActionError('Une demande avec cet email est déjà en attente de validation.', 'DEJA_EXISTANT');
    }
    throw new ActionError('Un compte avec cet email existe déjà. Connectez-vous.', 'EMAIL_PRIS');
  }

  // Créer le compte INACTIF + la demande
  return avecVerrou('compte:demande', () => db.$transaction(async (tx) => {
    const utilisateur = await tx.utilisateur.create({
      data: {
        ecoleId: école.id,
        email,
        motDePasseHash: hashPassword(input.motDePasse),
        nom: input.nom.trim(),
        prenom: input.prenom.trim(),
        telephone: input.telephone?.trim() || null,
        type: input.type,
        actif: false, // ⬅️ EN ATTENTE — activé par la direction
      },
    });
    const demande = await tx.demandeCompte.create({
      data: {
        ecoleId: école.id,
        utilisateurId: utilisateur.id,
        type: input.type,
        roleDemande: input.roleDemande?.trim() || null,
        motivation: input.motivation?.trim() || null,
        statut: 'en_attente',
        sourceIp: input.ip ?? null,
      },
    });
    return { demandeId: demande.id, email };
  }, { timeout: 30000, maxWait: 10000 }));
}

// --------------------------------------------------------------------
// VALIDATION PAR LA DIRECTION (approuver / refuser)
// --------------------------------------------------------------------

export async function traiterDemandeCompteCore(ctx: Ctx, demandeId: string, decision: 'approuve' | 'refuse', motifRefus?: string, roleADonner?: string) {
  assertPermission(ctx, 'securite.gerer');
  const demande = await db.demandeCompte.findUnique({
    where: { id: demandeId },
    include: { utilisateur: true },
  });
  if (!demande) throw new ActionError('Demande introuvable.', 'INTROUVABLE');
  assertTenant(demande.ecoleId, ctx, 'Cette demande');
  if (demande.statut !== 'en_attente') throw new ActionError('Demande déjà traitée.', 'DEJA_TRAITE');

  await db.$transaction(async (tx) => {
    if (decision === 'approuve') {
      // Activer le compte
      await tx.utilisateur.update({
        where: { id: demande.utilisateurId },
        data: { actif: true },
      });
      // Si personnel + rôle spécifié → attribuer le rôle
      if (demande.type === 'personnel' && (roleADonner || demande.roleDemande)) {
        const role = await tx.role.findFirst({
          where: { ecoleId: demande.ecoleId, code: (roleADonner ?? demande.roleDemande) as string },
        });
        if (role) {
          await tx.utilisateurRole.upsert({
            where: { utilisateurId_roleId: { utilisateurId: demande.utilisateurId, roleId: role.id } },
            create: { utilisateurId: demande.utilisateurId, roleId: role.id },
            update: {},
          });
        }
      }
      // Si parent → créer le profil ParentTuteur
      if (demande.type === 'parent') {
        const existant = await tx.parentTuteur.findFirst({ where: { utilisateurId: demande.utilisateurId } });
        if (!existant) {
          await tx.parentTuteur.create({
            data: {
              ecoleId: demande.ecoleId,
              utilisateurId: demande.utilisateurId,
              nom: demande.utilisateur.nom,
              prenom: demande.utilisateur.prenom,
              email: demande.utilisateur.email,
              telephone: demande.utilisateur.telephone,
              lienAvecEleve: 'tuteur_legal',
            },
          });
        }
      }
    } else {
      // Refus : désactiver définitivement
      await tx.utilisateur.update({
        where: { id: demande.utilisateurId },
        data: { actif: false, deletedAt: new Date() },
      });
    }
    await tx.demandeCompte.update({
      where: { id: demandeId },
      data: {
        statut: decision,
        dateDecision: new Date(),
        traiteParId: ctx.utilisateurId,
        motifRefus: motifRefus?.trim() || null,
      },
    });
    // Notifier la personne
    await tx.notification.create({
      data: {
        ecoleId: demande.ecoleId,
        destinataireId: demande.utilisateurId,
        destinataireType: demande.type,
        sujet: decision === 'approuve' ? '✅ Votre compte a été validé' : '❌ Votre demande a été refusée',
        corps: decision === 'approuve'
          ? `Bienvenue ${demande.utilisateur.prenom} ! Votre compte est maintenant actif — vous pouvez vous connecter.`
          : `Votre demande d'accès a été refusée. ${motifRefus ?? ''}`.trim(),
        canal: 'in_app',
        statut: 'envoye',
        dateEnvoi: new Date(),
      },
    }).catch(() => {});
  }, { timeout: 30000, maxWait: 10000 });

  await logAction(db, demande.ecoleId, ctx.utilisateurId, `compte.${decision}`, 'demande_compte', demandeId, {
    email: demande.utilisateur.email,
    type: demande.type,
  });
  return { demandeId, decision };
}

// --------------------------------------------------------------------
// CRÉATION DIRECTE par l'administration (élèves et parents)
// --------------------------------------------------------------------

/** Crée le compte portail pour un ÉLÈVE déjà inscrit. */
export async function creerCompteEleveCore(ctx: Ctx, eleveId: string, email: string, motDePasse: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await db.eleve.findUnique({ where: { id: eleveId }, include: { ecole: true } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  if (eleve.utilisateurId) throw new ActionError('Cet élève a déjà un compte portail.', 'DEJA_EXISTANT');
  const emailNorm = email?.trim().toLowerCase() ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) throw new ActionError('Email invalide.', 'CHAMP_INVALIDE');
  if (motDePasse?.length < 8) throw new ActionError('Le mot de passe doit comporter au moins 8 caractères.', 'MDP_FAIBLE');
  const existant = await db.utilisateur.findFirst({ where: { email: emailNorm, deletedAt: null } });
  if (existant) throw new ActionError('Un compte avec cet email existe déjà.', 'EMAIL_PRIS');

  const u = await db.utilisateur.create({
    data: {
      ecoleId: eleve.ecoleId,
      email: emailNorm,
      motDePasseHash: hashPassword(motDePasse),
      nom: eleve.nom,
      prenom: eleve.prenom,
      type: 'eleve',
      actif: true, // créé par l'admin → actif immédiatement
      consentementPortail: true,
      consentementDate: new Date(),
    },
  });
  await db.eleve.update({ where: { id: eleveId }, data: { utilisateurId: u.id } });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'compte.eleve_cree', 'eleve', eleveId, { email: emailNorm });
  return { utilisateurId: u.id, email: emailNorm };
}

/** Crée le compte portail pour un PARENT déjà rattaché à un élève. */
export async function creerCompteParentCore(ctx: Ctx, parentId: string, email: string, motDePasse: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const parent = await db.parentTuteur.findUnique({ where: { id: parentId }, include: { eleves: { include: { eleve: true } } } });
  if (!parent) throw new ActionError('Parent introuvable.', 'INTROUVABLE');
  assertTenant(parent.ecoleId, ctx, 'Ce parent');
  if (parent.utilisateurId) throw new ActionError('Ce parent a déjà un compte portail.', 'DEJA_EXISTANT');
  const emailNorm = email?.trim().toLowerCase() ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) throw new ActionError('Email invalide.', 'CHAMP_INVALIDE');
  if (motDePasse?.length < 8) throw new ActionError('Le mot de passe doit comporter au moins 8 caractères.', 'MDP_FAIBLE');
  const existant = await db.utilisateur.findFirst({ where: { email: emailNorm, deletedAt: null } });
  if (existant) throw new ActionError('Un compte avec cet email existe déjà.', 'EMAIL_PRIS');

  const u = await db.utilisateur.create({
    data: {
      ecoleId: parent.ecoleId,
      email: emailNorm,
      motDePasseHash: hashPassword(motDePasse),
      nom: parent.nom,
      prenom: parent.prenom,
      telephone: parent.telephone,
      type: 'parent',
      actif: true,
      consentementPortail: true,
      consentementDate: new Date(),
    },
  });
  await db.parentTuteur.update({ where: { id: parentId }, data: { utilisateurId: u.id, email: emailNorm } });
  await logAction(db, parent.ecoleId, ctx.utilisateurId, 'compte.parent_cree', 'parent_tuteur', parentId, { email: emailNorm });
  return { utilisateurId: u.id, email: emailNorm };
}
