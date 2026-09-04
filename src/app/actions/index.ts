'use server';

// ====================================================================
// SERVER ACTIONS — adaptateur HTTP fin
// Contrat : session OBLIGATOIRE → permission RBAC (dans le Core) →
// validation zod des FormData → contrôle de tenant (dans le Core) →
// résultat {ok:true,…} | {ok:false,error} — aucune exception ne fuit.
// F16 : les montants saisis en XOF sont convertis en CENTIMES ici.
// ====================================================================

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import {
  ActionError, Ctx,
  // élèves
  inscrireEleveCore, ajouterBesoinSpecifiqueCore, ajouterAmenagementCore,
  activerConsentementPortailEleveCore, modifierEleveCore, changerStatutEleveCore,
  transfererClasseCore, rattacherParentCore, supprimerEleveCore, enregistrerConsentementImageCore,
  // finances
  encaisserPaiementCore, genererEcheancesClasseCore, creerFraisCore,
  enregistrerDepenseCore, validerDepenseCore, enregistrerMouvementStockCore,
  annulerPaiementCore, annulerEcheanceCore, remiseEcheanceCore, annulerDepenseCore,
  creerArticleStockCore,
  // pédagogie
  creerEvaluationCore, saisirNotesCore, genererBulletinCore, changerStatutBulletinCore,
  modifierEvaluationCore, supprimerEvaluationCore,
  // présences
  saisirAppelCore, justifierAbsenceCore, traiterJustificationCore,
  // vie scolaire / sécurité
  declarerIncidentCore, sanctionnerCore, sortieEleveCore, enregistrerVisiteurCore,
  creerAutorisationSortieCore, desactiverAutorisationSortieCore, sortieVisiteurCore,
  executerSanctionCore, exclureTemporairementCore,
  // RH
  demanderCongeCore, traiterCongeCore, assignerRemplacementCore,
  creerPersonnelCore, annulerCongeCore,
  // services
  inscrireCantineCore, preterLivreCore, retournerLivreCore, attribuerManuelCore,
  creerLivreBiblioCore, retournerManuelCore, annulerCantineCore,
  // EDT
  creerCreneauEdtCore, modifierCreneauEdtCore, supprimerCreneauEdtCore,
  genererSeancesDepuisEdtCore, cloturerAnneeScolaireCore,
  // santé
  enregistrerPassageInfirmerieCore, enregistrerFicheSanteCore, enregistrerVaccinationCore,
  // SaaS + communication + examens + salles + RDV
  creerEcoleClientCore, changerStatutEcoleCore, creerPlanTarifaireCore,
  genererFacturesSaasCore, changerPlanEcoleCore,
  envoyerNotificationCore, envoyerNotificationMasseCore, creerModeleMessageCore,
  inscrireElevesExamenCore, envoyerConvocationsExamenCore, saisirResultatExamenCore,
  creerSalleCore, ajouterCalendrierCore,
  ouvrirCreneauRdvCore, reserverRdvCore, annulerRdvCore,
} from '@/lib/business';
import { requireSession, tenterConnexion, validerDefi2FA, detruireSessionCourante, initierActivation2FA, confirmerActivation2FA, desactiver2FA, AuthError } from '@/lib/auth';
import { db } from '@/lib/db';
import { versCentimes } from '@/lib/format';

// --------------------------------------------------------------------
// Socle
// --------------------------------------------------------------------

type Ok = { ok: true; [k: string]: unknown };
type Err = { ok: false; error: string };
export type ActionResult = Ok | Err;

function echec(e: unknown): Err {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  if (e instanceof ActionError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) {
    const premier = e.issues[0];
    return { ok: false, error: `Champ invalide : ${premier?.path.join('.') || 'formulaire'} — ${premier?.message ?? ''}` };
  }
  console.error('[action] erreur inattendue:', e);
  return { ok: false, error: 'Une erreur inattendue est survenue. L\'incident a été journalisé.' };
}

async function ctxSession(): Promise<Ctx> {
  const s = await requireSession();
  return { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions };
}

/** École de travail : celle du compte, ou école pivot pour le super-admin. */
async function ecoleIdDuCtx(ctx: Ctx): Promise<string> {
  if (ctx.ecoleId) return ctx.ecoleId;
  const pivot = await db.ecole.findFirst({ where: { slug: 'vinci' }, select: { id: true } });
  if (!pivot) throw new ActionError('Aucune école de référence configurée.', 'CONFIG_MANQUANTE');
  return pivot.id;
}

// Helpers zod
const str = z.string().optional();
const strReq = z.string().trim().min(1, 'obligatoire');
const idReq = z.string().min(1, 'identifiant obligatoire');
const dateReq = z.coerce.date();
const optDate = z.union([z.literal(''), z.undefined(), z.coerce.date()]).transform((v) => (v === '' || v === undefined ? undefined : (v as Date)));

/** Montant saisi en unités (XOF) → CENTIMES entiers (F16). */
const montantCentimes = z.coerce.number()
  .refine((n) => Number.isFinite(n) && n > 0, 'montant invalide')
  .transform(versCentimes)
  .refine((c) => Number.isInteger(c) && c > 0, 'montant invalide');

/** Case à cocher HTML (absente si décochée). */
const coche = z.union([z.literal('on'), z.literal('true'), z.literal('')]).optional();
const estCoche = (v: string | undefined) => v === 'on' || v === 'true';

/** IP cliente depuis les en-têtes (Caddy remonte X-Forwarded-For). */
async function ipEtUa(): Promise<{ ip?: string; ua?: string }> {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || undefined;
    return { ip, ua: h.get('user-agent') ?? undefined };
  } catch {
    return {};
  }
}

// ====================================================================
// AUTHENTIFICATION (F10 2FA + F11 IP/UA)
// ====================================================================

const LoginSchema = z.object({ email: z.string().trim().email('email invalide'), motDePasse: z.string().min(1, 'mot de passe requis') });

export async function connexion(formData: FormData): Promise<ActionResult | { ok: false; besoin2FA: true; jetonChallenge: string }> {
  try {
    const d = LoginSchema.parse(Object.fromEntries(formData));
    const { ip, ua } = await ipEtUa();
    const r = await tenterConnexion(d.email, d.motDePasse, ua, ip);
    if (r.ok) {
      revalidatePath('/');
      return { ok: true };
    }
    if ('besoin2FA' in r) return { ok: false, besoin2FA: true, jetonChallenge: r.jetonChallenge };
    return { ok: false, error: r.erreur };
  } catch (e) {
    return echec(e);
  }
}

export async function valider2FA(jetonChallenge: string, code: string): Promise<ActionResult> {
  try {
    if (!jetonChallenge || !/^[0-9\s-]{6,17}$/.test(code)) {
      return { ok: false, error: 'Code de vérification invalide.' };
    }
    const { ip, ua } = await ipEtUa();
    const r = await validerDefi2FA(jetonChallenge, code, ua, ip);
    if (r.ok) {
      revalidatePath('/');
      return { ok: true };
    }
    if ('besoin2FA' in r) return { ok: false, error: 'Défi expiré.' };
    return { ok: false, error: r.erreur };
  } catch (e) {
    return echec(e);
  }
}

export async function deconnexion(): Promise<ActionResult> {
  try {
    await detruireSessionCourante();
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return echec(e);
  }
}

// ---- Gestion 2FA (module Sécurité) ----

export async function initier2FA(): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const r = await initierActivation2FA({ utilisateurId: s.utilisateur.id });
    return { ok: true, secret: r.secret };
  } catch (e) {
    return echec(e);
  }
}

export async function confirmer2FA(code: string): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const r = await confirmerActivation2FA({ utilisateurId: s.utilisateur.id }, code);
    return { ok: true, actif: r.actif, nbCodesSecours: r.nbCodesSecours };
  } catch (e) {
    return echec(e);
  }
}

export async function desactiver2FAAction(motDePasse: string): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const r = await desactiver2FA({ utilisateurId: s.utilisateur.id }, motDePasse);
    return { ok: true, actif: r.actif };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// SAAS ÉDITEUR (F4 onboarding + facturation + plans)
// ====================================================================

const EcoleClientSchema = z.object({
  nom: strReq,
  slug: strReq,
  planId: str.optional(),
  pays: str.optional(),
  devise: str.optional(),
  emailDirection: z.string().trim().email('email invalide').optional().or(z.literal('')),
  motDePasseDirection: str.optional(),
});

export async function creerEcoleClient(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = EcoleClientSchema.parse(Object.fromEntries(formData));
    const r = await creerEcoleClientCore(ctx, {
      nom: d.nom, slug: d.slug, planId: d.planId || undefined,
      pays: d.pays || undefined, devise: d.devise || undefined,
      emailDirection: d.emailDirection || undefined,
      motDePasseDirection: d.motDePasseDirection || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function changerStatutEcole(ecoleId: string, statut: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await changerStatutEcoleCore(ctx, ecoleId, statut);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return echec(e);
  }
}

const PlanSchema = z.object({
  nom: strReq,
  prixMensuel: montantCentimes,
  prixAnnuel: montantCentimes,
  devise: str.optional(),
  limiteEleves: z.coerce.number().int().min(0).optional(),
  dureeEssaiJours: z.coerce.number().int().min(0).max(365).optional(),
});

export async function creerPlanTarifaire(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = PlanSchema.parse(Object.fromEntries(formData));
    const r = await creerPlanTarifaireCore(ctx, {
      nom: d.nom, prixMensuel: d.prixMensuel, prixAnnuel: d.prixAnnuel,
      devise: d.devise || undefined, limiteEleves: d.limiteEleves ?? 0,
      dureeEssaiJours: d.dureeEssaiJours,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function genererFacturesSaas(): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await genererFacturesSaasCore(ctx);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function changerPlanEcole(ecoleId: string, planId: string, modeFacturation: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    if (modeFacturation !== 'mensuel' && modeFacturation !== 'annuel') {
      return { ok: false, error: 'Mode de facturation invalide.' };
    }
    const r = await changerPlanEcoleCore(ctx, ecoleId, planId, modeFacturation);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// ÉLÈVES (F3 CRUD complet + F13 rattachement parents)
// ====================================================================

const InscriptionSchema = z.object({
  nom: strReq,
  prenom: strReq,
  dateNaissance: dateReq,
  lieuNaissance: str.optional(),
  sexe: z.enum(['M', 'F']),
  classeId: str.optional(),
});

export async function inscrireEleve(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = InscriptionSchema.parse(Object.fromEntries(formData));
    const r = await inscrireEleveCore(ctx, ecoleId, {
      nom: d.nom, prenom: d.prenom, dateNaissance: d.dateNaissance,
      lieuNaissance: d.lieuNaissance || undefined, sexe: d.sexe, classeId: d.classeId || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const ModificationEleveSchema = z.object({
  eleveId: idReq,
  nom: strReq,
  prenom: strReq,
  dateNaissance: dateReq,
  lieuNaissance: str.optional(),
  sexe: z.enum(['M', 'F']),
});

export async function modifierEleve(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = ModificationEleveSchema.parse(Object.fromEntries(formData));
    const r = await modifierEleveCore(ctx, { ...d, lieuNaissance: d.lieuNaissance || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const ChangementStatutEleveSchema = z.object({
  eleveId: idReq,
  statut: z.enum(['actif', 'diplome', 'transfere', 'exclu', 'sorti']),
  dateSortie: optDate,
  motif: str,
});

export async function changerStatutEleve(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = ChangementStatutEleveSchema.parse(Object.fromEntries(formData));
    const r = await changerStatutEleveCore(ctx, {
      eleveId: d.eleveId, statut: d.statut, dateSortie: d.dateSortie, motif: d.motif || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function transfererClasse(eleveId: string, classeId: string, motif?: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await transfererClasseCore(ctx, eleveId, classeId, motif);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const RattacherParentSchema = z.object({
  eleveId: idReq,
  parentId: str.optional(),
  nom: str.optional(),
  prenom: str.optional(),
  telephone: str.optional(),
  email: str.optional(),
  profession: str.optional(),
  lienAvecEleve: z.enum(['pere', 'mere', 'tuteur_legal']),
});

export async function rattacherParent(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = RattacherParentSchema.parse(Object.fromEntries(formData));
    const r = await rattacherParentCore(ctx, {
      eleveId: d.eleveId,
      parentId: d.parentId || undefined,
      nouveauParent: d.parentId ? undefined : {
        nom: d.nom ?? '', prenom: d.prenom ?? '',
        telephone: d.telephone || undefined, email: d.email || undefined,
        profession: d.profession || undefined, lienAvecEleve: d.lienAvecEleve,
      },
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function supprimerEleve(eleveId: string, motif: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await supprimerEleveCore(ctx, eleveId, motif);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const BesoinSchema = z.object({ eleveId: idReq, type: strReq, description: strReq, dateDiagnostic: optDate });

export async function ajouterBesoinSpecifique(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = BesoinSchema.parse(Object.fromEntries(formData));
    const r = await ajouterBesoinSpecifiqueCore(ctx, { eleveId: d.eleveId, type: d.type, description: d.description, dateDiagnostic: d.dateDiagnostic });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const AmenagementSchema = z.object({
  eleveId: idReq, besoinSpecifiqueId: str.optional(), typeAmenagement: strReq,
  description: str, dateDebut: dateReq,
});

export async function ajouterAmenagement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = AmenagementSchema.parse(Object.fromEntries(formData));
    const r = await ajouterAmenagementCore(ctx, { ...d, besoinSpecifiqueId: d.besoinSpecifiqueId || undefined, description: d.description ?? '' });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function activerConsentementPortailEleve(eleveId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await activerConsentementPortailEleveCore(ctx, eleveId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return echec(e);
  }
}

const ConsentementImageSchema = z.object({
  eleveId: idReq,
  accord: coche,
  usage: strReq,
  duree: str.optional(),
});

export async function enregistrerConsentementImage(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = ConsentementImageSchema.parse(Object.fromEntries(formData));
    const r = await enregistrerConsentementImageCore(ctx, { eleveId: d.eleveId, accord: estCoche(d.accord), usage: d.usage, duree: d.duree || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// PÉDAGOGIE (F6 : plus de paramètre rôle ; F3 modifier/supprimer)
// ====================================================================

const EvaluationSchema = z.object({
  classeId: idReq, matiereId: idReq, enseignantId: idReq, periodeId: idReq,
  type: strReq, intitule: strReq, date: dateReq,
  sur: z.coerce.number().positive('barème invalide').max(100),
  coefficient: z.coerce.number().positive('coefficient invalide').max(20),
});

export async function creerEvaluation(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = EvaluationSchema.parse(Object.fromEntries(formData));
    const r = await creerEvaluationCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function modifierEvaluation(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const evaluationId = String(formData.get('evaluationId') ?? '');
    if (!evaluationId) return { ok: false, error: 'Identifiant d\'évaluation manquant.' };
    const d = EvaluationSchema.parse(Object.fromEntries(formData));
    const r = await modifierEvaluationCore(ctx, evaluationId, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function supprimerEvaluation(evaluationId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await supprimerEvaluationCore(ctx, evaluationId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function saisirNotes(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const evaluationId = String(formData.get('evaluationId') ?? '');
    if (!evaluationId) return { ok: false, error: 'Évaluation manquante.' };
    const notes: Array<{ eleveId: string; valeur?: number; absent?: boolean }> = [];
    for (const [cle, valeur] of formData.entries()) {
      const m = cle.match(/^note_(.+)$/);
      if (!m) continue;
      const eleveId = m[1];
      const brut = String(valeur).trim();
      if (brut === '' || brut === 'A') continue;
      if (brut.toUpperCase() === 'ABS') { notes.push({ eleveId, absent: true }); continue; }
      const n = Number(brut.replace(',', '.'));
      if (!Number.isFinite(n)) return { ok: false, error: `Note invalide : « ${brut} ».` };
      notes.push({ eleveId, valeur: n });
    }
    if (notes.length === 0) return { ok: false, error: 'Aucune note saisie.' };
    const r = await saisirNotesCore(ctx, { evaluationId, notes });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const BulletinSchema = z.object({ eleveId: idReq, periodeId: idReq, classeId: idReq });

export async function genererBulletin(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = BulletinSchema.parse(Object.fromEntries(formData));
    const r = await genererBulletinCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

/** F6 — le rôle n'est PLUS un paramètre : dérivé de la session dans le Core. */
export async function changerStatutBulletin(bulletinId: string, statut: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    if (!/^[a-z_]+$/.test(statut)) return { ok: false, error: 'Statut invalide.' };
    const r = await changerStatutBulletinCore(ctx, bulletinId, statut);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// PRÉSENCES (F13 justification d'absence)
// ====================================================================

export async function saisirAppel(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const seanceId = String(formData.get('seanceId') ?? '');
    if (!seanceId) return { ok: false, error: 'Séance manquante.' };
    const presences: Array<{ eleveId: string; statut: string; minuteRetard?: number; motif?: string }> = [];
    for (const [cle, valeur] of formData.entries()) {
      const m = cle.match(/^presence_(.+)$/);
      if (!m) continue;
      presences.push({ eleveId: m[1], statut: String(valeur) });
    }
    for (const [cle, valeur] of formData.entries()) {
      const m = cle.match(/^retard_(.+)$/);
      if (m && String(valeur).trim()) {
        const p = presences.find((x) => x.eleveId === m[1]);
        if (p) p.minuteRetard = Number(String(valeur)) || 0;
      }
      const mm = cle.match(/^motif_(.+)$/);
      if (mm && String(valeur).trim()) {
        const p = presences.find((x) => x.eleveId === mm[1]);
        if (p) p.motif = String(valeur).trim();
      }
    }
    if (presences.length === 0) return { ok: false, error: 'Aucune présence saisie.' };
    const r = await saisirAppelCore(ctx, { seanceId, presences });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const JustificationSchema = z.object({
  eleveId: idReq,
  dateAbsence: dateReq,
  motif: z.enum(['maladie', 'familial', 'rendez_vous_medical', 'ceremonie', 'transport', 'autre']),
  dureeHeures: z.coerce.number().positive().max(24).optional(),
  description: str,
  presenceId: str.optional(),
});

export async function justifierAbsence(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = JustificationSchema.parse(Object.fromEntries(formData));
    const r = await justifierAbsenceCore(ctx, {
      eleveId: d.eleveId, dateAbsence: d.dateAbsence, motif: d.motif,
      dureeHeures: d.dureeHeures, description: d.description || undefined,
      presenceId: d.presenceId || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function traiterJustification(justificationId: string, decision: 'valide' | 'rejete', commentaire?: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await traiterJustificationCore(ctx, justificationId, decision, commentaire);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// FINANCES (F8 finances.ecrire + F16 centimes + F3 annulations)
// ====================================================================

const PaiementSchema = z.object({
  eleveId: idReq,
  montant: montantCentimes,
  modePaiement: z.enum(['espece', 'cheque', 'virement', 'carte', 'mobile_money']),
  reference: str,
  echeanceId: str.optional(),
});

export async function encaisserPaiement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = PaiementSchema.parse(Object.fromEntries(formData));
    const r = await encaisserPaiementCore(ctx, {
      eleveId: d.eleveId, montant: d.montant, modePaiement: d.modePaiement,
      reference: d.reference || undefined, echeanceId: d.echeanceId || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function annulerPaiement(paiementId: string, motif: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await annulerPaiementCore(ctx, paiementId, motif, false);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function rembourserPaiement(paiementId: string, motif: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await annulerPaiementCore(ctx, paiementId, motif, true);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function annulerEcheance(echeanceId: string, motif: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await annulerEcheanceCore(ctx, echeanceId, motif);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const RemiseSchema = z.object({ echeanceId: idReq, remise: montantCentimes, motif: strReq });

export async function remiseEcheance(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = RemiseSchema.parse(Object.fromEntries(formData));
    const r = await remiseEcheanceCore(ctx, d.echeanceId, d.remise, d.motif);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function annulerDepense(depenseId: string, motif: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await annulerDepenseCore(ctx, depenseId, motif);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const FraisSchema = z.object({
  libelle: strReq,
  type: z.enum(['scolarite', 'inscription', 'cantine', 'transport', 'activite']),
  montant: montantCentimes,
  periodicite: z.enum(['unique', 'mensuel', 'trimestriel', 'annuel']).optional(),
  niveauId: str.optional(),
});

export async function creerFrais(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = FraisSchema.parse(Object.fromEntries(formData));
    const r = await creerFraisCore(ctx, ecoleId, { ...d, niveauId: d.niveauId || undefined, periodicite: d.periodicite ?? 'unique' });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const EcheancesClasseSchema = z.object({ fraisId: idReq, classeId: idReq, dateEcheance: dateReq });

export async function genererEcheancesClasse(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = EcheancesClasseSchema.parse(Object.fromEntries(formData));
    const r = await genererEcheancesClasseCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function validerDepense(depenseId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await validerDepenseCore(ctx, depenseId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const DepenseSchema = z.object({
  categorie: strReq, description: strReq, montant: montantCentimes,
  dateDepense: dateReq, fournisseur: str.optional(),
});

export async function enregistrerDepense(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = DepenseSchema.parse(Object.fromEntries(formData));
    const r = await enregistrerDepenseCore(ctx, ecoleId, { ...d, fournisseur: d.fournisseur || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const MouvementStockSchema = z.object({
  articleId: idReq,
  type: z.enum(['entree', 'sortie']),
  quantite: z.coerce.number().int('entier requis').positive('quantité invalide'),
  motif: str.optional(),
});

export async function enregistrerMouvementStock(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = MouvementStockSchema.parse(Object.fromEntries(formData));
    const r = await enregistrerMouvementStockCore(ctx, { ...d, motif: d.motif || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const ArticleStockSchema = z.object({
  nom: strReq, categorie: str.optional(), quantite: z.coerce.number().int().min(0),
  unite: str.optional(), seuilAlerte: z.coerce.number().int().min(0).optional(),
  prixUnitaire: z.coerce.number().min(0).optional(),
});

export async function creerArticleStock(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = ArticleStockSchema.parse(Object.fromEntries(formData));
    const r = await creerArticleStockCore(ctx, ecoleId, {
      nom: d.nom, categorie: d.categorie || undefined, quantite: d.quantite,
      unite: d.unite || undefined, seuilAlerte: d.seuilAlerte,
      prixUnitaire: d.prixUnitaire !== undefined ? versCentimes(d.prixUnitaire) : undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// VIE SCOLAIRE / SÉCURITÉ (F3 + F13)
// ====================================================================

const IncidentSchema = z.object({
  eleveId: idReq, dateHeure: dateReq, lieu: str.optional(),
  type: strReq, description: strReq, gravite: z.enum(['leger', 'modere', 'grave', 'tres_grave']),
});

export async function declarerIncident(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = IncidentSchema.parse(Object.fromEntries(formData));
    const r = await declarerIncidentCore(ctx, { ...d, lieu: d.lieu || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const SanctionSchema = z.object({ incidentId: idReq, type: strReq, description: str });

export async function sanctionner(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = SanctionSchema.parse(Object.fromEntries(formData));
    const r = await sanctionnerCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const ExclusionSchema = z.object({ incidentId: idReq, dateDebut: dateReq, dateFin: dateReq, description: strReq });

export async function exclureTemporairement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = ExclusionSchema.parse(Object.fromEntries(formData));
    const r = await exclureTemporairementCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function executerSanction(sanctionId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await executerSanctionCore(ctx, sanctionId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const SortieSchema = z.object({
  eleveId: idReq, date: dateReq, heure: z.string().regex(/^\d{2}:\d{2}$/, 'heure HH:MM'),
  autorisationId: str.optional(), recupereParNom: strReq,
  validationExceptionnelle: coche,
  motifException: str.optional(),
});

export async function sortieEleve(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = SortieSchema.parse(Object.fromEntries(formData));
    const r = await sortieEleveCore(ctx, {
      eleveId: d.eleveId, date: d.date, heure: d.heure,
      autorisationId: d.autorisationId || undefined,
      recupereParNom: d.recupereParNom,
      validationExceptionnelle: estCoche(d.validationExceptionnelle),
      motifException: d.motifException || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const AutorisationSchema = z.object({
  eleveId: idReq, nomPersonneAutorisee: strReq, lienAvecEleve: str.optional(), telephone: str.optional(),
});

export async function creerAutorisationSortie(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = AutorisationSchema.parse(Object.fromEntries(formData));
    const r = await creerAutorisationSortieCore(ctx, { ...d, lienAvecEleve: d.lienAvecEleve || undefined, telephone: d.telephone || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function desactiverAutorisationSortie(autorisationId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await desactiverAutorisationSortieCore(ctx, autorisationId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const VisiteurSchema = z.object({ nom: strReq, motifVisite: strReq, pieceVerifiee: coche });

export async function enregistrerVisiteur(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = VisiteurSchema.parse(Object.fromEntries(formData));
    const r = await enregistrerVisiteurCore(ctx, ecoleId, {
      nom: d.nom, motifVisite: d.motifVisite, pieceVerifiee: estCoche(d.pieceVerifiee),
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function sortieVisiteur(visiteurId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await sortieVisiteurCore(ctx, visiteurId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// RH (F3 creerPersonnel + annulerConge)
// ====================================================================

const CongeSchema = z.object({
  personnelId: idReq, type: z.enum(['annuel', 'maladie', 'maternite', 'exceptionnel']),
  dateDebut: dateReq, dateFin: dateReq, motif: str.optional(),
});

export async function demanderConge(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = CongeSchema.parse(Object.fromEntries(formData));
    const r = await demanderCongeCore(ctx, { ...d, motif: d.motif || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function traiterConge(congeId: string, decision: 'valide' | 'refuse', commentaire?: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await traiterCongeCore(ctx, congeId, decision, commentaire);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function annulerConge(congeId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await annulerCongeCore(ctx, congeId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const RemplacementSchema = z.object({
  congeId: idReq, personnelRemplacantId: idReq, dateDebut: dateReq, dateFin: dateReq,
});

export async function assignerRemplacement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = RemplacementSchema.parse(Object.fromEntries(formData));
    const r = await assignerRemplacementCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const PersonnelSchema = z.object({
  nom: strReq, prenom: strReq, email: z.string().trim().email('email invalide').optional().or(z.literal('')),
  telephone: str.optional(), dateEmbauche: dateReq,
  typeContrat: z.enum(['CDI', 'CDD', 'vacataire', 'stagiaire']).optional(),
  salaireBrut: z.coerce.number().min(0).optional(),
  diplomePrincipal: str.optional(),
  creerCompte: coche,
  motDePasseInitial: str.optional(),
});

export async function creerPersonnel(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = PersonnelSchema.parse(Object.fromEntries(formData));
    const r = await creerPersonnelCore(ctx, ecoleId, {
      nom: d.nom, prenom: d.prenom, email: d.email || undefined,
      telephone: d.telephone || undefined, dateEmbauche: d.dateEmbauche,
      typeContrat: d.typeContrat, diplomePrincipal: d.diplomePrincipal || undefined,
      salaireBrut: d.salaireBrut !== undefined ? versCentimes(d.salaireBrut) : undefined,
      creerCompte: estCoche(d.creerCompte),
      motDePasseInitial: d.motDePasseInitial || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// SERVICES (cantine/biblio/manuels — F16 + F3)
// ====================================================================

const CantineSchema = z.object({
  eleveId: idReq,
  jours: strReq, // "1,3,5"
  tarifJournalier: z.coerce.number().positive('tarif invalide'),
});

export async function inscrireCantine(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = CantineSchema.parse(Object.fromEntries(formData));
    const jours = d.jours.split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n >= 1 && n <= 6);
    const r = await inscrireCantineCore(ctx, {
      eleveId: d.eleveId, joursSemaine: jours, tarifJournalier: versCentimes(d.tarifJournalier),
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function annulerCantine(inscriptionId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await annulerCantineCore(ctx, inscriptionId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const LivreSchema = z.object({
  titre: strReq, auteur: str.optional(), editeur: str.optional(), isbn: str.optional(),
  anneePublication: z.coerce.number().int().min(1400).optional(),
  exemplairesTotal: z.coerce.number().int().min(1),
  categorie: str.optional(), cote: str.optional(),
});

export async function creerLivreBiblio(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = LivreSchema.parse(Object.fromEntries(formData));
    const r = await creerLivreBiblioCore(ctx, ecoleId, {
      titre: d.titre, auteur: d.auteur || undefined, editeur: d.editeur || undefined,
      isbn: d.isbn || undefined, anneePublication: d.anneePublication,
      exemplairesTotal: d.exemplairesTotal, categorie: d.categorie || undefined, cote: d.cote || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const PretSchema = z.object({ livreId: idReq, eleveId: idReq, dureeJours: z.coerce.number().int().min(1).max(60) });

export async function preterLivre(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = PretSchema.parse(Object.fromEntries(formData));
    const r = await preterLivreCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function retournerLivre(pretId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await retournerLivreCore(ctx, pretId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const AttributionManuelSchema = z.object({
  manuelScolaireId: idReq, eleveId: idReq,
  etatRemise: z.enum(['bon', 'usage', 'endommage']),
});

export async function attribuerManuel(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = AttributionManuelSchema.parse(Object.fromEntries(formData));
    const r = await attribuerManuelCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function retournerManuel(attributionId: string, etatRetour: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await retournerManuelCore(ctx, attributionId, etatRetour);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// SALLES / EDT (F3 + F20 génération de séances)
// ====================================================================

const SalleSchema = z.object({
  nom: strReq, type: strReq, capacite: z.coerce.number().int().min(1).max(2000),
});

export async function creerSalle(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = SalleSchema.parse(Object.fromEntries(formData));
    const r = await creerSalleCore(ctx, ecoleId, { ...d, equipements: [] });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const CalendrierSchema = z.object({
  type: strReq, libelle: strReq, dateDebut: dateReq, dateFin: dateReq,
});

export async function ajouterCalendrier(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = CalendrierSchema.parse(Object.fromEntries(formData));
    const r = await ajouterCalendrierCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const CreneauEdtSchema = z.object({
  classeId: str.optional(), matiereId: str.optional(), enseignantId: str.optional(), salleId: str.optional(),
  jour: z.enum(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'), heureFin: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  dateDebut: dateReq,
});

export async function creerCreneauEdt(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = CreneauEdtSchema.parse(Object.fromEntries(formData));
    const r = await creerCreneauEdtCore(ctx, ecoleId, {
      ...d,
      classeId: d.classeId || undefined, matiereId: d.matiereId || undefined,
      enseignantId: d.enseignantId || undefined, salleId: d.salleId || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function modifierCreneauEdt(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const emploiTempsId = String(formData.get('emploiTempsId') ?? '');
    if (!emploiTempsId) return { ok: false, error: 'Créneau manquant.' };
    const d = CreneauEdtSchema.parse(Object.fromEntries(formData));
    const r = await modifierCreneauEdtCore(ctx, emploiTempsId, {
      ...d,
      classeId: d.classeId || undefined, matiereId: d.matiereId || undefined,
      enseignantId: d.enseignantId || undefined, salleId: d.salleId || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function supprimerCreneauEdt(emploiTempsId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await supprimerCreneauEdtCore(ctx, emploiTempsId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function genererSeancesDepuisEdt(emploiTempsId: string, dateFinIso: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const dateFin = new Date(dateFinIso);
    const r = await genererSeancesDepuisEdtCore(ctx, emploiTempsId, dateFin);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function cloturerAnneeScolaire(anneeId: string, redoublerIds?: string[]): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await cloturerAnneeScolaireCore(ctx, anneeId, { redoublerIds });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// SANTÉ
// ====================================================================

const PassageInfirmerieSchema = z.object({
  eleveId: idReq, motif: strReq, symptomes: str.optional(), soinsAdministres: str.optional(),
  temperature: z.coerce.number().min(30).max(45).optional(),
  issue: z.enum(['retour_classe', 'parents_contactes', 'depart_hopital', 'retour_domicile']),
  notifierParents: coche,
});

export async function enregistrerPassageInfirmerie(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = PassageInfirmerieSchema.parse(Object.fromEntries(formData));
    const r = await enregistrerPassageInfirmerieCore(ctx, {
      eleveId: d.eleveId, motif: d.motif, symptomes: d.symptomes || undefined,
      soinsAdministres: d.soinsAdministres || undefined, temperature: d.temperature,
      issue: d.issue, notifierParents: estCoche(d.notifierParents),
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const FicheSanteSchema = z.object({
  eleveId: idReq, groupeSanguin: str.optional(), allergies: str.optional(),
  traitementsEnCours: str.optional(), antecedents: str.optional(),
  medecinTraitant: str.optional(), telephoneUrgence: str.optional(),
  contactUrgenceNom: str.optional(), autorisationTraitement: coche,
});

export async function enregistrerFicheSante(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = FicheSanteSchema.parse(Object.fromEntries(formData));
    const r = await enregistrerFicheSanteCore(ctx, {
      eleveId: d.eleveId, groupeSanguin: d.groupeSanguin || undefined,
      allergies: d.allergies || undefined, traitementsEnCours: d.traitementsEnCours || undefined,
      antecedents: d.antecedents || undefined, medecinTraitant: d.medecinTraitant || undefined,
      telephoneUrgence: d.telephoneUrgence || undefined, contactUrgenceNom: d.contactUrgenceNom || undefined,
      autorisationTraitement: estCoche(d.autorisationTraitement),
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const VaccinationSchema = z.object({
  eleveId: idReq, vaccin: strReq,
  dateVaccination: optDate, dateRappel: optDate,
});

export async function enregistrerVaccination(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = VaccinationSchema.parse(Object.fromEntries(formData));
    const r = await enregistrerVaccinationCore(ctx, {
      eleveId: d.eleveId, vaccin: d.vaccin,
      dateVaccination: d.dateVaccination, dateRappel: d.dateRappel,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// COMMUNICATION + EXAMENS + RDV
// ====================================================================

const NotificationSchema = z.object({
  destinataireId: str.optional(), destinataireType: str.optional(),
  sujet: strReq, corps: strReq, canal: z.enum(['in_app', 'sms', 'email', 'push']).optional(),
});

export async function envoyerNotification(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = NotificationSchema.parse(Object.fromEntries(formData));
    const r = await envoyerNotificationCore(ctx, ecoleId, {
      destinataireId: d.destinataireId || undefined, destinataireType: d.destinataireType || undefined,
      sujet: d.sujet, corps: d.corps, canal: d.canal,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const NotificationMasseSchema = z.object({
  cible: strReq, // tous_personnel | tous_parents | classe:<id> | niveau:<id>
  sujet: strReq, corps: strReq,
});

export async function envoyerNotificationMasse(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = NotificationMasseSchema.parse(Object.fromEntries(formData));
    const r = await envoyerNotificationMasseCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const ModeleMessageSchema = z.object({ code: strReq, sujet: strReq, corps: strReq });

export async function creerModeleMessage(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = ModeleMessageSchema.parse(Object.fromEntries(formData));
    const r = await creerModeleMessageCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function inscrireElevesExamen(examenId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await inscrireElevesExamenCore(ctx, examenId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function envoyerConvocationsExamen(examenId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await envoyerConvocationsExamenCore(ctx, examenId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function saisirResultatExamen(inscriptionId: string, resultat: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await saisirResultatExamenCore(ctx, inscriptionId, resultat);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const CreneauRdvSchema = z.object({
  personnelId: idReq, date: dateReq,
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  lieu: str.optional(),
});

export async function ouvrirCreneauRdv(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = CreneauRdvSchema.parse(Object.fromEntries(formData));
    const r = await ouvrirCreneauRdvCore(ctx, { ...d, lieu: d.lieu || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const ReservationRdvSchema = z.object({
  creneauRdvId: idReq, eleveId: str.optional(), motif: str.optional(),
});

export async function reserverRdv(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = ReservationRdvSchema.parse(Object.fromEntries(formData));
    const r = await reserverRdvCore(ctx, {
      creneauRdvId: d.creneauRdvId, eleveId: d.eleveId || undefined, motif: d.motif || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function annulerRdv(rdvId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await annulerRdvCore(ctx, rdvId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// RGPD (F5 — export et effacement RÉELS, plus des tables vitrines)
// ====================================================================

export async function exporterDonneesEleve(eleveId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const { eleveDuTenant, logAction } = await import('@/lib/business/commun');
    const eleve = await eleveDuTenant(eleveId, ctx);
    const [notes, bulletins, presences, incidents, echeances, paiements, ficheSante, passages] = await Promise.all([
      db.note.findMany({ where: { eleveId }, include: { evaluation: true } }),
      db.bulletin.findMany({ where: { eleveId } }),
      db.presence.findMany({ where: { eleveId } }),
      db.incident.findMany({ where: { eleveId }, include: { sanctions: true } }),
      db.echeanceFrais.findMany({ where: { eleveId } }),
      db.paiement.findMany({ where: { eleveId } }),
      db.ficheSante.findUnique({ where: { eleveId } }),
      db.passageInfirmerie.findMany({ where: { eleveId } }),
    ]);
    const exportJson = JSON.stringify({
      genereLe: new Date().toISOString(),
      eleve, notes, bulletins, presences, incidents, echeances, paiements,
      ficheSante, passagesInfirmerie: passages,
    }, null, 2);
    const taille = Buffer.byteLength(exportJson, 'utf8');
    await db.exportDonnees.create({
      data: {
        ecoleId: eleve.ecoleId,
        utilisateurId: ctx.utilisateurId,
        cibleType: 'eleve',
        cibleId: eleveId,
        format: 'json',
        statut: 'genere',
        tailleOctets: taille,
        dateGeneration: new Date(),
      },
    });
    await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'rgpd.export_donnees', 'eleve', eleveId, { tailleOctets: taille });
    return { ok: true, json: exportJson, tailleOctets: taille };
  } catch (e) {
    return echec(e);
  }
}

const DemandeEffacementSchema = z.object({
  eleveId: idReq, motif: strReq, description: str.optional(),
});

export async function demanderEffacement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = DemandeEffacementSchema.parse(Object.fromEntries(formData));
    const { eleveDuTenant, logAction } = await import('@/lib/business/commun');
    const eleve = await eleveDuTenant(d.eleveId, ctx);
    const demande = await db.demandeEffacement.create({
      data: {
        ecoleId: eleve.ecoleId,
        utilisateurId: ctx.utilisateurId,
        cibleType: 'eleve',
        cibleId: d.eleveId,
        motif: d.motif,
        description: d.description || undefined,
        statut: 'recu',
      },
    });
    await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'rgpd.demande_effacement', 'eleve', d.eleveId, { demandeId: demande.id });
    revalidatePath('/');
    return { ok: true, demandeId: demande.id };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// F14 — pagination serveur : suite d'un dataset plafonné (whitelist)
// ====================================================================

type SuiteDef = {
  permission: string;
  charger: (ecoleId: string, depuis: number, prise: number) => Promise<unknown[]>;
};

const SUITES: Record<string, SuiteDef> = {
  eleves: {
    permission: 'eleves.lire',
    charger: (ecoleId, depuis, prise) => db.eleve.findMany({
      where: { ecoleId, deletedAt: null }, orderBy: { nom: 'asc' }, skip: depuis, take: prise,
      select: { id: true, matricule: true, nom: true, prenom: true, dateNaissance: true, sexe: true, statut: true, classeActuelleId: true },
    }),
  },
  paiements: {
    permission: 'finances.voir',
    charger: (ecoleId, depuis, prise) => db.paiement.findMany({ where: { ecoleId }, orderBy: { datePaiement: 'desc' }, skip: depuis, take: prise }),
  },
  echeances: {
    permission: 'finances.voir',
    charger: (ecoleId, depuis, prise) => db.echeanceFrais.findMany({ where: { eleve: { ecoleId } }, orderBy: { dateEcheance: 'asc' }, skip: depuis, take: prise, include: { frais: true, eleve: true } }),
  },
  notes: {
    permission: 'notes.saisir',
    charger: (_ecoleId, depuis, prise) => db.note.findMany({ orderBy: { dateSaisie: 'desc' }, skip: depuis, take: prise, include: { evaluation: { include: { matiere: true } } } }),
  },
  audit: {
    permission: 'admin.saas',
    charger: (ecoleId, depuis, prise) => db.auditLog.findMany({ where: { ecoleId }, orderBy: { dateAction: 'desc' }, skip: depuis, take: prise }),
  },
};

export async function chargerSuite(dataset: string, offset: number, take = 200): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const def = SUITES[dataset];
    if (!def) return { ok: false, error: 'Dataset inconnu.' };
    const { assertPermission } = await import('@/lib/business/commun');
    assertPermission(ctx, def.permission);
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(take) || take < 1 || take > 500) {
      return { ok: false, error: 'Paramètres de pagination invalides.' };
    }
    const ecoleId = await ecoleIdDuCtx(ctx);
    const lignes = await def.charger(ecoleId, offset, take);
    return { ok: true, lignes };
  } catch (e) {
    return echec(e);
  }
}
