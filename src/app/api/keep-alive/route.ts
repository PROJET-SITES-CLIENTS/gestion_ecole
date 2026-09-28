// ════════════════════════════════════════════════════════════════════
// KEEP-ALIVE — appelé par Vercel Cron toutes les 4 minutes.
// Empêche Supabase de fermer les connexions du pool (fin des timeouts).
// ════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const debut = Date.now();
  try {
    // Requête ultra-légère : juste assez pour maintenir la connexion active
    const nb = await db.ecole.count();
    const duree = Date.now() - debut;
    return NextResponse.json({
      ok: true,
      ping: duree,
      ecoles: nb,
      heure: new Date().toISOString(),
    });
  } catch (e) {
    // Même en cas d'erreur, on log pour diagnostiquer
    return NextResponse.json({
      ok: false,
      ping: Date.now() - debut,
      erreur: String((e as any)?.message ?? '').slice(0, 100),
      heure: new Date().toISOString(),
    }, { status: 200 });
  }
}
