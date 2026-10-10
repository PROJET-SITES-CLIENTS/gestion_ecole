import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const ecoles = await db.ecole.findMany({ select: { id: true, nom: true, slug: true, dateCreation: true } });
  console.log('Écoles :', JSON.stringify(ecoles, null, 2));
  const users = await db.utilisateur.findMany({ select: { email: true, type: true } });
  console.log('Utilisateurs :', JSON.stringify(users, null, 2));
}
main().finally(() => db.$disconnect());
