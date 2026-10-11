// ====================================================================
// OUTILS IA — STRUCTURE PÉDAGOGIQUE COMPLÈTE
// Classes (créer/modifier/supprimer/dupliquer), matières, emploi du temps
// (créneaux, import CSV, génération de séances), programmes & chapitres,
// périodes/règles de calcul, clôture d'année, visa cahier de textes,
// circuit des bulletins.
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';
import { resoudreClasse, resoudreMatiere, resoudrePersonnel, normaliser } from './resolution';
import * as biz from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

export const outilsIaStructure: OutilIA[] = [
  // ═══ CLASSES ═══
  {
    nom: 'creer_classe',
    description: "Crée une classe pour l'année active (niveau, code, libellé, capacité, titulaire). Ex : niveau 6E, code 6B, libelle « Sixième B ».",
    permission: 'admin.saas',
    parametres: P({
      niveau: { type: 'string', description: 'Niveau (code ex: 6E, CM2, 2NDE — ou libellé)' },
      code: { type: 'string', description: 'Code unique (ex: 6B, CM2-B)' },
      libelle: { type: 'string', description: 'Libellé affiché (ex: Sixième B)' },
      capaciteMax: { type: 'number', description: 'Capacité (défaut 40)' },
      titulaire: { type: 'string', description: 'Enseignant principal (nom — optionnel)' },
    }, ['niveau', 'code', 'libelle']),
    executer: async (ctx, args) => {
      const niveau = await db.niveau.findFirst({
        where: { section: { cycle: { ecoleId: ctx.ecoleId! } }, OR: [{ code: String(args.niveau).toUpperCase() }, { libelle: { contains: String(args.niveau), mode: 'insensitive' } }] },
      });
      if (!niveau) return { erreur: `Niveau « ${args.niveau} » introuvable.` };
      let titulaireId: string | undefined;
      if (args.titulaire) {
        const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.titulaire));
        if (!rp.trouve) return { erreur: 'Titulaire : ' + rp.erreur, candidats: rp.candidats };
        titulaireId = rp.entite.id;
      }
      return biz.creerClasseCore(ctx as never, {
        niveauId: niveau.id, code: String(args.code), libelle: String(args.libelle),
        ...(args.capaciteMax !== undefined ? { capaciteMax: Number(args.capaciteMax) } : {}),
        ...(titulaireId ? { enseignantPrincipalId: titulaireId } : {}),
      } as never);
    },
  },
  {
    nom: 'modifier_classe',
    description: "Renomme une classe ou ajuste sa capacité maximale.",
    permission: 'admin.saas',
    parametres: P({
      classe: { type: 'string', description: 'Code/libellé de la classe' },
      nom: { type: 'string', description: 'Nouveau nom' },
      capacite: { type: 'number', description: 'Nouvelle capacité (optionnel)' },
    }, ['classe', 'nom']),
    executer: async (ctx, args) => {
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const actions = await import('@/app/actions/extensions');
      return actions.modifierClasse(rc.entite.id, String(args.nom), args.capacite !== undefined ? Number(args.capacite) : undefined);
    },
  },
  {
    nom: 'supprimer_classe',
    description: "Supprime une classe VIDE de l'année active (refusée si des élèves y sont affectés).",
    permission: 'admin.saas',
    parametres: P({ classe: { type: 'string', description: 'Code/libellé de la classe' } }, ['classe']),
    executer: async (ctx, args) => {
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      return biz.supprimerClasseCore(ctx as never, rc.entite.id);
    },
  },
  {
    nom: 'dupliquer_classe',
    description: "Duplique une classe (même niveau) avec un suffixe (ex: 6A → 6B).",
    permission: 'admin.saas',
    parametres: P({
      classe: { type: 'string', description: 'Classe source' },
      suffixe: { type: 'string', description: 'Suffixe (ex: B)' },
    }, ['classe', 'suffixe']),
    executer: async (ctx, args) => {
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const actions = await import('@/app/actions/extensions');
      return actions.dupliquerClasse(rc.entite.id, String(args.suffixe));
    },
  },

  // ═══ MATIÈRES ═══
  {
    nom: 'creer_matiere_ia',
    description: "Crée une matière (code court, libellé, coefficient). Ex : MATHS / Mathématiques / coefficient 4.",
    permission: 'admin.saas',
    parametres: P({
      code: { type: 'string', description: 'Code 1-10 caractères (ex: MATHS, HG, PC)' },
      libelle: { type: 'string' },
      coefficient: { type: 'number', description: 'Coefficient 0.5-10 (défaut 1)' },
    }, ['code', 'libelle']),
    executer: async (ctx, args) =>
      biz.creerMatiereCore(ctx as never, ctx.ecoleId!, {
        code: String(args.code), libelle: String(args.libelle),
        ...(args.coefficient !== undefined ? { coefficient: Number(args.coefficient) } : {}),
      } as never),
  },
  {
    nom: 'modifier_matiere_ia',
    description: "Modifie le libellé, le coefficient ou la couleur d'une matière.",
    permission: 'admin.saas',
    parametres: P({
      matiere: { type: 'string', description: 'Code ou libellé de la matière' },
      libelle: { type: 'string' }, coefficient: { type: 'number' }, couleur: { type: 'string', description: 'Couleur (optionnel)' },
    }, ['matiere']),
    executer: async (ctx, args) => {
      const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!rm.trouve) return { erreur: rm.erreur, candidats: rm.candidats };
      const d: Record<string, unknown> = {};
      if (args.libelle !== undefined) d.libelle = String(args.libelle);
      if (args.coefficient !== undefined) d.coefficient = Number(args.coefficient);
      if (args.couleur !== undefined) d.couleur = String(args.couleur);
      if (Object.keys(d).length === 0) return { erreur: 'Aucun champ fourni.' };
      return biz.modifierMatiereCore(ctx as never, rm.entite.id, d as never);
    },
  },
  {
    nom: 'supprimer_matiere_ia',
    description: "Supprime une matière (refusée si des notes/évaluations/programmes l'utilisent).",
    permission: 'admin.saas',
    parametres: P({ matiere: { type: 'string', description: 'Code ou libellé' } }, ['matiere']),
    executer: async (ctx, args) => {
      const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!rm.trouve) return { erreur: rm.erreur, candidats: rm.candidats };
      return biz.supprimerMatiereCore(ctx as never, rm.entite.id);
    },
  },

  // ═══ EMPLOI DU TEMPS ═══
  {
    nom: 'creer_creneau_edt',
    description: "Ajoute un créneau hebdomadaire à l'emploi du temps (classe, matière, enseignant, jour, heures, salle optionnelle).",
    permission: ['edt.gerer', 'admin.saas'],
    parametres: P({
      classe: { type: 'string', description: 'Classe' },
      matiere: { type: 'string', description: 'Matière' },
      enseignant: { type: 'string', description: 'Nom de l\'enseignant' },
      jour: { type: 'string', enum: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] },
      heureDebut: { type: 'string', description: 'HH:MM' },
      heureFin: { type: 'string', description: 'HH:MM' },
      salle: { type: 'string', description: 'Salle (optionnel)' },
      dateDebut: { type: 'string', description: 'Début de validité AAAA-MM-JJ (défaut : aujourd\'hui)' },
    }, ['classe', 'matiere', 'enseignant', 'jour', 'heureDebut', 'heureFin']),
    executer: async (ctx, args) => {
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: 'Classe : ' + rc.erreur, candidats: rc.candidats };
      const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!rm.trouve) return { erreur: 'Matière : ' + rm.erreur, candidats: rm.candidats };
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.enseignant));
      if (!rp.trouve) return { erreur: 'Enseignant : ' + rp.erreur, candidats: rp.candidats };
      let salleId: string | undefined;
      if (args.salle) {
        const salle = await db.salle.findFirst({ where: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.salle), mode: 'insensitive' } } });
        if (!salle) return { erreur: `Salle « ${args.salle} » introuvable.` };
        salleId = salle.id;
      }
      return biz.creerCreneauEdtCore(ctx as never, ctx.ecoleId!, {
        classeId: rc.entite.id, matiereId: rm.entite.id, enseignantId: rp.entite.id,
        ...(salleId ? { salleId } : {}),
        jour: String(args.jour), heureDebut: String(args.heureDebut), heureFin: String(args.heureFin),
        dateDebut: args.dateDebut ? new Date(String(args.dateDebut)) : new Date(),
      } as never);
    },
  },
  {
    nom: 'supprimer_creneau_edt',
    description: "Supprime un créneau de l'emploi du temps (identifié par son ID — obtenu via mon_emploi_du_temps ou la classe).",
    permission: ['edt.gerer', 'admin.saas'],
    parametres: P({ emploiTempsId: { type: 'string', description: 'ID du créneau EDT' } }, ['emploiTempsId']),
    executer: async (ctx, args) => biz.supprimerCreneauEdtCore(ctx as never, String(args.emploiTempsId)),
  },
  {
    nom: 'generer_seances_edt',
    description: "Matérialise les SÉANCES depuis un emploi du temps jusqu'à une date (l'appel se fait sur les séances, pas l'EDT).",
    permission: ['edt.gerer', 'admin.saas'],
    parametres: P({
      emploiTempsId: { type: 'string', description: 'ID de l\'EDT' },
      dateFin: { type: 'string', description: 'Date de fin AAAA-MM-JJ' },
    }, ['emploiTempsId', 'dateFin']),
    executer: async (ctx, args) => biz.genererSeancesDepuisEdtCore(ctx as never, String(args.emploiTempsId), new Date(String(args.dateFin))),
  },
  {
    nom: 'importer_edt',
    description: "Importe un emploi du temps en CSV. Colonnes attendues : classe;matiere;enseignant;jour;heureDebut;heureFin[;salle]. Conflits détectés.",
    permission: ['edt.gerer', 'admin.saas'],
    parametres: P({ contenu: { type: 'string', description: 'Contenu CSV complet' } }, ['contenu']),
    executer: async (ctx, args) => {
      const { importerEdtCsvCore } = await import('@/lib/business');
      return importerEdtCsvCore(ctx as never, ctx.ecoleId!, String(args.contenu));
    },
  },

  // ═══ PROGRAMMES & CHAPITRES ═══
  {
    nom: 'creer_programme_ia',
    description: "Crée un programme de matière pour un niveau (intitulé, description).",
    permission: 'notes.saisir',
    parametres: P({
      matiere: { type: 'string' }, niveau: { type: 'string', description: 'Niveau (ex: 6E, CM2)' },
      intitule: { type: 'string' }, description: { type: 'string' },
    }, ['matiere', 'niveau', 'intitule']),
    executer: async (ctx, args) => {
      const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!rm.trouve) return { erreur: 'Matière : ' + rm.erreur, candidats: rm.candidats };
      const niveau = await db.niveau.findFirst({
        where: { section: { cycle: { ecoleId: ctx.ecoleId! } }, OR: [{ code: String(args.niveau).toUpperCase() }, { libelle: { contains: String(args.niveau), mode: 'insensitive' } }] },
      });
      if (!niveau) return { erreur: `Niveau « ${args.niveau} » introuvable.` };
      return biz.creerProgrammeCore(ctx as never, ctx.ecoleId!, {
        matiereId: rm.entite.id, niveauId: niveau.id, intitule: String(args.intitule),
        ...(args.description ? { description: String(args.description) } : {}),
      } as never);
    },
  },
  {
    nom: 'ajouter_chapitre_ia',
    description: "Ajoute un chapitre à un programme (intitulé, ordre, objectifs, période optionnelle).",
    permission: 'notes.saisir',
    parametres: P({
      programme: { type: 'string', description: 'Intitulé du programme' },
      titre: { type: 'string' }, ordre: { type: 'number', description: 'Position (1, 2…)' },
      objectifs: { type: 'string', description: 'Objectifs du chapitre' },
    }, ['programme', 'titre', 'ordre']),
    executer: async (ctx, args) => {
      const prog = await db.programme.findFirst({
        where: { ecoleId: ctx.ecoleId!, titre: { contains: String(args.programme), mode: 'insensitive' } },
      });
      if (!prog) return { erreur: `Programme « ${args.programme} » introuvable.` };
      return biz.ajouterChapitreCore(ctx as never, prog.id, {
        intitule: String(args.titre), ordre: Number(args.ordre),
        ...(args.objectifs ? { description: String(args.objectifs) } : {}),
      } as never);
    },
  },
  {
    nom: 'supprimer_programme_ia',
    description: "Supprime un programme (refusé si des chapitres sont avancés).",
    permission: 'notes.saisir',
    parametres: P({ programme: { type: 'string', description: 'Intitulé du programme' } }, ['programme']),
    executer: async (ctx, args) => {
      const prog = await db.programme.findFirst({
        where: { ecoleId: ctx.ecoleId!, titre: { contains: String(args.programme), mode: 'insensitive' } },
      });
      if (!prog) return { erreur: `Programme « ${args.programme} » introuvable.` };
      return biz.supprimerProgrammeCore(ctx as never, prog.id);
    },
  },
  {
    nom: 'supprimer_chapitre_ia',
    description: "Supprime un chapitre d'un programme (par intitulé).",
    permission: 'notes.saisir',
    parametres: P({ chapitre: { type: 'string', description: 'Intitulé du chapitre' } }, ['chapitre']),
    executer: async (ctx, args) => {
      const chap = await db.chapitre.findFirst({
        where: { programme: { ecoleId: ctx.ecoleId! }, titre: { contains: String(args.chapitre), mode: 'insensitive' } },
      });
      if (!chap) return { erreur: `Chapitre « ${args.chapitre} » introuvable.` };
      return biz.supprimerChapitreCore(ctx as never, chap.id);
    },
  },

  // ═══ PÉRIODES / RÈGLES / MODES ═══
  {
    nom: 'configurer_periodes',
    description: "Bascule l'année active en système trimestres (T1-T3) ou semestres (S1-S2) — recrée les périodes standard.",
    permission: 'admin.saas',
    parametres: P({ systeme: { type: 'string', enum: ['trimestres', 'semestres'] } }, ['systeme']),
    executer: async (ctx, args) => biz.configurerSystemePeriodesCore(ctx as never, args.systeme as never),
  },
  {
    nom: 'maj_regle_calcul',
    description: "Ajuste la règle de calcul des moyennes d'un cycle (méthode, note plancher/plafond, arrondi, inclusion des absents).",
    permission: 'admin.saas',
    parametres: P({
      cycle: { type: 'string', description: 'Cycle (ex: Collège, Primaire)' },
      methode: { type: 'string', enum: ['moyenne_ponderee', 'somme_ponderee', 'moyenne_simple'] },
      arrondi: { type: 'number', description: 'Décimales d\'arrondi (ex: 2)' },
      notePlancher: { type: 'number' }, notePlafond: { type: 'number' },
      inclutAbsents: { type: 'boolean', description: 'Les absents comptent-ils 0 (défaut)' },
    }, ['cycle']),
    executer: async (ctx, args) => {
      const cycle = await db.cycle.findFirst({
        where: { ecoleId: ctx.ecoleId!, OR: [{ libelle: { contains: String(args.cycle), mode: 'insensitive' } }, { code: String(args.cycle).toUpperCase() }] },
      });
      if (!cycle) return { erreur: `Cycle « ${args.cycle} » introuvable.` };
      const d: Record<string, unknown> = {};
      if (args.methode !== undefined) d.methode = String(args.methode);
      if (args.arrondi !== undefined) d.arrondi = Number(args.arrondi);
      if (args.notePlancher !== undefined) d.notePlancher = Number(args.notePlancher);
      if (args.notePlafond !== undefined) d.notePlafond = Number(args.notePlafond);
      if (args.inclutAbsents !== undefined) d.inclutAbsents = args.inclutAbsents === true;
      return biz.majRegleCalculCore(ctx as never, cycle.id, d as never);
    },
  },

  // ═══ CLÔTURE D'ANNÉE & BULLETINS ═══
  {
    nom: 'lister_eleves_cloture',
    description: "Liste les élèves actifs avec leur classe en vue de la clôture d'année (promotion/redoublement).",
    permission: 'admin.saas',
    parametres: P({}),
    executer: async (ctx) => {
      const actions = await import('@/app/actions/extensions');
      return actions.elevesPourCloture();
    },
  },
  {
    nom: 'cloturer_annee_ia',
    description: "Clôture l'année active : promotions automatiques avec répartition équilibrée (redoublants listés par noms), diplômes en fin de cycle, classes et périodes recréées. Opération LOURDE et irréversible.",
    permission: 'admin.saas',
    parametres: P({
      redoubler: { type: 'string', description: 'Noms d\'élèves à faire redoubler, séparés par ; (vide = personne)' },
      repartitionAutomatique: { type: 'boolean', description: 'Répartir les promus entre classes (défaut : vrai)' },
    }),
    executer: async (ctx, args) => {
      const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ctx.ecoleId!, active: true } });
      if (!annee) return { erreur: 'Aucune année active.' };
      let redoublerIds: string[] = [];
      const brut = String(args.redoubler ?? '').split(';').map((s) => s.trim()).filter(Boolean);
      if (brut.length > 0) {
        const eleves = await db.eleve.findMany({ where: { ecoleId: ctx.ecoleId!, statut: 'actif', deletedAt: null } });
        const nonTrouves: string[] = [];
        for (const nom of brut) {
          const qN = normaliser(nom);
          const cible = eleves.find((e) => normaliser(`${e.prenom} ${e.nom}`) === qN || normaliser(`${e.nom} ${e.prenom}`) === qN)
            ?? eleves.find((e) => normaliser(`${e.prenom} ${e.nom}`).includes(qN));
          if (cible) redoublerIds.push(cible.id); else nonTrouves.push(nom);
        }
        if (nonTrouves.length > 0) return { erreur: `Élèves introuvables : ${nonTrouves.join(', ')}.` };
      }
      const r = await biz.cloturerAnneeScolaireCore(ctx as never, annee.id, {
        redoublerIds,
        repartitionAutomatique: args.repartitionAutomatique !== false,
      });
      return { ...r, message: `Année ${r.libelle} ouverte : ${r.promus} promu(s) (${r.reinscritesHonorees} réinscription(s) honorée(s)), ${r.redoublants} redoublant(s), ${r.diplomes} diplômé(s), ${r.sansClasse} sans affectation, ${r.classesCreees} classe(s) recréée(s).` };
    },
  },
  {
    nom: 'changer_statut_bulletin',
    description: "Fait avancer un bulletin dans le circuit de validation (brouillon → valide → publie, ou annulation).",
    permission: 'bulletins.valider',
    parametres: P({
      bulletinId: { type: 'string', description: 'ID du bulletin (via bulletins_classe)' },
      statut: { type: 'string', enum: ['valide', 'publie', 'annule'] },
    }, ['bulletinId', 'statut']),
    executer: async (ctx, args) => {
      const { changerStatutBulletinCore } = await import('@/lib/business');
      return (changerStatutBulletinCore as any)(ctx, String(args.bulletinId), String(args.statut));
    },
  },
  {
    nom: 'viser_cahier_texte',
    description: "Vise (ou commente) le cahier de textes d'une classe — contrôle de la direction/censeur.",
    permission: ['vie_scolaire.gerer', 'bulletins.valider', 'admin.saas'],
    parametres: P({
      classe: { type: 'string', description: 'Classe' },
      remarque: { type: 'string', description: 'Remarque de visa (optionnel)' },
    }, ['classe']),
    executer: async (ctx, args) => {
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const cahier = await db.cahierTexte.findFirst({ where: { classeId: rc.entite.id } });
      if (!cahier) return { erreur: `Aucun cahier de textes pour ${rc.entite.libelle}.` };
      return biz.viserCahierTexteCore(ctx as never, cahier.id, args.remarque ? String(args.remarque) : undefined);
    },
  },
  {
    nom: 'publier_entree_cahier',
    description: "Publie une entrée du cahier de textes (la rend visible aux familles).",
    permission: ['vie_scolaire.gerer', 'notes.saisir'],
    parametres: P({ entreeId: { type: 'string', description: 'ID de l\'entrée' } }, ['entreeId']),
    executer: async (ctx, args) => biz.publierEntreeCahierCore(ctx as never, String(args.entreeId)),
  },
];
