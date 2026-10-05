// ====================================================================
// OUTILS IA — SECRÉTARIAT COMPLET (CRUD total, résolution chirurgicale)
// Admissions (créer/avancer/tester/convertir), suppressions manquantes
// (document, courrier, pièce exigée, réinscription), visiteurs (sortie),
// réunions collectives, relances impayés, effectifs par niveau.
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';
import { resoudreClasse, resoudreMatiere, resoudreEleve, normaliser } from './resolution';
import * as biz from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

/** Résolution stricte d'une candidature par nom (exact → unique → candidats). */
async function resoudreCandidature(ecoleId: string | null, q: string) {
  if (!ecoleId) return { trouve: false as const, erreur: 'Aucune école associée.', candidats: [] as string[] };
  const toutes = await db.candidatureAdmission.findMany({
    where: { ecoleId },
    include: { niveau: { select: { libelle: true } } },
    orderBy: { dateSoumission: 'desc' },
  });
  const lib = (c: any) => `${c.prenom} ${c.nom} (${c.niveau?.libelle ?? '?'} · ${c.statut})`;
  const qN = normaliser(q);
  if (!qN) return { trouve: false as const, erreur: 'Nom requis.', candidats: [] };
  const exactes = toutes.filter((c) => normaliser(`${c.prenom} ${c.nom}`) === qN || normaliser(`${c.nom} ${c.prenom}`) === qN);
  if (exactes.length === 1) return { trouve: true as const, entite: exactes[0] };
  const partiels = toutes.filter((c) => normaliser(`${c.prenom} ${c.nom}`).includes(qN) || qN.includes(normaliser(`${c.prenom} ${c.nom}`)));
  if (partiels.length === 1) return { trouve: true as const, entite: partiels[0] };
  if (exactes.length > 1 || partiels.length > 1) {
    const cands = (exactes.length >= partiels.length && exactes.length > 0 ? exactes : partiels).map(lib).slice(0, 6);
    return { trouve: false as const, erreur: `Plusieurs candidatures correspondent à « ${q} » : ${cands.join(' ; ')}. Précisez.`, candidats: cands };
  }
  return { trouve: false as const, erreur: `Candidature « ${q} » introuvable. Candidatures récentes : ${toutes.slice(0, 8).map(lib).join(' ; ') || 'aucune'}`, candidats: [] };
}

export const outilsSecretariatFull: OutilIA[] = [
  // ═══ ADMISSIONS ═══
  {
    nom: 'creer_candidature',
    description: "Enregistre une candidature d'admission (nom, prénom, naissance, niveau demandé, parent). Workflow ensuite : test → entretien → admis/refusé → inscrit.",
    permission: ['eleves.ecrire', 'secretariat.gerer'],
    parametres: P({
      nom: { type: 'string', description: 'Nom' }, prenom: { type: 'string', description: 'Prénom' },
      dateNaissance: { type: 'string', description: 'Date ISO (ex: 2013-05-05)' },
      niveau: { type: 'string', description: 'Niveau demandé (ex: 6E, CP, 2NDE)' },
      parentNom: { type: 'string', description: 'Nom du parent (optionnel)' },
      parentTelephone: { type: 'string', description: 'Téléphone parent (optionnel)' },
      email: { type: 'string', description: 'Email contact (optionnel)' },
    }, ['nom', 'prenom', 'dateNaissance', 'niveau']),
    executer: async (ctx, args) => {
      const niveau = await db.niveau.findFirst({
        where: { section: { cycle: { ecoleId: ctx.ecoleId! } }, OR: [{ code: { equals: String(args.niveau).toUpperCase() } }, { libelle: { contains: String(args.niveau), mode: 'insensitive' } }] },
      });
      if (!niveau) return { erreur: `Niveau « ${args.niveau} » introuvable.` };
      const d = new Date(String(args.dateNaissance));
      if (isNaN(d.getTime())) return { erreur: 'Date de naissance invalide (format 2013-05-05).' };
      const r = await biz.creerCandidatureAdmissionCore(ctx as never, ctx.ecoleId!, {
        nom: String(args.nom), prenom: String(args.prenom), dateNaissance: d, niveauId: niveau.id,
        ...(args.parentNom ? { parentNom: String(args.parentNom) } : {}),
        ...(args.parentTelephone ? { parentTelephone: String(args.parentTelephone) } : {}),
        ...(args.email ? { email: String(args.email) } : {}),
      } as never);
      return { ...r, niveau: niveau.libelle, message: `Candidature de ${args.prenom} ${args.nom} enregistrée en ${niveau.libelle} — prochaine étape : test d'admission.` };
    },
  },
  {
    nom: 'avancer_candidature',
    description: "Fait avancer une candidature dans le workflow : test, entretien, admis ou refuse.",
    permission: ['eleves.ecrire', 'secretariat.gerer'],
    parametres: P({
      candidat: { type: 'string', description: 'Nom/prénom du candidat' },
      statut: { type: 'string', enum: ['test', 'entretien', 'admis', 'refuse'], description: 'Nouveau statut' },
    }, ['candidat', 'statut']),
    executer: async (ctx, args) => {
      const rc = await resoudreCandidature(ctx.ecoleId, String(args.candidat));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const r = await biz.avancerCandidatureAdmissionCore(ctx as never, rc.entite.id, String(args.statut) as never);
      return { ...r, candidat: `${rc.entite.prenom} ${rc.entite.nom}`, statut: String(args.statut) };
    },
  },
  {
    nom: 'saisir_test_admission',
    description: "Enregistre la note d'un test d'admission d'un candidat (matière, note sur 20, appréciation).",
    permission: ['eleves.ecrire', 'secretariat.gerer'],
    parametres: P({
      candidat: { type: 'string', description: 'Nom/prénom du candidat' },
      matiere: { type: 'string', description: 'Matière du test' },
      note: { type: 'number', description: 'Note (sur 20)' },
      appreciation: { type: 'string', description: 'Appréciation (optionnelle)' },
    }, ['candidat', 'matiere', 'note']),
    executer: async (ctx, args) => {
      const rc = await resoudreCandidature(ctx.ecoleId, String(args.candidat));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!rm.trouve) return { erreur: rm.erreur, candidats: rm.candidats };
      const r = await biz.saisirTestAdmissionCore(ctx as never, rc.entite.id, {
        matiere: rm.entite.libelle, note: Number(args.note), sur: 20,
        ...(args.appreciation ? { appreciation: String(args.appreciation) } : {}),
      } as never);
      return { ...r, candidat: `${rc.entite.prenom} ${rc.entite.nom}`, matiere: rm.entite.libelle, note: Number(args.note) };
    },
  },
  {
    nom: 'convertir_candidature',
    description: "Inscrit définitivement un candidat ADMIS comme élève dans la classe choisie — matricule attribué, checklist de dossier créée, parent rattaché automatiquement.",
    permission: ['eleves.ecrire', 'secretariat.gerer'],
    parametres: P({
      candidat: { type: 'string', description: 'Nom/prénom du candidat (statut « admis » requis)' },
      classe: { type: 'string', description: 'Classe d’affectation (ex: 6ème A)' },
    }, ['candidat', 'classe']),
    executer: async (ctx, args) => {
      const rc = await resoudreCandidature(ctx.ecoleId, String(args.candidat));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      if (rc.entite.statut !== 'admis') {
        return { erreur: `Ce candidat est au statut « ${rc.entite.statut} » — il doit d’abord être admis (avancer_candidature statut=admis).` };
      }
      const rCl = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rCl.trouve) return { erreur: rCl.erreur, candidats: rCl.candidats };
      const r = await biz.convertirAdmissionCore(ctx as never, rc.entite.id, rCl.entite.id);
      return { ...r, message: `${rc.entite.prenom} ${rc.entite.nom} est inscrit(e) en ${rCl.entite.libelle} — matricule et dossier initialisés.` };
    },
  },
  {
    nom: 'lister_candidatures',
    description: "Liste les candidatures d'admission avec leur statut (soumis/test/entretien/admis/refuse/inscrit).",
    permission: ['eleves.ecrire', 'secretariat.gerer', 'eleves.lire'],
    parametres: P({ statut: { type: 'string', description: 'Filtre statut (optionnel)' } }),
    executer: async (ctx, args) => {
      const liste = await db.candidatureAdmission.findMany({
        where: { ecoleId: ctx.ecoleId!, ...(args.statut ? { statut: String(args.statut) } : {}) },
        include: { niveau: { select: { libelle: true } } },
        orderBy: { dateSoumission: 'desc' },
        take: 30,
      });
      return { total: liste.length, candidatures: liste.map((c: any) => ({ candidat: `${c.prenom} ${c.nom}`, niveau: c.niveau?.libelle ?? '?', statut: c.statut, soumisLe: c.dateSoumission.toISOString().slice(0, 10) })) };
    },
  },

  // ═══ SUPPRESSIONS ═══
  {
    nom: 'supprimer_document_eleve',
    description: "Supprime un fichier importé au dossier d'un élève (saisie erronée) — l'élève est résolu strictement, le fichier identifié par son nom.",
    permission: ['eleves.ecrire', 'secretariat.gerer'],
    parametres: P({ eleve: { type: 'string', description: 'Nom/prénom de l’élève' }, nomFichier: { type: 'string', description: 'Nom du fichier à supprimer' } }, ['eleve', 'nomFichier']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const docs = await db.documentEleve.findMany({ where: { eleveId: re.entite.id, nomFichier: { not: null } }, select: { id: true, nomFichier: true } });
      const qN = normaliser(String(args.nomFichier));
      const exact = docs.filter((d) => normaliser(d.nomFichier ?? '') === qN);
      const partiel = docs.filter((d) => normaliser(d.nomFichier ?? '').includes(qN));
      const doc = exact.length === 1 ? exact[0] : (exact.length === 0 && partiel.length === 1 ? partiel[0] : null);
      if (!doc) {
        return { erreur: docs.length === 0 ? 'Aucun fichier importé pour cet élève.' : `Fichier ambigu ou introuvable. Fichiers : ${docs.map((d) => d.nomFichier).join(', ')}` };
      }
      const { supprimerDocumentEleveCore } = await import('@/lib/business/dossier');
      const r = await supprimerDocumentEleveCore(ctx as never, doc.id);
      return { ...r, supprime: doc.nomFichier, message: `Fichier « ${doc.nomFichier} » supprimé du dossier.` };
    },
  },
  {
    nom: 'supprimer_courrier',
    description: "Supprime un courrier enregistré par erreur (identifié par sa référence C-ENT-#### ou C-SOR-####). Refusé s'il est déjà traité.",
    permission: ['eleves.ecrire', 'secretariat.gerer'],
    parametres: P({ reference: { type: 'string', description: 'Référence (ex: C-ENT-0012)' } }, ['reference']),
    executer: async (ctx, args) => {
      const c = await db.courrier.findFirst({ where: { ecoleId: ctx.ecoleId!, reference: { equals: String(args.reference).trim().toUpperCase() } } });
      if (!c) return { erreur: `Courrier « ${args.reference} » introuvable.` };
      if (c.traite) return { erreur: 'Ce courrier est déjà traité — suppression refusée (traçabilité).' };
      await db.courrier.delete({ where: { id: c.id } });
      return { supprime: c.reference, message: `Courrier ${c.reference} supprimé.` };
    },
  },
  {
    nom: 'retirer_piece_exigee',
    description: "Retire du dossier d'un élève une pièce exigée ajoutée par erreur (uniquement si elle n'est pas encore reçue).",
    permission: ['eleves.ecrire', 'secretariat.gerer'],
    parametres: P({ eleve: { type: 'string', description: 'Nom/prénom de l’élève' }, type: { type: 'string', description: 'Type/libellé de la pièce (ex: certificat_transfert)' } }, ['eleve', 'type']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const pieces = await db.pieceDossier.findMany({ where: { eleveId: re.entite.id } });
      const qN = normaliser(String(args.type));
      const cible = pieces.find((p) => normaliser(p.type) === qN)
        ?? pieces.find((p) => normaliser(p.type).includes(qN) || qN.includes(normaliser(p.type)));
      if (!cible) return { erreur: `Pièce « ${args.type} » introuvable. Pièces : ${pieces.map((p) => p.type).join(', ')}` };
      if (cible.statut === 'recue') return { erreur: `La pièce « ${cible.type} » est marquée reçue — retirez d’abord ce statut (basculer_piece_dossier).` };
      await db.pieceDossier.delete({ where: { id: cible.id } });
      return { retiree: cible.type, message: `Pièce « ${cible.type} » retirée du dossier.` };
    },
  },
  {
    nom: 'annuler_reinscription',
    description: "Annule la réinscription d'un élève pour l'année en cours (saisie par erreur).",
    permission: ['eleves.ecrire', 'secretariat.gerer'],
    parametres: P({ eleve: { type: 'string', description: 'Nom/prénom de l’élève' } }, ['eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ctx.ecoleId!, active: true } });
      if (!annee) return { erreur: 'Aucune année active.' };
      const r = await db.reinscription.findUnique({ where: { eleveId_anneeScolaireId: { eleveId: re.entite.id, anneeScolaireId: annee.id } } });
      if (!r) return { erreur: 'Aucune réinscription enregistrée pour cet élève cette année.' };
      await db.reinscription.delete({ where: { id: r.id } });
      return { annulee: true, eleve: `${re.entite.prenom} ${re.entite.nom}`, message: 'Réinscription annulée.' };
    },
  },

  // ═══ VISITEURS ═══
  {
    nom: 'sortie_visiteur',
    description: "Enregistre la SORTIE d'un visiteur actuellement sur site (identifié par son badge V-#### ou son nom).",
    permission: ['eleves.ecrire', 'secretariat.gerer'],
    parametres: P({ visiteur: { type: 'string', description: 'Nom ou n° de badge (ex: V-0012)' } }, ['visiteur']),
    executer: async (ctx, args) => {
      const q = String(args.visiteur).trim();
      const presents = await db.visiteur.findMany({ where: { ecoleId: ctx.ecoleId!, dateHeureSortie: null }, orderBy: { dateHeureEntree: 'desc' } });
      const v = presents.find((x) => x.badgeNumero?.toUpperCase() === q.toUpperCase())
        ?? presents.find((x) => normaliser(x.nom) === normaliser(q))
        ?? presents.find((x) => normaliser(x.nom).includes(normaliser(q)));
      if (!v) return { erreur: presents.length === 0 ? 'Aucun visiteur sur site.' : `Visiteur introuvable. Sur site : ${presents.map((x) => `${x.nom} (${x.badgeNumero ?? '—'})`).join(', ')}` };
      const { sortieVisiteurCore } = await import('@/lib/business/viescolaire');
      await sortieVisiteurCore(ctx as never, v.id);
      return { sorti: v.nom, badge: v.badgeNumero, message: `Sortie de ${v.nom} enregistrée.` };
    },
  },
  {
    nom: 'lister_visiteurs',
    description: "Liste les visiteurs : ceux actuellement sur site et les passages récents.",
    permission: ['eleves.ecrire', 'secretariat.gerer', 'eleves.lire'],
    parametres: P({}),
    executer: async (ctx) => {
      const liste = await db.visiteur.findMany({ where: { ecoleId: ctx.ecoleId! }, orderBy: { dateHeureEntree: 'desc' }, take: 30 });
      return {
        surSite: liste.filter((v) => !v.dateHeureSortie).map((v) => `${v.nom} (${v.badgeNumero ?? '—'}) — ${v.motifVisite}`),
        recents: liste.filter((v) => v.dateHeureSortie).slice(0, 15).map((v) => `${v.nom} — entré ${v.dateHeureEntree.toISOString().slice(0, 16).replace('T', ' ')}, sorti ${v.dateHeureSortie!.toISOString().slice(0, 16).replace('T', ' ')}`),
      };
    },
  },

  // ═══ RÉUNIONS COLLECTIVES ═══
  {
    nom: 'creer_reunion_collective',
    description: "Programme une réunion collective pour une classe (date, heure, lieu, objet) — les parents de la classe sont notifiés automatiquement.",
    permission: ['communication.envoyer', 'eleves.ecrire', 'secretariat.gerer'],
    parametres: P({
      classe: { type: 'string', description: 'Libellé classe' }, date: { type: 'string', description: 'Date ISO' },
      heure: { type: 'string', description: 'Heure (ex: 10:00)' }, lieu: { type: 'string', description: 'Lieu' },
      objet: { type: 'string', description: 'Objet de la réunion' },
    }, ['classe', 'date', 'heure', 'lieu']),
    executer: async (ctx, args) => {
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const { notifierParentsEtDirection } = await import('@/lib/business/commun');
      const r = await db.reunionCollective.create({
        data: { classeId: rc.entite.id, date: new Date(String(args.date)), heure: String(args.heure), lieu: String(args.lieu), description: args.objet ? String(args.objet) : null },
      });
      const eleves = await db.eleve.findMany({ where: { classeActuelleId: rc.entite.id, deletedAt: null, statut: 'actif' }, select: { id: true } });
      for (const e of eleves) {
        await notifierParentsEtDirection(db as never, ctx.ecoleId!, e.id,
          `Réunion — ${rc.entite.libelle}`,
          `Réunion de la classe ${rc.entite.libelle} le ${String(args.date)} à ${args.heure} (${args.lieu}). ${args.objet ?? ''}`.trim(),
          { direction: false },
        );
      }
      return { reunionId: r.id, classe: rc.entite.libelle, famillesNotifiees: eleves.length, message: `Réunion créée — ${eleves.length} famille(s) notifiée(s).` };
    },
  },

  // ═══ RELANCES IMPAYÉS ═══
  {
    nom: 'relancer_impayes',
    description: "Relance les parents pour impayés : pour UN élève (détail de ses échéances échues) ou TOUTES les familles en retard. Notifie parents et direction.",
    permission: ['finances.voir', 'eleves.ecrire', 'secretariat.gerer'],
    parametres: P({ eleve: { type: 'string', description: 'Nom/prénom — vide = toutes les familles en retard' } }),
    executer: async (ctx, args) => {
      const { relancerImpayesEleveCore, relancerTousImpayesCore } = await import('@/lib/business/secretariat');
      if (!args.eleve) {
        const r = await relancerTousImpayesCore(ctx as never);
        return { ...r, message: `${r.familles} famille(s) relancée(s) pour impayés.` };
      }
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const r = await relancerImpayesEleveCore(ctx as never, re.entite.id);
      return { ...r, message: `Relance envoyée : ${r.echeancesEnRetard} échéance(s), restant ${(r.totalRestant / 100).toLocaleString('fr-FR')} F.` };
    },
  },

  // ═══ EFFECTIFS ═══
  {
    nom: 'effectifs_par_niveau',
    description: "Effectifs de l'école par niveau et classe (garçons/filles/total) + inscriptions du mois courant.",
    permission: ['eleves.lire', 'finances.voir'],
    parametres: P({}),
    executer: async (ctx) => {
      const [niveaux, classes, eleves] = await Promise.all([
        db.niveau.findMany({ where: { section: { cycle: { ecoleId: ctx.ecoleId! } } }, include: { section: { include: { cycle: true } } }, orderBy: { ordre: 'asc' } }),
        db.classe.findMany({ where: { ecoleId: ctx.ecoleId! }, select: { id: true, niveauId: true } }),
        db.eleve.findMany({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, statut: 'actif' }, select: { classeActuelleId: true, sexe: true, dateInscription: true } }),
      ]);
      const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
      const parNiveau = niveaux.map((n) => {
        const classesN = classes.filter((c) => c.niveauId === n.id);
        const ids = new Set(classesN.map((c) => c.id));
        const els = eleves.filter((e) => e.classeActuelleId && ids.has(e.classeActuelleId));
        return {
          niveau: n.libelle, cycle: n.section?.cycle?.libelle ?? '',
          classes: classesN.length,
          garcons: els.filter((e) => e.sexe === 'M').length,
          filles: els.filter((e) => e.sexe === 'F').length,
          total: els.length,
        };
      });
      return {
        totalEleves: eleves.length,
        parNiveau,
        inscriptionsCeMois: eleves.filter((e) => e.dateInscription >= debutMois).length,
      };
    },
  },
];
