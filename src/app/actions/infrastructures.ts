'use server';

// ====================================================================
// ACTIONS INFRASTRUCTURES — internat, laboratoire, boutique, parc info,
// sport. Toutes protégées (session + services.gerer) et flag-checked.
// ====================================================================

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { ActionError } from '@/lib/business';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { avecRetryBdd } from '@/lib/retry-bdd';
import {
  FLAGS_INFRA, lireFlagsInfra, majFlagInfraCore,
  creerChambreCore, inscrireInternatCore, libererPlaceInternatCore, tauxOccupationInternatCore,
  demanderPermissionInternatCore, traiterPermissionInternatCore, declarerIncidentInternatCore,
  deposerBuanderieCore, gererBuanderieCore, enregistrerProductionCore, enregistrerControleHaccpCore,
  creerLaboratoireCore, ajouterEquipementLaboCore, mouvementConsommableCore, reserverLaboCore,
  creerProduitBoutiqueCore, encaisserVenteCore,
  ajouterEquipementInfoCore, majEtatEquipementInfoCore, preterEquipementInfoCore, retournerEquipementInfoCore,
  creerInstallationCore, occuperInstallationCore,
} from '@/lib/business';

type Ok = { ok: true; [k: string]: unknown };
type Err = { ok: false; error: string };
export type ActionResult = Ok | Err;

function echec(e: unknown): Err {
  if (e instanceof ActionError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) {
    const premier = e.issues[0];
    return { ok: false, error: `Champ invalide : ${premier?.path.join('.')} — ${premier?.message ?? ''}` };
  }
  console.error('[actions-infrastructures]', e);
  return { ok: false, error: 'Une erreur inattendue est survenue.' };
}

async function ctxSession() {
  const s = await requireSession();
  return {
    ctx: { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions },
    session: s,
  };
}

// --------------------------------------------------------------------
// Activation des options + données du module
// --------------------------------------------------------------------

export async function lireInfrastructures(): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    if (!ctx.ecoleId) return { ok: false, error: 'Aucune école associée.' };
    const eid = ctx.ecoleId;
    const flags = await avecRetryBdd(() => lireFlagsInfra(eid), 3, 400);
    const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
    const dans7j = new Date(aujourdhui.getTime() + 7 * 86400000);

    const [chambres, inscriptions, permissions, incidents, buanderie, productions, controlesHaccp,
      laboratoires, reservationsLabo, produits, ventesJour, equipementsInfo, pretsActifs,
      installations, occupations] = await avecRetryBdd(() => Promise.all([
      // internat
      db.chambreInternat.findMany({ where: { ecoleId: eid, actif: true }, include: { lits: true }, orderBy: { nom: 'asc' } }),
      db.inscriptionInternat.findMany({ where: { ecoleId: eid, statut: 'actif' }, take: 200 }),
      db.permissionInternat.findMany({ where: { ecoleId: eid, statut: { in: ['demande', 'approuvee'] } }, orderBy: { dateDepart: 'asc' }, take: 100 }),
      db.incidentInternat.findMany({ where: { ecoleId: eid }, orderBy: { dateHeure: 'desc' }, take: 50 }),
      db.buanderieDepot.findMany({ where: { ecoleId: eid, statut: { not: 'distribue' } }, orderBy: { dateDepot: 'desc' }, take: 60 }),
      db.productionRepas.findMany({ where: { ecoleId: eid, date: { gte: aujourdhui } }, orderBy: { date: 'desc' }, take: 30 }),
      db.controleHaccp.findMany({ where: { ecoleId: eid }, orderBy: { date: 'desc' }, take: 50 }),
      // labo
      db.laboratoire.findMany({ where: { ecoleId: eid, actif: true }, include: { equipements: true, consommables: true }, orderBy: { nom: 'asc' } }),
      db.reservationLabo.findMany({ where: { ecoleId: eid, date: { gte: aujourdhui, lte: dans7j } }, orderBy: { date: 'asc' }, take: 80 }),
      // boutique
      db.boutiqueProduit.findMany({ where: { ecoleId: eid }, orderBy: [{ categorie: 'asc' }, { nom: 'asc' }], take: 200 }),
      db.boutiqueVente.findMany({ where: { ecoleId: eid, dateVente: { gte: aujourdhui } }, orderBy: { dateVente: 'desc' }, take: 60 }),
      // parc info
      db.equipementInfo.findMany({ where: { ecoleId: eid }, orderBy: { categorie: 'asc' }, take: 300 }),
      db.pretInfo.findMany({ where: { ecoleId: eid, retourEffectif: null }, take: 100 }),
      // sport
      db.installationSportive.findMany({ where: { ecoleId: eid, actif: true }, orderBy: { nom: 'asc' } }),
      db.occupationSport.findMany({ where: { ecoleId: eid, date: { gte: aujourdhui, lte: dans7j } }, orderBy: { date: 'asc' }, take: 100 }),
    ]), 3, 500);

    // Enrichissement : noms d'élèves (relations scalaires volontaires)
    const idsEleves = new Set<string>();
    for (const i of inscriptions as any[]) idsEleves.add(i.eleveId);
    for (const p of permissions as any[]) idsEleves.add(p.eleveId);
    const elevesConcernes = idsEleves.size ? await avecRetryBdd(() => db.eleve.findMany({ where: { id: { in: [...idsEleves] } }, select: { id: true, prenom: true, nom: true } }), 3, 400) : [];
    const eleveParId = new Map(elevesConcernes.map((e: any) => [e.id, e]));
    for (const i of inscriptions as any[]) i.eleve = eleveParId.get(i.eleveId) ?? null;
    for (const p of permissions as any[]) p.eleve = eleveParId.get(p.eleveId) ?? null;

    return {
      ok: true, flags,
      chambres, inscriptions, permissions, incidents, buanderie, productions, controlesHaccp,
      laboratoires, reservationsLabo, produits, ventesJour, equipementsInfo, pretsActifs,
      installations, occupations,
    };
  } catch (e) { return echec(e); }
}

export async function majFlagInfrastructure(code: string, actif: boolean): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    if (!(FLAGS_INFRA as readonly string[]).includes(code)) return { ok: false, error: 'Option inconnue.' };
    await majFlagInfraCore(ctx, code as never, actif);
    revalidatePath('/');
    return { ok: true, code, actif };
  } catch (e) { return echec(e); }
}

// --------------------------------------------------------------------
// Internat
// --------------------------------------------------------------------

export async function creerChambre(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      nom: z.string().min(2), genre: z.enum(['M', 'F', 'mixte']),
      capacite: z.coerce.number().int().min(1).max(20),
      etage: z.string().optional(), surveillantId: z.string().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await creerChambreCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function inscrireInternat(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      eleveId: z.string().min(1), regime: z.enum(['interne', 'demi_pensionnaire']),
      tarifMensuel: z.coerce.number().min(0), chambreId: z.string().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await inscrireInternatCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function libererInternat(inscriptionId: string): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    await libererPlaceInternatCore(ctx, inscriptionId, new Date());
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function permissionInternat(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      eleveId: z.string().min(1), motif: z.string().min(3), destination: z.string().optional(),
      dateDepart: z.coerce.date(), dateRetourPrevue: z.coerce.date(),
    }).parse(Object.fromEntries(formData));
    const r = await demanderPermissionInternatCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function traiterPermission(permissionId: string, decision: 'approuvee' | 'refusee' | 'retour'): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const r = decision === 'retour'
      ? await traiterPermissionInternatCore(ctx, permissionId, 'approuvee', new Date())
      : await traiterPermissionInternatCore(ctx, permissionId, decision);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function incidentInternat(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      eleveId: z.string().optional(), chambreId: z.string().optional(),
      dateHeure: z.coerce.date(), gravite: z.enum(['leger', 'moyen', 'grave']),
      description: z.string().min(5), suites: z.string().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await declarerIncidentInternatCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function buanderie(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const action = String(formData.get('action') || 'deposer');
    if (action === 'deposer') {
      const d = z.object({
        eleveId: z.string().optional(), chambreId: z.string().optional(),
        type: z.string().min(2), quantite: z.coerce.number().int().min(1),
      }).parse(Object.fromEntries(formData));
      const r = await deposerBuanderieCore(ctx, { eleveId: d.eleveId, chambreId: d.chambreId, articles: [{ type: d.type, quantite: d.quantite }] });
      revalidatePath('/');
      return { ok: true, ...r };
    }
    const depotId = z.string().min(1).parse(formData.get('depotId'));
    const r = await gererBuanderieCore(ctx, depotId, action === 'laver' ? 'laver' : 'distribuer');
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function productionRepas(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      date: z.coerce.date(), service: z.enum(['petit_dejeuner', 'dejeuner', 'diner', 'collation']),
      effectifPrevu: z.coerce.number().int().min(0), effectifServi: z.coerce.number().int().min(0),
      notes: z.string().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await enregistrerProductionCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function controleHaccp(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      date: z.coerce.date(), pointControle: z.string().min(2), valeur: z.string().optional(),
      conforme: z.string().optional(), observation: z.string().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await enregistrerControleHaccpCore(ctx, { ...d, conforme: d.conforme === 'on' || d.conforme === 'true' });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// --------------------------------------------------------------------
// Laboratoire
// --------------------------------------------------------------------

export async function creerLabo(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({ nom: z.string().min(2), type: z.string().min(2), responsableId: z.string().optional(), capacite: z.coerce.number().int().optional() }).parse(Object.fromEntries(formData));
    const r = await creerLaboratoireCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function equipementLabo(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({ laboratoireId: z.string().min(1), nom: z.string().min(2), reference: z.string().optional(), quantite: z.coerce.number().int().min(1), etat: z.string().optional() }).parse(Object.fromEntries(formData));
    const r = await ajouterEquipementLaboCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function reserverLabo(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      laboratoireId: z.string().min(1), date: z.coerce.date(),
      heureDebut: z.string().regex(/^\d{2}:\d{2}$/), heureFin: z.string().regex(/^\d{2}:\d{2}$/),
      experience: z.string().min(3), classeId: z.string().optional(), enseignantId: z.string().optional(), matiere: z.string().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await reserverLaboCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function majConsommable(consommableId: string, delta: number): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const r = await mouvementConsommableCore(ctx, { consommableId, delta });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// --------------------------------------------------------------------
// Boutique
// --------------------------------------------------------------------

export async function creerProduit(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      categorie: z.enum(['uniforme', 'fourniture', 'autre']), nom: z.string().min(2),
      taille: z.string().optional(), couleur: z.string().optional(),
      prix: z.coerce.number().min(0), stock: z.coerce.number().int().min(0),
      seuilAlerte: z.coerce.number().int().min(0).optional(),
    }).parse(Object.fromEntries(formData));
    const r = await creerProduitBoutiqueCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function vendre(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      produitId: z.string().min(1), quantite: z.coerce.number().int().min(1),
      modePaiement: z.string().min(2), eleveId: z.string().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await encaisserVenteCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// --------------------------------------------------------------------
// Parc informatique
// --------------------------------------------------------------------

export async function ajouterInfo(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      categorie: z.string().min(2), nom: z.string().min(2), marque: z.string().optional(),
      modele: z.string().optional(), numeroSerie: z.string().optional(),
      salleId: z.string().optional(), valeur: z.coerce.number().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await ajouterEquipementInfoCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function majEtatInfo(equipementId: string, etat: string): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    await majEtatEquipementInfoCore(ctx, equipementId, etat);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function preterInfo(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({ equipementId: z.string().min(1), emprunteParId: z.string().min(1), retourPrevu: z.coerce.date(), notes: z.string().optional() }).parse(Object.fromEntries(formData));
    const r = await preterEquipementInfoCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function retournerInfo(pretId: string, etatRetour: string): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    await retournerEquipementInfoCore(ctx, pretId, etatRetour);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// --------------------------------------------------------------------
// Sport
// --------------------------------------------------------------------

export async function creerTerrain(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      nom: z.string().min(2), type: z.string().min(2), surface: z.string().optional(),
      capacite: z.coerce.number().int().optional(), eclairage: z.string().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await creerInstallationCore(ctx, { ...d, eclairage: d.eclairage === 'on' });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function occuperTerrain(formData: FormData): Promise<ActionResult> {
  try {
    const { ctx } = await ctxSession();
    const d = z.object({
      installationId: z.string().min(1), date: z.coerce.date(),
      heureDebut: z.string().regex(/^\d{2}:\d{2}$/), heureFin: z.string().regex(/^\d{2}:\d{2}$/),
      titre: z.string().min(2), parQui: z.string().optional(), classeId: z.string().optional(), encadrantId: z.string().optional(),
    }).parse(Object.fromEntries(formData));
    const r = await occuperInstallationCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}
