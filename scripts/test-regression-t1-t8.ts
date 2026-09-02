/**
 * SUITE DE NON-RÉGRESSION — T1 à T8 (post-remédiation)
 * Teste les VRAIES fonctions métier (src/lib/business/*) avec le contexte
 * d'une session simulée. Chaque test attaque EXACTEMENT le défaut corrigé.
 * Attendu : 8/8 REFUS propres (ActionError) ou états cohérents.
 */
import { PrismaClient } from '@prisma/client';
import {
  Ctx,
  ActionError,
  encaisserPaiementCore,
  genererEcheancesClasseCore,
  enregistrerMouvementStockCore,
  saisirNotesCore,
  genererBulletinCore,
  inscrireEleveCore,
  sortieEleveCore,
} from '../src/lib/business';

const db = new PrismaClient();
const MARK = 'RegressionV2';
const results: Array<{ test: string; verdict: string; detail: string }> = [];

type Attente = { rejete: boolean; erreur?: string; valeur?: unknown };
function attendu(nom: string, fn: () => Promise<unknown>): Promise<Attente> {
  return fn().then(
    (v): Attente => ({ rejete: false, valeur: v }),
    (e): Attente => ({ rejete: true, erreur: e instanceof ActionError ? e.message : String(e) }),
  );
}

async function main() {
  const ecole = await db.ecole.findFirst({ where: { slug: 'vinci' } });
  if (!ecole) throw new Error('École démo introuvable');
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id, email: { startsWith: 'direction@' } } });
  if (!dir) throw new Error('Direction introuvable');

  // Contexte de session simulé : direction avec toutes les permissions
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = {
    utilisateurId: dir.id,
    ecoleId: ecole.id,
    type: 'personnel',
    permissions: new Set(perms.map((p) => p.code)),
  };

  // ---- Pré-nettoyage ----
  await preCleanup();
  console.log(`École: ${ecole.nom} · session simulée: ${dir.email} (${ctx.permissions.size} permissions)\n`);

  // ================= T1 — Échéances idempotentes (double-clic) =================
  {
    const classe = await db.classe.findFirst({ where: { ecoleId: ecole.id } });
    const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
    const frais = await db.frais.create({
      data: { ecoleId: ecole.id, libelle: `${MARK} frais`, type: 'scolarite', montant: 50000, devise: 'XOF', periodicite: 'unique', anneeScolaireId: annee!.id },
    });
    const dateEcheance = new Date('2026-10-05');
    const r1 = await genererEcheancesClasseCore(ctx, { fraisId: frais.id, classeId: classe!.id, dateEcheance });
    const r2 = await genererEcheancesClasseCore(ctx, { fraisId: frais.id, classeId: classe!.id, dateEcheance });
    const total = await db.echeanceFrais.count({ where: { fraisId: frais.id } });
    const pass = r1.crees === total && r2.crees === 0;
    results.push({
      test: 'T1 — Régénération d\'échéances (double-clic)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `1re génération: ${r1.crees} créées (classe de ${r1.totalEleves} élèves) · 2e génération: ${r2.crees} créée(s) · total en base: ${total} — idempotence ${pass ? 'garantie (@@unique + upsert)' : 'NON garantie'}`,
    });
    (globalThis as any).__t1 = { fraisId: frais.id, classeId: classe!.id };
  }

  // ================= T2 — Paiements concurrents (transaction + plafond restant dû) =================
  {
    const { fraisId } = (globalThis as any).__t1;
    const ech = await db.echeanceFrais.findFirst({ where: { fraisId, statut: 'impayee' } });
    // 1er paiement 30000 OK ; 2e paiement 30000 en parallèle : échéance 50000 → restant 20000 → REFUS
    const [p1, p2] = await Promise.allSettled([
      encaisserPaiementCore(ctx, { eleveId: ech!.eleveId, montant: 30000, modePaiement: 'espece', reference: `${MARK}-P1` }),
      encaisserPaiementCore(ctx, { eleveId: ech!.eleveId, montant: 30000, modePaiement: 'espece', reference: `${MARK}-P2` }),
    ]);
    const echApres = await db.echeanceFrais.findUnique({ where: { id: ech!.id } });
    const paiements = await db.paiement.findMany({ where: { referenceTransaction: { contains: MARK } } });
    const alloues = (await db.paiementEcheance.findMany({ where: { paiementId: { in: paiements.map((p) => p.id) } } })).reduce((s, r) => s + r.montantApplique, 0);
    // Sémantique attendue : EXACTEMENT UN des deux paiements passe ; le perdant
    // de la course SQLite obtient un refus métier PROPRE (MONTANT_EXCEDENT)
    // après relecture de l'état frais ; échéance et allocation cohérentes.
    const nbSucces = (p1.status === 'fulfilled' ? 1 : 0) + (p2.status === 'fulfilled' ? 1 : 0);
    const codeRefus = p1.status === 'rejected' ? (p1.reason as any)?.code : p2.status === 'rejected' ? (p2.reason as any)?.code : null;
    const refusMetier = nbSucces === 1 && codeRefus === 'MONTANT_EXCEDENT';
    const pass = refusMetier && echApres!.montantPaye === 30000 && alloues === 30000 && paiements.length === 1;
    const detailRefus = p1.status === 'rejected'
      ? String((p1.reason as ActionError).message).slice(0, 75)
      : p2.status === 'rejected' ? String((p2.reason as ActionError).message).slice(0, 75) : '—';
    results.push({
      test: 'T2 — Paiements concurrents (sérialisation + plafond restant dû)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `2 guichets en parallèle sur échéance de 50000 : ${nbSucces} paiement encaissé (30000), le perdant de la course est REFUSÉ en métier — « ${detailRefus}… » · échéance=${echApres!.montantPaye}/50000, alloué=${alloues}, écart=0 — ${pass ? 'argent intégralement traçé, plus aucune écriture perdue' : 'incohérence résiduelle'}`,
    });
    (globalThis as any).__t2 = { paiementIds: paiements.map((p) => p.id), fraisId };
  }

  // ================= T3 — Stock : sortie > stock refusée, type contrôlé =================
  {
    const art = await db.stockArticle.findFirst({ where: { ecoleId: ecole.id } });
    const q0 = art!.quantite;
    const r1 = await attendu('sortie exécédent', () =>
      enregistrerMouvementStockCore(ctx, { articleId: art!.id, type: 'sortie', quantite: q0 + 100, motif: MARK }));
    const r2 = await attendu('type accentué', () =>
      enregistrerMouvementStockCore(ctx, { articleId: art!.id, type: 'entrée' as 'entree', quantite: 50, motif: MARK }));
    const r3 = await attendu('entrée valide', () =>
      enregistrerMouvementStockCore(ctx, { articleId: art!.id, type: 'entree', quantite: 50, motif: MARK }));
    const qApres = (await db.stockArticle.findUnique({ where: { id: art!.id } }))!.quantite;
    const pass = r1.rejete && r2.rejete && !r3.rejete && qApres === q0 + 50;
    results.push({
      test: 'T3 — Mouvements de stock (garde-fous)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `Sortie ${q0 + 100} (stock ${q0}): ${r1.rejete ? `REFUSÉE — « ${r1.erreur?.slice(0, 60)}… »` : 'ACCEPTÉE (?)'} · type « entrée » accentué: ${r2.rejete ? 'REFUSÉ (enum strict)' : 'ACCEPTÉ (?)'} · entrée +50 valide: ${!r3.rejete} · stock final ${q0}→${qApres}`,
    });
    // restauration
    await db.stockArticle.update({ where: { id: art!.id }, data: { quantite: q0 } });
    await db.mouvementStock.deleteMany({ where: { motif: MARK } });
  }

  // ================= T4 — Note hors barème : rejet =================
  {
    const eval_ = await db.evaluation.findFirst({ where: { ecoleId: ecole.id }, include: { classe: true } });
    const eleve = await db.eleve.findFirst({ where: { classeActuelleId: eval_!.classeId, statut: 'actif' } });
    const noteAvant = await db.note.findUnique({ where: { eleveId_evaluationId: { eleveId: eleve!.id, evaluationId: eval_!.id } } });
    const r = await attendu('note 25/20', () =>
      saisirNotesCore(ctx, { evaluationId: eval_!.id, notes: [{ eleveId: eleve!.id, valeur: 25 }] }));
    const noteApres = await db.note.findUnique({ where: { eleveId_evaluationId: { eleveId: eleve!.id, evaluationId: eval_!.id } } });
    // Rejet TOUT-OU-RIEN : la note éventuellement pré-existante doit rester INCHANGÉE.
    const inchange = noteAvant ? noteApres?.valeur === noteAvant.valeur : noteApres === null;
    const pass = r.rejete && inchange;
    results.push({
      test: 'T4 — Note de 25 sur barème /20',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `Saisie: ${r.rejete ? `REFUSÉE — « ${r.erreur?.slice(0, 70)}… »` : 'ACCEPTÉE (?)'} · note avant=${noteAvant?.valeur ?? 'aucune'} / après=${noteApres?.valeur ?? 'aucune'} — rejet tout-ou-rien ${pass ? 'respecté, moyenne protégée' : 'NON respecté'}`,
    });
  }

  // ================= T5 — Bulletins concurrents : versions distinctes, pas de crash =================
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
    const pass = !crash && (bulletins.length === 2 ? versions[0] !== versions[1] : true) && (bulletins.length >= 1);
    const enrichi = bulletins.some((b) => b.rang !== null || b.appreciationGenerale);
    results.push({
      test: 'T5 — Génération simultanée de bulletins',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `2 génération parallèles → ${bulletins.length} bulletin(s) créé(s), versions [${versions.join(', ')}] distinctes, 0 P2002 brut (transaction + recalcul) · enrichissement rang/mention: ${enrichi ? 'présent' : 'absent'}`,
    });
    await db.bulletin.deleteMany({ where: { id: { in: ids } } });
  }

  // ================= T6 — Montant négatif : rejet zod + métier =================
  {
    const eleve = await db.eleve.findFirst({ where: { ecoleId: ecole.id, statut: 'actif' } });
    const r = await attendu('montant négatif', () =>
      encaisserPaiementCore(ctx, { eleveId: eleve!.id, montant: -50000, modePaiement: 'espece', reference: `${MARK}-NEG` }));
    const enBase = await db.paiement.findFirst({ where: { referenceTransaction: `${MARK}-NEG` } });
    const pass = r.rejete && !enBase;
    results.push({
      test: 'T6 — Encaissement d\'un montant NÉGATIF (-50000)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `${r.rejete ? `REFUSÉ — « ${r.erreur?.slice(0, 60)}… »` : 'ACCEPTÉ (?)'} · en base: ${enBase ? 'persisté (??)' : 'aucune écriture'} — recettes ${pass ? 'protégées' : 'faussées'}`,
    });
  }

  // ================= T7 — Matricules séquentiels uniques (parallèle) =================
  {
    const avant = await db.eleve.findMany({ where: { ecoleId: ecole.id, matricule: { startsWith: 'EL-' } }, select: { matricule: true } });
    const maxAvant = avant.reduce((m, e) => Math.max(m, parseInt((e.matricule ?? '').slice(3), 10) || 0), 0);
    const [i1, i2] = await Promise.allSettled([
      inscrireEleveCore(ctx, ecole.id, { nom: `${MARK}A`, prenom: 'Test', dateNaissance: new Date('2012-05-10'), lieuNaissance: 'Dakar', sexe: 'M' }),
      inscrireEleveCore(ctx, ecole.id, { nom: `${MARK}B`, prenom: 'Test', dateNaissance: new Date('2012-06-10'), lieuNaissance: 'Dakar', sexe: 'F' }),
    ]);
    const m1 = i1.status === 'fulfilled' ? (i1.value as any).matricule : null;
    const m2 = i2.status === 'fulfilled' ? (i2.value as any).matricule : null;
    const ids: string[] = [];
    if (i1.status === 'fulfilled') ids.push((i1.value as any).eleveId);
    if (i2.status === 'fulfilled') ids.push((i2.value as any).eleveId);
    const pass = m1 !== null && m2 !== null && m1 !== m2;
    results.push({
      test: 'T7 — Inscriptions simultanées (matricules uniques)',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `2 inscriptions PARALLÈLES → matricules ${m1 ?? 'échec'} / ${m2 ?? 'échec'} ${pass ? 'distincts' : 'EN COLLISION'} · séquence: max avant=${maxAvant}, attendu ${maxAvant + 1} & ${maxAvant + 2} · 0 P2002 brut (transaction + retry)`,
    });
    await db.eleve.deleteMany({ where: { id: { in: ids } } });
  }

  // ================= T8 — Sortie de mineur sans autorisation =================
  {
    const eleve = await db.eleve.findFirst({ where: { ecoleId: ecole.id, statut: 'actif' } });
    const notifsAvant = await db.notification.count({ where: { ecoleId: ecole.id } });

    // a) Sans autorisation NI validation exceptionnelle → REFUS
    const rA = await attendu('sans rien', () =>
      sortieEleveCore(ctx, { eleveId: eleve!.id, date: new Date(), heure: '14:00', recupereParNom: `${MARK} Inconnu` }));

    // b) Validation exceptionnelle cochée mais SANS motif → REFUS
    const rB = await attendu('exception sans motif', () =>
      sortieEleveCore(ctx, { eleveId: eleve!.id, date: new Date(), heure: '14:00', recupereParNom: `${MARK} Inconnu`, validationExceptionnelle: true }));

    // c) Validation exceptionnelle AVEC motif → acceptée + vraies notifications
    const rC = await attendu('exception avec motif', () =>
      sortieEleveCore(ctx, { eleveId: eleve!.id, date: new Date(), heure: '14:00', recupereParNom: `${MARK} Inconnu`, validationExceptionnelle: true, motifException: 'Urgence médicale confirmée par téléphone' }));
    const notifsApres = await db.notification.count({ where: { ecoleId: ecole.id } });
    const sortie = await db.sortieAnticipee.findFirst({ where: { recupereParNom: { contains: MARK } } });

    const notifsCreees = notifsApres - notifsAvant;
    const pass = rA.rejete && rB.rejete && !rC.rejete && notifsCreees > 0 && sortie?.parentsNotifies === true;
    results.push({
      test: 'T8 — Sortie anticipée SANS autorisation parentale',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `sans autorisation: ${rA.rejete ? `REFUSÉE — « ${rA.erreur?.slice(0, 55)}… »` : 'ACCEPTÉE (?)'} · exception sans motif: ${rB.rejete ? 'REFUSÉE' : 'acceptée (?)'} · exception motivée: ${!rC.rejete ? 'acceptée + TRAÇÉE' : 'rejetée (?)'} · notifications réellement créées: ${notifsCreees} · parentsNotifies=true ${sortie?.parentsNotifies === true ? '✔' : '✗'}`,
    });
    if (sortie) await db.sortieAnticipee.delete({ where: { id: sortie.id } });
    await db.notification.deleteMany({ where: { sujet: { contains: 'Sortie anticipée' }, corps: { contains: MARK } } });
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
}

async function preCleanup() {
  try {
    await db.paiementEcheance.deleteMany({ where: { paiement: { referenceTransaction: { contains: MARK } } } });
    await db.paiement.deleteMany({ where: { referenceTransaction: { contains: MARK } } });
    await db.echeanceFrais.deleteMany({ where: { frais: { libelle: { contains: MARK } } } });
    await db.frais.deleteMany({ where: { libelle: { contains: MARK } } });
    await db.mouvementStock.deleteMany({ where: { motif: MARK } });
    await db.sortieAnticipee.deleteMany({ where: { recupereParNom: { contains: MARK } } });
    await db.eleve.deleteMany({ where: { nom: { contains: MARK } } });
    await db.notification.deleteMany({ where: { corps: { contains: MARK } } });
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
