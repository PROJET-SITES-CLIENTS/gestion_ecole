// ====================================================================
// PAGE PRINCIPALE — RSC
// F1 : chargement PAR PORTAIL (un élève ne reçoit que ses données…).
// V4 : le paramètre d'URL ?annee=<id> permet de CONSULTER une année
// clôturée (bulletins, notes, évaluations, classes de cette année).
// Robustesse : retry sur erreur BD transitoire (réveil Neon/serverless)
// + écran de reprise propre plutôt qu'un crash de page.
// ====================================================================

import { redirect } from 'next/navigation';
import { getSessionCourante, portailDuCompte } from '@/lib/auth';
import { chargerDonneesPortail } from '@/lib/loaders/par-portail';
import { avecRetryBdd } from '@/lib/retry-bdd';
import AppShell from '@/components/app-shell';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ annee?: string }> | { annee?: string } }) {
  const session = await getSessionCourante();
  if (!session) redirect('/login');

  const params = await Promise.resolve(searchParams);
  const anneeCibleId = params?.annee ?? null;

  const portal = portailDuCompte(session.utilisateur.type, session.permissions, session.roles);

  let initialData;
  try {
    // 3 tentatives avec backoff : absorbe le réveil du serveur de base
    // de données (autosuspend Neon) et les échauffements serverless.
    initialData = await avecRetryBdd(() => chargerDonneesPortail(portal, session, anneeCibleId), 3, 500);
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">Le tableau de bord n&apos;a pas pu se charger</h1>
          <p className="mt-2 text-sm text-gray-500">
            La connexion à la base de données n&apos;a pas répondu à temps (le serveur
            se réveille parfois après une période d&apos;inactivité). Réessayez — cela
            fonctionne généralement du premier coup au second essai.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <a href={`/?${new Date().getTime()}`} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              <RefreshCw className="h-4 w-4" /> Réessayer
            </a>
            <a href="/login" className="text-sm text-gray-500 hover:underline">Retour à la connexion</a>
          </div>
        </div>
      </div>
    );
  }

  return <AppShell initialData={initialData} />;
}
