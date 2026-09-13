import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const cols = await db.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name='Ecole' ORDER BY ordinal_position`
  );
  console.log(cols.map((c) => c.column_name).join(', '));
}
main().finally(() => db.$disconnect());
