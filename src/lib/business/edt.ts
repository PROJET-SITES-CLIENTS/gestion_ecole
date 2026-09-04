// ====================================================================
// MÉTIER EMPLOI DU TEMPS + ANNÉE SCOLAIRE
// - P2 : détection de conflits salle/enseignant/classe à la création
// - F3  : modification et suppression de créneau (conflits rejoués)
// - F9  : clôture d'année RÉPARÉE — la nouvelle année reçoit ses classes
//        clonées, les périodes sont recréées, la promotion se fait vers
//        les classes de la NOUVELLE année (répartition si plusieurs),
//        redoublement et diplomation gérés, historisation correcte.
// - F20 : génération des séances depuis l'EDT (liaison FK emploiTempsId)
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, tranchesSeChevauchent, avecVerrou } from './commun';
import { JOURS_SEMAINE } from '@/lib/constants';

// --------------------------------------------------------------------
// Créneaux EDT
// --------------------------------------------------------------------

export type CreneauInput = {
  classeId?: string;
  matiereId?: string;
  enseignantId?: string;
  salleId?: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  recurrenceRule?: string;
  dateDebut: Date;
};

function validerHoraires(input: { jour: string; heureDebut: string; heureFin: string }) {
  if (!(JOURS_SEMAINE as readonly string[]).includes(input.jour)) {
    throw new ActionError(`Jour invalide : ${input.jour} (attendu : ${JOURS_SEMAINE.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  if (!/^\d{2}:\d{2}$/.test(input.heureDebut ?? '') || !/^\d{2}:\d{2}$/.test(input.heureFin ?? '')) {
    throw new ActionError('Horaires invalides (format HH:MM).', 'CHAMP_INVALIDE');
  }
  if (input.heureDebut >= input.heureFin) {
    throw new ActionError('L\'heure de fin doit être postérieure à l\'heure de début.', 'CHAMP_INVALIDE');
  }
}

async function verifierConflitsEdt(
  ecoleId: string,
  input: CreneauInput,
  exclureId?: string,
) {
  const existants = await db.emploiTemps.findMany({
    where: { ecoleId, jour: input.jour, statut: 'actif' },
  });
  for (const e of existants) {
    if (exclureId && e.id === exclureId) continue;
    if (!tranchesSeChevauchent(input.heureDebut, input.heureFin, e.heureDebut, e.heureFin)) continue;
    if (input.salleId && e.salleId === input.salleId) {
      throw new ActionError(
        `Conflit d'emploi du temps le ${input.jour} : salle déjà occupée par un créneau ${e.heureDebut}-${e.heureFin}.`,
        'CONFLIT_EDT',
      );
    }
    if (input.enseignantId && e.enseignantId === input.enseignantId) {
      throw new ActionError(
        `Conflit d'emploi du temps le ${input.jour} : enseignant déjà en cours (${e.heureDebut}-${e.heureFin}).`,
        'CONFLIT_EDT',
      );
    }
    if (input.classeId && e.classeId === input.classeId) {
      throw new ActionError(
        `Conflit d'emploi du temps le ${input.jour} : classe déjà en cours (${e.heureDebut}-${e.heureFin}).`,
        'CONFLIT_EDT',
      );
    }
  }
}

async function verifierReferentielsCreneau(ctx: Ctx, input: CreneauInput) {
  if (!input.classeId && !input.enseignantId && !input.salleId) {
    throw new ActionError('Renseignez au moins une classe, un enseignant ou une salle.', 'CHAMP_MANQUANT');
  }
  if (input.classeId) {
    const c = await db.classe.findUnique({ where: { id: input.classeId } });
    if (!c) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
    assertTenant(c.ecoleId, ctx, 'Cette classe');
  }
  if (input.salleId) {
    const s = await db.salle.findUnique({ where: { id: input.salleId } });
    if (!s) throw new ActionError('Salle introuvable.', 'INTROUVABLE');
    assertTenant(s.ecoleId, ctx, 'Cette salle');
  }
  if (input.enseignantId) {
    const p = await db.personnel.findUnique({ where: { id: input.enseignantId } });
    if (!p) throw new ActionError('Enseignant introuvable.', 'INTROUVABLE');
    assertTenant(p.ecoleId, ctx, 'Cet enseignant');
  }
  if (isNaN(input.dateDebut?.getTime())) throw new ActionError('Date de début invalide.', 'DATE_INVALIDE');
}

export async function creerCreneauEdtCore(ctx: Ctx, ecoleId: string, input: CreneauInput) {
  assertPermission(ctx, 'edt.gerer');
  validerHoraires(input);
  await verifierReferentielsCreneau(ctx, input);
  await verifierConflitsEdt(ecoleId, input);

  const et = await db.emploiTemps.create({
    data: {
      ecoleId,
      classeId: input.classeId,
      matiereId: input.matiereId,
      enseignantId: input.enseignantId,
      salleId: input.salleId,
      jour: input.jour,
      heureDebut: input.heureDebut,
      heureFin: input.heureFin,
      recurrenceRule: input.recurrenceRule?.trim() || undefined,
      dateDebut: input.dateDebut,
      statut: 'actif',
      creeParId: ctx.utilisateurId,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'edt.creneau_creation', 'emploi_temps', et.id, {
    jour: input.jour,
    heureDebut: input.heureDebut,
    heureFin: input.heureFin,
    classeId: input.classeId,
  });
  return { emploiTempsId: et.id };
}

/** F3 — modification : conflits rejoués en excluant le créneau courant. */
export async function modifierCreneauEdtCore(ctx: Ctx, emploiTempsId: string, input: CreneauInput) {
  assertPermission(ctx, 'edt.gerer');
  const et = await db.emploiTemps.findUnique({ where: { id: emploiTempsId } });
  if (!et) throw new ActionError('Créneau introuvable.', 'INTROUVABLE');
  assertTenant(et.ecoleId, ctx, 'Ce créneau');
  validerHoraires(input);
  await verifierReferentielsCreneau(ctx, input);
  await verifierConflitsEdt(et.ecoleId, input, emploiTempsId);
  await db.emploiTemps.update({
    where: { id: emploiTempsId },
    data: {
      classeId: input.classeId,
      matiereId: input.matiereId,
      enseignantId: input.enseignantId,
      salleId: input.salleId,
      jour: input.jour,
      heureDebut: input.heureDebut,
      heureFin: input.heureFin,
      recurrenceRule: input.recurrenceRule?.trim() || undefined,
      dateDebut: input.dateDebut,
    },
  });
  await logAction(db, et.ecoleId, ctx.utilisateurId, 'edt.creneau_modification', 'emploi_temps', emploiTempsId, { jour: input.jour });
  return { emploiTempsId };
}

/** F3 — suppression logique (le créneau passe à « termine »). */
export async function supprimerCreneauEdtCore(ctx: Ctx, emploiTempsId: string) {
  assertPermission(ctx, 'edt.gerer');
  const et = await db.emploiTemps.findUnique({ where: { id: emploiTempsId } });
  if (!et) throw new ActionError('Créneau introuvable.', 'INTROUVABLE');
  assertTenant(et.ecoleId, ctx, 'Ce créneau');
  if (et.statut === 'termine') throw new ActionError('Créneau déjà supprimé.', 'DEJA_TRAITE');
  await db.emploiTemps.update({ where: { id: emploiTempsId }, data: { statut: 'termine' } });
  await logAction(db, et.ecoleId, ctx.utilisateurId, 'edt.creneau_suppression', 'emploi_temps', emploiTempsId);
  return { emploiTempsId };
}

/**
 * F20 — génère les Séances concrètes d'un EDT récurrent sur une période,
 * liées par FK (Seance.emploiTempsId). Skip les dates déjà générées.
 * Exige classe + enseignant + matière pour créer des séances exploitables.
 */
export async function genererSeancesDepuisEdtCore(ctx: Ctx, emploiTempsId: string, dateFin: Date) {
  assertPermission(ctx, 'edt.gerer');
  const et = await db.emploiTemps.findUnique({ where: { id: emploiTempsId } });
  if (!et) throw new ActionError('Créneau EDT introuvable.', 'INTROUVABLE');
  assertTenant(et.ecoleId, ctx, 'Ce créneau');
  if (!et.classeId || !et.enseignantId || !et.matiereId) {
    throw new ActionError('Le créneau doit avoir une classe, un enseignant ET une matière pour générer des séances.', 'CHAMP_MANQUANT');
  }
  if (isNaN(dateFin?.getTime())) throw new ActionError('Date de fin invalide.', 'DATE_INVALIDE');
  if (dateFin <= et.dateDebut) throw new ActionError('La date de fin doit être postérieure à la date de début du créneau.', 'DATE_INVALIDE');

  const jourIndex = (JOURS_SEMAINE as readonly string[]).indexOf(et.jour); // 0=lundi
  if (jourIndex < 0) throw new ActionError('Jour du créneau invalide.', 'CHAMP_INVALIDE');

  // Recherche des occurrences hebdomadaires entre dateDebut et dateFin
  const dates: Date[] = [];
  const cur = new Date(et.dateDebut);
  cur.setUTCHours(0, 0, 0, 0);
  while (cur <= dateFin) {
    const jourSemaineJS = cur.getUTCDay(); // 0=dimanche
    const correspond = jourSemaineJS === 0 ? 6 : jourSemaineJS - 1; // vers 0=lundi
    if (correspond === jourIndex) dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const existantes = await db.seance.findMany({
    where: { emploiTempsId, date: { gte: et.dateDebut, lte: dateFin } },
    select: { date: true },
  });
  const dejaLa = new Set(existantes.map((s) => s.date.toISOString().slice(0, 10)));

  let crees = 0;
  await db.$transaction(async (tx) => {
    for (const d of dates) {
      const cle = d.toISOString().slice(0, 10);
      if (dejaLa.has(cle)) continue;
      await tx.seance.create({
        data: {
          classeId: et.classeId!,
          matiereId: et.matiereId!,
          enseignantId: et.enseignantId!,
          salleId: et.salleId,
          date: d,
          heureDebut: et.heureDebut,
          heureFin: et.heureFin,
          statut: 'planifiee',
          emploiTempsId: et.id,
        },
      });
      crees++;
    }
    await logAction(tx, et.ecoleId, ctx.utilisateurId, 'edt.seances_generation', 'emploi_temps', et.id, { crees, dateFin });
  }, { timeout: 30000, maxWait: 10000 });
  return { crees, totalOccurences: dates.length };
}

// --------------------------------------------------------------------
// Transition d'année scolaire (F9 — réparée)
// --------------------------------------------------------------------

export type ClotureAnneeInput = {
  redoublerIds?: string[]; // élèves maintenus dans le même niveau
};

export async function cloturerAnneeScolaireCore(ctx: Ctx, anneeId: string, input: ClotureAnneeInput = {}) {
  assertPermission(ctx, 'admin.saas');
  const annee = await db.anneeScolaire.findUnique({ where: { id: anneeId } });
  if (!annee) throw new ActionError('Année scolaire introuvable.', 'INTROUVABLE');
  assertTenant(annee.ecoleId, ctx, 'Cette année');
  if (!annee.active) throw new ActionError('Cette année n\'est pas active.', 'ANNEE_INACTIVE');

  // Libellé suivant : "2026-2027" → "2027-2028"
  const m = annee.libelle.match(/^(\d{4})-(\d{4})$/);
  if (!m) throw new ActionError(`Libellé d'année non exploitable : « ${annee.libelle} ».`, 'LIBELLE_INVALIDE');
  const debutSuivant = Number(m[1]) + 1;
  const finSuivant = Number(m[2]) + 1;
  const libelleSuivant = `${debutSuivant}-${finSuivant}`;
  const existe = await db.anneeScolaire.findFirst({ where: { ecoleId: annee.ecoleId, libelle: libelleSuivant } });
  if (existe) throw new ActionError(`L'année ${libelleSuivant} existe déjà.`, 'DEJA_EXISTANT');

  const redoubler = new Set(input.redoublerIds ?? []);

  // Tous les niveaux de l'école (pour détecter le niveau suivant et la fin de cycle)
  const niveauxEcole = await db.niveau.findMany({
    where: { section: { cycle: { ecoleId: annee.ecoleId } } },
    include: { section: { include: { cycle: true } } },
  });
  const niveauParId = new Map(niveauxEcole.map((n) => [n.id, n]));
  const maxOrdre = Math.max(...niveauxEcole.map((n) => n.ordre), 0);

  const eleves = await db.eleve.findMany({
    where: { ecoleId: annee.ecoleId, statut: 'actif', deletedAt: null },
    include: { classeActuelle: { include: { niveau: true } } },
  });
  // Classes de l'année qui se clôture
  const classes = await db.classe.findMany({
    where: { ecoleId: annee.ecoleId, anneeScolaireId: annee.id },
    include: { niveau: true },
  });
  if (classes.length === 0) throw new ActionError('Aucune classe sur cette année : rien à promouvoir.', 'SAISIE_VIDE');
  const parOrdre = new Map<number, typeof classes>();
  for (const c of classes) {
    const arr = parOrdre.get(c.niveau.ordre) ?? [];
    arr.push(c);
    parOrdre.set(c.niveau.ordre, arr);
  }
  const periodes = await db.periode.findMany({ where: { anneeScolaireId: annee.id } });

  const resultat = await avecVerrou('annee:cloture', () => db.$transaction(async (tx) => {
    // 1) Clôture de l'année courante
    await tx.anneeScolaire.update({ where: { id: annee.id }, data: { active: false } });

    // 2) Ouverture de la suivante
    const nouvelle = await tx.anneeScolaire.create({
      data: {
        ecoleId: annee.ecoleId,
        libelle: libelleSuivant,
        dateDebut: new Date(Date.UTC(debutSuivant, 8, 1)), // 1er septembre
        dateFin: new Date(Date.UTC(finSuivant, 6, 31)), // 31 juillet
        active: true,
      },
    });

    // 3) F9 — CLONAGE des classes vers la nouvelle année (même code, même niveau)
    const nouvellesClasses = new Map<string, string>(); // ancienne classeId -> nouvelle classeId
    for (const c of classes) {
      const clone = await tx.classe.create({
        data: {
          niveauId: c.niveauId,
          anneeScolaireId: nouvelle.id,
          ecoleId: annee.ecoleId,
          code: c.code,
          libelle: c.libelle,
          capaciteMax: c.capaciteMax,
          enseignantPrincipalId: c.enseignantPrincipalId,
        },
      });
      nouvellesClasses.set(c.id, clone.id);
    }

    // 4) F9 — Périodes recréées pour la nouvelle année (dates +1 an)
    for (const p of periodes) {
      const decaler = (d: Date) => new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()));
      await tx.periode.create({
        data: {
          ecoleId: annee.ecoleId,
          anneeScolaireId: nouvelle.id,
          libelle: p.libelle,
          code: p.code, // F19 : le @@unique est par (école, année, code) → recréer T1 est enfin possible
          dateDebut: decaler(p.dateDebut),
          dateFin: decaler(p.dateFin),
          typeBulletin: p.typeBulletin,
        },
      });
    }

    // 5) F9 — Promotion vers les classes de la NOUVELLE année
    let promus = 0, redoublants = 0, diplomes = 0, sansClasse = 0;
    // compteur de répartition par classe cible (si plusieurs classes par niveau)
    const remplissage = new Map<string, number>();
    for (const e of eleves) {
      // Historisation : clôture de tout historique ouvert au terme de l'année
      const dateCloture = annee.dateFin < new Date() ? annee.dateFin : new Date();
      await tx.eleveHistoriqueClasse.updateMany({
        where: { eleveId: e.id, dateSortie: null },
        data: { dateSortie: dateCloture, motif: `Clôture année ${annee.libelle}` },
      });

      const niveauActuel = e.classeActuelle ? niveauParId.get(e.classeActuelle.niveauId) : undefined;
      if (!e.classeActuelle || !niveauActuel) {
        sansClasse++;
        continue;
      }

      // Redoublement : même niveau, classe de la nouvelle année
      if (redoubler.has(e.id)) {
        const cible = nouvellesClasses.get(e.classeActuelle.id);
        if (cible) {
          await tx.eleve.update({ where: { id: e.id }, data: { classeActuelleId: cible } });
          await tx.eleveHistoriqueClasse.create({
            data: { eleveId: e.id, classeId: cible, dateEntree: nouvelle.dateDebut, motif: `Redoublement — année ${libelleSuivant}` },
          });
          redoublants++;
          continue;
        }
      }

      // Fin de cycle → diplômé (F9 : statut + date de sortie)
      if (niveauActuel.ordre >= maxOrdre) {
        await tx.eleve.update({
          where: { id: e.id },
          data: { statut: 'diplome', dateSortie: dateCloture, motifSortie: `Fin de cycle — ${annee.libelle}`, classeActuelleId: null },
        });
        diplomes++;
        continue;
      }

      // Promotion : classes du niveau supérieur DANS LA NOUVELLE ANNÉE
      const classesNiveauSuivant = [...nouvellesClasses.entries()]
        .filter(([ancienneId]) => {
          const ancienne = classes.find((c) => c.id === ancienneId);
          return ancienne && ancienne.niveau.ordre === niveauActuel.ordre + 1;
        })
        .map(([, nouvelleId]) => nouvelleId);
      if (classesNiveauSuivant.length === 0) {
        sansClasse++;
        continue;
      }
      // Répartition : on équilibre entre les classes du niveau suivant
      classesNiveauSuivant.sort((a, b) => (remplissage.get(a) ?? 0) - (remplissage.get(b) ?? 0));
      const cible = classesNiveauSuivant[0];
      remplissage.set(cible, (remplissage.get(cible) ?? 0) + 1);
      await tx.eleve.update({ where: { id: e.id }, data: { classeActuelleId: cible } });
      await tx.eleveHistoriqueClasse.create({
        data: { eleveId: e.id, classeId: cible, dateEntree: nouvelle.dateDebut, motif: `Promotion — année ${libelleSuivant}` },
      });
      promus++;
    }

    // 6) EDT de l'ancienne année : clos
    await tx.emploiTemps.updateMany({
      where: { ecoleId: annee.ecoleId, statut: 'actif', dateDebut: { lt: nouvelle.dateDebut } },
      data: { statut: 'termine' },
    });

    await tx.notification.create({
      data: {
        ecoleId: annee.ecoleId,
        destinataireType: 'personnel',
        destinataireId: ctx.utilisateurId,
        sujet: `Transition d'année scolaire : ${annee.libelle} → ${libelleSuivant}`,
        corps: `L'année ${annee.libelle} est clôturée : ${promus} promu(s), ${redoublants} redoublant(s), ${diplomes} diplômé(s), ${sansClasse} sans affectation. ${nouvellesClasses.size} classe(s) et ${periodes.length} période(s) créées pour ${libelleSuivant}.`,
        canal: 'in_app',
        statut: 'envoye',
        dateEnvoi: new Date(),
      },
    });
    await logAction(tx, annee.ecoleId, ctx.utilisateurId, 'annee.cloture_transition', 'annee_scolaire', nouvelle.id, {
      ancienne: annee.libelle,
      nouvelle: libelleSuivant,
      eleves: eleves.length,
      promus,
      redoublants,
      diplomes,
      sansClasse,
      classesCreees: nouvellesClasses.size,
    });
    return {
      nouvelleAnneeId: nouvelle.id,
      libelle: libelleSuivant,
      eleves: eleves.length,
      promus,
      redoublants,
      diplomes,
      sansClasse,
      classesCreees: nouvellesClasses.size,
    };
  }, { timeout: 30000, maxWait: 10000 }));
  return resultat;
}
