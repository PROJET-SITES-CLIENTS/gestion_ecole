// ====================================================================
// MÉTIER ÉLÈVES — correction T7 : matricule séquentiel atomique
// (plus de EL-{Date.now().slice(-6)} collisionnel)
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, eleveDuTenant, logAction } from './commun';

export type InscriptionEleveInput = {
  nom: string;
  prenom: string;
  dateNaissance: Date;
  lieuNaissance?: string;
  sexe: string;
  classeId?: string;
};

/**
 * Matricule séquentiel : EL-#### calculé à partir du maximum existant
 * DEPUIS la transaction, avec retry en cas de collision P2002 (le
 * @@unique(ecoleId, matricule) garantit l'intégrité).
 */
async function prochainMatricule(tx: any, ecoleId: string): Promise<string> {
  const eleves = await tx.eleve.findMany({
    where: { ecoleId, matricule: { startsWith: 'EL-' } },
    select: { matricule: true },
  });
  let max = 0;
  for (const e of eleves) {
    const n = parseInt((e.matricule ?? '').slice(3), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `EL-${String(max + 1).padStart(4, '0')}`;
}

export async function inscrireEleveCore(ctx: Ctx, ecoleId: string, input: InscriptionEleveInput) {
  assertPermission(ctx, 'eleves.ecrire');
  if (!input.nom?.trim()) throw new ActionError('Le nom est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.prenom?.trim()) throw new ActionError('Le prénom est obligatoire.', 'CHAMP_MANQUANT');
  if (isNaN(input.dateNaissance?.getTime())) throw new ActionError('Date de naissance invalide.', 'DATE_INVALIDE');
  if (input.dateNaissance > new Date()) throw new ActionError('La date de naissance ne peut pas être dans le futur.', 'DATE_INVALIDE');
  if (!['M', 'F'].includes(input.sexe)) throw new ActionError('Le sexe doit être M ou F.', 'CHAMP_INVALIDE');
  if (input.classeId) {
    const classe = await db.classe.findUnique({ where: { id: input.classeId } });
    if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  }

  const MAX_RETRY = 4;
  for (let tentative = 1; tentative <= MAX_RETRY; tentative++) {
    try {
      return await db.$transaction(async (tx) => {
        const matricule = await prochainMatricule(tx, ecoleId);
        const eleve = await tx.eleve.create({
          data: {
            ecoleId,
            nom: input.nom.trim(),
            prenom: input.prenom.trim(),
            dateNaissance: input.dateNaissance,
            lieuNaissance: input.lieuNaissance?.trim() || '',
            sexe: input.sexe,
            classeActuelleId: input.classeId,
            matricule,
            statut: 'actif',
            dateInscription: new Date(),
          },
        });
        await logAction(tx, ecoleId, ctx.utilisateurId, 'eleve.inscription', 'eleve', eleve.id, {
          nom: eleve.nom,
          prenom: eleve.prenom,
          matricule,
        });
        return { eleveId: eleve.id, matricule };
      }, { timeout: 30000, maxWait: 10000 });
    } catch (e: any) {
      const collision = e?.code === 'P2002' && String(e?.meta?.target ?? '').includes('matricule');
      if (collision && tentative < MAX_RETRY) continue; // rare : re-calcul depuis l'état frais
      throw new ActionError(
        collision
          ? 'Collision de matricule détectée malgré les tentatives. Réessayez.'
          : 'Erreur lors de l\'inscription. Vérifiez les champs et réessayez.',
        collision ? 'COLLISION_MATRICULE' : 'ERREUR_METIER',
      );
    }
  }
  throw new ActionError('Inscription impossible (collision de matricule).', 'COLLISION_MATRICULE');
}

// --------------------------------------------------------------------
// Besoins spécifiques / aménagements / consentements
// --------------------------------------------------------------------

export type BesoinInput = {
  eleveId: string;
  type: string;
  description: string;
  dateDiagnostic?: Date;
};

export async function ajouterBesoinSpecifiqueCore(ctx: Ctx, input: BesoinInput) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (!input.type?.trim()) throw new ActionError('Le type de besoin est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.description?.trim()) throw new ActionError('La description est obligatoire.', 'CHAMP_MANQUANT');
  const b = await db.besoinSpecifique.create({
    data: {
      eleveId: input.eleveId,
      type: input.type.trim(),
      description: input.description.trim(),
      dateDiagnostic: input.dateDiagnostic && !isNaN(input.dateDiagnostic.getTime()) ? input.dateDiagnostic : null,
      confidentiel: true,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'eleve.besoin_specifique.ajout', 'eleve', input.eleveId, { besoinId: b.id });
  return { besoinId: b.id };
}

export type AmenagementInput = {
  eleveId: string;
  besoinSpecifiqueId?: string;
  typeAmenagement: string;
  description: string;
  dateDebut: Date;
};

export async function ajouterAmenagementCore(ctx: Ctx, input: AmenagementInput) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (!input.typeAmenagement?.trim()) throw new ActionError("Le type d'aménagement est obligatoire.", 'CHAMP_MANQUANT');
  if (isNaN(input.dateDebut?.getTime())) throw new ActionError('Date de début invalide.', 'DATE_INVALIDE');
  if (input.besoinSpecifiqueId) {
    const b = await db.besoinSpecifique.findUnique({ where: { id: input.besoinSpecifiqueId } });
    if (!b || b.eleveId !== input.eleveId) {
      throw new ActionError('Le besoin spécifique ne correspond pas à cet élève.', 'CORRESPONDANCE_INVALIDE');
    }
  }
  const a = await db.amenagement.create({
    data: {
      eleveId: input.eleveId,
      besoinSpecifiqueId: input.besoinSpecifiqueId,
      typeAmenagement: input.typeAmenagement.trim(),
      description: input.description ?? '',
      dateDebut: input.dateDebut,
      valideParId: ctx.utilisateurId,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'eleve.amenagement.ajout', 'eleve', input.eleveId, { type: input.typeAmenagement });
  return { amenagementId: a.id };
}

export async function activerConsentementPortailEleveCore(ctx: Ctx, eleveId: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await eleveDuTenant(eleveId, ctx);
  await db.eleve.update({
    where: { id: eleveId },
    data: { consentementPortailEleve: true, consentementPortailEleveDate: new Date() },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'consentement.portail_eleve_active', 'eleve', eleveId);
  return { ok: true };
}
