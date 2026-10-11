// ====================================================================
// MÉTIER RH — flux congés + remplacements (P2)
// demande → validation/refus → remplacement planifié (contrôles :
// chevauchements, remplacement par soi-même, dates cohérentes)
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, avecVerrou } from './commun';
import { hashPassword } from '@/lib/auth-hash';
import { TYPES_CONTRAT } from '@/lib/constants';
async function personnelDuTenant(personnelId: string, ctx: Ctx) {
  const p = await db.personnel.findUnique({ where: { id: personnelId } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  return p;
}

function validerDates(debut: Date, fin: Date) {
  if (isNaN(debut.getTime()) || isNaN(fin.getTime())) throw new ActionError('Dates invalides.', 'DATE_INVALIDE');
  if (fin < debut) throw new ActionError('La date de fin doit être postérieure à la date de début.', 'DATE_INVALIDE');
}

/** Un congé (non refusé) chevauche-t-il la période pour ce personnel ? */
async function congeEnChevauchement(personnelId: string, debut: Date, fin: Date, exclureId?: string) {
  const existants = await db.conge.findMany({
    where: { personnelId, statut: { in: ['demande', 'valide'] } },
  });
  return existants.some((c) => {
    if (exclureId && c.id === exclureId) return false;
    return debut <= c.dateFin && fin >= c.dateDebut;
  });
}

// --------------------------------------------------------------------
// Demande de congé
// --------------------------------------------------------------------

export type DemandeCongeInput = {
  personnelId: string;
  type: string;
  dateDebut: Date;
  dateFin: Date;
  motif?: string;
};

const TYPES_CONGE = ['annuel', 'maladie', 'maternite', 'exceptionnel'];

export async function demanderCongeCore(ctx: Ctx, input: DemandeCongeInput) {
  assertPermission(ctx, 'rh.gerer');
  const p = await personnelDuTenant(input.personnelId, ctx);
  if (!TYPES_CONGE.includes(input.type)) {
    throw new ActionError(`Type de congé invalide : ${input.type} (attendu : ${TYPES_CONGE.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  validerDates(input.dateDebut, input.dateFin);
  if (await congeEnChevauchement(input.personnelId, input.dateDebut, input.dateFin)) {
    throw new ActionError('Chevauchement détecté : ce personnel a déjà un congé (demandé ou validé) sur cette période.', 'CHEVAUCHEMENT');
  }
  const c = await db.conge.create({
    data: {
      personnelId: input.personnelId,
      type: input.type,
      dateDebut: input.dateDebut,
      dateFin: input.dateFin,
      statut: 'demande',
      motif: input.motif?.trim() || undefined,
    },
  });
  await logAction(db, p.ecoleId, ctx.utilisateurId, 'conge.demande', 'conge', c.id, { personnelId: input.personnelId, type: input.type });
  return { congeId: c.id };
}

// --------------------------------------------------------------------
// Validation / refus
// --------------------------------------------------------------------

export async function traiterCongeCore(ctx: Ctx, congeId: string, decision: 'valide' | 'refuse', commentaire?: string) {
  assertPermission(ctx, 'rh.gerer');
  const c = await db.conge.findUnique({ where: { id: congeId } });
  if (!c) throw new ActionError('Congé introuvable.', 'INTROUVABLE');
  const p = await db.personnel.findUnique({ where: { id: c.personnelId } });
  assertTenant(p?.ecoleId, ctx, 'Ce congé');
  if (c.statut !== 'demande') {
    throw new ActionError(`Congé déjà traité (statut « ${c.statut} »).`, 'DEJA_TRAITE');
  }
  // RH-5 FIX — décompte INCLUSIF des bornes (lun→mer = 3 jours), aligné sur
  // statsRhCore qui comptait déjà +1 : avant, le solde était sous-débité d'un
  // jour à chaque congé.
  const jours = Math.max(1, Math.round((c.dateFin.getTime() - c.dateDebut.getTime()) / 86400000) + 1);
  const annee = String(c.dateDebut.getFullYear());
  // RH-24 FIX — validation + décompte du solde dans UNE transaction (avant :
  // deux écritures indépendantes, solde perdu si crash entre les deux)
  await db.$transaction(async (tx) => {
    // RH-18 FIX — le motif de la DEMANDE est conservé ; le commentaire de
    // décision est annexé, jamais substitué
    const motifFinal = decision === 'refuse' && commentaire?.trim()
      ? `${c.motif ? c.motif + ' — ' : ''}motif du refus : ${commentaire.trim()}`
      : c.motif;
    await tx.conge.update({
      where: { id: congeId },
      data: { statut: decision, traiteParId: ctx.utilisateurId, motif: motifFinal },
    });
    // Solde de congés : les jours validés sont décomptés (fin de flux)
    if (decision === 'valide') {
      const solde = await tx.soldeConge.findUnique({ where: { personnelId_annee: { personnelId: c.personnelId, annee } } });
      if (solde) {
        const pris = solde.joursPris + jours;
        await tx.soldeConge.update({
          where: { id: solde.id },
          data: { joursPris: pris, joursRestants: Math.max(0, solde.droitsAcquis + solde.reliquatAnterieur - pris), derniereMaj: new Date() },
        });
      } else {
        await tx.soldeConge.create({
          data: { ecoleId: p!.ecoleId, personnelId: c.personnelId, annee, droitsAcquis: 25, joursPris: jours, joursRestants: Math.max(0, 25 - jours) },
        });
      }
    }
  }, { timeout: 30000, maxWait: 10000 });
  // RH-26 FIX — le salarié est notifié de la décision (avant : silence total)
  if (p?.utilisateurId) {
    await db.notification.create({
      data: {
        ecoleId: p.ecoleId, destinataireType: 'personnel', destinataireId: p.utilisateurId,
        sujet: decision === 'valide' ? '✅ Congé validé' : '❌ Congé refusé',
        corps: decision === 'valide'
          ? `Votre congé du ${c.dateDebut.toLocaleDateString('fr-FR')} au ${c.dateFin.toLocaleDateString('fr-FR')} (${jours} j) est VALIDÉ.${commentaire?.trim() ? ` Note : ${commentaire.trim()}` : ''}`
          : `Votre demande de congé du ${c.dateDebut.toLocaleDateString('fr-FR')} au ${c.dateFin.toLocaleDateString('fr-FR')} a été REFUSÉE.${commentaire?.trim() ? ` Motif : ${commentaire.trim()}` : ''}`,
        canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(),
      },
    }).catch(() => undefined);
  }
  await logAction(db, p!.ecoleId, ctx.utilisateurId, `conge.${decision}`, 'conge', congeId, { personnelId: c.personnelId, jours });
  return { congeId, decision, jours };
}

// --------------------------------------------------------------------
// Remplacement
// --------------------------------------------------------------------

export type RemplacementInput = {
  congeId: string;
  personnelRemplacantId: string;
  dateDebut: Date;
  dateFin: Date;
};

export async function assignerRemplacementCore(ctx: Ctx, input: RemplacementInput) {
  assertPermission(ctx, 'rh.gerer');
  const conge = await db.conge.findUnique({ where: { id: input.congeId } });
  if (!conge) throw new ActionError('Congé introuvable.', 'INTROUVABLE');
  const absent = await db.personnel.findUnique({ where: { id: conge.personnelId } });
  assertTenant(absent?.ecoleId, ctx, 'Ce congé');
  const remplacant = await personnelDuTenant(input.personnelRemplacantId, ctx);
  if (remplacant.id === conge.personnelId) {
    throw new ActionError('Le remplaçant ne peut pas être la personne absente.', 'REMPLACEMENT_INVALIDE');
  }
  if (conge.statut !== 'valide') {
    throw new ActionError('Le congé doit être validé avant de planifier un remplacement.', 'CONGE_NON_VALIDE');
  }
  validerDates(input.dateDebut, input.dateFin);
  // RH-6 FIX — le remplacement couvre une période INCLUSE dans le congé :
  // avant, des dates sans aucun rapport avec l'absence étaient acceptées.
  const debutConge = new Date(conge.dateDebut); debutConge.setHours(0, 0, 0, 0);
  const finConge = new Date(conge.dateFin); finConge.setHours(23, 59, 59, 999);
  if (input.dateDebut < debutConge || input.dateFin > finConge) {
    throw new ActionError(
      `Le remplacement doit être inclus dans la période du congé (du ${conge.dateDebut.toLocaleDateString('fr-FR')} au ${conge.dateFin.toLocaleDateString('fr-FR')}).`,
      'PERIODE_INVALIDE',
    );
  }
  // Le remplaçant ne doit pas être en congé ni déjà remplaçant sur la période.
  if (await congeEnChevauchement(remplacant.id, input.dateDebut, input.dateFin)) {
    throw new ActionError('Le remplaçant est en congé (ou a une demande) sur cette période.', 'CHEVAUCHEMENT');
  }
  const remplacementsExistants = await db.remplacement.findMany({
    where: { personnelRemplacantId: remplacant.id, statut: { in: ['planifie', 'en_cours'] } },
  });
  if (remplacementsExistants.some((r) => input.dateDebut <= r.dateFin && input.dateFin >= r.dateDebut)) {
    throw new ActionError('Le remplaçant assure déjà un remplacement sur cette période.', 'CHEVAUCHEMENT');
  }

  const r = await db.remplacement.create({
    data: {
      congeId: input.congeId,
      personnelAbsentId: conge.personnelId,
      personnelRemplacantId: remplacant.id,
      dateDebut: input.dateDebut,
      dateFin: input.dateFin,
      statut: 'planifie',
    },
  });
  await logAction(db, absent!.ecoleId, ctx.utilisateurId, 'remplacement.assignation', 'remplacement', r.id, {
    absentId: conge.personnelId,
    remplacantId: remplacant.id,
  });
  return { remplacementId: r.id };
}

// --------------------------------------------------------------------
// F3 — Création d'un personnel (+ compte utilisateur optionnel)
// --------------------------------------------------------------------

export type CreationPersonnelInput = {
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  dateEmbauche: Date;
  typeContrat?: string;
  salaireBrut?: number; // CENTIMES (F16)
  diplomePrincipal?: string;
  creerCompte?: boolean;
  motDePasseInitial?: string; // fourni par l'action (jamais stocké en clair)
  perimetreSecretariat?: 'primaire' | 'secondaire'; // split secrétariat (null = école entière)
};

async function prochainMatriculePersonnel(tx: any, ecoleId: string): Promise<string> {
  const liste = await tx.personnel.findMany({
    where: { ecoleId, matricule: { startsWith: 'PER-' } },
    select: { matricule: true },
  });
  let max = 0;
  for (const p of liste) {
    const n = parseInt((p.matricule ?? '').slice(4), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `PER-${String(max + 1).padStart(4, '0')}`;
}

export async function creerPersonnelCore(ctx: Ctx, ecoleId: string, input: CreationPersonnelInput & { roleCode?: string }) {
  assertPermission(ctx, 'rh.gerer');
  if (!input.nom?.trim()) throw new ActionError('Le nom est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.prenom?.trim()) throw new ActionError('Le prénom est obligatoire.', 'CHAMP_MANQUANT');
  if (isNaN(input.dateEmbauche?.getTime())) throw new ActionError("Date d'embauche invalide.", 'DATE_INVALIDE');
  if (input.typeContrat && !(TYPES_CONTRAT as readonly string[]).includes(input.typeContrat)) {
    throw new ActionError(`Type de contrat invalide (attendu : ${TYPES_CONTRAT.join(', ')}).`, 'CHAMP_INVALIDE');
  }
  if (input.salaireBrut !== undefined && (!Number.isInteger(input.salaireBrut) || input.salaireBrut < 0)) {
    throw new ActionError('Le salaire brut est invalide.', 'MONTANT_INVALIDE');
  }
  if (input.creerCompte) {
    if (!input.email?.trim()) throw new ActionError('L\'email est obligatoire pour créer le compte utilisateur.', 'CHAMP_MANQUANT');
    if (!input.motDePasseInitial || input.motDePasseInitial.length < 8) {
      throw new ActionError('Le mot de passe initial doit comporter au moins 8 caractères.', 'CHAMP_INVALIDE');
    }
    const existant = await db.utilisateur.findFirst({ where: { email: input.email.trim().toLowerCase(), deletedAt: null } });
    if (existant) throw new ActionError('Un compte avec cet email existe déjà.', 'EMAIL_PRIS');
  }

  const debut = Date.now();
  return avecVerrou('rh:perso', async () => {
  const MAX_RETRY = 4;
  for (let tentative = 1; tentative <= MAX_RETRY; tentative++) {
    try {
      // Idempotence : commit ambigu du retry (P2034) → on RETROUVE le personnel créé.
      const dejaLa = await db.personnel.findFirst({
        where: { ecoleId, nom: input.nom.trim(), prenom: input.prenom.trim(), dateEmbauche: input.dateEmbauche, createdAt: { gte: new Date(debut - 1000) } },
      });
      if (dejaLa) return { personnelId: dejaLa.id, matricule: dejaLa.matricule!, compteCree: Boolean(dejaLa.utilisateurId), dejaCree: true };
      return await db.$transaction(async (tx) => {
        const matricule = await prochainMatriculePersonnel(tx, ecoleId);
        let utilisateurId: string | undefined;
        if (input.creerCompte && input.email) {
          const u = await tx.utilisateur.create({
            data: {
              ecoleId,
              email: input.email.trim().toLowerCase(),
              motDePasseHash: hashPassword(input.motDePasseInitial!),
              nom: input.nom.trim(),
              prenom: input.prenom.trim(),
              type: 'personnel',
              telephone: input.telephone?.trim() || undefined,
            },
          });
          utilisateurId = u.id;
          // ⬅️ ASSIGNER LE RÔLE dès la création (sinon le compte n'a AUCUNE permission)
          const roleCode = input.roleCode || 'enseignant'; // défaut sensé
          const role = await tx.role.findFirst({ where: { ecoleId, code: roleCode } });
          if (role) {
            await tx.utilisateurRole.create({ data: { utilisateurId: u.id, roleId: role.id } });
          }
        }
        const p = await tx.personnel.create({
          data: {
            ecoleId,
            utilisateurId,
            matricule,
            nom: input.nom.trim(),
            prenom: input.prenom.trim(),
            email: input.email?.trim() || undefined,
            telephone: input.telephone?.trim() || undefined,
            dateEmbauche: input.dateEmbauche,
            // RH-2 FIX — la fiche ET le contrat portent le salaire/type : avant,
            // seul le contrat était rempli → la fiche affichait « — » juste
            // après création malgré un salaire saisi dans le formulaire.
            typeContrat: input.typeContrat || 'CDI',
            salaireBrut: input.salaireBrut || 0,
            contrats: { create: { typeContrat: input.typeContrat || 'CDI', salaireBrut: input.salaireBrut || 0, dateDebut: input.dateEmbauche } },
            diplomePrincipal: input.diplomePrincipal?.trim() || undefined,
            ...(input.perimetreSecretariat ? { perimetreSecretariat: input.perimetreSecretariat } : {}),
            statut: 'actif',
          },
        });
        // Solde de congés initial pour l'année en cours
        await tx.soldeConge.upsert({
          where: { personnelId_annee: { personnelId: p.id, annee: String(new Date().getFullYear()) } },
          create: { ecoleId, personnelId: p.id, annee: String(new Date().getFullYear()), droitsAcquis: 25, joursPris: 0, joursRestants: 25 },
          update: {},
        });
        await logAction(tx, ecoleId, ctx.utilisateurId, 'personnel.creation', 'personnel', p.id, {
          matricule,
          compteCree: Boolean(utilisateurId),
        });
        return { personnelId: p.id, matricule, compteCree: Boolean(utilisateurId) };
      }, { timeout: 60000, maxWait: 15000 });
    } catch (e: any) {
      if (e instanceof ActionError) throw e;
      const collision = e?.code === 'P2002' && String(e?.meta?.target ?? '').includes('matricule');
      if (collision && tentative < MAX_RETRY) continue;
      throw e;
    }
  }
  throw new ActionError('Création impossible (collision de matricule).', 'COLLISION_MATRICULE');
  });
}

/** F3 — annulation d'une demande de congé. RH-19 — un congé VALIDÉ peut
 *  désormais être annulé (sans remplacement en cours) : les jours décomptés
 *  sont REVERSÉS au solde (avant : aucune sortie possible, jours perdus). */
export async function annulerCongeCore(ctx: Ctx, congeId: string) {
  assertPermission(ctx, 'rh.gerer');
  const c = await db.conge.findUnique({ where: { id: congeId }, include: { remplacements: true } });
  if (!c) throw new ActionError('Congé introuvable.', 'INTROUVABLE');
  const p = await db.personnel.findUnique({ where: { id: c.personnelId } });
  assertTenant(p?.ecoleId, ctx, 'Ce congé');
  if (c.statut === 'refuse' || c.statut === 'annule') {
    throw new ActionError('Ce congé est déjà clos.', 'DEJA_TRAITE');
  }
  const remplacementsActifs = c.remplacements.filter((r) => ['planifie', 'en_cours'].includes(r.statut));
  if (remplacementsActifs.length > 0) {
    throw new ActionError('Des remplacements actifs sont liés à ce congé : annulez-les d\'abord.', 'REMPLACEMENT_LIE');
  }
  // Reversement des jours si le congé avait été validé (décompte inclusif)
  if (c.statut === 'valide') {
    const jours = Math.max(1, Math.round((c.dateFin.getTime() - c.dateDebut.getTime()) / 86400000) + 1);
    const annee = String(c.dateDebut.getFullYear());
    const solde = await db.soldeConge.findUnique({ where: { personnelId_annee: { personnelId: c.personnelId, annee } } });
    if (solde) {
      const pris = Math.max(0, solde.joursPris - jours);
      await db.soldeConge.update({
        where: { id: solde.id },
        data: { joursPris: pris, joursRestants: Math.max(0, solde.droitsAcquis + solde.reliquatAnterieur - pris), derniereMaj: new Date() },
      });
    }
    await logAction(db, p!.ecoleId, ctx.utilisateurId, 'conge.reversement_solde', 'conge', congeId, { joursReverses: jours });
  }
  await db.conge.update({ where: { id: congeId }, data: { statut: 'annule' } });
  await logAction(db, p!.ecoleId, ctx.utilisateurId, 'conge.annulation', 'conge', congeId, { statutPrecedent: c.statut });
  return { congeId, statutPrecedent: c.statut };
}

// --------------------------------------------------------------------
// SECRÉTARIAT SPLIT — périmètre primaire/secondaire éditable
// RH-31 FIX — permission rh.gerer (l'admin.saas rendait l'action inatteignable
// et aucun formulaire ne permettait de corriger le périmètre après création).
// --------------------------------------------------------------------

export async function majPerimetreSecretariatCore(ctx: Ctx, personnelId: string, perimetre: 'primaire' | 'secondaire' | null) {
  assertPermission(ctx, 'rh.gerer');
  const p = await db.personnel.findUnique({ where: { id: personnelId } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  await db.personnel.update({ where: { id: personnelId }, data: { perimetreSecretariat: perimetre } });
  await logAction(db, p.ecoleId, ctx.utilisateurId, 'personnel.perimetre_secretariat', 'personnel', personnelId, { perimetre: perimetre ?? 'ecole' });
  return { personnelId, perimetre: perimetre ?? 'ecole' };
}
