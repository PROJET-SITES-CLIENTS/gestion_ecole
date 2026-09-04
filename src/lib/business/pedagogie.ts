// ====================================================================
// MÉTIER PÉDAGOGIE
// - T4 : notes bornées 0..barème, rejet de toute la saisie si une note
//        est invalide (aucune écriture partielle faussant la moyenne)
// - T5 : génération de bulletin TRANSACTIONNELLE (version atomique)
// - F6  : le rôle de validation est DÉRIVÉ DE LA SESSION (le paramètre
//        client « role » a été supprimé — plus d'escalade possible)
// - F7  : matière/période/enseignant et élèves vérifiés contre le tenant
// - F12 : rangs recalculés pour TOUTE la classe à chaque génération +
//        échelle de mentions standard
// - F3  : modification/suppression d'évaluation, annulation de bulletin
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, avecVerrou } from './commun';
import { TRANSITIONS_BULLETIN, mentionPourMoyenne } from '@/lib/constants';

// --------------------------------------------------------------------
// Évaluations
// --------------------------------------------------------------------

export type EvaluationInput = {
  classeId: string;
  matiereId: string;
  enseignantId: string;
  periodeId: string;
  type: string;
  intitule: string;
  date: Date;
  sur: number;
  coefficient: number;
};

async function verifierReferentielsEvaluation(ctx: Ctx, input: EvaluationInput) {
  for (const [id, nom] of [[input.classeId, 'Classe'], [input.matiereId, 'Matière'], [input.enseignantId, 'Enseignant'], [input.periodeId, 'Période']] as const) {
    if (!id) throw new ActionError(`${nom} manquant(e).`, 'CHAMP_MANQUANT');
  }
  const classe = await db.classe.findUnique({ where: { id: input.classeId } });
  if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');
  // F7 — les référentiels doivent appartenir AU MÊME tenant
  const matiere = await db.matiere.findUnique({ where: { id: input.matiereId } });
  if (!matiere) throw new ActionError('Matière introuvable.', 'INTROUVABLE');
  assertTenant(matiere.ecoleId, ctx, 'Cette matière');
  const periode = await db.periode.findUnique({ where: { id: input.periodeId } });
  if (!periode) throw new ActionError('Période introuvable.', 'INTROUVABLE');
  assertTenant(periode.ecoleId, ctx, 'Cette période');
  if (periode.anneeScolaireId !== classe.anneeScolaireId) {
    throw new ActionError('La période n\'appartient pas à la même année scolaire que la classe.', 'CORRESPONDANCE_INVALIDE');
  }
  const enseignant = await db.personnel.findUnique({ where: { id: input.enseignantId } });
  if (!enseignant) throw new ActionError('Enseignant introuvable.', 'INTROUVABLE');
  assertTenant(enseignant.ecoleId, ctx, 'Cet enseignant');
}

export async function creerEvaluationCore(ctx: Ctx, ecoleId: string, input: EvaluationInput) {
  assertPermission(ctx, 'notes.saisir');
  if (!input.intitule?.trim()) throw new ActionError("L'intitulé est obligatoire.", 'CHAMP_MANQUANT');
  if (!(input.sur > 0)) throw new ActionError('Le barème doit être strictement positif.', 'BAREME_INVALIDE');
  if (!(input.coefficient > 0)) throw new ActionError('Le coefficient doit être strictement positif.', 'COEF_INVALIDE');
  if (isNaN(input.date?.getTime())) throw new ActionError("Date d'évaluation invalide.", 'DATE_INVALIDE');
  await verifierReferentielsEvaluation(ctx, input);

  const e = await db.evaluation.create({
    data: {
      ecoleId,
      classeId: input.classeId,
      matiereId: input.matiereId,
      enseignantId: input.enseignantId,
      periodeId: input.periodeId,
      type: input.type,
      intitule: input.intitule.trim(),
      date: input.date,
      sur: input.sur,
      coefficient: input.coefficient,
      statut: 'planifiee',
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'evaluation.creation', 'evaluation', e.id, { intitule: input.intitule });
  return { evaluationId: e.id };
}

/** F3 — modification : verrouillée dès qu'une note est saisie. */
export async function modifierEvaluationCore(ctx: Ctx, evaluationId: string, input: EvaluationInput) {
  assertPermission(ctx, 'notes.saisir');
  const evaluation = await db.evaluation.findUnique({ where: { id: evaluationId }, include: { _count: { select: { notes: true } } } });
  if (!evaluation) throw new ActionError('Évaluation introuvable.', 'INTROUVABLE');
  assertTenant(evaluation.ecoleId, ctx, 'Cette évaluation');
  if (!input.intitule?.trim()) throw new ActionError("L'intitulé est obligatoire.", 'CHAMP_MANQUANT');
  if (!(input.sur > 0)) throw new ActionError('Le barème doit être strictement positif.', 'BAREME_INVALIDE');
  if (!(input.coefficient > 0)) throw new ActionError('Le coefficient doit être strictement positif.', 'COEF_INVALIDE');
  if (isNaN(input.date?.getTime())) throw new ActionError("Date d'évaluation invalide.", 'DATE_INVALIDE');
  await verifierReferentielsEvaluation(ctx, input);
  if (evaluation._count.notes > 0) {
    // Barème/coefficient structurels interdits de changer sous peine de fausser
    // les notes existantes ; seuls l'intitulé et la date restent éditables.
    if (input.sur !== evaluation.sur || input.coefficient !== evaluation.coefficient
      || input.classeId !== evaluation.classeId || input.matiereId !== evaluation.matiereId
      || input.periodeId !== evaluation.periodeId) {
      throw new ActionError(
        `Évaluation verrouillée : ${evaluation._count.notes} note(s) déjà saisie(s). Seuls l'intitulé et la date sont modifiables (supprimez les notes via une nouvelle saisie sinon).`,
        'EVALUATION_VERROUILLEE',
      );
    }
  }
  await db.evaluation.update({
    where: { id: evaluationId },
    data: {
      intitule: input.intitule.trim(),
      date: input.date,
      ...(evaluation._count.notes === 0
        ? { sur: input.sur, coefficient: input.coefficient, classeId: input.classeId, matiereId: input.matiereId, enseignantId: input.enseignantId, periodeId: input.periodeId, type: input.type }
        : {}),
    },
  });
  await logAction(db, evaluation.ecoleId, ctx.utilisateurId, 'evaluation.modification', 'evaluation', evaluationId, { intitule: input.intitule });
  return { evaluationId };
}

/** F3 — suppression : refus absolu si des notes existent. */
export async function supprimerEvaluationCore(ctx: Ctx, evaluationId: string) {
  assertPermission(ctx, 'notes.saisir');
  const evaluation = await db.evaluation.findUnique({ where: { id: evaluationId }, include: { _count: { select: { notes: true } } } });
  if (!evaluation) throw new ActionError('Évaluation introuvable.', 'INTROUVABLE');
  assertTenant(evaluation.ecoleId, ctx, 'Cette évaluation');
  if (evaluation._count.notes > 0) {
    throw new ActionError(
      `Suppression impossible : ${evaluation._count.notes} note(s) rattachée(s). Effacez d'abord les notes (saisie vide) ou conservez la trace.`,
      'NOTE_EXISTANTE',
    );
  }
  await db.evaluation.delete({ where: { id: evaluationId } });
  await logAction(db, evaluation.ecoleId, ctx.utilisateurId, 'evaluation.suppression', 'evaluation', evaluationId, {
    intitule: evaluation.intitule,
  });
  return { evaluationId };
}

// --------------------------------------------------------------------
// Saisie de notes (T4 + F7)
// --------------------------------------------------------------------

export type SaisieNotesInput = {
  evaluationId: string;
  notes: Array<{ eleveId: string; valeur?: number; absent?: boolean }>;
};

export async function saisirNotesCore(ctx: Ctx, input: SaisieNotesInput) {
  assertPermission(ctx, 'notes.saisir');
  const evaluation = await db.evaluation.findUnique({ where: { id: input.evaluationId } });
  if (!evaluation) throw new ActionError('Évaluation introuvable.', 'INTROUVABLE');
  assertTenant(evaluation.ecoleId, ctx, 'Cette évaluation');
  if (input.notes.length === 0) throw new ActionError('Aucune note fournie.', 'SAISIE_VIDE');

  // F7 — les élèves notés appartiennent à la classe de l'évaluation (et au tenant)
  const ids = [...new Set(input.notes.map((n) => n.eleveId))];
  const eleves = await db.eleve.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, ecoleId: true, classeActuelleId: true },
  });
  if (eleves.length !== ids.length) throw new ActionError('Élève introuvable parmi les notes.', 'INTROUVABLE');
  for (const e of eleves) {
    assertTenant(e.ecoleId, ctx, 'Un élève noté');
    if (e.classeActuelleId !== evaluation.classeId) {
      throw new ActionError('Un élève noté n\'appartient pas à la classe de l\'évaluation : saisie refusée.', 'CORRESPONDANCE_INVALIDE');
    }
  }

  // Validation TOUT-OU-RIEN : bornage 0..barème pour chaque note.
  const erreurs: string[] = [];
  for (const n of input.notes) {
    if (n.absent) continue;
    if (n.valeur === undefined || n.valeur === null || isNaN(n.valeur)) {
      erreurs.push(`valeur non numérique pour l'élève ${n.eleveId}`);
      continue;
    }
    if (n.valeur < 0 || n.valeur > evaluation.sur) {
      erreurs.push(`note ${n.valeur} hors barème (0 à ${evaluation.sur}) pour l'élève ${n.eleveId}`);
    }
  }
  if (erreurs.length > 0) {
    throw new ActionError(
      `Saisie refusée — ${erreurs.length} note(s) invalide(s) : ${erreurs.slice(0, 5).join(' ; ')}${erreurs.length > 5 ? '…' : ''}`,
      'NOTE_HORS_BAREME',
    );
  }

  // Écriture atomique de toutes les notes.
  await db.$transaction(async (tx) => {
    for (const n of input.notes) {
      await tx.note.upsert({
        where: { eleveId_evaluationId: { eleveId: n.eleveId, evaluationId: input.evaluationId } },
        create: {
          eleveId: n.eleveId,
          evaluationId: input.evaluationId,
          valeur: n.absent ? null : n.valeur!,
          absent: n.absent ?? false,
          saisiParId: ctx.utilisateurId,
        },
        update: {
          valeur: n.absent ? null : n.valeur!,
          absent: n.absent ?? false,
          saisiParId: ctx.utilisateurId,
        },
      });
    }
  }, { timeout: 30000, maxWait: 10000 });
  await logAction(db, evaluation.ecoleId, ctx.utilisateurId, 'note.saisie', 'evaluation', input.evaluationId, {
    count: input.notes.length,
    bareme: evaluation.sur,
  });
  return { count: input.notes.length };
}

// --------------------------------------------------------------------
// Bulletins (T5 + F12 rangs classe + mentions standard)
// --------------------------------------------------------------------

function appreciationDe(moyenne: number): string {
  if (moyenne >= 16) return 'Excellents résultats. Félicitations du conseil de classe.';
  if (moyenne >= 14) return 'Très bons résultats, poursuivez ainsi.';
  if (moyenne >= 12) return 'Bons résultats, encore des marges de progression.';
  if (moyenne >= 10) return 'Résultats satisfaisants ; un travail plus régulier permettra de progresser.';
  if (moyenne >= 8) return 'Résultats insuffisants. Travail soutenu recommandé.';
  return 'Résultats très insuffisants. Un accompagnement renforcé est nécessaire.';
}

/**
 * F12 — recalcul des rangs de TOUS les bulletins (dernière version) de
 * la classe sur la période. Ex-aequo = même rang. Transactionnel.
 */
async function recalculerRangsClasse(tx: any, classeId: string, periodeId: string) {
  const elevesClasse = await tx.eleve.findMany({
    where: { classeActuelleId: classeId, deletedAt: null },
    select: { id: true },
  });
  const bulletins = await tx.bulletin.findMany({
    where: { periodeId, eleveId: { in: elevesClasse.map((e: any) => e.id) }, statut: { not: 'annule' } },
    orderBy: { version: 'desc' },
  });
  // Meilleure version par élève
  const parEleve = new Map<string, { bulletinId: string; moyenne: number | null }>();
  for (const b of bulletins) {
    if (!parEleve.has(b.eleveId)) {
      parEleve.set(b.eleveId, { bulletinId: b.id, moyenne: b.moyenneGenerale });
    }
  }
  const tries = [...parEleve.entries()]
    .filter(([, v]) => v.moyenne !== null)
    .sort((a, b) => (b[1].moyenne as number) - (a[1].moyenne as number));
  const rangs = new Map<string, number>();
  let rangCourant = 0;
  let precedente: number | null = null;
  for (const [eleveId, v] of tries) {
    const m = v.moyenne as number;
    if (precedente === null || m !== precedente) rangCourant = rangCourant + 1;
    rangs.set(eleveId, rangCourant);
    precedente = m;
  }
  for (const [eleveId, r] of rangs) {
    const v = parEleve.get(eleveId)!;
    await tx.bulletin.update({ where: { id: v.bulletinId }, data: { rang: r } });
  }
  return rangs;
}

export type BulletinInput = {
  eleveId: string;
  periodeId: string;
  classeId: string;
};

export async function genererBulletinCore(ctx: Ctx, input: BulletinInput) {
  assertPermission(ctx, 'notes.saisir');
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  const classe = await db.classe.findUnique({ where: { id: input.classeId } });
  if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');

  // M17 — règle de calcul DU CYCLE de l'élève (plancher/plafond/arrondi)
  const eleveAvecClasse = await db.eleve.findUnique({
    where: { id: input.eleveId },
    include: { classeActuelle: { include: { niveau: { include: { section: { include: { cycle: true } } } } } } },
  });
  const cycleId = eleveAvecClasse?.classeActuelle?.niveau.section.cycle.id;
  const regle = cycleId ? await db.regleCalculMoyenne.findFirst({ where: { ecoleId: eleve.ecoleId, cycleId } }) : null;
  const borner = (v: number) => {
    let x = v;
    if (regle?.notePlancher !== null && regle?.notePlancher !== undefined) x = Math.max(x, regle.notePlancher);
    if (regle?.notePlafond !== null && regle?.notePlafond !== undefined) x = Math.min(x, regle.notePlafond);
    return x;
  };
  const arrondir = (v: number) => Number(v.toFixed(regle?.arrondi ?? 2));

  // Moyennes par matière (pondération par coefficient d'évaluation puis de matière).
  const notes = await db.note.findMany({
    where: { eleveId: input.eleveId, evaluation: { periodeId: input.periodeId, calculeDansMoyenne: true } },
    include: { evaluation: { include: { matiere: true } } },
  });
  const parMatiere = new Map<string, { somme: number; coef: number; count: number; matiere: string; coefMatiere: number }>();
  for (const n of notes) {
    if (n.absent || n.dispense || n.valeur === null) continue; // dispense exclu (F12)
    const m = n.evaluation.matiere;
    const cur = parMatiere.get(m.id) ?? { somme: 0, coef: 0, count: 0, matiere: m.libelle, coefMatiere: m.coefficient };
    cur.somme += (n.valeur / n.evaluation.sur) * 20 * n.evaluation.coefficient;
    cur.coef += n.evaluation.coefficient;
    cur.count++;
    parMatiere.set(m.id, cur);
  }
  const moyennes: Array<{ matiere: string; moyenne: number; coefficient: number; nbNotes: number }> = [];
  let totalPonderees = 0;
  let totalCoef = 0;
  for (const m of parMatiere.values()) {
    const moy = m.coef > 0 ? m.somme / m.coef : 0;
    moyennes.push({ matiere: m.matiere, moyenne: arrondir(borner(moy)), coefficient: m.coefMatiere, nbNotes: m.count });
    totalPonderees += moy * m.coefMatiere;
    totalCoef += m.coefMatiere;
  }
  // M18 — BULLETIN MIXTE : si le cycle travaille par compétences, le bulletin
  // est construit sur les évaluations de compétences (points 1-4) au lieu des notes.
  const modeCompetences = eleveAvecClasse?.classeActuelle?.niveau.section.cycle.modeEvaluation === 'competences';
  if (modeCompetences) {
    const évals = await db.evaluationCompetence.findMany({
      where: { eleveId: input.eleveId, periodeId: input.periodeId },
      include: { competence: true },
    });
    const points: Record<string, number> = { non_acquis: 1, en_cours_d_acquisition: 2, acquis: 3, maitrise: 4 };
    const parDomaine = new Map<string, { somme: number; n: number }>();
    for (const e of évals) {
      const dom = e.competence.libelle;
      const cur = parDomaine.get(dom) ?? { somme: 0, n: 0 };
      cur.somme += points[e.niveauAcquisition] ?? 0;
      cur.n++;
      parDomaine.set(dom, cur);
    }
    const moyennesComp = [...parDomaine.entries()].map(([lib, v]) => ({ competence: lib, niveau: Number((v.somme / v.n).toFixed(2)) }));
    const moyenneComp = moyennesComp.length ? Number((moyennesComp.reduce((s2, m) => s2 + m.niveau, 0) / moyennesComp.length).toFixed(2)) : null;
    const versionSuivante = async () => (await db.bulletin.findFirst({ where: { eleveId: input.eleveId, periodeId: input.periodeId }, orderBy: { version: 'desc' } }))?.version ?? 0;
    const v = (await versionSuivante()) + 1;
    const b = await db.bulletin.create({
      data: {
        eleveId: input.eleveId, classeId: input.classeId, periodeId: input.periodeId, version: v,
        statut: 'en_construction',
        moyennes: JSON.stringify(moyennesComp),
        moyenneGenerale: null, // pas de moyenne chiffrée en mode compétences
        appreciationGenerale: `${moyennesComp.length} compétence(s) évaluée(s) — niveau moyen ${moyenneComp ?? '—'}/4.`,
        creeParId: ctx.utilisateurId,
      },
    });
    return { bulletinId: b.id, version: v, moyenneGenerale: null, mention: 'Compétences', rang: null };
  }

  const moyenneGenerale = totalCoef > 0 ? arrondir(borner(totalPonderees / totalCoef)) : null;
  // F12 — échelle de mentions standard
  const mention = moyenneGenerale !== null ? mentionPourMoyenne(moyenneGenerale) : '—';
  const appreciation = moyenneGenerale !== null ? appreciationDe(moyenneGenerale) : 'Aucune note sur la période.';

  // T5 : version calculée et créée DANS la transaction + retry P2002.
  const debut = Date.now();
  return avecVerrou(`ped:${input.eleveId}:${input.periodeId}`, async () => {
  const MAX_RETRY = 4;
  for (let tentative = 1; tentative <= MAX_RETRY; tentative++) {
    try {
      // Idempotence : une tentative précédente peut avoir COMMITÉ malgré une
      // erreur rapportée (P2034 au commit) → on RETROUVE le bulletin créé.
      const dejaLa = await db.bulletin.findFirst({
        where: { eleveId: input.eleveId, periodeId: input.periodeId, creeParId: ctx.utilisateurId, dateCreation: { gte: new Date(debut - 1000) } },
        orderBy: { version: 'desc' },
      });
      if (dejaLa) {
        return { bulletinId: dejaLa.id, version: dejaLa.version, moyenneGenerale: dejaLa.moyenneGenerale, mention, rang: dejaLa.rang };
      }
      return await db.$transaction(async (tx) => {
        const dernier = await tx.bulletin.findFirst({
          where: { eleveId: input.eleveId, periodeId: input.periodeId },
          orderBy: { version: 'desc' },
        });
        const version = (dernier?.version ?? 0) + 1;

        const bulletin = await tx.bulletin.create({
          data: {
            eleveId: input.eleveId,
            classeId: input.classeId,
            periodeId: input.periodeId,
            version,
            statut: 'en_construction',
            moyennes: JSON.stringify(moyennes),
            moyenneGenerale,
            rang: null,
            appreciationGenerale: appreciation,
            creeParId: ctx.utilisateurId,
          },
        });
        // F12 — rangs recalculés pour TOUTE la classe, dans la même transaction
        const rangs = await recalculerRangsClasse(tx, input.classeId, input.periodeId);
        const rang = rangs.get(input.eleveId) ?? null;

        await logAction(tx, eleve.ecoleId, ctx.utilisateurId, 'bulletin.generation', 'bulletin', bulletin.id, {
          eleveId: input.eleveId,
          periodeId: input.periodeId,
          version,
          moyenneGenerale,
          mention,
          rang,
        });
        return { bulletinId: bulletin.id, version, moyenneGenerale, mention, rang };
      }, { timeout: 30000, maxWait: 10000 });
    } catch (e: any) {
      if (e instanceof ActionError) throw e;
      const collision =
        (e?.code === 'P2002' && String(e?.meta?.target ?? '').includes('version')) ||
        e?.code === 'P2034' ||
        /database is locked|Transaction already closed/i.test(String(e?.message ?? ''));
      if (collision && tentative < MAX_RETRY) continue; // version recalculée depuis l'état frais
      throw new ActionError(
        collision ? 'Génération concurrente détectée, la version a été recalculée. Consultez le bulletin existant.'
          : 'Erreur lors de la génération du bulletin. Réessayez.',
        collision ? 'COLLISION_VERSION' : 'ERREUR_METIER',
      );
    }
  }
  throw new ActionError('Génération de bulletin impossible (concurrence).', 'COLLISION_VERSION');
  });
}

// --------------------------------------------------------------------
// Machine à états stricte des bulletins (F6 : rôle DÉRIVÉ de la session)
// --------------------------------------------------------------------

export async function changerStatutBulletinCore(
  ctx: Ctx,
  bulletinId: string,
  statut: string,
) {
  // F6 — le rôle n'est PLUS un paramètre client : il est dérivé des
  // permissions de la session. « direction » = détenteur de bulletins.valider.
  const estDirection = ctx.type === 'super_admin' || ctx.permissions.has('bulletins.valider');
  const role: 'pp' | 'direction' = estDirection ? 'direction' : 'pp';
  const permissionRequise = estDirection ? 'bulletins.valider' : 'notes.saisir';
  assertPermission(ctx, permissionRequise);

  const b = await db.bulletin.findUnique({ where: { id: bulletinId } });
  if (!b) throw new ActionError('Bulletin introuvable.', 'INTROUVABLE');
  const eleve = await db.eleve.findUnique({ where: { id: b.eleveId } });
  assertTenant(eleve?.ecoleId, ctx, 'Ce bulletin');

  const autorises = TRANSITIONS_BULLETIN[b.statut] ?? [];
  if (!autorises.includes(statut)) {
    throw new ActionError(
      `Transition refusée : « ${b.statut} » → « ${statut} ». Transitions autorisées : ${autorises.join(', ')}.`,
      'TRANSITION_INVALIDE',
    );
  }
  // Rôles : seul le PP valide l'étape PP, seule la direction publie/annule.
  if ((statut === 'valide_pp' || statut === 'en_attente_validation_pp') && role !== 'pp' && role !== 'direction') {
    throw new ActionError('Seul le professeur principal peut valider cette étape.', 'ROLE_INVALIDE');
  }
  if ((statut === 'publie' || statut === 'annule') && role !== 'direction') {
    throw new ActionError(statut === 'publie' ? 'Seule la direction peut publier un bulletin.' : 'Seule la direction peut annuler un bulletin.', 'ROLE_INVALIDE');
  }

  const data: Record<string, unknown> = { statut };
  if (statut === 'valide_pp') {
    data.validePpParId = ctx.utilisateurId;
    data.dateValidationPp = new Date();
  }
  if (statut === 'publie') {
    data.valideDirectionParId = ctx.utilisateurId;
    data.dateValidationDirection = new Date();
    data.datePublication = new Date();
  }
  await db.bulletin.update({ where: { id: bulletinId }, data });
  await logAction(db, eleve?.ecoleId ?? null, ctx.utilisateurId, 'bulletin.changement_statut', 'bulletin', bulletinId, {
    statut,
    precedent: b.statut,
    eleveId: b.eleveId,
    role,
  });
  return { role };
}
