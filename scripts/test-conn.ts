import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function go() {
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await db.$queryRaw`SELECT 1 AS ok`;
      console.log(`Essai ${i} — CONNEXION OK:`, JSON.stringify(r));
      return;
    } catch (e: any) {
      console.error(`Essai ${i} — ECHEC:`, (e.message ?? '').slice(0, 150));
      await new Promise(r2 => setTimeout(r2, 3000));
    }
  }
}
go().finally(() => db.$disconnect());
