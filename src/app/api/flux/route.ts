// ====================================================================
// D1 — FLUX TEMPS RÉEL (Server-Sent Events)
// Le serveur POUSSÉ la version des données toutes les 10 s aux clients
// connectés (même compteur v1 que /api/pulse). L'app-shell s'y abonne
// via EventSource (avec repli sur le polling 15 s existant).
// ====================================================================

import { getSessionCourante } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function version(ecoleId: string | null, utilisateurId: string): Promise<number> {
  const base = {
    paiement: ecoleId ? { ecoleId } : undefined,
    depense: ecoleId ? { ecoleId } : undefined,
    notification: { destinataireId: utilisateurId },
    incident: ecoleId ? { eleve: { ecoleId } } : undefined,
    conge: ecoleId ? { personnel: { ecoleId } } : undefined,
    passageInfirmerie: ecoleId ? { ecoleId } : undefined,
    auditLog: ecoleId ? { ecoleId } : undefined,
    visiteur: ecoleId ? { ecoleId } : undefined,
  };
  try {
    const [pa, de, no, inc, co, pi, au, vi] = await Promise.all([
      db.paiement.count({ where: base.paiement }),
      db.depense.count({ where: base.depense }),
      db.notification.count({ where: base.notification }),
      db.incident.count({ where: base.incident }),
      db.conge.count({ where: base.conge }),
      db.passageInfirmerie.count({ where: base.passageInfirmerie }),
      db.auditLog.count({ where: base.auditLog }),
      db.visiteur.count({ where: base.visiteur }),
    ]);
    return pa + de * 2 + no * 5 + inc * 7 + co * 11 + pi * 13 + au * 17 + vi * 19;
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

  let derniere = await version(ecoleId, utilisateurId);
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
        const v = await version(ecoleId, utilisateurId);
        if (v !== derniere) {
          derniere = v;
          envoyer('changement', { v, date: new Date().toISOString() });
        } else {
          envoyer('ping', { date: new Date().toISOString() }); // garde-fou anti-timeout proxy
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
