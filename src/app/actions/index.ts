'use server';

// ====================================================================
// ACTIONS SERVEUR — adaptateur HTTP de la couche métier.
// Chaque action : session OBLIGATOIRE → permission RBAC → validation
// zod des FormData → contrôle de tenant (dans le métier) → résultat
// typé { ok: true, ... } | { ok: false, error: string }.
// Aucune exception ne fuit vers le client : tout est catché.
// ====================================================================

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession, tenterConnexion, detruireSessionCourante, AuthError } from '@/lib/auth';
import {
  Ctx,
  ActionError,
  inscrireEleveCore,
  ajouterBesoinSpecifiqueCore,
  ajouterAmenagementCore,
  activerConsentementPortailEleveCore,
  creerEvaluationCore,
  saisirNotesCore,
  genererBulletinCore,
  changerStatutBulletinCore,
  saisirAppelCore,
  encaisserPaiementCore,
  creerFraisCore,
  genererEcheancesClasseCore,
  validerDepenseCore,
  enregistrerDepenseCore,
  enregistrerMouvementStockCore,
  declarerIncidentCore,
  sanctionnerCore,
  sortieEleveCore,
  enregistrerVisiteurCore,
  envoyerNotificationCore,
  creerModeleMessageCore,
  creerSalleCore,
  ajouterCalendrierCore,
  ouvrirCreneauRdvCore,
  inscrireElevesExamenCore,
  envoyerConvocationsExamenCore,
  saisirResultatExamenCore,
  creerEcoleClientCore,
  changerStatutEcoleCore,
  creerPlanTarifaireCore,
  demanderCongeCore,
  traiterCongeCore,
  assignerRemplacementCore,
  inscrireCantineCore,
  preterLivreCore,
  retournerLivreCore,
  attribuerManuelCore,
  creerCreneauEdtCore,
  cloturerAnneeScolaireCore,
  enregistrerPassageInfirmerieCore,
  enregistrerFicheSanteCore,
  enregistrerVaccinationCore,
} from '@/lib/business';
import { getDirectionUserId } from '@/lib/business/commun';

type Ok = { ok: true; [k: string]: unknown };
type Err = { ok: false; error: string };
export type ActionResult = Ok | Err;

const ECOLE_DEMO_SLUG = 'vinci';

function echec(error: unknown): Err {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  if (error instanceof ActionError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) {
    const premier = (error as z.ZodError).issues[0];
    return { ok: false, error: `Champ invalide : ${premier?.path.join('.') || 'formulaire'} — ${premier?.message ?? ''}` };
  }
  console.error('[action] erreur inattendue:', error);
  return { ok: false, error: 'Une erreur inattendue est survenue. L\'incident a été journalisé.' };
}

async function ctxSession(): Promise<Ctx> {
  const s = await requireSession();
  return { utilisateurId: s.utilisateur.id, ecoleId: s.utilisateur.ecoleId, type: s.utilisateur.type, permissions: s.permissions };
}

async function ecoleIdDuCtx(ctx: Ctx): Promise<string> {
  if (ctx.ecoleId) return ctx.ecoleId;
  // super_admin éditeur : actions portant sur l'école démo
  const ecole = await (await import('@/lib/db')).db.ecole.findFirst({ where: { slug: ECOLE_DEMO_SLUG } });
  if (!ecole) throw new ActionError('École démo introuvable.', 'INTROUVABLE');
  return ecole.id;
}

// Helpers zod
const str = z.string().trim();
const strReq = z.string().trim().min(1, 'obligatoire');
const idReq = z.string().min(1, 'identifiant obligatoire');
const numPos = z.coerce.number().positive('doit être positif');
const numPosInt = z.coerce.number().int('doit être un entier').positive('doit être positif');
const dateReq = z.coerce.date();
const optDate = z.union([z.literal(''), z.undefined(), z.coerce.date()]).transform((v) => (v === '' || v === undefined ? undefined : (v as Date)));

// ====================================================================
// AUTHENTIFICATION
// ====================================================================

const LoginSchema = z.object({ email: z.string().trim().email('email invalide'), motDePasse: z.string().min(1) });

export async function connexion(formData: FormData): Promise<ActionResult> {
  try {
    const { email, motDePasse } = LoginSchema.parse({
      email: formData.get('email'),
      motDePasse: formData.get('motDePasse'),
    });
    const res = await tenterConnexion(email, motDePasse);
    if (!res.ok) return { ok: false, error: res.erreur };
    revalidatePath('/');
    return { ok: true };
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

// ====================================================================
// SaaS LAYER
// ====================================================================

const EcoleClientSchema = z.object({
  nom: strReq,
  slug: strReq,
  planId: z.string().optional(),
  pays: str.default('SN'),
  devise: str.default('XOF'),
});

export async function creerEcoleClient(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const input = EcoleClientSchema.parse(Object.fromEntries(formData));
    const r = await creerEcoleClientCore(ctx, input);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const StatutEcoleSchema = z.object({ statut: z.enum(['essai', 'actif', 'suspendu', 'resilie']) });

export async function changerStatutEcole(ecoleId: string, statut: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const { statut: st } = StatutEcoleSchema.parse({ statut });
    await changerStatutEcoleCore(ctx, ecoleId, st);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return echec(e);
  }
}

const PlanSchema = z.object({
  nom: strReq,
  prixMensuel: z.coerce.number().min(0),
  prixAnnuel: z.coerce.number().min(0),
  devise: str.default('XOF'),
  dureeEssaiJours: z.coerce.number().int().min(0).max(365).default(14),
  modules: z.string().optional(),
});

export async function creerPlanTarifaire(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = PlanSchema.parse(Object.fromEntries(formData));
    const r = await creerPlanTarifaireCore(ctx, {
      nom: d.nom,
      prixMensuel: d.prixMensuel,
      prixAnnuel: d.prixAnnuel,
      devise: d.devise,
      dureeEssaiJours: d.dureeEssaiJours,
      modules: d.modules ? d.modules.split(',').map((s) => s.trim()).filter(Boolean) : [],
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// ÉLÈVES
// ====================================================================

const EleveSchema = z.object({
  nom: strReq,
  prenom: strReq,
  dateNaissance: dateReq,
  lieuNaissance: str.optional(),
  sexe: z.enum(['M', 'F']),
  classeId: z.string().optional(),
});

export async function inscrireEleve(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = EleveSchema.parse({
      nom: formData.get('nom'),
      prenom: formData.get('prenom'),
      dateNaissance: formData.get('dateNaissance'),
      lieuNaissance: formData.get('lieuNaissance') ?? '',
      sexe: formData.get('sexe') ?? 'M',
      classeId: formData.get('classeId') ?? '',
    });
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await inscrireEleveCore(ctx, ecoleId, {
      ...d,
      classeId: d.classeId || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const BesoinSchema = z.object({
  eleveId: idReq,
  type: strReq,
  description: strReq,
  dateDiagnostic: optDate,
});

export async function ajouterBesoinSpecifique(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = BesoinSchema.parse({
      eleveId: formData.get('eleveId'),
      type: formData.get('type'),
      description: formData.get('description'),
      dateDiagnostic: formData.get('dateDiagnostic') ?? '',
    });
    const r = await ajouterBesoinSpecifiqueCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const AmenagementSchema = z.object({
  eleveId: idReq,
  besoinSpecifiqueId: z.string().optional(),
  typeAmenagement: strReq,
  description: strReq,
  dateDebut: dateReq,
});

export async function ajouterAmenagement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = AmenagementSchema.parse({
      eleveId: formData.get('eleveId'),
      besoinSpecifiqueId: formData.get('besoinSpecifiqueId') ?? '',
      typeAmenagement: formData.get('typeAmenagement'),
      description: formData.get('descriptionAmenagement'),
      dateDebut: formData.get('dateDebut'),
    });
    const r = await ajouterAmenagementCore(ctx, { ...d, besoinSpecifiqueId: d.besoinSpecifiqueId || undefined });
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

// ====================================================================
// PÉDAGOGIQUE
// ====================================================================

const EvaluationSchema = z.object({
  classeId: idReq,
  matiereId: idReq,
  enseignantId: idReq,
  periodeId: idReq,
  type: str.default('devoir'),
  intitule: strReq,
  date: dateReq,
  sur: numPos.default(20),
  coefficient: numPos.default(1),
});

export async function creerEvaluation(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = EvaluationSchema.parse(Object.fromEntries(formData));
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await creerEvaluationCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function saisirNotes(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const evaluationId = idReq.parse(formData.get('evaluationId'));
    const notes: Array<{ eleveId: string; valeur?: number; absent?: boolean }> = [];
    for (const [key, value] of Array.from(formData.entries())) {
      if (!key.startsWith('note_')) continue;
      const eleveId = key.replace('note_', '');
      const raw = String(value).trim();
      if (!raw) continue;
      if (raw.toLowerCase() === 'abs') {
        notes.push({ eleveId, absent: true });
      } else {
        notes.push({ eleveId, valeur: z.coerce.number().parse(raw) });
      }
    }
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
    const d = BulletinSchema.parse({
      eleveId: formData.get('eleveId'),
      periodeId: formData.get('periodeId'),
      classeId: formData.get('classeId'),
    });
    const r = await genererBulletinCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function changerStatutBulletin(bulletinId: string, statut: string, role: 'pp' | 'direction'): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const st = z.string().regex(/^[a-z_]+$/).parse(statut);
    await changerStatutBulletinCore(ctx, bulletinId, st, role);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// PRÉSENCES
// ====================================================================

export async function saisirAppel(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const seanceId = idReq.parse(formData.get('seanceId'));
    const presences: Array<{ eleveId: string; statut: string; minuteRetard?: number; motif?: string }> = [];
    for (const [key, value] of Array.from(formData.entries())) {
      if (!key.startsWith('presence_')) continue;
      const eleveId = key.replace('presence_', '');
      const statut = String(value);
      if (!statut) continue;
      presences.push({ eleveId, statut, motif: String(formData.get(`motif_${eleveId}`) ?? '') });
    }
    const r = await saisirAppelCore(ctx, { seanceId, presences });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// FINANCES
// ====================================================================

const PaiementSchema = z.object({
  eleveId: idReq,
  montant: numPos,
  modePaiement: z.enum(['espece', 'cheque', 'virement', 'carte', 'mobile_money']),
  reference: z.string().optional(),
});

export async function encaisserPaiement(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = PaiementSchema.parse(Object.fromEntries(formData));
    const r = await encaisserPaiementCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const FraisSchema = z.object({
  libelle: strReq,
  type: strReq,
  montant: numPos,
  periodicite: str.default('unique'),
  niveauId: z.string().optional(),
});

export async function creerFrais(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = FraisSchema.parse(Object.fromEntries(formData));
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await creerFraisCore(ctx, ecoleId, { ...d, niveauId: d.niveauId || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const EcheancesSchema = z.object({ fraisId: idReq, classeId: idReq, dateEcheance: dateReq });

export async function genererEcheancesClasse(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = EcheancesSchema.parse(Object.fromEntries(formData));
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
    await validerDepenseCore(ctx, depenseId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return echec(e);
  }
}

const DepenseSchema = z.object({
  categorie: strReq,
  description: str.default(''),
  montant: numPos,
  dateDepense: dateReq,
  fournisseur: z.string().optional(),
});

export async function enregistrerDepense(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = DepenseSchema.parse(Object.fromEntries(formData));
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await enregistrerDepenseCore(ctx, ecoleId, { ...d, fournisseur: d.fournisseur || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const MouvementStockSchema = z.object({
  articleId: idReq,
  type: z.enum(['entree', 'sortie'], { error: 'type doit être entree ou sortie' }),
  quantite: numPosInt,
  motif: z.string().optional(),
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

// ====================================================================
// VIE SCOLAIRE & SÉCURITÉ
// ====================================================================

const IncidentSchema = z.object({
  eleveId: idReq,
  dateHeure: dateReq,
  lieu: z.string().optional(),
  type: strReq,
  description: strReq,
  gravite: z.enum(['leger', 'modere', 'grave', 'tres_grave']),
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

const SanctionSchema = z.object({ incidentId: idReq, type: strReq, description: str.default('') });

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

const SortieSchema = z.object({
  eleveId: idReq,
  date: dateReq,
  heure: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  autorisationId: z.string().optional(),
  recupereParNom: strReq,
  validationExceptionnelle: z.boolean().optional(),
  motifException: z.string().optional(),
});

export async function sortieEleve(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = SortieSchema.parse({
      eleveId: formData.get('eleveId'),
      date: formData.get('date'),
      heure: formData.get('heure'),
      autorisationId: formData.get('autorisationId') ?? '',
      recupereParNom: formData.get('recupereParNom'),
      validationExceptionnelle: formData.get('validationExceptionnelle') === 'on',
      motifException: formData.get('motifException') ?? '',
    });
    const r = await sortieEleveCore(ctx, {
      ...d,
      autorisationId: d.autorisationId || undefined,
      motifException: d.motifException || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const VisiteurSchema = z.object({ nom: strReq, motif: strReq, pieceVerifiee: z.boolean() });

export async function enregistrerVisiteur(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = VisiteurSchema.parse({
      nom: formData.get('nom'),
      motif: formData.get('motif'),
      pieceVerifiee: formData.get('pieceVerifiee') === 'on',
    });
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await enregistrerVisiteurCore(ctx, ecoleId, { nom: d.nom, motifVisite: d.motif, pieceVerifiee: d.pieceVerifiee });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// SALLES / CALENDRIER / RDV
// ====================================================================

const SalleSchema = z.object({
  nom: strReq,
  type: strReq,
  capacite: numPosInt,
  equipements: z.string().optional(),
});

export async function creerSalle(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = SalleSchema.parse(Object.fromEntries(formData));
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await creerSalleCore(ctx, ecoleId, {
      nom: d.nom,
      type: d.type,
      capacite: d.capacite,
      equipements: d.equipements ? d.equipements.split(',').map((s) => s.trim()).filter(Boolean) : [],
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const CalendrierSchema = z.object({
  type: strReq,
  libelle: strReq,
  dateDebut: dateReq,
  dateFin: dateReq,
});

export async function ajouterCalendrier(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = CalendrierSchema.parse(Object.fromEntries(formData));
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await ajouterCalendrierCore(ctx, ecoleId, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const CreneauRdvSchema = z.object({
  personnelId: idReq,
  date: dateReq,
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  lieu: str.default('presentiel'),
});

export async function ouvrirCreneauRdv(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = CreneauRdvSchema.parse(Object.fromEntries(formData));
    const r = await ouvrirCreneauRdvCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// EXAMENS OFFICIELS
// ====================================================================

export async function inscrireElevesExamen(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const examenId = idReq.parse(formData.get('examenId'));
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
    await saisirResultatExamenCore(ctx, inscriptionId, resultat);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// COMMUNICATION
// ====================================================================

const NotificationSchema = z.object({
  destinataireId: z.string().optional(),
  destinataireType: str.default('personnel'),
  sujet: strReq,
  corps: strReq,
  canal: str.default('in_app'),
});

export async function envoyerNotification(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = NotificationSchema.parse(Object.fromEntries(formData));
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await envoyerNotificationCore(ctx, ecoleId, { ...d, destinataireId: d.destinataireId || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const ModeleSchema = z.object({
  code: strReq,
  sujet: strReq,
  corps: strReq,
  canaux: str.default('in_app'),
});

export async function creerModeleMessage(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = ModeleSchema.parse(Object.fromEntries(formData));
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await creerModeleMessageCore(ctx, ecoleId, {
      code: d.code,
      sujet: d.sujet,
      corps: d.corps,
      canaux: d.canaux.split(',').map((s) => s.trim()).filter(Boolean),
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// RH (P2)
// ====================================================================

const DemandeCongeSchema = z.object({
  personnelId: idReq,
  type: z.enum(['annuel', 'maladie', 'maternite', 'exceptionnel']),
  dateDebut: dateReq,
  dateFin: dateReq,
  motif: z.string().optional(),
});

export async function demanderConge(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = DemandeCongeSchema.parse(Object.fromEntries(formData));
    const r = await demanderCongeCore(ctx, { ...d, motif: d.motif || undefined });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function traiterConge(congeId: string, decision: 'valide' | 'refuse'): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const dec = z.enum(['valide', 'refuse']).parse(decision);
    await traiterCongeCore(ctx, congeId, dec);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return echec(e);
  }
}

const RemplacementSchema = z.object({
  congeId: idReq,
  personnelRemplacantId: idReq,
  dateDebut: dateReq,
  dateFin: dateReq,
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

// ====================================================================
// SERVICES (P2)
// ====================================================================

const CantineSchema = z.object({
  eleveId: idReq,
  jours: strReq,
  tarifJournalier: numPos,
});

export async function inscrireCantine(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = CantineSchema.parse(Object.fromEntries(formData));
    const jours = d.jours.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n));
    const r = await inscrireCantineCore(ctx, { eleveId: d.eleveId, joursSemaine: jours, tarifJournalier: d.tarifJournalier });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const PretSchema = z.object({ livreId: idReq, eleveId: idReq, dureeJours: numPosInt.default(14) });

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

const AttributionManuelSchema = z.object({ manuelScolaireId: idReq, eleveId: idReq, etatRemise: z.enum(['bon', 'usage', 'endommage']).default('bon') });

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

// ====================================================================
// EMPLOI DU TEMPS & ANNÉE SCOLAIRE (P2)
// ====================================================================

const CreneauEdtSchema = z.object({
  classeId: z.string().optional(),
  matiereId: z.string().optional(),
  enseignantId: z.string().optional(),
  salleId: z.string().optional(),
  jour: z.enum(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  recurrenceRule: z.string().optional(),
  dateDebut: dateReq,
});

export async function creerCreneauEdt(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = CreneauEdtSchema.parse(Object.fromEntries(formData));
    const ecoleId = await ecoleIdDuCtx(ctx);
    const r = await creerCreneauEdtCore(ctx, ecoleId, {
      ...d,
      classeId: d.classeId || undefined,
      matiereId: d.matiereId || undefined,
      enseignantId: d.enseignantId || undefined,
      salleId: d.salleId || undefined,
      recurrenceRule: d.recurrenceRule || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

export async function cloturerAnneeScolaire(anneeId: string): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const r = await cloturerAnneeScolaireCore(ctx, anneeId);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// ====================================================================
// SANTÉ & INFIRMERIE (P2)
// ====================================================================

const PassageInfirmerieSchema = z.object({
  eleveId: idReq,
  motif: strReq,
  symptomes: z.string().optional(),
  soinsAdministres: z.string().optional(),
  temperature: z.coerce.number().optional(),
  issue: z.enum(['retour_classe', 'parents_contactes', 'depart_hopital', 'retour_domicile']).default('retour_classe'),
  notifierParents: z.boolean().optional(),
});

export async function enregistrerPassageInfirmerie(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = PassageInfirmerieSchema.parse({
      eleveId: formData.get('eleveId'),
      motif: formData.get('motif'),
      symptomes: formData.get('symptomes') ?? '',
      soinsAdministres: formData.get('soinsAdministres') ?? '',
      temperature: formData.get('temperature') || undefined,
      issue: formData.get('issue') ?? 'retour_classe',
      notifierParents: formData.get('notifierParents') === 'on',
    });
    const r = await enregistrerPassageInfirmerieCore(ctx, {
      ...d,
      symptomes: d.symptomes || undefined,
      soinsAdministres: d.soinsAdministres || undefined,
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const FicheSanteSchema = z.object({
  eleveId: idReq,
  groupeSanguin: z.enum(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().optional(),
  traitementsEnCours: z.string().optional(),
  antecedents: z.string().optional(),
  medecinTraitant: z.string().optional(),
  telephoneUrgence: z.string().optional(),
  contactUrgenceNom: z.string().optional(),
  autorisationTraitement: z.boolean().optional(),
});

export async function enregistrerFicheSante(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = FicheSanteSchema.parse(Object.fromEntries(formData));
    const r = await enregistrerFicheSanteCore(ctx, {
      ...d,
      groupeSanguin: d.groupeSanguin || undefined,
      allergies: d.allergies || undefined,
      traitementsEnCours: d.traitementsEnCours || undefined,
      antecedents: d.antecedents || undefined,
      medecinTraitant: d.medecinTraitant || undefined,
      telephoneUrgence: d.telephoneUrgence || undefined,
      contactUrgenceNom: d.contactUrgenceNom || undefined,
      autorisationTraitement: formData.get('autorisationTraitement') === 'on',
    });
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

const VaccinationSchema = z.object({
  eleveId: idReq,
  vaccin: strReq,
  dateVaccination: optDate,
  dateRappel: optDate,
});

export async function enregistrerVaccination(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await ctxSession();
    const d = VaccinationSchema.parse({
      eleveId: formData.get('eleveId'),
      vaccin: formData.get('vaccin'),
      dateVaccination: formData.get('dateVaccination') ?? '',
      dateRappel: formData.get('dateRappel') ?? '',
    });
    const r = await enregistrerVaccinationCore(ctx, d);
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    return echec(e);
  }
}

// Compatibilité : la direction reste ciblable par les modules UI.
export { getDirectionUserId };

// Le paramètre dirUserId historique est remplacé par la session : les
// actions ci-dessus l'ignorent volontairement (source = requireSession).
