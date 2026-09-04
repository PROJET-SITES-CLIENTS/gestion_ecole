// ====================================================================
// RETRY BASE DE DONNÉES — erreurs transitoires (Neon / serverless)
// Cold-start du pooler, connexion coupée en rafale, timeout… : on
// RETENTE avec backoff au lieu de faire planter la page entière.
// ====================================================================

const CODES_TRANSITOIRES = new Set([
  'P1001', // Can't reach database server
  'P1006', // Server crashed / connexion perdue
  'P1008', // Transactions timed out
  'P1010', // Database access denied (proxy réveil)
  'P1017', // Server closed the connection
  'P2024', // Timed out fetching a connection from the pool
  'P2034', // Conflit transactionnel
]);

const MOTIFS_TRANSITOIRES = /can't reach database|connection terminated|connection reset|connection timed out|closed the connection unexpectedly|database is locked|write conflict|server has gone away|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE/i;

/** L'erreur est-elle transitoire (réessayable) ? */
export function estErreurTransitoire(e: unknown): boolean {
  const err = e as { code?: string; message?: string; error?: { code?: string; message?: string } };
  if (err?.code && CODES_TRANSITOIRES.has(err.code)) return true;
  if (err?.error?.code && CODES_TRANSITOIRES.has(err.error.code)) return true;
  const msg = `${err?.message ?? ''} ${err?.error?.message ?? ''}`;
  if (MOTIFS_TRANSITOIRES.test(msg)) return true;
  return false;
}

/**
 * Retente une opération (lecture ou écriture idempotente) sur erreur
 * transitoire : backoff exponentiel + jitter, max 3 essais par défaut.
 */
export async function avecRetryBdd<T>(fn: () => Promise<T>, maxEssais = 3, baseMs = 400): Promise<T> {
  let derniere: unknown;
  for (let essai = 1; essai <= maxEssais; essai++) {
    try {
      return await fn();
    } catch (e) {
      if (!estErreurTransitoire(e) || essai === maxEssais) throw e;
      derniere = e;
      const jitter = Math.random() * 200;
      await new Promise((r) => setTimeout(r, baseMs * essai + jitter));
    }
  }
  throw derniere;
}
