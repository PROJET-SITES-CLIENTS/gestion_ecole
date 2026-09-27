// ════════════════════════════════════════════════════════════════════
// CONFIGURATION PÉDAGOGIQUE — le process COMPLET décrit par la direction
// 1. Créer les classes (maternelle/primaire/collège/lycée, noms libres)
// 2. Créer les matières par niveau
// 3. Créer les enseignants AVEC rôle reconnu (le bug corrigé)
// 4. Affecter enseignants ↔ matières ↔ classes
// 5. Créer les programmes PAR CLASSE PAR MATIÈRE (CP français ≠ CE1 français)
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, creerMatiereCore, creerClasseCore,
  creerProgrammeCore, ajouterChapitreCore, affecterEnseignantCore,
  inscrireEleveCore,
} from '../src/lib/business';
import { portailDuCompte } from '../src/lib/auth';
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
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'pedago-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Pedago ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `pd-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  check('école créée (15 classes initiales auto)', !!r.ecoleId);

  console.log('\n═══ 1. CLASSES — création et personnalisation ═══');
  // Les 15 classes par défaut sont déjà créées : vérifier
  const classesInit = await db.classe.findMany({ where: { ecoleId: r.ecoleId }, include: { niveau: { include: { section: { include: { cycle: true } } } } } });
  check('15 classes créées automatiquement (PS-A → TLE-A)', classesInit.length === 15, `${classesInit.length}`);
  check('couvre 4 cycles : Maternelle, Primaire, Collège, Lycée', ['MAT', 'PRIM', 'COLL', 'LYC'].every((code) => classesInit.some((c: any) => c.niveau.section.cycle.code === code)));
  // Renommer une classe (le directeur nomme comme il veut)
  const cp = classesInit.find((c: any) => c.code === 'CP-A');
  await db.classe.update({ where: { id: cp!.id }, data: { code: 'CP-Petits', libelle: 'CP Petits Génies' } });
  check('classe renommée librement : CP-A → « CP Petits Génies »', true);
  // Créer un doublon (2e classe du même niveau)
  const niveauCP = cp!.niveauId;
  await db.classe.create({ data: { ecoleId: r.ecoleId, anneeScolaireId: cp!.anneeScolaireId, niveauId: niveauCP, code: 'CP-B', libelle: 'CP B', capaciteMax: 30 } });
  check('doublon créé : CP-A ET CP-B (classes parallèles)', true);

  console.log('\n═══ 2. MATIÈRES — création par niveau ═══');
  // Primaire
  const matieresPrimaire = ['Français', 'Mathématiques', 'Éducation sociale', 'Éducation scientifique', 'Histoire-Géographie', 'Dessin'];
  for (const lib of matieresPrimaire) {
    const existe = await db.matiere.findFirst({ where: { ecoleId: r.ecoleId, libelle: { contains: lib, mode: 'insensitive' } } });
    if (!existe) await db.matiere.create({ data: { ecoleId: r.ecoleId, code: lib.slice(0, 4).toUpperCase() + '-' + lib.length, libelle: lib, coefficient: 1 } });
  }
  const nbMatieres = await db.matiere.count({ where: { ecoleId: r.ecoleId } });
  check(`6 matières du primaire créées (total : ${nbMatieres})`, nbMatieres >= 6);
  // Secondaire
  const matieresSec = ['Français', 'Mathématiques', 'Physique-Chimie', 'Anglais', 'Histoire-Géographie', 'SVT', 'EPS', 'Informatique'];
  for (const lib of matieresSec) {
    const existe = await db.matiere.findFirst({ where: { ecoleId: r.ecoleId, libelle: { contains: lib, mode: 'insensitive' } } });
    if (!existe) await db.matiere.create({ data: { ecoleId: r.ecoleId, code: lib.slice(0, 4).toUpperCase() + '-' + lib.length, libelle: lib, coefficient: 2 } });
  }
  const nbMatieresTotal = await db.matiere.count({ where: { ecoleId: r.ecoleId } });
  check(`+ matières du secondaire (total : ${nbMatieresTotal})`, nbMatieresTotal >= 11);

  console.log('\n═══ 3. ENSEIGNANTS — création avec rôle RECONNU ═══');
  // LE BUG : roleCode doit être transmis et le rôle assigné
  const ens1 = await creerPersonnelCore(ctxDir, r.ecoleId, {
    nom: 'Diop', prenom: 'Jean-Bernard', email: `jb-${S}@test.sn`,
    dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 250000,
    creerCompte: true, motDePasseInitial: 'Enseignant123!',
    roleCode: 'enseignant',
  } as never);
  const uJB = await db.utilisateur.findFirst({ where: { email: `jb-${S}@test.sn` }, include: { roles: { include: { role: true } } } });
  check('enseignant créé AVEC compte', !!ens1.personnelId && !!uJB);
  check('RÔLE enseignant ASSIGNÉ (le bug est corrigé)', uJB?.roles?.some((x: any) => x.role.code === 'enseignant') === true,
    uJB?.roles?.map((x: any) => x.role.code).join(',') ?? 'AUCUN');
  // permissions de l'enseignant
  const permJB = await db.rolePermission.findMany({ where: { role: { code: 'enseignant', ecoleId: r.ecoleId } }, include: { permission: true } });
  check('permissions de l enseignant chargées', permJB.length >= 5, `${permJB.length} permissions`);
  const portailJB = portailDuCompte('personnel', new Set(permJB.map((x: any) => x.permission.code)), ['enseignant']);
  check('portail dérivé = enseignant', portailJB === 'enseignant', portailJB);
  // 2e enseignant (multi-matières)
  const ens2 = await creerPersonnelCore(ctxDir, r.ecoleId, {
    nom: 'Ba', prenom: 'Aminata', email: `ab-${S}@test.sn`,
    dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 230000,
    creerCompte: true, motDePasseInitial: 'Enseignant123!', roleCode: 'enseignant',
  } as never);
  check('2e enseignante créée (multi-matières)', !!ens2.personnelId);

  console.log('\n═══ 4. AFFECTATIONS — qui enseigne quoi, où ═══');
  const classes6e = classesInit.filter((c: any) => c.code.startsWith('6E') || c.code.startsWith('5E') || c.code.startsWith('4E'));
  const classes3e = classesInit.filter((c: any) => c.code.startsWith('3E'));
  const classesCP = [...classesInit.filter((c: any) => c.niveauId === niveauCP), ...(await db.classe.findMany({ where: { ecoleId: r.ecoleId, niveauId: niveauCP } }))];
  const fr = await db.matiere.findFirst({ where: { ecoleId: r.ecoleId, libelle: { contains: 'Français', mode: 'insensitive' } } });
  const maths = await db.matiere.findFirst({ where: { ecoleId: r.ecoleId, libelle: { contains: 'Mathématiques', mode: 'insensitive' } } });

  // Jean-Bernard : français en 6e, 5e, 4e mais PAS 3e
  const aff1 = await affecterEnseignantCore(ctxDir, {
    personnelId: ens1.personnelId, matiereId: fr!.id,
    classeIds: classes6e.map((c: any) => c.id),
    saufClasseIds: classes3e.map((c: any) => c.id),
  } as never);
  check(`Jean-Bernard → Français : ${aff1.ajoutees} classes (6e+5e+4e, PAS 3e)`, aff1.ajoutees >= 3, JSON.stringify(aff1));
  // vérifier qu'aucune affectation en 3e
  const affJB = await db.affectationEnseignant.findMany({ where: { personnelId: ens1.personnelId }, include: { classe: true } });
  check('AUCUNE affectation en 3e pour Jean-Bernard (exception respectée)', !affJB.some((a: any) => a.classe.code.startsWith('3E')));

  // Aminata : maths au CP (les 2 classes CP)
  const aff2 = await affecterEnseignantCore(ctxDir, {
    personnelId: ens2.personnelId, matiereId: maths!.id,
    classeIds: classesCP.map((c: any) => c.id),
  } as never);
  check(`Aminata → Mathématiques : ${aff2.ajoutees} classes CP (A et B)`, aff2.ajoutees >= 2);

  // Aminata enseigne AUSSI le français au CP (multi-matières)
  const aff3 = await affecterEnseignantCore(ctxDir, {
    personnelId: ens2.personnelId, matiereId: fr!.id,
    classeIds: classesCP.map((c: any) => c.id),
  } as never);
  check(`Aminata → Français aussi (multi-matières) : ${aff3.ajoutees} nouvelles`, aff3.ajoutees >= 1);

  console.log('\n═══ 5. PROGRAMMES — par classe, par matière ═══');
  // Programme de français CP ≠ programme de français CE1 (même matière, niveaux différents)
  const niveauCPent = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: r.ecoleId } }, code: 'CP' } });
  const niveauCE1 = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: r.ecoleId } }, code: 'CE1' } });
  const niveau6E = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: r.ecoleId } }, code: '6E' } });

  // Programme français CP
  const progCP = await creerProgrammeCore(ctxDir, r.ecoleId, { matiereId: fr!.id, niveauId: niveauCPent!.id, intitule: 'Français CP' } as never);
  await ajouterChapitreCore(ctxDir, (progCP as any).programmeId, { intitule: 'Reconnaissance des lettres', ordre: 1 } as never);
  await ajouterChapitreCore(ctxDir, (progCP as any).programmeId, { intitule: 'Lecture syllabique', ordre: 2 } as never);
  await ajouterChapitreCore(ctxDir, (progCP as any).programmeId, { intitule: 'Premières phrases', ordre: 3 } as never);

  // Programme français CE1 (MÊME matière mais CONTENU différent)
  const progCE1 = await creerProgrammeCore(ctxDir, r.ecoleId, { matiereId: fr!.id, niveauId: niveauCE1!.id, intitule: 'Français CE1' } as never);
  await ajouterChapitreCore(ctxDir, (progCE1 as any).programmeId, { intitule: 'Lecture courante', ordre: 1 } as never);
  await ajouterChapitreCore(ctxDir, (progCE1 as any).programmeId, { intitule: 'Production ecrits simples', ordre: 2 } as never);
  await ajouterChapitreCore(ctxDir, (progCE1 as any).programmeId, { intitule: 'Grammaire : le verbe', ordre: 3 } as never);

  // Programme français 6e (encore différent — niveau secondaire)
  const prog6E = await creerProgrammeCore(ctxDir, r.ecoleId, { matiereId: fr!.id, niveauId: niveau6E!.id, intitule: 'Français 6e' } as never);
  await ajouterChapitreCore(ctxDir, (prog6E as any).programmeId, { intitule: 'Le récit : structure et temps', ordre: 1 } as never);
  await ajouterChapitreCore(ctxDir, (prog6E as any).programmeId, { intitule: 'La description', ordre: 2 } as never);
  await ajouterChapitreCore(ctxDir, (prog6E as any).programmeId, { intitule: 'Le dialogue théâtral', ordre: 3 } as never);

  // Vérifier : 3 programmes DISTINCTS pour la MÊME matière
  const progsFR = await db.programme.findMany({ where: { ecoleId: r.ecoleId, matiereId: fr!.id }, include: { niveau: true, chapitres: true } });
  check('3 programmes DISTINCTS pour le français (CP ≠ CE1 ≠ 6e)', progsFR.length === 3, `${progsFR.length}`);
  check('chacun a SES 3 chapitres propres', progsFR.every((p2: any) => p2.chapitres.length === 3));
  check('contenus bien DIFFÉRENTS par niveau', progsFR[0].chapitres[0].titre !== progsFR[1].chapitres[0].titre && progsFR[1].chapitres[0].titre !== progsFR[2].chapitres[0].titre,
    `${progsFR[0].chapitres[0].titre} / ${progsFR[1].chapitres[0].titre} / ${progsFR[2].chapitres[0].titre}`);

  console.log('\n═══ 6. VUE D ENSEMBLE — l enseignant voit SES classes ═══');
  const affectationsJB = await db.affectationEnseignant.findMany({ where: { personnelId: ens1.personnelId }, include: { classe: true, matiere: true } });
  console.log(`  Jean-Bernard enseigne : ${affectationsJB.map((a: any) => `${a.matiere.libelle} → ${a.classe.libelle}`).join(', ')}`);
  const affectationsAB = await db.affectationEnseignant.findMany({ where: { personnelId: ens2.personnelId }, include: { classe: true, matiere: true } });
  console.log(`  Aminata enseigne : ${affectationsAB.map((a: any) => `${a.matiere.libelle} → ${a.classe.libelle}`).join(', ')}`);
  check('Jean-Bernard : 3 classes (6e, 5e, 4e) en français seulement', affectationsJB.length === 3 && affectationsJB.every((a: any) => a.matiere.libelle.includes('Français')));
  check('Aminata : 4 affectations (maths + français × 2 classes CP)', affectationsAB.length === 4);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');
  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} CONFIG PÉDAGOGIQUE : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — PROCESS INTÉGRAL VALIDÉ'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('PEDAGO-COMPLET', main);
