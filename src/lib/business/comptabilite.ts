// ====================================================================
// COMPTABILITÉ COMPLÈTE — sections comptables (primaire/secondaire
// séparables + consolidation), plan comptable école, CAISSE (sessions,
// écarts), cycle achats complet (commande→réception→facture→paiement)
// et états financiers (balance, grand livre, résultat, bilan, balances
// âgées clients/fournisseurs).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, tranchesSeChevauchent } from './commun';

// --------------------------------------------------------------------
// SECTIONS COMPTABLES — certaines écoles : 1 seule ; d'autres :
// primaire + secondaire séparées, consolidées par le responsable.
// --------------------------------------------------------------------

export async function configurerSectionsCore(ctx: Ctx, separees: boolean) {
  assertPermission(ctx, 'admin.saas');
  const ecoleId = ctx.ecoleId!;
  const existantes = await db.sectionComptable.findMany({ where: { ecoleId } });
  if (existantes.length) throw new ActionError('Sections déjà configurées.', 'DEJA_EXISTANT');
  if (separees) {
    await db.sectionComptable.createMany({ data: [
      { ecoleId, code: 'PRIMAIRE', libelle: 'Comptabilité Primaire' },
      { ecoleId, code: 'SECONDAIRE', libelle: 'Comptabilité Secondaire' },
    ] });
  } else {
    await db.sectionComptable.create({ data: { ecoleId, code: 'GLOBAL', libelle: 'Comptabilité unique' } });
  }
  await logAction(db, ecoleId, ctx.utilisateurId, 'compta.sections', 'section_comptable', ecoleId, { separees });
  return { separees, sections: separees ? ['PRIMAIRE', 'SECONDAIRE'] : ['GLOBAL'] };
}

export async function listerSectionsCore(ctx: Ctx) {
  assertPermission(ctx, 'finances.voir');
  return db.sectionComptable.findMany({ where: { ecoleId: ctx.ecoleId!, active: true }, orderBy: { code: 'asc' } });
}

// --------------------------------------------------------------------
// PLAN COMPTABLE ÉCOLE (SYSCOHADA simplifié) — créé une fois
// --------------------------------------------------------------------

const PLAN_ECOLE: Array<[string, string, string]> = [
  ['411', 'Clients — familles (scolarités)', 'actif'], ['401', 'Fournisseurs', 'passif'],
  ['421', 'Personnel — rémunérations dues', 'passif'], ['441', 'État — impôts et taxes', 'passif'], ['445', 'État — TVA déductible', 'actif'],
  ['521', 'Banques', 'actif'], ['571', 'Caisse', 'actif'], ['585', 'Virements internes', 'actif'],
  ['601', 'Achats de fournitures scolaires', 'charge'], ['602', 'Achats de matériel', 'charge'],
  ['605', 'Achats de denrées (cantine)', 'charge'], ['608', 'Achats non stockés (énergie, eau)', 'charge'],
  ['618', 'Autres achats et services extérieurs', 'charge'], ['624', 'Transports (carburant, véhicules)', 'charge'],
  ['628', 'Entretien et réparations', 'charge'],
  ['641', 'Rémunérations du personnel', 'charge'], ['644', 'Charges sociales (part patronale)', 'charge'],
  ['661', 'Frais financiers', 'charge'], ['671', 'Charges exceptionnelles', 'charge'],
  ['701', 'Ventes — frais de scolarité', 'produit'], ['702', 'Ventes — services (cantine, transport, garderie)', 'produit'],
  ['703', 'Ventes — boutique et activités', 'produit'], ['771', 'Produits exceptionnels (dons, subventions)', 'produit'],
  ['101', 'Capital social', 'capitaux'], ['120', 'Résultat de l\'exercice', 'capitaux'],
];

export async function initialiserPlanComptableCore(ctx: Ctx) {
  assertPermission(ctx, 'finances.valider');
  const ecoleId = ctx.ecoleId!;
  const existants = await db.compteComptable.count({ where: { ecoleId } });
  if (existants > 0) throw new ActionError('Plan comptable déjà initialisé.', 'DEJA_EXISTANT');
  await db.compteComptable.createMany({
    data: PLAN_ECOLE.map(([numero, libelle, type]) => ({ ecoleId, numero, libelle, type, solde: 0, devise: 'XOF', actif: true })),
  });
  // Journals standards
  const journaux = [['VE', 'Ventes (recettes)', 'ventes'], ['AC', 'Achats', 'achats'], ['CA', 'Caisse', 'caisse'], ['BQ', 'Banque', 'banque'], ['OD', 'Opérations diverses', 'divers']];
  for (const [code, libelle, type] of journaux) {
    await db.journalComptable.upsert({
      where: { ecoleId_code: { ecoleId, code } },
      create: { ecoleId, code, libelle, type },
      update: {},
    });
  }
  return { comptes: PLAN_ECOLE.length, journaux: journaux.length };
}

async function compteParNumero(ecoleId: string, numero: string) {
  const c = await db.compteComptable.findFirst({ where: { ecoleId, numero } });
  if (!c) throw new ActionError(`Compte ${numero} absent du plan comptable (initialisez-le).`, 'PLAN_VIDE');
  return c;
}

/** Écriture équilibrée + mise à jour des soldes + section comptable. */
export async function passerEcritureCore(ctx: Ctx, input: {
  journalCode: string; date?: Date; libelle: string; piece?: string;
  sectionComptableId?: string | null;
  lignes: Array<{ compte: string; debit?: number; credit?: number; libelle?: string }>;
}) {
  assertPermission(ctx, 'finances.valider');
  const ecoleId = ctx.ecoleId!;
  const totalD = input.lignes.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalC = input.lignes.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (totalD !== totalC) throw new ActionError(`Écriture déséquilibrée : débit ${totalD / 100} ≠ crédit ${totalC / 100}.`, 'DESEQUILIBRE');
  if (totalD === 0) throw new ActionError('Écriture à zéro refusée.', 'MONTANT_NUL');
  const journal = await db.journalComptable.findFirst({ where: { ecoleId, code: input.journalCode } })
    ?? await db.journalComptable.findFirst({ where: { ecoleId } });
  if (!journal) throw new ActionError('Aucun journal comptable.', 'PLAN_VIDE');
  const ecriture = await db.ecritureComptable.create({
    data: {
      ecoleId, journalId: journal.id, date: input.date ?? new Date(),
      numeroPiece: input.piece ?? `ECR-${Date.now().toString(36).toUpperCase()}`,
      libelle: input.libelle, statut: 'valide', valideParId: ctx.utilisateurId,
      dateValidation: new Date(), sectionComptableId: input.sectionComptableId ?? null,
      lignes: {
        create: await Promise.all(input.lignes.map(async (l) => ({
          compteId: (await compteParNumero(ecoleId, l.compte)).id,
          libelle: l.libelle ?? input.libelle, debit: l.debit ?? 0, credit: l.credit ?? 0,
        }))),
      },
    },
    include: { lignes: { include: { compte: true } } },
  });
  // Soldes : sens selon type de compte (actif/charge : debit-credit ; passif/produit/capitaux : credit-debit)
  for (const ligne of ecriture.lignes) {
    const c = ligne.compte;
    const delta = ['actif', 'charge'].includes(c.type) ? ligne.debit - ligne.credit : ligne.credit - ligne.debit;
    await db.compteComptable.update({ where: { id: c.id }, data: { solde: { increment: delta } } });
  }
  return { ecritureId: ecriture.id };
}

// --------------------------------------------------------------------
// CAISSE — sessions (fond, opérations, fermeture avec écart)
// --------------------------------------------------------------------

export async function ouvrirCaisseCore(ctx: Ctx, input: { fondCaisse: number; sectionComptableId?: string | null }) {
  assertPermission(ctx, 'finances.ecrire');
  const ouverte = await db.caisseSession.findFirst({ where: { ecoleId: ctx.ecoleId!, statut: 'ouverte' } });
  if (ouverte) throw new ActionError('Une session de caisse est déjà ouverte (fermez-la d\'abord).', 'DEJA_OUVERTE');
  const s = await db.caisseSession.create({
    data: {
      ecoleId: ctx.ecoleId!, caissierId: ctx.utilisateurId, dateOuverture: new Date(),
      fondCaisse: Math.round(input.fondCaisse * 100), soldeTheorique: Math.round(input.fondCaisse * 100),
      sectionComptableId: input.sectionComptableId ?? null,
    },
  });
  return { sessionCaisseId: s.id };
}

export async function operationCaisseCore(ctx: Ctx, input: { sessionCaisseId: string; type: 'entree' | 'sortie'; montant: number; motif: string; reference?: string }) {
  assertPermission(ctx, 'finances.ecrire');
  if (input.montant <= 0) throw new ActionError('Montant invalide.', 'MONTANT_NUL');
  return db.$transaction(async (tx) => {
    const session = await tx.caisseSession.findUnique({ where: { id: input.sessionCaisseId } });
    if (!session) throw new ActionError('Session de caisse introuvable.', 'INTROUVABLE');
    assertTenant(session.ecoleId, ctx, 'Cette session');
    if (session.statut !== 'ouverte') throw new ActionError('Session fermée : opération impossible.', 'SESSION_FERMEE');
    const montant = Math.round(input.montant * 100);
    if (input.type === 'sortie' && session.soldeTheorique - montant < 0) {
      throw new ActionError('Solde de caisse insuffisant.', 'SOLDE_INSUFFISANT');
    }
    await tx.operationCaisse.create({
      data: {
        ecoleId: session.ecoleId, sessionCaisseId: session.id, type: input.type, montant,
        motif: input.motif.trim(), reference: input.reference?.trim() || null,
        dateOperation: new Date(), saisieParId: ctx.utilisateurId,
      },
    });
    await tx.caisseSession.update({
      where: { id: session.id },
      data: { soldeTheorique: { increment: input.type === 'entree' ? montant : -montant } },
    });
    return { ok: true };
  });
}

export async function fermerCaisseCore(ctx: Ctx, sessionCaisseId: string, soldeCompte: number) {
  assertPermission(ctx, 'finances.ecrire');
  const session = await db.caisseSession.findUnique({ where: { id: sessionCaisseId } });
  if (!session) throw new ActionError('Session introuvable.', 'INTROUVABLE');
  assertTenant(session.ecoleId, ctx, 'Cette session');
  if (session.statut !== 'ouverte') throw new ActionError('Session déjà fermée.', 'DEJA_TRAITE');
  const compte = Math.round(soldeCompte * 100);
  const ecart = compte - session.soldeTheorique;
  await db.caisseSession.update({
    where: { id: sessionCaisseId },
    data: { statut: 'fermee', dateFermeture: new Date(), soldeCompte: compte, ecart },
  });
  if (ecart !== 0) {
    await passerEcritureCore(ctx, {
      journalCode: 'CA', libelle: `Écart de caisse session ${sessionCaisseId.slice(-6)}`,
      sectionComptableId: session.sectionComptableId,
      lignes: ecart > 0
        ? [{ compte: '571', debit: ecart }, { compte: '771', credit: ecart, libelle: 'Excédent de caisse' }]
        : [{ compte: '671', debit: -ecart, libelle: 'Manquant de caisse' }, { compte: '571', credit: -ecart }],
    }).catch(() => {});
  }
  await logAction(db, session.ecoleId, ctx.utilisateurId, 'caisse.fermeture', 'caisse_session', sessionCaisseId, { ecart });
  return { ecart };
}

// --------------------------------------------------------------------
// CYCLE ACHATS COMPLET — commande → validation → réception (stock +
// bon de livraison) → facture fournisseur → paiement → écritures
// --------------------------------------------------------------------

export async function creerCommandeCore(ctx: Ctx, input: {
  fournisseurId: string; dateLivraisonPrevue?: Date;
  sectionComptableId?: string | null;
  lignes: Array<{ designation: string; quantite: number; unite?: string; prixUnitaire: number }>;
}) {
  assertPermission(ctx, 'finances.ecrire');
  const fournisseur = await db.fournisseur.findUnique({ where: { id: input.fournisseurId } });
  if (!fournisseur) throw new ActionError('Fournisseur introuvable.', 'INTROUVABLE');
  assertTenant(fournisseur.ecoleId, ctx, 'Ce fournisseur');
  if (!input.lignes.length) throw new ActionError('Commande vide.', 'CHAMP_MANQUANT');
  const total = input.lignes.reduce((s, l) => s + Math.round(l.prixUnitaire * 100) * l.quantite, 0);
  const numero = `BC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  return db.$transaction(async (tx) => {
    const commande = await tx.commandeFournisseur.create({
      data: {
        ecoleId: fournisseur.ecoleId, fournisseurId: fournisseur.id, numero,
        dateCommande: new Date(), dateLivraisonPrevue: input.dateLivraisonPrevue ?? null,
        montantTotal: total, devise: 'XOF', statut: 'brouillon',
        sectionComptableId: input.sectionComptableId ?? null,
      },
    });
    await tx.ligneCommande.createMany({
      data: input.lignes.map((l) => ({
        commandeId: commande.id, designation: l.designation.trim(), quantite: l.quantite,
        unite: l.unite?.trim() || null, prixUnitaire: Math.round(l.prixUnitaire * 100),
        montantLigne: Math.round(l.prixUnitaire * 100) * l.quantite,
      })),
    });
    return { commandeId: commande.id, numero, total };
  }, { timeout: 30000, maxWait: 10000 });
}

export async function changerStatutCommandeCore(ctx: Ctx, commandeId: string, statut: 'envoyee' | 'annulee') {
  assertPermission(ctx, 'finances.ecrire');
  const c = await db.commandeFournisseur.findUnique({ where: { id: commandeId } });
  if (!c) throw new ActionError('Commande introuvable.', 'INTROUVABLE');
  assertTenant(c.ecoleId, ctx, 'Cette commande');
  if (c.statut !== 'brouillon') throw new ActionError('Seule une commande au brouillon peut être envoyée ou annulée.', 'STATUT_INVALIDE');
  await db.commandeFournisseur.update({ where: { id: commandeId }, data: { statut } });
  return { commandeId, statut };
}

/** Bon de livraison : réception (totale/partielle) + entrée en stock. */
export async function enregistrerReceptionCore(ctx: Ctx, input: {
  commandeId: string; quantiteParLigne: Array<{ ligneId: string; quantite: number }>;
  controleQualite?: 'conforme' | 'reserve' | 'refuse'; commentaire?: string;
  articleIdParLigne?: Record<string, string>;
}) {
  assertPermission(ctx, 'finances.ecrire');
  return db.$transaction(async (tx) => {
    const commande = await tx.commandeFournisseur.findUnique({ where: { id: input.commandeId }, include: { lignes: true } });
    if (!commande) throw new ActionError('Commande introuvable.', 'INTROUVABLE');
    assertTenant(commande.ecoleId, ctx, 'Cette commande');
    if (commande.statut === 'brouillon') throw new ActionError('Commande non envoyée au fournisseur.', 'STATUT_INVALIDE');
    if (commande.statut === 'facturee' || commande.statut === 'payee') throw new ActionError('Commande déjà facturée.', 'DEJA_TRAITE');
    let totalRecu = 0;
    const dejaRecuParLigne = new Map<string, number>();
    const receptionsPrec = await tx.receptionCommande.findMany({ where: { commandeId: commande.id } });
    for (const rp of receptionsPrec) {
      if (rp.ligneId) dejaRecuParLigne.set(rp.ligneId, (dejaRecuParLigne.get(rp.ligneId) ?? 0) + rp.quantiteRecue);
    }
    for (const q of input.quantiteParLigne) {
      const ligne = commande.lignes.find((l) => l.id === q.ligneId);
      if (!ligne) throw new ActionError('Ligne de commande inconnue.', 'INTROUVABLE');
      const deja = dejaRecuParLigne.get(ligne.id) ?? 0;
      if (q.quantite < 0 || deja + q.quantite > ligne.quantite) {
        throw new ActionError(`Quantité reçue invalide pour « ${ligne.designation} » (commandé ${ligne.quantite}, déjà reçu ${deja}).`, 'QUANTITE_INVALIDE');
      }
      if (deja + q.quantite >= ligne.quantite) {
        await tx.ligneCommande.update({ where: { id: ligne.id }, data: { recu: true } });
      }
      totalRecu += q.quantite;
      // Entrée en stock si l'article est relié
      const articleId = input.articleIdParLigne?.[ligne.id];
      if (articleId && q.quantite > 0) {
        const article = await tx.stockArticle.findFirst({ where: { id: articleId, ecoleId: commande.ecoleId } });
        if (article) {
          await tx.stockArticle.update({ where: { id: article.id }, data: { quantite: { increment: q.quantite } } });
          await tx.mouvementStock.create({
            data: {
              articleId: article.id, type: 'entree', quantite: q.quantite,
              motif: `Réception ${commande.numero} — ${ligne.designation}`,
              dateMouvement: new Date(), effectueParId: ctx.utilisateurId,
            },
          });
        }
      }
    }
    for (const q of input.quantiteParLigne) {
      if (q.quantite > 0) {
        await tx.receptionCommande.create({
          data: {
            commandeId: commande.id, ligneId: q.ligneId, dateReception: new Date(),
            quantiteRecue: q.quantite, controleQualite: (input.controleQualite ?? 'conforme') === 'conforme',
            commentaire: input.commentaire?.trim() || null, receptionneParId: ctx.utilisateurId,
          },
        });
      }
    }
    // Statut : livree si tout reçu, livraison_partielle sinon
    const lignesApres = await tx.ligneCommande.findMany({ where: { commandeId: commande.id } });
    const complete = lignesApres.every((l) => l.recu === true);
    await tx.commandeFournisseur.update({
      where: { id: commande.id },
      data: { statut: complete ? 'livree' : 'livraison_partielle', dateLivraisonEffective: new Date() },
    });
    return { commandeId: commande.id, complete };
  }, { timeout: 30000, maxWait: 10000 });
}

/** Facture fournisseur comptabilisée : 401 (dette) + charges, TVA déductible. */
export async function enregistrerFactureFournisseurCore(ctx: Ctx, input: {
  commandeId?: string; fournisseurId: string; numero: string;
  dateEmission: Date; dateEcheance?: Date;
  montantHT: number; montantTVA?: number;
}) {
  assertPermission(ctx, 'finances.ecrire');
  const fournisseur = await db.fournisseur.findUnique({ where: { id: input.fournisseurId } });
  if (!fournisseur) throw new ActionError('Fournisseur introuvable.', 'INTROUVABLE');
  assertTenant(fournisseur.ecoleId, ctx, 'Ce fournisseur');
  const ht = Math.round(input.montantHT * 100);
  const tva = Math.round((input.montantTVA ?? 0) * 100);
  const ttc = ht + tva;
  const commande = input.commandeId ? await db.commandeFournisseur.findUnique({ where: { id: input.commandeId } }) : null;
  const facture = await db.factureFournisseur.create({
    data: {
      ecoleId: fournisseur.ecoleId, fournisseurId: fournisseur.id, numero: input.numero.trim(),
      dateEmission: input.dateEmission, dateReception: new Date(), dateEcheance: input.dateEcheance ?? null,
      montantHT: ht, montantTVA: tva, montantTTC: ttc, devise: 'XOF', statut: 'a_payer',
      commandeId: commande?.id ?? null,
    },
  });
  if (commande) await db.commandeFournisseur.update({ where: { id: commande.id }, data: { statut: 'facturee' } });
  // Écriture : charge (60x) + TVA déductible (445) / 401 Fournisseurs
  await passerEcritureCore(ctx, {
    journalCode: 'AC', libelle: `Facture ${input.numero} — ${fournisseur.nom}`,
    piece: input.numero, sectionComptableId: commande?.sectionComptableId ?? null,
    lignes: [
      { compte: '618', debit: ht, libelle: `Achat ${fournisseur.nom}` },
      ...(tva > 0 ? [{ compte: '445', debit: tva, libelle: 'TVA déductible' } as never] : []),
      { compte: '401', credit: ttc, libelle: `Dette ${fournisseur.nom}` },
    ].map((l) => l as never),
  }).catch(() => { /* plan absent : facture conservée sans écriture */ });
  return { factureId: facture.id, ttc };
}

export async function payerFournisseurCore(ctx: Ctx, input: { factureId: string; montant: number; mode: string; reference?: string }) {
  assertPermission(ctx, 'finances.valider');
  return db.$transaction(async (tx) => {
    const facture = await tx.factureFournisseur.findUnique({ where: { id: input.factureId }, include: { paiements: true } });
    if (!facture) throw new ActionError('Facture introuvable.', 'INTROUVABLE');
    assertTenant(facture.ecoleId, ctx, 'Cette facture');
    const dejaPaye = facture.paiements.reduce((s, p) => s + p.montant, 0);
    const montant = Math.round(input.montant * 100);
    if (montant <= 0 || dejaPaye + montant > facture.montantTTC) {
      throw new ActionError(`Paiement invalide (déjà réglé ${(dejaPaye / 100).toLocaleString('fr-FR')} F / ${(facture.montantTTC / 100).toLocaleString('fr-FR')} F).`, 'MONTANT_INVALIDE');
    }
    const paiement = await tx.paiementFournisseur.create({
      data: {
        ecoleId: facture.ecoleId, factureId: facture.id, datePaiement: new Date(), montant, devise: facture.devise,
        mode: input.mode, reference: input.reference?.trim() || null, payeParId: ctx.utilisateurId,
      },
    });
    const solde = facture.montantTTC - dejaPaye - montant;
    await tx.factureFournisseur.update({ where: { id: facture.id }, data: { statut: solde === 0 ? 'payee' : 'partiellement_payee' } });
    // Écriture : 401 / 521 (banque) ou 571 (caisse)
    const tresorerie = input.mode === 'especes' ? '571' : '521';
    await passerEcritureCore(ctx, {
      journalCode: input.mode === 'especes' ? 'CA' : 'BQ',
      libelle: `Règlement facture ${facture.numero}`,
      piece: paiement.reference ?? paiement.id.slice(-6),
      lignes: [{ compte: '401', debit: montant }, { compte: tresorerie, credit: montant }],
    }).catch(() => {});
    return { paiementId: paiement.id, soldeRestant: solde };
  }, { timeout: 30000, maxWait: 10000 });
}

// --------------------------------------------------------------------
// ÉTATS FINANCIERS — par section ou consolidés (sectionId = null)
// --------------------------------------------------------------------

export type FiltreSection = { sectionComptableId?: string | null | 'toutes' };

async function ouEst<T>(prismaPromise: Promise<T[]>, sectionId: string | null | 'toutes', champ: (x: any) => any): Promise<T[]> {
  const lignes = await prismaPromise;
  if (sectionId === 'toutes') return lignes;
  return (lignes as any[]).filter((l) => {
    const s = champ(l);
    return sectionId === null ? !s : s === sectionId;
  });
}

/** Balance des comptes (débit/crédit/solde) — par section ou consolidée. */
export async function balanceComptableCore(ctx: Ctx, sectionId: string | null | 'toutes') {
  assertPermission(ctx, 'finances.voir');
  const ecoleId = ctx.ecoleId!;
  const lignes = await ouEst(
    db.ligneEcriture.findMany({ where: { ecriture: { ecoleId } }, include: { compte: true, ecriture: { select: { sectionComptableId: true } } } }),
    sectionId, (l) => l.ecriture.sectionComptableId,
  ) as any[];
  const parCompte = new Map<string, { numero: string; libelle: string; type: string; debit: number; credit: number }>();
  for (const l of lignes) {
    const k = l.compte.numero;
    if (!parCompte.has(k)) parCompte.set(k, { numero: l.compte.numero, libelle: l.compte.libelle, type: l.compte.type, debit: 0, credit: 0 });
    const e = parCompte.get(k)!;
    e.debit += l.debit; e.credit += l.credit;
  }
  const comptes = [...parCompte.values()].sort((a, b) => a.numero.localeCompare(b.numero));
  const totalDebit = comptes.reduce((s, c) => s + c.debit, 0);
  const totalCredit = comptes.reduce((s, c) => s + c.credit, 0);
  return { comptes, totalDebit, totalCredit, equilibree: totalDebit === totalCredit };
}

/** Grand livre d'un compte. */
export async function grandLivreCore(ctx: Ctx, numeroCompte: string) {
  assertPermission(ctx, 'finances.voir');
  const compte = await db.compteComptable.findFirst({ where: { ecoleId: ctx.ecoleId!, numero: numeroCompte } });
  if (!compte) throw new ActionError('Compte introuvable.', 'INTROUVABLE');
  const lignes = await db.ligneEcriture.findMany({
    where: { compteId: compte.id },
    include: { ecriture: { include: { journal: true } } },
    orderBy: [{ ecriture: { date: 'asc' } }],
  });
  let solde = 0;
  const ecritures = lignes.map((l: any) => {
    solde += ['actif', 'charge'].includes(compte.type) ? l.debit - l.credit : l.credit - l.debit;
    return {
      date: l.ecriture.date, journal: l.ecriture.journal.code, piece: l.ecriture.numeroPiece,
      libelle: l.libelle, debit: l.debit, credit: l.credit, solde,
    };
  });
  return { compte: { numero: compte.numero, libelle: compte.libelle, type: compte.type }, ecritures, soldeFinal: solde };
}

/** Compte de résultat : produits − charges. */
export async function compteResultatCore(ctx: Ctx, sectionId: string | null | 'toutes') {
  assertPermission(ctx, 'finances.voir');
  const balance = await balanceComptableCore(ctx, sectionId);
  const charges = balance.comptes.filter((c) => c.type === 'charge');
  const produits = balance.comptes.filter((c) => c.type === 'produit');
  const totalCharges = charges.reduce((s, c) => s + (c.debit - c.credit), 0);
  const totalProduits = produits.reduce((s, c) => s + (c.credit - c.debit), 0);
  return { charges, produits, totalCharges, totalProduits, resultat: totalProduits - totalCharges };
}

/** Bilan simplifié : actif / passif. */
export async function bilanSimplifieCore(ctx: Ctx, sectionId: string | null | 'toutes') {
  assertPermission(ctx, 'finances.voir');
  const balance = await balanceComptableCore(ctx, sectionId);
  const actif = balance.comptes.filter((c) => c.type === 'actif');
  const passif = balance.comptes.filter((c) => c.type === 'passif');
  const capitaux = balance.comptes.filter((c) => c.type === 'capitaux');
  const resultat = (await compteResultatCore(ctx, sectionId)).resultat;
  const totalActif = actif.reduce((s, c) => s + (c.debit - c.credit), 0);
  const totalPassif = passif.reduce((s, c) => s + (c.credit - c.debit), 0) + capitaux.reduce((s, c) => s + (c.credit - c.debit), 0) + resultat;
  return { actif, passif, capitaux, resultat, totalActif, totalPassif, equilibre: totalActif === totalPassif };
}

/** Balance âgée CLIENTS : échéances impayées par tranche d'ancienneté. */
export async function balanceAgeeClientsCore(ctx: Ctx) {
  assertPermission(ctx, 'finances.voir');
  const ecoleId = ctx.ecoleId!;
  const echeances = await db.echeanceFrais.findMany({
    where: { eleve: { ecoleId }, statut: { in: ['impayee', 'partiel'] } },
    include: { eleve: { select: { nom: true, prenom: true, matricule: true } }, frais: true },
  });
  const now = Date.now();
  const lignes = echeances.map((e: any) => {
    const restant = e.montant - e.remise - e.montantPaye;
    const jours = Math.floor((now - new Date(e.dateEcheance).getTime()) / 86400000);
    const tranche = jours <= 0 ? 'non_echu' : jours <= 30 ? '1_30' : jours <= 60 ? '31_60' : '60_plus';
    return { eleve: `${e.eleve.prenom} ${e.eleve.nom}`, matricule: e.eleve.matricule, frais: e.frais?.libelle ?? '—', restant, jours, tranche };
  });
  const totaux: Record<string, number> = { non_echu: 0, '1_30': 0, '31_60': 0, '60_plus': 0 };
  for (const l of lignes) totaux[l.tranche] += l.restant;
  return { lignes, totaux, total: lignes.reduce((s, l) => s + l.restant, 0) };
}

/** Balance âgée FOURNISSEURS : factures dues par ancienneté. */
export async function balanceAgeeFournisseursCore(ctx: Ctx) {
  assertPermission(ctx, 'finances.voir');
  const factures = await db.factureFournisseur.findMany({
    where: { ecoleId: ctx.ecoleId!, statut: { in: ['a_payer', 'partiellement_payee'] } },
    include: { fournisseur: true, paiements: true },
  });
  const now = Date.now();
  const lignes = factures.map((f: any) => {
    const restant = f.montantTTC - f.paiements.reduce((s: number, p: any) => s + p.montant, 0);
    const ref = f.dateEcheance ?? f.dateEmission;
    const jours = Math.floor((now - new Date(ref).getTime()) / 86400000);
    const tranche = jours <= 30 ? '1_30' : jours <= 60 ? '31_60' : '60_plus';
    return { fournisseur: f.fournisseur.nom, numero: f.numero, restant, jours, tranche };
  });
  const totaux: Record<string, number> = { '1_30': 0, '31_60': 0, '60_plus': 0 };
  for (const l of lignes) totaux[l.tranche] += l.restant;
  return { lignes, totaux, total: lignes.reduce((s, l) => s + l.restant, 0) };
}

/** État de caisse du jour (session ouverte ou dernière fermée). */
export async function etatCaisseCore(ctx: Ctx) {
  assertPermission(ctx, 'finances.voir');
  const session = await db.caisseSession.findFirst({
    where: { ecoleId: ctx.ecoleId! },
    orderBy: { dateOuverture: 'desc' },
    include: { operations: { orderBy: { dateOperation: 'asc' } } },
  });
  if (!session) return { session: null, operations: [], entrees: 0, sorties: 0 };
  const entrees = session.operations.filter((o) => o.type === 'entree').reduce((s, o) => s + o.montant, 0);
  const sorties = session.operations.filter((o) => o.type === 'sortie').reduce((s, o) => s + o.montant, 0);
  return { session, operations: session.operations, entrees, sorties };
}
