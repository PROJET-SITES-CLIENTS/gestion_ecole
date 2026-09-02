// ====================================================================
// MÉTIER SERVICES — cantine, bibliothèque, manuels (P2)
// Inscription cantine, prêt/retour de livre avec détection de
// disponibilité, attribution de manuels avec décrément du stock.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, eleveDuTenant, logAction } from './commun';

// --------------------------------------------------------------------
// Cantine
// --------------------------------------------------------------------

export type CantineInput = {
  eleveId: string;
  joursSemaine: number[];
  tarifJournalier: number;
};

export async function inscrireCantineCore(ctx: Ctx, input: CantineInput) {
  assertPermission(ctx, 'services.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (input.joursSemaine.length === 0) throw new ActionError('Sélectionnez au moins un jour de la semaine.', 'CHAMP_MANQUANT');
  if (input.joursSemaine.some((j) => j < 1 || j > 6 || !Number.isInteger(j))) {
    throw new ActionError('Jours invalides (1 = lundi … 6 = samedi).', 'CHAMP_INVALIDE');
  }
  if (!(input.tarifJournalier > 0)) throw new ActionError('Le tarif journalier doit être positif.', 'MONTANT_INVALIDE');
  if (!eleve.classeActuelleId) throw new ActionError("L'élève n'est affecté à aucune classe.", 'CLASSE_MANQUANTE');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: eleve.ecoleId, active: true } });
  if (!annee) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');

  const existante = await db.cantineInscription.findFirst({ where: { eleveId: eleve.id, actif: true } });
  if (existante) {
    // Réinscription : mise à jour des jours et du tarif.
    await db.cantineInscription.update({
      where: { id: existante.id },
      data: { joursSemaine: JSON.stringify([...new Set(input.joursSemaine)].sort()), tarifJournalier: input.tarifJournalier },
    });
    await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'cantine.reinscription', 'cantine_inscription', existante.id, {
      eleveId: eleve.id,
      jours: input.joursSemaine,
    });
    return { inscriptionId: existante.id, miseAJour: true };
  }
  const c = await db.cantineInscription.create({
    data: {
      ecoleId: eleve.ecoleId,
      eleveId: eleve.id,
      classeId: eleve.classeActuelleId,
      anneeScolaireId: annee.id,
      joursSemaine: JSON.stringify([...new Set(input.joursSemaine)].sort()),
      tarifJournalier: input.tarifJournalier,
      actif: true,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'cantine.inscription', 'cantine_inscription', c.id, {
    eleveId: eleve.id,
    jours: input.joursSemaine,
  });
  return { inscriptionId: c.id, miseAJour: false };
}

// --------------------------------------------------------------------
// Bibliothèque
// --------------------------------------------------------------------

export type PretInput = {
  livreId: string;
  eleveId: string;
  dureeJours: number;
};

export async function preterLivreCore(ctx: Ctx, input: PretInput) {
  assertPermission(ctx, 'services.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  const livre = await db.biblioLivre.findUnique({ where: { id: input.livreId } });
  if (!livre) throw new ActionError('Livre introuvable.', 'INTROUVABLE');
  assertTenant(livre.ecoleId, ctx, 'Ce livre');
  if (!Number.isInteger(input.dureeJours) || input.dureeJours <= 0 || input.dureeJours > 60) {
    throw new ActionError('La durée du prêt doit être comprise entre 1 et 60 jours.', 'CHAMP_INVALIDE');
  }

  return db.$transaction(async (tx) => {
    const l = await tx.biblioLivre.findUnique({ where: { id: input.livreId } });
    if (!l || l.exemplairesDisponibles <= 0) {
      throw new ActionError(`Aucun exemplaire disponible de « ${l?.titre ?? 'ce livre'} » (0/${l?.exemplairesTotal ?? 0}).`, 'STOCK_INSUFFISANT');
    }
    const p = await tx.biblioPret.create({
      data: {
        livreId: input.livreId,
        eleveId: input.eleveId,
        datePret: new Date(),
        dateRetourPrevue: new Date(Date.now() + input.dureeJours * 24 * 3600 * 1000),
        statut: 'en_cours',
      },
    });
    await tx.biblioLivre.update({
      where: { id: input.livreId },
      data: { exemplairesDisponibles: { decrement: 1 } },
    });
    await logAction(tx, l.ecoleId, ctx.utilisateurId, 'biblio.pret', 'biblio_pret', p.id, {
      livreId: input.livreId,
      eleveId: input.eleveId,
    });
    return { pretId: p.id, retourPrevu: p.dateRetourPrevue };
  }, { timeout: 30000, maxWait: 10000 });
}

export async function retournerLivreCore(ctx: Ctx, pretId: string) {
  assertPermission(ctx, 'services.gerer');
  const pret = await db.biblioPret.findUnique({ where: { id: pretId }, include: { livre: true } });
  if (!pret) throw new ActionError('Prêt introuvable.', 'INTROUVABLE');
  assertTenant(pret.livre.ecoleId, ctx, 'Ce prêt');
  if (pret.statut !== 'en_cours') throw new ActionError('Ce prêt est déjà clôturé.', 'DEJA_TRAITE');

  const now = new Date();
  const penalite = now > pret.dateRetourPrevue ? Math.ceil((now.getTime() - pret.dateRetourPrevue.getTime()) / 86400000) * 25 : 0;
  await db.$transaction(async (tx) => {
    await tx.biblioPret.update({
      where: { id: pretId },
      data: { dateRetourEffective: now, statut: 'rendu', penaliteGeneree: penalite },
    });
    await tx.biblioLivre.update({
      where: { id: pret.livreId },
      data: { exemplairesDisponibles: { increment: 1 } },
    });
  }, { timeout: 30000, maxWait: 10000 });
  await logAction(db, pret.livre.ecoleId, ctx.utilisateurId, 'biblio.retour', 'biblio_pret', pretId, { penalite });
  return { penalite };
}

// --------------------------------------------------------------------
// Manuels scolaires
// --------------------------------------------------------------------

export type AttributionManuelInput = {
  manuelScolaireId: string;
  eleveId: string;
  etatRemise: string;
};

export async function attribuerManuelCore(ctx: Ctx, input: AttributionManuelInput) {
  assertPermission(ctx, 'services.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  const manuel = await db.manuelScolaire.findUnique({ where: { id: input.manuelScolaireId } });
  if (!manuel) throw new ActionError('Manuel introuvable.', 'INTROUVABLE');
  assertTenant(manuel.ecoleId, ctx, 'Ce manuel');
  if (!['bon', 'usage', 'endommage'].includes(input.etatRemise)) {
    throw new ActionError(`État de remise invalide : ${input.etatRemise} (bon/usage/endommage).`, 'CHAMP_INVALIDE');
  }

  return db.$transaction(async (tx) => {
    const m = await tx.manuelScolaire.findUnique({ where: { id: input.manuelScolaireId } });
    if (!m || m.quantiteStock <= 0) {
      throw new ActionError(`Stock de manuels épuisé pour « ${m?.titre ?? 'ce manuel'} » (0 exemplaire).`, 'STOCK_INSUFFISANT');
    }
    const a = await tx.attributionManuel.create({
      data: {
        manuelScolaireId: input.manuelScolaireId,
        eleveId: input.eleveId,
        dateAttribution: new Date(),
        etatRemise: input.etatRemise,
        statut: 'en_cours',
      },
    });
    await tx.manuelScolaire.update({
      where: { id: input.manuelScolaireId },
      data: { quantiteStock: { decrement: 1 } },
    });
    await logAction(tx, m.ecoleId, ctx.utilisateurId, 'manuel.attribution', 'attribution_manuel', a.id, {
      eleveId: input.eleveId,
      manuelId: input.manuelScolaireId,
    });
    return { attributionId: a.id };
  }, { timeout: 30000, maxWait: 10000 });
}
