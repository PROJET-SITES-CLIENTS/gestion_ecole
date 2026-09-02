// ====================================================================
// MÉTIER SAAS + COMMUNICATION + EXAMENS + SALLES (reste du périmètre)
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, notifierParentsEtDirection } from './commun';

// --------------------------------------------------------------------
// SaaS éditeur
// --------------------------------------------------------------------

export type EcoleClientInput = {
  nom: string;
  slug: string;
  planId?: string;
  pays?: string;
  devise?: string;
};

export async function creerEcoleClientCore(ctx: Ctx, input: EcoleClientInput) {
  assertPermission(ctx, 'admin.saas');
  if (!input.nom?.trim()) throw new ActionError('Le nom de l\'école est obligatoire.', 'CHAMP_MANQUANT');
  const slug = input.slug?.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '');
  if (!slug || slug.length < 3) throw new ActionError('Le slug doit contenir au moins 3 caractères alphanumériques.', 'CHAMP_INVALIDE');
  const existe = await db.ecole.findFirst({ where: { slug } });
  if (existe) throw new ActionError(`Le slug « ${slug} » est déjà utilisé par une autre école.`, 'DEJA_EXISTANT');
  const devise = input.devise ?? 'XOF';
  if (!['XOF', 'EUR', 'USD', 'MAD', 'XAF'].includes(devise)) throw new ActionError(`Devise non gérée : ${devise}.`, 'CHAMP_INVALIDE');

  const ecole = await db.ecole.create({
    data: { nom: input.nom.trim(), slug, pays: input.pays ?? 'SN', devise, statut: 'essai' },
  });
  let abonnementId: string | undefined;
  if (input.planId) {
    const plan = await db.planTarifaire.findUnique({ where: { id: input.planId } });
    if (plan) {
      const abonnement = await db.abonnement.create({
        data: { ecoleId: ecole.id, planId: plan.id, statut: 'essai', modeFacturation: 'mensuel' },
      });
      abonnementId = abonnement.id;
      await db.factureSaas.create({
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
  await logAction(db, null, ctx.utilisateurId, 'ecole.creation', 'ecole', ecole.id, { nom: input.nom, slug, abonnementId });
  return { ecoleId: ecole.id, slug };
}

export async function changerStatutEcoleCore(ctx: Ctx, ecoleId: string, statut: string) {
  assertPermission(ctx, 'admin.saas');
  const ecole = await db.ecole.findUnique({ where: { id: ecoleId } });
  if (!ecole) throw new ActionError('École introuvable.', 'INTROUVABLE');
  if (!['essai', 'actif', 'suspendu', 'resilie'].includes(statut)) {
    throw new ActionError(`Statut invalide : ${statut} (essai/actif/suspendu/resilie).`, 'CHAMP_INVALIDE');
  }
  await db.ecole.update({ where: { id: ecoleId }, data: { statut } });
  await logAction(db, null, ctx.utilisateurId, 'ecole.changement_statut', 'ecole', ecoleId, { statut, nom: ecole.nom });
  return { ok: true };
}

export type PlanInput = {
  nom: string;
  prixMensuel: number;
  prixAnnuel: number;
  devise?: string;
  dureeEssaiJours?: number;
  modules?: string[];
};

export async function creerPlanTarifaireCore(ctx: Ctx, input: PlanInput) {
  assertPermission(ctx, 'admin.saas');
  if (!input.nom?.trim()) throw new ActionError('Le nom du plan est obligatoire.', 'CHAMP_MANQUANT');
  if (!(input.prixMensuel >= 0) || !(input.prixAnnuel >= 0)) {
    throw new ActionError('Les prix doivent être positifs ou nuls.', 'MONTANT_INVALIDE');
  }
  if (input.prixAnnuel > 0 && input.prixMensuel > 0 && input.prixAnnuel > input.prixMensuel * 12) {
    throw new ActionError('Le prix annuel ne peut pas dépasser 12 × le prix mensuel.', 'MONTANT_INVALIDE');
  }
  const p = await db.planTarifaire.create({
    data: {
      nom: input.nom.trim(),
      prixMensuel: input.prixMensuel,
      prixAnnuel: input.prixAnnuel,
      devise: input.devise ?? 'XOF',
      dureeEssaiJours: input.dureeEssaiJours ?? 14,
      modulesInclus: JSON.stringify(input.modules ?? []),
      actif: true,
    },
  });
  await logAction(db, null, ctx.utilisateurId, 'plan_tarifaire.creation', 'plan_tarifaire', p.id, { nom: input.nom });
  return { planId: p.id };
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
  if (!['in_app', 'sms', 'email', 'push'].includes(canal)) {
    throw new ActionError(`Canal invalide : ${canal}.`, 'CHAMP_INVALIDE');
  }
  if (input.destinataireId) {
    const u = await db.utilisateur.findUnique({ where: { id: input.destinataireId } });
    if (!u) throw new ActionError('Destinataire introuvable.', 'INTROUVABLE');
    assertTenant(u.ecoleId, ctx, 'Ce destinataire');
  }
  const n = await db.notification.create({
    data: {
      ecoleId,
      destinataireId: input.destinataireId ?? null,
      destinataireType: input.destinataireType ?? 'personnel',
      sujet: input.sujet.trim(),
      corps: input.corps.trim(),
      canal,
      statut: 'envoye',
      dateEnvoi: new Date(),
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'notification.envoi', 'notification', n.id, { canal, sujet: input.sujet });
  return { notificationId: n.id };
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
// Examens officiels : convocations réelles (P2)
// --------------------------------------------------------------------

export async function inscrireElevesExamenCore(ctx: Ctx, examenId: string) {
  assertPermission(ctx, 'examens.gerer');
  const examen = await db.examenOfficiel.findUnique({ where: { id: examenId } });
  if (!examen) throw new ActionError('Examen introuvable.', 'INTROUVABLE');
  assertTenant(examen.ecoleId, ctx, 'Cet examen');
  const eleves = await db.eleve.findMany({
    where: { ecoleId: examen.ecoleId, classeActuelle: { niveauId: examen.niveauId }, statut: 'actif' },
  });
  let nouveaux = 0;
  for (const e of eleves) {
    const avant = await db.inscriptionExamenOfficiel.findUnique({
      where: { examenOfficielId_eleveId: { examenOfficielId: examenId, eleveId: e.id } },
    });
    if (avant) continue;
    await db.inscriptionExamenOfficiel.create({
      data: {
        examenOfficielId: examenId,
        eleveId: e.id,
        statut: 'inscrit',
        centreExamen: examen.ecoleId,
      },
    });
    nouveaux++;
  }
  await logAction(db, examen.ecoleId, ctx.utilisateurId, 'examen.inscriptions', 'examen_officiel', examenId, {
    candidats: eleves.length,
    nouveaux,
  });
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

  let convocations = 0;
  await db.$transaction(async (tx) => {
    for (const i of inscriptions) {
      await tx.inscriptionExamenOfficiel.update({
        where: { id: i.id },
        data: {
          statut: 'convoque',
          numeroTable: i.numeroTable ?? `T-${(convocations + 1).toString().padStart(3, '0')}`,
        },
      });
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
  if (!['admis', 'ajourne', 'mention'].includes(resultat)) {
    throw new ActionError(`Résultat invalide : ${resultat} (admis/ajourne/mention).`, 'CHAMP_INVALIDE');
  }
  if (i.statut !== 'presente' && i.statut !== 'convoque') {
    throw new ActionError('Le candidat doit être convoqué et avoir été marqué présent avant la saisie du résultat.', 'STATUT_INVALIDE');
  }
  await db.inscriptionExamenOfficiel.update({
    where: { id: inscriptionId },
    data: { resultat, statut: 'presente' },
  });
  await logAction(db, i.examenOfficiel.ecoleId, ctx.utilisateurId, 'examen.resultat_saisi', 'inscription', inscriptionId, {
    resultat,
    eleveId: i.eleveId,
  });
  return { ok: true };
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
// RDV parents-profs
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
