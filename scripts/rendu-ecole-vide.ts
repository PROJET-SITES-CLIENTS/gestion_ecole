// ====================================================================
// RENDU du DirectionModule avec les données d'une école VIDE —
// sans navigateur : renderToString (React) + stub next/navigation.
// Nettoyage de la base en fin.
// ====================================================================

import { PrismaClient } from '@prisma/client';
import { renderToString } from 'react-dom/server';
import * as React from 'react';
import { initialiserEcoleCore } from '../src/lib/business/initialisation';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { portailDuCompte } from '../src/lib/auth';
import { avecRetryBdd } from '../src/lib/retry-bdd';

// ---- Stub next/navigation AVANT tout import de composant ----
const Module = require('module');
const resolutionOriginale = Module._resolveFilename;
Module._resolveFilename = function (requete: string, ...args: any[]) {
  if (requete === 'next/navigation') {
    return require.resolve('./stub-next-navigation');
  }
  return resolutionOriginale.call(this, requete, ...args);
};

const db = new PrismaClient();

async function main() {
  const SUFFIXE = Date.now().toString(36);
  const r = await initialiserEcoleCore({
    nomEcole: `École Vide Rendu ${SUFFIXE}`,
    adminNom: 'Test', adminPrenom: 'Directeur',
    adminEmail: `rendu-${SUFFIXE}@local.test`, adminMotDePasse: 'MotDePasse123!',
  });
  console.log('✓ École vide créée :', r.slug);

  try {
    const u = await avecRetryBdd(() => db.utilisateur.findUnique({
      where: { id: r.adminId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    }), 4, 400);
    const permissions = new Set<string>();
    const roles: string[] = [];
    for (const ur of u!.roles) {
      roles.push(ur.role.code);
      for (const rp of ur.role.permissions) permissions.add(rp.permission.code);
    }
    const session = {
      utilisateur: { id: u!.id, ecoleId: r.ecoleId, email: u!.email, nom: u!.nom, prenom: u!.prenom, type: u!.type },
      permissions, roles, sessionId: 'test',
    };
    const portal = portailDuCompte(session.utilisateur.type, session.permissions, session.roles);
    const initialData = await avecRetryBdd(() => chargerDonneesPortail(portal as never, session as never, null), 3, 500);

    console.log('══ RENDU DirectionModule (dashboard) — école vide ══');
    const { default: DirectionModule } = await import('../src/components/modules/direction');
    const html = renderToString(
      React.createElement(DirectionModule, { initialData, mode: 'dashboard' }),
    );
    console.log('✓ PAS DE CRASH — HTML généré :', html.length, 'caractères');

    console.log('══ RENDU AppShell COMPLET (topbar + sidebar + module) ══');
    const { default: AppShell } = await import('../src/components/app-shell');
    const htmlShell = renderToString(React.createElement(AppShell, { initialData }));
    console.log('✓ PAS DE CRASH — HTML shell :', htmlShell.length, 'caractères');
    console.log('  extrait :', htmlShell.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300));
  } finally {
    await avecRetryBdd(async () => {
      await db.sessionUtilisateur.deleteMany({ where: { utilisateurId: r.adminId } });
      await db.utilisateurRole.deleteMany({ where: { utilisateurId: r.adminId } });
      await db.personnel.deleteMany({ where: { utilisateurId: r.adminId } });
      const roleIds = await db.role.findMany({ where: { ecoleId: r.ecoleId }, select: { id: true } });
      if (roleIds.length) await db.rolePermission.deleteMany({ where: { roleId: { in: roleIds.map((x) => x.id) } } });
      await db.role.deleteMany({ where: { ecoleId: r.ecoleId } });
      await db.configurationPaie.deleteMany({ where: { ecoleId: r.ecoleId } });
      await db.classe.deleteMany({ where: { ecoleId: r.ecoleId } });
      await db.niveau.deleteMany({ where: { section: { cycle: { ecoleId: r.ecoleId } } } });
      await db.section.deleteMany({ where: { cycle: { ecoleId: r.ecoleId } } });
      await db.periode.deleteMany({ where: { ecoleId: r.ecoleId } });
      await db.anneeScolaire.deleteMany({ where: { ecoleId: r.ecoleId } });
      await db.cycle.deleteMany({ where: { ecoleId: r.ecoleId } });
      await db.auditLog.deleteMany({ where: { ecoleId: r.ecoleId } });
      await db.notification.deleteMany({ where: { ecoleId: r.ecoleId } });
      await db.utilisateur.delete({ where: { id: r.adminId } });
      await db.ecole.delete({ where: { id: r.ecoleId } });
    }, 4, 500);
    console.log('✓ Nettoyage effectué');
  }
}

main().catch((e) => { console.error('✗ CRASH :', e.message); console.error(e.stack?.split('\n').slice(0, 12).join('\n')); process.exit(1); }).finally(() => db.$disconnect());
