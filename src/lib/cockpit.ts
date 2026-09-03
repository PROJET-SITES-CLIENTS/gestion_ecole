// ====================================================================
// Utilitaires Cockpit 360° — fonctions pures partagées entre modules
// client (direction, portails métiers). Aucune dépendance serveur.
// ====================================================================

export const toJour = (d: any): string => new Date(d).toISOString().slice(0, 10);
export const toMois = (d: any): string => new Date(d).toISOString().slice(0, 7);
export const joursEntre = (a: Date, b: Date): number => Math.floor((b.getTime() - a.getTime()) / 86_400_000);
export const nomComplet = (p: any): string => (p ? `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() : '—');

/**
 * État des appels pour un jour donné — détecte l'« appel non fait ».
 * Une classe est « non appelée » si elle a des séances ce jour-là
 * mais AUCUN pointage de présence sur ces séances.
 */
export function etatAppels(classes: any[], seances: any[], presences: any[], jourIso: string) {
  const seanceById = new Map<string, any>(seances.map((s: any) => [s.id, s]));
  const seancesJour = seances.filter((s: any) => toJour(s.date) === jourIso);

  const nbSeancesParClasse = new Map<string, number>();
  seancesJour.forEach((s: any) => {
    nbSeancesParClasse.set(s.classeId, (nbSeancesParClasse.get(s.classeId) ?? 0) + 1);
  });

  const classesAppelees = new Set<string>();
  presences.forEach((p: any) => {
    const s = seanceById.get(p.seanceId);
    if (s && toJour(s.date) === jourIso) classesAppelees.add(s.classeId);
  });

  const classeById = new Map<string, any>(classes.map((c: any) => [c.id, c]));
  const manquants = [...nbSeancesParClasse.entries()]
    .filter(([classeId]) => !classesAppelees.has(classeId))
    .map(([classeId, nb]) => {
      const c = classeById.get(classeId);
      return { id: classeId, code: c?.code ?? '—', libelle: c?.libelle ?? c?.code ?? '—', nbSeances: nb };
    });
  const sansSeance = classes
    .filter((c: any) => !nbSeancesParClasse.has(c.id))
    .map((c: any) => ({ id: c.id, code: c.code, libelle: c.libelle ?? c.code }));
  const appelees = [...classesAppelees]
    .map((id) => classeById.get(id)?.code ?? id);

  return { manquants, sansSeance, appelees, nbSeancesJour: seancesJour.length };
}

/** Séries mensuelles (recettes/dépenses…) pour les tendances du cockpit. */
export function serieMensuelle(rows: any[], champDate: string, champMontant: string, nbMois = 6, ref?: Date | null) {
  const fin = ref ?? new Date();
  const mois: { label: string; total: number }[] = [];
  for (let i = nbMois - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - i, 1));
    mois.push({ label: d.toISOString().slice(0, 7), total: 0 });
  }
  const index = new Map(mois.map((m) => [m.label, m]));
  rows.forEach((r: any) => {
    const m = toMois(r[champDate]);
    const cible = index.get(m);
    if (cible) cible.total += r[champMontant] ?? 0;
  });
  return mois;
}

/** Export CSV (téléchargement navigateur) — BOM UTF-8 pour Excel. */
export function telechargerCsv(nomFichier: string, entetes: string[], lignes: (string | number | null | undefined)[][]) {
  const echappe = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [entetes.map(echappe).join(';'), ...lignes.map((l) => l.map(echappe).join(';'))].join('\n');
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier.endsWith('.csv') ? nomFichier : `${nomFichier}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
