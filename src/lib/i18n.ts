// ====================================================================
// E22 — INTERNATIONALISATION (socle FR/EN)
// Dictionnaire central : les modules piochent via t(cle, fr) ; l'utilisateur
// choisit sa langue (localStorage 'sg_langue'). Le français reste la
// référence exhaustive ; l'anglais couvre la navigation et les libellés
// transverses. Étendre = ajouter une entrée, aucun autre changement.
// ====================================================================

export type Langue = 'fr' | 'en';

export function langueCourante(): Langue {
  if (typeof window === 'undefined') return 'fr';
  return (localStorage.getItem('sg_langue') as Langue) || 'fr';
}

export function changerLangue(l: Langue) {
  if (typeof window !== 'undefined') localStorage.setItem('sg_langue', l);
}

const EN: Record<string, string> = {
  'nav.dashboard': 'Dashboard',
  'nav.eleves': 'Students',
  'nav.personnel': 'Staff',
  'nav.pedagogique': 'Academics',
  'nav.presences': 'Attendance',
  'nav.finances': 'Finances',
  'nav.services': 'Services',
  'nav.salles': 'Rooms & Calendar',
  'nav.examens': 'Official exams',
  'nav.rdv': 'Appointments',
  'nav.securite': 'Security',
  'nav.communication': 'Communication',
  'nav.audit': 'Audit log',
  'nav.vie-scolaire': 'School life',
  'nav.sante': 'Health',
  'nav.saas': 'SaaS admin',
  'nav.conseils': 'Class councils',
  'nav.admissions': 'Admissions',
  'nav.protection': 'Child protection',
  'nav.integrations': 'Integrations',
  'nav.activites': 'Activities & Trips',
  'nav.catalogue': 'Complementary catalog',
  'nav.vie_scolaire': 'School life',
  'nav.parent_portal': 'Parent portal',
  'nav.eleve_portal': 'Student portal',
  'common.charger-plus': 'Load more',
  'common.enregistrer': 'Save',
  'common.annuler': 'Cancel',
  'common.rechercher': 'Search…',
  'common.deconnexion': 'Sign out',
  'common.temps-reel': 'Live',
  'common.tout-marquer-lu': 'Mark all as read',
};

/** t('nav.eleves', 'Élèves') → traduction si disponible, sinon le libellé français. */
export function t(cle: string, libelleFrançais: string): string {
  const l = langueCourante();
  if (l === 'fr') return libelleFrançais;
  return EN[cle] ?? libelleFrançais;
}
