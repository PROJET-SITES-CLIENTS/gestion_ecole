// ====================================================================
// MÉTIER FINANCES
// - T1 : génération d'échéances idempotente (@@unique + upsert logique)
// - T2 : encaissement TRANSACTIONNEL, refus si montant > restant dû
// - T6 : montant strictement positif
// - F8 : écritures financières derrière « finances.ecrire » (plus « finances.voir »)
// - F16 : tous les montants sont des ENTIERS en CENTIMES
// - F19 : référence de paiement unique (collision-proof)
// - F3  : annulation/remboursement/remise — plus aucune erreur irréversible
// ====================================================================

import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, eleveDuTenant, logAction, avecRetryConflit, avecVerrou } from './commun';
import { MODES_PAIEMENT } from '@/lib/constants';

// --------------------------------------------------------------------
// Helpers communs
// --------------------------------------------------------------------

/** Statut d'une échéance compte tenu de la remise (F19). */
function statutEcheance(montant: number, remise: number, montantPaye: number): 'impayee' | 'partiel' | 'payee' {
  const net = montant - remise;
  if (montantPaye >= net) return 'payee';
  if (montantPaye > 0) return 'partiel';
  return 'impayee';
}

/** Génère une référence de paiement unique (F19 : plus de collision à la seconde). */
function genererReferencePaiement(): string {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Génère un numéro de pièce unique par école (F19). tx-safe. */
async function prochainNumero(ecoleId: string, prefixe: string, client: Pick<typeof db, 'avoirEcole'> = db): Promise<string> {
  for (let essai = 0; essai < 5; essai++) {
    const numero = `${prefixe}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const existant = await client.avoirEcole.findUnique({ where: { ecoleId_numero: { ecoleId, numero } } });
    if (!existant) return numero;
  }
  return `${prefixe}-${Date.now()}-${randomBytes(4).toString('hex')}`;
}

/** Valide qu'un montant en centimes est entier, positif et fini. */
function assertMontantCentimes(montant: number, libelle = 'montant') {
  if (!Number.isFinite(montant) || !Number.isInteger(montant)) {
    throw new ActionError(`${libelle} invalide.`, 'MONTANT_INVALIDE');
  }
  if (montant <= 0) {
    throw new ActionError(`Le ${libelle} doit être strictement positif.`, 'MONTANT_INVALIDE');
  }
}

// --------------------------------------------------------------------
// Encaissement (T2 + T6 + F8 + F16)
// --------------------------------------------------------------------

export type EncaissementInput = {
  eleveId: string;
  montant: number; // CENTIMES
  modePaiement: string;
  reference?: string;
  echeanceId?: string; // F3 : allocation ciblée (optionnelle, sinon FIFO)
};

export async function encaisserPaiementCore(ctx: Ctx, input: EncaissementInput) {
  assertPermission(ctx, 'finances.ecrire'); // F8 — écrire de l'argent ≠ lire
  assertMontantCentimes(input.montant, 'montant encaissé');
  if (!(MODES_PAIEMENT as readonly string[]).includes(input.modePaiement)) {
    throw new ActionError(`Mode de paiement inconnu : ${input.modePaiement}.`, 'MODE_INVALIDE');
  }
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  const ecoleId = eleve.ecoleId;
  // Idempotence (T2 durci) : la référence est calculée UNE fois pour toutes
  // les tentatives — si un COMMIT a réussi mais que Prisma a rapporté une
  // erreur de concurrence (P2034 au commit), le retry RETROUVE le paiement
  // déjà encaissé au lieu d'en créer un second.
  const reference = input.reference && input.reference.trim() ? input.reference.trim() : genererReferencePaiement();

  // Tout l'encaissement est atomique : lecture des échéances fraîches,
  // contrôle du restant dû, création du paiement et allocation.
  const résultat = await avecVerrou(`fin:${input.eleveId}`, () => avecRetryConflit(() => db.$transaction(async (tx) => {
    const dejaEncaisse = await tx.paiement.findUnique({ where: { referenceTransaction: reference } });
    if (dejaEncaisse && !dejaEncaisse.annule) {
      // Tentative précédente COMMITÉE malgré l'erreur rapportée : rien à refaire.
      return { paiementId: dejaEncaisse.id, reference, alloue: 0, dejaEncaisse: true };
    }
    const toutes = await tx.echeanceFrais.findMany({
      where: { eleveId: input.eleveId, statut: { in: ['impayee', 'partiel'] } },
      orderBy: { dateEcheance: 'asc' },
    });
    // Allocation ciblée (F3) : si une échéance est précisée, on vérifie
    // qu'elle appartient bien à l'élève et on la traite en priorité.
    let echeances = toutes;
    if (input.echeanceId) {
      const cible = toutes.find((e) => e.id === input.echeanceId);
      if (!cible) throw new ActionError('Échéance introuvable ou déjà soldée pour cet élève.', 'ECHEANCE_INVALIDE');
      echeances = [cible, ...toutes.filter((e) => e.id !== input.echeanceId)];
    }
    const restantDu = echeances.reduce((s, e) => s + (e.montant - e.remise - e.montantPaye), 0);
    if (input.montant > restantDu) {
      throw new ActionError(
        `Le montant encaissé dépasse le restant dû. Corrigez le montant ou créez l'échéance manquante.`,
        'MONTANT_EXCEDENT',
      );
    }

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
      const net = e.montant - e.remise;
      const du = net - e.montantPaye;
      if (du <= 0) continue;
      const applique = Math.min(reste, du);
      // ALLOCATION ATOMIQUE (T2 durci) : le SQL vérifie le restant dû ET
      // incrémente en une seule passe. SQLite ne sérialise pas les
      // transactions différées (lectures périmées = double allocation) :
      // ce verrou optimiste rend le dépassement IMPOSSIBLE quel que soit
      // l'entrelacement des guichets.
      const maj = await tx.$executeRaw`
        UPDATE "EcheanceFrais"
        SET "montantPaye" = "montantPaye" + ${applique},
            "statut" = CASE
              WHEN "montantPaye" + ${applique} >= ("montant" - "remise") THEN 'payee'
              ELSE 'partiel'
            END
        WHERE "id" = ${e.id} AND ("montant" - "remise" - "montantPaye") >= ${applique}`;
      if (process.env.SG_TRACE_TX === '1') {
        console.error(`[TX] ref=${reference} eche=${e.id.slice(-6)} lu=${e.montantPaye} applique=${applique} maj=${maj}`);
      }
      if (maj === 0) {
        throw new ActionError(
          'Le montant encaissé dépasse le restant dû (encaissement concurrent détecté).',
          'MONTANT_EXCEDENT',
        );
      }
      await tx.paiementEcheance.create({
        data: { paiementId: paiement.id, echeanceId: e.id, montantApplique: applique },
      });
      reste -= applique;
      alloue += applique;
    }

    await logAction(tx, ecoleId, ctx.utilisateurId, 'paiement.encaissement', 'paiement', paiement.id, {
      montantCentimes: input.montant,
      eleveId: input.eleveId,
      modePaiement: input.modePaiement,
      alloueCentimes: alloue,
      reference,
    });
    return { paiementId: paiement.id, reference, alloue };
  }, { timeout: 30000, maxWait: 10000 })));
  // B12 — webhook (jamais bloquant)
  if (!('dejaEncaisse' in résultat && résultat.dejaEncaisse)) {
    try {
      const { emettreWebhook } = await import('./integrations');
      await emettreWebhook(ecoleId, 'paiement.encaissement', { paiementId: résultat.paiementId, montantCentimes: input.montant, reference: résultat.reference });
    } catch { /* silencieux */ }
  }
  return résultat;
}

// --------------------------------------------------------------------
// F3 — Annulation / remboursement de paiement (miroir exact de l'allocation)
// --------------------------------------------------------------------

export async function annulerPaiementCore(ctx: Ctx, paiementId: string, motif: string, rembourser = false) {
  assertPermission(ctx, 'finances.ecrire');
  if (!motif?.trim()) throw new ActionError('Le motif d\'annulation est obligatoire.', 'CHAMP_MANQUANT');
  const p = await db.paiement.findUnique({
    where: { id: paiementId },
    include: { echeances: true },
  });
  if (!p) throw new ActionError('Paiement introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce paiement');
  if (p.annule) throw new ActionError('Ce paiement est déjà annulé.', 'DEJA_TRAITE');

  const result = await avecVerrou(`fin:${p.eleveId ?? p.id}`, () => avecRetryConflit(() => db.$transaction(async (tx) => {
    // 1) Désallocation ATOMIQUE : chaque échéance rend ce que ce paiement
    // y avait mis (décrément SQL — insensible aux lectures périmées).
    for (const pe of p.echeances) {
      const e = await tx.echeanceFrais.findUnique({ where: { id: pe.echeanceId } });
      if (!e) continue;
      if (e.statut === 'annulee') continue;
      await tx.$executeRaw`
        UPDATE "EcheanceFrais"
        SET "montantPaye" = GREATEST(0, "montantPaye" - ${pe.montantApplique}::int),
            "statut" = CASE
              WHEN GREATEST(0, "montantPaye" - ${pe.montantApplique}::int) >= ("montant" - "remise") THEN 'payee'
              WHEN GREATEST(0, "montantPaye" - ${pe.montantApplique}::int) > 0 THEN 'partiel'
              ELSE 'impayee'
            END
        WHERE "id" = ${pe.echeanceId}`;
    }
    // 2) Marquage du paiement (jamais de DELETE : trace comptable).
    await tx.paiement.update({
      where: { id: paiementId },
      data: {
        annule: true,
        dateAnnulation: new Date(),
        motifAnnulation: motif.trim(),
        annuleParId: ctx.utilisateurId,
      },
    });
    // 3) Remboursement : émission d'un avoir (F3).
    let avoirNumero: string | null = null;
    if (rembourser) {
      avoirNumero = await prochainNumero(p.ecoleId, 'AV', tx);
      await tx.avoirEcole.create({
        data: {
          ecoleId: p.ecoleId,
          numero: avoirNumero,
          montant: p.montant,
          devise: p.devise,
          motif: `Remboursement suite annulation : ${motif.trim()}`,
          paiementLieId: p.id,
          statut: 'emis',
          emisParId: ctx.utilisateurId,
        },
      });
    }
    await logAction(tx, p.ecoleId, ctx.utilisateurId, rembourser ? 'paiement.remboursement' : 'paiement.annulation', 'paiement', paiementId, {
      motif: motif.trim(),
      montantCentimes: p.montant,
      avoirNumero,
    });
    return { paiementId, avoirNumero };
  }, { timeout: 30000, maxWait: 10000 })));
  return result;
}

// --------------------------------------------------------------------
// F3 — Annulation / remise d'échéance (bourse)
// --------------------------------------------------------------------

export async function annulerEcheanceCore(ctx: Ctx, echeanceId: string, motif: string) {
  assertPermission(ctx, 'finances.ecrire');
  if (!motif?.trim()) throw new ActionError('Le motif est obligatoire.', 'CHAMP_MANQUANT');
  const e = await db.echeanceFrais.findUnique({ where: { id: echeanceId }, include: { eleve: true } });
  if (!e) throw new ActionError('Échéance introuvable.', 'INTROUVABLE');
  assertTenant(e.eleve.ecoleId, ctx, 'Cette échéance');
  if (e.montantPaye > 0) {
    throw new ActionError('Impossible d\'annuler une échéance déjà partiellement payée. Annulez d\'abord les paiements concernés.', 'ECHEANCE_PAYEE');
  }
  if (e.statut === 'annulee') throw new ActionError('Échéance déjà annulée.', 'DEJA_TRAITE');
  await db.echeanceFrais.update({ where: { id: echeanceId }, data: { statut: 'annulee', source: motif.trim() } });
  await logAction(db, e.eleve.ecoleId, ctx.utilisateurId, 'echeance.annulation', 'echeance_frais', echeanceId, { motif: motif.trim() });
  return { echeanceId };
}

export async function remiseEcheanceCore(ctx: Ctx, echeanceId: string, remiseCentimes: number, motif: string) {
  assertPermission(ctx, 'finances.ecrire');
  if (!motif?.trim()) throw new ActionError('Le motif de la remise est obligatoire (bourse, aide sociale…).', 'CHAMP_MANQUANT');
  const e = await db.echeanceFrais.findUnique({ where: { id: echeanceId }, include: { eleve: true } });
  if (!e) throw new ActionError('Échéance introuvable.', 'INTROUVABLE');
  assertTenant(e.eleve.ecoleId, ctx, 'Cette échéance');
  assertMontantCentimes(remiseCentimes, 'montant de la remise');
  if (e.montantPaye + remiseCentimes > e.montant) {
    throw new ActionError('La remise plus les sommes déjà payées dépassent le montant de l\'échéance.', 'REMISE_EXCEDENT');
  }
  if (e.statut === 'annulee') throw new ActionError('Échéance annulée : opération impossible.', 'DEJA_TRAITE');
  const nouveauStatut = statutEcheance(e.montant, remiseCentimes, e.montantPaye);
  await db.echeanceFrais.update({
    where: { id: echeanceId },
    data: { remise: remiseCentimes, motifRemise: motif.trim(), statut: nouveauStatut },
  });
  await logAction(db, e.eleve.ecoleId, ctx.utilisateurId, 'echeance.remise', 'echeance_frais', echeanceId, {
    remiseCentimes,
    motif: motif.trim(),
  });
  return { echeanceId, statut: nouveauStatut };
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
  assertPermission(ctx, 'finances.ecrire');
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
  return avecVerrou('fin:gen', () => db.$transaction(async (tx) => {
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
  }, { timeout: 30000, maxWait: 10000 }));
}

// --------------------------------------------------------------------
// Frais / dépenses (F8 + F16 + F3)
// --------------------------------------------------------------------

export type FraisInput = {
  libelle: string;
  type: string;
  montant: number; // CENTIMES
  periodicite?: string;
  niveauId?: string;
};

export async function creerFraisCore(ctx: Ctx, ecoleId: string, input: FraisInput) {
  assertPermission(ctx, 'finances.ecrire');
  if (!input.libelle?.trim()) throw new ActionError('Le libellé du frais est obligatoire.', 'CHAMP_MANQUANT');
  assertMontantCentimes(input.montant, 'montant du frais');
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
  await logAction(db, ecoleId, ctx.utilisateurId, 'frais.creation', 'frais', frais.id, { libelle: input.libelle, montantCentimes: input.montant });
  return { fraisId: frais.id };
}

export type DepenseInput = {
  categorie: string;
  description: string;
  montant: number; // CENTIMES
  dateDepense: Date;
  fournisseur?: string;
};

export async function enregistrerDepenseCore(ctx: Ctx, ecoleId: string, input: DepenseInput) {
  assertPermission(ctx, 'finances.ecrire');
  if (!input.categorie?.trim()) throw new ActionError('La catégorie est obligatoire.', 'CHAMP_MANQUANT');
  assertMontantCentimes(input.montant, 'montant de la dépense');
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
      creeParId: ctx.utilisateurId, // C9 — traçabilité du saisisseur
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'depense.enregistrement', 'depense', d.id, { montantCentimes: input.montant, categorie: input.categorie });
  return { depenseId: d.id };
}

export async function validerDepenseCore(ctx: Ctx, depenseId: string) {
  assertPermission(ctx, 'finances.valider');
  const d = await db.depense.findUnique({ where: { id: depenseId } });
  if (!d) throw new ActionError('Dépense introuvable.', 'INTROUVABLE');
  assertTenant(d.ecoleId, ctx, 'Cette dépense');
  if (d.annulee) throw new ActionError('Dépense annulée : validation impossible.', 'DEJA_TRAITE');
  if (d.validee) throw new ActionError('Dépense déjà validée.', 'DEJA_TRAITE');
  // C9 — SÉPARATION DES TÂCHES : le saisisseur ne peut pas valider sa dépense
  if (d.creeParId && d.creeParId === ctx.utilisateurId && ctx.type !== 'super_admin') {
    throw new ActionError('Séparation des tâches : vous ne pouvez pas valider une dépense que vous avez vous-même saisie.', 'SEPARATION_TACHES');
  }
  await db.depense.update({
    where: { id: depenseId },
    data: { validee: true, valideeParId: ctx.utilisateurId, dateValidation: new Date() },
  });
  await logAction(db, d.ecoleId, ctx.utilisateurId, 'depense.validation', 'depense', depenseId);
  return { depenseId };
}

export async function annulerDepenseCore(ctx: Ctx, depenseId: string, motif: string) {
  assertPermission(ctx, 'finances.ecrire');
  if (!motif?.trim()) throw new ActionError('Le motif d\'annulation est obligatoire.', 'CHAMP_MANQUANT');
  const d = await db.depense.findUnique({ where: { id: depenseId } });
  if (!d) throw new ActionError('Dépense introuvable.', 'INTROUVABLE');
  assertTenant(d.ecoleId, ctx, 'Cette dépense');
  if (d.validee) throw new ActionError('Une dépense VALIDÉE ne peut plus être annulée (traçabilité comptable).', 'DEPENSE_VALIDEE');
  if (d.annulee) throw new ActionError('Dépense déjà annulée.', 'DEJA_TRAITE');
  await db.depense.update({
    where: { id: depenseId },
    data: { annulee: true },
  });
  await logAction(db, d.ecoleId, ctx.utilisateurId, 'depense.annulation', 'depense', depenseId, { motif: motif.trim() });
  return { depenseId };
}

// --------------------------------------------------------------------
// Stock (T3 + F3 : création d'articles)
// --------------------------------------------------------------------

export type MouvementStockInput = {
  articleId: string;
  type: 'entree' | 'sortie';
  quantite: number;
  motif?: string;
};

export async function enregistrerMouvementStockCore(ctx: Ctx, input: MouvementStockInput) {
  assertPermission(ctx, 'finances.ecrire');
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

export type ArticleStockInput = {
  nom: string;
  categorie?: string;
  quantite: number;
  unite?: string;
  seuilAlerte?: number;
  prixUnitaire?: number; // CENTIMES
};

export async function creerArticleStockCore(ctx: Ctx, ecoleId: string, input: ArticleStockInput) {
  assertPermission(ctx, 'finances.ecrire');
  if (!input.nom?.trim()) throw new ActionError('Le nom de l\'article est obligatoire.', 'CHAMP_MANQUANT');
  if (!Number.isInteger(input.quantite) || input.quantite < 0) {
    throw new ActionError('La quantité initiale doit être un entier positif.', 'QUANTITE_INVALIDE');
  }
  if (input.seuilAlerte !== undefined && (!Number.isInteger(input.seuilAlerte) || input.seuilAlerte < 0)) {
    throw new ActionError('Le seuil d\'alerte doit être un entier positif.', 'QUANTITE_INVALIDE');
  }
  if (input.prixUnitaire !== undefined && input.prixUnitaire < 0) {
    throw new ActionError('Le prix unitaire ne peut pas être négatif.', 'MONTANT_INVALIDE');
  }
  const a = await db.stockArticle.create({
    data: {
      ecoleId,
      nom: input.nom.trim(),
      categorie: input.categorie?.trim() || undefined,
      quantite: input.quantite,
      unite: input.unite?.trim() || undefined,
      seuilAlerte: input.seuilAlerte,
      prixUnitaire: input.prixUnitaire,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'stock.article_creation', 'stock_article', a.id, { nom: input.nom, quantite: input.quantite });
  return { articleId: a.id };
}
