// ====================================================================
// MÉTIER PROTECTION DE L'ENFANCE (B8) + PLANS D'ACCOMPAGNEMENT (B9)
// + COMMUNICATION INTERNE (B7 : messagerie, annonces, tickets)
// + INTÉGRATIONS (B12 : webhooks HMAC, tokens API, flags, thème, domaines)
// ====================================================================

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction } from './commun';

// --------------------------------------------------------------------
// B8 — PROTECTION DE L'ENFANCE
// --------------------------------------------------------------------

export async function creerSignalementCore(ctx: Ctx, input: {
  eleveId?: string; type: string; description: string; gravite: string; source: string;
  dateFaits?: Date; lieuFaits?: string; confidentialiteNiveau?: string;
}) {
  assertPermission(ctx, 'protection.gerer');
  if (!input.description?.trim()) throw new ActionError('La description des faits est obligatoire.', 'CHAMP_MANQUANT');
  if (!['harcelement', 'maltraitance', 'fgm', 'radicalisation', 'abus', 'lautre'].includes(input.type)) {
    throw new ActionError('Type de signalement invalide.', 'CHAMP_INVALIDE');
  }
  if (!['information', 'preoccupant', 'grave', 'urgent'].includes(input.gravite)) {
    throw new ActionError('Gravité invalide.', 'CHAMP_INVALIDE');
  }
  let ecoleId = ctx.ecoleId;
  if (input.eleveId) {
    const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
    if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
    assertTenant(eleve.ecoleId, ctx, 'Cet élève');
    ecoleId = eleve.ecoleId;
  }
  if (!ecoleId) throw new ActionError('Élève requis hors contexte super-admin.', 'CHAMP_MANQUANT');

  const s = await db.signalementMineur.create({
    data: {
      ecoleId, eleveId: input.eleveId ?? null, type: input.type, description: input.description.trim(),
      gravite: input.gravite, source: input.source,
      dateFaits: input.dateFaits ?? null, lieuFaits: input.lieuFaits?.trim() || null,
      declareParId: ctx.utilisateurId,
      confidentialiteNiveau: input.confidentialiteNiveau ?? 'restreint',
      statut: 'recu',
    },
  });
  // Gravité grave/urgent → notification immédiate de la direction
  if (input.gravite === 'grave' || input.gravite === 'urgent') {
    const { getDirectionUserId } = await import('./commun');
    const dirId = await getDirectionUserId(ecoleId);
    await db.notification.create({
      data: {
        ecoleId, destinataireType: 'personnel', destinataireId: dirId,
        sujet: `🚨 Signalement ${input.gravite} — protection de l'enfance`,
        corps: `Un signalement de type « ${input.type} » (gravité ${input.gravite}) vient d'être enregistré. Accès réservé aux personnes habilitées.`,
        canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(),
      },
    });
  }
  await logAction(db, ecoleId, ctx.utilisateurId, 'protection.signalement', 'signalement_mineur', s.id, { type: input.type, gravite: input.gravite });
  return { signalementId: s.id };
}

export async function ajouterSuiviSignalementCore(ctx: Ctx, signalementId: string, note: string) {
  assertPermission(ctx, 'protection.gerer');
  const s = await db.signalementMineur.findUnique({ where: { id: signalementId } });
  if (!s) throw new ActionError('Signalement introuvable.', 'INTROUVABLE');
  assertTenant(s.ecoleId, ctx, 'Ce signalement');
  if (!note?.trim()) throw new ActionError('La note de suivi est obligatoire.', 'CHAMP_MANQUANT');
  const u = await db.suiviSignalement.create({ data: { signalementId, note: note.trim(), auteurId: ctx.utilisateurId } });
  await logAction(db, s.ecoleId, ctx.utilisateurId, 'protection.suivi', 'suivi_signalement', u.id, { signalementId });
  return { suiviId: u.id };
}

export async function ajouterMesureProtectionCore(ctx: Ctx, signalementId: string, input: { type: string; description: string; dateFin?: Date }) {
  assertPermission(ctx, 'protection.gerer');
  const s = await db.signalementMineur.findUnique({ where: { id: signalementId } });
  if (!s) throw new ActionError('Signalement introuvable.', 'INTROUVABLE');
  assertTenant(s.ecoleId, ctx, 'Ce signalement');
  if (!input.description?.trim()) throw new ActionError('Description de la mesure obligatoire.', 'CHAMP_MANQUANT');
  const m = await db.mesureProtection.create({
    data: { signalementId, type: input.type, description: input.description.trim(), decideePar: ctx.utilisateurId, dateFin: input.dateFin ?? null, statut: 'planifiee' },
  });
  await logAction(db, s.ecoleId, ctx.utilisateurId, 'protection.mesure', 'mesure_protection', m.id, { signalementId, type: input.type });
  return { mesureId: m.id };
}

export async function majStatutSignalementCore(ctx: Ctx, signalementId: string, statut: string, transfertCrip = false) {
  assertPermission(ctx, 'protection.gerer');
  const s = await db.signalementMineur.findUnique({ where: { id: signalementId } });
  if (!s) throw new ActionError('Signalement introuvable.', 'INTROUVABLE');
  assertTenant(s.ecoleId, ctx, 'Ce signalement');
  if (!['recu', 'en_cours', 'transmis_externe', 'traite', 'classe_sans_suite'].includes(statut)) {
    throw new ActionError('Statut invalide.', 'CHAMP_INVALIDE');
  }
  await db.signalementMineur.update({
    where: { id: signalementId },
    data: { statut, transfertCrip: transfertCrip || s.transfertCrip, dateTransfertCrip: transfertCrip ? new Date() : s.dateTransfertCrip },
  });
  await logAction(db, s.ecoleId, ctx.utilisateurId, 'protection.statut', 'signalement_mineur', signalementId, { statut, transfertCrip });
  return { signalementId, statut };
}

// --------------------------------------------------------------------
// B9 — PLANS D'ACCOMPAGNEMENT (PPS/PAP/PAI/PAPSI)
// --------------------------------------------------------------------

export async function creerPlanAccompagnementCore(ctx: Ctx, input: { eleveId: string; type: string; dateDebut: Date; dateFin?: Date; diagnostic?: string; objectifsGeneraux?: string; frequenceSuivi?: string }) {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  if (!['PPS', 'PAP', 'PAI', 'PAPSI'].includes(input.type)) throw new ActionError('Type de plan invalide.', 'CHAMP_INVALIDE');
  const p = await db.planAccompagnement.create({
    data: {
      ecoleId: eleve.ecoleId, eleveId: input.eleveId, type: input.type,
      dateDebut: input.dateDebut, dateFin: input.dateFin ?? null,
      diagnostic: input.diagnostic?.trim() || null, objectifsGeneraux: input.objectifsGeneraux?.trim() || null,
      frequenceSuivi: input.frequenceSuivi ?? 'trimestriel', redigeParId: ctx.utilisateurId,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, 'pap.creation', 'plan_accompagnement', p.id, { type: input.type, eleveId: input.eleveId });
  return { planId: p.id };
}

export async function ajouterObjectifPlanCore(ctx: Ctx, planId: string, input: { description: string; domaine: string; echeance?: Date }) {
  assertPermission(ctx, 'eleves.ecrire');
  const p = await db.planAccompagnement.findUnique({ where: { id: planId } });
  if (!p) throw new ActionError('Plan introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce plan');
  if (!input.description?.trim()) throw new ActionError('Description de l\'objectif obligatoire.', 'CHAMP_MANQUANT');
  const o = await db.objectifPlan.create({
    data: { planAccompagnementId: planId, description: input.description.trim(), domaine: input.domaine, echeance: input.echeance ?? null },
  });
  await logAction(db, p.ecoleId, ctx.utilisateurId, 'pap.objectif_ajout', 'objectif_plan', o.id, { planId });
  return { objectifId: o.id };
}

export async function majObjectifPlanCore(ctx: Ctx, objectifId: string, atteint: boolean) {
  assertPermission(ctx, 'eleves.ecrire');
  const o = await db.objectifPlan.findUnique({ where: { id: objectifId }, include: { planAccompagnement: true } });
  if (!o) throw new ActionError('Objectif introuvable.', 'INTROUVABLE');
  assertTenant(o.planAccompagnement.ecoleId, ctx, 'Ce plan');
  await db.objectifPlan.update({ where: { id: objectifId }, data: { atteint, dateEvaluation: new Date() } });
  await logAction(db, o.planAccompagnement.ecoleId, ctx.utilisateurId, 'pap.objectif_maj', 'objectif_plan', objectifId, { atteint });
  return { objectifId, atteint };
}

export async function ajouterRevisionPlanCore(ctx: Ctx, planId: string, input: { motif: string; constats: string; ajustements?: string }) {
  assertPermission(ctx, 'eleves.ecrire');
  const p = await db.planAccompagnement.findUnique({ where: { id: planId } });
  if (!p) throw new ActionError('Plan introuvable.', 'INTROUVABLE');
  assertTenant(p.ecoleId, ctx, 'Ce plan');
  const r = await db.revisionPlan.create({
    data: { planAccompagnementId: planId, motif: input.motif.trim(), constats: input.constats.trim(), ajustements: input.ajustements?.trim() || null, redigeParId: ctx.utilisateurId },
  });
  await logAction(db, p.ecoleId, ctx.utilisateurId, 'pap.revision', 'revision_plan', r.id, { planId });
  return { revisionId: r.id };
}

// --------------------------------------------------------------------
// B7 — MESSAGERIE INTERNE + ANNONCES + TICKETS
// --------------------------------------------------------------------

export async function creerConversationCore(ctx: Ctx, input: { titre: string; type: string; participantIds: string[] }) {
  assertPermission(ctx, 'communication.envoyer');
  if (!input.titre?.trim()) throw new ActionError('Titre obligatoire.', 'CHAMP_MANQUANT');
  if (!['direct', 'groupe', 'annonce', 'classe'].includes(input.type)) throw new ActionError('Type de conversation invalide.', 'CHAMP_INVALIDE');
  if (input.participantIds.length === 0) throw new ActionError('Au moins un participant requis.', 'SAISIE_VIDE');
  const ecoleId = ctx.ecoleId ?? (await db.utilisateur.findUnique({ where: { id: input.participantIds[0] } }))?.ecoleId;
  if (!ecoleId) throw new ActionError('École indéterminée.', 'CHAMP_MANQUANT');
  const conv = await db.conversation.create({
    data: { ecoleId, titre: input.titre.trim(), type: input.type, creeParId: ctx.utilisateurId, dernierMessageAt: new Date() },
  });
  const ids = [...new Set([...input.participantIds, ctx.utilisateurId])];
  await db.conversationParticipant.createMany({
    data: ids.map((id) => ({ conversationId: conv.id, utilisateurId: id, role: id === ctx.utilisateurId ? 'admin' : 'membre' })),
  });
  await logAction(db, ecoleId, ctx.utilisateurId, 'messagerie.conversation_creation', 'conversation', conv.id, { participants: ids.length });
  return { conversationId: conv.id };
}

export async function envoyerMessageCore(ctx: Ctx, conversationId: string, contenu: string) {
  assertPermission(ctx, 'communication.envoyer');
  if (!contenu?.trim()) throw new ActionError('Message vide.', 'SAISIE_VIDE');
  const participation = await db.conversationParticipant.findFirst({
    where: { conversationId, utilisateurId: ctx.utilisateurId, archive: false },
  });
  if (!participation) throw new ActionError('Vous n\'êtes pas participant de cette conversation.', 'TENANT_INVALIDE');
  const m = await db.message.create({ data: { conversationId, expediteurId: ctx.utilisateurId, contenu: contenu.trim() } });
  await db.conversation.update({ where: { id: conversationId }, data: { dernierMessageAt: new Date() } });
  return { messageId: m.id };
}

export async function marquerConversationLueCore(ctx: Ctx, conversationId: string) {
  const p = await db.conversationParticipant.findFirst({ where: { conversationId, utilisateurId: ctx.utilisateurId } });
  if (!p) throw new ActionError('Conversation introuvable pour ce compte.', 'INTROUVABLE');
  await db.conversationParticipant.update({ where: { id: p.id }, data: { dernierLectureAt: new Date() } });
  return { conversationId };
}

export async function creerAnnonceCore(ctx: Ctx, input: { titre: string; contenu: string; cible: string; pinned?: boolean; publier?: boolean }) {
  assertPermission(ctx, 'communication.envoyer');
  if (!input.titre?.trim() || !input.contenu?.trim()) throw new ActionError('Titre et contenu obligatoires.', 'CHAMP_MANQUANT');
  if (!['toute_ecole', 'cycle', 'niveau', 'classe', 'personnel', 'parents'].includes(input.cible)) {
    throw new ActionError('Cible invalide.', 'CHAMP_INVALIDE');
  }
  const a = await db.annonce.create({
    data: {
      ecoleId: ctx.ecoleId!, titre: input.titre.trim(), contenu: input.contenu.trim(), auteurId: ctx.utilisateurId,
      cible: input.cible, pinned: input.pinned ?? false,
      statut: input.publier ? 'publie' : 'brouillon', datePublication: input.publier ? new Date() : null,
    },
  });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'annonce.creation', 'annonce', a.id, { titre: input.titre, cible: input.cible });
  return { annonceId: a.id };
}

export async function publierAnnonceCore(ctx: Ctx, annonceId: string) {
  assertPermission(ctx, 'communication.envoyer');
  const a = await db.annonce.findUnique({ where: { id: annonceId } });
  if (!a) throw new ActionError('Annonce introuvable.', 'INTROUVABLE');
  assertTenant(a.ecoleId, ctx, 'Cette annonce');
  if (a.statut === 'publie') throw new ActionError('Annonce déjà publiée.', 'DEJA_TRAITE');
  await db.annonce.update({ where: { id: annonceId }, data: { statut: 'publie', datePublication: new Date() } });
  await logAction(db, a.ecoleId, ctx.utilisateurId, 'annonce.publication', 'annonce', annonceId);
  return { annonceId };
}

export async function creerTicketCore(ctx: Ctx, input: { sujet: string; description: string; categorie: string; priorite: string }) {
  if (!input.sujet?.trim() || !input.description?.trim()) throw new ActionError('Sujet et description obligatoires.', 'CHAMP_MANQUANT');
  if (!['fonctionnel', 'technique', 'facturation', 'demande'].includes(input.categorie)) throw new ActionError('Catégorie invalide.', 'CHAMP_INVALIDE');
  if (!['basse', 'normale', 'haute', 'critique'].includes(input.priorite)) throw new ActionError('Priorité invalide.', 'CHAMP_INVALIDE');
  const sla = input.priorite === 'critique' ? 4 : input.priorite === 'haute' ? 24 : 72;
  const t = await db.ticket.create({
    data: {
      ecoleId: ctx.ecoleId, sujet: input.sujet.trim(), description: input.description.trim(),
      categorie: input.categorie, priorite: input.priorite, statut: 'ouvert',
      slaContractuelHeures: sla, slaEcheance: new Date(Date.now() + sla * 3600_000), creeParId: ctx.utilisateurId,
    },
  });
  await db.ticketMessage.create({ data: { ticketId: t.id, auteurId: ctx.utilisateurId, auteurRole: 'direction_ecole', message: input.description.trim() } });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'support.ticket_creation', 'ticket', t.id, { priorite: input.priorite });
  return { ticketId: t.id };
}

export async function repondreTicketCore(ctx: Ctx, ticketId: string, message: string, interne = false) {
  const t = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!t) throw new ActionError('Ticket introuvable.', 'INTROUVABLE');
  if (ctx.type !== 'super_admin') assertTenant(t.ecoleId, ctx, 'Ce ticket');
  if (!message?.trim()) throw new ActionError('Message vide.', 'SAISIE_VIDE');
  const m = await db.ticketMessage.create({
    data: { ticketId, auteurId: ctx.utilisateurId, auteurRole: ctx.type === 'super_admin' ? 'support_editeur' : 'direction_ecole', message: message.trim(), interne },
  });
  return { messageId: m.id };
}

export async function changerStatutTicketCore(ctx: Ctx, ticketId: string, statut: string) {
  const t = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!t) throw new ActionError('Ticket introuvable.', 'INTROUVABLE');
  if (ctx.type !== 'super_admin') assertTenant(t.ecoleId, ctx, 'Ce ticket');
  if (!['ouvert', 'en_cours', 'en_attente_client', 'resolu', 'ferme'].includes(statut)) throw new ActionError('Statut invalide.', 'CHAMP_INVALIDE');
  await db.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticketId },
      data: { statut, dateCloture: ['resolu', 'ferme'].includes(statut) ? new Date() : null,
        delaiResolutionMinutes: ['resolu', 'ferme'].includes(statut) && t.dateCreation
          ? Math.round((Date.now() - t.dateCreation.getTime()) / 60000) : null },
    });
    await tx.ticketStatutHistorique.create({ data: { ticketId, ancienStatut: t.statut, nouveauStatut: statut, modifieParId: ctx.utilisateurId } });
  });
  return { ticketId, statut };
}

// --------------------------------------------------------------------
// B12 — INTÉGRATIONS : webhooks (HMAC), tokens API, flags, thème, domaines
// --------------------------------------------------------------------

export async function creerWebhookCore(ctx: Ctx, input: { url: string; events: string[] }) {
  assertPermission(ctx, 'admin.saas');
  if (!/^https?:\/\/.+/.test(input.url)) throw new ActionError('URL de webhook invalide (http/https).', 'CHAMP_INVALIDE');
  if (input.events.length === 0) throw new ActionError('Sélectionnez au moins un événement.', 'SAISIE_VIDE');
  const secret = `whsec_${randomBytes(16).toString('hex')}`;
  const w = await db.webhookSortant.create({
    data: { ecoleId: ctx.ecoleId, url: input.url, secret, events: JSON.stringify(input.events), actif: true },
  });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'webhook.creation', 'webhook_sortant', w.id, { url: input.url, events: input.events });
  // Le secret n'est retourné qu'UNE fois, à la création
  return { webhookId: w.id, secret };
}

export async function supprimerWebhookCore(ctx: Ctx, webhookId: string) {
  assertPermission(ctx, 'admin.saas');
  const w = await db.webhookSortant.findUnique({ where: { id: webhookId } });
  if (!w) throw new ActionError('Webhook introuvable.', 'INTROUVABLE');
  assertTenant(w.ecoleId, ctx, 'Ce webhook');
  await db.webhookDelivery.deleteMany({ where: { webhookId } });
  await db.webhookSortant.delete({ where: { id: webhookId } });
  return { webhookId };
}

/** Émet un webhook signé HMAC-SHA256 (X-ScolaGestion-Signature: t=<ts>,v=<hmac>). */
export async function emettreWebhook(ecoleId: string, evenement: string, payload: unknown) {
  const webhooks = await db.webhookSortant.findMany({ where: { ecoleId, actif: true } });
  for (const w of webhooks) {
    const events = JSON.parse(w.events || '[]') as string[];
    if (!events.includes(evenement) && !events.includes('*')) continue;
    const corps = JSON.stringify({ event: evenement, ecoleId, data: payload, timestamp: new Date().toISOString() });
    const signature = w.secret ? `t=${Math.floor(Date.now() / 1000)},v=${createHmac('sha256', w.secret).update(corps).digest('hex')}` : null;
    try {
      const reponse = await fetch(w.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(signature ? { 'X-ScolaGestion-Signature': signature } : {}) },
        body: corps, signal: AbortSignal.timeout(8000),
      });
      await db.webhookDelivery.create({
        data: { webhookId: w.id, event: evenement, payload: corps, statutHttp: reponse.status, reponseCorps: (await reponse.text().catch(() => '')).slice(0, 500), tentative: 1, statut: reponse.ok ? 'livre' : 'echec', dateEnvoi: new Date() },
      });
      await db.webhookSortant.update({ where: { id: w.id }, data: { dernierEnvoi: new Date() } });
    } catch (e) {
      await db.webhookDelivery.create({
        data: { webhookId: w.id, event: evenement, payload: corps, tentative: 1, statut: 'echec', reponseCorps: (e as Error).message.slice(0, 500) },
      });
    }
  }
}

export async function creerApiTokenCore(ctx: Ctx, input: { nom: string; description?: string; scopes: string[]; joursValidite?: number }) {
  assertPermission(ctx, 'admin.saas');
  if (!input.nom?.trim()) throw new ActionError('Nom du token obligatoire.', 'CHAMP_MANQUANT');
  const secret = randomBytes(24).toString('hex');
  const complet = `sg_live_${secret.slice(0, 8)}${secret.slice(8)}`;
  const tokenHash = createHash('sha256').update(complet).digest('hex');
  const t = await db.apiToken.create({
    data: {
      ecoleId: ctx.ecoleId, nom: input.nom.trim(), description: input.description?.trim() || null,
      tokenHash, prefix: complet.slice(0, 16), scopes: JSON.stringify(input.scopes.length ? input.scopes : ['eleves:read']),
      dateExpiration: input.joursValidite ? new Date(Date.now() + input.joursValidite * 86400000) : null,
    },
  });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'api.token_creation', 'api_token', t.id, { nom: input.nom });
  // Le token complet n'est retourné qu'UNE fois
  return { apiTokenId: t.id, token: complet };
}

export async function revoquerApiTokenCore(ctx: Ctx, apiTokenId: string) {
  assertPermission(ctx, 'admin.saas');
  const t = await db.apiToken.findUnique({ where: { id: apiTokenId } });
  if (!t) throw new ActionError('Token introuvable.', 'INTROUVABLE');
  assertTenant(t.ecoleId, ctx, 'Ce token');
  await db.apiToken.update({ where: { id: apiTokenId }, data: { actif: false } });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'api.token_revocation', 'api_token', apiTokenId);
  return { apiTokenId };
}

export async function majThemeEcoleCore(ctx: Ctx, input: { couleurPrimaire?: string; couleurSecondaire?: string; couleurAccent?: string; couleurFond?: string; nomProduit?: string }) {
  assertPermission(ctx, 'admin.saas');
  for (const [cle, valeur] of Object.entries(input)) {
    if (valeur && !/^#[0-9a-fA-F]{6}$/.test(valeur) && cle !== 'nomProduit') {
      throw new ActionError(`Couleur invalide pour ${cle} (format #RRGGBB).`, 'CHAMP_INVALIDE');
    }
  }
  await db.themeEcole.upsert({
    where: { ecoleId: ctx.ecoleId! },
    create: { ecoleId: ctx.ecoleId!, ...input },
    update: { ...input },
  });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'theme.maj', 'theme_ecole', ctx.ecoleId!, input);
  return { ok: true };
}

export async function ajouterDomaineCore(ctx: Ctx, domaine: string) {
  assertPermission(ctx, 'admin.saas');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domaine)) throw new ActionError('Nom de domaine invalide.', 'CHAMP_INVALIDE');
  const existant = await db.domainePersonnalise.findUnique({ where: { domaine } });
  if (existant) throw new ActionError('Ce domaine est déjà enregistré.', 'DEJA_EXISTANT');
  const d = await db.domainePersonnalise.create({ data: { ecoleId: ctx.ecoleId!, domaine, enAttente: true } });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'domaine.ajout', 'domaine_personnalise', d.id, { domaine });
  return { domaineId: d.id, cname: `${domaine} → ecoles.scalagestion.app` };
}

export async function verifierDomaineCore(ctx: Ctx, domaineId: string) {
  assertPermission(ctx, 'admin.saas');
  const d = await db.domainePersonnalise.findUnique({ where: { id: domaineId } });
  if (!d) throw new ActionError('Domaine introuvable.', 'INTROUVABLE');
  assertTenant(d.ecoleId, ctx, 'Ce domaine');
  // Vérification DNS réelle : résolution du CNAME attendu
  let vérifié = false;
  try {
    const cible = 'ecoles.scalagestion.app';
    const dns = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(d.domaine)}&type=CNAME`).then((r) => r.json());
    const réponses = dns?.Answer ?? [];
    vérifié = réponses.some((a: any) => String(a.data).toLowerCase().includes(cible));
  } catch { /* hors ligne : vérification impossible */ }
  await db.domainePersonnalise.update({
    where: { id: domaineId },
    data: { verifie: vérifié, enAttente: !vérifié, dateVerification: new Date() },
  });
  return { domaineId, verifie: vérifié };
}

export async function majFeatureFlagEcoleCore(ctx: Ctx, code: string, actif: boolean) {
  assertPermission(ctx, 'admin.saas');
  const flag = await db.featureFlag.findUnique({ where: { code } });
  if (!flag) throw new ActionError('Feature flag inconnu.', 'INTROUVABLE');
  await db.featureFlagEcole.upsert({
    where: { featureFlagId_ecoleId: { featureFlagId: flag.id, ecoleId: ctx.ecoleId! } },
    create: { featureFlagId: flag.id, ecoleId: ctx.ecoleId!, actif },
    update: { actif },
  });
  await logAction(db, ctx.ecoleId, ctx.utilisateurId, 'flag.maj', 'feature_flag_ecole', `${ctx.ecoleId}:${code}`, { code, actif });
  return { code, actif };
}
