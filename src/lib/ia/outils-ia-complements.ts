// ====================================================================
// OUTILS IA — COMPLÉMENTS D'ACCÈS TOTAL (6e module)
// CRUD résiduels (supprimer élève, modifier évaluation/chapitre/créneau
// EDT, période), protection de l'enfance (signalements, mesures, PAP),
// infrastructures (terrains, chambres, labos, boutique, buanderie, HACCP,
// équipements info, flags), transport avancé (feuilles de route),
// consentements RGPD, remises en masse, échéanciers personnalisés, rythme,
// notifications directes, conversations, divers admin.
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';
import { resoudreEleve, resoudrePersonnel, resoudreClasse, normaliser } from './resolution';
import * as biz from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

export const outilsIaComplements: OutilIA[] = [
  // ═══ CRUD RÉSIDUELS ═══
  {
    nom: 'supprimer_eleve_ia',
    description: "Supprime un élève (soft-delete : dossier conservé). Refusé si un historique existe — utilisez alors transferer_eleve ou archiver_eleve.",
    permission: 'eleves.ecrire',
    parametres: P({ eleve: { type: 'string' }, motif: { type: 'string', description: 'Motif de suppression' } }, ['eleve', 'motif']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const actions = await import('@/app/actions/index');
      return actions.supprimerEleve(re.entite.id, String(args.motif));
    },
  },
  {
    nom: 'modifier_evaluation_ia',
    description: "Modifie une évaluation (intitulé, date, barème, coefficient) — refusée si des notes sont saisies.",
    permission: 'notes.saisir',
    parametres: P({
      evaluationId: { type: 'string', description: 'ID de l\'évaluation (via evaluations_classe)' },
      intitule: { type: 'string' }, date: { type: 'string', description: 'AAAA-MM-JJ' },
      sur: { type: 'number', description: 'Barème (ex: 20)' }, coefficient: { type: 'number' },
    }, ['evaluationId']),
    executer: async (ctx, args) => {
      const d: Record<string, unknown> = {};
      if (args.intitule !== undefined) d.intitule = String(args.intitule);
      if (args.date !== undefined) d.date = new Date(String(args.date));
      if (args.sur !== undefined) d.sur = Number(args.sur);
      if (args.coefficient !== undefined) d.coefficient = Number(args.coefficient);
      if (Object.keys(d).length === 0) return { erreur: 'Aucun champ fourni.' };
      return biz.modifierEvaluationCore(ctx as never, String(args.evaluationId), d as never);
    },
  },
  {
    nom: 'supprimer_evaluation_ia',
    description: "Supprime une évaluation — refusée si des notes sont déjà saisies.",
    permission: 'notes.saisir',
    parametres: P({ evaluationId: { type: 'string' } }, ['evaluationId']),
    executer: async (ctx, args) => biz.supprimerEvaluationCore(ctx as never, String(args.evaluationId)),
  },
  {
    nom: 'modifier_chapitre_ia',
    description: "Modifie un chapitre de programme (titre, ordre, période, volume horaire).",
    permission: 'notes.saisir',
    parametres: P({
      chapitre: { type: 'string', description: 'Titre du chapitre' },
      titre: { type: 'string' }, ordre: { type: 'number' },
      periode: { type: 'string', description: 'Période de planification (vide = déplanifier)' },
      volumeHorairePrevu: { type: 'number' },
    }, ['chapitre', 'titre', 'ordre']),
    executer: async (ctx, args) => {
      const chap = await db.chapitre.findFirst({
        where: { programme: { ecoleId: ctx.ecoleId! }, titre: { contains: String(args.chapitre), mode: 'insensitive' } },
      });
      if (!chap) return { erreur: `Chapitre « ${args.chapitre} » introuvable.` };
      let periodeId = '';
      if (args.periode) {
        const p = await db.periode.findFirst({ where: { anneeScolaire: { ecoleId: ctx.ecoleId!, active: true }, libelle: { contains: String(args.periode), mode: 'insensitive' } } });
        periodeId = p?.id ?? '';
      }
      const actions = await import('@/app/actions/extensions');
      const fd = new FormData();
      fd.set('chapitreId', chap.id); fd.set('titre', String(args.titre));
      fd.set('ordre', String(args.ordre)); fd.set('periodeId', periodeId);
      if (args.volumeHorairePrevu !== undefined) fd.set('volumeHorairePrevu', String(args.volumeHorairePrevu));
      return actions.modifierChapitre(fd);
    },
  },
  {
    nom: 'modifier_creneau_edt_ia',
    description: "Déplace/modifie un créneau d'emploi du temps (jour, heures, salle — conflits rejoués).",
    permission: ['edt.gerer', 'admin.saas'],
    parametres: P({
      emploiTempsId: { type: 'string', description: 'ID du créneau' },
      jour: { type: 'string', enum: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] },
      heureDebut: { type: 'string', description: 'HH:MM' }, heureFin: { type: 'string', description: 'HH:MM' },
      salle: { type: 'string', description: 'Nouvelle salle (optionnel)' },
    }, ['emploiTempsId', 'jour', 'heureDebut', 'heureFin']),
    executer: async (ctx, args) => {
      const existant = await db.emploiTemps.findUnique({ where: { id: String(args.emploiTempsId) } });
      if (!existant) return { erreur: 'Créneau introuvable.' };
      let salleId = existant.salleId ?? undefined;
      if (args.salle) {
        const salle = await db.salle.findFirst({ where: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.salle), mode: 'insensitive' } } });
        if (!salle) return { erreur: `Salle « ${args.salle} » introuvable.` };
        salleId = salle.id;
      }
      return biz.modifierCreneauEdtCore(ctx as never, String(args.emploiTempsId), {
        classeId: existant.classeId ?? undefined, matiereId: existant.matiereId ?? undefined,
        enseignantId: existant.enseignantId ?? undefined, salleId,
        jour: String(args.jour), heureDebut: String(args.heureDebut), heureFin: String(args.heureFin),
        dateDebut: existant.dateDebut,
      } as never);
    },
  },
  {
    nom: 'maj_periode_ia',
    description: "Ajuste une période (libellé, dates, type de bulletin).",
    permission: 'admin.saas',
    parametres: P({
      periode: { type: 'string', description: 'Libellé actuel (ex: Trimestre 1)' },
      libelle: { type: 'string' }, dateDebut: { type: 'string', description: 'AAAA-MM-JJ' },
      dateFin: { type: 'string', description: 'AAAA-MM-JJ' }, typeBulletin: { type: 'string' },
    }, ['periode', 'dateDebut', 'dateFin']),
    executer: async (ctx, args) => {
      const p = await db.periode.findFirst({ where: { anneeScolaire: { ecoleId: ctx.ecoleId!, active: true }, libelle: { contains: String(args.periode), mode: 'insensitive' } } });
      if (!p) return { erreur: `Période « ${args.periode} » introuvable.` };
      return biz.majPeriodeCore(ctx as never, p.id, {
        ...(args.libelle ? { libelle: String(args.libelle) } : {}),
        dateDebut: new Date(String(args.dateDebut)), dateFin: new Date(String(args.dateFin)),
        ...(args.typeBulletin ? { typeBulletin: String(args.typeBulletin) } : {}),
      } as never);
    },
  },
  {
    nom: 'marquer_bulletin_imprimable',
    description: "Marque un bulletin comme imprimable/remis (fin du circuit après publication).",
    permission: 'bulletins.valider',
    parametres: P({ bulletinId: { type: 'string' } }, ['bulletinId']),
    executer: async (ctx, args) => biz.marquerBulletinImprimableCore(ctx as never, String(args.bulletinId)),
  },

  // ═══ PROTECTION DE L'ENFANCE ═══
  {
    nom: 'creer_signalement_enfance',
    description: "Signale une situation de protection de l'enfance (mineur en danger) — dossier sensible réservé protection.gerer.",
    permission: 'protection.gerer',
    parametres: P({
      eleve: { type: 'string' }, description: { type: 'string', description: 'Description factuelle de la situation' },
      gravite: { type: 'string', enum: ['faible', 'moyenne', 'elevee', 'critique'] },
      type: { type: 'string', description: 'Type (maltraitance, negligence, danger…)' },
    }, ['eleve', 'description', 'gravite', 'type']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.creerSignalementCore(ctx as never, {
        eleveId: re.entite.id, description: String(args.description),
        gravite: String(args.gravite), type: String(args.type),
      } as never);
    },
  },
  {
    nom: 'suivi_signalement',
    description: "Ajoute une note de suivi à un signalement (par ID).",
    permission: 'protection.gerer',
    parametres: P({ signalementId: { type: 'string' }, note: { type: 'string' } }, ['signalementId', 'note']),
    executer: async (ctx, args) => biz.ajouterSuiviSignalementCore(ctx as never, String(args.signalementId), String(args.note)),
  },
  {
    nom: 'mesure_protection',
    description: "Ajoute une mesure de protection à un signalement (type, description, date de fin).",
    permission: 'protection.gerer',
    parametres: P({
      signalementId: { type: 'string' }, type: { type: 'string', description: 'Ex: signalement CRIP, suivi éducatif' },
      description: { type: 'string' }, dateFin: { type: 'string', description: 'AAAA-MM-JJ (optionnel)' },
    }, ['signalementId', 'type', 'description']),
    executer: async (ctx, args) =>
      biz.ajouterMesureProtectionCore(ctx as never, String(args.signalementId), {
        type: String(args.type), description: String(args.description),
        ...(args.dateFin ? { dateFin: new Date(String(args.dateFin)) } : {}),
      } as never),
  },
  {
    nom: 'maj_statut_signalement',
    description: "Change le statut d'un signalement (ouvert, en_cours, clos…) avec transfert CRIP optionnel.",
    permission: 'protection.gerer',
    parametres: P({
      signalementId: { type: 'string' }, statut: { type: 'string' },
      transfertCrip: { type: 'boolean', description: 'Transfert CRIP (optionnel)' },
    }, ['signalementId', 'statut']),
    executer: async (ctx, args) =>
      biz.majStatutSignalementCore(ctx as never, String(args.signalementId), String(args.statut), args.transfertCrip === true),
  },
  {
    nom: 'creer_plan_accompagnement',
    description: "Crée un plan d'accompagnement personnalisé (PAP/PPS) pour un élève.",
    permission: 'protection.gerer',
    parametres: P({
      eleve: { type: 'string' }, type: { type: 'string', description: 'Ex: PAP, PPS, PAI' },
      dateDebut: { type: 'string', description: 'AAAA-MM-JJ' }, dateFin: { type: 'string' },
      diagnostic: { type: 'string' }, objectifsGeneraux: { type: 'string' },
    }, ['eleve', 'type', 'dateDebut']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.creerPlanAccompagnementCore(ctx as never, {
        eleveId: re.entite.id, type: String(args.type), dateDebut: new Date(String(args.dateDebut)),
        ...(args.dateFin ? { dateFin: new Date(String(args.dateFin)) } : {}),
        ...(args.diagnostic ? { diagnostic: String(args.diagnostic) } : {}),
        ...(args.objectifsGeneraux ? { objectifsGeneraux: String(args.objectifsGeneraux) } : {}),
      } as never);
    },
  },
  {
    nom: 'ajouter_objectif_plan',
    description: "Ajoute un objectif au plan d'accompagnement d'un élève.",
    permission: 'protection.gerer',
    parametres: P({
      planId: { type: 'string' }, description: { type: 'string' },
      domaine: { type: 'string', description: 'Ex: scolaire, social' }, echeance: { type: 'string', description: 'AAAA-MM-JJ' },
    }, ['planId', 'description', 'domaine']),
    executer: async (ctx, args) =>
      biz.ajouterObjectifPlanCore(ctx as never, String(args.planId), {
        description: String(args.description), domaine: String(args.domaine),
        ...(args.echeance ? { echeance: new Date(String(args.echeance)) } : {}),
      } as never),
  },
  {
    nom: 'maj_objectif_plan',
    description: "Marque un objectif de plan d'accompagnement atteint (ou non).",
    permission: 'protection.gerer',
    parametres: P({ objectifId: { type: 'string' }, atteint: { type: 'boolean' } }, ['objectifId', 'atteint']),
    executer: async (ctx, args) => biz.majObjectifPlanCore(ctx as never, String(args.objectifId), args.atteint === true),
  },
  {
    nom: 'ajouter_revision_plan',
    description: "Ajoute une révision au plan d'accompagnement (motif, constats, ajustements).",
    permission: 'protection.gerer',
    parametres: P({
      planId: { type: 'string' }, motif: { type: 'string' }, constats: { type: 'string' }, ajustements: { type: 'string' },
    }, ['planId', 'motif', 'constats']),
    executer: async (ctx, args) =>
      biz.ajouterRevisionPlanCore(ctx as never, String(args.planId), {
        motif: String(args.motif), constats: String(args.constats),
        ...(args.ajustements ? { ajustements: String(args.ajustements) } : {}),
      } as never),
  },

  // ═══ INFRASTRUCTURES ═══
  {
    nom: 'creer_terrain_ia',
    description: "Crée une installation sportive (terrain, nom, type, surface, capacité).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({
      nom: { type: 'string' }, type: { type: 'string', description: 'Ex: terrain_foot, gymnase' },
      surface: { type: 'string' }, capacite: { type: 'number' },
    }, ['nom', 'type']),
    executer: async (ctx, args) =>
      biz.creerInstallationCore(ctx as never, {
        nom: String(args.nom), type: String(args.type),
        ...(args.surface ? { surface: String(args.surface) } : {}),
        ...(args.capacite !== undefined ? { capacite: Number(args.capacite) } : {}),
      } as never),
  },
  {
    nom: 'occuper_terrain_ia',
    description: "Réserve un créneau sur une installation (titre, date, heures).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({
      installation: { type: 'string', description: 'Nom de l\'installation' },
      date: { type: 'string', description: 'AAAA-MM-JJ' }, heureDebut: { type: 'string' }, heureFin: { type: 'string' },
      titre: { type: 'string' }, parQui: { type: 'string', description: 'Demandeur (optionnel)' },
    }, ['installation', 'date', 'heureDebut', 'heureFin', 'titre']),
    executer: async (ctx, args) => {
      const inst = await db.installationSportive.findFirst({ where: { nom: { contains: String(args.installation), mode: 'insensitive' } } });
      if (!inst) return { erreur: `Installation « ${args.installation} » introuvable.` };
      return biz.occuperInstallationCore(ctx as never, {
        installationId: inst.id, date: new Date(String(args.date)),
        heureDebut: String(args.heureDebut), heureFin: String(args.heureFin), titre: String(args.titre),
        ...(args.parQui ? { parQui: String(args.parQui) } : {}),
      } as never);
    },
  },
  {
    nom: 'creer_chambre_ia',
    description: "Crée une chambre d'internat (nom, genre, capacité, étage).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      nom: { type: 'string' }, genre: { type: 'string', enum: ['M', 'F', 'mixte'] },
      capacite: { type: 'number' }, etage: { type: 'string' },
    }, ['nom', 'genre', 'capacite']),
    executer: async (ctx, args) =>
      biz.creerChambreCore(ctx as never, {
        nom: String(args.nom), genre: String(args.genre), capacite: Number(args.capacite),
        ...(args.etage ? { etage: String(args.etage) } : {}),
      } as never),
  },
  {
    nom: 'creer_labo_ia',
    description: "Crée un laboratoire (nom, type, responsable, capacité).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({
      nom: { type: 'string' }, type: { type: 'string', description: 'Ex: chimie, informatique' },
      responsable: { type: 'string', description: 'Nom du responsable (optionnel)' }, capacite: { type: 'number' },
    }, ['nom', 'type']),
    executer: async (ctx, args) => {
      let responsableId: string | undefined;
      if (args.responsable) {
        const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.responsable));
        if (!rp.trouve) return { erreur: 'Responsable : ' + rp.erreur };
        responsableId = rp.entite.id;
      }
      return biz.creerLaboratoireCore(ctx as never, {
        nom: String(args.nom), type: String(args.type),
        ...(responsableId ? { responsableId } : {}),
        ...(args.capacite !== undefined ? { capacite: Number(args.capacite) } : {}),
      } as never);
    },
  },
  {
    nom: 'ajouter_equipement_labo',
    description: "Ajoute un équipement à un laboratoire (nom, quantité, état).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({
      laboratoire: { type: 'string' }, nom: { type: 'string' }, quantite: { type: 'number' },
      reference: { type: 'string' }, etat: { type: 'string', enum: ['fonctionnel', 'panne', 'maintenance'] },
    }, ['laboratoire', 'nom', 'quantite']),
    executer: async (ctx, args) => {
      const labo = await db.laboratoire.findFirst({ where: { nom: { contains: String(args.laboratoire), mode: 'insensitive' } } });
      if (!labo) return { erreur: `Laboratoire « ${args.laboratoire} » introuvable.` };
      return biz.ajouterEquipementLaboCore(ctx as never, {
        laboratoireId: labo.id, nom: String(args.nom), quantite: Number(args.quantite),
        ...(args.reference ? { reference: String(args.reference) } : {}),
        ...(args.etat ? { etat: String(args.etat) } : {}),
      } as never);
    },
  },
  {
    nom: 'reserver_labo_ia',
    description: "Réserve un laboratoire pour un créneau (expérience, classe).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({
      laboratoire: { type: 'string' }, date: { type: 'string', description: 'AAAA-MM-JJ' },
      heureDebut: { type: 'string' }, heureFin: { type: 'string' },
      experience: { type: 'string', description: 'Expérience/activité prévue' }, classe: { type: 'string' },
    }, ['laboratoire', 'date', 'heureDebut', 'heureFin', 'experience']),
    executer: async (ctx, args) => {
      const labo = await db.laboratoire.findFirst({ where: { nom: { contains: String(args.laboratoire), mode: 'insensitive' } } });
      if (!labo) return { erreur: `Laboratoire « ${args.laboratoire} » introuvable.` };
      let classeId: string | undefined;
      if (args.classe) {
        const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
        if (!rc.trouve) return { erreur: 'Classe : ' + rc.erreur };
        classeId = rc.entite.id;
      }
      return biz.reserverLaboCore(ctx as never, {
        laboratoireId: labo.id, date: new Date(String(args.date)),
        heureDebut: String(args.heureDebut), heureFin: String(args.heureFin),
        experience: String(args.experience), ...(classeId ? { classeId } : {}),
      } as never);
    },
  },
  {
    nom: 'mouvement_consommable',
    description: "Ajuste le stock d'un consommable (delta positif ou négatif).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({ consommableId: { type: 'string' }, delta: { type: 'number', description: '+10 ou -3' } }, ['consommableId', 'delta']),
    executer: async (ctx, args) => biz.mouvementConsommableCore(ctx as never, { consommableId: String(args.consommableId), delta: Number(args.delta) } as never),
  },
  {
    nom: 'creer_produit_boutique',
    description: "Crée un produit à la boutique scolaire (catégorie, nom, prix, stock).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      categorie: { type: 'string', description: 'Ex: uniforme, fourniture' }, nom: { type: 'string' },
      prix: { type: 'number', description: 'Prix FCFA' }, stock: { type: 'number' },
      taille: { type: 'string' }, couleur: { type: 'string' },
    }, ['categorie', 'nom', 'prix', 'stock']),
    executer: async (ctx, args) =>
      biz.creerProduitBoutiqueCore(ctx as never, {
        categorie: String(args.categorie), nom: String(args.nom),
        prix: Math.round(Number(args.prix) * 100), stock: Number(args.stock),
        ...(args.taille ? { taille: String(args.taille) } : {}),
        ...(args.couleur ? { couleur: String(args.couleur) } : {}),
      } as never),
  },
  {
    nom: 'vendre_boutique',
    description: "Encaisse une vente boutique (produit par nom, quantité, mode).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      produit: { type: 'string' }, quantite: { type: 'number' },
      modePaiement: { type: 'string', enum: ['especes', 'mobile', 'virement'] },
      eleve: { type: 'string', description: 'Acheteur (optionnel)' },
    }, ['produit', 'quantite', 'modePaiement']),
    executer: async (ctx, args) => {
      const produit = await db.boutiqueProduit.findFirst({ where: { nom: { contains: String(args.produit), mode: 'insensitive' } } });
      if (!produit) return { erreur: `Produit « ${args.produit} » introuvable.` };
      let eleveId: string | undefined;
      if (args.eleve) {
        const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
        if (!re.trouve) return { erreur: 'Élève : ' + re.erreur };
        eleveId = re.entite.id;
      }
      return biz.encaisserVenteCore(ctx as never, {
        produitId: produit.id, quantite: Number(args.quantite), modePaiement: String(args.modePaiement),
        ...(eleveId ? { eleveId } : {}),
      } as never);
    },
  },
  {
    nom: 'deposer_buanderie',
    description: "Enregistre un dépôt de linge en buanderie (élève/chambre, articles).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      eleve: { type: 'string' },
      articles: { type: 'string', description: 'Articles « type:quantite » séparés par ; (ex: drap:2; serviette:1)' },
    }, ['eleve', 'articles']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const articles = String(args.articles).split(';').map((s) => s.trim()).filter(Boolean).map((paire) => {
        const [type, qte] = paire.split(':').map((x) => x.trim());
        return { type, quantite: Math.max(1, Number(qte ?? 1)) };
      }).filter((a) => a.type);
      if (articles.length === 0) return { erreur: 'Articles invalides.' };
      return biz.deposerBuanderieCore(ctx as never, { eleveId: re.entite.id, articles } as never);
    },
  },
  {
    nom: 'traiter_buanderie',
    description: "Traite un dépôt de buanderie : laver ou distribuer.",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      depotId: { type: 'string' }, action: { type: 'string', enum: ['laver', 'distribuer'] },
    }, ['depotId', 'action']),
    executer: async (ctx, args) => biz.gererBuanderieCore(ctx as never, String(args.depotId), args.action as never),
  },
  {
    nom: 'controle_haccp',
    description: "Enregistre un contrôle HACCP (point de contrôle, valeur, conforme).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      date: { type: 'string', description: 'AAAA-MM-JJ' }, pointControle: { type: 'string', description: 'Ex: température chambre froide' },
      valeur: { type: 'string' }, conforme: { type: 'boolean' }, observation: { type: 'string' },
    }, ['date', 'pointControle', 'conforme']),
    executer: async (ctx, args) =>
      biz.enregistrerControleHaccpCore(ctx as never, {
        date: new Date(String(args.date)), pointControle: String(args.pointControle),
        conforme: args.conforme === true,
        ...(args.valeur ? { valeur: String(args.valeur) } : {}),
        ...(args.observation ? { observation: String(args.observation) } : {}),
      } as never),
  },
  {
    nom: 'ajouter_equipement_info',
    description: "Inventorie un équipement informatique (catégorie, nom, marque, salle).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({
      categorie: { type: 'string', description: 'Ex: ordinateur, vidéoprojecteur' }, nom: { type: 'string' },
      marque: { type: 'string' }, modele: { type: 'string' }, numeroSerie: { type: 'string' }, salle: { type: 'string' },
    }, ['categorie', 'nom']),
    executer: async (ctx, args) => {
      let salleId: string | undefined;
      if (args.salle) {
        const salle = await db.salle.findFirst({ where: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.salle), mode: 'insensitive' } } });
        if (salle) salleId = salle.id;
      }
      const d: Record<string, unknown> = { categorie: String(args.categorie), nom: String(args.nom) };
      for (const k of ['marque', 'modele', 'numeroSerie']) if (args[k] !== undefined) d[k] = String(args[k]);
      if (salleId) d.salleId = salleId;
      return biz.ajouterEquipementInfoCore(ctx as never, d as never);
    },
  },
  {
    nom: 'preter_equipement_info',
    description: "Prête un équipement informatique (par nom, à un personnel, retour prévu).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({
      equipement: { type: 'string' }, emprunteur: { type: 'string', description: 'Nom du personnel' },
      retourPrevu: { type: 'string', description: 'AAAA-MM-JJ' },
    }, ['equipement', 'emprunteur', 'retourPrevu']),
    executer: async (ctx, args) => {
      const equip = await db.equipementInfo.findFirst({ where: { nom: { contains: String(args.equipement), mode: 'insensitive' } } });
      if (!equip) return { erreur: `Équipement « ${args.equipement} » introuvable.` };
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.emprunteur));
      if (!rp.trouve) return { erreur: 'Emprunteur : ' + rp.erreur };
      return biz.preterEquipementInfoCore(ctx as never, {
        equipementId: equip.id, emprunteParId: rp.entite.id, retourPrevu: new Date(String(args.retourPrevu)),
      } as never);
    },
  },
  {
    nom: 'retourner_equipement_info',
    description: "Enregistre le retour d'un équipement informatique (état).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({ pretId: { type: 'string' }, etatRetour: { type: 'string', enum: ['bon', 'usage', 'endommage', 'perdu'] } }, ['pretId', 'etatRetour']),
    executer: async (ctx, args) => biz.retournerEquipementInfoCore(ctx as never, String(args.pretId), String(args.etatRetour)),
  },
  {
    nom: 'maj_etat_equipement_info',
    description: "Change l'état d'un équipement informatique (fonctionnel, panne, maintenance).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({
      equipement: { type: 'string' }, etat: { type: 'string', enum: ['fonctionnel', 'panne', 'maintenance'] },
    }, ['equipement', 'etat']),
    executer: async (ctx, args) => {
      const equip = await db.equipementInfo.findFirst({ where: { nom: { contains: String(args.equipement), mode: 'insensitive' } } });
      if (!equip) return { erreur: `Équipement « ${args.equipement} » introuvable.` };
      return biz.majEtatEquipementInfoCore(ctx as never, equip.id, String(args.etat));
    },
  },
  {
    nom: 'maj_flag_infrastructure',
    description: "Active/désactive un module d'infrastructure (cantine, internat, transport, boutique, labos…).",
    permission: 'admin.saas',
    parametres: P({
      code: { type: 'string', description: 'Code du flag' }, actif: { type: 'boolean' },
    }, ['code', 'actif']),
    executer: async (ctx, args) => biz.majFlagInfraCore(ctx as never, String(args.code) as never, args.actif === true),
  },

  // ═══ TRANSPORT AVANCÉ (feuilles de route) ═══
  {
    nom: 'creer_feuille_route',
    description: "Ouvre la feuille de route d'une ligne de transport pour une date.",
    permission: 'services.gerer',
    parametres: P({ ligne: { type: 'string' }, date: { type: 'string', description: 'AAAA-MM-JJ' } }, ['ligne', 'date']),
    executer: async (ctx, args) => {
      const ligne = await db.transportLigne.findFirst({ where: { nom: { contains: String(args.ligne), mode: 'insensitive' } } });
      if (!ligne) return { erreur: `Ligne « ${args.ligne} » introuvable.` };
      return biz.creerFeuilleRouteCore(ctx as never, ligne.id, new Date(String(args.date)));
    },
  },
  {
    nom: 'pointer_arret_ia',
    description: "Pointe le passage à un arrêt (heure réelle, montées/descentes par noms d'élèves).",
    permission: 'services.gerer',
    parametres: P({
      passageId: { type: 'string', description: 'ID du passage (arrêt)' }, heureReelle: { type: 'string', description: 'HH:MM' },
      montes: { type: 'string', description: 'Noms montés, ; (optionnel)' }, descendus: { type: 'string' },
    }, ['passageId', 'heureReelle']),
    executer: async (ctx, args) => {
      const resoudreIds = async (liste: string | undefined) => {
        if (!liste) return undefined;
        const ids: string[] = [];
        for (const nom of String(liste).split(';').map((s) => s.trim()).filter(Boolean)) {
          const re = await resoudreEleve(ctx.ecoleId!, nom);
          if (!re.trouve) return null;
          ids.push(re.entite.id);
        }
        return ids;
      };
      const montes = await resoudreIds(args.montes as string);
      if (montes === null) return { erreur: 'Élève « monté » introuvable.' };
      const descendus = await resoudreIds(args.descendus as string);
      if (descendus === null) return { erreur: 'Élève « descendu » introuvable.' };
      return biz.pointerArretCore(ctx as never, String(args.passageId), {
        heureReelle: String(args.heureReelle),
        ...(montes ? { montes } : {}), ...(descendus ? { descendus } : {}),
      } as never);
    },
  },
  {
    nom: 'cloturer_feuille_route',
    description: "Clôture une feuille de route de transport (fin de tournée).",
    permission: 'services.gerer',
    parametres: P({ feuilleId: { type: 'string' } }, ['feuilleId']),
    executer: async (ctx, args) => (biz as any)['clôturerFeuilleRouteCore'](ctx, String(args.feuilleId)),
  },

  // ═══ INTERNAT COMPLÉMENT / PRODUCTION REPAS ═══
  {
    nom: 'demander_permission_internat',
    description: "Enregistre une demande de permission de sortie d'internat pour un élève.",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      eleve: { type: 'string' }, dateDepart: { type: 'string', description: 'AAAA-MM-JJ' },
      dateRetourPrevue: { type: 'string', description: 'AAAA-MM-JJ' }, motif: { type: 'string' }, destination: { type: 'string' },
    }, ['eleve', 'dateDepart', 'dateRetourPrevue', 'motif']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.demanderPermissionInternatCore(ctx as never, {
        eleveId: re.entite.id, dateDepart: new Date(String(args.dateDepart)),
        dateRetourPrevue: new Date(String(args.dateRetourPrevue)), motif: String(args.motif),
        ...(args.destination ? { destination: String(args.destination) } : {}),
      } as never);
    },
  },
  {
    nom: 'incident_internat_ia',
    description: "Déclare un incident d'internat (chambre/élève, gravité, description).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      eleve: { type: 'string', description: 'Élève concerné (optionnel)' },
      dateHeure: { type: 'string', description: 'AAAA-MM-JJTHH:MM' }, gravite: { type: 'string' },
      description: { type: 'string' }, suites: { type: 'string' },
    }, ['dateHeure', 'gravite', 'description']),
    executer: async (ctx, args) => {
      let eleveId: string | undefined;
      if (args.eleve) {
        const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
        if (!re.trouve) return { erreur: 'Élève : ' + re.erreur };
        eleveId = re.entite.id;
      }
      return biz.declarerIncidentInternatCore(ctx as never, {
        ...(eleveId ? { eleveId } : {}), dateHeure: new Date(String(args.dateHeure)),
        gravite: String(args.gravite), description: String(args.description),
        ...(args.suites ? { suites: String(args.suites) } : {}),
      } as never);
    },
  },
  {
    nom: 'production_repas_ia',
    description: "Enregistre la production d'un service de repas (effectif prévu/servi).",
    permission: 'services.gerer',
    parametres: P({
      date: { type: 'string', description: 'AAAA-MM-JJ' }, service: { type: 'string', enum: ['petit_dejeuner', 'dejeuner', 'diner', 'collation'] },
      effectifPrevu: { type: 'number' }, effectifServi: { type: 'number' }, notes: { type: 'string' },
    }, ['date', 'service', 'effectifPrevu', 'effectifServi']),
    executer: async (ctx, args) =>
      biz.enregistrerProductionCore(ctx as never, {
        date: new Date(String(args.date)), service: String(args.service),
        effectifPrevu: Number(args.effectifPrevu), effectifServi: Number(args.effectifServi),
        ...(args.notes ? { notes: String(args.notes) } : {}),
      } as never),
  },

  // ═══ COMMUNICATION COMPLÉMENTS ═══
  {
    nom: 'envoyer_notification_directe',
    description: "Envoie une notification in-app à UN destinataire (par email ou nom complet).",
    permission: 'communication.envoyer',
    parametres: P({
      destinataire: { type: 'string', description: 'Email ou nom complet' },
      sujet: { type: 'string' }, corps: { type: 'string' },
    }, ['destinataire', 'sujet', 'corps']),
    executer: async (ctx, args) => {
      const q = String(args.destinataire).trim().toLowerCase();
      let u = await db.utilisateur.findFirst({ where: { email: q, deletedAt: null } });
      if (!u) {
        const qN = normaliser(String(args.destinataire));
        const tous = await db.utilisateur.findMany({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, actif: true } });
        u = tous.find((x) => normaliser(`${x.prenom} ${x.nom}`) === qN || normaliser(`${x.nom} ${x.prenom}`) === qN)
          ?? tous.find((x) => normaliser(`${x.prenom} ${x.nom}`).includes(qN)) ?? null;
      }
      if (!u) return { erreur: `Destinataire « ${args.destinataire} » introuvable.` };
      return biz.envoyerNotificationCore(ctx as never, ctx.ecoleId!, {
        destinataireId: u.id, destinataireType: u.type === 'parent' ? 'parent' : 'personnel',
        sujet: String(args.sujet), corps: String(args.corps),
      } as never);
    },
  },
  {
    nom: 'creer_conversation_ia',
    description: "Ouvre une conversation (direct ou groupe) avec des participants désignés par noms.",
    permission: 'communication.envoyer',
    parametres: P({
      titre: { type: 'string' }, type: { type: 'string', enum: ['direct', 'groupe'] },
      participants: { type: 'string', description: 'Noms ou emails séparés par ;' },
    }, ['titre', 'type', 'participants']),
    executer: async (ctx, args) => {
      const participantIds: string[] = [];
      for (const cible of String(args.participants).split(';').map((s) => s.trim()).filter(Boolean)) {
        const q = cible.toLowerCase();
        let u = await db.utilisateur.findFirst({ where: { email: q, deletedAt: null } });
        if (!u) {
          const qN = normaliser(cible);
          const tous = await db.utilisateur.findMany({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, actif: true } });
          u = tous.find((x) => normaliser(`${x.prenom} ${x.nom}`) === qN || normaliser(`${x.nom} ${x.prenom}`) === qN) ?? null;
        }
        if (!u) return { erreur: `Participant « ${cible} » introuvable.` };
        participantIds.push(u.id);
      }
      return biz.creerConversationCore(ctx as never, {
        titre: String(args.titre), type: String(args.type), participantIds,
      } as never);
    },
  },
  {
    nom: 'changer_statut_ticket',
    description: "Change le statut d'un ticket support (ouvert, en_cours, resolu, clos).",
    permission: 'communication.envoyer',
    parametres: P({ sujet: { type: 'string', description: 'Sujet du ticket' }, statut: { type: 'string' } }, ['sujet', 'statut']),
    executer: async (ctx, args) => {
      const ticket = await db.ticket.findFirst({ where: { ecoleId: ctx.ecoleId!, sujet: { contains: String(args.sujet), mode: 'insensitive' } } });
      if (!ticket) return { erreur: `Ticket « ${args.sujet} » introuvable.` };
      return biz.changerStatutTicketCore(ctx as never, ticket.id, String(args.statut));
    },
  },
  {
    nom: 'annuler_reunion_collective',
    description: "Annule une réunion collective programmée (par son titre + date).",
    permission: ['communication.envoyer', 'eleves.ecrire'],
    parametres: P({ classe: { type: 'string' }, date: { type: 'string', description: 'AAAA-MM-JJ de la réunion' } }, ['classe', 'date']),
    executer: async (ctx, args) => {
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const debut = new Date(String(args.date)); const fin = new Date(debut); fin.setDate(fin.getDate() + 1);
      const reunion = await db.reunionCollective.findFirst({ where: { classeId: rc.entite.id, date: { gte: debut, lt: fin } } });
      if (!reunion) return { erreur: 'Réunion introuvable pour cette classe à cette date.' };
      const actions = await import('@/app/actions/extensions');
      return actions.annulerReunionCollective(reunion.id);
    },
  },

  // ═══ FINANCES COMPLÉMENTS ═══
  {
    nom: 'appliquer_remises_familles',
    description: "Applique une remise en POURCENTAGE à toutes les échéances non soldées (campagne bourses) — opération de masse.",
    permission: 'finances.ecrire',
    parametres: P({ pourcentage: { type: 'number', description: 'Remise 0-100 (%)' } }, ['pourcentage']),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/completions');
      return actions.appliquerRemisesFamilles(Number(args.pourcentage));
    },
  },
  {
    nom: 'generer_echeancier_personnalise',
    description: "Génère un échéancier PERSONNALISÉ pour un élève sur un frais (tranches « montant|date » séparées par ;).",
    permission: 'finances.ecrire',
    parametres: P({
      eleve: { type: 'string' }, frais: { type: 'string', description: 'Libellé du frais' },
      tranches: { type: 'string', description: 'Ex : « 50000|2026-10-15; 50000|2026-12-15 » (FCFA)' },
    }, ['eleve', 'frais', 'tranches']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const frais = await db.frais.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.frais), mode: 'insensitive' } } });
      if (!frais) return { erreur: `Frais « ${args.frais} » introuvable.` };
      const actions = await import('@/app/actions/completions');
      const fd = new FormData();
      fd.set('eleveId', re.entite.id); fd.set('fraisId', frais.id);
      fd.set('tranches', String(args.tranches).split(';').map((t) => {
        const [montant, date] = t.split('|').map((x) => x.trim());
        return `${Math.round(Number(montant) * 100)}|${date}`;
      }).join(';'));
      return actions.genererEcheancierPersonnalise(fd);
    },
  },
  {
    nom: 'configurer_sections_compta_ia',
    description: "Bascule la comptabilité : unique ou séparée primaire/secondaire.",
    permission: 'finances.valider',
    parametres: P({ separees: { type: 'boolean', description: 'true = séparer, false = comptabilité unique' } }, ['separees']),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/comptabilite');
      return actions.configurerSections(args.separees === true);
    },
  },
  {
    nom: 'exporter_virements_paie_ia',
    description: "Exporte les virements de paie d'un mois au format banque (CSV ; RIB requis côté fiches).",
    permission: 'rh.gerer',
    parametres: P({ periode: { type: 'string', description: 'AAAA-MM' } }, ['periode']),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/completions');
      return actions.exporterVirementsPaie(String(args.periode));
    },
  },
  {
    nom: 'desactiver_autorisation_sortie',
    description: "Désactive une autorisation de sortie (personne concernée par élève).",
    permission: ['vie_scolaire.gerer', 'securite.gerer'],
    parametres: P({ eleve: { type: 'string' }, personne: { type: 'string', description: 'Nom de la personne autorisée' } }, ['eleve', 'personne']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const autorisation = await db.autorisationSortie.findFirst({
        where: { eleveId: re.entite.id, nomPersonneAutorisee: { contains: String(args.personne), mode: 'insensitive' }, active: true },
      });
      if (!autorisation) return { erreur: 'Autorisation active introuvable pour cette personne.' };
      return biz.desactiverAutorisationSortieCore(ctx as never, autorisation.id);
    },
  },
  {
    nom: 'traiter_autorisation_activite',
    description: "Accorde ou refuse l'autorisation parentale pour une participation à une activité/sortie.",
    permission: ['services.gerer', 'vie_scolaire.gerer'],
    parametres: P({
      participationId: { type: 'string', description: 'ID de la participation' },
      decision: { type: 'string', enum: ['accordee', 'refusee'] },
    }, ['participationId', 'decision']),
    executer: async (ctx, args) => biz.traiterAutorisationCore(ctx as never, String(args.participationId), args.decision as never),
  },
  {
    nom: 'changer_statut_activite_ia',
    description: "Change le statut d'une activité/sortie (planifiee, en_cours, terminee, annulee).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      activite: { type: 'string', description: 'Titre de l\'activité' },
      statut: { type: 'string', enum: ['planifiee', 'en_cours', 'terminee', 'annulee'] },
    }, ['activite', 'statut']),
    executer: async (ctx, args) => {
      const activite = await db.activite.findFirst({ where: { titre: { contains: String(args.activite), mode: 'insensitive' } } });
      if (!activite) return { erreur: `Activité « ${args.activite} » introuvable.` };
      return biz.changerStatutActiviteCore(ctx as never, activite.id, String(args.statut));
    },
  },

  // ═══ PÉDAGOGIE COMPLÉMENTS ═══
  {
    nom: 'evaluer_rythme_programme',
    description: "Évalue le rythme pédagogique d'un programme (avancement vs volume horaire, alertes).",
    permission: 'notes.saisir',
    parametres: P({ programme: { type: 'string', description: 'Titre du programme' } }, ['programme']),
    executer: async (_ctx, args) => {
      const prog = await db.programme.findFirst({ where: { titre: { contains: String(args.programme), mode: 'insensitive' } } });
      if (!prog) return { erreur: `Programme « ${args.programme} » introuvable.` };
      const actions = await import('@/app/actions/extensions');
      return actions.evaluerRythmeProgramme(prog.id);
    },
  },
  {
    nom: 'synthese_pointage_ia',
    description: "Synthèse mensuelle des pointages d'un personnel (heures, retards, heures supplémentaires).",
    permission: ['rh.gerer', 'presences.saisir'],
    parametres: P({
      personnel: { type: 'string' }, periode: { type: 'string', description: 'AAAA-MM' },
    }, ['personnel', 'periode']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.synthesePointageCore(ctx as never, rp.entite.id, String(args.periode));
    },
  },
  {
    nom: 'relancer_absences_ia',
    description: "Relance les familles des élèves dépassant un seuil d'absences sur la période.",
    permission: 'vie_scolaire.gerer',
    parametres: P({
      seuil: { type: 'number', description: 'Seuil d\'absences (ex: 5)' }, periodeJours: { type: 'number', description: 'Fenêtre en jours (ex: 30)' },
    }, ['seuil', 'periodeJours']),
    executer: async (ctx, args) => biz.relancerAbsencesCore(ctx as never, Number(args.seuil), Number(args.periodeJours)),
  },

  // ═══ AFFECTATIONS ENSEIGNANT × MATIÈRE × CLASSE ═══
  {
    nom: 'affecter_enseignant',
    description: "Affecte un enseignant à une matière sur un ensemble de classes (avec exceptions possibles : « partout SAUF la 3e »).",
    permission: ['edt.gerer', 'admin.saas', 'notes.saisir'],
    parametres: P({
      enseignant: { type: 'string', description: 'Nom de l\'enseignant' },
      matiere: { type: 'string', description: 'Matière' },
      classes: { type: 'string', description: 'Classes séparées par ; (ex: 6A; 6B)' },
      saufClasses: { type: 'string', description: 'Exceptions séparées par ; (optionnel)' },
    }, ['enseignant', 'matiere', 'classes']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.enseignant));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      const { resoudreMatiere } = await import('./resolution');
      const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!rm.trouve) return { erreur: 'Matière : ' + rm.erreur, candidats: rm.candidats };
      const classeIds: string[] = [];
      for (const c of String(args.classes).split(';').map((s) => s.trim()).filter(Boolean)) {
        const rc = await resoudreClasse(ctx.ecoleId!, c);
        if (!rc.trouve) return { erreur: `Classe « ${c} » : ${rc.erreur}` };
        classeIds.push(rc.entite.id);
      }
      const saufClasseIds: string[] = [];
      for (const c of String(args.saufClasses ?? '').split(';').map((s) => s.trim()).filter(Boolean)) {
        const rc = await resoudreClasse(ctx.ecoleId!, c);
        if (rc.trouve) saufClasseIds.push(rc.entite.id);
      }
      return biz.affecterEnseignantCore(ctx as never, {
        personnelId: rp.entite.id, matiereId: rm.entite.id, classeIds,
        ...(saufClasseIds.length > 0 ? { saufClasseIds } : {}),
      } as never);
    },
  },
  {
    nom: 'retirer_affectation',
    description: "Retire une affectation d'enseignant (par son ID — obtenu via voir_affectations).",
    permission: ['edt.gerer', 'admin.saas', 'notes.saisir'],
    parametres: P({ affectationId: { type: 'string', description: 'ID de l\'affectation' } }, ['affectationId']),
    executer: async (ctx, args) => biz.retirerAffectationCore(ctx as never, String(args.affectationId)),
  },
  {
    nom: 'voir_affectations',
    description: "Liste les affectations enseignant × matière × classe (filtres optionnels par enseignant, matière ou classe).",
    permission: ['eleves.lire', 'edt.gerer', 'notes.saisir', 'admin.saas'],
    parametres: P({
      enseignant: { type: 'string', description: 'Filtre enseignant (optionnel)' },
      matiere: { type: 'string', description: 'Filtre matière (optionnel)' },
      classe: { type: 'string', description: 'Filtre classe (optionnel)' },
    }),
    executer: async (ctx, args) => {
      const where: Record<string, unknown> = { ecoleId: ctx.ecoleId! };
      if (args.enseignant) where.personnel = { nom: { contains: String(args.enseignant), mode: 'insensitive' } };
      if (args.matiere) where.matiere = { libelle: { contains: String(args.matiere), mode: 'insensitive' } };
      if (args.classe) where.classe = { libelle: { contains: String(args.classe), mode: 'insensitive' } };
      const affectations = await db.affectationEnseignant.findMany({
        where: where as never, take: 300,
        include: { personnel: { select: { prenom: true, nom: true } }, matiere: { select: { libelle: true } }, classe: { select: { code: true, libelle: true } } },
      });
      return { total: affectations.length, affectations: affectations.map((a) => ({
        affectationId: a.id,
        enseignant: `${a.personnel?.prenom ?? ''} ${a.personnel?.nom ?? ''}`.trim(),
        matiere: a.matiere?.libelle ?? '—', classe: a.classe?.libelle ?? a.classe?.code ?? '—',
        depuis: a.createdAt,
      })) };
    },
  },

  // ═══ ADMIN / RGPD COMPLÉMENTS ═══
  {
    nom: 'creer_compte_parent_ia',
    description: "Crée le compte portail d'un parent (email + mot de passe ≥ 8 — à communiquer).",
    permission: ['admin.saas', 'eleves.ecrire'],
    parametres: P({
      parent: { type: 'string', description: 'Nom du parent' }, email: { type: 'string' }, motDePasse: { type: 'string' },
    }, ['parent', 'email', 'motDePasse']),
    executer: async (ctx, args) => {
      const qN = normaliser(String(args.parent));
      const tous = await db.parentTuteur.findMany({ where: { ecoleId: ctx.ecoleId! } });
      const cible = tous.find((p) => normaliser(`${p.prenom ?? ''} ${p.nom ?? ''}`).includes(qN) || normaliser(p.nom ?? '').includes(qN));
      if (!cible) return { erreur: `Parent « ${args.parent} » introuvable.` };
      return biz.creerCompteParentCore(ctx as never, cible.id, String(args.email), String(args.motDePasse));
    },
  },
  {
    nom: 'consentement_image_ia',
    description: "Enregistre le consentement (ou refus) d'usage d'image pour un élève.",
    permission: ['admin.saas', 'eleves.ecrire'],
    parametres: P({ eleve: { type: 'string' }, accord: { type: 'boolean' }, usage: { type: 'string' }, duree: { type: 'string' } }, ['eleve', 'accord', 'usage']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const actions = await import('@/app/actions/index');
      const fd = new FormData();
      fd.set('eleveId', re.entite.id);
      fd.set('accord', args.accord === true ? 'on' : '');
      fd.set('usage', String(args.usage));
      if (args.duree) fd.set('duree', String(args.duree));
      return actions.enregistrerConsentementImage(fd);
    },
  },
  {
    nom: 'consentement_portail_ia',
    description: "Active le consentement d'accès au portail pour un élève (RGPD mineur).",
    permission: ['admin.saas', 'eleves.ecrire'],
    parametres: P({ eleve: { type: 'string' } }, ['eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const actions = await import('@/app/actions/index');
      return actions.activerConsentementPortailEleve(re.entite.id);
    },
  },
  {
    nom: 'demander_effacement_ia',
    description: "Ouvre une demande RGPD d'effacement des données d'un élève (à traiter ensuite).",
    permission: ['admin.saas', 'eleves.ecrire'],
    parametres: P({ eleve: { type: 'string' }, motif: { type: 'string' } }, ['eleve', 'motif']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const actions = await import('@/app/actions/index');
      const fd = new FormData();
      fd.set('eleveId', re.entite.id); fd.set('motif', String(args.motif));
      return actions.demanderEffacement(fd);
    },
  },
  {
    nom: 'lister_demandes_compte_ia',
    description: "Liste les demandes de compte en attente (publiques) — IDs pour traiter_demande_compte_ia.",
    permission: 'admin.saas',
    parametres: P({}),
    executer: async () => {
      const actions = await import('@/app/actions/completions');
      return actions.listerDemandesCompte();
    },
  },
  {
    nom: 'lister_cibles_documents_ia',
    description: "Liste les cibles possibles des documents (élèves, personnels…) pour paramétrer une génération.",
    permission: 'eleves.lire',
    parametres: P({}),
    executer: async () => {
      const actions = await import('@/app/actions/etablissement');
      return actions.listerCiblesDocuments();
    },
  },
  {
    nom: 'accorder_acces_ecole_ia',
    description: "Accorde à un utilisateur l'accès à une autre école (support multi-établissements). Super-admin.",
    permission: 'admin.saas',
    parametres: P({
      email: { type: 'string', description: 'Email de l\'utilisateur' },
      ecole: { type: 'string', description: 'Nom ou slug de l\'école' },
      roleLibelle: { type: 'string', description: 'Rôle (ex: direction)' },
    }, ['email', 'ecole']),
    executer: async (ctx, args) => {
      const u = await db.utilisateur.findFirst({ where: { email: String(args.email).toLowerCase(), deletedAt: null } });
      if (!u) return { erreur: `Utilisateur « ${args.email} » introuvable.` };
      const ecole = await db.ecole.findFirst({
        where: { OR: [{ nom: { contains: String(args.ecole), mode: 'insensitive' } }, { slug: String(args.ecole).toLowerCase() }] },
      });
      if (!ecole) return { erreur: `École « ${args.ecole} » introuvable.` };
      return biz.accorderAccesEcoleCore(ctx as never, u.id, ecole.id, args.roleLibelle ? String(args.roleLibelle) : undefined);
    },
  },
  {
    nom: 'changer_plan_ecole_ia',
    description: "Change le plan tarifaire d'une école cliente (mensuel ou annuel). Super-admin.",
    permission: 'admin.saas',
    parametres: P({
      ecole: { type: 'string', description: 'Nom ou slug' },
      plan: { type: 'string', description: 'Nom du plan' },
      modeFacturation: { type: 'string', enum: ['mensuel', 'annuel'] },
    }, ['ecole', 'plan', 'modeFacturation']),
    executer: async (ctx, args) => {
      const ecole = await db.ecole.findFirst({
        where: { OR: [{ nom: { contains: String(args.ecole), mode: 'insensitive' } }, { slug: String(args.ecole).toLowerCase() }] },
      });
      if (!ecole) return { erreur: `École « ${args.ecole} » introuvable.` };
      const plan = await db.planTarifaire.findFirst({ where: { nom: { contains: String(args.plan), mode: 'insensitive' }, actif: true } });
      if (!plan) return { erreur: `Plan « ${args.plan} » introuvable.` };
      return biz.changerPlanEcoleCore(ctx as never, ecole.id, plan.id, args.modeFacturation as never);
    },
  },
  {
    nom: 'creer_plan_tarifaire_ia',
    description: "Crée un plan tarifaire SaaS (prix mensuel/annuel FCFA, essai, limite d'élèves).",
    permission: 'admin.saas',
    parametres: P({
      nom: { type: 'string' }, prixMensuel: { type: 'number', description: 'FCFA/mois' },
      prixAnnuel: { type: 'number', description: 'FCFA/an' }, dureeEssaiJours: { type: 'number' },
      limiteEleves: { type: 'number', description: '0 = illimité' },
    }, ['nom', 'prixMensuel', 'prixAnnuel']),
    executer: async (ctx, args) =>
      biz.creerPlanTarifaireCore(ctx as never, {
        nom: String(args.nom),
        prixMensuel: Math.round(Number(args.prixMensuel) * 100),
        prixAnnuel: Math.round(Number(args.prixAnnuel) * 100),
        ...(args.dureeEssaiJours !== undefined ? { dureeEssaiJours: Number(args.dureeEssaiJours) } : {}),
        ...(args.limiteEleves !== undefined ? { limiteEleves: Number(args.limiteEleves) } : {}),
      } as never),
  },
  {
    nom: 'supprimer_webhook_ia',
    description: "Supprime un webhook sortant (par URL).",
    permission: 'admin.saas',
    parametres: P({ url: { type: 'string' } }, ['url']),
    executer: async (ctx, args) => {
      const webhook = await db.webhookSortant.findFirst({ where: { ecoleId: ctx.ecoleId!, url: { contains: String(args.url) } } });
      if (!webhook) return { erreur: 'Webhook introuvable.' };
      return biz.supprimerWebhookCore(ctx as never, webhook.id);
    },
  },
  {
    nom: 'revoquer_api_token_ia',
    description: "Révoque un token d'API (par nom).",
    permission: 'admin.saas',
    parametres: P({ nom: { type: 'string' } }, ['nom']),
    executer: async (ctx, args) => {
      const token = await db.apiToken.findFirst({ where: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.nom), mode: 'insensitive' } } });
      if (!token) return { erreur: `Token « ${args.nom} » introuvable.` };
      return biz.revoquerApiTokenCore(ctx as never, token.id);
    },
  },
  {
    nom: 'ajouter_domaine_ia',
    description: "Ajoute un domaine personnalisé à l'école.",
    permission: 'admin.saas',
    parametres: P({ domaine: { type: 'string', description: 'ex: mon-ecole.com' } }, ['domaine']),
    executer: async (ctx, args) => biz.ajouterDomaineCore(ctx as never, String(args.domaine)),
  },
  {
    nom: 'verifier_domaine_ia',
    description: "Relance la vérification DNS d'un domaine personnalisé (par son ID ou nom).",
    permission: 'admin.saas',
    parametres: P({ domaine: { type: 'string' } }, ['domaine']),
    executer: async (ctx, args) => {
      const domaine = await db.domainePersonnalise.findFirst({
        where: { ecoleId: ctx.ecoleId!, OR: [{ domaine: { contains: String(args.domaine) } }] } as never,
      });
      if (!domaine) return { erreur: `Domaine « ${args.domaine} » introuvable.` };
      return biz.verifierDomaineCore(ctx as never, domaine.id);
    },
  },
  {
    nom: 'maj_feature_flag_ia',
    description: "Active/désactive une fonctionnalité pour l'école (code du flag).",
    permission: 'admin.saas',
    parametres: P({ code: { type: 'string' }, actif: { type: 'boolean' } }, ['code', 'actif']),
    executer: async (ctx, args) => biz.majFeatureFlagEcoleCore(ctx as never, String(args.code), args.actif === true),
  },
];
