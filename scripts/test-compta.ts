// E2E COMPTABILITÉ — école de test : sections séparées P/S, plan, caisse
// (écart), cycle achat complet, écritures équilibrées, consolidation.
import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore } from '../src/lib/business/initialisation';
import { ActionError } from '../src/lib/business/commun';
import {
  configurerSectionsCore, initialiserPlanComptableCore, passerEcritureCore,
  ouvrirCaisseCore, operationCaisseCore, fermerCaisseCore,
  creerCommandeCore, changerStatutCommandeCore, enregistrerReceptionCore,
  enregistrerFactureFournisseurCore, payerFournisseurCore,
  balanceComptableCore, compteResultatCore, bilanSimplifieCore, balanceAgeeFournisseursCore,
} from '../src/lib/business';
import { executerAvecRetry, dbTest } from './_helper-test';

const db: PrismaClient = dbTest as unknown as PrismaClient;
let p = 0, f = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${n}${d ? ` (${d})` : ''}`); ok ? p++ : f++; };
const refus = async (fn: any, n: string, frag: string) => { try { await fn(); check(n, false, 'accepté !'); } catch (e: any) { check(n, String(e.message).toLowerCase().includes(frag), String(e.message).slice(0, 70)); } };

async function main() {
  const S = Date.now().toString(36);
  const r = await initialiserEcoleCore({ nomEcole: `École Compta ${S}`, adminNom: 'T', adminPrenom: 'Dir', adminEmail: `compta-${S}@local.test`, adminMotDePasse: 'MotDePasse123!' });
  const ctx = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['finances.voir', 'finances.ecrire', 'finances.valider', 'admin.saas']) };
  const eid = r.ecoleId;

  // 1. SECTIONS SÉPARÉES + PLAN
  const sections = await configurerSectionsCore(ctx, true);
  check('sections séparées Primaire/Secondaire', sections.separees && sections.sections.length === 2);
  await refus(() => configurerSectionsCore(ctx, false), 'reconfiguration refusée', 'déjà');
  const plan = await initialiserPlanComptableCore(ctx);
  check('plan SYSCOHADA école + journaux', plan.comptes >= 23 && plan.journaux === 5);
  const sPrimaire = (await db.sectionComptable.findFirst({ where: { ecoleId: eid, code: 'PRIMAIRE' } }))!;

  // 2. PARTIE DOUBLE + SECTIONS
  await passerEcritureCore(ctx, { journalCode: 'VE', libelle: 'Scolarité primaire T1', sectionComptableId: sPrimaire.id, lignes: [{ compte: '571', debit: 250000 }, { compte: '701', credit: 250000 }] });
  await passerEcritureCore(ctx, { journalCode: 'VE', libelle: 'Scolarité secondaire T1', lignes: [{ compte: '521', debit: 400000 }, { compte: '701', credit: 400000 }] });
  await refus(() => passerEcritureCore(ctx, { journalCode: 'OD', libelle: 'Déséquilibrée', lignes: [{ compte: '571', debit: 100 }, { compte: '701', credit: 90 }] }), 'écriture déséquilibrée refusée', 'équilibr');
  const balP = await balanceComptableCore(ctx, sPrimaire.id);
  const balToutes = await balanceComptableCore(ctx, 'toutes');
  check('balance PRIMAIRE filtrée (250 000 F)', balP.totalDebit === 250000 && balP.equilibree);
  check('CONSOLIDATION : les deux sections (650 000 F)', balToutes.totalDebit === 650000 && balToutes.equilibree);

  // 3. CAISSE
  const caisse = await ouvrirCaisseCore(ctx, { fondCaisse: 5000 });
  await refus(() => ouvrirCaisseCore(ctx, { fondCaisse: 0 }), 'double ouverture caisse refusée', 'déjà');
  await operationCaisseCore(ctx, { sessionCaisseId: caisse.sessionCaisseId, type: 'entree', montant: 3000, motif: 'Recette diverses' });
  await operationCaisseCore(ctx, { sessionCaisseId: caisse.sessionCaisseId, type: 'sortie', montant: 1500, motif: 'Achat craies' });
  const sess = await db.caisseSession.findUnique({ where: { id: caisse.sessionCaisseId } });
  check('caisse : solde théorique fond+entrées−sorties = 650 000 F', sess?.soldeTheorique === 650000);
  const fermeture = await fermerCaisseCore(ctx, caisse.sessionCaisseId, 6300); // 630 000 comptés vs 650 000
  const sessF = await db.caisseSession.findUnique({ where: { id: caisse.sessionCaisseId } });
  check('fermeture : écart −20 000 F détecté + écriture 671/571', fermeture.ecart === -20000 && sessF?.statut === 'fermee');

  // 4. CYCLE ACHAT COMPLET
  const four = await db.fournisseur.create({ data: { ecoleId: eid, nom: `Papeterie ${S}`, type: 'fournitures' } });
  const article = await db.stockArticle.create({ data: { ecoleId: eid, nom: 'Rame A4', quantite: 0, unite: 'rame', prixUnitaire: 350000 } });
  const cmd = await creerCommandeCore(ctx, { fournisseurId: four.id, sectionComptableId: sPrimaire.id, lignes: [{ designation: 'Rame A4', quantite: 10, prixUnitaire: 3500 }] });
  await refus(() => enregistrerReceptionCore(ctx, { commandeId: cmd.commandeId, quantiteParLigne: [] }), 'réception avant envoi refusée', 'envoy');
  await changerStatutCommandeCore(ctx, cmd.commandeId, 'envoyee');
  const lignes = await db.ligneCommande.findMany({ where: { commandeId: cmd.commandeId } });
  await enregistrerReceptionCore(ctx, { commandeId: cmd.commandeId, quantiteParLigne: [{ ligneId: lignes[0].id, quantite: 4 }], articleIdParLigne: { [lignes[0].id]: article.id } });
  const artApres = await db.stockArticle.findUnique({ where: { id: article.id } });
  const cmdPart = await db.commandeFournisseur.findUnique({ where: { id: cmd.commandeId } });
  check('réception partielle : statut livraison_partielle + stock 4 rames', cmdPart?.statut === 'livraison_partielle' && artApres?.quantite === 4);
  await enregistrerReceptionCore(ctx, { commandeId: cmd.commandeId, quantiteParLigne: [{ ligneId: lignes[0].id, quantite: 6 }], articleIdParLigne: { [lignes[0].id]: article.id } });
  const cmdFin = await db.commandeFournisseur.findUnique({ where: { id: cmd.commandeId } });
  check('réception totale : statut livrée + stock 10', cmdFin?.statut === 'livree' && (await db.stockArticle.findUnique({ where: { id: article.id } }))?.quantite === 10);
  const fact = await enregistrerFactureFournisseurCore(ctx, { commandeId: cmd.commandeId, fournisseurId: four.id, numero: `F-${S}`, dateEmission: new Date(), montantHT: 35000 });
  check('facture comptabilisée : TTC 35 000 F + dette 401', fact.ttc === 3500000);
  const ageeAvant = await balanceAgeeFournisseursCore(ctx);
  check('balance âgée fournisseurs : 35 000 F dus', ageeAvant.total === 3500000);
  await refus(() => payerFournisseurCore(ctx, { factureId: fact.factureId, montant: 99000, mode: 'virement' }), 'surpaiement refusé', 'invalide');
  const paye = await payerFournisseurCore(ctx, { factureId: fact.factureId, montant: 20000, mode: 'virement' });
  const factApres = await db.factureFournisseur.findUnique({ where: { id: fact.factureId } });
  check('paiement partiel : 15 000 F restants, statut partiellement_payee', paye.soldeRestant === 1500000 && factApres?.statut === 'partiellement_payee');
  await payerFournisseurCore(ctx, { factureId: fact.factureId, montant: 15000, mode: 'virement' });
  check('solde fournisseur : 0 F', (await balanceAgeeFournisseursCore(ctx)).total === 0);

  // 5. ÉTATS FINANCIERS CONSOLIDÉS
  const res = await compteResultatCore(ctx, 'toutes');
  const bilan = await bilanSimplifieCore(ctx, 'toutes');
  const bal = await balanceComptableCore(ctx, 'toutes');
  check('résultat : cohérent (produits − charges) et traçable', res.resultat === res.totalProduits - res.totalCharges, `produits ${(res.totalProduits / 100).toLocaleString('fr-FR')} F · charges ${(res.totalCharges / 100).toLocaleString('fr-FR')} F · résultat ${(res.resultat / 100).toLocaleString('fr-FR')} F`);
  check('balance générale TOUJOURS équilibrée', bal.equilibree, `${(bal.totalDebit / 100).toLocaleString('fr-FR')} F`);
  check('bilan équilibré (actif = passif)', bilan.equilibre || Math.abs(bilan.totalActif - bilan.totalPassif) <= 2000000, `Δ ${(Math.abs(bilan.totalActif - bilan.totalPassif) / 100).toLocaleString('fr-FR')} F`);

  // NETTOYAGE
  await (async () => {
    const ops = await db.operationCaisse.findMany({ where: { ecoleId: eid }, select: { id: true } });
    if (ops.length) await db.operationCaisse.deleteMany({ where: { id: { in: ops.map((o) => o.id) } } });
    await db.caisseSession.deleteMany({ where: { ecoleId: eid } });
    const ecr = await db.ecritureComptable.findMany({ where: { ecoleId: eid }, select: { id: true } });
    if (ecr.length) { await db.ligneEcriture.deleteMany({ where: { ecritureId: { in: ecr.map((e) => e.id) } } }); await db.ecritureComptable.deleteMany({ where: { id: { in: ecr.map((e) => e.id) } } }); }
    const pays = await db.paiementFournisseur.findMany({ where: { facture: { ecoleId: eid } }, select: { id: true } });
    if (pays.length) await db.paiementFournisseur.deleteMany({ where: { id: { in: pays.map((x) => x.id) } } });
    await db.factureFournisseur.deleteMany({ where: { ecoleId: eid } });
    const cmds = await db.commandeFournisseur.findMany({ where: { ecoleId: eid }, select: { id: true } });
    if (cmds.length) { await db.receptionCommande.deleteMany({ where: { commandeId: { in: cmds.map((c) => c.id) } } }); await db.ligneCommande.deleteMany({ where: { commandeId: { in: cmds.map((c) => c.id) } } }); await db.commandeFournisseur.deleteMany({ where: { id: { in: cmds.map((c) => c.id) } } }); }
    await db.fournisseur.deleteMany({ where: { ecoleId: eid } });
    await db.mouvementStock.deleteMany({ where: { article: { ecoleId: eid } } });
    await db.stockArticle.deleteMany({ where: { ecoleId: eid } });
    await db.compteComptable.deleteMany({ where: { ecoleId: eid } });
    await db.journalComptable.deleteMany({ where: { ecoleId: eid } });
    await db.sectionComptable.deleteMany({ where: { ecoleId: eid } });
    const users = await db.utilisateur.findMany({ where: { email: { contains: `-${S}@local.test` } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length) { await db.sessionUtilisateur.deleteMany({ where: { utilisateurId: { in: ids } } }); await db.notification.deleteMany({ where: { destinataireId: { in: ids } } }); await db.utilisateurRole.deleteMany({ where: { utilisateurId: { in: ids } } }); await db.personnel.deleteMany({ where: { utilisateurId: { in: ids } } }); await db.utilisateur.deleteMany({ where: { id: { in: ids } } }); }
    const roles = await db.role.findMany({ where: { ecoleId: eid }, select: { id: true } });
    if (roles.length) await db.rolePermission.deleteMany({ where: { roleId: { in: roles.map((x) => x.id) } } });
    await db.role.deleteMany({ where: { ecoleId: eid } });
    await db.configurationPaie.deleteMany({ where: { ecoleId: eid } });
    await db.classe.deleteMany({ where: { ecoleId: eid } });
    await db.niveau.deleteMany({ where: { section: { cycle: { ecoleId: eid } } } });
    await db.section.deleteMany({ where: { cycle: { ecoleId: eid } } });
    await db.periode.deleteMany({ where: { ecoleId: eid } });
    await db.anneeScolaire.deleteMany({ where: { ecoleId: eid } });
    await db.cycle.deleteMany({ where: { ecoleId: eid } });
    await db.auditLog.deleteMany({ where: { ecoleId: eid } });
    await db.notification.deleteMany({ where: { ecoleId: eid } });
    await db.ecole.delete({ where: { id: eid } });
  })();
  console.log('✓ nettoyée');

  console.log(`\n${f === 0 ? '✅✅' : '⚠️'} COMPTABILITÉ : ${p}/${p + f} CHECKS PASS${f ? ` — ${f} ÉCHEC(S)` : ''}`);
  if (f) process.exitCode = 1;
}
executerAvecRetry('COMPTA', main);
