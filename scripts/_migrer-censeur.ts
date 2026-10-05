/**
 * MIGRATION — AUDIT CENSEUR : ajoute notes.saisir au rôle censeur de
 * CHAQUE école existante (alignement seed ↔ onboarding).
 */
import { dbTest as db } from './_helper-test';

async function main() {
  const ecoles = await db.ecole.findMany({ select: { id: true, nom: true } });
  const perm = await db.permission.findUnique({ where: { code: 'notes.saisir' } });
  if (!perm) { console.log('Permission notes.saisir inexistante — rien à faire'); return; }
  let modifiees = 0;
  for (const ecole of ecoles) {
    const role = await db.role.findFirst({ where: { ecoleId: ecole.id, code: 'censeur' } });
    if (!role) continue;
    const existant = await db.rolePermission.findFirst({ where: { roleId: role.id, permissionId: perm.id } });
    if (!existant) {
      await db.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
      modifiees++;
      console.log(`✓ ${ecole.nom} : censeur + notes.saisir`);
    }
  }
  console.log(`${modifiees} école(s) modifiée(s) sur ${ecoles.length}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
