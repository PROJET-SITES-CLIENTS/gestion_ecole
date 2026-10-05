/**
 * TEST RÉEL IA — SESSION SECRÉTARIAT (audit axe 4 : précision, CRUD)
 * Conversations contre l'API OpenRouter réelle avec les 6 permissions du rôle :
 *   X1 « Inscrit l'élève … en … »        → inscrire_eleve (CRÉATION + checklist pièces)
 *   X2 « Marque l'acte … comme reçu »    → basculer_piece_dossier (MODIFICATION, bon élève)
 *   X3 « Quels sont les absents du jour ? » → absences_du_jour (LECTURE)
 *   X4 Suppression d'amalgame : « supprime la présence de [élève inexistant] » → refus propre
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { dbTest as db } from './_helper-test';
import { invoquerAssistant } from '../src/lib/ia/agent';
import { Ctx } from '../src/lib/business';

const MARK = 'IASEC';

async function main() {
  const ecole = await db.ecole.findFirst();
  if (!ecole) throw new Error('Aucune école');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
  const niveau = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: ecole.id } } } });
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id } });
  if (!annee || !niveau || !dir) throw new Error('Structure incomplète');

  // Nettoyage
  await db.eleve.deleteMany({ where: { ecoleId: ecole.id, nom: { startsWith: `${MARK}Fall` } } });

  const classe = (await db.classe.findFirst({ where: { ecoleId: ecole.id, anneeScolaireId: annee.id } }))
    ?? await db.classe.create({ data: { ecoleId: ecole.id, anneeScolaireId: annee.id, niveauId: niveau.id, code: `${MARK}C`, libelle: `${MARK} Sixième B`, capaciteMax: 30 } });

  const ctx: Ctx = {
    utilisateurId: dir.id, ecoleId: ecole.id, type: 'personnel',
    permissions: new Set(['eleves.lire', 'eleves.ecrire', 'presences.saisir', 'finances.voir', 'communication.envoyer', 'secretariat.gerer']),
  };
  console.log(`École : ${ecole.nom} — session SECRÉTARIAT (6 permissions)\n`);
  const stats: Array<{ n: string; ok: boolean; d: string }> = [];
  const check = (n: string, ok: boolean, d = '') => { stats.push({ n, ok, d }); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); };
  async function demander(message: string) {
    console.log(`\n👤 « ${message} »`);
    const r = await invoquerAssistant({ ctx, messages: [{ role: 'user', content: message }], portail: 'secretariat', nomUtilisateur: 'Secrétariat' });
    console.log(`🤖 ${r.reponse.slice(0, 300)}`);
    console.log(`   outils : ${r.actions.map((a) => `${a.ok ? '✓' : '✗'}${a.outil}`).join(' · ') || '(aucun)'}`);
    return r;
  }

  // X1 — CRÉATION : inscription
  {
    const r = await demander(`Inscris l'élève ${MARK}Fall Aminata, née le 2013-05-05, fille, en ${classe.libelle}`);
    const el = await db.eleve.findFirst({ where: { ecoleId: ecole.id, nom: `${MARK}Fall` }, include: { piecesDossier: true } });
    check('X1a élève créé avec matricule', Boolean(el?.matricule), el?.matricule ?? '—');
    check('X1b bonne classe', el?.classeActuelleId === classe.id);
    check('X1c checklist pièces initialisée', (el?.piecesDossier.length ?? 0) >= 5, `${el?.piecesDossier.length} pièces`);
  }

  // X2 — MODIFICATION : pièce reçue
  {
    const r = await demander(`Marque l'acte de naissance de ${MARK}Fall Aminata comme reçu`);
    const el = await db.eleve.findFirst({ where: { ecoleId: ecole.id, nom: `${MARK}Fall` }, include: { piecesDossier: true } });
    const piece = el?.piecesDossier.find((p) => p.type === 'acte_naissance');
    check('X2a pièce acte_naissance reçue', piece?.statut === 'recue', piece?.statut ?? '—');
  }

  // X3 — LECTURE : absents du jour
  {
    const r = await demander('Qui est absent aujourd\'hui ?');
    check('X3a réponse factuelle sur les absents', /aucun|personne|\d+ absent|[a-zéè]/i.test(r.reponse) && !/je ne peux pas|impossible/i.test(r.reponse));
  }

  // X4 — SUPPRESSION avec amalgame : élève inexistant
  {
    const avant = await db.presence.count({ where: { eleve: { ecoleId: ecole.id } } });
    const r = await demander(`Supprime la présence de ZzzInexistant QqqPersonne`);
    const apres = await db.presence.count({ where: { eleve: { ecoleId: ecole.id } } });
    check('X4a AUCUNE suppression sur élève inexistant', apres === avant, `${avant}→${apres}`);
    check('X4b réponse honnête (introuvable)', /introuvable|aucun|inconnu|pas trouvé/i.test(r.reponse));
  }

  // Nettoyage
  const elSuppr = await db.eleve.findFirst({ where: { ecoleId: ecole.id, nom: { startsWith: `${MARK}Fall` } } });
  if (elSuppr) {
    await db.eleveHistoriqueClasse.deleteMany({ where: { eleveId: elSuppr.id } });
    await db.pieceDossier.deleteMany({ where: { eleveId: elSuppr.id } });
    await db.eleve.delete({ where: { id: elSuppr.id } });
  }
  await db.classe.deleteMany({ where: { ecoleId: ecole.id, code: `${MARK}C` } });

  const echecs = stats.filter((s) => !s.ok).length;
  console.log(`\n===== ${stats.length - echecs}/${stats.length} PASS =====`);
  if (echecs > 0) process.exitCode = 1;
}

main().catch((e) => { console.error('ERREUR :', e); process.exitCode = 1; }).finally(() => db.$disconnect());
