// Audit d'intégrité : compte les lignes de toutes les tables,
// liste les tables vides et vérifie quelques invariants métier.
import { db } from "../src/lib/db";
import { Prisma } from "@prisma/client";

async function main() {
  const models = Prisma.dmmf.datamodel.models;
  const counts: { model: string; rows: number }[] = [];
  const errors: string[] = [];

  for (const m of models) {
    const key = m.name.charAt(0).toLowerCase() + m.name.slice(1);
    const delegate = (db as any)[key];
    if (!delegate || typeof delegate.count !== "function") continue;
    try {
      const rows = await delegate.count();
      counts.push({ model: m.name, rows });
    } catch (e: any) {
      errors.push(`${m.name}: ${e.message}`);
    }
  }

  counts.sort((a, b) => a.rows - b.rows);
  const vides = counts.filter((c) => c.rows === 0);
  const remplies = counts.filter((c) => c.rows > 0);

  console.log(`\n=== RÉSULTAT GLOBAL ===`);
  console.log(`Modèles analysés : ${counts.length}/${models.length}`);
  console.log(`Tables avec données : ${remplies.length}`);
  console.log(`Tables vides : ${vides.length}`);
  if (errors.length) {
    console.log(`\n⚠️ Erreurs de comptage :`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log(`\n=== TABLES VIDES ===`);
  vides.forEach((c) => console.log(`  - ${c.model}`));

  console.log(`\n=== TOP 15 TABLES LES PLUS REMPLIES ===`);
  counts.slice(-15).reverse().forEach((c) => console.log(`  ${c.model}: ${c.rows}`));

  // Invariants métier
  console.log(`\n=== INVARIANTS MÉTIER ===`);
  const ecoles = await db.ecole.count();
  const eleves = await db.eleve.count();
  const tickets = await db.ticket.count();
  const bulletins = await db.bulletin.count();
  console.log(`  Écoles: ${ecoles} | Élèves: ${eleves} | Tickets V4: ${tickets} | Bulletins: ${bulletins}`);

  // Vérification référentielle : paiements affectés à des échéances
  const affectations = await db.paiementEcheance.count().catch(() => -1);
  console.log(`  Affectations paiement-échéance: ${affectations}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erreur audit:", e);
  process.exit(1);
});
