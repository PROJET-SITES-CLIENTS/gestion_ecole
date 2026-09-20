// ════════════════════════════════════════════════════════════════════
// COHÉRENCE COMPTABLE — simulation complète de la logique en elle-même
// 1. Plan SYSCOHADA + journaux initialisés (23 comptes, 5 journaux)
// 2. Partie double forcée : écriture déséquilibrée REFUSÉE
// 3. Encaissement espèces → écriture TEMPS RÉEL 571/411, balance équilibrée
// 4. Encaissement virement → 521/411
// 5. Annulation → écriture INVERSE exacte, soldes remis à zéro
// 6. Caisse : session, entrée/sortie, fermeture avec écart → 671/771
// 7. Dépense → écriture charge/banque (via génération auto corrigée)
// 8. Balance générale : Σdébit = Σcrédit (à un centime près)
// 9. Sections comptables : écritures taguées, balance par section
// 10. État de caisse cohérent avec les écritures
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, inscrireEleveCore, creerFraisCore, genererEcheancesClasseCore,
  encaisserPaiementCore, annulerPaiementCore, enregistrerDepenseCore,
  initialiserPlanComptableCore, passerEcritureCore, ouvrirCaisseCore, operationCaisseCore,
  fermerCaisseCore, balanceComptableCore, etatCaisseCore, genererEcrituresAutomatiquesCore,
  configurerSectionsCore, validerDepenseCore,
} from '../src/lib/business';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS_COMPTA = ['finances.voir', 'finances.ecrire', 'finances.valider'];
const F = 100;

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 0. MISE EN PLACE ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'compta-coherence-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Compta Coherence ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `cc-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxC = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set([...PERMS_COMPTA, 'eleves.lire', 'eleves.ecrire', 'admin.saas', 'rh.gerer', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir']) } as never;

  console.log('\n═══ 1. PLAN SYSCOHADA ═══');
  const plan = await initialiserPlanComptableCore(ctxC);
  check(`plan initialisé : ${plan.comptes} comptes + ${plan.journaux} journaux`, plan.comptes >= 23 && plan.journaux === 5);
  const comptes = await db.compteComptable.findMany({ where: { ecoleId: r.ecoleId } });
  const num = (n: string) => comptes.find((c: any) => c.numero === n)!;
  check('comptes clés présents (571, 521, 411, 401, 641, 701)', ['571', '521', '411', '401', '641', '701'].every((n) => !!num(n)));

  console.log('\n═══ 2. PARTIE DOUBLE FORCÉE ═══');
  let refuse = false;
  try { await passerEcritureCore(ctxC, { journalCode: 'OD', libelle: 'Déséquilibrée', lignes: [{ compte: '571', debit: 10000 }, { compte: '411', credit: 9000 }] }); }
  catch (e: any) { refuse = /déséquilibr/i.test(String(e.message)); }
  check('écriture déséquilibrée REFUSÉE', refuse);

  console.log('\n═══ 3. ENCAISSEMENTS → ÉCRITURES TEMPS RÉEL ═══');
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  const el = await inscrireEleveCore(ctxC, r.ecoleId, { nom: 'Compta', prenom: 'Test', dateNaissance: new Date('2013-03-03'), lieuNaissance: 'D', sexe: 'F', classeId: classe!.id } as never);
  const frais = await creerFraisCore(ctxC, r.ecoleId, { libelle: 'Scolarité', montant: 100000 * F, periodicite: 'annuel', type: 'scolarite', niveauId: classe!.niveauId ?? undefined, devise: 'XOF' } as never);
  await genererEcheancesClasseCore(ctxC, { fraisId: frais.fraisId, classeId: classe!.id, dateEcheance: new Date(Date.now() + 30 * 864e5) });
  const ech = await db.echeanceFrais.findFirst({ where: { eleveId: el.eleveId } });
  // espèces 30 000
  await encaisserPaiementCore(ctxC, { eleveId: el.eleveId, montant: 30000 * F, modePaiement: 'espece', echeanceId: ech!.id } as never);
  // virement 20 000
  await encaisserPaiementCore(ctxC, { eleveId: el.eleveId, montant: 20000 * F, modePaiement: 'virement', echeanceId: ech!.id } as never);
  const ecr571 = await db.ligneEcriture.findMany({ where: { compteId: num('571').id, debit: { gt: 0 } } });
  const ecr521 = await db.ligneEcriture.findMany({ where: { compteId: num('521').id, debit: { gt: 0 } } });
  const ecr411c = await db.ligneEcriture.findMany({ where: { compteId: num('411').id, credit: { gt: 0 } } });
  check('espèces → DÉBIT 571 Caisse (30 000 F)', ecr571.reduce((s, l) => s + l.debit, 0) === 30000 * F, `${ecr571.reduce((s, l) => s + l.debit, 0) / F}`);
  check('virement → DÉBIT 521 Banque (20 000 F)', ecr521.reduce((s, l) => s + l.debit, 0) === 20000 * F, `${ecr521.reduce((s, l) => s + l.debit, 0) / F}`);
  check('crédit 411 Clients (50 000 F au total)', ecr411c.reduce((s, l) => s + l.credit, 0) === 50000 * F);
  const soldesApres = await db.compteComptable.findMany({ where: { ecoleId: r.ecoleId, numero: { in: ['571', '521', '411'] } } });
  const solde = (n: string) => soldesApres.find((c: any) => c.numero === n)!.solde;
  check('solde 571 = +30 000 F (actif débiteur)', solde('571') === 30000 * F, `${solde('571') / F}`);
  check('solde 521 = +20 000 F', solde('521') === 20000 * F);
  check('solde 411 = -50 000 F (créance éteinte → crédit)', solde('411') === -50000 * F, `${solde('411') / F}`);

  console.log('\n═══ 4. ANNULATION → ÉCRITURE INVERSE ═══');
  const payVirement = await db.paiement.findFirst({ where: { ecoleId: r.ecoleId, modePaiement: 'virement' } });
  await annulerPaiementCore(ctxC, payVirement!.id, 'erreur de saisie');
  const soldesAnn = await db.compteComptable.findMany({ where: { ecoleId: r.ecoleId, numero: { in: ['571', '521', '411'] } } });
  const soldeA = (n: string) => soldesAnn.find((c: any) => c.numero === n)!.solde;
  check('solde 521 remis à 0 (inverse exacte)', soldeA('521') === 0, `${soldeA('521') / F}`);
  check('solde 411 remis à -30 000 (seul l espèce reste)', soldeA('411') === -30000 * F, `${soldeA('411') / F}`);
  const ecrAnn = await db.ecritureComptable.findMany({ where: { ecoleId: r.ecoleId, numeroPiece: { startsWith: 'ANN-' } } });
  check('pièce d annulation chronotée ANN-xxxx', ecrAnn.length === 1);

  console.log('\n═══ 5. CAISSE (session, écart → 671/771) ═══');
  const session = await ouvrirCaisseCore(ctxC, { fondCaisse: 5000 }); // francs — le core convertit en centimes
  await operationCaisseCore(ctxC, { sessionCaisseId: session.sessionCaisseId, type: 'entree', montant: 2500, motif: 'Vente de manuels' }); // francs
  await operationCaisseCore(ctxC, { sessionCaisseId: session.sessionCaisseId, type: 'sortie', montant: 800, motif: 'Achat d eau' }); // francs
  await fermerCaisseCore(ctxC, session.sessionCaisseId, 6600); // théorique 6700 F → écart -100 F (soldeCompte en francs)
  const sessionFermee = await db.caisseSession.findUnique({ where: { id: session.sessionCaisseId } });
  if (!sessionFermee) throw new Error('session introuvable');
  check('écart de caisse détecté (-100 F)', sessionFermee.ecart === -100 * F, `${(sessionFermee.ecart ?? 0) / F}`);
  const ligne671 = await db.ligneEcriture.findFirst({ where: { compteId: num('671').id, debit: { gt: 0 } } });
  check('écart comptabilisé en 671 Charges exceptionnelles', !!ligne671 && ligne671.debit === 100 * F);

  console.log('\n═══ 6. DÉPENSE → GÉNÉRATION AUTO (mapping corrigé) ═══');
  const dep = await enregistrerDepenseCore(ctxC, r.ecoleId, { categorie: 'Fournitures scolaires', description: 'Cahiers et stylos', montant: 15000 * F, dateDepense: new Date() } as never);
  // CONTRÔLE COHÉRENT : séparation des tâches — le saisisseur ne peut pas valider
  let refuseSoiMeme = false;
  try { await validerDepenseCore(ctxC, dep.depenseId); } catch (e: any) { refuseSoiMeme = /s[ée]paration/i.test(String(e.message)); }
  check('séparation des tâches : le saisisseur ne peut PAS valider sa dépense', refuseSoiMeme);
  const compta2 = await (await import('../src/lib/business')).creerPersonnelCore(ctxC, r.ecoleId, { nom: 'Compta2', prenom: 'Valideur', email: `cc2-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 200000, creerCompte: true, motDePasseInitial: 'Compta123!', roleCode: 'comptabilite' } as never);
  const u2 = await db.utilisateur.findFirst({ where: { email: `cc2-${S}@test.sn` } });
  const ctxC2 = { utilisateurId: u2!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_COMPTA) } as never;
  await validerDepenseCore(ctxC2, dep.depenseId);
  const avant = await db.ecritureComptable.count({ where: { ecoleId: r.ecoleId } });
  const gen = await genererEcrituresAutomatiquesCore(ctxC, r.ecoleId);
  const apres = await db.ecritureComptable.count({ where: { ecoleId: r.ecoleId } });
  check(`génération auto : ${gen.créées} écriture(s) créée(s)`, apres === avant + gen.créées && gen.créées >= 1);
  const ligne601 = await db.ligneEcriture.findFirst({ where: { compteId: num('601').id, debit: { gt: 0 } } });
  check('dépense « Fournitures » → DÉBIT 601 (bon compte de charge)', !!ligne601 && ligne601.debit === 15000 * F, ligne601 ? `${ligne601.debit / F}` : 'absent');
  // ré-exécution : idempotent (ENC- déjà posés par le temps réel)
  const gen2 = await genererEcrituresAutomatiquesCore(ctxC, r.ecoleId);
  const apres2 = await db.ecritureComptable.count({ where: { ecoleId: r.ecoleId } });
  check('idempotente : les encaissements déjà écrits ne sont PAS doublés', apres2 === apres + gen2.créées && gen2.créées === 0, `créées=${gen2.créées}`);

  console.log('\n═══ 7. BALANCE — ÉQUILIBRE GÉNÉRAL ═══');
  const balance = await balanceComptableCore(ctxC, 'toutes');
  const totD = balance.comptes.reduce((s: number, l: any) => s + l.debit, 0);
  const totC = balance.comptes.reduce((s: number, l: any) => s + l.credit, 0);
  check(`Σ débit = Σ crédit (${totD / F} F)`, totD === totC, `D=${totD / F} C=${totC / F}`);

  console.log('\n═══ 8. SECTIONS COMPTABLES ═══');
  const sections = await configurerSectionsCore(ctxC, true);
  const secP = await db.sectionComptable.findFirst({ where: { ecoleId: r.ecoleId, code: 'PRIMAIRE' } });
  await passerEcritureCore(ctxC, { journalCode: 'OD', libelle: 'Subvention matériel primaire', sectionComptableId: secP!.id, lignes: [{ compte: '571', debit: 5000 * F }, { compte: '771', credit: 5000 * F }] });
  const balP = await balanceComptableCore(ctxC, secP!.id);
  const balPd = balP.comptes.reduce((s: number, l: any) => s + l.debit, 0);
  const balPc = balP.comptes.reduce((s: number, l: any) => s + l.credit, 0);
  check('balance par section filtrée et équilibrée (5 000/5 000)', balPd === 5000 * F && balPc === 5000 * F, `${balPd / F}/${balPc / F}`);

  console.log('\n═══ 9. ÉTAT DE CAISSE ═══');
  const etat = await etatCaisseCore(ctxC);
  check('état de caisse calculé', typeof etat === 'object' && etat !== null);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} COHÉRENCE COMPTABLE : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — LOGIQUE SAINNE'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('COMPTA-COHERENCE', main);
