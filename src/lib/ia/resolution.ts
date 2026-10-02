// ====================================================================
// RÉSOLUTION D'ENTITÉS POUR L'IA — ANTI-CONFUSION
// Problème corrigé : les outils résolvaient les noms avec un simple
// `findFirst + contains` NON DÉTERMINISTE (« Dessin » pouvait attraper
// « Arts et Dessin », l'IA modifiait/supprimait le mauvais objet).
// Procédure stricte appliquée à toutes les entités nommées :
//   1. correspondance EXACTE (casse/accents ignorés) → unique ;
//   2. sinon « contient » trié — 1 seul résultat → retenu ;
//   3. plusieurs résultats → { erreur + candidats } : l'IA demande
//      à l'utilisateur de préciser, JAMAIS de choix au hasard ;
//   4. aucun résultat → { erreur + entités existantes } pour que
//      l'IA se corrige et reformule.
// ====================================================================

import { db } from '@/lib/db';

/** Normalise pour comparaison : casse, accents, espaces multiples. */
export function normaliser(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export type Resolution<T> =
  | { trouve: true; entite: T }
  | { trouve: false; erreur: string; candidats: string[] };

function pluriel(nb: number, mot: string): string {
  return `${nb} ${mot}${nb > 1 ? 's' : ''}`;
}

/** Message d'ambiguïté avec les candidats, prêt à être relu par l'IA. */
function ambigu(libelleType: string, q: string, candidats: string[]): Resolution<never> {
  return {
    trouve: false,
    erreur: `Plusieurs ${libelleType}s correspondent à « ${q} » : ${candidats.slice(0, 8).join(', ')}. Précisez laquelle exactement.`,
    candidats,
  };
}

/** Message d'introuvable avec les entités existantes (max 15). */
function introuvable(libelleType: string, q: string, existantes: string[]): Resolution<never> {
  const liste = existantes.slice(0, 15).join(', ');
  return {
    trouve: false,
    erreur: `${libelleType.charAt(0).toUpperCase() + libelleType.slice(1)} « ${q} » introuvable. ${existantes.length > 0 ? `${libelleType}s existantes : ${liste}${existantes.length > 15 ? '…' : ''}` : `Aucune ${libelleType} n'existe encore.`}`,
    candidats: [],
  };
}

/** Sélection générique : exacte d'abord, puis « contient » unique. */
async function resoudre<T>(
  qBrut: string,
  libelleType: string,
  charger: () => Promise<T[]>,
  libelleDe: (e: T) => string,
): Promise<Resolution<T>> {
  const q = normaliser(qBrut);
  if (!q) return introuvable(libelleType, '(vide)', []);
  const toutes = await charger();
  if (toutes.length === 0) return introuvable(libelleType, qBrut, []);
  // 1. Exacte
  const exactes = toutes.filter((e) => normaliser(libelleDe(e)) === q);
  if (exactes.length === 1) return { trouve: true, entite: exactes[0] };
  if (exactes.length > 1) return ambigu(libelleType, qBrut, exactes.map(libelleDe));
  // 2. Contient (les deux sens : « maths » doit trouver « Mathématiques »)
  const contient = toutes.filter(
    (e) => normaliser(libelleDe(e)).includes(q) || q.includes(normaliser(libelleDe(e))),
  );
  if (contient.length === 1) return { trouve: true, entite: contient[0] };
  if (contient.length > 1) return ambigu(libelleType, qBrut, contient.map(libelleDe));
  // 4. Introuvable
  return introuvable(libelleType, qBrut, toutes.map(libelleDe));
}

export async function resoudreMatiere(ecoleId: string, q: string): Promise<Resolution<{ id: string; libelle: string; code: string; coefficient: number }>> {
  return resoudre(
    q, 'matière',
    () => db.matiere.findMany({ where: { ecoleId }, orderBy: { libelle: 'asc' }, select: { id: true, libelle: true, code: true, coefficient: true } }),
    (m) => m.libelle,
  );
}

export async function resoudreClasse(ecoleId: string, q: string): Promise<Resolution<{ id: string; libelle: string; code: string; niveauId: string; anneeScolaireId: string }>> {
  // Une classe se désigne par code OU libellé : on résout sur les deux
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId, active: true }, select: { id: true } });
  const qN = normaliser(q);
  const classes = await db.classe.findMany({
    where: { ecoleId, ...(annee ? { anneeScolaireId: annee.id } : {}) },
    orderBy: { libelle: 'asc' },
    select: { id: true, libelle: true, code: true, niveauId: true, anneeScolaireId: true },
  });
  if (!qN) return introuvable('classe', '(vide)', classes.map((c) => c.libelle));
  if (classes.length === 0) return introuvable('classe', q, []);
  const exactes = classes.filter((c) => normaliser(c.code) === qN || normaliser(c.libelle) === qN);
  if (exactes.length === 1) return { trouve: true, entite: exactes[0] };
  if (exactes.length > 1) return ambigu('classe', q, exactes.map((c) => c.libelle));
  const contient = classes.filter((c) => normaliser(c.libelle).includes(qN) || normaliser(c.code).includes(qN) || qN.includes(normaliser(c.code)));
  if (contient.length === 1) return { trouve: true, entite: contient[0] };
  if (contient.length > 1) return ambigu('classe', q, contient.map((c) => c.libelle));
  return introuvable('classe', q, classes.map((c) => c.libelle));
}

export async function resoudreNiveau(ecoleId: string, q: string): Promise<Resolution<{ id: string; libelle: string; code: string }>> {
  return resoudre(
    q, 'niveau',
    () => db.niveau.findMany({ where: { section: { cycle: { ecoleId } } }, orderBy: { ordre: 'asc' }, select: { id: true, libelle: true, code: true } }),
    (n) => n.code || n.libelle,
  );
}

export async function resoudrePersonnel(ecoleId: string, q: string): Promise<Resolution<{ id: string; nom: string; prenom: string; matricule: string | null }>> {
  // Un personnel se désigne par nom, prénom ou les deux
  const qN = normaliser(q);
  const pers = await db.personnel.findMany({
    where: { ecoleId, deletedAt: null },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    select: { id: true, nom: true, prenom: true, matricule: true },
  });
  if (!qN) return introuvable('personnel', '(vide)', pers.map((p) => `${p.prenom} ${p.nom}`));
  if (pers.length === 0) return introuvable('personnel', q, []);
  const lib = (p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`.trim();
  const termes = qN.split(' ').filter(Boolean);
  const exactes = pers.filter((p) => normaliser(lib(p)) === qN || normaliser(p.nom) === qN || normaliser(p.prenom) === qN);
  if (exactes.length === 1) return { trouve: true, entite: exactes[0] };
  const contient = pers.filter((p) => termes.every((t) => normaliser(lib(p)).includes(t)));
  if (contient.length === 1) return { trouve: true, entite: contient[0] };
  if (exactes.length > 1 || contient.length > 1) {
    const cands = (exactes.length >= contient.length && exactes.length > 0 ? exactes : contient).map(lib);
    return ambigu('personnel', q, cands);
  }
  return introuvable('personnel', q, pers.map(lib));
}

/** Résout une liste d'entités d'un coup (ex: les classes d'une affectation).
 *  Retourne soit toutes trouvées, soit le premier blocage expliqué. */
export async function resoudrePlusieurs<T>(
  nomsBruts: string[],
  libelleType: string,
  un: (nom: string) => Promise<Resolution<T>>,
): Promise<{ ok: true; entites: T[] } | { ok: false; erreur: string }> {
  const entites: T[] = [];
  const introuvables: string[] = [];
  for (const nom of nomsBruts) {
    const r = await un(nom);
    if (r.trouve) entites.push(r.entite);
    else introuvables.push(`${nom} → ${r.erreur}`);
  }
  if (introuvables.length > 0) {
    return { ok: false, erreur: `Résolution ${libelleType} : ${introuvables.join(' | ')}` };
  }
  return { ok: true, entites };
}

export { pluriel };

/** Résolution CHIRURGICALE d'un élève par nom (prénom nom, nom, ou matricule).
 *  1. matricule exact → 2. « prénom nom » exact → 3. termes tous présents unique.
 *  Jamais de choix au hasard : ambiguïté → candidats. */
export async function resoudreEleve(ecoleId: string, q: string): Promise<Resolution<{ id: string; nom: string; prenom: string; matricule: string | null; classeActuelleId: string | null }>> {
  const eleves = await db.eleve.findMany({
    where: { ecoleId, deletedAt: null },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    select: { id: true, nom: true, prenom: true, matricule: true, classeActuelleId: true },
  });
  const qN = normaliser(q);
  if (!qN) return introuvable('élève', '(vide)', []);
  if (eleves.length === 0) return introuvable('élève', q, []);
  const lib = (e: { prenom: string; nom: string }) => `${e.prenom} ${e.nom}`.trim();
  // 1. matricule exact
  const parMat = eleves.filter((e) => e.matricule && normaliser(e.matricule) === qN);
  if (parMat.length === 1) return { trouve: true, entite: parMat[0] };
  // 2. nom complet exact (les deux sens)
  const exactes = eleves.filter((e) => normaliser(lib(e)) === qN || normaliser(`${e.nom} ${e.prenom}`) === qN);
  if (exactes.length === 1) return { trouve: true, entite: exactes[0] };
  if (exactes.length > 1) return ambigu('élève', q, exactes.map(lib));
  // 3. tous les termes présents
  const termes = qN.split(' ').filter(Boolean);
  const partiels = eleves.filter((e) => termes.every((t) => normaliser(lib(e)).includes(t)));
  if (partiels.length === 1) return { trouve: true, entite: partiels[0] };
  if (partiels.length > 1) return ambigu('élève', q, partiels.map(lib).slice(0, 8));
  return introuvable('élève', q, eleves.map(lib).slice(0, 15));
}

/** Alias historique. */
export const resoudreEleveSiPresent = resoudreEleve;
