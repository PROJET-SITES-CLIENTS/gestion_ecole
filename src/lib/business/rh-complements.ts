// ====================================================================
// RH — COMPLÉMENTS : formations continues, sanctions disciplinaires,
// acquisition automatique des soldes de congés (idempotente).
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction } from './commun';

// --------------------------------------------------------------------
// FORMATIONS
// --------------------------------------------------------------------

export async function creerFormationCore(ctx: Ctx, input: { personnelId: string; intitule: string; organisme?: string; dateDebut: Date; dateFin?: Date; cout?: number }) {
  assertPermission(ctx, 'rh.gerer');
  const p = await db.personnel.findUnique({ where: { id: input.personnelId } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  const f = await db.formationPersonnel.create({
    data: {
      ecoleId: p.ecoleId, personnelId: p.id, intitule: input.intitule.trim(),
      organisme: input.organisme?.trim() || null, dateDebut: input.dateDebut,
      dateFin: input.dateFin ?? null, cout: input.cout != null ? Math.round(input.cout * 100) : null,
      statut: 'planifiee',
    },
  });
  await logAction(db, p.ecoleId, ctx.utilisateurId, 'rh.formation_creee', 'formation_personnel', f.id, { personnelId: p.id });
  return { formationId: f.id };
}

export async function majFormationCore(ctx: Ctx, formationId: string, statut: 'en_cours' | 'terminee' | 'annulee', certificatObtenu?: boolean) {
  assertPermission(ctx, 'rh.gerer');
  const f = await db.formationPersonnel.findUnique({ where: { id: formationId } });
  if (!f) throw new ActionError('Formation introuvable.', 'INTROUVABLE');
  assertTenant(f.ecoleId, ctx, 'Cette formation');
  await db.formationPersonnel.update({
    where: { id: formationId },
    data: { statut, ...(certificatObtenu != null ? { certificatObtenu } : {}), ...(statut === 'terminee' ? { dateFin: f.dateFin ?? new Date() } : {}) },
  });
  return { formationId, statut };
}

// --------------------------------------------------------------------
// SANCTIONS DISCIPLINAIRES DU PERSONNEL (registre formalisé)
// --------------------------------------------------------------------

export async function sanctionnerPersonnelCore(ctx: Ctx, input: { personnelId: string; dateFaits: Date; faute: string; typeSanction: string; description: string }) {
  assertPermission(ctx, 'rh.gerer');
  const p = await db.personnel.findUnique({ where: { id: input.personnelId } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  const types = ['avertissement', 'oral', 'blame', 'mise_a_demeure', 'licenciement'];
  if (!types.includes(input.typeSanction)) throw new ActionError('Type de sanction invalide.', 'CHAMP_INVALIDE');
  if (input.typeSanction === 'licenciement') assertPermission(ctx, 'admin.saas'); // décision direction
  const s = await db.sanctionPersonnel.create({
    data: {
      ecoleId: p.ecoleId, personnelId: p.id, dateFaits: input.dateFaits,
      faute: input.faute.trim(), typeSanction: input.typeSanction,
      description: input.description.trim(), decideParId: ctx.utilisateurId,
    },
  });
  // Notification écrite au salarié
  await db.notification.create({
    data: {
      ecoleId: p.ecoleId, destinataireType: 'personnel', destinataireId: p.utilisateurId ?? ctx.utilisateurId,
      sujet: `⚠️ Sanction disciplinaire : ${input.typeSanction}`,
      corps: `Une sanction de type « ${input.typeSanction} » a été notifiée à la suite des faits du ${input.dateFaits.toLocaleDateString('fr-FR')}. Consultez les RH pour un entretien.`,
      canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(),
    },
  }).catch(() => {});
  await logAction(db, p.ecoleId, ctx.utilisateurId, 'rh.sanction', 'sanction_personnel', s.id, { personnelId: p.id, type: input.typeSanction });
  return { sanctionId: s.id };
}

// --------------------------------------------------------------------
// ACQUISITION AUTOMATIQUE DES SOLDES DE CONGÉS — idempotente :
// creditedThrough mémorise le dernier mois crédité (2,5 j/mois par
// défaut, paramétrable), plafonné au report autorisé.
// --------------------------------------------------------------------

export async function acquitterSoldesCongesCore(ctx: Ctx, opts: { joursParMois?: number; plafondReport?: number } = {}) {
  assertPermission(ctx, 'rh.gerer');
  const joursParMois = opts.joursParMois ?? 2.5;
  const plafond = opts.plafondReport ?? 30;
  const personnels = await db.personnel.findMany({
    where: { ecoleId: ctx.ecoleId!, deletedAt: null, statut: 'actif' },
  });
  const maintenant = new Date();
  const moisCourant = maintenant.getUTCFullYear() * 12 + maintenant.getUTCMonth();
  let credites = 0, totalJours = 0;

  for (const p of personnels) {
    // Embauche : l'acquisition démarre le mois suivant
    const moisEmbauche = new Date(p.dateEmbauche).getUTCFullYear() * 12 + new Date(p.dateEmbauche).getUTCMonth() + 1;
    const moisDernier = Math.min(moisCourant, moisCourant); // crédit jusqu'au mois précédent inclus
    const moisCreditableMax = moisCourant - 1 >= moisEmbauche ? moisCourant - 1 : 0;
    let solde = await db.soldeConge.findFirst({ where: { personnelId: p.id, annee: String(maintenant.getUTCFullYear()) } });
    const creditedThrough = solde ? (solde as any).creditedThrough ?? 0 : 0;
    const moisADecrediter = Math.max(0, Math.min(moisCreditableMax, moisDernier) - Math.max(creditedThrough, moisEmbauche - 1));
    if (moisADecrediter <= 0) continue;
    const jours = moisADecrediter * joursParMois;
    if (!solde) {
      solde = await db.soldeConge.create({
        data: { ecoleId: p.ecoleId, personnelId: p.id, annee: String(maintenant.getUTCFullYear()), droitsAcquis: jours, joursPris: 0, creditedThrough: moisCreditableMax } as never,
      });
    } else {
      await db.soldeConge.update({
        where: { id: solde.id },
        data: { droitsAcquis: { increment: jours }, creditedThrough: moisCreditableMax } as never,
      });
    }
    // Plafond de report
    const apres = await db.soldeConge.findUnique({ where: { id: solde.id } });
    const acquis = (apres?.droitsAcquis ?? 0) - (apres?.joursPris ?? 0);
    if (acquis > plafond) {
      const excess = acquis - plafond;
      await db.soldeConge.update({ where: { id: solde.id }, data: { droitsAcquis: { decrement: excess } } });
      totalJours -= excess;
    }
    credites++; totalJours += jours;
  }
  await logAction(db, ctx.ecoleId!, ctx.utilisateurId, 'rh.soldes_conges', 'solde_conge', ctx.ecoleId!, { credites, joursParMois, totalJours });
  return { credites, totalJours, joursParMois };
}
