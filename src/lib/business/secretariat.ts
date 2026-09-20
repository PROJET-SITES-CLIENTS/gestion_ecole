// ====================================================================
// SECRÉTARIAT — complément : checklist dossier, registre courrier, réinscriptions
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction } from './commun';

/** Pièces standard exigées à l'inscription (checklist auto-créée). */
export const PIECES_DOSSIER_STANDARD = [
  'acte_naissance',
  'certificat_medical',
  'photos_identite',
  'carnet_vaccination',
  'dernier_bulletin',
] as const;

export const LIBELLES_PIECES: Record<string, string> = {
  acte_naissance: "Acte de naissance",
  certificat_medical: 'Certificat médical',
  photos_identite: "Photos d'identité",
  carnet_vaccination: 'Carnet de vaccination',
  dernier_bulletin: 'Dernier bulletin de notes',
  certificat_transfert: 'Certificat de transfert (élève venant d’une autre école)',
};

/** Crée la checklist standard d'un élève (idempotent, appelé à l'inscription). */
export async function initialiserPiecesDossier(ecoleId: string, eleveId: string, tx: any) {
  await tx.pieceDossier.createMany({
    data: PIECES_DOSSIER_STANDARD.map((type) => ({ ecoleId, eleveId, type, statut: 'manquante' })),
    skipDuplicates: true,
  });
}

export async function basculerPieceDossierCore(ctx: Ctx, pieceId: string, statut: 'manquante' | 'recue', remarque?: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const piece = await db.pieceDossier.findUnique({ where: { id: pieceId }, include: { eleve: true } });
  if (!piece) throw new ActionError('Pièce introuvable.', 'INTROUVABLE');
  assertTenant(piece.ecoleId, ctx, 'Cette pièce');
  const p = await db.pieceDossier.update({
    where: { id: pieceId },
    data: { statut, dateReception: statut === 'recue' ? new Date() : null, remarque: remarque?.trim() || null },
  });
  await logAction(db, piece.ecoleId, ctx.utilisateurId, 'dossier.piece', 'piece_dossier', pieceId, { statut, eleve: `${piece.eleve.prenom} ${piece.eleve.nom}` });
  return { pieceId: p.id, statut: p.statut };
}

export async function ajouterPieceExigeeCore(ctx: Ctx, eleveId: string, type: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await db.eleve.findUnique({ where: { id: eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  if (!type.trim()) throw new ActionError('Type de pièce obligatoire.', 'CHAMP_MANQUANT');
  const existe = await db.pieceDossier.findUnique({ where: { eleveId_type: { eleveId, type: type.trim() } } });
  if (existe) throw new ActionError('Cette pièce est déjà suivie.', 'DEJA_EXISTANT');
  const p = await db.pieceDossier.create({ data: { ecoleId: eleve.ecoleId, eleveId, type: type.trim(), statut: 'manquante' } });
  return { pieceId: p.id };
}

// --------------------------------------------------------------------
// Registre du courrier entrant/sortant
// --------------------------------------------------------------------

export type CourrierInput = {
  direction: 'entrant' | 'sortant';
  type?: string;
  objet: string;
  correspondant: string;
};

export async function enregistrerCourrierCore(ctx: Ctx, ecoleId: string, input: CourrierInput) {
  assertPermission(ctx, 'eleves.ecrire');
  if (!['entrant', 'sortant'].includes(input.direction)) throw new ActionError('Direction invalide (entrant ou sortant).', 'CHAMP_INVALIDE');
  if (!input.objet?.trim()) throw new ActionError("L'objet est obligatoire.", 'CHAMP_MANQUANT');
  if (!input.correspondant?.trim()) throw new ActionError(input.direction === 'entrant' ? "L'expéditeur est obligatoire." : 'Le destinataire est obligatoire.', 'CHAMP_MANQUANT');
  // Référence séquentielle par école : C-ENT-0001 / C-SOR-0001
  const prefixe = input.direction === 'entrant' ? 'C-ENT' : 'C-SOR';
  const nb = await db.courrier.count({ where: { ecoleId, direction: input.direction } });
  const reference = `${prefixe}-${String(nb + 1).padStart(4, '0')}`;
  const c = await db.courrier.create({
    data: {
      ecoleId, reference, direction: input.direction,
      type: input.type || 'courrier_simple',
      objet: input.objet.trim(), correspondant: input.correspondant.trim(),
      enregistreParId: ctx.utilisateurId,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'courrier.enregistrement', 'courrier', c.id, { reference, direction: input.direction });
  return { courrierId: c.id, reference };
}

export async function traiterCourrierCore(ctx: Ctx, courrierId: string, commentaire?: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const c = await db.courrier.findUnique({ where: { id: courrierId } });
  if (!c) throw new ActionError('Courrier introuvable.', 'INTROUVABLE');
  assertTenant(c.ecoleId, ctx, 'Ce courrier');
  if (c.traite) throw new ActionError('Courrier déjà traité.', 'DEJA_TRAITE');
  const u = await db.courrier.update({
    where: { id: courrierId },
    data: { traite: true, dateTraitement: new Date(), commentaire: commentaire?.trim() || null },
  });
  await logAction(db, c.ecoleId, ctx.utilisateurId, 'courrier.traitement', 'courrier', courrierId, { reference: c.reference });
  return { courrierId: u.id };
}

// --------------------------------------------------------------------
// Réinscriptions (campagne de rentrée)
// --------------------------------------------------------------------

export async function enregistrerReinscriptionCore(ctx: Ctx, input: { eleveId: string; classeVoulueId?: string; fraisPayes?: boolean }) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  if (eleve.statut !== 'actif') throw new ActionError('Seul un élève actif peut être réinscrit.', 'STATUT_INVALIDE');
  const anneeActive = await db.anneeScolaire.findFirst({ where: { ecoleId: eleve.ecoleId, active: true } });
  if (!anneeActive) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');
  // Idempotent par (élève, année)
  const existante = await db.reinscription.findUnique({
    where: { eleveId_anneeScolaireId: { eleveId: input.eleveId, anneeScolaireId: anneeActive.id } },
  });
  if (existante) {
    const r = await db.reinscription.update({
      where: { id: existante.id },
      data: {
        ...(input.classeVoulueId ? { classeVoulueId: input.classeVoulueId } : {}),
        ...(input.fraisPayes !== undefined ? { fraisPayes: input.fraisPayes } : {}),
      },
    });
    return { reinscriptionId: r.id, dejaInscrit: true };
  }
  const r = await db.reinscription.create({
    data: {
      ecoleId: eleve.ecoleId, eleveId: input.eleveId, anneeScolaireId: anneeActive.id,
      classeVoulueId: input.classeVoulueId, fraisPayes: input.fraisPayes ?? false,
      enregistreParId: ctx.utilisateurId,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'eleve.reinscription', 'reinscription', r.id, {});
  return { reinscriptionId: r.id, dejaInscrit: false };
}
