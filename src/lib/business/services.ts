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
  tarifJournalier: number; // CENTIMES (F16)
};

export async function inscrireCantineCore(ctx: Ctx, input: CantineInput) {
  assertPermission(ctx, 'services.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (input.joursSemaine.length === 0) throw new ActionError('Sélectionnez au moins un jour de la semaine.', 'CHAMP_MANQUANT');
  if (input.joursSemaine.some((j) => j < 1 || j > 6 || !Number.isInteger(j))) {
    throw new ActionError('Jours invalides (1 = lundi … 6 = samedi).', 'CHAMP_INVALIDE');
  }
  if (!Number.isInteger(input.tarifJournalier) || input.tarifJournalier <= 0) {
    throw new ActionError('Le tarif journalier doit être positif.', 'MONTANT_INVALIDE');
  }
  if (!eleve.classeActuelleId) throw new ActionError("L'élève n'est affecté à aucune classe.", 'CLASSE_MANQUANTE');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: eleve.ecoleId, active: true } });
  if (!annee) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');

  // F19 — @@unique(eleveId, anneeScolaireId) : upsert déterministe
  const existante = await db.cantineInscription.findUnique({
    where: { eleveId_anneeScolaireId: { eleveId: eleve.id, anneeScolaireId: annee.id } },
  });
  if (existante) {
    await db.cantineInscription.update({
      where: { id: existante.id },
      data: {
        joursSemaine: JSON.stringify([...new Set(input.joursSemaine)].sort()),
        tarifJournalier: input.tarifJournalier,
        classeId: eleve.classeActuelleId,
        actif: true, // F3 : une réinscription réactive l'inscription annulée
      },
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

/** F3 — désactivation d'une inscription cantine. */
export async function annulerCantineCore(ctx: Ctx, inscriptionId: string) {
  assertPermission(ctx, 'services.gerer');
  const inscription = await db.cantineInscription.findUnique({ where: { id: inscriptionId } });
  if (!inscription) throw new ActionError('Inscription cantine introuvable.', 'INTROUVABLE');
  assertTenant(inscription.ecoleId, ctx, 'Cette inscription');
  if (!inscription.actif) throw new ActionError('Inscription déjà désactivée.', 'DEJA_TRAITE');
  await db.cantineInscription.update({ where: { id: inscriptionId }, data: { actif: false } });
  await logAction(db, inscription.ecoleId, ctx.utilisateurId, 'cantine.annulation', 'cantine_inscription', inscriptionId);
  return { inscriptionId };
}

// --------------------------------------------------------------------
// Bibliothèque
// --------------------------------------------------------------------

/** F3 — création d'un livre (exemplairesDisponibles = exemplairesTotal). */
export type LivreInput = {
  titre: string;
  auteur?: string;
  editeur?: string;
  isbn?: string;
  anneePublication?: number;
  exemplairesTotal: number;
  categorie?: string;
  cote?: string;
};

export async function creerLivreBiblioCore(ctx: Ctx, ecoleId: string, input: LivreInput) {
  assertPermission(ctx, 'services.gerer');
  if (!input.titre?.trim()) throw new ActionError('Le titre du livre est obligatoire.', 'CHAMP_MANQUANT');
  if (!Number.isInteger(input.exemplairesTotal) || input.exemplairesTotal < 1) {
    throw new ActionError('Le nombre d\'exemplaires doit être un entier ≥ 1.', 'CHAMP_INVALIDE');
  }
  if (input.anneePublication && (input.anneePublication < 1400 || input.anneePublication > new Date().getFullYear() + 1)) {
    throw new ActionError('Année de publication invraisemblable.', 'CHAMP_INVALIDE');
  }
  const l = await db.biblioLivre.create({
    data: {
      ecoleId,
      titre: input.titre.trim(),
      auteur: input.auteur?.trim() || undefined,
      editeur: input.editeur?.trim() || undefined,
      isbn: input.isbn?.trim() || undefined,
      anneePublication: input.anneePublication,
      exemplairesTotal: input.exemplairesTotal,
      exemplairesDisponibles: input.exemplairesTotal,
      categorie: input.categorie?.trim() || undefined,
      cote: input.cote?.trim() || undefined,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'biblio.livre_creation', 'biblio_livre', l.id, { titre: input.titre, exemplaires: input.exemplairesTotal });
  return { livreId: l.id };
}

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
  // F16 — pénalité 25 XOF/jour de retard = 2500 centimes
  const penalite = now > pret.dateRetourPrevue ? Math.ceil((now.getTime() - pret.dateRetourPrevue.getTime()) / 86400000) * 2500 : 0;
  await db.$transaction(async (tx) => {
    await tx.biblioPret.update({
      where: { id: pretId },
      data: { dateRetourEffective: now, statut: 'rendu', penaliteGeneree: penalite },
    });
    await tx.biblioLivre.update({
      where: { id: pret.livreId },
      data: { exemplairesDisponibles: { increment: 1 } },
    });
    // B6 — la pénalité devient une ÉCHÉANCE réelle encaissable
    if (penalite > 0) {
      const eleve = await tx.eleve.findUnique({ where: { id: pret.eleveId } });
      if (eleve) {
        const anneeActive = await tx.anneeScolaire.findFirst({ where: { ecoleId: eleve.ecoleId, active: true } });
        if (anneeActive) {
          let fraisPenalite = await tx.frais.findFirst({ where: { ecoleId: eleve.ecoleId, libelle: 'Pénalités de bibliothèque' } });
          if (!fraisPenalite) {
            fraisPenalite = await tx.frais.create({ data: { ecoleId: eleve.ecoleId, libelle: 'Pénalités de bibliothèque', type: 'activite', montant: 0, devise: 'XOF', periodicite: 'unique', anneeScolaireId: anneeActive.id } });
          }
          await tx.echeanceFrais.create({
            data: { eleveId: pret.eleveId, fraisId: fraisPenalite.id, montant: penalite, devise: 'XOF', dateEcheance: new Date(Date.now() + 7 * 86400000), statut: 'impayee', source: `Pénalité retard livre « ${pret.livre.titre} »` },
          });
        }
      }
    }
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

/** F3 — restitution d'un manuel : réincrément du stock + état de retour. */
export async function retournerManuelCore(ctx: Ctx, attributionId: string, etatRetour: string) {
  assertPermission(ctx, 'services.gerer');
  const attribution = await db.attributionManuel.findUnique({
    where: { id: attributionId },
    include: { manuelScolaire: true },
  });
  if (!attribution) throw new ActionError('Attribution introuvable.', 'INTROUVABLE');
  assertTenant(attribution.manuelScolaire.ecoleId, ctx, 'Cette attribution');
  if (attribution.statut !== 'en_cours') throw new ActionError('Cette attribution est déjà clôturée.', 'DEJA_TRAITE');
  if (!['bon', 'usage', 'endommage', 'perdu'].includes(etatRetour)) {
    throw new ActionError('État de retour invalide (bon/usage/endommage/perdu).', 'CHAMP_INVALIDE');
  }
  await db.$transaction(async (tx) => {
    await tx.attributionManuel.update({
      where: { id: attributionId },
      data: {
        statut: etatRetour === 'perdu' ? 'perdu' : 'rendu',
        etatRetour,
      },
    });
    // Un manuel perdu ne réintègre pas le stock
    if (etatRetour !== 'perdu') {
      await tx.manuelScolaire.update({
        where: { id: attribution.manuelScolaireId },
        data: { quantiteStock: { increment: 1 } },
      });
    }
    await logAction(tx, attribution.manuelScolaire.ecoleId, ctx.utilisateurId, 'manuel.restitution', 'attribution_manuel', attributionId, { etatRetour });
  }, { timeout: 30000, maxWait: 10000 });
  return { attributionId, etatRetour };
}
