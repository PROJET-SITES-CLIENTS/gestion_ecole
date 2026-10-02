// ====================================================================
// MOTEUR DE RYTHME PÉDAGOGIQUE — AUDIT ENSEIGNANT
// Le cahier de textes alimente désormais l'avancement du programme :
// chaque entrée est rattachée à un CHAPITRE, et le système calcule en
// permanence le rythme ATTENDU (position dans les périodes planifiées)
// vs le RÉALISÉ (avancements déclarés + chapitres complétés via cahier).
// Statuts : en_avance / a_l_heure / en_retard / demarre (rien encore).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermissionParmi, assertTenant } from './commun';

export type StatutRythme = 'en_avance' | 'a_l_heure' | 'en_retard' | 'demarre';

export type RythmeProgrammeClasse = {
  programmeId: string;
  programme: string;
  matiere: string;
  niveau: string;
  classeId: string;
  classe: string;
  nbChapitres: number;
  chapitresTermines: number;
  pourcentageRealise: number;   // avancements déclarés / chapitres complétés
  pourcentageAttendu: number;   // position temporelle idéale à la date du jour
  ecart: number;                // réalisé - attendu (points de %)
  statut: StatutRythme;
  chapitresEnRetard: string[];  // chapitres dont la période est finie et avancement < 100
  derniereEntreeCahier: string | null; // date ISO de la dernière entrée liée
};

/** Progression attendue d'un chapitre à la date du jour (0 à 1).
 *  Chapitre planifié sur une période : attendu complet après la fin de la
 *  période, proportionnel au temps écoulé pendant celle-ci, 0 avant.
 *  Chapitre non planifié : progression globale de l'année scolaire. */
function attenduChapitre(
  chapitre: { periodeId: string | null },
  periodeParId: Map<string, { dateDebut: Date; dateFin: Date }>,
  annee: { dateDebut: Date; dateFin: Date } | null,
  maintenant: Date,
): number {
  if (chapitre.periodeId) {
    const p = periodeParId.get(chapitre.periodeId);
    if (!p) return 0;
    if (maintenant >= p.dateFin) return 1;
    if (maintenant <= p.dateDebut) return 0;
    return (maintenant.getTime() - p.dateDebut.getTime()) / (p.dateFin.getTime() - p.dateDebut.getTime());
  }
  if (!annee) return 0;
  if (maintenant >= annee.dateFin) return 1;
  if (maintenant <= annee.dateDebut) return 0;
  return (maintenant.getTime() - annee.dateDebut.getTime()) / (annee.dateFin.getTime() - annee.dateDebut.getTime());
}

/** Évalue le rythme d'UN programme pour les classes qui le suivent
 *  (les classes du niveau du programme). */
export async function evaluerRythmeProgrammeCore(ctx: Ctx, programmeId: string): Promise<RythmeProgrammeClasse[]> {
  assertPermissionParmi(ctx, ['notes.saisir', 'eleves.lire']);
  const prog = await db.programme.findUnique({
    where: { id: programmeId },
    include: { matiere: true, niveau: true, anneeScolaire: true, chapitres: { orderBy: { ordre: 'asc' } } },
  });
  if (!prog) throw new ActionError('Programme introuvable.', 'INTROUVABLE');
  assertTenant(prog.ecoleId, ctx, 'Ce programme');

  const periodes = await db.periode.findMany({
    where: { ecoleId: prog.ecoleId, anneeScolaireId: prog.anneeScolaireId },
    select: { id: true, dateDebut: true, dateFin: true },
  });
  const periodeParId = new Map(periodes.map((p) => [p.id, { dateDebut: p.dateDebut, dateFin: p.dateFin }]));
  const annee = { dateDebut: prog.anneeScolaire.dateDebut, dateFin: prog.anneeScolaire.dateFin };
  const maintenant = new Date();

  // Les classes du niveau qui suivent ce programme (avec leurs avancements)
  const classes = await db.classe.findMany({
    where: { ecoleId: prog.ecoleId, anneeScolaireId: prog.anneeScolaireId, niveauId: prog.niveauId },
    select: { id: true, libelle: true },
  });
  const classeIds = classes.map((c) => c.id);
  const avancements = classeIds.length
    ? await db.avancementProgramme.findMany({ where: { chapitreId: { in: prog.chapitres.map((c) => c.id) }, classeId: { in: classeIds } } })
    : [];
  // Dernières entrées de cahier liées à ces chapitres (preuve d'activité)
  const entrees = prog.chapitres.length
    ? await db.entreeCahierTexte.findMany({
        where: { chapitreId: { in: prog.chapitres.map((c) => c.id) } },
        orderBy: { dateCours: 'desc' },
        select: { chapitreId: true, dateCours: true, cahierTexte: { select: { classeId: true } } },
      })
    : [];

  const nb = prog.chapitres.length;
  return classes.map((cl) => {
    const avParChapitre = new Map<string, number>();
    for (const a of avancements) {
      if (a.classeId === cl.id) avParChapitre.set(a.chapitreId, a.pourcentage);
    }
    let sommeRealise = 0;
    let sommeAttendu = 0;
    const enRetard: string[] = [];
    for (const ch of prog.chapitres) {
      const av = avParChapitre.get(ch.id) ?? 0;
      sommeRealise += av;
      const attendu = attenduChapitre(ch, periodeParId, annee, maintenant);
      sommeAttendu += attendu;
      // Chapitre en retard : sa période est terminée et il n'est pas complété
      if (ch.periodeId && av < 100) {
        const p = periodeParId.get(ch.periodeId);
        if (p && maintenant > p.dateFin) enRetard.push(ch.titre);
      }
    }
    // NB : sommeRealise est en POINTS DE % (av.pourcentage), sommeAttendu en
    // fraction (0-1) — normalisation avant division par le nb de chapitres.
    const realise = nb > 0 ? Number((sommeRealise / nb).toFixed(1)) : 0;
    const attendu = nb > 0 ? Number(((sommeAttendu / nb) * 100).toFixed(1)) : 0;
    const ecart = Number((realise - attendu).toFixed(1));
    const derniereEntree = entrees.find((e) => e.cahierTexte?.classeId === cl.id)?.dateCours ?? null;
    let statut: StatutRythme;
    if (realise === 0 && entrees.filter((e) => e.cahierTexte?.classeId === cl.id).length === 0) statut = 'demarre';
    else if (ecart < -10) statut = 'en_retard';
    else if (ecart > 10) statut = 'en_avance';
    else statut = 'a_l_heure';
    return {
      programmeId: prog.id,
      programme: prog.titre,
      matiere: prog.matiere.libelle,
      niveau: prog.niveau.libelle,
      classeId: cl.id,
      classe: cl.libelle,
      nbChapitres: nb,
      chapitresTermines: [...avParChapitre.values()].filter((v) => v >= 100).length,
      pourcentageRealise: realise,
      pourcentageAttendu: attendu,
      ecart,
      statut,
      chapitresEnRetard: enRetard,
      derniereEntreeCahier: derniereEntree ? derniereEntree.toISOString() : null,
    };
  });
}

/** Vue globale du rythme de TOUS les programmes de l'école (direction,
 *  enseignant). Filtre optionnel sur les classes de l'enseignant. */
export async function rythmeProgrammesCore(ctx: Ctx): Promise<RythmeProgrammeClasse[]> {
  assertPermissionParmi(ctx, ['notes.saisir', 'eleves.lire']);
  if (!ctx.ecoleId) return [];
  const progs = await db.programme.findMany({
    where: { ecoleId: ctx.ecoleId },
    select: { id: true },
  });
  const tous: RythmeProgrammeClasse[] = [];
  for (const p of progs) {
    tous.push(...(await evaluerRythmeProgrammeCore(ctx, p.id).catch(() => [])));
  }
  return tous.sort((a, b) => a.ecart - b.ecart); // les plus en retard d'abord
}
