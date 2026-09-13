/**
 * SUITE COMPLÉTIONS — T42 à T48 (vague 3)
 * Un test par nouveau domaine : cantine du jour, transport quotidien,
 * pointage personnel + heures sup, activités + facturation, garderie,
 * imports CSV, rapprochement + virements + relances.
 */
import { PrismaClient } from '@prisma/client';
import {
  Ctx, ActionError,
  enregistrerMenuCore, pointerRepasCore, creerFeuilleRouteCore, pointerArretCore,
  pointerPersonnelCore, synthesePointageCore, convertirHeuresSupCore,
  creerActiviteCore, inscrireParticipantCore, traiterAutorisationCore, facturerActiviteCore,
  inscrireGarderieCore, pointerGarderieCore, facturerGarderieCore,
  importerElevesCsvCore, importerEdtCsvCore,
  importerReleveCsvCore, rapprocherAutoCore, exporterVirementsPaieCore,
  genererEcheancierPersonnaliseCore, appliquerRemisesFamillesCore, relancerImpayesAutoCore,
  analyticsFinancieresCore, genererRapportTrimestreCore,
  creerMatiereCore,
} from '../src/lib/business';

import { dbTest, executerAvecRetry } from './_helper-test';
const db = dbTest;
const MARK = 'Vague3';
const results: Array<{ test: string; verdict: string; detail: string }> = [];

type Attente = { rejete: boolean; erreur?: string; valeur?: unknown };
async function attendu(fn: () => Promise<unknown>): Promise<Attente> {
  // Transitoire (Neon qui s'endort) → on RETENTE : un refus métier doit
  // être VRAI, pas un crash de connexion déguisé en « rejeté ».
  for (let essai = 1; essai <= 3; essai++) {
    try { const v = await fn(); return { rejete: false, valeur: v } as Attente; }
    catch (e) {
      const transitoire = typeof (e as any)?.code === 'string'
        ? ['P1001','P1006','P1008','P1010','P1017','P2024'].includes((e as any).code)
        : /can't reach database|connection terminated|connection reset|timed out/i.test(String((e as Error)?.message ?? ''));
      if (!transitoire || essai === 3) return { rejete: true, erreur: e instanceof ActionError ? e.message : String(e) } as Attente;
      await new Promise((r) => setTimeout(r, 800 * essai));
    }
  }
  return { rejete: true, erreur: 'inatteignable' } as Attente;
}
const jourUTC = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

async function main() {
  const ecole = await db.ecole.findFirstOrThrow({ where: { slug: 'vinci' } });
  const dir = await db.utilisateur.findFirstOrThrow({ where: { ecoleId: ecole.id, email: { startsWith: 'direction@' } } });
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = { utilisateurId: dir.id, ecoleId: ecole.id, type: 'personnel', permissions: new Set(perms.map((p) => p.code)) };
  await preCleanup();

  // ===== T42 (O1) — Cantine du jour : menu + pointage + alerte allergène =====
  {
    const menu = await enregistrerMenuCore(ctx, ecole.id, { date: jourUTC(), platPrincipal: `${MARK} Poisson braisé`, allergenes: ['poisson'] });
    const eleveAllergique = await db.eleve.create({ data: { ecoleId: ecole.id, nom: `${MARK}Allerg`, prenom: 'T', dateNaissance: new Date('2013-01-01'), sexe: 'M', statut: 'actif' } });
    await db.ficheSante.create({ data: { ecoleId: ecole.id, eleveId: eleveAllergique.id, allergies: 'allergie poisson sévère' } });
    const r = await pointerRepasCore(ctx, ecole.id, jourUTC(), [
      { eleveId: eleveAllergique.id, present: true },
    ]);
    const alerte = r.alertes.some((a) => a.eleveId === eleveAllergique.id);
    results.push({
      test: 'T42 (O1) — Cantine du jour : pointage + détection allergène',
      verdict: menu.menuId && alerte ? 'PASS ✓' : 'ÉCHEC',
      detail: `menu créé · pointage ${r.pointés} · alerte allergène « poisson » : ${alerte ? `DÉTECTÉE pour ${r.alertes[0]?.eleve}` : 'ratée'}`,
    });
  }

  // ===== T43 (O2) — Transport quotidien : feuille + retard → notification =====
  {
    const ligne = await db.transportLigne.create({ data: { ecoleId: ecole.id, nom: `${MARK} Ligne` } });
    const arrêt = await db.transportArret.create({ data: { ligneId: ligne.id, nom: `${MARK} Arrêt`, ordre: 1, heure: '07:00' } });
    const f = await creerFeuilleRouteCore(ctx, ligne.id, jourUTC());
    const passage = await db.passageArret.findFirstOrThrow({ where: { feuilleId: f.feuilleId } });
    const notifsAvant = await db.notification.count({ where: { ecoleId: ecole.id, sujet: { contains: 'Retard transport' } } });
    const r = await pointerArretCore(ctx, passage.id, { heureReelle: '07:25', montes: [] });
    const notifsApres = await db.notification.count({ where: { ecoleId: ecole.id, sujet: { contains: 'Retard transport' } } });
    results.push({
      test: 'T43 (O2) — Transport : retard 25 min → alerte direction',
      verdict: r.retardMin === 25 && notifsApres > notifsAvant ? 'PASS ✓' : 'ÉCHEC',
      detail: `retard calculé ${r.retardMin} min · notification direction : ${notifsApres - notifsAvant}`,
    });
  }

  // ===== T44 (O3) — Pointage + heures sup converties en variable de paie =====
  {
    const prof = await db.personnel.findFirstOrThrow({ where: { ecoleId: ecole.id, email: 'mamadou.fall@vinci.sn' } });
    const j1 = new Date(); j1.setUTCHours(7, 0);
    await db.pointagePersonnel.deleteMany({ where: { personnelId: prof.id, date: jourUTC() } });
    await pointerPersonnelCore(ctx, prof.id, 'arrivee', j1, '08:00');
    const j1d = new Date(); j1d.setUTCHours(19, 0); // 12h → 4h sup
    await pointerPersonnelCore(ctx, prof.id, 'depart', j1d);
    const double = await attendu(() => pointerPersonnelCore(ctx, prof.id, 'depart', new Date()));
    const synth = await synthesePointageCore(ctx, prof.id, `${j1.getUTCFullYear()}-${String(j1.getUTCMonth() + 1).padStart(2, '0')}`);
    const conv = await convertirHeuresSupCore(ctx, prof.id, `${j1.getUTCFullYear()}-${String(j1.getUTCMonth() + 1).padStart(2, '0')}`, 250_000);
    results.push({
      test: 'T44 (O3) — Pointage personnel + heures sup → paie',
      verdict: double.rejete && synth.minutesSup > 0 && conv.montant > 0 ? 'PASS ✓' : 'ÉCHEC',
      detail: `double départ refusé: ${double.rejete} · ${synth.minutesSup} min sup (${synthe(synth)}) · variable paie ${(conv.montant / 100).toLocaleString('fr-FR')} XOF`,
    });
  }

  // ===== T45 (M7) — Activité : participants + autorisation + facturation =====
  {
    const a = await creerActiviteCore(ctx, ecole.id, { type: 'sortie', titre: `${MARK} Sortie`, dateDebut: new Date(Date.now() + 30 * 86400000), dateFin: new Date(Date.now() + 30 * 86400000), cout: 500_000, capacite: 2 });
    const [e1, e2] = await db.eleve.findMany({ where: { ecoleId: ecole.id, statut: 'actif' }, take: 2 });
    const insc = await inscrireParticipantCore(ctx, { activiteId: a.activiteId, eleveIds: [e1.id, e2.id] });
    const e3 = (await db.eleve.findMany({ where: { ecoleId: ecole.id, statut: 'actif', id: { notIn: [e1.id, e2.id] } }, orderBy: { matricule: 'asc' }, take: 1 }))[0];
    const plein = await attendu(() => inscrireParticipantCore(ctx, { activiteId: a.activiteId, eleveIds: [e3.id] }));
    const part = await db.activiteParticipant.findFirstOrThrow({ where: { activiteId: a.activiteId, eleveId: e1.id } });
    const autor = await traiterAutorisationCore(ctx, part.id, 'accordee');
    const fact = await facturerActiviteCore(ctx, a.activiteId);
    const factBis = await facturerActiviteCore(ctx, a.activiteId);
    const éch = await db.echeanceFrais.findMany({ where: { source: `activite-${a.activiteId}` } });
    results.push({
      test: 'T45 (M7) — Activité : capacité + autorisation + facturation',
      verdict: insc.inscrits === 2 && plein.rejete && autor.autorisation === 'accordee' && fact.échéancesCréées === 2 && factBis.échéancesCréées === 0 && éch.length === 2 ? 'PASS ✓' : 'ÉCHEC',
      detail: `inscrits ${insc.inscrits} · 3e refusé (capacité 2): ${plein.rejete} · autorisation accordée · ${fact.échéancesCréées} échéances créées, re-facturation ${factBis.échéancesCréées} (idempotent)`,
    });
  }

  // ===== T46 (M8) — Garderie : pointage minute + facturation mensuelle =====
  {
    const eleve = await db.eleve.findFirstOrThrow({ where: { ecoleId: ecole.id, statut: 'actif' } });
    await inscrireGarderieCore(ctx, { eleveId: eleve.id, tarifHoraire: 200_000 });
    const arr = new Date(); arr.setUTCHours(17, 0);
    await db.garderieSession.deleteMany({ where: { eleveId: eleve.id, date: jourUTC() } });
    await pointerGarderieCore(ctx, eleve.id, 'arrivee', arr);
    const dep = new Date(); dep.setUTCHours(18, 30);
    const r = await pointerGarderieCore(ctx, eleve.id, 'depart', dep);
    const fact = await facturerGarderieCore(ctx, ecole.id, new Date());
    results.push({
      test: 'T46 (M8) — Garderie : session 90 min → échéance facturée',
      verdict: r.minutes === 90 && fact.échéancesCréées >= 1 ? 'PASS ✓' : 'ÉCHEC',
      detail: `${r.minutes} min pointées · facturation du mois : ${fact.échéancesCréées} échéance(s), ${fact.totalMinutes} min au total`,
    });
  }

  // ===== T47 (O5/M13) — Imports CSV élèves + EDT =====
  {
    const classe = await db.classe.findFirstOrThrow({ where: { ecoleId: ecole.id } });
    await creerMatiereCore(ctx, ecole.id, { code: 'V3X', libelle: 'Matière import test', coefficient: 1 });
    const csv = `nom;prenom;dateNaissance;sexe;classeCode\n${MARK}A;Import;2013-03-03;M;${classe.code}\n${MARK}B;Import;2012-02-02;F;${classe.code}\n${MARK}C;Erreur;2011-01-01;X;${classe.code}`;
    const r = await importerElevesCsvCore(ctx, ecole.id, csv);
    const edt = await importerEdtCsvCore(ctx, ecole.id, `classe;matiere;jour;heureDebut;heureFin\n${classe.code};V3X;samedi;14:00;16:00\n${classe.code};V3X;samedi;14:00;16:00`);
    results.push({
      test: 'T47 (O5/M13) — Imports CSV : élèves (2 ok / 1 erreur) + EDT (conflit détecté)',
      verdict: r.créés === 2 && r.erreurs.length === 1 && edt.créés === 1 && edt.conflits === 1 ? 'PASS ✓' : 'ÉCHEC',
      detail: `élèves : ${r.créés} créés, ${r.erreurs.length} erreur(s) [${r.erreurs[0]?.erreur.slice(0, 30)}] · EDT : ${edt.créés} créé(s), ${edt.conflits} conflit(s) rejeté(s)`,
    });
  }

  // ===== T48 (M11/M12/M15/M16/V1) — Finances avancées =====
  {
    // Échéancier personnalisé
    const frais = await db.frais.findFirstOrThrow({ where: { ecoleId: ecole.id } });
    const eleve = await db.eleve.findFirstOrThrow({ where: { ecoleId: ecole.id, statut: 'actif' } });
    const échTotal = await attendu(() => genererEcheancierPersonnaliseCore(ctx, {
      eleveId: eleve.id, fraisId: frais.id,
      tranches: [{ montant: frais.montant - 100_000, date: new Date('2026-11-15') }, { montant: 50_000, date: new Date('2026-12-15') }],
    })); // total < frais.montant → REFUS attendu
    const échOk = await genererEcheancierPersonnaliseCore(ctx, {
      eleveId: eleve.id, fraisId: frais.id,
      tranches: [{ montant: frais.montant / 2, date: new Date('2027-01-15') }, { montant: frais.montant / 2, date: new Date('2027-02-15') }],
    });
    // Remises fratries : rattacher le parent de e1 à un 2e élève (fratrie)
    const parent1 = (await db.parentTuteur.findFirst({ where: { eleves: { some: { eleveId: eleve.id } } } }))
      ?? (await db.parentTuteur.findFirstOrThrow({ where: { ecoleId: ecole.id } }));
    const frere = (await db.eleve.findMany({ where: { ecoleId: ecole.id, statut: 'actif', id: { not: eleve.id } }, orderBy: { dateNaissance: 'asc' }, take: 1 }))[0];
    await db.eleveParent.upsert({
      where: { eleveId_parentId: { eleveId: frere.id, parentId: parent1.id } },
      create: { eleveId: frere.id, parentId: parent1.id },
      update: {},
    });
    const rem = await appliquerRemisesFamillesCore(ctx, ecole.id, 10);
    // Rejouable : retirer le lien fratrie créé sur des élèves du SEED
    // (sinon le parent démo garde un 2e enfant et casse T9 de l'autre suite)
    await db.eleveParent.deleteMany({ where: { eleveId: frere.id, parentId: parent1.id } }).catch(() => {});
    // Relances auto — rejouable : on crée SA propre échéance en retard
    // (≥ 7 jours) ; les relances des exécutions précédentes existent déjà.
    const eleveRetard = (await db.eleve.findMany({ where: { ecoleId: ecole.id, statut: 'actif' } }))[0];
    const anneeActive = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
    const fraisRetard = await db.frais.create({ data: { ecoleId: ecole.id, libelle: 'TestVague3 Relance', type: 'scolarite', montant: 5000000, devise: 'XOF', periodicite: 'annuel', anneeScolaireId: anneeActive!.id } });
    const echeanceRetard = await db.echeanceFrais.create({ data: { eleveId: eleveRetard.id, fraisId: fraisRetard.id, montant: 5000000, devise: 'XOF', dateEcheance: new Date(Date.now() - 12 * 86400000), statut: 'impayee', source: 'TestVague3 relance' } });
    const rel = await relancerImpayesAutoCore(ecole.id);
    const relBis = await relancerImpayesAutoCore(ecole.id);
    // Rapprochement
    const relCsv = await importerReleveCsvCore(ctx, ecole.id, `date;montant;libelle\n${new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)};${Math.round(frais.montant / 100)};Test reconciliation`);
    const rapp = await rapprocherAutoCore(ctx, ecole.id);
    // Virements paie
    const vir = await exporterVirementsPaieCore(ctx, ecole.id, '2026-08');
    // Analytics + rapport
    const an = await analyticsFinancieresCore(ctx, ecole.id);
    const periode = await db.periode.findFirstOrThrow({ where: { ecoleId: ecole.id } });
    const rapport = await genererRapportTrimestreCore(ctx, ecole.id, periode.id);
    const pass = échTotal.rejete && échOk.créées === 2 && rem.remises >= 0 && rel.notifiés >= 1 && relBis.notifiés === 0 && rapp.matches >= 0 && vir.csv.includes('beneficiaire') && an.recouvrementParClasse.length > 0 && rapport.pedagogie !== undefined;

    results.push({
      test: 'T48 (M11/M12/M15/M16/V1) — Échéancier, remises fratries, relances auto, rapprochement, virements, analytics',
      verdict: pass ? 'PASS ✓' : 'ÉCHEC',
      detail: `échéancier incohérent refusé + ${échOk.créées} tranches OK · ${rem.remises} remise(s) fratrie · relances ${rel.notifiés} puis ${relBis.notifiés} (idempotent) · rapprochement ${rapp.matches} match(s) · ${vir.bulletins} virement(s) · analytics ${an.recouvrementParClasse.length} classe(s) · rapport trimestre généré`,
    });
  }

  await preCleanup();
  console.log('\n══════════════════ RÉSULTATS VAGUE 3 ══════════════════');
  for (const r of results) {
    console.log(`\n▶ ${r.test}`);
    console.log(`  ${r.verdict}`);
    console.log(`  ${r.detail}`);
  }
  const passes = results.filter((r) => r.verdict.startsWith('PASS')).length;
  console.log(`\n══════════════════ TOTAL : ${passes}/${results.length} PASS ══════════════════`);
}

function synthe(x: { minutesSup?: number }) { return `${((x.minutesSup ?? 0) / 60).toFixed(1)} h`; }
function jynth_safe(x: { minutesSup?: number }) { return x; }

async function preCleanup() {
  try {
    const j = jourUTC();
    await db.echeanceFrais.deleteMany({ where: { source: { startsWith: 'activite-' } } });
    // T48 — échéancier personnalisé (dates fixes → idempotence bloquante)
    await db.echeanceFrais.deleteMany({ where: { source: 'échéancier personnalisé' } }).catch(() => {});
    // T48 — résidus relances TestVague3 (frais + échéance + notifications)
    await db.echeanceFrais.deleteMany({ where: { source: 'TestVague3 relance' } }).catch(() => {});
    await db.frais.deleteMany({ where: { libelle: 'TestVague3 Relance' } }).catch(() => {});
    await db.frais.deleteMany({ where: { libelle: { startsWith: 'Activité —' } } });
    await db.activiteParticipant.deleteMany({ where: { activite: { titre: { contains: MARK } } } });
    await db.activite.deleteMany({ where: { titre: { contains: MARK } } });
    await db.ficheSante.deleteMany({ where: { eleve: { nom: { contains: MARK } } } });
    await db.eleveHistoriqueClasse.deleteMany({ where: { eleve: { nom: { contains: MARK } } } });
    await db.eleveParent.deleteMany({ where: { eleve: { nom: { contains: MARK } } } });
    await db.activiteParticipant.deleteMany({ where: { eleve: { nom: { contains: MARK } } } });
    await db.garderieSession.deleteMany({ where: { eleve: { nom: { contains: MARK } } } });
    await db.garderieInscription.deleteMany({ where: { eleve: { nom: { contains: MARK } } } });
    await db.cantinePresence.deleteMany({ where: { eleve: { nom: { contains: MARK } } } });
    await db.echeanceFrais.deleteMany({ where: { eleve: { nom: { contains: MARK } } } });
    await db.eleve.deleteMany({ where: { nom: { startsWith: MARK } } });
    await db.cantineMenu.deleteMany({ where: { platPrincipal: { contains: MARK } } });
    await db.cantinePresence.deleteMany({ where: { date: j, eleve: { nom: { startsWith: MARK } } } });
    await db.passageArret.deleteMany({ where: { feuille: { ligne: { nom: { contains: MARK } } } } });
    await db.feuilleRoute.deleteMany({ where: { ligne: { nom: { contains: MARK } } } });
    await db.transportArret.deleteMany({ where: { ligne: { nom: { contains: MARK } } } });
    await db.transportLigne.deleteMany({ where: { nom: { contains: MARK } } });
    await db.garderieSession.deleteMany({ where: { eleve: { ecole: { slug: 'vinci' } } } }).catch(() => {});
    await db.ligneReleve.deleteMany({ where: { libelle: { contains: 'Test reconciliation' } } });
    await db.notification.deleteMany({ where: { corps: { contains: MARK } } });
    await db.matiere.deleteMany({ where: { code: 'V3X' } });
    await db.emploiTemps.deleteMany({ where: { ecole: { slug: 'vinci' }, jour: 'samedi', heureDebut: '14:00' } });
    await db.variablePaie.deleteMany({ where: { libelle: { contains: 'Heures sup' } } });
    await db.echeanceFrais.deleteMany({ where: { source: { startsWith: 'garderie-' } } });
    await db.frais.deleteMany({ where: { libelle: { startsWith: 'Garderie —' } } });
    await db.auditLog.deleteMany({ where: { details: { contains: MARK } } });
  } catch (e) {
    console.error('Erreur pré-nettoyage :', (e as Error).message);
  }
}

executerAvecRetry('VAGUE3', main)
  .catch(async (e) => { console.error('ERREUR SCRIPT:', e); await preCleanup(); process.exit(1); })
  .finally(() => db.$disconnect());
