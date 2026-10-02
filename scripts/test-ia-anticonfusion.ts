/**
 * TEST RÉEL DE L'AGENT IA — conversations pièges (anti-confusion)
 * Simule des demandes ambiguës réelles et vérifie À LA FOIS :
 *   - les outils réellement appelés (traçabilité des actions) ;
 *   - l'état de la base (rien de plus que demandé).
 * Scénarios :
 *   P1 « Ajoute les matières Dessin et Musique »       → EXACTEMENT 2 au référentiel, 0 affectation
 *   P2 « Ajoute la matière Histoire-Géo en 6ème A »    → matière créée, 0 affectation (proposition seulement)
 *   P3 « Supprime la matière Musique » (avec affect.)  → blocage expliqué + marche à suivre
 *   P3b « …en retirant ses affectations »              → suppression réussie
 *   P4 « Supprime Dessin » (Dessin + Dessin Technique)  → candidats demandés, RIEN supprimé
 * Exécution : npx tsx scripts/test-ia-anticonfusion.ts  (utilise l'API OpenRouter réelle)
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { dbTest as db } from './_helper-test';
import { invoquerAssistant } from '../src/lib/ia/agent';
import { Ctx } from '../src/lib/business';

const MARK = 'IACF';

async function main() {
  const ecole = await db.ecole.findFirst();
  if (!ecole) throw new Error('Aucune école');
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id } });
  if (!dir) throw new Error('Aucun utilisateur');
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = {
    utilisateurId: dir.id, ecoleId: ecole.id, type: 'personnel',
    permissions: new Set(perms.map((p) => p.code)),
  };
  console.log(`École : ${ecole.nom} — ${ctx.permissions.size} permissions\n`);

  // ---- Préparation : une classe, un personnel, matières de test ----
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
  const niveau = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: ecole.id } } } });
  if (!annee || !niveau) throw new Error('Structure incomplète');
  await db.matiere.deleteMany({ where: { ecoleId: ecole.id, libelle: { in: [`${MARK} Dessin`, `${MARK} Musique`, `${MARK} Histoire-Géo`, `${MARK} Dessin Technique`] } } });
  const classe = (await db.classe.findFirst({ where: { ecoleId: ecole.id, anneeScolaireId: annee.id } }))
    ?? await db.classe.create({ data: { ecoleId: ecole.id, anneeScolaireId: annee.id, niveauId: niveau.id, code: `${MARK}C`, libelle: `${MARK} Classe`, capaciteMax: 30 } });
  const prof = (await db.personnel.findFirst({ where: { ecoleId: ecole.id, deletedAt: null } }))
    ?? await db.personnel.create({ data: { ecoleId: ecole.id, nom: `${MARK}Prof`, prenom: 'Test', matricule: `${MARK}-P`, dateEmbauche: new Date(), statut: 'actif' } });

  const stats: Array<{ nom: string; pass: boolean; detail: string }> = [];
  function check(nom: string, pass: boolean, detail = '') {
    stats.push({ nom, pass, detail });
    console.log(`${pass ? '✓' : '✗'} ${nom}${detail ? ` — ${detail}` : ''}`);
  }
  async function demander(message: string) {
    console.log(`\n👤 « ${message} »`);
    const r = await invoquerAssistant({ ctx, messages: [{ role: 'user', content: message }], portail: 'direction' });
    console.log(`🤖 ${r.reponse.slice(0, 400)}`);
    console.log(`   outils : ${r.actions.map((a) => `${a.ok ? '✓' : '✗'}${a.outil}(${a.resume.slice(0, 60)})`).join(' · ') || '(aucun)'}`);
    return r;
  }
  const compte = async () => ({
    matieres: await db.matiere.count({ where: { ecoleId: ecole.id, libelle: { startsWith: MARK } } }),
    affectations: await db.affectationEnseignant.count({ where: { ecoleId: ecole.id, matiere: { libelle: { startsWith: MARK } } } }),
    programmes: await db.programme.count({ where: { ecoleId: ecole.id, matiere: { libelle: { startsWith: MARK } } } }),
  });

  // ═══ P1 — quantité exacte, référentiel uniquement ═══
  {
    const avant = await compte();
    const r = await demander(`Ajoute les matières ${MARK} Dessin et ${MARK} Musique`);
    const apres = await compte();
    const cree = apres.matieres - avant.matieres;
    check('P1a exactement 2 matières créées', cree === 2, `${cree} créée(s)`);
    check('P1b AUCUNE affectation créée', apres.affectations - avant.affectations === 0, `${apres.affectations - avant.affectations} affectation(s)`);
    check('P1c AUCUN programme créé', apres.programmes - avant.programmes === 0, `${apres.programmes - avant.programmes} programme(s)`);
    check('P1d l\'IA cite bien les matières créées', /dessin/i.test(r.reponse) && /musique/i.test(r.reponse));
  }

  // ═══ P2 — le piège « en 6ème A » : matière seule, affectation PROPOSÉE ═══
  {
    const avant = await compte();
    const r = await demander(`Ajoute la matière ${MARK} Histoire-Géo en 6ème A`);
    const apres = await compte();
    check('P2a matière créée au référentiel', apres.matieres - avant.matieres === 1, `${apres.matieres - avant.matieres} créée(s)`);
    check('P2b AUCUNE affectation automatique', apres.affectations - avant.affectations === 0, `${apres.affectations - avant.affectations} affectation(s)`);
    check('P2c l\'IA propose la suite (affectation) plutôt que l\'exécuter', /affect|enseignant|voulez/i.test(r.reponse));
  }

  // ═══ P3 — suppression bloquée → explication + marche à suivre ═══
  {
    const mus = await db.matiere.findFirst({ where: { ecoleId: ecole.id, libelle: `${MARK} Musique` } });
    if (mus) {
      await db.affectationEnseignant.create({ data: { ecoleId: ecole.id, personnelId: prof.id, matiereId: mus.id, classeId: classe.id } });
      const r1 = await demander(`Supprime la matière ${MARK} Musique`);
      const existe = await db.matiere.findFirst({ where: { ecoleId: ecole.id, libelle: `${MARK} Musique` } });
      check('P3a matière NON supprimée au 1er essai (protection)', Boolean(existe));
      check('P3b l\'IA explique le blocage (affectation citée)', /affect|enseign|classe/i.test(r1.reponse));
      // P3b2 — relance avec la marche à suivre
      const r2 = await demander(`Oui, supprime la matière ${MARK} Musique en retirant ses affectations`);
      const existe2 = await db.matiere.findFirst({ where: { ecoleId: ecole.id, libelle: `${MARK} Musique` } });
      const affRest = await db.affectationEnseignant.count({ where: { matiereId: mus.id } });
      check('P3c suppression réussie avec desaffecter', !existe2 && affRest === 0, affRest === 0 ? 'matière + affectations retirées' : `affectations restantes : ${affRest}`);
      check('P3d confirmation claire de l\'IA', /supprim|retir/i.test(r2.reponse));
    } else {
      check('P3 prérequis (matière Musique présente)', false, 'matière absente — P1 a-t-il échoué ?');
    }
  }

  // ═══ P4 — ambiguïté : candidats, jamais de choix au hasard ═══
  {
    await db.matiere.create({ data: { ecoleId: ecole.id, code: `${MARK}DT`, libelle: `${MARK} Dessin Technique`, coefficient: 1 } });
    // On demande le TERME PARTIEL « Dessin » (pas le libellé exact) :
    // c'est le cas réel d'ambiguïté où l'outil doit lister les candidats.
    const r = await demander(`Supprime la matière Dessin (préfixe ${MARK})`);
    const les2 = await db.matiere.findMany({ where: { ecoleId: ecole.id, libelle: { in: [`${MARK} Dessin`, `${MARK} Dessin Technique`] } } });
    check('P4a ambiguïté détectée : les 2 matières existent toujours', les2.length === 2, `${les2.length}/2`);
    check('P4b l\'IA demande de préciser (candidats listés)', /technique|précis|laquelle|désign/i.test(r.reponse));
  }

  // ---- Nettoyage ----
  const matieresTest = await db.matiere.findMany({ where: { ecoleId: ecole.id, libelle: { startsWith: MARK } }, select: { id: true } });
  if (matieresTest.length > 0) {
    await db.affectationEnseignant.deleteMany({ where: { matiereId: { in: matieresTest.map((m) => m.id) } } });
    await db.matiere.deleteMany({ where: { id: { in: matieresTest.map((m) => m.id) } } });
  }
  await db.classe.deleteMany({ where: { ecoleId: ecole.id, code: `${MARK}C` } });
  await db.personnel.deleteMany({ where: { ecoleId: ecole.id, nom: `${MARK}Prof` } });

  const echecs = stats.filter((s) => !s.pass).length;
  console.log(`\n===== ${stats.length - echecs}/${stats.length} PASS =====`);
  if (echecs > 0) process.exitCode = 1;
}

main().catch((e) => { console.error('ERREUR :', e); process.exitCode = 1; }).finally(() => db.$disconnect());
