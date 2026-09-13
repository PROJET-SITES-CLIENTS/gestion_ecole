import { PrismaClient } from '@prisma/client';
const db: any = new PrismaClient();
async function main() {
  try {
    const formations = await (db as any).formationPersonnel.findMany({ take: 1 });
    console.log('✓ formationPersonnel OK');
    const sanctions = await (db as any).sanctionPersonnel.findMany({ take: 1 });
    console.log('✓ sanctionPersonnel OK');
    const soldes = await db.soldeConge.findMany({ take: 1, include: { personnel: { select: { prenom: true, nom: true, matricule: true, dateEmbauche: true } } } });
    console.log('✓ soldeConge + include OK');
  } catch (e: any) { console.log('✗', e.message?.slice(0, 200)); }
}
main().finally(() => db.$disconnect());
