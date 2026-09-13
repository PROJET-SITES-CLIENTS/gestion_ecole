import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const vinci = await db.ecole.findFirst({ where: { slug: 'vinci' } });
  const pers = await db.personnel.findMany({ where: { ecoleId: vinci!.id }, select: { nom: true, statut: true, salaireBrut: true, typeContrat: true, deletedAt: true } });
  console.log('Personnels :', pers.length);
  pers.slice(0, 5).forEach((p) => console.log(`  ${p.nom} statut=${p.statut} salaire=${p.salaireBrut} contrat=${p.typeContrat} del=${p.deletedAt}`));
  // Création matière (comme T41)
  try {
    const m = await db.matiere.create({ data: { ecoleId: vinci!.id, code: 'DIAGX' + Date.now().toString(36).slice(-4), libelle: 'Diag', coefficient: 1 } as any });
    console.log('✓ matière créée', m.id.slice(-6));
    await db.matiere.delete({ where: { id: m.id } });
  } catch (e: any) { console.error('✗ matière :', e.message?.slice(0, 200)); }
  // Création classe 6Z (comme T41)
  try {
    const niveau = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: vinci!.id } } } });
    const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: vinci!.id, active: true } });
    const c = await db.classe.create({ data: { ecoleId: vinci!.id, niveauId: niveau!.id, anneeScolaireId: annee!.id, code: 'DIAGZ' + Date.now().toString(36).slice(-4), libelle: 'Diag Z' } });
    console.log('✓ classe créée', c.id.slice(-6));
    await db.classe.delete({ where: { id: c.id } });
  } catch (e: any) { console.error('✗ classe :', e.message?.slice(0, 200)); }
}
main().finally(() => db.$disconnect());
