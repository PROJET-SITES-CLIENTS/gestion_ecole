// ====================================================================
// OUTILS IA — PARCOURS ENSEIGNANT COMPLET (contrôle total)
// Complète le catalogue : mes classes, RDV parents-professeurs, dispenses.
// Même discipline anti-amalgame : résolution stricte (exact → unique →
// candidats), l'enseignant connecté est TOUJOURS la référence serveur.
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';
import { resoudreClasse, resoudreMatiere, resoudreEleveSiPresent } from './resolution';
import * as biz from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

/** Personnel connecté (profil enseignant). */
async function moi(ctx: any) {
  return db.personnel.findFirst({ where: { utilisateurId: ctx.utilisateurId, deletedAt: null } });
}

export const outilsEnseignant: OutilIA[] = [
  // ═══ MES CLASSES (vue enseignant) ═══
  {
    nom: 'mes_classes',
    description: "Liste MES classes (celles où j'enseigne) avec effectifs garçons/filles, mes matières par classe et l'avancement moyen de chaque programme. Répond à « quelles sont mes classes ? ».",
    permission: ['eleves.lire', 'notes.saisir'],
    parametres: P({}),
    executer: async (ctx) => {
      const pers = await moi(ctx);
      if (!pers) return { erreur: 'Aucun profil enseignant associé à votre compte.' };
      const affectations = await db.affectationEnseignant.findMany({
        where: { personnelId: pers.id },
        include: { classe: { include: { niveau: true } }, matiere: true },
      });
      const parClasse = new Map<string, { classe: string; niveau: string; matieres: string[] }>();
      for (const a of affectations) {
        const cur = parClasse.get(a.classeId) ?? { classe: a.classe.libelle, niveau: a.classe.niveau?.libelle ?? '', matieres: [] };
        if (a.matiere && !cur.matieres.includes(a.matiere.libelle)) cur.matieres.push(a.matiere.libelle);
        parClasse.set(a.classeId, cur);
      }
      const classes = await Promise.all([...parClasse.entries()].map(async ([classeId, info]) => {
        const [eleves, progs] = await Promise.all([
          db.eleve.findMany({ where: { classeActuelleId: classeId, deletedAt: null, statut: 'actif' }, select: { sexe: true } }),
          db.programme.findMany({ where: { ecoleId: ctx.ecoleId!, niveauId: (await db.classe.findUnique({ where: { id: classeId }, select: { niveauId: true } }))!.niveauId }, include: { chapitres: { include: { avancements: { where: { classeId } } } } } }),
        ]);
        const avancementParMatiere: Record<string, number> = {};
        for (const pr of progs) {
          const chaps = pr.chapitres ?? [];
          if (chaps.length > 0) {
            const pct = Math.round(chaps.reduce((s, c) => s + (c.avancements[0]?.pourcentage ?? 0), 0) / chaps.length);
            avancementParMatiere[pr.matiereId] = pct;
          }
        }
        return {
          ...info,
          effectif: eleves.length,
          garcons: eleves.filter((e) => e.sexe === 'M').length,
          filles: eleves.filter((e) => e.sexe === 'F').length,
          avancementProgrammes: Object.fromEntries(Object.entries(avancementParMatiere).map(([mid, pct]) => [info.matieres.find((m) => m) ?? mid, pct])),
        };
      }));
      return { enseignant: `${pers.prenom} ${pers.nom}`, nbClasses: classes.length, classes };
    },
  },

  // ═══ RDV PARENTS-PROFESSEURS ═══
  {
    nom: 'mes_rdvs',
    description: "Mes créneaux de RDV parents-professeurs : disponibles, réservés par les parents (avec nom du parent et élève concerné) et passés.",
    permission: ['eleves.lire', 'notes.saisir', 'communication.envoyer'],
    parametres: P({}),
    executer: async (ctx) => {
      const pers = await moi(ctx);
      if (!pers) return { erreur: 'Aucun profil enseignant associé à votre compte.' };
      const [creneaux, rdvs, reunions] = await Promise.all([
        db.creneauRdv.findMany({ where: { personnelId: pers.id }, orderBy: { date: 'desc' }, take: 50 }),
        db.rdv.findMany({
          where: { creneauRdv: { personnelId: pers.id } },
          orderBy: { createdAt: 'desc' }, take: 50,
          include: { parent: true, eleve: true, creneauRdv: true },
        }),
        db.reunionCollective.findMany({
          where: { classe: { ecoleId: ctx.ecoleId!, affectationsEnseignant: { some: { personnelId: pers.id } } } },
          orderBy: { date: 'asc' }, include: { classe: true }, take: 20,
        }),
      ]);
      const maintenant = new Date();
      return {
        creneauxDisponibles: creneaux.filter((c) => c.statut === 'disponible' && c.date >= maintenant).map((c) => `${c.date.toISOString().slice(0, 10)} ${c.heureDebut}–${c.heureFin}`),
        reservations: rdvs.map((r) => ({
          date: r.creneauRdv ? `${r.creneauRdv.date.toISOString().slice(0, 10)} ${r.creneauRdv.heureDebut}` : '?',
          parent: r.parent ? `${r.parent.prenom ?? ''} ${r.parent.nom ?? ''}`.trim() : '—',
          eleve: r.eleve ? `${r.eleve.prenom} ${r.eleve.nom}` : '—',
          statut: r.statut,
        })),
        reunionsCollectives: reunions.map((r) => `${r.classe?.libelle} — ${r.date.toISOString().slice(0, 10)} ${r.heure}${r.description ? ` (${r.description.slice(0, 50)})` : ''}`),
      };
    },
  },
  {
    nom: 'ouvrir_creneaux_rdv',
    description: "Ouvre un ou PLUSIEURS créneaux de RDV parents-professeurs à MON nom (ex: « ouvre des créneaux jeudi de 16h à 18h toutes les 15 minutes » → date=jeudi, de=16:00, à=18:00, durée=15). Les parents pourront ensuite les réserver.",
    permission: ['communication.envoyer', 'eleves.lire'],
    parametres: P({
      date: { type: 'string', description: 'Date ISO (ex: 2026-10-08)' },
      de: { type: 'string', description: 'Heure début (ex: 16:00)' },
      a: { type: 'string', description: 'Heure fin (ex: 18:00)' },
      duree: { type: 'number', description: 'Durée de chaque créneau en minutes (ex: 15)' },
      lieu: { type: 'string', description: 'Lieu (optionnel, ex: salle 12)' },
    }, ['date', 'de', 'a', 'duree']),
    executer: async (ctx, args) => {
      const pers = await moi(ctx);
      if (!pers) return { erreur: 'Aucun profil enseignant associé à votre compte.' };
      const jour = new Date(String(args.date) + 'T00:00:00');
      if (isNaN(jour.getTime())) return { erreur: 'Date invalide (format attendu : 2026-10-08).' };
      const [h1, m1] = String(args.de).split(':').map(Number);
      const [h2, m2] = String(args.a).split(':').map(Number);
      const duree = Number(args.duree);
      if (!Number.isFinite(h1) || !Number.isFinite(h2) || !(duree > 0)) return { erreur: 'Heures ou durée invalides.' };
      let minutes = h1 * 60 + (m1 || 0);
      const fin = h2 * 60 + (m2 || 0);
      if (fin <= minutes) return { erreur: 'L\'heure de fin doit être après l\'heure de début.' };
      const crees: string[] = [];
      while (minutes + duree <= fin) {
        const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const heureDebut = hh(minutes);
        const heureFin = hh(minutes + duree);
        await db.creneauRdv.create({
          data: { personnelId: pers.id, date: jour, heureDebut, heureFin, statut: 'disponible', lieu: 'presentiel' },
        });
        crees.push(`${heureDebut}–${heureFin}`);
        minutes += duree;
      }
      await db.auditLog.create({ data: { ecoleId: ctx.ecoleId!, utilisateurId: ctx.utilisateurId, action: 'ia.ouvrir_creneaux_rdv', cibleType: 'creneau_rdv', details: { crees: crees.length } as any } }).catch(() => undefined);
      return { ouverts: crees.length, creneaux: crees, date: String(args.date), message: `${crees.length} créneau(x) ouvert(s) le ${String(args.date)} — les parents peuvent désormais réserver.` };
    },
  },

  // ═══ DISPENSES ═══
  {
    nom: 'creer_dispense',
    description: "Enregistre une dispense (sport, activité) pour un élève avec motif et dates — l'élève est identifié sans ambiguïté dans l'école (candidats listés si homonymes).",
    permission: ['vie_scolaire.gerer', 'notes.saisir'],
    parametres: P({
      eleve: { type: 'string', description: 'Nom/prénom de l’élève' },
      motif: { type: 'string', description: 'Motif (ex: certificat médical)' },
      dureeJours: { type: 'number', description: 'Durée en jours (défaut 7)' },
      matiere: { type: 'string', description: 'Matière concernée (optionnel, ex: EPS)' },
    }, ['eleve', 'motif']),
    executer: async (ctx, args) => {
      const re = await resoudreEleveSiPresent(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      let matiereId: string | undefined;
      if (args.matiere) {
        const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
        if (!rm.trouve) return { erreur: rm.erreur, candidats: rm.candidats };
        matiereId = rm.entite.id;
      }
      const duree = Number(args.dureeJours ?? 7);
      const debut = new Date();
      const fin = new Date(Date.now() + duree * 86400000);
      const motifBrut = String(args.motif).toLowerCase();
      const motif = ['medical', 'sportif', 'religieux'].find((m) => motifBrut.includes(m)) ?? 'autre';
      const r = await biz.creerDispenseCore(ctx as never, {
        eleveId: re.entite.id, motif, description: String(args.motif), dateDebut: debut, dateFin: fin,
        ...(matiereId ? { matiereId } : {}),
      } as never);
      return { ...r, eleve: `${re.entite.prenom} ${re.entite.nom}`, du: debut.toISOString().slice(0, 10), au: fin.toISOString().slice(0, 10) };
    },
  },
];
