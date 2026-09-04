/**
 * SUITE DE NON-RÉGRESSION — T1 à T24 (remédiation des 20 failles)
 * Teste les VRAIES fonctions métier (src/lib/business/*) avec le contexte
 * d'une session simulée. Chaque test attaque EXACTEMENT le défaut corrigé.
 *  - T1-T8  : suite historique (montants adaptés aux centimes F16)
 *  - T9-T24 : un test par faille corrigée (F1 à F19)
 * Exécution : npx tsx scripts/test-regression-t1-t8.ts  (après npm run seed)
 */
import { PrismaClient } from '@prisma/client';
import { createHmac, randomBytes } from 'crypto';
import {
  Ctx,
  ActionError,
  encaisserPaiementCore,
  genererEcheancesClasseCore,
  enregistrerMouvementStockCore,
  saisirNotesCore,
  saisirAppelCore,
  genererBulletinCore,
  changerStatutBulletinCore,
  inscrireEleveCore,
  sortieEleveCore,
  annulerPaiementCore,
  remiseEcheanceCore,
  rattacherParentCore,
  creerEcoleClientCore,
  changerStatutEcoleCore,
  genererFacturesSaasCore,
  ouvrirCreneauRdvCore,
  reserverRdvCore,
  annulerRdvCore,
  sanctionnerCore,
} from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { tenterConnexion, validerDefi2FA, verifierCodeTotp } from '../src/lib/auth';
import { verifyPassword } from '../src/lib/auth-hash';
import type { SessionInfo } from '../src/lib/auth';

const db = new PrismaClient();
const MARK = 'RegressionV2';
const results: Array<{ test: string; verdict: string; detail: string }> = [];

type Attente = { rejete: boolean; erreur?: string; valeur?: unknown };
function attendu(fn: () => Promise<unknown>): Promise<Attente> {
  return fn().then(
    (v): Attente => ({ rejete: false, valeur: v }),
    (e): Attente => ({ rejete: true, erreur: e instanceof ActionError ? e.message : String(e) }),
  );
}
const xof = (centimes: number) => `${(centimes / 100).toLocaleString('fr-FR')} XOF`;

async function main() {
  const ecole = await db.ecole.findFirst({ where: { slug: 'vinci' } });
  if (!ecole) throw new Error('École démo introuvable (exécutez npm run seed)');
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id, email: { startsWith: 'direction@' } } });
  if (!dir) throw new Error('Direction introuvable');

  // Contexte direction : toutes les permissions
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = {
    utilisateurId: dir.id,
    ecoleId: ecole.id,
    type: 'personnel',
    permissions: new Set(perms.map((p) => p.code)),
  };
  // Contexte super-admin (bypass permissions)
  const superCtx: Ctx = { utilisateurId: dir.id, ecoleId: null, type: 'super_admin', permissions: new Set() };
  // Contexte enseignant (permissions réelles du rôle)
  const ctxEns: Ctx = {
    utilisateurId: dir.id,
    ecoleId: ecole.id,
    type: 'personnel',
    permissions: new Set(['eleves.lire', 'notes.saisir', 'presences.saisir', 'vie_scolaire.gerer', 'edt.gerer']),
  };

  await preCleanup();
  console.log(`École: ${ecole.nom} · session simulée: ${dir.email} (${ctx.permissions.size} permissions)\n`);

  // ================= T1 — Échéances idempotentes (double-clic) =================
  {
    const classe = await db.classe.findFirst({ where: { ecoleId: ecole.id } });
    const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
    const frais = await db.frais.create({
      data: { ecoleId: ecole.id, libelle: `${MARK} frais`, type: 'scolarite', montant: 5_000_000, devise: 'XOF', periodicite: 'unique', anneeScolaireId: annee!.id },
    });
    const dateEcheance = new Date('2026-10-05');
    const r1 = await genererEcheancesClasseCore(ctx, { fraisId: frais.id, classeId: classe!.id, dateEcheance });
    const r2 = await genererEcheancesClasseCore(ctx, { fraisId: frais.id, classeId: classe!.id, dateEcheance });
    const total = await db.echeanceFrais.count({ where: { fraisId: frais.id } });
    const pass = r1.crees === total && r2.crees === 0;
    results.push({
      test: 'T1 — Régénération d\'échéances (double-clic)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `1re génération: ${r1.crees} créées · 2e génération: ${r2.crees} créée(s) · total en base: ${total} — idempotence ${pass ? 'garantie' : 'NON garantie'}`,
    });
    (globalThis as any).__t1 = { fraisId: frais.id, classeId: classe!.id };
  }

  // ================= T2 — Paiements concurrents (invariants d'intégrité) =================
  {
    const { fraisId } = (globalThis as any).__t1;
    const ech = await db.echeanceFrais.findFirst({ where: { fraisId, statut: { in: ['impayee', 'partiel'] } } });
    const eleveId = ech!.eleveId;
    // Restant dû TOTAL de l'élève (toutes échéances ouvertes) — l'encaissement
    // est plafonné par ce total (FIFO), pas par une seule échéance.
    const ouvertes = await db.echeanceFrais.findMany({ where: { eleveId, statut: { in: ['impayee', 'partiel'] } } });
    const R = ouvertes.reduce((s, e) => s + e.montant - e.remise - e.montantPaye, 0);
    // a) Déterministe : un montant > restant dû TOTAL → REFUS, quelle que soit la concurrence
    const rA = await attendu(() => encaisserPaiementCore(ctx, { eleveId, montant: R + 100_000, modePaiement: 'espece', reference: `${MARK}-EXC` }));
    // b) Deux guichets concurrents de montant raisonnable : autorisés tant que
    // le TOTAL ne dépasse pas le restant — invariants : aucune échéance surpayée,
    // allocations == paiements réussis, aucune trace d'écriture perdue.
    const m = Math.max(100_000, Math.floor(R / 4));
    const [p1, p2] = await Promise.allSettled([
      encaisserPaiementCore(ctx, { eleveId, montant: m, modePaiement: 'espece', reference: `${MARK}-P1`, echeanceId: ech!.id }),
      encaisserPaiementCore(ctx, { eleveId, montant: m, modePaiement: 'espece', reference: `${MARK}-P2`, echeanceId: ech!.id }),
    ]);
    const nbSucces = (p1.status === 'fulfilled' ? 1 : 0) + (p2.status === 'fulfilled' ? 1 : 0);
    const paiements = await db.paiement.findMany({ where: { referenceTransaction: { in: [`${MARK}-P1`, `${MARK}-P2`] } } });
    const allocations = await db.paiementEcheance.findMany({ where: { paiementId: { in: paiements.map((p) => p.id) } } });
    const apres = await db.echeanceFrais.findMany({ where: { eleveId } });
    const aucuneSurpayee = apres.every((e) => e.montantPaye <= e.montant - e.remise + 1);
    const sommeAllouee = allocations.reduce((s, a) => s + a.montantApplique, 0);
    const coherence = nbSucces === paiements.length && sommeAllouee === m * nbSucces;
    const pass = rA.rejete && nbSucces >= 1 && aucuneSurpayee && coherence;
    results.push({
      test: 'T2 — Paiements concurrents (plafond restant dû + intégrité)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `restant dû ${xof(R)} · excès ${xof(R + 100_000)}: ${rA.rejete ? `REFUSÉ (MONTANT_EXCEDENT)` : 'accepté (!!)'} · ${nbSucces}/2 guichets concurrents de ${xof(m)} encaissés · surpaie d'une échéance: ${aucuneSurpayee ? 'aucune' : 'OUI (bug!)'} · allocations=${xof(sommeAllouee)} = paiements réussis ${pass ? '— comptabilité exacte' : '(incohérence)'}`,
    });
  }

  // ================= T3 — Stock =================
  {
    const art = await db.stockArticle.findFirst({ where: { ecoleId: ecole.id } });
    const q0 = art!.quantite;
    const r1 = await attendu(() => enregistrerMouvementStockCore(ctx, { articleId: art!.id, type: 'sortie', quantite: q0 + 100, motif: MARK }));
    const r2 = await attendu(() => enregistrerMouvementStockCore(ctx, { articleId: art!.id, type: 'entrée' as 'entree', quantite: 50, motif: MARK }));
    const r3 = await attendu(() => enregistrerMouvementStockCore(ctx, { articleId: art!.id, type: 'entree', quantite: 50, motif: MARK }));
    const qApres = (await db.stockArticle.findUnique({ where: { id: art!.id } }))!.quantite;
    const pass = r1.rejete && r2.rejete && !r3.rejete && qApres === q0 + 50;
    results.push({
      test: 'T3 — Mouvements de stock (garde-fous)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `Sortie excédentaire: ${r1.rejete ? 'REFUSÉE' : 'acceptée (?)'} · type accentué: ${r2.rejete ? 'REFUSÉ (enum strict)' : 'accepté (?)'} · entrée valide: ${!r3.rejete} · stock ${q0}→${qApres}`,
    });
    await db.stockArticle.update({ where: { id: art!.id }, data: { quantite: q0 } });
    await db.mouvementStock.deleteMany({ where: { motif: MARK } });
  }

  // ================= T4 — Note hors barème =================
  {
    const eval_ = await db.evaluation.findFirst({ where: { ecoleId: ecole.id }, include: { classe: true } });
    const eleve = await db.eleve.findFirst({ where: { classeActuelleId: eval_!.classeId, statut: 'actif' } });
    const noteAvant = await db.note.findUnique({ where: { eleveId_evaluationId: { eleveId: eleve!.id, evaluationId: eval_!.id } } });
    const r = await attendu(() => saisirNotesCore(ctx, { evaluationId: eval_!.id, notes: [{ eleveId: eleve!.id, valeur: 25 }] }));
    const noteApres = await db.note.findUnique({ where: { eleveId_evaluationId: { eleveId: eleve!.id, evaluationId: eval_!.id } } });
    const inchange = noteAvant ? noteApres?.valeur === noteAvant.valeur : noteApres === null;
    const pass = r.rejete && inchange;
    results.push({
      test: 'T4 — Note de 25 sur barème /20',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `${r.rejete ? `REFUSÉE — « ${r.erreur?.slice(0, 70)}… »` : 'ACCEPTÉE (?)'} · note avant=${noteAvant?.valeur ?? 'aucune'} / après=${noteApres?.valeur ?? 'aucune'} — rejet tout-ou-rien ${pass ? 'respecté' : 'NON respecté'}`,
    });
    (globalThis as any).__t4 = { evaluationId: eval_!.id, eleveId: eleve!.id };
  }

  // ================= T5 — Bulletins concurrents =================
  {
    const eval_ = await db.evaluation.findFirst({ where: { ecoleId: ecole.id } });
    const note = await db.note.findFirst({ where: { evaluationId: eval_!.id } });
    const [b1, b2] = await Promise.allSettled([
      genererBulletinCore(ctx, { eleveId: note!.eleveId, periodeId: eval_!.periodeId, classeId: eval_!.classeId }),
      genererBulletinCore(ctx, { eleveId: note!.eleveId, periodeId: eval_!.periodeId, classeId: eval_!.classeId }),
    ]);
    const ids: string[] = [];
    if (b1.status === 'fulfilled') ids.push((b1.value as any).bulletinId);
    if (b2.status === 'fulfilled') ids.push((b2.value as any).bulletinId);
    const bulletins = ids.length ? await db.bulletin.findMany({ where: { id: { in: ids } }, orderBy: { version: 'asc' } }) : [];
    const versions = bulletins.map((b) => b.version);
    const crash = (b1.status === 'rejected' && !(b1.reason instanceof ActionError)) || (b2.status === 'rejected' && !(b2.reason instanceof ActionError));
    const pass = !crash && (bulletins.length === 2 ? versions[0] !== versions[1] : true) && bulletins.length >= 1;
    results.push({
      test: 'T5 — Génération simultanée de bulletins',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `${bulletins.length} bulletin(s) créé(s), versions [${versions.join(', ')}] distinctes, 0 crash brut`,
    });
    await db.bulletin.deleteMany({ where: { id: { in: ids } } });
  }

  // ================= T6 — Montant négatif =================
  {
    const eleve = await db.eleve.findFirst({ where: { ecoleId: ecole.id, statut: 'actif' } });
    const r = await attendu(() => encaisserPaiementCore(ctx, { eleveId: eleve!.id, montant: -5_000_000, modePaiement: 'espece', reference: `${MARK}-NEG` }));
    const enBase = await db.paiement.findFirst({ where: { referenceTransaction: `${MARK}-NEG` } });
    const pass = r.rejete && !enBase;
    results.push({
      test: 'T6 — Encaissement d\'un montant NÉGATIF',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `${r.rejete ? 'REFUSÉ' : 'ACCEPTÉ (?)'} · en base: ${enBase ? 'persisté (??)' : 'aucune écriture'} — recettes ${pass ? 'protégées' : 'faussées'}`,
    });
  }

  // ================= T7 — Matricules séquentiels uniques =================
  {
    const avant = await db.eleve.findMany({ where: { ecoleId: ecole.id, matricule: { startsWith: 'EL-' } }, select: { matricule: true } });
    const maxAvant = avant.reduce((m, e) => Math.max(m, parseInt((e.matricule ?? '').slice(3), 10) || 0), 0);
    const [i1, i2] = await Promise.allSettled([
      inscrireEleveCore(ctx, ecole.id, { nom: `${MARK}A`, prenom: 'Test', dateNaissance: new Date('2012-05-10'), lieuNaissance: 'Dakar', sexe: 'M' }),
      inscrireEleveCore(ctx, ecole.id, { nom: `${MARK}B`, prenom: 'Test', dateNaissance: new Date('2012-06-10'), lieuNaissance: 'Dakar', sexe: 'F' }),
    ]);
    const m1 = i1.status === 'fulfilled' ? (i1.value as any).matricule : null;
    const m2 = i2.status === 'fulfilled' ? (i2.value as any).matricule : null;
    const pass = m1 !== null && m2 !== null && m1 !== m2;
    results.push({
      test: 'T7 — Inscriptions simultanées (matricules uniques)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `matricules ${m1 ?? 'échec'} / ${m2 ?? 'échec'} ${pass ? 'distincts' : 'EN COLLISION'} (max avant=${maxAvant})`,
    });
  }

  // ================= T8 — Sortie de mineur sans autorisation =================
  {
    const eleve = await db.eleve.findFirst({ where: { ecoleId: ecole.id, statut: 'actif' } });
    const notifsAvant = await db.notification.count({ where: { ecoleId: ecole.id } });
    const rA = await attendu(() => sortieEleveCore(ctx, { eleveId: eleve!.id, date: new Date(), heure: '14:00', recupereParNom: `${MARK} Inconnu` }));
    const rB = await attendu(() => sortieEleveCore(ctx, { eleveId: eleve!.id, date: new Date(), heure: '14:00', recupereParNom: `${MARK} Inconnu`, validationExceptionnelle: true }));
    const rC = await attendu(() => sortieEleveCore(ctx, { eleveId: eleve!.id, date: new Date(), heure: '14:00', recupereParNom: `${MARK} Inconnu`, validationExceptionnelle: true, motifException: 'Urgence médicale confirmée' }));
    const notifsApres = await db.notification.count({ where: { ecoleId: ecole.id } });
    const sortie = await db.sortieAnticipee.findFirst({ where: { recupereParNom: { contains: MARK } } });
    const pass = rA.rejete && rB.rejete && !rC.rejete && notifsApres - notifsAvant > 0 && sortie?.parentsNotifies === true;
    results.push({
      test: 'T8 — Sortie anticipée SANS autorisation parentale',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `sans autorisation: ${rA.rejete ? 'REFUSÉE' : 'acceptée (?)'} · exception sans motif: ${rB.rejete ? 'REFUSÉE' : 'acceptée (?)'} · exception motivée: ${!rC.rejete ? 'acceptée + TRAÇÉE' : 'rejetée (?)'} · notifs: ${notifsApres - notifsAvant}`,
    });
  }

  // ================= T9 (F1) — Isolation du portail élève/parent =================
  {
    const eleveLie = await db.eleve.findFirst({ where: { ecoleId: ecole.id, utilisateurId: { not: null } }, include: { utilisateur: true } });
    const autres = await db.eleve.findMany({ where: { ecoleId: ecole.id, id: { not: eleveLie!.id } }, take: 3 });
    const sessionEleve: SessionInfo = {
      utilisateur: { id: eleveLie!.utilisateurId!, ecoleId: ecole.id, email: eleveLie!.utilisateur!.email, nom: eleveLie!.nom, prenom: eleveLie!.prenom, type: 'eleve' },
      permissions: new Set(),
      roles: [],
      sessionId: 'test',
    };
    const dEleve = await chargerDonneesPortail('eleve', sessionEleve);
    const payloadEleve = JSON.stringify(dEleve);
    const moiOk = (dEleve as any).moi?.id === eleveLie!.id;
    const notesOk = ((dEleve as any).mesNotes ?? []).every((n: any) => n.eleveId === eleveLie!.id);
    const listeVide = (((dEleve as any).eleves ?? []) as unknown[]).length === 0;
    const fuiteAutres = autres.some((a) => payloadEleve.includes(a.matricule ?? '__inexistant__'));
    const passEleve = moiOk && notesOk && listeVide && !fuiteAutres;

    // Portail parent : uniquement SES enfants
    const parentLien = await db.eleveParent.findFirst({ where: { eleve: { ecoleId: ecole.id } }, include: { parent: { include: { utilisateur: true } }, eleve: true } });
    const sessionParent: SessionInfo = {
      utilisateur: { id: parentLien!.parent.utilisateurId!, ecoleId: ecole.id, email: 'test', nom: 'T', prenom: 'T', type: 'parent' },
      permissions: new Set(),
      roles: [],
      sessionId: 'test',
    };
    const dParent = await chargerDonneesPortail('parent', sessionParent);
    const enfantsOk = ((dParent as any).mesEnfants ?? []).length === 1 && (dParent as any).mesEnfants[0]?.id === parentLien!.eleveId;
    const echeancesOk = ((dParent as any).mesEcheances ?? []).every((e: any) => e.eleveId === parentLien!.eleveId);
    const payloadParent = JSON.stringify(dParent);
    const fuiteParent = autres.some((a) => a.id !== parentLien!.eleveId && payloadParent.includes(a.matricule ?? '__inexistant__'));
    const passParent = enfantsOk && echeancesOk && !fuiteParent;
    results.push({
      test: 'T9 (F1) — Isolation des portails élève et parent',
      verdict: passEleve && passParent ? 'PASS ✓' : 'ÉCHEC',
      detail: `Élève: moi=${moiOk}, notes 100% à lui=${notesOk}, liste globale vide=${listeVide}, matricules d'autres élèves dans le payload=${fuiteAutres ? 'OUI (fuite!)' : 'non'} · Parent: ses enfants uniquement=${enfantsOk}, échéances filtrées=${echeancesOk}, fuite=${fuiteParent ? 'OUI' : 'non'}`,
    });
  }

  // ================= T10 (F6) — Rôle bulletin dérivé de la session =================
  {
    const b = await db.bulletin.findFirst({ where: { statut: 'valide_pp' } });
    const rEns = await attendu(() => changerStatutBulletinCore(ctxEns, b!.id, 'publie'));
    const rDir = await attendu(() => changerStatutBulletinCore(ctx, b!.id, 'en_attente_direction'));
    const pass = rEns.rejete && (rEns.erreur ?? '').includes('direction') && !rDir.rejete;
    results.push({
      test: 'T10 (F6) — Publication de bulletin par un ENSEIGNANT',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `Enseignant (notes.saisir) → publie : ${rEns.rejete ? `REFUSÉ — « ${rEns.erreur?.slice(0, 60)}… »` : 'ACCEPTÉ (escalade!)'} · Direction → en_attente_direction : ${!rDir.rejete ? 'OK' : 'rejeté (?)'} — le rôle n'est plus un paramètre client`,
    });
    await db.bulletin.update({ where: { id: b!.id }, data: { statut: 'valide_pp', dateValidationDirection: null, valideDirectionParId: null } });
  }

  // ================= T11 (F7) — Contrôles tenant dans appel + inscription =================
  {
    // a) appel : un élève n'appartenant PAS à la classe de la séance → refus
    const seance = await db.seance.findFirst({ where: { classe: { ecoleId: ecole.id } }, include: { classe: true } });
    const eleveAutreClasse = await db.eleve.findFirst({ where: { ecoleId: ecole.id, classeActuelleId: { not: seance!.classeId }, statut: 'actif' } });
    const rAppel = await attendu(() => saisirAppelCore(ctxEns, {
      seanceId: seance!.id,
      presences: [{ eleveId: eleveAutreClasse!.id, statut: 'present' }],
    }));
    const pass = rAppel.rejete;
    results.push({
      test: 'T11 (F7) — Appel avec un élève HORS classe de la séance',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `${rAppel.rejete ? `REFUSÉ — « ${rAppel.erreur?.slice(0, 80)}… »` : 'ACCEPTÉ (écriture cross-classe!)'} — l'appel ne peut plus noter des élèves d\'une autre classe`,
    });
  }

  // ================= T12 (F4) — Onboarding SaaS complet =================
  {
    const slugB = `regression-${Date.now().toString(36)}`;
    const r = await creerEcoleClientCore(superCtx, {
      nom: `${MARK} École B`, slug: slugB,
      emailDirection: `direction@${slugB}.test`, motDePasseDirection: 'MotDePasseB!123',
    });
    const ecoleB = await db.ecole.findUnique({ where: { id: r.ecoleId } });
    const anneeB = await db.anneeScolaire.findFirst({ where: { ecoleId: r.ecoleId, active: true } });
    const periodesB = await db.periode.count({ where: { anneeScolaireId: anneeB!.id } });
    const classesB = await db.classe.count({ where: { anneeScolaireId: anneeB!.id } });
    const rolesB = await db.role.count({ where: { ecoleId: r.ecoleId } });
    const dirB = await db.utilisateur.findFirst({ where: { email: `direction@${slugB}.test` } });
    const mdpOk = dirB ? verifyPassword('MotDePasseB!123', dirB.motDePasseHash) : false;
    const niveauxB = await db.niveau.count({ where: { section: { cycle: { ecoleId: r.ecoleId } } } });
    const pass = Boolean(ecoleB) && Boolean(anneeB) && periodesB === 3 && classesB === 15 && niveauxB === 15 && rolesB === 9 && Boolean(dirB) && mdpOk;
    results.push({
      test: 'T12 (F4) — Onboarding SaaS : école UTILISABLE immédiatement',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `année active=${Boolean(anneeB)} · périodes=${periodesB}/3 · niveaux=${niveauxB}/15 · classes=${classesB}/15 · rôles=${rolesB}/9 · compte direction=${dirB ? 'créé, mot de passe vérifié' : 'ABSENT'} — plus d'école vide à l'installation`,
    });
    (globalThis as any).__t12 = { ecoleBId: r.ecoleId, slugB, dirBEmail: `direction@${slugB}.test`, classeB: (await db.classe.findFirst({ where: { anneeScolaireId: anneeB!.id } }))!.id };
  }

  // ================= T11-bis (F7) — Inscription dans une classe d'une AUTRE école =================
  {
    const { ecoleBId, classeB } = (globalThis as any).__t12;
    const r = await attendu(() => inscrireEleveCore(ctx, ecole.id, {
      nom: `${MARK}CrossTenant`, prenom: 'Test', dateNaissance: new Date('2013-01-15'), lieuNaissance: 'Dakar', sexe: 'M', classeId: classeB,
    }));
    const pass = r.rejete;
    results.push({
      test: 'T11-bis (F7) — Inscription dans une classe d\'une AUTRE école',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `${r.rejete ? `REFUSÉ — « ${r.erreur?.slice(0, 70)}… »` : 'ACCEPTÉ (contournement tenant!)'} — assertTenant désormais appliqué à la classe d'inscription`,
    });
    void ecoleBId;
  }

  // ================= T13 (F4) — Quota d'élèves du plan =================
  {
    const planQ = await db.planTarifaire.create({
      data: { nom: `${MARK} Plan Quota 1`, prixMensuel: 1_000_000, prixAnnuel: 10_000_000, devise: 'XOF', limiteEleves: 1, dureeEssaiJours: 14, modulesInclus: '[]' },
    });
    const slugC = `regression-q-${Date.now().toString(36)}`;
    const rC = await creerEcoleClientCore(superCtx, { nom: `${MARK} École C`, slug: slugC, planId: planQ.id });
    const classeC = await db.classe.findFirst({ where: { ecole: { id: rC.ecoleId } } });
    const ctxC: Ctx = { utilisateurId: dir.id, ecoleId: rC.ecoleId, type: 'super_admin', permissions: new Set() };
    const i1 = await attendu(() => inscrireEleveCore(ctxC, rC.ecoleId, { nom: `${MARK}Q1`, prenom: 'Test', dateNaissance: new Date('2014-02-02'), lieuNaissance: 'Dakar', sexe: 'F', classeId: classeC!.id }));
    const i2 = await attendu(() => inscrireEleveCore(ctxC, rC.ecoleId, { nom: `${MARK}Q2`, prenom: 'Test', dateNaissance: new Date('2014-03-03'), lieuNaissance: 'Dakar', sexe: 'M', classeId: classeC!.id }));
    const pass = !i1.rejete && i2.rejete && (i2.erreur ?? '').toLowerCase().includes('quota');
    results.push({
      test: 'T13 (F4) — Quota d\'élèves du plan (limite 1)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `1er élève: ${!i1.rejete ? 'accepté' : 'rejeté (?)'} · 2e élève: ${i2.rejete ? `REFUSÉ — « ${i2.erreur?.slice(0, 80)}… »` : 'ACCEPTÉ (quota non appliqué!)'}`,
    });
    await db.planTarifaire.delete({ where: { id: planQ.id } }).catch(() => {});
    (globalThis as any).__t13 = { ecoleCId: rC.ecoleId };
  }

  // ================= T14 (F4) — École suspendue : connexion refusée =================
  {
    const { ecoleBId, dirBEmail } = (globalThis as any).__t12;
    await changerStatutEcoleCore(superCtx, ecoleBId, 'suspendu');
    const r = await tenterConnexion(dirBEmail, 'MotDePasseB!123', 'ua-test', '127.0.0.9');
    const pass = !r.ok && 'erreur' in r && (r.erreur ?? '').includes('indisponible');
    results.push({
      test: 'T14 (F4) — Connexion refusée pour une école SUSPENDUE',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `${!r.ok ? `REFUSÉE — « ${(r as any).erreur?.slice(0, 80)}… »` : 'ACCEPTÉE (suspension sans effet!)'} — les sessions d'une école suspendue sont révoquées et la reconnexion bloquée`,
    });
  }

  // ================= T15 (F3) — Annulation de paiement : désallocation exacte =================
  {
    // Élève avec échéance impayée du frais MARK (T1)
    const { fraisId } = (globalThis as any).__t1;
    const ech = await db.echeanceFrais.findFirst({ where: { fraisId, statut: { in: ['impayee', 'partiel'] } } });
    const payeAvant = ech!.montantPaye;
    // Allocation CIBLÉE (F3) : l'encaissement porte précisément sur cette échéance
    const enc = await encaisserPaiementCore(ctx, { eleveId: ech!.eleveId, montant: 1_000_000, modePaiement: 'espece', reference: `${MARK}-ANN`, echeanceId: ech!.id });
    const apresEnc = (await db.echeanceFrais.findUnique({ where: { id: ech!.id } }))!;
    await annulerPaiementCore(ctx, enc.paiementId, `${MARK} annulation test`);
    const apresAnn = (await db.echeanceFrais.findUnique({ where: { id: ech!.id } }))!;
    const paiement = await db.paiement.findUnique({ where: { id: enc.paiementId } });
    const double = await attendu(() => annulerPaiementCore(ctx, enc.paiementId, 'double'));
    const pass = apresEnc.montantPaye === payeAvant + 1_000_000 && apresAnn.montantPaye === payeAvant && apresAnn.statut === ech!.statut && paiement?.annule === true && double.rejete;
    results.push({
      test: 'T15 (F3) — Annulation de paiement (désallocation miroir)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `échéance payée ${xof(payeAvant)} → +${xof(1_000_000)} → retour à ${xof(apresAnn.montantPaye)} · paiement.annule=${paiement?.annule} (trace conservée) · double annulation: ${double.rejete ? 'refusée' : 'acceptée (?)'}`,
    });
  }

  // ================= T16 (F3) — Remise d'échéance (bourse) =================
  {
    const { fraisId } = (globalThis as any).__t1;
    const ech = await db.echeanceFrais.findFirst({ where: { fraisId, statut: { in: ['impayee', 'partiel'] } } });
    const exces = await attendu(() => remiseEcheanceCore(ctx, ech!.id, 9_999_999, 'trop'));
    const r = await remiseEcheanceCore(ctx, ech!.id, 1_000_000, `${MARK} bourse`);
    const apres = await db.echeanceFrais.findUnique({ where: { id: ech!.id } });
    const pass = exces.rejete && !('rejete' in r) && apres?.remise === 1_000_000 && apres?.motifRemise?.includes(MARK);
    results.push({
      test: 'T16 (F3) — Remise/bourse d\'échéance',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `remise > montant: ${exces.rejete ? 'REFUSÉE' : 'acceptée (?)'} · remise ${xof(1_000_000)}: enregistrée avec motif · remise=${apres?.remise} — les bourses existent enfin`,
    });
  }

  // ================= T17 (F9) — Clôture d'année réparée =================
  {
    const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
    const elevesAvant = await db.eleve.findMany({ where: { ecoleId: ecole.id, statut: 'actif' }, select: { id: true, classeActuelleId: true } });
    const classesAvant = await db.classe.findMany({ where: { anneeScolaireId: annee!.id }, select: { id: true, niveauId: true } });
    const { cloturerAnneeScolaireCore } = await import('../src/lib/business');
    const r = await cloturerAnneeScolaireCore(ctx, annee!.id);
    const nouvelle = await db.anneeScolaire.findUnique({ where: { id: r.nouvelleAnneeId } });
    const classesNouvelle = await db.classe.findMany({ where: { anneeScolaireId: r.nouvelleAnneeId }, include: { niveau: true } });
    const periodesNouvelle = await db.periode.count({ where: { anneeScolaireId: r.nouvelleAnneeId } });
    const ancienne = await db.anneeScolaire.findUnique({ where: { id: annee!.id } });
    // Les promus doivent pointer vers des classes de la NOUVELLE année
    const promus = await db.eleve.findMany({ where: { id: { in: elevesAvant.map((e) => e.id) }, classeActuelleId: { in: classesNouvelle.map((c) => c.id) } } });
    const pass = Boolean(nouvelle?.active) && ancienne?.active === false && classesNouvelle.length === classesAvant.length && periodesNouvelle >= 3 && r.promus === promus.length && r.promus + r.sansClasse + r.diplomes === elevesAvant.length;
    results.push({
      test: 'T17 (F9) — Clôture d\'année : classes + périodes de la nouvelle année',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `nouvelle année active=${nouvelle?.active}, ancienne désactivée=${ancienne?.active === false} · classes clonées ${classesNouvelle.length}/${classesAvant.length} · périodes ${periodesNouvelle} · promus=${r.promus} (tous affectés à des classes de la NOUVELLE année), sans affectation=${r.sansClasse}, diplômés=${r.diplomes}`,
    });
    // ---- Restauration complète de l'état démo ----
    for (const e of elevesAvant) {
      await db.eleve.update({ where: { id: e.id }, data: { classeActuelleId: e.classeActuelleId } });
    }
    await db.eleveHistoriqueClasse.deleteMany({ where: { classeId: { in: classesNouvelle.map((c) => c.id) } } });
    await db.periode.deleteMany({ where: { anneeScolaireId: r.nouvelleAnneeId } });
    await db.classe.deleteMany({ where: { anneeScolaireId: r.nouvelleAnneeId } });
    await db.emploiTemps.updateMany({ where: { ecoleId: ecole.id, statut: 'termine' }, data: { statut: 'actif' } });
    await db.notification.deleteMany({ where: { sujet: { contains: 'Transition d\'année' } } });
    await db.anneeScolaire.delete({ where: { id: r.nouvelleAnneeId } });
    await db.anneeScolaire.update({ where: { id: annee!.id }, data: { active: true } });
  }

  // ================= T18 (F12) — Rangs recalculés pour toute la classe =================
  {
    const eval_ = await db.evaluation.findFirst({ where: { ecoleId: ecole.id }, include: { classe: true } });
    const classeId = eval_!.classeId;
    const periodeId = eval_!.periodeId;
    const elevesClasse = await db.eleve.findMany({ where: { classeActuelleId: classeId, statut: 'actif' } });
    // Bulletins seed existants (moyennes 14.3 / 13.2) → on capture leurs rangs pour restauration
    const seedBulletins = await db.bulletin.findMany({ where: { eleveId: { in: elevesClasse.map((e) => e.id) }, periodeId } });
    const rangsSeed = new Map(seedBulletins.map((b) => [b.id, b.rang]));
    // Génère pour 2 élèves SANS bulletin seed (indices 2 et 3 de la classe) dans l'ordre inverse des moyennes
    const cibles = elevesClasse.filter((e) => !seedBulletins.some((b) => b.eleveId === e.id)).slice(0, 2);
    let pass = cibles.length === 2;
    let detailMoy = '';
    if (pass) {
      await genererBulletinCore(ctx, { eleveId: cibles[0].id, periodeId, classeId });
      await genererBulletinCore(ctx, { eleveId: cibles[1].id, periodeId, classeId });
      // Dernière version par élève
      const tous = await db.bulletin.findMany({ where: { eleveId: { in: elevesClasse.map((e) => e.id) }, periodeId }, orderBy: { version: 'desc' } });
      const derniers = new Map<string, typeof tous[0]>();
      for (const b of tous) if (!derniers.has(b.eleveId)) derniers.set(b.eleveId, b);
      const classes = [...derniers.values()].filter((b) => b.moyenneGenerale !== null);
      const tries = [...classes].sort((a, b) => (b.moyenneGenerale ?? 0) - (a.moyenneGenerale ?? 0));
      detailMoy = tries.map((b) => `${(b.moyenneGenerale ?? 0).toFixed(1)}→${b.rang}`).join(' ');
      for (let i = 1; i < tries.length; i++) {
        if (tries[i].rang! < tries[i - 1].rang!) pass = false; // rangs strictement croissants sur moyennes décroissantes
      }
      if (tries.some((b) => b.rang === null)) pass = false;
      // Nettoyage : versions créées par le test + restauration des rangs seed
      await db.bulletin.deleteMany({ where: { eleveId: { in: cibles.map((c) => c.id) }, periodeId, version: { gt: 1 } } });
      for (const [id, rang] of rangsSeed) {
        await db.bulletin.update({ where: { id }, data: { rang: rang } });
      }
    }
    results.push({
      test: 'T18 (F12) — Rangs recalculés pour toute la classe',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `moyenne→rang après chaque génération : ${detailMoy || 'n/a'} — le rang ne dépend plus de l'ordre de génération (recalcul transactionnel de la classe entière)`,
    });
  }

  // ================= T19 (F13) — Rattachement parent + notification réelle =================
  {
    // Nouvel élève sans parent
    const insc = await inscrireEleveCore(ctx, ecole.id, { nom: `${MARK}Orphelin`, prenom: 'Test', dateNaissance: new Date('2013-07-07'), lieuNaissance: 'Dakar', sexe: 'M' });
    const incident = await db.incident.create({
      data: { eleveId: insc.eleveId, dateHeure: new Date(), type: 'comportement', description: `${MARK} incident`, gravite: 'leger', declareParId: dir.id },
    });
    const s1 = await sanctionnerCore(ctx, { incidentId: incident.id, type: 'avertissement', description: MARK });
    // Rattachement d'un parent EXISTANT disposant d'un compte (notifiable)
    const parentAvecCompte = await db.parentTuteur.findFirst({
      where: { utilisateurId: { not: null }, eleves: { none: { eleveId: insc.eleveId } } },
    });
    const r = await rattacherParentCore(ctx, { eleveId: insc.eleveId, parentId: parentAvecCompte!.id });
    const s2 = await sanctionnerCore(ctx, { incidentId: incident.id, type: 'retenue', description: MARK });
    const lien = await db.eleveParent.findUnique({ where: { eleveId_parentId: { eleveId: insc.eleveId, parentId: r.parentId } } });
    const pass = Boolean(lien) && s2.notificationsEnvoyees > s1.notificationsEnvoyees;
    results.push({
      test: 'T19 (F13) — Rattachement d\'un parent → notifications parentales réelles',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `sanction AVANT rattachement: ${s1.notificationsEnvoyees} notif(s) · EleveParent créé avec un parent notifiable=${Boolean(lien)} · sanction APRÈS: ${s2.notificationsEnvoyees} notif(s) — les parents notifiés ne sont plus seulement ceux du seed`,
    });
    await db.sanction.deleteMany({ where: { incidentId: incident.id } });
    await db.notification.deleteMany({ where: { corps: { contains: MARK } } });
    await db.incident.delete({ where: { id: incident.id } });
    await db.eleveParent.deleteMany({ where: { eleveId: insc.eleveId } });
    await db.eleveHistoriqueClasse.deleteMany({ where: { eleveId: insc.eleveId } });
    await db.eleve.delete({ where: { id: insc.eleveId } });
  }

  // ================= T20 (F13) — Réservation de RDV par le parent =================
  {
    const parentLien = await db.eleveParent.findFirst({ where: { eleve: { ecoleId: ecole.id } }, include: { parent: { include: { utilisateur: true } } } });
    const ctxParent: Ctx = { utilisateurId: parentLien!.parent.utilisateurId!, ecoleId: ecole.id, type: 'parent', permissions: new Set() };
    const personnel = await db.personnel.findFirst({ where: { ecoleId: ecole.id } });
    const creneau = await ouvrirCreneauRdvCore(ctx, {
      personnelId: personnel!.id, date: new Date(Date.now() + 7 * 86400000), heureDebut: '10:00', heureFin: '10:15',
    });
    const r1 = await reserverRdvCore(ctxParent, { creneauRdvId: creneau.creneauId, eleveId: parentLien!.eleveId, motif: MARK });
    const r2 = await attendu(() => reserverRdvCore(ctxParent, { creneauRdvId: creneau.creneauId, eleveId: parentLien!.eleveId }));
    await annulerRdvCore(ctxParent, r1.rdvId);
    const creneauApres = await db.creneauRdv.findUnique({ where: { id: creneau.creneauId } });
    const pass = Boolean(r1.rdvId) && r2.rejete && creneauApres?.statut === 'disponible';
    results.push({
      test: 'T20 (F13) — Réservation de RDV par un parent (double réservation impossible)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `réservation: OK · 2e réservation du même créneau: ${r2.rejete ? 'REFUSÉE' : 'acceptée (?)'} · après annulation par le parent: créneau de nouveau « ${creneauApres?.statut} » — les créneaux ouverts sont enfin réservables`,
    });
    await db.notification.deleteMany({ where: { corps: { contains: MARK } } });
    await db.rdv.deleteMany({ where: { motif: MARK } });
    await db.creneauRdv.deleteMany({ where: { id: creneau.creneauId } });
  }

  // ================= T21 (F19) — Références de paiement uniques =================
  {
    const { fraisId } = (globalThis as any).__t1;
    const ech = await db.echeanceFrais.findFirst({ where: { fraisId, statut: { in: ['impayee', 'partiel'] } } });
    const refs = new Set<string>();
    for (let i = 0; i < 3; i++) {
      // Allocation ciblée + annulation immédiate : le restant dû reste constant
      const r = await encaisserPaiementCore(ctx, { eleveId: ech!.eleveId, montant: 100_000, modePaiement: 'espece', echeanceId: ech!.id });
      refs.add(r.reference);
      await annulerPaiementCore(ctx, r.paiementId, `${MARK} ref unique`);
    }
    // Période : le code T1 est recréable pour une AUTRE année (F19)
    const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
    const periodeDoublon = await attendu(() => db.periode.create({
      data: { ecoleId: ecole.id, anneeScolaireId: annee!.id, code: 'T1', libelle: 'Doublon', dateDebut: new Date(), dateFin: new Date(), typeBulletin: 'college_lycee' },
    }));
    const pass = refs.size === 3 && periodeDoublon.rejete;
    results.push({
      test: 'T21 (F19) — Unicités : référence paiement + code période par année',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `3 encaissements dans la même seconde → ${refs.size} références distinctes (suffixe aléatoire) · recréer la période T1 sur la MÊME année: ${periodeDoublon.rejete ? 'REFUSÉ (@@unique par année)' : 'accepté (?)'}`,
    });
  }

  // ================= T22 (F4) — Facturation SaaS idempotente =================
  {
    const r1 = await genererFacturesSaasCore(superCtx);
    const r2 = await genererFacturesSaasCore(superCtx);
    const pass = r1.crees >= 1 && r2.crees === 0;
    results.push({
      test: 'T22 (F4) — Génération des factures SaaS (idempotence)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `1re exécution: ${r1.crees} facture(s) créée(s) pour la période courante · 2e exécution: ${r2.crees} créée(s), ${r2.sautes} sautée(s) — la facturation mensuelle existe et ne double pas`,
    });
    const periodeCourante = new Date().toISOString().slice(0, 7);
    await db.factureSaas.deleteMany({ where: { ecoleId: ecole.id, periode: periodeCourante, statut: 'impayee' } });
  }

  // ================= T23 (F10) — TOTP réel =================
  {
    const secret = process.env.SG_TOTP_SECRET_DEMO || 'JBSWY3DPEHPK3PXP';
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const base32Decode = (sv: string): Buffer => {
      let bits = '';
      for (const c of sv.toUpperCase().replace(/=+$/, '')) {
        const idx = ALPHABET.indexOf(c);
        if (idx >= 0) bits += idx.toString(2).padStart(5, '0');
      }
      const octets: number[] = [];
      for (let i = 0; i + 8 <= bits.length; i += 8) octets.push(parseInt(bits.slice(i, i + 8), 2));
      return Buffer.from(octets);
    };
    const pas = Math.floor(Date.now() / 30000);
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(pas % 2 ** 32, 4);
    const hmac = createHmac('sha1', base32Decode(secret)).update(buf).digest();
    const off = hmac[hmac.length - 1] & 0xf;
    const codeValide = String((((hmac[off] & 0x7f) << 24) | (hmac[off + 1] << 16) | (hmac[off + 2] << 8) | hmac[off + 3]) % 1_000_000).padStart(6, '0');
    const okValide = verifierCodeTotp(secret, codeValide);
    const okFaux = verifierCodeTotp(secret, '000000') && codeValide !== '000000';
    // Défi 2FA en base : mauvais code → refus SANS session
    const jeton = await db.jetonAuth.create({
      data: { utilisateurId: dir.id, email: dir.email, type: '2fa_challenge', tokenHash: randomBytes(16).toString('hex'), expireLe: new Date(Date.now() + 5 * 60000) },
    });
    const rDefi = await validerDefi2FA(jeton.id, '123456', 'ua', '127.0.0.8');
    const pass = okValide && !okFaux && !rDefi.ok;
    results.push({
      test: 'T23 (F10) — 2FA TOTP réelle (RFC 6238)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `code TOTP calculé accepté=${okValide} · code invalide rejeté=${!okFaux} · défi en base avec mauvais code: ${!rDefi.ok ? 'REFUSÉ' : 'session ouverte (?)'} — la 2FA n'est plus factice`,
    });
    await db.jetonAuth.delete({ where: { id: jeton.id } });
  }

  // ================= T24 (F11) — Anti-énumération + throttle IP =================
  {
    // a) Message IDENTIQUE pour email inconnu et mot de passe erroné
    const rInconnu = await tenterConnexion('personne.inconnue@nulle.part', 'MotDePasse!1', 'ua', '127.0.0.7');
    const rFauxMdp = await tenterConnexion('comptable@vinci.sn', 'MauvaisMotDePasse!1', 'ua', '127.0.0.7');
    const memeMessage = !rInconnu.ok && !rFauxMdp.ok && 'erreur' in rInconnu && 'erreur' in rFauxMdp && (rInconnu as any).erreur === (rFauxMdp as any).erreur;
    // b) Throttle : 20 échecs pré-existants depuis l'IP → refus immédiat
    const ip = '10.99.99.99';
    await db.tentativeConnexion.createMany({
      data: Array.from({ length: 20 }, () => ({ email: 'x@example.com', adresseIp: ip, succes: false, motifEchec: 'mot_de_passe' })),
    });
    const rThrottle = await tenterConnexion('mamadou.fall@vinci.sn', 'MotDePasse!1', 'ua', ip);
    const throttleOk = !rThrottle.ok && (rThrottle as any).erreur.includes('Trop de tentatives');
    await db.tentativeConnexion.deleteMany({ where: { adresseIp: ip } });
    const pass = memeMessage && throttleOk;
    results.push({
      test: 'T24 (F11) — Anti-énumération + limitation par IP',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `email inconnu vs mot de passe erroné: messages ${memeMessage ? 'IDENTIQUES (aucun indice)' : 'différents (énumération possible!)'} · 20 échecs depuis une IP → connexion ${throttleOk ? 'BLOQUÉE (throttle 15 min)' : 'acceptée (?)'}`,
    });
  }

  // ---- Nettoyage final ----
  await preCleanup();
  const restants = await db.paiement.count({ where: { referenceTransaction: { contains: MARK } } });

  console.log('\n══════════════════ RÉSULTATS ══════════════════');
  for (const r of results) {
    console.log(`\n▶ ${r.test}`);
    console.log(`  ${r.verdict}`);
    console.log(`  ${r.detail}`);
  }
  const passes = results.filter((r) => r.verdict.startsWith('PASS')).length;
  console.log(`\n══════════════════ TOTAL : ${passes}/${results.length} PASS · résidus base: ${restants} ══════════════════`);
  (globalThis as any).__bilan = `${passes}/${results.length}`;
}

async function preCleanup() {
  try {
    await db.paiementEcheance.deleteMany({ where: { paiement: { referenceTransaction: { contains: MARK } } } });
    await db.paiement.deleteMany({ where: { referenceTransaction: { contains: MARK } } });
    await db.echeanceFrais.deleteMany({ where: { frais: { libelle: { contains: MARK } } } });
    await db.frais.deleteMany({ where: { libelle: { contains: MARK } } });
    await db.mouvementStock.deleteMany({ where: { motif: MARK } });
    await db.sortieAnticipee.deleteMany({ where: { recupereParNom: { contains: MARK } } });
    await db.notification.deleteMany({ where: { corps: { contains: MARK } } });
    await db.rdv.deleteMany({ where: { motif: MARK } });
    await db.incident.deleteMany({ where: { description: { contains: MARK } } });
    await db.utilisateurRole.deleteMany({ where: { utilisateur: { email: { contains: 'regression-' } } } });
    await db.eleveHistoriqueClasse.deleteMany({ where: { eleve: { nom: { contains: MARK } } } });
    await db.eleve.deleteMany({ where: { nom: { contains: MARK } } });
    // Écoles de test créées par T12/T13 : suppression complète en ordre FK
    const ecolesTest = await db.ecole.findMany({ where: { slug: { startsWith: 'regression-' } } });
    for (const e of ecolesTest) {
      await db.$executeRawUnsafe(`DELETE FROM "_EcoleToPermission" WHERE "A" = '${e.id}';`).catch(() => {});
      await db.rolePermission.deleteMany({ where: { role: { ecoleId: e.id } } });
      await db.role.deleteMany({ where: { ecoleId: e.id } });
      await db.utilisateurRole.deleteMany({ where: { role: { ecoleId: e.id } } });
      await db.classe.deleteMany({ where: { ecoleId: e.id } });
      await db.periode.deleteMany({ where: { ecoleId: e.id } });
      await db.anneeScolaire.deleteMany({ where: { ecoleId: e.id } });
      await db.niveau.deleteMany({ where: { section: { cycle: { ecoleId: e.id } } } });
      await db.section.deleteMany({ where: { cycle: { ecoleId: e.id } } });
      await db.cycle.deleteMany({ where: { ecoleId: e.id } });
      await db.personnel.deleteMany({ where: { ecoleId: e.id } });
      await db.sessionUtilisateur.deleteMany({ where: { utilisateur: { ecoleId: e.id } } });
      await db.utilisateur.deleteMany({ where: { ecoleId: e.id } });
      await db.factureSaas.deleteMany({ where: { ecoleId: e.id } });
      await db.abonnement.deleteMany({ where: { ecoleId: e.id } });
      await db.auditLog.deleteMany({ where: { ecoleId: e.id } });
      await db.ecole.update({ where: { id: e.id }, data: { planCourantId: null } });
      await db.ecole.delete({ where: { id: e.id } }).catch(() => {});
    }
    await db.auditLog.deleteMany({ where: { details: { contains: MARK } } });
  } catch (e) {
    console.error('Erreur pré-nettoyage:', e);
  }
}

main()
  .catch(async (e) => {
    console.error('ERREUR SCRIPT:', e);
    await preCleanup();
    process.exit(1);
  })
  .finally(() => db.$disconnect());
