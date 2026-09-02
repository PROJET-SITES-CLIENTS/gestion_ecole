// ====================================================================
// MÉTIER PRÉSENCES — persistance du motif d'appel (P1)
// Le motif saisi par l'enseignant (`motif_<eleveId>`) est désormais
// enregistré dans Presence.motifAbsence (avant : champ jeté).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, logAction } from './commun';

const STATUTS = ['present', 'absent', 'retard', 'excuse'];

export type SaisieAppelInput = {
  seanceId: string;
  presences: Array<{ eleveId: string; statut: string; minuteRetard?: number; motif?: string }>;
};

export async function saisirAppelCore(ctx: Ctx, input: SaisieAppelInput) {
  assertPermission(ctx, 'presences.saisir');
  const seance = await db.seance.findUnique({ where: { id: input.seanceId } });
  if (!seance) throw new ActionError('Séance introuvable.', 'INTROUVABLE');
  if (input.presences.length === 0) throw new ActionError('Aucune présence saisie.', 'SAISIE_VIDE');

  for (const p of input.presences) {
    if (!STATUTS.includes(p.statut)) {
      throw new ActionError(`Statut invalide : « ${p.statut} » (attendu : ${STATUTS.join(', ')}).`, 'CHAMP_INVALIDE');
    }
    if (p.statut === 'retard' && (p.minuteRetard ?? 0) < 0) {
      throw new ActionError('Les minutes de retard ne peuvent pas être négatives.', 'CHAMP_INVALIDE');
    }
  }

  await db.$transaction(async (tx) => {
    for (const p of input.presences) {
      await tx.presence.upsert({
        where: { eleveId_seanceId: { eleveId: p.eleveId, seanceId: input.seanceId } },
        create: {
          eleveId: p.eleveId,
          seanceId: input.seanceId,
          statut: p.statut,
          minuteRetard: p.statut === 'retard' ? p.minuteRetard ?? 0 : null,
          // P1 : le motif est persisté (fini le champ jeté côté UI)
          motifAbsence: p.motif?.trim() || null,
          saisiParId: ctx.utilisateurId,
        },
        update: {
          statut: p.statut,
          minuteRetard: p.statut === 'retard' ? p.minuteRetard ?? 0 : null,
          motifAbsence: p.motif?.trim() || null,
          saisiParId: ctx.utilisateurId,
        },
      });
    }
  }, { timeout: 30000, maxWait: 10000 });
  await logAction(db, null, ctx.utilisateurId, 'presence.saisie', 'seance', input.seanceId, { count: input.presences.length });
  return { count: input.presences.length };
}
