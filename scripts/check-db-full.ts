/**
 * Vérification exhaustive de la base SQLite :
 * - toutes les tables du schéma
 * - nombre de lignes par table (tables vides détectées)
 * - intégrité référentielle (orphelins sur FK principales)
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { estErreurTransitoire } from "../src/lib/retry-bdd";

const prisma = new PrismaClient();

async function main() {
  // 1. Liste des modèles depuis le schéma
  const schema = fs.readFileSync("prisma/schema.prisma", "utf-8");
  const models = [...schema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((m) => m[1]);
  console.log(`Modèles dans le schéma : ${models.length}`);

  // 2. Tables réellement présentes en DB
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "SELECT table_name as name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT LIKE '_prisma%'"
  );
  const tableNames = tables.map((t) => t.name);
  console.log(`Tables en base : ${tableNames.length}`);

  const missing = models.filter((m) => !tableNames.includes(m));
  if (missing.length) console.log(`❌ Tables manquantes : ${missing.join(", ")}`);
  else console.log("✅ Toutes les tables du schéma existent en base");

  // 3. Lignes par table
  const empty: string[] = [];
  const filled: { name: string; n: number }[] = [];
  for (const t of tableNames) {
    const r = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*) as n FROM "${t}"`
    );
    const n = Number(r[0].n);
    if (n === 0) empty.push(t);
    else filled.push({ name: t, n });
  }
  console.log(`\nTables remplies : ${filled.length}/${tableNames.length}`);
  if (empty.length) console.log(`❌ Tables VIDES (${empty.length}) : ${empty.join(", ")}`);
  else console.log("✅ Aucune table vide");

  // 4. Intégrité référentielle PostgreSQL : contraintes FK validées ?
  //    (SQLite n'avait pas de FK réelles → PRAGMA ; PostgreSQL les applique
  //     structurellement : une contrainte NOT VALID serait la seule faille)
  const fkNonValidees = await prisma.$queryRawUnsafe<{ table: string; conname: string }[]>(
    `SELECT conrelid::regclass::text AS table, conname
     FROM pg_constraint WHERE contype = 'f' AND NOT convalidated`
  );
  if (fkNonValidees.length === 0) console.log("✅ Intégrité référentielle : toutes les contraintes FK sont validées (0 violation possible)");
  else console.log(`❌ Contraintes FK NON validées (${fkNonValidees.length}) : ${fkNonValidees.map((f) => `${f.table}.${f.conname}`).join(', ')}`);

  // 5. Quelques contrôles métier clés
  const ecoles = await prisma.ecole.count();
  const eleves = await prisma.eleve.count();
  const utilisateurs = await prisma.utilisateur.count();
  const annees = await prisma.anneeScolaire.count();
  console.log(`\nDonnées clés : ${ecoles} écoles, ${eleves} élèves, ${utilisateurs} utilisateurs, ${annees} années scolaires`);

  // Orphelins courants (échantillon de contrôles) — noms quotés (casse PG)
  const orphEleves = await prisma.$queryRawUnsafe<{ n: number }[]>(
    'SELECT COUNT(*) as n FROM "Eleve" WHERE "classeActuelleId" IS NOT NULL AND "classeActuelleId" NOT IN (SELECT id FROM "Classe")'
  );
  console.log(`Orphelins Eleve→Classe : ${Number(orphEleves[0].n)}`);

  const orphUsers = await prisma.$queryRawUnsafe<{ n: number }[]>(
    'SELECT COUNT(*) as n FROM "Utilisateur" WHERE "ecoleId" IS NOT NULL AND "ecoleId" NOT IN (SELECT id FROM "Ecole")'
  );
  console.log(`Orphelins Utilisateur→Ecole : ${Number(orphUsers[0].n)}`);

  // 6. Top 15 tables par volume
  filled.sort((a, b) => b.n - a.n);
  console.log("\nTop 15 tables par volume :");
  filled.slice(0, 15).forEach((f) => console.log(`  ${f.name}: ${f.n}`));
}

async function executer() {
  // Neon s'endort : on réessaie tout l'audit en cas d'erreur transitoire
  for (let essai = 1; essai <= 4; essai++) {
    try {
      return await main();
    } catch (e) {
      if (essai === 4 || !estErreurTransitoire(e)) throw e;
      console.log(`↻ base en cours de réveil, tentative ${essai + 1}/4…`);
      await new Promise((r) => setTimeout(r, 1500 * essai));
    }
  }
}

executer()
  .catch((e) => {
    console.error("ERREUR:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
