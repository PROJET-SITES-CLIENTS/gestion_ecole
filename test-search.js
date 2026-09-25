const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const q = "Billy";
  const ecoleId = "clr123456000008l4h5g2xyz"; // Need an ecoleId, but I can just omit it to query all
  const eleves = await prisma.eleve.findMany({
    where: {
      deletedAt: null,
      OR: [
        { nom: { contains: q, mode: 'insensitive' } },
        { prenom: { contains: q, mode: 'insensitive' } },
        { matricule: { contains: q } }
      ],
    },
    include: { classeActuelle: true },
  });
  console.log(eleves.length);
}
main().finally(() => prisma.$disconnect());
