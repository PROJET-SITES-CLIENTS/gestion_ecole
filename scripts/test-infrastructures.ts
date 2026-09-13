// ====================================================================
// TEST E2E INFRASTRUCTURES — options activables + internat complet +
// laboratoire + boutique (vente→finances) + parc info + sport.
// Nettoyage intégral.
// ====================================================================

import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore } from '../src/lib/business/initialisation';
import { inscrireEleveCore } from '../src/lib/business/eleves';
import { ActionError } from '../src/lib/business/commun';
import {
  lireFlagsInfra, majFlagInfraCore,
  creerChambreCore, inscrireInternatCore, libererPlaceInternatCore,
  demanderPermissionInternatCore, traiterPermissionInternatCore, declarerIncidentInternatCore,
  deposerBuanderieCore, gererBuanderieCore, enregistrerProductionCore, enregistrerControleHaccpCore,
  creerLaboratoireCore, ajouterEquipementLaboCore, mouvementConsommableCore, reserverLaboCore,
  creerProduitBoutiqueCore, encaisserVenteCore,
  ajouterEquipementInfoCore, majEtatEquipementInfoCore, preterEquipementInfoCore, retournerEquipementInfoCore,
  creerInstallationCore, occuperInstallationCore,
} from '../src/lib/business/infrastructures';
import { executerAvecRetry, dbTest } from './_helper-test';

const db: PrismaClient = dbTest as unknown as PrismaClient;

let passes = 0, echecs = 0;
function check(nom: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${nom}${detail ? ` (${detail})` : ''}`);
  ok ? passes++ : echecs++;
}
async function attenduRefus(fn: () => Promise<unknown>, nom: string, fragment: string) {
  try { await fn(); check(nom, false, 'accepté à tort !'); }
  catch (e) { check(nom, e instanceof ActionError && e.message.toLowerCase().includes(fragment), String((e as Error).message).slice(0, 90)); }
}

async function main() {
  const S = Date.now().toString(36);
  const r = await initialiserEcoleCore({
    nomEcole: `École Infra ${S}`, adminNom: 'Test', adminPrenom: 'Direction',
    adminEmail: `infra-${S}@local.test`, adminMotDePasse: 'MotDePasse123!',
  });
  const ctx = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['services.gerer', 'admin.saas', 'finances.voir', 'finances.ecrire', 'eleves.lire', 'eleves.ecrire']) };
  const ctxFaible = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['eleves.lire']) };

  // ══ 1. OPTIONS ACTIVABLES ══
  console.log('\n═══ 1. Activation des options ═══');
  let flags = await lireFlagsInfra(r.ecoleId);
  check('toutes les options inactives par défaut', Object.values(flags).every((v) => !v));
  await attenduRefus(() => creerChambreCore(ctx, { nom: 'X', genre: 'M', capacite: 2 }), 'action bloquée si option inactive', 'activ');
  await attenduRefus(() => majFlagInfraCore(ctxFaible, 'INTERNAT', true), 'activation réservée à la direction', 'permission');
  await majFlagInfraCore(ctx, 'INTERNAT', true);
  await majFlagInfraCore(ctx, 'LABORATOIRE', true);
  await majFlagInfraCore(ctx, 'BOUTIQUE', true);
  await majFlagInfraCore(ctx, 'PARC_INFO', true);
  await majFlagInfraCore(ctx, 'SPORT', true);
  flags = await lireFlagsInfra(r.ecoleId);
  check('les 5 options activées', Object.values(flags).every((v) => v), Object.keys(flags).filter((k) => flags[k]).join(','));

  // ══ 2. INTERNAT ══
  console.log('\n═══ 2. Internat (dortoirs, lits, permissions, buanderie, cuisine) ═══');
  const chambre = await creerChambreCore(ctx, { nom: `Dortoir Test ${S}`, genre: 'F', capacite: 4, etage: 'R+1' });
  const lits = await db.litInternat.findMany({ where: { chambreId: chambre.chambreId } });
  check('chambre créée avec 4 lits numérotés', lits.length === 4 && lits.every((l) => l.statut === 'libre'));
  const eleve = await inscrireEleveCore(ctx as never, r.ecoleId, { nom: `Interne${S}`, prenom: 'Awa', dateNaissance: new Date('2010-03-03'), lieuNaissance: 'Dakar', sexe: 'F' } as never);
  const inscr = await inscrireInternatCore(ctx, { eleveId: eleve.eleveId, regime: 'interne', tarifMensuel: 60000 });
  const litOccupe = await db.litInternat.findUnique({ where: { id: inscr.litId } });
  check('inscription : lit assigné et occupé', litOccupe?.statut === 'occupe' && litOccupe?.inscriptionId === inscr.inscriptionId);
  await attenduRefus(() => inscrireInternatCore(ctx, { eleveId: eleve.eleveId, regime: 'interne', tarifMensuel: 1 }), 'double inscription refusée', 'déjà');

  // Permissions
  const perm = await demanderPermissionInternatCore(ctx, { eleveId: eleve.eleveId, dateDepart: new Date('2026-11-20T16:00'), dateRetourPrevue: new Date('2026-11-22T18:00'), motif: 'Week-end familial', destination: 'Chez la tante' });
  await attenduRefus(() => demanderPermissionInternatCore(ctx, { eleveId: eleve.eleveId, dateDepart: new Date('2026-12-01T10:00'), dateRetourPrevue: new Date('2026-12-02T10:00'), motif: 'doublon' }), 'permission en double refusée', 'déjà');
  const permApprouvee = await traiterPermissionInternatCore(ctx, perm.permissionId, 'approuvee');
  const permCloturee = await traiterPermissionInternatCore(ctx, perm.permissionId, 'approuvee', new Date('2026-11-22T17:30'));
  check('workflow permission : demande → approuvée → clôturée', permApprouvee.statut === 'approuvee' && permCloturee.statut === 'cloturee');

  // Incident + buanderie
  const inc = await declarerIncidentInternatCore(ctx, { eleveId: eleve.eleveId, chambreId: chambre.chambreId, dateHeure: new Date(), gravite: 'moyen', description: 'Bavardage prolongé après extinction' });
  check('incident déclaré', !!inc.incidentId);
  const depot = await deposerBuanderieCore(ctx, { eleveId: eleve.eleveId, chambreId: chambre.chambreId, articles: [{ type: 'Draps', quantite: 2 }] });
  await gererBuanderieCore(ctx, depot.depotId, 'laver');
  const apresLavage = await gererBuanderieCore(ctx, depot.depotId, 'distribuer');
  check('buanderie : déposé → lavé → distribué', apresLavage.statut === 'distribue');

  // Cuisine (production + HACCP)
  const prod = await enregistrerProductionCore(ctx, { date: new Date(), service: 'diner', effectifPrevu: 40, effectifServi: 38 });
  const haccp = await enregistrerControleHaccpCore(ctx, { date: new Date(), pointControle: 'Chambre froide', valeur: '+7 °C', conforme: false, observation: 'Réglage effectué' });
  const notif = await db.notification.findFirst({ where: { ecoleId: r.ecoleId, sujet: { contains: 'HACCP' } } });
  check('production enregistrée + contrôle HACCP non conforme notifié', !!prod.productionId && !!haccp.controleId && !!notif);

  // Libération
  await libererPlaceInternatCore(ctx, inscr.inscriptionId, new Date());
  const litLibere = await db.litInternat.findUnique({ where: { id: inscr.litId } });
  check('libération : lit redevenu libre', litLibere?.statut === 'libre' && litLibere?.inscriptionId === null);

  // ══ 3. LABORATOIRE ══
  console.log('\n═══ 3. Laboratoire ═══');
  const labo = await creerLaboratoireCore(ctx, { nom: `Labo Physique ${S}`, type: 'sciences', capacite: 24 });
  const eq = await ajouterEquipementLaboCore(ctx, { laboratoireId: labo.laboratoireId, nom: 'Multimètre', quantite: 10 });
  check('labo + équipement créés', !!labo.laboratoireId && !!eq.equipementId);
  const res1 = await reserverLaboCore(ctx, { laboratoireId: labo.laboratoireId, date: new Date('2026-11-18'), heureDebut: '09:00', heureFin: '11:00', experience: 'Circuit RC' });
  await attenduRefus(() => reserverLaboCore(ctx, { laboratoireId: labo.laboratoireId, date: new Date('2026-11-18'), heureDebut: '10:00', heureFin: '12:00', experience: 'Chevauchement' }), 'créneau en conflit refusé', 'réserv');
  const res2 = await reserverLaboCore(ctx, { laboratoireId: labo.laboratoireId, date: new Date('2026-11-18'), heureDebut: '14:00', heureFin: '16:00', experience: 'Optique' });
  check('réservations : créneau libre accepté, conflit refusé', !!res1.reservationId && !!res2.reservationId);

  // ══ 4. BOUTIQUE ══
  console.log('\n═══ 4. Boutique (vente intégrée aux finances) ═══');
  const produit = await creerProduitBoutiqueCore(ctx, { categorie: 'uniforme', nom: 'Chemise blanche', taille: 'M', prix: 7500, stock: 10 });
  const vente = await encaisserVenteCore(ctx, { produitId: produit.produitId, quantite: 2, modePaiement: 'espèces', eleveId: eleve.eleveId });
  const produitApres = await db.boutiqueProduit.findUnique({ where: { id: produit.produitId } });
  const paiement = vente.paiementId ? await db.paiement.findUnique({ where: { id: vente.paiementId } }) : null;
  check('vente : stock 10→8 + montant 15 000 F', produitApres?.stock === 8 && vente.montantTotal === 1500000);
  check('vente : recette enregistrée dans les FINANCES (paiement relié)', !!paiement && paiement.montant === 1500000 && (paiement.referenceTransaction ?? '').startsWith('BOUT-'));
  await attenduRefus(() => encaisserVenteCore(ctx, { produitId: produit.produitId, quantite: 50, modePaiement: 'espèces' }), 'stock insuffisant refusé', 'stock');

  // ══ 5. PARC INFORMATIQUE ══
  console.log('\n═══ 5. Parc informatique ═══');
  const pc = await ajouterEquipementInfoCore(ctx, { categorie: 'ordinateur', nom: `PC Test ${S}`, valeur: 350000 });
  const pret = await preterEquipementInfoCore(ctx, { equipementId: pc.equipementId, emprunteParId: (await db.personnel.findFirst({ where: { utilisateurId: r.adminId } }))!.id, retourPrevu: new Date(Date.now() + 5 * 86400000) });
  await attenduRefus(() => preterEquipementInfoCore(ctx, { equipementId: pc.equipementId, emprunteParId: 'x', retourPrevu: new Date() }), 'double prêt refusé', 'prêt');
  await attenduRefus(() => majEtatEquipementInfoCore(ctx, pc.equipementId, 'panne'), 'panne impossible pendant prêt', 'prêt');
  await retournerEquipementInfoCore(ctx, pret.pretId, 'bon');
  const pcApres = await db.equipementInfo.findUnique({ where: { id: pc.equipementId } });
  check('prêt/retour : cycle complet, équipement opérationnel', pcApres?.etat === 'operationnel');

  // ══ 6. SPORT ══
  console.log('\n═══ 6. Installations sportives ═══');
  const terrain = await creerInstallationCore(ctx, { nom: `Terrain ${S}`, type: 'terrain', capacite: 200, eclairage: true });
  const occ1 = await occuperInstallationCore(ctx, { installationId: terrain.installationId, date: new Date('2026-11-18'), heureDebut: '16:00', heureFin: '18:00', titre: 'EPS 6A' });
  await attenduRefus(() => occuperInstallationCore(ctx, { installationId: terrain.installationId, date: new Date('2026-11-18'), heureDebut: '17:00', heureFin: '19:00', titre: 'Conflit' }), 'créneau sport en conflit refusé', 'occup');
  const occ2 = await occuperInstallationCore(ctx, { installationId: terrain.installationId, date: new Date('2026-11-18'), heureDebut: '18:00', heureFin: '20:00', titre: 'Entraînement' });
  check('occupations : créneau libre accepté, conflit refusé', !!occ1.occupationId && !!occ2.occupationId);

  // ══ NETTOYAGE ══
  console.log('\n═══ Nettoyage ═══');
  await (async () => {
    const eid = r.ecoleId;
    await db.occupationSport.deleteMany({ where: { ecoleId: eid } });
    await db.installationSportive.deleteMany({ where: { ecoleId: eid } });
    await db.pretInfo.deleteMany({ where: { ecoleId: eid } });
    await db.equipementInfo.deleteMany({ where: { ecoleId: eid } });
    const ventes = await db.boutiqueVente.findMany({ where: { ecoleId: eid }, select: { paiementId: true } });
    if (ventes.length) await db.paiement.deleteMany({ where: { id: { in: ventes.map((v) => v.paiementId).filter(Boolean) as string[] } } });
    await db.boutiqueVente.deleteMany({ where: { ecoleId: eid } });
    await db.boutiqueProduit.deleteMany({ where: { ecoleId: eid } });
    await db.reservationLabo.deleteMany({ where: { ecoleId: eid } });
    const labos = await db.laboratoire.findMany({ where: { ecoleId: eid }, select: { id: true } });
    if (labos.length) {
      await db.equipementLabo.deleteMany({ where: { laboratoireId: { in: labos.map((l) => l.id) } } });
      await db.consommableLabo.deleteMany({ where: { laboratoireId: { in: labos.map((l) => l.id) } } });
    }
    await db.laboratoire.deleteMany({ where: { ecoleId: eid } });
    await db.controleHaccp.deleteMany({ where: { ecoleId: eid } });
    await db.productionRepas.deleteMany({ where: { ecoleId: eid } });
    await db.buanderieDepot.deleteMany({ where: { ecoleId: eid } });
    await db.incidentInternat.deleteMany({ where: { ecoleId: eid } });
    await db.permissionInternat.deleteMany({ where: { ecoleId: eid } });
    const inscriptions = await db.inscriptionInternat.findMany({ where: { ecoleId: eid }, select: { litId: true } });
    if (inscriptions.length) await db.litInternat.deleteMany({ where: { id: { in: inscriptions.map((i) => i.litId).filter(Boolean) as string[] } } });
    await db.inscriptionInternat.deleteMany({ where: { ecoleId: eid } });
    const chambres = await db.chambreInternat.findMany({ where: { ecoleId: eid }, select: { id: true } });
    if (chambres.length) await db.litInternat.deleteMany({ where: { chambreId: { in: chambres.map((c) => c.id) } } });
    await db.chambreInternat.deleteMany({ where: { ecoleId: eid } });
    // flags
    const ff = await db.featureFlag.findMany({ where: { code: { in: ['INTERNAT', 'LABORATOIRE', 'BOUTIQUE', 'PARC_INFO', 'SPORT'] } }, select: { id: true } });
    await db.featureFlagEcole.deleteMany({ where: { ecoleId: eid, featureFlagId: { in: ff.map((x) => x.id) } } });
    // école + utilisateurs
    const users = await db.utilisateur.findMany({ where: { email: { contains: `-${S}@local.test` } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await db.sessionUtilisateur.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.notification.deleteMany({ where: { destinataireId: { in: ids } } });
      await db.utilisateurRole.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.personnel.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.utilisateur.deleteMany({ where: { id: { in: ids } } });
    }
    const roleIds = await db.role.findMany({ where: { ecoleId: eid }, select: { id: true } });
    if (roleIds.length) await db.rolePermission.deleteMany({ where: { roleId: { in: roleIds.map((x) => x.id) } } });
    await db.role.deleteMany({ where: { ecoleId: eid } });
    await db.configurationPaie.deleteMany({ where: { ecoleId: eid } });
    await db.classe.deleteMany({ where: { ecoleId: eid } });
    await db.niveau.deleteMany({ where: { section: { cycle: { ecoleId: eid } } } });
    await db.section.deleteMany({ where: { cycle: { ecoleId: eid } } });
    await db.periode.deleteMany({ where: { ecoleId: eid } });
    await db.anneeScolaire.deleteMany({ where: { ecoleId: eid } });
    await db.cycle.deleteMany({ where: { ecoleId: eid } });
    await db.auditLog.deleteMany({ where: { ecoleId: eid } });
    await db.notification.deleteMany({ where: { ecoleId: eid } });
    await db.eleveParent.deleteMany({ where: { eleve: { ecoleId: eid } } });
    await db.eleve.deleteMany({ where: { ecoleId: eid } });
    await db.ecole.delete({ where: { id: eid } });
  })();
  console.log('✓ base nettoyée');

  console.log(`\n${echecs === 0 ? '✅✅' : '⚠️'} INFRASTRUCTURES : ${passes}/${passes + echecs} CHECKS PASS${echecs ? ` — ${echecs} ÉCHEC(S)` : ''}`);
  if (echecs) process.exitCode = 1;
}

executerAvecRetry('INFRA', main);
