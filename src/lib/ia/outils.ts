// ====================================================================
// ASSISTANT IA — catalogue des OUTILS (function calling).
// SÉCURITÉ : chaque outil porte la permission requise ; le catalogue
// est FILTRÉ par les permissions réelles de la session, et chaque
// handler exécute les cores métier qui re-vérifient les permissions
// (assertPermission) + le tenant. L'IA hérite exactement du périmètre
// de l'utilisateur : le comptable ne voit/fera que la comptabilité,
// le prof que sa pédagogie, la direction tout.
// ====================================================================

import { db } from '@/lib/db';
import { Ctx } from '@/lib/business/commun';
import * as biz from '@/lib/business';

export type ParametreOutil = {
  type: 'object';
  properties: Record<string, { type: string; description?: string; enum?: string[] }>;
  required?: string[];
};

export type OutilIA = {
  nom: string;
  description: string;
  permission: string; // permission requise — filtre le catalogue par session
  parametres: ParametreOutil;
  executer: (ctx: Ctx, args: Record<string, unknown>) => Promise<unknown>;
};

const P = (properties: Record<string, { type: string; description: string; enum?: string[] }>, required?: string[]): ParametreOutil => ({ type: 'object', properties, required });

// --------------------------------------------------------------------
// LECTURE — information (permissions en lecture)
// --------------------------------------------------------------------

const outilsLecture: OutilIA[] = [
  {
    nom: 'statistiques_ecole',
    description: "Vue d'ensemble de l'école : effectifs total/garçons/filles par classe, nombre de classes et de personnels, année scolaire active.",
    permission: 'eleves.lire',
    parametres: P({}),
    executer: async (ctx) => {
      const ecoleId = ctx.ecoleId!;
      const [classes, eleves, personnels, annee] = await Promise.all([
        db.classe.findMany({ where: { ecoleId }, include: { _count: { select: { eleves: true } } } }),
        db.eleve.findMany({ where: { ecoleId, statut: 'actif', deletedAt: null }, select: { sexe: true } }),
        db.personnel.count({ where: { ecoleId, deletedAt: null } }),
        db.anneeScolaire.findFirst({ where: { ecoleId, active: true } }),
      ]);
      return {
        annee: annee?.libelle,
        totalClasses: classes.length,
        totalEleves: eleves.length,
        garcons: eleves.filter((e) => e.sexe === 'M').length,
        filles: eleves.filter((e) => e.sexe === 'F').length,
        personnels,
        parClasse: classes.map((c) => ({ classe: c.libelle, effectif: (c as any)._count?.eleves ?? 0 })),
      };
    },
  },
  {
    nom: 'rechercher_eleve',
    description: "Recherche un élève par nom, prénom ou matricule. Retourne identité, classe, statut, et identifiant pour les autres outils.",
    permission: 'eleves.lire',
    parametres: P({ q: { type: 'string', description: 'Nom, prénom ou matricule (extrait)' } }, ['q']),
    executer: async (ctx, args) => {
      const q = String(args.q ?? '').trim();
      const eleves = await db.eleve.findMany({
        where: {
          ecoleId: ctx.ecoleId!, deletedAt: null,
          OR: [{ nom: { contains: q, mode: 'insensitive' } }, { prenom: { contains: q, mode: 'insensitive' } }, { matricule: { contains: q } } as any],
        },
        include: { classeActuelle: true },
        take: 10,
      });
      return eleves.map((e) => ({ eleveId: e.id, nom: e.nom, prenom: e.prenom, matricule: e.matricule, classe: e.classeActuelle?.libelle ?? '—', statut: e.statut }));
    },
  },
  {
    nom: 'profil_eleve',
    description: "Profil COMPLET d'un élève : identité, classe, ses notes par évaluation, ses moyennes par matière, ses absences/retards, ses incidents. (Le volet financier n'est inclus que si la session a finances.voir.)",
    permission: 'eleves.lire',
    parametres: P({ eleveId: { type: 'string', description: 'Identifiant de l\'élève (via rechercher_eleve)' } }, ['eleveId']),
    executer: async (ctx, args) => {
      const eleveId = String(args.eleveId);
      const el = await db.eleve.findFirst({ where: { id: eleveId, ecoleId: ctx.ecoleId } as any, include: { classeActuelle: true } });
      if (!el) return { erreur: 'Élève introuvable dans votre école.' };
      const notes = await db.note.findMany({ where: { eleveId, valeur: { not: null } }, include: { evaluation: { include: { matiere: true, periode: true } } }, orderBy: { id: 'desc' }, take: 50 });
      const presences = await db.presence.findMany({ where: { eleveId } });
      const incidents = await db.incident.count({ where: { eleveId } });
      const parMatiere = new Map<string, { somme: number; coef: number; n: number }>();
      for (const n of notes) {
        const k = n.evaluation.matiere?.libelle ?? '?';
        const cur = parMatiere.get(k) ?? { somme: 0, coef: 0, n: 0 };
        cur.somme += (n.valeur! / n.evaluation.sur) * 20 * (n.evaluation.coefficient ?? 1);
        cur.coef += n.evaluation.coefficient ?? 1;
        cur.n++;
        parMatiere.set(k, cur);
      }
      const financier = (ctx.permissions as Set<string>).has('finances.voir') ? await db.echeanceFrais.findMany({ where: { eleveId }, include: { frais: true } }) : null;
      return {
        identite: `${el.prenom} ${el.nom} (${el.matricule})`, classe: el.classeActuelle?.libelle ?? '—', statut: el.statut,
        notes: notes.slice(0, 15).map((n) => `${n.evaluation.matiere?.libelle}: ${n.valeur}/${n.evaluation.sur} (${n.evaluation.intitule})`),
        moyennesParMatiere: [...parMatiere.entries()].map(([m, v]) => ({ matiere: m, moyenne: Number((v.somme / v.coef).toFixed(2)), nbNotes: v.n })),
        absences: presences.filter((p) => p.statut === 'absent').length,
        retards: presences.filter((p) => p.statut === 'retard').length,
        incidents,
        ...(financier ? {
          finances: financier.map((e) => ({ frais: e.frais?.libelle, statut: e.statut, paye: e.montantPaye, du: e.montant - e.remise })),
        } : {}),
      };
    },
  },
  {
    nom: 'impayes_ecole',
    description: 'Liste des échéances impayées/partielles par classe et par élève, avec restant dû total (relances possibles).',
    permission: 'finances.voir',
    parametres: P({ classe: { type: 'string', description: 'Filtre optionnel : libellé de classe' } }),
    executer: async (ctx, args) => {
      const where: any = { statut: { in: ['impayee', 'partiel'] }, eleve: { ecoleId: ctx.ecoleId, deletedAt: null } };
      if (args.classe) where.eleve.classeActuelle = { libelle: { contains: String(args.classe) } };
      const eches = await db.echeanceFrais.findMany({ where, include: { eleve: { include: { classeActuelle: true } }, frais: true }, orderBy: { dateEcheance: 'asc' }, take: 100 });
      return {
        totalRestant: eches.reduce((s, e) => s + (e.montant - e.remise - e.montantPaye), 0),
        nb: eches.length,
        lignes: eches.map((e) => ({
          eleve: `${e.eleve.prenom} ${e.eleve.nom}`, classe: e.eleve.classeActuelle?.libelle ?? '—',
          frais: e.frais?.libelle, statut: e.statut, restant: e.montant - e.remise - e.montantPaye, echeance: e.dateEcheance,
        })),
      };
    },
  },
  {
    nom: 'absences_du_jour',
    description: "Absences et retards du jour (ou d'une date), par classe — utile pour la vie scolaire et les relances.",
    permission: 'presences.saisir',
    parametres: P({ date: { type: 'string', description: 'Date ISO (AAAA-MM-JJ), défaut : aujourd\'hui' } }),
    executer: async (ctx, args) => {
      const d = args.date ? new Date(String(args.date)) : new Date();
      const debut = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const fin = new Date(debut.getTime() + 86400000);
      const presences = await db.presence.findMany({
        where: { statut: { in: ['absent', 'retard'] }, seance: { date: { gte: debut, lt: fin }, classe: { ecoleId: ctx.ecoleId! } } },
        include: { eleve: { include: { classeActuelle: true } }, seance: { include: { matiere: true, classe: true } } },
      });
      return presences.map((p) => ({
        eleve: `${p.eleve.prenom} ${p.eleve.nom}`, classe: p.eleve.classeActuelle?.libelle ?? p.seance.classe?.libelle,
        statut: p.statut, matiere: p.seance.matiere?.libelle ?? '—', heure: p.seance.heureDebut,
      }));
    },
  },
  {
    nom: 'bulletins_classe',
    description: 'Résultats d\'une classe pour une période : moyenne, rang et mention de chaque élève.',
    permission: 'bulletins.valider',
    parametres: P({ classe: { type: 'string', description: 'Libellé de la classe (extrait)' }, periode: { type: 'string', description: 'Libellé de période (extrait : T1, Semestre 1…)' } }, ['classe', 'periode']),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
      if (!classe) return { erreur: 'Classe introuvable.' };
      const periode = await db.periode.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.periode), mode: 'insensitive' } } });
      if (!periode) return { erreur: 'Période introuvable.' };
      const bulletins = await db.bulletin.findMany({ where: { classeId: classe.id, periodeId: periode.id }, include: { eleve: true }, orderBy: { rang: 'asc' } });
      // dernière version par élève
      const vus = new Set<string>();
      const res: unknown[] = [];
      for (const b of bulletins) {
        if (vus.has(b.eleveId)) continue;
        vus.add(b.eleveId);
        res.push({ eleve: `${b.eleve.prenom} ${b.eleve.nom}`, moyenne: b.moyenneGenerale, rang: b.rang });
      }
      return { classe: classe.libelle, periode: periode.libelle, eleves: res };
    },
  },
  {
    nom: 'avancement_programmes',
    description: "Avancement des chapitres par classe (%) — saisie-vous en retard sur le programme ?",
    permission: 'eleves.lire',
    parametres: P({}),
    executer: async (ctx) => {
      const av: any[] = await db.avancementProgramme.findMany({
        where: { chapitre: { programme: { ecoleId: ctx.ecoleId! } } },
        include: { chapitre: { include: { programme: { include: { matiere: true } } } }, classe: true } as any,
      });
      return av.map((a) => ({
        classe: a.classe?.libelle ?? '—', matiere: a.chapitre.programme.matiere?.libelle ?? '—',
        chapitre: a.chapitre.titre ?? a.chapitre.intitule, pourcentage: a.pourcentage,
      }));
    },
  },
  {
    nom: 'etat_caisse',
    description: 'État de la caisse : session ouverte, solde théorique, opérations du jour.',
    permission: 'finances.voir',
    parametres: P({}),
    executer: async (ctx) => {
      const s = await db.caisseSession.findFirst({ where: { ecoleId: ctx.ecoleId!, statut: 'ouverte' }, include: { operations: true } });
      if (!s) return { ouverte: false };
      return {
        ouverte: true, fond: s.fondCaisse, soldeTheorique: s.soldeTheorique,
        entrees: s.operations.filter((o) => o.type === 'entree').reduce((x, o) => x + o.montant, 0),
        sorties: s.operations.filter((o) => o.type === 'sortie').reduce((x, o) => x + o.montant, 0),
        dernieresOperations: s.operations.slice(-8).map((o) => ({ type: o.type, motif: o.motif, montant: o.montant })),
      };
    },
  },
  {
    nom: 'conges_en_attente',
    description: 'Demandes de congé en attente avec soldes des personnels concernés.',
    permission: 'rh.gerer',
    parametres: P({}),
    executer: async (ctx) => {
      const conges = await db.conge.findMany({
        where: { personnel: { ecoleId: ctx.ecoleId! }, statut: 'demande' },
        include: { personnel: true },
        orderBy: { dateDebut: 'asc' },
      });
      return conges.map((c) => ({ personnel: `${c.personnel.prenom} ${c.personnel.nom}`, du: c.dateDebut, au: c.dateFin, motif: c.motif }));
    },
  },
];

// --------------------------------------------------------------------
// ACTIONS — exécution (les cores re-vérifient permissions + tenant)
// --------------------------------------------------------------------

const outilsAction: OutilIA[] = [
  {
    nom: 'inscrire_eleve',
    description: "Inscrit un nouvel élève dans une classe (matricule automatique, checklist dossier créée).",
    permission: 'eleves.ecrire',
    parametres: P({
      nom: { type: 'string', description: 'Nom de famille' }, prenom: { type: 'string', description: 'Prénom' },
      dateNaissance: { type: 'string', description: 'Date ISO AAAA-MM-JJ' }, lieuNaissance: { type: 'string', description: 'Lieu de naissance' },
      sexe: { type: 'string', description: '', enum: ['M', 'F'] }, classe: { type: 'string', description: 'Libellé de la classe' },
    }, ['nom', 'prenom', 'dateNaissance', 'sexe', 'classe']),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
      if (!classe) return { erreur: `Classe « ${args.classe} » introuvable.` };
      const r = await biz.inscrireEleveCore(ctx as never, ctx.ecoleId!, {
        nom: String(args.nom), prenom: String(args.prenom), dateNaissance: new Date(String(args.dateNaissance)),
        lieuNaissance: String(args.lieuNaissance ?? ''), sexe: String(args.sexe) as 'M' | 'F', classeId: classe.id,
      } as never);
      return { ...r, classe: classe.libelle };
    },
  },
  {
    nom: 'saisir_notes',
    description: "Enregistre les notes d'une évaluation (copies corrigées). Fournir l'intitulé exact de l'évaluation et la liste élève→note.",
    permission: 'notes.saisir',
    parametres: P({
      evaluation: { type: 'string', description: 'Intitulé de l\'évaluation (extrait)' },
      notes: { type: 'string', description: 'Liste « Nom Prénom: note » séparée par des points-virgules (ex: « Awa Diop: 15; Malick Sow: 11.5 »)' },
    }, ['evaluation', 'notes']),
    executer: async (ctx, args) => {
      const evaluation = await db.evaluation.findFirst({ where: { ecoleId: ctx.ecoleId!, intitule: { contains: String(args.evaluation), mode: 'insensitive' } } });
      if (!evaluation) return { erreur: `Évaluation « ${args.evaluation} » introuvable.` };
      const paires = String(args.notes).split(/;|\n/).map((x) => x.trim()).filter(Boolean);
      const notes: Array<{ eleveId: string; valeur: number }> = [];
      const introuvables: string[] = [];
      for (const paire of paires) {
        const m = paire.match(/^(.+?):\s*([\d.,]+)$/);
        if (!m) continue;
        const nom = m[1].trim();
        const valeur = parseFloat(m[2].replace(',', '.'));
        const el = await db.eleve.findFirst({
          where: { ecoleId: ctx.ecoleId!, deletedAt: null, OR: [{ nom: { contains: nom.split(' ')[0], mode: 'insensitive' } }, { prenom: { contains: nom.split(' ')[0], mode: 'insensitive' } }] },
          include: { classeActuelle: true },
        });
        if (!el || (evaluation.classeId && el.classeActuelleId !== evaluation.classeId)) { introuvables.push(nom); continue; }
        notes.push({ eleveId: el.id, valeur });
      }
      if (notes.length === 0) return { erreur: 'Aucun élève reconnu.', introuvables };
      await biz.saisirNotesCore(ctx as never, { evaluationId: evaluation.id, notes } as never);
      return { enregistrées: notes.length, introuvables, evaluation: evaluation.intitule };
    },
  },
  {
    nom: 'creer_evaluation',
    description: "Crée une évaluation (devoir, interrogation, composition) pour une classe, une matière et une période.",
    permission: 'notes.saisir',
    parametres: P({
      intitule: { type: 'string', description: 'Intitulé' }, classe: { type: 'string', description: 'Libellé classe' },
      matiere: { type: 'string', description: 'Libellé matière' }, type: { type: 'string', description: '', enum: ['devoir', 'composition', 'interrogation'] },
      date: { type: 'string', description: 'Date ISO' }, sur: { type: 'number', description: 'Barème (ex: 20 ou 40)' }, coefficient: { type: 'number', description: 'Coefficient' },
    }, ['intitule', 'classe', 'matiere', 'type', 'date', 'sur', 'coefficient']),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
      const matiere = await db.matiere.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.matiere), mode: 'insensitive' } } });
      if (!classe || !matiere) return { erreur: 'Classe ou matière introuvable.' };
      const periode = await db.periode.findFirst({ where: { ecoleId: ctx.ecoleId!, anneeScolaireId: classe.anneeScolaireId } , orderBy: { dateDebut: 'desc' } });
      const pers = await db.personnel.findFirst({ where: { utilisateurId: ctx.utilisateurId, deletedAt: null } })
        ?? await db.personnel.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null } });
      const r = await biz.creerEvaluationCore(ctx as never, ctx.ecoleId!, {
        classeId: classe.id, matiereId: matiere.id, enseignantId: pers!.id, periodeId: periode!.id,
        type: String(args.type), intitule: String(args.intitule), date: new Date(String(args.date)),
        sur: Number(args.sur), coefficient: Number(args.coefficient),
      } as never);
      return { ...r, classe: classe.libelle, matiere: matiere.libelle };
    },
  },
  {
    nom: 'generer_bulletins_classe',
    description: "Génère les bulletins de TOUS les élèves d'une classe pour une période (moyennes, rangs, mentions).",
    permission: 'notes.saisir',
    parametres: P({ classe: { type: 'string', description: 'Libellé classe' }, periode: { type: 'string', description: 'Libellé période (extrait)' } }, ['classe', 'periode']),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
      const periode = await db.periode.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.periode), mode: 'insensitive' } } });
      if (!classe || !periode) return { erreur: 'Classe ou période introuvable.' };
      return biz.genererBulletinsClasseCore(ctx as never, classe.id, periode.id);
    },
  },
  {
    nom: 'declarer_incident',
    description: "Déclare un incident disciplinaire pour un élève (comportement, absentéisme…).",
    permission: 'vie_scolaire.gerer',
    parametres: P({
      eleve: { type: 'string', description: 'Nom de l\'élève (extrait)' }, type: { type: 'string', description: 'Type (comportement, violence, absentéisme…)' },
      description: { type: 'string', description: 'Description des faits' }, gravite: { type: 'string', description: '', enum: ['leger', 'serieux', 'grave'] },
    }, ['eleve', 'description', 'gravite']),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, OR: [{ nom: { contains: String(args.eleve), mode: 'insensitive' } }, { prenom: { contains: String(args.eleve), mode: 'insensitive' } }] } });
      if (!el) return { erreur: `Élève « ${args.eleve} » introuvable.` };
      return biz.declarerIncidentCore(ctx as never, {
        eleveId: el.id, dateHeure: new Date(), type: String(args.type ?? 'comportement'),
        description: String(args.description), gravite: String(args.gravite),
      } as never);
    },
  },
  {
    nom: 'encaisser_paiement',
    description: "Encaisse un paiement pour un élève (espèces, mobile money, virement…). Alloue automatiquement aux échéances.",
    permission: 'finances.ecrire',
    parametres: P({
      eleve: { type: 'string', description: 'Nom de l\'élève' }, montant: { type: 'number', description: 'Montant en FRANCS CFA (sera converti en centimes)' },
      mode: { type: 'string', description: '', enum: ['espece', 'cheque', 'virement', 'carte', 'mobile_money'] }, reference: { type: 'string', description: 'Référence (optionnel)' },
    }, ['eleve', 'montant', 'mode']),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, OR: [{ nom: { contains: String(args.eleve), mode: 'insensitive' } }, { prenom: { contains: String(args.eleve), mode: 'insensitive' } }] } });
      if (!el) return { erreur: `Élève « ${args.eleve} » introuvable.` };
      const montantCentimes = Math.round(Number(args.montant) * 100);
      return biz.encaisserPaiementCore(ctx as never, { eleveId: el.id, montant: montantCentimes, modePaiement: String(args.mode), ...(args.reference ? { reference: String(args.reference) } : {}) } as never);
    },
  },
  {
    nom: 'creer_frais',
    description: "Définit un frais (scolarité, inscription, cantine…) pour un niveau.",
    permission: 'finances.ecrire',
    parametres: P({
      libelle: { type: 'string', description: 'Libellé du frais' }, montant: { type: 'number', description: 'Montant en FRANCS CFA' },
      type: { type: 'string', description: '', enum: ['scolarite', 'inscription', 'cantine', 'transport', 'activite'] },
      periodicite: { type: 'string', description: '', enum: ['unique', 'mensuel', 'trimestriel', 'annuel'] }, niveau: { type: 'string', description: 'Code ou libellé du niveau (ex: 6E, CP)' },
    }, ['libelle', 'montant', 'type', 'periodicite', 'niveau']),
    executer: async (ctx, args) => {
      const niveau = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: ctx.ecoleId! } }, OR: [{ code: { contains: String(args.niveau) } }, { libelle: { contains: String(args.niveau), mode: 'insensitive' } }] } });
      if (!niveau) return { erreur: `Niveau « ${args.niveau} » introuvable.` };
      return biz.creerFraisCore(ctx as never, ctx.ecoleId!, {
        libelle: String(args.libelle), montant: Math.round(Number(args.montant) * 100), type: String(args.type),
        periodicite: String(args.periodicite), niveauId: niveau.id, devise: 'XOF',
      } as never);
    },
  },
  {
    nom: 'enregistrer_depense',
    description: "Enregistre une dépense (avec écriture comptable automatique à la validation).",
    permission: 'finances.ecrire',
    parametres: P({
      categorie: { type: 'string', description: 'Catégorie (Fournitures scolaires, Énergie, Transport…)' },
      description: { type: 'string', description: 'Description' }, montant: { type: 'number', description: 'Montant en FRANCS CFA' },
    }, ['categorie', 'description', 'montant']),
    executer: async (ctx, args) => {
      return biz.enregistrerDepenseCore(ctx as never, ctx.ecoleId!, {
        categorie: String(args.categorie), description: String(args.description),
        montant: Math.round(Number(args.montant) * 100), dateDepense: new Date(),
      } as never);
    },
  },
  {
    nom: 'caisse_operations',
    description: 'Ouvre la caisse, enregistre une entrée/sortie, ou la ferme avec le solde compté.',
    permission: 'finances.ecrire',
    parametres: P({
      action: { type: 'string', enum: ['ouvrir', 'entree', 'sortie', 'fermer'], description: 'Opération caisse' },
      montant: { type: 'number', description: 'FRANCS CFA : fond à l\'ouverture, montant entrée/sortie, solde compté à la fermeture' },
      motif: { type: 'string', description: 'Motif (entrées/sorties)' },
    }, ['action', 'montant']),
    executer: async (ctx, args) => {
      const action = String(args.action);
      if (action === 'ouvrir') return biz.ouvrirCaisseCore(ctx as never, { fondCaisse: Number(args.montant) } as never);
      const session = await db.caisseSession.findFirst({ where: { ecoleId: ctx.ecoleId!, statut: 'ouverte' } });
      if (!session) return { erreur: 'Aucune session de caisse ouverte.' };
      if (action === 'entree' || action === 'sortie') {
        return biz.operationCaisseCore(ctx as never, { sessionCaisseId: session.id, type: action, montant: Number(args.montant), motif: String(args.motif ?? 'via assistant') } as never);
      }
      return biz.fermerCaisseCore(ctx as never, session.id, Number(args.montant));
    },
  },
  {
    nom: 'ecrire_cahier_textes',
    description: "Ajoute une entrée au cahier de textes d'une classe (contenu du cours + travail à faire), publiée aux familles.",
    permission: 'notes.saisir',
    parametres: P({
      classe: { type: 'string', description: 'Libellé classe' }, matiere: { type: 'string', description: 'Libellé matière' },
      contenu: { type: 'string', description: 'Contenu du cours' }, travailAFaire: { type: 'string', description: 'Travail à faire (devoirs)' },
    }, ['classe', 'contenu']),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
      if (!classe) return { erreur: 'Classe introuvable.' };
      const matiere = args.matiere ? await db.matiere.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.matiere), mode: 'insensitive' } } }) : null;
      return biz.creerEntreeCahierCore(ctx as never, {
        classeId: classe.id, matiereId: matiere?.id, dateCours: new Date(),
        contenu: String(args.contenu), travailAFaire: args.travailAFaire ? String(args.travailAFaire) : undefined, publier: true,
      } as never);
    },
  },
  {
    nom: 'assigner_devoir',
    description: "Assigne un devoir à faire à la maison à une classe (avec date de rendu).",
    permission: 'notes.saisir',
    parametres: P({
      classe: { type: 'string', description: 'Libellé classe' }, intitule: { type: 'string', description: 'Intitulé du devoir' },
      dateRendu: { type: 'string', description: 'Date de rendu ISO' }, sur: { type: 'number', description: 'Barème (défaut 20)' },
    }, ['classe', 'intitule', 'dateRendu']),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
      if (!classe) return { erreur: 'Classe introuvable.' };
      return biz.creerDevoirCore(ctx as never, { classeId: classe.id, intitule: String(args.intitule), dateRendu: new Date(String(args.dateRendu)), sur: Number(args.sur ?? 20) } as never);
    },
  },
  {
    nom: 'transferer_eleve',
    description: "Transfère un élève vers une autre classe (avec historique conservé).",
    permission: 'eleves.ecrire',
    parametres: P({ eleve: { type: 'string', description: 'Nom de l\'élève' }, classeDestination: { type: 'string', description: 'Libellé classe' }, motif: { type: 'string', description: 'Motif' } }, ['eleve', 'classeDestination']),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, OR: [{ nom: { contains: String(args.eleve), mode: 'insensitive' } }, { prenom: { contains: String(args.eleve), mode: 'insensitive' } }] } });
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classeDestination), mode: 'insensitive' } } });
      if (!el || !classe) return { erreur: 'Élève ou classe introuvable.' };
      return biz.transfererClasseCore(ctx as never, el.id, classe.id, args.motif ? String(args.motif) : undefined) as never;
    },
  },
  {
    nom: 'notifier_parents',
    description: "Envoie une notification aux parents d'une classe (convocation, information, relance).",
    permission: 'communication.envoyer',
    parametres: P({ classe: { type: 'string', description: 'Libellé classe' }, titre: { type: 'string', description: 'Titre court' }, message: { type: 'string', description: 'Message complet' } }, ['classe', 'titre', 'message']),
    executer: async (ctx, args) => {
      const classe: any = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
      if (!classe) return { erreur: 'Classe introuvable.' };
      const liens = await db.eleveParent.findMany({ where: { eleve: { classeActuelleId: classe.id } }, include: { parent: true } });
      const destinataires = new Set<string>();
      for (const l of liens) if (l.parent.utilisateurId) destinataires.add(l.parent.utilisateurId);
      if (destinataires.size === 0) return { erreur: 'Aucun parent avec compte pour cette classe.' };
      await db.notification.createMany({
        data: [...destinataires].map((id) => ({ destinataireId: id, titre: String(args.titre), contenu: String(args.message), canal: 'in_app' as never, ecoleId: ctx.ecoleId! } as never)),
      });
      return { envoyees: destinataires.size, classe: classe.libelle };
    },
  },
  {
    nom: 'enregistrer_visiteur',
    description: "Enregistre un visiteur à l'accueil (badge automatique, pièce vérifiée).",
    permission: 'eleves.ecrire',
    parametres: P({ nom: { type: 'string', description: 'Nom du visiteur' }, motifVisite: { type: 'string', description: 'Motif de la visite' }, pieceVerifiee: { type: 'boolean', description: 'Pièce d\'identité vérifiée ?' } }, ['nom', 'motifVisite', 'pieceVerifiee']),
    executer: async (ctx, args) => {
      return biz.enregistrerVisiteurCore(ctx as never, ctx.ecoleId!, {
        nom: String(args.nom), motifVisite: String(args.motifVisite), pieceVerifiee: Boolean(args.pieceVerifiee),
      } as never);
    },
  },
  {
    nom: 'enregistrer_courrier',
    description: "Chronotope un courrier entrant ou sortant au registre (référence automatique C-ENT/C-SOR).",
    permission: 'eleves.ecrire',
    parametres: P({
      direction: { type: 'string', description: '', enum: ['entrant', 'sortant'] }, objet: { type: 'string', description: 'Objet' },
      correspondant: { type: 'string', description: 'Expéditeur (entrant) ou destinataire (sortant)' },
    }, ['direction', 'objet', 'correspondant']),
    executer: async (ctx, args) => {
      return biz.enregistrerCourrierCore(ctx as never, ctx.ecoleId!, {
        direction: String(args.direction) as 'entrant' | 'sortant', objet: String(args.objet), correspondant: String(args.correspondant),
      } as never);
    },
  },
  {
    nom: 'passer_ecriture_comptable',
    description: "Passe une écriture comptable EN PARTIE DOUBLE (journal, libellé, lignes débit/crédit par numéro de compte SYSCOHADA).",
    permission: 'finances.valider',
    parametres: P({
      journal: { type: 'string', enum: ['VE', 'AC', 'CA', 'BQ', 'OD'], description: 'Journal' },
      libelle: { type: 'string', description: 'Libellé de l\'écriture' },
      lignes: { type: 'string', description: 'Lignes « numeroCompte:debit:credit » séparées par ; (ex: « 571:5000000:0; 701:0:5000000 ») — en CENTIMES' },
    }, ['journal', 'libelle', 'lignes']),
    executer: async (ctx, args) => {
      const lignes = String(args.lignes).split(/;|\n/).map((x) => x.trim()).filter(Boolean).map((x) => {
        const [compte, debit, credit] = x.split(':').map((y) => y.trim());
        return { compte: String(compte), debit: Number(debit ?? 0), credit: Number(credit ?? 0) };
      });
      return biz.passerEcritureCore(ctx as never, { journalCode: String(args.journal), libelle: String(args.libelle), lignes } as never);
    },
  },
];

export const CATALOGUE_IA: OutilIA[] = [...outilsLecture, ...outilsAction];

/** Catalogue FILTRÉ par les permissions de la session (l'IA ne voit même pas les outils interdits). */
export function outilsPourSession(permissions: Set<string>): OutilIA[] {
  return CATALOGUE_IA.filter((t) => permissions.has(t.permission));
}

/** Format OpenAI tools. */
export function versOutilsOpenAI(outils: OutilIA[]) {
  return outils.map((t) => ({
    type: 'function' as const,
    function: { name: t.nom, description: t.description, parameters: t.parametres as object },
  }));
}
