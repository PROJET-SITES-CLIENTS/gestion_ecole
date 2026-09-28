// ====================================================================
// MÉTIER STATISTIQUES D'ABSENTÉISME — AUDIT PRÉSENCES
// Le cockpit Présences cumule TOUS les appels de classe faits par les
// enseignants et produit : courbes journalières/hebdo/mensuelles, top
// absentéisme et top assiduité, répartition garçons/filles, taux par
// classe, absences justifiées vs non justifiées, tendance vs période
// précédente — et la relance des familles (seuil configurable).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermissionParmi, logAction, notifierParentsEtDirection } from './commun';

export type StatsAbsences = {
  fenetreJours: number;
  kpi: {
    tauxAbsentéisme: number; // % absences / total appels
    totalAppels: number;
    presents: number;
    absences: number;
    absencesJustifiees: number;
    retards: number;
    excuse: number;
    tendanceAbsences: number; // % évolution vs période précédente
  };
  parJour: Array<{ date: string; absences: number; retards: number; taux: number }>;
  parSemaine: Array<{ semaine: string; absences: number; retards: number }>;
  parMois: Array<{ mois: string; absences: number; retards: number; taux: number }>;
  parClasse: Array<{
    classeId: string; classe: string; cycle: string;
    appels: number; absences: number; retards: number; taux: number; elevesTouches: number;
  }>;
  parSexe: { garçons: number; filles: number; nonRenseigné: number };
  topAbsentéisme: Array<{
    eleveId: string; nom: string; prenom: string; classe: string; sexe: string;
    absences: number; justifiees: number; retards: number; taux: number;
  }>;
  topAssiduité: Array<{ eleveId: string; nom: string; prenom: string; classe: string; presences: number; absences: number }>;
};

const lundi = (d: Date) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const jour = x.getUTCDay(); // 0=dimanche
  const dec = jour === 0 ? 6 : jour - 1;
  x.setUTCDate(x.getUTCDate() - dec);
  return x;
};

/**
 * Statistiques d'absentéisme complètes sur la fenêtre demandée (jours).
 * Permission : vie_scolaire.gerer OU presences.saisir (enseignant inclus).
 */
export async function statsAbsencesCore(ctx: Ctx, fenetreJours: number): Promise<StatsAbsences> {
  assertPermissionParmi(ctx, ['vie_scolaire.gerer', 'presences.saisir']);
  if (![7, 30, 60, 90, 365].includes(fenetreJours)) fenetreJours = 30;
  const ecoleId = ctx.ecoleId;

  const fin = new Date();
  const début = new Date(Date.now() - fenetreJours * 86400000);
  // Période précédente de même durée (tendance)
  const débutPrec = new Date(début.getTime() - fenetreJours * 86400000);

  const [présences] = await Promise.all([
    db.presence.findMany({
      where: { dateSaisie: { gte: début }, ...(ecoleId ? { seance: { classe: { ecoleId } } } : {}) },
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, sexe: true, classeActuelle: { select: { id: true, libelle: true, niveau: { select: { section: { select: { cycle: { select: { libelle: true } } } } } } } } } },
        justification: { select: { statut: true } },
      },
    }),
  ]);

  const classeParId = new Map<string, { libelle: string; cycle: string }>();
  for (const p of présences) {
    if (p.eleve.classeActuelle && !classeParId.has(p.eleve.classeActuelle.id)) {
      classeParId.set(p.eleve.classeActuelle.id, {
        libelle: p.eleve.classeActuelle.libelle,
        cycle: p.eleve.classeActuelle.niveau?.section?.cycle?.libelle ?? '—',
      });
    }
  }

  // ---- KPI globaux ----
  const totalAppels = présences.length;
  const absences = présences.filter((p) => p.statut === 'absent');
  const absencesJustifiees = absences.filter((p) => p.justification?.statut === 'valide').length;
  const retards = présences.filter((p) => p.statut === 'retard').length;
  const presents = présences.filter((p) => p.statut === 'present').length;
  const excuse = présences.filter((p) => p.statut === 'excuse').length;
  const absencesPrec = await (async () => {
    try {
      return await db.presence.count({
        where: {
          dateSaisie: { gte: débutPrec, lt: début }, statut: 'absent',
          ...(ecoleId ? { seance: { classe: { ecoleId } } } : {}),
        },
      });
    } catch { return 0; }
  })();

  // ---- Séries temporelles ----
  const jourMap = new Map<string, { absences: number; retards: number; appels: number }>();
  const semaineMap = new Map<string, { absences: number; retards: number }>();
  const moisMap = new Map<string, { absences: number; retards: number; appels: number }>();
  for (let i = 0; i < présences.length; i++) {
    const p = présences[i];
    const d = new Date(p.dateSaisie);
    const cléJour = d.toISOString().slice(0, 10);
    const j = jourMap.get(cléJour) ?? { absences: 0, retards: 0, appels: 0 };
    j.appels++;
    if (p.statut === 'absent') j.absences++;
    if (p.statut === 'retard') j.retards++;
    jourMap.set(cléJour, j);
    const cléSem = lundi(d).toISOString().slice(0, 10);
    const s = semaineMap.get(cléSem) ?? { absences: 0, retards: 0 };
    if (p.statut === 'absent') s.absences++;
    if (p.statut === 'retard') s.retards++;
    semaineMap.set(cléSem, s);
    const cléMois = d.toISOString().slice(0, 7);
    const m = moisMap.get(cléMois) ?? { absences: 0, retards: 0, appels: 0 };
    m.appels++;
    if (p.statut === 'absent') m.absences++;
    if (p.statut === 'retard') m.retards++;
    moisMap.set(cléMois, m);
  }
  const parJour = [...jourMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, absences: v.absences, retards: v.retards, taux: v.appels > 0 ? Number(((v.absences / v.appels) * 100).toFixed(1)) : 0 }));
  const parSemaine = [...semaineMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([semaine, v]) => ({ semaine, absences: v.absences, retards: v.retards }));
  const parMois = [...moisMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mois, v]) => ({ mois, absences: v.absences, retards: v.retards, taux: v.appels > 0 ? Number(((v.absences / v.appels) * 100).toFixed(1)) : 0 }));

  // ---- Par classe ----
  const classeStats = new Map<string, { libelle: string; cycle: string; appels: number; absences: number; retards: number; touches: Set<string> }>();
  for (const p of présences) {
    const c = p.eleve.classeActuelle;
    if (!c) continue;
    const cur = classeStats.get(c.id) ?? { libelle: c.libelle, cycle: c.niveau?.section?.cycle?.libelle ?? '—', appels: 0, absences: 0, retards: 0, touches: new Set<string>() };
    cur.appels++;
    if (p.statut === 'absent') { cur.absences++; cur.touches.add(p.eleveId); }
    if (p.statut === 'retard') cur.retards++;
    classeStats.set(c.id, cur);
  }
  const parClasse = [...classeStats.entries()]
    .map(([classeId, v]) => ({
      classeId, classe: v.libelle, cycle: v.cycle, appels: v.appels,
      absences: v.absences, retards: v.retards,
      taux: v.appels > 0 ? Number(((v.absences / v.appels) * 100).toFixed(1)) : 0,
      elevesTouches: v.touches.size,
    }))
    .sort((a, b) => b.taux - a.taux);

  // ---- Répartition par sexe (absences) ----
  const parSexe = { garçons: 0, filles: 0, nonRenseigné: 0 };
  for (const a of absences) {
    if (a.eleve.sexe === 'M') parSexe.garçons++;
    else if (a.eleve.sexe === 'F') parSexe.filles++;
    else parSexe.nonRenseigné++;
  }

  // ---- Top absentéisme / top assiduité ----
  const parEleve = new Map<string, { nom: string; prenom: string; classe: string; sexe: string; absences: number; justifiees: number; retards: number; presences: number; appels: number }>();
  for (const p of présences) {
    const cur = parEleve.get(p.eleveId) ?? {
      nom: p.eleve.nom, prenom: p.eleve.prenom,
      classe: p.eleve.classeActuelle?.libelle ?? '—', sexe: p.eleve.sexe ?? '',
      absences: 0, justifiees: 0, retards: 0, presences: 0, appels: 0,
    };
    cur.appels++;
    if (p.statut === 'absent') { cur.absences++; if (p.justification?.statut === 'valide') cur.justifiees++; }
    if (p.statut === 'retard') cur.retards++;
    if (p.statut === 'present') cur.presences++;
    parEleve.set(p.eleveId, cur);
  }
  const topAbsentéisme = [...parEleve.entries()]
    .filter(([, e]) => e.absences > 0)
    .sort((a, b) => b[1].absences - a[1].absences)
    .slice(0, 15)
    .map(([eleveId, e]) => ({
      eleveId, nom: e.nom, prenom: e.prenom, classe: e.classe, sexe: e.sexe,
      absences: e.absences, justifiees: e.justifiees, retards: e.retards,
      taux: e.appels > 0 ? Number(((e.absences / e.appels) * 100).toFixed(1)) : 0,
    }));
  const topAssiduité = [...parEleve.entries()]
    .filter(([, e]) => e.appels >= 3 && e.absences === 0)
    .sort((a, b) => b[1].presences - a[1].presences)
    .slice(0, 10)
    .map(([eleveId, e]) => ({
      eleveId, nom: e.nom, prenom: e.prenom, classe: e.classe, presences: e.presences, absences: e.absences,
    }));

  return {
    fenetreJours,
    kpi: {
      tauxAbsentéisme: totalAppels > 0 ? Number(((absences.length / totalAppels) * 100).toFixed(2)) : 0,
      totalAppels,
      presents,
      absences: absences.length,
      absencesJustifiees,
      retards,
      excuse,
      tendanceAbsences: absencesPrec > 0 ? Number((((absences.length - absencesPrec) / absencesPrec) * 100).toFixed(1)) : absences.length > 0 ? 100 : 0,
    },
    parJour,
    parSemaine,
    parMois,
    parClasse,
    parSexe,
    topAbsentéisme,
    topAssiduité,
  };
}

/**
 * Notifie les familles des élèves dépassant le seuil d'absences NON justifiées
 * sur la fenêtre (relance vie scolaire — dashboard présences).
 */
export async function notifierFamillesAbsencesCore(ctx: Ctx, seuilAbsences: number, fenetreJours: number) {
  assertPermissionParmi(ctx, ['vie_scolaire.gerer', 'presences.saisir']);
  if (!ctx.ecoleId) throw new ActionError('Aucune école associée à votre compte.', 'ECOLE_ABSENTE');
  if (seuilAbsences < 1) throw new ActionError('Le seuil doit être ≥ 1 absence.', 'CHAMP_INVALIDE');
  const début = new Date(Date.now() - fenetreJours * 86400000);
  const absences = await db.presence.findMany({
    where: { dateSaisie: { gte: début }, statut: 'absent', seance: { classe: { ecoleId: ctx.ecoleId } } },
    include: { eleve: true, justification: { select: { statut: true } } },
  });
  const compteur = new Map<string, { prenom: string; nom: string; nonJustifiees: number; total: number; ecoleId: string }>();
  for (const a of absences) {
    const cur = compteur.get(a.eleveId) ?? { prenom: a.eleve.prenom, nom: a.eleve.nom, nonJustifiees: 0, total: 0, ecoleId: a.eleve.ecoleId };
    cur.total++;
    if (a.justification?.statut !== 'valide') cur.nonJustifiees++;
    compteur.set(a.eleveId, cur);
  }
  let famillesNotifiées = 0;
  for (const [eleveId, info] of compteur) {
    if (info.nonJustifiees < seuilAbsences) continue;
    await notifierParentsEtDirection(
      db as any, info.ecoleId, eleveId,
      `Absentéisme à signaler — ${info.prenom} ${info.nom}`,
      `${info.prenom} ${info.nom} compte ${info.total} absence(s) sur les ${fenetreJours} derniers jours, dont ${info.nonJustifiees} non justifiée(s) (seuil d'alerte : ${seuilAbsences}). Merci de justifier ces absences ou de prendre contact avec la vie scolaire.`,
    );
    famillesNotifiées++;
  }
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'absentéisme.notification_familles', undefined, undefined, {
    seuil: seuilAbsences, fenêtre: fenetreJours, famillesNotifiées,
  });
  return { famillesNotifiées, élèvesConcernés: [...compteur.values()].filter((c) => c.nonJustifiees >= seuilAbsences).length };
}
