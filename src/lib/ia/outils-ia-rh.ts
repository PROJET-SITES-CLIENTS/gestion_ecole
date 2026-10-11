// ====================================================================
// OUTILS IA — RH COMPLET (accès total au domaine RH)
// Congés (créer/valider/refuser/annuler), remplacements, paie (génération,
// heures sup, taux), personnel (modifier/supprimer), contrats (renouveler,
// sortie), formations, sanctions, soldes de congés, stats, recrutement B3.
// ====================================================================

import { OutilIA } from './outils';
import { resoudrePersonnel } from './resolution';
import * as biz from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

export const outilsIaRh: OutilIA[] = [
  // ═══ CONGÉS & REMPLACEMENTS ═══
  {
    nom: 'creer_conge',
    description: "Enregistre une demande de congé pour un membre du personnel (annuel, maladie, maternité, exceptionnel). Contrôles de chevauchement automatiques.",
    permission: 'rh.gerer',
    parametres: P({
      personnel: { type: 'string', description: 'Nom/prénom du personnel' },
      type: { type: 'string', enum: ['annuel', 'maladie', 'maternite', 'exceptionnel'] },
      dateDebut: { type: 'string', description: 'Date ISO AAAA-MM-JJ' },
      dateFin: { type: 'string', description: 'Date ISO AAAA-MM-JJ (inclusive)' },
      motif: { type: 'string', description: 'Motif (optionnel)' },
    }, ['personnel', 'type', 'dateDebut', 'dateFin']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.demanderCongeCore(ctx as never, {
        personnelId: rp.entite.id,
        type: String(args.type),
        dateDebut: new Date(String(args.dateDebut)),
        dateFin: new Date(String(args.dateFin)),
        ...(args.motif ? { motif: String(args.motif) } : {}),
      } as never);
    },
  },
  {
    nom: 'traiter_conge',
    description: "Valide ou refuse une demande de congé (les jours validés sont décomptés du solde, le salarié est notifié). Utilisez conges_en_attente pour les IDs.",
    permission: 'rh.gerer',
    parametres: P({
      congeId: { type: 'string', description: 'ID du congé' },
      decision: { type: 'string', enum: ['valide', 'refuse'] },
      commentaire: { type: 'string', description: 'Motif de la décision (optionnel)' },
    }, ['congeId', 'decision']),
    executer: async (ctx, args) =>
      biz.traiterCongeCore(ctx as never, String(args.congeId), args.decision as 'valide' | 'refuse', args.commentaire ? String(args.commentaire) : undefined),
  },
  {
    nom: 'annuler_conge',
    description: "Annule un congé (demande en attente OU congé validé sans remplacement actif — les jours décomptés sont reversés au solde).",
    permission: 'rh.gerer',
    parametres: P({ congeId: { type: 'string', description: 'ID du congé' } }, ['congeId']),
    executer: async (ctx, args) => biz.annulerCongeCore(ctx as never, String(args.congeId)),
  },
  {
    nom: 'assigner_remplacement',
    description: "Planifie un remplaçant pour un congé VALIDÉ (dates incluses dans la période du congé, contrôles de chevauchement).",
    permission: 'rh.gerer',
    parametres: P({
      congeId: { type: 'string', description: 'ID du congé validé' },
      remplacant: { type: 'string', description: 'Nom/prénom du remplaçant' },
      dateDebut: { type: 'string', description: 'Date ISO (≥ début du congé)' },
      dateFin: { type: 'string', description: 'Date ISO (≤ fin du congé)' },
    }, ['congeId', 'remplacant', 'dateDebut', 'dateFin']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.remplacant));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.assignerRemplacementCore(ctx as never, {
        congeId: String(args.congeId),
        personnelRemplacantId: rp.entite.id,
        dateDebut: new Date(String(args.dateDebut)),
        dateFin: new Date(String(args.dateFin)),
      } as never);
    },
  },

  // ═══ PAIE ═══
  {
    nom: 'generer_paie',
    description: "Génère les bulletins de paie du mois pour TOUT le personnel actif (salaire de base + primes récurrentes + variables). Idempotent : les bulletins existants sont ignorés.",
    permission: 'rh.gerer',
    parametres: P({ periode: { type: 'string', description: 'Mois AAAA-MM (ex: 2026-10)' } }, ['periode']),
    executer: async (ctx, args) => {
      const r = await biz.genererBulletinsPaieCore(ctx as never, ctx.ecoleId!, String(args.periode));
      return { ...r, message: `${r.bulletins} bulletin(s) généré(s), ${r.sautes} ignoré(s), net total ${(r.totalNet / 100).toLocaleString('fr-FR')} F. Prochaine étape : valider via traiter_bulletin_paie.` };
    },
  },
  {
    nom: 'convertir_heures_sup',
    description: "Convertit les heures supplémentaires pointées d'un personnel en variable de paie (refusé si la paie du mois est déjà générée).",
    permission: 'rh.gerer',
    parametres: P({
      personnel: { type: 'string', description: 'Nom/prénom du personnel' },
      periode: { type: 'string', description: 'Mois AAAA-MM' },
      tauxHoraire: { type: 'number', description: 'Taux horaire en FCFA (ex: 1500)' },
    }, ['personnel', 'periode', 'tauxHoraire']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.convertirHeuresSupCore(ctx as never, rp.entite.id, String(args.periode), Math.round(Number(args.tauxHoraire) * 100));
    },
  },
  {
    nom: 'configurer_taux_paie',
    description: "Modifie les taux de cotisations sociales appliqués aux prochaines générations (valeurs entre 0 et 1 ; défaut IPM/RC : employeur 0.084, salarié 0.0524).",
    permission: 'rh.gerer',
    parametres: P({
      tauxEmployeur: { type: 'number', description: 'Taux employeur (0-1, ex: 0.084)' },
      tauxSalarie: { type: 'number', description: 'Taux salarié (0-1, ex: 0.0524)' },
    }, ['tauxEmployeur', 'tauxSalarie']),
    executer: async (ctx, args) =>
      biz.majConfigurationPaieCore(ctx as never, ctx.ecoleId!, {
        tauxEmployeur: Number(args.tauxEmployeur), tauxSalarie: Number(args.tauxSalarie),
      } as never),
  },

  // ═══ PERSONNEL — CYCLE DE VIE ═══
  {
    nom: 'modifier_personnel',
    description: "Met à jour la fiche d'un personnel (téléphone, email, fonction, RIB, contact d'urgence, sexe, diplôme). Un changement de salaire ou de type de contrat historise un nouveau contrat.",
    permission: 'rh.gerer',
    parametres: P({
      personnel: { type: 'string', description: 'Nom/prénom du personnel' },
      telephone: { type: 'string' }, email: { type: 'string' }, fonction: { type: 'string', description: 'Poste exercé' },
      sexe: { type: 'string', enum: ['M', 'F'] }, diplomePrincipal: { type: 'string' },
      rib: { type: 'string', description: 'RIB/IBAN (virements de paie)' },
      contactUrgence: { type: 'string', description: "Téléphone du contact d'urgence" },
      typeContrat: { type: 'string', enum: ['CDI', 'CDD', 'vacataire', 'stagiaire'] },
      salaireBrut: { type: 'number', description: 'Nouveau salaire brut MENSUEL en FCFA (historise un contrat)' },
    }, ['personnel']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      const d: Record<string, unknown> = {};
      for (const k of ['telephone', 'email', 'fonction', 'sexe', 'diplomePrincipal', 'rib', 'contactUrgence', 'typeContrat']) {
        if (args[k] !== undefined) d[k] = String(args[k]);
      }
      if (args.salaireBrut !== undefined) d.salaireBrut = Math.round(Number(args.salaireBrut) * 100);
      if (Object.keys(d).length === 0) return { erreur: 'Aucun champ à modifier fourni.' };
      return biz.modifierPersonnelCore(ctx as never, rp.entite.id, d as never);
    },
  },
  {
    nom: 'supprimer_personnel',
    description: "Supprime une fiche personnel (soft-delete, compte désactivé). Refusé si bulletins de paie ou renouvellements de contrat existent — utilisez alors sortir_personnel.",
    permission: 'rh.gerer',
    parametres: P({ personnel: { type: 'string', description: 'Nom/prénom du personnel' } }, ['personnel']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.supprimerPersonnelCore(ctx as never, rp.entite.id);
    },
  },
  {
    nom: 'renouveler_contrat',
    description: "Renouvelle un contrat CDD/vacataire à un nouveau terme (futur obligatoire), avec nouveau salaire et nouveau type optionnels. L'ancien contrat est historisé.",
    permission: 'rh.gerer',
    parametres: P({
      personnel: { type: 'string', description: 'Nom/prénom du personnel' },
      nouvelleDateFin: { type: 'string', description: 'Nouveau terme AAAA-MM-JJ (futur)' },
      nouveauSalaireBrut: { type: 'number', description: 'Nouveau salaire mensuel FCFA (optionnel)' },
      nouveauType: { type: 'string', enum: ['CDD', 'vacataire'], description: 'Nouveau type (optionnel)' },
    }, ['personnel', 'nouvelleDateFin']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.renouvelerContratCore(ctx as never, {
        personnelId: rp.entite.id,
        nouvelleDateFin: new Date(String(args.nouvelleDateFin)),
        ...(args.nouveauSalaireBrut !== undefined ? { nouveauSalaireBrut: Math.round(Number(args.nouveauSalaireBrut) * 100) } : {}),
        ...(args.nouveauType ? { nouveauType: String(args.nouveauType) } : {}),
      } as never);
    },
  },
  {
    nom: 'sortir_personnel',
    description: "Sortie formelle d'un personnel (démission, retraite, licenciement…) : contrats clos, compte désactivé. Refusé si des bulletins de paie ne sont pas réglés.",
    permission: 'rh.gerer',
    parametres: P({
      personnel: { type: 'string', description: 'Nom/prénom du personnel' },
      motifSortie: { type: 'string', enum: ['demission', 'fin_contrat', 'retraite', 'licenciement', 'mutualisation', 'deces'] },
      dateSortie: { type: 'string', description: 'Date effective AAAA-MM-JJ' },
      preavisJours: { type: 'number', description: 'Préavis en jours (optionnel)' },
      commentaire: { type: 'string', description: 'Commentaire (optionnel)' },
    }, ['personnel', 'motifSortie', 'dateSortie']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.quitterPersonnelCore(ctx as never, {
        personnelId: rp.entite.id,
        motifSortie: String(args.motifSortie),
        dateSortie: new Date(String(args.dateSortie)),
        ...(args.preavisJours !== undefined ? { preavisJours: Number(args.preavisJours) } : {}),
        ...(args.commentaire ? { commentaire: String(args.commentaire) } : {}),
      } as never);
    },
  },

  // ═══ FORMATIONS / SANCTIONS / SOLDES / STATS ═══
  {
    nom: 'creer_formation',
    description: "Planifie une formation continue pour un personnel (intitulé, organisme, dates, coût en FCFA).",
    permission: 'rh.gerer',
    parametres: P({
      personnel: { type: 'string', description: 'Nom/prénom' },
      intitule: { type: 'string' }, organisme: { type: 'string' },
      dateDebut: { type: 'string', description: 'AAAA-MM-JJ' }, dateFin: { type: 'string', description: 'AAAA-MM-JJ (optionnel)' },
      cout: { type: 'number', description: 'Coût en FCFA (optionnel)' },
    }, ['personnel', 'intitule', 'dateDebut']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.creerFormationCore(ctx as never, {
        personnelId: rp.entite.id, intitule: String(args.intitule),
        ...(args.organisme ? { organisme: String(args.organisme) } : {}),
        dateDebut: new Date(String(args.dateDebut)),
        ...(args.dateFin ? { dateFin: new Date(String(args.dateFin)) } : {}),
        ...(args.cout !== undefined ? { cout: Number(args.cout) } : {}),
      } as never);
    },
  },
  {
    nom: 'maj_formation',
    description: "Fait avancer une formation : planifiee → en_cours → terminee (certificat optionnel), ou annulee.",
    permission: 'rh.gerer',
    parametres: P({
      formationId: { type: 'string', description: 'ID de la formation' },
      statut: { type: 'string', enum: ['en_cours', 'terminee', 'annulee'] },
      certificatObtenu: { type: 'boolean', description: 'Certificat obtenu (optionnel)' },
    }, ['formationId', 'statut']),
    executer: async (ctx, args) =>
      biz.majFormationCore(ctx as never, String(args.formationId), args.statut as never, args.certificatObtenu === true ? true : undefined),
  },
  {
    nom: 'sanctionner_personnel',
    description: "Notifie une sanction disciplinaire à un membre du personnel (avertissement → mise à demeure ; licenciement réservé à la direction).",
    permission: 'rh.gerer',
    parametres: P({
      personnel: { type: 'string', description: 'Nom/prénom' },
      dateFaits: { type: 'string', description: 'Date des faits AAAA-MM-JJ' },
      faute: { type: 'string', description: 'Faute reprochée (court)' },
      typeSanction: { type: 'string', enum: ['avertissement', 'oral', 'blame', 'mise_a_demeure', 'licenciement'] },
      description: { type: 'string', description: 'Description factuelle' },
    }, ['personnel', 'dateFaits', 'faute', 'typeSanction', 'description']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.sanctionnerPersonnelCore(ctx as never, {
        personnelId: rp.entite.id, dateFaits: new Date(String(args.dateFaits)),
        faute: String(args.faute), typeSanction: String(args.typeSanction), description: String(args.description),
      } as never);
    },
  },
  {
    nom: 'acquitter_soldes_conges',
    description: "Exécute l'acquisition mensuelle des soldes de congés (2,5 j/mois par défaut, plafonné) — idempotent : re-exécuter ne double jamais.",
    permission: 'rh.gerer',
    parametres: P({
      joursParMois: { type: 'number', description: 'Jours acquis/mois (défaut 2.5)' },
      plafondReport: { type: 'number', description: 'Plafond de report en jours (défaut 30)' },
    }),
    executer: async (ctx, args) =>
      biz.acquitterSoldesCongesCore(ctx as never, {
        ...(args.joursParMois !== undefined ? { joursParMois: Number(args.joursParMois) } : {}),
        ...(args.plafondReport !== undefined ? { plafondReport: Number(args.plafondReport) } : {}),
      }),
  },
  {
    nom: 'stats_rh',
    description: "Tableau de bord RH : effectifs, masse salariale, ancienneté, fins de contrats imminentes, absentéisme, turnover, répartition H/F.",
    permission: 'rh.gerer',
    parametres: P({}),
    executer: async (ctx) => biz.statsRhCore(ctx as never),
  },
  {
    nom: 'maj_perimetre_secretariat',
    description: "Délimite le périmètre d'un personnel de secrétariat : primaire, secondaire, ou école entière.",
    permission: 'rh.gerer',
    parametres: P({
      personnel: { type: 'string', description: 'Nom/prénom' },
      perimetre: { type: 'string', enum: ['primaire', 'secondaire', 'ecole'], description: "'ecole' = périmètre complet" },
    }, ['personnel', 'perimetre']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.majPerimetreSecretariatCore(ctx as never, rp.entite.id,
        (args.perimetre === 'primaire' || args.perimetre === 'secondaire') ? args.perimetre : null);
    },
  },

  // ═══ RECRUTEMENT (B3) ═══
  {
    nom: 'creer_offre_emploi',
    description: "Publie une offre d'emploi (poste, description, profil, type de contrat, clôture).",
    permission: 'rh.gerer',
    parametres: P({
      poste: { type: 'string', description: 'Poste (ex: Professeur de mathématiques)' },
      description: { type: 'string', description: 'Description du poste' },
      profilRecherche: { type: 'string', description: 'Profil recherché' },
      typeContrat: { type: 'string', enum: ['CDI', 'CDD', 'Stage', 'Vacataire'] },
      dateCloture: { type: 'string', description: 'AAAA-MM-JJ (optionnel)' },
    }, ['poste', 'typeContrat']),
    executer: async (ctx, args) =>
      biz.creerOffreCore(ctx as never, ctx.ecoleId!, {
        poste: String(args.poste), description: String(args.description ?? ''),
        profilRecherche: String(args.profilRecherche ?? ''), typeContrat: String(args.typeContrat),
        ...(args.dateCloture ? { dateCloture: new Date(String(args.dateCloture)) } : {}),
      } as never),
  },
  {
    nom: 'enregistrer_candidature',
    description: "Enregistre une candidature à une offre d'emploi (étape initiale : tri CV).",
    permission: 'rh.gerer',
    parametres: P({
      poste: { type: 'string', description: 'Intitulé du poste/offre' },
      nom: { type: 'string' }, prenom: { type: 'string' }, email: { type: 'string' },
      telephone: { type: 'string' }, lettreMotivation: { type: 'string' },
    }, ['poste', 'nom', 'prenom', 'email']),
    executer: async (ctx, args) => {
      const { db } = await import('@/lib/db');
      const offre = await db.offreEmploi.findFirst({
        where: { ecoleId: ctx.ecoleId!, statut: 'ouverte', poste: { contains: String(args.poste), mode: 'insensitive' } },
      });
      if (!offre) return { erreur: `Offre ouverte « ${args.poste} » introuvable.` };
      return biz.creerCandidatureCore(ctx as never, ctx.ecoleId!, {
        offreId: offre.id, nom: String(args.nom), prenom: String(args.prenom), email: String(args.email),
        ...(args.telephone ? { telephone: String(args.telephone) } : {}),
        ...(args.lettreMotivation ? { lettreMotivation: String(args.lettreMotivation) } : {}),
      } as never);
    },
  },
  {
    nom: 'avancer_candidature_recrutement',
    description: "Fait avancer une candidature de recrutement : tri_cv → entretien_rh → entretien_direction → essai → décision (valide/refuse).",
    permission: 'rh.gerer',
    parametres: P({
      candidat: { type: 'string', description: 'Nom/prénom du candidat' },
      etape: { type: 'string', enum: ['tri_cv', 'entretien_rh', 'entretien_direction', 'essai', 'decision'] },
      statut: { type: 'string', enum: ['valide', 'refuse'] },
    }, ['candidat', 'etape', 'statut']),
    executer: async (ctx, args) => {
      const { db } = await import('@/lib/db');
      const { normaliser } = await import('./resolution');
      const qN = normaliser(String(args.candidat));
      const toutes = await db.candidature.findMany({ where: { offre: { ecoleId: ctx.ecoleId! }, statut: { not: 'converti' } } });
      const cibles = toutes.filter((c) => normaliser(`${c.prenom} ${c.nom}`).includes(qN) || normaliser(`${c.nom} ${c.prenom}`).includes(qN));
      if (cibles.length === 0) return { erreur: `Candidat « ${args.candidat} » introuvable. Candidats : ${toutes.slice(0, 8).map((c) => `${c.prenom} ${c.nom} (${c.statut})`).join(' ; ') || 'aucun'}` };
      if (cibles.length > 1) return { erreur: `Plusieurs candidats : ${cibles.map((c) => `${c.prenom} ${c.nom}`).join(' ; ')}. Précisez.` };
      return biz.avancerCandidatureCore(ctx as never, ctx.ecoleId!, cibles[0].id, String(args.etape), args.statut as 'valide' | 'refuse');
    },
  },
  {
    nom: 'convertir_candidat_recrutement',
    description: "Convertit un candidat RETENU en personnel (matricule, compte utilisateur, mot de passe temporaire affiché une fois).",
    permission: 'rh.gerer',
    parametres: P({
      candidat: { type: 'string', description: 'Nom/prénom du candidat (statut « retenu » requis)' },
      dateEmbauche: { type: 'string', description: 'AAAA-MM-JJ' },
      salaireBrut: { type: 'number', description: 'Salaire mensuel FCFA' },
      roleCode: { type: 'string', enum: ['enseignant', 'secretariat', 'comptabilite', 'rh', 'censeur', 'surveillant', 'infirmier', 'assistant_direction', 'direction'] },
    }, ['candidat', 'dateEmbauche', 'salaireBrut', 'roleCode']),
    executer: async (ctx, args) => {
      const { db } = await import('@/lib/db');
      const { normaliser } = await import('./resolution');
      const qN = normaliser(String(args.candidat));
      const retenus = await db.candidature.findMany({ where: { offre: { ecoleId: ctx.ecoleId! }, statut: 'retenu' } });
      const cibles = retenus.filter((c) => normaliser(`${c.prenom} ${c.nom}`).includes(qN));
      if (cibles.length === 0) return { erreur: `Aucun candidat « retenu » correspondant. Retenus : ${retenus.map((c) => `${c.prenom} ${c.nom}`).join(' ; ') || 'aucun'}` };
      if (cibles.length > 1) return { erreur: `Plusieurs candidats : ${cibles.map((c) => `${c.prenom} ${c.nom}`).join(' ; ')}. Précisez.` };
      const r = await biz.convertirCandidatCore(ctx as never, ctx.ecoleId!, cibles[0].id, {
        dateEmbauche: new Date(String(args.dateEmbauche)),
        salaireBrut: Math.round(Number(args.salaireBrut) * 100),
        roleCode: String(args.roleCode),
      });
      return { ...r, note: `Mot de passe temporaire à communiquer MAINTENANT : ${r.motDePasseTemporaire}` };
    },
  },
];
