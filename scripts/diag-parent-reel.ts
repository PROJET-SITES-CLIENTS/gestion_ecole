import { renderToString } from 'react-dom/server';
import * as React from 'react';
import { PrismaClient } from '@prisma/client';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { portailDuCompte } from '../src/lib/auth';
import { avecRetryBdd } from '../src/lib/retry-bdd';
const db = new PrismaClient();
const Module = require('module');
const resOrig = Module._resolveFilename;
Module._resolveFilename = function (req: string, ...args: any[]) {
  if (req === 'next/navigation') return require.resolve('./stub-next-navigation');
  return resOrig.call(this, req, ...args);
};
(async () => {
  const vinci = await avecRetryBdd(() => db.ecole.findFirst({ where: { slug: 'vinci' } }), 3, 500);
  const parents = await avecRetryBdd(() => db.utilisateur.findMany({
    where: { ecoleId: vinci!.id, type: 'parent', actif: true, deletedAt: null },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  }), 3, 500);
  const p = parents[0];
  if (!p) { console.log('aucun parent actif'); process.exit(0); }
  const perms = new Set<string>(); const roles: string[] = [];
  for (const ur of p.roles) { roles.push(ur.role.code); for (const rp of ur.role.permissions) perms.add(rp.permission.code); }
  const session = { utilisateur: { id: p.id, ecoleId: p.ecoleId, email: p.email, nom: p.nom, prenom: p.prenom, type: p.type }, permissions: perms, roles, sessionId: 'diag' };
  const portal = portailDuCompte(p.type, perms, roles);
  console.log('parent :', p.email, '| portail :', portal);
  const data = await avecRetryBdd(() => chargerDonneesPortail(portal as never, session as never, null), 3, 500);
  const { default: Mod } = await import('../src/components/modules/parent-portal');
  try {
    const html = renderToString(React.createElement(Mod, { initialData: data, mode: 'dashboard' }));
    console.log('RENDU OK', html.length);
  } catch (e: any) {
    console.error('MESSAGE :', e.message);
    console.error('STACK :', e.stack?.split('\n').slice(0, 10).join('\n'));
  } finally { await db.$disconnect(); }
})();
