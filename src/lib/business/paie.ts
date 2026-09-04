// ====================================================================
// MÉTIER PAIE (B1) — génération mensuelle des bulletins
// Génération : salaire de base (Personnel.salaireBrut) + primes
// récurrentes (ConfigurationPaie) + variables du mois (VariablePaie) ;
// cotisations calculées aux taux configurés ; workflow brouillon→valide→payé.
// --------------------------------------------------------------------
// MÉTIER COMPTABILITÉ (B2) — écritures en partie double équilibrées +
// génération automatique depuis les flux validés (encaissements, dépenses).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, avecVerrou } from './commun';

// --------------------------------------------------------------------
// B1 — PAIE
// --------------------------------------------------------------------

export async function majConfigurationPaieCore(ctx: Ctx, ecoleId: string, input: { tauxEmployeur: number; tauxSalarie: number; primesRecurrentes?: Array<{ libelle: string; montant: number }> }) {
  assertPermission(ctx, 'rh.gerer');
  if (input.tauxEmployeur < 0 || input.tauxEmployeur > 1 || input.tauxSalarie < 0 || input.tauxSalarie > 1) {
    throw new ActionError('Les taux de cotisation doivent être compris entre 0 et 1.', 'CHAMP_INVALIDE');
  }
  await db.configurationPaie.upsert({
    where: { ecoleId },
    create: { ecoleId, tauxEmployeur: input.tauxEmployeur, tauxSalarie: input.tauxSalarie, primesRecurrentes: JSON.stringify(input.primesRecurrentes ?? []), majParId: ctx.utilisateurId },
    update: { tauxEmployeur: input.tauxEmployeur, tauxSalarie: input.tauxSalarie, primesRecurrentes: JSON.stringify(input.primesRecurrentes ?? []), majParId: ctx.utilisateurId },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'paie.configuration_maj', 'configuration_paie', ecoleId);
  return { ok: true };
}

export type ResultatGenerationPaie = { periode: string; bulletins: number; totalNet: number; sautes: number };

export async function genererBulletinsPaieCore(ctx: Ctx, ecoleId: string, periode: string): Promise<ResultatGenerationPaie> {
  assertPermission(ctx, 'rh.gerer');
  if (!/^\d{4}-\d{2}$/.test(periode)) throw new ActionError('Période invalide (format AAAA-MM).', 'CHAMP_INVALIDE');
  const config = await db.configurationPaie.findUnique({ where: { ecoleId } });
  const tauxE = config?.tauxEmployeur ?? 0.084;
  const tauxS = config?.tauxSalarie ?? 0.0524;
  const primesRécurrentes: Array<{ libelle: string; montant: number }> = JSON.parse(config?.primesRecurrentes || '[]');
  const devise = (await db.ecole.findUnique({ where: { id: ecoleId } }))?.devise ?? 'XOF';

  const personnels = await db.personnel.findMany({ where: { ecoleId, statut: 'actif', deletedAt: null, salaireBrut: { not: null } } });
  let bulletins = 0, sautes = 0, totalNet = 0;

  await avecVerrou('paie:gen', () => db.$transaction(async (tx) => {
    for (const p of personnels) {
      const existant = await tx.bulletinPaie.findUnique({ where: { personnelId_periode: { personnelId: p.id, periode } } });
      if (existant) { sautes++; continue; }

      const base = p.salaireBrut!;
      const variables = await tx.variablePaie.findMany({ where: { ecoleId, personnelId: p.id, periode, bulletinPaieId: null } });
      const lignes: Array<{ type: string; libelle: string; montant: number; sens: string; quantite?: number; taux?: number }> = [
        { type: 'salaire_base', libelle: `Salaire de base`, montant: base, sens: 'plus' },
      ];
      for (const pr of primesRécurrentes) lignes.push({ type: 'prime', libelle: pr.libelle, montant: pr.montant, sens: 'plus' });
      for (const v of variables) lignes.push({ type: v.type === 'heure_sup' ? 'heures_sup' : v.type, libelle: v.libelle, montant: v.montant, sens: 'plus' });

      const brut = lignes.reduce((s, l) => s + (l.sens === 'plus' ? l.montant : -l.montant), 0);
      const partEmployeur = Math.round(brut * tauxE);
      const partSalarie = Math.round(brut * tauxS);
      const primes = lignes.filter((l) => l.type === 'prime' || l.type === 'indemnite' || l.type === 'heures_sup' || l.type === 'avantage_nature').reduce((s, l) => s + l.montant, 0);
      const net = brut - partSalarie;

      const bulletin = await tx.bulletinPaie.create({
        data: {
          ecoleId, personnelId: p.id, periode,
          salaireBrut: brut, salaireNet: brut - partSalarie,
          cotisationsTotales: partEmployeur + partSalarie,
          retenuesTotales: partSalarie, primesTotales: primes, netAPayer: net,
          devise, statut: 'brouillon',
        },
      });
      for (const l of lignes) {
        await tx.ligneBulletinPaie.create({ data: { bulletinId: bulletin.id, type: l.type, libelle: l.libelle, montant: l.montant, sens: l.sens } });
      }
      await tx.cotisationSociale.create({
        data: { bulletinId: bulletin.id, libelle: 'Cotisations sociales (IPM/RC)', assiette: brut, tauxEmployeur: tauxE, tauxSalarie: tauxS, partEmployeur, partSalarie },
      });
      // Rattachement des variables au bulletin généré
      for (const v of variables) await tx.variablePaie.update({ where: { id: v.id }, data: { bulletinPaieId: bulletin.id } });
      bulletins++; totalNet += net;
    }
    await logAction(tx, ecoleId, ctx.utilisateurId, 'paie.generation', 'bulletin_paie', undefined, { periode, bulletins, sautes });
  }, { timeout: 60000, maxWait: 10000 }));

  return { periode, bulletins, sautes, totalNet };
}

export async function traiterBulletinPaieCore(ctx: Ctx, bulletinId: string, decision: 'valide' | 'paye') {
  assertPermission(ctx, 'rh.gerer');
  const b = await db.bulletinPaie.findUnique({ where: { id: bulletinId } });
  if (!b) throw new ActionError('Bulletin de paie introuvable.', 'INTROUVABLE');
  assertTenant(b.ecoleId, ctx, 'Ce bulletin');
  if (b.statut === 'paye') throw new ActionError('Bulletin déjà payé.', 'DEJA_TRAITE');
  if (decision === 'paye' && b.statut !== 'valide') {
    throw new ActionError('Le bulletin doit d\'abord être validé.', 'STATUT_INVALIDE');
  }
  await db.bulletinPaie.update({
    where: { id: bulletinId },
    data: decision === 'valide'
      ? { statut: 'valide', dateValidation: new Date(), valideParId: ctx.utilisateurId }
      : { statut: 'paye', datePaiement: new Date() },
  });
  await logAction(db, b.ecoleId, ctx.utilisateurId, `paie.${decision}`, 'bulletin_paie', bulletinId);
  return { bulletinId, statut: decision };
}

/** Ajoute une variable de paie (prime, heure sup) pour un personnel et une période. */
export async function ajouterVariablePaieCore(ctx: Ctx, ecoleId: string, input: { personnelId: string; periode: string; type: string; libelle: string; montant: number }) {
  assertPermission(ctx, 'rh.gerer');
  if (!/^\d{4}-\d{2}$/.test(input.periode)) throw new ActionError('Période invalide (AAAA-MM).', 'CHAMP_INVALIDE');
  if (!['prime', 'indemnite', 'avantage', 'heure_sup'].includes(input.type)) throw new ActionError('Type de variable invalide.', 'CHAMP_INVALIDE');
  if (!Number.isInteger(input.montant) || input.montant <= 0) throw new ActionError('Montant invalide (centimes).', 'MONTANT_INVALIDE');
  const p = await db.personnel.findUnique({ where: { id: input.personnelId } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  const v = await db.variablePaie.create({
    data: { ecoleId, personnelId: input.personnelId, periode: input.periode, type: input.type, libelle: input.libelle, montant: input.montant, attribueParId: ctx.utilisateurId },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'paie.variable_ajoutee', 'variable_paie', v.id, { personnelId: input.personnelId, periode: input.periode });
  return { variableId: v.id };
}

// --------------------------------------------------------------------
// B2 — COMPTABILITÉ EN PARTIE DOUBLE
// --------------------------------------------------------------------

export type LigneEcritureInput = { compteId: string; libelle: string; debit: number; credit: number };

export async function creerEcritureCore(ctx: Ctx, ecoleId: string, input: { journalId: string; libelle: string; date: Date; lignes: LigneEcritureInput[]; numeroPiece?: string }) {
  assertPermission(ctx, 'finances.ecrire');
  if (input.lignes.length < 2) throw new ActionError('Une écriture nécessite au moins deux lignes.', 'SAISIE_VIDE');
  const totalD = input.lignes.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalC = input.lignes.reduce((s, l) => s + (l.credit ?? 0), 0);
  // INVARIANT DE LA PARTIE DOUBLE : débit total === crédit total
  if (totalD !== totalC) {
    throw new ActionError(`Écriture déséquilibrée : débit ${totalD} ≠ crédit ${totalC} (écart ${Math.abs(totalD - totalC)} centimes).`, 'ECRITURE_DESEQUILIBREE');
  }
  if (totalD === 0) throw new ActionError('Écriture à zéro refusée.', 'SAISIE_VIDE');
  const journal = await db.journalComptable.findUnique({ where: { id: input.journalId } });
  if (!journal) throw new ActionError('Journal introuvable.', 'INTROUVABLE');
  assertTenant(journal.ecoleId, ctx, 'Ce journal');
  for (const l of input.lignes) {
    const compte = await db.compteComptable.findUnique({ where: { id: l.compteId } });
    if (!compte) throw new ActionError('Compte comptable introuvable.', 'INTROUVABLE');
    assertTenant(compte.ecoleId, ctx, 'Ce compte');
    if ((l.debit ?? 0) < 0 || (l.credit ?? 0) < 0) throw new ActionError('Montants négatifs interdits.', 'MONTANT_INVALIDE');
  }

  const numero = input.numeroPiece?.trim() || `OD-${Date.now().toString(36).toUpperCase()}`;
  const ecriture = await db.ecritureComptable.create({
    data: {
      ecoleId, journalId: input.journalId, date: input.date, libelle: input.libelle, numeroPiece: numero, statut: 'brouillon',
      lignes: { create: input.lignes.map((l) => ({ compteId: l.compteId, libelle: l.libelle, debit: l.debit ?? 0, credit: l.credit ?? 0 })) },
    },
    include: { lignes: true },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'compta.ecriture_creation', 'ecriture_comptable', ecriture.id, { numero, total: totalD });
  return { ecritureId: ecriture.id, numero };
}

export async function validerEcritureCore(ctx: Ctx, ecritureId: string) {
  assertPermission(ctx, 'finances.valider');
  const e = await db.ecritureComptable.findUnique({ where: { id: ecritureId }, include: { lignes: true } });
  if (!e) throw new ActionError('Écriture introuvable.', 'INTROUVABLE');
  assertTenant(e.ecoleId, ctx, 'Cette écriture');
  if (e.statut !== 'brouillon') throw new ActionError('Écriture déjà traitée.', 'DEJA_TRAITE');
  const d = e.lignes.reduce((s, l) => s + l.debit, 0);
  const c = e.lignes.reduce((s, l) => s + l.credit, 0);
  if (d !== c) throw new ActionError('Écriture déséquilibrée : validation impossible.', 'ECRITURE_DESEQUILIBREE');

  await db.$transaction(async (tx) => {
    await tx.ecritureComptable.update({ where: { id: ecritureId }, data: { statut: 'valide', valideParId: ctx.utilisateurId, dateValidation: new Date() } });
    // Application aux soldes des comptes
    for (const l of e.lignes) {
      await tx.compteComptable.update({ where: { id: l.compteId }, data: { solde: { increment: l.debit - l.credit } } });
    }
  });
  await logAction(db, e.ecoleId, ctx.utilisateurId, 'compta.ecriture_validation', 'ecriture_comptable', ecritureId);
  return { ecritureId };
}

/**
 * Génération AUTOMATIQUE des écritures du mois : chaque paiement non annulé et
 * chaque dépense validée qui n'ont pas encore d'écriture en produisent une
 * (banque au débit / recettes scolarité au crédit — et symétrique pour les dépenses).
 */
export async function genererEcrituresAutomatiquesCore(ctx: Ctx, ecoleId: string) {
  assertPermission(ctx, 'finances.valider');
  const comptes = await db.compteComptable.findMany({ where: { ecoleId } });
  const parNumero = new Map(comptes.map((c) => [c.numero, c]));
  const banque = parNumero.get('512') ?? comptes[0];
  const recettes = parNumero.get('411') ?? parNumero.get('707') ?? banque;
  const achats = parNumero.get('607') ?? banque;
  if (!banque) throw new ActionError('Plan comptable vide : créez au moins un compte 512 (Banque).', 'PLAN_VIDE');
  const journal = await db.journalComptable.findFirst({ where: { ecoleId, code: 'VE' } }) ??
    await db.journalComptable.findFirst({ where: { ecoleId } });
  if (!journal) throw new ActionError('Aucun journal comptable.', 'PLAN_VIDE');
  const journalACH = (await db.journalComptable.findFirst({ where: { ecoleId, code: 'ACH' } })) ?? journal;

  let créées = 0;
  await avecVerrou('compta:auto', () => db.$transaction(async (tx) => {
    // 1) Encaissements sans écriture (marquage via libellère du numeroPiece)
    const paiements = await tx.paiement.findMany({ where: { ecoleId, annule: false } });
    const numerosExistants = new Set((await tx.ecritureComptable.findMany({ where: { ecoleId }, select: { numeroPiece: true } })).map((e) => e.numeroPiece));
    for (const p of paiements) {
      const numero = `ENC-${p.id.slice(-10)}`;
      if (numerosExistants.has(numero)) continue;
      await tx.ecritureComptable.create({
        data: {
          ecoleId, journalId: journal.id, date: p.datePaiement, numeroPiece: numero,
          libelle: `Encaissement ${p.referenceTransaction ?? p.id}`,
          statut: 'valide', valideParId: ctx.utilisateurId, dateValidation: new Date(),
          lignes: {
            create: [
              { compteId: banque.id, libelle: 'Banque', debit: p.montant, credit: 0 },
              { compteId: recettes.id, libelle: 'Recettes scolarité', debit: 0, credit: p.montant },
            ],
          },
        },
      });
      await tx.compteComptable.update({ where: { id: banque.id }, data: { solde: { increment: p.montant } } });
      await tx.compteComptable.update({ where: { id: recettes.id }, data: { solde: { increment: -p.montant } } });
      créées++;
    }
    // 2) Dépenses validées sans écriture
    const depenses = await tx.depense.findMany({ where: { ecoleId, validee: true, annulee: false } });
    for (const d of depenses) {
      const numero = `DEP-${d.id.slice(-10)}`;
      if (numerosExistants.has(numero)) continue;
      await tx.ecritureComptable.create({
        data: {
          ecoleId, journalId: journalACH.id, date: d.dateDepense, numeroPiece: numero,
          libelle: `Dépense : ${d.description.slice(0, 80)}`,
          statut: 'valide', valideParId: ctx.utilisateurId, dateValidation: new Date(),
          lignes: {
            create: [
              { compteId: achats.id, libelle: d.categorie.slice(0, 80), debit: d.montant, credit: 0 },
              { compteId: banque.id, libelle: 'Banque', debit: 0, credit: d.montant },
            ],
          },
        },
      });
      await tx.compteComptable.update({ where: { id: achats.id }, data: { solde: { increment: d.montant } } });
      await tx.compteComptable.update({ where: { id: banque.id }, data: { solde: { increment: -d.montant } } });
      créées++;
    }
    await logAction(tx, ecoleId, ctx.utilisateurId, 'compta.generation_auto', 'ecriture_comptable', undefined, { créées });
  }, { timeout: 60000, maxWait: 10000 }));
  return { créées };
}

/** Création d'un compte comptable (plan comptable de l'école). */
export async function creerCompteComptableCore(ctx: Ctx, ecoleId: string, input: { numero: string; libelle: string; type: string }) {
  assertPermission(ctx, 'finances.ecrire');
  if (!/^\d{3,6}$/.test(input.numero)) throw new ActionError('Numéro de compte invalide (3 à 6 chiffres).', 'CHAMP_INVALIDE');
  if (!['actif', 'passif', 'produit', 'charge'].includes(input.type)) throw new ActionError('Type invalide.', 'CHAMP_INVALIDE');
  const existant = await db.compteComptable.findFirst({ where: { ecoleId, numero: input.numero } });
  if (existant) throw new ActionError('Ce numéro de compte existe déjà.', 'DEJA_EXISTANT');
  const c = await db.compteComptable.create({
    data: { ecoleId, numero: input.numero, libelle: input.libelle, type: input.type, devise: (await db.ecole.findUnique({ where: { id: ecoleId } }))?.devise ?? 'XOF' },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'compta.compte_creation', 'compte_comptable', c.id, { numero: input.numero });
  return { compteId: c.id };
}
