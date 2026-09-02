import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ====================================================================
// GET /api — point d'entrée API réel (P3, remplace le stub "Hello").
// Health-check : base, comptages, sessions actives. Version 4.
// ====================================================================

export async function GET() {
  const debut = Date.now();
  try {
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
      latence_ms: Date.now() - debut,
      donnees: { ecoles, eleves, personnels, sessionsActives, audits },
      horodatage: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { service: "ScolaGestion V4", statut: "erreur", base: "inaccessible", message: (e as Error).message },
      { status: 503 },
    );
  }
}
