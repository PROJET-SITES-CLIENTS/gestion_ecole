'use server';

// ====================================================================
// ACTIONS RH — compléments : formations, sanctions, soldes congés
// ====================================================================

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionError } from '@/lib/business';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { avecRetryBdd } from '@/lib/retry-bdd';
import { creerFormationCore, majFormationCore, sanctionnerPersonnelCore, acquitterSoldesCongesCore } from '@/lib/business';

type ActionResult = { ok: true; [k: string]: unknown } | { ok: false; error: string };

function echec(e: unknown): ActionResult {
  if (e instanceof ActionError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) return { ok: false, error: `Champ invalide : ${e.issues[0]?.path.join('.')}` };
  console.error('[actions-rh+]', e);
  return { ok: false, error: 'Erreur inattendue.' };
}

export async function lireRhComplements(): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const eid = s.utilisateur.ecoleId!;
    const [formations, sanctions, soldes] = await avecRetryBdd(() => Promise.all([
      (db as any).formationPersonnel.findMany({ where: { ecoleId: eid }, include: { personnel: { select: { prenom: true, nom: true, matricule: true } } }, orderBy: { dateDebut: 'desc' }, take: 100 }),
      (db as any).sanctionPersonnel.findMany({ where: { ecoleId: eid }, include: { personnel: { select: { prenom: true, nom: true } } }, orderBy: { dateFaits: 'desc' }, take: 100 }),
      db.soldeConge.findMany({ where: { ecoleId: eid }, include: { personnel: { select: { prenom: true, nom: true, matricule: true, dateEmbauche: true } } }, orderBy: { personnel: { nom: 'asc' } }, take: 200 }),
    ]), 3, 600);
    return { ok: true, formations, sanctions, soldes };
  } catch (e) { return echec(e); }
}

export async function creerFormation(formData: FormData): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const ctx = { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions };
    const d = z.object({ personnelId: z.string().min(1), intitule: z.string().min(3), organisme: z.string().optional(), dateDebut: z.coerce.date(), dateFin: z.coerce.date().optional(), cout: z.coerce.number().optional() }).parse(Object.fromEntries(formData));
    const r = await creerFormationCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function majFormation(formationId: string, statut: 'en_cours' | 'terminee' | 'annulee', certificatObtenu?: boolean): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const ctx = { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions };
    const r = await majFormationCore(ctx, formationId, statut, certificatObtenu);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function sanctionnerPersonnel(formData: FormData): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const ctx = { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions };
    const d = z.object({ personnelId: z.string().min(1), dateFaits: z.coerce.date(), faute: z.string().min(3), typeSanction: z.enum(['avertissement', 'oral', 'blame', 'mise_a_demeure', 'licenciement']), description: z.string().min(5) }).parse(Object.fromEntries(formData));
    const r = await sanctionnerPersonnelCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function acquitterSoldes(joursParMois?: number, plafondReport?: number): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const ctx = { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions };
    const r = await acquitterSoldesCongesCore(ctx, { joursParMois, plafondReport });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}
