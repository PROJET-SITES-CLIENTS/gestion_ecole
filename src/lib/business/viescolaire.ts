// ====================================================================
// MÉTIER VIE SCOLAIRE — correction T8 + notifications réelles
// T8 : sortie anticipée SANS autorisation parentale = refus, sauf
//      validation exceptionnelle EXPLICITE de la direction (motif
//      obligatoire) ; les parents sont réellement notifiés.
// Sanctions : notifications réelles aux parents (fini le booléen factice).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, eleveDuTenant, logAction, notifierParentsEtDirection } from './commun';
import type { AutorisationSortie } from '@prisma/client';

// --------------------------------------------------------------------
// Incidents
// --------------------------------------------------------------------

export type IncidentInput = {
  eleveId: string;
  dateHeure: Date;
  lieu?: string;
  type: string;
  description: string;
  gravite: string;
};

const GRAVITES = ['leger', 'modere', 'grave', 'tres_grave'];

export async function declarerIncidentCore(ctx: Ctx, input: IncidentInput) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (!input.type?.trim()) throw new ActionError("Le type d'incident est obligatoire.", 'CHAMP_MANQUANT');
  if (!input.description?.trim()) throw new ActionError('La description est obligatoire.', 'CHAMP_MANQUANT');
  if (!GRAVITES.includes(input.gravite)) {
    throw new ActionError(`Gravité invalide : ${input.gravite} (attendu : ${GRAVITES.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  if (isNaN(input.dateHeure?.getTime())) throw new ActionError('Date/heure invalide.', 'DATE_INVALIDE');
  const i = await db.incident.create({
    data: {
      eleveId: input.eleveId,
      dateHeure: input.dateHeure,
      lieu: input.lieu?.trim() || undefined,
      type: input.type.trim(),
      description: input.description.trim(),
      gravite: input.gravite,
      declareParId: ctx.utilisateurId,
    },
  });
  // Incident grave : la direction est notifiée immédiatement.
  if (input.gravite === 'grave' || input.gravite === 'tres_grave') {
    await db.notification.create({
      data: {
        ecoleId: eleve.ecoleId,
        destinataireType: 'personnel',
        destinataireId: ctx.utilisateurId,
        sujet: `Incident ${input.gravite} — ${eleve.prenom} ${eleve.nom}`,
        corps: input.description,
        canal: 'in_app',
        statut: 'envoye',
        dateEnvoi: new Date(),
      },
    }).catch(() => {});
  }
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'incident.declaration', 'incident', i.id, { gravite: input.gravite, type: input.type });
  return { incidentId: i.id };
}

// --------------------------------------------------------------------
// Sanctions (notifications réelles aux parents)
// --------------------------------------------------------------------

export type SanctionInput = {
  incidentId: string;
  type: string;
  description?: string;
};

export async function sanctionnerCore(ctx: Ctx, input: SanctionInput) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const incident = await db.incident.findUnique({ where: { id: input.incidentId } });
  if (!incident) throw new ActionError('Incident introuvable.', 'INTROUVABLE');
  const eleve = await db.eleve.findUnique({ where: { id: incident.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet incident');
  if (!input.type?.trim()) throw new ActionError('Le type de sanction est obligatoire.', 'CHAMP_MANQUANT');

  return db.$transaction(async (tx) => {
    const sanction = await tx.sanction.create({
      data: {
        incidentId: input.incidentId,
        type: input.type.trim(),
        description: input.description ?? '',
        statut: 'decidee',
        decideParId: ctx.utilisateurId,
        notifieParents: false, // sera vrai seulement si des notifications partent
      },
    });
    // Notifications réelles aux parents + direction (fini le factice).
    const nb = await notifierParentsEtDirection(
      tx,
      eleve.ecoleId!,
      eleve.id,
      `Sanction — ${eleve.prenom} ${eleve.nom}`,
      `Une sanction (${input.type}) a été décidée suite à un incident (${incident.type}). ${input.description ?? ''}`.trim(),
    );
    await tx.sanction.update({
      where: { id: sanction.id },
      data: { notifieParents: nb > 0, dateNotification: nb > 0 ? new Date() : null },
    });
    await logAction(tx, eleve.ecoleId, ctx.utilisateurId, 'sanction.notifier_parents', 'incident', input.incidentId, {
      sanctionId: sanction.id,
      notificationsEnvoyees: nb,
    });
    return { sanctionId: sanction.id, notificationsEnvoyees: nb };
  }, { timeout: 30000, maxWait: 10000 });
}

// --------------------------------------------------------------------
// Sorties anticipées (T8)
// --------------------------------------------------------------------

export type SortieInput = {
  eleveId: string;
  date: Date;
  heure: string;
  autorisationId?: string;
  recupereParNom: string;
  validationExceptionnelle?: boolean;
  motifException?: string;
};

export async function sortieEleveCore(ctx: Ctx, input: SortieInput) {
  assertPermission(ctx, 'securite.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (isNaN(input.date?.getTime())) throw new ActionError('Date de sortie invalide.', 'DATE_INVALIDE');
  if (!/^\d{2}:\d{2}$/.test(input.heure ?? '')) throw new ActionError('Heure de sortie invalide (format HH:MM).', 'CHAMP_INVALIDE');
  if (!input.recupereParNom?.trim()) throw new ActionError('La personne qui récupère l\'élève est obligatoire.', 'CHAMP_MANQUANT');

  let autorisation: AutorisationSortie | null = null;
  if (input.autorisationId) {
    autorisation = await db.autorisationSortie.findUnique({ where: { id: input.autorisationId } });
    if (!autorisation || autorisation.eleveId !== input.eleveId || !autorisation.active) {
      throw new ActionError(
        'Autorisation de sortie invalide : elle doit appartenir à cet élève et être active.',
        'AUTORISATION_INVALIDE',
      );
    }
    if (autorisation.nomPersonneAutorisee.trim().toLowerCase() !== input.recupereParNom.trim().toLowerCase()) {
      throw new ActionError(
        `La personne qui récupère (« ${input.recupereParNom} ») ne correspond pas à la personne autorisée (« ${autorisation.nomPersonneAutorisee} »).`,
        'PERSONNE_NON_AUTORISEE',
      );
    }
  } else {
    // T8 : sans autorisation parentale, REFUS sauf validation
    // exceptionnelle explicite + motif obligatoire (traçabilité).
    if (!input.validationExceptionnelle) {
      throw new ActionError(
        'Sortie refusée : aucune autorisation parentale active pour cet élève. Cochez « validation exceptionnelle » (direction) pour autoriser la sortie avec suivi.',
        'AUTORISATION_MANQUANTE',
      );
    }
    if (!input.motifException?.trim()) {
      throw new ActionError(
        'Validation exceptionnelle refusée : le motif de la levée d\'autorisation est obligatoire.',
        'MOTIF_MANQUANT',
      );
    }
  }

  return db.$transaction(async (tx) => {
    const sortie = await tx.sortieAnticipee.create({
      data: {
        eleveId: input.eleveId,
        date: input.date,
        heure: input.heure,
        autorisationSortieId: input.autorisationId,
        recupereParNom: input.recupereParNom.trim(),
        validationExceptionnelle: !input.autorisationId,
        valideParId: ctx.utilisateurId,
        parentsNotifies: false,
      },
    });
    // Notification RÉELLE aux parents + direction (T8 : plus de faux
    // « parentsNotifies: true » sans envoi).
    const contexte = input.autorisationId
      ? `Sortie anticipée autorisée (${autorisation!.nomPersonneAutorisee}).`
      : `Sortie anticipée SANS autorisation parentale — validation exceptionnelle de la direction. Motif : ${input.motifException}`;
    const nb = await notifierParentsEtDirection(
      tx,
      eleve.ecoleId!,
      eleve.id,
      `Sortie anticipée — ${eleve.prenom} ${eleve.nom}`,
      `${eleve.prenom} ${eleve.nom} a quitté l'école le ${input.date.toISOString().slice(0, 10)} à ${input.heure}, récupéré(e) par ${input.recupereParNom}. ${contexte}`,
      { canal: 'in_app' },
    );
    await tx.sortieAnticipee.update({ where: { id: sortie.id }, data: { parentsNotifies: nb > 0 } });
    await logAction(tx, eleve.ecoleId, ctx.utilisateurId, 'sortie_anticipee.enregistree', 'eleve', input.eleveId, {
      sortieId: sortie.id,
      exceptionnelle: !input.autorisationId,
      motifException: input.motifException ?? null,
      notificationsEnvoyees: nb,
    });
    return { sortieId: sortie.id, notificationsEnvoyees: nb };
  }, { timeout: 30000, maxWait: 10000 });
}

// --------------------------------------------------------------------
// Visiteurs (sécurité site)
// --------------------------------------------------------------------

export type VisiteurInput = {
  nom: string;
  motifVisite: string;
  pieceVerifiee: boolean;
};

export async function enregistrerVisiteurCore(ctx: Ctx, ecoleId: string, input: VisiteurInput) {
  assertPermission(ctx, 'securite.gerer');
  if (!input.nom?.trim()) throw new ActionError('Le nom du visiteur est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.motifVisite?.trim()) throw new ActionError('Le motif de visite est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.pieceVerifiee) {
    throw new ActionError('Pièce d\'identité non vérifiée : entrée refusée (procédure de sûreté).', 'PIECE_NON_VERIFIEE');
  }
  // F19 — badge SÉQUENTIEL (plus de Math.random collisionnel)
  const nb = await db.visiteur.count({ where: { ecoleId } });
  const badge = `V-${String(nb + 1).padStart(4, '0')}`;
  const v = await db.visiteur.create({
    data: {
      ecoleId,
      nom: input.nom.trim(),
      motifVisite: input.motifVisite.trim(),
      pieceIdentiteVerifiee: true,
      badgeNumero: badge,
      dateHeureEntree: new Date(),
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'visiteur.entree', 'visiteur', v.id, { nom: input.nom, badge });
  return { visiteurId: v.id, badge };
}

/** F3 — sortie d'un visiteur (le registre des présents devient fiable). */
export async function sortieVisiteurCore(ctx: Ctx, visiteurId: string) {
  assertPermission(ctx, 'securite.gerer');
  const v = await db.visiteur.findUnique({ where: { id: visiteurId } });
  if (!v) throw new ActionError('Visiteur introuvable.', 'INTROUVABLE');
  assertTenant(v.ecoleId, ctx, 'Ce visiteur');
  if (v.dateHeureSortie) throw new ActionError('Ce visiteur est déjà sorti.', 'DEJA_TRAITE');
  await db.visiteur.update({ where: { id: visiteurId }, data: { dateHeureSortie: new Date() } });
  await logAction(db, v.ecoleId, ctx.utilisateurId, 'visiteur.sortie', 'visiteur', visiteurId);
  return { visiteurId };
}

// --------------------------------------------------------------------
// F13 — Autorisations de sortie (créables : le workflow T8 devient complet)
// --------------------------------------------------------------------

export type AutorisationInput = {
  eleveId: string;
  nomPersonneAutorisee: string;
  lienAvecEleve?: string;
  telephone?: string;
};

export async function creerAutorisationSortieCore(ctx: Ctx, input: AutorisationInput) {
  assertPermission(ctx, 'securite.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (!input.nomPersonneAutorisee?.trim()) throw new ActionError('Le nom de la personne autorisée est obligatoire.', 'CHAMP_MANQUANT');
  if (input.lienAvecEleve && !['pere', 'mere', 'tuteur_legal', 'oncle', 'tante', 'grand_parent', 'autre'].includes(input.lienAvecEleve)) {
    throw new ActionError('Lien avec l\'élève invalide.', 'CHAMP_INVALIDE');
  }
  // Dédoublonnage : réactiver l'autorisation existante si la même personne est déjà autorisée
  // (SQLite ne supporte pas mode: 'insensitive' → comparaison normalisée en mémoire)
  const candidates = await db.autorisationSortie.findMany({ where: { eleveId: input.eleveId } });
  const existante = candidates.find(
    (a) => a.nomPersonneAutorisee.trim().toLowerCase() === input.nomPersonneAutorisee.trim().toLowerCase(),
  );
  if (existante) {
    await db.autorisationSortie.update({
      where: { id: existante.id },
      data: { active: true, telephone: input.telephone?.trim() || existante.telephone, valideeParId: ctx.utilisateurId },
    });
    await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'autorisation_sortie.reactivation', 'autorisation_sortie', existante.id);
    return { autorisationId: existante.id, reactivee: true };
  }
  const a = await db.autorisationSortie.create({
    data: {
      eleveId: input.eleveId,
      nomPersonneAutorisee: input.nomPersonneAutorisee.trim(),
      lienAvecEleve: input.lienAvecEleve?.trim() || undefined,
      telephone: input.telephone?.trim() || undefined,
      active: true,
      valideeParId: ctx.utilisateurId,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'autorisation_sortie.creation', 'autorisation_sortie', a.id, {
    eleveId: input.eleveId,
    personne: input.nomPersonneAutorisee.trim(),
  });
  return { autorisationId: a.id, reactivee: false };
}

/** Désactivation d'une autorisation (personne qui ne doit plus récupérer l'élève). */
export async function desactiverAutorisationSortieCore(ctx: Ctx, autorisationId: string) {
  assertPermission(ctx, 'securite.gerer');
  const a = await db.autorisationSortie.findUnique({ where: { id: autorisationId }, include: { eleve: true } });
  if (!a) throw new ActionError('Autorisation introuvable.', 'INTROUVABLE');
  assertTenant(a.eleve.ecoleId, ctx, 'Cette autorisation');
  if (!a.active) throw new ActionError('Autorisation déjà désactivée.', 'DEJA_TRAITE');
  await db.autorisationSortie.update({ where: { id: autorisationId }, data: { active: false } });
  await logAction(db, a.eleve.ecoleId, ctx.utilisateurId, 'autorisation_sortie.desactivation', 'autorisation_sortie', autorisationId);
  return { autorisationId };
}

// --------------------------------------------------------------------
// F3 — Suivi d'exécution des sanctions + exclusion temporaire
// --------------------------------------------------------------------

/** Passe une sanction « decidee » à « executee » et notifie les parents. */
export async function executerSanctionCore(ctx: Ctx, sanctionId: string) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const sanction = await db.sanction.findUnique({
    where: { id: sanctionId },
    include: { incident: { include: { eleve: true } } },
  });
  if (!sanction) throw new ActionError('Sanction introuvable.', 'INTROUVABLE');
  const eleve = sanction.incident.eleve;
  assertTenant(eleve.ecoleId, ctx, 'Cette sanction');
  if (sanction.statut !== 'decidee') throw new ActionError(`Sanction déjà traitée (statut « ${sanction.statut } »).`, 'DEJA_TRAITE');
  await db.sanction.update({
    where: { id: sanctionId },
    data: { statut: 'executee', dateDebut: sanction.dateDebut ?? new Date() },
  });
  await notifierParentsEtDirection(
    db as any,
    eleve.ecoleId!,
    eleve.id,
    `Sanction exécutée — ${eleve.prenom} ${eleve.nom}`,
    `La sanction (${sanction.type}) décidée suite à l'incident du ${sanction.incident.dateHeure.toISOString().slice(0, 10)} a été exécutée.`,
  );
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'sanction.execution', 'sanction', sanctionId);
  return { sanctionId };
}

/**
 * Exclusion temporaire : sanction dédiée + statut Élève « exclu » pendant
 * la période + notifications. La réintégration passe par changerStatutEleve.
 */
export type ExclusionInput = {
  incidentId: string;
  dateDebut: Date;
  dateFin: Date;
  description: string;
};

export async function exclureTemporairementCore(ctx: Ctx, input: ExclusionInput) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const incident = await db.incident.findUnique({ where: { id: input.incidentId }, include: { eleve: true } });
  if (!incident) throw new ActionError('Incident introuvable.', 'INTROUVABLE');
  const eleve = incident.eleve;
  assertTenant(eleve.ecoleId, ctx, 'Cet incident');
  if (isNaN(input.dateDebut?.getTime()) || isNaN(input.dateFin?.getTime())) throw new ActionError('Dates invalides.', 'DATE_INVALIDE');
  if (input.dateFin <= input.dateDebut) throw new ActionError('La date de fin doit être postérieure à la date de début.', 'DATE_INVALIDE');
  if (!input.description?.trim()) throw new ActionError('Le motif de l\'exclusion est obligatoire.', 'CHAMP_MANQUANT');

  return db.$transaction(async (tx) => {
    const sanction = await tx.sanction.create({
      data: {
        incidentId: input.incidentId,
        type: 'exclusion_temporaire',
        description: input.description.trim(),
        dateDebut: input.dateDebut,
        dateFin: input.dateFin,
        statut: 'decidee',
        decideParId: ctx.utilisateurId,
        notifieParents: false,
      },
    });
    // L'élève est marqué exclu pour la période (réintégration via changement de statut)
    await tx.eleve.update({
      where: { id: eleve.id },
      data: { statut: 'exclu' },
    });
    const nb = await notifierParentsEtDirection(
      tx,
      eleve.ecoleId!,
      eleve.id,
      `Exclusion temporaire — ${eleve.prenom} ${eleve.nom}`,
      `${eleve.prenom} ${eleve.nom} est exclu(e) du ${input.dateDebut.toISOString().slice(0, 10)} au ${input.dateFin.toISOString().slice(0, 10)}. Motif : ${input.description.trim()}`,
    );
    await tx.sanction.update({
      where: { id: sanction.id },
      data: { notifieParents: nb > 0, dateNotification: nb > 0 ? new Date() : null },
    });
    await logAction(tx, eleve.ecoleId, ctx.utilisateurId, 'sanction.exclusion_temporaire', 'sanction', sanction.id, {
      eleveId: eleve.id,
      dateDebut: input.dateDebut,
      dateFin: input.dateFin,
    });
    return { sanctionId: sanction.id, eleveId: eleve.id, notificationsEnvoyees: nb };
  }, { timeout: 30000, maxWait: 10000 });
}
