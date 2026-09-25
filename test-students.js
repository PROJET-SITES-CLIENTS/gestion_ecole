const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const el = await prisma.eleve.findMany();
  console.log(el.map(e => e.prenom + ' ' + e.nom + ' ' + e.matricule));
}
main().finally(() => prisma.$disconnect());
