// ====================================================================
// MÉTIER RH — flux congés + remplacements (P2)
// demande → validation/refus → remplacement planifié (contrôles :
// chevauchements, remplacement par soi-même, dates cohérentes)
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction } from './commun';

async function personnelDuTenant(personnelId: string, ctx: Ctx) {
  const p = await db.personnel.findUnique({ where: { id: personnelId } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  return p;
}

function validerDates(debut: Date, fin: Date) {
  if (isNaN(debut.getTime()) || isNaN(fin.getTime())) throw new ActionError('Dates invalides.', 'DATE_INVALIDE');
  if (fin < debut) throw new ActionError('La date de fin doit être postérieure à la date de début.', 'DATE_INVALIDE');
}

/** Un congé (non refusé) chevauche-t-il la période pour ce personnel ? */
async function congeEnChevauchement(personnelId: string, debut: Date, fin: Date, exclureId?: string) {
  const existants = await db.conge.findMany({
    where: { personnelId, statut: { in: ['demande', 'valide'] } },
  });
  return existants.some((c) => {
    if (exclureId && c.id === exclureId) return false;
    return debut <= c.dateFin && fin >= c.dateDebut;
  });
}

// --------------------------------------------------------------------
// Demande de congé
// --------------------------------------------------------------------

export type DemandeCongeInput = {
  personnelId: string;
  type: string;
  dateDebut: Date;
  dateFin: Date;
  motif?: string;
};

const TYPES_CONGE = ['annuel', 'maladie', 'maternite', 'exceptionnel'];

export async function demanderCongeCore(ctx: Ctx, input: DemandeCongeInput) {
  assertPermission(ctx, 'rh.gerer');
  const p = await personnelDuTenant(input.personnelId, ctx);
  if (!TYPES_CONGE.includes(input.type)) {
    throw new ActionError(`Type de congé invalide : ${input.type} (attendu : ${TYPES_CONGE.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  validerDates(input.dateDebut, input.dateFin);
  if (await congeEnChevauchement(input.personnelId, input.dateDebut, input.dateFin)) {
    throw new ActionError('Chevauchement détecté : ce personnel a déjà un congé (demandé ou validé) sur cette période.', 'CHEVAUCHEMENT');
  }
  const c = await db.conge.create({
    data: {
      personnelId: input.personnelId,
      type: input.type,
      dateDebut: input.dateDebut,
      dateFin: input.dateFin,
      statut: 'demande',
      motif: input.motif?.trim() || undefined,
    },
  });
  await logAction(db, p.ecoleId, ctx.utilisateurId, 'conge.demande', 'conge', c.id, { personnelId: input.personnelId, type: input.type });
  return { congeId: c.id };
}

// --------------------------------------------------------------------
// Validation / refus
// --------------------------------------------------------------------

export async function traiterCongeCore(ctx: Ctx, congeId: string, decision: 'valide' | 'refuse', commentaire?: string) {
  assertPermission(ctx, 'rh.gerer');
  const c = await db.conge.findUnique({ where: { id: congeId } });
  if (!c) throw new ActionError('Congé introuvable.', 'INTROUVABLE');
  const p = await db.personnel.findUnique({ where: { id: c.personnelId } });
  assertTenant(p?.ecoleId, ctx, 'Ce congé');
  if (c.statut !== 'demande') {
    throw new ActionError(`Congé déjà traité (statut « ${c.statut} »).`, 'DEJA_TRAITE');
  }
  await db.conge.update({
    where: { id: congeId },
    data: { statut: decision, traiteParId: ctx.utilisateurId, motif: commentaire?.trim() || c.motif },
  });
  await logAction(db, p!.ecoleId, ctx.utilisateurId, `conge.${decision}`, 'conge', congeId, { personnelId: c.personnelId });
  return { ok: true };
}

// --------------------------------------------------------------------
// Remplacement
// --------------------------------------------------------------------

export type RemplacementInput = {
  congeId: string;
  personnelRemplacantId: string;
  dateDebut: Date;
  dateFin: Date;
};

export async function assignerRemplacementCore(ctx: Ctx, input: RemplacementInput) {
  assertPermission(ctx, 'rh.gerer');
  const conge = await db.conge.findUnique({ where: { id: input.congeId } });
  if (!conge) throw new ActionError('Congé introuvable.', 'INTROUVABLE');
  const absent = await db.personnel.findUnique({ where: { id: conge.personnelId } });
  assertTenant(absent?.ecoleId, ctx, 'Ce congé');
  const remplacant = await personnelDuTenant(input.personnelRemplacantId, ctx);
  if (remplacant.id === conge.personnelId) {
    throw new ActionError('Le remplaçant ne peut pas être la personne absente.', 'REMPLACEMENT_INVALIDE');
  }
  if (conge.statut !== 'valide') {
    throw new ActionError('Le congé doit être validé avant de planifier un remplacement.', 'CONGE_NON_VALIDE');
  }
  validerDates(input.dateDebut, input.dateFin);
  // Le remplaçant ne doit pas être en congé ni déjà remplaçant sur la période.
  if (await congeEnChevauchement(remplacant.id, input.dateDebut, input.dateFin)) {
    throw new ActionError('Le remplaçant est en congé (ou a une demande) sur cette période.', 'CHEVAUCHEMENT');
  }
  const remplacementsExistants = await db.remplacement.findMany({
    where: { personnelRemplacantId: remplacant.id, statut: { in: ['planifie', 'en_cours'] } },
  });
  if (remplacementsExistants.some((r) => input.dateDebut <= r.dateFin && input.dateFin >= r.dateDebut)) {
    throw new ActionError('Le remplaçant assure déjà un remplacement sur cette période.', 'CHEVAUCHEMENT');
  }

  const r = await db.remplacement.create({
    data: {
      congeId: input.congeId,
      personnelAbsentId: conge.personnelId,
      personnelRemplacantId: remplacant.id,
      dateDebut: input.dateDebut,
      dateFin: input.dateFin,
      statut: 'planifie',
    },
  });
  await logAction(db, absent!.ecoleId, ctx.utilisateurId, 'remplacement.assignation', 'remplacement', r.id, {
    absentId: conge.personnelId,
    remplacantId: remplacant.id,
  });
  return { remplacementId: r.id };
}
