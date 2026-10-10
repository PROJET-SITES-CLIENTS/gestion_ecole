import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const ecoles = await db.ecole.count();
  const eleves = await db.eleve.count();
  const utilisateurs = await db.utilisateur.count();
  const classes = await db.classe.count();
  console.log({ ecoles, eleves, utilisateurs, classes });
  if (ecoles === 0 && eleves === 0 && utilisateurs === 0 && classes === 0) {
    console.log('✓ BASE VIDÉE À 100%');
  } else {
    console.log('⚠️ DONNÉES RESTANTES !');
  }
}
main().finally(() => db.$disconnect());
