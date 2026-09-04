// ====================================================================
// MÉTIER EXTRASCOLAIRE (M7) + ANALYTICS DIRECTION (V1, V2, V3, V7)
// Activités/sorties/voyages avec autorisations parentales et facturation ;
// agrégats financiers et pédagogiques pour le cockpit direction.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, eleveDuTenant, logAction, avecVerrou } from './commun';

// --------------------------------------------------------------------
// M7 — ACTIVITÉS / SORTIES / VOYAGES
// --------------------------------------------------------------------

export async function creerActiviteCore(ctx: Ctx, ecoleId: string, input: { type: string; titre: string; description?: string; destination?: string; dateDebut: Date; dateFin: Date; cout?: number; capacite?: number }) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  if (!input.titre?.trim()) throw new ActionError('Le titre est obligatoire.', 'CHAMP_MANQUANT');
  if (!['activite', 'sortie', 'voyage'].includes(input.type)) throw new ActionError('Type invalide (activite/sortie/voyage).', 'CHAMP_INVALIDE');
  if (isNaN(input.dateDebut?.getTime()) || isNaN(input.dateFin?.getTime())) throw new ActionError('Dates invalides.', 'DATE_INVALIDE');
  if (input.dateFin < input.dateDebut) throw new ActionError('La date de fin doit suivre la date de début.', 'DATE_INVALIDE');
  if (input.cout !== undefined && (!Number.isInteger(input.cout) || input.cout < 0)) throw new ActionError('Coût invalide (centimes).', 'MONTANT_INVALIDE');
  const a = await db.activite.create({
    data: {
      ecoleId, type: input.type, titre: input.titre.trim(),
      description: input.description?.trim() || null, destination: input.destination?.trim() || null,
      dateDebut: input.dateDebut, dateFin: input.dateFin, cout: input.cout ?? 0,
      capacite: input.capacite ?? null, creeParId: ctx.utilisateurId,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'activite.creation', 'activite', a.id, { titre: input.titre, type: input.type });
  return { activiteId: a.id };
}

export async function inscrireParticipantCore(ctx: Ctx, input: { activiteId: string; eleveIds: string[] }) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const a = await db.activite.findUnique({ where: { id: input.activiteId } });
  if (!a) throw new ActionError('Activité introuvable.', 'INTROUVABLE');
  assertTenant(a.ecoleId, ctx, 'Cette activité');
  if (a.statut === 'annulee') throw new ActionError('Activité annulée.', 'STATUT_INVALIDE');
  let inscrits = 0;
  for (const eleveId of input.eleveIds) {
    const eleve = await eleveDuTenant(eleveId, ctx);
    void eleve;
    const existant = await db.activiteParticipant.findUnique({ where: { activiteId_eleveId: { activiteId: a.id, eleveId } } });
    if (existant) continue;
    if (a.capacite) {
      // Le count BD inclut déjà les inscriptions de CETTE boucle (créations
      // immédiates) — ne PAS ajouter le compteur local (double comptage).
      const total = await db.activiteParticipant.count({ where: { activiteId: a.id, statut: { not: 'annule' } } });
      if (total >= a.capacite) throw new ActionError(`Capacité atteinte (${a.capacite} participants).`, 'CAPACITE_ATTEINTE');
    }
    await db.activiteParticipant.create({
      data: { activiteId: a.id, eleveId, paiementStatut: a.cout > 0 ? 'a_payer' : 'non_exigible' },
    });
    inscrits++;
  }
  await logAction(db, a.ecoleId, ctx.utilisateurId, 'activite.inscriptions', 'activite', a.id, { inscrits });
  return { inscrits };
}

/** Autorisation parentale : accord/refus (par le parent connecté OU saisie back-office). */
export async function traiterAutorisationCore(ctx: Ctx, participationId: string, decision: 'accordee' | 'refusee', parParent = false) {
  const p = await db.activiteParticipant.findUnique({ where: { id: participationId }, include: { activite: true, eleve: true } });
  if (!p) throw new ActionError('Participation introuvable.', 'INTROUVABLE');
  assertTenant(p.activite.ecoleId, ctx, 'Cette participation');
  if (parParent) {
    // Le parent doit être rattaché à l'élève (vérification serveur)
    if (ctx.type === 'parent') {
      const parent = await db.parentTuteur.findFirst({ where: { utilisateurId: ctx.utilisateurId } });
      const lien = parent ? await db.eleveParent.findUnique({ where: { eleveId_parentId: { eleveId: p.eleveId, parentId: parent.id } } }) : null;
      if (!lien) throw new ActionError('Cet élève n\'est pas rattaché à votre compte.', 'TENANT_INVALIDE');
    } else {
      throw new ActionError('Réservé aux comptes parents.', 'ROLE_INVALIDE');
    }
  } else {
    assertPermission(ctx, 'vie_scolaire.gerer');
  }
  if (p.autorisation !== 'en_attente') throw new ActionError('Autorisation déjà traitée.', 'DEJA_TRAITE');
  await db.activiteParticipant.update({
    where: { id: participationId },
    data: { autorisation: decision, dateAutorisation: new Date(), statut: decision === 'accordee' ? 'confirme' : 'annule' },
  });
  return { participationId, autorisation: decision };
}

/** Facture l'activité : une échéance par participant à payer (idempotent). */
export async function facturerActiviteCore(ctx: Ctx, activiteId: string) {
  assertPermission(ctx, 'finances.ecrire');
  const a = await db.activite.findUnique({ where: { id: activiteId }, include: { participants: { include: { eleve: true } } } });
  if (!a) throw new ActionError('Activité introuvable.', 'INTROUVABLE');
  assertTenant(a.ecoleId, ctx, 'Cette activité');
  if (a.cout <= 0) return { échéancesCréées: 0, cout: 0 };
  const anneeActive = await db.anneeScolaire.findFirst({ where: { ecoleId: a.ecoleId, active: true } });
  if (!anneeActive) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');
  let frais = await db.frais.findFirst({ where: { ecoleId: a.ecoleId, libelle: `Activité — ${a.titre}` } });
  if (!frais) {
    frais = await db.frais.create({ data: { ecoleId: a.ecoleId, libelle: `Activité — ${a.titre}`, type: 'activite', montant: a.cout, devise: a.devise, periodicite: 'unique', anneeScolaireId: anneeActive.id } });
  }
  let créées = 0;
  await avecVerrou('activite:fact', () => db.$transaction(async (tx) => {
    for (const part of a.participants) {
      if (part.paiementStatut !== 'a_payer' || part.statut === 'annule') continue;
      const existante = await tx.echeanceFrais.findFirst({ where: { eleveId: part.eleveId, fraisId: frais!.id, source: `activite-${a.id}` } });
      if (existante) continue;
      await tx.echeanceFrais.create({
        data: { eleveId: part.eleveId, fraisId: frais!.id, montant: a.cout, devise: a.devise, dateEcheance: a.dateDebut, statut: 'impayee', source: `activite-${a.id}` },
      });
      await tx.activiteParticipant.update({ where: { id: part.id }, data: { paiementStatut: 'a_payer' } });
      créées++;
    }
    await logAction(tx, a.ecoleId, ctx.utilisateurId, 'activite.facturation', 'activite', a.id, { échéances: créées });
  }, { timeout: 30000, maxWait: 10000 }));
  return { échéancesCréées: créées, cout: a.cout };
}

export async function changerStatutActiviteCore(ctx: Ctx, activiteId: string, statut: string) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const a = await db.activite.findUnique({ where: { id: activiteId } });
  if (!a) throw new ActionError('Activité introuvable.', 'INTROUVABLE');
  assertTenant(a.ecoleId, ctx, 'Cette activité');
  if (!['planifiee', 'en_cours', 'terminee', 'annulee'].includes(statut)) throw new ActionError('Statut invalide.', 'CHAMP_INVALIDE');
  await db.activite.update({ where: { id: activiteId }, data: { statut } });
  return { activiteId, statut };
}

// --------------------------------------------------------------------
// V1 — ANALYTIQUE FINANCIÈRE (cockpit direction)
// --------------------------------------------------------------------

export async function analyticsFinancieresCore(ctx: Ctx, ecoleId: string) {
  assertPermission(ctx, 'finances.voir');
  const debutAnnée = new Date(new Date().getUTCFullYear(), 0, 1);
  const [paiements, echeances] = await Promise.all([
    db.paiement.findMany({ where: { ecoleId, annule: false, datePaiement: { gte: debutAnnée } }, include: { echeances: { include: { echeance: { include: { frais: true } } } } } }),
    db.echeanceFrais.findMany({ where: { eleve: { ecoleId } }, include: { frais: true, eleve: { include: { classeActuelle: true } } } }),
  ]);

  // Recettes par type de frais (année civile)
  const parType = new Map<string, number>();
  for (const p of paiements) {
    for (const alloc of p.echeances) {
      const t = alloc.echeance.frais?.type ?? 'autre';
      parType.set(t, (parType.get(t) ?? 0) + alloc.montantApplique);
    }
    if (p.echeances.length === 0) parType.set('non_alloue', (parType.get('non_alloue') ?? 0) + p.montant);
  }

  // Recouvrement par classe (année scolaire courante)
  const parClasse = new Map<string, { du: number; paye: number }>();
  for (const e of echeances) {
    const cle = e.eleve.classeActuelle?.libelle ?? 'Sans classe';
    const cur = parClasse.get(cle) ?? { du: 0, paye: 0 };
    cur.du += e.montant - e.remise;
    cur.paye += e.montantPaye;
    parClasse.set(cle, cur);
  }

  // Vieillissement des impayés (30/60/90+)
  const now = Date.now();
  const buckets = { 'à jour': 0, '1-30 j': 0, '31-60 j': 0, '61-90 j': 0, '90+ j': 0 };
  for (const e of echeances) {
    const restant = e.montant - e.remise - e.montantPaye;
    if (restant <= 0 || e.statut === 'annulee') continue;
    const âge = Math.floor((now - e.dateEcheance.getTime()) / 86400000);
    if (âge <= 0) buckets['à jour'] += restant;
    else if (âge <= 30) buckets['1-30 j'] += restant;
    else if (âge <= 60) buckets['31-60 j'] += restant;
    else if (âge <= 90) buckets['61-90 j'] += restant;
    else buckets['90+ j'] += restant;
  }

  // Projection trésorerie 3 mois : échéances à venir par mois
  const projection: Array<{ mois: string; montant: number }> = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now + i * 31 * 86400000);
    const mois = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const total = echeances.filter((e) => {
      const restant = e.montant - e.remise - e.montantPaye;
      return restant > 0 && e.statut !== 'annulee' && e.dateEcheance.toISOString().slice(0, 7) === mois;
    }).reduce((s, e) => s + (e.montant - e.remise - e.montantPaye), 0);
    projection.push({ mois, montant: total });
  }

  return {
    recettesParType: [...parType.entries()].map(([type, montant]) => ({ type, montant })),
    recouvrementParClasse: [...parClasse.entries()].map(([classe, v]) => ({
      classe, du: v.du, paye: v.paye, taux: v.du > 0 ? Number(((v.paye / v.du) * 100).toFixed(1)) : 100,
    })).sort((a, b) => a.taux - b.taux),
    vieillissementImpayes: Object.entries(buckets).map(([tranche, montant]) => ({ tranche, montant })),
    projectionTresorerie: projection,
  };
}

// --------------------------------------------------------------------
// V2 — ANALYTIQUE PÉDAGOGIQUE
// --------------------------------------------------------------------

export async function analyticsPedagogiquesCore(ctx: Ctx, ecoleId: string, periodeId?: string) {
  assertPermission(ctx, 'eleves.lire');
  const notes = await db.note.findMany({
    where: {
      evaluation: {
        ecoleId,
        calculeDansMoyenne: true,
        ...(periodeId ? { periodeId } : {}),
      },
      valeur: { not: null },
    },
    include: { evaluation: { include: { matiere: true, classe: true, enseignant: true, periode: true } } },
  });

  const moyenne = (arr: number[]) => (arr.length ? Number((arr.reduce((s, n) => s + n, 0) / arr.length).toFixed(2)) : null);

  // Par matière
  const parMatiere = new Map<string, number[]>();
  const parClasse = new Map<string, number[]>();
  const parEnseignant = new Map<string, number[]>();
  const parPeriode = new Map<string, number[]>();
  for (const n of notes) {
    const note20 = (n.valeur! / n.evaluation.sur) * 20;
    const m = n.evaluation.matiere;
    if (m) parMatiere.set(m.libelle, [...(parMatiere.get(m.libelle) ?? []), note20]);
    parClasse.set(n.evaluation.classe.libelle, [...(parClasse.get(n.evaluation.classe.libelle) ?? []), note20]);
    const ens = `${n.evaluation.enseignant.prenom} ${n.evaluation.enseignant.nom}`;
    parEnseignant.set(ens, [...(parEnseignant.get(ens) ?? []), note20]);
    const per = n.evaluation.periode.libelle;
    parPeriode.set(per, [...(parPeriode.get(per) ?? []), note20]);
  }

  return {
    totalNotes: notes.length,
    moyenneGlobale: moyenne(notes.map((n) => (n.valeur! / n.evaluation.sur) * 20)),
    parMatiere: [...parMatiere.entries()].map(([m, arr]) => ({ matiere: m, moyenne: moyenne(arr), notes: arr.length })).sort((a, b) => (a.moyenne ?? 0) - (b.moyenne ?? 0)),
    parClasse: [...parClasse.entries()].map(([c, arr]) => ({ classe: c, moyenne: moyenne(arr), notes: arr.length })).sort((a, b) => (a.moyenne ?? 0) - (b.moyenne ?? 0)),
    parEnseignant: [...parEnseignant.entries()].map(([e, arr]) => ({ enseignant: e, moyenne: moyenne(arr), notes: arr.length })).sort((a, b) => (a.moyenne ?? 0) - (b.moyenne ?? 0)),
    parPeriode: [...parPeriode.entries()].map(([p, arr]) => ({ periode: p, moyenne: moyenne(arr), notes: arr.length })),
  };
}

// --------------------------------------------------------------------
// V7 — RAPPORT DE FIN DE TRIMESTRE CONSOLIDÉ
// --------------------------------------------------------------------

export async function genererRapportTrimestreCore(ctx: Ctx, ecoleId: string, periodeId: string) {
  assertPermission(ctx, 'eleves.lire');
  const periode = await db.periode.findUnique({ where: { id: periodeId } });
  if (!periode) throw new ActionError('Période introuvable.', 'INTROUVABLE');
  assertTenant(periode.ecoleId, ctx, 'Cette période');
  const ecole = await db.ecole.findUnique({ where: { id: ecoleId } });

  const [effectifs, pedago, bulletins, echeances, incidents, absences] = await Promise.all([
    db.eleve.count({ where: { ecoleId, statut: 'actif', deletedAt: null } }),
    analyticsPedagogiquesCore(ctx, ecoleId, periodeId),
    db.bulletin.findMany({ where: { periodeId, eleve: { ecoleId } }, select: { moyenneGenerale: true, statut: true } }),
    db.echeanceFrais.findMany({ where: { eleve: { ecoleId }, dateEcheance: { gte: periode.dateDebut, lte: periode.dateFin } }, select: { montant: true, remise: true, montantPaye: true } }),
    db.incident.count({ where: { eleve: { ecoleId }, dateHeure: { gte: periode.dateDebut, lte: periode.dateFin } } }),
    db.presence.count({ where: { eleve: { ecoleId }, statut: 'absent', dateSaisie: { gte: periode.dateDebut, lte: periode.dateFin } } }),
  ]);

  const publiés = bulletins.filter((b) => b.statut === 'publie');
  const moyennes = publiés.filter((b) => b.moyenneGenerale !== null).map((b) => b.moyenneGenerale!);
  const moyenneGénérale = moyennes.length ? Number((moyennes.reduce((s, m) => s + m, 0) / moyennes.length).toFixed(2)) : null;
  const admis = moyennes.filter((m) => m >= 10).length;

  return {
    ecole: { nom: ecole?.nom ?? '' },
    periode: { libelle: periode.libelle, debut: periode.dateDebut, fin: periode.dateFin },
    effectifs,
    pedagogie: {
      moyenneGénérale, bulletinsPubliés: publiés.length, bulletinsTotal: bulletins.length,
      tauxRéussite: moyennes.length ? Number(((admis / moyennes.length) * 100).toFixed(1)) : null,
      parMatiere: pedago.parMatiere, parClasse: pedago.parClasse,
    },
    finances: {
      attendu: echeances.reduce((s, e) => s + e.montant - e.remise, 0),
      encaissé: echeances.reduce((s, e) => s + e.montantPaye, 0),
    },
    vieScolaire: { incidents, absences },
    généréLe: new Date().toISOString(),
  };
}
