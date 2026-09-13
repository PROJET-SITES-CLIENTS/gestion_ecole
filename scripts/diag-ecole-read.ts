import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  try {
    const e = await db.ecole.findFirst({ where: { slug: 'vinci' } });
    console.log('LECTURE OK —', e?.nom, '| versionData =', (e as any)?.versionData);
  } catch (err: any) {
    console.error('LECTURE ÉCHOUE :', err.message?.slice(0, 150));
  }
}
main().finally(() => db.$disconnect());
