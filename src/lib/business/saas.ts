// ====================================================================
// MÉTIER SAAS + COMMUNICATION + EXAMENS + SALLES + RDV
// - F4  : onboarding COMPLET (l'école créée est immédiatement utilisable :
//         année, périodes, niveaux, classes, rôles, permissions, compte
//         direction avec mot de passe temporaire), facturation mensuelle
//         idempotente, changement de plan, quotas (via eleves.ts)
// - F16 : montants en centimes (Int)
// - F13 : réservation/annulation de RDV par le PARENT (identité résolue
//         côté serveur — jamais depuis le formulaire)
// - F19 : numéros de table d'examen sans doublon entre lots
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, notifierParentsEtDirection, avecVerrou } from './commun';
import { hashPassword, genererMotDePasse } from '@/lib/auth-hash';
import { CIBLES_NOTIFICATION } from '@/lib/constants';

// --------------------------------------------------------------------
// SaaS éditeur — création AVEC onboarding complet (F4)
// --------------------------------------------------------------------

export type EcoleClientInput = {
  nom: string;
  slug: string;
  planId?: string;
  pays?: string;
  devise?: string;
  emailDirection?: string; // compte direction à créer
  motDePasseDirection?: string; // sinon généré aléatoirement et retourné UNE fois
};

/** Catalogue standard des permissions (miroir du seed — F8 ajoute finances.ecrire). */
export const PERMISSIONS_STANDARDS: Array<{ code: string; libelle: string; module: string }> = [
  { code: 'eleves.lire', libelle: 'Consulter les élèves', module: 'eleves' },
  { code: 'eleves.ecrire', libelle: 'Gérer les élèves', module: 'eleves' },
  { code: 'notes.saisir', libelle: 'Saisir les notes', module: 'pedagogie' },
  { code: 'bulletins.valider', libelle: 'Valider/publier les bulletins', module: 'pedagogie' },
  { code: 'finances.voir', libelle: 'Consulter les finances', module: 'finances' },
  { code: 'finances.ecrire', libelle: 'Opérations financières (encaissements, frais)', module: 'finances' },
  { code: 'finances.valider', libelle: 'Valider les dépenses', module: 'finances' },
  { code: 'presences.saisir', libelle: 'Faire l\'appel', module: 'presences' },
  { code: 'rh.gerer', libelle: 'Gérer le personnel', module: 'rh' },
  { code: 'communication.envoyer', libelle: 'Envoyer des communications', module: 'communication' },
  { code: 'admin.saas', libelle: 'Administration SaaS', module: 'saas' },
  { code: 'vie_scolaire.gerer', libelle: 'Gérer vie scolaire et discipline', module: 'vie_scolaire' },
  { code: 'securite.gerer', libelle: 'Gérer la sécurité du site', module: 'securite' },
  { code: 'examens.gerer', libelle: 'Gérer les examens officiels', module: 'examens' },
  { code: 'services.gerer', libelle: 'Gérer cantine/biblio/manuels', module: 'services' },
  { code: 'edt.gerer', libelle: 'Gérer l\'emploi du temps', module: 'edt' },
  { code: 'sante.gerer', libelle: 'Gérer l\'infirmerie', module: 'sante' },
  { code: 'salles.gerer', libelle: 'Gérer salles et calendrier', module: 'salles' },
  { code: 'protection.gerer', libelle: 'Gérer les signalements de protection de l\'enfance', module: 'protection' },
];

/** Matrice rôle → permissions (miroir du seed). */
const MATRICE_ROLES: Record<string, string[]> = {
  direction: ['eleves.lire', 'eleves.ecrire', 'bulletins.valider', 'finances.voir', 'finances.ecrire', 'finances.valider', 'rh.gerer', 'communication.envoyer', 'admin.saas', 'vie_scolaire.gerer', 'securite.gerer', 'examens.gerer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer'],
  enseignant: ['eleves.lire', 'notes.saisir', 'presences.saisir', 'vie_scolaire.gerer', 'edt.gerer'],
  comptabilite: ['finances.voir', 'finances.ecrire', 'finances.valider'],
  surveillant: ['eleves.lire', 'presences.saisir', 'vie_scolaire.gerer', 'securite.gerer'],
  rh: ['eleves.lire', 'rh.gerer', 'communication.envoyer'],
  censeur: ['eleves.lire', 'bulletins.valider', 'presences.saisir', 'vie_scolaire.gerer', 'examens.gerer', 'edt.gerer', 'protection.gerer'],
  secretariat: ['eleves.lire', 'eleves.ecrire', 'communication.envoyer'],
  assistant_direction: ['eleves.lire', 'eleves.ecrire', 'presences.saisir', 'vie_scolaire.gerer', 'communication.envoyer'],
  infirmier: ['eleves.lire', 'sante.gerer'],
};

const ROLES_STANDARDS: Array<{ code: string; libelle: string; twofaRequis: boolean }> = [
  { code: 'direction', libelle: 'Direction', twofaRequis: true },
  { code: 'enseignant', libelle: 'Enseignant', twofaRequis: false },
  { code: 'comptabilite', libelle: 'Comptabilité', twofaRequis: true },
  { code: 'surveillant', libelle: 'Surveillant', twofaRequis: false },
  { code: 'rh', libelle: 'Ressources humaines', twofaRequis: false },
  { code: 'censeur', libelle: 'Censeur', twofaRequis: false },
  { code: 'secretariat', libelle: 'Secrétariat', twofaRequis: false },
  { code: 'assistant_direction', libelle: 'Assistant de direction', twofaRequis: false },
  { code: 'infirmier', libelle: 'Infirmier(ère)', twofaRequis: false },
];

/** Structure académique standard (maternelle → terminale). */
const STRUCTURE_STANDARD: Array<{ cycle: string; libCycle: string; mode: string; section: string; libSection: string; niveaux: Array<[string, string]> }> = [
  { cycle: 'MAT', libCycle: 'Maternelle', mode: 'competences', section: 'MAT', libSection: 'Maternelle', niveaux: [['PS', 'Petite section'], ['MS', 'Moyenne section'], ['GS', 'Grande section']] },
  { cycle: 'PRIM', libCycle: 'Primaire', mode: 'chiffre', section: 'PRIM', libSection: 'Primaire', niveaux: [['CP', 'CP'], ['CE1', 'CE1'], ['CE2', 'CE2'], ['CM1', 'CM1'], ['CM2', 'CM2']] },
  { cycle: 'COLL', libCycle: 'Collège', mode: 'chiffre', section: 'COLL', libSection: 'Collège', niveaux: [['6E', 'Sixième'], ['5E', 'Cinquième'], ['4E', 'Quatrième'], ['3E', 'Troisième']] },
  { cycle: 'LYC', libCycle: 'Lycée', mode: 'chiffre', section: 'LYC', libSection: 'Lycée', niveaux: [['2NDE', 'Seconde'], ['1ERE', 'Première'], ['TLE', 'Terminale']] },
];

export async function creerEcoleClientCore(ctx: Ctx, input: EcoleClientInput) {
  assertPermission(ctx, 'admin.saas');
  if (!input.nom?.trim()) throw new ActionError('Le nom de l\'école est obligatoire.', 'CHAMP_MANQUANT');
  const slug = input.slug?.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '');
  if (!slug || slug.length < 3) throw new ActionError('Le slug doit contenir au moins 3 caractères alphanumériques.', 'CHAMP_INVALIDE');
  const existe = await db.ecole.findFirst({ where: { slug } });
  if (existe) throw new ActionError(`Le slug « ${slug} » est déjà utilisé par une autre école.`, 'DEJA_EXISTANT');
  const devise = input.devise ?? 'XOF';
  if (!['XOF', 'EUR', 'USD', 'MAD', 'XAF'].includes(devise)) throw new ActionError(`Devise non gérée : ${devise}.`, 'CHAMP_INVALIDE');
  if (input.emailDirection) {
    const emailPris = await db.utilisateur.findFirst({ where: { email: input.emailDirection.trim().toLowerCase(), deletedAt: null } });
    if (emailPris) throw new ActionError('Cet email est déjà utilisé par un compte existant.', 'EMAIL_PRIS');
  }
  const motDePasse = input.motDePasseDirection && input.motDePasseDirection.length >= 8
    ? input.motDePasseDirection
    : genererMotDePasse(12);
  const anneeDebut = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1; // année scolaire : sept → août
  const libelleAnnee = `${anneeDebut}-${anneeDebut + 1}`;

  // F4 — TOUT l'onboarding dans UNE transaction : école utilisable immédiatement.
  const resultat = await db.$transaction(async (tx) => {
    const ecole = await tx.ecole.create({
      data: { nom: input.nom.trim(), slug, pays: input.pays ?? 'SN', devise, statut: 'essai' },
    });

    // 1) Abonnement d'essai + facture à 0
    let abonnementId: string | undefined;
    let planId: string | undefined;
    if (input.planId) {
      const plan = await tx.planTarifaire.findUnique({ where: { id: input.planId } });
      if (plan) {
        planId = plan.id;
        const abonnement = await tx.abonnement.create({
          data: { ecoleId: ecole.id, planId: plan.id, statut: 'essai', modeFacturation: 'mensuel' },
        });
        abonnementId = abonnement.id;
        await tx.factureSaas.create({
          data: {
            ecoleId: ecole.id,
            abonnementId: abonnement.id,
            periode: new Date().toISOString().slice(0, 7),
            montant: 0,
            devise,
            statut: 'payee',
          },
        });
      }
    }
    if (planId) await tx.ecole.update({ where: { id: ecole.id }, data: { planCourantId: planId } });

    // 2) Permissions globales liées à l'école
    const codesManquants: typeof PERMISSIONS_STANDARDS = [];
    for (const p of PERMISSIONS_STANDARDS) {
      const existante = await tx.permission.findUnique({ where: { code: p.code } });
      if (!existante) codesManquants.push(p);
    }
    for (const p of codesManquants) {
      await tx.permission.create({ data: { code: p.code, libelle: p.libelle, module: p.module, ecoles: { connect: { id: ecole.id } } } });
    }
    const toutesPerms = await tx.permission.findMany({ where: { code: { in: PERMISSIONS_STANDARDS.map((p) => p.code) } } });
    const permParCode = new Map(toutesPerms.map((p) => [p.code, p.id]));

    // 3) Rôles + matrice rolePermission
    const roleParCode = new Map<string, string>();
    for (const r of ROLES_STANDARDS) {
      const role = await tx.role.create({ data: { ecoleId: ecole.id, code: r.code, libelle: r.libelle, twofaRequis: r.twofaRequis } });
      roleParCode.set(r.code, role.id);
      const perms = MATRICE_ROLES[r.code] ?? [];
      await tx.rolePermission.createMany({
        data: perms
          .map((code) => permParCode.get(code))
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({ roleId: role.id, permissionId })),
      });
    }

    // 4) Structure académique : cycles → sections → niveaux + 1 classe par niveau
    const annee = await tx.anneeScolaire.create({
      data: {
        ecoleId: ecole.id,
        libelle: libelleAnnee,
        dateDebut: new Date(Date.UTC(anneeDebut, 8, 1)),
        dateFin: new Date(Date.UTC(anneeDebut + 1, 6, 31)),
        active: true,
      },
    });
    // Périodes trimestrielles (F19 : le code est unique PAR ANNÉE — recréables)
    await tx.periode.createMany({
      data: [
        { ecoleId: ecole.id, anneeScolaireId: annee.id, libelle: 'Trimestre 1', code: 'T1', dateDebut: new Date(Date.UTC(anneeDebut, 8, 1)), dateFin: new Date(Date.UTC(anneeDebut, 11, 15)), typeBulletin: 'college_lycee' },
        { ecoleId: ecole.id, anneeScolaireId: annee.id, libelle: 'Trimestre 2', code: 'T2', dateDebut: new Date(Date.UTC(anneeDebut + 1, 0, 5)), dateFin: new Date(Date.UTC(anneeDebut + 1, 2, 30)), typeBulletin: 'college_lycee' },
        { ecoleId: ecole.id, anneeScolaireId: annee.id, libelle: 'Trimestre 3', code: 'T3', dateDebut: new Date(Date.UTC(anneeDebut + 1, 3, 1)), dateFin: new Date(Date.UTC(anneeDebut + 1, 5, 30)), typeBulletin: 'college_lycee' },
      ],
    });
    let ordre = 1;
    let classesCreees = 0;
    for (const bloc of STRUCTURE_STANDARD) {
      const cycle = await tx.cycle.create({
        data: { ecoleId: ecole.id, code: bloc.cycle, libelle: bloc.libCycle, ordre: ordre, modeEvaluation: bloc.mode },
      });
      ordre++;
      const section = await tx.section.create({ data: { cycleId: cycle.id, code: bloc.section, libelle: bloc.libSection } });
      for (const [codeNiveau, libelleNiveau] of bloc.niveaux) {
        const niveau = await tx.niveau.create({ data: { sectionId: section.id, code: codeNiveau, libelle: libelleNiveau, ordre: ordre } });
        ordre++;
        await tx.classe.create({
          data: {
            niveauId: niveau.id,
            anneeScolaireId: annee.id,
            ecoleId: ecole.id,
            code: `${codeNiveau}-A`,
            libelle: `${libelleNiveau} A`,
            capaciteMax: 40,
          },
        });
        classesCreees++;
      }
    }

    // 5) Compte direction + rôle
    let emailDirection = input.emailDirection?.trim().toLowerCase() ?? null;
    if (emailDirection) {
      const u = await tx.utilisateur.create({
        data: {
          ecoleId: ecole.id,
          email: emailDirection,
          motDePasseHash: hashPassword(motDePasse),
          nom: 'Direction',
          prenom: input.nom.trim(),
          type: 'personnel',
        },
      });
      await tx.utilisateurRole.create({
        data: { utilisateurId: u.id, roleId: roleParCode.get('direction')! },
      });
      await tx.personnel.create({
        data: {
          ecoleId: ecole.id,
          utilisateurId: u.id,
          matricule: 'PER-0001',
          nom: 'Direction',
          prenom: input.nom.trim(),
          email: emailDirection,
          dateEmbauche: new Date(),
          statut: 'actif',
        },
      });
    }

    await logAction(tx, null, ctx.utilisateurId, 'ecole.creation_onboarding', 'ecole', ecole.id, {
      nom: input.nom,
      slug,
      abonnementId,
      anneeId: annee.id,
      classesCreees,
      compteDirection: Boolean(emailDirection),
    });
    return { ecoleId: ecole.id, slug, anneeId: annee.id, classesCreees, emailDirection, motDePasseTemporaire: emailDirection ? motDePasse : null };
  }, { timeout: 60000, maxWait: 10000 });
  return resultat;
}

export async function changerStatutEcoleCore(ctx: Ctx, ecoleId: string, statut: string) {
  assertPermission(ctx, 'admin.saas');
  const ecole = await db.ecole.findUnique({ where: { id: ecoleId } });
  if (!ecole) throw new ActionError('École introuvable.', 'INTROUVABLE');
  if (!['essai', 'actif', 'suspendu', 'resilie'].includes(statut)) {
    throw new ActionError(`Statut invalide : ${statut} (essai/actif/suspendu/resilie).`, 'CHAMP_INVALIDE');
  }
  if (ecole.statut === statut) throw new ActionError(`L'école est déjà « ${statut} ».`, 'DEJA_TRAITE');
  await db.$transaction(async (tx) => {
    await tx.ecole.update({ where: { id: ecoleId }, data: { statut } });
    // F4 — suspension/résiliation : les sessions actives de l'école sont révoquées
    // (la reconnexion est bloquée par getSessionCourante)
    if (statut === 'suspendu' || statut === 'resilie') {
      await tx.sessionUtilisateur.updateMany({
        where: { active: true, utilisateur: { ecoleId } },
        data: { active: false, expireManuellement: true, dateExpiration: new Date() },
      });
      // L'abonnement actif suit le statut
      await tx.abonnement.updateMany({
        where: { ecoleId, statut: { in: ['essai', 'actif'] } },
        data: { statut: statut === 'resilie' ? 'resilie' : 'suspendu' },
      });
    }
  }, { timeout: 30000, maxWait: 10000 });
  await logAction(db, null, ctx.utilisateurId, 'ecole.changement_statut', 'ecole', ecoleId, { statut, nom: ecole.nom });
  return { ok: true };
}

export type PlanInput = {
  nom: string;
  prixMensuel: number; // CENTIMES (F16)
  prixAnnuel: number; // CENTIMES
  devise?: string;
  dureeEssaiJours?: number;
  modules?: string[];
  limiteEleves?: number;
};

export async function creerPlanTarifaireCore(ctx: Ctx, input: PlanInput) {
  assertPermission(ctx, 'admin.saas');
  if (!input.nom?.trim()) throw new ActionError('Le nom du plan est obligatoire.', 'CHAMP_MANQUANT');
  if (!Number.isInteger(input.prixMensuel) || input.prixMensuel < 0 || !Number.isInteger(input.prixAnnuel) || input.prixAnnuel < 0) {
    throw new ActionError('Les prix doivent être des entiers positifs ou nuls (centimes).', 'MONTANT_INVALIDE');
  }
  if (input.prixAnnuel > 0 && input.prixMensuel > 0 && input.prixAnnuel > input.prixMensuel * 12) {
    throw new ActionError('Le prix annuel ne peut pas dépasser 12 × le prix mensuel.', 'MONTANT_INVALIDE');
  }
  if (input.limiteEleves !== undefined && (!Number.isInteger(input.limiteEleves) || input.limiteEleves < 0)) {
    throw new ActionError('La limite d\'élèves doit être un entier positif (0 = illimité).', 'CHAMP_INVALIDE');
  }
  const p = await db.planTarifaire.create({
    data: {
      nom: input.nom.trim(),
      prixMensuel: input.prixMensuel,
      prixAnnuel: input.prixAnnuel,
      devise: input.devise ?? 'XOF',
      dureeEssaiJours: input.dureeEssaiJours ?? 14,
      modulesInclus: JSON.stringify(input.modules ?? []),
      limiteEleves: input.limiteEleves ?? 0,
      actif: true,
    },
  });
  await logAction(db, null, ctx.utilisateurId, 'plan_tarifaire.creation', 'plan_tarifaire', p.id, { nom: input.nom });
  return { planId: p.id };
}

// --------------------------------------------------------------------
// F4 — Facturation SaaS + changement de plan
// --------------------------------------------------------------------

/** Génère les factures du mois pour tous les abonnements actifs (idempotent). */
export async function genererFacturesSaasCore(ctx: Ctx) {
  assertPermission(ctx, 'admin.saas');
  const periode = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const abonnements = await db.abonnement.findMany({
    where: { statut: 'actif' },
    include: { plan: true, ecole: true },
  });
  let crees = 0;
  const sautes: string[] = [];
  await db.$transaction(async (tx) => {
    for (const ab of abonnements) {
      // Idempotence via @@unique(ecoleId, abonnementId, periode)
      const existante = await tx.factureSaas.findUnique({
        where: { ecoleId_abonnementId_periode: { ecoleId: ab.ecoleId, abonnementId: ab.id, periode } },
      });
      if (existante) { sautes.push(ab.ecole.slug); continue; }
      // Essai gratuit : pas de facture (celle à 0 est déjà émise à l'onboarding)
      if (ab.statut === 'essai') { sautes.push(ab.ecole.slug); continue; }
      const montant = ab.modeFacturation === 'annuel'
        ? Math.round(ab.plan.prixAnnuel / 12) // douzième de l'annuel
        : ab.plan.prixMensuel;
      if (montant <= 0) { sautes.push(ab.ecole.slug); continue; }
      await tx.factureSaas.create({
        data: {
          ecoleId: ab.ecoleId,
          abonnementId: ab.id,
          periode,
          montant,
          devise: ab.plan.devise,
          statut: 'impayee',
        },
      });
      crees++;
    }
    await logAction(tx, null, ctx.utilisateurId, 'saas.factures_generation', 'facture_saas', undefined, { periode, crees });
  }, { timeout: 30000, maxWait: 10000 });
  return { periode, crees, sautes: sautes.length };
}

/** Changement de plan : clôture l'abonnement courant, ouvre le nouveau, met à jour l'école. */
export async function changerPlanEcoleCore(ctx: Ctx, ecoleId: string, planId: string, modeFacturation: 'mensuel' | 'annuel') {
  assertPermission(ctx, 'admin.saas');
  const ecole = await db.ecole.findUnique({ where: { id: ecoleId } });
  if (!ecole) throw new ActionError('École introuvable.', 'INTROUVABLE');
  const plan = await db.planTarifaire.findUnique({ where: { id: planId } });
  if (!plan) throw new ActionError('Plan tarifaire introuvable.', 'INTROUVABLE');
  if (!plan.actif) throw new ActionError('Ce plan n\'est plus commercialisé.', 'PLAN_INACTIF');
  const courant = await db.abonnement.findFirst({
    where: { ecoleId, statut: { in: ['essai', 'actif'] } },
    orderBy: { dateDebut: 'desc' },
  });

  const abonnementId = await db.$transaction(async (tx) => {
    if (courant) {
      await tx.abonnement.update({
        where: { id: courant.id },
        data: { statut: 'resilie', dateFin: new Date() },
      });
    }
    const ab = await tx.abonnement.create({
      data: { ecoleId, planId, statut: 'actif', modeFacturation },
    });
    // F4 : Ecole.planCourantId enfin maintenu (le MRR sera réel)
    await tx.ecole.update({ where: { id: ecoleId }, data: { planCourantId: planId } });
    await logAction(tx, null, ctx.utilisateurId, 'saas.changement_plan', 'ecole', ecoleId, {
      ancienPlan: courant?.planId ?? null,
      nouveauPlan: planId,
      modeFacturation,
    });
    return ab.id;
  }, { timeout: 30000, maxWait: 10000 });
  return { abonnementId };
}

// --------------------------------------------------------------------
// Communication
// --------------------------------------------------------------------

export type NotificationInput = {
  destinataireId?: string;
  destinataireType?: string;
  sujet: string;
  corps: string;
  canal?: string;
};

export async function envoyerNotificationCore(ctx: Ctx, ecoleId: string, input: NotificationInput) {
  assertPermission(ctx, 'communication.envoyer');
  if (!input.sujet?.trim()) throw new ActionError('Le sujet est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.corps?.trim()) throw new ActionError('Le corps du message est obligatoire.', 'CHAMP_MANQUANT');
  const canal = input.canal ?? 'in_app';
  // F5 — seul in_app est réellement délivré ; sms/email/push sont journalisés
  // comme « en_attente » tant qu'aucun fournisseur n'est configuré.
  if (!['in_app', 'sms', 'email', 'push'].includes(canal)) {
    throw new ActionError(`Canal invalide : ${canal}.`, 'CHAMP_INVALIDE');
  }
  if (input.destinataireId) {
    const u = await db.utilisateur.findUnique({ where: { id: input.destinataireId } });
    if (!u) throw new ActionError('Destinataire introuvable.', 'INTROUVABLE');
    assertTenant(u.ecoleId, ctx, 'Ce destinataire');
  }
  const livrable = canal === 'in_app';
  const n = await db.notification.create({
    data: {
      ecoleId,
      destinataireId: input.destinataireId ?? null,
      destinataireType: input.destinataireType ?? 'personnel',
      sujet: input.sujet.trim(),
      corps: input.corps.trim(),
      canal,
      statut: livrable ? 'envoye' : 'en_attente',
      dateEnvoi: livrable ? new Date() : null,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'notification.envoi', 'notification', n.id, { canal, sujet: input.sujet, livrable });
  return { notificationId: n.id, livrable };
}

export type NotificationMasseInput = {
  cible: string; // tous_personnel / tous_parents / classe:<id> / niveau:<id>
  sujet: string;
  corps: string;
};

/** Envoi en masse (F3) : personnel, parents, classe ou niveau. */
export async function envoyerNotificationMasseCore(ctx: Ctx, ecoleId: string, input: NotificationMasseInput) {
  assertPermission(ctx, 'communication.envoyer');
  if (!input.sujet?.trim() || !input.corps?.trim()) throw new ActionError('Sujet et corps obligatoires.', 'CHAMP_MANQUANT');
  const [typeCible, idCible] = input.cible.split(':');
  if (!(CIBLES_NOTIFICATION as readonly string[]).includes(typeCible)) {
    throw new ActionError(`Cible invalide : ${typeCible}.`, 'CHAMP_INVALIDE');
  }

  let destinataires: Array<{ id: string; type: string }> = [];
  if (typeCible === 'tous_personnel') {
    const us = await db.utilisateur.findMany({ where: { ecoleId, type: 'personnel', actif: true, deletedAt: null }, select: { id: true } });
    destinataires = us.map((u) => ({ id: u.id, type: 'personnel' }));
  } else if (typeCible === 'tous_parents') {
    const parents = await db.parentTuteur.findMany({ where: { ecoleId, utilisateurId: { not: null } }, select: { utilisateurId: true } });
    destinataires = parents.filter((p) => p.utilisateurId).map((p) => ({ id: p.utilisateurId!, type: 'parent' }));
  } else if (typeCible === 'classe') {
    const classe = await db.classe.findUnique({ where: { id: idCible ?? '' } });
    if (!classe) throw new ActionError('Classe cible introuvable.', 'INTROUVABLE');
    assertTenant(classe.ecoleId, ctx, 'Cette classe');
    const eleves = await db.eleve.findMany({ where: { classeActuelleId: classe.id, deletedAt: null }, select: { id: true } });
    const liens = await db.eleveParent.findMany({ where: { eleveId: { in: eleves.map((e) => e.id) } }, include: { parent: true } });
    const vus = new Set<string>();
    for (const l of liens) {
      if (l.parent.utilisateurId && !vus.has(l.parent.utilisateurId)) {
        vus.add(l.parent.utilisateurId);
        destinataires.push({ id: l.parent.utilisateurId, type: 'parent' });
      }
    }
  } else if (typeCible === 'niveau') {
    const niveau = await db.niveau.findUnique({ where: { id: idCible ?? '' }, include: { section: { include: { cycle: true } } } });
    if (!niveau) throw new ActionError('Niveau cible introuvable.', 'INTROUVABLE');
    assertTenant(niveau.section.cycle.ecoleId, ctx, 'Ce niveau');
    const classes = await db.classe.findMany({ where: { niveauId: niveau.id }, select: { id: true } });
    const eleves = await db.eleve.findMany({ where: { classeActuelleId: { in: classes.map((c) => c.id) }, deletedAt: null }, select: { id: true } });
    const liens = await db.eleveParent.findMany({ where: { eleveId: { in: eleves.map((e) => e.id) } }, include: { parent: true } });
    const vus = new Set<string>();
    for (const l of liens) {
      if (l.parent.utilisateurId && !vus.has(l.parent.utilisateurId)) {
        vus.add(l.parent.utilisateurId);
        destinataires.push({ id: l.parent.utilisateurId, type: 'parent' });
      }
    }
  }
  if (destinataires.length === 0) throw new ActionError('Aucun destinataire résolu pour cette cible.', 'SAISIE_VIDE');

  await db.$transaction(async (tx) => {
    await tx.notification.createMany({
      data: destinataires.map((d) => ({
        ecoleId,
        destinataireId: d.id,
        destinataireType: d.type,
        sujet: input.sujet.trim(),
        corps: input.corps.trim(),
        canal: 'in_app',
        statut: 'envoye',
        dateEnvoi: new Date(),
      })),
    });
    await logAction(tx, ecoleId, ctx.utilisateurId, 'notification.envoi_masse', 'notification', undefined, {
      cible: input.cible,
      destinataires: destinataires.length,
      sujet: input.sujet,
    });
  }, { timeout: 30000, maxWait: 10000 });
  return { envoyees: destinataires.length };
}

export type ModeleMessageInput = {
  code: string;
  sujet: string;
  corps: string;
  canaux?: string[];
};

export async function creerModeleMessageCore(ctx: Ctx, ecoleId: string, input: ModeleMessageInput) {
  assertPermission(ctx, 'communication.envoyer');
  if (!input.code?.trim()) throw new ActionError('Le code du modèle est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.sujet?.trim() || !input.corps?.trim()) throw new ActionError('Sujet et corps obligatoires.', 'CHAMP_MANQUANT');
  const existe = await db.modeleMessage.findFirst({ where: { ecoleId, code: input.code.trim() } });
  if (existe) throw new ActionError(`Le modèle « ${input.code} » existe déjà pour cette école.`, 'DEJA_EXISTANT');
  const m = await db.modeleMessage.create({
    data: {
      ecoleId,
      code: input.code.trim(),
      sujet: input.sujet.trim(),
      corps: input.corps.trim(),
      canaux: JSON.stringify(input.canaux ?? ['in_app']),
      langue: 'fr',
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'modele_message.creation', 'modele_message', m.id, { code: input.code });
  return { modeleId: m.id };
}

// --------------------------------------------------------------------
// Examens officiels : convocations réelles (P2) + numéros sans doublon (F19)
// --------------------------------------------------------------------

export async function inscrireElevesExamenCore(ctx: Ctx, examenId: string) {
  assertPermission(ctx, 'examens.gerer');
  const examen = await db.examenOfficiel.findUnique({ where: { id: examenId } });
  if (!examen) throw new ActionError('Examen introuvable.', 'INTROUVABLE');
  assertTenant(examen.ecoleId, ctx, 'Cet examen');
  const eleves = await db.eleve.findMany({
    where: { ecoleId: examen.ecoleId, classeActuelle: { niveauId: examen.niveauId }, statut: 'actif', deletedAt: null },
  });
  let nouveaux = 0;
  await db.$transaction(async (tx) => {
    for (const e of eleves) {
      const avant = await tx.inscriptionExamenOfficiel.findUnique({
        where: { examenOfficielId_eleveId: { examenOfficielId: examenId, eleveId: e.id } },
      });
      if (avant) continue;
      await tx.inscriptionExamenOfficiel.create({
        data: {
          examenOfficielId: examenId,
          eleveId: e.id,
          statut: 'inscrit',
          centreExamen: examen.ecoleId,
        },
      });
      nouveaux++;
    }
    await logAction(tx, examen.ecoleId, ctx.utilisateurId, 'examen.inscriptions', 'examen_officiel', examenId, {
      candidats: eleves.length,
      nouveaux,
    });
  }, { timeout: 30000, maxWait: 10000 });
  return { total: eleves.length, nouveaux };
}

export async function envoyerConvocationsExamenCore(ctx: Ctx, examenId: string) {
  assertPermission(ctx, 'examens.gerer');
  const examen = await db.examenOfficiel.findUnique({ where: { id: examenId } });
  if (!examen) throw new ActionError('Examen introuvable.', 'INTROUVABLE');
  assertTenant(examen.ecoleId, ctx, 'Cet examen');
  const inscriptions = await db.inscriptionExamenOfficiel.findMany({
    where: { examenOfficielId: examenId, statut: 'inscrit' },
    include: { eleve: true },
  });
  if (inscriptions.length === 0) throw new ActionError('Aucun candidat inscrit en attente de convocation.', 'SAISIE_VIDE');

  // F19 — le numéro de table repart APRÈS les tables déjà attribuées
  const dejaNumerotees = await db.inscriptionExamenOfficiel.findMany({
    where: { examenOfficielId: examenId, numeroTable: { not: null } },
    select: { numeroTable: true },
  });
  let prochain = 1;
  for (const d of dejaNumerotees) {
    const n = parseInt((d.numeroTable ?? '').replace('T-', ''), 10);
    if (!isNaN(n) && n >= prochain) prochain = n + 1;
  }

  let convocations = 0;
  await db.$transaction(async (tx) => {
    for (const i of inscriptions) {
      await tx.inscriptionExamenOfficiel.update({
        where: { id: i.id },
        data: {
          statut: 'convoque',
          numeroTable: i.numeroTable ?? `T-${String(prochain).padStart(3, '0')}`,
        },
      });
      prochain++;
      await notifierParentsEtDirection(
        tx,
        examen.ecoleId,
        i.eleveId,
        `Convocation — ${examen.nom}`,
        `${i.eleve.prenom} ${i.eleve.nom} est convoqué(e) à l'examen « ${examen.nom} ». Table attribuée. Présentez-vous 30 minutes avant le début de l'épreuve avec votre pièce d'identité.`,
        { direction: false },
      );
      convocations++;
    }
  }, { timeout: 30000, maxWait: 10000 });
  await logAction(db, examen.ecoleId, ctx.utilisateurId, 'examen.convocations', 'examen_officiel', examenId, { convocations });
  return { convocations };
}

export async function saisirResultatExamenCore(ctx: Ctx, inscriptionId: string, resultat: string) {
  assertPermission(ctx, 'examens.gerer');
  const i = await db.inscriptionExamenOfficiel.findUnique({ where: { id: inscriptionId }, include: { examenOfficiel: true, eleve: true } });
  if (!i) throw new ActionError('Inscription d\'examen introuvable.', 'INTROUVABLE');
  assertTenant(i.examenOfficiel.ecoleId, ctx, 'Cette inscription');
  if (!['admis', 'ajourne', 'mention', 'absent'].includes(resultat)) {
    throw new ActionError(`Résultat invalide : ${resultat} (admis/ajourne/mention/absent).`, 'CHAMP_INVALIDE');
  }
  if (i.statut === 'presente' && i.resultat) {
    throw new ActionError('Résultat déjà saisi pour ce candidat.', 'DEJA_TRAITE');
  }
  if (i.statut !== 'presente' && i.statut !== 'convoque') {
    throw new ActionError('Le candidat doit être convoqué avant la saisie du résultat.', 'STATUT_INVALIDE');
  }
  const nouveauStatut = resultat === 'absent' ? 'absent' : 'presente';
  await db.inscriptionExamenOfficiel.update({
    where: { id: inscriptionId },
    data: { resultat, statut: nouveauStatut },
  });
  await logAction(db, i.examenOfficiel.ecoleId, ctx.utilisateurId, 'examen.resultat_saisi', 'inscription', inscriptionId, {
    resultat,
    eleveId: i.eleveId,
  });
  return { inscriptionId, resultat, statut: nouveauStatut };
}

// --------------------------------------------------------------------
// Salles & calendrier
// --------------------------------------------------------------------

export type SalleInput = {
  nom: string;
  type: string;
  capacite: number;
  equipements?: string[];
};

export async function creerSalleCore(ctx: Ctx, ecoleId: string, input: SalleInput) {
  assertPermission(ctx, 'salles.gerer');
  if (!input.nom?.trim()) throw new ActionError('Le nom de la salle est obligatoire.', 'CHAMP_MANQUANT');
  if (!Number.isInteger(input.capacite) || input.capacite <= 0 || input.capacite > 2000) {
    throw new ActionError('La capacité doit être un entier entre 1 et 2000.', 'CHAMP_INVALIDE');
  }
  const existante = await db.salle.findUnique({ where: { ecoleId_nom: { ecoleId, nom: input.nom.trim() } } });
  if (existante) throw new ActionError('Une salle porte déjà ce nom dans cette école.', 'DEJA_EXISTANT');
  const s = await db.salle.create({
    data: {
      ecoleId,
      nom: input.nom.trim(),
      type: input.type,
      capacite: input.capacite,
      equipements: JSON.stringify(input.equipements ?? []),
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'salle.creation', 'salle', s.id, { nom: input.nom });
  return { salleId: s.id };
}

export type CalendrierInput = {
  type: string;
  libelle: string;
  dateDebut: Date;
  dateFin: Date;
};

export async function ajouterCalendrierCore(ctx: Ctx, ecoleId: string, input: CalendrierInput) {
  assertPermission(ctx, 'salles.gerer');
  if (!input.libelle?.trim()) throw new ActionError('Le libellé est obligatoire.', 'CHAMP_MANQUANT');
  if (isNaN(input.dateDebut?.getTime()) || isNaN(input.dateFin?.getTime())) throw new ActionError('Dates invalides.', 'DATE_INVALIDE');
  if (input.dateFin < input.dateDebut) throw new ActionError('La date de fin doit suivre la date de début.', 'DATE_INVALIDE');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId, active: true } });
  if (!annee) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');
  const c = await db.calendrierScolaire.create({
    data: {
      ecoleId,
      anneeScolaireId: annee.id,
      type: input.type,
      libelle: input.libelle.trim(),
      dateDebut: input.dateDebut,
      dateFin: input.dateFin,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'calendrier.ajout', 'calendrier_scolaire', c.id, { type: input.type });
  return { evenementId: c.id };
}

// --------------------------------------------------------------------
// RDV parents-profs (F13 — réservation PARENT réelle)
// --------------------------------------------------------------------

export type CreneauRdvInput = {
  personnelId: string;
  date: Date;
  heureDebut: string;
  heureFin: string;
  lieu?: string;
};

export async function ouvrirCreneauRdvCore(ctx: Ctx, input: CreneauRdvInput) {
  assertPermission(ctx, 'communication.envoyer');
  const p = await db.personnel.findUnique({ where: { id: input.personnelId } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  if (isNaN(input.date?.getTime())) throw new ActionError('Date invalide.', 'DATE_INVALIDE');
  if (input.date < new Date(Date.now() - 86400000)) throw new ActionError('Impossible d\'ouvrir un créneau dans le passé.', 'DATE_INVALIDE');
  if (!/^\d{2}:\d{2}$/.test(input.heureDebut ?? '') || !/^\d{2}:\d{2}$/.test(input.heureFin ?? '')) {
    throw new ActionError('Horaires invalides (HH:MM).', 'CHAMP_INVALIDE');
  }
  if (input.heureDebut >= input.heureFin) throw new ActionError('L\'heure de fin doit suivre l\'heure de début.', 'CHAMP_INVALIDE');
  // Un créneau ne doit pas chevaucher un créneau existant du même personnel.
  const existants = await db.creneauRdv.findMany({ where: { personnelId: input.personnelId, date: input.date } });
  for (const c of existants) {
    if (input.heureDebut < c.heureFin && c.heureDebut < input.heureFin) {
      throw new ActionError(`Chevauchement : ce personnel a déjà un créneau ${c.heureDebut}-${c.heureFin} ce jour-là.`, 'CHEVAUCHEMENT');
    }
  }
  const cr = await db.creneauRdv.create({
    data: {
      personnelId: input.personnelId,
      date: input.date,
      heureDebut: input.heureDebut,
      heureFin: input.heureFin,
      statut: 'disponible',
      lieu: input.lieu ?? 'presentiel',
    },
  });
  await logAction(db, p.ecoleId, ctx.utilisateurId, 'rdv.creneau_ouvert', 'creneau_rdv', cr.id, {});
  return { creneauId: cr.id };
}

export type ReservationRdvInput = {
  creneauRdvId: string;
  eleveId?: string;
  motif?: string;
};

/**
 * F13 — réservation par un PARENT. L'identité parent est résolue SERVEUR
 * depuis la session ; l'élève doit être un de ses enfants.
 */
export async function reserverRdvCore(ctx: Ctx, input: ReservationRdvInput) {
  if (ctx.type !== 'parent') {
    // Le back-office peut réserver pour un parent identifié (permission requise)
    assertPermission(ctx, 'communication.envoyer');
  }
  const parent = await db.parentTuteur.findFirst({ where: { utilisateurId: ctx.utilisateurId } });
  if (ctx.type === 'parent' && !parent) {
    throw new ActionError('Aucun dossier parent associé à votre compte.', 'INTROUVABLE');
  }
  // Back-office : parent spécifié via parentId optionnel (non implémenté côté UI : réservé aux parents)
  if (!parent) throw new ActionError('Seul un compte parent peut réserver un rendez-vous.', 'ROLE_INVALIDE');

  return avecVerrou(`rdv:${input.creneauRdvId}`, () => db.$transaction(async (tx) => {
    const creneau = await tx.creneauRdv.findUnique({ where: { id: input.creneauRdvId }, include: { personnel: true } });
    if (!creneau) throw new ActionError('Créneau introuvable.', 'INTROUVABLE');
    assertTenant(creneau.personnel.ecoleId, ctx, 'Ce créneau');
    if (creneau.statut !== 'disponible') {
      throw new ActionError('Ce créneau n\'est plus disponible (déjà réservé ou annulé).', 'DEJA_TRAITE');
    }
    if (creneau.date < new Date(new Date().setHours(0, 0, 0, 0))) {
      throw new ActionError('Ce créneau est passé.', 'DATE_INVALIDE');
    }
    if (input.eleveId) {
      const lien = await tx.eleveParent.findUnique({
        where: { eleveId_parentId: { eleveId: input.eleveId, parentId: parent.id } },
      });
      if (!lien) throw new ActionError('Cet élève n\'est pas rattaché à votre compte parent.', 'TENANT_INVALIDE');
    }
    const rdv = await tx.rdv.create({
      data: {
        creneauRdvId: creneau.id,
        parentId: parent.id,
        eleveId: input.eleveId ?? null,
        motif: input.motif?.trim() || null,
        statut: 'confirme',
      },
    });
    await tx.creneauRdv.update({ where: { id: creneau.id }, data: { statut: 'reserve' } });
    // Notification à l'enseignant concerné
    if (creneau.personnel.utilisateurId) {
      await tx.notification.create({
        data: {
          ecoleId: creneau.personnel.ecoleId,
          destinataireType: 'personnel',
          destinataireId: creneau.personnel.utilisateurId,
          sujet: 'Nouveau rendez-vous réservé',
          corps: `${parent.prenom} ${parent.nom} a réservé le créneau du ${creneau.date.toISOString().slice(0, 10)} ${creneau.heureDebut}-${creneau.heureFin}.${input.motif ? ` Motif : ${input.motif}` : ''}`,
          canal: 'in_app',
          statut: 'envoye',
          dateEnvoi: new Date(),
        },
      });
    }
    await logAction(tx, creneau.personnel.ecoleId, ctx.utilisateurId, 'rdv.reservation', 'rdv', rdv.id, {
      creneauId: creneau.id,
      parentId: parent.id,
    });
    return { rdvId: rdv.id };
  }, { timeout: 30000, maxWait: 10000 }));
}

/** F13 — annulation : le parent propriétaire ou le personnel autorisé ; le créneau est libéré. */
export async function annulerRdvCore(ctx: Ctx, rdvId: string) {
  const rdv = await db.rdv.findUnique({ where: { id: rdvId }, include: { parent: true, creneauRdv: { include: { personnel: true } } } });
  if (!rdv) throw new ActionError('Rendez-vous introuvable.', 'INTROUVABLE');
  const ecoleId = rdv.creneauRdv.personnel.ecoleId;
  assertTenant(ecoleId, ctx, 'Ce rendez-vous');
  if (rdv.statut === 'annule') throw new ActionError('Rendez-vous déjà annulé.', 'DEJA_TRAITE');

  const estParentProprietaire = ctx.type === 'parent' && rdv.parent.utilisateurId === ctx.utilisateurId;
  if (!estParentProprietaire) {
    assertPermission(ctx, 'communication.envoyer');
  }

  await db.$transaction(async (tx) => {
    await tx.rdv.update({ where: { id: rdvId }, data: { statut: 'annule' } });
    await tx.creneauRdv.update({ where: { id: rdv.creneauRdvId }, data: { statut: 'disponible' } });
    // Notifier l'enseignant de l'annulation
    if (rdv.creneauRdv.personnel.utilisateurId) {
      await tx.notification.create({
        data: {
          ecoleId,
          destinataireType: 'personnel',
          destinataireId: rdv.creneauRdv.personnel.utilisateurId,
          sujet: 'Rendez-vous annulé',
          corps: `Le rendez-vous du ${rdv.creneauRdv.date.toISOString().slice(0, 10)} ${rdv.creneauRdv.heureDebut}-${rdv.creneauRdv.heureFin} a été annulé par ${rdv.parent.prenom} ${rdv.parent.nom}.`,
          canal: 'in_app',
          statut: 'envoye',
          dateEnvoi: new Date(),
        },
      });
    }
    await logAction(tx, ecoleId, ctx.utilisateurId, 'rdv.annulation', 'rdv', rdvId);
  }, { timeout: 30000, maxWait: 10000 });
  return { rdvId };
}

// --------------------------------------------------------------------
// RÉFÉRENTIELS D'ÉCOLE (déploiement réel) — matières et classes
// L'onboarding SaaS crée 1 classe par niveau et AUCUNE matière : ces deux
// actions permettent à la direction de configurer SON établissement réel
// (6A/6B/6C…, matières et coefficients) avant la rentrée.
// --------------------------------------------------------------------

export type MatiereInput = { code: string; libelle: string; coefficient?: number };

export async function creerMatiereCore(ctx: Ctx, ecoleId: string, input: MatiereInput) {
  assertPermission(ctx, 'admin.saas');
  const code = input.code?.trim().toUpperCase() ?? '';
  if (!/^[A-Z0-9]{1,10}$/.test(code)) {
    throw new ActionError('Code matière invalide (1 à 10 caractères alphanumériques, ex. MATHS, HG, PC).', 'CHAMP_INVALIDE');
  }
  if (!input.libelle?.trim()) throw new ActionError('Le libellé de la matière est obligatoire.', 'CHAMP_MANQUANT');
  const coefficient = input.coefficient ?? 1;
  if (!(coefficient > 0) || coefficient > 10) throw new ActionError('Le coefficient doit être compris entre 0 et 10.', 'CHAMP_INVALIDE');
  const existante = await db.matiere.findUnique({ where: { ecoleId_code: { ecoleId, code } } });
  if (existante) throw new ActionError(`La matière « ${code} » existe déjà dans cette école.`, 'DEJA_EXISTANT');
  const m = await db.matiere.create({
    data: { ecoleId, code, libelle: input.libelle.trim(), coefficient },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'referentiel.matiere_creation', 'matiere', m.id, { code, libelle: input.libelle });
  return { matiereId: m.id, code };
}

export type ClasseInput = {
  niveauId: string;
  code: string;
  libelle: string;
  capaciteMax?: number;
  enseignantPrincipalId?: string;
};

export async function creerClasseCore(ctx: Ctx, input: ClasseInput) {
  assertPermission(ctx, 'admin.saas');
  const code = input.code?.trim().toUpperCase() ?? '';
  if (!/^[A-Z0-9-]{1,12}$/.test(code)) {
    throw new ActionError('Code de classe invalide (1 à 12 caractères, ex. 6A, CM2-B, 3C).', 'CHAMP_INVALIDE');
  }
  if (!input.libelle?.trim()) throw new ActionError('Le libellé de la classe est obligatoire.', 'CHAMP_MANQUANT');
  if (input.capaciteMax !== undefined && (!Number.isInteger(input.capaciteMax) || input.capaciteMax < 1 || input.capaciteMax > 2000)) {
    throw new ActionError('La capacité doit être un entier entre 1 et 2000.', 'CHAMP_INVALIDE');
  }
  // Le niveau doit appartenir à l'école du contexte
  const niveau = await db.niveau.findUnique({ where: { id: input.niveauId }, include: { section: { include: { cycle: true } } } });
  if (!niveau) throw new ActionError('Niveau introuvable.', 'INTROUVABLE');
  assertTenant(niveau.section.cycle.ecoleId, ctx, 'Ce niveau');
  const ecoleId = niveau.section.cycle.ecoleId;
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId, active: true } });
  if (!annee) throw new ActionError('Aucune année scolaire active pour créer une classe.', 'ANNEE_INACTIVE');
  const existante = await db.classe.findUnique({ where: { ecoleId_code_anneeScolaireId: { ecoleId, code, anneeScolaireId: annee.id } } });
  if (existante) throw new ActionError(`La classe « ${code} » existe déjà pour ${annee.libelle}.`, 'DEJA_EXISTANT');
  // Titulaire éventuel : personnel du tenant
  let titulaireId: string | undefined;
  if (input.enseignantPrincipalId) {
    const p = await db.personnel.findUnique({ where: { id: input.enseignantPrincipalId } });
    if (!p) throw new ActionError('Enseignant titulaire introuvable.', 'INTROUVABLE');
    assertTenant(p.ecoleId, ctx, 'Ce titulaire');
    titulaireId = p.id;
  }
  const c = await db.classe.create({
    data: {
      ecoleId, niveauId: input.niveauId, anneeScolaireId: annee.id,
      code, libelle: input.libelle.trim(),
      capaciteMax: input.capaciteMax ?? 40,
      enseignantPrincipalId: titulaireId,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'referentiel.classe_creation', 'classe', c.id, {
    code, libelle: input.libelle, annee: annee.libelle, titulaire: titulaireId ?? null,
  });
  return { classeId: c.id, code, anneeScolaireId: annee.id };
}
