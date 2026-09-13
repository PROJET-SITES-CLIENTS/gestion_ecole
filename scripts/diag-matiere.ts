import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const { creerMatiereCore } = await import('../src/lib/business/saas');
  const vinci = await db.ecole.findFirst({ where: { slug: 'vinci' } });
  const ctx = { utilisateurId: 'diag', ecoleId: vinci!.id, type: 'personnel', permissions: new Set(['edt.gerer']) };
  try {
    const r = await creerMatiereCore(ctx as any, vinci!.id, { code: 'DIAGM' + Date.now().toString(36).slice(-4), libelle: 'Diag M', coefficient: 2 } as any);
    console.log('✓ matière créée via core');
    await db.matiere.delete({ where: { id: (r as any).matiereId ?? (r as any).id } }).catch(() => {});
  } catch (e: any) {
    console.error('✗ core matière :', e.message?.slice(0, 250));
  }
}
main().finally(() => db.$disconnect());
