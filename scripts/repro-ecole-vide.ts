// ====================================================================
// REPRO — rendu de la page d'accueil pour une école TOUTE NEUVE
// (direction, zéro élève/matière/salle…) : trouve la ligne exacte
// qui fait planter chargerDonneesPortail. Nettoyage en fin.
// ====================================================================

import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore } from '../src/lib/business/initialisation';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { portailDuCompte } from '../src/lib/auth';
import { avecRetryBdd } from '../src/lib/retry-bdd';

const db = new PrismaClient();

async function main() {
  const SUFFIXE = Date.now().toString(36);
  const r = await initialiserEcoleCore({
    nomEcole: `École Vide Repro ${SUFFIXE}`,
    adminNom: 'Test', adminPrenom: 'Directeur',
    adminEmail: `repro-${SUFFIXE}@local.test`, adminMotDePasse: 'MotDePasse123!',
  });
  console.log('✓ École vide créée :', r.slug);

  // Session exactement comme getSessionCourante la construit
  const u = await db.utilisateur.findUnique({
    where: { id: r.adminId },
    include: { roles: { where: { OR: [{ dateFin: null }, { dateFin: { gt: new Date() } }] }, include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  const permissions = new Set<string>();
  const roles: string[] = [];
  for (const ur of u!.roles) {
    roles.push(ur.role.code);
    for (const rp of ur.role.permissions) permissions.add(rp.permission.code);
  }
  const session = {
    utilisateur: { id: u!.id, ecoleId: r.ecoleId, email: u!.email, nom: u!.nom, prenom: u!.prenom, type: u!.type },
    permissions, roles, sessionId: 'test-session',
  };
  const portal = portailDuCompte(session.utilisateur.type, session.permissions, session.roles);
  console.log('Portal détecté :', portal, '| permissions :', permissions.size);

  console.log('══ Appel chargerDonneesPortail (page /) — comme la vraie page, avec retry ══');
  try {
    const data = await avecRetryBdd(() => chargerDonneesPortail(portal as never, session as never, null), 3, 500);
    const cles = Object.keys(data as object);
    console.log('✓ PAS DE CRASH —', cles.length, 'datasets :', cles.join(', ').slice(0, 400));
  } catch (e) {
    console.error('✗ CRASH REPRODUIT :', (e as Error).message);
    console.error((e as Error).stack?.split('\n').slice(0, 8).join('\n'));
    throw e;
  } finally {
    // Nettoyage complet
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
    console.log('✓ Nettoyage effectué');
  }
}

main().catch(() => process.exit(1)).finally(() => db.$disconnect());
