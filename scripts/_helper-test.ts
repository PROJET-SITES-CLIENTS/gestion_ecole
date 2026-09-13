// Helper partagé des scripts de test : client durci (réveil Neon) +
// exécuteur avec retry sur erreurs transitoires.
import { PrismaClient } from '@prisma/client';

function urlDurcie(url: string | undefined): string | undefined {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  const manquants = [
    !/connect_timeout=/.test(url) && 'connect_timeout=30',
    !/pool_timeout=/.test(url) && 'pool_timeout=60',
    !/connection_limit=/.test(url) && 'connection_limit=8',
  ].filter(Boolean) as string[];
  return manquants.length ? url + sep + manquants.join('&') : url;
}

export const dbTest = new PrismaClient({
  datasources: urlDurcie(process.env.DATABASE_URL) ? { db: { url: urlDurcie(process.env.DATABASE_URL)! } } : undefined,
});

export function estTransitoire(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  if (err?.code && ['P1001','P1006','P1008','P1010','P1017','P2024'].includes(err.code)) return true;
  return /can't reach database|connection terminated|connection reset|timed out|closed the connection/i.test(String(err?.message ?? ''));
}

/** Exécute une fonction de test en retentant tout si la base s'est rendormie. */
export async function executerAvecRetry(nom: string, fn: () => Promise<void>, maxEssais = 4): Promise<void> {
  for (let essai = 1; essai <= maxEssais; essai++) {
    try {
      await fn();
      return;
    } catch (e) {
      if (essai === maxEssais || !estTransitoire(e)) {
        console.error(`ERREUR SCRIPT [${nom}]:`, (e as Error).message);
        process.exitCode = 1;
        return;
      }
      console.log(`↻ [${nom}] base en cours de réveil, tentative ${essai + 1}/${maxEssais}…`);
      await new Promise((r) => setTimeout(r, 2000 * essai));
    }
  }
}
