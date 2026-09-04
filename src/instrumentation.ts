// ====================================================================
// INSTRUMENTATION NEXT — démarrage du processus serveur (A1/D3).
// - Purge des verrous fichier orphelins (crash précédent)
// - Sauvegarde automatique au démarrage puis quotidienne (24 h)
// ====================================================================

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
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

  // M12/C6 — tâches quotidiennes : relances d'impayés + rappels de vaccination
  const tachesQuotidiennes = async () => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const db = new PrismaClient();
      const { relancerImpayesAutoCore } = await import('@/lib/business/completions');
      const { verifierRappelsVaccinationCore } = await import('@/lib/business/sante');
      const relances = await relancerImpayesAutoCore().catch(() => ({ notifiés: 0 }));
      const vaccins = await verifierRappelsVaccinationCore().catch(() => ({ notifiés: 0 }));
      if (relances.notifiés || vaccins.notifiés) {
        console.log(`📋 Tâches quotidiennes : ${relances.notifiés} relance(s) impayés, ${vaccins.notifiés} rappel(s) vaccin`);
      }
      await db.$disconnect();
    } catch { /* non bloquant */ }
  };

  // Première sauvegarde 1 min après le démarrage, puis toutes les 24 h
  setTimeout(() => {
    void programmerSauvegarde();
    void tachesQuotidiennes();
    setInterval(() => void programmerSauvegarde(), 24 * 60 * 60 * 1000);
    setInterval(() => void tachesQuotidiennes(), 24 * 60 * 60 * 1000);
  }, 60_000).unref?.();
}
