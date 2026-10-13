// ====================================================================
// PAGE PRINCIPALE — RSC
// F1 : chargement PAR PORTAIL (un élève ne reçoit que ses données…).
// V4 : le paramètre d'URL ?annee=<id> permet de CONSULTER une année
// clôturée (bulletins, notes, évaluations, classes de cette année).
// RÉSILIENCE : la session est réessayée jusqu'à 8 fois avec backoff
// progressif. Une panne BD transitoire n'éjecte JAMAIS l'utilisateur
// vers /login — seulement l'absence RÉELLE de cookie de session.
// ====================================================================

import { redirect } from 'next/navigation';
import { getSessionCourante, portailDuCompte, type SessionInfo } from '@/lib/auth';
import { chargerDonneesPortail } from '@/lib/loaders/par-portail';
import { avecRetryBdd } from '@/lib/retry-bdd';
import AppShell from '@/components/app-shell';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Attend de plus en plus longtemps entre les tentatives (1s → 2s → 3s → 5s)
function attendre(ms: number) {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 300));
}

export default async function Home({ searchParams }: { searchParams: Promise<{ annee?: string }> | { annee?: string } }) {
  // ═══ ÉTAPE 1 : SESSION — réessayer JUSQU'À 8 fois ═══
  // Si la BD est lente, on ATTEND. On ne redirige vers /login QUE si
  // l'utilisateur n'a VRAIMENT pas de session (pas de cookie).
  let session: SessionInfo | null = null;
  let sessionInjoignable = false;

  const DELAIS = [0, 1000, 2000, 3000, 5000, 7000, 10000, 15000];
  for (let tentative = 0; tentative < DELAIS.length; tentative++) {
    if (DELAIS[tentative] > 0) await attendre(DELAIS[tentative]);
    try {
      session = await getSessionCourante();
      sessionInjoignable = false;
      break; // session lue (ou null si pas de cookie) → on continue
    } catch {
      sessionInjoignable = true; // BD injoignable → on réessaie
    }
  }

  // Cas 1 : pas de session du tout (aucun cookie) → login normalement
  if (!session && !sessionInjoignable) {
    redirect('/login');
  }

  // Cas 2 : la BD reste injoignable après 8 tentatives (~45 s d'attente)
  // → écran de reprise avec auto-retry, PAS de redirection login
  if (!session && sessionInjoignable) {
    return (
      <html>
        <body>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <meta httpEquiv="refresh" content="10" />
            <div className="w-full max-w-md border bg-white p-8 text-center shadow-sm">
              <div className="mx-auto h-12 w-12 bg-blue-100 text-blue-600 flex items-center justify-center mb-4 animate-pulse">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
              <h1 className="text-lg font-semibold">Reconnexion au serveur…</h1>
              <p className="mt-2 text-sm text-gray-500">
                La base de données se réveille. Votre session est préservée —
                cette page se recharge automatiquement toutes les 10 secondes.
              </p>
              <noscript><p className="mt-4 text-sm"><a href="/" className="text-blue-600 underline">Cliquez ici pour réessayer</a></p></noscript>
            </div>
          </div>
        </body>
      </html>
    );
  }

  const params = await Promise.resolve(searchParams);
  const anneeCibleId = params?.annee ?? null;

  const portal = portailDuCompte(session!.utilisateur.type, session!.permissions, session!.roles);

  // ═══ ÉTAPE 2 : DONNÉES — 5 tentatives avec backoff progressif ═══
  let initialData;
  try {
    initialData = await avecRetryBdd(() => chargerDonneesPortail(portal, session!, anneeCibleId), 5, 2000);
  } catch {
    // Les données n'ont pas chargé, mais la SESSION est valide.
    // On affiche l'interface avec un état vide plutôt que de tout casser.
    return (
      <html>
        <body>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <meta httpEquiv="refresh" content="8" />
            <div className="w-full max-w-md border bg-white p-8 text-center shadow-sm">
              <div className="mx-auto h-12 w-12 bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h1 className="text-lg font-semibold">Chargement des données…</h1>
              <p className="mt-2 text-sm text-gray-500">
                Votre session est active. Les données se rechargent automatiquement.
              </p>
              <noscript><p className="mt-4 text-sm"><a href="/" className="text-blue-600 underline">Réessayer maintenant</a></p></noscript>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return <AppShell initialData={initialData} />;
}
