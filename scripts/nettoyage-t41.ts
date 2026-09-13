import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const m = await db.matiere.deleteMany({ where: { code: { in: ['AMX1', 'AMX2'] } } });
  const c = await db.classe.deleteMany({ where: { code: '6Z' } });
  console.log(`résidus supprimés : ${m.count} matières, ${c.count} classes`);
}
main().finally(() => db.$disconnect());
