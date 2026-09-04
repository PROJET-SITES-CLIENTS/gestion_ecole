// ====================================================================
// MÉTIER ÉLÈVES
// - T7 : matricule séquentiel atomique (EL-####)
// - F7  : la classe d'inscription est VÉRIFIÉE contre le tenant
// - F4  : quota d'élèves du plan SaaS appliqué à l'inscription
// - F3  : modification, changement de statut, transfert, suppression
// - F13 : rattachement des parents (EleveParent)
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, eleveDuTenant, logAction, avecVerrou } from './commun';
import { STATUTS_ELEVE, zStatutEleve } from '@/lib/constants';

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

/** F4 — vérifie le quota d'élèves du plan courant et met à jour QuotaUsage. */
async function verifierEtMajQuotaEleves(ecoleId: string, client: typeof db = db) {
  const abonnement = await client.abonnement.findFirst({
    where: { ecoleId, statut: { in: ['essai', 'actif'] } },
    include: { plan: true },
    orderBy: { dateDebut: 'desc' },
  });
  if (!abonnement) return; // pas d'abonnement (super-admin bypass) : pas de quota
  const limite = abonnement.plan.limiteEleves; // null/0 = illimité
  if (!limite || limite <= 0) return;
  const total = await client.eleve.count({ where: { ecoleId, deletedAt: null, statut: 'actif' } });
  if (total >= limite) {
    throw new ActionError(
      `Quota du plan atteint : ${total}/${limite} élèves (« ${abonnement.plan.nom} »). Passez à un plan supérieur pour inscrire davantage d'élèves.`,
      'QUOTA_ATTEINT',
    );
  }
  // QuotaUsage à jour (période annuelle courante)
  const periode = String(new Date().getFullYear());
  const pourcentage = Math.round((total / limite) * 10000) / 100;
  await client.quotaUsage.upsert({
    where: { ecoleId_periode_ressource: { ecoleId, periode, ressource: 'eleves' } },
    create: { ecoleId, periode, ressource: 'eleves', consommation: total, limite, pourcentage, alerte80: pourcentage >= 80, alerte100: pourcentage >= 100 },
    update: { consommation: total, limite, pourcentage, alerte80: pourcentage >= 80, alerte100: pourcentage >= 100, dateDerniereMaj: new Date() },
  });
}

export async function inscrireEleveCore(ctx: Ctx, ecoleId: string, input: InscriptionEleveInput) {
  assertPermission(ctx, 'eleves.ecrire');
  if (!input.nom?.trim()) throw new ActionError('Le nom est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.prenom?.trim()) throw new ActionError('Le prénom est obligatoire.', 'CHAMP_MANQUANT');
  if (isNaN(input.dateNaissance?.getTime())) throw new ActionError('Date de naissance invalide.', 'DATE_INVALIDE');
  if (input.dateNaissance > new Date()) throw new ActionError('La date de naissance ne peut pas être dans le futur.', 'DATE_INVALIDE');
  if (!['M', 'F'].includes(input.sexe)) throw new ActionError('Le sexe doit être M ou F.', 'CHAMP_INVALIDE');
  // F7 — la classe doit exister ET appartenir au tenant
  if (input.classeId) {
    const classe = await db.classe.findUnique({ where: { id: input.classeId } });
    if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
    assertTenant(classe.ecoleId, ctx, 'Cette classe');
  }
  // F4 — quota d'élèves du plan SaaS
  await verifierEtMajQuotaEleves(ecoleId);

  const debut = Date.now();
  return avecVerrou('eleves:insc', async () => {
  const MAX_RETRY = 4;
  for (let tentative = 1; tentative <= MAX_RETRY; tentative++) {
    try {
      // Idempotence : si une tentative précédente a COMMITÉ malgré une erreur
      // rapportée (P2034 au commit), on RETROUVE l'élève déjà inscrit.
      const dejaLa = await db.eleve.findFirst({
        where: { ecoleId, nom: input.nom.trim(), prenom: input.prenom.trim(), dateNaissance: input.dateNaissance, deletedAt: null, createdAt: { gte: new Date(debut - 1000) } },
      });
      if (dejaLa) return { eleveId: dejaLa.id, matricule: dejaLa.matricule!, dejaCree: true };
      const résultat = await db.$transaction(async (tx) => {
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
        // Historisation de l'entrée en classe (F9 : dès l'inscription)
        if (input.classeId) {
          await tx.eleveHistoriqueClasse.create({
            data: { eleveId: eleve.id, classeId: input.classeId, dateEntree: new Date() },
          });
        }
        await logAction(tx, ecoleId, ctx.utilisateurId, 'eleve.inscription', 'eleve', eleve.id, {
          nom: eleve.nom,
          prenom: eleve.prenom,
          matricule,
        });
        return { eleveId: eleve.id, matricule };
      }, { timeout: 30000, maxWait: 10000 });
      await emettreWebhookInscription(ecoleId, résultat.eleveId, résultat.matricule);
      return résultat;
    } catch (e: any) {
      if (e instanceof ActionError) throw e;
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
  });
}

// B12 — émission webhook après inscription (hors transaction : appel réseau)
async function emettreWebhookInscription(ecoleId: string, eleveId: string, matricule: string) {
  try {
    const { emettreWebhook } = await import('./integrations');
    await emettreWebhook(ecoleId, 'eleve.inscription', { eleveId, matricule });
  } catch { /* les webhooks ne bloquent JAMAIS le métier */ }
}

// --------------------------------------------------------------------
// F3 — Modification d'un élève
// --------------------------------------------------------------------

export type ModificationEleveInput = {
  eleveId: string;
  nom: string;
  prenom: string;
  dateNaissance: Date;
  lieuNaissance?: string;
  sexe: string;
};

export async function modifierEleveCore(ctx: Ctx, input: ModificationEleveInput) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (!input.nom?.trim()) throw new ActionError('Le nom est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.prenom?.trim()) throw new ActionError('Le prénom est obligatoire.', 'CHAMP_MANQUANT');
  if (isNaN(input.dateNaissance?.getTime())) throw new ActionError('Date de naissance invalide.', 'DATE_INVALIDE');
  if (input.dateNaissance > new Date()) throw new ActionError('La date de naissance ne peut pas être dans le futur.', 'DATE_INVALIDE');
  if (!['M', 'F'].includes(input.sexe)) throw new ActionError('Le sexe doit être M ou F.', 'CHAMP_INVALIDE');
  await db.eleve.update({
    where: { id: input.eleveId },
    data: {
      nom: input.nom.trim(),
      prenom: input.prenom.trim(),
      dateNaissance: input.dateNaissance,
      lieuNaissance: input.lieuNaissance?.trim() || null,
      sexe: input.sexe,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'eleve.modification', 'eleve', input.eleveId, {
    avant: { nom: eleve.nom, prenom: eleve.prenom },
    apres: { nom: input.nom.trim(), prenom: input.prenom.trim() },
  });
  return { eleveId: input.eleveId };
}

// --------------------------------------------------------------------
// F3 — Changement de statut (sortie, diplôme, transfert, exclusion…)
// --------------------------------------------------------------------

export type ChangementStatutInput = {
  eleveId: string;
  statut: string;
  dateSortie?: Date;
  motif?: string;
};

export async function changerStatutEleveCore(ctx: Ctx, input: ChangementStatutInput) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  const parse = zStatutEleve.safeParse(input.statut);
  if (!parse.success) {
    throw new ActionError(`Statut d'élève invalide : « ${input.statut} » (attendu : ${STATUTS_ELEVE.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  const quitte = input.statut !== 'actif';
  if (quitte) {
    if (!input.dateSortie || isNaN(input.dateSortie.getTime())) {
      throw new ActionError('La date de sortie est obligatoire pour un changement de statut.', 'CHAMP_MANQUANT');
    }
    if (!input.motif?.trim()) throw new ActionError('Le motif est obligatoire pour un changement de statut.', 'CHAMP_MANQUANT');
  }
  await db.$transaction(async (tx) => {
    await tx.eleve.update({
      where: { id: input.eleveId },
      data: {
        statut: input.statut,
        dateSortie: quitte ? input.dateSortie : null,
        motifSortie: quitte ? input.motif!.trim() : null,
      },
    });
    // Clôture de l'historique de classe en cours
    if (quitte && eleve.classeActuelleId) {
      await tx.eleveHistoriqueClasse.updateMany({
        where: { eleveId: input.eleveId, classeId: eleve.classeActuelleId, dateSortie: null },
        data: { dateSortie: quitte ? input.dateSortie! : null, motif: quitte ? input.motif!.trim() : null },
      });
    }
    await logAction(tx, eleve.ecoleId, ctx.utilisateurId, 'eleve.changement_statut', 'eleve', input.eleveId, {
      statut: input.statut,
      motif: input.motif,
    });
  }, { timeout: 30000, maxWait: 10000 });
  return { eleveId: input.eleveId, statut: input.statut };
}

// --------------------------------------------------------------------
// F3/F9 — Transfert de classe avec historisation
// --------------------------------------------------------------------

export async function transfererClasseCore(ctx: Ctx, eleveId: string, nouvelleClasseId: string, motif?: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await eleveDuTenant(eleveId, ctx);
  const classe = await db.classe.findUnique({ where: { id: nouvelleClasseId } });
  if (!classe) throw new ActionError('Classe destination introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');
  if (eleve.classeActuelleId === nouvelleClasseId) {
    throw new ActionError('L\'élève est déjà dans cette classe.', 'DEJA_TRAITE');
  }
  await db.$transaction(async (tx) => {
    const maintenant = new Date();
    // 1) clôturer l'historique de l'ancienne classe
    if (eleve.classeActuelleId) {
      await tx.eleveHistoriqueClasse.updateMany({
        where: { eleveId, classeId: eleve.classeActuelleId, dateSortie: null },
        data: { dateSortie: maintenant, motif: motif?.trim() || 'transfert' },
      });
    }
    // 2) nouvelle affectation + ouverture d'historique
    await tx.eleve.update({ where: { id: eleveId }, data: { classeActuelleId: nouvelleClasseId } });
    await tx.eleveHistoriqueClasse.create({
      data: { eleveId, classeId: nouvelleClasseId, dateEntree: maintenant },
    });
    await logAction(tx, eleve.ecoleId, ctx.utilisateurId, 'eleve.transfert_classe', 'eleve', eleveId, {
      de: eleve.classeActuelleId,
      vers: nouvelleClasseId,
      motif: motif?.trim() || null,
    });
  }, { timeout: 30000, maxWait: 10000 });
  return { eleveId, classeId: nouvelleClasseId };
}

// --------------------------------------------------------------------
// F3 — Suppression logique (soft delete, jamais de hard delete)
// --------------------------------------------------------------------

export async function supprimerEleveCore(ctx: Ctx, eleveId: string, motif: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await eleveDuTenant(eleveId, ctx);
  if (!motif?.trim()) throw new ActionError('Le motif de suppression est obligatoire (traçabilité).', 'CHAMP_MANQUANT');
  await db.eleve.update({
    where: { id: eleveId },
    data: {
      deletedAt: new Date(),
      statut: 'sorti',
      dateSortie: new Date(),
      motifSortie: `Supprimé — ${motif.trim()}`,
    },
  });
  // Le compte utilisateur lié (portail élève) est désactivé
  if (eleve.utilisateurId) {
    await db.utilisateur.update({ where: { id: eleve.utilisateurId }, data: { actif: false } });
  }
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'eleve.suppression_logique', 'eleve', eleveId, { motif: motif.trim() });
  return { eleveId };
}

// --------------------------------------------------------------------
// F13 — Rattachement d'un parent (création ou lien à un parent existant)
// --------------------------------------------------------------------

export type RattachementParentInput = {
  eleveId: string;
  parentId?: string; // parent existant
  nouveauParent?: { nom: string; prenom: string; telephone?: string; email?: string; profession?: string; lienAvecEleve: string };
  autoriteParentale?: boolean;
};

export async function rattacherParentCore(ctx: Ctx, input: RattachementParentInput) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  let parentId = input.parentId;
  if (!parentId) {
    const np = input.nouveauParent;
    if (!np) throw new ActionError('Fournissez un parent existant ou les informations du nouveau parent.', 'CHAMP_MANQUANT');
    if (!np.nom?.trim() || !np.prenom?.trim()) throw new ActionError('Nom et prénom du parent obligatoires.', 'CHAMP_MANQUANT');
    if (!['pere', 'mere', 'tuteur_legal'].includes(np.lienAvecEleve)) {
      throw new ActionError('Lien avec l\'élève invalide (pere/mere/tuteur_legal).', 'CHAMP_INVALIDE');
    }
    const cree = await db.parentTuteur.create({
      data: {
        ecoleId: eleve.ecoleId,
        nom: np.nom.trim(),
        prenom: np.prenom.trim(),
        telephone: np.telephone?.trim() || null,
        email: np.email?.trim() || null,
        profession: np.profession?.trim() || null,
        lienAvecEleve: np.lienAvecEleve,
      },
    });
    parentId = cree.id;
  } else {
    const parent = await db.parentTuteur.findUnique({ where: { id: parentId } });
    if (!parent) throw new ActionError('Parent introuvable.', 'INTROUVABLE');
    assertTenant(parent.ecoleId, ctx, 'Ce parent');
  }
  await db.eleveParent.upsert({
    where: { eleveId_parentId: { eleveId: input.eleveId, parentId } },
    create: { eleveId: input.eleveId, parentId, autoriteParentale: input.autoriteParentale ?? true },
    update: { autoriteParentale: input.autoriteParentale ?? true },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'eleve.rattachement_parent', 'eleve', input.eleveId, { parentId });
  return { eleveId: input.eleveId, parentId };
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

// --------------------------------------------------------------------
// F20 — Consentement image : ConsentementImage = source de vérité,
// les booléens rapides d'Eleve sont synchronisés.
// --------------------------------------------------------------------

export type ConsentementImageInput = {
  eleveId: string;
  accord: boolean;
  usage: string;
  duree?: string;
};

export async function enregistrerConsentementImageCore(ctx: Ctx, input: ConsentementImageInput) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (!input.usage?.trim()) throw new ActionError('L\'usage du consentement image est obligatoire.', 'CHAMP_MANQUANT');
  await db.$transaction(async (tx) => {
    const existant = await tx.consentementImage.findFirst({ where: { eleveId: input.eleveId, usage: input.usage } });
    if (existant) {
      await tx.consentementImage.update({
        where: { id: existant.id },
        data: { accord: input.accord, dateAccord: input.accord ? new Date() : null, duree: input.duree ?? null, dateMaj: new Date() },
      });
    } else {
      await tx.consentementImage.create({
        data: {
          ecoleId: eleve.ecoleId,
          eleveId: input.eleveId,
          accord: input.accord,
          usage: input.usage,
          dateAccord: input.accord ? new Date() : null,
          duree: input.duree ?? null,
        },
      });
    }
    // Synchro des booléens rapides d'Eleve (affichage de liste)
    const interne = input.usage === 'exposition_interne';
    await tx.eleve.update({
      where: { id: input.eleveId },
      data: interne
        ? { consentementPhotoInterne: input.accord }
        : input.usage === 'site_web' || input.usage === 'reseaux_sociaux' || input.usage === 'plaquette' || input.usage === 'presse'
          ? { consentementPhotoExterne: input.accord }
          : {},
    });
    await logAction(tx, eleve.ecoleId, ctx.utilisateurId, 'consentement.image', 'eleve', input.eleveId, {
      usage: input.usage,
      accord: input.accord,
    });
  }, { timeout: 30000, maxWait: 10000 });
  return { eleveId: input.eleveId };
}
