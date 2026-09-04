// ====================================================================
// MÉTIER PÉDAGOGIE 2 (B10, B11, C7, C8)
// Devoirs & rendus, cahier de textes, compétences, conseils de classe,
// dispenses + convocation d'examen imprimable + bulletin imprimable.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, notifierParentsEtDirection } from './commun';

// --------------------------------------------------------------------
// B10 — DEVOIRS & RENDUS
// --------------------------------------------------------------------

export async function creerDevoirCore(ctx: Ctx, input: { classeId: string; matiereId?: string; intitule: string; description?: string; dateRendu: Date; sur?: number; coefficient?: number; type?: string }) {
  assertPermission(ctx, 'notes.saisir');
  if (!input.intitule?.trim()) throw new ActionError('L\'intitulé est obligatoire.', 'CHAMP_MANQUANT');
  if (isNaN(input.dateRendu?.getTime())) throw new ActionError('Date de rendu invalide.', 'DATE_INVALIDE');
  const classe = await db.classe.findUnique({ where: { id: input.classeId } });
  if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');
  // FK W1 : enseignantId référence Personnel — résoudre le profil du compte
  const enseignant = await db.personnel.findFirst({ where: { utilisateurId: ctx.utilisateurId, ecoleId: classe.ecoleId } });
  if (!enseignant) throw new ActionError('Aucun profil personnel associé à votre compte : impossible de créer un devoir.', 'PERSONNEL_MANQUANT');
  const d = await db.devoir.create({
    data: {
      ecoleId: classe.ecoleId, classeId: input.classeId, matiereId: input.matiereId ?? null,
      enseignantId: enseignant.id,
      intitule: input.intitule.trim(), description: input.description?.trim() || null,
      dateRendu: input.dateRendu, sur: input.sur ?? 20, coefficient: input.coefficient ?? 1,
      type: input.type ?? 'devoir', statut: 'assigne',
    },
  });
  await logAction(db, classe.ecoleId, ctx.utilisateurId, 'devoir.creation', 'devoir', d.id, { classeId: input.classeId, intitule: input.intitule });
  return { devoirId: d.id };
}


export async function noterRenduCore(ctx: Ctx, renduId: string, input: { note: number; appreciation?: string }) {
  assertPermission(ctx, 'notes.saisir');
  const r = await db.renduDevoir.findUnique({ where: { id: renduId }, include: { devoir: true } });
  if (!r) throw new ActionError('Rendu introuvable.', 'INTROUVABLE');
  assertTenant(r.devoir.ecoleId, ctx, 'Ce rendu');
  if (input.note < 0 || input.note > r.devoir.sur) {
    throw new ActionError(`Note hors barème (0 à ${r.devoir.sur}).`, 'NOTE_HORS_BAREME');
  }
  await db.renduDevoir.update({
    where: { id: renduId },
    data: { note: input.note, appreciation: input.appreciation?.trim() || null, corrigeParId: ctx.utilisateurId, dateCorrection: new Date(), statut: 'corrige' },
  });
  return { renduId };
}

// --------------------------------------------------------------------
// B10 — CAHIER DE TEXTES
// --------------------------------------------------------------------

export async function creerEntreeCahierCore(ctx: Ctx, input: { classeId: string; matiereId?: string; dateCours: Date; contenu: string; travailAFaire?: string; publier?: boolean }) {
  assertPermission(ctx, 'notes.saisir');
  if (!input.contenu?.trim()) throw new ActionError('Le contenu du cours est obligatoire.', 'CHAMP_MANQUANT');
  if (isNaN(input.dateCours?.getTime())) throw new ActionError('Date de cours invalide.', 'DATE_INVALIDE');
  const classe = await db.classe.findUnique({ where: { id: input.classeId } });
  if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');
  const enseignantCahier = await db.personnel.findFirst({ where: { utilisateurId: ctx.utilisateurId, ecoleId: classe.ecoleId } });
  if (!enseignantCahier) throw new ActionError('Aucun profil personnel associé à votre compte.', 'PERSONNEL_MANQUANT');
  const cahier = await db.cahierTexte.findFirst({
    where: { classeId: input.classeId, matiereId: input.matiereId ?? null, enseignantId: enseignantCahier.id, statut: 'actif' },
  });
  const cible = cahier ?? await db.cahierTexte.create({
    data: { ecoleId: classe.ecoleId, classeId: input.classeId, matiereId: input.matiereId ?? null, enseignantId: enseignantCahier.id, statut: 'actif' },
  });
  const e = await db.entreeCahierTexte.create({
    data: {
      cahierTexteId: cible.id, dateCours: input.dateCours, contenu: input.contenu.trim(),
      travailAFaire: input.travailAFaire?.trim() || null,
      statut: input.publier ? 'publie' : 'brouillon',
      valideParId: input.publier ? ctx.utilisateurId : null, dateValidation: input.publier ? new Date() : null,
    },
  });
  return { entreeId: e.id };
}

export async function publierEntreeCahierCore(ctx: Ctx, entreeId: string) {
  assertPermission(ctx, 'notes.saisir');
  const e = await db.entreeCahierTexte.findUnique({ where: { id: entreeId }, include: { cahierTexte: true } });
  if (!e) throw new ActionError('Entrée introuvable.', 'INTROUVABLE');
  assertTenant(e.cahierTexte.ecoleId, ctx, 'Cette entrée');
  if (e.statut === 'publie') throw new ActionError('Entrée déjà publiée.', 'DEJA_TRAITE');
  await db.entreeCahierTexte.update({
    where: { id: entreeId },
    data: { statut: 'publie', valideParId: ctx.utilisateurId, dateValidation: new Date() },
  });
  return { entreeId };
}

// --------------------------------------------------------------------
// B11 — COMPÉTENCES
// --------------------------------------------------------------------

export async function saisirEvaluationsCompetenceCore(ctx: Ctx, input: {
  periodeId: string;
  saisies: Array<{ eleveId: string; competenceId: string; niveauAcquisition: string; commentaire?: string }>;
}) {
  assertPermission(ctx, 'notes.saisir');
  if (input.saisies.length === 0) throw new ActionError('Aucune saisie.', 'SAISIE_VIDE');
  const periode = await db.periode.findUnique({ where: { id: input.periodeId } });
  if (!periode) throw new ActionError('Période introuvable.', 'INTROUVABLE');
  assertTenant(periode.ecoleId, ctx, 'Cette période');
  for (const s of input.saisies) {
    if (!['non_acquis', 'en_cours_d_acquisition', 'acquis', 'maitrise'].includes(s.niveauAcquisition)) {
      throw new ActionError(`Niveau d'acquisition invalide : ${s.niveauAcquisition}.`, 'CHAMP_INVALIDE');
    }
    const compétence = await db.competence.findUnique({ where: { id: s.competenceId } });
    if (!compétence) throw new ActionError('Compétence introuvable.', 'INTROUVABLE');
    assertTenant(compétence.ecoleId, ctx, 'Cette compétence');
  }
  // Tout-ou-rien
  await db.$transaction(async (tx) => {
    for (const s of input.saisies) {
      await tx.evaluationCompetence.upsert({
        where: { eleveId_competenceId_periodeId: { eleveId: s.eleveId, competenceId: s.competenceId, periodeId: input.periodeId } },
        create: { eleveId: s.eleveId, competenceId: s.competenceId, periodeId: input.periodeId, niveauAcquisition: s.niveauAcquisition, commentaire: s.commentaire?.trim() || null, evalueParId: ctx.utilisateurId },
        update: { niveauAcquisition: s.niveauAcquisition, commentaire: s.commentaire?.trim() || null, evalueParId: ctx.utilisateurId },
      });
    }
    await logAction(tx, periode.ecoleId, ctx.utilisateurId, 'competences.saisie', 'evaluation_competence', undefined, { count: input.saisies.length });
  });
  return { saisies: input.saisies.length };
}

// --------------------------------------------------------------------
// B11 — CONSEILS DE CLASSE & DÉLIBÉRATIONS
// --------------------------------------------------------------------

export async function creerConseilCore(ctx: Ctx, input: { classeId: string; periodeId: string; date: Date; salle?: string; membresIds: string[] }) {
  assertPermission(ctx, 'bulletins.valider');
  const classe = await db.classe.findUnique({ where: { id: input.classeId } });
  if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');
  if (input.membresIds.length === 0) throw new ActionError('Au moins un membre requis.', 'SAISIE_VIDE');
  const c = await db.conseilClasse.create({
    data: { ecoleId: classe.ecoleId, classeId: input.classeId, periodeId: input.periodeId, date: input.date, salle: input.salle?.trim() || null, statut: 'planifie', presidentId: ctx.utilisateurId },
  });
  await db.membreConseil.createMany({
    data: input.membresIds.map((id) => ({ conseilId: c.id, utilisateurId: id, role: 'enseignant', present: false })),
  });
  return { conseilId: c.id };
}

export async function creerDeliberationCore(ctx: Ctx, input: { conseilId: string; eleveId: string; decision: string; mention?: string; appreciationGenerale?: string; objectifSuivant?: string }) {
  assertPermission(ctx, 'bulletins.valider');
  const conseil = await db.conseilClasse.findUnique({ where: { id: input.conseilId } });
  if (!conseil) throw new ActionError('Conseil introuvable.', 'INTROUVABLE');
  assertTenant(conseil.ecoleId, ctx, 'Ce conseil');
  if (!['passage', 'redoublement', 'exclusion_orientation', 'doublement'].includes(input.decision)) {
    throw new ActionError('Décision invalide.', 'CHAMP_INVALIDE');
  }
  if (input.mention && !['encouragements', 'felicitations', 'tableau_honneur'].includes(input.mention)) {
    throw new ActionError('Mention invalide.', 'CHAMP_INVALIDE');
  }
  const d = await db.deliberationConseil.create({
    data: {
      conseilId: input.conseilId, eleveId: input.eleveId, decision: input.decision,
      mention: input.mention ?? null, appreciationGenerale: input.appreciationGenerale?.trim() || null,
      objectifSuivant: input.objectifSuivant?.trim() || null,
    },
  });
  return { deliberationId: d.id };
}

export async function voterDeliberationCore(ctx: Ctx, deliberationId: string, vote: 'pour' | 'contre' | 'abstention') {
  assertPermission(ctx, 'bulletins.valider');
  const d = await db.deliberationConseil.findUnique({ where: { id: deliberationId }, include: { conseil: true, votes: true } });
  if (!d) throw new ActionError('Délibération introuvable.', 'INTROUVABLE');
  assertTenant(d.conseil.ecoleId, ctx, 'Cette délibération');
  const membre = await db.membreConseil.findFirst({ where: { conseilId: d.conseilId, utilisateurId: ctx.utilisateurId } });
  if (!membre) throw new ActionError('Vous n\'êtes pas membre de ce conseil.', 'ROLE_INVALIDE');
  // @@unique F19 : un membre = un vote
  await db.voteConseil.upsert({
    where: { deliberationId_membreId: { deliberationId, membreId: membre.id } },
    create: { deliberationId, membreId: membre.id, vote },
    update: { vote },
  });
  return { deliberationId, vote };
}

export async function marquerPresenceConseilCore(ctx: Ctx, conseilId: string, membreId: string, present: boolean) {
  assertPermission(ctx, 'bulletins.valider');
  const conseil = await db.conseilClasse.findUnique({ where: { id: conseilId } });
  if (!conseil) throw new ActionError('Conseil introuvable.', 'INTROUVABLE');
  assertTenant(conseil.ecoleId, ctx, 'Ce conseil');
  await db.membreConseil.update({ where: { id: membreId }, data: { present } });
  return { membreId, present };
}

// --------------------------------------------------------------------
// B11 — DISPENSES
// --------------------------------------------------------------------

export async function creerDispenseCore(ctx: Ctx, input: { eleveId: string; matiereId?: string; motif: string; description: string; dateDebut: Date; dateFin?: Date }) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  if (!['medical', 'sportif', 'religieux', 'autre'].includes(input.motif)) throw new ActionError('Motif invalide.', 'CHAMP_INVALIDE');
  if (!input.description?.trim()) throw new ActionError('Description obligatoire.', 'CHAMP_MANQUANT');
  const d = await db.dispense.create({
    data: {
      ecoleId: eleve.ecoleId, eleveId: input.eleveId, matiereId: input.matiereId ?? null,
      motif: input.motif, description: input.description.trim(), dateDebut: input.dateDebut, dateFin: input.dateFin ?? null,
      statut: 'demandee',
    },
  });
  return { dispenseId: d.id };
}

export async function traiterDispenseCore(ctx: Ctx, dispenseId: string, decision: 'validee' | 'refusee') {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const d = await db.dispense.findUnique({ where: { id: dispenseId } });
  if (!d) throw new ActionError('Dispense introuvable.', 'INTROUVABLE');
  assertTenant(d.ecoleId, ctx, 'Cette dispense');
  if (d.statut !== 'demandee') throw new ActionError('Dispense déjà traitée.', 'DEJA_TRAITE');
  await db.dispense.update({ where: { id: dispenseId }, data: { statut: decision, valideParId: ctx.utilisateurId, dateValidation: new Date() } });
  return { dispenseId, statut: decision };
}

// --------------------------------------------------------------------
// C7 — CONVOCATION D'EXAMEN IMPRIMABLE (données assemblées serveur)
// --------------------------------------------------------------------

export async function genererConvocationImprimableCore(ctx: Ctx, inscriptionId: string) {
  assertPermission(ctx, 'examens.gerer');
  const i = await db.inscriptionExamenOfficiel.findUnique({
    where: { id: inscriptionId },
    include: { eleve: { include: { ecole: true } }, examenOfficiel: { include: { niveau: true } } },
  });
  if (!i) throw new ActionError('Inscription introuvable.', 'INTROUVABLE');
  assertTenant(i.examenOfficiel.ecoleId, ctx, 'Cette inscription');
  return {
    ecole: { nom: i.eleve.ecole.nom },
    examen: { nom: i.examenOfficiel.nom, niveau: i.examenOfficiel.niveau.libelle, dateDebut: i.examenOfficiel.dateDebut, dateFin: i.examenOfficiel.dateFin },
    candidat: { nom: i.eleve.nom, prenom: i.eleve.prenom, matricule: i.eleve.matricule, numeroTable: i.numeroTable, centre: i.centreExamen },
  };
}

// --------------------------------------------------------------------
// C8 — BULLETIN IMPRIMABLE (pdfUrl marqué)
// --------------------------------------------------------------------

export async function marquerBulletinImprimableCore(ctx: Ctx, bulletinId: string) {
  const b = await db.bulletin.findUnique({ where: { id: bulletinId }, include: { eleve: { include: { ecole: true } }, periode: true } });
  if (!b) throw new ActionError('Bulletin introuvable.', 'INTROUVABLE');
  assertPermission(ctx, ctx.type === 'eleve' || ctx.type === 'parent' ? '—' : 'notes.saisir'); // l'élève/parent peut imprimer SON bulletin publié
  if (b.statut !== 'publie' && ctx.type !== 'super_admin') {
    // Direction/PP peuvent pré-générer ; l'élève/parent uniquement publié
    if (ctx.type === 'eleve' || ctx.type === 'parent') {
      throw new ActionError('Bulletin non publié.', 'STATUT_INVALIDE');
    }
  }
  const url = `/documents/bulletins/${b.id}-v${b.version}.pdf`;
  await db.bulletin.update({ where: { id: bulletinId }, data: { pdfUrl: url } });
  return {
    bulletin: {
      id: b.id, version: b.version, statut: b.statut,
      eleve: { nom: b.eleve.nom, prenom: b.eleve.prenom, matricule: b.eleve.matricule },
      ecole: { nom: b.eleve.ecole.nom, devise: b.eleve.ecole.devise },
      periode: b.periode.libelle,
      moyennes: JSON.parse(b.moyennes || '[]'),
      moyenneGenerale: b.moyenneGenerale, rang: b.rang,
      appreciation: b.appreciationGenerale,
    },
    pdfUrl: url,
  };
}
