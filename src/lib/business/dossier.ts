// ====================================================================
// MÉTIER DOSSIER ÉLÈVE — import numérique réel des pièces
// AUDIT DOSSIER : le suivi papier (« pièce reçue ») est complété par le
// dépôt du fichier lui-même (PDF/JPG/PNG…), stocké en base et servi par
// /api/fichiers/[id]. Le dépôt marqué automatiquement la pièce du
// dossier correspondante comme « reçue » (source unique de vérité).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermissionParmi, assertTenant, logAction } from './commun';

/** Taille maximale d'un fichier importé : 5 Mo. */
export const TAILLE_MAX_FICHIER = 5 * 1024 * 1024;

/** Types MIME acceptés pour les pièces du dossier. */
export const MIME_AUTORISES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Correspondance type de document → type de pièce du dossier (checklist). */
const TYPE_VERS_PIECE: Record<string, string> = {
  acte_naissance: 'acte_naissance',
  certificat_medical: 'certificat_medical',
  photos_identite: 'photos_identite',
  photos: 'photos_identite',
  carnet_vaccination: 'carnet_vaccination',
  dernier_bulletin: 'dernier_bulletin',
  certificat_transfert: 'certificat_transfert',
};

export type TeleversementInput = {
  eleveId: string;
  type: string;
  nomFichier: string;
  mimeType: string;
  taille: number;
  contenu: Uint8Array;
  confidentiel?: boolean;
};

/**
 * Importe le fichier numérique d'une pièce du dossier d'un élève.
 * - permission : eleves.ecrire (direction / secrétariat / assistant)
 * - contrôle tenant sur l'élève
 * - taille ≤ 5 Mo, MIME dans la liste autorisée
 * - si une pièce du dossier existe pour ce type, elle passe « reçue »
 */
export async function televerserDocumentEleveCore(ctx: Ctx, input: TeleversementInput) {
  assertPermissionParmi(ctx, ['eleves.ecrire', 'secretariat.gerer']);
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');

  if (!input.nomFichier?.trim()) throw new ActionError('Nom de fichier manquant.', 'CHAMP_INVALIDE');
  if (input.taille <= 0) throw new ActionError('Fichier vide — aucun contenu importé.', 'FICHIER_VIDE');
  if (input.taille > TAILLE_MAX_FICHIER) {
    throw new ActionError(`Fichier trop volumineux (${(input.taille / 1048576).toFixed(1)} Mo) — la limite est de 5 Mo.`, 'FICHIER_TROP_VOLUMINEUX');
  }
  if (input.mimeType && !MIME_AUTORISES.includes(input.mimeType)) {
    throw new ActionError(`Format non pris en charge (${input.mimeType}). Formats acceptés : PDF, JPEG, PNG, WebP, HEIC, Word.`, 'FORMAT_INVALIDE');
  }

  const pieceType = TYPE_VERS_PIECE[input.type];
  const doc = await db.$transaction(async (tx) => {
    const cree = await tx.documentEleve.create({
      data: {
        eleveId: eleve.id,
        type: input.type,
        fichierUrl: null,
        confidentiel: input.confidentiel ?? true, // confidentiel par défaut : données de mineur
        ajouteParId: ctx.utilisateurId,
        nomFichier: input.nomFichier.trim().slice(0, 200),
        mimeType: input.mimeType || 'application/octet-stream',
        tailleOctets: input.taille,
        contenu: Buffer.from(input.contenu),
      },
    });
    // La checklist du dossier suit automatiquement : pièce déposée = pièce reçue
    if (pieceType) {
      const piece = await tx.pieceDossier.findUnique({
        where: { eleveId_type: { eleveId: eleve.id, type: pieceType } },
      });
      if (piece && piece.statut !== 'recue') {
        await tx.pieceDossier.update({
          where: { id: piece.id },
          data: { statut: 'recue', dateReception: new Date(), remarque: `Fichier importé : ${input.nomFichier.trim()}` },
        });
      } else if (!piece) {
        await tx.pieceDossier.create({
          data: { ecoleId: eleve.ecoleId, eleveId: eleve.id, type: pieceType, statut: 'recue', dateReception: new Date(), remarque: `Fichier importé : ${input.nomFichier.trim()}` },
        });
      }
    }
    await logAction(tx, eleve.ecoleId, ctx.utilisateurId, 'dossier.televersement', 'document_eleve', cree.id, {
      eleveId: eleve.id, type: input.type, nom: input.nomFichier, octets: input.taille,
    });
    return cree;
  }, { timeout: 30000, maxWait: 10000 });
  return { documentId: doc.id, nomFichier: doc.nomFichier, pieceRecue: Boolean(pieceType) };
}

/** Supprime un fichier importé (l'élève doit appartenir à l'école du contexte). */
export async function supprimerDocumentEleveCore(ctx: Ctx, documentId: string) {
  assertPermissionParmi(ctx, ['eleves.ecrire', 'secretariat.gerer']);
  const doc = await db.documentEleve.findUnique({ where: { id: documentId }, include: { eleve: true } });
  if (!doc) throw new ActionError('Document introuvable.', 'INTROUVABLE');
  assertTenant(doc.eleve.ecoleId, ctx, 'Ce document');
  await db.documentEleve.delete({ where: { id: documentId } });
  await logAction(db, doc.eleve.ecoleId, ctx.utilisateurId, 'dossier.suppression', 'document_eleve', documentId, {
    eleveId: doc.eleveId, type: doc.type, nom: doc.nomFichier,
  });
  return { documentId };
}
