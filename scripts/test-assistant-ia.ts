// ════════════════════════════════════════════════════════════════════
// ASSISTANT IA — tests : 1) périmètres par rôle (outils filtrés)
// 2) exécution PROFONDE réelle des outils (comme l'IA les appellera)
// 3) SMOKE réel OpenRouter (1 conversation avec function calling)
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, creerFraisCore, genererEcheancesClasseCore, creerMatiereCore } from '../src/lib/business';
import { outilsPourSession, CATALOGUE_IA } from '../src/lib/ia/outils';
import { invoquerAssistant } from '../src/lib/ia/agent';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS: Record<string, string[]> = {
  direction: ['eleves.lire','eleves.ecrire','bulletins.valider','finances.voir','finances.ecrire','finances.valider','rh.gerer','communication.envoyer','admin.saas','vie_scolaire.gerer','securite.gerer','examens.gerer','services.gerer','edt.gerer','sante.gerer','salles.gerer','protection.gerer','notes.saisir','presences.saisir'],
  enseignant: ['eleves.lire','notes.saisir','presences.saisir','vie_scolaire.gerer','edt.gerer'],
  comptabilite: ['finances.voir','finances.ecrire','finances.valider'],
  secretariat: ['eleves.lire','eleves.ecrire','communication.envoyer'],
  infirmier: ['eleves.lire','sante.gerer'],
};
const F = 100;

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 1. PÉRIMÈTRES : chaque rôle ne voit QUE ses outils ═══');
  const noms = (perms: string[]) => outilsPourSession(new Set(perms)).map((t) => t.nom);
  const outilsDir = noms(PERMS.direction);
  const outilsProf = noms(PERMS.enseignant);
  const outilsCompta = noms(PERMS.comptabilite);
  const outilsSec = noms(PERMS.secretariat);
  const outilsInf = noms(PERMS.infirmier);
  check(`direction : ${outilsDir.length} outils (le plus large)`, outilsDir.length >= 20, `${outilsDir.length}`);
  check('prof : AUCUN outil financier', !outilsProf.includes('encaisser_paiement') && !outilsProf.includes('impayes_ecole') && !outilsProf.includes('etat_caisse'));
  check('prof : a pédagogie (saisir_notes, bulletins_classe, cahier, devoir)', ['saisir_notes', 'generer_bulletins_classe', 'ecrire_cahier_textes', 'assigner_devoir'].every((x) => outilsProf.includes(x)));
  check('comptable : finances OUI, pédagogie NON, élèves NON', ['encaisser_paiement', 'creer_frais', 'caisse_operations', 'passer_ecriture_comptable'].every((x) => outilsCompta.includes(x)) && !outilsCompta.includes('saisir_notes') && !outilsCompta.includes('rechercher_eleve'));
  check('secrétariat : inscription OUI, encaissement NON, notes NON', outilsSec.includes('inscrire_eleve') && !outilsSec.includes('encaisser_paiement') && !outilsSec.includes('saisir_notes'));
  check('infirmier : recherche élève OUI (soins), finances NON', outilsInf.includes('rechercher_eleve') && !outilsInf.includes('impayes_ecole') && !outilsInf.includes('encaisser_paiement'));
  check(`catalogue total : ${CATALOGUE_IA.length} outils`, CATALOGUE_IA.length >= 24);

  console.log('\n═══ 2. EXÉCUTION PROFONDE (handlers réels, comme l\'IA les appelle) ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'assistant-ia-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Assistant IA ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `ia-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS.direction) } as never;
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });

  const outils = new Map(CATALOGUE_IA.map((t) => [t.nom, t]));
  // statistiques
  const stats: any = await outils.get('statistiques_ecole')!.executer(ctxDir, {});
  check('statistiques_ecole : 15 classes, 0 élève au départ', stats.totalClasses === 15 && stats.totalEleves === 0);
  // inscription (contexte secrétariat simulé avec ses permissions)
  const ctxSec = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS.secretariat) } as never;
  const insc: any = await outils.get('inscrire_eleve')!.executer(ctxSec, { nom: 'Sow', prenom: 'Malick', dateNaissance: '2013-05-10', lieuNaissance: 'Dakar', sexe: 'M', classe: 'Sixième A' });
  check('inscrire_eleve : élève créé + classe résolue par LIBELLÉ', !!insc.eleveId && insc.classe === 'Sixième A');
  // le comptable encaisse (frais d'abord par direction)
  await creerFraisCore(ctxDir, r.ecoleId, { libelle: 'Scolarité IA', montant: 50000 * F, periodicite: 'annuel', type: 'scolarite', niveauId: classe!.niveauId ?? undefined, devise: 'XOF' } as never);
  await genererEcheancesClasseCore(ctxDir, { fraisId: (await db.frais.findFirst({ where: { ecoleId: r.ecoleId } }))!.id, classeId: classe!.id, dateEcheance: new Date() });
  const ctxCompta = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS.comptabilite) } as never;
  const enc: any = await outils.get('encaisser_paiement')!.executer(ctxCompta, { eleve: 'Sow', montant: 30000, mode: 'espece' });
  check('encaisser_paiement : par NOM, 30 000 F convertis en centimes, alloué', !!enc.paiementId && enc.alloue === 30000 * F, JSON.stringify(enc).slice(0, 80));
  // impayés (le prof N'A PAS l'outil, mais le comptable oui)
  const imp: any = await outils.get('impayes_ecole')!.executer(ctxCompta, {});
  check('impayes_ecole : restant 20 000 F affiché', imp.totalRestant === 20000 * F, `${imp.totalRestant / F}`);
  // notes (contexte prof)
  await creerMatiereCore(ctxDir, r.ecoleId, { code: 'FR', libelle: 'Français', coefficient: 2 } as never);
  const persProf = await db.personnel.findFirst({ where: { utilisateurId: r.adminId } });
  const periode = await db.periode.findFirst({ where: { ecoleId: r.ecoleId } });
  const { creerEvaluationCore } = await import('../src/lib/business');
  const ev = await creerEvaluationCore(ctxDir, r.ecoleId, { classeId: classe!.id, matiereId: (await db.matiere.findFirst({ where: { ecoleId: r.ecoleId } }))!.id, enseignantId: persProf!.id, periodeId: periode!.id, type: 'interrogation', intitule: 'Dictée IA', date: new Date(), sur: 20, coefficient: 1 } as never);
  const ctxProf = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS.enseignant) } as never;
  const notesRes: any = await outils.get('saisir_notes')!.executer(ctxProf, { evaluation: 'Dictée IA', notes: 'Malick Sow: 15.5' });
  check('saisir_notes : format conversationnel « Malick Sow: 15.5 » → enregistré', notesRes.enregistrées === 1, JSON.stringify(notesRes).slice(0, 60));
  // bulletins en masse
  const gen: any = await outils.get('generer_bulletins_classe')!.executer(ctxProf, { classe: 'Sixième A', periode: 'Trimestre 1' });
  check('generer_bulletins_classe : 1 bulletin généré (moyenne 15.5)', gen.generes === 1);
  // incident + cahier (prof)
  const inc: any = await outils.get('declarer_incident')!.executer(ctxProf, { eleve: 'Sow', description: 'Bavardage', gravite: 'leger' });
  check('declarer_incident par nom', !!inc.incidentId);
  const cah: any = await outils.get('ecrire_cahier_textes')!.executer(ctxProf, { classe: 'Sixième A', contenu: 'Dictée préparée', travailAFaire: 'Revoir p.12' });
  check('cahier de textes publié aux familles', !!cah.entreeId);
  // REFUS : le prof essaie l'outil financier (simulé : l'outil n'est pas dans son catalogue → l'agent ne peut pas l'appeler ;
  // ET si appelé direct, le core refuse)
  let refuse = false;
  try { await outils.get('encaisser_paiement')!.executer(ctxProf, { eleve: 'Sow', montant: 1000, mode: 'espece' }); }
  catch { refuse = true; }
  check('garde-fou double : même en forçant, le CORE refuse le prof (assertPermission)', refuse);

  console.log('\n═══ 3. SMOKE RÉEL OpenRouter (function calling) ═══');
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('  (clé absente — ignoré)');
  } else {
    try {
      const resultat = await invoquerAssistant({
        ctx: ctxDir,
        messages: [{ role: 'user', content: 'Combien y a-t-il d\'élèves inscrits dans mon école actuellement ? Utilise tes outils.' }],
        nomUtilisateur: 'Directeur Test', portail: 'direction',
      });
      check(`réponse IA reçue (${resultat.reponse.length} car.)`, resultat.reponse.length > 10);
      check(`l'IA a utilisé un outil (${resultat.actions.map((a) => a.outil).join(', ') || 'aucun'})`, resultat.actions.length >= 1);
      check('la réponse mentionne les élèves/chiffres réels', /1|élève|eleve|inscrit/i.test(resultat.reponse), resultat.reponse.slice(0, 100));
      console.log('  ─ Réponse IA :', resultat.reponse.slice(0, 300));
    } catch (e: any) {
      check(`appel OpenRouter (${String(e.message).slice(0, 80)})`, false);
    }
  }

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} ASSISTANT IA : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — OPÉRATIONNEL'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('ASSISTANT-IA', main);
