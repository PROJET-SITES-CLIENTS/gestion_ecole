import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionCourante } from "@/lib/auth";

// ====================================================================
// GET /api — health-check AUTHENTIFIÉ.
// Sans session : seules les informations vitales minimales (statut/base),
// jamais les compteurs (fuite d'information évitée). Message d'erreur
// générique : aucune stack ni détail technique côté client.
// ====================================================================

export async function GET() {
  const debut = Date.now();
  try {
    const session = await getSessionCourante();
    if (!session) {
      // Anonyme : version minimale (utile au monitoring, inoffensive)
      await db.ecole.count();
      return NextResponse.json({
        service: "ScolaGestion V4",
        statut: "ok",
        base: "connectée",
        authentifie: false,
        horodatage: new Date().toISOString(),
      });
    }
    const [ecoles, eleves, personnels, sessionsActives, audits] = await Promise.all([
      db.ecole.count(),
      db.eleve.count(),
      db.personnel.count(),
      db.sessionUtilisateur.count({ where: { active: true, dateExpiration: { gt: new Date() } } }),
      db.auditLog.count(),
    ]);
    return NextResponse.json({
      service: "ScolaGestion V4",
      statut: "ok",
      base: "connectée",
      authentifie: true,
      latence_ms: Date.now() - debut,
      donnees: { ecoles, eleves, personnels, sessionsActives, audits },
      horodatage: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { service: "ScolaGestion V4", statut: "erreur", base: "inaccessible" },
      { status: 503 },
    );
  }
}
