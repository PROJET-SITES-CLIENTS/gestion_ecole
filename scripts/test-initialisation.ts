// ====================================================================
// TEST E2E — Première installation : école + admin actif + structure
// Exécuté contre la base réelle (Neon), puis NETTOYAGE intégral.
// ====================================================================

import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore } from '../src/lib/business/initialisation';
import { verifyPassword } from '../src/lib/auth-hash';

const db = new PrismaClient();

async function main() {
  const SUFFIXE = Date.now().toString(36);
  const nomEcole = `École Test Init ${SUFFIXE}`;
  const email = `test-init-${SUFFIXE}@local.test`;

  console.log('══ 1. Première installation ══');
  const r = await initialiserEcoleCore({
    nomEcole,
    adminNom: 'Test', adminPrenom: 'Directeur',
    adminEmail: email, adminMotDePasse: 'MotDePasse123!',
  });
  console.log('✓ École créée :', r.slug, '| admin :', r.adminId);

  console.log('══ 2. Vérifications ══');
  const ecole = await db.ecole.findUnique({
    where: { id: r.ecoleId },
    include: {
      anneesScolaires: { include: { periodes: true, classes: true } },
      cycles: { include: { sections: { include: { niveaux: true } } } },
      roles: { include: { permissions: { include: { permission: true } } } },
      utilisateurs: true,
      personnels: true,
      configurationPaie: true,
    },
  });
  if (!ecole) throw new Error('École introuvable après création !');

  const checks: Array<[string, boolean, string]> = [];
  const admin = ecole.utilisateurs.find((u) => u.email === email)!;
  checks.push(['admin existe', !!admin, '']);
  checks.push(['admin ACTIF immédiatement', admin.actif === true, `actif=${admin.actif}`]);
  checks.push(['admin mot de passe vérifiable', verifyPassword('MotDePasse123!', admin.motDePasseHash), '']);
  checks.push(['année scolaire active', ecole.anneesScolaires.length === 1 && ecole.anneesScolaires[0].active === true, '']);
  checks.push(['3 trimestres', ecole.anneesScolaires[0].periodes.length === 3, `${ecole.anneesScolaires[0].periodes.length}`]);
  checks.push(['15 classes', ecole.anneesScolaires[0].classes.length === 15, `${ecole.anneesScolaires[0].classes.length}`]);
  const nbNiveaux = ecole.cycles.flatMap((c) => c.sections).flatMap((s) => s.niveaux).length;
  checks.push(['15 niveaux (MAT+PRIM+COLL+LYC)', nbNiveaux === 15, `${nbNiveaux}`]);
  checks.push(['9 rôles créés', ecole.roles.length === 9, `${ecole.roles.length}`]);
  const dir = ecole.roles.find((ro) => ro.code === 'direction')!;
  checks.push(['rôle direction = 17 permissions', dir.permissions.length === 17, `${dir.permissions.length}`]);
  checks.push(['fiche personnel admin', ecole.personnels.length === 1 && ecole.personnels[0].utilisateurId === r.adminId, '']);
  checks.push(['config paie par défaut', !!ecole.configurationPaie, '']);
  const rolesAdmin = await db.utilisateurRole.findMany({ where: { utilisateurId: r.adminId }, include: { role: true } });
  checks.push(['admin a le rôle direction', rolesAdmin.some((ra) => ra.role.code === 'direction'), '']);
  const log = await db.auditLog.findFirst({ where: { ecoleId: r.ecoleId, action: 'ecole.initialisation' } });
  checks.push(['audit log initialisation', !!log, '']);

  // Session jouable (comme le fera l'action)
  const sess = await db.sessionUtilisateur.create({
    data: { utilisateurId: r.adminId, tokenHash: 'test-' + SUFFIXE, active: true, dateDerniereActivite: new Date(), dateExpiration: new Date(Date.now() + 3600000) },
  });
  checks.push(['session créable pour admin', !!sess, '']);

  let echecs = 0;
  for (const [nom, ok, detail] of checks) {
    console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${nom}${detail ? ` (${detail})` : ''}`);
    if (!ok) echecs++;
  }

  console.log('══ 3. Nettoyage ══');
  await db.sessionUtilisateur.deleteMany({ where: { utilisateurId: r.adminId } });
  await db.utilisateurRole.deleteMany({ where: { utilisateurId: r.adminId } });
  await db.personnel.deleteMany({ where: { utilisateurId: r.adminId } });
  const rolesIds = ecole.roles.map((ro) => ro.id);
  await db.rolePermission.deleteMany({ where: { roleId: { in: rolesIds } } });
  await db.role.deleteMany({ where: { ecoleId: r.ecoleId } });
  await db.configurationPaie.deleteMany({ where: { ecoleId: r.ecoleId } });
  await db.classe.deleteMany({ where: { ecoleId: r.ecoleId } });
  await db.niveau.deleteMany({ where: { section: { cycle: { ecoleId: r.ecoleId } } } });
  await db.section.deleteMany({ where: { cycle: { ecoleId: r.ecoleId } } });
  await db.periode.deleteMany({ where: { ecoleId: r.ecoleId } });
  await db.anneeScolaire.deleteMany({ where: { ecoleId: r.ecoleId } });
  await db.cycle.deleteMany({ where: { ecoleId: r.ecoleId } });
  await db.auditLog.deleteMany({ where: { ecoleId: r.ecoleId } });
  await db.utilisateur.delete({ where: { id: r.adminId } });
  await db.ecole.delete({ where: { id: r.ecoleId } });
  console.log('✓ Base nettoyée (école, admin, structure supprimés)');

  if (echecs > 0) { console.error(`\n✗ ${echecs} échec(s)`); process.exit(1); }
  console.log('\n✅✅ PREMIÈRE INSTALLATION : 15/15 CHECKS PASS');
}

main().catch((e) => { console.error('ERREUR FATALE :', e); process.exit(1); }).finally(() => db.$disconnect());
