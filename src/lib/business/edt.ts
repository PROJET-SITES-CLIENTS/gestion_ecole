// ====================================================================
// MÉTIER EMPLOI DU TEMPS — détection de conflits (P2)
// Un créneau est refusé si, sur le même jour et la même tranche
// horaire : la salle est occupée, OU l'enseignant est déjà en cours,
// OU la classe a déjà cours.
// + Transition d'année scolaire (clôture, historisation, montée de
// niveau des élèves).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, tranchesSeChevauchent } from './commun';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

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

export async function creerCreneauEdtCore(ctx: Ctx, ecoleId: string, input: CreneauInput) {
  assertPermission(ctx, 'edt.gerer');
  if (!JOURS.includes(input.jour)) {
    throw new ActionError(`Jour invalide : ${input.jour} (attendu : ${JOURS.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  if (!/^\d{2}:\d{2}$/.test(input.heureDebut ?? '') || !/^\d{2}:\d{2}$/.test(input.heureFin ?? '')) {
    throw new ActionError('Horaires invalides (format HH:MM).', 'CHAMP_INVALIDE');
  }
  if (!tranchesSeChevauchent(input.heureDebut, input.heureFin, input.heureDebut, input.heureFin) && input.heureDebut >= input.heureFin) {
    throw new ActionError('L\'heure de fin doit être postérieure à l\'heure de début.', 'CHAMP_INVALIDE');
  }
  if (input.heureDebut >= input.heureFin) {
    throw new ActionError('L\'heure de fin doit être postérieure à l\'heure de début.', 'CHAMP_INVALIDE');
  }
  if (!input.classeId && !input.enseignantId && !input.salleId) {
    throw new ActionError('Renseignez au moins une classe, un enseignant ou une salle.', 'CHAMP_MANQUANT');
  }
  if (input.classeId) {
    const c = await db.classe.findUnique({ where: { id: input.classeId } });
    if (!c) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
  }
  if (input.salleId) {
    const s = await db.salle.findUnique({ where: { id: input.salleId } });
    if (!s) throw new ActionError('Salle introuvable.', 'INTROUVABLE');
    assertTenant(s.ecoleId, ctx, 'Cette salle');
  }
  if (isNaN(input.dateDebut?.getTime())) throw new ActionError('Date de début invalide.', 'DATE_INVALIDE');

  // ---- Détection de conflits (P2) ----
  const existants = await db.emploiTemps.findMany({
    where: { ecoleId, jour: input.jour, statut: 'actif' },
  });
  const conflits: string[] = [];
  for (const e of existants) {
    if (!tranchesSeChevauchent(input.heureDebut, input.heureFin, e.heureDebut, e.heureFin)) continue;
    if (input.salleId && e.salleId === input.salleId) {
      conflits.push(`salle déjà occupée par un créneau ${e.heureDebut}-${e.heureFin}`);
      break;
    }
    if (input.enseignantId && e.enseignantId === input.enseignantId) {
      conflits.push(`enseignant déjà en cours (${e.heureDebut}-${e.heureFin})`);
      break;
    }
    if (input.classeId && e.classeId === input.classeId) {
      conflits.push(`classe déjà en cours (${e.heureDebut}-${e.heureFin})`);
      break;
    }
  }
  if (conflits.length > 0) {
    throw new ActionError(
      `Conflit d'emploi du temps le ${input.jour} : ${conflits[0]}. Choisissez un autre créneau, une autre salle ou un autre enseignant.`,
      'CONFLIT_EDT',
    );
  }

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

// --------------------------------------------------------------------
// Transition d'année scolaire (P2)
// --------------------------------------------------------------------

export async function cloturerAnneeScolaireCore(ctx: Ctx, anneeId: string) {
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

  const eleves = await db.eleve.findMany({
    where: { ecoleId: annee.ecoleId, statut: 'actif' },
    include: { classeActuelle: { include: { niveau: true } } },
  });
  // Classes groupées par niveau.ordre pour la montée.
  const classes = await db.classe.findMany({ where: { ecoleId: annee.ecoleId, anneeScolaireId: annee.id }, include: { niveau: true } });
  const parOrdre = new Map<number, typeof classes>();
  for (const c of classes) {
    const arr = parOrdre.get(c.niveau.ordre) ?? [];
    arr.push(c);
    parOrdre.set(c.niveau.ordre, arr);
  }

  return db.$transaction(async (tx) => {
    // 1) Clôture de l'année courante
    await tx.anneeScolaire.update({ where: { id: annee.id }, data: { active: false } });
    // 2) Ouverture de la suivante
    const nouvelle = await tx.anneeScolaire.create({
      data: {
        ecoleId: annee.ecoleId,
        libelle: libelleSuivant,
        dateDebut: new Date(debutSuivant, 8, 1), // 1er septembre
        dateFin: new Date(finSuivant, 6, 31), // 31 juillet
        active: true,
      },
    });

    let montes = 0;
    let dernierNiveau = 0;
    for (const e of eleves) {
      // 3) Historisation de l'année écoulée
      if (e.classeActuelleId) {
        await tx.eleveHistoriqueClasse.create({
          data: {
            eleveId: e.id,
            classeId: e.classeActuelleId,
            dateEntree: e.dateInscription ?? annee.dateDebut,
            dateSortie: new Date(),
            motif: `Clôture année ${annee.libelle}`,
          },
        });
      }
      // 4) Montée de niveau si une classe existe au niveau suivant
      const ordre = e.classeActuelle?.niveau.ordre;
      if (ordre !== undefined && e.classeActuelleId) {
        const suivantes = parOrdre.get(ordre + 1);
        if (suivantes && suivantes.length > 0) {
          await tx.eleve.update({ where: { id: e.id }, data: { classeActuelleId: suivantes[0].id } });
          montes++;
        } else {
          dernierNiveau++;
        }
      }
    }

    await tx.notification.create({
      data: {
        ecoleId: annee.ecoleId,
        destinataireType: 'personnel',
        destinataireId: ctx.utilisateurId,
        sujet: `Transition d'année scolaire : ${annee.libelle} → ${libelleSuivant}`,
        corps: `L'année ${annee.libelle} est clôturée. ${montes} élève(s) promu(s) au niveau supérieur, ${dernierNiveau} en fin de cycle. La nouvelle année ${libelleSuivant} est active.`,
        canal: 'in_app',
        statut: 'envoye',
        dateEnvoi: new Date(),
      },
    });
    await logAction(tx, annee.ecoleId, ctx.utilisateurId, 'annee.cloture_transition', 'annee_scolaire', nouvelle.id, {
      ancienne: annee.libelle,
      nouvelle: libelleSuivant,
      eleves: eleves.length,
      montes,
      dernierNiveau,
    });
    return { nouvelleAnneeId: nouvelle.id, libelle: libelleSuivant, eleves: eleves.length, montes, dernierNiveau };
  }, { timeout: 30000, maxWait: 10000 });
}
