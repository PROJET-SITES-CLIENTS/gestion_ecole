// ====================================================================
// MÉTIER VIE QUOTIDIENNE (O1, O2, O3, M8)
// Cantine du jour (menus + pointage + contrôle allergènes), transport
// quotidien (feuilles de route + passages + alerte retard), pointage du
// personnel (arrivée/départ + synthèse heures sup), garderie facturée.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, avecVerrou } from './commun';
import { déchiffrer } from '@/lib/crypto';

const jourUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

// --------------------------------------------------------------------
// O1 — CANTINE DU JOUR
// --------------------------------------------------------------------

export async function enregistrerMenuCore(ctx: Ctx, ecoleId: string, input: { date: Date; platPrincipal: string; accompagnement?: string; dessert?: string; allergenes?: string[] }) {
  assertPermission(ctx, 'services.gerer');
  if (!input.platPrincipal?.trim()) throw new ActionError('Le plat principal est obligatoire.', 'CHAMP_MANQUANT');
  if (isNaN(input.date?.getTime())) throw new ActionError('Date invalide.', 'DATE_INVALIDE');
  const allergenes = (input.allergenes ?? []).map((a) => a.trim().toLowerCase()).filter(Boolean);
  const existant = await db.cantineMenu.findUnique({ where: { ecoleId_date: { ecoleId, date: jourUTC(input.date) } } });
  const data = {
    platPrincipal: input.platPrincipal.trim(),
    accompagnement: input.accompagnement?.trim() || null,
    dessert: input.dessert?.trim() || null,
    allergenes: JSON.stringify(allergenes),
  };
  const menu = existant
    ? await db.cantineMenu.update({ where: { id: existant.id }, data })
    : await db.cantineMenu.create({ data: { ecoleId, date: jourUTC(input.date), ...data } });
  await logAction(db, ecoleId, ctx.utilisateurId, 'cantine.menu', 'cantine_menu', menu.id, { plat: input.platPrincipal });
  return { menuId: menu.id };
}

/** Pointage des présences repas du jour (bulk) + détection allergènes vs fiches santé. */
export async function pointerRepasCore(ctx: Ctx, ecoleId: string, date: Date, presences: Array<{ eleveId: string; present: boolean }>) {
  assertPermission(ctx, 'services.gerer');
  const jour = jourUTC(date);
  if (presences.length === 0) throw new ActionError('Aucun pointage fourni.', 'SAISIE_VIDE');
  const menu = await db.cantineMenu.findUnique({ where: { ecoleId_date: { ecoleId, date: jour } } });
  const allergènesMenu: string[] = menu ? JSON.parse(menu.allergenes || '[]') : [];

  // Contrôle allergènes : fiches santé (chiffrées) des élèves présents
  const alertes: Array<{ eleveId: string; eleve: string; allergene: string }> = [];
  if (allergènesMenu.length > 0) {
    const ids = presences.filter((p) => p.present).map((p) => p.eleveId);
    const fiches = await db.ficheSante.findMany({ where: { eleveId: { in: ids } }, include: { eleve: true } });
    for (const f of fiches) {
      const texte = `${déchiffrer(f.allergies) ?? ''} ${déchiffrer(f.traitementsEnCours) ?? ''}`.toLowerCase();
      for (const a of allergènesMenu) {
        if (texte.includes(a)) {
          alertes.push({ eleveId: f.eleveId, eleve: `${f.eleve.prenom} ${f.eleve.nom}`, allergene: a });
        }
      }
    }
  }

  await db.$transaction(async (tx) => {
    for (const p of presences) {
      await tx.cantinePresence.upsert({
        where: { eleveId_date: { eleveId: p.eleveId, date: jour } },
        create: { ecoleId, eleveId: p.eleveId, date: jour, present: p.present },
        update: { present: p.present },
      });
    }
    await logAction(tx, ecoleId, ctx.utilisateurId, 'cantine.pointage', 'cantine_presence', undefined, {
      jour: jour.toISOString().slice(0, 10), présents: presences.filter((p) => p.present).length, alertes: alertes.length,
    });
  }, { timeout: 30000, maxWait: 10000 });
  return { pointés: presences.length, alertes };
}

// --------------------------------------------------------------------
// O2 — TRANSPORT QUOTIDIEN (feuilles de route)
// --------------------------------------------------------------------

export async function creerFeuilleRouteCore(ctx: Ctx, ligneId: string, date: Date) {
  assertPermission(ctx, 'services.gerer');
  const ligne = await db.transportLigne.findUnique({ where: { id: ligneId }, include: { arrets: true } });
  if (!ligne) throw new ActionError('Ligne introuvable.', 'INTROUVABLE');
  assertTenant(ligne.ecoleId, ctx, 'Cette ligne');
  if (ligne.arrets.length === 0) throw new ActionError('Cette ligne n\'a aucun arrêt.', 'SAISIE_VIDE');
  const existante = await db.feuilleRoute.findUnique({ where: { ligneId_date: { ligneId, date: jourUTC(date) } } });
  if (existante) throw new ActionError('La feuille de route de cette ligne existe déjà pour ce jour.', 'DEJA_EXISTANT');
  const feuille = await db.feuilleRoute.create({
    data: { ecoleId: ligne.ecoleId, ligneId, date: jourUTC(date), passages: { create: ligne.arrets.map((a) => ({ arretId: a.id, heurePrevue: a.heure })) } },
    include: { passages: true },
  });
  await logAction(db, ligne.ecoleId, ctx.utilisateurId, 'transport.feuille_creation', 'feuille_route', feuille.id, { ligneId, arrêts: ligne.arrets.length });
  return { feuilleId: feuille.id, arrets: feuille.passages.length };
}

export async function pointerArretCore(ctx: Ctx, passageId: string, input: { heureReelle: string; montes?: string[]; descendus?: string[] }) {
  assertPermission(ctx, 'services.gerer');
  const passage = await db.passageArret.findUnique({ where: { id: passageId }, include: { feuille: { include: { ligne: true } } } });
  if (!passage) throw new ActionError('Passage introuvable.', 'INTROUVABLE');
  assertTenant(passage.feuille.ecoleId, ctx, 'Ce passage');
  if (!/^\d{2}:\d{2}$/.test(input.heureReelle ?? '')) throw new ActionError('Heure réelle invalide (HH:MM).', 'CHAMP_INVALIDE');
  // Retard vs heure prévue
  const toMin = (h: string) => Number(h.split(':')[0]) * 60 + Number(h.split(':')[1]);
  const retard = Math.max(0, toMin(input.heureReelle) - toMin(passage.heurePrevue));
  await db.$transaction(async (tx) => {
    await tx.passageArret.update({
      where: { id: passageId },
      data: { heureReelle: input.heureReelle, montes: JSON.stringify(input.montes ?? []), descendus: JSON.stringify(input.descendus ?? []) },
    });
    if (retard > passage.feuille.retardMin) {
      await tx.feuilleRoute.update({ where: { id: passage.feuille.id }, data: { retardMin: retard, statut: 'en_cours' } });
    }
    // Alerte retard > 15 min → direction notifiée
    if (retard > 15) {
      const { getDirectionUserId } = await import('./commun');
      const dirId = await getDirectionUserId(passage.feuille.ecoleId, tx);
      await tx.notification.create({
        data: {
          ecoleId: passage.feuille.ecoleId, destinataireType: 'personnel', destinataireId: dirId,
          sujet: `🚌 Retard transport — ligne ${passage.feuille.ligne.nom}`,
          corps: `Retard de ${retard} min à l'arrêt prévu ${passage.heurePrevue} (passé à ${input.heureReelle}).`,
          canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(),
        },
      });
    }
  }, { timeout: 30000, maxWait: 10000 });
  return { passageId, retardMin: retard, alerte: retard > 15 };
}

export async function clôturerFeuilleRouteCore(ctx: Ctx, feuilleId: string) {
  assertPermission(ctx, 'services.gerer');
  const f = await db.feuilleRoute.findUnique({ where: { id: feuilleId } });
  if (!f) throw new ActionError('Feuille introuvable.', 'INTROUVABLE');
  assertTenant(f.ecoleId, ctx, 'Cette feuille');
  if (f.statut === 'terminee') throw new ActionError('Feuille déjà clôturée.', 'DEJA_TRAITE');
  await db.feuilleRoute.update({ where: { id: feuilleId }, data: { statut: 'terminee' } });
  return { feuilleId };
}

// --------------------------------------------------------------------
// O3 — POINTAGE DU PERSONNEL
// --------------------------------------------------------------------

export async function pointerPersonnelCore(ctx: Ctx, personnelId: string, sens: 'arrivee' | 'depart', heure: Date, référence?: string) {
  assertPermission(ctx, 'presences.saisir'); // surveillant/enseignant/assistant peuvent pointer
  const p = await db.personnel.findUnique({ where: { id: personnelId } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  const jour = jourUTC(heure);
  const existant = await db.pointagePersonnel.findUnique({ where: { personnelId_date: { personnelId, date: jour } } });

  if (sens === 'arrivee') {
    if (existant?.heureArrivee) throw new ActionError('Arrivée déjà pointée aujourd\'hui.', 'DEJA_TRAITE');
    // Retard : arrivée après 8h05 par défaut (ou référence fournie "HH:MM")
    const ref = référence ?? '08:05';
    const toMin = (h: string) => Number(h.split(':')[0]) * 60 + Number(h.split(':')[1]);
    const retard = Math.max(0, (heure.getUTCHours() * 60 + heure.getUTCMinutes()) - toMin(ref));
    await db.pointagePersonnel.upsert({
      where: { personnelId_date: { personnelId, date: jour } },
      create: { ecoleId: p.ecoleId, personnelId, date: jour, heureArrivee: heure, retardMin: retard },
      update: { heureArrivee: heure, retardMin: retard },
    });
    return { personnelId, retardMin: retard };
  }

  if (!existant?.heureArrivee) throw new ActionError('Aucune arrivée pointée aujourd\'hui : impossible de pointer le départ.', 'ORDRE_INVALIDE');
  if (existant.heureDepart) throw new ActionError('Départ déjà pointé.', 'DEJA_TRAITE');
  await db.pointagePersonnel.update({ where: { id: existant.id }, data: { heureDepart: heure } });
  const minutes = Math.round((heure.getTime() - existant.heureArrivee.getTime()) / 60000);
  return { personnelId, minutesJour: minutes };
}

/** Synthèse mensuelle : total minutes, retards ; convertit les heures > 8h/jour en heures sup. */
export async function synthesePointageCore(ctx: Ctx, personnelId: string, periode: string) {
  assertPermission(ctx, 'rh.gerer');
  if (!/^\d{4}-\d{2}$/.test(periode)) throw new ActionError('Période invalide (AAAA-MM).', 'CHAMP_INVALIDE');
  const p = await db.personnel.findUnique({ where: { id: personnelId } });
  if (!p) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce personnel');
  const debut = new Date(`${periode}-01T00:00:00Z`);
  const fin = new Date(debut); fin.setUTCMonth(fin.getUTCMonth() + 1);
  const pointages = await db.pointagePersonnel.findMany({ where: { personnelId, date: { gte: debut, lt: fin } } });
  let minutesTotales = 0, retards = 0, minutesSup = 0;
  for (const pt of pointages) {
    if (pt.heureArrivee && pt.heureDepart) {
      const m = Math.round((pt.heureDepart.getTime() - pt.heureArrivee.getTime()) / 60000);
      minutesTotales += m;
      minutesSup += Math.max(0, m - 8 * 60); // au-delà de 8h/jour
    }
    retards += pt.retardMin > 0 ? 1 : 0;
  }
  return { periode, jours: pointages.length, minutesTotales, minutesSup, retards };
}

/** Convertit les heures supplémentaires du mois en variable de paie. */
export async function convertirHeuresSupCore(ctx: Ctx, personnelId: string, periode: string, tauxHoraire: number) {
  assertPermission(ctx, 'rh.gerer');
  if (!Number.isInteger(tauxHoraire) || tauxHoraire <= 0) throw new ActionError('Taux horaire invalide (centimes).', 'MONTANT_INVALIDE');
  const synthese = await synthesePointageCore(ctx, personnelId, periode);
  if (synthese.minutesSup <= 0) throw new ActionError('Aucune heure supplémentaire ce mois-ci.', 'SAISIE_VIDE');
  const { ajouterVariablePaieCore } = await import('./paie');
  const p = await db.personnel.findUnique({ where: { id: personnelId } });
  const montant = Math.round((synthese.minutesSup / 60) * tauxHoraire);
  const r = await ajouterVariablePaieCore(ctx, p!.ecoleId, {
    personnelId, periode, type: 'heure_sup',
    libelle: `Heures sup. pointées (${Math.round(synthese.minutesSup / 60)} h — ${synthese.jours} jours)`,
    montant,
  });
  return { variableId: r.variableId, minutesSup: synthese.minutesSup, montant };
}

// --------------------------------------------------------------------
// M8 — GARDERIE / PÉRISCOLAIRE
// --------------------------------------------------------------------

export async function inscrireGarderieCore(ctx: Ctx, input: { eleveId: string; tarifHoraire: number; formule?: string }) {
  assertPermission(ctx, 'services.gerer');
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  if (!Number.isInteger(input.tarifHoraire) || input.tarifHoraire <= 0) throw new ActionError('Tarif horaire invalide (centimes).', 'MONTANT_INVALIDE');
  await db.garderieInscription.upsert({
    where: { eleveId: input.eleveId },
    create: { ecoleId: eleve.ecoleId, eleveId: input.eleveId, tarifHoraire: input.tarifHoraire, formule: input.formule ?? 'horaire' },
    update: { tarifHoraire: input.tarifHoraire, formule: input.formule ?? 'horaire', actif: true },
  });
  return { eleveId: input.eleveId };
}

export async function pointerGarderieCore(ctx: Ctx, eleveId: string, sens: 'arrivee' | 'depart', heure: Date) {
  assertPermission(ctx, 'services.gerer');
  const inscription = await db.garderieInscription.findUnique({ where: { eleveId } });
  if (!inscription || !inscription.actif) throw new ActionError('Cet élève n\'est pas inscrit en garderie.', 'INTROUVABLE');
  assertTenant(inscription.ecoleId, ctx, 'Cette garderie');
  const jour = jourUTC(heure);
  if (sens === 'arrivee') {
    const ouverte = await db.garderieSession.findFirst({ where: { eleveId, date: jour, heureDepart: null } });
    if (ouverte) throw new ActionError('Session déjà ouverte pour aujourd\'hui.', 'DEJA_TRAITE');
    await db.garderieSession.create({ data: { ecoleId: inscription.ecoleId, eleveId, date: jour, heureArrivee: heure } });
    return { eleveId };
  }
  const session = await db.garderieSession.findFirst({ where: { eleveId, date: jour, heureDepart: null } });
  if (!session) throw new ActionError('Aucune session ouverte.', 'ORDRE_INVALIDE');
  const minutes = Math.max(0, Math.round((heure.getTime() - session.heureArrivee.getTime()) / 60000));
  await db.garderieSession.update({ where: { id: session.id }, data: { heureDepart: heure, minutesFacturees: minutes } });
  return { eleveId, minutes };
}

/** Facture la garderie du mois : minutes totales × tarif horaire → échéance réelle. */
export async function facturerGarderieCore(ctx: Ctx, ecoleId: string, mois: Date) {
  assertPermission(ctx, 'finances.ecrire');
  const periode = `${mois.getFullYear()}-${String(mois.getMonth() + 1).padStart(2, '0')}`;
  const debut = new Date(mois.getFullYear(), mois.getMonth(), 1);
  const fin = new Date(mois.getFullYear(), mois.getMonth() + 1, 1);
  const inscriptions = await db.garderieInscription.findMany({ where: { ecoleId, actif: true } });
  const anneeActive = await db.anneeScolaire.findFirst({ where: { ecoleId, active: true } });
  if (!anneeActive) throw new ActionError('Aucune année scolaire active.', 'ANNEE_INACTIVE');
  let frais = await db.frais.findFirst({ where: { ecoleId, libelle: `Garderie — ${periode}` } });
  if (!frais) {
    frais = await db.frais.create({ data: { ecoleId, libelle: `Garderie — ${periode}`, type: 'activite', montant: 0, devise: 'XOF', periodicite: 'mensuel', anneeScolaireId: anneeActive.id } });
  }
  let créées = 0, totalMinutes = 0;
  await db.$transaction(async (tx) => {
    for (const insc of inscriptions) {
      const sessions = await tx.garderieSession.findMany({ where: { eleveId: insc.eleveId, date: { gte: debut, lt: fin }, minutesFacturees: { not: null } } });
      const minutes = sessions.reduce((s, x) => s + (x.minutesFacturees ?? 0), 0);
      if (minutes === 0) continue;
      totalMinutes += minutes;
      const montant = Math.round((minutes / 60) * insc.tarifHoraire);
      const existante = await tx.echeanceFrais.findFirst({ where: { eleveId: insc.eleveId, fraisId: frais!.id, source: `garderie-${periode}` } });
      if (existante) continue;
      await tx.echeanceFrais.create({
        data: { eleveId: insc.eleveId, fraisId: frais!.id, montant, devise: 'XOF', dateEcheance: fin, statut: 'impayee', source: `garderie-${periode}` },
      });
      créées++;
    }
    await logAction(tx, ecoleId, ctx.utilisateurId, 'garderie.facturation', 'frais', frais!.id, { periode, échéances: créées, totalMinutes });
  }, { timeout: 30000, maxWait: 10000 });
  return { periode, échéancesCréées: créées, totalMinutes };
}
