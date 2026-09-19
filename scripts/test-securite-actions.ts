// ════════════════════════════════════════════════════════════════════
// AUDIT SÉCURITÉ DES ACTIONS — La barrière SERVEUR (pas seulement les menus cachés)
// 1. Un rôle qui tente une action hors périmètre → REFUS (ActionError)
// 2. Un rôle qui fait une action de SON périmètre → SUCCÈS
// 3. Multi-rôles : direction + enseignant → portail direction
// 4. Flux demande de compte publique → approbation avec rôle → compte opérationnel
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore, creerPersonnelCore, ActionError } from '../src/lib/business';
import { portailDuCompte } from '../src/lib/auth';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcole } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
async function doit(nom: string, fn: () => Promise<unknown>) {
  try { await fn(); check(nom, true); return true; }
  catch (e: any) { check(nom, false, e.message?.slice(0, 80)); return false; }
}
async function refuse(nom: string, fn: () => Promise<unknown>) {
  try { await fn(); check(nom, false, 'ACTION AUTORISÉE À TORT !'); return false; }
  catch (e: any) {
    const refuseProprement = e instanceof ActionError || /permission|refus|réserv/i.test(String(e?.message ?? ''));
    check(nom, refuseProprement, e.message?.slice(0, 80));
    return refuseProprement;
  }
}

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ Préparation : école + 9 comptes + données ═══');
  const r = await initialiserEcoleCore({
    nomEcole: `Securite Actions ${S}`, adminNom: 'Dir', adminPrenom: 'Test',
    adminEmail: `sec-dir-${S}@test.sn`, adminMotDePasse: 'Directeur123!',
  } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, permissions: new Set(['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir']) } as never;

  const ROLES_PERMS: Record<string, string[]> = {
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
  const users: Record<string, string> = {};
  for (const [role, perms] of Object.entries(ROLES_PERMS)) {
    const res = await creerPersonnelCore(ctxDir, r.ecoleId, {
      nom: `Sec${role}`, prenom: 'Agent', email: `sec-${role}-${S}@test.sn`, dateEmbauche: new Date(),
      typeContrat: 'CDI', salaireBrut: 200000, creerCompte: true, motDePasseInitial: 'Securite123!', roleCode: role,
    } as never);
    const u = await db.utilisateur.findFirst({ where: { email: `sec-${role}-${S}@test.sn` } });
    users[role] = u!.id;
    // ctx avec les permissions RÉELLES du rôle
    (users as any)[`${role}:ctx`] = { utilisateurId: u!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(perms) };
    check(`compte ${role}`, !!res.personnelId && !!u);
  }

  // Données de travail
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId } });
  const matiere = await db.matiere.create({ data: { ecoleId: r.ecoleId, code: 'MATHS', libelle: 'Mathématiques', coefficient: 2 } });
  const periode = await db.periode.findFirst({ where: { ecoleId: r.ecoleId } });
  const persProf = await db.personnel.findFirst({ where: { utilisateurId: users['enseignant'] } });
  const persInf = await db.personnel.findFirst({ where: { utilisateurId: users['infirmier'] } });
  const eleve = await db.eleve.create({ data: { ecoleId: r.ecoleId, matricule: `SEC-${S}`, nom: 'Fall', prenom: 'Aminata', dateNaissance: new Date('2013-01-15'), classeActuelleId: classe!.id } });
  const frais = await db.frais.create({ data: { ecoleId: r.ecoleId, anneeScolaireId: classe!.anneeScolaireId, niveauId: classe!.niveauId, libelle: 'Scolarité', montant: 1000000, periodicite: 'annuel', type: 'scolarite', devise: 'XOF' } });
  const echeance = await db.echeanceFrais.create({ data: { eleveId: eleve.id, fraisId: frais.id, montant: 1000000, montantPaye: 0, remise: 0, statut: 'impayee', devise: 'XOF', dateEcheance: new Date(Date.now() + 30 * 864e5) } as never });
  const seance = await db.seance.create({ data: { classeId: classe!.id, matiereId: matiere.id, enseignantId: persProf!.id, date: new Date(), heureDebut: '08:00', heureFin: '09:00' } as never });
  const evaluation = await db.evaluation.create({ data: { ecoleId: r.ecoleId, classeId: classe!.id, matiereId: matiere.id, enseignantId: persProf!.id, periodeId: periode!.id, type: 'devoir', intitule: 'Éval sécurité', date: new Date(), sur: 20, coefficient: 1 } });
  console.log('  ✓ données prêtes (élève, frais, échéance, séance, évaluation)');

  // Imports dynamiques des cores
  const biz = await import('../src/lib/business');

  console.log('\n═══ 1. ACTIONS HORS PÉRIMÈTRE → DOIT REFUSER ═══');
  const ctx = (role: string) => (users as any)[`${role}:ctx`];
  // Enseignant ne touche pas aux finances / élèves(inscription) / RH / santé
  await refuse('enseignant ✗ encaisser un paiement', () => biz.encaisserPaiementCore(ctx('enseignant'), { eleveId: eleve.id, montant: 100000, modePaiement: 'espece', echeanceId: echeance.id } as never));
  await refuse('enseignant ✗ créer un frais', () => biz.creerFraisCore(ctx('enseignant'), r.ecoleId, { libelle: 'Fraude', montant: 1, periodicite: 'unique', type: 'scolarite', devise: 'XOF', niveauId: classe!.niveauId } as never));
  await refuse('enseignant ✗ inscrire un élève', () => biz.inscrireEleveCore(ctx('enseignant'), r.ecoleId, { nom: 'X', prenom: 'Y', dateNaissance: new Date('2015-01-01'), lieuNaissance: 'Dakar', sexe: 'F', classeId: classe!.id } as never));
  await refuse('enseignant ✗ créer un personnel', () => biz.creerPersonnelCore(ctx('enseignant'), r.ecoleId, { nom: 'X', prenom: 'Y', dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 0, creerCompte: false } as never));
  await refuse('enseignant ✗ fiche santé', () => biz.enregistrerFicheSanteCore(ctx('enseignant'), { eleveId: eleve.id } as never));
  // Comptabilité ne touche pas à la pédagogie / inscriptions / sécurité
  await refuse('comptabilité ✗ saisir des notes', () => biz.saisirNotesCore(ctx('comptabilite'), { evaluationId: evaluation.id, notes: [{ eleveId: eleve.id, valeur: 10 }] } as never));
  await refuse('comptabilité ✗ inscrire un élève', () => biz.inscrireEleveCore(ctx('comptabilite'), r.ecoleId, { nom: 'X', prenom: 'Y', dateNaissance: new Date('2015-01-01'), lieuNaissance: 'Dakar', sexe: 'M', classeId: classe!.id } as never));
  await refuse('comptabilité ✗ traiter une demande de compte', () => biz.traiterDemandeCompteCore(ctx('comptabilite'), 'inexistant', 'refuse'));
  // RH / secrétariat / infirmier / censeur / surveillant
  await refuse('RH ✗ encaisser un paiement', () => biz.encaisserPaiementCore(ctx('rh'), { eleveId: eleve.id, montant: 100000, modePaiement: 'espece' } as never));
  await refuse('RH ✗ saisir des notes', () => biz.saisirNotesCore(ctx('rh'), { evaluationId: evaluation.id, notes: [{ eleveId: eleve.id, valeur: 10 }] } as never));
  await refuse('secrétariat ✗ encaisser un paiement', () => biz.encaisserPaiementCore(ctx('secretariat'), { eleveId: eleve.id, montant: 100000, modePaiement: 'espece' } as never));
  await refuse('secrétariat ✗ saisir des notes', () => biz.saisirNotesCore(ctx('secretariat'), { evaluationId: evaluation.id, notes: [{ eleveId: eleve.id, valeur: 10 }] } as never));
  await refuse('infirmier ✗ saisir des notes', () => biz.saisirNotesCore(ctx('infirmier'), { evaluationId: evaluation.id, notes: [{ eleveId: eleve.id, valeur: 10 }] } as never));
  await refuse('infirmier ✗ encaisser un paiement', () => biz.encaisserPaiementCore(ctx('infirmier'), { eleveId: eleve.id, montant: 100000, modePaiement: 'espece' } as never));
  await refuse('censeur ✗ encaisser un paiement', () => biz.encaisserPaiementCore(ctx('censeur'), { eleveId: eleve.id, montant: 100000, modePaiement: 'espece' } as never));
  await refuse('surveillant ✗ saisir des notes', () => biz.saisirNotesCore(ctx('surveillant'), { evaluationId: evaluation.id, notes: [{ eleveId: eleve.id, valeur: 10 }] } as never));
  await refuse('assistant ✗ encaisser un paiement', () => biz.encaisserPaiementCore(ctx('assistant_direction'), { eleveId: eleve.id, montant: 100000, modePaiement: 'espece' } as never));

  console.log('\n═══ 2. ACTIONS DE SON PÉRIMÈTRE → DOIT RÉUSSIR ═══');
  await doit('enseignant ✓ fait l appel', () => biz.saisirAppelCore(ctx('enseignant'), { seanceId: seance.id, presences: [{ eleveId: eleve.id, statut: 'present' }] } as never));
  await doit('enseignant ✓ crée une évaluation', () => biz.creerEvaluationCore(ctx('enseignant'), r.ecoleId, { classeId: classe!.id, matiereId: matiere.id, enseignantId: persProf!.id, periodeId: periode!.id, type: 'interrogation', intitule: 'Test permis', date: new Date(), sur: 20, coefficient: 1 } as never));
  await doit('comptabilité ✓ encaisse le paiement', () => biz.encaisserPaiementCore(ctx('comptabilite'), { eleveId: eleve.id, montant: 500000, modePaiement: 'espece', echeanceId: echeance.id } as never));
  await doit('secrétariat ✓ inscrit un élève', () => biz.inscrireEleveCore(ctx('secretariat'), r.ecoleId, { nom: 'Ndiaye', prenom: 'Aliou', dateNaissance: new Date('2014-03-20'), lieuNaissance: 'Thiès', sexe: 'M', classeId: classe!.id } as never));
  await doit('RH ✓ crée un personnel', () => biz.creerPersonnelCore(ctx('rh'), r.ecoleId, { nom: 'Sow', prenom: 'Fatou', dateEmbauche: new Date(), typeContrat: 'CDD', salaireBrut: 180000, creerCompte: false } as never));
  await doit('infirmier ✓ enregistre une fiche santé', () => biz.enregistrerFicheSanteCore(ctx('infirmier'), { eleveId: eleve.id, groupeSanguin: 'A+', poidsKg: 35, tailleCm: 140 } as never));
  await doit('censeur ✓ déclare un incident', () => biz.declarerIncidentCore(ctx('censeur'), { eleveId: eleve.id, dateHeure: new Date(), type: 'comportement', description: 'Retards répétés', gravite: 'leger' } as never));
  await doit('surveillant ✓ fait l appel', () => biz.saisirAppelCore(ctx('surveillant'), { seanceId: seance.id, presences: [{ eleveId: eleve.id, statut: 'retard' }] } as never));

  console.log('\n═══ 3. MULTI-RÔLES ═══');
  // Un utilisateur enseignant qui REÇOIT en plus le rôle direction → portail direction
  const roleDir = await db.role.findFirst({ where: { ecoleId: r.ecoleId, code: 'direction' } });
  await db.utilisateurRole.create({ data: { utilisateurId: users['enseignant'], roleId: roleDir!.id } });
  const multi = portailDuCompte('personnel', new Set([...ROLES_PERMS.direction, ...ROLES_PERMS.enseignant]), ['enseignant', 'direction']);
  check('multi-rôle enseignant+direction → portail direction', multi === 'direction', `obtenu ${multi}`);

  console.log('\n═══ 4. FLUX DEMANDE DE COMPTE PUBLIQUE ═══');
  const demande = await biz.demanderCompteCore({
    ecoleSlug: (await db.ecole.findUnique({ where: { id: r.ecoleId } }))!.slug,
    nom: 'Cissé', prenom: 'Mariama', email: `dem-${S}@test.sn`, motDePasse: 'Demande123!',
    type: 'personnel', roleDemande: 'enseignant', motivation: 'Nouvelle prof de SVT',
  } as never);
  check('demande publique créée (compte inactif)', !!demande?.demandeId || !!demande);
  const uDemande = await db.utilisateur.findFirst({ where: { email: `dem-${S}@test.sn` } });
  check('compte en attente INACTIF', uDemande?.actif === false);
  // La direction approuve avec un rôle différent (surveillant)
  if (demande?.demandeId) {
    await doit('direction ✓ approuve la demande (rôle surveillant)', () => biz.traiterDemandeCompteCore(ctxDir, demande.demandeId, 'approuve', undefined, 'surveillant'));
    const uApres = await db.utilisateur.findUnique({ where: { id: uDemande!.id }, include: { roles: { include: { role: true } } } });
    check('compte ACTIVÉ', uApres?.actif === true);
    check('rôle attribué = surveillant', uApres!.roles.some((x: any) => x.role.code === 'surveillant'));
    const permsDem = await db.rolePermission.findMany({ where: { roleId: { in: uApres!.roles.map((x: any) => x.roleId) } }, include: { permission: true } });
    const portailDem = portailDuCompte('personnel', new Set(permsDem.map((x: any) => x.permission.code)), uApres!.roles.map((x: any) => x.role.code));
    check('portail du demandeur = vie_scolaire', portailDem === 'vie_scolaire', `obtenu ${portailDem}`);
  }
  // Un enseignant NE PEUT PAS approuver une demande
  if (demande?.demandeId) {
    await refuse('enseignant ✗ approuver une demande de compte', () => biz.traiterDemandeCompteCore(ctx('enseignant'), demande.demandeId, 'refuse'));
  }

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcole(r.ecoleId);
  console.log(purge ? '✓ école de test supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} SÉCURITÉ DES ACTIONS : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — PARFAIT'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('SECURITE-ACTIONS', main);
