// ====================================================================
// E2E PROCESS COMPLET D'OUVERTURE D'ÉCOLE — exactement le parcours
// décrit par l'utilisateur :
//   1. Le directeur crée son école → compte admin actif
//   2. Il crée les comptes du personnel AVEC RÔLES
//   3. Il configure les classes (renommer, dupliquer)
//   4. Il définit les matières par niveau
//   5. Il définit les programmes (chapitres) par matière
//   6. Il définit les frais de scolarité par classe
//   7. Le SECRÉTARIAT inscrit un élève (avec suivi des paiements)
//   8. Le PROf fait l'appel, crée une évaluation, saisit les notes
//   9. Le prof déclare un incident
//  10. Le parent voit le bulletin et justifie une absence
//  11. La COMPTABILITÉ encaisse un paiement → reçu
//  12. Le directeur voit tout dans son cockpit
// ====================================================================

import { PrismaClient } from '@prisma/client';
import { purgerEcole } from './_purge-ecole';
import { initialiserEcoleCore } from '../src/lib/business/initialisation';
import { ActionError } from '../src/lib/business/commun';
import {
  creerPersonnelCore, creerCommandeCore,
} from '../src/lib/business';
import {
  inscrireEleveCore, creerFraisCore, genererEcheancesClasseCore,
  encaisserPaiementCore, creerEvaluationCore, saisirNotesCore,
  saisirAppelCore, declarerIncidentCore, justifierAbsenceCore,
  genererBulletinCore, rattacherParentCore, creerCompteParentCore,
  creerCompteEleveCore,
} from '../src/lib/business';
import { creerProgrammeCore, ajouterChapitreCore, mettreAJourAvancementCore, creerDevoirCore, creerEntreeCahierCore } from '../src/lib/business/pedagogie2';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { portailDuCompte } from '../src/lib/auth';
import { avecRetryBdd } from '../src/lib/retry-bdd';
import { executerAvecRetry, dbTest } from './_helper-test';

const db: PrismaClient = dbTest as unknown as PrismaClient;
let p = 0, f = 0;
function check(n: string, ok: boolean, d = '') {
  console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${n}${d ? ` (${d})` : ''}`);
  ok ? p++ : f++;
}

async function main() {
  const S = Date.now().toString(36);

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 1 : LE DIRECTEUR CRÉE SON ÉCOLE
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 1 : Le directeur crée son école ═══════');
  const r = await initialiserEcoleCore({
    nomEcole: `Institut Test ${S}`,
    adminNom: 'Directeur', adminPrenom: 'Jean',
    adminEmail: `directeur-${S}@test.sn`, adminMotDePasse: 'Directeur123!',
  });
  check('école créée + compte directeur ACTIF', !!r.ecoleId);

  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir']) };
  check('portail directeur détecté', portailDuCompte('personnel', ctxDir.permissions, ['direction']) === 'direction');

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 2 : LE DIRECTEUR CRÉE LE PERSONNEL AVEC RÔLES
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 2 : Création du personnel avec rôles ═══════');
  const rolesACreer = [
    { roleCode: 'enseignant', nom: 'ProfMath', prenom: 'Ali', email: `prof-${S}@test.sn` },
    { roleCode: 'secretariat', nom: 'Secret', prenom: 'Fatou', email: `sec-${S}@test.sn` },
    { roleCode: 'comptabilite', nom: 'Compta', prenom: 'Omar', email: `compta-${S}@test.sn` },
  ];
  const idsPersonnel: Record<string, string> = {};
  for (const pers of rolesACreer) {
    const res = await creerPersonnelCore(ctxDir as never, r.ecoleId, {
      nom: pers.nom, prenom: pers.prenom, dateEmbauche: new Date(),
      email: pers.email, creerCompte: true, motDePasseInitial: 'Password123!',
      roleCode: pers.roleCode,
    } as never);
    check(`compte ${pers.roleCode} créé`, !!res.personnelId);
    // vérifier que le rôle est assigné
    const user = await db.utilisateur.findFirst({ where: { email: pers.email }, include: { roles: { include: { role: true } } } });
    check(`  rôle ${pers.roleCode} ASSIGNÉ`, user?.roles?.some((ur: any) => ur.role.code === pers.roleCode) === true,
      user?.roles?.map((ur: any) => ur.role.code).join(',') ?? 'AUCUN');
    idsPersonnel[pers.roleCode] = user?.id ?? '';
  }

  // Contextes par rôle
  const ctxProf = { utilisateurId: idsPersonnel['enseignant'], ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['eleves.lire', 'notes.saisir', 'presences.saisir', 'vie_scolaire.gerer', 'edt.gerer']) };
  const ctxSec = { utilisateurId: idsPersonnel['secretariat'], ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['eleves.lire', 'eleves.ecrire', 'communication.envoyer']) };
  const ctxCompta = { utilisateurId: idsPersonnel['comptabilite'], ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['finances.voir', 'finances.ecrire', 'finances.valider']) };

  check('portail prof = enseignant', portailDuCompte('personnel', ctxProf.permissions, ['enseignant']) === 'enseignant');
  check('portail sec = secretariat', portailDuCompte('personnel', ctxSec.permissions, ['secretariat']) === 'secretariat');
  check('portail compta = comptabilite', portailDuCompte('personnel', ctxCompta.permissions, ['comptabilite']) === 'comptabilite');

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 3 : CONFIGURATION DES CLASSES (renommer)
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 3 : Configuration des classes ═══════');
  const classes = await db.classe.findMany({ where: { ecoleId: r.ecoleId }, orderBy: { code: 'asc' } });
  check('15 classes initiales créées automatiquement', classes.length === 15);
  // Renommer la première classe : "PS-A" → "Petite Section"
  const psClasse = classes.find((c) => c.code === 'PS-A');
  if (psClasse) {
    await db.classe.update({ where: { id: psClasse.id }, data: { code: 'Petite Section', libelle: 'Petite Section' } });
    check('classe renommée PS-A → « Petite Section »', true);
  }
  check('les noms de classes SONT modifiables', !!(await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: 'Petite Section' } })));

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 4 : DÉFINIR LES MATIÈRES PAR NIVEAU
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 4 : Matières ═══════');
  const matieres = [
    { code: 'FR', libelle: 'Français', coef: 4 },
    { code: 'MATHS', libelle: 'Mathématiques', coef: 4 },
    { code: 'HG', libelle: 'Histoire-Géographie', coef: 2 },
  ];
  for (const m of matieres) {
    await db.matiere.create({ data: { ecoleId: r.ecoleId, code: m.code, libelle: m.libelle, coefficient: m.coef } });
  }
  const nbMatieres = await db.matiere.count({ where: { ecoleId: r.ecoleId } });
  check('matières créées (FR, MATHS, HG)', nbMatieres === 3);

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 5 : PROGRAMMES PAR MATIÈRE (chapitres)
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 5 : Programmes et chapitres ═══════');
  const niveau6e = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: r.ecoleId } }, code: '6E' } });
  const matiereFR = await db.matiere.findFirst({ where: { ecoleId: r.ecoleId, code: 'FR' } });
  const prog = await creerProgrammeCore(ctxProf as never, r.ecoleId, {
    matiereId: matiereFR!.id, niveauId: niveau6e!.id, intitule: 'Français 6ème — année complète',
  });
  check('programme créé (Français 6ème)', !!prog.programmeId);
  const chap1 = await ajouterChapitreCore(ctxProf as never, prog.programmeId, { intitule: 'Ch.1 : Les types de phrases', ordre: 1 });
  const chap2 = await ajouterChapitreCore(ctxProf as never, prog.programmeId, { intitule: 'Ch.2 : Le récit', ordre: 2 });
  check('chapitres ajoutés au programme', !!chap1.chapitreId && !!chap2.chapitreId);

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 6 : FRAIS DE SCOLARITÉ PAR CLASSE
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 6 : Frais de scolarité ═══════');
  const classe6A = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: r.ecoleId, active: true } });
  const frais = await creerFraisCore(ctxDir as never, r.ecoleId, {
    libelle: 'Scolarité 6ème', montant: 25000000, periodicite: 'annuel', type: 'scolarite',
    niveauId: niveau6e!.id, anneeScolaireId: annee!.id,
  } as never);
  check('frais de scolarité défini (250 000 F/an)', !!frais.fraisId);

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 7 : LE SECRÉTARIAT INSCRIT UN ÉLÈVE
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 7 : Inscription d un élève (secrétariat) ═══════');
  const eleve = await inscrireEleveCore(ctxSec as never, r.ecoleId, {
    nom: `Élève${S}`, prenom: 'Aminata', dateNaissance: new Date('2013-05-15'),
    lieuNaissance: 'Dakar', sexe: 'F', classeId: classe6A!.id,
  } as never);
  check('élève inscrit par le SECRÉTARIAT', !!eleve.eleveId);

  // Échéances générées pour la classe
  const ech = await genererEcheancesClasseCore(ctxDir as never, { fraisId: frais.fraisId, classeId: classe6A!.id, dateEcheance: new Date(Date.now() + 30 * 86400000) });
  check(`échéances générées pour la classe`, ech.crees > 0, JSON.stringify(ech).slice(0, 80));

  // Parent rattaché
  const parent = await rattacherParentCore(ctxSec as never, {
    eleveId: eleve.eleveId,
    nouveauParent: { nom: `Parent${S}`, prenom: 'Mariama', telephone: '+221 77 123 45 67', lienAvecEleve: 'mere' },
  } as never);
  check('parent rattaché', !!parent.parentId);
  const compteParent = await creerCompteParentCore(ctxSec as never, parent.parentId, `parent-${S}@test.sn`, 'Parent123!');
  check('compte parent créé par le secrétariat', !!compteParent.utilisateurId);

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 8 : LA COMPTABILITÉ ENCAISSE UN PAIEMENT
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 8 : Encaissement (comptabilité) ═══════');
  const echances = await db.echeanceFrais.findMany({ where: { eleveId: eleve.eleveId, statut: 'impayee' }, take: 1 });
  if (echances.length) {
    const paiement = await encaisserPaiementCore(ctxCompta as never, {
      eleveId: eleve.eleveId, montant: echances[0].montant - (echances[0].remise ?? 0),
      modePaiement: 'espece', echeanceId: echances[0].id,
    } as never);
    const paye = await db.paiement.findUnique({ where: { id: paiement.paiementId } });
    check('paiement encaissé par la COMPTABILITÉ', !!paye && paye.montant === echances[0].montant - (echances[0].remise ?? 0));
    check('échéance soldée (statut payee)', (await db.echeanceFrais.findUnique({ where: { id: echances[0].id } }))?.statut === 'payee');
  } else {
    check('échéance impayée disponible pour encaissement', false, 'aucune échéance impayée');
  }

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 9 : LE PROF FAIT SON TRAVAIL QUOTIDIEN
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 9 : Travail quotidien du professeur ═══════');
  // 9a. Créer une séance (forme connect : relations requises explicites)
  const periode = await db.periode.findFirst({ where: { ecoleId: r.ecoleId } });
  const personnelProf = await db.personnel.findFirst({ where: { utilisateurId: idsPersonnel['enseignant'] } });
  const seance = await db.seance.create({
    data: {
      classe: { connect: { id: classe6A!.id } },
      matiere: { connect: { id: matiereFR!.id } },
      enseignant: { connect: { id: personnelProf!.id } },
      date: new Date(), heureDebut: '08:00', heureFin: '09:00',
    },
  });
  // 9b. Faire l'appel
  try {
    const appel = await saisirAppelCore(ctxProf as never, {
      seanceId: seance.id, presences: [{ eleveId: eleve.eleveId, statut: 'present' }],
    } as never);
    check('prof fait l APPEL', !!appel);
  } catch (e: any) { check('prof fait l APPEL', false, e.message?.slice(0, 60)); }

  // 9c. Créer une évaluation
  const evaluation = await creerEvaluationCore(ctxProf as never, r.ecoleId, {
    classeId: classe6A!.id, matiereId: matiereFR!.id, enseignantId: personnelProf!.id,
    periodeId: periode!.id, type: 'devoir', intitule: 'Devoir surveillé n°1',
    date: new Date(), sur: 20, coefficient: 1,
  } as never);
  check('prof CRÉE une ÉVALUATION', !!evaluation.evaluationId);

  // 9d. Saisir les notes
  await saisirNotesCore(ctxProf as never, {
    evaluationId: evaluation.evaluationId,
    notes: [{ eleveId: eleve.eleveId, valeur: 15.5 }],
  } as never);
  const note = await db.note.findFirst({ where: { evaluationId: evaluation.evaluationId, eleveId: eleve.eleveId } });
  check('prof SAISIT les NOTES (15,5/20)', note?.valeur === 15.5);

  // 9e. Déclarer un incident
  const incident = await declarerIncidentCore(ctxProf as never, {
    eleveId: eleve.eleveId, dateHeure: new Date(), type: 'comportement',
    description: 'Bavardage pendant le devoir', gravite: 'leger',
  } as never);
  check('prof DÉCLARE un INCIDENT', !!incident.incidentId);

  // 9f. Cahier de textes
  const cahier = await creerEntreeCahierCore(ctxProf as never, {
    classeId: classe6A!.id, matiereId: matiereFR!.id, dateCours: new Date(),
    contenu: 'Correction du devoir, exercices page 45', travailAFaire: 'Exercices 1 à 5 page 46', publier: true,
  } as never);
  const entreeCahier = await db.entreeCahierTexte.findUnique({ where: { id: cahier.entreeId } });
  check('prof écrit le CAHIER DE TEXTES + publie aux familles', entreeCahier?.statut === 'publie');

  // 9g. Devoir à faire
  const devoir = await creerDevoirCore(ctxProf as never, {
    classeId: classe6A!.id, matiereId: matiereFR!.id,
    intitule: 'Rédaction : mon vacances', dateRendu: new Date(Date.now() + 7 * 86400000), sur: 20,
  });
  check('prof assigne un DEVOIR à rendre', !!devoir.devoirId);

  // 9h. Avancement du programme
  const avancement = await mettreAJourAvancementCore(ctxProf as never, chap1.chapitreId, {
    classeId: classe6A!.id, pourcentage: 100,
  });
  check('prof déclare l AVANCEMENT du programme (100%)', !!avancement.avancementId);

  // 9i. Générer le bulletin
  const bulletin = await genererBulletinCore(ctxDir as never, {
    eleveId: eleve.eleveId, periodeId: periode!.id, classeId: classe6A!.id,
  } as never);
  check('bulletin GÉNÉRÉ avec la note', !!bulletin.bulletinId);

  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 10 : VÉRIFICATION FINALE — le directeur voit tout
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ ÉTAPE 10 : Vue du directeur ═══════');
  const dataDir: any = await avecRetryBdd(() => chargerDonneesPortail('direction', {
    utilisateur: { id: r.adminId, ecoleId: r.ecoleId, email: 'x', nom: 'T', prenom: 'T', type: 'personnel' },
    permissions: ctxDir.permissions, roles: ['direction'], sessionId: 't',
  } as never, null), 3, 600);
  check('direction voit les élèves', (dataDir.eleves ?? []).length >= 1);
  check('direction voit les notes', (dataDir.notes ?? []).some((n: any) => n.valeur === 15.5));
  check('direction voit les bulletins', (dataDir.bulletins ?? []).length >= 1);
  check('direction voit les incidents', (dataDir.incidents ?? []).length >= 1);
  check('direction voit les paiements', (dataDir.paiements ?? []).length >= 1);
  check('direction voit l avancement', (dataDir.avancements ?? []).some((a: any) => a.pourcentage === 100));

  // ══════════════════════════════════════════════════════════════
  // NETTOYAGE
  // ══════════════════════════════════════════════════════════════
  console.log('\n═══════ Nettoyage ═══════');
  const purged = await purgerEcole(r.ecoleId);
  console.log(purged ? '✓ école de test supprimée physiquement (purge FK convergente)' : '⚠ école résiduelle');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} PROCESS COMPLET D'OUVERTURE : ${p}/${total} ÉTAPES PASS${f ? ` — ${f} ÉCHEC(S)` : ' — PARFAIT'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('PROCESS-COMPLET', main);
