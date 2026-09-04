// ====================================================================
// MÉTIER PRÉSENCES
// - P1 : le motif d'appel est persisté (Presence.motifAbsence)
// - F7  : la séance ET chaque élève sont rattachés au tenant
// - F13 : justification d'absence (parent en ligne + back-office)
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, notifierParentsEtDirection } from './commun';
import { MOTIFS_JUSTIFICATION, STATUTS_PRESENCE } from '@/lib/constants';

export type SaisieAppelInput = {
  seanceId: string;
  presences: Array<{ eleveId: string; statut: string; minuteRetard?: number; motif?: string }>;
};

export async function saisirAppelCore(ctx: Ctx, input: SaisieAppelInput) {
  assertPermission(ctx, 'presences.saisir');
  const seance = await db.seance.findUnique({ where: { id: input.seanceId }, include: { classe: true } });
  if (!seance) throw new ActionError('Séance introuvable.', 'INTROUVABLE');
  // F7 — la séance appartient à une classe, la classe appartient à l'école
  assertTenant(seance.classe.ecoleId, ctx, 'Cette séance');
  if (input.presences.length === 0) throw new ActionError('Aucune présence saisie.', 'SAISIE_VIDE');

  // F7 — tous les élèves appelés appartiennent à la classe de la séance
  const ids = [...new Set(input.presences.map((p) => p.eleveId))];
  const eleves = await db.eleve.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, classeActuelleId: true, ecoleId: true },
  });
  if (eleves.length !== ids.length) throw new ActionError('Élève introuvable dans l\'appel.', 'INTROUVABLE');
  for (const e of eleves) {
    assertTenant(e.ecoleId, ctx, 'Un élève de l\'appel');
    if (e.classeActuelleId !== seance.classeId) {
      throw new ActionError(
        'Un élève de l\'appel n\'appartient pas à la classe de cette séance : appel refusé.',
        'CORRESPONDANCE_INVALIDE',
      );
    }
  }

  for (const p of input.presences) {
    if (!(STATUTS_PRESENCE as readonly string[]).includes(p.statut)) {
      throw new ActionError(`Statut invalide : « ${p.statut} » (attendu : ${STATUTS_PRESENCE.join(', ')}).`, 'CHAMP_INVALIDE');
    }
    if (p.statut === 'retard' && (p.minuteRetard ?? 0) < 0) {
      throw new ActionError('Les minutes de retard ne peuvent pas être négatives.', 'CHAMP_INVALIDE');
    }
  }

  await db.$transaction(async (tx) => {
    for (const p of input.presences) {
      await tx.presence.upsert({
        where: { eleveId_seanceId: { eleveId: p.eleveId, seanceId: input.seanceId } },
        create: {
          eleveId: p.eleveId,
          seanceId: input.seanceId,
          statut: p.statut,
          minuteRetard: p.statut === 'retard' ? p.minuteRetard ?? 0 : null,
          motifAbsence: p.motif?.trim() || null,
          saisiParId: ctx.utilisateurId,
        },
        update: {
          statut: p.statut,
          minuteRetard: p.statut === 'retard' ? p.minuteRetard ?? 0 : null,
          motifAbsence: p.motif?.trim() || null,
          saisiParId: ctx.utilisateurId,
        },
      });
    }
    await logAction(tx, seance.classe.ecoleId, ctx.utilisateurId, 'presence.saisie', 'seance', input.seanceId, { count: input.presences.length });
  }, { timeout: 30000, maxWait: 10000 });
  return { count: input.presences.length };
}

// --------------------------------------------------------------------
// F13 — Justification d'absence
// --------------------------------------------------------------------

export type JustificationInput = {
  eleveId: string;
  dateAbsence: Date;
  motif: string;
  dureeHeures?: number;
  description?: string;
  presenceId?: string;
};

/**
 * Soumet une justification d'absence.
 * - Parent (ctx.type === 'parent') : l'élève DOIT être un de ses enfants
 *   (résolu serveur via ParentTuteur du compte — jamais depuis le formulaire).
 * - Personnel : permission presences.saisir ou vie_scolaire.gerer.
 */
export async function justifierAbsenceCore(ctx: Ctx, input: JustificationInput) {
  let eleveId = input.eleveId;
  let ecoleId: string | null = null;

  if (ctx.type === 'parent') {
    const parent = await db.parentTuteur.findFirst({ where: { utilisateurId: ctx.utilisateurId } });
    if (!parent) throw new ActionError('Aucun dossier parent associé à votre compte.', 'INTROUVABLE');
    const lien = await db.eleveParent.findUnique({ where: { eleveId_parentId: { eleveId, parentId: parent.id } } });
    if (!lien) throw new ActionError('Cet élève n\'est pas rattaché à votre compte parent.', 'TENANT_INVALIDE');
    ecoleId = parent.ecoleId;
  } else {
    assertPermission(ctx, 'presences.saisir');
    const eleve = await db.eleve.findUnique({ where: { id: eleveId } });
    if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
    assertTenant(eleve.ecoleId, ctx, 'Cet élève');
    ecoleId = eleve.ecoleId;
  }

  if (isNaN(input.dateAbsence?.getTime())) throw new ActionError('Date d\'absence invalide.', 'DATE_INVALIDE');
  if (input.dateAbsence > new Date()) throw new ActionError('La date d\'absence ne peut pas être dans le futur.', 'DATE_INVALIDE');
  if (!(MOTIFS_JUSTIFICATION as readonly string[]).includes(input.motif)) {
    throw new ActionError(`Motif invalide (attendu : ${MOTIFS_JUSTIFICATION.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  if (input.dureeHeures !== undefined && (input.dureeHeures <= 0 || input.dureeHeures > 24)) {
    throw new ActionError('La durée (heures) doit être comprise entre 0 et 24.', 'CHAMP_INVALIDE');
  }
  // Si une présence est ciblée : elle doit être une absence de CET élève
  if (input.presenceId) {
    const presence = await db.presence.findUnique({ where: { id: input.presenceId } });
    if (!presence || presence.eleveId !== eleveId) {
      throw new ActionError('La présence ciblée ne correspond pas à cet élève.', 'CORRESPONDANCE_INVALIDE');
    }
  }

  const j = await db.justificationAbsence.create({
    data: {
      ecoleId,
      eleveId,
      presenceId: input.presenceId,
      dateAbsence: input.dateAbsence,
      dureeHeures: input.dureeHeures,
      motif: input.motif,
      description: input.description?.trim() || null,
      statut: 'soumis',
      soumisParId: ctx.utilisateurId,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'absence.justification_soumise', 'justification_absence', j.id, { eleveId, motif: input.motif });
  return { justificationId: j.id };
}

/** Validation / rejet d'une justification (back-office). */
export async function traiterJustificationCore(ctx: Ctx, justificationId: string, decision: 'valide' | 'rejete', commentaire?: string) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const j = await db.justificationAbsence.findUnique({ where: { id: justificationId } });
  if (!j) throw new ActionError('Justification introuvable.', 'INTROUVABLE');
  if (j.ecoleId) assertTenant(j.ecoleId, ctx, 'Cette justification');
  if (j.statut !== 'soumis') throw new ActionError('Justification déjà traitée.', 'DEJA_TRAITE');
  await db.justificationAbsence.update({
    where: { id: justificationId },
    data: {
      statut: decision,
      valideParId: ctx.utilisateurId,
      dateValidation: new Date(),
      commentaireValidation: commentaire?.trim() || null,
    },
  });
  // Absence validée → la présence liée (si fournie) passe en « excusé »
  if (decision === 'valide' && j.presenceId) {
    await db.presence.update({ where: { id: j.presenceId }, data: { statut: 'excuse' } });
  }
  await logAction(db, j.ecoleId, ctx.utilisateurId, `absence.justification_${decision}`, 'justification_absence', justificationId, {
    commentaire: commentaire?.trim() || null,
  });
  return { justificationId, statut: decision };
}

// --------------------------------------------------------------------
// C10 — Absentéisme : statistiques par classe + relance des parents
// --------------------------------------------------------------------
export async function statsAbsentéismeCore(ctx: Ctx, periodeJours: number) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const début = new Date(Date.now() - periodeJours * 86400000);
  const présences = await db.presence.findMany({
    where: { dateSaisie: { gte: début }, statut: { in: ['absent', 'retard'] } },
    include: { eleve: { include: { classeActuelle: true } } },
  });
  const parClasse = new Map<string, { classe: string; absences: number; retards: number; élèvesTouchés: Set<string> }>();
  for (const p of présences) {
    const cle = p.eleve.classeActuelle?.id ?? 'sans-classe';
    const cur = parClasse.get(cle) ?? { classe: p.eleve.classeActuelle?.libelle ?? '—', absences: 0, retards: 0, élèvesTouchés: new Set<string>() };
    if (p.statut === 'absent') cur.absences++;
    else cur.retards++;
    cur.élèvesTouchés.add(p.eleve.id);
    parClasse.set(cle, cur);
  }
  const totalÉlèves = await db.eleve.count({ where: { deletedAt: null, statut: 'actif' } });
  const totalCours = await db.seance.count({ where: { date: { gte: début } } });
  return {
    fenêtreJours: periodeJours,
    totalAbsences: présences.filter((p) => p.statut === 'absent').length,
    totalRetards: présences.filter((p) => p.statut === 'retard').length,
    tauxAbsentéisme: totalCours > 0 && totalÉlèves > 0 ? Number(((présences.filter((p) => p.statut === 'absent').length / (totalCours * totalÉlèves)) * 100).toFixed(2)) : 0,
    parClasse: [...parClasse.values()].map((c) => ({ classe: c.classe, absences: c.absences, retards: c.retards, élèvesTouchés: c.élèvesTouchés.size })),
  };
}

/** Relance les parents des élèves dépassant le seuil d'absences sur la période. */
export async function relancerAbsencesCore(ctx: Ctx, seuilAbsences: number, periodeJours: number) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const début = new Date(Date.now() - periodeJours * 86400000);
  const absences = await db.presence.findMany({
    where: { dateSaisie: { gte: début }, statut: 'absent' },
    include: { eleve: true },
  });
  const compteur = new Map<string, { nom: string; prenom: string; count: number; ecoleId: string }>();
  for (const a of absences) {
    const cur = compteur.get(a.eleveId) ?? { nom: a.eleve.nom, prenom: a.eleve.prenom, count: 0, ecoleId: a.eleve.ecoleId };
    cur.count++;
    compteur.set(a.eleveId, cur);
  }
  let notifiés = 0;
  for (const [eleveId, info] of compteur) {
    if (info.count < seuilAbsences) continue;
    await notifierParentsEtDirection(
      db as any, info.ecoleId, eleveId,
      `Absentéisme — ${info.prenom} ${info.nom}`,
      `${info.prenom} ${info.nom} compte ${info.count} absence(s) sur les ${periodeJours} derniers jours (seuil : ${seuilAbsences}). Merci de prendre contact avec la vie scolaire.`,
    );
    notifiés++;
  }
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'absentéisme.relance', undefined, undefined, { seuil: seuilAbsences, fenêtre: periodeJours, notifiés });
  return { famillesNotifiées: notifiés };
}
