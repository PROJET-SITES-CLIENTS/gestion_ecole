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
  permission: string | string[]; // permission requise — filtre le catalogue par session
  parametres: ParametreOutil;
  executer: (ctx: Ctx, args: Record<string, unknown>) => Promise<unknown>;
};

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]): ParametreOutil => ({ type: 'object', properties, required });

// --------------------------------------------------------------------
// LECTURE — information (permissions en lecture)
// --------------------------------------------------------------------

const outilsLecture: OutilIA[] = [   
    {
      nom: 'liste_tous_personnels',
      description: "Retourne la liste globale de tout le personnel (enseignants, surveillants, direction, etc.). Tr�s utile quand on demande 'liste moi tous les enseignants'.",
      permission: ['rh.gerer', 'eleves.lire'],
      parametres: { type: 'object', properties: { role: { type: 'string', description: 'Optionnel: filtre par r�le (ex: enseignant)' } } },
      executer: async (ctx, args) => {
        let where = { ecoleId: ctx.ecoleId, deletedAt: null };
        if (args.role) {
          where.roles = { some: { role: { code: String(args.role) } } };
        }
        const personnels = await db.personnel.findMany({
          where,
          include: { roles: { include: { role: true } } },
          orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
          take: 100
        });
        return {
          totalFiltre: personnels.length,
          personnels: personnels.map(p => ({
            id: p.id, matricule: p.matricule, nom: p.nom, prenom: p.prenom,
            roles: p.roles.map(r => r.role.libelle).join(', '), statut: p.statut
          }))
        };
      }
    },
    {
    nom: 'liste_tous_eleves',
    description: "Retourne la liste globale de tous les �l�ves inscrits dans l'�cole (nom, pr�nom, classe, statut, matricule). Tr�s utile quand on demande 'liste moi tous les �l�ves'.",
    permission: ['eleves.lire', 'finances.voir', 'vie_scolaire.voir'],
    parametres: { type: 'object', properties: { limit: { type: 'number', description: 'Limite de r�sultats, d�faut 100' } } },
    executer: async (ctx, args) => {
      const limit = args.limit ? Number(args.limit) : 100;
      const eleves = await db.eleve.findMany({
        where: { ecoleId: ctx.ecoleId!, deletedAt: null },
        include: { classeActuelle: true },
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        take: limit
      });
      return {
        totalFiltre: eleves.length,
        limite: limit,
        eleves: eleves.map(e => ({
          id: e.id, matricule: e.matricule, nom: e.nom, prenom: e.prenom, classe: e.classeActuelle?.libelle ?? 'Non affect�', statut: e.statut
        }))
      };
    }
  },   {
    nom: 'etat_caisse',
    description: "Affiche l'�tat actuel de la tr�sorerie et le d�tail des caisses (entr�es, sorties, soldes).",
    permission: 'finances.voir',
    parametres: { type: 'object', properties: {} },
    executer: async (ctx) => {
      return biz.etatCaisseCore(ctx as never);
    }
  },
  {
    nom: 'balance_comptable',
    description: "G�n�re la balance comptable (Totaux D�bit/Cr�dit et Soldes par compte) pour v�rifier l'�quilibre.",
    permission: 'finances.voir',
    parametres: { type: 'object', properties: { sectionId: { type: 'string', description: 'toutes (par d�faut) ou ID section' } } },
    executer: async (ctx, args) => {
      return biz.balanceComptableCore(ctx as never, args.sectionId ? String(args.sectionId) : 'toutes');
    }
  },
  {
    nom: 'compte_resultat',
    description: "G�n�re le compte de r�sultat d�taill� (Charges classe 6, Produits classe 7) et donne le b�n�fice/perte.",
    permission: 'finances.voir',
    parametres: { type: 'object', properties: { sectionId: { type: 'string', description: 'toutes (par d�faut) ou ID section' } } },
    executer: async (ctx, args) => {
      return biz.compteResultatCore(ctx as never, args.sectionId ? String(args.sectionId) : 'toutes');
    }
  },
  {
    nom: 'bilan_simplifie',
    description: "G�n�re le Bilan Comptable simplifi� (Actif, Passif, Tr�sorerie, R�sultat de l'exercice).",
    permission: 'finances.voir',
    parametres: { type: 'object', properties: { sectionId: { type: 'string', description: 'toutes (par d�faut) ou ID section' } } },
    executer: async (ctx, args) => {
      return biz.bilanSimplifieCore(ctx as never, args.sectionId ? String(args.sectionId) : 'toutes');
    }
  },
  {
    nom: 'grand_livre',
    description: "Recherche toutes les �critures pass�es sur un num�ro de compte SYSCOHADA pr�cis.",
    permission: 'finances.voir',
    parametres: { type: 'object', properties: { numeroCompte: { type: 'string', description: 'Num�ro de compte (ex: 4111, 706)' } }, required: ['numeroCompte'] },
    executer: async (ctx, args) => {
      return biz.grandLivreCore(ctx as never, String(args.numeroCompte));
    }
  },
  {
    nom: 'liste_paiements_recus',
    description: "Liste chronologique des paiements physiques encaiss�s (esp�ces, ch�ques, etc). Pour voir les encaissements.",
    permission: 'finances.voir',
    parametres: { type: 'object', properties: { limit: { type: 'number', description: 'Nombre max (d�faut 20)' } } },
    executer: async (ctx, args) => {
      const paiements = await db.paiement.findMany({
        where: { ecoleId: ctx.ecoleId!, annule: false },
        orderBy: { datePaiement: 'desc' },
        take: args.limit ? Number(args.limit) : 20,
        include: { eleve: { include: { classeActuelle: true } } }
      });
      return {
        totalFiltre: paiements.length,
        paiements: paiements.map(p => ({
          id: p.id, date: p.datePaiement, mode: p.modePaiement, montant_F: (p.montant/100)+' F', reference: p.referenceTransaction, eleve: p.eleve ? p.eleve.prenom+' '+p.eleve.nom : 'Non rattach�'
        }))
      };
    }
  },
  {
    nom: 'statistiques_ecole',
    description: "Vue d'ensemble de l'école : effectifs total/garçons/filles par classe, nombre de classes et de personnels, année scolaire active.",
    permission: ['eleves.lire', 'finances.voir'],
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
    permission: ['eleves.lire', 'finances.voir', 'finances.ecrire', 'vie_scolaire.voir', 'notes.voir', 'notes.saisir'],
    parametres: P({ q: { type: 'string', description: 'Nom, prénom ou matricule (extrait)' } }, ['q']),
    executer: async (ctx, args) => {
      const q = String(args.q ?? '').trim();
      const eleves = await db.eleve.findMany({
        where: {
          ecoleId: ctx.ecoleId!, deletedAt: null,
          AND: String(q).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })),
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
    permission: ['eleves.lire', 'finances.voir', 'vie_scolaire.voir'],
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
          finances: financier.map((e) => ({ echeanceId: e.id, frais: e.frais?.libelle, statut: e.statut, montantInitial: e.montant, remise: e.remise, paye: e.montantPaye, du: e.montant - e.remise })),
        } : {}),
      };
    },
  },
  {
    nom: 'suivi_paiements_scolarite',
    description: "Liste des échéances de frais (scolarité, cantine...) selon leur statut (impayé, payé, etc.) par classe et par élève.",
    permission: 'finances.voir',
    parametres: P({
      classe: { type: 'string', description: 'Filtre optionnel : libellé de classe' },
      statut: { type: 'string', description: 'Filtre optionnel de statut (ex: payee, impayee, partiel). Par défaut: impayee, partiel' }
    }),
    executer: async (ctx, args) => {
      const statutsRecherches = args.statut
        ? [String(args.statut).toLowerCase()]
        : ['impayee', 'partiel'];
      const where: any = { statut: { in: statutsRecherches }, eleve: { ecoleId: ctx.ecoleId, deletedAt: null } };
      if (args.classe) where.eleve.classeActuelle = { libelle: { contains: String(args.classe) } };
      const eches = await db.echeanceFrais.findMany({ where, include: { eleve: { include: { classeActuelle: true } }, frais: true }, orderBy: { dateEcheance: 'asc' }, take: 100 });
      return {
        totalMontants: eches.reduce((s, e) => s + (e.montant - e.remise - e.montantPaye), 0),
        totalPaye: eches.reduce((s, e) => s + e.montantPaye, 0),
        nb: eches.length,
        lignes: eches.map((e) => ({
          eleve: `${e.eleve.prenom} ${e.eleve.nom}`, classe: e.eleve.classeActuelle?.libelle ?? '—',
          frais: e.frais?.libelle, statut: e.statut, montant_initial: e.montant, restant_du: e.montant - e.remise - e.montantPaye, paye: e.montantPaye, echeance: e.dateEcheance,
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
  
  // ────────────────────────────────────────────────────────────────────
  // OUTILS LECTURE ENSEIGNANT (ou toute personne ayant eleves.lire)
  // ────────────────────────────────────────────────────────────────────
  {
    nom: 'liste_eleves_classe',
    description: "Affiche la liste complète des élèves d'une classe.",
    permission: ['eleves.lire', 'finances.voir', 'vie_scolaire.voir'],
    parametres: P({ classe: { type: 'string', description: 'Libellé de la classe' } }, ['classe']),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } }, include: { eleves: { where: { statut: 'actif', deletedAt: null }, orderBy: [{ nom: 'asc' }, { prenom: 'asc' }] } } });
      if (!classe) return { erreur: 'Classe introuvable.' };
      return { classe: classe.libelle, effectif: classe.eleves.length, eleves: classe.eleves.map(e => ({ eleveId: e.id, nom: e.nom, prenom: e.prenom, matricule: e.matricule, sexe: e.sexe })) };
    }
  },
  {
    nom: 'evaluations_classe',
    description: "Liste les évaluations et devoirs récents ou prévus pour une classe.",
    permission: 'eleves.lire',
    parametres: P({ classe: { type: 'string', description: 'Libellé de la classe' }, matiere: { type: 'string', description: 'Matière (optionnel)' } }, ['classe']),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
      if (!classe) return { erreur: 'Classe introuvable.' };
      const whereEval: any = { ecoleId: ctx.ecoleId!, classeId: classe.id };
      const whereDev: any = { classeId: classe.id };
      if (args.matiere) {
         const mat = await db.matiere.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.matiere), mode: 'insensitive' } } });
         if (mat) { whereEval.matiereId = mat.id; whereDev.matiereId = mat.id; }
      }
      const [evals, devoirs] = await Promise.all([
         db.evaluation.findMany({ where: whereEval, include: { matiere: true }, orderBy: { date: 'desc' }, take: 10 }),
         db.devoir.findMany({ where: whereDev, include: { matiere: true }, orderBy: { dateRendu: 'desc' }, take: 10 })
      ]);
      return { 
        evaluations: evals.map(e => ({ intitule: e.intitule, type: e.type, date: e.date.toISOString().split('T')[0], matiere: e.matiere.libelle, sur: e.sur, coefficient: e.coefficient })),
        devoirs: devoirs.map(d => ({ intitule: d.intitule, dateRendu: d.dateRendu.toISOString().split('T')[0], matiere: d.matiere?.libelle ?? '-', sur: d.sur }))
      };
    }
  },
  {
    nom: 'notes_evaluation',
    description: "Affiche toutes les notes saisies pour une évaluation spécifique.",
    permission: 'eleves.lire',
    parametres: P({ evaluation: { type: 'string', description: 'Intitulé exact ou partiel de l\'évaluation' } }, ['evaluation']),
    executer: async (ctx, args) => {
      const evalMatch = await db.evaluation.findFirst({ where: { ecoleId: ctx.ecoleId!, intitule: { contains: String(args.evaluation), mode: 'insensitive' } }, include: { classe: true, matiere: true } });
      if (!evalMatch) return { erreur: `Évaluation contenant '${args.evaluation}' introuvable.` };
      const notes = await db.note.findMany({ where: { evaluationId: evalMatch.id, valeur: { not: null } }, include: { eleve: true }, orderBy: { valeur: 'desc' } });
      return { evaluation: evalMatch.intitule, classe: evalMatch.classe.libelle, matiere: evalMatch.matiere.libelle, date: evalMatch.date.toISOString().split('T')[0], notes: notes.map(n => ({ eleve: `${n.eleve.prenom} ${n.eleve.nom}`, note: `${n.valeur}/${evalMatch.sur}` })) };
    }
  },
  {
    nom: 'cahier_textes_classe',
    description: "Lit les dernières entrées du cahier de textes d'une classe (contenu des cours et travail à faire).",
    permission: 'eleves.lire',
    parametres: P({ classe: { type: 'string', description: 'Libellé de la classe' }, matiere: { type: 'string', description: 'Matière (optionnel)' } }, ['classe']),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
      if (!classe) return { erreur: 'Classe introuvable.' };
      const whereCT: any = { cahierTexte: { classeId: classe.id } };
      if (args.matiere) {
         const mat = await db.matiere.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.matiere), mode: 'insensitive' } } });
         if (mat) { whereCT.cahierTexte.matiereId = mat.id; }
      }
      const entrees = await db.entreeCahierTexte.findMany({ 
         where: whereCT, 
         include: { cahierTexte: { include: { matiere: true, enseignant: true } } }, 
         orderBy: { dateCours: 'desc' }, 
         take: 10 
      });
      return {
         classe: classe.libelle,
         entrees: entrees.map(e => ({ date: e.dateCours.toISOString().split('T')[0], matiere: e.cahierTexte?.matiere?.libelle ?? '-', enseignant: e.cahierTexte?.enseignant?.nom ?? '-', contenu: e.contenu, travailAFaire: e.travailAFaire ?? 'Aucun' }))
      };
    }
  },
    {
      nom: 'mes_surveillances',
      description: "Affiche les prochaines surveillances (examens, récréation) assignées à l'utilisateur.",
      permission: 'eleves.lire',
      parametres: P({}),
      executer: async (ctx) => {
        return biz.mesSurveillancesCore(ctx as never);
      }
    },
    {
      nom: 'lister_rendus_devoir',
      description: "Affiche les devoirs rendus (submissions) par les élèves pour un devoir spécifique.",
      permission: 'eleves.lire',
      parametres: P({ devoir: { type: 'string', description: 'Intitulé du devoir (ex: Devoir de Maths)' } }, ['devoir']),
      executer: async (ctx, args) => {
        const dev = await db.devoir.findFirst({ where: { ecoleId: ctx.ecoleId!, intitule: { contains: String(args.devoir), mode: 'insensitive' } } });
        if (!dev) return { erreur: "Devoir introuvable." };
        const rendus = await db.renduDevoir.findMany({ where: { devoirId: dev.id }, include: { eleve: true } });
        return { devoir: dev.intitule, rendus: rendus.map(r => ({ renduId: r.id, eleve: `${r.eleve.prenom} ${r.eleve.nom}`, dateRendu: r.dateRendu, note: r.note, statut: r.statut, contenu: r.contenuUrl })) };
      }
    },
    {
      nom: 'lister_pieces_dossier',
      description: "Affiche la liste et le statut des pièces justificatives du dossier d'un élève.",
      permission: 'eleves.lire',
      parametres: P({ eleve: { type: 'string', description: 'Nom de l\'élève' } }, ['eleve']),
      executer: async (ctx, args) => {
        const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
        if (!el) return { erreur: "Élève introuvable." };
        const pieces = await db.pieceDossier.findMany({ where: { eleveId: el.id } });
        return { eleve: `${el.prenom} ${el.nom}`, pieces: pieces.map(p => ({ pieceId: p.id, type: p.type, statut: p.statut, remarque: p.remarque })) };
      }
    },
    {
      nom: 'lister_courriers_en_attente',
      description: "Liste les courriers entrants ou sortants non encore traités.",
      permission: 'eleves.lire',
      parametres: P({ direction: { type: 'string', enum: ['entrant', 'sortant'], description: 'Type de courrier' } }, ['direction']),
      executer: async (ctx, args) => {
        const courriers = await db.courrier.findMany({ where: { ecoleId: ctx.ecoleId!, direction: String(args.direction), traite: false }, orderBy: { dateEnregistrement: 'asc' }, take: 10 });
        return { courriers: courriers.map(c => ({ courrierId: c.id, reference: c.reference, objet: c.objet, correspondant: c.correspondant, date: c.dateEnregistrement })) };
      }
    },
    {
      nom: 'balance_comptable',
      description: "Génère la balance comptable de l'école (comptes, débits, crédits, soldes).",
      permission: 'finances.voir',
      parametres: P({}),
      executer: async (ctx) => {
        return biz.balanceComptableCore(ctx as never, 'toutes');
      }
    },
    {
      nom: 'compte_resultat',
      description: "Génère le compte de résultat de l'école (produits vs charges) pour voir le bénéfice ou la perte.",
      permission: 'finances.voir',
      parametres: P({}),
      executer: async (ctx) => {
        return biz.compteResultatCore(ctx as never, 'toutes');
      }
    },
    {
      nom: 'bilan_simplifie',
      description: "Génère le bilan financier simplifié de l'école (Actif, Passif, Capitaux).",
      permission: 'finances.voir',
      parametres: P({}),
      executer: async (ctx) => {
        return biz.bilanSimplifieCore(ctx as never, 'toutes');
      }
    },
    {
      nom: 'grand_livre',
      description: "Extrait le Grand Livre d'un compte comptable spécifique (liste des écritures et solde final).",
      permission: 'finances.voir',
      parametres: P({ numeroCompte: { type: 'string', description: 'Numéro du compte (ex: 411, 512)' } }, ['numeroCompte']),
      executer: async (ctx, args) => {
        return biz.grandLivreCore(ctx as never, String(args.numeroCompte));
      }
    },
    {
      nom: 'balance_agee_clients',
      description: "Génère la balance âgée des clients (élèves), montrant les impayés classés par ancienneté (0-30j, 31-60j, 61-90j, >90j).",
      permission: 'finances.voir',
      parametres: P({}),
      executer: async (ctx) => {
        return biz.balanceAgeeClientsCore(ctx as never);
      }
    },
    {
      nom: 'rechercher_fournisseur',
      description: "Recherche un fournisseur par nom pour obtenir son ID.",
      permission: 'finances.voir',
      parametres: P({ nom: { type: 'string', description: 'Nom ou partie du nom du fournisseur' } }, ['nom']),
      executer: async (ctx, args) => {
        const fournisseurs = await db.fournisseur.findMany({ where: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.nom), mode: 'insensitive' } }, take: 10 });
        return { fournisseurs: fournisseurs.map(f => ({ fournisseurId: f.id, nom: f.nom, type: f.type })) };
      }
    },
    {
      nom: 'balance_agee_fournisseurs',
      description: "Génère la balance âgée des fournisseurs, montrant les factures impayées par ancienneté.",
      permission: 'finances.voir',
      parametres: P({}),
      executer: async (ctx) => {
        return biz.balanceAgeeFournisseursCore(ctx as never);
      }
    },
    {
      nom: 'lister_bulletins_paie',
      description: "Liste les bulletins de paie d'un mois précis pour récupérer leurs IDs.",
      permission: 'rh.gerer',
      parametres: P({ periode: { type: 'string', description: 'Mois AAAA-MM (ex: 2026-09)' } }, ['periode']),
      executer: async (ctx, args) => {
        const bulletins = await db.bulletinPaie.findMany({ where: { ecoleId: ctx.ecoleId!, periode: String(args.periode) }, include: { personnel: true } });
        return { bulletins: bulletins.map(b => ({ bulletinId: b.id, personnel: `${b.personnel.nom} ${b.personnel.prenom}`, net: b.netAPayer, statut: b.statut })) };
      }
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
      nom: 'inscrire_personnel',
      description: "Enregistre un nouvel employ� ou enseignant (personnel) dans l'�tablissement. Ne JAMAIS utiliser inscrire_eleve pour un enseignant.",
      permission: 'rh.gerer',
      parametres: P({
        nom: { type: 'string', description: 'Nom de famille' },
        prenom: { type: 'string', description: 'Pr�nom' },
        email: { type: 'string', description: 'Email (optionnel, permet de cr�er un compte)' },
        telephone: { type: 'string', description: 'T�l�phone (optionnel)' },
        dateEmbauche: { type: 'string', description: 'Date ISO AAAA-MM-JJ' },
        typeContrat: { type: 'string', description: 'Type', enum: ['CDI', 'CDD', 'vacataire', 'stagiaire'] },
        salaireMensuel: { type: 'number', description: 'Salaire brut mensuel en FCFA (optionnel)' },
        roleCode: { type: 'string', description: 'R�le m�tier', enum: ['enseignant', 'surveillant', 'secretaire', 'comptabilite', 'rh', 'direction'] },
      }, ['nom', 'prenom', 'dateEmbauche', 'roleCode']),
      executer: async (ctx, args) => {
        return biz.creerPersonnelCore(ctx as never, ctx.ecoleId!, {
          nom: String(args.nom),
          prenom: String(args.prenom),
          email: args.email ? String(args.email) : undefined,
          telephone: args.telephone ? String(args.telephone) : undefined,
          dateEmbauche: new Date(String(args.dateEmbauche)),
          typeContrat: args.typeContrat ? String(args.typeContrat) : undefined,
          salaireBrut: args.salaireMensuel ? Math.round(Number(args.salaireMensuel) * 100) : undefined,
          roleCode: String(args.roleCode),
          creerCompte: !!args.email,
          motDePasseInitial: args.email ? 'Scola' + new Date().getFullYear() + '!' : undefined,
        } as never);
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
          where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(nom.split(' ')[0]).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) },
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
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
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
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
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
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
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

  // ────────────────────────────────────────────────────────────────────
  // OUTILS SECRÉTARIAT — 3 outils manquants ajoutés (failles C, D, E)
  // ────────────────────────────────────────────────────────────────────
  {
    nom: 'modifier_eleve',
    description: "Corrige les informations d'identité d'un élève (nom, prénom, date de naissance, lieu de naissance, sexe). Utiliser rechercher_eleve d'abord pour obtenir l'eleveId.",
    permission: 'eleves.ecrire',
    parametres: P({
      eleveId:       { type: 'string', description: 'Identifiant de l\'élève (via rechercher_eleve)' },
      nom:           { type: 'string', description: 'Nouveau nom de famille' },
      prenom:        { type: 'string', description: 'Nouveau prénom' },
      dateNaissance: { type: 'string', description: 'Nouvelle date de naissance ISO (AAAA-MM-JJ)' },
      lieuNaissance: { type: 'string', description: 'Nouveau lieu de naissance (optionnel)' },
      sexe:          { type: 'string', description: 'Sexe', enum: ['M', 'F'] },
    }, ['eleveId', 'nom', 'prenom', 'dateNaissance', 'sexe']),
    executer: async (ctx, args) => {
      return biz.modifierEleveCore(ctx as never, {
        eleveId:       String(args.eleveId),
        nom:           String(args.nom),
        prenom:        String(args.prenom),
        dateNaissance: new Date(String(args.dateNaissance)),
        lieuNaissance: args.lieuNaissance ? String(args.lieuNaissance) : undefined,
        sexe:          String(args.sexe) as 'M' | 'F',
      } as never);
    },
  },
  {
    nom: 'rattacher_parent',
    description: "Crée et rattache un parent (père, mère ou tuteur légal) à un élève. Si le parent n'existe pas encore dans le système, il est créé automatiquement avec les informations fournies.",
    permission: 'eleves.ecrire',
    parametres: P({
      eleveId:         { type: 'string', description: 'Identifiant de l\'élève (via rechercher_eleve)' },
      lien:            { type: 'string', description: 'Lien avec l\'élève', enum: ['pere', 'mere', 'tuteur_legal'] },
      nom:             { type: 'string', description: 'Nom du parent' },
      prenom:          { type: 'string', description: 'Prénom du parent' },
      telephone:       { type: 'string', description: 'Téléphone (optionnel)' },
      email:           { type: 'string', description: 'Email (optionnel)' },
      profession:      { type: 'string', description: 'Profession (optionnel)' },
      autoriteParentale: { type: 'boolean', description: 'A l\'autorité parentale ? (défaut: oui)' },
    }, ['eleveId', 'lien', 'nom', 'prenom']),
    executer: async (ctx, args) => {
      return biz.rattacherParentCore(ctx as never, {
        eleveId: String(args.eleveId),
        nouveauParent: {
          nom:            String(args.nom),
          prenom:         String(args.prenom),
          lienAvecEleve:  String(args.lien),
          telephone:      args.telephone  ? String(args.telephone)  : undefined,
          email:          args.email      ? String(args.email)      : undefined,
          profession:     args.profession ? String(args.profession) : undefined,
        },
        autoriteParentale: args.autoriteParentale !== false,
      } as never);
    },
  },
  {
    nom: 'archiver_eleve',
    description: "Change le statut d'un élève : sorti (quitte l'école), exclu, diplome, ou décédé. La date de sortie et le motif sont obligatoires. L'historique de classe est automatiquement clôturé.",
    permission: 'eleves.ecrire',
    parametres: P({
      eleveId:     { type: 'string', description: 'Identifiant de l\'élève (via rechercher_eleve)' },
      statut:      { type: 'string', description: 'Nouveau statut', enum: ['sorti', 'exclu', 'diplome', 'decede'] },
      dateSortie:  { type: 'string', description: 'Date de sortie ISO (AAAA-MM-JJ)' },
      motif:       { type: 'string', description: 'Motif obligatoire (ex: départ à l\'étranger, renvoi définitif, diplômé en juin…)' },
    }, ['eleveId', 'statut', 'dateSortie', 'motif']),
    executer: async (ctx, args) => {
      return biz.changerStatutEleveCore(ctx as never, {
        eleveId:    String(args.eleveId),
        statut:     String(args.statut),
        dateSortie: new Date(String(args.dateSortie)),
        motif:      String(args.motif),
      } as never);
    },
  },

  // ────────────────────────────────────────────────────────────────────
  // OUTILS ENSEIGNANT — 3 outils ajoutés pour combler les failles
  // ────────────────────────────────────────────────────────────────────
  {
    nom: 'mon_emploi_du_temps',
    description: "Affiche l'emploi du temps de la journée (cours, heures, salles, classes, seanceId). Par défaut pour vous (enseignant). Peut aussi chercher pour une classe spécifique.",
    permission: 'eleves.lire',
    parametres: P({ 
      date: { type: 'string', description: 'Date ISO (AAAA-MM-JJ), défaut aujourd\'hui' },
      classe: { type: 'string', description: 'Libellé de la classe (optionnel)' } 
    }),
    executer: async (ctx, args) => {
      const d = args.date ? new Date(String(args.date)) : new Date();
      const debut = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const fin = new Date(debut.getTime() + 86400000);
      
      const where: any = { date: { gte: debut, lt: fin } };
      if (args.classe) {
         where.classe = { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } };
      } else {
         where.classe = { ecoleId: ctx.ecoleId! };
         const pers = await db.personnel.findFirst({ where: { utilisateurId: ctx.utilisateurId, deletedAt: null } });
         if (pers) where.enseignantId = pers.id;
      }
      
      const seances = await db.seance.findMany({
         where,
         include: { classe: true, matiere: true, salle: true },
         orderBy: { heureDebut: 'asc' }
      });
      
      return seances.map(s => ({
         seanceId: s.id,
         heure: `${s.heureDebut} - ${s.heureFin}`,
         matiere: s.matiere.libelle,
         classe: s.classe.libelle,
         salle: s.salle?.nom ?? 'Non définie',
         statut: s.statut
      }));
    }
  },
  {
    nom: 'faire_appel',
    description: "Fait l'appel pour une séance donnée. TOUS les élèves de la classe seront marqués présents, SAUF ceux passés en absents/retards dans la liste.",
    permission: 'presences.saisir',
    parametres: P({
      seanceId: { type: 'string', description: 'ID de la séance (trouvé via mon_emploi_du_temps)' },
      absentsOuRetards: { type: 'string', description: 'Liste des élèves absents ou en retard séparés par des virgules (ex: "Awa Diop: absent, Malick Sow: retard 15")' }
    }, ['seanceId']),
    executer: async (ctx, args) => {
      const seance = await db.seance.findUnique({ where: { id: String(args.seanceId) }, include: { classe: { include: { eleves: { where: { statut: 'actif', deletedAt: null } } } } } });
      if (!seance) return { erreur: "Séance introuvable." };
      
      const parts = args.absentsOuRetards ? String(args.absentsOuRetards).split(/;|,/).map(x => x.trim()).filter(Boolean) : [];
      const dict = new Map();
      const nonTrouves: string[] = [];
      
      for (const el of seance.classe.eleves) {
         dict.set(el.id, { eleveId: el.id, statut: 'present', motif: 'Présent' });
      }
      
      for (const part of parts) {
         const m = part.match(/^(.+?):\s*(absent|retard)(?:\s+(\d+))?$/i);
         let nom = part; let statut = 'absent'; let retard = 0;
         if (m) {
           nom = m[1].trim();
           statut = m[2].toLowerCase();
           retard = m[3] ? parseInt(m[3], 10) : 0;
         }
         
         const el = seance.classe.eleves.find(e => e.nom.toLowerCase().includes(nom.toLowerCase()) || e.prenom.toLowerCase().includes(nom.toLowerCase()));
         if (el) {
           dict.set(el.id, { eleveId: el.id, statut, motif: statut === 'absent' ? 'Absent' : `Retard de ${retard} min`, minuteRetard: retard });
         } else {
           nonTrouves.push(nom);
         }
      }
      
      await biz.saisirAppelCore(ctx as never, { seanceId: seance.id, presences: Array.from(dict.values()) } as never);
      return { msg: "Appel enregistré.", presents: seance.classe.eleves.length - parts.length, exceptions: parts.length, nonTrouves };
    }
  },
  {
    nom: 'saisir_appreciations',
    description: "Saisit l'appréciation d'un enseignant sur le bulletin d'un élève pour une période et une matière.",
    permission: 'notes.saisir',
    parametres: P({
       eleve: { type: 'string', description: 'Nom de l\'élève' },
       periode: { type: 'string', description: 'Libellé de la période (ex: T1)' },
       matiere: { type: 'string', description: 'Libellé de la matière' },
       appreciation: { type: 'string', description: 'Texte de l\'appréciation' }
    }, ['eleve', 'periode', 'matiere', 'appreciation']),
    executer: async (ctx, args) => {
       const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
       if (!el) return { erreur: "Élève introuvable." };
       const per = await db.periode.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.periode), mode: 'insensitive' } } });
       if (!per) return { erreur: "Période introuvable." };
       const mat = await db.matiere.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.matiere), mode: 'insensitive' } } });
       if (!mat) return { erreur: "Matière introuvable." };
       
       const bulletin = await db.bulletin.findFirst({ where: { eleveId: el.id, periodeId: per.id } });
       if (!bulletin) return { erreur: "Le bulletin n'a pas encore été généré pour cet élève et cette période. Générez-le d'abord avec generer_bulletins_classe." };
       
       await biz.saisirAppreciationsMatiereCore(ctx as never, bulletin.id, [{ matiereId: mat.id, appreciation: String(args.appreciation) }]);
       return { msg: "Appréciation enregistrée avec succès." };
    }
  },
  {
    nom: 'saisir_competences',
    description: "Saisit l'évaluation d'une compétence pour un élève (spécifique au cycle primaire/maternelle).",
    permission: 'notes.saisir',
    parametres: P({
       eleve: { type: 'string', description: 'Nom de l\'élève' },
       competence: { type: 'string', description: 'Libellé de la compétence (ex: Calcul mental)' },
       periode: { type: 'string', description: 'Libellé de la période' },
       niveau: { type: 'string', enum: ['non_acquis', 'en_cours_d_acquisition', 'acquis', 'maitrise'], description: 'Niveau d\'acquisition' },
       commentaire: { type: 'string', description: 'Commentaire (optionnel)' }
    }, ['eleve', 'competence', 'periode', 'niveau']),
    executer: async (ctx, args) => {
       const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
       if (!el) return { erreur: "Élève introuvable." };
       const comp = await db.competence.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.competence), mode: "insensitive" } } });
       if (!comp) return { erreur: "Compétence introuvable." };
       const per = await db.periode.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.periode), mode: 'insensitive' } } });
       if (!per) return { erreur: "Période introuvable." };
       await biz.saisirEvaluationsCompetenceCore(ctx as never, { periodeId: per.id, saisies: [{ eleveId: el.id, competenceId: comp.id, niveauAcquisition: String(args.niveau), commentaire: args.commentaire ? String(args.commentaire) : undefined }] } as never);
       return { msg: "Compétence évaluée avec succès." };
    }
  },
  {
    nom: 'creer_dispense',
    description: "Enregistre une dispense (sport, activité) pour un élève avec un motif et des dates.",
    permission: 'vie_scolaire.gerer',
    parametres: P({
       eleve: { type: 'string', description: 'Nom de l\'élève' },
       matiere: { type: 'string', description: 'Libellé de la matière concernée (ex: EPS)' },
       motif: { type: 'string', description: 'Motif (ex: Certificat médical)' },
       description: { type: 'string', description: 'Détails de la dispense' },
       dateDebut: { type: 'string', description: 'Date de début ISO' },
       dateFin: { type: 'string', description: 'Date de fin ISO (optionnelle)' }
    }, ['eleve', 'matiere', 'motif', 'description', 'dateDebut']),
    executer: async (ctx, args) => {
       const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
       if (!el) return { erreur: "Élève introuvable." };
       const mat = await db.matiere.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.matiere), mode: "insensitive" } } });
       if (!mat) return { erreur: "Matière introuvable." };
       return biz.creerDispenseCore(ctx as never, { eleveId: el.id, matiereId: mat.id, motif: String(args.motif), description: String(args.description), dateDebut: new Date(String(args.dateDebut)), dateFin: args.dateFin ? new Date(String(args.dateFin)) : undefined } as never);
    }
  },
  {
    nom: 'saisir_sanction',
    description: "Saisit une sanction suite à un incident (Retenue, Avertissement, etc.).",
    permission: 'vie_scolaire.gerer',
    parametres: P({
      incidentId: { type: 'string', description: 'ID de l\'incident (obtenu via declarer_incident)' },
      type: { type: 'string', description: 'Type de sanction (ex: Retenue, Avertissement)' },
      description: { type: 'string', description: 'Description détaillée de la sanction' }
    }, ['incidentId', 'type']),
    executer: async (ctx, args) => {
      const inc = await db.incident.findUnique({ where: { id: String(args.incidentId) } });
      if (!inc) return { erreur: 'Incident introuvable.' };
      return biz.sanctionnerCore(ctx as never, {
        incidentId: inc.id,
        type: String(args.type),
        description: args.description ? String(args.description) : undefined
      } as never);
    }
  },
  {
    nom: 'justifier_absence',
    description: "Justifie une absence pour un élève (certificat médical, mot des parents).",
    permission: 'vie_scolaire.gerer',
    parametres: P({
      eleve: { type: 'string', description: 'Nom de l\'élève' },
      motif: { type: 'string', description: 'Motif de la justification (ex: Maladie)' },
      dateAbsence: { type: 'string', description: 'Date de l\'absence au format YYYY-MM-DD' },
      description: { type: 'string', description: 'Détails supplémentaires (optionnel)' }
    }, ['eleve', 'motif', 'dateAbsence']),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
      if (!el) return { erreur: "Élève introuvable." };
      return biz.justifierAbsenceCore(ctx as never, {
         eleveId: el.id,
         dateAbsence: new Date(String(args.dateAbsence)),
         motif: String(args.motif),
         description: args.description ? String(args.description) : undefined
      } as never);
    }
  },
  {
    nom: 'noter_rendu_devoir',
    description: "Note et corrige un devoir rendu en ligne par un élève (E-Learning).",
    permission: 'notes.saisir',
    parametres: P({
       renduId: { type: 'string', description: 'ID du rendu (obtenu via lister_rendus_devoir)' },
       note: { type: 'number', description: 'Note attribuée' },
       appreciation: { type: 'string', description: 'Appréciation (optionnel)' }
    }, ['renduId', 'note']),
    executer: async (ctx, args) => {
       return biz.noterRenduCore(ctx as never, String(args.renduId), { note: Number(args.note), appreciation: args.appreciation ? String(args.appreciation) : undefined });
    }
  },
  {
    nom: 'justifier_retard',
    description: "Justifie un retard d'élève existant.",
    permission: 'vie_scolaire.gerer',
    parametres: P({
       retardId: { type: 'string', description: 'ID du retard (obtenu via rechercher_eleve ou stats)' }
    }, ['retardId']),
    executer: async (ctx, args) => {
       return biz.justifierRetardCore(ctx as never, String(args.retardId));
    }
  },
  {
    nom: 'basculer_piece_dossier',
    description: "Marque une pièce justificative du dossier d'un élève comme reçue ou manquante.",
    permission: 'eleves.ecrire',
    parametres: P({
       pieceId: { type: 'string', description: 'ID de la pièce (obtenu via lister_pieces_dossier)' },
       statut: { type: 'string', enum: ['manquante', 'recue'], description: 'Nouveau statut' },
       remarque: { type: 'string', description: 'Remarque éventuelle (optionnel)' }
    }, ['pieceId', 'statut']),
    executer: async (ctx, args) => {
       return biz.basculerPieceDossierCore(ctx as never, String(args.pieceId), String(args.statut) as 'manquante' | 'recue', args.remarque ? String(args.remarque) : undefined);
    }
  },
  {
    nom: 'ajouter_piece_exigee',
    description: "Ajoute une pièce justificative spécifique au dossier d'un élève (ex: Dispense sport, Décision de justice).",
    permission: 'eleves.ecrire',
    parametres: P({
       eleve: { type: 'string', description: 'Nom de l\'élève' },
       type: { type: 'string', description: 'Type de pièce (ex: Jugement de tutelle)' }
    }, ['eleve', 'type']),
    executer: async (ctx, args) => {
       const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
       if (!el) return { erreur: "Élève introuvable." };
       return biz.ajouterPieceExigeeCore(ctx as never, el.id, String(args.type));
    }
  },
  {
    nom: 'traiter_courrier',
    description: "Marque un courrier entrant/sortant comme traité par l'administration.",
    permission: 'eleves.ecrire',
    parametres: P({
       courrierId: { type: 'string', description: 'ID du courrier (obtenu via lister_courriers_en_attente)' },
       commentaire: { type: 'string', description: 'Commentaire ou réponse apportée (optionnel)' }
    }, ['courrierId']),
    executer: async (ctx, args) => {
       return biz.traiterCourrierCore(ctx as never, String(args.courrierId), args.commentaire ? String(args.commentaire) : undefined);
    }
  },
  {
    nom: 'appliquer_remise',
    description: "Applique une réduction/remise sur une échéance de scolarité (le montant doit être en centimes !).",
    permission: 'finances.ecrire',
    parametres: P({
       echeanceId: { type: 'string', description: 'ID de l\'échéance (obtenu via profil_eleve ou suivi_paiements_scolarite)' },
       remiseCentimes: { type: 'number', description: 'Montant de la remise en CENTIMES (ex: 5000 FCFA = 500000)' },
       motif: { type: 'string', description: 'Motif de la remise (ex: Bourse au mérite, Fratrie)' }
    }, ['echeanceId', 'remiseCentimes', 'motif']),
    executer: async (ctx, args) => {
       return biz.remiseEcheanceCore(ctx as never, String(args.echeanceId), Number(args.remiseCentimes), String(args.motif));
    }
  },
  {
    nom: 'annuler_paiement',
    description: "Annule un paiement erroné (avec écriture de contrepassation).",
    permission: 'finances.ecrire',
    parametres: P({
       paiementId: { type: 'string', description: 'ID du paiement à annuler' },
       motif: { type: 'string', description: 'Motif d\'annulation' },
       rembourser: { type: 'boolean', description: 'Vrai si l\'argent a été physiquement rendu' }
    }, ['paiementId', 'motif']),
    executer: async (ctx, args) => {
       return biz.annulerPaiementCore(ctx as never, String(args.paiementId), String(args.motif), args.rembourser === true);
    }
  },
  {
    nom: 'valider_depense',
    description: "Valide définitivement une dépense pour déclencher son écriture comptable.",
    permission: 'finances.valider',
    parametres: P({
       depenseId: { type: 'string', description: 'ID de la dépense' }
    }, ['depenseId']),
    executer: async (ctx, args) => {
       return biz.validerDepenseCore(ctx as never, String(args.depenseId));
    }
  },
  {
    nom: 'generer_echeances_classe',
    description: "Génère en masse les échéances (scolarité, cantine...) pour tous les élèves d'une classe.",
    permission: 'finances.ecrire',
    parametres: P({
       frais: { type: 'string', description: 'Libellé du frais (ex: Scolarité Février)' },
       classe: { type: 'string', description: 'Libellé de la classe (ex: 6ème A)' },
       dateEcheance: { type: 'string', description: 'Date limite de paiement (YYYY-MM-DD)' }
    }, ['frais', 'classe', 'dateEcheance']),
    executer: async (ctx, args) => {
       const frais = await db.frais.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.frais), mode: 'insensitive' } } });
       if (!frais) return { erreur: "Frais introuvable." };
       const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: 'insensitive' } } });
       if (!classe) return { erreur: "Classe introuvable." };
       return biz.genererEcheancesClasseCore(ctx as never, { fraisId: frais.id, classeId: classe.id, dateEcheance: new Date(String(args.dateEcheance)) } as never);
    }
  },
  {
    nom: 'annuler_echeance',
    description: "Annule purement et simplement une échéance due par un élève (ex: abandon, erreur).",
    permission: 'finances.ecrire',
    parametres: P({
       echeanceId: { type: 'string', description: 'ID de l\'échéance (obtenu via profil_eleve ou suivi_paiements_scolarite)' },
       motif: { type: 'string', description: 'Motif de l\'annulation' }
    }, ['echeanceId', 'motif']),
    executer: async (ctx, args) => {
       return biz.annulerEcheanceCore(ctx as never, String(args.echeanceId), String(args.motif));
    }
  },
  {
    nom: 'cloturer_exercice_comptable',
    description: "Clôture un exercice comptable (ex: fin d'année) en verrouillant les écritures et générant les soldes à-nouveau.",
    permission: 'finances.valider',
    parametres: P({
       dateDebut: { type: 'string', description: 'Date de début de l\'exercice (YYYY-MM-DD)' },
       dateFin: { type: 'string', description: 'Date de fin de l\'exercice (YYYY-MM-DD)' }
    }, ['dateDebut', 'dateFin']),
    executer: async (ctx, args) => {
       return biz.cloturerExerciceComptableCore(ctx as never, new Date(String(args.dateDebut)), new Date(String(args.dateFin)));
    }
  },
  {
    nom: 'enregistrer_facture_fournisseur',
    description: "Enregistre une facture émise par un fournisseur (ex: facture SODECI, achat de matériel).",
    permission: 'finances.ecrire',
    parametres: P({
       fournisseurId: { type: 'string', description: 'ID du fournisseur (obtenu via rechercher_fournisseur)' },
       numero: { type: 'string', description: 'Numéro de la facture' },
       dateEmission: { type: 'string', description: 'Date de la facture (YYYY-MM-DD)' },
       montantHT: { type: 'number', description: 'Montant Hors Taxe (en entier)' },
       montantTVA: { type: 'number', description: 'Montant de la TVA (optionnel, 0 par défaut)' }
    }, ['fournisseurId', 'numero', 'dateEmission', 'montantHT']),
    executer: async (ctx, args) => {
       return biz.enregistrerFactureFournisseurCore(ctx as never, {
         fournisseurId: String(args.fournisseurId), numero: String(args.numero),
         dateEmission: new Date(String(args.dateEmission)), montantHT: Number(args.montantHT),
         montantTVA: args.montantTVA ? Number(args.montantTVA) : 0
       } as never);
    }
  },
  {
    nom: 'payer_fournisseur',
    description: "Enregistre le paiement total ou partiel d'une facture fournisseur.",
    permission: 'finances.valider',
    parametres: P({
       factureId: { type: 'string', description: 'ID de la facture (retourné lors de l\'enregistrement ou recherche)' },
       montant: { type: 'number', description: 'Montant payé (en entier)' },
       mode: { type: 'string', description: 'Mode de paiement (ex: especes, virement, cheque)' },
       reference: { type: 'string', description: 'Référence du paiement (ex: Numéro du chèque)' }
    }, ['factureId', 'montant', 'mode']),
    executer: async (ctx, args) => {
       return biz.payerFournisseurCore(ctx as never, {
         factureId: String(args.factureId), montant: Number(args.montant),
         mode: String(args.mode), reference: args.reference ? String(args.reference) : undefined
       });
    }
  },
  {
    nom: 'annuler_depense',
    description: "Annule purement et simplement une dépense.",
    permission: 'finances.valider',
    parametres: P({
       depenseId: { type: 'string', description: 'ID de la dépense' },
       motif: { type: 'string', description: 'Motif de l\'annulation' }
    }, ['depenseId', 'motif']),
    executer: async (ctx, args) => {
       return biz.annulerDepenseCore(ctx as never, String(args.depenseId), String(args.motif));
    }
  },
  {
    nom: 'liste_depenses',
    description: "Liste les dépenses de l'école (récentes, en attente de validation, ou validées). Utiliser pour chercher des dépenses en attente.",
    permission: 'finances.voir',
    parametres: P({
      statut: { type: 'string', description: 'Filtre: "en_attente", "validee", "annulee". Si vide, liste les 50 dernières.' },
    }),
    executer: async (ctx, args) => {
      let where: any = { ecoleId: ctx.ecoleId };
      if (args.statut === 'en_attente') where = { ...where, validee: false, annulee: false };
      else if (args.statut === 'validee') where = { ...where, validee: true, annulee: false };
      else if (args.statut === 'annulee') where = { ...where, annulee: true };
      const deps = await db.depense.findMany({ where, orderBy: { dateDepense: 'desc' }, take: 50 });
      return {
        totalFiltre: deps.length,
        depenses: deps.map(d => ({
          id: d.id,
          date: d.dateDepense,
          categorie: d.categorie,
          description: d.description,
          montant_F: (d.montant / 100) + ' F',
          statut: d.annulee ? 'Annulée' : (d.validee ? 'Validée' : 'En attente'),
        }))
      };
    }
  },
  {
    nom: 'traiter_bulletin_paie',
    description: "Valide ou paie un bulletin de salaire (pour le marquer comme réglé).",
    permission: 'rh.gerer',
    parametres: P({
       bulletinId: { type: 'string', description: 'ID du bulletin' },
       decision: { type: 'string', description: 'Action à faire', enum: ['valide', 'paye'] }
    }, ['bulletinId', 'decision']),
    executer: async (ctx, args) => {
       return biz.traiterBulletinPaieCore(ctx as never, String(args.bulletinId), args.decision as 'valide'|'paye');
    }
  },
  {
    nom: 'passer_ecriture_paie',
    description: "Comptabilise un bulletin de paie (transfère les salaires dans le Grand Livre comptable).",
    permission: 'rh.gerer',
    parametres: P({ bulletinId: { type: 'string', description: 'ID du bulletin' } }, ['bulletinId']),
    executer: async (ctx, args) => {
       return biz.passerEcriturePaieCore(ctx as never, String(args.bulletinId));
    }
  },
  {
    nom: 'creer_rapprochement_bancaire',
    description: "Effectue le rapprochement entre le solde de la banque et le compte 521, et génère l'écriture d'écart si demandé.",
    permission: 'finances.valider',
    parametres: P({
       dateReleve: { type: 'string', description: 'Date du relevé bancaire (YYYY-MM-DD)' },
       soldeReleve: { type: 'number', description: 'Solde lu sur le relevé de la banque (en CENTIMES)' },
       ajuster: { type: 'boolean', description: 'Si vrai, passe automatiquement l\'écriture d\'écart (ex: frais bancaires)' }
    }, ['dateReleve', 'soldeReleve']),
    executer: async (ctx, args) => {
       return biz.creerRapprochementCore(ctx as never, {
         dateReleve: new Date(String(args.dateReleve)),
         soldeReleve: Number(args.soldeReleve),
         ajuster: args.ajuster === true
       });
    }
  },
  {
    nom: 'ajouter_variable_paie',
    description: "Ajoute une variable de paie (prime, indemnité, retenue, heure sup) au bulletin d'un employé.",
    permission: 'rh.gerer',
    parametres: P({
       personnelId: { type: 'string', description: 'ID de l\'employé (obtenu via rechercher_personnel)' },
       periode: { type: 'string', description: 'Mois concerné (AAAA-MM)' },
       type: { type: 'string', description: 'Type', enum: ['prime', 'indemnite', 'avantage', 'heure_sup'] },
       libelle: { type: 'string', description: 'Description (ex: Prime de fin d\'année)' },
       montant: { type: 'number', description: 'Montant en CENTIMES' }
    }, ['personnelId', 'periode', 'type', 'libelle', 'montant']),
    executer: async (ctx, args) => {
       return biz.ajouterVariablePaieCore(ctx as never, ctx.ecoleId!, {
         personnelId: String(args.personnelId), periode: String(args.periode),
         type: String(args.type), libelle: String(args.libelle), montant: Number(args.montant)
       });
    }
  },
  {
    nom: 'creer_compte_comptable',
    description: "Crée un nouveau compte dans le Plan Comptable de l'école.",
    permission: 'finances.ecrire',
    parametres: P({
       numero: { type: 'string', description: 'Numéro du compte (3 à 6 chiffres)' },
       libelle: { type: 'string', description: 'Nom du compte (ex: Achats de marchandises)' },
       type: { type: 'string', description: 'Type de compte', enum: ['actif', 'passif', 'produit', 'charge'] }
    }, ['numero', 'libelle', 'type']),
    executer: async (ctx, args) => {
       return biz.creerCompteComptableCore(ctx as never, ctx.ecoleId!, {
         numero: String(args.numero), libelle: String(args.libelle), type: String(args.type)
       });
    }
  },
  {
    nom: 'enregistrer_immobilisation',
    description: "Enregistre l'acquisition d'un actif immobilisé (bâtiment, véhicule, ordinateurs) pour le tableau d'amortissement.",
    permission: 'finances.ecrire',
    parametres: P({
       libelle: { type: 'string', description: 'Nom du bien (ex: Bus Scolaire Mercedes)' },
       montantAcquisition: { type: 'number', description: 'Prix d\'achat en CENTIMES' },
       dateAcquisition: { type: 'string', description: 'Date d\'achat (YYYY-MM-DD)' },
       dureeAnnees: { type: 'number', description: 'Durée de vie estimée (en années) pour l\'amortissement' },
       comptabiliser: { type: 'boolean', description: 'Si vrai, passe automatiquement l\'écriture comptable d\'achat' }
    }, ['libelle', 'montantAcquisition', 'dateAcquisition', 'dureeAnnees']),
    executer: async (ctx, args) => {
       return biz.enregistrerImmobilisationCore(ctx as never, {
         libelle: String(args.libelle), montantAcquisition: Number(args.montantAcquisition),
         dateAcquisition: new Date(String(args.dateAcquisition)), dureeAnnees: Number(args.dureeAnnees),
         comptabiliser: args.comptabiliser === true
       });
    }
  },
  {
    nom: 'generer_dotations',
    description: "Calcule et passe en comptabilité les dotations aux amortissements de toutes les immobilisations pour une année donnée.",
    permission: 'finances.valider',
    parametres: P({ annee: { type: 'number', description: 'L\'année (ex: 2026)' } }, ['annee']),
    executer: async (ctx, args) => {
       return biz.genererDotationsCore(ctx as never, Number(args.annee));
    }
  },
];



// --------------------------------------------------------------------
// OUTILS PROFONDS v2 — couverture complète par métier (descriptions en
// guillemets doubles : aucune apostrophe simple à échapper)
// --------------------------------------------------------------------

const outilsProfonds: OutilIA[] = [
  {
    nom: "rechercher_personnel",
    description: "Recherche un membre du personnel par nom ; retourne matricule, poste, contrat, solde de congés.",
    permission: "rh.gerer",
    parametres: P({ q: { type: "string", description: "Nom ou prénom" } }, ["q"]),
    executer: async (ctx, args) => {
      const q = String(args.q ?? "").trim();
      const pers = await db.personnel.findMany({
        where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(q).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) },
        include: { contrats: { where: { actif: true } }, soldeConges: true },
        take: 8,
      });
      return pers.map((p: any) => ({
        personnelId: p.id, nom: `${p.prenom} ${p.nom}`, matricule: p.matricule, statut: p.statut,
        contrat: p.contrats[0]?.typeContrat ?? p.typeContrat,
        salaireF: p.salaireBrut ? p.salaireBrut / 100 : null,
        congesRestants: p.soldeConges?.[0]?.joursRestants ?? null,
      }));
    },
  },
  {
    nom: "traiter_conge",
    description: "Valide ou refuse une demande de congé en attente (solde décrémenté automatiquement).",
    permission: "rh.gerer",
    parametres: P({
      personnel: { type: "string", description: "Nom du personnel" },
      decision: { type: "string", enum: ["valide", "refuse"] },
      commentaire: { type: "string", description: "Commentaire (optionnel)" },
    }, ["personnel", "decision"]),
    executer: async (ctx, args) => {
      const pers = await db.personnel.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.personnel)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
      if (!pers) return { erreur: "Personnel introuvable." };
      const conge = await db.conge.findFirst({ where: { personnelId: pers.id, statut: "demande" }, orderBy: { dateDebut: "asc" } });
      if (!conge) return { erreur: `Aucune demande de congé en attente pour ${pers.prenom} ${pers.nom}.` };
      return biz.traiterCongeCore(ctx as never, conge.id, String(args.decision) as "valide" | "refuse", args.commentaire ? String(args.commentaire) : undefined);
    },
  },
  {
    nom: "generer_paie",
    description: "Génère les bulletins de paie de tous les personnels actifs pour un mois (format AAAA-MM).",
    permission: "rh.gerer",
    parametres: P({ periode: { type: "string", description: "Mois AAAA-MM (ex: 2026-09)" } }, ["periode"]),
    executer: async (ctx, args) => {
      if (!/^\d{4}-\d{2}$/.test(String(args.periode))) return { erreur: "Format attendu : AAAA-MM." };
      return biz.genererBulletinsPaieCore(ctx as never, ctx.ecoleId!, String(args.periode));
    },
  },
  {
    nom: "stats_rh",
    description: "Pilotage RH : effectifs, masse salariale mensuelle, ancienneté, fins de contrats imminentes, congés en cours.",
    permission: "rh.gerer",
    parametres: P({}),
    executer: async (ctx) => biz.statsRhCore(ctx as never),
  },
  {
    nom: "situation_financiere",
    description: "Vue financière globale : total encaissé, restant dû, nombre de impayés, dépenses validées.",
    permission: "finances.voir",
    parametres: P({}),
    executer: async (ctx) => {
      const ecoleId = ctx.ecoleId!;
      const [paiements, eches, depenses] = await Promise.all([
        db.paiement.aggregate({ where: { ecoleId, annule: false }, _sum: { montant: true } }),
        db.echeanceFrais.findMany({ where: { eleve: { ecoleId, deletedAt: null }, statut: { in: ["impayee", "partiel"] } } }),
        db.depense.aggregate({ where: { ecoleId, validee: true, annulee: false }, _sum: { montant: true } }),
      ]);
      const restant = eches.reduce((s2, e) => s2 + (e.montant - e.remise - e.montantPaye), 0);
      return {
        totalEncaisseF: ((paiements._sum.montant ?? 0) / 100).toLocaleString("fr-FR") + " F",
        restantDuF: (restant / 100).toLocaleString("fr-FR") + " F",
        nbImpayes: eches.length,
        depensesValideesF: ((depenses._sum.montant ?? 0) / 100).toLocaleString("fr-FR") + " F",
      };
    },
  },
  {
    nom: "maj_avancement",
    description: "Met à jour le pourcentage de progression du programme pour une classe (qui suit son avancement).",
    permission: "notes.saisir",
    parametres: P({
      matiere: { type: "string", description: "Matière" },
      chapitre: { type: "string", description: "Titre du chapitre" },
      classe: { type: "string", description: "Libellé de la classe" },
      pourcentage: { type: "number", description: "0 à 100" },
    }, ["matiere", "chapitre", "classe", "pourcentage"]),
    executer: async (ctx, args) => {
      const classe = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: "insensitive" } } });
      if (!classe) return { erreur: "Classe introuvable." };
      const chap = await db.chapitre.findFirst({
        where: { titre: { contains: String(args.chapitre), mode: "insensitive" }, programme: { ecoleId: ctx.ecoleId!, matiere: { libelle: { contains: String(args.matiere), mode: "insensitive" } } } },
      });
      if (!chap) return { erreur: "Chapitre introuvable pour cette matière." };
      return biz.mettreAJourAvancementCore(ctx as never, chap.id, { classeId: classe.id, pourcentage: Math.max(0, Math.min(100, Number(args.pourcentage))) });
    },
  },

  {
    nom: "certificat_scolarite",
    description: "Génère le certificat de scolarité ou l attestation d inscription d un élève.",
    permission: "eleves.ecrire",
    parametres: P({
      eleve: { type: "string", description: "Nom de l élève" },
      type: { type: "string", enum: ["certificat_scolarite", "attestation_inscription"] },
    }, ["eleve", "type"]),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
      if (!el) return { erreur: "Élève introuvable." };
      return biz.genererAttestationCore(ctx as never, el.id, String(args.type) as "certificat_scolarite" | "attestation_inscription");
    },
  },
  {
    nom: "reinscrire_eleve",
    description: "Enregistre la réinscription d un élève pour l année en cours (classe souhaitée + suivi des frais).",
    permission: "eleves.ecrire",
    parametres: P({
      eleve: { type: "string", description: "Nom de l élève" },
      classe: { type: "string", description: "Classe souhaitée (optionnel)" },
      fraisPayes: { type: "boolean", description: "Frais de réinscription payés ?" },
    }, ["eleve"]),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, statut: "actif", AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
      if (!el) return { erreur: "Élève actif introuvable." };
      let classeVoulueId: string | undefined;
      if (args.classe) {
        const c = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: "insensitive" } } });
        classeVoulueId = c?.id;
      }
      return biz.enregistrerReinscriptionCore(ctx as never, { eleveId: el.id, classeVoulueId, fraisPayes: args.fraisPayes === true } as never);
    },
  },
  {
    nom: "enregistrer_retard",
    description: "Enregistre un retard d élève avec billet numéroté (alerte parents au 3e non justifié).",
    permission: "presences.saisir",
    parametres: P({
      eleve: { type: "string", description: "Nom de l élève" },
      dureeMinutes: { type: "number", description: "Durée en minutes (défaut 15)" },
      motif: { type: "string", description: "Motif (optionnel)" },
    }, ["eleve"]),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, AND: String(String(args.eleve)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
      if (!el) return { erreur: "Élève introuvable." };
      return biz.enregistrerRetardCore(ctx as never, { eleveId: el.id, dateHeure: new Date(), dureeMinutes: Number(args.dureeMinutes ?? 15), motif: args.motif ? String(args.motif) : undefined } as never);
    },
  },
  {
    nom: "stats_discipline",
    description: "Statistiques de discipline : incidents, retards, absences par classe + élèves à suivre.",
    permission: "vie_scolaire.gerer",
    parametres: P({ jours: { type: "number", description: "Période en jours (défaut 30)" } }),
    executer: async (ctx, args) => biz.statsDisciplineCore(ctx as never, Number(args.jours ?? 30)),
  },
];


// --------------------------------------------------------------------
// OUTILS CONFIGURATION v3 — l'IA configure l'école : classes, matières
// par niveau AVEC EXCEPTIONS, affectations granulaires, programmes
// annuels détaillés, règles de calcul des moyennes
// --------------------------------------------------------------------

const outilsConfiguration: OutilIA[] = [
  {
    nom: "creer_classes",
    description: "Crée plusieurs classes d'un coup pour un niveau (ex: niveau CE1, classes CE1-A et CE1-B). Accepte aussi plusieurs exemplaires.",
    permission: "admin.saas",
    parametres: P({
      niveau: { type: "string", description: "Code ou libellé du niveau (ex: CP, CE1, 6E, 2NDE)" },
      classes: { type: "string", description: "Noms des classes séparés par virgules (ex: CE1-A, CE1-B)" },
      capacite: { type: "number", description: "Capacité max (défaut 40)" },
    }, ["niveau", "classes"]),
    executer: async (ctx, args) => {
      const ecoleId = ctx.ecoleId!;
      const niv = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId } }, OR: [{ code: { contains: String(args.niveau).toUpperCase() } }, { libelle: { contains: String(args.niveau), mode: "insensitive" } }] } });
      if (!niv) return { erreur: `Niveau « ${args.niveau} » introuvable.` };
      const annee = await db.anneeScolaire.findFirst({ where: { ecoleId, active: true } });
      if (!annee) return { erreur: "Aucune année scolaire active." };
      const creees: string[] = [];
      const ignorees: string[] = [];
      for (const nomBrut of String(args.classes).split(",").map((x) => x.trim()).filter(Boolean)) {
        const code = nomBrut.toUpperCase();
        const existe = await db.classe.findFirst({ where: { ecoleId, anneeScolaireId: annee.id, code } });
        if (existe) { ignorees.push(code); continue; }
        await db.classe.create({ data: { ecoleId, anneeScolaireId: annee.id, niveauId: niv.id, code, libelle: nomBrut, capaciteMax: Number(args.capacite ?? 40) } });
        creees.push(nomBrut);
      }
      return { niveau: niv.libelle, creees, ignorees: ignorees.length ? ignorees : undefined };
    },
  },
  {
    nom: "modifier_classe",
    description: "Renomme une classe ou change sa capacité.",
    permission: "admin.saas",
    parametres: P({
      classe: { type: "string", description: "Nom actuel de la classe" },
      nouveauNom: { type: "string", description: "Nouveau nom (optionnel)" },
      capacite: { type: "number", description: "Nouvelle capacité (optionnelle)" },
    }, ["classe"]),
    executer: async (ctx, args) => {
      const c = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: "insensitive" } } });
      if (!c) return { erreur: "Classe introuvable." };
      const nom = args.nouveauNom ? String(args.nouveauNom) : c.libelle;
      const dbl = await db.classe.count({ where: { ecoleId: c.ecoleId, anneeScolaireId: c.anneeScolaireId, code: nom.toUpperCase(), NOT: { id: c.id } } });
      if (dbl > 0) return { erreur: `Une classe « ${nom} » existe déjà.` };
      await db.classe.update({ where: { id: c.id }, data: { code: nom.toUpperCase(), libelle: nom, ...(args.capacite ? { capaciteMax: Number(args.capacite) } : {}) } });
      return { classeId: c.id, nouveauNom: nom };
    },
  },
  {
    nom: "supprimer_classe_vide",
    description: "Supprime une classe UNIQUEMENT si elle est vide (refus si des élèves y sont inscrits).",
    permission: "admin.saas",
    parametres: P({ classe: { type: "string", description: "Nom de la classe" } }, ["classe"]),
    executer: async (ctx, args) => {
      const c = await db.classe.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.classe), mode: "insensitive" } } });
      if (!c) return { erreur: "Classe introuvable." };
      return biz.supprimerClasseCore(ctx as never, c.id);
    },
  },
  {
    nom: "creer_matieres",
    description: "Crée plusieurs matières d'un coup (ex: Français, Mathématiques, Dessin). Ignore celles qui existent déjà. Exemples de particularités gérées : l'utilisateur peut préciser des matières seulement pour certains niveaux — l'association niveau se fait via creer_programme.",
    permission: "admin.saas",
    parametres: P({
      matieres: { type: "string", description: "Liste séparée par virgules (ex: Français, Mathématiques, Éducation scientifique, Dessin)" },
      coefficients: { type: "string", description: "Optionnel : coefficients par matière « Français:2, Mathématiques:3 »" },
    }, ["matieres"]),
    executer: async (ctx, args) => {
      const ecoleId = ctx.ecoleId!;
      const coefs = new Map<string, number>();
      for (const paire of String(args.coefficients ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
        const [nom, c] = paire.split(":").map((x) => x.trim());
        if (nom && c) coefs.set(nom.toLowerCase(), Number(c));
      }
      const creees: string[] = [];
      const existantes: string[] = [];
      for (const libelle of String(args.matieres).split(",").map((x) => x.trim()).filter(Boolean)) {
        const existe = await db.matiere.findFirst({ where: { ecoleId, OR: [{ libelle: { equals: libelle, mode: "insensitive" } }, { libelle: { contains: libelle, mode: "insensitive" } }] } });
        if (existe) { existantes.push(libelle); continue; }
        const initiales = libelle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "MAT";
        const code = `${initiales}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
        await db.matiere.create({ data: { ecoleId, code, libelle, coefficient: coefs.get(libelle.toLowerCase()) ?? 1 } });
        creees.push(libelle);
      }
      return { creees, existantes };
    },
  },
  {
    nom: "creer_programme_annee",
    description: "Crée le programme annuel d'une matière pour un niveau AVEC tous ses chapitres (plan de l'année : chapitres ordonnés, avec périodes/trimestres et semaines). Exemple: chapitres 'Ch1 Les fractions:T1:sem3; Ch2 Les nombres décimaux:T1:sem6'.",
    permission: "notes.saisir",
    parametres: P({
      matiere: { type: "string", description: "Matière" },
      niveau: { type: "string", description: "Niveau (ex: 6E, CM1)" },
      intitule: { type: "string", description: "Intitulé du programme (défaut: Programme <matière> <niveau>)" },
      chapitres: { type: "string", description: "Chapitres séparés par points-virgules. Format par chapitre: 'Titre' OU 'Titre:Trimestre:Semaine' OU 'Titre:ordre'" },
    }, ["matiere", "niveau", "chapitres"]),
    executer: async (ctx, args) => {
      const ecoleId = ctx.ecoleId!;
      const mat = await db.matiere.findFirst({ where: { ecoleId, libelle: { contains: String(args.matiere), mode: "insensitive" } } });
      const niv = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId } }, OR: [{ code: { contains: String(args.niveau).toUpperCase() } }, { libelle: { contains: String(args.niveau), mode: "insensitive" } }] } });
      if (!mat || !niv) return { erreur: "Matière ou niveau introuvable. Créez la matière d'abord (creer_matieres)." };
      const intitule = args.intitule ? String(args.intitule) : `Programme ${mat.libelle} ${niv.libelle}`;
      const prog = await biz.creerProgrammeCore(ctx as never, ecoleId, { matiereId: mat.id, niveauId: niv.id, intitule } as never);
      const ajoutes: string[] = [];
      const items = String(args.chapitres).split(";").map((x) => x.trim()).filter(Boolean);
      let ordreAuto = 0;
      for (const item of items) {
        const parties = item.split(":").map((x) => x.trim());
        const titre = parties[0];
        const periode = parties.find((p) => /^T\d|S\d|trim|sem/i.test(p));
        const ordre = Number(parties.find((p) => /^\d+$/.test(p))) ?? ++ordreAuto;
        if (!Number.isInteger(Number(ordre))) { ordreAuto++; }
        // le core des chapitres ne stocke que titre+ordre : la période est
        // intégrée au titre pour rester visible partout (cahier, suivi)
        const titreComplet = periode ? `${titre} [${periode}]` : titre;
        await biz.ajouterChapitreCore(ctx as never, (prog as any).programmeId, { intitule: titreComplet, ordre: Number.isFinite(Number(ordre)) ? Number(ordre) : ++ordreAuto } as never);
        ajoutes.push(titreComplet);
      }
      return { programmeId: (prog as any).programmeId, intitule, chapitresAjoutes: ajoutes.length, detail: ajoutes };
    },
  },
  {
    nom: "affecter_enseignant",
    description: "Affecte un enseignant à une matière sur plusieurs classes, AVEC EXCEPTIONS. Ex: Jean Bernard enseigne le Français en 6e, 5e et 4e mais PAS en 3e → classes: 6E-A,5E-A,4E-A et sauf: 3E-A. Retourne les affectations créées.",
    permission: "edt.gerer",
    parametres: P({
      enseignant: { type: "string", description: "Nom de l enseignant" },
      matiere: { type: "string", description: "Matière" },
      classes: { type: "string", description: "Classes concernées, séparées par virgules (libellés ou codes, ex: 6E-A, 5E-A, 4E-A). Utiliser TOUS pour toutes les classes" },
      sauf: { type: "string", description: "Classes à EXCLURE, séparées par virgules (ex: 3E-A) — l exception granulaire" },
    }, ["enseignant", "matiere", "classes"]),
    executer: async (ctx, args) => {
      const ecoleId = ctx.ecoleId!;
      const pers = await db.personnel.findFirst({ where: { ecoleId, deletedAt: null, AND: String(String(args.enseignant)).trim().split(/\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] })) } });
      if (!pers) return { erreur: `Enseignant « ${args.enseignant} » introuvable.` };
      const mat = await db.matiere.findFirst({ where: { ecoleId, libelle: { contains: String(args.matiere), mode: "insensitive" } } });
      if (!mat) return { erreur: `Matière « ${args.matiere} » introuvable (créez-la avec creer_matieres).` };
      const toutes = await db.classe.findMany({ where: { ecoleId } });
      const resoudre = (liste: string) => String(liste).split(",").map((x) => x.trim()).filter(Boolean);
      let cibleNoms = resoudre(String(args.classes));
      const tout = cibleNoms.some((n) => /^tous|toutes$/i.test(n));
      let classes = tout ? toutes : toutes.filter((c) => cibleNoms.some((n) => c.libelle.toUpperCase().includes(n.toUpperCase()) || c.code.toUpperCase().includes(n.toUpperCase()) || n.toUpperCase().includes(c.code.toUpperCase())));
      const saufNoms = resoudre(String(args.sauf ?? ""));
      const exclusions = saufNoms.length ? toutes.filter((c) => saufNoms.some((n) => c.libelle.toUpperCase().includes(n.toUpperCase()) || c.code.toUpperCase().includes(n.toUpperCase()))) : [];
      const exclusIds = new Set(exclusions.map((c) => c.id));
      const classesFinales = classes.filter((c) => !exclusIds.has(c.id));
      if (classesFinales.length === 0) return { erreur: "Aucune classe correspondante." };
      const r = await biz.affecterEnseignantCore(ctx as never, {
        personnelId: pers.id, matiereId: mat.id,
        classeIds: classesFinales.map((c) => c.id),
        saufClasseIds: exclusions.map((c) => c.id),
      } as never);
      return {
        enseignant: `${pers.prenom} ${pers.nom}`, matiere: mat.libelle,
        classesDetail: classesFinales.map((c) => c.libelle),
        exceptions: exclusions.map((c) => c.libelle),
        affectationsCreees: (r as any).ajoutees ?? 0,
      };
    },
  },
  {
    nom: "voir_affectations",
    description: "Liste qui enseigne quelle matière dans quelles classes (les affectations configurées).",
    permission: "edt.gerer",
    parametres: P({}),
    executer: async (ctx) => {
      const affectations = await db.affectationEnseignant.findMany({
        where: { ecoleId: ctx.ecoleId! },
        include: { personnel: true, matiere: true, classe: true },
      });
      return affectations.map((a: any) => ({
        enseignant: `${a.personnel.prenom} ${a.personnel.nom}`, matiere: a.matiere.libelle, classe: a.classe.libelle,
      }));
    },
  },
  {
    nom: "regle_calcul_moyenne",
    description: "Définit les règles de calcul des moyennes pour un cycle (trimestriel/semestriel, mode chiffres ou compétences, note plancher, arrondi).",
    permission: "admin.saas",
    parametres: P({
      cycle: { type: "string", description: "Cycle (Maternelle, Primaire, Collège ou Lycée)" },
      mode: { type: "string", enum: ["chiffre", "competences"], description: "Notes chiffrées (secondaire) ou compétences (primaire/maternelle)" },
      notePlancher: { type: "number", description: "Note plancher 0-20 (optionnel)" },
      arrondi: { type: "number", description: "Décimales d arrondi 0-4 (défaut 2)" },
    }, ["cycle", "mode"]),
    executer: async (ctx, args) => {
      const cyc = await db.cycle.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.cycle), mode: "insensitive" } } });
      if (!cyc) return { erreur: `Cycle « ${args.cycle} » introuvable.` };
      await biz.majModeEvaluationCycleCore(ctx as never, cyc.id, String(args.mode));
      const regle = await biz.majRegleCalculCore(ctx as never, cyc.id, {
        ...(args.notePlancher !== undefined ? { notePlancher: Number(args.notePlancher) } : {}),
        ...(args.arrondi !== undefined ? { arrondi: Number(args.arrondi) } : {}),
      } as never);
      return { cycle: cyc.libelle, mode: String(args.mode), regleId: (regle as any).regleId };
    },
  },
];

export const CATALOGUE_IA: OutilIA[] = [...outilsLecture, ...outilsAction, ...outilsProfonds, ...outilsConfiguration];

/** Catalogue FILTRÉ par les permissions de la session (l'IA ne voit même pas les outils interdits). */
export function outilsPourSession(permissions: Set<string>): OutilIA[] {
  return CATALOGUE_IA.filter((t) => {
    if (Array.isArray(t.permission)) {
      return t.permission.some((p) => permissions.has(p));
    }
    return permissions.has(t.permission as string);
  });
}

/** Format OpenAI tools. */
export function versOutilsOpenAI(outils: OutilIA[]) {
  return outils.map((t) => ({
    type: 'function' as const,
    function: { name: t.nom, description: t.description, parameters: t.parametres as object },
  }));
}


