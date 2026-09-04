'use server';

// ====================================================================
// SERVER ACTIONS — ANGLES MORTS (vague 2)
// Socle commun : ctxSession/echec/ActionResult identiques à index.ts.
// ====================================================================

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionError, Ctx } from '@/lib/business';
import { AuthError } from '@/lib/auth';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { versCentimes } from '@/lib/format';
import {
  // exploitation (A4, C2-C5, D5)
  changerMotDePasseCore, demanderReinitialisationCore, reinitialiserMotDePasseCore,
  reinitialiserMotDePasseAdminCore, activer2FAPourUtilisateurCore,
  marquerNotificationsLuesCore, revoquerSessionCore,
  ecolesAccessiblesCore, changerEcoleActiveCore, accorderAccesEcoleCore,
  traiterDemandeEffacementCore,
  // paie/compta (B1, B2)
  majConfigurationPaieCore, genererBulletinsPaieCore, traiterBulletinPaieCore, ajouterVariablePaieCore,
  creerEcritureCore, validerEcritureCore, genererEcrituresAutomatiquesCore, creerCompteComptableCore,
  // recrutement/admissions/transport (B3, B4, B5)
  creerOffreCore, creerCandidatureCore, avancerCandidatureCore, convertirCandidatCore,
  creerCandidatureAdmissionCore, avancerCandidatureAdmissionCore, saisirTestAdmissionCore, convertirAdmissionCore,
  creerLigneTransportCore, inscrireTransportCore, genererEcheancesServicesCore,
  // intégrations (B8, B9, B12)
  creerSignalementCore, ajouterSuiviSignalementCore, ajouterMesureProtectionCore, majStatutSignalementCore,
  creerPlanAccompagnementCore, ajouterObjectifPlanCore, majObjectifPlanCore, ajouterRevisionPlanCore,
  creerConversationCore, envoyerMessageCore, marquerConversationLueCore,
  creerAnnonceCore, publierAnnonceCore, creerTicketCore, repondreTicketCore, changerStatutTicketCore,
  creerWebhookCore, supprimerWebhookCore, creerApiTokenCore, revoquerApiTokenCore,
  majThemeEcoleCore, ajouterDomaineCore, verifierDomaineCore, majFeatureFlagEcoleCore,
  // pédagogie 2 (B10, B11, C7, C8)
  creerDevoirCore, publierEntreeCahierCore, creerEntreeCahierCore,
  saisirEvaluationsCompetenceCore, creerConseilCore, creerDeliberationCore, voterDeliberationCore, marquerPresenceConseilCore,
  creerDispenseCore, traiterDispenseCore,
  genererConvocationImprimableCore, marquerBulletinImprimableCore,
  // fins de flux (C6, C10)
  verifierRappelsVaccinationCore, statsAbsentéismeCore, relancerAbsencesCore,
} from '@/lib/business';
import { creerSauvegarde, restaurerSauvegarde } from '@/lib/sauvegarde';

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
  console.error('[action-angles-morts]', e);
  return { ok: false, error: 'Une erreur inattendue est survenue. L\'incident a été journalisé.' };
}

async function ctxSession(): Promise<Ctx> {
  const s = await requireSession();
  return { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions };
}

async function ecoleIdDuCtx(ctx: Ctx): Promise<string> {
  if (ctx.ecoleId) return ctx.ecoleId;
  const pivot = await db.ecole.findFirst({ where: { slug: 'vinci' }, select: { id: true } });
  if (!pivot) throw new ActionError('Aucune école de référence configurée.', 'CONFIG_MANQUANTE');
  return pivot.id;
}

const str = z.string().optional();
const strReq = z.string().trim().min(1, 'obligatoire');
const idReq = z.string().min(1, 'identifiant obligatoire');
const dateReq = z.coerce.date();
const numPos = z.coerce.number().positive();
const coche = z.union([z.literal('on'), z.literal('true'), z.literal('')]).optional();
const estCoche = (v: string | undefined) => v === 'on' || v === 'true';
const montantCentimes = z.coerce.number().refine((n) => Number.isFinite(n) && n > 0, 'montant invalide').transform(versCentimes).refine((c) => Number.isInteger(c) && c > 0, 'montant invalide');

// ====================================================================
// A1 — SAUVEGARDES
// ====================================================================

export async function creerSauvegardeAction(): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    if (ctx.type !== 'super_admin' && !ctx.permissions.has('admin.saas')) {
      return { ok: false, error: 'Réservé à la direction.' };
    }
    const r = await creerSauvegarde(db, 'manuelle', ctx.utilisateurId);
    revalidatePath('/');
    if (r.ok) return { ok: true, nomFichier: r.nomFichier, tailleOctets: r.tailleOctets };
    return { ok: false, error: r.erreur ?? 'Échec de sauvegarde.' };
  } catch (e) { return echec(e); }
}

export async function restaurerSauvegardeAction(nomFichier: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    if (ctx.type !== 'super_admin') return { ok: false, error: 'Réservé au super-administrateur (opération destructive).' };
    const r = await restaurerSauvegarde(db, nomFichier);
    return r.ok ? { ok: true } : { ok: false, error: r.erreur ?? 'Échec de restauration.' };
  } catch (e) { return echec(e); }
}

// ====================================================================
// A4 — MOTS DE PASSE
// ====================================================================

export async function changerMotDePasse(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ ancien: strReq, nouveau: strReq }).parse(Object.fromEntries(formData));
    await changerMotDePasseCore(ctx, d.ancien, d.nouveau);
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function demanderReinitialisation(email: string): Promise<ActionResult> {
  try {
    const d = z.string().email('email invalide').parse(email);
    const r = await demanderReinitialisationCore(d);
    revalidatePath('/');
    // En dev, le jeton est renvoyé (pour les tests) ; en prod il part par email
    return { ok: true, jeton: r.jetonId ?? undefined, envoyeParEmail: r.jetonId === null };
  } catch (e) { return echec(e); }
}

export async function reinitialiserMotDePasse(jeton: string, nouveau: string): Promise<ActionResult> {
  try {
    if (!jeton || nouveau.length < 8) return { ok: false, error: 'Lien invalide ou mot de passe trop court (8+ caractères).' };
    await reinitialiserMotDePasseCore(jeton, nouveau);
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function reinitialiserMotDePasseAdmin(utilisateurId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await reinitialiserMotDePasseAdminCore(ctx, utilisateurId);
    return { ok: true, motDePasseTemporaire: r.motDePasseTemporaire };
  } catch (e) { return echec(e); }
}

// ====================================================================
// C2-C5, D5 — SESSION, NOTIFICATIONS, MULTI-ÉCOLE, RGPD, 2FA ADMIN
// ====================================================================

export async function marquerNotificationsLues(ids?: string[]): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await marquerNotificationsLuesCore(ctx, ids);
    revalidatePath('/');
    return { ok: true, marquees: r.marquees };
  } catch (e) { return echec(e); }
}

export async function revoquerSession(sessionId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await revoquerSessionCore(ctx, sessionId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function activer2FAPourUtilisateur(utilisateurId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await activer2FAPourUtilisateurCore(ctx, utilisateurId);
    return { ok: true, secret: r.secret };
  } catch (e) { return echec(e); }
}

export async function ecolesAccessibles(): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const liste = await ecolesAccessiblesCore(s.utilisateur.id, s.utilisateur.ecoleId);
    return { ok: true, ecoles: liste };
  } catch (e) { return echec(e); }
}

export async function changerEcoleActive(ecoleId: string): Promise<ActionResult> {
  try {
    const s = await requireSession();
    const ctx: Ctx = { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions };
    await changerEcoleActiveCore(ctx, s.sessionId, ecoleId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function accorderAccesEcole(utilisateurId: string, ecoleId: string, roleLibelle?: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await accorderAccesEcoleCore(ctx, utilisateurId, ecoleId, roleLibelle);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function traiterDemandeEffacement(demandeId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await traiterDemandeEffacementCore(ctx, demandeId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ====================================================================
// B1 — PAIE
// ====================================================================

export async function genererBulletinsPaie(periode: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    if (!/^\d{4}-\d{2}$/.test(periode)) return { ok: false, error: 'Période invalide (AAAA-MM).' };
    const r = await genererBulletinsPaieCore(ctx, ecoleId, periode);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function traiterBulletinPaie(bulletinId: string, decision: 'valide' | 'paye'): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await traiterBulletinPaieCore(ctx, bulletinId, decision);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

const VariablePaieSchema = z.object({ personnelId: idReq, periode: z.string().regex(/^\d{4}-\d{2}$/), type: z.enum(['prime', 'indemnite', 'avantage', 'heure_sup']), libelle: strReq, montant: montantCentimes });

export async function ajouterVariablePaie(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = VariablePaieSchema.parse(Object.fromEntries(formData));
    await ajouterVariablePaieCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function majConfigurationPaie(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({
      tauxEmployeur: z.coerce.number().min(0).max(1),
      tauxSalarie: z.coerce.number().min(0).max(1),
    }).parse(Object.fromEntries(formData));
    await majConfigurationPaieCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ====================================================================
// B2 — COMPTABILITÉ
// ====================================================================

export async function creerCompteComptable(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({ numero: z.string().regex(/^\d{3,6}$/), libelle: strReq, type: z.enum(['actif', 'passif', 'produit', 'charge']) }).parse(Object.fromEntries(formData));
    await creerCompteComptableCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerEcriture(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    // Format : lignes en JSON [{compteId, libelle, debit(XOF), credit(XOF)}]
    const brut = String(formData.get('lignes') ?? '[]');
    const lignesBrutes = z.array(z.object({
      compteId: idReq, libelle: strReq,
      debit: z.coerce.number().min(0).default(0),
      credit: z.coerce.number().min(0).default(0),
    })).min(2).parse(JSON.parse(brut));
    const lignes = lignesBrutes.map((l) => ({ ...l, debit: versCentimes(l.debit), credit: versCentimes(l.credit) }));
    const d = z.object({ journalId: idReq, libelle: strReq, date: dateReq }).parse(Object.fromEntries(formData));
    const r = await creerEcritureCore(ctx, ecoleId, { ...d, lignes });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function validerEcriture(ecritureId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await validerEcritureCore(ctx, ecritureId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function genererEcrituresAutomatiques(): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await genererEcrituresAutomatiquesCore(ctx, ecoleId);
    revalidatePath('/');
    return { ok: true, creees: r.créées };
  } catch (e) { return echec(e); }
}

// ====================================================================
// B3 — RECRUTEMENT
// ====================================================================

export async function creerOffre(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({ poste: strReq, description: str, profilRecherche: str, typeContrat: z.enum(['CDI', 'CDD', 'Stage', 'Vacataire']), dateCloture: z.union([z.coerce.date(), z.literal(''), z.undefined()]) }).parse(Object.fromEntries(formData));
    await creerOffreCore(ctx, ecoleId, { ...d, description: d.description ?? '', profilRecherche: d.profilRecherche ?? '', dateCloture: d.dateCloture instanceof Date ? d.dateCloture : undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerCandidatureRecrutement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({ offreId: idReq, nom: strReq, prenom: strReq, email: z.string().email(), telephone: str, lettreMotivation: str, source: str }).parse(Object.fromEntries(formData));
    await creerCandidatureCore(ctx, ecoleId, { ...d, telephone: d.telephone || undefined, lettreMotivation: d.lettreMotivation || undefined, source: d.source || undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function avancerCandidature(candidatureId: string, etape: string, statut: 'valide' | 'refuse'): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    await avancerCandidatureCore(ctx, ecoleId, candidatureId, etape, statut);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function convertirCandidat(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({ candidatureId: idReq, dateEmbauche: dateReq, salaireBrut: z.coerce.number().min(0) }).parse(Object.fromEntries(formData));
    const r = await convertirCandidatCore(ctx, ecoleId, d.candidatureId, { dateEmbauche: d.dateEmbauche, salaireBrut: versCentimes(d.salaireBrut) });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ====================================================================
// B4 — ADMISSIONS
// ====================================================================

export async function creerCandidatureAdmission(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({
      nom: strReq, prenom: strReq, dateNaissance: dateReq, lieuNaissance: str,
      sexe: z.union([z.enum(['M', 'F']), z.literal('')]), email: z.string().email(), telephone: str,
      niveauId: str, parentNom: str, parentTelephone: str, etablissementOrigine: str,
    }).parse(Object.fromEntries(formData));
    await creerCandidatureAdmissionCore(ctx, ecoleId, {
      nom: d.nom, prenom: d.prenom, dateNaissance: d.dateNaissance, lieuNaissance: d.lieuNaissance || undefined,
      sexe: d.sexe || undefined, email: d.email, telephone: d.telephone || undefined,
      niveauId: d.niveauId || undefined, parentNom: d.parentNom || undefined,
      parentTelephone: d.parentTelephone || undefined, etablissementOrigine: d.etablissementOrigine || undefined,
    });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function avancerCandidatureAdmission(candidatureId: string, statut: 'test' | 'entretien' | 'admis' | 'refuse', commentaire?: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await avancerCandidatureAdmissionCore(ctx, candidatureId, statut, commentaire);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function saisirTestAdmission(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ candidatureId: idReq, matiere: strReq, note: z.coerce.number().min(0), sur: z.coerce.number().positive(), appreciation: str }).parse(Object.fromEntries(formData));
    await saisirTestAdmissionCore(ctx, d.candidatureId, { matiere: d.matiere, note: d.note, sur: d.sur, appreciation: d.appreciation || undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function convertirAdmission(candidatureId: string, classeId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await convertirAdmissionCore(ctx, candidatureId, classeId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ====================================================================
// B5/B6 — TRANSPORT + FACTURATION SERVICES
// ====================================================================

export async function creerLigneTransport(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({ nom: strReq, vehicule: str }).parse(Object.fromEntries(formData));
    await creerLigneTransportCore(ctx, ecoleId, { nom: d.nom, vehicule: d.vehicule || undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function inscrireTransport(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ eleveId: idReq, ligneId: idReq, arretMonteeId: str, arretDescenteId: str, tarif: z.coerce.number().positive() }).parse(Object.fromEntries(formData));
    await inscrireTransportCore(ctx, { eleveId: d.eleveId, ligneId: d.ligneId, arretMonteeId: d.arretMonteeId || undefined, arretDescenteId: d.arretDescenteId || undefined, tarif: versCentimes(d.tarif) });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function genererEcheancesServices(service: 'cantine' | 'transport', moisIso: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const mois = new Date(moisIso);
    if (isNaN(mois.getTime())) return { ok: false, error: 'Mois invalide.' };
    const r = await genererEcheancesServicesCore(ctx, ecoleId, service, mois);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ====================================================================
// B8/B9 — PROTECTION DE L'ENFANCE + PLANS D'ACCOMPAGNEMENT
// ====================================================================

export async function creerSignalement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({
      eleveId: str, type: strReq, description: strReq, gravite: z.enum(['information', 'preoccupant', 'grave', 'urgent']),
      source: z.enum(['enseignant', 'parent', 'eleve', 'tiers', 'anonyme']),
      dateFaits: z.union([z.coerce.date(), z.literal(''), z.undefined()]), lieuFaits: str,
    }).parse(Object.fromEntries(formData));
    await creerSignalementCore(ctx, {
      eleveId: d.eleveId || undefined, type: d.type, description: d.description, gravite: d.gravite, source: d.source,
      dateFaits: d.dateFaits instanceof Date ? d.dateFaits : undefined, lieuFaits: d.lieuFaits || undefined,
    });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function ajouterSuiviSignalement(signalementId: string, note: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await ajouterSuiviSignalementCore(ctx, signalementId, note);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function ajouterMesureProtection(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ signalementId: idReq, type: strReq, description: strReq }).parse(Object.fromEntries(formData));
    await ajouterMesureProtectionCore(ctx, d.signalementId, { type: d.type, description: d.description });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function majStatutSignalement(signalementId: string, statut: string, transfertCrip = false): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await majStatutSignalementCore(ctx, signalementId, statut, transfertCrip);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerPlanAccompagnement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ eleveId: idReq, type: z.enum(['PPS', 'PAP', 'PAI', 'PAPSI']), dateDebut: dateReq, dateFin: z.union([z.coerce.date(), z.literal(''), z.undefined()]), diagnostic: str, objectifsGeneraux: str }).parse(Object.fromEntries(formData));
    await creerPlanAccompagnementCore(ctx, { eleveId: d.eleveId, type: d.type, dateDebut: d.dateDebut, dateFin: d.dateFin instanceof Date ? d.dateFin : undefined, diagnostic: d.diagnostic || undefined, objectifsGeneraux: d.objectifsGeneraux || undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function ajouterObjectifPlan(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ planId: idReq, description: strReq, domaine: z.enum(['scolaire', 'social', 'comportemental', 'therapeutique']), echeance: z.union([z.coerce.date(), z.literal(''), z.undefined()]) }).parse(Object.fromEntries(formData));
    await ajouterObjectifPlanCore(ctx, d.planId, { description: d.description, domaine: d.domaine, echeance: d.echeance instanceof Date ? d.echeance : undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function majObjectifPlan(objectifId: string, atteint: boolean): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await majObjectifPlanCore(ctx, objectifId, atteint);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function ajouterRevisionPlan(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ planId: idReq, motif: strReq, constats: strReq, ajustements: str }).parse(Object.fromEntries(formData));
    await ajouterRevisionPlanCore(ctx, d.planId, { motif: d.motif, constats: d.constats, ajustements: d.ajustements || undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ====================================================================
// B7 — MESSAGERIE, ANNONCES, TICKETS
// ====================================================================

export async function creerConversation(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ titre: strReq, type: z.enum(['direct', 'groupe', 'annonce', 'classe']), participantIds: z.array(idReq).min(1) }).parse(JSON.parse(String(formData.get('donnees') ?? '{}')));
    await creerConversationCore(ctx, d);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function envoyerMessage(conversationId: string, contenu: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await envoyerMessageCore(ctx, conversationId, contenu);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function marquerConversationLue(conversationId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await marquerConversationLueCore(ctx, conversationId);
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerAnnonce(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ titre: strReq, contenu: strReq, cible: z.enum(['toute_ecole', 'cycle', 'niveau', 'classe', 'personnel', 'parents']), pinned: coche, publier: coche }).parse(Object.fromEntries(formData));
    await creerAnnonceCore(ctx, { titre: d.titre, contenu: d.contenu, cible: d.cible, pinned: estCoche(d.pinned), publier: estCoche(d.publier) });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function publierAnnonce(annonceId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await publierAnnonceCore(ctx, annonceId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerTicket(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ sujet: strReq, description: strReq, categorie: z.enum(['fonctionnel', 'technique', 'facturation', 'demande']), priorite: z.enum(['basse', 'normale', 'haute', 'critique']) }).parse(Object.fromEntries(formData));
    await creerTicketCore(ctx, d);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function repondreTicket(ticketId: string, message: string, interne = false): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await repondreTicketCore(ctx, ticketId, message, interne);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function changerStatutTicket(ticketId: string, statut: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await changerStatutTicketCore(ctx, ticketId, statut);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ====================================================================
// B12 — INTÉGRATIONS
// ====================================================================

export async function creerWebhook(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ url: z.string().url(), events: strReq }).parse(Object.fromEntries(formData));
    const events = d.events.split(',').map((e) => e.trim()).filter(Boolean);
    const r = await creerWebhookCore(ctx, { url: d.url, events });
    return { ok: true, webhookId: r.webhookId, secret: r.secret };
  } catch (e) { return echec(e); }
}

export async function supprimerWebhook(webhookId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await supprimerWebhookCore(ctx, webhookId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerApiToken(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ nom: strReq, description: str, scopes: str, joursValidite: z.coerce.number().int().min(1).max(365).optional() }).parse(Object.fromEntries(formData));
    const scopes = (d.scopes || 'eleves:read').split(',').map((s) => s.trim()).filter(Boolean);
    const r = await creerApiTokenCore(ctx, { nom: d.nom, description: d.description || undefined, scopes, joursValidite: d.joursValidite });
    revalidatePath('/');
    // Le token complet n'est affiché qu'une fois
    return { ok: true, apiTokenId: r.apiTokenId, token: r.token };
  } catch (e) { return echec(e); }
}

export async function revoquerApiToken(apiTokenId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await revoquerApiTokenCore(ctx, apiTokenId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function majThemeEcole(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({
      couleurPrimaire: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal('')]).optional(),
      couleurSecondaire: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal('')]).optional(),
      couleurAccent: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal('')]).optional(),
      couleurFond: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal('')]).optional(),
      nomProduit: str,
    }).parse(Object.fromEntries(formData));
    const nettoyé = Object.fromEntries(Object.entries(d).filter(([, v]) => v)) as Record<string, string>;
    await majThemeEcoleCore(ctx, nettoyé);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function ajouterDomaine(domaine: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await ajouterDomaineCore(ctx, domaine);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function verifierDomaine(domaineId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await verifierDomaineCore(ctx, domaineId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function majFeatureFlagEcole(code: string, actif: boolean): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await majFeatureFlagEcoleCore(ctx, code, actif);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ====================================================================
// B10/B11 — DEVOIRS, CAHIER, COMPÉTENCES, CONSEILS, DISPENSES
// ====================================================================

export async function creerDevoir(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ classeId: idReq, matiereId: str, intitule: strReq, description: str, dateRendu: dateReq, sur: z.coerce.number().positive().max(100).optional(), type: z.enum(['devoir', 'dm', 'projet', 'expose']).optional() }).parse(Object.fromEntries(formData));
    await creerDevoirCore(ctx, { classeId: d.classeId, matiereId: d.matiereId || undefined, intitule: d.intitule, description: d.description || undefined, dateRendu: d.dateRendu, sur: d.sur, type: d.type });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerEntreeCahier(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ classeId: idReq, matiereId: str, dateCours: dateReq, contenu: strReq, travailAFaire: str, publier: coche }).parse(Object.fromEntries(formData));
    await creerEntreeCahierCore(ctx, { classeId: d.classeId, matiereId: d.matiereId || undefined, dateCours: d.dateCours, contenu: d.contenu, travailAFaire: d.travailAFaire || undefined, publier: estCoche(d.publier) });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function publierEntreeCahier(entreeId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await publierEntreeCahierCore(ctx, entreeId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function saisirEvaluationsCompetence(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ periodeId: idReq, saisies: z.array(z.object({ eleveId: idReq, competenceId: idReq, niveauAcquisition: z.enum(['non_acquis', 'en_cours_d_acquisition', 'acquis', 'maitrise']), commentaire: str.optional() })).min(1) }).parse(JSON.parse(String(formData.get('donnees') ?? '{}')));
    await saisirEvaluationsCompetenceCore(ctx, d);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerConseilClasse(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ classeId: idReq, periodeId: idReq, date: dateReq, salle: str, membresIds: z.array(idReq).min(1) }).parse(JSON.parse(String(formData.get('donnees') ?? '{}')));
    await creerConseilCore(ctx, { classeId: d.classeId, periodeId: d.periodeId, date: d.date, salle: d.salle, membresIds: d.membresIds });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerDeliberation(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ conseilId: idReq, eleveId: idReq, decision: z.enum(['passage', 'redoublement', 'exclusion_orientation', 'doublement']), mention: z.union([z.enum(['encouragements', 'felicitations', 'tableau_honneur']), z.literal('')]).optional(), appreciationGenerale: str }).parse(Object.fromEntries(formData));
    await creerDeliberationCore(ctx, { conseilId: d.conseilId, eleveId: d.eleveId, decision: d.decision, mention: d.mention || undefined, appreciationGenerale: d.appreciationGenerale || undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function voterDeliberation(deliberationId: string, vote: 'pour' | 'contre' | 'abstention'): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await voterDeliberationCore(ctx, deliberationId, vote);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function creerDispense(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({ eleveId: idReq, matiereId: str, motif: z.enum(['medical', 'sportif', 'religieux', 'autre']), description: strReq, dateDebut: dateReq, dateFin: z.union([z.coerce.date(), z.literal(''), z.undefined()]) }).parse(Object.fromEntries(formData));
    await creerDispenseCore(ctx, { eleveId: d.eleveId, matiereId: d.matiereId || undefined, motif: d.motif, description: d.description, dateDebut: d.dateDebut, dateFin: d.dateFin instanceof Date ? d.dateFin : undefined });
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

export async function traiterDispense(dispenseId: string, decision: 'validee' | 'refusee'): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    await traiterDispenseCore(ctx, dispenseId, decision);
    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

// ====================================================================
// C6-C8 — IMPRIMABLES + RAPPELS
// ====================================================================

export async function genererConvocationImprimable(inscriptionId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await genererConvocationImprimableCore(ctx, inscriptionId);
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function marquerBulletinImprimable(bulletinId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await marquerBulletinImprimableCore(ctx, bulletinId);
    return { ok: true, bulletin: r.bulletin, pdfUrl: r.pdfUrl };
  } catch (e) { return echec(e); }
}

export async function verifierRappelsVaccination(): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    if (ctx.type !== 'super_admin' && !ctx.permissions.has('sante.gerer')) {
      return { ok: false, error: 'Réservé au personnel de santé.' };
    }
    const r = await verifierRappelsVaccinationCore();
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ====================================================================
// C10 — ABSENTÉISME
// ====================================================================

export async function statsAbsentéisme(periodeJours: number): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    if (!Number.isInteger(periodeJours) || periodeJours < 1 || periodeJours > 365) return { ok: false, error: 'Période invalide.' };
    const r = await statsAbsentéismeCore(ctx, periodeJours);
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function relancerAbsences(seuilAbsences: number, periodeJours: number): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    if (!Number.isInteger(seuilAbsences) || seuilAbsences < 1) return { ok: false, error: 'Seuil invalide.' };
    const r = await relancerAbsencesCore(ctx, seuilAbsences, periodeJours);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

// ====================================================================
// C1 — REDOUBLANTS À LA CLÔTURE (sélection dans l'UI)
// ====================================================================

export async function elevesPourCloture(): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    if (ctx.type !== 'super_admin' && !ctx.permissions.has('admin.saas')) {
      return { ok: false, error: 'Réservé à la direction.' };
    }
    const ecoleId = await ecoleIdDuCtx(ctx);
    const annee = await db.anneeScolaire.findFirst({ where: { ecoleId, active: true }, include: { classes: { include: { niveau: true } } } });
    if (!annee) return { ok: false, error: 'Aucune année active.' };
    const élèves = await db.eleve.findMany({
      where: { ecoleId, statut: 'actif', deletedAt: null },
      select: { id: true, nom: true, prenom: true, matricule: true, classeActuelle: { select: { id: true, libelle: true, niveau: { select: { libelle: true, ordre: true } } } } },
      orderBy: [{ classeActuelle: { niveau: { ordre: 'asc' } } }, { nom: 'asc' }],
    });
    return { ok: true, anneeId: annee.id, libelle: annee.libelle, eleves: élèves };
  } catch (e) { return echec(e); }
}

// ====================================================================
// RÉFÉRENTIELS D'ÉCOLE (déploiement réel) — matières + classes
// ====================================================================

export async function creerMatiere(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const ecoleId = await ecoleIdDuCtx(ctx);
    const d = z.object({ code: strReq, libelle: strReq, coefficient: z.coerce.number().positive().max(10).optional() }).parse(Object.fromEntries(formData));
    const r = await (await import('@/lib/business')).creerMatiereCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}

export async function creerClasse(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = z.object({
      niveauId: idReq, code: strReq, libelle: strReq,
      capaciteMax: z.coerce.number().int().min(1).max(2000).optional(),
      enseignantPrincipalId: str.optional(),
    }).parse(Object.fromEntries(formData));
    const r = await (await import('@/lib/business')).creerClasseCore(ctx, {
      niveauId: d.niveauId, code: d.code, libelle: d.libelle,
      capaciteMax: d.capaciteMax, enseignantPrincipalId: d.enseignantPrincipalId || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) { return echec(e); }
}
