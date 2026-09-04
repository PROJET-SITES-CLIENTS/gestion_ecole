'use server';

// ====================================================================
// SERVER ACTIONS — COMPLÉTIONS (vague 3 : O1-O5, M7-M18, E19-E21)
// ====================================================================

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { ActionError, Ctx } from '@/lib/business';
import { AuthError, requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { versCentimes } from '@/lib/format';
import {
  // quotidien
  enregistrerMenuCore, pointerRepasCore, creerFeuilleRouteCore, pointerArretCore, clôturerFeuilleRouteCore,
  pointerPersonnelCore, synthesePointageCore, convertirHeuresSupCore,
  inscrireGarderieCore, pointerGarderieCore, facturerGarderieCore,
  // extrascolaire + analytics
  creerActiviteCore, inscrireParticipantCore, traiterAutorisationCore, facturerActiviteCore, changerStatutActiviteCore,
  analyticsFinancieresCore, analyticsPedagogiquesCore, genererRapportTrimestreCore,
  // completions
  rendreDevoirCore, importerElevesCsvCore, importerPersonnelCsvCore,
  genererAttestationCore, saisirAppreciationsMatiereCore,
  genererEcheancierPersonnaliseCore, appliquerRemisesFamillesCore, relancerImpayesAutoCore,
  importerEdtCsvCore, genererPvConseilCore, convoquerConseilCore,
  importerReleveCsvCore, rapprocherAutoCore, exportComptableCsvCore, exporterVirementsPaieCore,
  abonnerPushCore, creerCandidaturePubliqueCore,
} from '@/lib/business';

type Ok = { ok: true; [k: string]: unknown };
type Err = { ok: false; error: string };
export type ActionResult = Ok | Err;

function echec(e: unknown): Err {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  if (e instanceof ActionError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) {
    const premier = e.issues[0];
    return { ok: false, error: `Champ invalide : ${premier?.path.join('.')} — ${premier?.message ?? ''}` };
  }
  console.error('[action-complétions]', e);
  return { ok: false, error: 'Une erreur inattendue est survenue.' };
}

async function ctxSession(): Promise<Ctx> {
  const s = await requireSession();
  return { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions };
}

async function ecoleIdDuCtx(ctx: Ctx): Promise<string> {
  if (ctx.ecoleId) return ctx.ecoleId;
  const pivot = await db.ecole.findFirst({ where: { slug: 'vinci' }, select: { id: true } });
  if (!pivot) throw new ActionError('Aucune école de référence.', 'CONFIG_MANQUANTE');
  return pivot.id;
}

const str = z.string().optional();
const strReq = z.string().trim().min(1, 'obligatoire');
const idReq = z.string().min(1, 'identifiant obligatoire');
const dateReq = z.coerce.date();
const coche = z.union([z.literal('on'), z.literal('true'), z.literal('')]).optional();
const estCoche = (v: string | undefined) => v === 'on' || v === 'true';
const montantCentimes = z.coerce.number().refine((n) => Number.isFinite(n) && n > 0, 'montant invalide').transform(versCentimes);

// ══════════ O1 — CANTINE DU JOUR ══════════

export async function enregistrerMenu(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({ date: dateReq, platPrincipal: strReq, accompagnement: str, dessert: str, allergenes: str }).parse(Object.fromEntries(formData));
    await enregistrerMenuCore(ctx, ecoleId, {
      date: d.date, platPrincipal: d.platPrincipal, accompagnement: d.accompagnement || undefined,
      dessert: d.dessert || undefined, allergenes: (d.allergenes || '').split(',').map((a) => a.trim()).filter(Boolean),
    });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function pointerRepas(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const date = new Date(String(formData.get('date')) || Date.now());
    const presences: Array<{ eleveId: string; present: boolean }> = [];
    for (const [cle, valeur] of formData.entries()) {
      const m = cle.match(/^repas_(.+)$/);
      if (m) presences.push({ eleveId: m[1], present: String(valeur) === 'present' });
    }
    const r = await pointerRepasCore(ctx, ecoleId, date, presences);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ══════════ O2 — TRANSPORT QUOTIDIEN ══════════

export async function creerFeuilleRoute(ligneId: string, dateIso: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await creerFeuilleRouteCore(ctx, ligneId, new Date(dateIso));
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function pointerArret(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ passageId: idReq, heureReelle: z.string().regex(/^\d{2}:\d{2}$/), montes: str, descendus: str }).parse(Object.fromEntries(formData));
    const r = await pointerArretCore(ctx, d.passageId, {
      heureReelle: d.heureReelle,
      montes: (d.montes || '').split(',').filter(Boolean),
      descendus: (d.descendus || '').split(',').filter(Boolean),
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function cloturerFeuilleRoute(feuilleId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await clôturerFeuilleRouteCore(ctx, feuilleId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ══════════ O3 — POINTAGE PERSONNEL ══════════

export async function pointerPersonnel(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ personnelId: idReq, sens: z.enum(['arrivee', 'depart']), reference: str }).parse(Object.fromEntries(formData));
    const r = await pointerPersonnelCore(ctx, d.personnelId, d.sens, new Date(), d.reference || undefined);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function synthesePointage(personnelId: string, periode: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await synthesePointageCore(ctx, personnelId, periode);
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function convertirHeuresSup(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ personnelId: idReq, periode: z.string().regex(/^\d{4}-\d{2}$/), tauxHoraire: z.coerce.number().positive() }).parse(Object.fromEntries(formData));
    const r = await convertirHeuresSupCore(ctx, d.personnelId, d.periode, versCentimes(d.tauxHoraire));
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ══════════ M8 — GARDERIE ══════════

export async function inscrireGarderie(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ eleveId: idReq, tarifHoraire: z.coerce.number().positive(), formule: z.enum(['horaire', 'forfait_mensuel']).optional() }).parse(Object.fromEntries(formData));
    await inscrireGarderieCore(ctx, { eleveId: d.eleveId, tarifHoraire: versCentimes(d.tarifHoraire), formule: d.formule });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function pointerGarderie(eleveId: string, sens: 'arrivee' | 'depart'): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await pointerGarderieCore(ctx, eleveId, sens, new Date());
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function facturerGarderie(moisIso: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await facturerGarderieCore(ctx, ecoleId, new Date(moisIso));
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ══════════ M7 — ACTIVITÉS / SORTIES ══════════

export async function creerActivite(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({
      type: z.enum(['activite', 'sortie', 'voyage']), titre: strReq, description: str, destination: str,
      dateDebut: dateReq, dateFin: dateReq, cout: z.coerce.number().min(0).optional(), capacite: z.coerce.number().int().min(1).optional(),
    }).parse(Object.fromEntries(formData));
    await creerActiviteCore(ctx, ecoleId, {
      type: d.type, titre: d.titre, description: d.description || undefined, destination: d.destination || undefined,
      dateDebut: d.dateDebut, dateFin: d.dateFin,
      cout: d.cout !== undefined ? versCentimes(d.cout) : 0, capacite: d.capacite,
    });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function inscrireParticipants(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const activiteId = String(formData.get('activiteId'));
    const eleveIds = String(formData.get('eleveIds') || '').split(',').map((x) => x.trim()).filter(Boolean);
    const r = await inscrireParticipantCore(ctx, { activiteId, eleveIds });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function traiterAutorisation(participationId: string, decision: 'accordee' | 'refusee'): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const parParent = ctx.type === 'parent';
    await traiterAutorisationCore(ctx, participationId, decision, parParent);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function facturerActivite(activiteId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await facturerActiviteCore(ctx, activiteId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function changerStatutActivite(activiteId: string, statut: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await changerStatutActiviteCore(ctx, activiteId, statut);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ══════════ V1/V2/V7 — ANALYTICS ══════════

export async function analyticsFinancieres(): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await analyticsFinancieresCore(ctx, ecoleId);
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function analyticsPedagogiques(periodeId?: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await analyticsPedagogiquesCore(ctx, ecoleId, periodeId || undefined);
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function genererRapportTrimestre(periodeId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await genererRapportTrimestreCore(ctx, ecoleId, periodeId);
    return { ok: true, rapport: r };
  } catch (e) { return echec(e); }
}

// ══════════ O4 — DEVOIRS (rendu élève) ══════════

export async function rendreDevoir(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ devoirId: idReq, contenuUrl: str, commentaireEleve: str }).parse(Object.fromEntries(formData));
    await rendreDevoirCore(ctx, { devoirId: d.devoirId, contenuUrl: d.contenuUrl || undefined, commentaireEleve: d.commentaireEleve || undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ══════════ O5 — IMPORTS CSV ══════════

export async function importerElevesCsv(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const contenu = String(formData.get('contenu') ?? '');
    const r = await importerElevesCsvCore(ctx, ecoleId, contenu);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function importerPersonnelCsv(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const contenu = String(formData.get('contenu') ?? '');
    const r = await importerPersonnelCsvCore(ctx, ecoleId, contenu);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function importerEdtCsv(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const contenu = String(formData.get('contenu') ?? '');
    const r = await importerEdtCsvCore(ctx, ecoleId, contenu);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ══════════ M9/M10/M14 ══════════

export async function genererAttestation(eleveId: string, type: 'certificat_scolarite' | 'attestation_inscription'): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await genererAttestationCore(ctx, eleveId, type);
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function saisirAppreciationsMatiere(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const bulletinId = String(formData.get('bulletinId'));
    const saisies: Array<{ matiereId: string; appreciation: string }> = [];
    for (const [cle, valeur] of formData.entries()) {
      const m = cle.match(/^appr_(.+)$/);
      if (m && String(valeur).trim()) saisies.push({ matiereId: m[1], appreciation: String(valeur) });
    }
    const r = await saisirAppreciationsMatiereCore(ctx, bulletinId, saisies);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function genererPvConseil(conseilId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await genererPvConseilCore(ctx, conseilId);
    return { ok: true, pv: r.pv };
  } catch (e) { return echec(e); }
}

export async function convoquerConseil(conseilId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await convoquerConseilCore(ctx, conseilId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ══════════ M11/M12 — ÉCHÉANCIERS + RELANCES ══════════

export async function genererEcheancierPersonnalise(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ eleveId: idReq, fraisId: idReq, tranches: strReq }).parse(Object.fromEntries(formData));
    // tranches = "100000:2026-10-15,100000:2026-12-15" (XOF:dates)
    const tranches = d.tranches.split(',').map((t) => {
      const [montant, date] = t.split(':').map((x) => x.trim());
      return { montant: versCentimes(parseFloat(montant)), date: new Date(date) };
    }).filter((t) => Number.isFinite(t.montant) && !isNaN(t.date.getTime()));
    const r = await genererEcheancierPersonnaliseCore(ctx, { eleveId: d.eleveId, fraisId: d.fraisId, tranches });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function appliquerRemisesFamilles(pourcentage: number): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await appliquerRemisesFamillesCore(ctx, ecoleId, pourcentage);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function relancerImpayes(): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await relancerImpayesAutoCore(ecoleId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ══════════ M15/M16 — RAPPROCHEMENT + VIREMENTS ══════════

export async function importerReleve(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await importerReleveCsvCore(ctx, ecoleId, String(formData.get('contenu') ?? ''));
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function rapprocherAuto(): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await rapprocherAutoCore(ctx, ecoleId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function exportComptableCsv(): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await exportComptableCsvCore(ctx, ecoleId);
    return { ok: true, csv: r.csv, ecritures: r.écritures };
  } catch (e) { return echec(e); }
}

export async function exporterVirementsPaie(periode: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await exporterVirementsPaieCore(ctx, ecoleId, periode);
    return { ok: true, csv: r.csv, bulletins: r.bulletins, sansRib: r.sansRib };
  } catch (e) { return echec(e); }
}

// ══════════ E19 — PUSH ══════════

export async function abonnerPush(endpoint: string, p256dh: string, auth: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await abonnerPushCore(ctx, { endpoint, p256dh, auth });
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ══════════ E21 — CANDIDATURE PUBLIQUE (sans session) ══════════

export async function envoyerCandidaturePublique(formData: FormData): Promise<ActionResult> {
  try {
    const d = z.object({
      ecoleSlug: strReq, nom: strReq, prenom: strReq, dateNaissance: dateReq,
      email: z.string().email(), telephone: str, niveauCode: str, parentNom: str, parentTelephone: str,
      pieger: str, // honeypot anti-bot
    }).parse(Object.fromEntries(formData));
    if (d.pieger) return { ok: false, error: 'Rejeté.' }; // honeypot rempli = bot
    let ip: string | undefined;
    try {
      const h = await headers();
      ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    } catch { /* hors requête */ }
    const r = await creerCandidaturePubliqueCore({
      ecoleSlug: d.ecoleSlug, nom: d.nom, prenom: d.prenom, dateNaissance: d.dateNaissance,
      email: d.email, telephone: d.telephone || undefined, niveauCode: d.niveauCode || undefined,
      parentNom: d.parentNom || undefined, parentTelephone: d.parentTelephone || undefined, ip,
    });
    return { ok: true, candidatureId: r.candidatureId };
  } catch (e) { return echec(e); }
}
