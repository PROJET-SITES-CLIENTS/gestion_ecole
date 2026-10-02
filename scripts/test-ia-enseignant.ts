/**
 * TEST RÉEL — CONTRÔLE TOTAL DE L'IA SUR LE PARCOURS ENSEIGNANT
 * Session ENSEIGNANT (6 permissions réelles : eleves.lire, notes.saisir,
 * presences.saisir, vie_scolaire.gerer, edt.gerer, communication.envoyer).
 * Conversations chirurgicales contre l'API OpenRouter réelle :
 *   E1 « Quelles sont mes classes ? »                     → mes_classes
 *   E2 « Crée une interro... pour [ma classe] »           → creer_evaluation (MOI enseignant)
 *   E3 « Notes : Awa 15 ; Malick abs... »                 → saisir_notes (dans la classe de l'éval)
 *   E4 « J'ai fait 100% du chapitre X, reste : ... »      → ecrire_cahier_textes + avancement
 *   E5 Amalgame refusé : évaluation ambiguë               → candidats, RIEN d'écrit
 * Vérifie les ACTIONS réellement appelées ET l'état de la base.
 * Exécution : npx tsx scripts/test-ia-enseignant.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { dbTest as db } from './_helper-test';
import { invoquerAssistant } from '../src/lib/ia/agent';
import { Ctx } from '../src/lib/business';

const MARK = 'IAENS';

async function main() {
  const ecole = await db.ecole.findFirst();
  if (!ecole) throw new Error('Aucune école');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
  const niveau = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: ecole.id } } } });
  if (!annee || !niveau) throw new Error('Structure incomplète');

  // Un compte UTILISATEUR dédié enseignant + son profil personnel
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id } });
  if (!dir) throw new Error('Aucun utilisateur');
  await db.utilisateur.deleteMany({ where: { email: `${MARK}@test.local` } });
  const prof = await db.utilisateur.create({
    data: { email: `${MARK}@test.local`, motDePasseHash: 'x', nom: `${MARK}Ndiaye`, prenom: 'Jean', type: 'personnel', actif: true, ecoleId: ecole.id },
  });
  const pers = await db.personnel.create({ data: { ecoleId: ecole.id, utilisateurId: prof.id, nom: `${MARK}Ndiaye`, prenom: 'Jean', matricule: `${MARK}-P`, dateEmbauche: new Date(), statut: 'actif' } });

  // Nettoyage préalable des résidus
  await db.classe.updateMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } }, data: { salleId: null } });
  await db.classe.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });
  await db.matiere.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });
  await db.personnel.deleteMany({ where: { ecoleId: ecole.id, nom: { startsWith: MARK }, id: { not: pers.id } } });

  // Fixture : une classe, une matière, une affectation à MON nom, 2 élèves (1 F, 1 M)
  const classe = await db.classe.create({ data: { ecoleId: ecole.id, anneeScolaireId: annee.id, niveauId: niveau.id, code: `${MARK}C`, libelle: `${MARK} Sixième A`, capaciteMax: 30 } });
  const matiere = await db.matiere.create({ data: { ecoleId: ecole.id, code: `${MARK}M`, libelle: `${MARK} Maths`, coefficient: 2 } });
  await db.affectationEnseignant.create({ data: { ecoleId: ecole.id, personnelId: pers.id, matiereId: matiere.id, classeId: classe.id } });
  const ewa = await db.eleve.create({ data: { ecoleId: ecole.id, nom: `${MARK}Diop`, prenom: 'Awa', sexe: 'F', dateNaissance: new Date('2013-01-01'), dateInscription: new Date(), matricule: `${MARK}001`, classeActuelleId: classe.id } });
  const malick = await db.eleve.create({ data: { ecoleId: ecole.id, nom: `${MARK}Sow`, prenom: 'Malick', sexe: 'M', dateNaissance: new Date('2013-02-01'), dateInscription: new Date(), matricule: `${MARK}002`, classeActuelleId: classe.id } });
  // Programme + chapitre pour la clôture
  const prog = await db.programme.create({ data: { ecoleId: ecole.id, matiereId: matiere.id, niveauId: niveau.id, anneeScolaireId: annee.id, titre: `${MARK} Prog Maths` } });
  const chap = await db.chapitre.create({ data: { programmeId: prog.id, titre: `${MARK} Fractions`, ordre: 1 } });
  // Deuxième évaluation au nom similaire (test d'ambiguïté E5)
  const periode = await db.periode.findFirst({ where: { ecoleId: ecole.id, anneeScolaireId: annee.id } });

  // SESSION ENSEIGNANT — les 6 permissions réelles du rôle
  const ctx: Ctx = {
    utilisateurId: prof.id, ecoleId: ecole.id, type: 'personnel',
    permissions: new Set(['eleves.lire', 'notes.saisir', 'presences.saisir', 'vie_scolaire.gerer', 'edt.gerer', 'communication.envoyer']),
  };
  console.log(`École : ${ecole.nom} — session ENSEIGNANT (${ctx.permissions.size} permissions réelles)\n`);

  const stats: Array<{ n: string; ok: boolean; d: string }> = [];
  const check = (n: string, ok: boolean, d = '') => { stats.push({ n, ok, d }); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); };
  async function demander(message: string) {
    console.log(`\n👤 « ${message} »`);
    const r = await invoquerAssistant({ ctx, messages: [{ role: 'user', content: message }], portail: 'enseignant', nomUtilisateur: 'Jean' });
    console.log(`🤖 ${r.reponse.slice(0, 350)}`);
    console.log(`   outils : ${r.actions.map((a) => `${a.ok ? '✓' : '✗'}${a.outil}`).join(' · ') || '(aucun)'}`);
    return r;
  }

  // ═══ E1 — mes classes ═══
  {
    const r = await demander('Quelles sont mes classes ?');
    const aUtilise = r.actions.some((a) => a.outil === 'mes_classes' && a.ok);
    check('E1a l\'IA appelle mes_classes', aUtilise);
    check('E1b la réponse cite la classe du prof', r.reponse.includes('Sixième A') || r.reponse.includes(`${MARK}`));
  }

  // ═══ E2 — créer une évaluation (à MON nom) ═══
  {
    const r = await demander(`Crée une interrogation "${MARK} Interro fractions" en ${MARK} Maths pour la ${MARK} Sixième A, demain, sur 20, coefficient 1`);
    const evalCree = await db.evaluation.findFirst({ where: { ecoleId: ecole.id, intitule: `${MARK} Interro fractions` } });
    check('E2a évaluation créée', Boolean(evalCree));
    check('E2b enseignant = MOI (pas un autre)', evalCree?.enseignantId === pers.id);
    check('E2c bonne classe + matière', evalCree?.classeId === classe.id && evalCree?.matiereId === matiere.id);
  }

  // ═══ E5 (avant E3) — ambiguïté : deux évaluations au nom proche ═══
  {
    if (periode) {
      await db.evaluation.create({ data: { ecoleId: ecole.id, classeId: classe.id, matiereId: matiere.id, enseignantId: pers.id, periodeId: periode.id, intitule: `${MARK} Interro fractions BIS`, type: 'interrogation', date: new Date(), sur: 20, coefficient: 1 } });
    }
    const avant = await db.note.count({ where: { evaluation: { intitule: { contains: `${MARK} Interro` } } } });
    const r = await demander(`Note l'interro fractions : Awa Diop 15, Malick Sow 12`);
    const apres = await db.note.count({ where: { evaluation: { intitule: { contains: `${MARK} Interro` } } } });
    check('E5a AMALGAME REFUSÉ : aucune note écrite sur ambiguïté', apres === avant, `${avant}→${apres}`);
    check('E5b l\'IA demande de préciser (candidats)', /précise|laquelle|deux|BIS|ambigu/i.test(r.reponse));
  }

  // ═══ E3 — saisie des notes sur l'évaluation précise ═══
  {
    const r = await demander(`Note l'interro "${MARK} Interro fractions BIS" : Awa Diop 15 ; Malick Sow abs`);
    const nAwa = await db.note.findFirst({ where: { eleveId: ewa.id, evaluation: { intitule: `${MARK} Interro fractions BIS` } } });
    const nMalick = await db.note.findFirst({ where: { eleveId: malick.id, evaluation: { intitule: `${MARK} Interro fractions BIS` } } });
    check('E3a note d\'Awa = 15 (la bonne élève)', nAwa?.valeur === 15 && !nAwa?.absent);
    check('E3b Malick marqué ABSENT (exclu de la moyenne)', nMalick?.absent === true);
  }

  // ═══ E4 — clôture de séance avec chapitre, % et reste ═══
  {
    const r = await demander(`J'ai terminé le cours en ${MARK} Sixième A : j'ai enseigné les fractions simples, chapitre "${MARK} Fractions" terminé à 100%, il reste les exercices d'application à faire la prochaine fois. Travail à faire : réviser la leçon.`);
    const av = await db.avancementProgramme.findUnique({ where: { chapitreId_classeId: { chapitreId: chap.id, classeId: classe.id } } });
    const entree = await db.entreeCahierTexte.findFirst({ where: { chapitreId: chap.id }, orderBy: { dateCours: 'desc' } });
    check('E4a entrée de cahier créée et LIÉE au chapitre', entree?.chapitreId === chap.id);
    check('E4b avancement 100 % automatique', av?.pourcentage === 100);
    check('E4c le RESTE à rattraper est conservé', /exercice/i.test(av?.commentaire ?? ''), (av?.commentaire ?? '').slice(0, 80));
  }

  // ---- Nettoyage ----
  await db.note.deleteMany({ where: { evaluation: { intitule: { contains: `${MARK} Interro` } } } });
  await db.evaluation.deleteMany({ where: { intitule: { contains: `${MARK} Interro` } } });
  await db.entreeCahierTexte.deleteMany({ where: { chapitreId: chap.id } });
  await db.cahierTexte.deleteMany({ where: { ecoleId: ecole.id, classeId: classe.id } });
  await db.avancementProgramme.deleteMany({ where: { chapitreId: chap.id } });
  await db.chapitre.deleteMany({ where: { programmeId: prog.id } });
  await db.programme.delete({ where: { id: prog.id } });
  await db.affectationEnseignant.deleteMany({ where: { personnelId: pers.id } });
  await db.eleve.deleteMany({ where: { id: { in: [ewa.id, malick.id] } } });
  await db.classe.delete({ where: { id: classe.id } });
  await db.matiere.delete({ where: { id: matiere.id } });
  await db.personnel.delete({ where: { id: pers.id } });
  await db.utilisateur.delete({ where: { id: prof.id } });

  const echecs = stats.filter((s) => !s.ok).length;
  console.log(`\n===== ${stats.length - echecs}/${stats.length} PASS =====`);
  if (echecs > 0) process.exitCode = 1;
}

main().catch((e) => { console.error('ERREUR :', e); process.exitCode = 1; }).finally(() => db.$disconnect());
