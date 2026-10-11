// ====================================================================
// OUTILS IA — ORPHELINS FINAUX (8e module)
// Dernières capacités métier sans outil : bulletin d'UN élève, activation
// 2FA par un admin, comparaison budget prévu/réalisé, présence aux
// conseils, taux d'occupation internat, exports FEC/balance, sections.
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';
import { resoudreEleve, resoudrePersonnel } from './resolution';
import * as biz from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

export const outilsIaOrphelins: OutilIA[] = [
  {
    nom: 'generer_bulletin_eleve',
    description: "Génère le bulletin d'UN élève pour une période (classe déduite de son affectation).",
    permission: ['notes.saisir', 'bulletins.valider'],
    parametres: P({
      eleve: { type: 'string' }, periode: { type: 'string', description: 'Période (ex: Trimestre 1)' },
    }, ['eleve', 'periode']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const periode = await db.periode.findFirst({ where: { anneeScolaire: { ecoleId: ctx.ecoleId!, active: true }, libelle: { contains: String(args.periode), mode: 'insensitive' } } });
      if (!periode) return { erreur: `Période « ${args.periode} » introuvable.` };
      const eleve = await db.eleve.findUnique({ where: { id: re.entite.id }, select: { classeActuelleId: true } });
      if (!eleve?.classeActuelleId) return { erreur: 'Cet élève n\'a pas de classe actuelle.' };
      return biz.genererBulletinCore(ctx as never, { eleveId: re.entite.id, periodeId: periode.id, classeId: eleve.classeActuelleId } as never);
    },
  },
  {
    nom: 'activer_2fa_utilisateur',
    description: "Active l'exigence 2FA pour un compte (par email) — sécurité renforcée à la prochaine connexion.",
    permission: ['securite.gerer', 'admin.saas'],
    parametres: P({ email: { type: 'string', description: 'Email du compte' } }, ['email']),
    executer: async (ctx, args) => {
      const u = await db.utilisateur.findFirst({ where: { email: String(args.email).toLowerCase(), deletedAt: null } });
      if (!u) return { erreur: `Compte « ${args.email} » introuvable.` };
      return biz.activer2FAPourUtilisateurCore(ctx as never, u.id);
    },
  },
  {
    nom: 'comparer_budget_ia',
    description: "Compare un budget prévisionnel à son réalisé (prévu vs réalisé par poste, recalculé depuis les écritures).",
    permission: 'finances.voir',
    parametres: P({ budget: { type: 'string', description: 'Libellé du budget' } }, ['budget']),
    executer: async (ctx, args) => {
      const budget = await db.budget.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.budget), mode: 'insensitive' } } });
      if (!budget) return { erreur: `Budget « ${args.budget} » introuvable.` };
      return biz.comparerBudgetCore(ctx as never, budget.id);
    },
  },
  {
    nom: 'marquer_presence_conseil',
    description: "Pointe la présence (ou l'absence) d'un membre à un conseil de classe.",
    permission: ['bulletins.valider', 'admin.saas'],
    parametres: P({
      conseilId: { type: 'string' }, membre: { type: 'string', description: 'Nom du membre (personnel)' },
      present: { type: 'boolean' },
    }, ['conseilId', 'membre', 'present']),
    executer: async (ctx, args) => {
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.membre));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      return biz.marquerPresenceConseilCore(ctx as never, String(args.conseilId), rp.entite.id, args.present === true);
    },
  },
  {
    nom: 'taux_occupation_internat',
    description: "Taux d'occupation de l'internat (lits occupés/disponibles par chambre).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({}),
    executer: async (ctx) => biz.tauxOccupationInternatCore(ctx as never),
  },
  {
    nom: 'export_compta_csv_ia',
    description: "Export comptable pour l'expert-comptable : FEC (écritures validées entre 2 dates) ou balance CSV. Retourne un aperçu + le contenu complet.",
    permission: 'finances.voir',
    parametres: P({
      type: { type: 'string', enum: ['fec', 'balance'] },
      du: { type: 'string', description: 'AAAA-MM-JJ (FEC, défaut 1er janvier)' },
      au: { type: 'string', description: 'AAAA-MM-JJ (FEC, défaut aujourd\'hui)' },
    }, ['type']),
    executer: async (ctx, args) => {
      if (args.type === 'fec') {
        const debut = args.du ? new Date(String(args.du)) : new Date(new Date().getFullYear(), 0, 1);
        const fin = args.au ? new Date(String(args.au)) : new Date();
        const r = await biz.genererFecCore(ctx as never, debut, fin);
        const lignes = r.csv.split('\r\n');
        return { type: 'fec', nbEcritures: r.nbEcritures, nbLignes: lignes.length - 1, apercu: lignes.slice(0, 4).join('\n'), note: 'FEC complet généré — transmettez-le à l\'expert-comptable.' };
      }
      const r = await biz.genererBalanceCsvCore(ctx as never, 'toutes');
      const lignes = r.csv.split('\r\n');
      return { type: 'balance', nbLignes: lignes.length - 1, apercu: lignes.slice(0, 6).join('\n'), note: 'Balance complète générée.' };
    },
  },
  {
    nom: 'lister_sections_compta',
    description: "Liste les sections comptables de l'école (unique ou primaire/secondaire séparées).",
    permission: 'finances.voir',
    parametres: P({}),
    executer: async (ctx) => biz.listerSectionsCore(ctx as never),
  },
];
