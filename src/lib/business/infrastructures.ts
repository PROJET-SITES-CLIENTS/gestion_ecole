// ====================================================================
// INFRASTRUCTURES OPTIONNELLES — internat (+cuisine intégrée), labora-
// toire, boutique, parc informatique, installations sportives.
// Chaque infrastructure est ACTIVABLE par la direction (feature flag).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, tranchesSeChevauchent } from './commun';

export const FLAGS_INFRA = ['INTERNAT', 'LABORATOIRE', 'BOUTIQUE', 'PARC_INFO', 'SPORT'] as const;
export type FlagInfra = (typeof FLAGS_INFRA)[number];

// --------------------------------------------------------------------
// Activation des options
// --------------------------------------------------------------------

export async function lireFlagsInfra(ecoleId: string): Promise<Record<string, boolean>> {
  const lignes = await db.featureFlagEcole.findMany({
    where: { ecoleId, featureFlag: { code: { in: FLAGS_INFRA as unknown as string[] } } },
    include: { featureFlag: { select: { code: true } } },
  });
  const out: Record<string, boolean> = {};
  for (const f of FLAGS_INFRA) out[f] = false;
  for (const l of lignes) out[l.featureFlag.code] = l.actif;
  return out;
}

export async function majFlagInfraCore(ctx: Ctx, code: FlagInfra, actif: boolean) {
  assertPermission(ctx, 'admin.saas');
  if (!FLAGS_INFRA.includes(code)) throw new ActionError('Option inconnue.', 'CHAMP_INVALIDE');
  let flag = await db.featureFlag.findUnique({ where: { code } });
  if (!flag) flag = await db.featureFlag.create({ data: { code, description: `Infrastructure ${code}` } });
  await db.featureFlagEcole.upsert({
    where: { featureFlagId_ecoleId: { featureFlagId: flag.id, ecoleId: ctx.ecoleId! } },
    create: { featureFlagId: flag.id, ecoleId: ctx.ecoleId!, actif },
    update: { actif },
  });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'infra.flag', 'feature_flag_ecole', `${ctx.ecoleId}:${code}`, { code, actif });
  return { code, actif };
}

function exigerFlag(ctx: Ctx, code: FlagInfra) {
  // Vérifié à chaud : coût d'une requête, sécurité maximale.
  return db.featureFlagEcole.findFirst({
    where: { ecoleId: ctx.ecoleId!, actif: true, featureFlag: { code } },
  }).then((f) => {
    if (!f) throw new ActionError(`L'option « ${code} » n'est pas activée pour votre établissement (Paramètres → Infrastructures).`, 'OPTION_INACTIVE');
  });
}

// ====================================================================
// INTERNAT (+ cuisine centrale intégrée)
// =====================================================================

export async function creerChambreCore(ctx: Ctx, input: { nom: string; genre: string; capacite: number; etage?: string; surveillantId?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  if (input.capacite < 1 || input.capacite > 20) throw new ActionError('Capacité entre 1 et 20 lits.', 'CHAMP_INVALIDE');
  return db.$transaction(async (tx) => {
    const chambre = await tx.chambreInternat.create({
      data: { ecoleId: ctx.ecoleId!, nom: input.nom.trim(), genre: input.genre, capacite: input.capacite, etage: input.etage?.trim() || null, surveillantId: input.surveillantId || null },
    });
    await tx.litInternat.createMany({
      data: Array.from({ length: input.capacite }, (_, i) => ({ chambreId: chambre.id, numero: i + 1 })),
    });
    await logAction(tx, ctx.ecoleId, ctx.utilisateurId, 'internat.chambre_creee', 'chambre_internat', chambre.id, { nom: input.nom, lits: input.capacite });
    return { chambreId: chambre.id, lits: input.capacite };
  });
}

export async function inscrireInternatCore(ctx: Ctx, input: { eleveId: string; regime: string; tarifMensuel: number; chambreId?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ctx.ecoleId!, active: true } });
  if (!annee) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');
  const deja = await db.inscriptionInternat.findFirst({ where: { eleveId: input.eleveId, statut: 'actif' } });
  if (deja) throw new ActionError('Cet élève est déjà inscrit à l\'internat.', 'DEJA_EXISTANT');

  return db.$transaction(async (tx) => {
    // Lit libre : dans la chambre demandée, sinon n'importe où (genre par chambre)
    const lits = await tx.litInternat.findMany({
      where: {
        statut: 'libre',
        ...(input.chambreId ? { chambreId: input.chambreId } : {}),
        chambre: { ecoleId: ctx.ecoleId!, actif: true },
      },
      orderBy: { numero: 'asc' },
    });
    const lit = lits[0];
    if (!lit) throw new ActionError('Aucun lit libre (dans cette chambre si précisée).', 'COMPLET');
    const inscription = await tx.inscriptionInternat.create({
      data: {
        ecoleId: ctx.ecoleId!, eleveId: input.eleveId, anneeScolaireId: annee.id,
        regime: input.regime, litId: lit.id, dateEntree: new Date(),
        tarifMensuel: Math.round(input.tarifMensuel * 100),
      },
    });
    await tx.litInternat.update({ where: { id: lit.id }, data: { statut: 'occupe', inscriptionId: inscription.id } });
    await logAction(tx, ctx.ecoleId, ctx.utilisateurId, 'internat.inscription', 'inscription_internat', inscription.id, { eleveId: input.eleveId, litId: lit.id });
    return { inscriptionId: inscription.id, litId: lit.id };
  });
}

export async function libererPlaceInternatCore(ctx: Ctx, inscriptionId: string, dateSortie: Date) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  await db.$transaction(async (tx) => {
    const inscription = await tx.inscriptionInternat.findUnique({ where: { id: inscriptionId } });
    if (!inscription) throw new ActionError('Inscription introuvable.', 'INTROUVABLE');
    assertTenant(inscription.ecoleId, ctx, 'Cette inscription');
    await tx.inscriptionInternat.update({ where: { id: inscriptionId }, data: { statut: 'sorti', dateSortie } });
    if (inscription.litId) {
      await tx.litInternat.update({ where: { id: inscription.litId }, data: { statut: 'libre', inscriptionId: null } });
    }
    await logAction(tx, ctx.ecoleId, ctx.utilisateurId, 'internat.sortie', 'inscription_internat', inscriptionId, {});
  });
  return { ok: true };
}

export async function tauxOccupationInternatCore(ctx: Ctx) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  const lits = await db.litInternat.findMany({ where: { chambre: { ecoleId: ctx.ecoleId!, actif: true } } });
  const occ = lits.filter((l) => l.statut === 'occupe').length;
  const maintenance = lits.filter((l) => l.statut === 'maintenance').length;
  return {
    totalLits: lits.length,
    occupes: occ,
    libres: lits.filter((l) => l.statut === 'libre').length,
    maintenance,
    taux: lits.length ? Math.round((occ / lits.length) * 100) : 0,
  };
}

export async function demanderPermissionInternatCore(ctx: Ctx, input: { eleveId: string; dateDepart: Date; dateRetourPrevue: Date; motif: string; destination?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  if (input.dateRetourPrevue <= input.dateDepart) throw new ActionError('Le retour prévu doit être après le départ.', 'DATE_INVALIDE');
  const enCourse = await db.permissionInternat.findFirst({
    where: { eleveId: input.eleveId, statut: { in: ['demande', 'approuvee'] } },
  });
  if (enCourse) throw new ActionError('Une permission est déjà en cours pour cet élève.', 'DEJA_EXISTANT');
  const p = await db.permissionInternat.create({
    data: {
      ecoleId: ctx.ecoleId!, eleveId: input.eleveId, dateDepart: input.dateDepart,
      dateRetourPrevue: input.dateRetourPrevue, motif: input.motif.trim(),
      destination: input.destination?.trim() || null, statut: 'demande',
    },
  });
  return { permissionId: p.id };
}

export async function traiterPermissionInternatCore(ctx: Ctx, permissionId: string, decision: 'approuvee' | 'refusee', retourEffectif?: Date) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  const p = await db.permissionInternat.findUnique({ where: { id: permissionId } });
  if (!p) throw new ActionError('Permission introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Cette permission');
  const statut = retourEffectif ? 'cloturee' : (decision === 'approuvee' ? 'approuvee' : 'refusee');
  await db.permissionInternat.update({
    where: { id: permissionId },
    data: { statut, traiteParId: ctx.utilisateurId, ...(retourEffectif ? { dateRetourEffective: retourEffectif } : {}) },
  });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, `internat.permission_${decision}`, 'permission_internat', permissionId, {});
  return { permissionId, statut };
}

export async function declarerIncidentInternatCore(ctx: Ctx, input: { eleveId?: string; chambreId?: string; dateHeure: Date; gravite: string; description: string; suites?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  const inc = await db.incidentInternat.create({
    data: {
      ecoleId: ctx.ecoleId!, eleveId: input.eleveId || null, chambreId: input.chambreId || null,
      dateHeure: input.dateHeure, gravite: input.gravite, description: input.description.trim(),
      suites: input.suites?.trim() || null, declareParId: ctx.utilisateurId,
    },
  });
  return { incidentId: inc.id };
}

export async function gererBuanderieCore(ctx: Ctx, depotId: string, action: 'laver' | 'distribuer') {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  const d = await db.buanderieDepot.findUnique({ where: { id: depotId } });
  if (!d) throw new ActionError('Dépôt introuvable.', 'INTROUVABLE');
  assertTenant(d.ecoleId, ctx, 'Ce dépôt');
  const statut = action === 'laver' ? 'lave' : 'distribue';
  await db.buanderieDepot.update({
    where: { id: depotId },
    data: { statut, ...(action === 'distribuer' ? { dateDistribution: new Date() } : {}) },
  });
  return { depotId, statut };
}

export async function deposerBuanderieCore(ctx: Ctx, input: { eleveId?: string; chambreId?: string; articles: Array<{ type: string; quantite: number }> }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  if (!input.articles.length) throw new ActionError('Au moins un article.', 'CHAMP_MANQUANT');
  const d = await db.buanderieDepot.create({
    data: {
      ecoleId: ctx.ecoleId!, eleveId: input.eleveId || null, chambreId: input.chambreId || null,
      dateDepot: new Date(), articles: JSON.stringify(input.articles), statut: 'depose',
    },
  });
  return { depotId: d.id };
}

// ── Cuisine centrale (intégrée à l'internat) ──

export async function enregistrerProductionCore(ctx: Ctx, input: { date: Date; service: string; effectifPrevu: number; effectifServi: number; notes?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  const p = await db.productionRepas.create({
    data: {
      ecoleId: ctx.ecoleId!, date: input.date, service: input.service,
      effectifPrevu: input.effectifPrevu, effectifServi: input.effectifServi, notes: input.notes?.trim() || null,
    },
  });
  return { productionId: p.id };
}

export async function enregistrerControleHaccpCore(ctx: Ctx, input: { date: Date; pointControle: string; valeur?: string; conforme: boolean; observation?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'INTERNAT');
  const c = await db.controleHaccp.create({
    data: {
      ecoleId: ctx.ecoleId!, date: input.date, pointControle: input.pointControle.trim(),
      valeur: input.valeur?.trim() || null, conforme: input.conforme,
      observation: input.observation?.trim() || null, prisParId: ctx.utilisateurId,
    },
  });
  if (!input.conforme) {
    await db.notification.create({
      data: {
        ecoleId: ctx.ecoleId!, destinataireType: 'personnel',
        destinataireId: ctx.utilisateurId, sujet: '⚠️ Contrôle HACCP non conforme',
        corps: `${input.pointControle} : valeur ${input.valeur || 'hors norme'} le ${input.date.toLocaleDateString('fr-FR')}. Action corrective requise.`,
        canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(),
      },
    }).catch(() => {});
  }
  return { controleId: c.id };
}

// ====================================================================
// LABORATOIRE
// =====================================================================

export async function creerLaboratoireCore(ctx: Ctx, input: { nom: string; type: string; responsableId?: string; capacite?: number }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'LABORATOIRE');
  const labo = await db.laboratoire.create({
    data: { ecoleId: ctx.ecoleId!, nom: input.nom.trim(), type: input.type, responsableId: input.responsableId || null, capacite: input.capacite ?? null },
  });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'labo.cree', 'laboratoire', labo.id, { nom: input.nom });
  return { laboratoireId: labo.id };
}

export async function ajouterEquipementLaboCore(ctx: Ctx, input: { laboratoireId: string; nom: string; reference?: string; quantite: number; etat?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'LABORATOIRE');
  const labo = await db.laboratoire.findUnique({ where: { id: input.laboratoireId } });
  if (!labo) throw new ActionError('Laboratoire introuvable.', 'INTROUVABLE');
  assertTenant(labo.ecoleId, ctx, 'Ce laboratoire');
  const eq = await db.equipementLabo.create({
    data: { laboratoireId: labo.id, nom: input.nom.trim(), reference: input.reference?.trim() || null, quantite: input.quantite, etat: input.etat || 'bon', dateDernierControle: new Date() },
  });
  return { equipementId: eq.id };
}

export async function mouvementConsommableCore(ctx: Ctx, input: { consommableId: string; delta: number }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'LABORATOIRE');
  const c = await db.consommableLabo.findUnique({ where: { id: input.consommableId }, include: { laboratoire: true } });
  if (!c) throw new ActionError('Consommable introuvable.', 'INTROUVABLE');
  assertTenant(c.laboratoire.ecoleId, ctx, 'Ce consommable');
  if (c.quantite + input.delta < 0) throw new ActionError('Stock insuffisant.', 'STOCK_INSUFFISANT');
  const maj = await db.consommableLabo.update({ where: { id: c.id }, data: { quantite: c.quantite + input.delta } });
  return { consommableId: c.id, quantite: maj.quantite, sousSeuil: maj.quantite <= maj.seuilAlerte };
}

export async function reserverLaboCore(ctx: Ctx, input: { laboratoireId: string; date: Date; heureDebut: string; heureFin: string; experience: string; classeId?: string; enseignantId?: string; matiere?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'LABORATOIRE');
  const labo = await db.laboratoire.findUnique({ where: { id: input.laboratoireId } });
  if (!labo) throw new ActionError('Laboratoire introuvable.', 'INTROUVABLE');
  assertTenant(labo.ecoleId, ctx, 'Ce laboratoire');
  const existantes = await db.reservationLabo.findMany({ where: { laboratoireId: labo.id, date: input.date, statut: 'confirmee' } });
  if (existantes.some((r) => tranchesSeChevauchent(input.heureDebut, input.heureFin, r.heureDebut, r.heureFin))) {
    throw new ActionError('Ce laboratoire est déjà réservé sur ce créneau.', 'CRENEAU_PRIS');
  }
  const r = await db.reservationLabo.create({
    data: {
      ecoleId: ctx.ecoleId!, laboratoireId: labo.id, date: input.date,
      heureDebut: input.heureDebut, heureFin: input.heureFin, experience: input.experience.trim(),
      classeId: input.classeId || null, enseignantId: input.enseignantId || null, matiere: input.matiere?.trim() || null,
    },
  });
  return { reservationId: r.id };
}

// ====================================================================
// BOUTIQUE (uniformes & fournitures) — encaissement intégré aux finances
// =====================================================================

export async function creerProduitBoutiqueCore(ctx: Ctx, input: { categorie: string; nom: string; taille?: string; couleur?: string; prix: number; stock: number; seuilAlerte?: number }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'BOUTIQUE');
  const p = await db.boutiqueProduit.create({
    data: {
      ecoleId: ctx.ecoleId!, categorie: input.categorie, nom: input.nom.trim(),
      taille: input.taille?.trim() || null, couleur: input.couleur?.trim() || null,
      prixUnitaire: Math.round(input.prix * 100), stock: input.stock, seuilAlerte: input.seuilAlerte ?? 3,
    },
  });
  return { produitId: p.id };
}

export async function encaisserVenteCore(ctx: Ctx, input: { produitId: string; quantite: number; modePaiement: string; eleveId?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'BOUTIQUE');
  if (input.quantite < 1) throw new ActionError('Quantité invalide.', 'CHAMP_INVALIDE');
  return db.$transaction(async (tx) => {
    const produit = await tx.boutiqueProduit.findUnique({ where: { id: input.produitId } });
    if (!produit) throw new ActionError('Produit introuvable.', 'INTROUVABLE');
    assertTenant(produit.ecoleId, ctx, 'Ce produit');
    if (!produit.actif) throw new ActionError('Produit retiré de la vente.', 'INACTIF');
    if (produit.stock < input.quantite) throw new ActionError(`Stock insuffisant (${produit.stock} restant).`, 'STOCK_INSUFFISANT');
    const montantTotal = produit.prixUnitaire * input.quantite;

    // Vente
    const vente = await tx.boutiqueVente.create({
      data: {
        ecoleId: ctx.ecoleId!, produitId: produit.id, eleveId: input.eleveId || null,
        quantite: input.quantite, montantTotal, modePaiement: input.modePaiement,
        encaisseParId: ctx.utilisateurId, dateVente: new Date(),
      },
    });
    // Stock décrémenté (avec alerte si sous le seuil)
    const stockApres = produit.stock - input.quantite;
    await tx.boutiqueProduit.update({ where: { id: produit.id }, data: { stock: stockApres } });
    // Recette enregistrée dans les FINANCES (recettes boutique)
    let paiementId: string | null = null;
    if (input.eleveId) {
      const paiement = await tx.paiement.create({
        data: {
          ecoleId: ctx.ecoleId!, eleveId: input.eleveId, montant: montantTotal,
          devise: 'XOF', modePaiement: input.modePaiement,
          referenceTransaction: `BOUT-${vente.id.slice(-8).toUpperCase()}`,
          datePaiement: new Date(), encaisseParId: ctx.utilisateurId,
        },
      });
      paiementId = paiement.id;
      await tx.boutiqueVente.update({ where: { id: vente.id }, data: { paiementId } });
    }
    await logAction(tx, ctx.ecoleId, ctx.utilisateurId, 'boutique.vente', 'boutique_vente', vente.id, {
      produit: produit.nom, quantite: input.quantite, montant: montantTotal, eleveId: input.eleveId || null,
    });
    return { venteId: vente.id, montantTotal, stockApres, sousSeuil: stockApres <= produit.seuilAlerte, paiementId };
  });
}

// ====================================================================
// PARC INFORMATIQUE
// =====================================================================

export async function ajouterEquipementInfoCore(ctx: Ctx, input: { categorie: string; nom: string; marque?: string; modele?: string; numeroSerie?: string; salleId?: string; valeur?: number }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'PARC_INFO');
  const e = await db.equipementInfo.create({
    data: {
      ecoleId: ctx.ecoleId!, categorie: input.categorie, nom: input.nom.trim(),
      marque: input.marque?.trim() || null, modele: input.modele?.trim() || null,
      numeroSerie: input.numeroSerie?.trim() || null, salleId: input.salleId || null,
      valeur: input.valeur != null ? Math.round(input.valeur * 100) : null,
    },
  });
  return { equipementId: e.id };
}

export async function majEtatEquipementInfoCore(ctx: Ctx, equipementId: string, etat: string) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'PARC_INFO');
  const e = await db.equipementInfo.findUnique({ where: { id: equipementId } });
  if (!e) throw new ActionError('Équipement introuvable.', 'INTROUVABLE');
  assertTenant(e.ecoleId, ctx, 'Cet équipement');
  const enPret = await db.pretInfo.findFirst({ where: { equipementId, retourEffectif: null } });
  if (enPret && etat !== 'operationnel') throw new ActionError('Équipement actuellement en prêt : effectuez d\'abord le retour.', 'EN_PRET');
  await db.equipementInfo.update({ where: { id: equipementId }, data: { etat } });
  return { equipementId, etat };
}

export async function preterEquipementInfoCore(ctx: Ctx, input: { equipementId: string; emprunteParId: string; retourPrevu: Date; notes?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'PARC_INFO');
  return db.$transaction(async (tx) => {
    const e = await tx.equipementInfo.findUnique({ where: { id: input.equipementId } });
    if (!e) throw new ActionError('Équipement introuvable.', 'INTROUVABLE');
    assertTenant(e.ecoleId, ctx, 'Cet équipement');
    if (e.etat !== 'operationnel') throw new ActionError('Équipement non opérationnel.', 'ETAT_INVALIDE');
    const enPret = await tx.pretInfo.findFirst({ where: { equipementId: e.id, retourEffectif: null } });
    if (enPret) throw new ActionError('Équipement déjà prêté.', 'DEJA_EXISTANT');
    const pret = await tx.pretInfo.create({
      data: {
        ecoleId: ctx.ecoleId!, equipementId: e.id, emprunteParId: input.emprunteParId,
        datePret: new Date(), retourPrevu: input.retourPrevu, notes: input.notes?.trim() || null,
      },
    });
    return { pretId: pret.id };
  });
}

export async function retournerEquipementInfoCore(ctx: Ctx, pretId: string, etatRetour: string) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'PARC_INFO');
  const pret = await db.pretInfo.findUnique({ where: { id: pretId } });
  if (!pret) throw new ActionError('Prêt introuvable.', 'INTROUVABLE');
  assertTenant(pret.ecoleId, ctx, 'Ce prêt');
  if (pret.retourEffectif) throw new ActionError('Prêt déjà clôturé.', 'DEJA_TRAITE');
  await db.$transaction(async (tx) => {
    await tx.pretInfo.update({ where: { id: pretId }, data: { retourEffectif: new Date(), etatRetour } });
    await tx.equipementInfo.update({ where: { id: pret.equipementId }, data: { etat: etatRetour === 'hs' ? 'panne' : 'operationnel' } });
  });
  return { pretId, cloture: true };
}

// ====================================================================
// INSTALLATIONS SPORTIVES
// =====================================================================

export async function creerInstallationCore(ctx: Ctx, input: { nom: string; type: string; surface?: string; capacite?: number; eclairage?: boolean }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'SPORT');
  const inst = await db.installationSportive.create({
    data: {
      ecoleId: ctx.ecoleId!, nom: input.nom.trim(), type: input.type,
      surface: input.surface?.trim() || null, capacite: input.capacite ?? null,
      eclairage: input.eclairage ?? false,
    },
  });
  return { installationId: inst.id };
}

export async function occuperInstallationCore(ctx: Ctx, input: { installationId: string; date: Date; heureDebut: string; heureFin: string; titre: string; parQui?: string; classeId?: string; encadrantId?: string }) {
  assertPermission(ctx, 'services.gerer');
  await exigerFlag(ctx, 'SPORT');
  const inst = await db.installationSportive.findUnique({ where: { id: input.installationId } });
  if (!inst) throw new ActionError('Installation introuvable.', 'INTROUVABLE');
  assertTenant(inst.ecoleId, ctx, 'Cette installation');
  const existantes = await db.occupationSport.findMany({ where: { installationId: inst.id, date: input.date, statut: 'confirmee' } });
  if (existantes.some((o) => tranchesSeChevauchent(input.heureDebut, input.heureFin, o.heureDebut, o.heureFin))) {
    throw new ActionError('Installation déjà occupée sur ce créneau.', 'CRENEAU_PRIS');
  }
  const o = await db.occupationSport.create({
    data: {
      ecoleId: ctx.ecoleId!, installationId: inst.id, date: input.date,
      heureDebut: input.heureDebut, heureFin: input.heureFin, titre: input.titre.trim(),
      parQui: input.parQui || 'classe', classeId: input.classeId || null, encadrantId: input.encadrantId || null,
    },
  });
  return { occupationId: o.id };
}
