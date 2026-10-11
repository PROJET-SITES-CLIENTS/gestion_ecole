// ====================================================================
// COMPTA+ — clôture d'exercice, rapprochement bancaire, budget,
// amortissements, paie→écritures, exports. Complément de comptabilite.ts
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction } from './commun';
import { genererEcrituresAutomatiquesCore } from './paie';

/** Comptes complémentaires pour les briques avancées (idempotent). */
const COMPTES_PLUS: Array<[string, string, string]> = [
  ['241', 'Matériel & immobilisations', 'actif'],
  ['281', 'Amortissements cumulés', 'capitaux'],
  ['681', 'Dotations aux amortissements', 'charge'],
  ['110', 'Reports à nouveau', 'capitaux'],
  // F5 — 431 : organismes sociaux (crédité par l'écriture de paie) ;
  // 416 : clients douteux (provisions). 431 était auparavant créé à la
  // volée comme « clients douteux » (actif) — collision SYSCOHADA.
  ['431', 'Sécurité sociale et autres organismes sociaux', 'passif'],
  ['416', 'Clients douteux ou litigieux', 'actif'],
  // F17 FIX — 443 TVA collectée : l'état TVA (etat_tva / bouton « État TVA »)
  // interroge 443+445 mais le plan ne créait QUE 445 (déductible) → TVA
  // collectée définitivement à zéro.
  ['443', 'État — TVA collectée', 'passif'],
];

/** Complète le plan existant avec les comptes avancés + journal PAIE (idempotent). */
export async function completerPlanComptableCore(ctx: Ctx) {
  assertPermission(ctx, 'finances.valider');
  const ecoleId = ctx.ecoleId!;
  // F8 FIX — refuser de « compléter » un plan JAMAIS initialisé : les quelques
  // comptes ajoutés suffisaient ensuite à faire échouer l'initialisation de
  // base (refuse si count > 0) → plan SYSCOHADA définitivement bloqué.
  const base = await db.compteComptable.count({ where: { ecoleId } });
  if (base === 0) {
    throw new ActionError('Initialisez d\'abord le plan comptable SYSCOHADA de base, puis complétez-le.', 'PLAN_VIDE');
  }
  let ajoutes = 0;
  for (const [numero, libelle, type] of COMPTES_PLUS) {
    const existe = await db.compteComptable.findFirst({ where: { ecoleId, numero } });
    if (!existe) {
      await db.compteComptable.create({ data: { ecoleId, numero, libelle, type, solde: 0, devise: 'XOF', actif: true } });
      ajoutes++;
    }
  }
  await db.journalComptable.upsert({
    where: { ecoleId_code: { ecoleId, code: 'PA' } },
    create: { ecoleId, code: 'PA', libelle: 'Paie', type: 'paie' },
    update: {},
  });
  return { ajoutes };
}

async function compteNumero(ecoleId: string, numero: string) {
  const c = await db.compteComptable.findFirst({ where: { ecoleId, numero } });
  if (!c) throw new ActionError(`Compte ${numero} absent — complétez le plan comptable (bouton « Compléter le plan »).`, 'PLAN_VIDE');
  return c;
}

/** F5 — résout un compte par numéro, en le créant à la volée si absent
 *  (utile pour les comptes spécialisés 431/416 des briques paie/provisions). */
async function compteOuCreer(ecoleId: string, numero: string, libelle: string, type: string) {
  const existe = await db.compteComptable.findFirst({ where: { ecoleId, numero } });
  if (existe) return existe;
  return db.compteComptable.create({ data: { ecoleId, numero, libelle, type, solde: 0, devise: 'XOF', actif: true } });
}

async function passerEcritureInterne(tx: any, ctx: Ctx, ecoleId: string, params: {
  journalCode: string; libelle: string; piece: string; sectionComptableId?: string | null;
  lignes: Array<{ compteId: string; libelle: string; debit: number; credit: number }>;
}) {
  // F6 FIX — repli sur n'importe quel journal de l'école si le code demandé
  // n'existe pas. L'ancien code rejetait « Journal XX introuvable » en plein
  // vol (ex. journal 'AC' qui n'a jamais existé : le plan crée VE/ACH/CA/BQ/OD).
  const journal = (await tx.journalComptable.findFirst({ where: { ecoleId, code: params.journalCode } }))
    ?? (await tx.journalComptable.findFirst({ where: { ecoleId } }));
  if (!journal) throw new ActionError('Aucun journal comptable — initialisez le plan comptable.', 'PLAN_VIDE');
  const totalD = params.lignes.reduce((s: number, l: any) => s + l.debit, 0);
  const totalC = params.lignes.reduce((s: number, l: any) => s + l.credit, 0);
  if (totalD !== totalC) throw new ActionError(`Écriture déséquilibrée (${totalD / 100} ≠ ${totalC / 100}).`, 'DESEQUILIBRE');
  const e = await tx.ecritureComptable.create({
    data: {
      ecoleId, journalId: journal.id, date: new Date(), numeroPiece: params.piece,
      libelle: params.libelle, statut: 'valide', valideParId: ctx.utilisateurId, dateValidation: new Date(),
      sectionComptableId: params.sectionComptableId ?? null,
      lignes: { create: params.lignes },
    },
  });
  // Mise à jour des soldes (sens selon type)
  const compteIds = [...new Set(params.lignes.map((l: any) => l.compteId))];
  const comptes = await tx.compteComptable.findMany({ where: { id: { in: compteIds } } });
  for (const c of comptes) {
    const net = params.lignes.filter((l: any) => l.compteId === c.id).reduce((s: number, l: any) => s + l.debit - l.credit, 0);
    const delta = ['actif', 'charge'].includes(c.type) ? net : -net;
    await tx.compteComptable.update({ where: { id: c.id }, data: { solde: { increment: delta } } });
  }
  return e;
}

// --------------------------------------------------------------------
// 1. PAIE → ÉCRITURES (641 rémunérations, 644 charges patronales, 421 dû)
// --------------------------------------------------------------------

/** Passe l'écriture de paie d'un bulletin VALIDÉ : D 641 brut+primes,
 *  D 644 part patronale / C 421 net + part salariale + retenues. Idempotent. */
export async function passerEcriturePaieCore(ctx: Ctx, bulletinId: string) {
  assertPermission(ctx, 'rh.gerer');
  const b = await db.bulletinPaie.findUnique({ where: { id: bulletinId }, include: { cotisations: true } });
  if (!b) throw new ActionError('Bulletin introuvable.', 'INTROUVABLE');
  assertTenant(b.ecoleId, ctx, 'Ce bulletin');
  if (b.statut === 'brouillon') throw new ActionError('Validez d\'abord le bulletin.', 'STATUT_INVALIDE');
  const piece = `PAY-${b.id.slice(-10)}`;
  const existante = await db.ecritureComptable.findFirst({ where: { ecoleId: b.ecoleId, numeroPiece: piece } });
  if (existante) return { ecritureId: existante.id, dejaPassee: true };

  const partPatronale = b.cotisations.reduce((s, c) => s + c.partEmployeur, 0);
  // F5 FIX — sémantique réelle des champs du bulletin (cf. genererBulletinsPaieCore) :
  //   salaireBrut  = base + primes + variables (primes DÉJÀ incluses)
  //   netAPayer    = salaireBrut − retenuesTotales (part salariale…)
  // L'ANCIEN code était triplement faux :
  //   • brutTotal = salaireBrut + primesTotales → primes DOUBLÉES en 641
  //   • credit421 = net + partSalarie + retenues → 421 SURCRÉDITÉ (brut + partSalarie)
  //   • l'écart structurel partait en ligne parasite 618 « écart de paie »
  // Écriture SYSCOHADA correcte et auto-équilibrée :
  //   D 641 = salaireBrut (brut complet, primes incluses)
  //   D 644 = part patronale (si > 0)
  //   C 431 = salaireBrut − netAPayer (retenues salariales dues aux organismes)
  //        + part patronale due aux organismes (contrepartie du D 644)
  //   C 421 = netAPayer (dû au personnel, uniquement le net)
  const retenuesDuBrut = Math.max(0, b.salaireBrut - b.netAPayer);
  const lignes: Array<{ compteId: string; libelle: string; debit: number; credit: number }> = [
    { compteId: (await compteNumero(b.ecoleId, '641')).id, libelle: `Salaires ${b.periode}`, debit: b.salaireBrut, credit: 0 },
  ];
  const c431 = await compteOuCreer(b.ecoleId, '431', 'Sécurité sociale et autres organismes sociaux', 'passif');
  if (partPatronale > 0) {
    lignes.push({ compteId: (await compteNumero(b.ecoleId, '644')).id, libelle: 'Charges patronales', debit: partPatronale, credit: 0 });
    lignes.push({ compteId: c431.id, libelle: 'Charges patronales dues', debit: 0, credit: partPatronale });
  }
  if (retenuesDuBrut > 0) {
    lignes.push({ compteId: c431.id, libelle: 'Retenues sociales salariales', debit: 0, credit: retenuesDuBrut });
  }
  if (b.netAPayer > 0) {
    lignes.push({ compteId: (await compteNumero(b.ecoleId, '421')).id, libelle: `Personnel dû ${b.periode}`, debit: 0, credit: b.netAPayer });
  }

  const e = await db.$transaction(async (tx) => passerEcritureInterne(tx, ctx, b.ecoleId, {
    journalCode: 'PA', libelle: `Paie ${b.periode}`, piece, lignes,
  }), { timeout: 60000, maxWait: 15000 });
  await logAction(db, b.ecoleId, ctx.utilisateurId, 'compta.paie_ecriture', 'bulletin_paie', bulletinId, { piece });
  return { ecritureId: e.id };
}

// --------------------------------------------------------------------
// 2. AMORTISSEMENTS (acquisition 241/521 + dotation annuelle 681/281)
// --------------------------------------------------------------------

export async function enregistrerImmobilisationCore(ctx: Ctx, input: {
  libelle: string; categorie?: string; montantAcquisition: number; dateAcquisition: Date;
  dureeAnnees?: number; sectionComptableId?: string | null; comptabiliser?: boolean;
}) {
  assertPermission(ctx, 'finances.ecrire');
  const ecoleId = ctx.ecoleId!;
  if (!input.libelle?.trim()) throw new ActionError('Libellé obligatoire.', 'CHAMP_MANQUANT');
  if (!Number.isInteger(input.montantAcquisition) || input.montantAcquisition <= 0) throw new ActionError('Montant invalide (centimes).', 'MONTANT_INVALIDE');
  const duree = input.dureeAnnees ?? 5;
  if (!Number.isInteger(duree) || duree < 1 || duree > 50) throw new ActionError('Durée entre 1 et 50 ans.', 'CHAMP_INVALIDE');
  // F6 FIX — deux défauts réparés :
  //  1) journal 'AC' inexistant (le plan crée VE/ACH/CA/BQ/OD) → l'écriture
  //     échouait TOUJOURS ; on utilise 'ACH' avec repli générique ;
  //  2) non-atomicité : l'immobilisation était créée HORS transaction, puis
  //     l'écriture plantait → immobilisation orpheline sans écriture.
  //     Désormais : comptes résolus AVANT (échec propre si plan incomplet,
  //     et SEULEMENT si comptabilisation demandée), puis création imo +
  //     écriture dans la MÊME transaction.
  const comptabiliser = input.comptabiliser !== false;
  const c241 = comptabiliser ? await compteNumero(ecoleId, '241') : null;
  const c521 = comptabiliser ? await compteNumero(ecoleId, '521') : null;
  let ecritureId: string | null = null;
  const immo = await db.$transaction(async (tx) => {
    const created = await tx.immobilisation.create({
      data: {
        ecoleId, libelle: input.libelle!.trim(), categorie: input.categorie || 'materiel',
        montantAcquisition: input.montantAcquisition, dateAcquisition: input.dateAcquisition,
        dureeAnnees: duree, sectionComptableId: input.sectionComptableId ?? null,
      },
    });
    if (c241 && c521) {
      const e = await passerEcritureInterne(tx, ctx, ecoleId, {
        journalCode: 'ACH', piece: `IMO-${created.id.slice(-10)}`, sectionComptableId: input.sectionComptableId ?? null,
        libelle: `Acquisition immobilisation : ${input.libelle!.trim()}`,
        lignes: [
          { compteId: c241.id, libelle: input.libelle!.trim(), debit: input.montantAcquisition, credit: 0 },
          { compteId: c521.id, libelle: 'Banque', debit: 0, credit: input.montantAcquisition },
        ],
      });
      ecritureId = e.id;
    }
    return created;
  }, { timeout: 60000, maxWait: 15000 });
  await logAction(db, ecoleId, ctx.utilisateurId, 'immo.acquisition', 'immobilisation', immo.id, { montant: input.montantAcquisition, ecritureId });
  return { immobilisationId: immo.id, ecritureId };
}

/** Dotation linéaire de l'année N pour toutes les immobilisations actives (idempotent par année). */
export async function genererDotationsCore(ctx: Ctx, annee: number) {
  assertPermission(ctx, 'finances.valider');
  const ecoleId = ctx.ecoleId!;
  const piece = `DOT-${annee}`;
  const existante = await db.ecritureComptable.findFirst({ where: { ecoleId, numeroPiece: piece } });
  if (existante) return { ecritureId: existante.id, dejaPassee: true, total: 0 };
  const immos = await db.immobilisation.findMany({ where: { ecoleId, statut: 'actif' } });
  let total = 0;
  const lignes: Array<{ compteId: string; libelle: string; debit: number; credit: number }> = [];
  const dotationsParImmo = new Map<string, number>();
  for (const i of immos) {
    const anneeEcoulee = annee - i.dateAcquisition.getFullYear();
    if (anneeEcoulee < 0 || anneeEcoulee >= i.dureeAnnees) continue; // totalement amortie
    // Prorata la première année (mois d'acquisition)
    const prorata = anneeEcoulee === 0 ? (12 - i.dateAcquisition.getMonth()) / 12 : 1;
    const dotation = Math.round((i.montantAcquisition / i.dureeAnnees) * prorata);
    if (dotation <= 0) continue;
    total += dotation;
    dotationsParImmo.set(i.id, dotation);
    lignes.push({ compteId: (await compteNumero(ecoleId, '681')).id, libelle: `Dotation ${i.libelle.slice(0, 40)}`, debit: dotation, credit: 0 });
  }
  if (total <= 0) throw new ActionError(`Aucune dotation à passer pour ${annee}.`, 'SAISIE_VIDE');
  lignes.push({ compteId: (await compteNumero(ecoleId, '281')).id, libelle: 'Amortissements cumulés', debit: 0, credit: total });
  const e = await db.$transaction(async (tx) => passerEcritureInterne(tx, ctx, ecoleId, {
    journalCode: 'OD', piece, libelle: `Dotations aux amortissements ${annee}`, lignes,
  }), { timeout: 60000, maxWait: 15000 });
  // AUDIT M4 — persistance du tableau d'amortissement (ligne par immo/année)
  await db.ligneAmortissement.createMany({
    data: [...dotationsParImmo.entries()].map(([immobilisationId, dotation]) => ({
      ecoleId,
      immobilisationId,
      annee,
      dotation,
      cumul: dotation,
    })),
    skipDuplicates: true,
  }).catch(() => undefined);
  await logAction(db, ecoleId, ctx.utilisateurId, 'immo.dotations', 'ecriture_comptable', e.id, { annee, total });
  return { ecritureId: e.id, total, lignesAmortissement: immos.length };
}

// --------------------------------------------------------------------
// 3. RAPPROCHEMENT BANCAIRE (521 vs relevé, écarts explicables)
// --------------------------------------------------------------------

export async function creerRapprochementCore(ctx: Ctx, input: {
  dateReleve: Date; soldeReleve: number; // centimes
  lignes?: Array<{ libelle: string; montant: number; sens: 'en_Depot' | 'en_Retrait' | 'erreur' }>;
  ajuster?: boolean; // passe l'écriture des écarts (frais bancaires → 671)
}) {
  assertPermission(ctx, 'finances.valider');
  const ecoleId = ctx.ecoleId!;
  if (!Number.isInteger(input.soldeReleve)) throw new ActionError('Solde du relevé invalide (centimes).', 'MONTANT_INVALIDE');
  const compte521 = await compteNumero(ecoleId, '521');
  // Solde comptable : cumul des lignes du compte 521 (F16 — écritures validées seules)
  const lignes521 = await db.ligneEcriture.findMany({ where: { compteId: compte521.id, ecriture: { ecoleId, statut: 'valide' } } });
  const soldeComptable = lignes521.reduce((s, l) => s + l.debit - l.credit, 0);
  // solde ajusté : comptable − chèques émis non débités + dépôts non crédités + erreurs
  const soldeAjuste = soldeComptable + (input.lignes ?? []).reduce((s, l) => s + (l.sens === 'en_Retrait' ? -l.montant : l.sens === 'en_Depot' ? l.montant : l.montant), 0);
  const ecart = input.soldeReleve - soldeAjuste;
  const r = await db.rapprochementBancaire.create({
    data: {
      ecoleId, dateReleve: input.dateReleve, soldeReleve: input.soldeReleve, soldeComptable, ecart,
      lignes: JSON.stringify(input.lignes ?? []), creeParId: ctx.utilisateurId,
    },
  });
  let ecritureId: string | null = null;
  if (input.ajuster && ecart !== 0) {
    // Écart résiduel : frais bancaires (négatif → charge) ou produit divers
    ecritureId = (await db.$transaction(async (tx) => passerEcritureInterne(tx, ctx, ecoleId, {
      journalCode: 'BQ', piece: `RBQ-${r.id.slice(-10)}`,
      libelle: `Ajustement rapprochement bancaire du ${input.dateReleve.toISOString().slice(0, 10)}`,
      lignes: ecart < 0
        ? [{ compteId: (await compteNumero(ecoleId, '671')).id, libelle: 'Frais bancaires / manquants', debit: -ecart, credit: 0 }, { compteId: compte521.id, libelle: 'Banque', debit: 0, credit: -ecart }]
        : [{ compteId: compte521.id, libelle: 'Banque', debit: ecart, credit: 0 }, { compteId: (await compteNumero(ecoleId, '771')).id, libelle: 'Produit divers constaté au relevé', debit: 0, credit: ecart }],
    }))).id;
    await db.rapprochementBancaire.update({ where: { id: r.id }, data: { ajuste: true } });
  }
  await logAction(db, ecoleId, ctx.utilisateurId, 'compta.rapprochement', 'rapprochement_bancaire', r.id, { ecart });
  return { rapprochementId: r.id, soldeComptable, soldeAjuste, soldeReleve: input.soldeReleve, ecart, ecritureId };
}

// --------------------------------------------------------------------
// 4. BUDGET PRÉVISIONNEL (prévu vs réalisé par poste)
// --------------------------------------------------------------------

export async function creerBudgetCore(ctx: Ctx, input: {
  libelle: string; lignes: Array<{ categorie: 'recettes' | 'depenses'; sousCategorie: string; libelle: string; montantPrevu: number }>;
}) {
  assertPermission(ctx, 'finances.valider');
  const ecoleId = ctx.ecoleId!;
  if (!input.libelle?.trim()) throw new ActionError('Libellé obligatoire.', 'CHAMP_MANQUANT');
  if (input.lignes.length === 0) throw new ActionError('Au moins une ligne budgétaire.', 'SAISIE_VIDE');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId, active: true } });
  if (!annee) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');
  const b = await db.budget.create({
    data: {
      ecoleId, anneeScolaireId: annee.id, libelle: input.libelle.trim(),
      dateDebut: annee.dateDebut, dateFin: annee.dateFin, statut: 'valide', valideParId: ctx.utilisateurId, dateValidation: new Date(),
      lignes: {
        create: input.lignes.map((l) => ({
          categorie: l.categorie, sousCategorie: l.sousCategorie, libelle: l.libelle,
          montantPrevu: l.montantPrevu, devise: 'XOF',
        })),
      },
    },
    include: { lignes: true },
  });
  await actualiserBudgetRealise(ecoleId, b.id, annee.dateDebut, annee.dateFin);
  await logAction(db, ecoleId, ctx.utilisateurId, 'budget.creation', 'budget', b.id, { lignes: input.lignes.length });
  return { budgetId: b.id };
}

/** Recalcule le réalisé de chaque ligne depuis les écritures (produits/charges). */
export async function actualiserBudgetRealise(ecoleId: string, budgetId: string, dateDebut: Date, dateFin: Date) {
  const budget = await db.budget.findUnique({ where: { id: budgetId }, include: { lignes: true } });
  if (!budget) throw new ActionError('Budget introuvable.', 'INTROUVABLE');
  // Recettes réelles : produits 7xx + extinctions de créances clients 411
  // (les encaissements créditent 411 — les produits 701 ne sont pas déclenchés
  // par le cycle scolarité, on prend donc l'union).
  const lignesEcritures = await db.ligneEcriture.findMany({
    where: {
      ecriture: { ecoleId, statut: 'valide', date: { gte: dateDebut, lte: dateFin } }, // F16 — validées seules
      OR: [{ compte: { numero: { startsWith: '7' } } }, { compte: { numero: '411' } }],
    },
  });
  const lignesCharges = await db.ligneEcriture.findMany({
    where: {
      ecriture: { ecoleId, statut: 'valide', date: { gte: dateDebut, lte: dateFin } }, // F16 — validées seules
      compte: { numero: { startsWith: '6' } },
    },
  });
  const totalProduits = lignesEcritures.reduce((s, l) => s + l.credit - l.debit, 0);
  const totalCharges = lignesCharges.reduce((s, l) => s + l.debit - l.credit, 0);
  for (const l of budget.lignes) {
    // Répartition proportionnelle au prévu de la ligne au sein de sa catégorie
    const totalPrevuCat = budget.lignes.filter((x) => x.categorie === l.categorie).reduce((s, x) => s + x.montantPrevu, 0);
    const totalCat = l.categorie === 'recettes' ? totalProduits : totalCharges;
    const realise = totalPrevuCat > 0 ? Math.round(totalCat * (l.montantPrevu / totalPrevuCat)) : 0;
    await db.ligneBudget.update({
      where: { id: l.id },
      data: { montantRealise: realise, pourcentageRealise: l.montantPrevu > 0 ? Number(((realise / l.montantPrevu) * 100).toFixed(1)) : 0, dateDerniereMaj: new Date() },
    });
  }
  return { totalProduits, totalCharges };
}

export async function comparerBudgetCore(ctx: Ctx, budgetId: string) {
  assertPermission(ctx, 'finances.voir');
  const budget = await db.budget.findUnique({ where: { id: budgetId }, include: { anneeScolaire: true, lignes: true } });
  if (!budget) throw new ActionError('Budget introuvable.', 'INTROUVABLE');
  assertTenant(budget.ecoleId, ctx, 'Ce budget');
  await actualiserBudgetRealise(budget.ecoleId, budgetId, budget.anneeScolaire.dateDebut, budget.anneeScolaire.dateFin);
  const lignes = await db.ligneBudget.findMany({ where: { budgetId } });
  return { budgetId: budget.id, libelle: budget.libelle, lignes };
}

// --------------------------------------------------------------------
// 5. CLÔTURE D'EXERCICE (soldes des comptes de gestion → 120 Résultat)
// --------------------------------------------------------------------

export async function cloturerExerciceComptableCore(ctx: Ctx, dateDebut: Date, dateFin: Date) {
  assertPermission(ctx, 'finances.valider');
  const ecoleId = ctx.ecoleId!;
  if (dateFin <= dateDebut) throw new ActionError('Dates invalides.', 'DATE_INVALIDE');
  const piece = `CLOT-${dateDebut.getFullYear()}${dateFin.getFullYear()}`;
  const existante = await db.ecritureComptable.findFirst({ where: { ecoleId, numeroPiece: piece } });
  if (existante) return { dejaClos: true, ecritureId: existante.id };

  const lignes = await db.ligneEcriture.findMany({
    // F16 FIX — clôture sur les seules écritures VALIDÉES
    where: { ecriture: { ecoleId, statut: 'valide', date: { gte: dateDebut, lte: dateFin } } },
    include: { compte: true },
  });
  const parCompte = new Map<string, { id: string; numero: string; libelle: string; type: string; solde: number }>();
  for (const l of lignes) {
    if (!['produit', 'charge'].includes(l.compte.type)) continue;
    const cur = parCompte.get(l.compte.id) ?? { id: l.compte.id, numero: l.compte.numero, libelle: l.compte.libelle, type: l.compte.type, solde: 0 };
    cur.solde += l.debit - l.credit;
    parCompte.set(l.compte.id, cur);
  }
  let totalCharges = 0, totalProduits = 0;
  for (const c of parCompte.values()) {
    if (c.type === 'charge') totalCharges += c.solde; else totalProduits += -c.solde;
  }
  const resultat = totalProduits - totalCharges; // >0 : bénéfice
  if (parCompte.size === 0) throw new ActionError('Aucune écriture sur la période — rien à clôturer.', 'SAISIE_VIDE');

  // Écriture de clôture : on SOLDE chaque compte de gestion
  // Écriture de clôture : on SOLDE chaque compte de gestion.
  // Produit : solde créditeur (ΣD−ΣC < 0) → DÉBIT de −solde pour l'annuler.
  // Charge : solde débiteur (ΣD−ΣC > 0) → CRÉDIT du solde pour l'annuler.
  const lignesCloture: Array<{ compteId: string; libelle: string; debit: number; credit: number }> = [];
  for (const c of parCompte.values()) {
    if (c.solde === 0) continue;
    if (c.type === 'produit' && c.solde < 0) lignesCloture.push({ compteId: c.id, libelle: `Solde ${c.numero} ${c.libelle.slice(0, 30)}`, debit: -c.solde, credit: 0 });
    if (c.type === 'produit' && c.solde > 0) lignesCloture.push({ compteId: c.id, libelle: `Solde ${c.numero} (anomalie débiteur)`, debit: 0, credit: c.solde });
    if (c.type === 'charge' && c.solde > 0) lignesCloture.push({ compteId: c.id, libelle: `Solde ${c.numero} ${c.libelle.slice(0, 30)}`, debit: 0, credit: c.solde });
    if (c.type === 'charge' && c.solde < 0) lignesCloture.push({ compteId: c.id, libelle: `Solde ${c.numero} (anomalie créditeur)`, debit: -c.solde, credit: 0 });
  }
  // ΣD = Σ(−soldes produits) ; ΣC = Σ(soldes charges) ; leur différence = résultat.
  const compte120 = await compteNumero(ecoleId, '120');
  if (resultat > 0) lignesCloture.push({ compteId: compte120.id, libelle: 'Résultat de l\'exercice (bénéfice)', debit: 0, credit: resultat });
  else if (resultat < 0) lignesCloture.push({ compteId: compte120.id, libelle: 'Résultat de l\'exercice (perte)', debit: -resultat, credit: 0 });

  const e = await db.$transaction(async (tx) => passerEcritureInterne(tx, ctx, ecoleId, {
    journalCode: 'OD', piece, libelle: `Clôture de l'exercice ${dateDebut.getFullYear()}-${dateFin.getFullYear()}`,
    lignes: lignesCloture,
  }), { timeout: 60000, maxWait: 15000 });
  await logAction(db, ecoleId, ctx.utilisateurId, 'compta.cloture', 'ecriture_comptable', e.id, { resultat, totalCharges, totalProduits });
  return { resultat, totalCharges, totalProduits, ecritureId: e.id };
}

// --------------------------------------------------------------------
// 6. EXPORTS — FEC (Fichier des Écritures Comptables) + balance CSV
// --------------------------------------------------------------------

export async function genererFecCore(ctx: Ctx, dateDebut: Date, dateFin: Date) {
  assertPermission(ctx, 'finances.voir');
  const ecoleId = ctx.ecoleId!;
  const ecritures = await db.ecritureComptable.findMany({
    // F16 FIX — le FEC ne contient que les écritures validées (norme DGFiP)
    where: { ecoleId, statut: 'valide', date: { gte: dateDebut, lte: dateFin } },
    include: { journal: true, lignes: { include: { compte: true } } },
    orderBy: [{ date: 'asc' }, { numeroPiece: 'asc' }],
  });
  const entetes = ['JournalCode', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'EcritureLib', 'Debit', 'Credit', 'EcritureNum', 'ValidDate', 'Montantdevise', 'Idevise'];
  const lignesCsv = [entetes.join(';')];
  let num = 1;
  for (const e of ecritures) {
    for (const l of e.lignes) {
      lignesCsv.push([
        e.journal.code, e.date.toISOString().slice(0, 10), l.compte.numero, l.compte.libelle.replace(/;/g, ','),
        '', '', e.numeroPiece ?? '', e.libelle.replace(/;/g, ','),
        (l.debit / 100).toFixed(2), (l.credit / 100).toFixed(2),
        String(num), e.dateValidation?.toISOString().slice(0, 10) ?? '', '', 'XOF',
      ].join(';'));
    }
    num++;
  }
  await logAction(db, ecoleId, ctx.utilisateurId, 'compta.export_fec', 'ecriture_comptable', undefined, { lignes: lignesCsv.length - 1, du: dateDebut.toISOString().slice(0, 10), au: dateFin.toISOString().slice(0, 10) });
  return { csv: lignesCsv.join('\r\n'), nbEcritures: ecritures.length };
}

export async function genererBalanceCsvCore(ctx: Ctx, sectionId: string | null | 'toutes') {
  assertPermission(ctx, 'finances.voir');
  const ecoleId = ctx.ecoleId!;
  const where: any = { ecriture: { ecoleId, statut: 'valide' } }; // F16 — brouillons exclus
  if (sectionId && sectionId !== 'toutes') where.ecriture.sectionComptableId = sectionId;
  const lignes = await db.ligneEcriture.findMany({ where, include: { compte: true } });
  const parCompte = new Map<string, { numero: string; libelle: string; debit: number; credit: number }>();
  for (const l of lignes) {
    const cur = parCompte.get(l.compte.numero) ?? { numero: l.compte.numero, libelle: l.compte.libelle, debit: 0, credit: 0 };
    cur.debit += l.debit; cur.credit += l.credit;
    parCompte.set(l.compte.numero, cur);
  }
  const csv = ['N° compte;Libellé;Total débit;Total crédit;Solde'].concat(
    [...parCompte.values()].sort((a, b) => a.numero.localeCompare(b.numero)).map((c) =>
      `${c.numero};${c.libelle.replace(/;/g, ',')};${(c.debit / 100).toFixed(2)};${(c.credit / 100).toFixed(2)};${((c.debit - c.credit) / 100).toFixed(2)}`),
  ).join('\r\n');
  return { csv };
}

// --------------------------------------------------------------------
// AUDIT COMPTA M1 — PROVISIONS POUR CRÉANCES DOUTEUSES (SYSCOHADA)
// Échéances échues depuis plus de 90 jours non soldées → dotation
// D 659 Charges provisionnées / C 431 Clients douteux, idempotente par
// pièce PROV-<année>. Comptes créés à la volée si absents du plan.
// --------------------------------------------------------------------

export async function provisionnerCreancesDouteusesCore(ctx: Ctx) {
  assertPermission(ctx, 'finances.valider');
  if (!ctx.ecoleId) throw new ActionError('Aucune école associée.', 'ECOLE_ABSENTE');
  const annee = new Date().getFullYear();
  const piece = `PROV-${annee}`;
  const deja = await db.ecritureComptable.findFirst({ where: { ecoleId: ctx.ecoleId, numeroPiece: piece } });
  if (deja) throw new ActionError(`Les provisions ${annee} sont déjà passées (pièce ${piece}).`, 'DEJA_TRAITE');
  // Créances +90 jours
  const limite = new Date(Date.now() - 90 * 86400000);
  const echues = await db.echeanceFrais.findMany({
    where: { statut: { in: ['impayee', 'partiel'] }, dateEcheance: { lt: limite }, eleve: { ecoleId: ctx.ecoleId, deletedAt: null, statut: 'actif' } },
    select: { montant: true, remise: true, montantPaye: true },
  });
  const totalDu = echues.reduce((sum, e) => sum + (e.montant - (e.remise ?? 0) - (e.montantPaye ?? 0)), 0);
  if (echues.length === 0 || totalDu <= 0) {
    throw new ActionError('Aucune créance douteuse (+90 jours) à provisionner.', 'RIEN_A_PROVISIONNER');
  }
  // Comptes 659/416 créés à la volée
  // F5 FIX — 431 est désormais réservé aux organismes sociaux (écriture de
  // paie) : les clients douteux passent en 416 conformément au SYSCOHADA,
  // sinon la provision créditait le compte que la paie débite.
  const c659 = await compteOuCreer(ctx.ecoleId, '659', 'Charges provisionnées d\u2019exploitation', 'charge');
  const c416 = await compteOuCreer(ctx.ecoleId, '416', 'Clients douteux ou litigieux', 'actif');
  const journalOD = await db.journalComptable.findFirst({ where: { ecoleId: ctx.ecoleId, code: 'OD' } });
  if (!journalOD) throw new ActionError('Journal OD introuvable — initialisez le plan comptable.', 'PLAN_VIDE');
  await passerEcritureInterne(db as never, ctx, ctx.ecoleId!, {
    journalCode: 'OD', libelle: `Provision créances douteuses ${annee} (${echues.length} créance(s) +90 j)`, piece,
    lignes: [
      { compteId: c659.id, libelle: 'Dotation aux provisions', debit: totalDu, credit: 0 },
      { compteId: c416.id, libelle: 'Clients douteux', debit: 0, credit: totalDu },
    ],
  });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'compta.provisions_creances', undefined, undefined, { creances: echues.length, totalDu });
  return { piece, creancesProvisionnees: echues.length, totalProvisionne: totalDu };
}

// --------------------------------------------------------------------
// AUDIT COMPTA M2 — CLÔTURE MENSUELLE (revue périodique)
// Rattrape toutes les écritures automatiques (encaissements + dépenses)
// du mois puis produit la balance du mois. Sans verrouillage (revue).
// --------------------------------------------------------------------

export async function clotureMensuelleCore(ctx: Ctx, periode?: string) {
  assertPermission(ctx, 'finances.valider');
  if (!ctx.ecoleId) throw new ActionError('Aucune école associée.', 'ECOLE_ABSENTE');
  const mois = periode ?? new Date().toISOString().slice(0, 7);
  // F1 FIX — genererEcrituresAutomatiquesCore(ctx, ecoleId) : le 2e argument
  // est l'ID de l'école, PAS la période (l'ancien code passait "2026-10" comme
  // ecoleId → plan vide → PLAN_VIDE systématique)
  const r = await genererEcrituresAutomatiquesCore(ctx, ctx.ecoleId);
  const debut = new Date(mois + '-01T00:00:00');
  const fin = new Date(debut); fin.setMonth(fin.getMonth() + 1);
  const ecritures = await db.ecritureComptable.findMany({
    where: { ecoleId: ctx.ecoleId, date: { gte: debut, lt: fin }, statut: 'valide' },
    include: { lignes: true },
  });
  const totalDebit = ecritures.reduce((s2, e) => s2 + e.lignes.reduce((x, l) => x + l.debit, 0), 0);
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'compta.cloture_mensuelle', undefined, undefined, { mois, ecritures: ecritures.length });
  return { periode: mois, ecrituresGenerees: r, ecrituresMois: ecritures.length, totalDebitMois: totalDebit, message: `Revue du mois ${mois} : ${ecritures.length} écriture(s), débit total ${(totalDebit / 100).toLocaleString('fr-FR')} F.` };
}

// --------------------------------------------------------------------
// AUDIT COMPTA M5 — ÉTAT TVA (collectée/déductible/net à payer)
// --------------------------------------------------------------------

export async function etatTvaCore(ctx: Ctx, periode?: string) {
  assertPermission(ctx, 'finances.voir');
  const mois = periode ?? new Date().toISOString().slice(0, 7);
  const debut = new Date(mois + '-01T00:00:00');
  const fin = new Date(debut); fin.setMonth(fin.getMonth() + 1);
  const lignes = await db.ligneEcriture.findMany({
    where: { ecriture: { ecoleId: ctx.ecoleId!, date: { gte: debut, lt: fin }, statut: 'valide' }, compte: { numero: { in: ['443', '445'] } } },
    include: { compte: true },
  });
  const tvaCollectee = lignes.filter((l) => l.compte.numero === '443').reduce((s2, l) => s2 + l.credit - l.debit, 0);
  const tvaDeductible = lignes.filter((l) => l.compte.numero === '445').reduce((s2, l) => s2 + l.debit - l.credit, 0);
  return { periode: mois, tvaCollectee, tvaDeductible, netAPayer: tvaCollectee - tvaDeductible };
}
