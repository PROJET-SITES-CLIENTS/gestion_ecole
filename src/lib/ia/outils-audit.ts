// ====================================================================
// OUTILS IA — AUDIT : salles (CRUD + affectation aux classes), tableau
// de bord d'absentéisme, relance des familles, dossier documentaire
// des élèves, publication des programmes. Mêmes guards que le reste
// du catalogue : permission requise + tenant vérifié dans les Core.
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';
import {
  modifierSalleCore, supprimerSalleCore, affecterSalleClasseCore,
  modifierProgrammeCore, statsAbsencesCore, notifierFamillesAbsencesCore,
} from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

/** Résout une salle par nom (insensible à la casse) pour l'école du contexte. */
async function resoudreSalle(ecoleId: string | null, nom: string) {
  if (!ecoleId) return null;
  return db.salle.findFirst({
    where: { ecoleId, OR: [{ nom: { equals: nom, mode: 'insensitive' } }, { nom: { contains: nom, mode: 'insensitive' } }] },
  });
}

/** Résout une classe par libellé/code pour l'école du contexte. */
async function resoudreClasse(ecoleId: string | null, nom: string) {
  if (!ecoleId) return null;
  return db.classe.findFirst({
    where: {
      ecoleId,
      OR: [
        { libelle: { equals: nom, mode: 'insensitive' } },
        { code: { equals: nom, mode: 'insensitive' } },
        { libelle: { contains: nom, mode: 'insensitive' } },
        { code: { contains: nom, mode: 'insensitive' } },
      ],
    },
    orderBy: { libelle: 'asc' },
  });
}

export const outilsAudit: OutilIA[] = [
  // ═══ SALLES ═══
  {
    nom: 'creer_salle',
    description: "Crée une salle (nom, type, capacité). Types : classe, labo, informatique, sport, polyvalente. Ex. : « crée la salle A12, classe, 45 places ».",
    permission: ['salles.gerer', 'edt.gerer'],
    parametres: P({
      nom: { type: 'string', description: 'Nom de la salle (ex. A12)' },
      type: { type: 'string', enum: ['classe', 'labo', 'informatique', 'sport', 'polyvalente'] },
      capacite: { type: 'number', description: 'Capacité en places' },
      equipements: { type: 'string', description: 'Équipements séparés par virgules (optionnel)' },
    }, ['nom', 'type', 'capacite']),
    executer: async (ctx, args) => {
      if (!ctx.ecoleId) return { erreur: 'Aucune école associée.' };
      const existante = await resoudreSalle(ctx.ecoleId, String(args.nom));
      if (existante) return { erreur: `Une salle nommée « ${existante.nom} » existe déjà.` };
      const s = await db.salle.create({
        data: {
          ecoleId: ctx.ecoleId,
          nom: String(args.nom).trim(),
          type: String(args.type ?? 'classe'),
          capacite: Number(args.capacite) || 30,
          equipements: args.equipements ? JSON.stringify(String(args.equipements).split(',').map((e) => e.trim()).filter(Boolean)) : '[]',
        },
      });
      return { ok: true, salleId: s.id, message: `Salle ${s.nom} créée (${s.type}, ${s.capacite} places).` };
    },
  },
  {
    nom: 'modifier_salle',
    description: "Modifie une salle (nom, type ou capacité). Ex. : « passe la salle A12 à 50 places ».",
    permission: ['salles.gerer', 'edt.gerer'],
    parametres: P({
      salle: { type: 'string', description: 'Nom de la salle à modifier' },
      nouveauNom: { type: 'string', description: 'Nouveau nom (optionnel)' },
      nouveauType: { type: 'string', enum: ['classe', 'labo', 'informatique', 'sport', 'polyvalente'], description: 'Nouveau type (optionnel)' },
      nouvelleCapacite: { type: 'number', description: 'Nouvelle capacité (optionnel)' },
    }, ['salle']),
    executer: async (ctx, args) => {
      const s = await resoudreSalle(ctx.ecoleId, String(args.salle));
      if (!s) return { erreur: 'Salle introuvable.' };
      const r = await modifierSalleCore(ctx, s.id, {
        nom: args.nouveauNom ? String(args.nouveauNom) : undefined,
        type: args.nouveauType ? String(args.nouveauType) : undefined,
        capacite: args.nouvelleCapacite != null ? Number(args.nouvelleCapacite) : undefined,
      });
      return { ok: true, ...r, message: `Salle ${args.nouveauNom ?? s.nom} mise à jour.` };
    },
  },
  {
    nom: 'supprimer_salle',
    description: "Supprime une salle inutilisée. Refusé si des réservations, séances ou créneaux d'emploi du temps l'utilisent.",
    permission: ['salles.gerer', 'edt.gerer'],
    parametres: P({ salle: { type: 'string', description: 'Nom de la salle' } }, ['salle']),
    executer: async (ctx, args) => {
      const s = await resoudreSalle(ctx.ecoleId, String(args.salle));
      if (!s) return { erreur: 'Salle introuvable.' };
      const r = await supprimerSalleCore(ctx, s.id);
      return { ok: true, ...r, message: `Salle ${s.nom} supprimée.` };
    },
  },
  {
    nom: 'affecter_salle_classe',
    description: "Affecte (ou retire) la salle principale d'une classe. Ex. : « affecte la salle A12 à la classe Sixième A » ou « retire la salle de la 6A ».",
    permission: ['salles.gerer', 'edt.gerer'],
    parametres: P({
      classe: { type: 'string', description: 'Libellé ou code de la classe (ex. 6A ou Sixième A)' },
      salle: { type: 'string', description: 'Nom de la salle à affecter — laisser vide pour retirer' },
    }, ['classe']),
    executer: async (ctx, args) => {
      const c = await resoudreClasse(ctx.ecoleId, String(args.classe));
      if (!c) return { erreur: 'Classe introuvable.' };
      let salleId: string | null = null;
      let nomSalle = 'aucune';
      if (args.salle) {
        const s = await resoudreSalle(ctx.ecoleId, String(args.salle));
        if (!s) return { erreur: 'Salle introuvable.' };
        salleId = s.id;
        nomSalle = s.nom;
      }
      const r = await affecterSalleClasseCore(ctx, c.id, salleId);
      return {
        ok: true, ...r,
        message: `Salle principale de ${c.libelle} : ${nomSalle}.` + (r.avertissement.length > 0 ? ` Attention : ${r.avertissement.join(' ; ')}.` : ''),
      };
    },
  },
  {
    nom: 'voir_salles_classes',
    description: "Liste les salles avec, pour chacune, la classe qui lui est attribuée (salle principale), et les classes sans salle.",
    permission: ['salles.gerer', 'edt.gerer', 'eleves.lire'],
    parametres: P({}),
    executer: async (ctx) => {
      const salles = await db.salle.findMany({
        where: { ecoleId: ctx.ecoleId! },
        include: { classesAttribuees: { include: { niveau: true } } },
        orderBy: { nom: 'asc' },
      });
      return {
        salles: salles.map((s) => ({
          nom: s.nom, type: s.type, capacite: s.capacite,
          classesAttribuees: s.classesAttribuees.map((c) => c.libelle),
        })),
      };
    },
  },

  // ═══ ABSENTÉISME ═══
  {
    nom: 'stats_absenteisme',
    description: "Tableau de bord complet de l'absentéisme cumulé sur une période : taux global, tendance, courbe journalière, cumul hebdomadaire, taux par classe, répartition garçons/filles, top élèves absents (avec justifiées) et top assiduité. Ex. : « quels sont les élèves les plus absents ce trimestre ? ».",
    permission: ['vie_scolaire.gerer', 'presences.saisir'],
    parametres: P({
      fenetreJours: { type: 'number', description: 'Fenêtre en jours : 7, 30, 60, 90 (trimestre) ou 365 (année). Défaut 30.' },
    }),
    executer: async (ctx, args) => {
      const jours = Number(args.fenetreJours) || 30;
      return statsAbsencesCore(ctx, jours);
    },
  },
  {
    nom: 'notifier_familles_absences',
    description: "Notifie les parents (notification in-app) des élèves dépassant le seuil d'absences NON justifiées sur la période, et la direction. Ex. : « préviens les familles des élèves ayant plus de 3 absences non justifiées ce mois ».",
    permission: ['vie_scolaire.gerer', 'presences.saisir'],
    parametres: P({
      seuilAbsences: { type: 'number', description: 'Seuil d\'absences non justifiées (défaut 3)' },
      fenetreJours: { type: 'number', description: 'Fenêtre en jours (défaut 30)' },
    }),
    executer: async (ctx, args) => {
      const r = await notifierFamillesAbsencesCore(ctx, Number(args.seuilAbsences) || 3, Number(args.fenetreJours) || 30);
      return { ...r, message: `${r.famillesNotifiées} famille(s) notifiée(s) pour ${r.élèvesConcernés} élève(s) au-dessus du seuil.` };
    },
  },

  // ═══ DOSSIER DOCUMENTAIRE ═══
  {
    nom: 'lister_documents_eleve',
    description: "Liste les pièces du dossier d'un élève : pièces exigées avec leur statut (reçue/manquante) ET fichiers numériques importés (acte de naissance, certificat médical…). Ex. : « le dossier de Awa Diop est-il complet ? ».",
    permission: ['eleves.lire', 'eleves.ecrire'],
    parametres: P({ eleve: { type: 'string', description: 'Nom, prénom ou matricule de l\'élève' } }, ['eleve']),
    executer: async (ctx, args) => {
      const q = String(args.eleve).trim();
      const eleve = await db.eleve.findFirst({
        where: {
          ecoleId: ctx.ecoleId!, deletedAt: null,
          OR: [
            { matricule: { equals: q, mode: 'insensitive' } },
            { nom: { contains: q, mode: 'insensitive' } },
            { prenom: { contains: q, mode: 'insensitive' } },
          ],
        },
      });
      if (!eleve) return { erreur: 'Élève introuvable.' };
      const [pieces, documents] = await Promise.all([
        db.pieceDossier.findMany({ where: { eleveId: eleve.id } }),
        db.documentEleve.findMany({
          where: { eleveId: eleve.id },
          select: { id: true, type: true, nomFichier: true, mimeType: true, tailleOctets: true, dateAjout: true },
        }),
      ]);
      const manquantes = pieces.filter((p) => p.statut !== 'recue');
      return {
        eleve: `${eleve.prenom} ${eleve.nom}`,
        complet: pieces.length > 0 && manquantes.length === 0,
        pieces: pieces.map((p) => ({ type: p.type, statut: p.statut, recueLe: p.dateReception })),
        piecesManquantes: manquantes.map((p) => p.type),
        fichiersImportes: documents,
        conseil: documents.length === 0 && pieces.length > 0
          ? "Aucun fichier numérique importé — les pièces sont seulement cochées reçues. L'import se fait depuis la fiche élève → Dossier → « Importer un fichier »."
          : undefined,
      };
    },
  },

  // ═══ PROGRAMMES ═══
  {
    nom: 'modifier_programme',
    description: "Modifie un programme pédagogique (intitulé, objectifs, volume horaire, publication). Ex. : « publie le programme de maths de la 6e ».",
    permission: 'notes.saisir',
    parametres: P({
      programme: { type: 'string', description: 'Titre du programme (ou début du titre)' },
      nouveauTitre: { type: 'string', description: 'Nouvel intitulé (optionnel)' },
      objectifs: { type: 'string', description: 'Objectifs (optionnel)' },
      volumeHorairePrevu: { type: 'number', description: 'Volume horaire annuel en heures (optionnel)' },
      publier: { type: 'boolean', description: 'true = publier aux enseignants et familles ; false = brouillon' },
    }, ['programme']),
    executer: async (ctx, args) => {
      const q = String(args.programme).trim();
      const prog = await db.programme.findFirst({
        where: { ecoleId: ctx.ecoleId!, titre: { contains: q, mode: 'insensitive' } },
      });
      if (!prog) return { erreur: 'Programme introuvable.' };
      const r = await modifierProgrammeCore(ctx, prog.id, {
        titre: args.nouveauTitre ? String(args.nouveauTitre) : undefined,
        objectifs: args.objectifs != null ? String(args.objectifs) : undefined,
        volumeHorairePrevu: args.volumeHorairePrevu != null ? Number(args.volumeHorairePrevu) : undefined,
        publie: args.publier != null ? Boolean(args.publier) : undefined,
      });
      return { ok: true, ...r, message: `Programme « ${prog.titre} » mis à jour${args.publier != null ? (args.publier ? ' et publié' : ' (brouillon)') : ''}.` };
    },
  },
];
