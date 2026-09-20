// ════════════════════════════════════════════════════════════════════
// ÉCOSYSTÈME ENSEIGNANT — simulation complète
// 1. Effectifs de classe (total, garçons, filles) côté prof
// 2. Suivi du programme (chapitres, % avancement — "suis-je à jour ?")
// 3. Cahier de textes + séance (contenu prévu/réalisé)
// 4. Planification : interrogation passée, devoir à rendre, composition à venir
// 5. Rendre les notes : copies corrigées HORS plateforme → saisie dans la plateforme
// 6. Moyennes AUTOMATIQUES : pondération coef évaluation × coef matière,
//    barème ramené sur 20, absent exclu — vérification EXACTE du calcul
// 7. Règles par cycle (plancher) + mode compétences vs notes chiffrées
// 8. Profil pédagogique de l'élève (forces/faiblesses) + incident
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, creerMatiereCore,
  creerProgrammeCore, ajouterChapitreCore, mettreAJourAvancementCore,
  creerEntreeCahierCore, creerDevoirCore, creerEvaluationCore, saisirNotesCore,
  genererBulletinCore, declarerIncidentCore, saisirAppelCore,
  majRegleCalculCore, majModeEvaluationCycleCore,
} from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS_PROF = ['eleves.lire', 'notes.saisir', 'presences.saisir', 'vie_scolaire.gerer', 'edt.gerer'];
const PERMS_DIR = ['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir'];

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 0. MISE EN PLACE ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'ecosysteme-enseignant-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({
    nomEcole: `Ecosysteme Enseignant ${S}`, adminNom: 'Dir', adminPrenom: 'Test',
    adminEmail: `eco-dir-${S}@test.sn`, adminMotDePasse: 'Directeur123!',
  } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  check('école + règles de calcul par défaut (4 cycles)', (await db.regleCalculMoyenne.count({ where: { ecoleId: r.ecoleId } })) === 4);

  const prof = await creerPersonnelCore(ctxDir, r.ecoleId, {
    nom: 'Gueye', prenom: 'Ibrahima', email: `prof-${S}@test.sn`, dateEmbauche: new Date(),
    typeContrat: 'CDI', salaireBrut: 250000, creerCompte: true, motDePasseInitial: 'Prof12345!', roleCode: 'enseignant',
  } as never);
  const persProf = await db.personnel.findFirst({ where: { utilisateurId: (await db.utilisateur.findFirst({ where: { email: `prof-${S}@test.sn` } }))!.id } });
  const ctxProf = { utilisateurId: persProf!.utilisateurId!, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_PROF) } as never;
  const sessProf = { utilisateur: { id: persProf!.utilisateurId!, ecoleId: r.ecoleId, email: 'p@t.sn', nom: 'Gueye', prenom: 'Ibrahima', type: 'personnel' }, permissions: new Set(PERMS_PROF), roles: ['enseignant'], sessionId: 't' } as never;
  check('compte enseignant créé', !!prof.personnelId);

  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  const periode = await db.periode.findFirst({ where: { ecoleId: r.ecoleId } });
  // 2 élèves : 1 fille, 1 garçon
  const e1 = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Sarr', prenom: 'Aïssatou', dateNaissance: new Date('2013-04-12'), lieuNaissance: 'Dakar', sexe: 'F', classeId: classe!.id } as never);
  const e2 = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Bèye', prenom: 'Omar', dateNaissance: new Date('2013-09-02'), lieuNaissance: 'Rufisque', sexe: 'M', classeId: classe!.id } as never);

  console.log('\n═══ 1. EFFECTIFS (le prof connaît sa classe) ═══');
  const d1: any = await chargerDonneesPortail('enseignant', sessProf, null);
  const maClasse = (d1.eleves ?? []).filter((x: any) => x.classeActuelleId === classe!.id);
  check('effectif total = 2', maClasse.length === 2, `${maClasse.length}`);
  check('1 garçon / 1 fille', maClasse.filter((x: any) => x.sexe === 'M').length === 1 && maClasse.filter((x: any) => x.sexe === 'F').length === 1);

  console.log('\n═══ 2. PROGRAMME : suis-je à jour ? ═══');
  const fr = await creerMatiereCore(ctxDir, r.ecoleId, { code: 'FR', libelle: 'Français', coefficient: 2 } as never);
  const maths = await creerMatiereCore(ctxDir, r.ecoleId, { code: 'MATHS', libelle: 'Mathématiques', coefficient: 3 } as never);
  const prog = await creerProgrammeCore(ctxDir, r.ecoleId, { matiereId: fr.matiereId, niveauId: classe!.niveauId!, intitule: 'Français 6ème', description: 'Programme annuel' } as never);
  const ch1 = await ajouterChapitreCore(ctxProf, prog.programmeId, { intitule: 'Ch.1 — Le récit', ordre: 1 } as never);
  const ch2 = await ajouterChapitreCore(ctxProf, prog.programmeId, { intitule: 'Ch.2 — La description', ordre: 2 } as never);
  const ch3 = await ajouterChapitreCore(ctxProf, prog.programmeId, { intitule: 'Ch.3 — Le dialogue', ordre: 3 } as never);
  await mettreAJourAvancementCore(ctxProf, ch1.chapitreId, { classeId: classe!.id, pourcentage: 100 });
  await mettreAJourAvancementCore(ctxProf, ch2.chapitreId, { classeId: classe!.id, pourcentage: 100 });
  await mettreAJourAvancementCore(ctxProf, ch3.chapitreId, { classeId: classe!.id, pourcentage: 50 });
  const d2: any = await chargerDonneesPortail('enseignant', sessProf, null);
  const av = d2.avancements ?? [];
  check('3 chapitres suivis', av.length === 3, `${av.length}`);
  const pctGlobal = av.reduce((s: number, a: any) => s + a.pourcentage, 0) / Math.max(av.length, 1);
  check(`avancement global = ${pctGlobal}% (2 chap. terminés, 1 en cours)`, pctGlobal === 83.33333333333333 || Math.round(pctGlobal) === 83, `${pctGlobal}`);

  console.log('\n═══ 3. CAHIER DE TEXTES + SÉANCE ═══');
  const cahier = await creerEntreeCahierCore(ctxProf, {
    classeId: classe!.id, matiereId: fr.matiereId, dateCours: new Date(),
    contenu: 'Le récit : structure, temps verbaux', travailAFaire: 'Exercices 1-4 p.23', publier: true,
  } as never);
  const entree = await db.entreeCahierTexte.findUnique({ where: { id: cahier.entreeId } });
  check('entrée de cahier PUBLIÉE aux familles', entree?.statut === 'publie');
  const seance = await db.seance.create({ data: { classeId: classe!.id, matiereId: fr.matiereId, enseignantId: persProf!.id, date: new Date(), heureDebut: '08:00', heureFin: '09:00', contenuPrevu: 'Ch.3 Le dialogue', contenuRealise: 'Ch.3 moitié' } as never });
  check('séance avec contenu prévu/réalisé (dispensation suivie)', !!seance.id);

  console.log('\n═══ 4. PLANIFICATION DES ÉVALUATIONS ═══');
  const interro = await creerEvaluationCore(ctxProf, r.ecoleId, { classeId: classe!.id, matiereId: fr.matiereId, enseignantId: persProf!.id, periodeId: periode!.id, type: 'interrogation', intitule: 'Interro Ch.1', date: new Date(Date.now() - 864e5), sur: 20, coefficient: 1 } as never);
  const devoirSur20 = await creerEvaluationCore(ctxProf, r.ecoleId, { classeId: classe!.id, matiereId: fr.matiereId, enseignantId: persProf!.id, periodeId: periode!.id, type: 'devoir', intitule: 'Devoir Ch.2', date: new Date(Date.now() - 2 * 864e5), sur: 20, coefficient: 2 } as never);
  const compoMaths = await creerEvaluationCore(ctxProf, r.ecoleId, { classeId: classe!.id, matiereId: maths.matiereId, enseignantId: persProf!.id, periodeId: periode!.id, type: 'composition', intitule: 'Compo Maths (sur 40)', date: new Date(Date.now() - 3 * 864e5), sur: 40, coefficient: 1 } as never);
  const evFuture = await creerEvaluationCore(ctxProf, r.ecoleId, { classeId: classe!.id, matiereId: fr.matiereId, enseignantId: persProf!.id, periodeId: periode!.id, type: 'devoir', intitule: 'Interro prévue Ch.3', date: new Date(Date.now() + 10 * 864e5), sur: 20, coefficient: 1 } as never);
  check('4 évaluations créées : passées + une PLANIFIÉE à venir (+10 j)', [interro, devoirSur20, compoMaths, evFuture].every((x: any) => !!x.evaluationId));
  const dm = await creerDevoirCore(ctxProf, { classeId: classe!.id, matiereId: fr.matiereId, intitule: 'Rédaction Ch.3', dateRendu: new Date(Date.now() + 7 * 864e5), sur: 20 } as never);
  check('devoir à la maison assigné (rendu +7 j)', !!dm.devoirId);

  console.log('\n═══ 5. COPIES CORRIGÉES → SAISIE DES NOTES ═══');
  await saisirNotesCore(ctxProf, { evaluationId: interro.evaluationId, notes: [{ eleveId: e1.eleveId, valeur: 16 }, { eleveId: e2.eleveId, valeur: 11.5 }] } as never);
  await saisirNotesCore(ctxProf, { evaluationId: devoirSur20.evaluationId, notes: [{ eleveId: e1.eleveId, valeur: 18 }, { eleveId: e2.eleveId, valeur: 9 }] } as never);
  await saisirNotesCore(ctxProf, { evaluationId: compoMaths.evaluationId, notes: [{ eleveId: e1.eleveId, valeur: 32 }, { eleveId: e2.eleveId, absent: true }] } as never); // Omar ABSENT à la compo
  const nbNotes = await db.note.count({ where: { evaluationId: { in: [interro.evaluationId, devoirSur20.evaluationId, compoMaths.evaluationId] } } });
  check('6 saisies enregistrées (dont 1 marqueur absent)', nbNotes === 6, `${nbNotes}`);

  console.log('\n═══ 6. MOYENNES AUTOMATIQUES — vérification EXACTE ═══');
  // Attendus (calcul manuel) :
  // Aïssatou : FR = (16×1 + 18×2)/3 = 17.3333 ; MATHS = 32/40×20 = 16
  //   générale = (17.3333×2 + 16×3)/5 = 16.5333
  // Omar : FR = (11.5×1 + 9×2)/3 = 9.8333 ; MATHS = absent → exclu
  //   générale = 9.8333 (une seule matière)
  const b1 = await genererBulletinCore(ctxProf, { eleveId: e1.eleveId, periodeId: periode!.id, classeId: classe!.id } as never);
  const b2 = await genererBulletinCore(ctxProf, { eleveId: e2.eleveId, periodeId: periode!.id, classeId: classe!.id } as never);
  check('bulletins générés', !!b1.bulletinId && !!b2.bulletinId);
  check(`Aïssatou — moyenne générale 16.53 (obtenu ${b1.moyenneGenerale})`, Math.abs((b1.moyenneGenerale ?? 0) - 16.53) < 0.005);
  check(`Omar — moyenne générale 9.83 (absent compo exclu) (obtenu ${b2.moyenneGenerale})`, Math.abs((b2.moyenneGenerale ?? 0) - 9.83) < 0.005);
  const bull1 = await db.bulletin.findUnique({ where: { id: b1.bulletinId } });
  const moyennes1: any[] = JSON.parse(bull1!.moyennes as string);
  const frMoy = moyennes1.find((m) => m.matiere === 'Français');
  const mathMoy = moyennes1.find((m) => m.matiere === 'Mathématiques');
  check(`Aïssatou — moyenne FR 17.33 (pondérée coef éval 1+2)`, Math.abs(frMoy.moyenne - 17.33) < 0.005, `${frMoy.moyenne}`);
  check(`Aïssatou — moyenne MATHS 16.00 (32/40 ramené sur 20)`, Math.abs(mathMoy.moyenne - 16) < 0.005, `${mathMoy.moyenne}`);
  check('mentions : Aïssatou « Très bien » (16.53)', b1.mention === 'Très bien', b1.mention);
  check('mentions : Omar « Insuffisant » (9.83 < 10)', b2.mention === 'Insuffisant', b2.mention);
  check('RANGS classe : Aïssatou 1er, Omar 2e', b1.rang === 1 && b2.rang === 2, `${b1.rang}/${b2.rang}`);

  console.log('\n═══ 7. RÈGLES DE CALCUL (par cycle — primaire ≠ secondaire) ═══');
  // Le prof NE PEUT PAS configurer (réservé direction)
  let refuseProprement = false;
  try { await majRegleCalculCore(ctxProf, 'x', { arrondi: 0 }); } catch { refuseProprement = true; }
  check('prof ✗ ne peut PAS modifier les règles (réservé direction)', refuseProprement);
  // La direction fixe un plancher à 12 sur le cycle Collège
  const cycleColl = await db.cycle.findFirst({ where: { ecoleId: r.ecoleId, code: 'COLL' } });
  await majRegleCalculCore(ctxDir, cycleColl!.id, { notePlancher: 12 } as never);
  const b2bis = await genererBulletinCore(ctxProf, { eleveId: e2.eleveId, periodeId: periode!.id, classeId: classe!.id } as never);
  const bull2bis = await db.bulletin.findUnique({ where: { id: b2bis.bulletinId } });
  const moyennes2: any[] = JSON.parse(bull2bis!.moyennes as string);
  const frMoy2 = moyennes2.find((m) => m.matiere === 'Français');
  check(`plancher 12 appliqué : moyenne FR d'Omar 9.83 → 12`, Math.abs(frMoy2.moyenne - 12) < 0.005, `${frMoy2.moyenne}`);
  await majRegleCalculCore(ctxDir, cycleColl!.id, { notePlancher: null } as never); // reset
  // Mode compétences (primaire/maternelle) : bulletin sans note chiffrée
  await majModeEvaluationCycleCore(ctxDir, cycleColl!.id, 'competences');
  const b3 = await genererBulletinCore(ctxProf, { eleveId: e1.eleveId, periodeId: periode!.id, classeId: classe!.id } as never);
  check('mode compétences : moyenne chiffrée ABSENTE (bulletin compétences)', b3.moyenneGenerale === null);
  await majModeEvaluationCycleCore(ctxDir, cycleColl!.id, 'chiffre'); // reset

  console.log('\n═══ 8. PROFIL PÉDAGOGIQUE DE L ÉLÈVE + INCIDENT ═══');
  // Appel avec une absence (assiduité)
  await saisirAppelCore(ctxProf, { seanceId: seance.id, presences: [{ eleveId: e1.eleveId, statut: 'present' }, { eleveId: e2.eleveId, statut: 'absent' }] } as never);
  await declarerIncidentCore(ctxProf, { eleveId: e2.eleveId, dateHeure: new Date(), type: 'comportement', description: 'Bavardages répétés en cours', gravite: 'leger' } as never);
  const d3: any = await chargerDonneesPortail('enseignant', sessProf, null);
  const notesE1 = (d3.notes ?? []).filter((n: any) => n.eleveId === e1.eleveId && n.valeur != null);
  check('prof voit les 3 notes notées d Aïssatou (profil pédagogique)', notesE1.length === 3, `${notesE1.length}`);
  const presE2 = (d3.presences ?? []).filter((x: any) => x.eleveId === e2.eleveId && x.statut === 'absent');
  check('prof voit l absence d Omar (assiduité)', presE2.length >= 1);
  check('prof voit l incident déclaré', (d3.incidents ?? []).some((i: any) => i.eleveId === e2.eleveId));
  check('prof voit le cahier de textes publié', (d3.cahiersTexte ?? []).length >= 1);
  check('prof voit ses devoirs assignés', (d3.devoirs ?? []).some((x: any) => x.id === dm.devoirId));
  check('prof voit ses évaluations avec compteur de notes', (d3.evaluations ?? []).some((x: any) => x.id === interro.evaluationId && x._count?.notes === 2));

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école de simulation supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} ÉCOSYSTÈME ENSEIGNANT : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — COMPLET'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('ECOSYSTEME-ENSEIGNANT', main);
