// Supprime les bulletins de test T18 résiduels (créés récemment pour des
// élèves qui n'en avaient pas au seed) — identifiés par createdAt récent.
import { PrismaClient } from '@prisma/client';
import { avecRetryBdd } from '../src/lib/retry-bdd';
const db = new PrismaClient();
async function main() {
  const vinci = await avecRetryBdd(() => db.ecole.findFirst({ where: { slug: 'vinci' } }), 3, 500);
  // Date du seed : les bulletins seed partagent une date ancienne ; les
  // résidus de test ont été créés après le 2026-09-04 (migration Neon).
  const residus = await avecRetryBdd(() => db.bulletin.findMany({
    where: { dateCreation: { gte: new Date("2026-09-04") }, eleve: { ecoleId: vinci!.id } },
    select: { id: true, eleveId: true, dateCreation: true, version: true, moyenneGenerale: true },
  }), 3, 500);
  console.log('Bulletins post-migration (test T18) :', residus.length);
  if (residus.length) {
    await avecRetryBdd(() => db.bulletin.deleteMany({ where: { id: { in: residus.map((r) => r.id) } } }), 3, 500);
    console.log('✓ supprimés');
  }
  // État : combien d'élèves de 6ème A (classe du seed) ont un bulletin T1 ?
  const evals = await avecRetryBdd(() => db.evaluation.findFirst({ where: { ecoleId: vinci!.id }, include: { classe: true } }), 3, 500);
  const eleves = await avecRetryBdd(() => db.eleve.findMany({ where: { classeActuelleId: evals!.classeId, statut: 'actif' } }), 3, 500);
  const bulletins = await avecRetryBdd(() => db.bulletin.findMany({ where: { eleveId: { in: eleves.map((e) => e.id) }, periodeId: evals!.periodeId } }), 3, 500);
  const sans = eleves.filter((e) => !bulletins.some((b) => b.eleveId === e.id));
  console.log(`Classe ${evals!.classe.libelle} : ${eleves.length} élèves, ${bulletins.length} bulletins, ${sans.length} SANS bulletin (vivier T18)`);
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exit(1); }).finally(() => db.$disconnect());
