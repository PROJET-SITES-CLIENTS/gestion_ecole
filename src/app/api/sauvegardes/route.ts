// ====================================================================
// A1 — LISTE DES FICHIERS DE SAUVEGARDE (lecture seule)
// GET  : fichiers présents dans db/backups/ (super_admin uniquement —
//        la restauration, elle, passe par la server action dédiée).
// POST : interdit — aucune création/restauration par ce canal.
// ====================================================================

import { getSessionCourante } from '@/lib/auth';
import { listerSauvegardes } from '@/lib/sauvegarde';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSessionCourante();
  if (!session) return Response.json({ ok: false, error: 'Session expirée.' }, { status: 401 });
  if (session.utilisateur.type !== 'super_admin') {
    return Response.json({ ok: false, error: 'Réservé au super-administrateur.' }, { status: 403 });
  }
  return Response.json({ ok: true, sauvegardes: listerSauvegardes() });
}

export async function POST() {
  return Response.json(
    { ok: false, error: 'Opération interdite — création et restauration passent par les actions serveur.' },
    { status: 405 },
  );
}
