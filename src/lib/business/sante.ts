// ====================================================================
// MÉTIER SANTÉ & INFIRMERIE (P2)
// Passages à l'infirmerie avec notification réelle des parents pour
// les issues sensibles (retour domicile, hôpital), fiches santé et
// vaccinations.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, eleveDuTenant, logAction, notifierParentsEtDirection } from './commun';
import { chiffrer, déchiffrer } from '@/lib/crypto';

const ISSUES = ['retour_classe', 'parents_contactes', 'depart_hopital', 'retour_domicile'];

export type PassageInput = {
  eleveId: string;
  motif: string;
  symptomes?: string;
  soinsAdministres?: string;
  temperature?: number;
  issue: string;
  notifierParents?: boolean;
};

export async function enregistrerPassageInfirmerieCore(ctx: Ctx, input: PassageInput) {
  assertPermission(ctx, 'sante.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (!input.motif?.trim()) throw new ActionError('Le motif du passage est obligatoire.', 'CHAMP_MANQUANT');
  if (!ISSUES.includes(input.issue)) {
    throw new ActionError(`Issue invalide : ${input.issue} (attendu : ${ISSUES.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  if (input.temperature !== undefined && (input.temperature < 30 || input.temperature > 45)) {
    throw new ActionError('Température invraisemblable (30–45 °C attendus).', 'CHAMP_INVALIDE');
  }
  const fiche = await db.ficheSante.findUnique({ where: { eleveId: input.eleveId } });

  // Issue sensible OU demande explicite → les parents sont réellement notifiés.
  const issueSensible = input.issue !== 'retour_classe';

  return db.$transaction(async (tx) => {
    const p = await tx.passageInfirmerie.create({
      data: {
        ecoleId: eleve.ecoleId!,
        eleveId: input.eleveId,
        ficheSanteId: fiche?.id,
        datePassage: new Date(),
        motif: input.motif.trim(),
        symptomes: input.symptomes?.trim() || undefined,
        soinsAdministres: input.soinsAdministres?.trim() || undefined,
        temperature: input.temperature,
        issue: input.issue,
        personnelId: ctx.utilisateurId,
        parentsNotifies: false,
      },
    });
    let nb = 0;
    if (issueSensible || input.notifierParents) {
      const corps = `Passage à l'infirmerie de ${eleve.prenom} ${eleve.nom} : ${input.motif}${
        input.symptomes ? ` (symptômes : ${input.symptomes})` : ''
      }. Issue : ${input.issue.replace(/_/g, ' ')}.`;
      nb = await notifierParentsEtDirection(
        tx,
        eleve.ecoleId!,
        input.eleveId,
        `Infirmerie — ${eleve.prenom} ${eleve.nom}`,
        corps,
      );
      await tx.passageInfirmerie.update({ where: { id: p.id }, data: { parentsNotifies: nb > 0 } });
    }
    await logAction(tx, eleve.ecoleId, ctx.utilisateurId, 'infirmerie.passage', 'passage_infirmerie', p.id, {
      eleveId: input.eleveId,
      issue: input.issue,
      notificationsEnvoyees: nb,
    });
    return { passageId: p.id, notificationsEnvoyees: nb };
  }, { timeout: 30000, maxWait: 10000 });
}

// --------------------------------------------------------------------
// Fiche santé
// --------------------------------------------------------------------

export type FicheSanteInput = {
  eleveId: string;
  groupeSanguin?: string;
  allergies?: string;
  traitementsEnCours?: string;
  antecedents?: string;
  medecinTraitant?: string;
  telephoneUrgence?: string;
  contactUrgenceNom?: string;
  autorisationTraitement?: boolean;
};

const GROUPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export async function enregistrerFicheSanteCore(ctx: Ctx, input: FicheSanteInput) {
  assertPermission(ctx, 'sante.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (input.groupeSanguin && !GROUPES.includes(input.groupeSanguin)) {
    throw new ActionError(`Groupe sanguin invalide : ${input.groupeSanguin}.`, 'CHAMP_INVALIDE');
  }
  if (input.telephoneUrgence && !/^[\d+\s-]{6,20}$/.test(input.telephoneUrgence)) {
    throw new ActionError('Téléphone d\'urgence invalide.', 'CHAMP_INVALIDE');
  }
  // E3 — champs médicaux sensibles chiffrés au repos (AES-256-GCM)
  const data = {
    ecoleId: eleve.ecoleId!,
    eleveId: input.eleveId,
    groupeSanguin: input.groupeSanguin,
    allergies: chiffrer(input.allergies?.trim() || undefined),
    traitementsEnCours: chiffrer(input.traitementsEnCours?.trim() || undefined),
    antecedents: chiffrer(input.antecedents?.trim() || undefined),
    medecinTraitant: input.medecinTraitant?.trim() || undefined,
    telephoneUrgence: input.telephoneUrgence?.trim() || undefined,
    contactUrgenceNom: input.contactUrgenceNom?.trim() || undefined,
    autorisationTraitement: input.autorisationTraitement ?? false,
    dateMiseAJour: new Date(),
    misAJourParId: ctx.utilisateurId,
  };
  const fiche = await db.ficheSante.upsert({
    where: { eleveId: input.eleveId },
    create: data,
    update: data,
  });
  // F20 — UNIQUE write path santé : la fiche santé est la source de vérité,
  // les champs rapides d'Eleve (affichage listes) sont synchronisés.
  await db.eleve.update({
    where: { id: input.eleveId },
    data: {
      allergies: input.allergies?.trim() || null,
      conditionMedicale: input.traitementsEnCours?.trim() || input.antecedents?.trim() || null,
      contactUrgence: input.contactUrgenceNom?.trim() || input.telephoneUrgence?.trim()
        ? JSON.stringify({
            nom: input.contactUrgenceNom?.trim() ?? null,
            telephone: input.telephoneUrgence?.trim() ?? null,
          })
        : null,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'sante.fiche_enregistree', 'fiche_sante', fiche.id, { eleveId: input.eleveId });
  return { ficheSanteId: fiche.id };
}

// --------------------------------------------------------------------
// Vaccinations
// --------------------------------------------------------------------

export type VaccinationInput = {
  eleveId: string;
  vaccin: string;
  dateVaccination?: Date;
  dateRappel?: Date;
  statut?: string;
};

export async function enregistrerVaccinationCore(ctx: Ctx, input: VaccinationInput) {
  assertPermission(ctx, 'sante.gerer');
  const eleve = await eleveDuTenant(input.eleveId, ctx);
  if (!input.vaccin?.trim()) throw new ActionError('Le nom du vaccin est obligatoire.', 'CHAMP_MANQUANT');
  if (input.dateVaccination && isNaN(input.dateVaccination.getTime())) throw new ActionError('Date de vaccination invalide.', 'DATE_INVALIDE');
  if (input.dateRappel && input.dateVaccination && input.dateRappel < input.dateVaccination) {
    throw new ActionError('La date de rappel doit être postérieure à la vaccination.', 'DATE_INVALIDE');
  }
  const statut = input.dateRappel ? 'rappel_prevu' : input.statut ?? 'a_jour';
  const v = await db.vaccination.create({
    data: {
      ecoleId: eleve.ecoleId!,
      eleveId: input.eleveId,
      vaccin: input.vaccin.trim(),
      dateVaccination: input.dateVaccination,
      dateRappel: input.dateRappel,
      statut,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'sante.vaccination', 'vaccination', v.id, {
    eleveId: input.eleveId,
    vaccin: input.vaccin,
  });
  return { vaccinationId: v.id };
}

// --------------------------------------------------------------------
// C6 — Rappels de vaccination : détecte les rappels échus → notifie
// l'infirmière et la direction (idempotent via statut 'rappel_envoye').
// Appelé par /api/pulse ET disponible en action manuelle.
// --------------------------------------------------------------------
export async function verifierRappelsVaccinationCore() {
  const échus = await db.vaccination.findMany({
    where: { dateRappel: { lt: new Date() }, statut: 'rappel_prevu' },
    include: { eleve: { select: { id: true, nom: true, prenom: true, ecoleId: true } } },
  });
  let notifiés = 0;
  for (const v of échus) {
    if (!v.eleve?.ecoleId) continue;
    const { getDirectionUserId } = await import('./commun');
    const dirId = await getDirectionUserId(v.eleve.ecoleId);
    const infirmière = await db.utilisateur.findFirst({
      where: { ecoleId: v.eleve.ecoleId, email: { contains: 'infirm' } },
    });
    const destinataires = [dirId, infirmière?.id].filter((x): x is string => Boolean(x));
    for (const destinataireId of destinataires) {
      await db.notification.create({
        data: {
          ecoleId: v.eleve.ecoleId, destinataireType: 'personnel', destinataireId,
          sujet: `💉 Rappel de vaccination échu — ${v.eleve.prenom} ${v.eleve.nom}`,
          corps: `Le rappel du vaccin « ${v.vaccin} » était attendu le ${v.dateRappel?.toISOString().slice(0, 10)}. Contacter la famille.`,
          canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(),
        },
      });
    }
    await db.vaccination.update({ where: { id: v.id }, data: { statut: 'rappel_envoye' } });
    notifiés++;
  }
  return { rappelsÉchus: échus.length, notifiés };
}
