import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  // Trouver toutes les tables qui référencent ecole via une FK
  const ecoles = await db.ecole.findMany({ select: { id: true, nom: true } });
  console.log(`${ecoles.length} école(s) à supprimer`);
  for (const e of ecoles) console.log(' -', e.nom);

  // Supprimer d'abord tout ce qui peut avoir une FK vers ecole
  const models = Object.keys(db).filter((k) => !k.startsWith('_') && !k.startsWith('$'));
  for (const model of models) {
    try {
      const n = await (db as any)[model].deleteMany({ where: { ecoleId: { in: ecoles.map((e) => e.id) } } });
      if (n?.count > 0) console.log(`  ✓ ${model} : ${n.count}`);
    } catch { /* pas de champ ecoleId */ }
  }
  // Maintenant supprimer les écoles
  const r = await db.ecole.deleteMany({});
  console.log(`✓ Écoles supprimées : ${r.count}`);
  const verif = await db.ecole.count();
  console.log(`Écoles restantes : ${verif}`);
  if (verif === 0) console.log('✓ PURGE TOTALE RÉUSSIE');
}
main().catch(console.error).finally(() => db.$disconnect());
