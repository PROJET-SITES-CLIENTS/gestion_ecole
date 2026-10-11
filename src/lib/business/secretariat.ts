// ====================================================================
// SECRÉTARIAT — complément : checklist dossier, registre courrier, réinscriptions
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertPermissionParmi, assertTenant, logAction, notifierParentsEtDirection } from './commun';

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
  // SEC-1 FIX — l'ancien « count + 1 » explosait en collision P2002 dès qu'un
  // courrier était supprimé (le count redescend → numéro déjà pris) ou en cas
  // d'enregistrements concurrents. Désormais : numéro = MAX des références
  // existantes + 1, avec boucle de reprise en cas de course (P2002).
  const prefixe = input.direction === 'entrant' ? 'C-ENT' : 'C-SOR';
  const numeroSuivant = async (): Promise<number> => {
    const existants = await db.courrier.findMany({ where: { ecoleId, direction: input.direction }, select: { reference: true } });
    let max = 0;
    for (const c of existants) {
      const n = parseInt((c.reference ?? '').split('-').pop() ?? '', 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max + 1;
  };
  let c;
  for (let tentative = 1; tentative <= 5; tentative++) {
    try {
      const reference = `${prefixe}-${String(await numeroSuivant()).padStart(4, '0')}`;
      c = await db.courrier.create({
        data: {
          ecoleId, reference, direction: input.direction,
          type: input.type || 'courrier_simple',
          objet: input.objet.trim(), correspondant: input.correspondant.trim(),
          enregistreParId: ctx.utilisateurId,
        },
      });
      await logAction(db, ecoleId, ctx.utilisateurId, 'courrier.enregistrement', 'courrier', c.id, { reference, direction: input.direction });
      return { courrierId: c.id, reference };
    } catch (e: any) {
      if (e?.code === 'P2002' && tentative < 5) continue; // course concurrente : on re-numérote
      throw e;
    }
  }
  throw new ActionError('Numérotation du courrier impossible (collision). Réessayez.', 'COLLISION_REFERENCE');
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
  // SEC-11 FIX — la classe voulue doit appartenir À L'ÉCOLE (avant : une
  // classe d'un autre établissement était acceptée en FK croisée).
  if (input.classeVoulueId) {
    const classeVoulue = await db.classe.findUnique({ where: { id: input.classeVoulueId } });
    if (!classeVoulue) throw new ActionError('Classe voulue introuvable.', 'INTROUVABLE');
    assertTenant(classeVoulue.ecoleId, ctx, 'Cette classe');
  }
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

// --------------------------------------------------------------------
// AUDIT SECRÉTARIAT — relance familles pour pièces manquantes
// --------------------------------------------------------------------

/** Notifie les parents d'un élève en listant les pièces encore manquantes
 *  à son dossier (canal in-app + direction en copie). */
export async function relancerPiecesDossierCore(ctx: Ctx, eleveId: string) {
  assertPermissionParmi(ctx, ['eleves.ecrire', 'secretariat.gerer']);
  const eleve = await db.eleve.findUnique({
    where: { id: eleveId },
    include: { piecesDossier: true },
  });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  const manquantes = eleve.piecesDossier.filter((p) => p.statut !== 'recue');
  if (manquantes.length === 0) {
    throw new ActionError('Le dossier de cet élève est déjà complet — aucune relance nécessaire.', 'DOSSIER_COMPLET');
  }
  const libelles = manquantes.map((p) => LIBELLES_PIECES[p.type as keyof typeof LIBELLES_PIECES] ?? p.type);
  const nb = await notifierParentsEtDirection(
    db as never, eleve.ecoleId, eleve.id,
    `Dossier incomplet — ${eleve.prenom} ${eleve.nom}`,
    `Bonjour, le dossier de ${eleve.prenom} ${eleve.nom} est incomplet. Pièce(s) encore manquante(s) : ${libelles.join(', ')}. Merci de les déposer au secrétariat de l'école au plus tôt.`,
  );
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'dossier.relance_pieces', 'eleve', eleve.id, { manquantes: manquantes.map((p) => p.type), parentsNotifies: nb });
  return { eleveId, piecesManquantes: libelles, parentsNotifies: nb };
}

/** SEC-5 FIX — notifie UNIQUEMENT les parents + un SYNTHÈSE unique à la
 *  direction (avant : copie direction sur CHAQUE élève → N notifications). */
async function notifierParentsSansCopieDirection(
  eleve: { id: string; ecoleId: string; prenom: string; nom: string },
  sujet: string, corps: string,
): Promise<number> {
  return notifierParentsEtDirection(db as never, eleve.ecoleId, eleve.id, sujet, corps, { direction: false });
}

async function notifierSyntheseDirection(ecoleId: string, sujet: string, corps: string) {
  const { getDirectionUserId } = await import('./commun');
  const dirId = await getDirectionUserId(ecoleId);
  await db.notification.create({
    data: {
      ecoleId, destinataireType: 'personnel', destinataireId: dirId,
      sujet, corps, canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(),
    },
  }).catch(() => undefined);
}

/** Relance en masse : notifie toutes les familles ayant au moins une pièce
 *  manquante (utile en début d'année). Retourne le détail par élève. */
export async function relancerToutesPiecesCore(ctx: Ctx) {
  assertPermissionParmi(ctx, ['eleves.ecrire', 'secretariat.gerer']);
  if (!ctx.ecoleId) throw new ActionError('Aucune école associée.', 'ECOLE_ABSENTE');
  const eleves = await db.eleve.findMany({
    where: { ecoleId: ctx.ecoleId, deletedAt: null, statut: 'actif' },
    include: { piecesDossier: true },
  });
  let familles = 0;
  const detail: Array<{ eleve: string; manquantes: string[] }> = [];
  for (const e of eleves) {
    const manquantes = e.piecesDossier.filter((p) => p.statut !== 'recue');
    if (manquantes.length === 0) continue;
    const libelles = manquantes.map((p) => LIBELLES_PIECES[p.type as keyof typeof LIBELLES_PIECES] ?? p.type);
    await notifierParentsSansCopieDirection(e,
      `Dossier incomplet — ${e.prenom} ${e.nom}`,
      `Bonjour, le dossier de ${e.prenom} ${e.nom} est incomplet. Pièce(s) manquante(s) : ${libelles.join(', ')}. Merci de les déposer au secrétariat.`,
    );
    familles++;
    detail.push({ eleve: `${e.prenom} ${e.nom}`, manquantes: libelles });
  }
  // SEC-5 — une SEULE notification de synthèse pour la direction
  if (familles > 0) {
    await notifierSyntheseDirection(ctx.ecoleId,
      `Campagne pièces manquantes — ${familles} famille(s) relancée(s)`,
      `Relance en masse effectuée par le secrétariat : ${familles} famille(s) notifiée(s) pour dossier incomplet. Détail disponible dans le journal d'audit (dossier.relance_masse).`,
    );
  }
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'dossier.relance_masse', undefined, undefined, { familles });
  return { familles, detail };
}

// --------------------------------------------------------------------
// AUDIT SECRÉTARIAT — mise à jour des coordonnées famille
// --------------------------------------------------------------------

export type CoordonneesInput = {
  eleveId: string;
  adresseEleve?: string;
  contactUrgenceNom?: string;
  contactUrgenceTelephone?: string;
  parentId?: string;
  parentTelephone?: string;
  parentEmail?: string;
  parentProfession?: string;
};

/** Met à jour les coordonnées de la famille : adresse de l'élève, contact
 *  d'urgence (nom + téléphone, stockés en JSON) et coordonnées du parent
 *  rattaché (téléphone, email, profession). */
export async function majCoordonneesFamilleCore(ctx: Ctx, input: CoordonneesInput) {
  assertPermissionParmi(ctx, ['eleves.ecrire', 'secretariat.gerer']);
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  if (input.parentEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.parentEmail.trim())) {
    throw new ActionError('Email du parent invalide.', 'CHAMP_INVALIDE');
  }

  // Contact d'urgence : conservé en JSON {nom, telephone}
  let contactUrgence: string | null | undefined;
  if (input.contactUrgenceNom != null || input.contactUrgenceTelephone != null) {
    const actuel = (() => { try { return JSON.parse(eleve.contactUrgence ?? '{}'); } catch { return {}; } })();
    contactUrgence = JSON.stringify({
      nom: input.contactUrgenceNom?.trim() ?? actuel.nom ?? null,
      telephone: input.contactUrgenceTelephone?.trim() ?? actuel.telephone ?? null,
    });
  }

  await db.eleve.update({
    where: { id: eleve.id },
    data: {
      ...(input.adresseEleve !== undefined ? { adresse: input.adresseEleve.trim() || null } : {}),
      ...(contactUrgence !== undefined ? { contactUrgence } : {}),
    },
  });

  let parentModifie: string | null = null;
  if (input.parentId) {
    const parent = await db.parentTuteur.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new ActionError('Parent introuvable.', 'INTROUVABLE');
    assertTenant(parent.ecoleId, ctx, 'Ce parent');
    await db.parentTuteur.update({
      where: { id: parent.id },
      data: {
        ...(input.parentTelephone !== undefined ? { telephone: input.parentTelephone.trim() || null } : {}),
        ...(input.parentEmail !== undefined ? { email: input.parentEmail.trim() || null } : {}),
        ...(input.parentProfession !== undefined ? { profession: input.parentProfession.trim() || null } : {}),
      },
    });
    // SEC-12 FIX — le COMPTE UTILISATEUR lié suit le nouvel email : avant,
    // le parent se connectait toujours avec l'ancien (fiche ≠ login).
    if (parent.utilisateurId && input.parentEmail && input.parentEmail.trim() && input.parentEmail.trim().toLowerCase() !== (parent.email ?? '').toLowerCase()) {
      const pris = await db.utilisateur.findFirst({ where: { email: input.parentEmail.trim().toLowerCase(), deletedAt: null } });
      if (pris && pris.id !== parent.utilisateurId) {
        throw new ActionError('Cet email est déjà utilisé par un autre compte — choix impossible.', 'EMAIL_PRIS');
      }
      await db.utilisateur.update({
        where: { id: parent.utilisateurId },
        data: { email: input.parentEmail.trim().toLowerCase() },
      }).catch(() => undefined); // compte sans email éditable : non bloquant
    }
    parentModifie = `${parent.prenom ?? ''} ${parent.nom ?? ''}`.trim();
  }
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'famille.coordonnees_maj', 'eleve', eleve.id, {
    champs: Object.keys(input).filter((k) => k !== 'eleveId'),
    parent: parentModifie,
  });
  return { eleveId: eleve.id, parentModifie };
}

// --------------------------------------------------------------------
// AUDIT SECRÉTARIAT — relance impayés notifiant les FAMILLES
// --------------------------------------------------------------------

/** Notifie les parents d'un élève avec le détail de ses échéances en retard
 *  (montant restant, dates échues) + la direction en copie. */
export async function relancerImpayesEleveCore(ctx: Ctx, eleveId: string) {
  assertPermissionParmi(ctx, ['finances.voir', 'eleves.ecrire', 'secretariat.gerer']);
  const eleve = await db.eleve.findUnique({ where: { id: eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  const aujourdhui = new Date();
  const enRetard = await db.echeanceFrais.findMany({
    where: { eleveId, statut: { in: ['impayee', 'partiel'] }, dateEcheance: { lt: aujourdhui } },
    include: { frais: { select: { libelle: true } } },
    orderBy: { dateEcheance: 'asc' },
  });
  if (enRetard.length === 0) {
    throw new ActionError('Aucune échéance en retard pour cet élève — relance inutile.', 'AUCUN_RETARD');
  }
  const totalRestant = enRetard.reduce((s, e) => s + (e.montant - (e.remise ?? 0) - (e.montantPaye ?? 0)), 0);
  const detail = enRetard.map((e) => `${e.frais?.libelle ?? 'Échéance'} du ${e.dateEcheance.toISOString().slice(0, 10)}`).join(', ');
  const nb = await notifierParentsEtDirection(
    db as never, eleve.ecoleId, eleve.id,
    `Rappel de scolarité — ${eleve.prenom} ${eleve.nom}`,
    `Bonjour, nous vous rappelons que le dossier de ${eleve.prenom} ${eleve.nom} présente ${enRetard.length} échéance(s) échue(s) : ${detail}. Montant total restant dû : ${(totalRestant / 100).toLocaleString('fr-FR')} F CFA. Merci de vous rapprocher de la comptabilité pour régulariser.`,
  );
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'impayes.relance', 'eleve', eleve.id, { echeances: enRetard.length, totalRestant });
  return { eleveId, echeancesEnRetard: enRetard.length, totalRestant, parentsNotifies: nb };
}

/** Relance en masse : toutes les familles ayant au moins une échéance échue
 *  non soldée. Retourne le détail. */
export async function relancerTousImpayesCore(ctx: Ctx) {
  assertPermissionParmi(ctx, ['finances.voir', 'eleves.ecrire', 'secretariat.gerer']);
  if (!ctx.ecoleId) throw new ActionError('Aucune école associée.', 'ECOLE_ABSENTE');
  const aujourdhui = new Date();
  const enRetard = await db.echeanceFrais.findMany({
    where: { statut: { in: ['impayee', 'partiel'] }, dateEcheance: { lt: aujourdhui }, eleve: { ecoleId: ctx.ecoleId, deletedAt: null, statut: 'actif' } },
    include: { frais: { select: { libelle: true } }, eleve: true },
    orderBy: { dateEcheance: 'asc' },
  });
  const parEleve = new Map<string, typeof enRetard>();
  for (const e of enRetard) {
    (parEleve.get(e.eleveId) ?? parEleve.set(e.eleveId, [] as typeof enRetard).get(e.eleveId)!).push(e);
  }
  let familles = 0;
  const detail: Array<{ eleve: string; echeances: number; restant: number }> = [];
  for (const [eleveId, echs] of parEleve) {
    const el = echs[0].eleve;
    const restant = echs.reduce((s, e) => s + (e.montant - (e.remise ?? 0) - (e.montantPaye ?? 0)), 0);
    const detailTxt = echs.map((e) => `${e.frais?.libelle ?? 'Échéance'} du ${e.dateEcheance.toISOString().slice(0, 10)}`).join(', ');
    // SEC-5 — parents notifiés SANS copie direction individuelle
    await notifierParentsSansCopieDirection(
      { id: eleveId, ecoleId: ctx.ecoleId, prenom: el.prenom, nom: el.nom },
      `Rappel de scolarité — ${el.prenom} ${el.nom}`,
      `Bonjour, le dossier de ${el.prenom} ${el.nom} présente ${echs.length} échéance(s) échue(s) : ${detailTxt}. Restant dû : ${(restant / 100).toLocaleString('fr-FR')} F CFA. Merci de régulariser auprès de la comptabilité.`,
    );
    familles++;
    detail.push({ eleve: `${el.prenom} ${el.nom}`, echeances: echs.length, restant });
  }
  // SEC-5 — une SEULE notification de synthèse pour la direction
  if (familles > 0) {
    await notifierSyntheseDirection(ctx.ecoleId,
      `Campagne impayés — ${familles} famille(s) relancée(s)`,
      `Relance en masse effectuée : ${familles} famille(s) notifiée(s) pour échéances échues. Total recouvrable visé : ${(detail.reduce((s, d) => s + d.restant, 0) / 100).toLocaleString('fr-FR')} F CFA. Détail dans le journal (impayes.relance_masse).`,
    );
  }
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'impayes.relance_masse', undefined, undefined, { familles });
  return { familles, detail };
}
