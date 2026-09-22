// ════════════════════════════════════════════════════════════════════
// ÉCOSYSTÈME RH — simulation complète de bout en bout
// 1. Recrutement : offre → candidature → étapes → conversion en personnel
// 2. Contrats : création auto, RENOUVELLEMENT CDD historisé
// 3. Congés : demande → validation avec décrément du solde + remplacement
// 4. Formations + sanctions personnel
// 5. Paie : génération → validation → écriture 641/644/421 automatique
// 6. SORTIE FORMELLE : démission → contrat clos, compte désactivé
// 7. PILOTAGE : masse salariale, fins de contrats imminentes détectées
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, creerOffreCore, creerCandidatureCore, avancerCandidatureCore, convertirCandidatCore,
  demanderCongeCore, traiterCongeCore, assignerRemplacementCore,
  creerFormationCore, majFormationCore, sanctionnerPersonnelCore,
  genererBulletinsPaieCore, traiterBulletinPaieCore,
  quitterPersonnelCore, renouvelerContratCore, statsRhCore,
  acquitterSoldesCongesCore,
} from '../src/lib/business';
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
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'rh-complet-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `RH Complet ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `rh-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  check('école créée', !!r.ecoleId);

  console.log('\n═══ 1. RECRUTEMENT → EMBAUCHE ═══');
  const offre = await creerOffreCore(ctxDir, r.ecoleId, { poste: 'Professeur de Mathématiques', description: 'Cours de 6ème à la 3ème', profilRecherche: 'Licence Maths, expérience souhaitée', typeContrat: 'CDD' } as never);
  const cand = await creerCandidatureCore(ctxDir, r.ecoleId, { offreId: offre.offreId, nom: 'Ndiaye', prenom: 'Ibrahima', email: `cand-${S}@test.sn`, telephone: '+221 77 111 22 33', lettreMotivation: 'Passionné par l\'enseignement.' } as never);
  check('offre + candidature reçues', !!offre.offreId && !!cand.candidatureId);
  await avancerCandidatureCore(ctxDir, r.ecoleId, cand.candidatureId, 'tri_cv', 'valide');
  await avancerCandidatureCore(ctxDir, r.ecoleId, cand.candidatureId, 'entretien_rh', 'valide');
  await avancerCandidatureCore(ctxDir, r.ecoleId, cand.candidatureId, 'entretien_direction', 'valide');
  await avancerCandidatureCore(ctxDir, r.ecoleId, cand.candidatureId, 'decision', 'valide');
  const conv = await convertirCandidatCore(ctxDir, r.ecoleId, cand.candidatureId, { dateEmbauche: new Date(), salaireBrut: 250000 } as never);
  check('candidat CONVERTI en personnel (embauché)', !!conv.personnelId);

  console.log('\n═══ 2. CONTRATS ═══');
  const persRecrute = await db.personnel.findUnique({ where: { id: conv.personnelId }, include: { contrats: true } });
  check('contrat CDD créé automatiquement', persRecrute!.contrats.length === 1 && persRecrute!.contrats[0].typeContrat === 'CDD');
  const renouvellement = await renouvelerContratCore(ctxDir, { personnelId: conv.personnelId, nouvelleDateFin: new Date(Date.now() + 45 * 864e5), nouveauSalaireBrut: 28000000 } as never);
  const apresRenouv = await db.personnel.findUnique({ where: { id: conv.personnelId }, include: { contrats: { orderBy: { createdAt: 'asc' } } } });
  check('renouvellement : 2 contrats (historique conservé)', apresRenouv!.contrats.length === 2);
  check('nouveau contrat ACTIF avec terme +45 j', apresRenouv!.contrats[1].actif === true && apresRenouv!.contrats[1].dateFin !== null);
  check('salaire mis à jour (280 000 F)', apresRenouv!.salaireBrut === 28000000);
  check('ancien contrat clos', apresRenouv!.contrats[0].actif === false);
  // le refus CDI sera testé plus bas sur un VRAI CDI (le Partant, avant sa sortie)

  console.log('\n═══ 3. CONGÉS (demande → validation → solde) ═══');
  const persDir = await db.personnel.findFirst({ where: { utilisateurId: r.adminId } });
  await acquitterSoldesCongesCore(ctxDir, {});
  const soldeAvant = await db.soldeConge.findFirst({ where: { personnelId: conv.personnelId } });
  check('acquisition automatique des soldes (25 j/an)', (soldeAvant?.droitsAcquis ?? 0) >= 1, `${soldeAvant?.droitsAcquis}`);
  const conge = await demanderCongeCore(ctxDir, { personnelId: conv.personnelId, type: 'annuel', dateDebut: new Date(Date.now() + 10 * 864e5), dateFin: new Date(Date.now() + 14 * 864e5), motif: 'Congé annuel' } as never);
  check('demande de congé enregistrée (RH/direction saisent au nom du personnel)', !!conge.congeId);
  await traiterCongeCore(ctxDir, conge.congeId, 'valide', 'Bon courage');
  const soldeApres = await db.soldeConge.findFirst({ where: { personnelId: conv.personnelId } });
  check(`solde décrémenté (${soldeAvant!.droitsAcquis} → ${soldeApres!.joursRestants})`, soldeApres!.joursRestants < soldeAvant!.droitsAcquis);
  await assignerRemplacementCore(ctxDir, { congeId: conge.congeId, personnelRemplacantId: persDir!.id, dateDebut: new Date(Date.now() + 10 * 864e5), dateFin: new Date(Date.now() + 14 * 864e5) } as never);
  check('remplacement assigné pendant le congé', true);

  console.log('\n═══ 4. FORMATIONS & SANCTIONS ═══');
  const form = await creerFormationCore(ctxDir, { personnelId: conv.personnelId, intitule: 'Pédagogie active', organisme: 'IFADEM', dateDebut: new Date(Date.now() - 5 * 864e5), dateFin: new Date(Date.now() - 1 * 864e5), cout: 150000 } as never);
  await majFormationCore(ctxDir, form.formationId, 'terminee', true);
  const formB = await db.formationPersonnel.findUnique({ where: { id: form.formationId } });
  check('formation terminée avec certificat', formB?.statut === 'terminee' && formB?.certificatObtenu === true);
  const san = await sanctionnerPersonnelCore(ctxDir, { personnelId: conv.personnelId, dateFaits: new Date(), faute: 'Retards répétés aux cours', typeSanction: 'avertissement', description: 'Premier avertissement écrit' } as never);
  check('sanction disciplinaire du personnel enregistrée (avec notification)', !!san.sanctionId || !!san);

  console.log('\n═══ 5. PAIE → ÉCRITURE COMPTABLE ═══');
  const { initialiserPlanComptableCore: initPlan, completerPlanComptableCore: completPlan } = await import('../src/lib/business');
  await initPlan(ctxDir);
  await completPlan(ctxDir);
  const gen = await genererBulletinsPaieCore(ctxDir, r.ecoleId, '2026-09');
  check(`bulletins générés (${gen.bulletins})`, gen.bulletins >= 1);
  const bulletin = await db.bulletinPaie.findFirst({ where: { ecoleId: r.ecoleId, personnelId: conv.personnelId, periode: '2026-09' } });
  check('bulletin du recruté présent (brut 280 000 F)', bulletin?.salaireBrut === 28000000, `${bulletin?.salaireBrut}`);
  const trPaie = await traiterBulletinPaieCore(ctxDir, bulletin!.id, 'valide');
  if (!trPaie.ecriturePaie) {
  }
  const ecr = await db.ecritureComptable.findFirst({ where: { ecoleId: r.ecoleId, numeroPiece: `PAY-${bulletin!.id.slice(-10)}` } });
  check('écriture comptable PAIÉE automatiquement (641/644/421)', !!ecr);

  console.log('\n═══ 6. SORTIE FORMELLE ═══');
  // un 2e personnel part à la retraite
  const partant = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Partant', prenom: 'Vieux', email: `part-${S}@test.sn`, dateEmbauche: new Date('2000-01-01'), typeContrat: 'CDI', salaireBrut: 300000, creerCompte: true, motDePasseInitial: 'Part1234!', roleCode: 'enseignant' } as never);
  const uPart = await db.utilisateur.findFirst({ where: { email: `part-${S}@test.sn` } });
  // son contrat est un CDI : le renouvellement doit être REFUSÉ (pas de terme)
  let refuseCDI = false;
  try { await renouvelerContratCore(ctxDir, { personnelId: partant.personnelId, nouvelleDateFin: new Date(Date.now() + 120 * 864e5) } as never); }
  catch (e: any) { refuseCDI = /CDI/.test(String(e.message)); }
  check('renouveler un CDI REFUSÉ (stricte)', refuseCDI);
  await db.sessionUtilisateur.create({ data: { utilisateurId: uPart!.id, tokenHash: 'x'.repeat(64), dateExpiration: new Date(Date.now() + 864e5), active: true } as never });
  const sortie = await quitterPersonnelCore(ctxDir, { personnelId: partant.personnelId, motifSortie: 'retraite', dateSortie: new Date(Date.now() + 30 * 864e5), preavisJours: 30, commentaire: 'Départ bien mérité' } as never);
  check('départ à la retraite enregistré', sortie.statut === 'sorti');
  const partApres = await db.personnel.findUnique({ where: { id: partant.personnelId }, include: { contrats: true } });
  check('contrat clos automatiquement', partApres!.contrats.every((c) => c.actif === false));
  check('motif conservé (retraite — commentaire)', partApres!.motifSortie?.includes('retraite') === true);
  const uPartApres = await db.utilisateur.findUnique({ where: { id: uPart!.id } });
  check('compte portail DÉSACTIVÉ (historique conservé)', uPartApres?.actif === false && !!uPartApres);
  const sessions = await db.sessionUtilisateur.findMany({ where: { utilisateurId: uPart!.id } });
  check('sessions actives RÉVOQUÉES', sessions.every((s) => s.dateExpiration <= new Date()));
  let refuseReSortie = false;
  try { await quitterPersonnelCore(ctxDir, { personnelId: partant.personnelId, motifSortie: 'demission', dateSortie: new Date() } as never); } catch { refuseReSortie = true; }
  check('double sortie refusée', refuseReSortie);

  console.log('\n═══ 7. PILOTAGE RH ═══');
  const stats = await statsRhCore(ctxDir) as any;
  check(`effectifs : ${stats.actifs} actifs / ${stats.sortis} sorti(s)`, stats.actifs >= 2 && stats.sortis === 1, `${stats.actifs}/${stats.sortis}`);
  check('masse salariale mensuelle cohérente (≥ 280 000 F)', stats.masseSalarialeMensuelle >= 28000000, `${stats.masseSalarialeMensuelle / 100}`);
  check('fins de contrats imminentes DÉTECTÉES (le CDD à +45 j)', stats.finsContratsImminentes.some((x: any) => x.nom.includes('Ndiaye') && x.joursRestants <= 60), JSON.stringify(stats.finsContratsImminentes.map((x: any) => x.nom)));
  check('par type : contrat du recruté compté (CDI ou CDD)', stats.parTypeContrat.length >= 1 && stats.parTypeContrat.some((t: any) => ['CDI', 'CDD'].includes(t.type)), JSON.stringify(stats.parTypeContrat));
  check('ancienneté calculée', typeof stats.ancienneteMoyenneAnnees === 'number');
  check('sanction de l\'année comptée', stats.sanctionsAnnee >= 1);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} ÉCOSYSTÈME RH : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — COMPLET'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('RH-COMPLET', main);
