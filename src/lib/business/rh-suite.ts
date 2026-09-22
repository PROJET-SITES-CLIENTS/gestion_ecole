// ====================================================================
// RH SUITE — sortie formelle, renouvellement de contrat, pilotage RH
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, notifierParentsEtDirection } from './commun';

export const MOTIFS_SORTIE_PERSONNEL = ['demission', 'fin_contrat', 'retraite', 'licenciement', 'mutualisation', 'deces'] as const;

// --------------------------------------------------------------------
// 1. SORTIE FORMELLE du personnel (démission, retraite, licenciement…)
// --------------------------------------------------------------------

export async function quitterPersonnelCore(ctx: Ctx, input: {
  personnelId: string; motifSortie: string; dateSortie: Date; preavisJours?: number; commentaire?: string;
}) {
  assertPermission(ctx, 'rh.gerer');
  const p = await db.personnel.findUnique({ where: { id: input.personnelId }, include: { utilisateur: true } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  if (p.statut !== 'actif') throw new ActionError('Ce personnel n\'est plus actif.', 'DEJA_TRAITE');
  if (!(MOTIFS_SORTIE_PERSONNEL as readonly string[]).includes(input.motifSortie)) {
    throw new ActionError(`Motif invalide (${MOTIFS_SORTIE_PERSONNEL.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  if (isNaN(input.dateSortie?.getTime())) throw new ActionError('Date de sortie invalide.', 'DATE_INVALIDE');
  if (input.dateSortie < p.dateEmbauche) throw new ActionError('La date de sortie précède l\'embauche.', 'DATE_INVALIDE');

  await db.$transaction(async (tx) => {
    await tx.personnel.update({
      where: { id: input.personnelId },
      data: {
        statut: 'sorti', dateSortie: input.dateSortie,
        motifSortie: `${input.motifSortie}${input.commentaire ? ` — ${input.commentaire.trim().slice(0, 180)}` : ''}`,
      },
    });
    // Clôture du contrat actif
    await tx.contratPersonnel.updateMany({
      where: { personnelId: input.personnelId, actif: true },
      data: { actif: false, dateFin: input.dateSortie },
    });
    // Désactivation du compte utilisateur (le portail devient inaccessible,
    // l'historique est conservé — jamais de DELETE)
    if (p.utilisateurId) {
      await tx.utilisateur.update({ where: { id: p.utilisateurId }, data: { actif: false } });
      await tx.sessionUtilisateur.updateMany({ where: { utilisateurId: p.utilisateurId }, data: { dateExpiration: new Date() } });
    }
    await logAction(tx, p.ecoleId, ctx.utilisateurId, 'personnel.sortie', 'personnel', input.personnelId, {
      motif: input.motifSortie, dateSortie: input.dateSortie, preavisJours: input.preavisJours,
    } as never);
  });
  return { personnelId: input.personnelId, statut: 'sorti' };
}

// --------------------------------------------------------------------
// 2. RENOUVELLEMENT DE CONTRAT (CDD → nouveau terme, historisé)
// --------------------------------------------------------------------

export async function renouvelerContratCore(ctx: Ctx, input: {
  personnelId: string; nouvelleDateFin: Date; nouveauSalaireBrut?: number; nouveauType?: string;
}) {
  assertPermission(ctx, 'rh.gerer');
  const p = await db.personnel.findUnique({ where: { id: input.personnelId }, include: { contrats: { where: { actif: true } } } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  const courant = p.contrats[0];
  if (!courant) throw new ActionError('Aucun contrat actif à renouveler.', 'INTROUVABLE');
  if (courant.typeContrat === 'CDI') throw new ActionError('Un CDI n\'a pas de terme à renouveler (passez par une avenant de salaire).', 'TYPE_INVALIDE');
  if (input.nouvelleDateFin <= courant.dateDebut) throw new ActionError('Nouveau terme invalide.', 'DATE_INVALIDE');

  await db.$transaction(async (tx) => {
    // L'ancien contrat est clos (historique conservé), le nouveau prend le relais
    await tx.contratPersonnel.update({ where: { id: courant.id }, data: { actif: false, dateFin: new Date() } });
    const salaire = input.nouveauSalaireBrut ?? courant.salaireBrut;
    await tx.contratPersonnel.create({
      data: {
        personnelId: input.personnelId,
        typeContrat: input.nouveauType ?? courant.typeContrat,
        salaireBrut: salaire, dateDebut: new Date(), dateFin: input.nouvelleDateFin, actif: true,
      },
    });
    if (input.nouveauSalaireBrut) {
      await tx.personnel.update({ where: { id: input.personnelId }, data: { salaireBrut: input.nouveauSalaireBrut } });
    }
    await logAction(tx, p.ecoleId, ctx.utilisateurId, 'personnel.renouvellement', 'personnel', input.personnelId, {
      terme: input.nouvelleDateFin, salaire: salaire,
    });
  });
  return { personnelId: input.personnelId, nouveauTerme: input.nouvelleDateFin };
}

// --------------------------------------------------------------------
// 3. PILOTAGE RH — effectifs, masse salariale, ancienneté, fins de contrats
// --------------------------------------------------------------------

export async function statsRhCore(ctx: Ctx) {
  assertPermission(ctx, 'rh.gerer');
  const ecoleId = ctx.ecoleId!;
  const personnels = await db.personnel.findMany({
    where: { ecoleId, deletedAt: null },
    include: { contrats: { where: { actif: true } } },
  });
  const actifs = personnels.filter((p) => p.statut === 'actif');
  const maintenant = new Date();

  // Masse salariale mensuelle brute (contrats actifs)
  const masseSalariale = actifs.reduce((s, p) => s + (p.salaireBrut ?? p.contrats[0]?.salaireBrut ?? 0), 0);
  const parTypeContrat = new Map<string, { nb: number; masse: number }>();
  for (const p of actifs) {
    const t = p.contrats[0]?.typeContrat ?? p.typeContrat ?? '—';
    const cur = parTypeContrat.get(t) ?? { nb: 0, masse: 0 };
    cur.nb++; cur.masse += p.salaireBrut ?? p.contrats[0]?.salaireBrut ?? 0;
    parTypeContrat.set(t, cur);
  }
  // Ancienneté
  const anciennetes = actifs.map((p) => (maintenant.getTime() - p.dateEmbauche.getTime()) / (365.25 * 864e5));
  const ancienneteMoyenne = anciennetes.length ? Number((anciennetes.reduce((s, a) => s + a, 0) / anciennetes.length).toFixed(1)) : 0;
  // Fins de contrats CDD imminentes (60 jours)
  const finsImminentes: any[] = actifs
    .map((p: any) => ({ personnel: p, contrat: p.contrats.find((c: any) => c.dateFin) ?? null }))
    .filter((x: any) => !!x.contrat?.dateFin && (x.contrat.dateFin.getTime() - maintenant.getTime()) <= 60 * 864e5 && x.contrat.dateFin > maintenant)
    .map((x) => ({
      personnelId: x.personnel.id, nom: `${x.personnel.prenom} ${x.personnel.nom}`,
      type: x.contrat!.typeContrat, dateFin: x.contrat!.dateFin,
      joursRestants: Math.ceil((x.contrat!.dateFin.getTime() - maintenant.getTime()) / 864e5),
    }))
    .sort((a, b) => a.joursRestants - b.joursRestants);
  // Absentéisme (congés + remplacements en cours)
  const congesEnCours = await db.conge.count({ where: { personnel: { ecoleId }, statut: 'valide', dateDebut: { lte: maintenant }, dateFin: { gte: maintenant } } });
  const formationsEnCours = await db.formationPersonnel.count({ where: { ecoleId, statut: 'en_cours' } });
  const sanctionsAnnee = await db.sanctionPersonnel.count({
    where: { ecoleId, dateFaits: { gte: new Date(maintenant.getFullYear(), 0, 1) } },
  });
  return {
    total: personnels.length,
    actifs: actifs.length,
    sortis: personnels.filter((p) => p.statut !== 'actif').length,
    masseSalarialeMensuelle: masseSalariale,
    cotisationPatronaleEstimee: Math.round(masseSalariale * 0.084),
    parTypeContrat: [...parTypeContrat.entries()].map(([type, v]) => ({ type, ...v })),
    ancienneteMoyenneAnnees: ancienneteMoyenne,
    plusAncien: actifs.length ? (() => { const p = actifs.reduce((a, b) => (a.dateEmbauche < b.dateEmbauche ? a : b)); return { nom: `${p.prenom} ${p.nom}`, depuis: p.dateEmbauche }; })() : null,
    finsContratsImminentes: finsImminentes,
    congesEnCours, formationsEnCours, sanctionsAnnee,
    repartition: { hommes: actifs.filter((p) => p.sexe === 'M').length, femmes: actifs.filter((p) => p.sexe === 'F').length },
  };
}
