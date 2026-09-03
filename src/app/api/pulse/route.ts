import { NextResponse } from 'next/server';
import { getSessionCourante } from '@/lib/auth';
import { db } from '@/lib/db';

// ====================================================================
// GET /api/pulse — compteur de changements pour le temps réel client.
// Le shell sonde toutes les 15 s : si le compteur bouge (paiement,
// présence, notification, congé…), la page est re-rendue serveur.
// Coût : 10 COUNT indexés — négligeable.
// ====================================================================

export async function GET() {
  const session = await getSessionCourante();
  if (!session) return NextResponse.json({ auth: false, v: 0 }, { status: 401 });
  if (!session.utilisateur.ecoleId) return NextResponse.json({ auth: true, v: 0 });

  const ecoleId = session.utilisateur.ecoleId;
  try {
    const [
      paiements, depenses, presences, notifications, incidents,
      conges, passagesInfirmerie, audits, visiteurs, sanctions,
    ] = await Promise.all([
      db.paiement.count({ where: { ecoleId } }),
      db.depense.count({ where: { ecoleId } }),
      db.presence.count({ where: { seance: { classe: { ecoleId } } } }),
      db.notification.count({ where: { ecoleId, destinataireId: session.utilisateur.id } }),
      db.incident.count({ where: { eleve: { ecoleId } } }),
      db.conge.count({ where: { personnel: { ecoleId } } }),
      db.passageInfirmerie.count({ where: { ecoleId } }),
      db.auditLog.count({ where: { ecoleId } }),
      db.visiteur.count({ where: { ecoleId } }),
      db.sanction.count({ where: { incident: { eleve: { ecoleId } } } }),
    ]);

    const v =
      paiements * 1 + depenses * 2 + presences * 3 + notifications * 5 +
      incidents * 7 + conges * 11 + passagesInfirmerie * 13 +
      audits * 17 + visiteurs * 19 + sanctions * 23;

    return NextResponse.json(
      { auth: true, v, notifications, date: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ auth: true, v: 0, erreur: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
