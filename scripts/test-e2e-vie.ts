// ====================================================================
// E2E CYCLE DE VIE COMPLET — le parcours réel d'une école :
//  1. Le directeur crée son école (premier compte = admin actif)
//  2. L'admin se "connecte" (hash vérifié + session créable)
//  3. Chargement + RENDU de TOUS les portails (Vinci, données réelles)
//  4. Un parent s'inscrit → compte EN ATTENTE, connexion refusée
//  5. L'admin valide → parent actif, notifié, profil créé
//  6. Une 2e demande est refusée → compte neutralisé
// Nettoyage intégral en fin.
// ====================================================================

import { PrismaClient } from '@prisma/client';
import { renderToString } from 'react-dom/server';
import * as React from 'react';
import { initialiserEcoleCore } from '../src/lib/business/initialisation';
import { demanderCompteCore, traiterDemandeCompteCore } from '../src/lib/business/comptes';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { portailDuCompte, tenterConnexion } from '../src/lib/auth';
import { verifyPassword } from '../src/lib/auth-hash';
import { avecRetryBdd } from '../src/lib/retry-bdd';
import { executerAvecRetry, dbTest } from './_helper-test';

const db: PrismaClient = dbTest as unknown as PrismaClient;

// Stub next/navigation pour rendre les composants hors Next
const Module = require('module');
const resOrig = Module._resolveFilename;
Module._resolveFilename = function (req: string, ...args: any[]) {
  if (req === 'next/navigation') return require.resolve('./stub-next-navigation');
  return resOrig.call(this, req, ...args);
};

let passes = 0, echecs = 0;
function check(nom: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${nom}${detail ? ` (${detail})` : ''}`);
  ok ? passes++ : echecs++;
}

async function main() {
  const S = Date.now().toString(36);
  const r = await initialiserEcoleCore({
    nomEcole: `École E2E ${S}`,
    adminNom: 'Diop', adminPrenom: 'Mamadou',
    adminEmail: `e2e-admin-${S}@local.test`, adminMotDePasse: 'MotDePasse123!',
  });

  // ─── 1. PREMIÈRE INSTALLATION ───
  console.log('\n═══ 1. Première installation (directeur) ═══');
  const admin = await db.utilisateur.findUnique({ where: { id: r.adminId }, include: { roles: { include: { role: true } } } });
  check('admin créé et ACTIF immédiatement', !!admin && admin.actif === true);
  check('rôle direction attribué', admin!.roles.some((x) => x.role.code === 'direction'));
  check('mot de passe vérifiable', verifyPassword('MotDePasse123!', admin!.motDePasseHash));
  const mauvais = verifyPassword('Faux!', admin!.motDePasseHash);
  check('mauvais mot de passe rejeté', mauvais === false);

  // ─── 2. SESSION (connexion) ───
  console.log('\n═══ 2. Connexion de l\'admin ═══');
  const sess = await db.sessionUtilisateur.create({ data: { utilisateurId: r.adminId, tokenHash: 'e2e-' + S, active: true, dateDerniereActivite: new Date(), dateExpiration: new Date(Date.now() + 8 * 3600e3) } });
  check('session créée (8 h)', !!sess);

  // ─── 3. TOUS LES PORTAILS (école démo Vinci = données réelles) ───
  console.log('\n═══ 3. Chargement + rendu de TOUS les portails (données Vinci) ═══');
  const vinci = await db.ecole.findFirst({ where: { slug: 'vinci' } });
  const PORTAILS: Array<{ portal: string; types: string[] }> = [
    { portal: 'direction', types: ['personnel'] },
    { portal: 'enseignant', types: ['personnel'] },
    { portal: 'comptabilite', types: ['personnel'] },
    { portal: 'rh', types: ['personnel'] },
    { portal: 'vie_scolaire', types: ['personnel'] },
    { portal: 'secretariat', types: ['personnel'] },
    { portal: 'sante', types: ['personnel'] },
    { portal: 'parent', types: ['parent'] },
    { portal: 'eleve', types: ['eleve'] },
  ];
  const { default: DirectionModule } = await import('../src/components/modules/direction');
  const { default: PortailMetiers } = await import('../src/components/modules/portail-metiers');
  const { default: ParentPortalModule } = await import('../src/components/modules/parent-portal');
  const { default: ElevePortalModule } = await import('../src/components/modules/eleve-portal');

  for (const p of PORTAILS) {
    try {
      const candidats = await db.utilisateur.findMany({
        where: { ecoleId: vinci!.id, actif: true, deletedAt: null, type: { in: p.types } },
        include: { roles: { where: { OR: [{ dateFin: null }, { dateFin: { gt: new Date() } }] }, include: { role: { include: { permissions: { include: { permission: true } } } } } } },
      });
      let trouve: typeof candidats[0] | undefined;
      for (const c of candidats) {
        const perms = new Set<string>(); const roles: string[] = [];
        for (const ur of c.roles) { roles.push(ur.role.code); for (const rp of ur.role.permissions) perms.add(rp.permission.code); }
        if (portailDuCompte(c.type, perms, roles) === p.portal) { trouve = c; break; }
      }
      if (!trouve) { check(`portail ${p.portal}`, false, 'aucun utilisateur de test trouvé'); continue; }
      const perms = new Set<string>(); const roles: string[] = [];
      for (const ur of trouve.roles) { roles.push(ur.role.code); for (const rp of ur.role.permissions) perms.add(rp.permission.code); }
      const session = { utilisateur: { id: trouve.id, ecoleId: trouve.ecoleId, email: trouve.email, nom: trouve.nom, prenom: trouve.prenom, type: trouve.type }, permissions: perms, roles, sessionId: 'e2e' };
      const data = await avecRetryBdd(() => chargerDonneesPortail(p.portal as never, session as never, null), 3, 500);
      const tailleKo = Math.round(JSON.stringify(data).length / 1024);
      let html = '';
      if (p.portal === 'direction' || p.portal === 'enseignant') html = renderToString(React.createElement(DirectionModule, { initialData: data, mode: 'dashboard', portalLabel: p.portal === 'enseignant' ? 'Enseignant' : 'Direction' }));
      else if (['comptabilite', 'rh', 'vie_scolaire', 'secretariat', 'sante'].includes(p.portal)) html = renderToString(React.createElement(PortailMetiers, { initialData: data, portal: p.portal as any }));
      else if (p.portal === 'parent') html = renderToString(React.createElement(ParentPortalModule, { initialData: data, mode: 'dashboard' }));
      else if (p.portal === 'eleve') html = renderToString(React.createElement(ElevePortalModule, { initialData: data, mode: 'dashboard' }));
      check(`${p.portal} → données ${tailleKo} Ko + rendu ${Math.round(html.length / 1024)} Ko`, tailleKo > 0 && html.length > 1000);
      if (p.portal === 'eleve') {
        const autres = ((data as any).eleves ?? []).length;
        check('isolation élève : aucune liste d\'autres élèves', autres === 0, `${autres} reçus`);
      }
    } catch (e: any) {
      check(`portail ${p.portal}`, false, e.message?.slice(0, 120));
    }
  }

  // ─── 4. INSCRIPTION D'UN PARENT (file d'attente) ───
  console.log('\n═══ 4. Inscription d\'un parent → en attente ═══');
  const ecoleE2E = await db.ecole.findUnique({ where: { id: r.ecoleId } });
  const emailParent = `e2e-parent-${S}@local.test`;
  const dem = await demanderCompteCore({ ecoleSlug: ecoleE2E?.slug ?? '', nom: 'Sow', prenom: 'Aïssa', email: emailParent, motDePasse: 'MotDePasse456!', type: 'parent', motivation: 'Mère de deux enfants', ip: '127.0.0.1' });
  check('demande créée', !!dem.demandeId);
  const parentUser = await db.utilisateur.findFirst({ where: { email: emailParent } });
  check('compte parent INACTIF (en attente)', !!parentUser && parentUser.actif === false);
  const essai1 = await tenterConnexion(emailParent, 'MotDePasse456!', undefined, '127.0.0.1');
  check('connexion refusée avant validation', essai1.ok === false && /attente de validation/i.test((essai1 as any).erreur ?? ''), (essai1 as any).erreur);

  // ─── 5. L'ADMIN VALIDE ───
  console.log('\n═══ 5. Validation par l\'administrateur ═══');
  const ctxAdmin = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['securite.gerer', 'eleves.lire', 'eleves.ecrire']) };
  await traiterDemandeCompteCore(ctxAdmin as never, dem.demandeId, 'approuve');
  const parentApres = await db.utilisateur.findFirst({ where: { email: emailParent }, include: { parent: true } });
  check('parent ACTIVÉ', parentApres?.actif === true);
  check('profil ParentTuteur créé', !!parentApres?.parent);
  const demande = await db.demandeCompte.findUnique({ where: { id: dem.demandeId } });
  check('demande marquée approuvée', demande?.statut === 'approuve');
  const notif = await db.notification.findFirst({ where: { destinataireId: parentApres!.id } });
  check('parent notifié', !!notif && /validé/i.test(notif.sujet ?? ''));

  // ─── 6. REFUS D'UNE SECONDE DEMANDE ───
  console.log('\n═══ 6. Refus d\'une seconde demande ═══');
  const emailRefuse = `e2e-refuse-${S}@local.test`;
  const dem2 = await demanderCompteCore({ ecoleSlug: ecoleE2E?.slug ?? '', nom: 'Fall', prenom: 'Omar', email: emailRefuse, motDePasse: 'MotDePasse789!', type: 'personnel', roleDemande: 'enseignant', ip: '127.0.0.1' });
  await traiterDemandeCompteCore(ctxAdmin as never, dem2.demandeId, 'refuse', 'Dossier incomplet');
  const refuseUser = await db.utilisateur.findFirst({ where: { email: emailRefuse } });
  check('compte refusé neutralisé (inactif + supprimé)', refuseUser?.actif === false && !!refuseUser?.deletedAt);
  const essai2 = await tenterConnexion(emailRefuse, 'MotDePasse789!', undefined, '127.0.0.1');
  check('connexion refusée après refus (message générique)', essai2.ok === false, (essai2 as any).erreur);
  const essai3 = await tenterConnexion('inconnu@nulle.part', 'x', undefined, '127.0.0.1');
  check('anti-énumération : message unique pour email inconnu', essai3.ok === false, (essai3 as any).erreur);

  // ─── NETTOYAGE ───
  console.log('\n═══ Nettoyage ═══');
  await avecRetryBdd(async () => {
    const users = await db.utilisateur.findMany({ where: { OR: [{ email: { contains: `-${S}@local.test` } }] }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await db.sessionUtilisateur.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.tentativeConnexion.deleteMany({ where: { OR: [{ utilisateurId: { in: ids } }, { email: { contains: `-${S}@local.test` } }] } });
      await db.notification.deleteMany({ where: { destinataireId: { in: ids } } });
      await db.utilisateurRole.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.personnel.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.parentTuteur.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.demandeCompte.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.utilisateur.deleteMany({ where: { id: { in: ids } } });
    }
    const roleIds = await db.role.findMany({ where: { ecoleId: r.ecoleId }, select: { id: true } });
    if (roleIds.length) await db.rolePermission.deleteMany({ where: { roleId: { in: roleIds.map((x) => x.id) } } });
    await db.role.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.configurationPaie.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.classe.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.niveau.deleteMany({ where: { section: { cycle: { ecoleId: r.ecoleId } } } });
    await db.section.deleteMany({ where: { cycle: { ecoleId: r.ecoleId } } });
    await db.periode.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.anneeScolaire.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.cycle.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.auditLog.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.notification.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.ecole.delete({ where: { id: r.ecoleId } });
  }, 4, 600);
  console.log('✓ base nettoyée');

  console.log(`\n${echecs === 0 ? '✅✅' : '⚠️'} E2E CYCLE DE VIE : ${passes}/${passes + echecs} CHECKS PASS${echecs ? ` — ${echecs} ÉCHEC(S)` : ''}`);
  if (echecs) process.exitCode = 1;
}

executerAvecRetry('E2E-VIE', main);
