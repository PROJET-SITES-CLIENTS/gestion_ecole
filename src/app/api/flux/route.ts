// ====================================================================
// D1 — FLUX TEMPS RÉEL (Server-Sent Events) — VERSION OPTIMISÉE
// ---------------------------------------------------------------
// AVANT : 8 COUNT(*) toutes les 10s × N utilisateurs = DDoS BD
// APRÈS : 1 SELECT versionData FROM Ecole — division par ~1000 des requêtes
// ====================================================================

import { getSessionCourante } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Lecture ultra-légère : un seul champ entier, pas de COUNT. */
async function versionEcole(ecoleId: string | null, utilisateurId: string): Promise<number> {
  try {
    if (ecoleId) {
      const ecole = await (db as any).ecole.findUnique({
        where: { id: ecoleId },
        select: { versionData: true },
      });
      return ecole?.versionData ?? 0;
    }
    // Super-admin : somme globale (rare, utilisateurs limités)
    const agg = await (db as any).ecole.aggregate({ _sum: { versionData: true } });
    return agg._sum.versionData ?? 0;
  } catch {
    return 0;
  }
}

export async function GET(requête: Request) {
  const session = await getSessionCourante();
  if (!session) return new Response('unauthorized', { status: 401 });

  const ecoleId = session.utilisateur.ecoleId;
  const utilisateurId = session.utilisateur.id;
  const encodeur = new TextEncoder();

  let derniere = await versionEcole(ecoleId, utilisateurId);
  let actif = true;
  requête.signal.addEventListener('abort', () => { actif = false; });

  const flux = new ReadableStream({
    async start(controller) {
      const envoyer = (evenement: string, données: unknown) => {
        if (!actif) return;
        try {
          controller.enqueue(encodeur.encode(`event: ${evenement}\ndata: ${JSON.stringify(données)}\n\n`));
        } catch { actif = false; }
      };
      envoyer('init', { v: derniere, date: new Date().toISOString() });

      const tic = setInterval(async () => {
        if (!actif) { clearInterval(tic); try { controller.close(); } catch { } return; }
        const v = await versionEcole(ecoleId, utilisateurId);
        if (v !== derniere) {
          derniere = v;
          envoyer('changement', { v, date: new Date().toISOString() });
        } else {
          envoyer('ping', { date: new Date().toISOString() });
        }
      }, 10_000);

      // Sécurité : fermer le flux après 10 minutes (le client se réabonne)
      setTimeout(() => {
        clearInterval(tic);
        actif = false;
        try { controller.close(); } catch { }
      }, 10 * 60 * 1000);
    },
  });

  return new Response(flux, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
