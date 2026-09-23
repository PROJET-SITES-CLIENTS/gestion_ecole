// ════════════════════════════════════════════════════════════════════
// IA CONFIGURATION — le scénario EXACT décrit par la direction :
// 1. Créer des classes (doublons inclus : CE1-A, CE1-B)
// 2. Créer les matières du primaire (Français, Maths, EST, Dessin…)
// 3. Programme annuel détaillé avec chapitres + trimestres + semaines
// 4. Affectation GRANULAIRE : « Jean Bernard → Français en 6e, 5e, 4e mais PAS 3e »
// 5. Règles de calcul des moyennes par cycle
// 6. Saisie de notes → calcul automatique
// ════════════════════════════════════════════════════════════════════
import { initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore } from '../src/lib/business';
import { CATALOGUE_IA, outilsPourSession } from '../src/lib/ia/outils';
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
  console.log('═══ 0. MISE EN PLACE ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'ia-config-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `IA Config ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `iac-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctx = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  const outils = new Map(CATALOGUE_IA.map((t) => [t.nom, t]));
  check(`catalogue : ${CATALOGUE_IA.length} outils`, CATALOGUE_IA.length >= 44, `${CATALOGUE_IA.length}`);
  const nomsDir = outilsPourSession(new Set(PERMS_DIR)).map((t) => t.nom);
  check('direction voit les 8 outils de configuration', ['creer_classes', 'modifier_classe', 'supprimer_classe_vide', 'creer_matieres', 'creer_programme_annee', 'affecter_enseignant', 'voir_affectations', 'regle_calcul_moyenne'].every((x) => nomsDir.includes(x)));
  const nomsProf = outilsPourSession(new Set(['eleves.lire', 'notes.saisir', 'presences.saisir', 'vie_scolaire.gerer', 'edt.gerer'])).map((t) => t.nom);
  check('prof : programme annuel OUI, mais PAS creer_classes ni matières (réservé direction)', nomsProf.includes('creer_programme_annee') && !nomsProf.includes('creer_classes') && !nomsProf.includes('creer_matieres') && !nomsProf.includes('regle_calcul_moyenne'));

  console.log('\n═══ 1. CRÉER DES CLASSES (doublons CE1-A + CE1-B) ═══');
  const res1: any = await outils.get('creer_classes')!.executer(ctx, { niveau: 'CE1', classes: 'CE1-A, CE1-B', capacite: 35 });
  check('CE1-B créée, CE1-A (existante de l init) ignorée — le doublon réel est géré', res1.creees?.includes('CE1-B') === true && res1.ignorees?.includes('CE1-A') === true, JSON.stringify(res1).slice(0, 90));
  const resBis: any = await outils.get('creer_classes')!.executer(ctx, { niveau: 'CE1', classes: 'CE1-A' });
  check('doublon ignoré proprement à la re-création', resBis.creees?.length === 0 && resBis.ignorees?.length === 1);
  const res2: any = await outils.get('modifier_classe')!.executer(ctx, { classe: 'CE1-B', nouveauNom: 'CE1-Blanche' });
  check('classe renommée CE1-B → CE1-Blanche', res2.nouveauNom === 'CE1-Blanche', JSON.stringify(res2).slice(0, 60));

  console.log('\n═══ 2. MATIÈRES DU PRIMAIRE (avec exception CM1/CM2 gérée au programme) ═══');
  const res3: any = await outils.get('creer_matieres')!.executer(ctx, {
    matieres: 'Français, Mathématiques, Éducation sociale, Éducation scientifique et technologique, Dessin',
    coefficients: 'Français:2, Mathématiques:3',
  });
  check('5 matières créées avec coefficients', res3.creees?.length === 5, JSON.stringify(res3.creees ?? []).slice(0, 100));
  const fr = await db.matiere.findFirst({ where: { ecoleId: r.ecoleId, libelle: { contains: 'Français' } } });
  const maths = await db.matiere.findFirst({ where: { ecoleId: r.ecoleId, libelle: { contains: 'Math' } } });
  check('coefficients appliqués (FR=2, MATHS=3)', fr?.coefficient === 2 && maths?.coefficient === 3, `${fr?.coefficient}/${maths?.coefficient}`);
  // l exception CM1/CM2 : éducation HISTOIRE au lieu de scientifique
  const resHist: any = await outils.get('creer_matieres')!.executer(ctx, { matieres: 'Histoire' });
  check('matière d exception créée (Histoire pour CM1/CM2)', resHist.creees?.length === 1);

  console.log('\n═══ 3. PROGRAMME ANNUEL DÉTAILLÉ (chapitres + trimestres + semaines) ═══');
  const res4: any = await outils.get('creer_programme_annee')!.executer(ctx, {
    matiere: 'Mathématiques', niveau: 'CE1',
    chapitres: 'Les nombres de 0 à 99:T1:sem2; L addition:T1:sem5; La soustraction:T1:sem9; Les doubles et moitiés:T2:sem13; La multiplication:T2:sem18; Les mesures de longueur:T3:sem24; La géométrie:T3:sem28',
  });
  check(`programme créé avec ${res4.chapitresAjoutes} chapitres planifiés`, res4.chapitresAjoutes === 7, JSON.stringify(res4.detail ?? []).slice(0, 120));
  const chapitres = await db.chapitre.findMany({ where: { programme: { ecoleId: r.ecoleId } }, orderBy: { ordre: 'asc' } });
  check('chapitres ordonnés en base avec périodes [T1] dans le titre', chapitres.length === 7 && chapitres.some((c: any) => (c.titre ?? '').includes('[T1]')));

  console.log('\n═══ 4. AFFECTATION GRANULAIRE : Jean Bernard, Français, 6e-5e-4e, PAS 3e ═══');
  const jb = await creerPersonnelCore(ctx, r.ecoleId, { nom: 'Bernard', prenom: 'Jean', email: `jb-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 250000, creerCompte: false } as never);
  const res5: any = await outils.get('affecter_enseignant')!.executer(ctx, {
    enseignant: 'Bernard', matiere: 'Français', classes: '6E, 5E, 4E', sauf: '3E',
  });
  check(`affecté à ${res5.classesDetail?.length} classes`, res5.classesDetail?.length === 3, JSON.stringify(res5).slice(0, 120));
  check('exception 3e bien EXCLUE', (res5.exceptions ?? []).some((c: string) => c.includes('Troisième') || c.includes('3E')), JSON.stringify(res5.exceptions ?? []));
  const affectations = await db.affectationEnseignant.findMany({ where: { personnelId: jb.personnelId }, include: { classe: true } });
  check('3 affectations en base, AUCUNE en 3e', affectations.length === 3 && !affectations.some((a: any) => a.classe.code.startsWith('3E')));
  const vue: any = await outils.get('voir_affectations')!.executer(ctx, {});
  check('voir_affectations liste « qui enseigne quoi où »', vue.length === 3 && vue[0].enseignant.includes('Jean'));

  console.log('\n═══ 5. RÈGLES DE CALCUL DES MOYENNES ═══');
  const res6: any = await outils.get('regle_calcul_moyenne')!.executer(ctx, { cycle: 'Primaire', mode: 'competences', arrondi: 1 });
  check('primaire passé en compétences (arrondi 1 déc.)', res6.mode === 'competences' && !!res6.regleId);
  const res7: any = await outils.get('regle_calcul_moyenne')!.executer(ctx, { cycle: 'Collège', mode: 'chiffre', notePlancher: 5, arrondi: 2 });
  check('collège en chiffres avec plancher 5', res7.mode === 'chiffre');

  console.log('\n═══ 6. SUPPRESSION CLASSE VIDE (sécurité) ═══');
  const res8: any = await outils.get('supprimer_classe_vide')!.executer(ctx, { classe: 'CE1-Blanche' });
  check('classe vide supprimée', !!res8.classeId);
  // une classe AVEC élève doit être refusée
  const classe6 = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  await inscrireEleveCore(ctx, r.ecoleId, { nom: 'Garde', prenom: 'Eleve', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'D', sexe: 'M', classeId: classe6!.id } as never);
  let refuse = false;
  try { await outils.get('supprimer_classe_vide')!.executer(ctx, { classe: 'Sixième A' }); } catch (e: any) { refuse = /élève/i.test(String(e.message)); }
  check('classe avec élèves REFUSÉE à la suppression', refuse);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');
  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} IA CONFIGURATION : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — GRANULARITÉ TOTALE LIVRÉE'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('IA-CONFIG', main);
