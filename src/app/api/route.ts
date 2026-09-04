import { NextResponse } from "next/server";

// ====================================================================
// GET /api — health check SANS base de données (diagnostic Vercel).
// Si cette route répond, le problème vient de Prisma/DB.
// Si elle 404, le problème vient du build/routing Next.js.
// ====================================================================

export async function GET() {
  const debut = Date.now();
  const infos: Record<string, unknown> = {
    service: "ScolaGestion V4",
    statut: "ok",
    latence_ms: 0,
    vercel: process.env.VERCEL === "1",
    node: process.version,
    horodatage: new Date().toISOString(),
  };

  // Test Prisma (non bloquant : on renvoie quand même les infos de base)
  try {
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();
    const ecoles = await db.ecole.count().catch(() => -1);
    await db.$disconnect();
    infos.base = "connectée";
    infos.donnees = { ecoles };
  } catch (e) {
    infos.base = "inaccessible";
    infos.erreur_db = (e as Error).message.slice(0, 200);
    infos.aide = "Vérifiez DATABASE_URL dans Vercel → Settings → Environment Variables";
    return NextResponse.json(infos, { status: 503 });
  }

  infos.latence_ms = Date.now() - debut;
  return NextResponse.json(infos);
}
