// ====================================================================
// PAGE PRINCIPALE — RSC
// F1 : chargement PAR PORTAIL (un élève ne reçoit que ses données…).
// V4 : le paramètre d'URL ?annee=<id> permet de CONSULTER une année
// clôturée (bulletins, notes, évaluations, classes de cette année).
// ====================================================================

import { redirect } from 'next/navigation';
import { getSessionCourante, portailDuCompte } from '@/lib/auth';
import { chargerDonneesPortail } from '@/lib/loaders/par-portail';
import AppShell from '@/components/app-shell';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ annee?: string }> | { annee?: string } }) {
  const session = await getSessionCourante();
  if (!session) redirect('/login');

  const params = await Promise.resolve(searchParams);
  const anneeCibleId = params?.annee ?? null;

  const portal = portailDuCompte(session.utilisateur.type, session.permissions, session.roles);
  const initialData = await chargerDonneesPortail(portal, session, anneeCibleId);

  return <AppShell initialData={initialData} />;
}
