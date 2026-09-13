import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAction } from '@/lib/business/commun';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    let ecolesSuspendues = 0;
    let logsNettoyes = 0;

    await db.$transaction(async (tx) => {
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);

      const facturesEnRetard = await tx.factureSaas.findMany({
        where: { statut: 'impayee', dateEmission: { lt: dateLimite } },
        include: { ecole: true }
      });

      for (const facture of facturesEnRetard) {
        if (facture.ecole.statut !== 'suspendu') {
          await tx.ecole.update({ where: { id: facture.ecole.id }, data: { statut: 'suspendu' } });
          ecolesSuspendues++;
          await logAction(tx, facture.ecoleId, 'system_cron', 'saas.ecole_suspension_auto', 'ecole', facture.ecole.id, { motif: `Facture ${facture.id} impayée depuis plus de 30 jours.` });
        }
      }

      const dateArchivage = new Date();
      dateArchivage.setFullYear(dateArchivage.getFullYear() - 1);
      const result = await tx.auditLog.deleteMany({ where: { dateAction: { lt: dateArchivage } } });
      logsNettoyes = result.count;
    }, { timeout: 60000 });

    return NextResponse.json({ message: 'Cron job exécuté', resultats: { ecolesSuspendues, logsNettoyes } });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erreur', details: error.message }, { status: 500 });
  }
}
