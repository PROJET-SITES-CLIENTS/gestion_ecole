// ====================================================================
// MÉTIER PÉDAGOGIE — corrections T4, T5
// T4 : notes bornées 0..barème, rejet de toute la saisie si une note
//      est invalide (aucune écriture partielle faussant la moyenne)
// T5 : génération de bulletin TRANSACTIONNELLE (version atomique),
//      + rang, mention et appréciation (enrichissement P1)
// Machine à états stricte pour les statuts de bulletin.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction } from './commun';

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

export async function creerEvaluationCore(ctx: Ctx, ecoleId: string, input: EvaluationInput) {
  assertPermission(ctx, 'notes.saisir');
  if (!input.intitule?.trim()) throw new ActionError("L'intitulé est obligatoire.", 'CHAMP_MANQUANT');
  if (!(input.sur > 0)) throw new ActionError('Le barème doit être strictement positif.', 'BAREME_INVALIDE');
  if (!(input.coefficient > 0)) throw new ActionError('Le coefficient doit être strictement positif.', 'COEF_INVALIDE');
  if (isNaN(input.date?.getTime())) throw new ActionError("Date d'évaluation invalide.", 'DATE_INVALIDE');
  for (const [id, nom] of [[input.classeId, 'Classe'], [input.matiereId, 'Matière'], [input.enseignantId, 'Enseignant'], [input.periodeId, 'Période']] as const) {
    if (!id) throw new ActionError(`${nom} manquant(e).`, 'CHAMP_MANQUANT');
  }
  const classe = await db.classe.findUnique({ where: { id: input.classeId } });
  if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  assertTenant(classe.ecoleId, ctx, 'Cette classe');

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

// --------------------------------------------------------------------
// Saisie de notes (T4)
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
// Bulletins (T5 + enrichissement rang/mention)
// --------------------------------------------------------------------

function mentionDe(moyenne: number): { mention: string; appreciation: string } {
  if (moyenne >= 16) return { mention: 'Excellent', appreciation: 'Excellents résultats. Félicitations du conseil de classe.' };
  if (moyenne >= 14) return { mention: 'Très bien', appreciation: 'Très bons résultats, poursuivez ainsi.' };
  if (moyenne >= 12) return { mention: 'Bien', appreciation: 'Bons résultats, encore des marges de progression.' };
  if (moyenne >= 10) return { mention: 'Assez bien', appreciation: 'Résultats satisfaisants ; un travail plus régulier permettra de progresser.' };
  if (moyenne >= 8) return { mention: 'Insuffisant', appreciation: 'Résultats insuffisants. Encouragements et travail soutenu recommandés.' };
  return { mention: 'Très insuffisant', appreciation: 'Résultats très insuffisants. Un accompagnement renforcé est nécessaire.' };
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

  // Moyennes par matière (même calcul que l'existant, resserré).
  const notes = await db.note.findMany({
    where: { eleveId: input.eleveId, evaluation: { periodeId: input.periodeId, calculeDansMoyenne: true } },
    include: { evaluation: { include: { matiere: true } } },
  });
  const parMatiere = new Map<string, { somme: number; coef: number; count: number; matiere: string; coefMatiere: number }>();
  for (const n of notes) {
    if (n.absent || n.valeur === null) continue;
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
    moyennes.push({ matiere: m.matiere, moyenne: Number(moy.toFixed(2)), coefficient: m.coefMatiere, nbNotes: m.count });
    totalPonderees += moy * m.coefMatiere;
    totalCoef += m.coefMatiere;
  }
  const moyenneGenerale = totalCoef > 0 ? Number((totalPonderees / totalCoef).toFixed(2)) : null;
  const { mention, appreciation } = moyenneGenerale !== null ? mentionDe(moyenneGenerale) : { mention: '—', appreciation: 'Aucune note sur la période.' };

  // T5 : version calculée et créée DANS la transaction + retry P2002.
  const MAX_RETRY = 4;
  for (let tentative = 1; tentative <= MAX_RETRY; tentative++) {
    try {
      return await db.$transaction(async (tx) => {
        const dernier = await tx.bulletin.findFirst({
          where: { eleveId: input.eleveId, periodeId: input.periodeId },
          orderBy: { version: 'desc' },
        });
        const version = (dernier?.version ?? 0) + 1;

        // Rang : moyenneGenerale la plus haute non nulle de la classe sur la période.
        const elevesClasse = await tx.eleve.findMany({
          where: { classeActuelleId: input.classeId, statut: 'actif' },
          select: { id: true },
        });
        const bulletinsClasse = await tx.bulletin.findMany({
          where: { periodeId: input.periodeId, eleveId: { in: elevesClasse.map((e) => e.id) } },
          orderBy: { version: 'desc' },
        });
        const meilleureParEleve = new Map<string, number>();
        for (const b of bulletinsClasse) {
          const cur = meilleureParEleve.get(b.eleveId);
          if (cur === undefined || (b.moyenneGenerale ?? -1) > cur) {
            meilleureParEleve.set(b.eleveId, b.moyenneGenerale ?? 0);
          }
        }
        const autres = [...meilleureParEleve.entries()].filter(([id]) => id !== input.eleveId);
        const rang =
          moyenneGenerale !== null ? autres.filter(([, m]) => m > moyenneGenerale).length + 1 : null;

        const bulletin = await tx.bulletin.create({
          data: {
            eleveId: input.eleveId,
            classeId: input.classeId,
            periodeId: input.periodeId,
            version,
            statut: 'en_construction',
            moyennes: JSON.stringify(moyennes),
            moyenneGenerale,
            rang,
            appreciationGenerale: appreciation,
            creeParId: ctx.utilisateurId,
          },
        });
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
}

// --------------------------------------------------------------------
// Machine à états stricte des bulletins
// --------------------------------------------------------------------

const TRANSITIONS: Record<string, string[]> = {
  en_construction: ['en_attente_validation_pp', 'valide_pp', 'en_attente_direction', 'publie'],
  en_attente_validation_pp: ['valide_pp', 'rectifie'],
  valide_pp: ['en_attente_direction', 'publie', 'rectifie'],
  en_attente_direction: ['publie', 'rectifie'],
  publie: ['rectifie'],
  rectifie: ['en_attente_validation_pp', 'valide_pp', 'en_attente_direction', 'publie'],
};

export async function changerStatutBulletinCore(
  ctx: Ctx,
  bulletinId: string,
  statut: string,
  role: 'pp' | 'direction',
) {
  assertPermission(ctx, role === 'direction' ? 'bulletins.valider' : 'notes.saisir');
  const b = await db.bulletin.findUnique({ where: { id: bulletinId } });
  if (!b) throw new ActionError('Bulletin introuvable.', 'INTROUVABLE');
  const eleve = await db.eleve.findUnique({ where: { id: b.eleveId } });
  assertTenant(eleve?.ecoleId, ctx, 'Ce bulletin');

  const autorises = TRANSITIONS[b.statut] ?? [];
  if (!autorises.includes(statut)) {
    throw new ActionError(
      `Transition refusée : « ${b.statut} » → « ${statut} ». Transitions autorisées : ${autorises.join(', ')}.`,
      'TRANSITION_INVALIDE',
    );
  }
  // Rôle : seul le PP valide l'étape PP, seule la direction publie.
  if (statut === 'valide_pp' && role !== 'pp' && role !== 'direction') {
    throw new ActionError('Seul le professeur principal peut valider cette étape.', 'ROLE_INVALIDE');
  }
  if (statut === 'publie' && role !== 'direction') {
    throw new ActionError('Seule la direction peut publier un bulletin.', 'ROLE_INVALIDE');
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
  });
  return { ok: true };
}
