'use server';

// ====================================================================
// ACTIONS COMPTABILITÉ — sections, plan, caisse, achats, états.
// ====================================================================

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionError } from '@/lib/business';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { avecRetryBdd } from '@/lib/retry-bdd';
import {
  configurerSectionsCore, listerSectionsCore, initialiserPlanComptableCore,
  ouvrirCaisseCore, operationCaisseCore, fermerCaisseCore,
  creerCommandeCore, changerStatutCommandeCore, enregistrerReceptionCore,
  enregistrerFactureFournisseurCore, payerFournisseurCore,
  balanceComptableCore, grandLivreCore, compteResultatCore, bilanSimplifieCore,
  balanceAgeeClientsCore, balanceAgeeFournisseursCore, etatCaisseCore,
} from '@/lib/business';

type Ok = { ok: true; [k: string]: unknown };
type Err = { ok: false; error: string };
export type ActionResult = Ok | Err;

function echec(e: unknown): Err {
  if (e instanceof ActionError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) return { ok: false, error: `Champ invalide : ${e.issues[0]?.path.join('.')} — ${e.issues[0]?.message ?? ''}` };
  console.error('[actions-compta]', e);
  return { ok: false, error: 'Une erreur inattendue est survenue.' };
}

async function ctxSession() {
  const s = await requireSession();
  return { ctx: { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions }, session: s };
}

/** Données complètes du module Comptabilité. */
export async function lireComptabilite(): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const eid = ctx.ecoleId!;
    const [sections, plan, comptesCount, sessionCaisse, fournisseurs, commandes, factures, ageeC, ageeF, caisse] = await avecRetryBdd(() => Promise.all([
      listerSectionsCore(ctx),
      db.compteComptable.findMany({ where: { ecoleId: eid }, orderBy: { numero: 'asc' } }),
      db.compteComptable.count({ where: { ecoleId: eid } }),
      db.caisseSession.findFirst({ where: { ecoleId: eid, statut: 'ouverte' }, include: { operations: { orderBy: { dateOperation: 'asc' } } } }),
      db.fournisseur.findMany({ where: { ecoleId: eid }, orderBy: { nom: 'asc' } }),
      db.commandeFournisseur.findMany({ where: { ecoleId: eid }, include: { fournisseur: true, lignes: true, receptions: true }, orderBy: { dateCommande: 'desc' }, take: 60 }),
      db.factureFournisseur.findMany({ where: { ecoleId: eid }, include: { fournisseur: true, paiements: true, commande: true }, orderBy: { dateEmission: 'desc' }, take: 80 }),
      balanceAgeeClientsCore(ctx),
      balanceAgeeFournisseursCore(ctx),
      etatCaisseCore(ctx),
    ]), 3, 600);
    return { ok: true, sections, plan, planInitialise: comptesCount > 0, sessionCaisse, fournisseurs, commandes, factures, ageeClients: ageeC, ageeFournisseurs: ageeF, caisse };
  } catch (e) { return echec(e); }
}

export async function configurerSections(separees: boolean): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const r = await configurerSectionsCore(ctx, separees);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function initialiserPlanComptable(): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const r = await initialiserPlanComptableCore(ctx);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ── Caisse ──
export async function ouvrirCaisse(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({ fondCaisse: z.coerce.number().min(0), sectionComptableId: z.string().optional() }).parse(Object.fromEntries(formData));
    const r = await ouvrirCaisseCore(ctx, { fondCaisse: d.fondCaisse, sectionComptableId: d.sectionComptableId || null });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function operationCaisse(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({ sessionCaisseId: z.string(), type: z.enum(['entree', 'sortie']), montant: z.coerce.number().positive(), motif: z.string().min(3), reference: z.string().optional() }).parse(Object.fromEntries(formData));
    const r = await operationCaisseCore(ctx, d);
    revalidatePath('/');
    return { ok: true, resultat: r };
  } catch (e) { return echec(e); }
}

export async function fermerCaisse(sessionCaisseId: string, soldeCompte: number): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const r = await fermerCaisseCore(ctx, sessionCaisseId, soldeCompte);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ── Achats ──
export async function creerCommandeFournisseur(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      fournisseurId: z.string().min(1), sectionComptableId: z.string().optional(),
      lignes: z.string().min(3), // "designation | quantite | prixUnitaire" par ligne
    }).parse(Object.fromEntries(formData));
    const lignes = d.lignes.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [designation, quantite, prix] = l.split('|').map((x) => (x ?? '').trim());
      return { designation, quantite: Number(quantite || 1), prixUnitaire: Number(prix || 0) };
    }).filter((l) => l.designation && l.prixUnitaire > 0);
    const r = await creerCommandeCore(ctx, { fournisseurId: d.fournisseurId, sectionComptableId: d.sectionComptableId || null, lignes });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function envoyerCommande(commandeId: string): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    await changerStatutCommandeCore(ctx, commandeId, 'envoyee');
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function receptionnerCommande(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({ commandeId: z.string(), lignes: z.string().min(1), controleQualite: z.enum(['conforme', 'reserve', 'refuse']).optional(), commentaire: z.string().optional() })
      .parse(Object.fromEntries(formData));
    const quantiteParLigne = d.lignes.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [ligneId, quantite] = l.split('|').map((x) => (x ?? '').trim());
      return { ligneId, quantite: Number(quantite || 0) };
    }).filter((q) => q.ligneId && q.quantite > 0);
    const r = await enregistrerReceptionCore(ctx, { commandeId: d.commandeId, quantiteParLigne, controleQualite: d.controleQualite, commentaire: d.commentaire });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function enregistrerFacture(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      fournisseurId: z.string().min(1), commandeId: z.string().optional(),
      numero: z.string().min(1), dateEmission: z.coerce.date(), dateEcheance: z.coerce.date().optional(),
      montantHT: z.coerce.number().positive(), montantTVA: z.coerce.number().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await enregistrerFactureFournisseurCore(ctx, { ...d, commandeId: d.commandeId || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function payerFacture(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({ factureId: z.string().min(1), montant: z.coerce.number().positive(), mode: z.string().min(2), reference: z.string().optional() }).parse(Object.fromEntries(formData));
    const r = await payerFournisseurCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ── Rapports ──
export async function rapportComptable(type: 'balance' | 'resultat' | 'bilan', section: string): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const s = section === 'toutes' ? 'toutes' as never : section === 'global' ? null : section;
    const r = type === 'balance' ? await balanceComptableCore(ctx, s) : type === 'resultat' ? await compteResultatCore(ctx, s) : await bilanSimplifieCore(ctx, s);
    return { ok: true, type, ...r };
  } catch (e) { return echec(e); }
}

export async function grandLivre(numeroCompte: string): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const r = await grandLivreCore(ctx, numeroCompte);
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}
