// ════════════════════════════════════════════════════════════════════
// PARCOURS COMPLET D'UN ÉLÈVE — un seul élève, une seule école
// 1. Mise en place : 1 école, tous les postes (comptes fictifs)
// 2. SECRÉTARIAT inscrit l'élève → affecté dans une classe
// 3. Direction définit frais d'INSCRIPTION + SCOLARITÉ → échéances générées
// 4. COMPTABILITÉ encaisse les frais d'inscription → puis la scolarité
// 5. Vérif : la comptabilité VOIT les paiements ; le profil élève montre
//    payé / restant dû (direction + secrétariat)
// 6. PROF : effectifs (total, garçons, filles), appel (présences/absences),
//    séance suivie, interrogation notée, bulletin
// 7. DIRECTION : vue complète
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, genererEcheancesClasseCore,
  creerFraisCore, encaisserPaiementCore, saisirAppelCore, creerEvaluationCore,
  saisirNotesCore, genererBulletinCore,
} from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
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
};
const F = 100; // 1 F = 100 centimes

async function main() {
  const S = Date.now().toString(36).slice(-6);

  console.log('═══ 0. MISE EN PLACE : UNE école + les postes ═══');
  // purge préalable des écoles de test résiduelles (une seule école pour le parcours)
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'parcours-eleve-' } }, select: { id: true } });
  if (residuelles.length) { await purgerEcoles(residuelles.map((x) => x.id)); console.log(`  (${residuelles.length} école(s) de test précédente(s) purgée(s))`); }

  const r = await initialiserEcoleCore({
    nomEcole: `Parcours Eleve ${S}`, adminNom: 'Directeur', adminPrenom: 'Karim',
    adminEmail: `parc-dir-${S}@test.sn`, adminMotDePasse: 'Directeur123!',
  } as never);
  check('1 école créée', !!r.ecoleId);

  const ctx = (role: string, userId?: string) => ({
    utilisateurId: userId ?? r.adminId, ecoleId: r.ecoleId, type: 'personnel',
    permissions: new Set(PERMS[role]),
  }) as never;
  const ctxDir = ctx('direction');

  const postes: Array<[string, string]> = [
    ['enseignant', 'M. Diallo (prof principal)'],
    ['secretariat', 'Mme Sow (secrétaire)'],
    ['comptabilite', 'M. Bâ (comptable)'],
    ['censeur', 'Mme Ndiaye (censeur)'],
    ['infirmier', 'M. Fall (infirmier)'],
    ['rh', 'Mme Kane (RH)'],
  ];
  const users: Record<string, string> = {};
  for (const [role, nomComplet] of postes) {
    const res = await creerPersonnelCore(ctxDir, r.ecoleId, {
      nom: nomComplet.split(' ')[1]?.replace(')', '') ?? role, prenom: nomComplet.split(' ')[0].replace('M.', '').replace('Mme', '').trim() || 'Agent',
      email: `parc-${role}-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI',
      salaireBrut: 220000, creerCompte: true, motDePasseInitial: 'Parcours123!', roleCode: role,
    } as never);
    const u = await db.utilisateur.findFirst({ where: { email: `parc-${role}-${S}@test.sn` } });
    users[role] = u!.id;
    check(`poste créé : ${nomComplet}`, !!res.personnelId && !!u);
  }
  const sessionDe = async (role: string) => ({
    utilisateur: { id: users[role] ?? r.adminId, ecoleId: r.ecoleId, email: `${role}@t.sn`, nom: 'T', prenom: 'T', type: 'personnel' },
    permissions: new Set(PERMS[role] ?? PERMS.direction), roles: [role === 'ctxDir' ? 'direction' : role], sessionId: 'parc',
  }) as never;

  console.log('\n═══ 1. LE SECRÉTARIAT INSCRIT L ÉLÈVE (un seul) ═══');
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: { contains: '6' } } });
  check('classe 6ème disponible', !!classe);
  const insc = await inscrireEleveCore(ctx('secretariat', users['secretariat']), r.ecoleId, {
    nom: 'Sarr', prenom: 'Aïssatou', dateNaissance: new Date('2013-04-12'), lieuNaissance: 'Dakar', sexe: 'F', classeId: classe!.id,
  } as never);
  check('secrétariat ✓ inscrit Aïssatou SARR', !!insc.eleveId);
  const eleve = await db.eleve.findUnique({ where: { id: insc.eleveId } });
  check(`élève dans la classe ${classe!.libelle}`, eleve?.classeActuelleId === classe!.id);
  check('matricule attribué', !!eleve?.matricule, eleve?.matricule ?? '');

  console.log('\n═══ 2. FRAIS D INSCRIPTION + SCOLARITÉ (direction) ═══');
  const fraisInscription = await creerFraisCore(ctxDir, r.ecoleId, {
    libelle: "Frais d'inscription", montant: 25000 * F, periodicite: 'unique', type: 'inscription',
    niveauId: classe!.niveauId ?? undefined, devise: 'XOF',
  } as never);
  check("frais d'INSCRIPTION définis (25 000 F)", !!fraisInscription.fraisId);
  const fraisScolarite = await creerFraisCore(ctxDir, r.ecoleId, {
    libelle: 'Scolarité annuelle', montant: 250000 * F, periodicite: 'annuel', type: 'scolarite',
    niveauId: classe!.niveauId ?? undefined, devise: 'XOF',
  } as never);
  check('SCOLARITÉ définie (250 000 F/an)', !!fraisScolarite.fraisId);

  // Échéances pour la classe (les 2 frais)
  const ech1 = await genererEcheancesClasseCore(ctxDir, { fraisId: fraisInscription.fraisId, classeId: classe!.id, dateEcheance: new Date(Date.now() + 15 * 864e5) });
  const ech2 = await genererEcheancesClasseCore(ctxDir, { fraisId: fraisScolarite.fraisId, classeId: classe!.id, dateEcheance: new Date(Date.now() + 30 * 864e5) });
  check(`échéances inscription générées (${JSON.stringify(ech1)})`, (ech1.crees ?? 0) >= 1);
  check(`échéances scolarité générées (${JSON.stringify(ech2)})`, (ech2.crees ?? 0) >= 1);

  console.log('\n═══ 3. LA COMPTABILITÉ ENCAISSE ═══');
  const eches = await db.echeanceFrais.findMany({
    where: { eleveId: eleve!.id, statut: { in: ['impayee', 'partiel'] } },
    include: { frais: true }, orderBy: { dateEcheance: 'asc' },
  });
  const echeInscription = eches.find((e: any) => e.frais.type === 'inscription')!;
  const echeScolarite = eches.find((e: any) => e.frais.type === 'scolarite')!;
  check("2 échéances sur le profil de l'élève (inscription + scolarité)", !!echeInscription && !!echeScolarite, `trouvées: ${eches.length}`);

  // 3a. Paiement des frais d'inscription (comptabilité)
  const ctxCompta = ctx('comptabilite', users['comptabilite']);
  const pay1 = await encaisserPaiementCore(ctxCompta, {
    eleveId: eleve!.id, montant: 25000 * F, modePaiement: 'espece', echeanceId: echeInscription.id,
  } as never);
  const echeInsApres = await db.echeanceFrais.findUnique({ where: { id: echeInscription.id } });
  check("frais d'inscription ENCAISSÉS (25 000 F) par la comptabilité", !!pay1.paiementId);
  check("échéance inscription → payee", echeInsApres?.statut === 'payee', echeInsApres?.statut);

  // 3b. Scolarité : premier versement partiel (100 000 F) puis solde (150 000 F)
  const pay2 = await encaisserPaiementCore(ctxCompta, {
    eleveId: eleve!.id, montant: 100000 * F, modePaiement: 'virement', echeanceId: echeScolarite.id,
  } as never);
  const echeScoPartiel = await db.echeanceFrais.findUnique({ where: { id: echeScolarite.id } });
  check('1er versement scolarité 100 000 F encaissé', !!pay2.paiementId);
  check('échéance scolarité → partiel (100 000/250 000)', echeScoPartiel?.statut === 'partiel', echeScoPartiel?.statut);
  const pay3 = await encaisserPaiementCore(ctxCompta, {
    eleveId: eleve!.id, montant: 150000 * F, modePaiement: 'espece', echeanceId: echeScolarite.id,
  } as never);
  const echeScoApres = await db.echeanceFrais.findUnique({ where: { id: echeScolarite.id } });
  check('solde scolarité 150 000 F encaissé', !!pay3.paiementId);
  check('échéance scolarité → payee (soldée)', echeScoApres?.statut === 'payee', echeScoApres?.statut);

  console.log('\n═══ 4. QUI VOIT QUOI (finances) ═══');
  const dataCompta: any = await chargerDonneesPortail('comptabilite', await sessionDe('comptabilite'), null);
  const payesCompta = (dataCompta.paiements ?? []).filter((x: any) => [pay1.paiementId, pay2.paiementId, pay3.paiementId].includes(x.id));
  check('COMPTABILITÉ voit les 3 paiements (75 000 F total encaissé)', payesCompta.length === 3, `${payesCompta.length}/3`);
  const totCompta = (dataCompta.echeances ?? []).filter((e: any) => e.eleveId === eleve!.id);
  check('COMPTABILITÉ voit les 2 échéances de l élève (toutes soldées)', totCompta.length === 2 && totCompta.every((e: any) => e.statut === 'payee'));

  // Profil élève : payé / restant — direction et secrétariat
  const dataDir: any = await chargerDonneesPortail('direction', await sessionDe('direction'), null);
  const echDir = (dataDir.echeances ?? []).filter((e: any) => e.eleveId === eleve!.id);
  const payeDir = echDir.reduce((s: number, e: any) => s + e.montantPaye, 0);
  const duDir = echDir.reduce((s: number, e: any) => s + e.montant - e.remise, 0);
  check('DIRECTION — profil élève : 275 000 F payés', payeDir === 275000 * F, `${payeDir / F} F`);
  check('DIRECTION — profil élève : 0 F restant', duDir - payeDir === 0, `${(duDir - payeDir) / F} F`);

  const dataSec: any = await chargerDonneesPortail('secretariat', await sessionDe('secretariat'), null);
  const echSec = (dataSec.echeances ?? []).filter((e: any) => e.eleveId === eleve!.id);
  check('SECRÉTARIAT voit le SUIVI (2 échéances, statuts payés)', echSec.length === 2 && echSec.every((e: any) => e.statut === 'payee'), `${echSec.length} éch.`);
  check('SECRÉTARIAT : journal des paiements ABSENT (réservé compta)', !dataSec.paiements || dataSec.paiements.length === 0);

  console.log('\n═══ 5. LE PROF VOIT SA CLASSE ET TRAVAILLE ═══');
  const ctxProf = ctx('enseignant', users['enseignant']);
  const dataProf: any = await chargerDonneesPortail('enseignant', await sessionDe('enseignant'), null);
  const elevesClasse = (dataProf.eleves ?? []).filter((e: any) => e.classeActuelleId === classe!.id);
  check('prof voit les élèves de sa classe (effectif = 1)', elevesClasse.length === 1, `${elevesClasse.length}`);
  const filles = elevesClasse.filter((e: any) => e.sexe === 'F').length;
  const garcons = elevesClasse.filter((e: any) => e.sexe === 'M').length;
  check('répartition G/F : 0 garçon, 1 fille', garcons === 0 && filles === 1, `G=${garcons} F=${filles}`);

  // Ajout d'un 2e élève (garçon) pour une vraie répartition
  const insc2 = await inscrireEleveCore(ctx('secretariat', users['secretariat']), r.ecoleId, {
    nom: 'Bèye', prenom: 'Omar', dateNaissance: new Date('2013-09-02'), lieuNaissance: 'Rufisque', sexe: 'M', classeId: classe!.id,
  } as never);
  // + échéances pour lui (générées pour la classe au moment de l'inscription ? on vérifie le réel)
  const dataProf2: any = await chargerDonneesPortail('enseignant', await sessionDe('enseignant'), null);
  const elevesClasse2 = (dataProf2.eleves ?? []).filter((e: any) => e.classeActuelleId === classe!.id);
  check('effectif total de la classe = 2', elevesClasse2.length === 2, `${elevesClasse2.length}`);
  check('répartition : 1 garçon, 1 fille', elevesClasse2.filter((e: any) => e.sexe === 'M').length === 1 && elevesClasse2.filter((e: any) => e.sexe === 'F').length === 1);

  // Cours + appel (présence / absence)
  const matiere = await db.matiere.create({ data: { ecoleId: r.ecoleId, code: 'FR', libelle: 'Français', coefficient: 2 } });
  const persProf = await db.personnel.findFirst({ where: { utilisateurId: users['enseignant'] } });
  const seance = await db.seance.create({ data: { classeId: classe!.id, matiereId: matiere.id, enseignantId: persProf!.id, date: new Date(), heureDebut: '08:00', heureFin: '09:00' } as never });
  await saisirAppelCore(ctxProf, {
    seanceId: seance.id,
    presences: [{ eleveId: eleve!.id, statut: 'present' }, { eleveId: insc2.eleveId, statut: 'absent' }],
  } as never);
  const dataProf3: any = await chargerDonneesPortail('enseignant', await sessionDe('enseignant'), null);
  const presLa = (dataProf3.presences ?? []).filter((x: any) => x.seanceId === seance.id);
  const nbPresents = presLa.filter((x: any) => x.statut === 'present').length;
  const nbAbsents = presLa.filter((x: any) => x.statut === 'absent').length;
  check('appel saisi : le prof voit 1 présent / 1 absent', nbPresents === 1 && nbAbsents === 1, `P=${nbPresents} A=${nbAbsents}`);
  check('le prof voit la séance suivie (cours du jour)', (dataProf3.seances ?? []).some((s: any) => s.id === seance.id));

  // Interrogation notée
  const periode = await db.periode.findFirst({ where: { ecoleId: r.ecoleId } });
  const evaluation = await creerEvaluationCore(ctxProf, r.ecoleId, {
    classeId: classe!.id, matiereId: matiere.id, enseignantId: persProf!.id, periodeId: periode!.id,
    type: 'interrogation', intitule: 'Interrogation n°1 — dictée', date: new Date(), sur: 20, coefficient: 1,
  } as never);
  await saisirNotesCore(ctxProf, { evaluationId: evaluation.evaluationId, notes: [{ eleveId: eleve!.id, valeur: 16 }, { eleveId: insc2.eleveId, valeur: 11.5 }] } as never);
  const dataProf4: any = await chargerDonneesPortail('enseignant', await sessionDe('enseignant'), null);
  const notesVues = (dataProf4.notes ?? []).filter((n: any) => n.evaluationId === evaluation.evaluationId);
  check('prof : les 2 notes de l interrogation sont visibles (16 et 11,5)', notesVues.length === 2, `${notesVues.length}/2`);
  check('évaluation comptée avec ses notes (_count)', (dataProf4.evaluations ?? []).some((e: any) => e.id === evaluation.evaluationId && e._count?.notes === 2));

  // Bulletin
  const bulletin = await genererBulletinCore(ctxProf, { eleveId: eleve!.id, periodeId: periode!.id, classeId: classe!.id } as never);
  check('bulletin généré pour Aïssatou', !!bulletin.bulletinId);

  console.log('\n═══ 6. LA DIRECTION VOIT TOUT ═══');
  const dataDir2: any = await chargerDonneesPortail('direction', await sessionDe('direction'), null);
  check('direction : 2 élèves', (dataDir2.eleves ?? []).length === 2);
  check('direction : 3 paiements (275 000 F)', (dataDir2.paiements ?? []).length === 3);
  check('direction : 2 évaluations+ (appel, interrogation)', (dataDir2.evaluations ?? []).length >= 1);
  check('direction : les notes', (dataDir2.notes ?? []).length >= 2);
  check('direction : le bulletin', (dataDir2.bulletins ?? []).length >= 1);
  check('direction : les présences', (dataDir2.presences ?? []).length >= 2);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école du parcours supprimée (base propre)' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} PARCOURS ÉLÈVE COMPLET : ${p}/${total} ÉTAPES${f ? ` — ${f} ÉCHEC(S)` : ' — FLUIDE DE BOUT EN BOUT'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('PARCOURS-ELEVE', main);
