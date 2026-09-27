import { dbTest as db } from './_helper-test';
async function main() {
  const ecoles = await db.ecole.findMany({
    select: { id: true, nom: true, slug: true, dateCreation: true, deletedAt: true },
    orderBy: { dateCreation: 'asc' },
  });
  console.log(`═══ ${ecoles.length} école(s) dans la base ═══`);
  for (const e of ecoles) {
    const [classes, users, eleves] = await Promise.all([
      db.classe.count({ where: { ecoleId: e.id } }),
      db.utilisateur.count({ where: { ecoleId: e.id } }),
      db.eleve.count({ where: { ecoleId: e.id } }),
    ]);
    const etat = e.deletedAt ? 'SUPPRIMÉE' : 'ACTIVE';
    console.log(`  [${etat}] ${e.nom} (${e.slug}) — créée le ${e.dateCreation?.toISOString().slice(0, 16)}`);
    console.log(`         ${classes} classes, ${users} utilisateurs, ${eleves} élèves`);
  }
}
main().finally(() => db.$disconnect());
