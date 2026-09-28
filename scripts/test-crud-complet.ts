// CRUD COMPLET — test chaque operation sur chaque module par l'IA
import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore } from '../src/lib/business';
import { CATALOGUE_IA } from '../src/lib/ia/outils';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  OK ${nom}`); }
  else { f++; console.log(`  ECHEC ${nom}${detail ? ' --- ' + detail : ''}`); }
}
const PERMS_DIR = ['admin.saas','rh.gerer','eleves.lire','eleves.ecrire','finances.voir','finances.ecrire','finances.valider','vie_scolaire.gerer','securite.gerer','bulletins.valider','communication.envoyer','services.gerer','edt.gerer','sante.gerer','salles.gerer','protection.gerer','notes.saisir','presences.saisir'];

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('=== MISE EN PLACE ===');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'crud-test-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `CRUD Test ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `crud-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctx = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  const outils = new Map(CATALOGUE_IA.map((t) => [t.nom, t]));
  check('ecole creee', !!r.ecoleId);

  console.log('\n=== 1. CLASSES : CRUD ===');
  const cls: any = await outils.get('creer_classes')!.executer(ctx, { niveau: 'CE2', classes: 'CE2-Test' });
  check('1a. CREER classe', cls?.creees?.includes('CE2-Test') === true, JSON.stringify(cls).slice(0, 60));
  const clsMod: any = await outils.get('modifier_classe')!.executer(ctx, { classe: 'CE2-Test', nouveauNom: 'CE2-Renommee' });
  check('1b. MODIFIER classe', clsMod?.nouveauNom === 'CE2-Renommee', JSON.stringify(clsMod).slice(0, 60));
  const clsSup: any = await outils.get('supprimer_classe_vide')!.executer(ctx, { classe: 'CE2-Renommee' });
  check('1c. SUPPRIMER classe creee', !!clsSup?.classeId, JSON.stringify(clsSup).slice(0, 80));
  const clsDef: any = await outils.get('supprimer_classe_vide')!.executer(ctx, { classe: 'PS-A' });
  check('1d. SUPPRIMER classe PAR DEFAUT (PS-A)', !!clsDef?.classeId, JSON.stringify(clsDef).slice(0, 100));
  const clsDef2: any = await outils.get('supprimer_classe_vide')!.executer(ctx, { classe: '6E-A' });
  check('1e. SUPPRIMER classe PAR DEFAUT (6E-A)', !!clsDef2?.classeId, JSON.stringify(clsDef2).slice(0, 100));

  console.log('\n=== 2. MATIERES : CRUD ===');
  const mat: any = await outils.get('creer_matieres')!.executer(ctx, { matieres: 'Philosophie Test' });
  check('2a. CREER matiere', mat?.creees?.includes('Philosophie Test') === true, JSON.stringify(mat).slice(0, 60));
  const matMod: any = await outils.get('modifier_matiere')!.executer(ctx, { matiere: 'Philosophie Test', nouveauCoefficient: 3 });
  check('2b. MODIFIER matiere (coef 3)', matMod?.modifiee !== undefined, JSON.stringify(matMod).slice(0, 60));
  const matSup: any = await outils.get('supprimer_matiere')!.executer(ctx, { matiere: 'Philosophie Test' });
  check('2c. SUPPRIMER matiere', matSup?.supprimee !== undefined, JSON.stringify(matSup).slice(0, 60));

  console.log('\n=== 3. PROGRAMMES + CHAPITRES : CRUD ===');
  await outils.get('creer_matieres')!.executer(ctx, { matieres: 'Histoire Test' });
  const prog: any = await outils.get('creer_programme_annee')!.executer(ctx, { matiere: 'Histoire Test', niveau: '6E', chapitres: 'Chapitre Alpha:T1:sem1; Chapitre Beta:T1:sem5; Chapitre Gamma:T2:sem10' });
  check('3a. CREER programme 3 chapitres', prog?.chapitresAjoutes === 3, JSON.stringify(prog?.detail ?? []).slice(0, 80));
  const chMod: any = await outils.get('modifier_chapitre')!.executer(ctx, { matiere: 'Histoire Test', chapitre: 'Chapitre Alpha', nouveauTitre: 'Alpha Renomme' });
  check('3b. MODIFIER chapitre', chMod?.modifie !== undefined, JSON.stringify(chMod).slice(0, 60));
  const chSup: any = await outils.get('supprimer_chapitre')!.executer(ctx, { matiere: 'Histoire Test', chapitre: 'Chapitre Gamma' });
  check('3c. SUPPRIMER chapitre', chSup?.supprime !== undefined, JSON.stringify(chSup).slice(0, 60));
  const progSup: any = await outils.get('supprimer_programme')!.executer(ctx, { matiere: 'Histoire Test', niveau: '6E' });
  check('3d. SUPPRIMER programme entier', progSup?.supprime !== undefined, JSON.stringify(progSup).slice(0, 60));
  await outils.get('supprimer_matiere')!.executer(ctx, { matiere: 'Histoire Test' });

  console.log('\n=== 4. ENSEIGNANTS : CRUD ===');
  const ens: any = await outils.get('inscrire_personnel')!.executer(ctx, { nom: 'CRUDTest', prenom: 'Prof', email: `crudprof-${S}@test.sn`, dateEmbauche: '2026-09-01', roleCode: 'enseignant' });
  check('4a. CREER enseignant', !!ens?.personnelId, JSON.stringify(ens).slice(0, 80));
  const uEns = await db.utilisateur.findFirst({ where: { email: `crudprof-${S}@test.sn` }, include: { roles: { include: { role: true } } } });
  check('4b. role enseignant ASSIGNE', uEns?.roles?.some((x: any) => x.role?.code === 'enseignant') === true, uEns?.roles?.map((x: any) => x.role?.code).join(',') ?? 'aucun');
  const ensMod: any = await outils.get('modifier_personnel')!.executer(ctx, { personnel: 'CRUDTest', nouveauSalaire: 300000 });
  check('4c. MODIFIER enseignant', ensMod?.modifie !== undefined, JSON.stringify(ensMod).slice(0, 60));
  const ensSup: any = await outils.get('supprimer_personnel')!.executer(ctx, { personnel: 'CRUDTest', motif: 'test' });
  check('4d. SUPPRIMER enseignant', ensSup?.supprime !== undefined, JSON.stringify(ensSup).slice(0, 60));
  const uGone = await db.utilisateur.findFirst({ where: { email: `crudprof-${S}@test.sn` } });
  check('4e. compte desactive', uGone?.actif === false);

  console.log('\n=== 5. ELEVES : CRUD ===');
  const el: any = await outils.get('inscrire_eleve')!.executer(ctx, { nom: 'CRUDEleve', prenom: 'Test', dateNaissance: '2013-03-15', lieuNaissance: 'Dakar', sexe: 'M', classe: 'Cinquième A' });
  check('5a. CREER eleve', !!el?.eleveId, JSON.stringify(el).slice(0, 60));
  const rech: any = await outils.get('rechercher_eleve')!.executer(ctx, { q: 'CRUDEleve' });
  check('5b. LIRE eleve', rech?.length >= 1);
  const arch: any = await outils.get('archiver_eleve')!.executer(ctx, { eleveId: 'CRUDEleve', statut: 'sorti', dateSortie: '2026-09-28', motif: 'test' }).catch((e: any) => ({ erreur: e.message }));
  check('5c. SUPPRIMER eleve', arch !== undefined && !arch?.erreur, JSON.stringify(arch).slice(0, 60));

  console.log('\n=== 6. AFFECTATIONS : CRUD ===');
  const ens2 = await creerPersonnelCore(ctx, r.ecoleId, { nom: 'AffTest', prenom: 'Prof', email: `aff-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 200000, creerCompte: false } as never);
  await outils.get('creer_matieres')!.executer(ctx, { matieres: 'Sport Test' });
  const aff: any = await outils.get('affecter_enseignant')!.executer(ctx, { enseignant: 'AffTest', matiere: 'Sport Test', classes: '5E' });
  check('6a. CREER affectation', (aff?.affectationsCreees ?? 0) >= 1, JSON.stringify(aff).slice(0, 80));
  const affRet: any = await outils.get('retirer_affectation')!.executer(ctx, { enseignant: 'AffTest', matiere: 'Sport Test', classe: 'Cinquième A' });
  check('6b. SUPPRIMER affectation', affRet?.retiree === true, JSON.stringify(affRet).slice(0, 60));

  console.log('\n=== 7. NOTES + EVALUATIONS : CRUD ===');
  const classe5 = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '5E-A' } });
  const el2 = await inscrireEleveCore(ctx, r.ecoleId, { nom: 'NoteTest', prenom: 'Eleve', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'D', sexe: 'F', classeId: classe5!.id } as never);
  const eval1: any = await outils.get('creer_evaluation')!.executer(ctx, { classe: 'Cinquième A', matiere: 'Sport Test', type: 'devoir', intitule: 'Eval CRUD', date: new Date().toISOString().slice(0, 10), sur: 20, coefficient: 1 });
  check('7a. CREER evaluation', !!eval1?.evaluationId, JSON.stringify(eval1).slice(0, 60));
  await outils.get('saisir_notes')!.executer(ctx, { evaluation: 'Eval CRUD', notes: 'NoteTest Eleve: 15' });
  const noteMod: any = await outils.get('modifier_note')!.executer(ctx, { eleve: 'NoteTest', evaluation: 'Eval CRUD', nouvelleValeur: 18 });
  check('7b. MODIFIER note (15-18)', noteMod?.modifiee === 18, JSON.stringify(noteMod).slice(0, 60));
  const noteSup: any = await outils.get('supprimer_note')!.executer(ctx, { eleve: 'NoteTest', evaluation: 'Eval CRUD' });
  check('7c. SUPPRIMER note', noteSup?.supprimee === true, JSON.stringify(noteSup).slice(0, 60));
  const evalSup: any = await outils.get('supprimer_evaluation')!.executer(ctx, { evaluation: 'Eval CRUD' });
  check('7d. SUPPRIMER evaluation', evalSup?.supprimee !== undefined, JSON.stringify(evalSup).slice(0, 60));

  console.log('\n=== 8. CAHIER DE TEXTES : CRUD ===');
  const cahier: any = await outils.get('ecrire_cahier_textes')!.executer(ctx, { classe: 'Cinquième A', matiere: 'Sport Test', contenu: 'Cours test CRUD', travailAFaire: 'Exercices' });
  check('8a. CREER cahier', !!cahier?.entreeId, JSON.stringify(cahier).slice(0, 60));
  const cahMod: any = await outils.get('modifier_cahier_textes')!.executer(ctx, { classe: 'Cinquième A', contenuActuel: 'Cours test CRUD', nouveauContenu: 'Cours MODIFIE' });
  check('8b. MODIFIER cahier', cahMod?.modifiee !== undefined, JSON.stringify(cahMod).slice(0, 60));

  console.log('\n=== 9. FINANCES : CRUD ===');
  const frais1: any = await outils.get('creer_frais')!.executer(ctx, { libelle: 'Frais CRUD', montant: 50000, type: 'scolarite', periodicite: 'annuel', niveau: '5E' });
  check('9a. CREER frais', !!frais1?.fraisId, JSON.stringify(frais1).slice(0, 60));
  const fraisMod: any = await outils.get('modifier_frais')!.executer(ctx, { frais: 'Frais CRUD', nouveauMontant: 60000 });
  check('9b. MODIFIER frais', fraisMod?.modifie !== undefined, JSON.stringify(fraisMod).slice(0, 60));
  const enc: any = await outils.get('encaisser_paiement')!.executer(ctx, { eleve: 'NoteTest', montant: 30000, mode: 'espece' });
  check('9c. CREER encaissement', !!enc?.paiementId, JSON.stringify(enc).slice(0, 60));
  const situation: any = await outils.get('situation_financiere')!.executer(ctx, {});
  check('9d. LIRE situation', situation?.totalEncaisseF !== undefined);

  console.log('\n=== 10. INCIDENTS : CRUD ===');
  const inc: any = await outils.get('declarer_incident')!.executer(ctx, { eleve: 'NoteTest', description: 'Incident CRUD test', gravite: 'leger', type: 'comportement' });
  check('10a. CREER incident', !!inc?.incidentId, JSON.stringify(inc).slice(0, 60));
  const incSup: any = await outils.get('supprimer_incident')!.executer(ctx, { eleve: 'NoteTest', description: 'Incident CRUD test' });
  check('10b. SUPPRIMER incident', incSup?.supprime !== undefined, JSON.stringify(incSup).slice(0, 60));

  console.log(`\n=== BILAN : ${p} OK | ${f} ECHECS ===`);
  console.log(`${f === 0 ? 'PARFAIT' : 'PROBLEMES'} : ${p}/${p + f}${f ? ` --- ${f} ECHEC(S)` : ' --- TOUT FONCTIONNE'}`);
  if (f) process.exitCode = 1;
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? 'ecole supprimee' : 'residuel');
}

executerAvecRetry('CRUD-COMPLET', main);
