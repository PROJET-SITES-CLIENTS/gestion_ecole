// ====================================================================
// MÉTIER CONFIGURATION — CRUD complet des éléments structurels
// AUDIT : matières (modifier/supprimer), salles (modifier/supprimer/
// affecter à une classe), personnel (modifier/supprimer), programmes et
// chapitres (période de trimestre, modifier/supprimer). Toutes les
// opérations vérifient le tenant et les clés étrangères avant d'écrire.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermissionParmi, assertTenant, logAction } from './commun';

// --------------------------------------------------------------------
// MATIÈRES
// --------------------------------------------------------------------

export async function modifierMatiereCore(ctx: Ctx, matiereId: string, donnees: { libelle?: string; coefficient?: number; couleur?: string }) {
  assertPermissionParmi(ctx, ['edt.gerer', 'admin.saas']);
  const matiere = await db.matiere.findUnique({ where: { id: matiereId } });
  if (!matiere) throw new ActionError('Matière introuvable.', 'INTROUVABLE');
  assertTenant(matiere.ecoleId, ctx, 'Cette matière');
  if (donnees.libelle !== undefined && !donnees.libelle.trim()) throw new ActionError('Le libellé ne peut pas être vide.', 'CHAMP_INVALIDE');
  if (donnees.coefficient !== undefined && (donnees.coefficient <= 0 || donnees.coefficient > 20)) {
    throw new ActionError('Le coefficient doit être compris entre 0 et 20.', 'CHAMP_INVALIDE');
  }
  const maj = await db.matiere.update({
    where: { id: matiereId },
    data: {
      ...(donnees.libelle !== undefined ? { libelle: donnees.libelle.trim() } : {}),
      ...(donnees.coefficient !== undefined ? { coefficient: donnees.coefficient } : {}),
      ...(donnees.couleur !== undefined && donnees.couleur ? { couleur: donnees.couleur } : {}),
    },
  });
  await logAction(db, matiere.ecoleId, ctx.utilisateurId, 'matiere.modification', 'matiere', matiereId, donnees);
  return { matiereId: maj.id };
}

/**
 * Supprime une matière. Refus si elle est utilisée (évaluations, programmes,
 * affectations, EDT, séances, devoirs…) : l'utilisateur doit d'abord
 * réaffecter ou supprimer les éléments liés.
 */
export async function supprimerMatiereCore(ctx: Ctx, matiereId: string) {
  assertPermissionParmi(ctx, ['edt.gerer', 'admin.saas']);
  const matiere = await db.matiere.findUnique({
    where: { id: matiereId },
    include: {
      _count: {
        select: { evaluations: true, programmes: true, affectations: true, emploiTemps: true, seances: true, devoirs: true, competences: true, cahierTextes: true },
      },
    },
  });
  if (!matiere) throw new ActionError('Matière introuvable.', 'INTROUVABLE');
  assertTenant(matiere.ecoleId, ctx, 'Cette matière');
  const usages = Object.entries(matiere._count).filter(([, n]) => n > 0);
  if (usages.length > 0) {
    const detail = usages.map(([k, n]) => `${n} ${k}`).join(', ');
    throw new ActionError(
      `Suppression impossible : cette matière est encore utilisée (${detail}). Supprimez ou réaffectez d'abord ces éléments.`,
      'SUPPRESSION_BLOQUEE',
    );
  }
  await db.matiere.delete({ where: { id: matiereId } });
  await logAction(db, matiere.ecoleId, ctx.utilisateurId, 'matiere.suppression', 'matiere', matiereId, { libelle: matiere.libelle });
  return { matiereId };
}

// --------------------------------------------------------------------
// SALLES — modification, suppression, affectation à une classe
// --------------------------------------------------------------------

export async function modifierSalleCore(ctx: Ctx, salleId: string, donnees: { nom?: string; type?: string; capacite?: number; equipements?: string }) {
  assertPermissionParmi(ctx, ['salles.gerer', 'edt.gerer']);
  const salle = await db.salle.findUnique({ where: { id: salleId } });
  if (!salle) throw new ActionError('Salle introuvable.', 'INTROUVABLE');
  assertTenant(salle.ecoleId, ctx, 'Cette salle');
  if (donnees.nom !== undefined && !donnees.nom.trim()) throw new ActionError('Le nom ne peut pas être vide.', 'CHAMP_INVALIDE');
  if (donnees.capacite !== undefined && donnees.capacite <= 0) throw new ActionError('La capacité doit être positive.', 'CHAMP_INVALIDE');
  if (donnees.nom && donnees.nom.trim() !== salle.nom) {
    const existante = await db.salle.findFirst({ where: { ecoleId: salle.ecoleId, nom: donnees.nom.trim(), id: { not: salleId } } });
    if (existante) throw new ActionError(`Une salle nommée « ${donnees.nom.trim()} » existe déjà.`, 'DOUBLON');
  }
  await db.salle.update({
    where: { id: salleId },
    data: {
      ...(donnees.nom !== undefined ? { nom: donnees.nom.trim() } : {}),
      ...(donnees.type !== undefined ? { type: donnees.type } : {}),
      ...(donnees.capacite !== undefined ? { capacite: donnees.capacite } : {}),
      ...(donnees.equipements !== undefined ? { equipements: donnees.equipements } : {}),
    },
  });
  await logAction(db, salle.ecoleId, ctx.utilisateurId, 'salle.modification', 'salle', salleId, donnees);
  return { salleId };
}

export async function supprimerSalleCore(ctx: Ctx, salleId: string) {
  assertPermissionParmi(ctx, ['salles.gerer', 'edt.gerer']);
  const salle = await db.salle.findUnique({
    where: { id: salleId },
    include: {
      _count: { select: { reservations: true, seances: true, emploiTemps: true, creneauHebdos: true, classesAttribuees: true } },
    },
  });
  if (!salle) throw new ActionError('Salle introuvable.', 'INTROUVABLE');
  assertTenant(salle.ecoleId, ctx, 'Cette salle');
  const usages = Object.entries(salle._count).filter(([k, n]) => n > 0 && k !== 'classesAttribuees');
  if (usages.length > 0) {
    const detail = usages.map(([k, n]) => `${n} ${k}`).join(', ');
    throw new ActionError(
      `Suppression impossible : cette salle est encore utilisée (${detail}). Libérez-la d'abord dans l'emploi du temps et les réservations.`,
      'SUPPRESSION_BLOQUEE',
    );
  }
  // Les classes qui lui étaient attribuées perdent leur salle principale (SetNull)
  await db.salle.delete({ where: { id: salleId } });
  await logAction(db, salle.ecoleId, ctx.utilisateurId, 'salle.suppression', 'salle', salleId, { nom: salle.nom });
  return { salleId };
}

/**
 * Affecte (ou retire) la salle principale d'une classe.
 * Contrôle de capacité : avertit si la salle est plus petite que l'effectif
 * (l'affectation reste possible — salle partagée, cours déplacés…).
 */
export async function affecterSalleClasseCore(ctx: Ctx, classeId: string, salleId: string | null) {
  assertPermissionParmi(ctx, ['salles.gerer', 'edt.gerer']);
  const classe = await db.classe.findUnique({ where: { id: classeId }, include: { _count: { select: { eleves: true } } } });
  if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');
  if (salleId) {
    const salle = await db.salle.findUnique({ where: { id: salleId } });
    if (!salle) throw new ActionError('Salle introuvable.', 'INTROUVABLE');
    assertTenant(salle.ecoleId, ctx, 'Cette salle');
    const dejaPrise = await db.classe.findFirst({
      where: { salleId, id: { not: classeId }, anneeScolaireId: classe.anneeScolaireId },
      select: { libelle: true },
    });
    const effectif = classe._count.eleves;
    const avertissement: string[] = [];
    if (dejaPrise) avertissement.push(`salle déjà attribuée à ${dejaPrise.libelle} sur l'année`);
    if (effectif > salle.capacite) avertissement.push(`capacité insuffisante (${salle.capacite} places pour ${effectif} élèves)`);
    await db.classe.update({ where: { id: classeId }, data: { salleId } });
    await logAction(db, classe.ecoleId, ctx.utilisateurId, 'salle.affectation_classe', 'classe', classeId, { salleId, avertissement });
    return { classeId, salleId, avertissement };
  }
  await db.classe.update({ where: { id: classeId }, data: { salleId: null } });
  await logAction(db, classe.ecoleId, ctx.utilisateurId, 'salle.retrait_classe', 'classe', classeId, {});
  return { classeId, salleId: null, avertissement: [] };
}

// --------------------------------------------------------------------
// PERSONNEL — modification, suppression (soft-delete)
// --------------------------------------------------------------------

export type DonneesPersonnel = {
  nom?: string;
  prenom?: string;
  sexe?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  dateEmbauche?: string;
  typeContrat?: string;
  salaireBrut?: number; // en centimes
  diplomePrincipal?: string;
  numeroSecuriteSociale?: string;
  contactUrgence?: string;
  statut?: string;
};

export async function modifierPersonnelCore(ctx: Ctx, personnelId: string, donnees: DonneesPersonnel) {
  assertPermissionParmi(ctx, ['rh.gerer', 'personnel.gerer']);
  const pers = await db.personnel.findUnique({ where: { id: personnelId } });
  if (!pers) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(pers.ecoleId, ctx, 'Ce personnel');
  if (donnees.nom !== undefined && !donnees.nom.trim()) throw new ActionError('Le nom ne peut pas être vide.', 'CHAMP_INVALIDE');
  if (donnees.salaireBrut !== undefined && donnees.salaireBrut < 0) throw new ActionError('Le salaire ne peut pas être négatif.', 'CHAMP_INVALIDE');
  const maj = await db.personnel.update({
    where: { id: personnelId },
    data: {
      ...(donnees.nom !== undefined ? { nom: donnees.nom.trim() } : {}),
      ...(donnees.prenom !== undefined ? { prenom: donnees.prenom.trim() } : {}),
      ...(donnees.sexe !== undefined && donnees.sexe ? { sexe: donnees.sexe } : {}),
      ...(donnees.telephone !== undefined ? { telephone: donnees.telephone.trim() || null } : {}),
      ...(donnees.email !== undefined ? { email: donnees.email.trim() || null } : {}),
      ...(donnees.adresse !== undefined ? { adresse: donnees.adresse.trim() || null } : {}),
      ...(donnees.dateEmbauche ? { dateEmbauche: new Date(donnees.dateEmbauche) } : {}),
      ...(donnees.typeContrat !== undefined && donnees.typeContrat ? { typeContrat: donnees.typeContrat } : {}),
      ...(donnees.salaireBrut !== undefined ? { salaireBrut: donnees.salaireBrut } : {}),
      ...(donnees.diplomePrincipal !== undefined ? { diplomePrincipal: donnees.diplomePrincipal.trim() || null } : {}),
      ...(donnees.numeroSecuriteSociale !== undefined ? { numeroSecuriteSociale: donnees.numeroSecuriteSociale.trim() || null } : {}),
      ...(donnees.contactUrgence !== undefined ? { contactUrgence: donnees.contactUrgence.trim() || null } : {}),
      ...(donnees.statut !== undefined && donnees.statut ? { statut: donnees.statut } : {}),
    },
  });
  await logAction(db, pers.ecoleId, ctx.utilisateurId, 'personnel.modification', 'personnel', personnelId, {
    champs: Object.keys(donnees),
  });
  return { personnelId: maj.id };
}

/**
 * Supprime un personnel (soft-delete). Le compte utilisateur associé est
 * désactivé (jamais supprimé : conservation des journaux d'audit).
 * Refus si le personnel a des bulletins de paie ou des contrats historisés.
 */
export async function supprimerPersonnelCore(ctx: Ctx, personnelId: string) {
  assertPermissionParmi(ctx, ['rh.gerer', 'personnel.gerer']);
  const pers = await db.personnel.findUnique({
    where: { id: personnelId },
    include: { _count: { select: { bulletinPaies: true, contrats: true, conges: true, affectationsEnseignant: true } } },
  });
  if (!pers) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(pers.ecoleId, ctx, 'Ce personnel');
  if (pers._count.bulletinPaies > 0 || pers._count.contrats > 0) {
    throw new ActionError(
      'Suppression impossible : ce personnel a un historique de paie ou de contrats. Utilisez plutôt « Sortie formelle » (statut sorti) pour préserver l\'historique.',
      'SUPPRESSION_BLOQUEE',
    );
  }
  await db.$transaction(async (tx) => {
    // Retire les affectations d'enseignement orphelines
    if (pers._count.affectationsEnseignant > 0) {
      await tx.affectationEnseignant.deleteMany({ where: { personnelId } });
    }
    await tx.personnel.update({ where: { id: personnelId }, data: { deletedAt: new Date(), statut: 'sorti', dateSortie: new Date(), motifSortie: 'Suppression du dossier' } });
    if (pers.utilisateurId) {
      await tx.utilisateur.update({ where: { id: pers.utilisateurId }, data: { actif: false } });
    }
    await logAction(tx, pers.ecoleId, ctx.utilisateurId, 'personnel.suppression', 'personnel', personnelId, { nom: `${pers.prenom} ${pers.nom}` });
  }, { timeout: 30000, maxWait: 10000 });
  return { personnelId };
}

// --------------------------------------------------------------------
// PROGRAMMES & CHAPITRES — période de trimestre, modification, suppression
// --------------------------------------------------------------------

export async function modifierProgrammeCore(ctx: Ctx, programmeId: string, donnees: { titre?: string; objectifs?: string; volumeHorairePrevu?: number; publie?: boolean }) {
  assertPermissionParmi(ctx, ['notes.saisir']);
  const prog = await db.programme.findUnique({ where: { id: programmeId } });
  if (!prog) throw new ActionError('Programme introuvable.', 'INTROUVABLE');
  assertTenant(prog.ecoleId, ctx, 'Ce programme');
  await db.programme.update({
    where: { id: programmeId },
    data: {
      ...(donnees.titre !== undefined && donnees.titre.trim() ? { titre: donnees.titre.trim() } : {}),
      ...(donnees.objectifs !== undefined ? { objectifs: donnees.objectifs.trim() || null } : {}),
      ...(donnees.volumeHorairePrevu !== undefined ? { volumeHorairePrevu: donnees.volumeHorairePrevu } : {}),
      ...(donnees.publie !== undefined ? { publie: donnees.publie } : {}),
    },
  });
  await logAction(db, prog.ecoleId, ctx.utilisateurId, 'programme.modification', 'programme', programmeId, donnees);
  return { programmeId };
}

export async function supprimerProgrammeCore(ctx: Ctx, programmeId: string) {
  assertPermissionParmi(ctx, ['notes.saisir']);
  const prog = await db.programme.findUnique({
    where: { id: programmeId },
    include: { _count: { select: { chapitres: true } } },
  });
  if (!prog) throw new ActionError('Programme introuvable.', 'INTROUVABLE');
  assertTenant(prog.ecoleId, ctx, 'Ce programme');
  const nbChapitres = prog._count.chapitres;
  // Les avancements et séances liées aux chapitres sont nettoyés en cascade contrôlée
  await db.$transaction(async (tx) => {
    const chapitreIds = await tx.chapitre.findMany({ where: { programmeId }, select: { id: true } });
    const ids = chapitreIds.map((c) => c.id);
    if (ids.length > 0) {
      await tx.seance.updateMany({ where: { chapitreId: { in: ids } }, data: { chapitreId: null } });
      await tx.avancementProgramme.deleteMany({ where: { chapitreId: { in: ids } } });
      await tx.chapitre.deleteMany({ where: { id: { in: ids } } });
    }
    await tx.programme.delete({ where: { id: programmeId } });
    await logAction(tx, prog.ecoleId, ctx.utilisateurId, 'programme.suppression', 'programme', programmeId, { titre: prog.titre, chapitres: nbChapitres });
  }, { timeout: 30000, maxWait: 10000 });
  return { programmeId, chapitresSupprimes: nbChapitres };
}

export async function modifierChapitreCore(
  ctx: Ctx,
  chapitreId: string,
  donnees: { titre?: string; ordre?: number; volumeHorairePrevu?: number; contenu?: string; periodeId?: string | null },
) {
  assertPermissionParmi(ctx, ['notes.saisir']);
  const chap = await db.chapitre.findUnique({ where: { id: chapitreId }, include: { programme: true } });
  if (!chap) throw new ActionError('Chapitre introuvable.', 'INTROUVABLE');
  assertTenant(chap.programme.ecoleId, ctx, 'Ce chapitre');
  if (donnees.ordre !== undefined && donnees.ordre < 1) throw new ActionError('L\'ordre doit être ≥ 1.', 'CHAMP_INVALIDE');
  if (donnees.periodeId) {
    const periode = await db.periode.findUnique({ where: { id: donnees.periodeId } });
    if (!periode) throw new ActionError('Période introuvable.', 'INTROUVABLE');
    assertTenant(periode.ecoleId, ctx, 'Cette période');
    if (periode.anneeScolaireId !== chap.programme.anneeScolaireId) {
      throw new ActionError('Cette période n\'appartient pas à l\'année scolaire du programme.', 'CORRESPONDANCE_INVALIDE');
    }
  }
  await db.chapitre.update({
    where: { id: chapitreId },
    data: {
      ...(donnees.titre !== undefined && donnees.titre.trim() ? { titre: donnees.titre.trim() } : {}),
      ...(donnees.ordre !== undefined ? { ordre: donnees.ordre } : {}),
      ...(donnees.volumeHorairePrevu !== undefined ? { volumeHorairePrevu: donnees.volumeHorairePrevu } : {}),
      ...(donnees.contenu !== undefined ? { contenu: donnees.contenu.trim() || null } : {}),
      ...(donnees.periodeId !== undefined ? { periodeId: donnees.periodeId } : {}),
    },
  });
  await logAction(db, chap.programme.ecoleId, ctx.utilisateurId, 'chapitre.modification', 'chapitre', chapitreId, donnees);
  return { chapitreId };
}

export async function supprimerChapitreCore(ctx: Ctx, chapitreId: string) {
  assertPermissionParmi(ctx, ['notes.saisir']);
  const chap = await db.chapitre.findUnique({ where: { id: chapitreId }, include: { programme: true } });
  if (!chap) throw new ActionError('Chapitre introuvable.', 'INTROUVABLE');
  assertTenant(chap.programme.ecoleId, ctx, 'Ce chapitre');
  await db.$transaction(async (tx) => {
    // Les séances qui suivaient ce chapitre sont détachées (pas supprimées)
    await tx.seance.updateMany({ where: { chapitreId }, data: { chapitreId: null } });
    await tx.avancementProgramme.deleteMany({ where: { chapitreId } });
    await tx.chapitre.delete({ where: { id: chapitreId } });
    await logAction(tx, chap.programme.ecoleId, ctx.utilisateurId, 'chapitre.suppression', 'chapitre', chapitreId, { titre: chap.titre });
  }, { timeout: 30000, maxWait: 10000 });
  return { chapitreId };
}
