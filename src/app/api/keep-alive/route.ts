// ════════════════════════════════════════════════════════════════════
// KEEP-ALIVE — réveille ET maintient la base Supabase éveillée.
// Appelé par : Vercel Cron (1×/j sur Hobby) + cron-job.org (3 min).
// Fait 3 requêtes progressives pour un réveil complet :
//   1. SELECT 1 (réveille la connexion pgBouncer)
//   2. COUNT (réveille le moteur PostgreSQL)
//   3. Petit UPDATE (maintient le pool actif)
// ════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const debut = Date.now();
  const etapes: Record<string, number> = {};

  // Étape 1 : réveiller la connexion (pgBouncer proxy)
  try {
    const t1 = Date.now();
    await db.$queryRaw`SELECT 1`;
    etapes.connexion = Date.now() - t1;
  } catch { /* silencieux */ }

  // Étape 2 : réveiller le moteur PostgreSQL
  let ecoles = 0;
  try {
    const t2 = Date.now();
    ecoles = await db.ecole.count();
    etapes.moteur = Date.now() - t2;
  } catch { /* silencieux */ }

  // Étape 3 : toucher une table pour maintenir le pool chaud
  try {
    const t3 = Date.now();
    await db.$queryRaw`SELECT 1 FROM "Ecole" LIMIT 1`;
    etapes.pool = Date.now() - t3;
  } catch { /* silencieux */ }

  const duree = Date.now() - debut;
  return NextResponse.json({
    ok: true,
    ping: duree,
    etapes,
    ecoles: ecoles,
    heure: new Date().toISOString(),
  });
}
