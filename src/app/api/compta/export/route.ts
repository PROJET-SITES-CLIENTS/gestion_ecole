// Export FEC / balance comptable en CSV — permission finances.voir.
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCourante } from '@/lib/auth';
import { genererFecCore, genererBalanceCsvCore } from '@/lib/business/compta-plus';

export async function GET(req: NextRequest) {
  const session = await getSessionCourante().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  if (!session.permissions.has('finances.voir') && session.utilisateur.type !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé à la comptabilité.' }, { status: 403 });
  }
  const ecoleId = session.utilisateur.ecoleId;
  if (!ecoleId) return NextResponse.json({ error: 'Aucune école.' }, { status: 400 });
  const ctx = { utilisateurId: session.utilisateur.id, ecoleId, type: session.utilisateur.type, permissions: session.permissions };
  const type = req.nextUrl.searchParams.get('type') ?? 'balance';
  const annee = new Date().getFullYear();
  const du = req.nextUrl.searchParams.get('du');
  const au = req.nextUrl.searchParams.get('au');
  const dateDebut = du ? new Date(du) : new Date(annee, 0, 1);
  const dateFin = au ? new Date(au) : new Date(annee, 11, 31);
  try {
    if (type === 'fec') {
      const r = await genererFecCore(ctx as never, dateDebut, dateFin);
      return new NextResponse('\uFEFF' + r.csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="FEC-${annee}.csv"`,
        },
      });
    }
    const r = await genererBalanceCsvCore(ctx as never, 'toutes');
    return new NextResponse('\uFEFF' + r.csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="balance-${annee}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Erreur d\'export.' }, { status: 400 });
  }
}
