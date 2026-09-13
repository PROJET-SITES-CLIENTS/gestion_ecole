// E2E 3 PORTAILS MÉTIERS : secrétariat, vie scolaire, santé — données + rendu + isolation.
import { renderToString } from 'react-dom/server';
import * as React from 'react';
import { PrismaClient } from '@prisma/client';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { portailDuCompte } from '../src/lib/auth';
import { avecRetryBdd } from '../src/lib/retry-bdd';
import { executerAvecRetry, dbTest } from './_helper-test';
const db: PrismaClient = dbTest as unknown as PrismaClient;
const Module = require('module');
const resOrig = Module._resolveFilename;
Module._resolveFilename = function (req: string, ...args: any[]) {
  if (req === 'next/navigation') return require.resolve('./stub-next-navigation');
  return resOrig.call(this, req, ...args);
};
let p = 0, f = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${n}${d ? ` (${d})` : ''}`); ok ? p++ : f++; };

async function main() {
  const vinci = await avecRetryBdd(() => db.ecole.findFirst({ where: { slug: 'vinci' } }), 3, 500);
  const { default: PortailMetiers } = await import('../src/components/modules/portail-metiers');
  const { default: SanteModule } = await import('../src/components/modules/sante');
  const users = await avecRetryBdd(() => db.utilisateur.findMany({
    where: { ecoleId: vinci!.id, type: 'personnel', actif: true, deletedAt: null },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  }), 3, 500);
  const parPortail = new Map<string, any>();
  for (const u of users) {
    const perms = new Set<string>(); const roles: string[] = [];
    for (const ur of u.roles) { roles.push(ur.role.code); for (const rp of ur.role.permissions) perms.add(rp.permission.code); }
    const port = portailDuCompte(u.type, perms, roles);
    if (!parPortail.has(port)) parPortail.set(port, { u, perms, roles });
  }

  for (const portail of ['secretariat', 'vie_scolaire', 'sante'] as const) {
    const cible = parPortail.get(portail);
    if (!cible) { check(`${portail} : utilisateur de test`, false, 'aucun'); continue; }
    const session = { utilisateur: { id: cible.u.id, ecoleId: vinci!.id, email: cible.u.email, nom: cible.u.nom, prenom: cible.u.prenom, type: cible.u.type }, permissions: cible.perms, roles: cible.roles, sessionId: 't' };
    const data: any = await avecRetryBdd(() => chargerDonneesPortail(portail, session as never, null), 3, 600);
    const json = JSON.stringify(data);
    const Composant: any = portail === 'sante' ? SanteModule : PortailMetiers;
    const props = portail === 'sante' ? { initialData: data } : { initialData: data, portal: portail };
    const html = renderToString(React.createElement(Composant, props));
    check(`${portail} : données ${Math.round(json.length / 1024)} Ko + rendu ${Math.round(html.length / 1024)} Ko`, json.length > 500 && html.length > 1000);

    // Isolation par métier
    if (portail === 'secretariat') {
      check('secrétariat : AUCUNE finance (paiements/dépenses)', !data.paiements?.length && !data.depenses?.length);
      check('secrétariat : AUCUN salaire', !json.includes('salaireBrut'));
      check('secrétariat : candidatures + RDV chargés', Array.isArray(data.candidatureAdmissions) || Array.isArray(data.rdvs));
    }
    if (portail === 'vie_scolaire') {
      check('vie scolaire : incidents + visiteurs + sorties', Array.isArray(data.incidents) && Array.isArray(data.visiteurs));
      check('vie scolaire : AUCUNE finance', !data.paiements?.length && !data.depenses?.length);
      check('vie scolaire : AUCUNE fiche santé', !data.fichesSante?.length && !json.includes('groupeSanguin'));
    }
    if (portail === 'sante') {
      check('santé : fiches santé + passages + vaccins', Array.isArray(data.fichesSante) && Array.isArray(data.passagesInfirmerie) && Array.isArray(data.vaccinations));
      check('santé : AUCUNE finance', !data.paiements?.length && !data.depenses?.length);
    }
  }
  console.log(`\n${f === 0 ? '✅✅' : '⚠️'} 3 PORTAILS MÉTIERS : ${p}/${p + f} CHECKS PASS${f ? ` — ${f} ÉCHEC(S)` : ''}`);
  if (f) process.exitCode = 1;
}
executerAvecRetry('METIERS', main);
