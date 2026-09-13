// Termine la migration ContratPersonnel : un contrat actif par personnel,
// alimenté depuis typeContrat/salaireBrut actuels.
import { PrismaClient } from '@prisma/client';
import { avecRetryBdd } from '../src/lib/retry-bdd';
const db = new PrismaClient();
async function main() {
  const pers = await avecRetryBdd(() => db.personnel.findMany({
    where: { deletedAt: null, salaireBrut: { not: null } },
    select: { id: true, typeContrat: true, salaireBrut: true, dateEmbauche: true },
  }), 3, 500);
  let crees = 0;
  for (const p of pers) {
    const deja = await avecRetryBdd(() => db.contratPersonnel.count({ where: { personnelId: p.id } }), 3, 500);
    if (deja > 0) continue;
    await avecRetryBdd(() => db.contratPersonnel.create({
      data: { personnelId: p.id, typeContrat: p.typeContrat ?? 'CDI', salaireBrut: p.salaireBrut!, dateDebut: p.dateEmbauche, actif: true },
    }), 3, 500);
    crees++;
  }
  console.log(`✓ ${crees} contrats créés (${pers.length} personnels éligibles)`);
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exit(1); }).finally(() => db.$disconnect());
