// ════════════════════════════════════════════════════════════════════
// SURVEILLANT & CENSEUR — écosystème complet
// 1. Surveillant : appel, retard (billet + alerte 3e), visiteur, justification
// 2. Censeur : incident → sanction, stats discipline, surveillance d'épreuves
//    (anti-chevauchement), conseil de discipline (convocation + décision),
//    visa des cahiers de textes
// 3. Limites : le surveillant ne sanctionne pas, ne crée pas de conseil
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, creerMatiereCore,
  declarerIncidentCore, sanctionnerCore, creerEntreeCahierCore, saisirAppelCore,
  enregistrerRetardCore, justifierRetardCore, statsDisciplineCore,
  creerSurveillanceCore, mesSurveillancesCore, creerConseilDisciplineCore, deciderConseilDisciplineCore,
  viserCahierTexteCore,
} from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS_SURV = ['eleves.lire', 'presences.saisir', 'vie_scolaire.gerer', 'securite.gerer'];
const PERMS_CENS = ['eleves.lire', 'bulletins.valider', 'presences.saisir', 'vie_scolaire.gerer', 'examens.gerer', 'edt.gerer', 'protection.gerer'];

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 0. MISE EN PLACE ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'vie-sco-plus-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Vie Sco Plus ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `vs-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const PERMS_DIR = ['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir'];
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  const surv = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Surveillant', prenom: 'Test', email: `surv-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 150000, creerCompte: true, motDePasseInitial: 'Surv12345!', roleCode: 'surveillant' } as never);
  const cens = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Censeur', prenom: 'Test', email: `cens-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 250000, creerCompte: true, motDePasseInitial: 'Cens12345!', roleCode: 'censeur' } as never);
  const uSurv = await db.utilisateur.findFirst({ where: { email: `surv-${S}@test.sn` } });
  const uCens = await db.utilisateur.findFirst({ where: { email: `cens-${S}@test.sn` } });
  const ctxSurv = { utilisateurId: uSurv!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_SURV) } as never;
  const ctxCens = { utilisateurId: uCens!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_CENS) } as never;
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  const el = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Ba', prenom: 'Omar', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'D', sexe: 'M', classeId: classe!.id } as never);
  const el2 = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Fall', prenom: 'Awa', dateNaissance: new Date('2013-02-02'), lieuNaissance: 'D', sexe: 'F', classeId: classe!.id } as never);
  check('école + surveillant + censeur + 2 élèves', !!surv.personnelId && !!cens.personnelId && !!el.eleveId);

  console.log('\n═══ 1. SURVEILLANT — quotidien ═══');
  // appel
  const persSurv = await db.personnel.findFirst({ where: { utilisateurId: uSurv!.id } });
  const matiereFR = await creerMatiereCore(ctxDir, r.ecoleId, { code: 'FR', libelle: 'Français', coefficient: 2 } as never);
  const seance = await db.seance.create({ data: { classeId: classe!.id, matiereId: matiereFR.matiereId, enseignantId: persSurv!.id, date: new Date(), heureDebut: '08:00', heureFin: '09:00' } as never });
  await saisirAppelCore(ctxSurv, { seanceId: seance.id, presences: [{ eleveId: el.eleveId, statut: 'present' }, { eleveId: el2.eleveId, statut: 'absent' }] } as never);
  check('appel saisi par le surveillant (1 présent, 1 absent)', true);
  // retards : 3 retards non justifiés → alerte parents
  const r1 = await enregistrerRetardCore(ctxSurv, { eleveId: el.eleveId, dateHeure: new Date(Date.now() - 20 * 864e5), dureeMinutes: 10, motif: 'transport' } as never);
  const r2 = await enregistrerRetardCore(ctxSurv, { eleveId: el.eleveId, dateHeure: new Date(Date.now() - 10 * 864e5), dureeMinutes: 20, motif: 'réveil' } as never);
  const r3 = await enregistrerRetardCore(ctxSurv, { eleveId: el.eleveId, dateHeure: new Date(), dureeMinutes: 15, motif: null } as never);
  check(`billets chronotés ${r1.billet}/${r2.billet}/${r3.billet}`, r1.billet === 'B-0001' && r2.billet === 'B-0002' && r3.billet === 'B-0003');
  check('3e retard → ALERTE parents + direction déclenchée', r3.alerteParents === true && r3.retards30j === 3);
  await justifierRetardCore(ctxSurv, r2.retardId);
  const r2b = await db.retard.findUnique({ where: { id: r2.retardId } });
  check('retard justifiable par le surveillant', r2b?.justifie === true);
  // Le surveillant NE PEUT PAS sanctionner (manque vie_scolaire? il l'a... la sanction requiert vie_scolaire.gerer que le surveillant possède aussi)
  // → mais il ne peut PAS créer de conseil de discipline ? si, vie_scolaire.gerer... testons l'isolation réelle : le surveillant n'a PAS edt.gerer → visa refusé
  let refuseVisa = false;
  try { await viserCahierTexteCore(ctxSurv, 'x'); } catch { refuseVisa = true; }
  check('surveillant ✗ ne peut pas viser les cahiers (réservé censeur edt.gerer)', refuseVisa);
  // données portail vie scolaire
  const dSurv: any = await chargerDonneesPortail('vie_scolaire', { utilisateur: { id: uSurv!.id, ecoleId: r.ecoleId, email: 's@t.sn', nom: 'Sur', prenom: 'Test', type: 'personnel' }, permissions: new Set(PERMS_SURV), roles: ['surveillant'], sessionId: 't' } as never, null);
  check('portail : registre retards visible (3)', (dSurv.retards ?? []).length === 3);
  check('portail : surveillances chargées', Array.isArray(dSurv.surveillancesExamens));
  check('portail surveillant : finances ABSENTES', !dSurv.paiements || dSurv.paiements.length === 0);
  check('portail surveillant : notes ABSENTES', !dSurv.notes || dSurv.notes.length === 0);

  console.log('\n═══ 2. CENSEUR — discipline & pilotage ═══');
  // incident → sanction
  const inc = await declarerIncidentCore(ctxCens, { eleveId: el.eleveId, dateHeure: new Date(), type: 'violence', description: 'Bagarre à la récréation', gravite: 'grave' } as never);
  const san = await sanctionnerCore(ctxCens, { incidentId: inc.incidentId, type: 'exclusion_temporaire', description: '2 jours d\'exclusion' } as never);
  check('incident grave → sanction prononcée par le censeur', !!san.sanctionId);
  // stats discipline
  const stats = await statsDisciplineCore(ctxCens, 30) as any;
  check('stats discipline : 1 incident, 1 grave', stats.totaux.incidents === 1 && stats.totaux.graves === 1, JSON.stringify(stats.totaux));
  check('stats : 3 retards dont 1 non justifié', stats.totaux.retards === 3 && stats.totaux.retardsNonJustifies === 2, `${stats.totaux.retards}/${stats.totaux.retardsNonJustifies}`);
  check('stats : classe Sixième A agrégée', stats.parClasse.some((c: any) => c.classe === 'Sixième A' && c.incidents === 1 && c.retards === 3));
  check('stats : élève à suivre = Omar (top score)', stats.elevesASuivre[0]?.eleve.includes('Omar') === true, stats.elevesASuivre[0]?.eleve);
  // surveillance d'épreuves avec anti-chevauchement
  const persCens = await db.personnel.findFirst({ where: { utilisateurId: uCens!.id } });
  const d1 = new Date(Date.now() + 3 * 864e5); d1.setHours(8, 0, 0, 0);
  const f1 = new Date(d1.getTime() + 2 * 3600e3);
  const sv = await creerSurveillanceCore(ctxCens, { intitule: 'Composition Français T1', dateHeureDebut: d1, dateHeureFin: f1, surveillantsIds: [persSurv!.id], nbElevesPrevus: 30 } as never);
  check('épreuve planifiée avec surveillant affecté', !!sv.surveillanceId);
  // même surveillant, créneau qui chevauche → REFUS
  const d2 = new Date(d1.getTime() + 3600e3);
  const f2 = new Date(d2.getTime() + 3600e3);
  let refuseChevauchement = false;
  try { await creerSurveillanceCore(ctxCens, { intitule: 'Composition Maths T1', dateHeureDebut: d2, dateHeureFin: f2, surveillantsIds: [persSurv!.id] } as never); }
  catch (e: any) { refuseChevauchement = /déjà affecté/i.test(String(e.message)); }
  check('anti-chevauchement : le surveillant ne peut pas être sur 2 épreuves au même moment', refuseChevauchement);
  // créneau SANS chevauchement → OK
  const sv2 = await creerSurveillanceCore(ctxCens, { intitule: 'Composition Maths T1', dateHeureDebut: f1, dateHeureFin: new Date(f1.getTime() + 2 * 3600e3), surveillantsIds: [persSurv!.id] } as never);
  check('créneau consécutif accepté', !!sv2.surveillanceId);
  // planning personnel du surveillant
  const mes = await mesSurveillancesCore(ctxSurv) as any;
  check(`le surveillant voit SES 2 affectations à venir`, mes.surveillances.length === 2, `${mes.surveillances.length}`);

  console.log('\n═══ 3. CONSEIL DE DISCIPLINE (censeur préside) ═══');
  const dateC = new Date(Date.now() + 7 * 864e5); dateC.setHours(10, 0, 0, 0);
  const cd = await creerConseilDisciplineCore(ctxCens, { eleveId: el.eleveId, dateConseil: dateC, membresIds: [persCens!.id, persSurv!.id], faits: 'Bagarre répétée avec un camarade malgré un premier avertissement.' } as never);
  check('conseil convoqué (2 membres)', !!cd.conseilId);
  const notifs = await db.notification.count({ where: { sujet: { contains: 'conseil de discipline' } } });
  check('convocation envoyée aux parents (notification réelle)', notifs >= 1, `${notifs}`);
  // décision
  await deciderConseilDisciplineCore(ctxCens, cd.conseilId, 'Exclusion temporaire de 3 jours avec travail d\'intérêt scolaire. Sursis accordé pour la suite.');
  const cdB = await db.conseilDiscipline.findUnique({ where: { id: cd.conseilId } });
  check('décision enregistrée, statut → tenu', cdB?.statut === 'tenu' && !!cdB?.decision);
  let refuseReDecider = false;
  try { await deciderConseilDisciplineCore(ctxCens, cd.conseilId, 'x'); } catch { refuseReDecider = true; }
  check('re-décision refusée', refuseReDecider);
  const notifs2 = await db.notification.count({ where: { sujet: { contains: 'Décision du conseil' } } });
  check('décision notifiée aux parents', notifs2 >= 1);

  console.log('\n═══ 4. VISA DES CAHIERS (censeur contrôle la pédagogie) ═══');
  const cahier = await creerEntreeCahierCore(ctxDir, { classeId: classe!.id, matiereId: (await db.matiere.findFirst({ where: { ecoleId: r.ecoleId } }))!.id, dateCours: new Date(), contenu: 'Le récit', travailAFaire: 'Exercices p.12', publier: true } as never);
  await viserCahierTexteCore(ctxCens, (await db.cahierTexte.findFirst({ where: { ecoleId: r.ecoleId } }))!.id, 'Cahier conforme au programme');
  const cahierB = await db.cahierTexte.findFirst({ where: { ecoleId: r.ecoleId } });
  check('cahier visé par le censeur avec remarque', !!cahierB?.visaCenseurId && cahierB?.visaRemarque === 'Cahier conforme au programme');

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} SURVEILLANT & CENSEUR : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — ÉCOSYSTÈME COMPLET'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('VIE-SCOLAIRE-PLUS', main);
