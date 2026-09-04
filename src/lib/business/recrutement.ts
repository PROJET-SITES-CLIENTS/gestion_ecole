// ====================================================================
// MÉTIER RECRUTEMENT (B3) & ADMISSIONS (B4) — workflows complets
// avec CONVERSION : candidat retenu → personnel ; admis → élève inscrit.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction } from './commun';
import { hashPassword, genererMotDePasse } from '@/lib/auth-hash';
import { inscrireEleveCore, rattacherParentCore } from './eleves';

// --------------------------------------------------------------------
// B3 — RECRUTEMENT
// --------------------------------------------------------------------

export async function creerOffreCore(ctx: Ctx, ecoleId: string, input: { poste: string; description: string; profilRecherche: string; typeContrat: string; dateCloture?: Date }) {
  assertPermission(ctx, 'rh.gerer');
  if (!input.poste?.trim()) throw new ActionError('Le poste est obligatoire.', 'CHAMP_MANQUANT');
  if (!['CDI', 'CDD', 'Stage', 'Vacataire'].includes(input.typeContrat)) throw new ActionError('Type de contrat invalide.', 'CHAMP_INVALIDE');
  const o = await db.offreEmploi.create({
    data: { ecoleId, poste: input.poste.trim(), description: input.description ?? '', profilRecherche: input.profilRecherche ?? '', typeContrat: input.typeContrat, dateCloture: input.dateCloture ?? null, statut: 'ouverte' },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'recrutement.offre_creation', 'offre_emploi', o.id, { poste: input.poste });
  return { offreId: o.id };
}

export async function creerCandidatureCore(ctx: Ctx, ecoleId: string, input: { offreId: string; nom: string; prenom: string; email: string; telephone?: string; lettreMotivation?: string; source?: string }) {
  assertPermission(ctx, 'rh.gerer');
  const offre = await db.offreEmploi.findUnique({ where: { id: input.offreId } });
  if (!offre) throw new ActionError('Offre introuvable.', 'INTROUVABLE');
  assertTenant(offre.ecoleId, ctx, 'Cette offre');
  if (offre.statut !== 'ouverte') throw new ActionError('Cette offre n\'est plus ouverte.', 'OFFRE_FERMEE');
  if (!input.nom?.trim() || !input.prenom?.trim() || !input.email?.includes('@')) {
    throw new ActionError('Nom, prénom et email valides obligatoires.', 'CHAMP_MANQUANT');
  }
  const c = await db.candidature.create({
    data: {
      offreId: input.offreId, nom: input.nom.trim(), prenom: input.prenom.trim(), email: input.email.trim().toLowerCase(),
      telephone: input.telephone?.trim() || null, lettreMotivation: input.lettreMotivation?.trim() || null,
      source: input.source ?? 'offre', statut: 'recue',
    },
  });
  await db.etapeRecrutement.create({ data: { candidatureId: c.id, etape: 'tri_cv', statut: 'en_cours' } });
  await logAction(db, ecoleId, ctx.utilisateurId, 'recrutement.candidature', 'candidature', c.id, { offreId: input.offreId, nom: `${input.prenom} ${input.nom}` });
  return { candidatureId: c.id };
}

export async function avancerCandidatureCore(ctx: Ctx, ecoleId: string, candidatureId: string, etape: string, statut: 'valide' | 'refuse') {
  assertPermission(ctx, 'rh.gerer');
  const c = await db.candidature.findUnique({ where: { id: candidatureId }, include: { offre: true } });
  if (!c) throw new ActionError('Candidature introuvable.', 'INTROUVABLE');
  assertTenant(c.offre.ecoleId, ctx, 'Cette candidature');
  if (!['tri_cv', 'entretien_rh', 'entretien_direction', 'essai', 'decision'].includes(etape)) {
    throw new ActionError('Étape invalide.', 'CHAMP_INVALIDE');
  }
  await db.$transaction(async (tx) => {
    await tx.etapeRecrutement.create({ data: { candidatureId, etape, statut, decideurId: ctx.utilisateurId } });
    const mapping: Record<string, string> = { tri_cv: 'presel', entretien_rh: 'entretien', entretien_direction: 'entretien', essai: 'entretien', decision: statut === 'valide' ? 'retenu' : 'refuse' };
    await tx.candidature.update({ where: { id: candidatureId }, data: { statut: mapping[etape] ?? c.statut, etapeActuelle: etape } });
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'recrutement.etape', 'candidature', candidatureId, { etape, statut });
  return { candidatureId, etape, statut };
}

/** Décision finale → conversion du candidat RETENU en personnel (avec compte). */
export async function convertirCandidatCore(ctx: Ctx, ecoleId: string, candidatureId: string, input: { dateEmbauche: Date; salaireBrut: number }) {
  assertPermission(ctx, 'rh.gerer');
  const c = await db.candidature.findUnique({ where: { id: candidatureId }, include: { offre: true } });
  if (!c) throw new ActionError('Candidature introuvable.', 'INTROUVABLE');
  assertTenant(c.offre.ecoleId, ctx, 'Cette candidature');
  if (c.statut !== 'retenu') throw new ActionError('Seule une candidature marquée « retenu » peut être convertie.', 'STATUT_INVALIDE');

  const { creerPersonnelCore } = await import('./rh');
  const r = await creerPersonnelCore(ctx, ecoleId, {
    nom: c.nom, prenom: c.prenom, email: c.email, telephone: c.telephone ?? undefined,
    dateEmbauche: input.dateEmbauche,
    typeContrat: c.offre.typeContrat === 'Stage' ? 'stagiaire' : c.offre.typeContrat === 'Vacataire' ? 'vacataire' : (c.offre.typeContrat as 'CDI' | 'CDD'),
    salaireBrut: input.salaireBrut,
    diplomePrincipal: c.offre.poste,
    creerCompte: true,
    motDePasseInitial: genererMotDePasse(12),
  });
  await db.candidature.update({ where: { id: candidatureId }, data: { statut: 'retenu' } });
  await logAction(db, ecoleId, ctx.utilisateurId, 'recrutement.conversion_personnel', 'candidature', candidatureId, { personnelId: r.personnelId });
  return { personnelId: r.personnelId, matricule: r.matricule, compteCree: true };
}

// --------------------------------------------------------------------
// B4 — ADMISSIONS / PRÉ-INSCRIPTIONS
// --------------------------------------------------------------------

export async function creerCandidatureAdmissionCore(ctx: Ctx, ecoleId: string, input: {
  nom: string; prenom: string; dateNaissance: Date; lieuNaissance?: string; sexe?: string;
  email: string; telephone?: string; niveauId?: string; parentNom?: string; parentTelephone?: string;
  etablissementOrigine?: string;
}) {
  assertPermission(ctx, 'eleves.ecrire');
  if (!input.nom?.trim() || !input.prenom?.trim()) throw new ActionError('Nom et prénom obligatoires.', 'CHAMP_MANQUANT');
  if (!input.email?.includes('@')) throw new ActionError('Email invalide.', 'CHAMP_INVALIDE');
  if (isNaN(input.dateNaissance?.getTime())) throw new ActionError('Date de naissance invalide.', 'DATE_INVALIDE');
  if (input.niveauId) {
    const n = await db.niveau.findUnique({ where: { id: input.niveauId }, include: { section: { include: { cycle: true } } } });
    if (!n) throw new ActionError('Niveau introuvable.', 'INTROUVABLE');
    assertTenant(n.section.cycle.ecoleId, ctx, 'Ce niveau');
  }
  const c = await db.candidatureAdmission.create({
    data: {
      ecoleId, nom: input.nom.trim(), prenom: input.prenom.trim(), dateNaissance: input.dateNaissance,
      lieuNaissance: input.lieuNaissance?.trim() || null, sexe: input.sexe ?? null,
      email: input.email.trim().toLowerCase(), telephone: input.telephone?.trim() || null,
      niveauId: input.niveauId ?? null, parentNom: input.parentNom?.trim() || null,
      parentTelephone: input.parentTelephone?.trim() || null, etablissementOrigine: input.etablissementOrigine?.trim() || null,
      statut: 'soumis',
    },
  });
  await db.etapeAdmission.create({ data: { candidatureId: c.id, etape: 'depot_dossier', statut: 'valide', valideParId: ctx.utilisateurId } });
  await logAction(db, ecoleId, ctx.utilisateurId, 'admission.candidature', 'candidature_admission', c.id, { nom: `${input.prenom} ${input.nom}` });
  return { candidatureId: c.id };
}

export async function avancerCandidatureAdmissionCore(ctx: Ctx, candidatureId: string, statut: 'test' | 'entretien' | 'admis' | 'refuse', commentaire?: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const c = await db.candidatureAdmission.findUnique({ where: { id: candidatureId } });
  if (!c) throw new ActionError('Candidature introuvable.', 'INTROUVABLE');
  assertTenant(c.ecoleId, ctx, 'Cette candidature');
  if (c.statut === 'inscrit') throw new ActionError('Candidature déjà convertie en inscription.', 'DEJA_TRAITE');
  await db.candidatureAdmission.update({
    where: { id: candidatureId },
    data: { statut, dateDecision: statut === 'admis' || statut === 'refuse' ? new Date() : null, notesEntretien: commentaire?.trim() || c.notesEntretien },
  });
  await db.etapeAdmission.create({
    data: { candidatureId, etape: statut === 'test' ? 'test_admission' : statut === 'entretien' ? 'entretien' : 'decision', statut: statut === 'refuse' ? 'refuse' : 'valide', valideParId: ctx.utilisateurId, commentaire: commentaire?.trim() || null },
  });
  await logAction(db, c.ecoleId, ctx.utilisateurId, 'admission.etape', 'candidature_admission', candidatureId, { statut });
  return { candidatureId, statut };
}

export async function saisirTestAdmissionCore(ctx: Ctx, candidatureId: string, input: { matiere: string; note: number; sur: number; appreciation?: string }) {
  assertPermission(ctx, 'eleves.ecrire');
  const c = await db.candidatureAdmission.findUnique({ where: { id: candidatureId } });
  if (!c) throw new ActionError('Candidature introuvable.', 'INTROUVABLE');
  assertTenant(c.ecoleId, ctx, 'Cette candidature');
  if (!(input.sur > 0) || input.note < 0 || input.note > input.sur) {
    throw new ActionError(`Note invalide (0 à ${input.sur}).`, 'NOTE_HORS_BAREME');
  }
  const t = await db.testAdmission.create({
    data: { candidatureId, matiere: input.matiere.trim(), date: new Date(), note: input.note, sur: input.sur, appreciation: input.appreciation?.trim() || null, evalueParId: ctx.utilisateurId },
  });
  await logAction(db, c.ecoleId, ctx.utilisateurId, 'admission.test', 'test_admission', t.id, { candidatureId, matiere: input.matiere, note: input.note });
  return { testId: t.id };
}

/** Conversion : candidat ADMIS → élève inscrit (+ parent rattaché si fourni). */
export async function convertirAdmissionCore(ctx: Ctx, candidatureId: string, classeId: string) {
  assertPermission(ctx, 'eleves.ecrire');
  const c = await db.candidatureAdmission.findUnique({ where: { id: candidatureId } });
  if (!c) throw new ActionError('Candidature introuvable.', 'INTROUVABLE');
  assertTenant(c.ecoleId, ctx, 'Cette candidature');
  if (c.statut === 'inscrit') throw new ActionError('Déjà inscrit.', 'DEJA_TRAITE');
  if (c.statut !== 'admis') throw new ActionError('La candidature doit être au statut « admis » avant inscription.', 'STATUT_INVALIDE');
  const classe = await db.classe.findUnique({ where: { id: classeId } });
  if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');

  const r = await inscrireEleveCore(ctx, c.ecoleId, {
    nom: c.nom, prenom: c.prenom, dateNaissance: c.dateNaissance,
    lieuNaissance: c.lieuNaissance ?? undefined, sexe: (c.sexe as 'M' | 'F') ?? 'M',
    classeId,
  });
  // Dossier marqué inscrit
  await db.candidatureAdmission.update({ where: { id: candidatureId }, data: { statut: 'inscrit', dossierComplet: true } });
  // Parent rattaché si les coordonnées existent
  if (c.parentNom?.trim()) {
    const [prenomParent, ...resteNom] = c.parentNom.trim().split(' ');
    await rattacherParentCore(ctx, {
      eleveId: r.eleveId,
      nouveauParent: {
        nom: resteNom.join(' ') || c.nom, prenom: prenomParent || 'Parent',
        telephone: c.parentTelephone ?? undefined, email: c.email ?? undefined,
        lienAvecEleve: 'tuteur_legal',
      },
    }).catch(() => { /* non bloquant */ });
  }
  await logAction(db, c.ecoleId, ctx.utilisateurId, 'admission.conversion_inscription', 'candidature_admission', candidatureId, { eleveId: r.eleveId, matricule: r.matricule });
  return { eleveId: r.eleveId, matricule: r.matricule };
}

// --------------------------------------------------------------------
// B5 — TRANSPORT (création de lignes/arrets + inscriptions)
// --------------------------------------------------------------------

export async function creerLigneTransportCore(ctx: Ctx, ecoleId: string, input: { nom: string; vehicule?: string; arrets?: Array<{ nom: string; ordre: number; heure: string }> }) {
  assertPermission(ctx, 'services.gerer');
  if (!input.nom?.trim()) throw new ActionError('Le nom de la ligne est obligatoire.', 'CHAMP_MANQUANT');
  const ligne = await db.transportLigne.create({
    data: { ecoleId, nom: input.nom.trim(), vehicule: input.vehicule?.trim() || null },
  });
  for (const a of input.arrets ?? []) {
    if (!/^\d{2}:\d{2}$/.test(a.heure)) throw new ActionError(`Horaire d'arrêt invalide : ${a.heure}.`, 'CHAMP_INVALIDE');
    await db.transportArret.create({ data: { ligneId: ligne.id, nom: a.nom.trim(), ordre: a.ordre, heure: a.heure } });
  }
  await logAction(db, ecoleId, ctx.utilisateurId, 'transport.ligne_creation', 'transport_ligne', ligne.id, { nom: input.nom });
  return { ligneId: ligne.id };
}

export async function inscrireTransportCore(ctx: Ctx, input: { eleveId: string; ligneId: string; arretMonteeId?: string; arretDescenteId?: string; tarif: number }) {
  assertPermission(ctx, 'services.gerer');
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  const ligne = await db.transportLigne.findUnique({ where: { id: input.ligneId } });
  if (!ligne) throw new ActionError('Ligne introuvable.', 'INTROUVABLE');
  assertTenant(ligne.ecoleId, ctx, 'Cette ligne');
  if (!Number.isInteger(input.tarif) || input.tarif <= 0) throw new ActionError('Tarif invalide (centimes).', 'MONTANT_INVALIDE');
  if (!eleve.classeActuelleId) throw new ActionError('L\'élève n\'est affecté à aucune classe.', 'CLASSE_MANQUANTE');
  const existante = await db.transportInscription.findFirst({ where: { eleveId: eleve.id, ligneId: ligne.id, actif: true } });
  if (existante) throw new ActionError('Cet élève est déjà inscrit sur cette ligne.', 'DEJA_EXISTANT');
  const i = await db.transportInscription.create({
    data: {
      ecoleId: eleve.ecoleId, eleveId: eleve.id, classeId: eleve.classeActuelleId,
      ligneId: ligne.id, arretMonteeId: input.arretMonteeId || null, arretDescenteId: input.arretDescenteId || null,
      tarif: input.tarif, actif: true,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'transport.inscription', 'transport_inscription', i.id, { eleveId: eleve.id, ligneId: ligne.id });
  return { inscriptionId: i.id };
}

// --------------------------------------------------------------------
// B5/B6 — FACTURATION DES SERVICES : cantine + transport → échéances réelles
// --------------------------------------------------------------------

export async function genererEcheancesServicesCore(ctx: Ctx, ecoleId: string, service: 'cantine' | 'transport', mois: Date) {
  assertPermission(ctx, 'finances.ecrire');
  if (!/^\d{2}:\d{2}$/.test('00:00') || isNaN(mois.getTime())) throw new ActionError('Mois invalide.', 'DATE_INVALIDE');
  const periode = `${mois.getFullYear()}-${String(mois.getMonth() + 1).padStart(2, '0')}`;
  const dateEcheance = new Date(mois.getFullYear(), mois.getMonth() + 1, 5); // le 5 du mois suivant
  const devise = (await db.ecole.findUnique({ where: { id: ecoleId } }))?.devise ?? 'XOF';

  // Cantine : tarif × nombre de jours de présence inscrits par mois (~4,33 semaines)
  // Transport : tarif mensuel fixe par inscription active
  type LigneAFacturer = { eleveId: string; libelle: string; montant: number };
  const àFacturer: LigneAFacturer[] = [];

  if (service === 'cantine') {
    const inscriptions = await db.cantineInscription.findMany({ where: { ecoleId, actif: true }, include: { eleve: true } });
    for (const i of inscriptions) {
      const jours = (JSON.parse(i.joursSemaine || '[]') as number[]).length;
      if (jours === 0) continue;
      const joursMois = Math.round(jours * 4.33);
      àFacturer.push({ eleveId: i.eleveId, libelle: `Cantine ${periode} (${i.eleve.prenom} ${i.eleve.nom}, ${joursMois} repas)`, montant: i.tarifJournalier * joursMois });
    }
  } else {
    const inscriptions = await db.transportInscription.findMany({ where: { ecoleId, actif: true }, include: { eleve: true, ligne: true } });
    for (const i of inscriptions) {
      àFacturer.push({ eleveId: i.eleveId, libelle: `Transport ${periode} — ligne ${i.ligne.nom} (${i.eleve.prenom} ${i.eleve.nom})`, montant: i.tarif });
    }
  }

  // Frais agrégé du service pour le mois (un seul frais, échéances par élève)
  const libelleFrais = service === 'cantine' ? `Cantine — ${periode}` : `Transport — ${periode}`;
  let frais = await db.frais.findFirst({ where: { ecoleId, libelle: libelleFrais } });
  const anneeActive = await db.anneeScolaire.findFirst({ where: { ecoleId, active: true } });
  if (!frais) {
    if (!anneeActive) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');
    frais = await db.frais.create({
      data: { ecoleId, libelle: libelleFrais, type: service, montant: 0, devise, periodicite: 'mensuel', anneeScolaireId: anneeActive.id },
    });
  }

  let créées = 0;
  await db.$transaction(async (tx) => {
    for (const f of àFacturer) {
      const existante = await tx.echeanceFrais.findFirst({ where: { eleveId: f.eleveId, fraisId: frais!.id, dateEcheance } });
      if (existante) continue; // idempotent
      await tx.echeanceFrais.create({
        data: { eleveId: f.eleveId, fraisId: frais!.id, montant: f.montant, devise, dateEcheance, statut: 'impayee', source: f.libelle },
      });
      créées++;
    }
    await logAction(tx, ecoleId, ctx.utilisateurId, `services.facturation_${service}`, 'frais', frais!.id, { periode, échéances: créées });
  }, { timeout: 30000, maxWait: 10000 });

  return { periode, service, échéancesCréées: créées, totalÉlèves: àFacturer.length };
}
