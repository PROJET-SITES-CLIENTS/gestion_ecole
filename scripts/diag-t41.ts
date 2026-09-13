import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const vinci = await db.ecole.findFirst({ where: { slug: 'vinci' } });
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: vinci!.id, email: { startsWith: 'direction@' } } });
  const roleDir = await db.role.findFirst({ where: { ecoleId: vinci!.id, code: 'direction' }, include: { permissions: { include: { permission: true } } } });
  const perms = new Set(roleDir!.permissions.map((p) => p.permission.code));
  console.log('permissions direction :', perms.size, '| admin.saas ?', perms.has('admin.saas'));
  const ctx = { utilisateurId: dir!.id, ecoleId: vinci!.id, type: 'personnel', permissions: perms };
  const { creerMatiereCore, creerClasseCore } = await import('../src/lib/business/saas');
  try {
    const m = await creerMatiereCore(ctx as any, vinci!.id, { code: 'ZZQ1', libelle: 'Diag', coefficient: 2 } as any);
    console.log('✓ matière OK', JSON.stringify(m).slice(0, 80));
    await db.matiere.deleteMany({ where: { code: 'ZZQ1', ecoleId: vinci!.id } });
  } catch (e: any) { console.error('✗ matière :', e.message?.slice(0, 250)); }
  try {
    const n6 = (await db.niveau.findMany({ where: { section: { cycle: { ecoleId: vinci!.id } } } })).find((n) => n.code === '6E')!;
    const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: vinci!.id, active: true } });
    const c = await creerClasseCore(ctx as any, { niveauId: n6.id, code: 'ZZ9Z', libelle: 'Diag Z', anneeScolaireId: annee!.id } as any);
    console.log('✓ classe OK', JSON.stringify(c).slice(0, 80));
    await db.classe.deleteMany({ where: { code: 'ZZ9Z', ecoleId: vinci!.id } });
  } catch (e: any) { console.error('✗ classe :', e.message?.slice(0, 250)); }
}
main().finally(() => db.$disconnect());
