// ====================================================================
// PAGE PRINCIPALE — RSC
// F1 : chargement PAR PORTAIL (un élève ne reçoit que ses données…).
// RÉSILIENCE : la session est réessayée jusqu'à 8 fois. Une panne BD
// transitoire n'éjecte JAMAIS l'utilisateur vers /login.
// ====================================================================

import { redirect } from 'next/navigation';
import { getSessionCourante, portailDuCompte, type SessionInfo } from '@/lib/auth';
import { chargerDonneesPortail } from '@/lib/loaders/par-portail';
import { avecRetryBdd } from '@/lib/retry-bdd';
import AppShell from '@/components/app-shell';
import Reconnexion from '@/components/reconnexion';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Attend de plus en plus longtemps entre les tentatives
function attendre(ms: number) {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 300));
}

export default async function Home({ searchParams }: { searchParams: Promise<{ annee?: string }> | { annee?: string } }) {
  // ═══ ÉTAPE 1 : SESSION — 8 tentatives avec backoff progressif ═══
  let session: SessionInfo | null = null;
  let sessionInjoignable = false;

  const DELAIS = [0, 1000, 2000, 3000, 5000, 7000, 10000, 15000];
  for (let tentative = 0; tentative < DELAIS.length; tentative++) {
    if (DELAIS[tentative] > 0) await attendre(DELAIS[tentative]);
    try {
      session = await getSessionCourante();
      sessionInjoignable = false;
      break;
    } catch {
      sessionInjoignable = true;
    }
  }

  // Pas de session du tout (aucun cookie) → login
  if (!session && !sessionInjoignable) {
    redirect('/login');
  }

  // BD injoignable après 8 tentatives → écran de reconnexion (PAS de redirect login)
  if (!session && sessionInjoignable) {
    return <Reconnexion message="La base de données se réveille. Votre session est préservée." />;
  }

  const params = await Promise.resolve(searchParams);
  const anneeCibleId = params?.annee ?? null;
  const portal = portailDuCompte(session!.utilisateur.type, session!.permissions, session!.roles);

  // ═══ ÉTAPE 2 : DONNÉES — 5 tentatives ═══
  let initialData;
  try {
    initialData = await avecRetryBdd(() => chargerDonneesPortail(portal, session!, anneeCibleId), 5, 2000);
  } catch {
    return <Reconnexion message="Votre session est active. Les données se rechargent automatiquement." />;
  }

  return <AppShell initialData={initialData} />;
}
