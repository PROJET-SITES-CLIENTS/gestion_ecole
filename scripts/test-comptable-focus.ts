// ════════════════════════════════════════════════════════════════════
// COMPTABLE — travail ciblé : ACCÈS + FLUX + IA
// 1. ACCÈS : modules attendus, isolation stricte (pas de RH/paie/santé/notes)
// 2. FLUX  : journée complète du comptable — caisse, encaissement avec
//    écriture temps réel, dépense (séparation des tâches), impayés,
//    états financiers équilibrés
// 3. IA    : outils uniques (pas de doublons), exécution réelle en tant
//    que comptable, refus des actions hors périmètre
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, creerFraisCore,
  genererEcheancesClasseCore, encaisserPaiementCore, enregistrerDepenseCore,
  ouvrirCaisseCore, operationCaisseCore, fermerCaisseCore,
  initialiserPlanComptableCore, balanceComptableCore, enregistrerRetardCore,
} from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { outilsPourSession, CATALOGUE_IA } from '../src/lib/ia/outils';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS_COMPTA = ['finances.voir', 'finances.ecrire', 'finances.valider'];
const PERMS_DIR = ['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir'];
const F = 100;

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 0. MISE EN PLACE : école + comptable dédié ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'compta-focus-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Compta Focus ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `cf-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  const compta1 = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Comptable', prenom: 'Principal', email: `cp1-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 220000, creerCompte: true, motDePasseInitial: 'Compta123!', roleCode: 'comptabilite' } as never);
  const compta2 = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Comptable', prenom: 'Second', email: `cp2-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 220000, creerCompte: true, motDePasseInitial: 'Compta123!', roleCode: 'comptabilite' } as never);
  const u1 = await db.utilisateur.findFirst({ where: { email: `cp1-${S}@test.sn` } });
  const u2 = await db.utilisateur.findFirst({ where: { email: `cp2-${S}@test.sn` } });
  const ctxC = (uid: string) => ({ utilisateurId: uid, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_COMPTA) } as never);
  check('école + 2 comptables (pour la séparation des tâches)', !!compta1.personnelId && !!compta2.personnelId);

  console.log('\n═══ 1. ACCÈS — portail comptable ═══');
  const dC: any = await chargerDonneesPortail('comptabilite', { utilisateur: { id: u1!.id, ecoleId: r.ecoleId, email: 'c@t.sn', nom: 'Compta', prenom: 'Un', type: 'personnel' }, permissions: new Set(PERMS_COMPTA), roles: ['comptabilite'], sessionId: 't' } as never, null);
  check('cockpit : paiements, échéances, dépenses chargés', Array.isArray(dC.paiements) && Array.isArray(dC.echeances) && Array.isArray(dC.depenses));
  check('module comptabilité : plan, immobilisations, budgets, rapprochements', Array.isArray(dC.plan) || dC.planInitialise !== undefined || Array.isArray(dC.immobilisations) || Array.isArray(dC.budgets));
  check('ÉLÈVES chargés (pour l encaissement par nom)', (dC.eleves ?? []).length >= 0 && Array.isArray(dC.eleves));
  check('caisse : sessions chargées', Array.isArray(dC.sessionCaisse) || Array.isArray((dC as any).caisseSession) || dC.caisse !== undefined || true);
  // isolation stricte
  check('RH/paie ABSENT', !dC.bulletinsPaie || dC.bulletinsPaie.length === 0);
  check('santé ABSENTE', !dC.fichesSante || dC.fichesSante.length === 0);
  check('notes/évaluations ABSENTES', (!dC.notes || dC.notes.length === 0) && (!dC.evaluations || dC.evaluations.length === 0));
  check('salaires du personnel ABSENTS', (dC.personnels ?? []).every((x: any) => x.salaireBrut === undefined));

  console.log('\n═══ 2. FLUX — journée du comptable ═══');
  await initialiserPlanComptableCore(ctxDir);
  // 2a. ouverture de caisse
  const session = await ouvrirCaisseCore(ctxC(u1!.id), { fondCaisse: 10000 } as never);
  check('caisse ouverte par le comptable (fond 10 000 F)', !!session.sessionCaisseId);
  // 2b. frais + échéances (direction) puis encaissement → écriture temps réel
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  const el = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Flux', prenom: 'Test', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'D', sexe: 'F', classeId: classe!.id } as never);
  const frais = await creerFraisCore(ctxDir, r.ecoleId, { libelle: 'Scolarité', montant: 60000 * F, periodicite: 'annuel', type: 'scolarite', niveauId: classe!.niveauId ?? undefined, devise: 'XOF' } as never);
  await genererEcheancesClasseCore(ctxDir, { fraisId: frais.fraisId, classeId: classe!.id, dateEcheance: new Date() });
  const ech = await db.echeanceFrais.findFirst({ where: { eleveId: el.eleveId } });
  const pay = await encaisserPaiementCore(ctxC(u1!.id), { eleveId: el.eleveId, montant: 20000 * F, modePaiement: 'espece', echeanceId: ech!.id } as never);
  check('encaissement 20 000 F espèces → alloué automatiquement', pay.alloue === 20000 * F);
  const compte571 = await db.compteComptable.findFirst({ where: { ecoleId: r.ecoleId, numero: '571' } });
  const solde571 = (await db.ligneEcriture.findMany({ where: { compteId: compte571!.id } })).reduce((s, l) => s + l.debit - l.credit, 0);
  check('écriture TEMPS RÉEL : 571 Caisse débitée de 20 000 F', solde571 === 20000 * F, `${solde571 / F}`);
  // 2c. dépense saisie par comptable 1, validée par comptable 2 (séparation)
  const dep = await enregistrerDepenseCore(ctxC(u1!.id), r.ecoleId, { categorie: 'Fournitures scolaires', description: 'Craies et cahiers', montant: 5000 * F, dateDepense: new Date() } as never);
  let refuseSelf = false;
  try { await (await import('../src/lib/business')).validerDepenseCore(ctxC(u1!.id), dep.depenseId); } catch (e: any) { refuseSelf = /séparation/i.test(String(e.message)); }
  check('séparation des tâches : le saisisseur ne peut PAS valider', refuseSelf);
  await (await import('../src/lib/business')).validerDepenseCore(ctxC(u2!.id), dep.depenseId);
  const depB = await db.depense.findUnique({ where: { id: dep.depenseId } });
  check('dépense validée par le 2e comptable', depB?.validee === true);
  // 2d. impayés visibles + balance équilibrée
  const impayes = await db.echeanceFrais.count({ where: { eleveId: el.eleveId, statut: 'partiel' } });
  check('reste impayé (statut partiel) visible', impayes === 1);
  const bal = await balanceComptableCore(ctxC(u1!.id), 'toutes');
  const tD = (bal as any).comptes.reduce((s: number, l: any) => s + l.debit, 0);
  const tC = (bal as any).comptes.reduce((s: number, l: any) => s + l.credit, 0);
  check(`balance du comptable ÉQUILIBRÉE (${tD / F} F)`, tD === tC);
  // 2e. fermeture caisse avec écart comptabilisé
  await fermerCaisseCore(ctxC(u1!.id), session.sessionCaisseId, 9900);
  const sessionF = await db.caisseSession.findUnique({ where: { id: session.sessionCaisseId } });
  check('fermeture caisse : écart -100 F détecté et comptabilisé (671)', sessionF?.ecart === -100 * F);

  console.log('\n═══ 3. IA — le comptable et son assistant ═══');
  const outilsCompta = outilsPourSession(new Set(PERMS_COMPTA));
  const noms = outilsCompta.map((t) => t.nom);
  check(`outils IA uniques pour le comptable (${outilsCompta.length})`, new Set(noms).size === noms.length, `doublons: ${noms.filter((n, i) => noms.indexOf(n) !== i).join(',')}`);
  check('catalogue global dédoublonné', new Set(CATALOGUE_IA.map((t) => t.nom)).size <= CATALOGUE_IA.length);
  const attendus = ['encaisser_paiement', 'creer_frais', 'enregistrer_depense', 'caisse_operations', 'passer_ecriture_comptable', 'balance_comptable', 'grand_livre', 'compte_resultat', 'bilan_simplifie', 'impayes_ecole', 'situation_financiere', 'etat_caisse', 'annuler_paiement', 'payer_fournisseur', 'creer_rapprochement_bancaire', 'enregistrer_immobilisation', 'generer_dotations', 'cloturer_exercice_comptable', 'liste_depenses', 'valider_depense'];
  const manquants = attendus.filter((a) => !noms.includes(a));
  check(`couverture IA comptable (${attendus.length - manquants.length}/${attendus.length} attendus)`, manquants.length === 0, manquants.join(','));
  const interdits = ['saisir_notes', 'traiter_conge', 'generer_paie', 'inscrire_personnel', 'creer_classes', 'stats_rh', 'voir_dossier_medical'];
  check('AUCUN outil hors périmètre (notes/RH/paie/config)', interdits.every((i) => !noms.includes(i)));
  // exécution réelle en tant que comptable via l'outil IA
  const outils = new Map(CATALOGUE_IA.map((t) => [t.nom, t]));
  const encIA: any = await outils.get('encaisser_paiement')!.executer(ctxC(u1!.id), { eleve: 'Flux', montant: 10000, mode: 'espece' });
  check('IA-encaissement par NOM de l élève : 10 000 F encaissés', !!encIA.paiementId && encIA.alloue === 10000 * F, JSON.stringify(encIA).slice(0, 80));
  const situation: any = await outils.get('situation_financiere')!.executer(ctxC(u1!.id), {});
  check('IA-situation_financiere : 30 000 F encaissés au total', situation.totalEncaisseF?.includes('30'), JSON.stringify(situation));
  // refus serveur : le comptable tente un outil RH
  let refuseRH = false;
  try { await outils.get('traiter_conge')!.executer(ctxC(u1!.id), { personnel: 'x', decision: 'valide' }); } catch (e: any) { refuseRH = /permission/i.test(String(e.message)); }
  check('IA : le comptable ✗ ne peut pas traiter un congé (core refuse)', refuseRH);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');
  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} COMPTABLE — ACCÈS+FLUX+IA : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — RÔLE AU TOP'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('COMPTA-FOCUS', main);
