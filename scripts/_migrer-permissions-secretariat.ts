/**
 * MIGRATION — AUDIT SECRÉTARIAT (écarts 2 & 6)
 * Pour CHAQUE école existante :
 *   1. crée la permission `secretariat.gerer` si absente ;
 *   2. l'attribue au rôle `secretariat` ;
 *   3. ajoute `presences.saisir` et `finances.voir` au rôle secretariat
 *      (alignement sur la matrice officielle — absents du jour + impayés).
 * Idempotent : ré-exécutable sans doublon.
 * Exécution : npx tsx scripts/_migrer-permissions-secretariat.ts
 */
import { dbTest as db } from './_helper-test';

async function main() {
  const ecoles = await db.ecole.findMany({ select: { id: true, nom: true } });
  console.log(`${ecoles.length} école(s) à migrer`);
  let modifiees = 0;
  for (const ecole of ecoles) {
    // 1. permission secretariat.gerer (GLOBALE — code unique, pas d'ecoleId)
    let perm = await db.permission.findUnique({ where: { code: 'secretariat.gerer' } });
    if (!perm) {
      perm = await db.permission.create({
        data: { code: 'secretariat.gerer', libelle: 'Guichet secrétariat (registres, relances, convocations)', module: 'eleves' },
      });
    }
    const role = await db.role.findFirst({ where: { ecoleId: ecole.id, code: 'secretariat' } });
    if (!role) { console.log(`⚠ ${ecole.nom} : rôle secretariat absent — ignorée`); continue; }
    let changements = 0;
    for (const codePerm of ['secretariat.gerer', 'presences.saisir', 'finances.voir']) {
      const p = codePerm === 'secretariat.gerer'
        ? perm
        : await db.permission.findUnique({ where: { code: codePerm } });
      if (!p) { console.log(`  ⚠ ${ecole.nom} : permission ${codePerm} inexistante en base — ignorée`); continue; }
      const existant = await db.rolePermission.findFirst({ where: { roleId: role.id, permissionId: p.id } });
      if (!existant) {
        await db.rolePermission.create({ data: { roleId: role.id, permissionId: p.id } });
        changements++;
      }
    }
    if (changements > 0) {
      modifiees++;
      console.log(`✓ ${ecole.nom} : ${changements} ajout(s) au rôle secretariat`);
    }
  }
  // Vérification finale : permissions du rôle pour la 1re école
  const verif = await db.rolePermission.findMany({
    where: { role: { code: 'secretariat' } },
    include: { permission: true },
  });
  const codes = [...new Set(verif.map((r) => r.permission.code))];
  console.log(`\nRôle secretariat — permissions après migration : ${codes.join(', ')}`);
  console.log(`${modifiees} école(s) modifiée(s)`);
}

main().catch((e) => { console.error('ERREUR :', e); process.exitCode = 1; }).finally(() => db.$disconnect());
