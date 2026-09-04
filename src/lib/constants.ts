// ====================================================================
// CONSTANTES MÉTIER — source unique de vérité (F18)
// SQLite ne supporte pas les enum Prisma natifs : tous les statuts et
// types métier vivent ICI, avec leurs schémas zod. Toute écriture en
// base DOIT passer par ces valeurs (plus de chaîne magique éparpillée).
// ====================================================================

import { z } from 'zod';

// ---- SaaS -----------------------------------------------------------
export const STATUTS_ECOLE = ['essai', 'actif', 'suspendu', 'resilie'] as const;
export const STATUTS_ABONNEMENT = ['essai', 'actif', 'suspendu', 'resilie'] as const;
export const STATUTS_FACTURE_SAAS = ['payee', 'impayee', 'en_retard'] as const;
export const MODES_FACTURATION = ['mensuel', 'annuel'] as const;

// ---- Utilisateurs / comptes ----------------------------------------
export const TYPES_UTILISATEUR = ['super_admin', 'personnel', 'parent', 'eleve'] as const;
export const LIENS_PARENT = ['pere', 'mere', 'tuteur_legal'] as const;

// ---- Élèves ----------------------------------------------------------
export const STATUTS_ELEVE = ['actif', 'diplome', 'transfere', 'exclu', 'sorti'] as const;
export const MOTIFS_SORTIE_ELEVE = [
  'deménagement', 'fin_de_cycle', 'exclusion_definitive', 'radiation_financiere',
  'transferement_autre_etablissement', 'autre',
] as const;

// ---- Pédagogie -------------------------------------------------------
export const TYPES_EVALUATION = ['devoir', 'composition', 'interrogation'] as const;
export const STATUTS_BULLETIN = [
  'en_construction', 'en_attente_validation_pp', 'valide_pp',
  'en_attente_direction', 'publie', 'rectifie', 'annule',
] as const;
// Machine à états du bulletin (F3 : ajout de annule ; F6 : le rôle est dérivé de la session)
export const TRANSITIONS_BULLETIN: Record<string, string[]> = {
  en_construction: ['en_attente_validation_pp', 'annule'],
  en_attente_validation_pp: ['valide_pp', 'en_construction', 'annule'],
  valide_pp: ['en_attente_direction', 'en_attente_validation_pp', 'annule'],
  en_attente_direction: ['publie', 'valide_pp', 'annule'],
  publie: ['rectifie'],
  rectifie: ['en_attente_direction', 'annule'],
  annule: [],
};
export const NIVEAUX_ACQUISITION = ['non_acquis', 'en_cours_d_acquisition', 'acquis', 'maitrise'] as const;

// Mentions standards (F12 — échelle francophone usuelle)
export function mentionPourMoyenne(moyenne: number | null | undefined): string {
  if (moyenne === null || moyenne === undefined) return '—';
  if (moyenne < 8) return 'Insuffisant';
  if (moyenne < 10) return 'Insuffisant';
  if (moyenne < 12) return 'Passable';
  if (moyenne < 14) return 'Assez bien';
  if (moyenne < 16) return 'Bien';
  if (moyenne < 18) return 'Très bien';
  return 'Excellent';
}

// ---- Présences -------------------------------------------------------
export const STATUTS_PRESENCE = ['present', 'absent', 'retard', 'excuse'] as const;
export const MOTIFS_JUSTIFICATION = ['maladie', 'familial', 'rendez_vous_medical', 'ceremonie', 'transport', 'autre'] as const;
export const STATUTS_JUSTIFICATION = ['soumis', 'valide', 'rejete'] as const;

// ---- Vie scolaire ----------------------------------------------------
export const GRAVITES_INCIDENT = ['leger', 'modere', 'grave'] as const;
export const TYPES_SANCTION = ['avertissement', 'retenue', 'exclusion', 'convocation', 'exclusion_temporaire'] as const;
export const STATUTS_SANCTION = ['decidee', 'executee', 'annulee'] as const;

// ---- Finances --------------------------------------------------------
export const MODES_PAIEMENT = ['espece', 'cheque', 'virement', 'carte', 'mobile_money'] as const;
export const STATUTS_ECHEANCE = ['impayee', 'partiel', 'payee', 'annulee'] as const;
export const TYPES_FRAIS = ['scolarite', 'inscription', 'cantine', 'transport', 'activite'] as const;
export const PERIODICITES_FRAIS = ['unique', 'mensuel', 'trimestriel', 'annuel'] as const;

// ---- RH ---------------------------------------------------------------
export const TYPES_CONGE = ['annuel', 'maladie', 'maternite', 'exceptionnel'] as const;
export const STATUTS_CONGE = ['demande', 'valide', 'refuse', 'annule'] as const;
export const TYPES_CONTRAT = ['CDI', 'CDD', 'vacataire', 'stagiaire'] as const;

// ---- RDV ---------------------------------------------------------------
export const STATUTS_CRENEAU_RDV = ['disponible', 'reserve', 'annule'] as const;
export const STATUTS_RDV = ['confirme', 'annule', 'honore', 'absence'] as const;

// ---- Santé --------------------------------------------------------------
export const ISSUES_PASSAGE = ['retour_classe', 'parents_contactes', 'depart_hopital', 'retour_domicile'] as const;

// ---- Système -------------------------------------------------------------
export const CANAUX_NOTIFICATION = ['in_app', 'sms', 'email', 'push'] as const;
export const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const;

// ---- Schémas zod réutilisables -------------------------------------------
export const zStatutEleve = z.enum(STATUTS_ELEVE);
export const zModePaiement = z.enum(MODES_PAIEMENT);
export const zStatutPresence = z.enum(STATUTS_PRESENCE);
export const zStatutBulletin = z.enum(STATUTS_BULLETIN);
export const zStatutEcheance = z.enum(STATUTS_ECHEANCE);
export const zStatutConge = z.enum(STATUTS_CONGE);
export const zTypeContrat = z.enum(TYPES_CONTRAT);
export const zCanalNotification = z.enum(CANAUX_NOTIFICATION);

// ---- Cibles d'envoi en masse --------------------------------------------
export const CIBLES_NOTIFICATION = [
  'utilisateur', 'tous_personnel', 'tous_parents', 'classe', 'niveau',
] as const;
export const zCibleNotification = z.enum(CIBLES_NOTIFICATION);
