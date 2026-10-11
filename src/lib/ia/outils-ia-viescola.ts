// ====================================================================
// OUTILS IA — VIE SCOLAIRE AVANCÉE, CONSEILS & EXAMENS
// Conseils de classe (créer, délibérer, voter, PV, convocation), délégués,
// discipline renforcée (exclusion, exécution sanction, conseils discipline),
// autorisations de sortie, sorties élèves, justifications, stats, examens
// officiels (inscriptions, convocations, résultats, surveillances).
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';
import { resoudreClasse, resoudreEleve, resoudrePersonnel, normaliser } from './resolution';
import * as biz from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

export const outilsIaViescola: OutilIA[] = [
  // ═══ CONSEILS DE CLASSE ═══
  {
    nom: 'creer_conseil_classe_ia',
    description: "Programme un conseil de classe (classe, période, date, salle, membres). Les membres sont résolus par noms.",
    permission: ['bulletins.valider', 'admin.saas'],
    parametres: P({
      classe: { type: 'string' }, periode: { type: 'string', description: 'Période (ex: Trimestre 1)' },
      date: { type: 'string', description: 'AAAA-MM-JJ' }, salle: { type: 'string' },
      membres: { type: 'string', description: 'Noms des membres séparés par ; (enseignants, direction)' },
    }, ['classe', 'periode', 'date', 'membres']),
    executer: async (ctx, args) => {
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: 'Classe : ' + rc.erreur, candidats: rc.candidats };
      const periode = await db.periode.findFirst({
        where: { anneeScolaire: { ecoleId: ctx.ecoleId!, active: true }, libelle: { contains: String(args.periode), mode: 'insensitive' } },
      });
      if (!periode) return { erreur: `Période « ${args.periode} » introuvable.` };
      const membresIds: string[] = [];
      for (const nom of String(args.membres).split(';').map((s) => s.trim()).filter(Boolean)) {
        const rp = await resoudrePersonnel(ctx.ecoleId!, nom);
        if (!rp.trouve) return { erreur: `Membre « ${nom} » : ${rp.erreur}`, candidats: rp.candidats };
        membresIds.push(rp.entite.id);
      }
      return biz.creerConseilCore(ctx as never, {
        classeId: rc.entite.id, periodeId: periode.id, date: new Date(String(args.date)),
        ...(args.salle ? { salle: String(args.salle) } : {}), membresIds,
      } as never);
    },
  },
  {
    nom: 'convoquer_conseil_ia',
    description: "Envoie les convocations d'un conseil de classe à ses membres.",
    permission: ['bulletins.valider', 'admin.saas'],
    parametres: P({ conseilId: { type: 'string', description: 'ID du conseil' } }, ['conseilId']),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/completions');
      return actions.convoquerConseil(String(args.conseilId));
    },
  },
  {
    nom: 'deliberer_eleve',
    description: "Enregistre la décision du conseil pour un élève : passage, redoublement, exclusion_orientation ou doublement (+ mention, appréciation).",
    permission: ['bulletins.valider', 'admin.saas'],
    parametres: P({
      conseilId: { type: 'string', description: 'ID du conseil' },
      eleve: { type: 'string', description: 'Nom/prénom de l\'élève' },
      decision: { type: 'string', enum: ['passage', 'redoublement', 'exclusion_orientation', 'doublement'] },
      mention: { type: 'string', enum: ['encouragements', 'felicitations', 'tableau_honneur'] },
      appreciationGenerale: { type: 'string' },
    }, ['conseilId', 'eleve', 'decision']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.creerDeliberationCore(ctx as never, {
        conseilId: String(args.conseilId), eleveId: re.entite.id, decision: String(args.decision),
        ...(args.mention ? { mention: String(args.mention) } : {}),
        ...(args.appreciationGenerale ? { appreciationGenerale: String(args.appreciationGenerale) } : {}),
      } as never);
    },
  },
  {
    nom: 'voter_deliberation',
    description: "Exprime le vote de l'utilisateur connecté sur une délibération (pour, contre, abstention).",
    permission: ['bulletins.valider', 'admin.saas'],
    parametres: P({
      deliberationId: { type: 'string', description: 'ID de la délibération' },
      vote: { type: 'string', enum: ['pour', 'contre', 'abstention'] },
    }, ['deliberationId', 'vote']),
    executer: async (ctx, args) => biz.voterDeliberationCore(ctx as never, String(args.deliberationId), args.vote as never),
  },
  {
    nom: 'generer_pv_conseil_ia',
    description: "Génère le PV officiel d'un conseil de classe (décisions et votes consolidés).",
    permission: ['bulletins.valider', 'admin.saas'],
    parametres: P({ conseilId: { type: 'string', description: 'ID du conseil' } }, ['conseilId']),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/completions');
      return actions.genererPvConseil(String(args.conseilId));
    },
  },

  // ═══ DÉLÉGUÉS ═══
  {
    nom: 'designer_delegue',
    description: "Désigne un délégué (ou suppléant) de classe pour l'année.",
    permission: 'vie_scolaire.gerer',
    parametres: P({
      classe: { type: 'string' }, eleve: { type: 'string', description: 'Nom/prénom de l\'élève' },
      role: { type: 'string', enum: ['delegue', 'suppleant'] },
    }, ['classe', 'eleve']),
    executer: async (ctx, args) => {
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const actions = await import('@/app/actions/extensions');
      const fd = new FormData();
      fd.set('classeId', rc.entite.id); fd.set('eleveId', re.entite.id);
      fd.set('role', args.role === 'suppleant' ? 'suppleant' : 'delegue');
      return actions.designerDelegue(fd);
    },
  },
  {
    nom: 'retirer_delegue',
    description: "Retire un délégué de classe (par son ID ou le nom de l'élève).",
    permission: 'vie_scolaire.gerer',
    parametres: P({ eleve: { type: 'string', description: 'Nom/prénom du délégué' } }, ['eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const delegue = await db.delegueClasse.findFirst({ where: { eleveId: re.entite.id } });
      if (!delegue) return { erreur: 'Cet élève n\'est pas délégué.' };
      const actions = await import('@/app/actions/extensions');
      return actions.retirerDelegue(delegue.id);
    },
  },

  // ═══ DISCIPLINE RENFORCÉE ═══
  {
    nom: 'exclure_temporairement',
    description: "Exclut temporairement un élève (incident, dates, description). Réintégration via reintegrer_eleve.",
    permission: 'vie_scolaire.gerer',
    parametres: P({
      eleve: { type: 'string' }, incidentId: { type: 'string', description: 'ID de l\'incident fondateur' },
      dateDebut: { type: 'string', description: 'AAAA-MM-JJ' }, dateFin: { type: 'string', description: 'AAAA-MM-JJ' },
      description: { type: 'string' },
    }, ['eleve', 'incidentId', 'dateDebut', 'dateFin', 'description']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.exclureTemporairementCore(ctx as never, {
        eleveId: re.entite.id, incidentId: String(args.incidentId),
        dateDebut: new Date(String(args.dateDebut)), dateFin: new Date(String(args.dateFin)),
        description: String(args.description),
      } as never);
    },
  },
  {
    nom: 'executer_sanction_ia',
    description: "Marque une sanction comme exécutée (travaux d'intérêt, exclusion…).",
    permission: 'vie_scolaire.gerer',
    parametres: P({ sanctionId: { type: 'string', description: 'ID de la sanction' } }, ['sanctionId']),
    executer: async (ctx, args) => biz.executerSanctionCore(ctx as never, String(args.sanctionId)),
  },
  {
    nom: 'creer_conseil_discipline',
    description: "Convoque un conseil de discipline pour un élève (faits, date, membres).",
    permission: 'vie_scolaire.gerer',
    parametres: P({
      eleve: { type: 'string' }, faits: { type: 'string', description: 'Faits reprochés (10+ caractères)' },
      dateConseil: { type: 'string', description: 'AAAA-MM-JJ' },
      membres: { type: 'string', description: 'Noms des membres séparés par ;' },
    }, ['eleve', 'faits', 'dateConseil', 'membres']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const membres: string[] = [];
      for (const nom of String(args.membres).split(';').map((s) => s.trim()).filter(Boolean)) {
        const rp = await resoudrePersonnel(ctx.ecoleId!, nom);
        if (!rp.trouve) return { erreur: `Membre « ${nom} » : ${rp.erreur}` };
        membres.push(rp.entite.id);
      }
      const actions = await import('@/app/actions/extensions');
      const fd = new FormData();
      fd.set('eleveId', re.entite.id); fd.set('faits', String(args.faits));
      fd.set('dateConseil', String(args.dateConseil)); fd.set('membresIds', JSON.stringify(membres));
      return actions.creerConseilDiscipline(fd);
    },
  },
  {
    nom: 'decider_conseil_discipline',
    description: "Record la décision du conseil de discipline (avec sanction optionnelle).",
    permission: 'vie_scolaire.gerer',
    parametres: P({
      conseilId: { type: 'string' }, decision: { type: 'string', description: 'Décision (texte)' },
      sanctionId: { type: 'string', description: 'ID de la sanction décidée (optionnel)' },
    }, ['conseilId', 'decision']),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/extensions');
      return actions.deciderConseilDiscipline(String(args.conseilId), String(args.decision), args.sanctionId ? String(args.sanctionId) : undefined);
    },
  },
  {
    nom: 'stats_discipline_ia',
    description: "Statistiques de discipline des N derniers jours (incidents par type, gravité, classe).",
    permission: ['vie_scolaire.gerer', 'admin.saas'],
    parametres: P({ jours: { type: 'number', description: 'Fenêtre en jours (défaut 30)' } }),
    executer: async (ctx, args) => biz.statsDisciplineCore(ctx as never, args.jours !== undefined ? Number(args.jours) : 30),
  },

  // ═══ SORTIES & AUTORISATIONS ═══
  {
    nom: 'creer_autorisation_sortie',
    description: "Enregistre une personne autorisée à récupérer un élève (nom, lien, téléphone).",
    permission: ['vie_scolaire.gerer', 'securite.gerer'],
    parametres: P({
      eleve: { type: 'string' }, nomPersonneAutorisee: { type: 'string' },
      lienAvecEleve: { type: 'string', description: 'Lien (père, mère, tuteur…)' }, telephone: { type: 'string' },
    }, ['eleve', 'nomPersonneAutorisee']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.creerAutorisationSortieCore(ctx as never, {
        eleveId: re.entite.id, nomPersonneAutorisee: String(args.nomPersonneAutorisee),
        ...(args.lienAvecEleve ? { lienAvecEleve: String(args.lienAvecEleve) } : {}),
        ...(args.telephone ? { telephone: String(args.telephone) } : {}),
      } as never);
    },
  },
  {
    nom: 'sortie_eleve_ia',
    description: "Enregistre la sortie anticipée d'un élève pendant la journée (récupéré par une personne autorisée).",
    permission: ['vie_scolaire.gerer', 'securite.gerer'],
    parametres: P({
      eleve: { type: 'string' }, date: { type: 'string', description: 'AAAA-MM-JJ' }, heure: { type: 'string', description: 'HH:MM' },
      recupereParNom: { type: 'string', description: 'Nom de la personne qui récupère' },
      autorisationId: { type: 'string', description: 'ID autorisation (si connue)' },
      validationExceptionnelle: { type: 'boolean', description: 'Validation exceptionnelle (personne non déclarée)' },
      motifException: { type: 'string' },
    }, ['eleve', 'date', 'heure', 'recupereParNom']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.sortieEleveCore(ctx as never, {
        eleveId: re.entite.id, date: new Date(String(args.date)), heure: String(args.heure),
        recupereParNom: String(args.recupereParNom),
        ...(args.autorisationId ? { autorisationId: String(args.autorisationId) } : {}),
        ...(args.validationExceptionnelle === true ? { validationExceptionnelle: true } : {}),
        ...(args.motifException ? { motifException: String(args.motifException) } : {}),
      } as never);
    },
  },
  {
    nom: 'traiter_justification',
    description: "Valide ou rejette une justification d'absence soumise par une famille (l'absence liée passe en excusée si validée).",
    permission: ['presences.saisir', 'eleves.ecrire', 'vie_scolaire.gerer'],
    parametres: P({
      justificationId: { type: 'string', description: 'ID de la justification' },
      decision: { type: 'string', enum: ['valide', 'rejete'] },
      commentaire: { type: 'string' },
    }, ['justificationId', 'decision']),
    executer: async (ctx, args) =>
      biz.traiterJustificationCore(ctx as never, String(args.justificationId), args.decision as never, args.commentaire ? String(args.commentaire) : undefined),
  },

  // ═══ EXAMENS OFFICIELS ═══
  {
    nom: 'inscrire_eleves_examen',
    description: "Inscrit automatiquement tous les élèves du niveau à un examen officiel (idempotent).",
    permission: 'examens.gerer',
    parametres: P({ examen: { type: 'string', description: 'Nom de l\'examen' } }, ['examen']),
    executer: async (ctx, args) => {
      const examen = await db.examenOfficiel.findFirst({ where: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.examen), mode: 'insensitive' } } });
      if (!examen) return { erreur: `Examen « ${args.examen} » introuvable.` };
      return biz.inscrireElevesExamenCore(ctx as never, examen.id);
    },
  },
  {
    nom: 'envoyer_convocations_examen_ia',
    description: "Attribue les tables et notifie les familles des candidats inscrits (convocations).",
    permission: 'examens.gerer',
    parametres: P({ examen: { type: 'string', description: 'Nom de l\'examen' } }, ['examen']),
    executer: async (ctx, args) => {
      const examen = await db.examenOfficiel.findFirst({ where: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.examen), mode: 'insensitive' } } });
      if (!examen) return { erreur: `Examen « ${args.examen} » introuvable.` };
      return biz.envoyerConvocationsExamenCore(ctx as never, examen.id);
    },
  },
  {
    nom: 'saisir_resultat_examen',
    description: "Saisit le résultat d'un candidat (admis, ajourne, mention, absent).",
    permission: 'examens.gerer',
    parametres: P({
      eleve: { type: 'string', description: 'Nom du candidat' },
      examen: { type: 'string', description: 'Nom de l\'examen' },
      resultat: { type: 'string', enum: ['admis', 'ajourne', 'mention', 'absent'] },
    }, ['eleve', 'examen', 'resultat']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const inscription = await db.inscriptionExamenOfficiel.findFirst({
        where: { eleveId: re.entite.id, examenOfficiel: { nom: { contains: String(args.examen), mode: 'insensitive' } } },
      });
      if (!inscription) return { erreur: 'Inscription d\'examen introuvable pour cet élève.' };
      return biz.saisirResultatExamenCore(ctx as never, inscription.id, String(args.resultat));
    },
  },
  {
    nom: 'creer_surveillance_ia',
    description: "Planifie une surveillance d'examen (intitulé, créneau, salle, surveillants, classes concernées).",
    permission: ['examens.gerer', 'vie_scolaire.gerer'],
    parametres: P({
      intitule: { type: 'string' },
      dateHeureDebut: { type: 'string', description: 'AAAA-MM-JJTHH:MM' },
      dateHeureFin: { type: 'string', description: 'AAAA-MM-JJTHH:MM' },
      salle: { type: 'string', description: 'Salle (optionnel)' },
      surveillants: { type: 'string', description: 'Noms des surveillants séparés par ;' },
      nbElevesPrevus: { type: 'number' },
    }, ['intitule', 'dateHeureDebut', 'dateHeureFin', 'surveillants']),
    executer: async (ctx, args) => {
      const surveillantsIds: string[] = [];
      for (const nom of String(args.surveillants).split(';').map((s) => s.trim()).filter(Boolean)) {
        const rp = await resoudrePersonnel(ctx.ecoleId!, nom);
        if (!rp.trouve) return { erreur: `Surveillant « ${nom} » : ${rp.erreur}` };
        surveillantsIds.push(rp.entite.id);
      }
      let salleId: string | undefined;
      if (args.salle) {
        const salle = await db.salle.findFirst({ where: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.salle), mode: 'insensitive' } } });
        if (salle) salleId = salle.id;
      }
      return biz.creerSurveillanceCore(ctx as never, {
        intitule: String(args.intitule),
        dateHeureDebut: new Date(String(args.dateHeureDebut)), dateHeureFin: new Date(String(args.dateHeureFin)),
        ...(salleId ? { salleId } : {}), surveillantsIds,
        ...(args.nbElevesPrevus !== undefined ? { nbElevesPrevus: Number(args.nbElevesPrevus) } : {}),
      } as never);
    },
  },
  {
    nom: 'lister_inscriptions_examen',
    description: "Liste les candidats inscrits à un examen (statut, table, résultat) — pour récupérer les IDs avant saisie.",
    permission: ['examens.gerer', 'eleves.lire'],
    parametres: P({ examen: { type: 'string', description: 'Nom de l\'examen' } }, ['examen']),
    executer: async (ctx, args) => {
      const inscriptions = await db.inscriptionExamenOfficiel.findMany({
        where: { examenOfficiel: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.examen), mode: 'insensitive' } } },
        include: { eleve: { select: { prenom: true, nom: true, matricule: true } } },
        take: 200,
      });
      return { total: inscriptions.length, inscriptions: inscriptions.map((i) => ({ inscriptionId: i.id, eleve: `${i.eleve.prenom} ${i.eleve.nom}`, statut: i.statut, table: i.numeroTable, resultat: i.resultat })) };
    },
  },
];
