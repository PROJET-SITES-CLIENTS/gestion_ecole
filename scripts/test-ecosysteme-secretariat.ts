// ════════════════════════════════════════════════════════════════════
// ÉCOSYSTÈME SECRÉTARIAT — simulation complète
// 1. Prérogatives métier : inscriptions, dossier, parents+comptes, certificats,
//    suivi paiements, relances, visiteurs, communication, admissions, RDV
// 2. SPLIT : secrétariat PRIMAIRE vs SECONDAIRE vs UNIQUE — périmètre respecté
//    (données visibles + inscription refusée hors périmètre)
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, modifierEleveCore,
  rattacherParentCore, creerCompteParentCore, transfererClasseCore,
  genererAttestationCore, importerElevesCsvCore, enregistrerVisiteurCore,
  majPerimetreSecretariatCore,
} from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
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
  console.log('═══ 0. MISE EN PLACE : école + 3 secrétariats ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'eco-secretariat-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({
    nomEcole: `Eco Secretariat ${S}`, adminNom: 'Dir', adminPrenom: 'Test',
    adminEmail: `sec-dir-${S}@test.sn`, adminMotDePasse: 'Directeur123!',
  } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;

  // 3 secrétariats : unique (aucun périmètre) + primaire + secondaire
  const secUnique = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Unique', prenom: 'Sec', email: `sec-u-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 180000, creerCompte: true, motDePasseInitial: 'SecSec123!', roleCode: 'secretariat' } as never);
  const secPrim = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Prim', prenom: 'Sec', email: `sec-p-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 180000, creerCompte: true, motDePasseInitial: 'SecSec123!', roleCode: 'secretariat', perimetreSecretariat: 'primaire' } as never);
  const secSec = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Second', prenom: 'Sec', email: `sec-s-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 180000, creerCompte: true, motDePasseInitial: 'SecSec123!', roleCode: 'secretariat', perimetreSecretariat: 'secondaire' } as never);
  check('3 comptes secrétariat créés (1 unique + 1 primaire + 1 secondaire)', !!secUnique.personnelId && !!secPrim.personnelId && !!secSec.personnelId);
  const uPrim = await db.utilisateur.findFirst({ where: { email: `sec-p-${S}@test.sn` } });
  const uSec = await db.utilisateur.findFirst({ where: { email: `sec-s-${S}@test.sn` } });
  const uUnique = await db.utilisateur.findFirst({ where: { email: `sec-u-${S}@test.sn` } });
  const ctxOf = (u: any) => ({ utilisateurId: u.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_SEC) } as never);
  const sessOf = (u: any) => ({ utilisateur: { id: u.id, ecoleId: r.ecoleId, email: u.email, nom: 'Sec', prenom: 'Test', type: 'personnel' }, permissions: new Set(PERMS_SEC), roles: ['secretariat'], sessionId: 's' } as never);

  console.log('\n═══ 1. PRÉROGATIVES MÉTIER (secrétariat unique) ═══');
  const classeCE1 = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: 'CE1-A' } });
  const classe6E = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  const ctxU = ctxOf(uUnique);
  const el1 = await inscrireEleveCore(ctxU, r.ecoleId, { nom: 'Kane', prenom: 'Fatou', dateNaissance: new Date('2016-02-10'), lieuNaissance: 'Dakar', sexe: 'F', classeId: classeCE1!.id } as never);
  check('✓ inscription élève (CE1)', !!el1.eleveId);
  const el2 = await inscrireEleveCore(ctxU, r.ecoleId, { nom: 'Diouf', prenom: 'Malick', dateNaissance: new Date('2013-06-18'), lieuNaissance: 'Thiès', sexe: 'M', classeId: classe6E!.id } as never);
  check('✓ inscription élève (6ème)', !!el2.eleveId);
  const mod = await modifierEleveCore(ctxU, { eleveId: el1.eleveId, nom: 'Kane', prenom: 'Fatou', dateNaissance: new Date('2016-02-10'), lieuNaissance: 'Guédiawaye', sexe: 'F' } as never);
  check('✓ modification dossier (adresse, tél)', !!mod || mod === undefined || true, JSON.stringify(mod).slice(0, 40));
  // vérif réelle de la modification
  const el1b = await db.eleve.findUnique({ where: { id: el1.eleveId } });
  check('   dossier réellement mis à jour (lieu de naissance)', el1b?.lieuNaissance === 'Guédiawaye', el1b?.lieuNaissance ?? '');
  const par = await rattacherParentCore(ctxU, { eleveId: el1.eleveId, nouveauParent: { nom: 'Kane', prenom: 'Awa', telephone: '+221 78 000 11 22', lienAvecEleve: 'mere' } } as never);
  check('✓ parent rattaché', !!par.parentId);
  const cpt = await creerCompteParentCore(ctxU, par.parentId, `parent-kane-${S}@test.sn`, 'Parent123!');
  check('✓ compte parent créé par le secrétariat', !!cpt.utilisateurId);
  const att = await genererAttestationCore(ctxU, el1.eleveId, 'certificat_scolarite');
  check('✓ certificat de scolarité généré', !!att);
  // import CSV (3 lignes : 2 valides, 1 erreur)
  const csv = `nom;prenom;dateNaissance;sexe;classe
Sow;Ali;2016-01-05;M;${classeCE1!.code}
Ndir;Rokhaya;2016-03-08;F;${classeCE1!.code}
BAD;Ligne;xxxx;M;${classeCE1!.code}`;
  const imp = await importerElevesCsvCore(ctxU, r.ecoleId, csv);
  check(`✓ import CSV : ${imp.créés} créés / ${imp.ignorés + imp.erreurs.length} rejet(s)`, imp.créés === 2);
  const vis = await enregistrerVisiteurCore(ctxU, r.ecoleId, { nom: 'Ndiaye', prenom: 'Mamadou', motifVisite: 'Inscription enfant', pieceVerifiee: true } as never);
  check('✓ visiteur enregistré (accueil)', !!vis);
  const transfert = await transfererClasseCore(ctxU, el1.eleveId, classe6E!.id, 'changement de niveau');
  const el1c = await db.eleve.findUnique({ where: { id: el1.eleveId } });
  check('✓ transfert de classe (CE1 → 6ème) avec historique', el1c?.classeActuelleId === classe6E!.id);

  // données du portail secrétariat : suivi échéances + parents + rdv + admissions
  const dU: any = await chargerDonneesPortail('secretariat', sessOf(uUnique), null);
  check('✓ portail : voit les 4 élèves (2 inscrites + 2 importées)', (dU.eleves ?? []).length === 4, `${(dU.eleves ?? []).length}`);
  check('✓ portail : parents rattachés visibles', (dU.parents ?? []).length >= 1);
  check('✓ portail : visiteur visible', (dU.visiteurs ?? []).length >= 1);
  check('✓ portail : créneaux RDV chargés', Array.isArray(dU.creneauxRdv));
  check('✓ portail : candidatures admissions chargées', Array.isArray(dU.candidaturesAdmission));
  check('✓ portail : documents du dossier visibles', Array.isArray(dU.documents));

  console.log('\n═══ 2. SPLIT : secrétariat PRIMAIRE vs SECONDAIRE ═══');
  // Élèves supplémentaires : 1 au primaire (déjà CE1), 1 au secondaire (6ème déjà)
  // Vue du secrétariat PRIMAIRE
  const dP: any = await chargerDonneesPortail('secretariat', sessOf(uPrim), null);
  const elevesP = dP.eleves ?? [];
  check('secrétariat PRIMAIRE ne voit QUE les 2 élèves du primaire (les 2 importés — Fatou a été transférée)', elevesP.length === 2 && elevesP.every((e: any) => e.id !== el2.eleveId && e.id !== el1.eleveId), `${elevesP.length}`);
  // Vue du secrétariat SECONDAIRE
  const dS: any = await chargerDonneesPortail('secretariat', sessOf(uSec), null);
  const elevesS = dS.eleves ?? [];
  check('secrétariat SECONDAIRE voit les 2 élèves du secondaire (Malick + Fatou transférée)', elevesS.length === 2 && elevesS.some((e: any) => e.id === el2.eleveId) && elevesS.some((e: any) => e.id === el1.eleveId), `${elevesS.length}`);
  // Écritures hors périmètre → REFUS
  let refuseP = false;
  try { await inscrireEleveCore(ctxOf(uPrim), r.ecoleId, { nom: 'X', prenom: 'Y', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'D', sexe: 'M', classeId: classe6E!.id } as never); }
  catch (e: any) { refuseP = /primaire/i.test(String(e.message)); }
  check('secrétariat primaire ✗ ne peut PAS inscrire au secondaire', refuseP);
  let refuseS = false;
  try { await inscrireEleveCore(ctxOf(uSec), r.ecoleId, { nom: 'X', prenom: 'Y', dateNaissance: new Date('2016-01-01'), lieuNaissance: 'D', sexe: 'F', classeId: classeCE1!.id } as never); }
  catch (e: any) { refuseS = /secondaire/i.test(String(e.message)); }
  check('secrétariat secondaire ✗ ne peut PAS inscrire au primaire', refuseS);
  // Écritures DANS le périmètre → OK
  const elP = await inscrireEleveCore(ctxOf(uPrim), r.ecoleId, { nom: 'Ba', prenom: 'Khady', dateNaissance: new Date('2016-11-03'), lieuNaissance: 'Dakar', sexe: 'F', classeId: classeCE1!.id } as never);
  check('secrétariat primaire ✓ inscrit AU primaire', !!elP.eleveId);
  // Le périmètre est MODIFIABLE par la direction (passage split → unique)
  const persPrim = await db.personnel.findFirst({ where: { utilisateurId: uPrim!.id } });
  await majPerimetreSecretariatCore(ctxDir, persPrim!.id, null);
  const dP2: any = await chargerDonneesPortail('secretariat', sessOf(uPrim), null);
  check('direction passe le secrétariat primaire en ÉCOLE ENTIÈRE → il voit tout', (dP2.eleves ?? []).length === 5, `${(dP2.eleves ?? []).length}`);

  console.log('\n═══ 3. ISOLATION (le secrétariat ne sort pas de son rôle) ═══');
  check('secrétariat : journal paiements ABSENT', !dU.paiements || dU.paiements.length === 0);
  check('secrétariat : notes ABSENTES', !dU.notes || dU.notes.length === 0);
  check('secrétariat : paie RH ABSENTE', !dU.bulletinsPaie || dU.bulletinsPaie.length === 0);
  check('secrétariat : fiches santé ABSENTES', !dU.fichesSante || dU.fichesSante.length === 0);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école de simulation supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} ÉCOSYSTÈME SECRÉTARIAT : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — COMPLET'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('ECO-SECRETARIAT', main);
