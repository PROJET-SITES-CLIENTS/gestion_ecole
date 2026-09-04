// ====================================================================
// INSTRUMENTATION NEXT — démarrage du processus serveur.
// - Sur Vercel (serverless) : PAS de sauvegarde auto (Neon gère les
//   backups nativement via PITR, et le filesystem est éphémère).
// - Sur VPS/auto-hébergé : sauvegarde au démarrage puis quotidienne.
// ====================================================================

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Vercel = serverless : pas de processus long-lived, pas de filesystem
  // persistant → les tâches planifiées ne peuvent pas tourner ici.
  if (process.env.VERCEL === '1') return;

  try {
    const { nettoyerVerrousOrphelins } = await import('@/lib/verrou-fichier');
    nettoyerVerrousOrphelins();
  } catch { /* non bloquant */ }

  const programmerSauvegarde = async () => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const { creerSauvegarde } = await import('@/lib/sauvegarde');
      const db = new PrismaClient();
      await creerSauvegarde(db, 'automatique');
      await db.$disconnect();
    } catch (e) {
      console.warn('Sauvegarde automatique impossible :', (e as Error).message);
    }
  };

  const tachesQuotidiennes = async () => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const db = new PrismaClient();
      const { relancerImpayesAutoCore } = await import('@/lib/business/completions');
      const { verifierRappelsVaccinationCore } = await import('@/lib/business/sante');
      const relances = await relancerImpayesAutoCore().catch(() => ({ notifiés: 0 }));
      const vaccins = await verifierRappelsVaccinationCore().catch(() => ({ notifiés: 0 }));
      if (relances.notifiés || vaccins.notifiés) {
        console.log(`Tâches quotidiennes : ${relances.notifiés} relance(s), ${vaccins.notifiés} rappel(s) vaccin`);
      }
      await db.$disconnect();
    } catch { /* non bloquant */ }
  };

  setTimeout(() => {
    void programmerSauvegarde();
    void tachesQuotidiennes();
    setInterval(() => void programmerSauvegarde(), 24 * 60 * 60 * 1000);
    setInterval(() => void tachesQuotidiennes(), 24 * 60 * 60 * 1000);
  }, 60_000).unref?.();
}
