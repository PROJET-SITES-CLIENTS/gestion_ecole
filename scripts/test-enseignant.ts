// ====================================================================
// TEST E2E — PARCOURS ENSEIGNANT RÉPARÉ (audit) :
//  1. Le portail enseignant reçoit devoirs + cahiersTexte (avant : vide)
//  2. Devoir → élève rend → ENSEIGNANT CORRIGE (note + appréciation)
//  3. Programme → chapitre → avancement déclaré
// Sur Vinci (données réelles), nettoyage intégral.
// ====================================================================

import { PrismaClient } from '@prisma/client';
import {
  creerDevoirCore, noterRenduCore,
  creerProgrammeCore, ajouterChapitreCore, mettreAJourAvancementCore,
} from '../src/lib/business';
import { ActionError } from '../src/lib/business/commun';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { portailDuCompte } from '../src/lib/auth';
import { avecRetryBdd } from '../src/lib/retry-bdd';
import { executerAvecRetry, dbTest } from './_helper-test';

const db: PrismaClient = dbTest as unknown as PrismaClient;
let passes = 0, echecs = 0;
function check(nom: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${nom}${detail ? ` (${detail})` : ''}`);
  ok ? passes++ : echecs++;
}

async function main() {
  const vinci = await avecRetryBdd(() => db.ecole.findFirst({ where: { slug: 'vinci' } }), 3, 500);
  const eid = vinci!.id;
  const M = 'AuditEns' + Date.now().toString(36).slice(-5);

  // ── 1. PORTAIL ENSEIGNANT : devoirs + cahiers visibles ──
  console.log('\n═══ 1. Portail enseignant : données pédagogiques ═══');
  const enseignants = await avecRetryBdd(() => db.utilisateur.findMany({
    where: { ecoleId: eid, type: 'personnel', actif: true, deletedAt: null },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  }), 3, 500);
  const prof = enseignants.find((u) => {
    const perms = new Set<string>();
    for (const ur of u.roles) for (const rp of ur.role.permissions) perms.add(rp.permission.code);
    return portailDuCompte(u.type, perms, u.roles.map((r) => r.role.code)) === 'enseignant';
  });
  if (!prof) { console.log('✗ aucun enseignant trouvé'); process.exit(1); }
  const perms = new Set<string>(); const roles: string[] = [];
  for (const ur of prof.roles) { roles.push(ur.role.code); for (const rp of ur.role.permissions) perms.add(rp.permission.code); }
  const sessionProf = { utilisateur: { id: prof.id, ecoleId: eid, email: prof.email, nom: prof.nom, prenom: prof.prenom, type: prof.type }, permissions: perms, roles, sessionId: 'audit' };
  const data = await avecRetryBdd(() => chargerDonneesPortail('enseignant' as never, sessionProf as never, null), 3, 600);
  check('portail enseignant : devoirs chargés', Array.isArray((data as any).devoirs), `${((data as any).devoirs ?? []).length} devoir(s)`);
  check('portail enseignant : cahiers de textes chargés', Array.isArray((data as any).cahiersTexte), `${((data as any).cahiersTexte ?? []).length} cahier(s)`);
  check('portail enseignant : PAS de finances', !(data as any).paiements?.length && !(data as any).depenses?.length);
  check('portail enseignant : PAS de salaires', !JSON.stringify(data).includes('salaireBrut'));

  // ── 2. DEVOIR → RENDU → CORRECTION ──
  console.log('\n═══ 2. Devoir : assignation → rendu élève → correction enseignant ═══');
  const classe = await avecRetryBdd(() => db.classe.findFirst({ where: { ecoleId: eid } }), 3, 400);
  const matiere = await avecRetryBdd(() => db.matiere.findFirst({ where: { ecoleId: eid } }), 3, 400);
  const personnel = await avecRetryBdd(() => db.personnel.findFirst({ where: { utilisateurId: prof.id } }), 3, 400);
  const ctxProf = { utilisateurId: prof.id, ecoleId: eid, type: 'personnel', permissions: perms };
  const dev = await creerDevoirCore(ctxProf as never, {
    classeId: classe!.id, matiereId: matiere!.id, intitule: `${M} Exercices chapitre 3`,
    dateRendu: new Date(Date.now() + 3 * 86400000), sur: 20,
  });
  check('devoir assigné', !!dev.devoirId);
  const eleve = await avecRetryBdd(() => db.eleve.findFirst({ where: { ecoleId: eid, statut: 'actif' } }), 3, 400);
  // La soumission élève (rendreDevoirCore) est couverte par sa propre suite —
  // ici on simule le rendu pour auditer la CORRECTION enseignant.
  const renduRow = await avecRetryBdd(() => db.renduDevoir.create({
    data: { devoirId: dev.devoirId, eleveId: eleve!.id, commentaireEleve: 'Rendu en avance', statut: 'rendu', dateRendu: new Date() },
  }), 3, 400);
  const rendu = { renduId: renduRow.id };
  check('élève a rendu son devoir', !!rendu.renduId);
  // correction par l'enseignant — le cœur réparé de l'audit
  const correction = await noterRenduCore(ctxProf as never, rendu.renduId, { note: 15.5, appreciation: 'Bon travail, soigne la rédaction.' });
  const renduApres = await avecRetryBdd(() => db.renduDevoir.findUnique({ where: { id: rendu.renduId } }), 3, 400);
  check('ENSEIGNANT CORRIGE : note 15,5/20 + appréciation + statut corrigé',
    renduApres?.note === 15.5 && renduApres?.statut === 'corrige' && !!renduApres?.appreciation && !!renduApres?.corrigeParId);
  try { await noterRenduCore(ctxProf as never, rendu.renduId, { note: 99 }); check('note hors barème refusée', false, 'acceptée !'); }
  catch (e) { check('note hors barème refusée', e instanceof ActionError && /barème/i.test((e as Error).message)); }

  // ── 3. PROGRAMME → CHAPITRE → AVANCEMENT ──
  console.log('\n═══ 3. Programme, chapitres, avancement ═══');
  const niveau = await avecRetryBdd(() => db.niveau.findFirst({ where: { section: { cycle: { ecoleId: eid } } } }), 3, 400);
  const prog = await creerProgrammeCore(ctxProf as never, eid, { matiereId: matiere!.id, niveauId: niveau!.id, intitule: `${M} Programme test` });
  check('programme créé', !!prog.programmeId);
  const chap = await ajouterChapitreCore(ctxProf as never, prog.programmeId, { intitule: 'Chapitre 1 : Les nombres décimaux', ordre: 1 });
  check('chapitre ajouté', !!chap.chapitreId);
  const av = await mettreAJourAvancementCore(ctxProf as never, chap.chapitreId, { classeId: classe!.id, pourcentage: 60, commentaire: 'Chapitre bien avancé' });
  const avApres = await avecRetryBdd(() => db.avancementProgramme.findFirst({ where: { chapitreId: chap.chapitreId, classeId: classe!.id } }), 3, 400);
  check('avancement déclaré : 60 %', avApres?.pourcentage === 60 && !!av.avancementId);
  // mise à jour (upsert) → 100 %
  await mettreAJourAvancementCore(ctxProf as never, chap.chapitreId, { classeId: classe!.id, pourcentage: 100 });
  const avFinal = await avecRetryBdd(() => db.avancementProgramme.findFirst({ where: { chapitreId: chap.chapitreId, classeId: classe!.id } }), 3, 400);
  check('avancement actualisé : 100 % (upsert)', avFinal?.pourcentage === 100);

  // ── NETTOYAGE ──
  console.log('\n═══ Nettoyage ═══');
  await avecRetryBdd(async () => {
    const rendus = await db.renduDevoir.findMany({ where: { devoir: { intitule: { startsWith: M } } }, select: { id: true } });
    if (rendus.length) await db.renduDevoir.deleteMany({ where: { id: { in: rendus.map((r) => r.id) } } });
    await db.devoir.deleteMany({ where: { intitule: { startsWith: M } } });
    const progs = await db.programme.findMany({ where: { ecoleId: eid, titre: { startsWith: M } }, select: { id: true } });
    if (progs.length) {
      await db.avancementProgramme.deleteMany({ where: { chapitre: { programmeId: { in: progs.map((p) => p.id) } } } });
      await db.chapitre.deleteMany({ where: { programmeId: { in: progs.map((p) => p.id) } } });
      await db.programme.deleteMany({ where: { id: { in: progs.map((p) => p.id) } } });
    }
  }, 3, 500);
  console.log('✓ base nettoyée');

  console.log(`\n${echecs === 0 ? '✅✅' : '⚠️'} AUDIT ENSEIGNANT (correctifs) : ${passes}/${passes + echecs} CHECKS PASS${echecs ? ` — ${echecs} ÉCHEC(S)` : ''}`);
  if (echecs) process.exitCode = 1;
}

executerAvecRetry('AUDIT-ENS', main);
