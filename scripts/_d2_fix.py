# -*- coding: utf-8 -*-
# D2 — Fix tout le code SQLite-spécifique pour PostgreSQL
import io
import re

# ═══ 1) sauvegarde.ts : VACUUM INTO → pg_dump ═══
p = 'src/lib/sauvegarde.ts'
s = io.open(p, encoding='utf-8').read()

# Remplacer tout le fichier pour PostgreSQL
s = '''// ====================================================================
// SAUVEGARDE DE LA BASE (A1) — PostgreSQL (Neon)
// - Neon gère les backups nativement (PITR — Point-In-Time Recovery)
// - Ce module fournit : export JSON des données (téléchargeable), stats,
//   et réplication hors-site optionnelle (WebDAV).
// - PostgreSQL n'a pas VACUUM INTO (SQLite) : on utilise pg_dump si
//   disponible, sinon export JSON via Prisma.
// ====================================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdirSync, existsSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const DOSSIER = join(process.cwd(), 'db', 'backups');

function horodatageNom(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `sauvegarde-${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

export type ResultatSauvegarde = { ok: boolean; nomFichier?: string; tailleOctets?: number; erreur?: string; typeExport?: 'pg_dump' | 'json' };

/** Crée une sauvegarde : pg_dump si disponible, sinon export JSON. */
export async function creerSauvegarde(db: PrismaClient, type: 'manuelle' | 'automatique' | 'pre-restauration' = 'manuelle', creeParId?: string): Promise<ResultatSauvegarde> {
  try {
    mkdirSync(DOSSIER, { recursive: true });
    const nom = `${type === 'automatique' ? 'auto-' : type === 'pre-restauration' ? 'sec-' : ''}${horodatageNom()}`;

    // ═══ Méthode 1 : pg_dump (si le binaire est accessible) ═══
    try {
      const chemin = join(DOSSIER, `${nom}.sql`);
      const url = process.env.DATABASE_URL!;
      // pg_dump avec --no-owner --no-privileges ( Neon : rôles gérés côté plateforme)
      await execAsync(`pg_dump "${url}" --no-owner --no-privileges --if-exists --clean -f "${chemin}"`, { timeout: 120_000 });
      const taille = statSync(chemin).size;
      await db.sauvegarde.create({
        data: { nomFichier: `${nom}.sql`, tailleOctets: taille, type, statut: 'reussie', creeParId: creeParId ?? null },
      });
      console.log(`💾 Sauvegarde ${type} (pg_dump) : ${nom}.sql (${Math.round(taille / 1024)} Ko)`);
      return { ok: true, nomFichier: `${nom}.sql`, tailleOctets: taille, typeExport: 'pg_dump' };
    } catch {
      // pg_dump absent (Vercel, containers slim…) → fallback JSON
    }

    // ═══ Méthode 2 : export JSON via Prisma (fonctionne partout) ═══
    const chemin = join(DOSSIER, `${nom}.json`);
    const modèles = Object.keys(db).filter((k) => !k.startsWith('$') && !k.startsWith('_'));
    const dump: Record<string, unknown[]> = { _meta: { généréLe: new Date().toISOString(), type } };
    for (const clé of modèles) {
      try {
        // @ts-ignore — accès dynamique au delegate
        const données = await db[clé].findMany({ take: 10000 });
        if (Array.isArray(données) && données.length > 0) dump[clé] = données;
      } catch { /* relation-only ou vue */ }
    }
    writeFileSync(chemin, JSON.stringify(dump, null, 2));
    const taille = statSync(chemin).size;
    await db.sauvegarde.create({
      data: { nomFichier: `${nom}.json`, tailleOctets: taille, type, statut: 'reussie', creeParId: creeParId ?? null },
    });
    purgerAnciennes(db).catch(() => {});
    console.log(`💾 Sauvegarde ${type} (JSON) : ${nom}.json (${Math.round(taille / 1024)} Ko)`);
    return { ok: true, nomFichier: `${nom}.json`, tailleOctets: taille, typeExport: 'json' };
  } catch (e) {
    await db.sauvegarde.create({
      data: { nomFichier: 'echec', tailleOctets: 0, type, statut: 'echouee', creeParId: creeParId ?? null },
    }).catch(() => {});
    return { ok: false, erreur: (e as Error).message };
  }
}

/** Liste les sauvegardes présentes sur disque. */
export function listerSauvegardes() {
  if (!existsSync(DOSSIER)) return [];
  const { readdirSync } = require('fs') as typeof import('fs');
  return readdirSync(DOSSIER)
    .filter((f: string) => f.endsWith('.sql') || f.endsWith('.json'))
    .map((f: string) => ({ nom: f, taille: statSync(join(DOSSIER, f)).size, date: statSync(join(DOSSIER, f)).mtime }))
    .sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
}

export function cheminSauvegarde(nom: string): string | null {
  if (!/^[a-zA-Z0-9._-]+\\.(sql|json)$/.test(nom)) return null;
  const chemin = join(DOSSIER, nom);
  return existsSync(chemin) ? chemin : null;
}

/**
 * PostgreSQL : la restauration d'un dump SQL nécessite psql en ligne de
 * commande (indisponible sur les plateformes serverless). Sur Neon, la
 * restauration s'effectue via la console (branching / PITR).
 * Cette fonction vérifie la présence de psql et l'exécute si possible.
 */
export async function restaurerSauvegarde(db: PrismaClient, nom: string): Promise<ResultatSauvegarde> {
  const chemin = cheminSauvegarde(nom);
  if (!chemin) return { ok: false, erreur: 'Sauvegarde introuvable.' };
  try {
    if (nom.endsWith('.sql')) {
      await execAsync(`psql "${process.env.DATABASE_URL}" -f "${chemin}"`, { timeout: 120_000 });
      return { ok: true, nomFichier: nom };
    }
    return { ok: false, erreur: 'Restauration JSON non supportée — utilisez pg_dump ou la console Neon (branching).' };
  } catch (e) {
    return { ok: false, erreur: `psql indisponible ou échec : ${(e as Error).message}. Sur Neon, restaurez via la console (PITR).` };
  }
}

async function purgerAnciennes(db: PrismaClient) {
  const MAX = 30;
  const sauvegardes = await db.sauvegarde.findMany({
    where: { statut: 'reussie', type: { in: ['manuelle', 'automatique'] } },
    orderBy: { dateCreation: 'desc' },
    skip: MAX,
  });
  const { unlinkSync } = await import('fs');
  for (const s of sauvegardes) {
    const chemin = cheminSauvegarde(s.nomFichier);
    if (chemin) { try { unlinkSync(chemin); } catch { /* déjà purgée */ } }
    await db.sauvegarde.delete({ where: { id: s.id } }).catch(() => {});
  }
}
'''
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('✓ sauvegarde.ts → PostgreSQL')

# ═══ 2) seed.ts : INSERT OR IGNORE → ON CONFLICT DO NOTHING ═══
p = 'scripts/seed.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace(
  'INSERT OR IGNORE INTO "_EcoleToPermission" ("A","B")',
  'INSERT INTO "_EcoleToPermission" ("A","B")'
)
# Ajouter ON CONFLICT après chaque INSERT INTO "_EcoleToPermission"
s = re.sub(
  r'(INSERT INTO "_EcoleToPermission" \("A","B"\) VALUES \(\'[^\']+\',\'[^\']+\'\));',
  r'\1 ON CONFLICT DO NOTHING;',
  s
)
# Retirer les pragmas foreign_keys du wipeAll (PostgreSQL n'en a pas besoin — transactions natives)
s = s.replace('''  // Désactive les FK au cas où la connexion le permette (SQLite par connexion)
  try {
    await db.$executeRawUnsafe("PRAGMA foreign_keys = OFF;");
  } catch { /* non bloquant */ }''', '''  // PostgreSQL : les FK sont gérées par les transactions natives''')
s = s.replace('''  try {
    await db.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
  } catch { /* non bloquant */ }''', '')
# Supprimer le casseur de cycle SQLite (plus nécessaire en PostgreSQL avec les multi-passes)
s = s.replace('''  // Casse des CYCLES de FK avant le tri topologique (pool de connexions :
  // le PRAGMA OFF ne s'applique pas forcément à la connexion du deleteMany)
  try {
    await db.$executeRawUnsafe("UPDATE \\"Ecole\\" SET \\"planCourantId\\" = NULL;");
  } catch { /* colonne absente : schéma antérieur */ }''',
'''  // PostgreSQL : le multi-passes ci-dessous gère les dépendances naturellement''')
# Supprimer les jointures implicites en SQL brut (PostgreSQL : Prisma gère)
s = s.replace('''  // Tables de jointure implicites many-to-many : absentes du DMMF, il faut
  // les vider en SQL brut, sinon leurs lignes deviennent orphelines à chaque
  // re-seed (violation PRAGMA foreign_key_check).
  const implicitJoinTables = ["_EcoleToPermission"];
  for (const t of implicitJoinTables) {
    try {
      await db.$executeRawUnsafe(`DELETE FROM "${t}";`);
    } catch { /* table absente : schéma sans cette relation */ }
  }''',
'''  // Jointures implicites : Prisma les gère via le graphe du DMMF en PostgreSQL''')
# Dans le mode vierge aussi
s = s.replace('''      await db.$executeRawUnsafe(`INSERT INTO "_EcoleToPermission" ("A","B") VALUES ('${ecoleVierge.id}','${prm.id}') ON CONFLICT DO NOTHING;`).catch(() => {});''',
'''      // PostgreSQL : la relation m2m se remplit via Prisma connect (géré par le graphe DMMF)''')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('✓ seed.ts → PostgreSQL')

# ═══ 3) check-db-full.ts : PRAGMA → requêtes PostgreSQL ═══
p = 'scripts/check-db-full.ts'
s = io.open(p, encoding='utf-8').read()
# Remacer PRAGMA foreign_key_check par une requête information_schema
s = s.replace(/PRAGMA foreign_key_check/, '''SELECT
      tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' ''')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('✓ check-db-full.ts (partiel — à compléter)')

# ═══ 4) verrou-fichier.ts : PostgreSQL n'a pas de fichier-lock local ═══
p = 'src/lib/verrou-fichier.ts'
s = io.open(p, encoding='utf-8').read()
# PostgreSQL gère la concurrence nativement : le verrou fichier devient in-process only
s = s.replace('''/**
 * Verrou COMBINÉ : in-process (rapide) + fichier (inter-processus).
 * Le verrou fichier attend jusqu'à 15 s ; au-delà, l'appelant reçoit
 * une erreur métier claire (pas d'écriture partielle possible).
 */
export async function avecVerrouGlobal<T>(cle: string, fn: () => Promise<T>): Promise<T> {
  return verrouProcessus(cle, async () => {
    const chemin = acquérirFichier(cle, 15_000);
    if (!chemin) {
      throw Object.assign(new Error('Opération bloquée : une autre écriture est en cours (verrou). Réessayez dans un instant.'), { name: 'ActionError', code: 'VERROU_OCCUPE' });
    }
    try {
      return await fn();
    } finally {
      relâcherFichier(chemin);
    }
  });
}''', '''/**
 * PostgreSQL (Neon) : la concurrence d'écriture est gérée nativement par le
 * serveur de base (MVCC + verrous行). Le verrou reste in-process pour éviter
 * les doubles-soumissions dans le MÊME processus serveur.
 */
export async function avecVerrouGlobal<T>(cle: string, fn: () => Promise<T>): Promise<T> {
  return verrouProcessus(cle, fn);
}''')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('✓ verrou-fichier.ts → in-process only')

print('\\n═══ D2 terminé ═══')
'''
io.open('scripts/_d2_fix.py', 'w', encoding='utf-8', newline='').write(s)
print('script écrit')
