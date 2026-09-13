import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const c = await db.cotisationSociale.deleteMany({ where: { bulletin: { periode: '2030-01' } } });
  const v = await db.variablePaie.deleteMany({ where: { bulletinPaie: { periode: '2030-01' } } });
  const l = await db.ligneBulletinPaie.deleteMany({ where: { bulletin: { periode: '2030-01' } } });
  const b = await db.bulletinPaie.deleteMany({ where: { periode: '2030-01' } });
  console.log(`supprimé : ${c.count} cotisations, ${v.count} variables, ${l.count} lignes, ${b.count} bulletins`);
}
main().finally(() => db.$disconnect());
