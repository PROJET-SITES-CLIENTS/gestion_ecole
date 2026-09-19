// Purge physique d'écoles — v4 : tri topologique FK + retry erreurs transitoires (Neon) + échecs rapportés.
import { dbTest as db, estTransitoire } from './_helper-test';

async function execAvecRetry(sql: string, erreurs: Map<string, number>): Promise<number> {
  for (let essai = 1; essai <= 3; essai++) {
    try {
      return Number(await db.$executeRawUnsafe(sql));
    } catch (e: any) {
      const msg = String((e as any).meta?.message ?? e.message ?? '');
      if (estTransitoire(e) && essai < 3) { await new Promise((r) => setTimeout(r, 400 * essai)); continue; }
      // FK RESTRICT = légitime (parent d'encore-existant, une passe suivante s'en charge) — mais on trace
      if (!/RESTRICT|violates/i.test(msg)) erreurs.set(msg.slice(0, 120), (erreurs.get(msg.slice(0, 120)) ?? 0) + 1);
      return 0;
    }
  }
  return 0;
}

export async function purgerEcoles(ecoleIds: string[], verbose = false): Promise<boolean> {
  if (!ecoleIds.length) return true;
  const idList = ecoleIds.map((i) => `'${i}'`).join(',');

  const fks: Array<{ enfant: string; col: string; parent: string; pcol: string }> = (await db.$queryRawUnsafe(`
    SELECT trim(both '"' from conrelid::regclass::text) AS enfant,
           a.attname AS col,
           trim(both '"' from confrelid::regclass::text) AS parent,
           af.attname AS pcol
    FROM pg_constraint c
    JOIN unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
    JOIN pg_attribute a  ON a.attrelid  = c.conrelid  AND a.attnum  = ck.attnum
    JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = c.confkey[ck.ord]
    WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`)) as never;

  const cols: Array<{ table_name: string; column_name: string }> =
    await db.$queryRawUnsafe(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'`);
  const avecEcoleId = new Set(cols.filter((c) => c.column_name === 'ecoleId' && c.table_name !== 'Ecole').map((c) => c.table_name));

  // Tri topologique INVERSÉ pour la suppression : une table est émise quand toutes
  // les tables qui la référencent (ses enfants FK) ont déjà été émises. Les feuilles
  // (Note, Seance… personne ne les référence) partent en premier, Ecole en dernier.
  const tables = [...new Set([...fks.flatMap((f) => [f.enfant, f.parent]), ...avecEcoleId, 'Ecole'])];
  const enfantsDe = new Map<string, Set<string>>(); // table → tables qui la référencent
  for (const t of tables) enfantsDe.set(t, new Set());
  for (const f of fks) { if (f.enfant !== f.parent) enfantsDe.get(f.parent)!.add(f.enfant); }
  const ordre: string[] = [];
  const restants = new Set(tables);
  let progres = true;
  while (restants.size && progres) {
    progres = false;
    for (const t of [...restants]) {
      if ([...enfantsDe.get(t)!].every((e) => !restants.has(e))) { ordre.push(t); restants.delete(t); progres = true; }
    }
  }
  ordre.push(...restants); // cycles résiduels — les passes successives s'en chargent

  const erreurs = new Map<string, number>();
  for (let passe = 1; passe <= 3; passe++) {
    let suppr = 0;
    for (const t of ordre) {
      if (t === 'Ecole') continue;
      if (avecEcoleId.has(t)) {
        suppr += await execAvecRetry(`DELETE FROM "${t}" WHERE "ecoleId" IN (${idList})`, erreurs);
      } else {
        for (const f of fks.filter((x) => x.enfant === t && (x.parent === 'Ecole' || avecEcoleId.has(x.parent)))) {
          const sql = f.parent === 'Ecole'
            ? `DELETE FROM "${t}" WHERE "${f.col}" IN (${idList})`
            : `DELETE FROM "${t}" WHERE "${f.col}" IN (SELECT p."${f.pcol}" FROM "${f.parent}" p WHERE p."ecoleId" IN (${idList}))`;
          suppr += await execAvecRetry(sql, erreurs);
        }
      }
    }
    if (verbose) console.log(`  passe ${passe} : ${suppr} lignes`);
    if (suppr === 0) break;
  }
  if (verbose && erreurs.size) for (const [m, n] of erreurs) console.log(`  ⚠ ${n}× ${m}`);

  // Chaîne transitive sans ecoleId : Niveau → Section → Cycle (vérifiée en prod)
  await db.$executeRawUnsafe(`DELETE FROM "Niveau" WHERE "sectionId" IN (SELECT s.id FROM "Section" s JOIN "Cycle" c ON s."cycleId" = c.id WHERE c."ecoleId" IN (${idList}))`).catch(() => {});
  await db.$executeRawUnsafe(`DELETE FROM "Section" WHERE "cycleId" IN (SELECT id FROM "Cycle" WHERE "ecoleId" IN (${idList}))`).catch(() => {});
  await db.$executeRawUnsafe(`DELETE FROM "Cycle" WHERE "ecoleId" IN (${idList})`).catch(() => {});

  try {
    await db.$executeRawUnsafe(`DELETE FROM "Ecole" WHERE id IN (${idList})`);
    return true;
  } catch (e: any) {
    if (verbose) console.log('  ✗ Ecole:', String((e as any).meta?.message ?? e.message).slice(0, 200));
    return false;
  }
}

export async function purgerEcole(ecoleId: string): Promise<boolean> {
  return purgerEcoles([ecoleId], false);
}
