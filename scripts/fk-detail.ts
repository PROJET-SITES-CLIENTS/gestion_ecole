/**
 * Détail des violations FK + correction
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const fk: any[] = await prisma.$queryRawUnsafe("PRAGMA foreign_key_check");
  console.log(`Violations FK détaillées (${fk.length}) :`);
  const byTable: Record<string, number> = {};
  for (const v of fk) {
    const key = `${v.table} → ${v.parent}${v.fkid ? ` (rowid ${v.rowid})` : ""}`;
    byTable[key] = (byTable[key] || 0) + 1;
  }
  Object.entries(byTable).forEach(([k, n]) => console.log(`  ${k}: ${n} ligne(s)`));

  // Détail complet des lignes fautives
  console.log("\n--- Détail ---");
  for (const v of fk.slice(0, 50)) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${v.table}" WHERE rowid = ?`, v.rowid
      );
      console.log(`${v.table} rowid=${v.rowid} → ${v.parent}#${v.fkid} :`, JSON.stringify(rows[0]).slice(0, 300));
    } catch (e: any) {
      console.log(`${v.table} rowid=${v.rowid} → ${v.parent}#${v.fkid} : (lecture impossible: ${e.message.slice(0, 80)})`);
    }
  }
}

main().catch((e) => { console.error("ERREUR:", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
