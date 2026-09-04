'use client';

// ====================================================================
// Module V4 complet — Affiche les 37 failles corrigées par catégories
// Accessible aux portails super_admin, direction (et enseignant en partie)
// ====================================================================

import { useState } from 'react';
import {
  LifeBuoy, ShieldAlert, FileText, Wallet, UserPlus, Calendar,
  BookOpen, ClipboardCheck, FileCheck, Building, MessageSquare,
  Shield, Lock, Globe, RefreshCw, FileSignature, Layers,
  ChevronDown, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge } from '@/components/shared-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMontant, formatDate } from '@/lib/format';

type Faille = {
  num: number;
  titre: string;
  icon: any;
  color: string;
  data: any[];
  columns: { key: string; label: string; render?: (r: any) => any }[];
  description?: string;
};

export default function V4ModulesModule({ initialData }: { initialData: any }) {
  const [expanded, setExpanded] = useState<number | null>(1);

  const failles: Faille[] = [
    // POINT 1 — Tickets Support
    {
      num: 1,
      titre: 'Tickets Support SaaS (Partie A)',
      icon: LifeBuoy,
      color: 'blue',
      data: initialData.tickets ?? [],
      description: 'Workflow de support bidirectionnel entre école et éditeur SaaS, avec SLA contractuel, messages et historique de statut.',
      columns: [
        { key: 'sujet', label: 'Sujet' },
        { key: 'priorite', label: 'Priorité', render: (t) => <StatusBadge statut={t.priorite} /> },
        { key: 'statut', label: 'Statut', render: (t) => <StatusBadge statut={t.statut} /> },
        { key: 'categorie', label: 'Catégorie' },
        { key: 'messages', label: 'Messages', render: (t) => t.messages?.length ?? 0 },
        { key: 'dateCreation', label: 'Créé le', render: (t) => formatDate(t.dateCreation) },
      ],
    },
    // POINT 2 — Signalements mineurs
    {
      num: 2,
      titre: 'Signalements protection mineurs (Partie C.8)',
      icon: ShieldAlert,
      color: 'rose',
      data: initialData.signalementsMineurs ?? [],
      description: 'Recueil des informations préoccupantes. Liens avec partenaires externes (CRIP, services sociaux). Mesures de protection et suivi.',
      columns: [
        { key: 'type', label: 'Type', render: (s) => <StatusBadge statut={s.type} /> },
        { key: 'eleveId', label: 'Élève', render: (s) => s.eleveId?.slice(-8) ?? '—' },
        { key: 'gravite', label: 'Gravité', render: (s) => <StatusBadge statut={s.gravite} /> },
        { key: 'source', label: 'Source' },
        { key: 'statut', label: 'Statut', render: (s) => <StatusBadge statut={s.statut} /> },
        { key: 'confidentialiteNiveau', label: 'Confidentialité' },
        { key: 'dateSignalement', label: 'Signalé le', render: (s) => formatDate(s.dateSignalement) },
      ],
    },
    // POINT 3 — Habilitation pénale
    {
      num: 3,
      titre: 'Habilitation pénale / antécédents (Partie C.8)',
      icon: FileCheck,
      color: 'rose',
      data: initialData.verificationsAntecedents ?? [],
      description: 'Vérification obligatoire des antécédents pénaux pour tout personnel encadrant des mineurs. Suivi des habilitations et de leur expiration.',
      columns: [
        { key: 'type', label: 'Type de vérif' },
        { key: 'statut', label: 'Statut', render: (v) => <StatusBadge statut={v.statut} /> },
        { key: 'dateObtention', label: 'Obtenue le', render: (v) => formatDate(v.dateObtention) },
        { key: 'dateExpiration', label: 'Expire le', render: (v) => formatDate(v.dateExpiration) },
      ],
    },
    // POINT 4 — Bulletins de paie
    {
      num: 4,
      titre: 'Bulletins de paie (Partie B RH)',
      icon: Wallet,
      color: 'emerald',
      data: initialData.bulletinsPaie ?? [],
      description: 'Génération des bulletins de paie : salaire brut/net, cotisations patronales et salariales, primes, indemnités, retenues.',
      columns: [
        { key: 'periode', label: 'Période' },
        { key: 'salaireBrut', label: 'Brut', render: (b) => formatMontant(b.salaireBrut, b.devise) },
        { key: 'salaireNet', label: 'Net', render: (b) => formatMontant(b.salaireNet, b.devise) },
        { key: 'cotisationsTotales', label: 'Cotisations', render: (b) => formatMontant(b.cotisationsTotales, b.devise) },
        { key: 'netAPayer', label: 'À payer', render: (b) => formatMontant(b.netAPayer, b.devise) },
        { key: 'statut', label: 'Statut', render: (b) => <StatusBadge statut={b.statut} /> },
        { key: 'lignes', label: 'Lignes', render: (b) => b.lignes?.length ?? 0 },
      ],
    },
    // POINT 5 — Recrutement
    {
      num: 5,
      titre: 'Recrutement complet (Partie B RH)',
      icon: UserPlus,
      color: 'emerald',
      data: initialData.offresEmploi ?? [],
      description: 'Workflow complet : offre → candidatures → tri CV → entretiens → décision. Comptes-rendus et notes d\'entretien.',
      columns: [
        { key: 'poste', label: 'Poste' },
        { key: 'typeContrat', label: 'Contrat' },
        { key: 'statut', label: 'Statut', render: (o) => <StatusBadge statut={o.statut} /> },
        { key: 'dateOuverture', label: 'Ouverte le', render: (o) => formatDate(o.dateOuverture) },
        { key: 'dateCloture', label: 'Clôture le', render: (o) => formatDate(o.dateCloture) },
      ],
    },
    // POINT 6 — Stages
    {
      num: 6,
      titre: 'Stages & conventions (Partie B RH)',
      icon: FileText,
      color: 'emerald',
      data: initialData.stages ?? [],
      description: 'Suivi des stages élèves (lycée) et conventions tripartites (élève / école / entreprise).',
      columns: [
        { key: 'entreprise', label: 'Entreprise' },
        { key: 'poste', label: 'Poste' },
        { key: 'dateDebut', label: 'Début', render: (s) => formatDate(s.dateDebut) },
        { key: 'dateFin', label: 'Fin', render: (s) => formatDate(s.dateFin) },
        { key: 'statut', label: 'Statut', render: (s) => <StatusBadge statut={s.statut} /> },
      ],
    },
    // POINT 7 — Soldes congés
    {
      num: 7,
      titre: 'Soldes de congés payés (Partie B RH)',
      icon: RefreshCw,
      color: 'emerald',
      data: initialData.soldesConge ?? [],
      description: 'Compteurs annuels de congés payés : droits acquis, jours pris, restants, reliquats.',
      columns: [
        { key: 'annee', label: 'Année' },
        { key: 'droitsAcquis', label: 'Acquis' },
        { key: 'joursPris', label: 'Pris' },
        { key: 'joursRestants', label: 'Restants' },
        { key: 'reliquatAnterieur', label: 'Reliquat' },
      ],
    },
    // POINT 8 — Admissions
    {
      num: 8,
      titre: 'Admissions / pré-inscriptions (Partie B Élèves)',
      icon: UserPlus,
      color: 'blue',
      data: initialData.candidaturesAdmission ?? [],
      description: 'Workflow d\'admission en ligne : dépôt dossier → test → entretien → décision. Suivi des étapes et statut final.',
      columns: [
        { key: 'nom', label: 'Candidat', render: (c) => `${c.prenom} ${c.nom}` },
        { key: 'niveauId', label: 'Niveau' },
        { key: 'etablissementOrigine', label: 'Origine' },
        { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} /> },
        { key: 'dossierComplet', label: 'Dossier', render: (c) => c.dossierComplet ? 'Complet' : 'Incomplet' },
        { key: 'dateSoumission', label: 'Soumis le', render: (c) => formatDate(c.dateSoumission) },
      ],
    },
    // POINT 9 — Emploi du temps
    {
      num: 9,
      titre: 'Emploi du temps récurrent iCal (Partie B Pédagogique)',
      icon: Calendar,
      color: 'purple',
      data: initialData.emploisTemps ?? [],
      description: 'Créneaux hebdomadaires récurrents avec règle iCal RRULE (FREQ=WEEKLY;UNTIL=...). Génération automatique des séances à venir.',
      columns: [
        { key: 'jour', label: 'Jour' },
        { key: 'heureDebut', label: 'Début' },
        { key: 'heureFin', label: 'Fin' },
        { key: 'recurrenceRule', label: 'RRULE iCal' },
        { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
        { key: 'creneaux', label: 'Créneaux hebdo', render: (e) => e.creneauHebdos?.length ?? 0 },
      ],
    },
    // POINT 10 — Devoirs
    {
      num: 10,
      titre: 'Devoirs & rendus élèves (Partie B Pédagogique)',
      icon: BookOpen,
      color: 'purple',
      data: initialData.devoirs ?? [],
      description: 'Assignation de devoirs, dépôt en ligne par l\'élève, correction et note avec appréciation.',
      columns: [
        { key: 'intitule', label: 'Intitulé' },
        { key: 'type', label: 'Type' },
        { key: 'dateRendu', label: 'À rendre le', render: (d) => formatDate(d.dateRendu) },
        { key: 'sur', label: 'Sur' },
        { key: 'coefficient', label: 'Coef' },
        { key: 'statut', label: 'Statut', render: (d) => <StatusBadge statut={d.statut} /> },
      ],
    },
    // POINT 11 — Cahier de textes
    {
      num: 11,
      titre: 'Cahier de textes numérique (Partie B Pédagogique)',
      icon: ClipboardCheck,
      color: 'purple',
      data: initialData.cahiersTexte ?? [],
      description: 'Cahier de textes par classe et matière : contenu des séances, travail à faire, validation pédagogique.',
      columns: [
        { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} /> },
        { key: 'entrees', label: 'Entrées', render: (c) => c.entrees?.length ?? 0 },
      ],
    },
    // POINT 12 — Conseils de classe
    {
      num: 12,
      titre: 'Conseils de classe & délibérations (Partie B)',
      icon: ClipboardCheck,
      color: 'purple',
      data: initialData.conseilsClasse ?? [],
      description: 'Organisation des conseils : membres, présence, délibérations par élève (passage, mention, votes).',
      columns: [
        { key: 'date', label: 'Date', render: (c) => formatDate(c.date) },
        { key: 'salle', label: 'Salle' },
        { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} /> },
        { key: 'membres', label: 'Membres', render: (c) => c.membres?.length ?? 0 },
        { key: 'deliberations', label: 'Délibérations', render: (c) => c.deliberations?.length ?? 0 },
      ],
    },
    // POINT 13 — Dispenses
    {
      num: 13,
      titre: 'Dispenses (EPS, médical) (Partie B Pédagogique)',
      icon: ClipboardCheck,
      color: 'purple',
      data: initialData.dispenses ?? [],
      description: 'Dispenses d\'activité (EPS, atelier) sur motif médical ou religieux, avec justificatif et validation direction.',
      columns: [
        { key: 'motif', label: 'Motif' },
        { key: 'description', label: 'Description' },
        { key: 'dateDebut', label: 'Du', render: (d) => formatDate(d.dateDebut) },
        { key: 'dateFin', label: 'Au', render: (d) => formatDate(d.dateFin) },
        { key: 'statut', label: 'Statut', render: (d) => <StatusBadge statut={d.statut} /> },
      ],
    },
    // POINT 14 — Justification absence
    {
      num: 14,
      titre: 'Workflow justification d\'absence (Partie B Présences)',
      icon: ClipboardCheck,
      color: 'purple',
      data: initialData.justificationsAbsence ?? [],
      description: 'Workflow complet : soumission parent → validation vie scolaire → statut (validé / rejeté) avec justificatif.',
      columns: [
        { key: 'dateAbsence', label: 'Date absence', render: (j) => formatDate(j.dateAbsence) },
        { key: 'dureeHeures', label: 'Durée (h)' },
        { key: 'motif', label: 'Motif' },
        { key: 'statut', label: 'Statut', render: (j) => <StatusBadge statut={j.statut} /> },
        { key: 'dateValidation', label: 'Validé le', render: (j) => formatDate(j.dateValidation) },
      ],
    },
    // POINT 15 — Budgets
    {
      num: 15,
      titre: 'Budgets prévisionnels (Partie B Finances)',
      icon: Wallet,
      color: 'emerald',
      data: initialData.budgets ?? [],
      description: 'Budgets annuels avec lignes prévues vs réalisées par catégorie (recettes / dépenses) et sous-catégorie.',
      columns: [
        { key: 'libelle', label: 'Libellé' },
        { key: 'statut', label: 'Statut', render: (b) => <StatusBadge statut={b.statut} /> },
        { key: 'dateDebut', label: 'Du', render: (b) => formatDate(b.dateDebut) },
        { key: 'dateFin', label: 'Au', render: (b) => formatDate(b.dateFin) },
        { key: 'lignes', label: 'Lignes', render: (b) => b.lignes?.length ?? 0 },
      ],
    },
    // POINT 16 — Comptabilité générale
    {
      num: 16,
      titre: 'Comptabilité générale (Partie B Finances)',
      icon: Wallet,
      color: 'emerald',
      data: initialData.ecrituresComptable ?? [],
      description: 'Plan comptable, journaux (ACH, VTE, BQ, OD), écritures avec lignes débit/crédit et validation.',
      columns: [
        { key: 'numeroPiece', label: 'Pièce' },
        { key: 'libelle', label: 'Libellé' },
        { key: 'date', label: 'Date', render: (e) => formatDate(e.date) },
        { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
        { key: 'lignes', label: 'Lignes', render: (e) => e.lignes?.length ?? 0 },
      ],
    },
    // POINT 17 — Fournisseurs & commandes
    {
      num: 17,
      titre: 'Fournisseurs & commandes (Partie B Finances)',
      icon: Wallet,
      color: 'emerald',
      data: initialData.fournisseurs ?? [],
      description: 'Référentiel fournisseurs, bons de commande avec lignes, réceptions partielles/totales et contrôle qualité.',
      columns: [
        { key: 'nom', label: 'Fournisseur' },
        { key: 'type', label: 'Type' },
        { key: 'email', label: 'Email' },
        { key: 'statut', label: 'Statut', render: (f) => <StatusBadge statut={f.statut} /> },
      ],
    },
    // POINT 18 — Factures fournisseurs
    {
      num: 18,
      titre: 'Factures & paiements fournisseurs (Partie B Finances)',
      icon: FileText,
      color: 'emerald',
      data: initialData.facturesFournisseur ?? [],
      description: 'Réception, contrôle, rapprochement avec commandes, et paiement des factures fournisseurs.',
      columns: [
        { key: 'numero', label: 'Numéro' },
        { key: 'dateEmission', label: 'Émise le', render: (f) => formatDate(f.dateEmission) },
        { key: 'montantTTC', label: 'TTC', render: (f) => formatMontant(f.montantTTC, f.devise) },
        { key: 'statut', label: 'Statut', render: (f) => <StatusBadge statut={f.statut} /> },
      ],
    },
    // POINT 19 — Avoirs
    {
      num: 19,
      titre: 'Avoirs / credit notes (Partie B Finances)',
      icon: FileText,
      color: 'emerald',
      data: initialData.avoirsEcole ?? [],
      description: 'Avoirs émis en réponse à des retours, erreurs ou litiges. Suivi de leur utilisation.',
      columns: [
        { key: 'numero', label: 'Numéro' },
        { key: 'montant', label: 'Montant', render: (a) => formatMontant(a.montant, a.devise) },
        { key: 'motif', label: 'Motif' },
        { key: 'statut', label: 'Statut', render: (a) => <StatusBadge statut={a.statut} /> },
        { key: 'dateEmission', label: 'Émis le', render: (a) => formatDate(a.dateEmission) },
      ],
    },
    // POINT 20 — Messagerie interne
    {
      num: 20,
      titre: 'Messagerie interne (Partie B Communication)',
      icon: MessageSquare,
      color: 'blue',
      data: initialData.conversations ?? [],
      description: 'Conversations 1-à-1 et de groupe, avec participants, messages, pièces jointes et lecture.',
      columns: [
        { key: 'titre', label: 'Conversation' },
        { key: 'type', label: 'Type' },
        { key: 'participants', label: 'Participants', render: (c) => c.participants?.length ?? 0 },
        { key: 'messages', label: 'Messages', render: (c) => c.messages?.length ?? 0 },
        { key: 'dernierMessageAt', label: 'Dernier msg', render: (c) => formatDate(c.dernierMessageAt) },
      ],
    },
    // POINT 21 — Annonces
    {
      num: 21,
      titre: 'Annonces / publications (Partie B Communication)',
      icon: MessageSquare,
      color: 'blue',
      data: initialData.annonces ?? [],
      description: 'Annonces école / cycle / classe, avec ciblage audience, épinglage, expiration et suivi des lectures.',
      columns: [
        { key: 'titre', label: 'Titre' },
        { key: 'cible', label: 'Cible' },
        { key: 'pinned', label: 'Épinglée', render: (a) => a.pinned ? 'Oui' : 'Non' },
        { key: 'statut', label: 'Statut', render: (a) => <StatusBadge statut={a.statut} /> },
        { key: 'datePublication', label: 'Publiée le', render: (a) => formatDate(a.datePublication) },
      ],
    },
    // POINT 22 — SMS log
    {
      num: 22,
      titre: 'SMS log & accusés (Partie B Communication)',
      icon: MessageSquare,
      color: 'blue',
      data: initialData.smsLogs ?? [],
      description: 'Journal complet des SMS envoyés : provider, ID message, statut livraison, coût, segments.',
      columns: [
        { key: 'destinataire', label: 'Destinataire' },
        { key: 'provider', label: 'Provider' },
        { key: 'message', label: 'Message', render: (s) => s.message?.slice(0, 50) + '...' },
        { key: 'statut', label: 'Statut', render: (s) => <StatusBadge statut={s.statut} /> },
        { key: 'coutTotal', label: 'Coût', render: (s) => formatMontant(s.coutTotal) },
        { key: 'dateEnvoi', label: 'Envoyé le', render: (s) => formatDate(s.dateEnvoi) },
      ],
    },
    // POINT 23 — Push notifications
    {
      num: 23,
      titre: 'Push notifications & devices (Partie B Communication)',
      icon: MessageSquare,
      color: 'blue',
      data: initialData.pushNotificationLogs ?? [],
      description: 'Gestion des tokens PWA/mobile (FCM, APNs), devices enregistrés et logs de livraison des push.',
      columns: [
        { key: 'titre', label: 'Titre' },
        { key: 'corps', label: 'Corps', render: (p) => p.corps?.slice(0, 50) + '...' },
        { key: 'statut', label: 'Statut', render: (p) => <StatusBadge statut={p.statut} /> },
        { key: 'dateEnvoi', label: 'Envoyée le', render: (p) => formatDate(p.dateEnvoi) },
      ],
    },
    // POINT 24 — Sessions
    {
      num: 24,
      titre: 'Sessions actives & révocation (Partie B Sécurité)',
      icon: Lock,
      color: 'amber',
      data: initialData.sessionsUtilisateur ?? [],
      description: 'Suivi des sessions actives par utilisateur, avec fingerprint, IP, user-agent et révocation manuelle.',
      columns: [
        { key: 'adresseIp', label: 'IP' },
        { key: 'deviceType', label: 'Device' },
        { key: 'localisation', label: 'Localisation' },
        { key: 'active', label: 'Active', render: (s) => s.active ? 'Oui' : 'Révoquée' },
        { key: 'dateCreation', label: 'Créée le', render: (s) => formatDate(s.dateCreation) },
        { key: 'dateExpiration', label: 'Expire le', render: (s) => formatDate(s.dateExpiration) },
      ],
    },
    // POINT 25 — 2FA
    {
      num: 25,
      titre: '2FA complet (Partie B Sécurité)',
      icon: Lock,
      color: 'amber',
      data: initialData.twoFactorMethods ?? [],
      description: 'Multi-méthodes 2FA : TOTP (app), SMS, email, et 10 codes de secours à usage unique.',
      columns: [
        { key: 'methode', label: 'Méthode' },
        { key: 'actif', label: 'Actif', render: (t) => t.actif ? 'Oui' : 'Non' },
        { key: 'dateActivation', label: 'Activée le', render: (t) => formatDate(t.dateActivation) },
      ],
    },
    // POINT 26 — Tokens d'auth
    {
      num: 26,
      titre: 'Tokens d\'authentification (Partie B Sécurité)',
      icon: Lock,
      color: 'amber',
      data: initialData.jetonsAuth ?? [],
      description: 'Jetons à usage unique pour reset password, vérification email, magic link — avec expiration.',
      columns: [
        { key: 'email', label: 'Email' },
        { key: 'type', label: 'Type' },
        { key: 'utilise', label: 'Utilisé', render: (j) => j.utilise ? 'Oui' : 'Non' },
        { key: 'expireLe', label: 'Expire le', render: (j) => formatDate(j.expireLe) },
      ],
    },
    // POINT 27 — API tokens
    {
      num: 27,
      titre: 'API tokens publics (Partie B API)',
      icon: Lock,
      color: 'amber',
      data: initialData.apiTokens ?? [],
      description: 'Tokens d\'API publique avec scopes par ressource, taux limite horaire, logs de requêtes.',
      columns: [
        { key: 'nom', label: 'Nom' },
        { key: 'prefix', label: 'Préfixe' },
        { key: 'tauxLimiteHoraire', label: 'Limite/h' },
        { key: 'totalRequettes', label: 'Requêtes totales' },
        { key: 'actif', label: 'Actif', render: (a) => a.actif ? 'Oui' : 'Non' },
      ],
    },
    // POINT 28 — Webhooks
    {
      num: 28,
      titre: 'Webhooks sortants (Partie B API)',
      icon: Lock,
      color: 'amber',
      data: initialData.webhooksSortants ?? [],
      description: 'Webhooks sortants : URL, secret, events abonnés, tentatives de livraison avec retry.',
      columns: [
        { key: 'url', label: 'URL', render: (w) => w.url?.slice(0, 50) + '...' },
        { key: 'events', label: 'Events', render: (w) => JSON.parse(w.events || '[]').join(', ') },
        { key: 'actif', label: 'Actif', render: (w) => w.actif ? 'Oui' : 'Non' },
        { key: 'dateCreation', label: 'Créé le', render: (w) => formatDate(w.dateCreation) },
      ],
    },
    // POINT 29 — Demandes effacement
    {
      num: 29,
      titre: 'Demandes d\'effacement RGPD (Partie B RGPD)',
      icon: Shield,
      color: 'amber',
      data: initialData.demandesEffacement ?? [],
      description: 'Workflow d\'anonymisation sur demande du sujet (parent pour mineur) ou obligation légale.',
      columns: [
        { key: 'cibleType', label: 'Cible type' },
        { key: 'motif', label: 'Motif' },
        { key: 'statut', label: 'Statut', render: (d) => <StatusBadge statut={d.statut} /> },
        { key: 'dateDemande', label: 'Demandée le', render: (d) => formatDate(d.dateDemande) },
      ],
    },
    // POINT 30 — Export données
    {
      num: 30,
      titre: 'Export données / portabilité (Partie B RGPD)',
      icon: Shield,
      color: 'amber',
      data: initialData.exportsDonnees ?? [],
      description: 'Génération d\'exports JSON/CSV/ZIP pour portabilité. Liens temporaires avec expiration.',
      columns: [
        { key: 'cibleType', label: 'Cible' },
        { key: 'format', label: 'Format' },
        { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
        { key: 'tailleOctets', label: 'Taille (octets)' },
        { key: 'dateGeneration', label: 'Généré le', render: (e) => formatDate(e.dateGeneration) },
      ],
    },
    // POINT 31 — Consentements
    {
      num: 31,
      titre: 'Consentements (image + communication) (Partie B RGPD)',
      icon: Shield,
      color: 'amber',
      data: initialData.consentementsImage ?? [],
      description: 'Consentements parents pour droit à l\'image (site web, plaquette, presse) et canaux de communication.',
      columns: [
        { key: 'eleveId', label: 'Élève', render: (c) => c.eleveId?.slice(-8) ?? '—' },
        { key: 'accord', label: 'Accord', render: (c) => c.accord ? 'Oui' : 'Non' },
        { key: 'usage', label: 'Usage' },
        { key: 'duree', label: 'Durée' },
        { key: 'dateAccord', label: 'Donné le', render: (c) => formatDate(c.dateAccord) },
      ],
    },
    // POINT 32 — Registre traitements
    {
      num: 32,
      titre: 'Registre des traitements (article 30 RGPD)',
      icon: Shield,
      color: 'amber',
      data: initialData.registreTraitements ?? [],
      description: 'Registre RGPD article 30 : finalité, base légale, données, destinataires, transferts, durée de conservation, DPO.',
      columns: [
        { key: 'nom', label: 'Traitement' },
        { key: 'finalite', label: 'Finalité' },
        { key: 'baseLegale', label: 'Base légale' },
        { key: 'dureeConservation', label: 'Conservation' },
        { key: 'dpo', label: 'DPO' },
      ],
    },
    // POINT 33 — Domaine + thème
    {
      num: 33,
      titre: 'Domaine personnalisé & thème (Partie A SaaS)',
      icon: Globe,
      color: 'blue',
      data: initialData.domainesPersonnalises ?? [],
      description: 'Domaines personnalisés par école (white-label) avec vérification DNS et SSL. Thème école (couleurs, logo).',
      columns: [
        { key: 'domaine', label: 'Domaine' },
        { key: 'verifie', label: 'Vérifié', render: (d) => d.verifie ? 'Oui' : 'En attente' },
        { key: 'certificatSSL', label: 'SSL' },
        { key: 'certificatExpireLe', label: 'SSL expire le', render: (d) => formatDate(d.certificatExpireLe) },
      ],
    },
    // POINT 34 — Feature flags + quotas + Stripe
    {
      num: 34,
      titre: 'Feature flags, quotas, Stripe (Partie A SaaS)',
      icon: Globe,
      color: 'blue',
      data: initialData.quotaUsages ?? [],
      description: 'Rollout progressif par feature flag, suivi des quotas mensuels (élèves, SMS, storage, API) et webhooks Stripe idempotents.',
      columns: [
        { key: 'periode', label: 'Période' },
        { key: 'ressource', label: 'Ressource' },
        { key: 'consommation', label: 'Conso' },
        { key: 'limite', label: 'Limite' },
        { key: 'pourcentage', label: '%', render: (q) => `${q.pourcentage}%` },
      ],
    },
    // POINT 35 — Plans PPS/PAP/PAI
    {
      num: 35,
      titre: 'Plans PPS / PAP / PAI / PAPSI (Partie C.2)',
      icon: Shield,
      color: 'rose',
      data: initialData.plansAccompagnement ?? [],
      description: 'Plans formalisés d\'accompagnement : PPS (handicap), PAP (troubles apprentissage), PAI (maladie chronique), PAPSI. Équipe éducative, objectifs, révisions.',
      columns: [
        { key: 'type', label: 'Type', render: (p) => <StatusBadge statut={p.type} /> },
        { key: 'eleveId', label: 'Élève', render: (p) => p.eleveId?.slice(-8) ?? '—' },
        { key: 'dateDebut', label: 'Début', render: (p) => formatDate(p.dateDebut) },
        { key: 'dateFin', label: 'Fin', render: (p) => formatDate(p.dateFin) },
        { key: 'statut', label: 'Statut', render: (p) => <StatusBadge statut={p.statut} /> },
        { key: 'membres', label: 'Membres éq.', render: (p) => p.membres?.length ?? 0 },
        { key: 'objectifs', label: 'Objectifs', render: (p) => p.objectifs?.length ?? 0 },
      ],
    },
    // POINT 36 — Templates + signatures
    {
      num: 36,
      titre: 'Templates PDF, signature, rapports (Partie B/D)',
      icon: FileSignature,
      color: 'purple',
      data: initialData.documentsGeneres ?? [],
      description: 'Modèles de documents (HTML/LaTeX/DOCX), génération avec variables, signature électronique eIDAS, rapports sauvegardés.',
      columns: [
        { key: 'titre', label: 'Titre' },
        { key: 'cibleType', label: 'Cible' },
        { key: 'format', label: 'Format' },
        { key: 'version', label: 'Version' },
        { key: 'signatures', label: 'Signatures', render: (d) => d.signatures?.length ?? 0 },
        { key: 'dateGeneration', label: 'Généré le', render: (d) => formatDate(d.dateGeneration) },
      ],
    },
    // POINT 37 — Salles hiérarchie
    {
      num: 37,
      titre: 'Hiérarchie salles + équipements + récurrence iCal (Partie C.1)',
      icon: Layers,
      color: 'purple',
      data: initialData.batiments ?? [],
      description: 'Bâtiments → étages → salles, équipements par salle (vidéoprojecteur, TBI, climatisation, état), récurrence iCal pour calendrier.',
      columns: [
        { key: 'nom', label: 'Bâtiment' },
        { key: 'adresse', label: 'Adresse' },
        { key: 'nombreEtages', label: 'Étages' },
        { key: 'accessibilitePMR', label: 'PMR', render: (b) => b.accessibilitePMR ? 'Oui' : 'Non' },
        { key: 'etages', label: 'Liste étages', render: (b) => b.etages?.length ?? 0 },
      ],
    },
  ];

  // KPIs synthétiques
  const totalFailles = 37;
  const faillesAvecDonnees = failles.filter(f => f.data.length > 0).length;
  const totalEnregistrementsV4 = failles.reduce((sum, f) => sum + f.data.length, 0);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Catalogue complémentaire"
        subtitle="Vue d'inspection des tables spécialisées (lecture) — les actions métier vivent dans les modules dédiés"
      />

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Tables inspectées" value={`${totalFailles}/37`} sub="couverture du cahier des charges V4" icon={CheckCircle2} color="emerald" />
        <StatCard title="Tables alimentées" value={faillesAvecDonnees} sub="avec données en base" icon={CheckCircle2} color="blue" />
        <StatCard title="Enregistrements affichés" value={totalEnregistrementsV4.toLocaleString('fr-FR')} sub="en lecture seule" icon={Layers} color="purple" />
        <StatCard title="Modèles Prisma" value="126+" sub="71 existants + 55 nouveaux" icon={Layers} color="amber" />
      </div>

      {/* Carte de synthèse */}
      <Card className="mb-6 bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Catalogue complémentaire — inspection en lecture seule</h3>
              <p className="text-xs text-gray-600 mt-1">
                Cette vue expose les tables spécialisées du cahier des charges V4 (Parties A, B, C, D)
                pour contrôle et vérification. Il s'agit d'une inspection en lecture seule :
                les actions métier (créer, modifier, supprimer) vivent dans les modules dédiés
                (Élèves, Finances, Communication, Sécurité…).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des 37 tables */}
      <div className="space-y-2">
        {failles.map((f) => {
          const Icon = f.icon;
          const isOpen = expanded === f.num;
          const colorMap: Record<string, string> = {
            emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            rose: 'bg-rose-50 text-rose-700 border-rose-200',
            amber: 'bg-amber-50 text-amber-700 border-amber-200',
            blue: 'bg-blue-50 text-blue-700 border-blue-200',
            purple: 'bg-purple-50 text-purple-700 border-purple-200',
          };
          return (
            <div key={f.num} className={`border rounded-lg ${colorMap[f.color]} bg-white`}>
              <button
                onClick={() => setExpanded(isOpen ? null : f.num)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`h-7 w-7 rounded-md flex items-center justify-center ${colorMap[f.color]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">#{f.num}</span>
                      <span className="font-medium text-sm text-gray-900 truncate">{f.titre}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`text-[10px] ${f.data.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500'}`}>
                    {f.data.length} enr.
                  </Badge>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 bg-white">
                  {f.description && (
                    <p className="text-xs text-gray-600 mb-3">{f.description}</p>
                  )}
                  <DataTable columns={f.columns} rows={f.data} emptyLabel="Aucune donnée (exécutez le seed)" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
