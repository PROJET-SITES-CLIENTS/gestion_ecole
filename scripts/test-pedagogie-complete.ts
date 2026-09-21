// ════════════════════════════════════════════════════════════════════
// GESTION PÉDAGOGIQUE — LA CHAÎNE COMPLÈTE décrite par la direction
// 0. Système SEMESTRIEL configurable (S1/S2) — puis retour trimestres
// 1. Prof crée évaluations (devoir, interro, composition) → saisit les notes
// 2. Moyennes AUTOMATIQUES exactes (par matière + générale, pondérées)
// 3. Génération EN MASSE des bulletins (classe entière, 1 appel)
// 4. Rangs + mentions + appréciations
// 5. Synthèse ANNUELLE : cumul des périodes + rang annuel
// 6. Primaire (compétences) vs secondaire (chiffres)
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, creerMatiereCore,
  creerEvaluationCore, saisirNotesCore, genererBulletinsClasseCore, syntheseAnnuelleCore,
  configurerSystemePeriodesCore, saisirAppreciationsMatiereCore, changerStatutBulletinCore,
} from '../src/lib/business';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS_DIR = ['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir'];
const PERMS_PROF = ['eleves.lire', 'notes.saisir', 'presences.saisir', 'vie_scolaire.gerer', 'edt.gerer'];
const F = 100;

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 0. MISE EN PLACE ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'peda-complete-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Peda Complete ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `pd-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  const prof = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Prof', prenom: 'Peda', email: `pp-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 250000, creerCompte: true, motDePasseInitial: 'Prof12345!', roleCode: 'enseignant' } as never);
  const uProf = await db.utilisateur.findFirst({ where: { email: `pp-${S}@test.sn` } });
  const ctxProf = { utilisateurId: uProf!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_PROF) } as never;
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  // 3 élèves
  const e1 = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Un', prenom: 'Eleve', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'D', sexe: 'F', classeId: classe!.id } as never);
  const e2 = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Deux', prenom: 'Eleve', dateNaissance: new Date('2013-02-02'), lieuNaissance: 'D', sexe: 'M', classeId: classe!.id } as never);
  const e3 = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Trois', prenom: 'Eleve', dateNaissance: new Date('2013-03-03'), lieuNaissance: 'D', sexe: 'F', classeId: classe!.id } as never);
  check('école + prof + 3 élèves', !!r.ecoleId && !!prof.personnelId && !!e1.eleveId && !!e2.eleveId && !!e3.eleveId);

  console.log('\n═══ 1. SYSTÈME SEMESTRIEL configurable ═══');
  // École sans notes : passage en semestres possible
  const sem = await configurerSystemePeriodesCore(ctxDir, 'semestres');
  const periodes = await db.periode.findMany({ where: { ecoleId: r.ecoleId }, orderBy: { dateDebut: 'asc' } });
  check('2 SEMESTRES créés (S1, S2)', periodes.length === 2 && periodes.every((x: any) => x.code.startsWith('S')), periodes.map((x: any) => x.code).join(','));
  // retour trimestres
  await configurerSystemePeriodesCore(ctxDir, 'trimestres');
  const trims = await db.periode.findMany({ where: { ecoleId: r.ecoleId }, orderBy: { dateDebut: 'asc' } });
  check('retour 3 TRIMESTRES possible', trims.length === 3 && trims[0].code === 'T1');
  const T1 = trims[0], T2 = trims[1];
  // après notes : reconfiguration refusée
  const fr = await creerMatiereCore(ctxDir, r.ecoleId, { code: 'FR', libelle: 'Français', coefficient: 2 } as never);
  const persProf = await db.personnel.findFirst({ where: { utilisateurId: uProf!.id } });
  const ev = await creerEvaluationCore(ctxProf, r.ecoleId, { classeId: classe!.id, matiereId: fr.matiereId, enseignantId: persProf!.id, periodeId: T1.id, type: 'devoir', intitule: 'Devoir 1', date: new Date(), sur: 20, coefficient: 1 } as never);
  let refuse = false;
  try { await configurerSystemePeriodesCore(ctxDir, 'semestres'); } catch (e: any) { refuse = /Impossible/i.test(String(e.message)); }
  check('reconfiguration REFUSÉE après saisie de notes (garde-fou)', refuse);

  console.log('\n═══ 2. SAISIE DES NOTES (interface du prof → cores) ═══');
  await saisirNotesCore(ctxProf, { evaluationId: ev.evaluationId, notes: [
    { eleveId: e1.eleveId, valeur: 16 }, { eleveId: e2.eleveId, valeur: 12 }, { eleveId: e3.eleveId, valeur: 8 },
  ] } as never);
  check('3 notes saisies', (await db.note.count({ where: { evaluationId: ev.evaluationId } })) === 3);

  console.log('\n═══ 3. GÉNÉRATION EN MASSE (classe entière, 1 appel) ═══');
  const masse = await genererBulletinsClasseCore(ctxProf, classe!.id, T1.id);
  check(`3 bulletins générés d'un coup (${masse.generes}/${masse.total})`, masse.generes === 3 && masse.total === 3, `${masse.generes}/${masse.total}`);
  const bulletins = await db.bulletin.findMany({ where: { classeId: classe!.id, periodeId: T1.id } });
  check('chaque élève a SON bulletin', bulletins.length === 3);
  const parEleve = (id: string) => bulletins.find((b: any) => b.eleveId === id)!;
  check('moyennes exactes : 16 / 12 / 8', parEleve(e1.eleveId).moyenneGenerale === 16 && parEleve(e2.eleveId).moyenneGenerale === 12 && parEleve(e3.eleveId).moyenneGenerale === 8,
    `${parEleve(e1.eleveId).moyenneGenerale}/${parEleve(e2.eleveId).moyenneGenerale}/${parEleve(e3.eleveId).moyenneGenerale}`);
  check('RANGS : 1er, 2e, 3e', parEleve(e1.eleveId).rang === 1 && parEleve(e2.eleveId).rang === 2 && parEleve(e3.eleveId).rang === 3);
  check('APPRÉCIATIONS générales présentes', bulletins.every((b: any) => (b.appreciationGenerale ?? '').length > 0));

  // Appréciations PAR MATIÈRE (prof)
  const b1 = parEleve(e1.eleveId);
  const app = await saisirAppreciationsMatiereCore(ctxProf, b1.id, [{ matiereId: fr.matiereId, appreciation: 'Très bonne participation, continuez ainsi.' }] as never);
  const b1maj = await db.bulletin.findUnique({ where: { id: b1.id }, include: { bulletinAppreciations: true } });
  check('appréciation PAR MATIÈRE enregistrée (visible sur le bulletin)', (b1maj?.bulletinAppreciations ?? []).some((a: any) => a.matiereId === fr.matiereId));

  console.log('\n═══ 4. T2 + SYNTHÈSE ANNUELLE ═══');
  const ev2 = await creerEvaluationCore(ctxProf, r.ecoleId, { classeId: classe!.id, matiereId: fr.matiereId, enseignantId: persProf!.id, periodeId: T2.id, type: 'composition', intitule: 'Compo T2', date: new Date(), sur: 20, coefficient: 1 } as never);
  await saisirNotesCore(ctxProf, { evaluationId: ev2.evaluationId, notes: [
    { eleveId: e1.eleveId, valeur: 18 }, { eleveId: e2.eleveId, valeur: 10 }, { eleveId: e3.eleveId, valeur: 6 },
  ] } as never);
  await genererBulletinsClasseCore(ctxProf, classe!.id, T2.id);
  const synth1 = await syntheseAnnuelleCore(ctxProf, e1.eleveId) as any;
  const synth2 = await syntheseAnnuelleCore(ctxProf, e2.eleveId) as any;
  check('synthèse : 2 périodes agrégées', synth1.periodes.length === 2, `${synth1.periodes.length}`);
  check('moyenne ANNUELLE e1 = (16+18)/2 = 17', synth1.moyenneAnnuelle === 17, `${synth1.moyenneAnnuelle}`);
  check('moyenne ANNUELLE e2 = (12+10)/2 = 11', synth2.moyenneAnnuelle === 11, `${synth2.moyenneAnnuelle}`);
  check('RANG ANNUEL : e1 = 1er', synth1.rangAnnuel === 1, `${synth1.rangAnnuel}`);
  check('MENTION annuelle e1 = Très bien', synth1.mentionAnnuelle === 'Très bien', synth1.mentionAnnuelle);

  console.log('\n═══ 5. PRIMAIRE : compétences (vs secondaire chiffres) ═══');
  const cyclePrim = await db.cycle.findFirst({ where: { ecoleId: r.ecoleId, code: 'PRIM' } });
  const classeCP = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: 'CP-A' } });
  const { majModeEvaluationCycleCore } = await import('../src/lib/business');
  await majModeEvaluationCycleCore(ctxDir, cyclePrim!.id, 'competences');
  const ep = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Primaire', prenom: 'Eleve', dateNaissance: new Date('2018-01-01'), lieuNaissance: 'D', sexe: 'M', classeId: classeCP!.id } as never);
  const { genererBulletinCore } = await import('../src/lib/business');
  const bp = await genererBulletinCore(ctxProf, { eleveId: ep.eleveId, periodeId: T1.id, classeId: classeCP!.id } as never);
  const bpDb = await db.bulletin.findUnique({ where: { id: bp.bulletinId } });
  check('primaire : bulletin SANS note chiffrée (compétences)', bp.moyenneGenerale === null && bpDb?.moyenneGenerale === null);
  await majModeEvaluationCycleCore(ctxDir, cyclePrim!.id, 'chiffre'); // reset

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} PÉDAGOGIE COMPLÈTE : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — CHAÎNE ENTIÈRE VALIDÉE'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('PEDA-COMPLETE', main);
