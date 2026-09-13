'use server';

// ====================================================================
// ACTIONS ÉTABLISSEMENT — identité documentaire (logo, cachet, signature,
// contacts) + listes de cibles pour le module Documents.
// ====================================================================

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActionError } from '@/lib/business';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { avecRetryBdd } from '@/lib/retry-bdd';

type Ok = { ok: true; [k: string]: unknown };
type Err = { ok: false; error: string };
export type ActionResult = Ok | Err;

function echec(e: unknown): Err {
  if (e instanceof ActionError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) {
    const premier = e.issues[0];
    return { ok: false, error: `Champ invalide : ${premier?.path.join('.')} — ${premier?.message ?? ''}` };
  }
  console.error('[actions-etablissement]', e);
  return { ok: false, error: 'Une erreur inattendue est survenue.' };
}

// --------------------------------------------------------------------
// Identité documentaire : renseignée UNE fois, injectée dans TOUS les
// documents (en-têtes, pieds de page, signatures).
// --------------------------------------------------------------------

export async function majIdentiteEtablissement(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const ecoleId = session.utilisateur.ecoleId;
    if (!ecoleId) return { ok: false, error: 'Aucune école associée à votre compte.' };
    if (!session.permissions.has('admin.saas') && session.utilisateur.type !== 'super_admin') {
      return { ok: false, error: 'Réservé à la direction de l\'établissement.' };
    }

    const d = z.object({
      nom: z.string().min(2, 'Nom trop court'),
      adresse: z.string().optional(),
      ville: z.string().optional(),
      telephone: z.string().optional(),
      emailEcole: z.string().email('Email invalide').optional().or(z.literal('')),
      siteWeb: z.string().optional(),
      deviseOfficielle: z.string().optional(),
      couleurPrincipale: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale attendue').optional().or(z.literal('')),
      ninea: z.string().optional(),
      autorisation: z.string().optional(),
      affiliation: z.string().optional(),
    }).parse(Object.fromEntries(formData));

    const logo = formData.get('logoDataUrl');
    const cachet = formData.get('cachetDataUrl');
    const signature = formData.get('signatureDataUrl');
    for (const [nom, v] of [['Logo', logo], ['Cachet', cachet], ['Signature', signature]] as const) {
      if (typeof v === 'string' && v.length > 700_000) {
        return { ok: false, error: `${nom} trop volumineux (max ~500 Ko) : réduisez l'image.` };
      }
    }

    const identifiants = JSON.stringify({
      ninea: d.ninea || undefined,
      autorisation: d.autorisation || undefined,
      affiliation: d.affiliation || undefined,
    });

    await avecRetryBdd(() => db.ecole.update({
      where: { id: ecoleId },
      data: {
        nom: d.nom.trim(),
        adresse: d.adresse?.trim() || null,
        ville: d.ville?.trim() || null,
        telephone: d.telephone?.trim() || null,
        emailEcole: d.emailEcole || null,
        siteWeb: d.siteWeb?.trim() || null,
        deviseOfficielle: d.deviseOfficielle?.trim() || null,
        couleurPrincipale: d.couleurPrincipale || null,
        identifiantsLegaux: identifiants,
        ...(typeof logo === 'string' && logo.startsWith('data:image') ? { logoUrl: logo } : {}),
        ...(typeof cachet === 'string' && cachet.startsWith('data:image') ? { cachetUrl: cachet } : {}),
        ...(typeof signature === 'string' && signature.startsWith('data:image') ? { signatureUrl: signature } : {}),
      },
    }), 3, 400);

    revalidatePath('/');
    return { ok: true };
  } catch (e) { return echec(e); }
}

/** Prévisualisation de l'identité (pour le module Paramètres). */
export async function lireIdentiteEtablissement(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const ecoleId = session.utilisateur.ecoleId;
    if (!ecoleId) return { ok: false, error: 'Aucune école associée.' };
    const e = await avecRetryBdd(() => db.ecole.findUnique({ where: { id: ecoleId } }), 3, 300);
    if (!e) return { ok: false, error: 'École introuvable.' };
    let identifiants: any = {};
    try { identifiants = JSON.parse(e.identifiantsLegaux || '{}'); } catch { /* vide */ }
    return {
      ok: true,
      ecole: {
        nom: e.nom, adresse: e.adresse, ville: e.ville, telephone: e.telephone,
        emailEcole: e.emailEcole, siteWeb: e.siteWeb, deviseOfficielle: e.deviseOfficielle,
        couleurPrincipale: e.couleurPrincipale, logoUrl: e.logoUrl, cachetUrl: e.cachetUrl,
        signatureUrl: e.signatureUrl, ninea: identifiants.ninea, autorisation: identifiants.autorisation,
        affiliation: identifiants.affiliation,
      },
    };
  } catch (e) { return echec(e); }
}

// --------------------------------------------------------------------
// Catalogue documentaire (métadonnées pour l'UI — sans les fonctions)
// --------------------------------------------------------------------

export async function listerCatalogueDocuments(): Promise<ActionResult> {
  try {
    await requireSession();
    const { CATALOGUE } = await import('@/lib/documents/registre');
    return {
      ok: true,
      catalogue: CATALOGUE.map((m) => ({
        code: m.code, libelle: m.libelle, domaine: m.domaine, description: m.description,
        entete: m.entete, confidential: !!m.confidential, parametres: m.parametres,
      })),
    };
  } catch (e) { return echec(e); }
}

// --------------------------------------------------------------------
// Listes de cibles pour les formulaires du module Documents
// --------------------------------------------------------------------

export async function listerCiblesDocuments(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const ecoleId = session.utilisateur.ecoleId;
    if (!ecoleId) return { ok: false, error: 'Aucune école associée.' };
    const limite = 300;

    const [eleves, classes, periodes, personnels, paiements, incidents, candidatures, passages, evaluationsRh, bulletinsPaie] = await avecRetryBdd(() => Promise.all([
      db.eleve.findMany({ where: { ecoleId, deletedAt: null }, select: { id: true, prenom: true, nom: true, classeActuelle: { select: { libelle: true } } }, orderBy: [{ nom: 'asc' }, { prenom: 'asc' }], take: limite }),
      db.classe.findMany({ where: { ecoleId }, select: { id: true, libelle: true }, orderBy: { libelle: 'asc' }, take: 100 }),
      db.periode.findMany({ where: { ecoleId }, select: { id: true, libelle: true, anneeScolaireId: true }, orderBy: { dateDebut: 'asc' }, take: 30 }),
      db.personnel.findMany({ where: { ecoleId, deletedAt: null }, select: { id: true, prenom: true, nom: true, matricule: true }, orderBy: { nom: 'asc' }, take: limite }),
      db.paiement.findMany({ where: { ecoleId, annule: false }, select: { id: true, montant: true, datePaiement: true, referenceTransaction: true, eleve: { select: { prenom: true, nom: true } } }, orderBy: { datePaiement: 'desc' }, take: 100 }),
      (db as any).incident.findMany({ where: { eleve: { ecoleId } }, select: { id: true, dateHeure: true, type: true, gravite: true, eleve: { select: { prenom: true, nom: true } } }, orderBy: { dateHeure: 'desc' }, take: 60 }).catch(() => []),
      (db as any).candidatureAdmission.findMany({ where: { ecoleId }, select: { id: true, prenom: true, nom: true, statut: true }, orderBy: { dateSoumission: 'desc' }, take: 60 }).catch(() => []),
      (db as any).passageInfirmerie.findMany({ where: { ecoleId }, select: { id: true, datePassage: true, motif: true, eleve: { select: { prenom: true, nom: true } } }, orderBy: { datePassage: 'desc' }, take: 60 }).catch(() => []),
      (db as any).evaluationPersonnel.findMany({ where: { personnel: { ecoleId } }, select: { id: true, periode: true, personnel: { select: { prenom: true, nom: true } } }, orderBy: { dateEvaluation: 'desc' }, take: 60 }).catch(() => []),
      db.bulletinPaie.findMany({ where: { ecoleId }, select: { id: true, periode: true, statut: true, personnel: { select: { prenom: true, nom: true } } }, orderBy: { dateEdition: 'desc' }, take: 100 }),
    ]), 3, 500);

    const fmt = (d: Date | string) => new Date(d).toLocaleDateString('fr-FR');
    return {
      ok: true,
      cibles: {
        eleve: eleves.map((e: any) => ({ valeur: e.id, libelle: `${e.nom} ${e.prenom}${e.classeActuelle ? ' — ' + e.classeActuelle.libelle : ''}` })),
        classe: classes.map((c: any) => ({ valeur: c.id, libelle: c.libelle })),
        periode: periodes.map((p: any) => ({ valeur: p.id, libelle: p.libelle })),
        personnel: personnels.map((p: any) => ({ valeur: p.id, libelle: `${p.nom} ${p.prenom}${p.matricule ? ' — ' + p.matricule : ''}` })),
        paiement: paiements.map((p: any) => ({ valeur: p.id, libelle: `${fmt(p.datePaiement)} — ${(p.montant / 100).toLocaleString('fr-FR')} F — ${p.eleve?.nom ?? ''} ${p.eleve?.prenom ?? ''} ${p.referenceTransaction ? '(' + p.referenceTransaction + ')' : ''}` })),
        incident: (incidents ?? []).map((i: any) => ({ valeur: i.id, libelle: `${fmt(i.dateHeure)} — ${i.eleve?.nom ?? ''} ${i.eleve?.prenom ?? ''} — ${i.type} (${i.gravite})` })),
        candidature: (candidatures ?? []).map((c: any) => ({ valeur: c.id, libelle: `${c.nom} ${c.prenom} — ${c.statut}` })),
        passage: (passages ?? []).map((p: any) => ({ valeur: p.id, libelle: `${fmt(p.datePassage)} — ${p.eleve?.nom ?? ''} — ${(p.motif || '').slice(0, 40)}` })),
        evaluationRh: (evaluationsRh ?? []).map((e: any) => ({ valeur: e.id, libelle: `${e.periode} — ${e.personnel?.nom ?? ''} ${e.personnel?.prenom ?? ''}` })),
        bulletinPaie: bulletinsPaie.map((b: any) => ({ valeur: b.id, libelle: `${b.periode} — ${b.personnel?.nom ?? ''} ${b.personnel?.prenom ?? ''} (${b.statut})` })),
      },
    };
  } catch (e) { return echec(e); }
}
