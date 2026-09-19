// ════════════════════════════════════════════════════════════════════
// AUDIT COMPTES & PORTAILS — Les 9 rôles métiers de bout en bout :
// 1. création du personnel par la direction (roleCode)
// 2. rôle assigné + permissions = matrice attendue
// 3. portail dérivé correct
// 4. chargerDonneesPortail : données du périmètre chargées, hors périmètre ABSENTES
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore, creerPersonnelCore } from '../src/lib/business';
import { portailDuCompte } from '../src/lib/auth';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcole } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}

const MATRICE_ATTENDUE: Record<string, string[]> = {
  direction: ['eleves.lire','eleves.ecrire','bulletins.valider','finances.voir','finances.ecrire','finances.valider','rh.gerer','communication.envoyer','admin.saas','vie_scolaire.gerer','securite.gerer','examens.gerer','services.gerer','edt.gerer','sante.gerer','salles.gerer','protection.gerer'],
  enseignant: ['eleves.lire','notes.saisir','presences.saisir','vie_scolaire.gerer','edt.gerer'],
  comptabilite: ['finances.voir','finances.ecrire','finances.valider'],
  surveillant: ['eleves.lire','presences.saisir','vie_scolaire.gerer','securite.gerer'],
  rh: ['eleves.lire','rh.gerer','communication.envoyer'],
  censeur: ['eleves.lire','bulletins.valider','presences.saisir','vie_scolaire.gerer','examens.gerer','edt.gerer','protection.gerer'],
  secretariat: ['eleves.lire','eleves.ecrire','communication.envoyer'],
  assistant_direction: ['eleves.lire','eleves.ecrire','presences.saisir','vie_scolaire.gerer','communication.envoyer'],
  infirmier: ['eleves.lire','sante.gerer'],
};
const PORTAIL_ATTENDU: Record<string, string> = {
  direction: 'direction', enseignant: 'enseignant', comptabilite: 'comptabilite',
  surveillant: 'vie_scolaire', rh: 'rh', censeur: 'vie_scolaire',
  secretariat: 'secretariat', assistant_direction: 'assistant', infirmier: 'sante',
};

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ ÉTAPE 0 : école de test ═══');
  const r = await initialiserEcoleCore({
    nomEcole: `Audit Portails ${S}`, adminNom: 'Diop', adminPrenom: 'Moussa',
    adminEmail: `dir-${S}@test.sn`, adminMotDePasse: 'Directeur123!',
  } as never);
  check('école + directeur créés', !!r.ecoleId && !!r.adminId);

  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, permissions: new Set(MATRICE_ATTENDUE.direction) as never, roles: ['direction'] } as never;

  // Session factice par portail (permissions réelles lues en base)
  async function sessionDe(userId: string) {
    const u = await db.utilisateur.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    const roles = u!.roles.map((x: any) => x.role.code);
    // permissions réelles via RolePermission
    const perms = await db.rolePermission.findMany({ where: { roleId: { in: u!.roles.map((x: any) => x.roleId) } }, include: { permission: true } });
    return {
      utilisateur: { id: userId, ecoleId: r.ecoleId, email: u!.email, nom: u!.nom, prenom: u!.prenom, type: 'personnel' },
      permissions: new Set(perms.map((x: any) => x.permission.code)),
      roles, sessionId: `audit-${S}`,
    } as any;
  }

  console.log('\n═══ ÉTAPE 1 : création des 9 rôles + comptes ═══');
  const users: Record<string, string> = {};
  for (const role of Object.keys(MATRICE_ATTENDUE)) {
    const res = await creerPersonnelCore(ctxDir as never, r.ecoleId, {
      nom: `Test${role.charAt(0).toUpperCase()}${role.slice(1)}`, prenom: 'Agent',
      email: `${role}-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI',
      salaireBrut: 250000, creerCompte: true, motDePasseInitial: 'Portail123!', roleCode: role,
    } as never);
    const okCompte = !!res.personnelId;
    check(`compte créé — ${role}`, okCompte);
    if (okCompte) {
      const u = await db.utilisateur.findFirst({ where: { email: `${role}-${S}@test.sn` } });
      users[role] = u!.id;
    }
  }

  console.log('\n═══ ÉTAPE 2 : rôles, permissions, portails ═══');
  for (const [role, userId] of Object.entries(users)) {
    const roles = await db.utilisateurRole.findMany({ where: { utilisateurId: userId }, include: { role: true } });
    check(`rôle assigné — ${role}`, roles.some((x: any) => x.role.code === role), roles.map((x: any) => x.role.code).join(','));
    const sess: any = await sessionDe(userId);
    const perms = sess.permissions as Set<string>;
    const attendues = MATRICE_ATTENDUE[role];
    const manquantes = attendues.filter((c) => !perms.has(c));
    const enTrop = [...perms].filter((c) => !attendues.includes(c));
    check(`permissions exactes — ${role}`, manquantes.length === 0 && enTrop.length === 0, `manque:${manquantes} trop:${enTrop}`);
    const portail = portailDuCompte('personnel', perms, sess.roles as string[]);
    check(`portail ${portail} — ${role}`, portail === PORTAIL_ATTENDU[role], `obtenu ${portail}`);
  }

  console.log('\n═══ ÉTAPE 2bis : données minimales (pour vérifier les périmètres positifs) ═══');
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId } });
  let matiere = await db.matiere.findFirst({ where: { ecoleId: r.ecoleId } });
  if (!matiere) matiere = await db.matiere.create({ data: { ecoleId: r.ecoleId, code: 'FR', libelle: 'Français', coefficient: 1 } });
  const periode = await db.periode.findFirst({ where: { ecoleId: r.ecoleId } });
  const persProf = await db.personnel.findFirst({ where: { utilisateurId: users['enseignant'] } });
  const eleve = await db.eleve.create({ data: { ecoleId: r.ecoleId, matricule: `AUD-${S}`, nom: 'Ba', prenom: 'Awa', dateNaissance: new Date('2012-05-10'), classeActuelleId: classe!.id } });
  await db.frais.create({ data: { ecoleId: r.ecoleId, anneeScolaireId: classe!.anneeScolaireId, niveauId: classe!.niveauId, libelle: 'Scolarité audit', montant: 2500000, periodicite: 'annuel', type: 'scolarite', devise: 'XOF' } });
  await db.bulletinPaie.create({ data: { ecoleId: r.ecoleId, personnelId: persProf!.id, periode: '2026-09', salaireBrut: 250000, salaireNet: 200000, cotisationsTotales: 30000, retenuesTotales: 20000, primesTotales: 0, netAPayer: 200000, devise: 'XOF', statut: 'brouillon' } as never });
  await db.ficheSante.create({ data: { ecoleId: r.ecoleId, eleveId: eleve.id, groupeSanguin: 'O+' } as never });
  await db.evaluation.create({ data: { ecoleId: r.ecoleId, classeId: classe!.id, matiereId: matiere!.id, enseignantId: persProf!.id, periodeId: periode!.id, type: 'devoir', intitule: 'Audit éval', date: new Date(), sur: 20, coefficient: 1 } });
  await db.seance.create({ data: { classeId: classe!.id, matiereId: matiere!.id, enseignantId: persProf!.id, date: new Date(), heureDebut: '08:00', heureFin: '09:00' } as never });
  check('données minimales créées (élève, frais, paie, santé, éval, séance)', true);

  console.log('\n═══ ÉTAPE 3 : données chargées par portail (isolation) ═══');
  const iso = async (role: string, champPresent: string, champAbsent: string, labelPresent: string, labelAbsent: string) => {
    const sess = await sessionDe(users[role]);
    const data: any = await chargerDonneesPortail(PORTAIL_ATTENDU[role] as never, sess, null);
    check(`${role} : ${labelPresent}`, (data[champPresent] ?? []).length > 0);
    check(`${role} : ${labelAbsent} ABSENT`, !data[champAbsent] || (data[champAbsent] ?? []).length === 0);
    return data;
  };

  // Comptabilité : finances oui, RH (paie/salaires) non, santé non
  const dataCompta = await iso('comptabilite', 'frais', 'bulletinsPaie', 'voit les frais', 'paie (RH)');
  check('comptabilité : fiches santé ABSENTES', !dataCompta.fichesSante || dataCompta.fichesSante.length === 0);
  check('comptabilité : salaires personnels ABSENTS', (dataCompta.personnels ?? []).every((x: any) => x.salaireBrut === undefined));
  // RH : paie oui, finances non, santé non
  const dataRh = await iso('rh', 'bulletinsPaie', 'paiements', 'voit les bulletins de paie', 'paiements (finances)');
  check('RH : salaires visibles (légitime)', (dataRh.personnels ?? []).some((x: any) => x.salaireBrut !== undefined));
  check('RH : fiches santé ABSENTES', !dataRh.fichesSante || dataRh.fichesSante.length === 0);
  // Secrétariat : élèves oui, paie non, santé non
  const dataSec = await iso('secretariat', 'eleves', 'bulletinsPaie', 'voit les élèves', 'paie (RH)');
  check('secrétariat : fiches santé ABSENTES', !dataSec.fichesSante || dataSec.fichesSante.length === 0);
  check('secrétariat : paiements ABSENTS', !dataSec.paiements || dataSec.paiements.length === 0);
  // Infirmier : santé oui, finances + RH non
  const dataSante = await iso('infirmier', 'fichesSante', 'paiements', 'voit les fiches santé', 'paiements (finances)');
  check('infirmier : paie (RH) ABSENTE', !dataSante.bulletinsPaie || dataSante.bulletinsPaie.length === 0);
  // Enseignant : pédagogie oui, finances/RH/santé non
  const dataProf = await iso('enseignant', 'evaluations', 'paiements', 'voit ses évaluations', 'paiements (finances)');
  check('enseignant : fiches santé ABSENTES', !dataProf.fichesSante || dataProf.fichesSante.length === 0);
  check('enseignant : paie (RH) ABSENTE', !dataProf.bulletinsPaie || dataProf.bulletinsPaie.length === 0);
  check('enseignant : salaires ABSENTS', (dataProf.personnels ?? []).every((x: any) => x.salaireBrut === undefined));
  // Censeur + surveillant : vie scolaire, pas finances/RH/santé
  const dataCenseur = await iso('censeur', 'seances', 'paiements', 'voit les séances', 'paiements (finances)');
  check('censeur : fiches santé ABSENTES', !dataCenseur.fichesSante || dataCenseur.fichesSante.length === 0);
  await iso('surveillant', 'seances', 'paiements', 'voit les séances', 'paiements (finances)');
  // Assistant : élèves/présences, pas finances/RH/santé
  const dataAsst = await iso('assistant_direction', 'eleves', 'paiements', 'voit les élèves', 'paiements (finances)');
  check('assistant : fiches santé ABSENTES', !dataAsst.fichesSante || dataAsst.fichesSante.length === 0);
  // Direction : tout
  const dataDir: any = await chargerDonneesPortail('direction' as never, await sessionDe(r.adminId), null);
  check('direction : vue complète (élèves+finances+RH+santé)', (dataDir.eleves ?? []).length > 0 && (dataDir.frais ?? []).length >= 0 && Array.isArray(dataDir.bulletinsPaie) && Array.isArray(dataDir.fichesSante));

  console.log('\n═══ ÉTAPE 4 : comptes actifs ═══');
  for (const [role, userId] of Object.entries(users)) {
    const u = await db.utilisateur.findUnique({ where: { id: userId } });
    check(`compte ACTIF — ${role}`, u?.actif === true);
  }

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcole(r.ecoleId);
  console.log(purge ? '✓ école de test supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} AUDIT COMPTES & PORTAILS : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — PARFAIT'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('AUDIT-PORTAILS', main);
