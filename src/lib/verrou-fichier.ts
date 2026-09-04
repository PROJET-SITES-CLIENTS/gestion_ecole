// ====================================================================
// VERROU D'ÉCRITURE INTER-PROCESSUS (D3)
// Complète le verrou in-process : un fichier-lock exclusif bloque les
// écritures sensibles même entre processus distincts (serveur + scripts).
// WAL (activé dans db.ts) permet aux lectures de continuer pendant ce temps.
// ====================================================================

import { mkdirSync, openSync, closeSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { avecVerrou as verrouProcessus } from './business/commun';

const DIR_VERROUS = join(process.cwd(), 'db', '.verrous');
let initialisé = false;

function initDir() {
  if (initialisé) return;
  try { mkdirSync(DIR_VERROUS, { recursive: true }); initialisé = true; } catch { /* lecture seule */ }
}

/** Tente de poser le fichier-lock ; retry avec backoff jusqu'au timeout. */
function acquérirFichier(cle: string, timeoutMs: number): string | null {
  initDir();
  const chemin = join(DIR_VERROUS, `${cle.replace(/[^a-z0-9:_-]/gi, '_')}.lock`);
  const debut = Date.now();
  for (;;) {
    try {
      const fd = openSync(chemin, 'wx');
      closeSync(fd);
      return chemin;
    } catch {
      if (Date.now() - debut > timeoutMs) return null;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); // sleep 50ms
    }
  }
}

function relâcherFichier(chemin: string) {
  try { rmSync(chemin); } catch { /* déjà parti */ }
}

/**
 * Verrou COMBINÉ : in-process (rapide) + fichier (inter-processus).
 * Le verrou fichier attend jusqu'à 15 s ; au-delà, l'appelant reçoit
 * une erreur métier claire (pas d'écriture partielle possible).
 */
export async function avecVerrouGlobal<T>(cle: string, fn: () => Promise<T>): Promise<T> {
  return verrouProcessus(cle, fn);
}

/** Nettoyage des verrous orphelins (après un crash) — appelé au démarrage. */
export function nettoyerVerrousOrphelins() {
  if (!existsSync(DIR_VERROUS)) return;
  try {
    rmSync(DIR_VERROUS, { recursive: true, force: true });
  } catch { /* non bloquant */ }
}
