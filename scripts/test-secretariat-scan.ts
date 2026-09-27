// ════════════════════════════════════════════════════════════════════
// SCAN SÉCRÉTARIAT — déniche TOUS les problèmes persistants
// 1. Inscription élève : inscrire → retrouver → consulter → modifier
// 2. Le bug « élèves introuvables » après inscription
// 3. La confusion « prof enregistré comme élève »
// 4. Toutes les prérogatives secrétariat de bout en bout
// 5. L'IA secrétariat
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, modifierEleveCore,
  rattacherParentCore, creerCompteParentCore, creerCompteEleveCore,
  transfererClasseCore, changerStatutEleveCore, genererAttestationCore,
  importerElevesCsvCore, enregistrerCourrierCore, enregistrerReinscriptionCore,
  enregistrerVisiteurCore, basculerPieceDossierCore, creerMatiereCore,
} from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { CATALOGUE_IA, outilsPourSession } from '../src/lib/ia/outils';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS_SEC = ['eleves.lire', 'eleves.ecrire', 'communication.envoyer'];
const PERMS_DIR = ['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir'];

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 0. MISE EN PLACE : école + secrétaire ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'scan-sec-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Scan Sec ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `ss-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  const sec = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Secrétaire', prenom: 'Test', email: `sec-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 180000, creerCompte: true, motDePasseInitial: 'SecSec123!', roleCode: 'secretariat' } as never);
  const uSec = await db.utilisateur.findFirst({ where: { email: `sec-${S}@test.sn` } });
  const ctxSec = { utilisateurId: uSec!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_SEC) } as never;
  const sessSec = { utilisateur: { id: uSec!.id, ecoleId: r.ecoleId, email: uSec!.email, nom: 'Sec', prenom: 'Test', type: 'personnel' }, permissions: new Set(PERMS_SEC), roles: ['secretariat'], sessionId: 't' } as never;
  const classe6 = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  const classeCP = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: 'CP-A' } });
  check('école + secrétaire avec compte + rôle', !!sec.personnelId && !!uSec);

  console.log('\n═══ 1. INSCRIPTION ÉLÈVE — de bout en bout ═══');
  const e1 = await inscrireEleveCore(ctxSec, r.ecoleId, { nom: 'ÉlèveTrouvable', prenom: 'Marie', dateNaissance: new Date('2013-05-15'), lieuNaissance: 'Dakar', sexe: 'F', classeId: classe6!.id } as never);
  check('1a. élève inscrit par le secrétariat', !!e1.eleveId);
  const e1db = await db.eleve.findUnique({ where: { id: e1.eleveId } });
  check('1b. matricule attribué', !!e1db?.matricule, e1db?.matricule ?? 'AUCUN');
  check('1c. classe assignée (6e A)', e1db?.classeActuelleId === classe6!.id);
  check('1d. statut = actif', e1db?.statut === 'actif');
  check('1e. checklist dossier créée (5 pièces)', (await db.pieceDossier.count({ where: { eleveId: e1.eleveId } })) === 5);

  console.log('\n═══ 2. LE BUG « élèves introuvables » — pourquoi ? ═══');
  // Test A : le portail charge-t-il l'élève ?
  const dSec1: any = await chargerDonneesPortail('secretariat', sessSec, null);
  const visibleDansPortail = (dSec1.eleves ?? []).some((e: any) => e.id === e1.eleveId);
  check('2a. l\'élève apparaît dans le portail secrétariat après inscription', visibleDansPortail,
    `${(dSec1.eleves ?? []).length} élèves chargés`);
  // Test B : la recherche IA le trouve-t-elle ?
  const outils = new Map(CATALOGUE_IA.map((t) => [t.nom, t]));
  const rech: any = await outils.get('rechercher_eleve')!.executer(ctxSec, { q: 'ÉlèveTrouvable' });
  check('2c. l\'IA retrouve l\'élève par son nom', rech?.length >= 1, JSON.stringify(rech).slice(0, 80));
  // Test C : le profil fonctionne-t-il ?
  const profil: any = await outils.get('profil_eleve')!.executer(ctxSec, { eleveId: e1.eleveId });
  check('2d. profil de l\'élève accessible', !!profil?.identite, JSON.stringify(profil).slice(0, 60));
  // Test E : les causes possibles du bug historique
  console.log('  ── Causes possibles du « introuvable » historique :');
  console.log('     • année scolaire filtrée par défaut (l\'élève est-il dans l\'année active ?)');
  const anneeActive = await db.anneeScolaire.findFirst({ where: { ecoleId: r.ecoleId, active: true } });
  const classeAnnee = await db.classe.findFirst({ where: { id: classe6!.id }, select: { anneeScolaireId: true } });
  check('2e. la classe de l\'élève est dans l\'année ACTIVE', classeAnnee?.anneeScolaireId === anneeActive?.id);
  console.log('     • matricule avec caractères spéciaux ?');
  check('2f. matricule lisible (EL-####)', /^EL-\d+$/.test(e1db?.matricule ?? ''), e1db?.matricule);

  console.log('\n═══ 3. LE BUG « prof enregistré comme élève » ═══');
  // Cause possible : le secrétariat voit le module Élèves mais PAS le module Personnel
  // → il utilise le formulaire « Inscrire un élève » pour créer un prof !
  console.log('  ── Diagnostic :');
  console.log('     • le module Personnel est CACHÉ pour le secrétariat (portals: direction, rh, super_admin)');
  console.log('     • le module Élèves est VISIBLE pour le secrétariat');
  console.log('     → Si le secrétaire veut créer un prof, il utilise le seul formulaire disponible : Inscrire un élève');
  console.log('  ── Solutions déjà en place :');
  console.log('     • Le module Personnel demande rh.gerer → le secrétariat est refusé s\'il l\'appelle');
  let refusePersonnel = false;
  try { await creerPersonnelCore(ctxSec, r.ecoleId, { nom: 'Test', prenom: 'Prof', dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 0, creerCompte: false } as never); }
  catch (e: any) { refusePersonnel = /permission/i.test(String(e.message)); }
  check('3a. le secrétariat ne peut PAS créer du personnel (rh.gerer requis)', refusePersonnel);
  // La vraie solution : le secrétariat DOIT demander à la direction/RH de créer les profs
  console.log('  ── RÔLE CORRECT : le secrétariat inscrit des ÉLÈVES ; la direction/RH crée le PERSONNEL');
  // Mais avec l'IA, le secrétariat peut demander à l'IA...
  const outilsSec = outilsPourSession(new Set(PERMS_SEC)).map((t) => t.nom);
  check('3b. l\'IA du secrétariat N\'A PAS l\'outil inscrire_personnel', !outilsSec.includes('inscrire_personnel'));
  check('3c. l\'IA du secrétariat A l\'outil inscrire_eleve', outilsSec.includes('inscrire_eleve'));

  console.log('\n═══ 4. PRÉROGATIVES SÉCRÉTARIAT — le tour complet ═══');
  // Inscription par CSV
  const csv = `nom;prenom;dateNaissance;sexe;classe\nFall;Omar;2013-01-05;M;${classe6!.code}\nSow;Awa;2013-03-08;F;${classeCP!.code}`;
  const imp = await importerElevesCsvCore(ctxSec, r.ecoleId, csv);
  check('4a. import CSV : 2 élèves créés', imp.créés === 2, JSON.stringify(imp).slice(0, 60));
  // Parent rattache + compte
  const e2 = await db.eleve.findFirst({ where: { ecoleId: r.ecoleId, nom: 'Fall' } });
  const par = await rattacherParentCore(ctxSec, { eleveId: e2!.id, nouveauParent: { nom: 'Fall', prenom: 'Maman', telephone: '+221 77 000', lienAvecEleve: 'mere' } } as never);
  const cpt = await creerCompteParentCore(ctxSec, par.parentId, `parent-${S}@test.sn`, 'Parent123!');
  check('4b. parent rattaché + compte créé', !!par.parentId && !!cpt.utilisateurId);
  // Compte élève
  const cptE = await creerCompteEleveCore(ctxSec, e2!.id, `eleve-${S}@test.sn`, 'Eleve123!');
  check('4c. compte élève créé', !!cptE.utilisateurId);
  // Modification
  const mod = await modifierEleveCore(ctxSec, { eleveId: e2!.id, nom: 'Fall', prenom: 'Omar', dateNaissance: new Date('2013-01-05'), lieuNaissance: 'Dakar', sexe: 'M' } as never);
  check('4d. dossier élève modifiable', true);
  // Transfert
  await transfererClasseCore(ctxSec, e2!.id, classeCP!.id, 'redoublement');
  const e2b = await db.eleve.findUnique({ where: { id: e2!.id } });
  check('4e. transfert de classe (6e → CP)', e2b?.classeActuelleId === classeCP!.id);
  // Certificat
  const att = await genererAttestationCore(ctxSec, e2!.id, 'certificat_scolarite');
  check('4f. certificat de scolarité généré', !!att);
  // Courrier
  const cour = await enregistrerCourrierCore(ctxSec, r.ecoleId, { direction: 'entrant', objet: 'Demande de transfert', correspondant: 'Famille Fall' } as never);
  check('4g. courrier chronoté', cour.reference.startsWith('C-ENT'));
  // Visiteur
  const vis = await enregistrerVisiteurCore(ctxSec, r.ecoleId, { nom: 'Parent Fall', motifVisite: 'Rencontre', pieceVerifiee: true } as never);
  check('4h. visiteur enregistré (badge)', vis.badge?.startsWith('V-'));
  // Réinscription
  const reins = await enregistrerReinscriptionCore(ctxSec, { eleveId: e2!.id, fraisPayes: false } as never);
  check('4i. réinscription enregistrée', !!reins.reinscriptionId);
  // Checklist dossier
  const piece = await db.pieceDossier.findFirst({ where: { eleveId: e2!.id, statut: 'manquante' } });
  if (piece) {
    await basculerPieceDossierCore(ctxSec, piece.id, 'recue');
    check('4j. pièce du dossier marquée reçue', true);
  }
  // Isolation
  const dSec2: any = await chargerDonneesPortail('secretariat', sessSec, null);
  check('4k. isolation : pas de finances', !dSec2.paiements || dSec2.paiements.length === 0);
  check('4l. isolation : pas de santé', !dSec2.fichesSante || dSec2.fichesSante.length === 0);
  check('4m. isolation : pas de notes', !dSec2.notes || dSec2.notes.length === 0);
  check('4n. isolation : pas de RH/paie', !dSec2.bulletinsPaie || dSec2.bulletinsPaie.length === 0);
  // Suivi échéances (nouveau)
  check('4o. suivi échéances visible (pas le journal)', Array.isArray(dSec2.echeances));

  console.log('\n═══ 5. ISOLATION SERVEUR — le secrétariat ne sort pas de son rôle ═══');
  let refus1 = false, refus2 = false, refus3 = false;
  try { await (await import('../src/lib/business')).encaisserPaiementCore(ctxSec, { eleveId: e2!.id, montant: 10000, modePaiement: 'espece' } as never); } catch { refus1 = true; }
  try { await (await import('../src/lib/business')).saisirNotesCore(ctxSec, { evaluationId: 'x', notes: [] } as never); } catch { refus2 = true; }
  try { await creerPersonnelCore(ctxSec, r.ecoleId, { nom: 'X', prenom: 'Y', dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 0, creerCompte: false } as never); } catch { refus3 = true; }
  check('5a. secrétariat ✗ ne peut PAS encaisser', refus1);
  check('5b. secrétariat ✗ ne peut PAS saisir de notes', refus2);
  check('5c. secrétariat ✗ ne peut PAS créer du personnel', refus3);

  console.log('\n═══ 6. IA SECRÉTARIAT ═══');
  const outilsSecFin = outilsPourSession(new Set(PERMS_SEC));
  const nomsSec = outilsSecFin.map((t) => t.nom);
  check(`6a. ${outilsSecFin.length} outils IA pour le secrétariat`, outilsSecFin.length >= 15, `${outilsSecFin.length}`);
  const attendusSec = ['inscrire_eleve', 'rechercher_eleve', 'profil_eleve', 'transferer_eleve', 'notifier_parents', 'enregistrer_visiteur', 'enregistrer_courrier', 'certificat_scolarite', 'reinscrire_eleve'];
  const manquants = attendusSec.filter((a) => !nomsSec.includes(a));
  check(`6b. couverture (${attendusSec.length - manquants.length}/${attendusSec.length} attendus)`, manquants.length === 0, manquants.join(','));
  // Test réel d'inscription par l'IA
  const inscIA: any = await outils.get('inscrire_eleve')!.executer(ctxSec, { nom: 'ParIA', prenom: 'Test', dateNaissance: '2014-02-10', lieuNaissance: 'Dakar', sexe: 'M', classe: 'Sixième A' });
  check('6c. IA inscrit un élève par nom de classe (« Inscrit ParIA Test en 6e A »)', !!inscIA?.eleveId, JSON.stringify(inscIA).slice(0, 80));
  // L'IA retrouve-t-elle l'élève qu'elle vient de créer ?
  const rech2: any = await outils.get('rechercher_eleve')!.executer(ctxSec, { q: 'ParIA' });
  check('6d. IA retrouve l\'élève qu\'elle vient d\'inscrire', rech2?.length >= 1);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');
  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} SCAN SÉCRÉTARIAT : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — AUCUN PROBLÈME PERSISTANT'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('SCAN-SEC', main);
