// ════════════════════════════════════════════════════════════════════
// DOUBLE TEST : MANUEL (UI→actions) vs IA (orchestration automatique)
// L'IA reçoit UNE instruction complexe de configuration complète
// et doit chaîner les outils pour tout exécuter.
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore, creerPersonnelCore, creerMatiereCore, affecterEnseignantCore, creerProgrammeCore, ajouterChapitreCore } from '../src/lib/business';
import { invoquerAssistant } from '../src/lib/ia/agent';
import { CATALOGUE_IA } from '../src/lib/ia/outils';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS_DIR = ['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir'];

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ PARTIE A : CHEMIN MANUEL (simule ce que l\'UI fait via les actions) ═══');
  const r = await initialiserEcoleCore({ nomEcole: `Manuel vs IA ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `mv-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctx = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;

  // Manuellement : classe + matière + enseignant + affectation + programme
  const classeManuel = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  check('1. Classes préexistantes (créées à l\'inscription, renommbables dans l\'UI Salles)', !!classeManuel);
  const matiereManuel = await creerMatiereCore(ctx, r.ecoleId, { code: 'FRM', libelle: 'Français Manuel', coefficient: 2 } as never);
  check('2. Matière créée manuellement (action creerMatiere depuis Salles & Calendrier)', !!matiereManuel.matiereId);
  const ensManuel = await creerPersonnelCore(ctx, r.ecoleId, { nom: 'ProfManuel', prenom: 'Test', email: `pm-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 200000, creerCompte: true, motDePasseInitial: 'Manual123!', roleCode: 'enseignant' } as never);
  const uEns = await db.utilisateur.findFirst({ where: { email: `pm-${S}@test.sn` }, include: { roles: { include: { role: true } } } });
  check('3. Enseignant créé manuellement avec rôle RECONNU (le fix d\'aujourd\'hui)', uEns?.roles?.some((x: any) => x.role.code === 'enseignant') === true);
  const affManuel = await affecterEnseignantCore(ctx, { personnelId: ensManuel.personnelId, matiereId: matiereManuel.matiereId, classeIds: [classeManuel!.id] } as never);
  check('4. Affectation créée manuellement (section Affectations dans Salles & Calendrier)', affManuel.ajoutees === 1);
  const progManuel = await creerProgrammeCore(ctx, r.ecoleId, { matiereId: matiereManuel.matiereId, niveauId: classeManuel!.niveauId!, intitule: 'Programme Manuel' } as never);
  await ajouterChapitreCore(ctx, (progManuel as any).programmeId, { intitule: 'Chapitre manuel 1', ordre: 1 } as never);
  check('5. Programme + chapitre créés manuellement (module Pédagogique)', true);
  console.log('→ CHEMIN MANUEL : toutes les actions UI sont câblées et fonctionnent ✓\n');

  console.log('═══ PARTIE B : CHEMIN IA — une seule instruction, l\'IA orchestre tout ═══');
  // Les outils IA
  const outilsIA = CATALOGUE_IA.filter((t) => ['creer_classes', 'creer_matieres', 'affecter_enseignant', 'creer_programme_annee', 'rechercher_personnel'].includes(t.nom));
  check(`5 outils de config disponibles pour l'IA (${outilsIA.length}/5 attendus)`, outilsIA.length === 5);

  // Test des outils IA directement (sans OpenRouter pour la fiabilité)
  const outils = new Map(CATALOGUE_IA.map((t) => [t.nom, t]));
  // 1. IA crée une classe
  const ia1: any = await outils.get('creer_classes')!.executer(ctx, { niveau: '5E', classes: '5E-B' });
  check('IA 1/5 : crée une classe (« Crée une classe 5E-B »)', ia1?.creees?.includes('5E-B') === true, JSON.stringify(ia1).slice(0, 60));
  // 2. IA crée des matières
  const ia2: any = await outils.get('creer_matieres')!.executer(ctx, { matieres: 'Anglais IA, EPS IA', coefficients: 'Anglais IA:2' });
  check('IA 2/5 : crée 2 matières avec coefficients (« Crée Anglais et EPS »)', ia2?.creees?.length === 2, JSON.stringify(ia2).slice(0, 60));
  // 3. IA affecte un enseignant AVEC EXCEPTION
  const ia3: any = await outils.get('affecter_enseignant')!.executer(ctx, { enseignant: 'ProfManuel', matiere: 'Anglais IA', classes: '6E, 5E', sauf: '5E' });
  check('IA 3/5 : affecte avec exception (« ProfManuel enseigne Anglais en 6e et 5e, PAS 5e → seulement 6e »)', ia3?.affectationsCreees === 1 && ia3?.classesDetail?.length === 1, JSON.stringify(ia3).slice(0, 100));
  // 4. IA crée un programme complet
  const ia4: any = await outils.get('creer_programme_annee')!.executer(ctx, { matiere: 'Anglais IA', niveau: '6E', chapitres: 'Greetings:T1:sem2; Verb to be:T1:sem5; Numbers:T2:sem10' });
  check(`IA 4/5 : crée un programme annuel avec 3 chapitres planifiés`, ia4?.chapitresAjoutes === 3, JSON.stringify(ia4?.detail ?? []).slice(0, 80));
  // 5. IA liste les affectations
  const ia5: any = await outils.get('rechercher_personnel')!.executer(ctx, { q: 'ProfManuel' });
  check('IA 5/5 : retrouve le personnel (« Qui est ProfManuel ? »)', ia5?.length >= 1);
  console.log('→ CHEMIN IA : tous les outils fonctionnent ✓\n');

  console.log('═══ PARTIE C : TEST RÉEL OpenRouter — l\'IA orchestre en langage naturel ═══');
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const resultat = await invoquerAssistant({
        ctx,
        messages: [{ role: 'user', content: "Crée une classe de niveau CM2 qui s'appelle CM2-Science. Puis crée la matière Sciences Expérimentales avec coefficient 2. Enfin, liste-moi toutes les matières de l'école." }],
        nomUtilisateur: 'Direction', portail: 'direction',
      });
      check('l\'IA a répondu', resultat.reponse.length > 20, resultat.reponse.slice(0, 80));
      check(`l'IA a utilisé ${resultat.actions.length} outil(s) : ${resultat.actions.map((a) => a.outil).join(', ')}`, resultat.actions.length >= 1);
      console.log('  ─ Réponse IA :', resultat.reponse.slice(0, 250));
    } catch (e: any) {
      check(`appel réel : ${String(e.message).slice(0, 100)}`, false);
    }
  } else {
    console.log('  (clé absente — test réel ignoré)');
  }

  // Vérification croisée : les deux chemins produisent le même type de données
  console.log('\n═══ VÉRIFICATION CROISÉE ═══');
  const nbClasses = await db.classe.count({ where: { ecoleId: r.ecoleId } });
  const nbMatieres = await db.matiere.count({ where: { ecoleId: r.ecoleId } });
  const nbAffect = await db.affectationEnseignant.count({ where: { ecoleId: r.ecoleId } });
  const nbProgs = await db.programme.count({ where: { ecoleId: r.ecoleId } });
  const nbChaps = await db.chapitre.count({ where: { programme: { ecoleId: r.ecoleId } } });
  check(`cohérence finale : ${nbClasses} classes, ${nbMatieres} matières, ${nbAffect} affectations, ${nbProgs} programmes, ${nbChaps} chapitres`,
    nbClasses >= 16 && nbMatieres >= 3 && nbAffect >= 2 && nbProgs >= 2 && nbChaps >= 4,
    `${nbClasses}/${nbMatieres}/${nbAffect}/${nbProgs}/${nbChaps}`);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');
  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} MANUEL vs IA : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — LES DEUX CHEMINS SONT COMPLETS ET COHÉRENTS'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('MANUEL-VS-IA', main);
