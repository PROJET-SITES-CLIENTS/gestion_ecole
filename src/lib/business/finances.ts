// ====================================================================
// MÉTIER FINANCES — corrections d'intégrité T1, T2, T6
// T1 : génération d'échéances idempotente (@@unique + upsert logique)
// T2 : encaissement TRANSACTIONNEL, refus si montant > restant dû
// T6 : montant strictement positif
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, eleveDuTenant, logAction, avecRetryConflit } from './commun';

// --------------------------------------------------------------------
// Encaissement (T2 + T6)
// --------------------------------------------------------------------

export type EncaissementInput = {
  eleveId: string;
  montant: number;
  modePaiement: string;
  reference?: string;
};

const MODES = ['espece', 'cheque', 'virement', 'carte', 'mobile_money'];

export async function encaisserPaiementCore(ctx: Ctx, input: EncaissementInput) {
  assertPermission(ctx, 'finances.voir');
  if (!(input.montant > 0)) {
    throw new ActionError('Le montant encaissé doit être strictement positif.', 'MONTANT_INVALIDE');
  }
  if (!Number.isFinite(input.montant)) {
    throw new ActionError('Montant invalide.', 'MONTANT_INVALIDE');
  }
  if (!MODES.includes(input.modePaiement)) {
    throw new ActionError(`Mode de paiement inconnu : ${input.modePaiement}.`, 'MODE_INVALIDE');
  }
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  const ecoleId = eleve.ecoleId;

  // Tout l'encaissement est atomique : lecture des échéances fraîches,
  // contrôle du restant dû, création du paiement et allocation.
  // avecRetryConflit : si deux guichets encaissent en même temps, le
  // perdant de la course SQLite RETENTE et obtient le refus métier propre.
  return avecRetryConflit(() => db.$transaction(async (tx) => {
    const echeances = await tx.echeanceFrais.findMany({
      where: { eleveId: input.eleveId, statut: { in: ['impayee', 'partiel'] } },
      orderBy: { dateEcheance: 'asc' },
    });
    const restantDu = echeances.reduce((s, e) => s + (e.montant - e.montantPaye), 0);
    if (input.montant > restantDu) {
      throw new ActionError(
        `Le montant encaissé (${input.montant} XOF) dépasse le restant dû (${restantDu.toFixed(0)} XOF). Corrigez le montant ou créez la échéance manquante.`,
        'MONTANT_EXCEDENT',
      );
    }

    const reference =
      input.reference && input.reference.trim() ? input.reference.trim() : `PAY-${Date.now().toString().slice(-8)}`;

    const paiement = await tx.paiement.create({
      data: {
        ecoleId,
        eleveId: input.eleveId,
        montant: input.montant,
        devise: (await tx.ecole.findUnique({ where: { id: ecoleId } }))?.devise ?? 'XOF',
        modePaiement: input.modePaiement,
        referenceTransaction: reference,
        encaisseParId: ctx.utilisateurId,
      },
    });

    let reste = input.montant;
    let alloue = 0;
    for (const e of echeances) {
      if (reste <= 0) break;
      const du = e.montant - e.montantPaye;
      const applique = Math.min(reste, du);
      const nouveauPaye = e.montantPaye + applique;
      await tx.echeanceFrais.update({
        where: { id: e.id },
        data: { montantPaye: nouveauPaye, statut: nouveauPaye >= e.montant ? 'payee' : 'partiel' },
      });
      await tx.paiementEcheance.create({
        data: { paiementId: paiement.id, echeanceId: e.id, montantApplique: applique },
      });
      reste -= applique;
      alloue += applique;
    }

    await logAction(tx, ecoleId, ctx.utilisateurId, 'paiement.encaissement', 'paiement', paiement.id, {
      montant: input.montant,
      eleveId: input.eleveId,
      modePaiement: input.modePaiement,
      alloue,
      reference,
    });
    return { paiementId: paiement.id, reference, alloue };
  }, { timeout: 30000, maxWait: 10000 }));
}

// --------------------------------------------------------------------
// Génération d'échéances de classe (T1 — idempotent)
// --------------------------------------------------------------------

export type EcheancesClasseInput = {
  fraisId: string;
  classeId: string;
  dateEcheance: Date;
};

export async function genererEcheancesClasseCore(ctx: Ctx, input: EcheancesClasseInput) {
  assertPermission(ctx, 'finances.voir');
  const frais = await db.frais.findUnique({ where: { id: input.fraisId } });
  if (!frais) throw new ActionError('Frais introuvable.', 'INTROUVABLE');
  assertTenant(frais.ecoleId, ctx, 'Ce frais');
  const classe = await db.classe.findUnique({ where: { id: input.classeId } });
  if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');
  if (!(frais.montant > 0)) throw new ActionError('Le montant du frais doit être positif.', 'MONTANT_INVALIDE');
  if (isNaN(input.dateEcheance.getTime())) throw new ActionError('Date d\'échéance invalide.', 'DATE_INVALIDE');

  const eleves = await db.eleve.findMany({ where: { classeActuelleId: input.classeId, statut: 'actif' } });

  // Idempotent : l'@@unique(eleveId, fraisId, dateEcheance) + existence
  // vérifiée DANS la transaction rend le double-clic inoffensif.
  return db.$transaction(async (tx) => {
    let crees = 0;
    for (const e of eleves) {
      const existe = await tx.echeanceFrais.findUnique({
        where: {
          eleveId_fraisId_dateEcheance: {
            eleveId: e.id,
            fraisId: input.fraisId,
            dateEcheance: input.dateEcheance,
          },
        },
      });
      if (existe) continue; // déjà générée (idempotence T1)
      await tx.echeanceFrais.create({
        data: {
          eleveId: e.id,
          fraisId: input.fraisId,
          montant: frais.montant,
          devise: frais.devise,
          dateEcheance: input.dateEcheance,
          statut: 'impayee',
        },
      });
      crees++;
    }
    await logAction(tx, frais.ecoleId, ctx.utilisateurId, 'echeances.generation', 'classe', input.classeId, {
      fraisId: input.fraisId,
      eleves: eleves.length,
      nouvelles: crees,
      dateEcheance: input.dateEcheance,
    });
    return { crees, totalEleves: eleves.length };
  }, { timeout: 30000, maxWait: 10000 });
}

// --------------------------------------------------------------------
// Frais / dépenses
// --------------------------------------------------------------------

export type FraisInput = {
  libelle: string;
  type: string;
  montant: number;
  periodicite?: string;
  niveauId?: string;
};

export async function creerFraisCore(ctx: Ctx, ecoleId: string, input: FraisInput) {
  assertPermission(ctx, 'finances.voir');
  if (!input.libelle?.trim()) throw new ActionError('Le libellé du frais est obligatoire.', 'CHAMP_MANQUANT');
  if (!(input.montant > 0)) throw new ActionError('Le montant du frais doit être strictement positif.', 'MONTANT_INVALIDE');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId, active: true } });
  if (!annee) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');
  if (input.niveauId) {
    const n = await db.niveau.findUnique({ where: { id: input.niveauId } });
    if (!n) throw new ActionError('Niveau introuvable.', 'INTROUVABLE');
  }
  const frais = await db.frais.create({
    data: {
      ecoleId,
      libelle: input.libelle.trim(),
      type: input.type,
      montant: input.montant,
      devise: (await db.ecole.findUnique({ where: { id: ecoleId } }))?.devise ?? 'XOF',
      periodicite: input.periodicite ?? 'unique',
      niveauId: input.niveauId,
      anneeScolaireId: annee.id,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'frais.creation', 'frais', frais.id, { libelle: input.libelle, montant: input.montant });
  return { fraisId: frais.id };
}

export type DepenseInput = {
  categorie: string;
  description: string;
  montant: number;
  dateDepense: Date;
  fournisseur?: string;
};

export async function enregistrerDepenseCore(ctx: Ctx, ecoleId: string, input: DepenseInput) {
  assertPermission(ctx, 'finances.voir');
  if (!input.categorie?.trim()) throw new ActionError('La catégorie est obligatoire.', 'CHAMP_MANQUANT');
  if (!(input.montant > 0)) throw new ActionError('Le montant de la dépense doit être strictement positif.', 'MONTANT_INVALIDE');
  if (isNaN(input.dateDepense.getTime())) throw new ActionError('Date de dépense invalide.', 'DATE_INVALIDE');
  const d = await db.depense.create({
    data: {
      ecoleId,
      categorie: input.categorie.trim(),
      description: input.description ?? '',
      montant: input.montant,
      devise: (await db.ecole.findUnique({ where: { id: ecoleId } }))?.devise ?? 'XOF',
      dateDepense: input.dateDepense,
      fournisseur: input.fournisseur?.trim() || undefined,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'depense.enregistrement', 'depense', d.id, { montant: input.montant, categorie: input.categorie });
  return { depenseId: d.id };
}

export async function validerDepenseCore(ctx: Ctx, depenseId: string) {
  assertPermission(ctx, 'finances.valider');
  const d = await db.depense.findUnique({ where: { id: depenseId } });
  if (!d) throw new ActionError('Dépense introuvable.', 'INTROUVABLE');
  assertTenant(d.ecoleId, ctx, 'Cette dépense');
  if (d.validee) throw new ActionError('Dépense déjà validée.', 'DEJA_TRAITE');
  await db.depense.update({
    where: { id: depenseId },
    data: { validee: true, valideeParId: ctx.utilisateurId, dateValidation: new Date() },
  });
  await logAction(db, d.ecoleId, ctx.utilisateurId, 'depense.validation', 'depense', depenseId);
  return { ok: true };
}

// --------------------------------------------------------------------
// Stock (T3)
// --------------------------------------------------------------------

export type MouvementStockInput = {
  articleId: string;
  type: 'entree' | 'sortie';
  quantite: number;
  motif?: string;
};

export async function enregistrerMouvementStockCore(ctx: Ctx, input: MouvementStockInput) {
  assertPermission(ctx, 'finances.voir');
  const article = await db.stockArticle.findUnique({ where: { id: input.articleId } });
  if (!article) throw new ActionError('Article de stock introuvable.', 'INTROUVABLE');
  assertTenant(article.ecoleId, ctx, 'Cet article');
  if (!['entree', 'sortie'].includes(input.type)) {
    throw new ActionError(
      `Type de mouvement invalide : « ${input.type} ». Types autorisés : entree, sortie.`,
      'TYPE_INVALIDE',
    );
  }
  if (!Number.isInteger(input.quantite) || input.quantite <= 0) {
    throw new ActionError('La quantité doit être un entier strictement positif.', 'QUANTITE_INVALIDE');
  }

  // Transaction : la sortie n'est acceptée que si le stock courant suffit.
  return db.$transaction(async (tx) => {
    const art = await tx.stockArticle.findUnique({ where: { id: input.articleId } });
    if (!art) throw new ActionError('Article introuvable.', 'INTROUVABLE');
    if (input.type === 'sortie' && input.quantite > art.quantite) {
      throw new ActionError(
        `Stock insuffisant : ${input.quantite} demandé, ${art.quantite} disponible (« ${art.nom} »).`,
        'STOCK_INSUFFISANT',
      );
    }
    const delta = input.type === 'entree' ? input.quantite : -input.quantite;
    const mvt = await tx.mouvementStock.create({
      data: {
        articleId: input.articleId,
        type: input.type,
        quantite: input.quantite,
        motif: input.motif?.trim() || undefined,
        effectueParId: ctx.utilisateurId,
      },
    });
    const maj = await tx.stockArticle.update({
      where: { id: input.articleId },
      data: { quantite: { increment: delta } },
    });
    await logAction(tx, art.ecoleId, ctx.utilisateurId, 'stock.mouvement', 'stock_article', input.articleId, {
      type: input.type,
      quantite: input.quantite,
      stockApres: maj.quantite,
    });
    return { mouvementId: mvt.id, stockApres: maj.quantite };
  }, { timeout: 30000, maxWait: 10000 });
}
