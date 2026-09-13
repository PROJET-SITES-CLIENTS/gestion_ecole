// Correction ciblée : valeurs exactes du seed par email.
import { PrismaClient } from '@prisma/client';
import { avecRetryBdd } from '../src/lib/retry-bdd';
const db = new PrismaClient();
const TABLE: Array<[string, string, number]> = [
  ['comptable@vinci.sn', 'CDD', 28000000],
  ['rh@vinci.sn', 'CDI', 32000000],
  ['censeur@vinci.sn', 'CDI', 34000000],
  ['surveillant@vinci.sn', 'CDD', 22000000],
  ['secretariat@vinci.sn', 'CDI', 24000000],
  ['assistant@vinci.sn', 'CDI', 30000000],
  ['infirmiere@vinci.sn', 'CDD', 23000000],
  ['direction@vinci.sn', 'CDI', 35000000],
];
async function main() {
  for (const [email, contrat, salaire] of TABLE) {
    const r = await avecRetryBdd(() => db.personnel.updateMany({
      where: { email },
      data: { typeContrat: contrat, salaireBrut: salaire },
    }), 3, 500);
    console.log(`${email} → ${contrat} ${salaire / 100} F (${r.count} ligne)`);
  }
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exit(1); }).finally(() => db.$disconnect());
