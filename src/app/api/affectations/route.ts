// Affectations enseignants — POST (créer) via l'UI manuelle
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCourante } from '@/lib/auth';
import { affecterEnseignantCore } from '@/lib/business';

export async function POST(req: NextRequest) {
  const session = await getSessionCourante().catch(() => null);
  if (!session) return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  if (!session.permissions.has('edt.gerer') && session.utilisateur.type !== 'super_admin') {
    return NextResponse.json({ ok: false, error: 'Réservé à la direction.' }, { status: 403 });
  }
  const ecoleId = session.utilisateur.ecoleId;
  if (!ecoleId) return NextResponse.json({ ok: false, error: 'Aucune école.' }, { status: 400 });
  try {
    const { personnelId, matiereId, classeIds } = await req.json();
    const ctx = { utilisateurId: session.utilisateur.id, ecoleId, type: session.utilisateur.type, permissions: session.permissions };
    const r = await affecterEnseignantCore(ctx as never, { personnelId, matiereId, classeIds: classeIds ?? [] });
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Erreur.' }, { status: 400 });
  }
}
