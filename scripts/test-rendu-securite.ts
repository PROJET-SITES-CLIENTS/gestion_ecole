// Reproduit le crash du module Sécurité via renderToString
import { renderToString } from 'react-dom/server';
import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore, demanderCompteCore } from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

async function main() {
  const S = Date.now().toString(36).slice(-6);
  const r = await initialiserEcoleCore({ nomEcole: `Secu Rendu ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `sr-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  // une vraie demande de compte en attente (comme le cas réel de l'utilisateur)
  await demanderCompteCore({ ecoleSlug: (await db.ecole.findUnique({ where: { id: r.ecoleId } }))!.slug, nom: 'Comptable', prenom: 'Test', email: `cpte-${S}@test.sn`, motDePasse: 'Test1234!', type: 'personnel', roleDemande: 'comptabilite', motivation: 'poste occupé' } as never);
  const session = { utilisateur: { id: r.adminId, ecoleId: r.ecoleId, email: 'd@t.sn', nom: 'Dir', prenom: 'Test', type: 'personnel' }, permissions: new Set(['admin.saas','rh.gerer','eleves.lire','eleves.ecrire','finances.voir','finances.ecrire','finances.valider','vie_scolaire.gerer','securite.gerer','bulletins.valider','communication.envoyer','services.gerer','edt.gerer','sante.gerer','salles.gerer','protection.gerer','notes.saisir','presences.saisir']), roles: ['direction'], sessionId: 't' };
  const data: any = await chargerDonneesPortail('direction', session as never, null);
  console.log('demandesCompte chargées :', (data.demandesCompte ?? []).length);
  console.log('sessionsUtilisateur :', (data.sessionsUtilisateur ?? []).length, '| tentativesConnexion :', (data.tentativesConnexion ?? []).length);

  const { default: SecuriteModule } = await import('../src/components/modules/securite');
  try {
    const React = (await import('react')).default;
    const html = renderToString(React.createElement(SecuriteModule, { initialData: { ...data, session: { ...session, portal: 'direction' } } }));
    console.log('✓ RENDU OK —', html.length, 'caractères');
  } catch (e: any) {
    console.log('✗ CRASH REPRODUIT :', e?.message?.slice(0, 300));
    console.log('   stack :', (e?.stack ?? '').split('\n').slice(0, 6).join('\n'));
  }
  await purgerEcoles([r.ecoleId]);
}

executerAvecRetry('RENDU-SECURITE', main);
