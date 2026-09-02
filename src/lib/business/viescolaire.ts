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
  description: string;
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
  const v = await db.visiteur.create({
    data: {
      ecoleId,
      nom: input.nom.trim(),
      motifVisite: input.motifVisite.trim(),
      pieceIdentiteVerifiee: true,
      badgeNumero: `V-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      dateHeureEntree: new Date(),
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'visiteur.entree', 'visiteur', v.id, { nom: input.nom });
  return { visiteurId: v.id, badge: v.badgeNumero };
}
