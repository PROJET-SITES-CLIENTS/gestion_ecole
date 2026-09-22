// ====================================================================
// VIE SCOLAIRE+ — retards (billets), stats discipline, surveillances
// d'examens, conseils de discipline, visa des cahiers (censeur)
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, notifierParentsEtDirection } from './commun';

// --------------------------------------------------------------------
// 1. REGISTRE DES RETARDS (surveillant) — billet numéroté + notification
//    automatique des parents au 3e retard non justifié de la semaine
// --------------------------------------------------------------------

export async function enregistrerRetardCore(ctx: Ctx, input: {
  eleveId: string; dateHeure: Date; dureeMinutes?: number; motif?: string; seanceId?: string;
}) {
  assertPermissionParmiVs([['presences.saisir'], ['vie_scolaire.gerer']], ctx);
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  if (isNaN(input.dateHeure?.getTime())) throw new ActionError('Date invalide.', 'DATE_INVALIDE');
  const nb = await db.retard.count({ where: { ecoleId: eleve.ecoleId } });
  const billet = `B-${String(nb + 1).padStart(4, '0')}`;
  const r = await db.retard.create({
    data: {
      ecoleId: eleve.ecoleId, eleveId: eleve.id, dateHeure: input.dateHeure,
      dureeMinutes: Math.max(1, Math.min(240, input.dureeMinutes ?? 15)),
      motif: input.motif?.trim() || null, billetNumero: billet,
      seanceId: input.seanceId ?? null, saisiParId: ctx.utilisateurId,
    },
  });
  // Réactivité : 3 retards non justifiés sur 30 jours → notification parents + vie scolaire
  const depuis = new Date(input.dateHeure.getTime() - 30 * 864e5);
  const recents = await db.retard.count({ where: { eleveId: eleve.id, justifie: false, dateHeure: { gte: depuis } } });
  let alerte = false;
  if (recents >= 3) {
    alerte = true;
    await notifierParentsEtDirection(db, eleve.ecoleId, eleve.id,
      `Retards répétés — ${eleve.prenom} ${eleve.nom}`,
      `${eleve.prenom} ${eleve.nom} a été enregistré(e) en retard ${recents} fois sur les 30 derniers jours (dernier billet ${billet}). Merci de veiller à la ponctualité ; une convocation peut être émise par la vie scolaire.`).catch(() => {});
  }
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'retard.enregistrement', 'retard', r.id, { billet, alerte });
  return { retardId: r.id, billet, alerteParents: alerte, retards30j: recents };
}

export async function justifierRetardCore(ctx: Ctx, retardId: string) {
  assertPermissionParmiVs([['vie_scolaire.gerer'], ['presences.saisir']], ctx);
  const r = await db.retard.findUnique({ where: { id: retardId } });
  if (!r) throw new ActionError('Retard introuvable.', 'INTROUVABLE');
  assertTenant(r.ecoleId, ctx, 'Ce retard');
  if (r.justifie) throw new ActionError('Retard déjà justifié.', 'DEJA_TRAITE');
  await db.retard.update({ where: { id: retardId }, data: { justifie: true } });
  await logAction(db, r.ecoleId, ctx.utilisateurId, 'retard.justification', 'retard', retardId, {});
  return { retardId };
}

function assertPermissionParmiVs(paires: string[][], ctx: Ctx) {
  const perms = ctx.permissions as Set<string>;
  const ok = paires.some((p) => p.every((c) => perms.has(c)));
  if (!ok) throw new ActionError('Permission refusée pour cette action.', 'PERMISSION_REFUSEE');
}

// --------------------------------------------------------------------
// 2. STATISTIQUES DE DISCIPLINE (censeur) — pilotage
// --------------------------------------------------------------------

export async function statsDisciplineCore(ctx: Ctx, jours = 30) {
  assertPermissionParmiVs([['vie_scolaire.gerer'], ['eleves.lire']], ctx);
  const ecoleId = ctx.ecoleId!;
  const depuis = new Date(Date.now() - jours * 864e5);
  const [incidents, retards, absents] = await Promise.all([
    db.incident.findMany({
      where: { eleve: { ecoleId }, dateHeure: { gte: depuis } },
      include: { eleve: { include: { classeActuelle: true } }, sanctions: true },
    }) as any,
    db.retard.findMany({ where: { ecoleId, dateHeure: { gte: depuis } }, include: { eleve: { include: { classeActuelle: true } } } }),
    db.presence.findMany({ where: { statut: 'absent', seance: { date: { gte: depuis }, classe: { ecoleId } } }, include: { eleve: true } }),
  ]);
  const parClasse = new Map<string, { incidents: number; retards: number; absences: number }>();
  const bump = (classe: string, k: 'incidents' | 'retards' | 'absences') => {
    const cur = parClasse.get(classe) ?? { incidents: 0, retards: 0, absences: 0 };
    cur[k]++;
    parClasse.set(classe, cur);
  };
  for (const i of incidents as any[]) bump(i.eleve?.classeActuelle?.libelle ?? '—', 'incidents');
  for (const r of retards as any[]) bump(r.eleve?.classeActuelle?.libelle ?? '—', 'retards');
  for (const a of absents as any[]) bump(a.eleve?.classeActuelle?.libelle ?? '—', 'absences');
  // Top élèves à suivre
  const compteur = new Map<string, { eleve: string; score: number; incidents: number; retards: number; absences: number }>();
  const incr = (id: string, nom: string, k: 'incidents' | 'retards' | 'absences') => {
    const cur = compteur.get(id) ?? { eleve: nom, score: 0, incidents: 0, retards: 0, absences: 0 };
    cur[k]++;
    cur.score = cur.incidents * 3 + cur.retards * 2 + cur.absences;
    compteur.set(id, cur);
  };
  for (const i of incidents as any[]) incr(i.eleveId, `${i.eleve.prenom} ${i.eleve.nom}`, 'incidents');
  for (const r of retards as any[]) incr(r.eleveId, `${r.eleve?.prenom ?? ''} ${r.eleve?.nom ?? ''}`, 'retards');
  for (const a of absents as any[]) incr(a.eleveId, `${a.eleve?.prenom ?? ''} ${a.eleve?.nom ?? ''}`, 'absences');
  const top = [...compteur.values()].sort((a, b) => b.score - a.score).slice(0, 10);
  return {
    periodeJours: jours,
    totaux: { incidents: incidents.length, graves: incidents.filter((i) => i.gravite === 'grave').length, sanctions: incidents.reduce((s, i) => s + (i as any).sanctions?.length, 0), retards: retards.length, retardsNonJustifies: retards.filter((r) => !r.justifie).length, absences: absents.length },
    parClasse: [...parClasse.entries()].map(([classe, v]) => ({ classe, ...v })).sort((a, b) => (b.incidents + b.retards + b.absences) - (a.incidents + a.retards + a.absences)),
    elevesASuivre: top,
  };
}

// --------------------------------------------------------------------
// 3. SURVEILLANCE DES COMPOSITIONS/EXAMENS (censeur organise, surveillants
//    et professeurs affectés)
// --------------------------------------------------------------------

export async function creerSurveillanceCore(ctx: Ctx, input: {
  intitule: string; dateHeureDebut: Date; dateHeureFin: Date; salleId?: string;
  matiereId?: string; classeIds?: string[]; surveillantsIds?: string[]; nbElevesPrevus?: number; observations?: string;
}) {
  assertPermissionParmiVs([['examens.gerer'], ['vie_scolaire.gerer']], ctx);
  const ecoleId = ctx.ecoleId!;
  if (!input.intitule?.trim()) throw new ActionError('Intitulé obligatoire.', 'CHAMP_MANQUANT');
  if (input.dateHeureFin <= input.dateHeureDebut) throw new ActionError('Créneau invalide.', 'DATE_INVALIDE');
  const surveillants = input.surveillantsIds ?? [];
  if (surveillants.length === 0) throw new ActionError('Au moins un surveillant est requis.', 'CHAMP_MANQUANT');
  // anti-chevauchement : un surveillant ne peut pas être sur deux épreuves au même moment
  for (const sid of surveillants) {
    const conflits = await db.surveillanceExamen.findMany({
      where: { ecoleId, dateHeureDebut: { lt: input.dateHeureFin }, dateHeureFin: { gt: input.dateHeureDebut } },
    });
    for (const c of conflits) {
      if (JSON.parse(c.surveillantsIds ?? '[]').includes(sid)) {
        const pers = await db.personnel.findUnique({ where: { id: sid } });
        throw new ActionError(`${pers?.prenom ?? 'Ce surveillant'} ${pers?.nom ?? ''} est déjà affecté(e) à « ${c.intitule} » sur ce créneau.`, 'CONFLIT_SURVEILLANT');
      }
    }
  }
  const s = await db.surveillanceExamen.create({
    data: {
      ecoleId, intitule: input.intitule.trim(),
      dateHeureDebut: input.dateHeureDebut, dateHeureFin: input.dateHeureFin,
      salleId: input.salleId ?? null, matiereId: input.matiereId ?? null,
      classeIds: JSON.stringify(input.classeIds ?? []),
      surveillantsIds: JSON.stringify(surveillants),
      nbElevesPrevus: input.nbElevesPrevus ?? 0,
      observations: input.observations?.trim() || null,
    },
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'surveillance.creation', 'surveillance_examen', s.id, { intitule: input.intitule, surveillants: surveillants.length });
  return { surveillanceId: s.id };
}

export async function mesSurveillancesCore(ctx: Ctx) {
  assertPermissionParmiVs([['presences.saisir'], ['vie_scolaire.gerer'], ['examens.gerer'], ['eleves.lire']], ctx);
  const pers = await db.personnel.findFirst({ where: { utilisateurId: ctx.utilisateurId, deletedAt: null } });
  if (!pers) return { surveillances: [] };
  const toutes = await db.surveillanceExamen.findMany({
    where: { ecoleId: ctx.ecoleId!, dateHeureFin: { gte: new Date() } },
    orderBy: { dateHeureDebut: 'asc' },
    take: 50,
  });
  const miennes = toutes.filter((s) => JSON.parse(s.surveillantsIds ?? '[]').includes(pers.id));
  return {
    surveillances: miennes.map((s) => ({ id: s.id, intitule: s.intitule, debut: s.dateHeureDebut, fin: s.dateHeureFin, observations: s.observations })),
  };
}

// --------------------------------------------------------------------
// 4. CONSEIL DE DISCIPLINE (censeur préside)
// --------------------------------------------------------------------

export async function creerConseilDisciplineCore(ctx: Ctx, input: {
  eleveId: string; dateConseil: Date; membresIds: string[]; presidentId?: string; faits: string;
}) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  if (!input.faits?.trim()) throw new ActionError('Les faits doivent être décrits.', 'CHAMP_MANQUANT');
  if (input.membresIds.length < 2) throw new ActionError('Au moins 2 membres (hors président).', 'CHAMP_MANQUANT');
  if (input.dateConseil < new Date()) throw new ActionError('La date du conseil doit être future.', 'DATE_INVALIDE');
  const c = await db.conseilDiscipline.create({
    data: {
      ecoleId: eleve.ecoleId, eleveId: eleve.id, dateConseil: input.dateConseil,
      membresIds: JSON.stringify(input.membresIds), presidentId: input.presidentId ?? null,
      faits: input.faits.trim(), statut: 'prevu',
    },
  });
  // Convocation systématique des parents
  await notifierParentsEtDirection(db, eleve.ecoleId, eleve.id,
    `Convocation conseil de discipline — ${eleve.prenom} ${eleve.nom}`,
    `Votre enfant ${eleve.prenom} ${eleve.nom} est convoqué(e) devant le conseil de discipline le ${input.dateConseil.toLocaleDateString('fr-FR')} à ${input.dateConseil.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Faits reprochés : ${input.faits.trim().slice(0, 200)}. Votre présence est vivement demandée.`).catch(() => {});
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'conseil_discipline.creation', 'conseil_discipline', c.id, {});
  return { conseilId: c.id };
}

export async function deciderConseilDisciplineCore(ctx: Ctx, conseilId: string, decision: string, sanctionId?: string) {
  assertPermission(ctx, 'vie_scolaire.gerer');
  const c = await db.conseilDiscipline.findUnique({ where: { id: conseilId }, include: { eleve: true } });
  if (!c) throw new ActionError('Conseil introuvable.', 'INTROUVABLE');
  assertTenant(c.ecoleId, ctx, 'Ce conseil');
  if (c.statut === 'tenu') throw new ActionError('Conseil déjà tenu et décidé.', 'DEJA_TRAITE');
  if (!decision?.trim()) throw new ActionError('La décision est obligatoire.', 'CHAMP_MANQUANT');
  await db.conseilDiscipline.update({
    where: { id: conseilId },
    data: { decision: decision.trim(), sanctionId: sanctionId ?? null, statut: 'tenu' },
  });
  await notifierParentsEtDirection(db, c.ecoleId, c.eleveId,
    `Décision du conseil de discipline — ${c.eleve.prenom} ${c.eleve.nom}`,
    `Le conseil de discipline du ${c.dateConseil.toLocaleDateString('fr-FR')} a statué : ${decision.trim()}`).catch(() => {});
  await logAction(db, c.ecoleId, ctx.utilisateurId, 'conseil_discipline.decision', 'conseil_discipline', conseilId, { decision: decision.slice(0, 80) });
  return { conseilId, statut: 'tenu' };
}

// --------------------------------------------------------------------
// 5. VISA DES CAHIERS DE TEXTES (censeur contrôle la pédagogie)
// --------------------------------------------------------------------

export async function viserCahierTexteCore(ctx: Ctx, cahierId: string, remarque?: string) {
  assertPermission(ctx, 'edt.gerer');
  const c = await db.cahierTexte.findUnique({ where: { id: cahierId } });
  if (!c) throw new ActionError('Cahier de textes introuvable.', 'INTROUVABLE');
  assertTenant(c.ecoleId, ctx, 'Ce cahier');
  await db.cahierTexte.update({
    where: { id: cahierId },
    data: { visaCenseurId: ctx.utilisateurId, visaDate: new Date(), visaRemarque: remarque?.trim() || null },
  });
  await logAction(db, c.ecoleId, ctx.utilisateurId, 'cahier.visa_censeur', 'cahier_texte', cahierId, {});
  return { cahierId };
}
