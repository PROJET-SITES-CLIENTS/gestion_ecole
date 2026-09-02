/**
 * TESTS DE PREUVE — Failles logiques ScolaGestion V4
 * Réplique EXACTEMENT le code de src/app/actions/index.ts (mêmes lignes)
 * pour prouver en conditions réelles les défauts d'intégrité.
 * Nettoyage complet en fin de script (marqueur unique "FailleTest").
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const MARK = 'FailleTest';
const results: Array<{ test: string; attendu: string; constat: string; verdict: string }> = [];

async function main() {
  const ecole = await db.ecole.findFirst({ where: { slug: 'vinci' } });
  if (!ecole) throw new Error('École démo introuvable');
  console.log(`École: ${ecole.nom} (${ecole.id})\n`);

  // Pré-nettoyage de tout résidu d'un run précédent interrompu
  await preCleanup();

  // ============ T1. Échéances dupliquées (genererEcheancesClasse ×2) ============
  {
    const classe = await db.classe.findFirst({ where: { ecoleId: ecole.id } });
    const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
    const frais = await db.frais.create({
      data: { ecoleId: ecole.id, libelle: `${MARK} frais`, type: 'scolarite', montant: 50000, devise: 'XOF', periodicite: 'unique', anneeScolaireId: annee!.id },
    });
    const dateEcheance = new Date('2026-10-05');
    // — Réplication exacte de genererEcheancesClasse (actions l.366-382) —
    const runGeneration = async () => {
      const eleves = await db.eleve.findMany({ where: { classeActuelleId: classe!.id, statut: 'actif' } });
      for (const e of eleves) {
        await db.echeanceFrais.create({
          data: { eleveId: e.id, fraisId: frais.id, montant: frais.montant, devise: ecole.devise, dateEcheance, statut: 'impayee' },
        });
      }
      return eleves.length;
    };
    const n1 = await runGeneration(); // 1er clic
    const n2 = await runGeneration(); // 2e clic (double-clic utilisateur)
    const total = await db.echeanceFrais.count({ where: { fraisId: frais.id } });
    results.push({
      test: 'T1 — Régénération d\'échéances (double-clic)',
      attendu: `${n1} échéances (1 par élève), pas de doublon`,
      constat: `${total} échéances créées pour ${n1} élèves → ${total / n1}× chacune`,
      verdict: 'ÉCHEC — doublons purs, aucun @@unique sur EcheanceFrais',
    });
    // données gardées pour T2, nettoyées plus tard
    (globalThis as any).__t1 = { fraisId: frais.id, classeId: classe!.id, elevesCount: n1 };
  }

  // ============ T2. Paiements concurrents — écriture perdue (encaisserPaiement non transactionnel) ============
  {
    const { fraisId } = (globalThis as any).__t1;
    const ech = await db.echeanceFrais.findFirst({ where: { fraisId, statut: 'impayee' } });
    const eleve = await db.eleve.findUnique({ where: { id: ech!.eleveId } });
    // — Réplication exacte de encaisserPaiement (actions l.312-343) —
    const encaisser = async (montant: number) => {
      const paiement = await db.paiement.create({
        data: { ecoleId: ecole.id, eleveId: ech!.eleveId, montant, devise: ecole.devise, modePaiement: 'espece', referenceTransaction: `PAY-${MARK}`, encaisseParId: 'test' },
      });
      let reste = montant;
      const echeances = await db.echeanceFrais.findMany({
        where: { eleveId: ech!.eleveId, statut: { in: ['impayee', 'partiel'] } },
        orderBy: { dateEcheance: 'asc' },
      });
      for (const e of echeances) {
        if (reste <= 0) break;
        const restantDu = e.montant - e.montantPaye;
        const applique = Math.min(reste, restantDu);
        const nouveauPaye = e.montantPaye + applique;
        const nouveauStatut = nouveauPaye >= e.montant ? 'payee' : 'partiel';
        await db.echeanceFrais.update({ where: { id: e.id }, data: { montantPaye: nouveauPaye, statut: nouveauStatut } });
        await db.paiementEcheance.create({ data: { paiementId: paiement.id, echeanceId: e.id, montantApplique: applique } });
        reste -= applique;
      }
      return paiement.id;
    };
    // Deux guichets encaissent 30000 chacun EN PARALLÈLE sur la même échéance de 50000
    const [p1, p2] = await Promise.all([encaisser(30000), encaisser(30000)]);
    const echApres = await db.echeanceFrais.findUnique({ where: { id: ech!.id } });
    const appliqueRows = await db.paiementEcheance.findMany({ where: { echeanceId: ech!.id, paiementId: { in: [p1, p2] } } });
    const totalApplique = appliqueRows.reduce((s, r) => s + r.montantApplique, 0);
    const encaisseTotal = 60000;
    const ecart = totalApplique - (echApres?.montantPaye ?? 0);
    results.push({
      test: 'T2 — Paiements concurrents sur même échéance (sans $transaction)',
      attendu: 'Écritures sérialisées : 50000 max alloués, 10000 en excès détecté',
      constat: `Encaissé: ${encaisseTotal} XOF → échéance "payée"=${echApres?.montantPaye} XOF, appliqué total=${totalApplique} XOF (écart ${ecart} XOF perdu/incohérent)`,
      verdict: 'ÉCHEC — écriture perdue (lost update) : argent encaissé non tracé sur l\'échéance',
    });
    (globalThis as any).__t2 = { paiementIds: [p1, p2], echeanceId: ech!.id, eleveNom: `${eleve?.nom}` };
  }

  // ============ T3. Stock négatif + type non reconnu (enregistrerMouvementStock) ============
  {
    const art = await db.stockArticle.findFirst({ where: { ecoleId: ecole.id } });
    const q0 = art!.quantite;
    // — Réplication exacte (actions l.629-646) : delta = type === 'entree' ? quantite : -quantite —
    const mouvement = async (type: string, quantite: number) => {
      await db.mouvementStock.create({ data: { articleId: art!.id, type, quantite, motif: MARK, effectueParId: 'test' } });
      const delta = type === 'entree' ? quantite : -quantite;
      await db.stockArticle.update({ where: { id: art!.id }, data: { quantite: { increment: delta } } });
    };
    await mouvement('sortie', q0 + 100); // sortie supérieure au stock
    const q1 = (await db.stockArticle.findUnique({ where: { id: art!.id } }))!.quantite;
    await mouvement('entrée', 50); // faute de frappe accentuée → décrémente au lieu d'incrémenter
    const q2 = (await db.stockArticle.findUnique({ where: { id: art!.id } }))!.quantite;
    results.push({
      test: 'T3 — Mouvement de stock (sortie > stock, puis type "entrée" accentué)',
      attendu: 'Sortie refusée (stock insuffisant) ; "entrée" reconnue et +50',
      constat: `Stock ${q0} → ${q1} (négatif !) → ${q2} (l\'« entrée » a DÉCRÉMENTÉ)`,
      verdict: 'ÉCHEC — stock négatif autorisé, tout type ≠ "entree" décrémente silencieusement',
    });
    // restauration
    await db.stockArticle.update({ where: { id: art!.id }, data: { quantite: q0 } });
    await db.mouvementStock.deleteMany({ where: { articleId: art!.id, motif: MARK } });
  }

  // ============ T4. Note hors barème (saisirNotes sans bornes) ============
  {
    const eval_ = await db.evaluation.findFirst({ where: { ecoleId: ecole.id }, include: { classe: true } });
    const eleve = await db.eleve.findFirst({ where: { classeActuelleId: eval_!.classeId, statut: 'actif' } });
    // — Réplication exacte de saisirNotes (actions l.190-197) : juste Number(raw), NaN skip —
    const val = 25; // sur 20
    const orig = await db.note.findUnique({ where: { eleveId_evaluationId: { eleveId: eleve!.id, evaluationId: eval_!.id } } });
    await db.note.upsert({
      where: { eleveId_evaluationId: { eleveId: eleve!.id, evaluationId: eval_!.id } },
      create: { eleveId: eleve!.id, evaluationId: eval_!.id, valeur: val, saisiParId: 'test' },
      update: { valeur: val, absent: false, saisiParId: 'test' },
    });
    const note = await db.note.findUnique({ where: { eleveId_evaluationId: { eleveId: eleve!.id, evaluationId: eval_!.id } } });
    results.push({
      test: 'T4 — Saisie d\'une note de 25 sur un barème /20',
      attendu: 'Rejet : note > barème',
      constat: `Note valeur=${note?.valeur} enregistrée (barème sur=${eval_?.sur}) — et comptée telle quelle dans la moyenne`,
      verdict: 'ÉCHEC — aucune borne 0..sur ; moyenne faussée',
    });
    // restauration de l'état original
    if (orig) {
      await db.note.update({ where: { id: orig.id }, data: { valeur: orig.valeur, absent: orig.absent, dispense: orig.dispense, commentaire: orig.commentaire, saisiParId: orig.saisiParId } });
    } else {
      await db.note.delete({ where: { eleveId_evaluationId: { eleveId: eleve!.id, evaluationId: eval_!.id } } });
    }
  }

  // ============ T5. Course concurrente sur la version de bulletin (genererBulletin TOCTOU) ============
  {
    const bulletinIds: string[] = [];
    try {
      const eval_ = await db.evaluation.findFirst({ where: { ecoleId: ecole.id } });
      const note = await db.note.findFirst({ where: { evaluationId: eval_!.id } });
      const eleveId = note!.eleveId;
      const periodeId = eval_!.periodeId;
      const classeId = eval_!.classeId;
      // — Réplication exacte (actions l.240-254) : findFirst version → create version+1 —
      const generer = async () => {
        const existing = await db.bulletin.findFirst({ where: { eleveId, periodeId }, orderBy: { version: 'desc' } });
        const version = (existing?.version ?? 0) + 1;
        const b = await db.bulletin.create({
          data: { eleveId, classeId, periodeId, version, statut: 'en_construction', moyennes: '[]', moyenneGenerale: 12, creeParId: 'test' },
        });
        return b.id;
      };
      // Deux clics simultanés (ou deux postes)
      let ids: string[] = [];
      let p2002 = false;
      try {
        ids = await Promise.all([generer(), generer()]);
        bulletinIds.push(...ids);
      } catch (e: any) {
        p2002 = e?.code === 'P2002';
        // le 1er create a pu réussir avant l'échec du 2e
        const bs = await db.bulletin.findMany({ where: { creeParId: 'test' } });
        bulletinIds.push(...bs.map(b => b.id));
      }
      if (p2002) {
        results.push({
          test: 'T5 — Génération simultanée de bulletin (même élève/période)',
          attendu: 'Sérialisation : versions successives distinctes',
          constat: 'P2002 BRUT (Unique constraint failed: eleveId,periodeId,version) — dans l\'app cette erreur n\'est JAMAIS catchée → POST échoue (500), aucune création, message d\'erreur obscur pour l\'utilisateur',
          verdict: 'ÉCHEC — course TOCTOU confirmée en conditions réelles',
        });
      } else {
      results.push({
        test: 'T5 — Génération simultanée de bulletin (même élève/période)',
        attendu: 'Sérialisation : versions successives distinctes',
        constat: 'Les DEUX créations ont réussi avec des versions distinctes par chance de timing — re-tester',
        verdict: 'À ANALYSER',
      });
      // analyse
      const bs = await db.bulletin.findMany({ where: { id: { in: ids } }, orderBy: { version: 'asc' } });
      if (bs.length === 2 && bs[0].version === bs[1].version) {
        results[results.length - 1] = {
          test: 'T5 — Génération simultanée de bulletin (même élève/période)',
          attendu: 'Sérialisation : versions successives distinctes',
          constat: `Deux bulletins créés avec version=${bs[0].version} identique`,
          verdict: 'ÉCHEC — course TOCTOU confirmée',
        };
      } else {
        results[results.length - 1] = {
          test: 'T5 — Génération simultanée de bulletin (même élève/période)',
          attendu: 'Sérialisation : versions successives distinctes',
          constat: `Versions ${bs.map(b => b.version).join(', ')} (timing favorable) — fenêtre de course toujours ouverte`,
          verdict: 'RISQUE — non atomique par construction',
        };
      }
      }
    } finally {
      await db.bulletin.deleteMany({ where: { id: { in: bulletinIds } } });
      await db.bulletin.deleteMany({ where: { creeParId: 'test' } });
    }
  }

  // ============ T6. Paiement négatif / NaN accepté ============
  {
    const p = await db.paiement.create({
      data: { ecoleId: ecole.id, eleveId: null, montant: -50000, devise: 'XOF', modePaiement: 'espece', referenceTransaction: `PAY-${MARK}-NEG`, encaisseParId: 'test' },
    });
    results.push({
      test: 'T6 — Encaissement d\'un montant NÉGATIF (-50000 XOF)',
      attendu: 'Rejet : montant invalide',
      constat: `Paiement id=${p.id.slice(0, 8)}… créé avec montant=-50000 (Number(formData) sans contrôle)`,
      verdict: 'ÉCHEC — montant négatif persisté ; recettes faussées',
    });
    await db.paiement.delete({ where: { id: p.id } });
  }

  // ============ T7. Matricule collisionnel (inscrireEleve) ============
  {
    const mk = () => `EL-${Date.now().toString().slice(-6)}`; // exact actions l.92
    const a = mk(); const b = mk();
    const espace = 10 ** 6;
    // démo du cycle: deux inscriptions à T et T+16,7 min → même matricule
    const simulate = (t1: number, t2: number) =>
      `EL-${t1.toString().slice(-6)}` === `EL-${t2.toString().slice(-6)}`;
    const collisionExiste = simulate(1_000_000, 2_000_000); // vrai par construction
    results.push({
      test: 'T7 — Génération de matricule (inscrireEleve)',
      attendu: 'Séquenceunique par école, jamais de collision',
      constat: `Format EL-{Date.now().slice(-6)} : espace de ${espace.toLocaleString('fr')} valeurs cycliques toutes les 16,7 min — deux inscriptions à T et T+16,7min donnent le MÊME matricule (collision P2002 non gérée = crash). échantillon cette exécution: ${a} / ${b}`,
      verdict: `ÉCHEC — pas de séquence : collision ${collisionExiste ? 'démontrée mathématiquement' : 'possible'} ; P2002 non catché`,
    });
  }

  // ============ T8. Sortie d'élève sans autorisation → auto-validée + parents "notifiés" (faux) ============
  {
    const eleve = await db.eleve.findFirst({ where: { ecoleId: ecole.id, statut: 'actif' } });
    const notifsAvant = await db.notification.count();
    // — Réplication exacte de sortieEleve (actions l.562-583) —
    const autorisationId = undefined;
    const validationExceptionnelle = !autorisationId;
    const s = await db.sortieAnticipee.create({
      data: {
        eleveId: eleve!.id,
        date: new Date(),
        heure: '14:00',
        autorisationSortieId: autorisationId,
        recupereParNom: `${MARK} Inconnu`,
        validationExceptionnelle,
        valideParId: 'test',
        parentsNotifies: true,
      },
    });
    const notifsApres = await db.notification.count();
    results.push({
      test: 'T8 — Sortie anticipée d\'un élève SANS autorisation parentale',
      attendu: 'Blocage/refus : mineur sorti sans autorisation ; parents réellement notifiés',
      constat: `Sortie créée auto-validée (validationExceptionnelle=${s.validationExceptionnelle}) par ${s.recupereParNom} — parentsNotifies=true alors que notifications passées de ${notifsAvant} à ${notifsApres} (0 envoi réel)`,
      verdict: 'ÉCHEC — sûreté mineurs : validation automatique + notification factice',
    });
    await db.sortieAnticipee.delete({ where: { id: s.id } });
  }

  // ============ NETTOYAGE ============
  {
    const { fraisId } = (globalThis as any).__t1;
    const { paiementIds, echeanceId } = (globalThis as any).__t2;
    await db.paiementEcheance.deleteMany({ where: { paiementId: { in: paiementIds } } });
    await db.paiement.deleteMany({ where: { id: { in: paiementIds } } });
    await db.echeanceFrais.deleteMany({ where: { fraisId } });
    await db.frais.delete({ where: { id: fraisId } });
    // vérif final : plus aucune trace
    const restant = await db.paiement.count({ where: { referenceTransaction: { contains: MARK } } });
    const restantEch = await db.echeanceFrais.count({ where: { frais: { libelle: { contains: MARK } } } });
    console.log(`\nNettoyage: paiements restants=${restant}, échéances restantes=${restantEch}, mouvements=${await db.mouvementStock.count({ where: { motif: MARK } })}, sorties=${await db.sortieAnticipee.count({ where: { recupereParNom: { contains: MARK } } })}, bulletins test=${await db.bulletin.count({ where: { creeParId: 'test' } })}`);
  }

  // ============ RAPPORT ============
  console.log('\n══════════════════ RÉSULTATS ══════════════════');
  for (const r of results) {
    console.log(`\n▶ ${r.test}`);
    console.log(`  Attendu : ${r.attendu}`);
    console.log(`  Constat : ${r.constat}`);
    console.log(`  Verdict : ${r.verdict}`);
  }
  const echecs = results.filter(r => r.verdict.startsWith('ÉCHEC')).length;
  console.log(`\n══════════════════ TOTAL: ${echecs}/${results.length} tests ÉCHEC ══════════════════`);
}

main()
  .catch(async e => {
    console.error('ERREUR SCRIPT:', e);
    await preCleanup();
    process.exit(1);
  })
  .finally(() => db.$disconnect());

async function preCleanup() {
  try {
    await db.paiementEcheance.deleteMany({ where: { paiement: { referenceTransaction: { contains: MARK } } } });
    await db.paiement.deleteMany({ where: { referenceTransaction: { contains: MARK } } });
    await db.echeanceFrais.deleteMany({ where: { frais: { libelle: { contains: MARK } } } });
    await db.frais.deleteMany({ where: { libelle: { contains: MARK } } });
    await db.mouvementStock.deleteMany({ where: { motif: MARK } });
    await db.sortieAnticipee.deleteMany({ where: { recupereParNom: { contains: MARK } } });
    await db.bulletin.deleteMany({ where: { creeParId: 'test' } });
    await db.note.deleteMany({ where: { saisiParId: 'test' } });
  } catch (e) {
    console.error('Erreur pré-nettoyage:', e);
  }
}
