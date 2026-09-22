// IA v2 : périmètres avec le catalogue étendu + smoke réel avec la NOUVELLE clé
import { initialiserEcoleCore, inscrireEleveCore, creerPersonnelCore, demanderCongeCore } from '../src/lib/business';
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
  rh: ['eleves.lire', 'rh.gerer', 'communication.envoyer'],
  comptabilite: ['finances.voir', 'finances.ecrire', 'finances.valider'],
  enseignant: ['eleves.lire', 'notes.saisir', 'presences.saisir', 'vie_scolaire.gerer', 'edt.gerer'],
  secretariat: ['eleves.lire', 'eleves.ecrire', 'communication.envoyer'],
};

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 1. CATALOGUE ÉTENDU + PÉRIMÈTRES ═══');
  check(`catalogue : ${CATALOGUE_IA.length} outils (25 → ${CATALOGUE_IA.length})`, CATALOGUE_IA.length >= 35, `${CATALOGUE_IA.length}`);
  const nomsRh = outilsPourSession(new Set(PERMS.rh)).map((t) => t.nom);
  const nomsCompta = outilsPourSession(new Set(PERMS.comptabilite)).map((t) => t.nom);
  const nomsProf = outilsPourSession(new Set(PERMS.enseignant)).map((t) => t.nom);
  check('RH : valider congés + générer paie + stats RH + rechercher personnel', ['traiter_conge', 'generer_paie', 'stats_rh', 'rechercher_personnel'].every((x) => nomsRh.includes(x)));
  check('RH : AUCUN outil financier ni pédagogique', !nomsRh.includes('encaisser_paiement') && !nomsRh.includes('saisir_notes') && !nomsRh.includes('passer_ecriture_comptable'));
  check('compta : situation financière + écritures + caisse', ['situation_financiere', 'passer_ecriture_comptable', 'caisse_operations'].every((x) => nomsCompta.includes(x)));
  check('compta : AUCUN outil RH ni congés', !nomsCompta.includes('traiter_conge') && !nomsCompta.includes('generer_paie'));
  check('prof : avancement programme + devoir, PAS de paie ni conges', ['maj_avancement', 'assigner_devoir'].every((x) => nomsProf.includes(x)) && !nomsProf.includes('traiter_conge') && !nomsProf.includes('stats_rh'));
  const nomsDir = outilsPourSession(new Set(PERMS.direction)).map((t) => t.nom);
  check(`direction : ${nomsDir.length} outils (le catalogue complet)`, nomsDir.length === CATALOGUE_IA.length, `${nomsDir.length}/${CATALOGUE_IA.length}`);

  console.log('\n═══ 2. EXÉCUTION PROFONDE (traiter_conge par l\'IA-RH) ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'ia-v2-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `IA V2 ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `iav2-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const PERMS_DIR = PERMS.direction;
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  const prof = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Conge', prenom: 'Test', email: `cg-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 200000, creerCompte: false } as never);
  const demande = await demanderCongeCore(ctxDir, { personnelId: prof.personnelId, type: 'annuel', dateDebut: new Date(Date.now() + 10 * 864e5), dateFin: new Date(Date.now() + 14 * 864e5), motif: 'repos' } as never);
  check('demande de congé en attente créée', !!demande.congeId);
  const outils = new Map(CATALOGUE_IA.map((t) => [t.nom, t]));
  const ctxRh = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS.rh) } as never;
  const val: any = await outils.get('traiter_conge')!.executer(ctxRh, { personnel: 'Conge', decision: 'valide', commentaire: 'Validé par l assistant IA' });
  check('l outil IA-RH a VALIDÉ le congé', !!val?.congeId || val?.statut === 'valide' || JSON.stringify(val).includes('valide'), JSON.stringify(val).slice(0, 90));
  const congeB = await db.conge.findFirst({ where: { personnelId: prof.personnelId } });
  check('congé passé à valide en base', congeB?.statut === 'valide', congeB?.statut);
  // le prof ne peut PAS utiliser traiter_conge (l outil n est pas dans son catalogue)
  check('l enseignant ne voit PAS l outil traiter_conge', !nomsProf.includes('traiter_conge'));

  console.log('\n═══ 3. SMOKE RÉEL avec la NOUVELLE clé ═══');
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('  (clé absente — ignoré)');
  } else {
    try {
      const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
      await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Smoke', prenom: 'Ia', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'D', sexe: 'F', classeId: classe!.id } as never);
      const res = await invoquerAssistant({
        ctx: ctxDir,
        messages: [{ role: 'user', content: 'Donne-moi la situation financière globale de mon école et les statistiques RH en une réponse.' }],
        nomUtilisateur: 'Directeur Test', portail: 'direction',
      });
      check('réponse IA reçue avec la nouvelle clé', res.reponse.length > 30, res.reponse.slice(0, 80));
      check(`outils utilisés : ${res.actions.map((a) => a.outil).join(', ')}`, res.actions.length >= 1);
      console.log('  ─ Réponse :', res.reponse.slice(0, 280));
    } catch (e: any) {
      check(`appel OpenRouter nouvelle clé : ${String(e.message).slice(0, 100)}`, false);
    }
  }

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');
  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} IA v2 : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ''}`);
  if (f) process.exitCode = 1;
}
executerAvecRetry('IA-V2', main);
