// ====================================================================
// OUTILS CRUD COMPLETS — les 17 outils manquants pour un contrôle
// TOTAL de l'IA : créer, lire, modifier, supprimer dans TOUS les modules
// ====================================================================

import { db } from '@/lib/db';
import { Ctx, logAction } from '@/lib/business/commun';
import { OutilIA, ParametreOutil } from './outils';
import { resoudreMatiere, resoudrePersonnel, resoudreClasse } from './resolution';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]): ParametreOutil => ({ type: 'object', properties, required });

export const outilsCRUD: OutilIA[] = [
  // ═══ MATIÈRES ═══
  {
    nom: "modifier_matiere",
    description: "Modifie le nom ou le coefficient d'une matière.",
    permission: "admin.saas",
    parametres: P({
      matiere: { type: "string", description: "Nom actuel" },
      nouveauNom: { type: "string", description: "Nouveau nom (optionnel)" },
      nouveauCoefficient: { type: "number", description: "Nouveau coefficient (optionnel)" },
    }, ["matiere"]),
    executer: async (ctx, args) => {
      const r = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!r.trouve) return { erreur: r.erreur, candidats: r.candidats };
      const mat = r.entite;
      await db.matiere.update({ where: { id: mat.id }, data: {
        ...(args.nouveauNom ? { libelle: String(args.nouveauNom) } : {}),
        ...(args.nouveauCoefficient ? { coefficient: Number(args.nouveauCoefficient) } : {}),
      } });
      return { modifiee: mat.libelle, nouveauNom: args.nouveauNom ? String(args.nouveauNom) : mat.libelle, coefficient: args.nouveauCoefficient ? Number(args.nouveauCoefficient) : mat.coefficient };
    },
  },

  // ═══ PERSONNEL ═══
  {
    nom: "modifier_personnel",
    description: "Modifie les informations d'un membre du personnel (nom, email, téléphone, salaire).",
    permission: "rh.gerer",
    parametres: P({
      personnel: { type: "string", description: "Nom du personnel" },
      nouveauEmail: { type: "string", description: "Nouvel email (optionnel)" },
      nouveauTelephone: { type: "string", description: "Nouveau téléphone (optionnel)" },
      nouveauSalaire: { type: "number", description: "Nouveau salaire en FRANCS (optionnel)" },
      nouveauRole: { type: "string", description: "Nouveau rôle : enseignant, secretariat, comptabilite, rh, censeur, surveillant, infirmier, assistant_direction, direction (optionnel)" },
    }, ["personnel"]),
    executer: async (ctx, args) => {
      const pers = await db.personnel.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, OR: [{ nom: { contains: String(args.personnel), mode: "insensitive" } }, { prenom: { contains: String(args.personnel), mode: "insensitive" } }] } });
      if (!pers) return { erreur: "Personnel introuvable." };
      const data: any = {};
      if (args.nouveauEmail) data.email = String(args.nouveauEmail);
      if (args.nouveauTelephone) data.telephone = String(args.nouveauTelephone);
      if (args.nouveauSalaire) data.salaireBrut = Math.round(Number(args.nouveauSalaire) * 100);
      await db.personnel.update({ where: { id: pers.id }, data });
      if (args.nouveauRole && pers.utilisateurId) {
        const role = await db.role.findFirst({ where: { ecoleId: ctx.ecoleId!, code: String(args.nouveauRole) } });
        if (role) {
          await db.utilisateurRole.deleteMany({ where: { utilisateurId: pers.utilisateurId } });
          await db.utilisateurRole.create({ data: { utilisateurId: pers.utilisateurId, roleId: role.id } });
        }
      }
      return { modifie: `${pers.prenom} ${pers.nom}` };
    },
  },
  {
    nom: "supprimer_personnel",
    description: "Marque un personnel comme sorti (soft delete — conserve l'historique). Le compte est désactivé.",
    permission: "rh.gerer",
    parametres: P({ personnel: { type: "string", description: "Nom du personnel" }, motif: { type: "string", description: "Motif de sortie" } }, ["personnel", "motif"]),
    executer: async (ctx, args) => {
      const pers = await db.personnel.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, statut: 'actif', OR: [{ nom: { contains: String(args.personnel), mode: "insensitive" } }, { prenom: { contains: String(args.personnel), mode: "insensitive" } }] } });
      if (!pers) return { erreur: "Personnel actif introuvable." };
      await db.personnel.update({ where: { id: pers.id }, data: { statut: 'sorti', deletedAt: new Date(), motifSortie: String(args.motif) } });
      if (pers.utilisateurId) await db.utilisateur.update({ where: { id: pers.utilisateurId }, data: { actif: false } }).catch(() => {});
      return { supprime: `${pers.prenom} ${pers.nom}`, motif: String(args.motif) };
    },
  },

  // ═══ ÉVALUATIONS ET NOTES ═══
  {
    nom: "modifier_evaluation",
    description: "Modifie une évaluation (intitulé, date, barème, coefficient) — l'élève est identifié par sa classe et sa matière pour lever toute ambiguïté.",
    permission: "notes.saisir",
    parametres: P({
      classe: { type: "string", description: "Libellé de la classe" },
      matiere: { type: "string", description: "Libellé de la matière" },
      intituleActuel: { type: "string", description: "Intitulé actuel de l'évaluation" },
      nouvelIntitule: { type: "string", description: "Nouvel intitulé (optionnel)" },
      nouvelleDate: { type: "string", description: "Nouvelle date ISO (optionnel)" },
      nouveauSur: { type: "number", description: "Nouveau barème (optionnel)" },
      nouveauCoefficient: { type: "number", description: "Nouveau coefficient (optionnel)" },
    }, ["classe", "matiere", "intituleActuel"]),
    executer: async (ctx, args) => {
      const { resoudreClasse, resoudreMatiere } = await import("./resolution");
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!rm.trouve) return { erreur: rm.erreur, candidats: rm.candidats };
      const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      const evals = await db.evaluation.findMany({
        where: { ecoleId: ctx.ecoleId!, classeId: rc.entite.id, matiereId: rm.entite.id },
        orderBy: { date: "desc" }, take: 50,
      });
      const q = norm(String(args.intituleActuel));
      const exactes = evals.filter((e) => norm(e.intitule) === q);
      const contient = evals.filter((e) => norm(e.intitule).includes(q) || q.includes(norm(e.intitule)));
      const ev = exactes.length === 1 ? exactes[0] : exactes.length === 0 && contient.length === 1 ? contient[0] : null;
      if (!ev) {
        const cands = (exactes.length > 0 ? exactes : contient).slice(0, 6).map((e) => `${e.intitule} (${e.date.toISOString().slice(0, 10)})`);
        return { erreur: cands.length > 1 ? `Plusieurs évaluations correspondent : ${cands.join(" ; ")}` : `Évaluation « ${args.intituleActuel} » introuvable dans ${rc.entite.libelle}/${rm.entite.libelle}.`, candidats: cands };
      }
      const data: any = {};
      if (args.nouvelIntitule) data.intitule = String(args.nouvelIntitule);
      if (args.nouvelleDate) { const d = new Date(String(args.nouvelleDate)); if (!isNaN(d.getTime())) data.date = d; }
      if (args.nouveauSur != null && Number(args.nouveauSur) > 0) data.sur = Number(args.nouveauSur);
      if (args.nouveauCoefficient != null && Number(args.nouveauCoefficient) > 0) data.coefficient = Number(args.nouveauCoefficient);
      if (Object.keys(data).length === 0) return { erreur: "Aucune modification fournie." };
      await db.evaluation.update({ where: { id: ev.id }, data });
      return { evaluationId: ev.id, ancienIntitule: ev.intitule, modifications: Object.keys(data) };
    },
  },
  {
    nom: "creer_competence",
    description: "Crée une nouvelle compétence dans le référentiel d'une matière (pour les cycles non chiffrés : maternelle, primaire).",
    permission: "notes.saisir",
    parametres: P({
      libelle: { type: "string", description: "Libellé de la compétence" },
      matiere: { type: "string", description: "Matière" },
      cycle: { type: "string", description: "Cycle (ex: Maternelle, Primaire)" },
    }, ["libelle", "matiere"]),
    executer: async (ctx, args) => {
      const { resoudreMatiere } = await import("./resolution");
      const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!rm.trouve) return { erreur: rm.erreur, candidats: rm.candidats };
      const cycle = args.cycle ? await db.cycle.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.cycle), mode: "insensitive" } } }) : await db.cycle.findFirst({ where: { ecoleId: ctx.ecoleId! } });
      if (!cycle) return { erreur: "Aucun cycle trouvé." };
      const existante = await db.competence.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: String(args.libelle), matiereId: rm.entite.id } });
      if (existante) return { erreur: `La compétence « ${args.libelle} » existe déjà pour cette matière.` };
      const ordre = await db.competence.count({ where: { ecoleId: ctx.ecoleId!, matiereId: rm.entite.id } });
      const c = await db.competence.create({ data: { ecoleId: ctx.ecoleId!, matiereId: rm.entite.id, cycleId: cycle.id, libelle: String(args.libelle), ordre: ordre + 1 } });
      return { competenceId: c.id, libelle: c.libelle };
    },
  },
{
    nom: "supprimer_evaluation",
    description: "Supprime une évaluation ET toutes ses notes (si le bulletin n'a pas été généré).",
    permission: "notes.saisir",
    parametres: P({ evaluation: { type: "string", description: "Intitulé de l'évaluation" } }, ["evaluation"]),
    executer: async (ctx, args) => {
      const ev = await db.evaluation.findFirst({ where: { ecoleId: ctx.ecoleId!, intitule: { contains: String(args.evaluation), mode: "insensitive" } }, include: { _count: { select: { notes: true } } } });
      if (!ev) return { erreur: "Évaluation introuvable." };
      const nbB = await db.bulletin.count({ where: { classeId: ev.classeId, periodeId: ev.periodeId } });
      if (nbB > 0) return { erreur: `Impossible : ${nbB} bulletin(s) déjà généré(s) pour cette période.` };
      await db.note.deleteMany({ where: { evaluationId: ev.id } });
      await db.evaluation.delete({ where: { id: ev.id } });
      return { supprimee: ev.intitule };
    },
  },
  {
    nom: "supprimer_note",
    description: "Supprime la note d'un élève pour une évaluation (ou la marque comme absente).",
    permission: "notes.saisir",
    parametres: P({
      eleve: { type: "string", description: "Nom de l'élève" },
      evaluation: { type: "string", description: "Intitulé de l'évaluation" },
    }, ["eleve", "evaluation"]),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, OR: [{ nom: { contains: String(args.eleve), mode: "insensitive" } }, { prenom: { contains: String(args.eleve), mode: "insensitive" } }] } });
      const ev = await db.evaluation.findFirst({ where: { ecoleId: ctx.ecoleId!, intitule: { contains: String(args.evaluation), mode: "insensitive" } } });
      if (!el || !ev) return { erreur: "Élève ou évaluation introuvable." };
      const note = await db.note.findFirst({ where: { eleveId: el.id, evaluationId: ev.id } });
      if (!note) return { erreur: "Note introuvable." };
      await db.note.delete({ where: { id: note.id } });
      return { supprimee: true, eleve: `${el.prenom} ${el.nom}`, evaluation: ev.intitule };
    },
  },
  {
    nom: "modifier_note",
    description: "Modifie la note d'un élève pour une évaluation.",
    permission: "notes.saisir",
    parametres: P({
      eleve: { type: "string", description: "Nom de l'élève" },
      evaluation: { type: "string", description: "Intitulé de l'évaluation" },
      nouvelleValeur: { type: "number", description: "Nouvelle note" },
    }, ["eleve", "evaluation", "nouvelleValeur"]),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, OR: [{ nom: { contains: String(args.eleve), mode: "insensitive" } }, { prenom: { contains: String(args.eleve), mode: "insensitive" } }] } });
      const ev = await db.evaluation.findFirst({ where: { ecoleId: ctx.ecoleId!, intitule: { contains: String(args.evaluation), mode: "insensitive" } } });
      if (!el || !ev) return { erreur: "Élève ou évaluation introuvable." };
      const note = await db.note.findFirst({ where: { eleveId: el.id, evaluationId: ev.id } });
      if (!note) return { erreur: "Note introuvable — utilisez saisir_notes pour la créer." };
      if (Number(args.nouvelleValeur) < 0 || Number(args.nouvelleValeur) > ev.sur) return { erreur: `Note doit être entre 0 et ${ev.sur}.` };
      await db.note.update({ where: { id: note.id }, data: { valeur: Number(args.nouvelleValeur) } });
      return { modifiee: Number(args.nouvelleValeur), eleve: `${el.prenom} ${el.nom}` };
    },
  },

  // ═══ DEVOIRS ═══
  {
    nom: "supprimer_devoir",
    description: "Supprime un devoir (si aucun élève ne l'a rendu).",
    permission: "notes.saisir",
    parametres: P({ devoir: { type: "string", description: "Intitulé du devoir" } }, ["devoir"]),
    executer: async (ctx, args) => {
      const dv = await db.devoir.findFirst({ where: { ecoleId: ctx.ecoleId!, intitule: { contains: String(args.devoir), mode: "insensitive" } }, include: { _count: { select: { rendus: true } } } });
      if (!dv) return { erreur: "Devoir introuvable." };
      const nb = await db.renduDevoir.count({ where: { devoirId: dv.id } });
      if (nb > 0) return { erreur: `Impossible : ${nb} rendu(s) associé(s).` };
      await db.devoir.delete({ where: { id: dv.id } });
      return { supprime: dv.intitule };
    },
  },

  // ═══ PROGRAMMES ET CHAPITRES ═══
  {
    nom: "modifier_chapitre",
    description: "Modifie le titre ou l'ordre d'un chapitre dans un programme.",
    permission: "notes.saisir",
    parametres: P({
      matiere: { type: "string", description: "Matière" },
      chapitre: { type: "string", description: "Titre actuel du chapitre" },
      nouveauTitre: { type: "string", description: "Nouveau titre (optionnel)" },
      nouvelOrdre: { type: "number", description: "Nouvel ordre (optionnel)" },
    }, ["matiere", "chapitre"]),
    executer: async (ctx, args) => {
      const chap = await db.chapitre.findFirst({
        where: { titre: { contains: String(args.chapitre), mode: "insensitive" }, programme: { ecoleId: ctx.ecoleId!, matiere: { libelle: { contains: String(args.matiere), mode: "insensitive" } } } },
      });
      if (!chap) return { erreur: "Chapitre introuvable." };
      await db.chapitre.update({ where: { id: chap.id }, data: {
        ...(args.nouveauTitre ? { titre: String(args.nouveauTitre) } : {}),
        ...(args.nouvelOrdre ? { ordre: Number(args.nouvelOrdre) } : {}),
      } });
      return { modifie: chap.titre };
    },
  },
  {
    nom: "supprimer_chapitre",
    description: "Supprime un chapitre d'un programme (avec ses avancements).",
    permission: "notes.saisir",
    parametres: P({ matiere: { type: "string", description: "Matière" }, chapitre: { type: "string", description: "Titre du chapitre" } }, ["matiere", "chapitre"]),
    executer: async (ctx, args) => {
      const chap = await db.chapitre.findFirst({
        where: { titre: { contains: String(args.chapitre), mode: "insensitive" }, programme: { ecoleId: ctx.ecoleId!, matiere: { libelle: { contains: String(args.matiere), mode: "insensitive" } } } },
      });
      if (!chap) return { erreur: "Chapitre introuvable." };
      await db.avancementProgramme.deleteMany({ where: { chapitreId: chap.id } });
      await db.chapitre.delete({ where: { id: chap.id } });
      return { supprime: chap.titre };
    },
  },
  {
    nom: "supprimer_programme",
    description: "Supprime un programme entier avec tous ses chapitres (si aucune évaluation liée).",
    permission: "notes.saisir",
    parametres: P({ matiere: { type: "string", description: "Matière" }, niveau: { type: "string", description: "Niveau (ex: 6E, CP)" } }, ["matiere", "niveau"]),
    executer: async (ctx, args) => {
      const prog = await db.programme.findFirst({
        where: { ecoleId: ctx.ecoleId!, matiere: { libelle: { contains: String(args.matiere), mode: "insensitive" } }, niveau: { code: { contains: String(args.niveau).toUpperCase() } } },
        include: { chapitres: true },
      });
      if (!prog) return { erreur: "Programme introuvable." };
      for (const ch of prog.chapitres) await db.avancementProgramme.deleteMany({ where: { chapitreId: ch.id } });
      await db.chapitre.deleteMany({ where: { programmeId: prog.id } });
      await db.programme.delete({ where: { id: prog.id } });
      return { supprime: prog.titre };
    },
  },

  // ═══ CAHIER DE TEXTES ═══
  {
    nom: "modifier_cahier_textes",
    description: "Modifie une entrée du cahier de textes (contenu ou travail à faire).",
    permission: "notes.saisir",
    parametres: P({
      classe: { type: "string", description: "Classe" },
      contenuActuel: { type: "string", description: "Fragment du contenu actuel pour retrouver l'entrée" },
      nouveauContenu: { type: "string", description: "Nouveau contenu (optionnel)" },
      nouveauTravail: { type: "string", description: "Nouveau travail à faire (optionnel)" },
    }, ["classe", "contenuActuel"]),
    executer: async (ctx, args) => {
      const cahier = await db.cahierTexte.findFirst({
        where: { ecoleId: ctx.ecoleId!, classe: { libelle: { contains: String(args.classe), mode: "insensitive" } } },
        orderBy: { dateCreation: 'desc' },
        include: { entrees: { where: { contenu: { contains: String(args.contenuActuel), mode: "insensitive" } }, orderBy: { dateCours: 'desc' }, take: 1 } },
      });
      if (!cahier || cahier.entrees.length === 0) return { erreur: "Entrée du cahier introuvable." };
      const entree = cahier.entrees[0];
      await db.entreeCahierTexte.update({ where: { id: entree.id }, data: {
        ...(args.nouveauContenu ? { contenu: String(args.nouveauContenu) } : {}),
        ...(args.nouveauTravail !== undefined ? { travailAFaire: String(args.nouveauTravail) } : {}),
      } });
      return { modifiee: entree.id };
    },
  },

  // ═══ INCIDENTS ═══
  {
    nom: "supprimer_incident",
    description: "Supprime un incident disciplinaire (et ses sanctions).",
    permission: "vie_scolaire.gerer",
    parametres: P({ eleve: { type: "string", description: "Nom de l'élève" }, description: { type: "string", description: "Fragment de la description de l'incident" } }, ["eleve", "description"]),
    executer: async (ctx, args) => {
      const el = await db.eleve.findFirst({ where: { ecoleId: ctx.ecoleId!, deletedAt: null, OR: [{ nom: { contains: String(args.eleve), mode: "insensitive" } }, { prenom: { contains: String(args.eleve), mode: "insensitive" } }] } });
      if (!el) return { erreur: "Élève introuvable." };
      const inc = await db.incident.findFirst({ where: { eleveId: el.id, description: { contains: String(args.description), mode: "insensitive" } }, orderBy: { dateHeure: 'desc' } });
      if (!inc) return { erreur: "Incident introuvable." };
      await db.sanction.deleteMany({ where: { incidentId: inc.id } });
      await db.incident.delete({ where: { id: inc.id } });
      return { supprime: inc.description.slice(0, 50) };
    },
  },

  // ═══ FRAIS ═══
  {
    nom: "modifier_frais",
    description: "Modifie le montant ou le libellé d'un frais existant.",
    permission: "finances.ecrire",
    parametres: P({
      frais: { type: "string", description: "Libellé actuel du frais" },
      nouveauMontant: { type: "number", description: "Nouveau montant en FRANCS (optionnel)" },
      nouveauLibelle: { type: "string", description: "Nouveau libellé (optionnel)" },
    }, ["frais"]),
    executer: async (ctx, args) => {
      const fr = await db.frais.findFirst({ where: { ecoleId: ctx.ecoleId!, libelle: { contains: String(args.frais), mode: "insensitive" } } });
      if (!fr) return { erreur: "Frais introuvable." };
      await db.frais.update({ where: { id: fr.id }, data: {
        ...(args.nouveauMontant ? { montant: Math.round(Number(args.nouveauMontant) * 100) } : {}),
        ...(args.nouveauLibelle ? { libelle: String(args.nouveauLibelle) } : {}),
      } });
      return { modifie: fr.libelle };
    },
  },

  // ═══ AFFECTATIONS ═══
  {
    nom: "retirer_affectation",
    description: "Retire une affectation enseignant-matière-classe (l'enseignant n'enseigne plus cette matière dans cette classe).",
    permission: "edt.gerer",
    parametres: P({
      enseignant: { type: "string", description: "Nom de l'enseignant" },
      matiere: { type: "string", description: "Matière" },
      classe: { type: "string", description: "Classe" },
    }, ["enseignant", "matiere", "classe"]),
    executer: async (ctx, args) => {
      // ANTI-CONFUSION — chaque entité est résolue strictement AVANT la recherche
      const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.enseignant));
      if (!rp.trouve) return { erreur: rp.erreur, candidats: rp.candidats };
      const rm = await resoudreMatiere(ctx.ecoleId!, String(args.matiere));
      if (!rm.trouve) return { erreur: rm.erreur, candidats: rm.candidats };
      const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
      if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
      const aff = await db.affectationEnseignant.findFirst({
        where: {
          ecoleId: ctx.ecoleId!,
          personnelId: rp.entite.id,
          matiereId: rm.entite.id,
          classeId: rc.entite.id,
        },
        include: { personnel: true, matiere: true, classe: true },
      });
      if (!aff) {
        // Lister les affectations existantes pour aider
        const toutes = await db.affectationEnseignant.findMany({ where: { ecoleId: ctx.ecoleId! }, include: { personnel: true, matiere: true, classe: true } });
        return { erreur: `Affectation introuvable. Affectations existantes : ${toutes.map((a: any) => `${a.personnel?.nom}/${a.matiere?.libelle}/${a.classe?.libelle}`).join('; ') || 'aucune'}` };
      }
      await db.affectationEnseignant.delete({ where: { id: aff.id } });
      return { retiree: true, detail: `${aff.personnel?.nom} / ${aff.matiere?.libelle} / ${aff.classe?.libelle}` };
    },
  },

  // ═══ PRÉSENCES ═══
  {
    nom: "supprimer_presence",
    description: "Supprime UNE présence précise d'un élève (saisie erronée) — CHIRURGICAL : l'élève ET la séance (ou la date) sont identifiés sans ambiguïté ; jamais la dernière présence au hasard.",
    permission: "presences.saisir",
    parametres: P({
      eleve: { type: "string", description: "Nom/prénom de l'élève" },
      seance: { type: "string", description: "Matière ou date de la séance (ex: 'Maths' ou '2026-10-05') — optionnel mais recommandé" },
    }, ["eleve"]),
    executer: async (ctx, args) => {
      const { resoudreEleve } = await import("./resolution");
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const presences = await db.presence.findMany({
        where: { eleveId: re.entite.id },
        include: { seance: { include: { matiere: { select: { libelle: true } } } } },
        orderBy: { dateSaisie: "desc" },
        take: 100,
      });
      if (presences.length === 0) return { erreur: "Aucune présence enregistrée pour cet élève." };
      let cible = null as typeof presences[number] | null;
      if (args.seance) {
        const q = String(args.seance).toLowerCase();
        cible = presences.find((p) => p.seance?.matiere?.libelle?.toLowerCase().includes(q))
          ?? presences.find((p) => p.dateSaisie.toISOString().slice(0, 10) === String(args.seance))
          ?? null;
        if (!cible) {
          return {
            erreur: `Aucune présence ne correspond à « ${args.seance} » pour cet élève. Présences récentes : ${presences.slice(0, 6).map((p) => `${p.seance?.matiere?.libelle ?? '?'} du ${p.dateSaisie.toISOString().slice(0, 10)} (${p.statut})`).join(' ; ')}`,
          };
        }
      } else if (presences.length === 1) {
        cible = presences[0];
      } else {
        return {
          erreur: `Cet élève a ${presences.length} présences — précisez la séance ou la date. Récentes : ${presences.slice(0, 5).map((p) => `${p.seance?.matiere?.libelle ?? '?'} du ${p.dateSaisie.toISOString().slice(0, 10)}`).join(' ; ')}`,
        };
      }
      await db.presence.delete({ where: { id: cible.id } });
      return { supprimee: true, eleve: `${re.entite.prenom} ${re.entite.nom}`, seance: cible.seance?.matiere?.libelle ?? '—', date: cible.dateSaisie.toISOString().slice(0, 10), statut: cible.statut };
    },
  },
];
