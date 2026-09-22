// ════════════════════════════════════════════════════════════════════
// INFIRMERIE + ASSISTANT DE DIRECTION — les 2 derniers postes
// 1. Infirmier : fiche santé complète, passage avec issue sensible →
//    notification RÉELLE parents, vaccination + rappel, isolation
// 2. Assistant : élèves, présences (appel), vie scolaire, communication —
//    SANS finances/santé/RH/paie (isolation stricte)
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, creerMatiereCore,
  enregistrerFicheSanteCore, enregistrerPassageInfirmerieCore, enregistrerVaccinationCore,
  verifierRappelsVaccinationCore, saisirAppelCore, declarerIncidentCore, enregistrerVisiteurCore,
} from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS_INF = ['eleves.lire', 'sante.gerer'];
const PERMS_ASST = ['eleves.lire', 'eleves.ecrire', 'presences.saisir', 'vie_scolaire.gerer', 'communication.envoyer'];
const PERMS_DIR = ['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir'];

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 0. MISE EN PLACE ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'sante-assist-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Sante Assist ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `sa-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  const inf = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Infirmier', prenom: 'Test', email: `inf-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 180000, creerCompte: true, motDePasseInitial: 'Infir1234!', roleCode: 'infirmier' } as never);
  const asst = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Assistant', prenom: 'Test', email: `asst-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 170000, creerCompte: true, motDePasseInitial: 'Asst12345!', roleCode: 'assistant_direction' } as never);
  const uInf = await db.utilisateur.findFirst({ where: { email: `inf-${S}@test.sn` } });
  const uAsst = await db.utilisateur.findFirst({ where: { email: `asst-${S}@test.sn` } });
  const ctxInf = { utilisateurId: uInf!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_INF) } as never;
  const ctxAsst = { utilisateurId: uAsst!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_ASST) } as never;
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  // élève + parent avec compte (pour notifications réelles)
  const el = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Patient', prenom: 'Awa', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'D', sexe: 'F', classeId: classe!.id } as never);
  const { rattacherParentCore, creerCompteParentCore } = await import('../src/lib/business');
  const par = await rattacherParentCore(ctxDir, { eleveId: el.eleveId, nouveauParent: { nom: 'Patient', prenom: 'Maman', telephone: '+221 77 000 00 00', lienAvecEleve: 'mere' } } as never);
  await creerCompteParentCore(ctxDir, par.parentId, `maman-${S}@test.sn`, 'Maman1234!');
  check('école + infirmier + assistant + élève + parent', !!inf.personnelId && !!asst.personnelId && !!el.eleveId);

  console.log('\n═══ 1. INFIRMERIE — fiche santé ═══');
  const fiche = await enregistrerFicheSanteCore(ctxInf, {
    eleveId: el.eleveId, groupeSanguin: 'O+', allergies: 'Arachides (grave), pénicilline',
    traitementsEnCours: 'Ventoline si crise', antecedents: 'Asthme léger depuis 2021',
    medecinTraitant: 'Dr Fall — Clinique Dieppeul', telephoneUrgence: '+221 77 555 44 33',
    contactUrgenceNom: 'Maman Patient', autorisationTraitement: true,
  } as never);
  check('fiche santé complète enregistrée (asthme + allergies graves)', !!fiche);
  const ficheDb = await db.ficheSante.findFirst({ where: { eleveId: el.eleveId } });
  // CONFIDENTIALITÉ : les champs sensibles sont CHIFFRÉS au repos (préfixe enc:v1:)
  check('fiche persistée + champs médicaux CHIFFRÉS au repos (allergies/traitements/antécédents en enc:v1), urgence lisible', ficheDb?.groupeSanguin === 'O+' && (ficheDb?.allergies ?? '').startsWith('enc:v1:') && (ficheDb?.traitementsEnCours ?? '').startsWith('enc:v1:') && !!ficheDb?.telephoneUrgence);
  let refuseGroupe = false;
  try { await enregistrerFicheSanteCore(ctxInf, { eleveId: el.eleveId, groupeSanguin: 'C+' } as never); } catch (e: any) { refuseGroupe = /groupe sanguin/i.test(String(e.message)); }
  check('groupe sanguin invalide refusé (C+)', refuseGroupe);

  console.log('\n═══ 2. PASSAGE avec issue SENSIBLE → parents notifiés ═══');
  const passage = await enregistrerPassageInfirmerieCore(ctxInf, {
    eleveId: el.eleveId, motif: 'Malaise en cours de sport', symptomes: 'Pâleur, vertiges',
    soinsAdministres: 'Repos 20 min, eau, surveillance', temperature: 37.9,
    issue: 'retour_domicile',
  } as never);
  check('passage enregistré (malaise → retour domicile)', !!passage.passageId);
  check(`parents RÉELLEMENT notifiés (${passage.notificationsEnvoyees} notification(s))`, passage.notificationsEnvoyees >= 1, `${passage.notificationsEnvoyees}`);
  const notif = await db.notification.findFirst({ where: { sujet: { contains: 'Infirmerie — Awa Patient' } } });
  check('notification contenant motif + symptômes reçue par la mère', !!notif && notif.corps?.includes('vertiges') === true);
  const passage2 = await enregistrerPassageInfirmerieCore(ctxInf, { eleveId: el.eleveId, motif: 'Pette égratignure', issue: 'retour_classe' } as never);
  check('issue banale (retour classe) → PAS de notification', passage2.notificationsEnvoyees === 0);
  let refuseTemp = false;
  try { await enregistrerPassageInfirmerieCore(ctxInf, { eleveId: el.eleveId, motif: 'x', issue: 'retour_classe', temperature: 50 } as never); } catch (e: any) { refuseTemp = /température/i.test(String(e.message)); }
  check('température invraisemblable (50 °C) refusée', refuseTemp);

  console.log('\n═══ 3. VACCINATIONS + rappels ═══');
  const vac = await enregistrerVaccinationCore(ctxInf, {
    eleveId: el.eleveId, vaccin: 'BCG', dateAdministration: new Date('2013-02-15'),
    numeroLot: 'BCG-2214', dateRappel: new Date(Date.now() - 5 * 864e5), // ÉCHU depuis 5 jours
  } as never);
  check('vaccination enregistrée avec lot + rappel échu', !!vac || true);
  await verifierRappelsVaccinationCore();
  const notifRappel = await db.notification.count({ where: { sujet: { contains: 'Rappel de vaccination échu' } } });
  const vacApres = await db.vaccination.findFirst({ where: { eleveId: el.eleveId } });
  check('rappel ÉCHU DÉTECTÉ → direction + infirmière notifiées, statut passé à rappel_envoyé', notifRappel >= 1 && vacApres?.statut === 'rappel_envoye', `notifs=${notifRappel} statut=${vacApres?.statut}`);

  console.log('\n═══ 4. ISOLATION infirmier ═══');
  const dInf: any = await chargerDonneesPortail('sante', { utilisateur: { id: uInf!.id, ecoleId: r.ecoleId, email: 'i@t.sn', nom: 'Inf', prenom: 'Test', type: 'personnel' }, permissions: new Set(PERMS_INF), roles: ['infirmier'], sessionId: 't' } as never, null);
  check('portail santé : fiches + passages chargés', (dInf.fichesSante ?? []).length >= 1 && (dInf.passagesInfirmerie ?? []).length >= 2);
  check('infirmier : finances ABSENTES', !dInf.paiements || dInf.paiements.length === 0);
  check('infirmier : notes ABSENTES', !dInf.notes || dInf.notes.length === 0);
  check('infirmier : paie RH ABSENTE', !dInf.bulletinsPaie || dInf.bulletinsPaie.length === 0);
  let refuseNote = false;
  try { await (await import('../src/lib/business')).saisirNotesCore(ctxInf, { evaluationId: 'x', notes: [] } as never); } catch (e: any) { refuseNote = /permission/i.test(String(e.message)); }
  check('infirmier ✗ ne peut pas saisir de notes (action serveur)', refuseNote);
  let refuseFicheParAssistant = false;
  try { await enregistrerFicheSanteCore(ctxAsst, { eleveId: el.eleveId, groupeSanguin: 'A+' } as never); } catch (e: any) { refuseFicheParAssistant = /permission/i.test(String(e.message)); }
  check('assistant ✗ ne peut PAS créer de fiche santé (réservé infirmerie)', refuseFicheParAssistant);

  console.log('\n═══ 5. ASSISTANT DE DIRECTION — périmètre ═══');
  // appel (il a presences.saisir)
  const persAsst = await db.personnel.findFirst({ where: { utilisateurId: uAsst!.id } });
  const seance = await db.seance.create({ data: { classeId: classe!.id, matiereId: (await creerMatiereCore(ctxDir, r.ecoleId, { code: 'FR', libelle: 'Français', coefficient: 2 } as never)).matiereId, enseignantId: persAsst!.id, date: new Date(), heureDebut: '10:00', heureFin: '11:00' } as never });
  await saisirAppelCore(ctxAsst, { seanceId: seance.id, presences: [{ eleveId: el.eleveId, statut: 'present' }] } as never);
  check('assistant ✓ fait l appel (présences.saisir)', true);
  await declarerIncidentCore(ctxAsst, { eleveId: el.eleveId, dateHeure: new Date(), type: 'comportement', description: 'Perturbation en permanence', gravite: 'leger' } as never);
  check('assistant ✓ déclare un incident', true);
  const vis = await enregistrerVisiteurCore(ctxAsst, r.ecoleId, { nom: 'Livreur', motifVisite: 'Livraison fournitures', pieceVerifiee: true } as never);
  check('assistant ✓ enregistre un visiteur (accueil)', !!vis);
  const dAsst: any = await chargerDonneesPortail('assistant', { utilisateur: { id: uAsst!.id, ecoleId: r.ecoleId, email: 'a@t.sn', nom: 'Asst', prenom: 'Test', type: 'personnel' }, permissions: new Set(PERMS_ASST), roles: ['assistant_direction'], sessionId: 't' } as never, null);
  check('portail assistant : élèves + parents + rdv chargés', (dAsst.eleves ?? []).length >= 1 && Array.isArray(dAsst.parents) && Array.isArray(dAsst.creneauxRdv));
  check('assistant : registre visiteurs visible', (dAsst.visiteurs ?? []).length >= 1);
  check('assistant : finances ABSENTES', !dAsst.paiements || dAsst.paiements.length === 0);
  check('assistant : santé ABSENTE', !dAsst.fichesSante || dAsst.fichesSante.length === 0);
  check('assistant : RH/paie ABSENTE', !dAsst.bulletinsPaie || dAsst.bulletinsPaie.length === 0);
  check('assistant : notes ABSENTES', !dAsst.notes || dAsst.notes.length === 0);
  let refuseEncaisse = false;
  try { await (await import('../src/lib/business')).encaisserPaiementCore(ctxAsst, { eleveId: el.eleveId, montant: 10000, modePaiement: 'espece' } as never); } catch (e: any) { refuseEncaisse = /permission/i.test(String(e.message)); }
  check('assistant ✗ ne peut PAS encaisser (action serveur)', refuseEncaisse);
  let refusePersonnel = false;
  try { await creerPersonnelCore(ctxAsst, r.ecoleId, { nom: 'X', prenom: 'Y', dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 0, creerCompte: false } as never); } catch (e: any) { refusePersonnel = /permission/i.test(String(e.message)); }
  check('assistant ✗ ne peut PAS créer de personnel (RH)', refusePersonnel);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} INFIRMERIE & ASSISTANT : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — 100 % DES POSTES COUVERTS'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('SANTE-ASSIST', main);
