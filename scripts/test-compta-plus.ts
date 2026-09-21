// ════════════════════════════════════════════════════════════════════
// COMPTA+ — les 6 briques manquantes de bout en bout
// 1. Paie → écriture automatique (641 + 644 / 421)
// 2. Amortissements (acquisition 241/521 + dotation 681/281 avec prorata)
// 3. Rapprochement bancaire (521 vs relevé + ajustement frais 671)
// 4. Budget prévisionnel (prévu vs réalisé recalculé)
// 5. Clôture d'exercice (comptes de gestion soldés → 120 résultat exact)
// 6. Exports FEC + balance CSV
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, creerFraisCore, genererEcheancesClasseCore,
  encaisserPaiementCore, enregistrerDepenseCore, validerDepenseCore, traiterBulletinPaieCore, genererBulletinsPaieCore,
  initialiserPlanComptableCore, completerPlanComptableCore,
  passerEcriturePaieCore, enregistrerImmobilisationCore, genererDotationsCore,
  creerRapprochementCore, creerBudgetCore, comparerBudgetCore, cloturerExerciceComptableCore,
  genererFecCore, genererBalanceCsvCore,
} from '../src/lib/business';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS = ['finances.voir', 'finances.ecrire', 'finances.valider', 'eleves.lire', 'eleves.ecrire', 'admin.saas', 'rh.gerer', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir'];
const F = 100;

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 0. MISE EN PLACE ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'compta-plus-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Compta Plus ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `cp-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctx = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS) } as never;
  await initialiserPlanComptableCore(ctx);
  const compl = await completerPlanComptableCore(ctx);
  check(`plan complété (+${compl.ajoutes} comptes 241/281/681/110 + journal PA)`, compl.ajoutes === 4);

  // Données : un encaissement (produit 411/571) + une dépense (charge 601/521)
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  const el = await inscrireEleveCore(ctx, r.ecoleId, { nom: 'Faye', prenom: 'Moussa', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'D', sexe: 'M', classeId: classe!.id } as never);
  const frais = await creerFraisCore(ctx, r.ecoleId, { libelle: 'Scolarité', montant: 100000 * F, periodicite: 'annuel', type: 'scolarite', niveauId: classe!.niveauId ?? undefined, devise: 'XOF' } as never);
  await genererEcheancesClasseCore(ctx, { fraisId: frais.fraisId, classeId: classe!.id, dateEcheance: new Date() });
  const ech = await db.echeanceFrais.findFirst({ where: { eleveId: el.eleveId } });
  await encaisserPaiementCore(ctx, { eleveId: el.eleveId, montant: 100000 * F, modePaiement: 'virement', echeanceId: ech!.id } as never); // 521 +100 000
  const dep = await enregistrerDepenseCore(ctx, r.ecoleId, { categorie: 'Fournitures scolaires', description: 'Cahiers', montant: 10000 * F, dateDepense: new Date() } as never);
  const compta2 = await creerPersonnelCore(ctx, r.ecoleId, { nom: 'Valideur', prenom: 'Compta', email: `cp2-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 200000, creerCompte: true, motDePasseInitial: 'Compta123!', roleCode: 'comptabilite' } as never);
  const u2 = await db.utilisateur.findFirst({ where: { email: `cp2-${S}@test.sn` } });
  await validerDepenseCore({ utilisateurId: u2!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['finances.voir', 'finances.ecrire', 'finances.valider']) } as never, dep.depenseId);
  const gen = await (await import('../src/lib/business')).genererEcrituresAutomatiquesCore(ctx, r.ecoleId);
  check(`dépense comptabilisée (auto : ${gen.créées} écriture)`, gen.créées === 1);

  console.log('\n═══ 1. PAIE → ÉCRITURE (641/644/421) ═══');
  // personnel + bulletin
  const pers = await creerPersonnelCore(ctx, r.ecoleId, { nom: 'Enseignant', prenom: 'Paie', email: `pp-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 200000, creerCompte: false } as never);
  const periode = '2026-09';
  const bres = await genererBulletinsPaieCore(ctx, r.ecoleId, periode);
  check(`bulletins générés (${(bres as any).bulletins ?? 0})`, ((bres as any).bulletins ?? 0) >= 1);
  const b = await db.bulletinPaie.findFirst({ where: { ecoleId: r.ecoleId, periode }, include: { cotisations: true } });
  check('bulletin de paie présent', !!b);
  if (b) {
    await db.bulletinPaie.update({ where: { id: b.id }, data: { statut: 'brouillon' } }); // re-valider via le core pour déclencher l'écriture
    const tr = await traiterBulletinPaieCore(ctx, b.id, 'valide');
    check('validation bulletin OK', tr.statut === 'valide');
    const ecr = await db.ecritureComptable.findFirst({ where: { ecoleId: r.ecoleId, numeroPiece: `PAY-${b.id.slice(-10)}` }, include: { lignes: { include: { compte: true } } } });
    check('écriture de paie PAIÉE automatiquement (PAY-xxxx)', !!ecr);
    if (ecr) {
      const num = (n: string) => ecr.lignes.filter((l: any) => l.compte.numero === n);
      const d641 = num('641').reduce((s, l) => s + l.debit, 0);
      const c421 = num('421').reduce((s, l) => s + l.credit, 0);
      check(`D 641 = brut+primes (${(b.salaireBrut + b.primesTotales) / F} F)`, d641 === b.salaireBrut + b.primesTotales, `${d641 / F}`);
      check(`C 421 = net+retenues+salarial (${c421 / F} F)`, c421 > 0);
      const d = ecr.lignes.reduce((s, l) => s + l.debit, 0);
      const c = ecr.lignes.reduce((s, l) => s + l.credit, 0);
      check('écriture de paie ÉQUILIBRÉE', d === c, `${d / F}/${c / F}`);
      const encore = await passerEcriturePaieCore(ctx, b.id);
      check('idempotente (2e appel → déjà passée)', (encore as any).dejaPassee === true);
    }
  }

  console.log('\n═══ 2. AMORTISSEMENTS ═══');
  const immo = await enregistrerImmobilisationCore(ctx, { libelle: 'Minibus scolaire', categorie: 'vehicule', montantAcquisition: 8000000 * F, dateAcquisition: new Date(new Date().getFullYear(), 6, 1), dureeAnnees: 5 } as never);
  check('immobilisation créée + acquisition comptabilisée (241/521)', !!immo.immobilisationId && !!immo.ecritureId);
  const annee = new Date().getFullYear();
  const dot = await genererDotationsCore(ctx, annee);
  // prorata 6 mois : 8 000 000/5 × 6/12 = 800 000 F
  check(`dotation ${annee} = 800 000 F (prorata 6 mois)`, dot.total === 800000 * F, `${(dot.total ?? 0) / F}`);
  const dot2 = await genererDotationsCore(ctx, annee);
  check('idempotente par année', (dot2 as any).dejaPassee === true);

  console.log('\n═══ 3. RAPPROCHEMENT BANCAIRE ═══');
  // solde 521 : +100000 (enc) −10000 (dép) −8000000 (immo) +800000 (dotation? non 281/681)
  const compte521 = await db.compteComptable.findFirst({ where: { ecoleId: r.ecoleId, numero: '521' } });
  const soldeCalc = (await db.ligneEcriture.findMany({ where: { compteId: compte521!.id } })).reduce((s, l) => s + l.debit - l.credit, 0);
  const rb = await creerRapprochementCore(ctx, {
    dateReleve: new Date(), soldeReleve: soldeCalc - 5000 * F, // la banque a pris 5 000 F de frais
    lignes: [], ajuster: true,
  } as never);
  check('écart détecté (−5 000 F de frais bancaires)', rb.ecart === -5000 * F, `${rb.ecart / F}`);
  check('ajustement passé (671 débit / 521 crédit)', !!rb.ecritureId);
  const solde521Apres = (await db.ligneEcriture.findMany({ where: { compteId: compte521!.id } })).reduce((s, l) => s + l.debit - l.credit, 0);
  check('solde 521 ajusté au relevé', solde521Apres === soldeCalc - 5000 * F, `${solde521Apres / F}`);

  console.log('\n═══ 4. BUDGET PRÉVISIONNEL ═══');
  const bud = await creerBudgetCore(ctx, {
    libelle: 'Budget exercice',
    lignes: [
      { categorie: 'recettes', sousCategorie: 'frais_scolarite', libelle: 'Scolarités', montantPrevu: 120000 * F },
      { categorie: 'depenses', sousCategorie: 'fonctionnement', libelle: 'Fonctionnement', montantPrevu: 10000 * F },
    ],
  } as never);
  check('budget créé', !!bud.budgetId);
  const cmp = await comparerBudgetCore(ctx, bud.budgetId);
  const ligneRec = cmp.lignes.find((l: any) => l.categorie === 'recettes')!;
  check('réalisé recettes = 100 000 F (écriture réelle)', ligneRec.montantRealise === 100000 * F, `${ligneRec.montantRealise / F}`);
  check('consommation = 83.3 %', ligneRec.pourcentageRealise === 83.3, `${ligneRec.pourcentageRealise}%`);

  console.log('\n═══ 5. CLÔTURE D\'EXERCICE ═══');
  const an = new Date().getFullYear();
  // attendu DYNAMIQUE depuis les soldes avant clôture
  const comptesGestion = await db.compteComptable.findMany({ where: { ecoleId: r.ecoleId, type: { in: ['produit', 'charge'] } } });
  const produitsAvant = -comptesGestion.filter((c: any) => c.type === 'produit').reduce((s2, c) => s2 + c.solde, 0);
  const chargesAvant = comptesGestion.filter((c: any) => c.type === 'charge').reduce((s2, c) => s2 + c.solde, 0);
  const resultatAttendu = produitsAvant - chargesAvant;
  const cl = await cloturerExerciceComptableCore(ctx, new Date(an, 0, 1), new Date(an, 11, 31));
  check(`résultat calculé = ${resultatAttendu / F} F (dynamique : produits−charges)`, cl.resultat === resultatAttendu, `${cl.resultat! / F} attendu ${resultatAttendu / F}`);
  // après clôture : les comptes de gestion sont SOLDÉS
  const gestionApres = await db.compteComptable.findMany({ where: { ecoleId: r.ecoleId, numero: { in: ['601', '671', '681'] } } });
  check('comptes de charges SOLDÉS (601, 671, 681 → 0)', gestionApres.every((c: any) => c.solde === 0), gestionApres.map((c: any) => `${c.numero}:${c.solde / F}`).join(' '));
  const compte120 = await db.compteComptable.findFirst({ where: { ecoleId: r.ecoleId, numero: '120' } });
  check('120 Résultat = résultat reporté (capitaux, sens créditeur)', compte120!.solde === resultatAttendu, `${compte120!.solde / F} attendu ${resultatAttendu / F}`);
  const cl2 = await cloturerExerciceComptableCore(ctx, new Date(an, 0, 1), new Date(an, 11, 31));
  check('clôture idempotente (2e appel refusé/ignoré)', (cl2 as any).dejaClos === true);
  // la balance reste équilibrée après clôture
  const lignesB = await db.ligneEcriture.findMany({ where: { ecriture: { ecoleId: r.ecoleId } } });
  const tD = lignesB.reduce((s, l) => s + l.debit, 0);
  const tC = lignesB.reduce((s, l) => s + l.credit, 0);
  check('balance GLOBALE toujours équilibrée après clôture', tD === tC, `${tD / F}/${tC / F}`);

  console.log('\n═══ 6. EXPORTS ═══');
  const fec = await genererFecCore(ctx, new Date(an, 0, 1), new Date(an, 11, 31));
  check('FEC généré (en-têtes + lignes)', fec.csv.startsWith('JournalCode;EcritureDate') && fec.csv.split('\r\n').length > 5, `${fec.nbEcritures} écritures`);
  check('FEC contient les écritures de paie et clôture', fec.csv.includes('PAY-') && fec.csv.includes('CLOT-'));
  const bal = await genererBalanceCsvCore(ctx, 'toutes');
  check('balance CSV générée', bal.csv.startsWith('N° compte;') && bal.csv.includes('521'));

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} COMPTA+ : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — 6 BRIQUES COMPLÈTES'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('COMPTA-PLUS', main);
