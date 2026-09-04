// Fonctions utilitaires partagées : formatage, statuts, etc.

// --------------------------------------------------------------------
// F16 — Montants en CENTIMES (Int) en base. Helpers de conversion et
// d'affichage : TOUT l'affichage passe par formatXOF, TOUTE saisie
// passe par versCentimes.
// --------------------------------------------------------------------

/** Convertit un montant saisi en unités (XOF) vers des centimes (Int). */
export function versCentimes(montant: number | string | null | undefined): number {
  const n = typeof montant === 'string' ? parseFloat(montant.replace(',', '.')) : (montant ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Convertit des centimes vers des unités (XOF). */
export function depuisCentimes(centimes: number | null | undefined): number {
  return (centimes ?? 0) / 100;
}

/** Affiche un montant stocké en CENTIMES. */
export function formatXOF(centimes: number | null | undefined, devise = 'XOF'): string {
  if (centimes === null || centimes === undefined) return '-';
  return formatMontant(depuisCentimes(centimes), devise);
}

/** Affiche un montant en unités (compat : nombres déjà en unités). */
export function formatMontant(montant: number | null | undefined, devise = "XOF"): string {
  if (montant === null || montant === undefined) return "-";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant) + " " + devise;
}

export function formatDate(date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  // timeZone "UTC" explicite : garantit un rendu IDENTIQUE côté serveur et client
  // (sinon Intl.DateTimeFormat utilise le fuseau local de la machine, différent
  // entre le serveur SSR et le navigateur => hydration mismatch React 19).
  const options: Intl.DateTimeFormatOptions = {
    ...(opts ?? { day: "2-digit", month: "2-digit", year: "numeric" }),
    timeZone: "UTC",
  };
  return new Intl.DateTimeFormat("fr-FR", options).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function initiales(nom: string, prenom: string): string {
  return ((prenom?.[0] ?? "") + (nom?.[0] ?? "")).toUpperCase();
}

export function statutColor(statut: string): string {
  const map: Record<string, string> = {
    actif: "bg-emerald-100 text-emerald-700 border-emerald-200",
    payee: "bg-emerald-100 text-emerald-700 border-emerald-200",
    publie: "bg-emerald-100 text-emerald-700 border-emerald-200",
    present: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "present(e)": "bg-emerald-100 text-emerald-700 border-emerald-200",
    essai: "bg-amber-100 text-amber-700 border-amber-200",
    planifiee: "bg-amber-100 text-amber-700 border-amber-200",
    planifie: "bg-amber-100 text-amber-700 border-amber-200",
    "en_cours": "bg-blue-100 text-blue-700 border-blue-200",
    "en_attente": "bg-amber-100 text-amber-700 border-amber-200",
    en_attente_validation_pp: "bg-amber-100 text-amber-700 border-amber-200",
    en_attente_validation_direction: "bg-amber-100 text-amber-700 border-amber-200",
    en_construction: "bg-blue-100 text-blue-700 border-blue-200",
    confirme: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "confirme(e)": "bg-emerald-100 text-emerald-700 border-emerald-200",
    reserve: "bg-rose-100 text-rose-700 border-rose-200",
    impayee: "bg-rose-100 text-rose-700 border-rose-200",
    impaye: "bg-rose-100 text-rose-700 border-rose-200",
    absent: "bg-rose-100 text-rose-700 border-rose-200",
    "absent(e)": "bg-rose-100 text-rose-700 border-rose-200",
    suspendu: "bg-rose-100 text-rose-700 border-rose-200",
    resilie: "bg-gray-200 text-gray-700 border-gray-300",
    retard: "bg-amber-100 text-amber-700 border-amber-200",
    excuse: "bg-gray-100 text-gray-700 border-gray-200",
    leger: "bg-amber-100 text-amber-700 border-amber-200",
    modere: "bg-orange-100 text-orange-700 border-orange-200",
    grave: "bg-rose-100 text-rose-700 border-rose-200",
    partiel: "bg-amber-100 text-amber-700 border-amber-200",
    valide_pp: "bg-blue-100 text-blue-700 border-blue-200",
    valide_direction: "bg-blue-100 text-blue-700 border-blue-200",
    rectifie: "bg-purple-100 text-purple-700 border-purple-200",
    non_acquis: "bg-rose-100 text-rose-700 border-rose-200",
    en_cours_d_acquisition: "bg-amber-100 text-amber-700 border-amber-200",
    acquis: "bg-emerald-100 text-emerald-700 border-emerald-200",
    maitrise: "bg-emerald-100 text-emerald-700 border-emerald-200",
    admis: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ajourne: "bg-rose-100 text-rose-700 border-rose-200",
    disponible: "bg-emerald-100 text-emerald-700 border-emerald-200",
    annule: "bg-gray-200 text-gray-700 border-gray-300",
    honore: "bg-emerald-100 text-emerald-700 border-emerald-200",
    decidee: "bg-blue-100 text-blue-700 border-blue-200",
    passee: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return map[statut] || "bg-gray-100 text-gray-700 border-gray-200";
}

export function statutLabel(statut: string): string {
  const map: Record<string, string> = {
    "en_construction": "En construction",
    "en_attente_validation_pp": "En attente validation PP",
    "valide_pp": "Validé PP",
    "en_attente_validation_direction": "En attente direction",
    "publie": "Publié",
    "rectifie": "Rectifié",
    "en_cours": "En cours",
    "en_cours_d_acquisition": "En cours d'acquisition",
    "non_acquis": "Non acquis",
    "acquis": "Acquis",
    "maitrise": "Maîtrisé",
    "en_attente": "En attente",
    "planifiee": "Planifiée",
    "passee": "Passée",
    "decidee": "Décidée",
    "impayee": "Impayée",
    "payee": "Payée",
    "partiel": "Partiel",
    "reserve": "Réservé",
    "disponible": "Disponible",
    "confirme": "Confirmé",
    "honore": "Honoré",
    "annule": "Annulé",
    "essai": "Essai",
    "actif": "Actif",
    "suspendu": "Suspendu",
    "resilie": "Résilié",
  };
  return map[statut] || statut;
}
