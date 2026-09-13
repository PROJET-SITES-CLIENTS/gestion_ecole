// E2E PORTAIL PARENT — isolation + nouveaux datasets (audit).
import { PrismaClient } from '@prisma/client';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { portailDuCompte } from '../src/lib/auth';
import { avecRetryBdd } from '../src/lib/retry-bdd';
import { executerAvecRetry, dbTest } from './_helper-test';
const db: PrismaClient = dbTest as unknown as PrismaClient;
let p = 0, f = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${n}${d ? ` (${d})` : ''}`); ok ? p++ : f++; };

async function main() {
  const vinci = await avecRetryBdd(() => db.ecole.findFirst({ where: { slug: 'vinci' } }), 3, 500);
  const parents = await avecRetryBdd(() => db.utilisateur.findMany({
    where: { ecoleId: vinci!.id, type: 'parent', actif: true, deletedAt: null },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }, parent: { include: { eleves: true } } },
  }), 3, 500);
  const parent = parents.find((u) => (u.parent?.eleves ?? []).length > 0);
  if (!parent) { console.log('✗ aucun parent avec enfants'); process.exit(1); }
  const perms = new Set<string>(); const roles: string[] = [];
  for (const ur of parent!.roles) { roles.push(ur.role.code); for (const rp of ur.role.permissions) perms.add(rp.permission.code); }
  const session = { utilisateur: { id: parent!.id, ecoleId: vinci!.id, email: parent!.email, nom: parent!.nom, prenom: parent!.prenom, type: parent!.type }, permissions: perms, roles, sessionId: 't' };
  check('portail détecté : parent', portailDuCompte(parent!.type, perms, roles) === 'parent');
  const data: any = await avecRetryBdd(() => chargerDonneesPortail('parent', session as never, null), 3, 600);
  const payload = JSON.stringify(data);

  // Isolation stricte
  const enfantsIds = new Set((data.mesEnfants ?? []).map((e: any) => e.id));
  check('mesEnfants chargés et STRICTEMENT ses enfants', (data.mesEnfants ?? []).length === (parent!.parent!.eleves ?? []).length
    && (data.mesEnfants ?? []).every((e: any) => enfantsIds.has(e.id)));
  const autresEleves = await avecRetryBdd(() => db.eleve.findMany({ where: { ecoleId: vinci!.id, id: { notIn: [...enfantsIds] } }, take: 3, select: { matricule: true } }), 3, 400);
  check('AUCUN matricule d\'autres élèves dans le payload', autresEleves.every((o) => !o.matricule || !payload.includes(o.matricule)));

  // Nouveaux datasets de l'audit
  check('mesPresences (absences/retards) chargées', Array.isArray(data.mesPresences), `${(data.mesPresences ?? []).length}`);
  check('mesJustifications chargées', Array.isArray(data.mesJustifications), `${(data.mesJustifications ?? []).length}`);
  check('cahiersPublies (travail à faire) chargés', Array.isArray(data.cahiersPublies), `${(data.cahiersPublies ?? []).length}`);
  check('mesDevoirs chargés', Array.isArray(data.mesDevoirs), `${(data.mesDevoirs ?? []).length}`);
  check('mesPaiements (reçus) chargés', Array.isArray(data.mesPaiements), `${(data.mesPaiements ?? []).length}`);
  // Les présences ne concernent QUE ses enfants
  check('présences filtrées sur SES enfants uniquement', (data.mesPresences ?? []).every((x: any) => enfantsIds.has(x.eleveId)));
  check('paiements filtrés sur SES enfants uniquement', (data.mesPaiements ?? []).every((x: any) => enfantsIds.has(x.eleveId)));

  console.log(`\n${f === 0 ? '✅✅' : '⚠️'} PORTAIL PARENT : ${p}/${p + f} CHECKS PASS${f ? ` — ${f} ÉCHEC(S)` : ''}`);
  if (f) process.exitCode = 1;
}
executerAvecRetry('PARENT', main);
