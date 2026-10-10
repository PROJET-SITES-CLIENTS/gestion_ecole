import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const models = Object.keys(db).filter((k) => !k.startsWith('_') && !k.startsWith('$'));
  let total = 0;
  for (let passe = 0; passe < 3; passe++) {
    let supprime = 0;
    for (const model of models) {
      try {
        const n = await (db as any)[model].deleteMany({});
        supprime += n?.count ?? 0;
      } catch { /* FK bloquante */ }
    }
    total += supprime;
    if (supprime === 0) break;
  }
  const ecoles = await db.ecole.count();
  const users = await db.utilisateur.count();
  console.log(`Total supprimé : ${total}`);
  console.log(`Vérification -> écoles: ${ecoles}, utilisateurs: ${users}`);
  if (ecoles === 0 && users === 0) console.log('BASE 100% VIDE');
  else console.log('ATTENTION: DONNEES RESTANTES');
}
main().catch(console.error).finally(() => db.$disconnect());
