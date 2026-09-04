// ====================================================================
// MÉTIER COMPLÉTIONS (O4, O5, M9-M17, E19-E21)
// Rendu de devoirs par l'élève, imports CSV, attestations, appréciations
// matière, bulletins mixtes, règles de moyenne par cycle, échéanciers
// personnalisés + remises familiales, import EDT, PV de conseil,
// rapprochement bancaire, export de virements, relances auto, push,
// admission publique.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx, assertPermission, assertTenant, logAction, avecVerrou } from './commun';
import { inscrireEleveCore } from './eleves';

// --------------------------------------------------------------------
// O4 — RENDU DE DEVOIRS PAR L'ÉLÈVE
// --------------------------------------------------------------------

export async function rendreDevoirCore(ctx: Ctx, input: { devoirId: string; contenuUrl?: string; commentaireEleve?: string }) {
  const devoir = await db.devoir.findUnique({ where: { id: input.devoirId }, include: { classe: true } });
  if (!devoir) throw new ActionError('Devoir introuvable.', 'INTROUVABLE');
  assertTenant(devoir.ecoleId, ctx, 'Ce devoir');

  let eleveId: string;
  if (ctx.type === 'eleve') {
    const eleve = await db.eleve.findFirst({ where: { utilisateurId: ctx.utilisateurId } });
    if (!eleve) throw new ActionError('Aucun dossier élève associé à votre compte.', 'INTROUVABLE');
    if (eleve.classeActuelleId !== devoir.classeId) {
      throw new ActionError('Ce devoir n\'est pas destiné à votre classe.', 'CORRESPONDANCE_INVALIDE');
    }
    eleveId = eleve.id;
  } else {
    throw new ActionError('Seul un compte élève peut rendre un devoir en ligne.', 'ROLE_INVALIDE');
  }
  if (!input.contenuUrl?.trim() && !input.commentaireEleve?.trim()) {
    throw new ActionError('Fournissez un lien vers votre travail ou un commentaire.', 'CHAMP_MANQUANT');
  }
  const existant = await db.renduDevoir.findFirst({ where: { devoirId: input.devoirId, eleveId } });
  if (existant && existant.statut === 'corrige') throw new ActionError('Devoir déjà corrigé : rendu impossible.', 'DEJA_TRAITE');
  const rendu = existant
    ? await db.renduDevoir.update({
        where: { id: existant.id },
        data: { contenuUrl: input.contenuUrl?.trim() || null, commentaireEleve: input.commentaireEleve?.trim() || null, statut: 'rendu', dateRendu: new Date() },
      })
    : await db.renduDevoir.create({
        data: { devoirId: input.devoirId, eleveId, contenuUrl: input.contenuUrl?.trim() || null, commentaireEleve: input.commentaireEleve?.trim() || null, statut: 'rendu' },
      });
  return { renduId: rendu.id };
}

// --------------------------------------------------------------------
// O5 — IMPORTS CSV (élèves + personnel)
// --------------------------------------------------------------------

export type RapportImport = { créés: number; ignorés: number; erreurs: Array<{ ligne: number; erreur: string }> };

/** Format : nom;prenom;dateNaissance(YYYY-MM-DD);sexe(M/F);classeCode */
export async function importerElevesCsvCore(ctx: Ctx, ecoleId: string, contenu: string): Promise<RapportImport> {
  assertPermission(ctx, 'eleves.ecrire');
  const lignes = contenu.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lignes.length === 0) throw new ActionError('Fichier vide.', 'SAISIE_VIDE');
  const classes = await db.classe.findMany({ where: { ecoleId } });
  const classesParCode = new Map(classes.map((c) => [c.code.toUpperCase(), c.id]));
  const rapport: RapportImport = { créés: 0, ignorés: 0, erreurs: [] };
  // Ignore une éventuelle ligne d'en-tête
  const début = /nom/i.test(lignes[0]) ? 1 : 0;
  for (let i = début; i < lignes.length; i++) {
    const parties = lignes[i].split(/[;,]/).map((p) => p.trim());
    const numLigne = i + 1;
    if (parties.length < 4) { rapport.erreurs.push({ ligne: numLigne, erreur: 'colonnes insuffisantes (nom;prenom;date;sexe[;classe])' }); continue; }
    const [nom, prenom, dateStr, sexe, classeCode] = parties;
    try {
      const classeId = classeCode ? classesParCode.get(classeCode.toUpperCase()) : undefined;
      if (classeCode && !classeId) throw new ActionError(`classe « ${classeCode} » inconnue`, 'CLASSE_INCONNUE');
      await inscrireEleveCore(ctx, ecoleId, { nom, prenom, dateNaissance: new Date(dateStr), sexe: sexe.toUpperCase() as 'M' | 'F', classeId });
      rapport.créés++;
    } catch (e) {
      const msg = e instanceof ActionError ? e.message : String((e as Error).message).slice(0, 80);
      rapport.erreurs.push({ ligne: numLigne, erreur: msg });
    }
  }
  await logAction(db, ecoleId, ctx.utilisateurId, 'eleves.import_csv', undefined, undefined, rapport);
  return rapport;
}

/** Format : nom;prenom;email;dateEmbauche;typeContrat;salaireBrut(XOF) */
export async function importerPersonnelCsvCore(ctx: Ctx, ecoleId: string, contenu: string): Promise<RapportImport> {
  const { creerPersonnelCore } = await import('./rh');
  const lignes = contenu.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lignes.length === 0) throw new ActionError('Fichier vide.', 'SAISIE_VIDE');
  const rapport: RapportImport = { créés: 0, ignorés: 0, erreurs: [] };
  const début = /nom/i.test(lignes[0]) ? 1 : 0;
  for (let i = début; i < lignes.length; i++) {
    const parties = lignes[i].split(/[;,]/).map((p) => p.trim());
    const numLigne = i + 1;
    if (parties.length < 4) { rapport.erreurs.push({ ligne: numLigne, erreur: 'colonnes insuffisantes (nom;prenom;email;dateEmbauche[;contrat;salaire])' }); continue; }
    const [nom, prenom, email, dateEmb, contrat, salaire] = parties;
    try {
      await creerPersonnelCore(ctx, ecoleId, {
        nom, prenom, email: email || undefined, dateEmbauche: new Date(dateEmb),
        typeContrat: (contrat as any) || undefined,
        salaireBrut: salaire ? Math.round(parseFloat(salaire.replace(',', '.')) * 100) : undefined,
      });
      rapport.créés++;
    } catch (e) {
      const msg = e instanceof ActionError ? e.message : String((e as Error).message).slice(0, 80);
      rapport.erreurs.push({ ligne: numLigne, erreur: msg });
    }
  }
  await logAction(db, ecoleId, ctx.utilisateurId, 'personnel.import_csv', undefined, undefined, rapport);
  return rapport;
}

// --------------------------------------------------------------------
// M9 — ATTESTATIONS GÉNÉRÉES (certificat de scolarité…)
// --------------------------------------------------------------------

export async function genererAttestationCore(ctx: Ctx, eleveId: string, type: 'certificat_scolarite' | 'attestation_inscription') {
  assertPermission(ctx, 'eleves.ecrire');
  const eleve = await db.eleve.findUnique({
    where: { id: eleveId },
    include: { ecole: true, classeActuelle: { include: { niveau: true } } },
  });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: eleve.ecoleId, active: true } });
  const contenu = {
    type,
    ecole: eleve.ecole.nom,
    élève: `${eleve.prenom} ${eleve.nom}`,
    né: eleve.dateNaissance,
    matricule: eleve.matricule,
    classe: eleve.classeActuelle?.libelle ?? '—',
    année: annee?.libelle ?? '—',
    généréLe: new Date(),
  };
  const doc = await db.documentGenere.create({
    data: {
      ecoleId: eleve.ecoleId,
      cibleType: 'eleve', cibleId: eleveId,
      titre: type === 'certificat_scolarite' ? `Certificat de scolarité — ${eleve.prenom} ${eleve.nom}` : `Attestation d'inscription — ${eleve.prenom} ${eleve.nom}`,
      format: 'html', fichierUrl: `/documents/attestations/${doc2026()}/${eleveId}-${type}`,
      genereParId: ctx.utilisateurId,
    },
  });
  await logAction(db, eleve.ecoleId, ctx.utilisateurId, `document.${type}`, 'eleve', eleveId, { documentId: doc.id });
  return { documentId: doc.id, contenu };
}
function doc2026() { return new Date().toISOString().slice(0, 10); }

// --------------------------------------------------------------------
// M10 — APPRÉCIATIONS PAR MATIÈRE
// --------------------------------------------------------------------

export async function saisirAppreciationsMatiereCore(ctx: Ctx, bulletinId: string, saisies: Array<{ matiereId: string; appreciation: string }>) {
  assertPermission(ctx, 'notes.saisir');
  const bulletin = await db.bulletin.findUnique({ where: { id: bulletinId }, include: { eleve: true } });
  if (!bulletin) throw new ActionError('Bulletin introuvable.', 'INTROUVABLE');
  assertTenant(bulletin.eleve.ecoleId, ctx, 'Ce bulletin');
  for (const s of saisies) {
    if (!s.appreciation?.trim()) continue;
    const matiere = await db.matiere.findUnique({ where: { id: s.matiereId } });
    if (!matiere) throw new ActionError('Matière introuvable.', 'INTROUVABLE');
    assertTenant(matiere.ecoleId, ctx, 'Cette matière');
    await db.bulletinAppreciation.upsert({
      where: { bulletinId_matiereId: { bulletinId, matiereId: s.matiereId } },
      create: { bulletinId, matiereId: s.matiereId, appreciation: s.appreciation.trim(), enseignantId: ctx.utilisateurId },
      update: { appreciation: s.appreciation.trim(), enseignantId: ctx.utilisateurId },
    });
  }
  return { bulletinId, saisies: saisies.filter((s) => s.appreciation?.trim()).length };
}

// --------------------------------------------------------------------
// M11 — ÉCHÉANCIERS PERSONNALISÉS + REMISES FAMILLES AUTOMATIQUES
// --------------------------------------------------------------------

export async function genererEcheancierPersonnaliseCore(ctx: Ctx, input: { eleveId: string; fraisId: string; tranches: Array<{ montant: number; date: Date }> }) {
  assertPermission(ctx, 'finances.ecrire');
  const eleve = await db.eleve.findUnique({ where: { id: input.eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  const frais = await db.frais.findUnique({ where: { id: input.fraisId } });
  if (!frais) throw new ActionError('Frais introuvable.', 'INTROUVABLE');
  assertTenant(frais.ecoleId, ctx, 'Ce frais');
  const total = input.tranches.reduce((s, t) => s + t.montant, 0);
  if (total !== frais.montant) {
    throw new ActionError(`Le total des tranches (${total / 100} XOF) doit égaler le montant du frais (${frais.montant / 100} XOF).`, 'MONTANT_INVALIDE');
  }
  let créées = 0;
  for (const t of input.tranches) {
    const existante = await db.echeanceFrais.findUnique({
      where: { eleveId_fraisId_dateEcheance: { eleveId: input.eleveId, fraisId: input.fraisId, dateEcheance: t.date } },
    });
    if (existante) continue;
    await db.echeanceFrais.create({
      data: { eleveId: input.eleveId, fraisId: input.fraisId, montant: t.montant, devise: frais.devise, dateEcheance: t.date, statut: 'impayee', source: 'échéancier personnalisé' },
    });
    créées++;
  }
  return { créées };
}

/** Remise automatique pour les fratries : dès le 2e enfant inscrit, % sur ses échéances impayées. */
export async function appliquerRemisesFamillesCore(ctx: Ctx, ecoleId: string, pourcentage: number) {
  assertPermission(ctx, 'finances.ecrire');
  if (!(pourcentage > 0) || pourcentage > 100) throw new ActionError('Le pourcentage doit être entre 0 et 100.', 'CHAMP_INVALIDE');
  const liens = await db.eleveParent.findMany({ where: { eleve: { ecoleId } }, include: { eleve: true, parent: true } });
  const parParent = new Map<string, typeof liens>();
  for (const l of liens) {
    const arr = parParent.get(l.parentId) ?? ([] as typeof liens);
    arr.push(l);
    parParent.set(l.parentId, arr);
  }
  let remises = 0, totalRemis = 0;
  const ordreNaissance = (a: typeof liens[0], b: typeof liens[0]) => a.eleve.dateNaissance.getTime() - b.eleve.dateNaissance.getTime();
  for (const [, enfants] of parParent) {
    if (enfants.length < 2) continue;
    const triés = [...enfants].sort(ordreNaissance);
    for (let i = 1; i < triés.length; i++) { // dès le 2e (plus jeune)
      const échéances = await db.echeanceFrais.findMany({ where: { eleveId: triés[i].eleveId, statut: 'impayee', remise: 0 } });
      for (const e of échéances) {
        const remise = Math.round((e.montant * pourcentage) / 100);
        await db.echeanceFrais.update({ where: { id: e.id }, data: { remise, motifRemise: `Fratrie (${pourcentage}% — ${triés.length} enfants)` } });
        remises++; totalRemis += remise;
      }
    }
  }
  await logAction(db, ecoleId, ctx.utilisateurId, 'finances.remises_familles', undefined, undefined, { remises, totalRemis, pourcentage });
  return { remises, totalRemis };
}

// --------------------------------------------------------------------
// M12 — RELANCES AUTOMATIQUES D'IMPAYÉS
// --------------------------------------------------------------------

export async function relancerImpayesAutoCore(ecoleId?: string) {
  const écoles = ecoleId ? [await db.ecole.findUnique({ where: { id: ecoleId } })] : await db.ecole.findMany({ where: { statut: { in: ['actif', 'essai'] } } });
  let notifiés = 0;
  for (const école of écoles) {
    if (!école) continue;
    const échéances = await db.echeanceFrais.findMany({
      where: { eleve: { ecoleId: école.id }, statut: { in: ['impayee', 'partiel'] } },
      include: { eleve: true, frais: true },
    });
    const seuils = [
      { jours: 7, libellé: 'relance 1' },
      { jours: 15, libellé: 'relance 2' },
      { jours: 30, libellé: 'relance 3' },
    ];
    const now = Date.now();
    for (const e of échéances) {
      const âge = Math.floor((now - e.dateEcheance.getTime()) / 86400000);
      const seuil = seuils.filter((s) => âge >= s.jours).pop();
      if (!seuil) continue;
      const clé = `${e.id}-${seuil.jours}`;
      // Idempotence : une relance par seuil (sujet unique)
      const déjà = await db.notification.findFirst({ where: { ecoleId: école.id, contexte: { contains: clé } } });
      if (déjà) continue;
      const restant = e.montant - e.remise - e.montantPaye;
      await db.notification.create({
        data: {
          ecoleId: école.id, destinataireType: 'personnel',
          destinataireId: (await (await import('./commun')).getDirectionUserId(école.id)),
          sujet: `Relance impayé (${seuil.libellé}) — ${e.eleve.prenom} ${e.eleve.nom}`,
          corps: `Échéance « ${e.frais.libelle} » en retard de ${âge} jours. Restant dû : ${(restant / 100).toLocaleString('fr-FR')} XOF.`,
          canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(), contexte: JSON.stringify({ relance: clé }),
        },
      });
      notifiés++;
    }
  }
  return { notifiés };
}

// --------------------------------------------------------------------
// M13 — IMPORT EDT CSV
// --------------------------------------------------------------------

/** Format : classeCode;matiereCode;jour;heureDebut;heureFin */
export async function importerEdtCsvCore(ctx: Ctx, ecoleId: string, contenu: string): Promise<RapportImport & { conflits: number }> {
  const { creerCreneauEdtCore } = await import('./edt');
  const lignes = contenu.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lignes.length === 0) throw new ActionError('Fichier vide.', 'SAISIE_VIDE');
  const classes = await db.classe.findMany({ where: { ecoleId } });
  const matières = await db.matiere.findMany({ where: { ecoleId } });
  const enseignant = await db.personnel.findFirst({ where: { utilisateurId: ctx.utilisateurId, ecoleId } });
  const rapport: RapportImport & { conflits: number } = { créés: 0, ignorés: 0, erreurs: [], conflits: 0 };
  const début = /classe/i.test(lignes[0]) ? 1 : 0;
  for (let i = début; i < lignes.length; i++) {
    const [codeClasse, codeMatiere, jour, hD, hF] = lignes[i].split(/[;,]/).map((p) => p.trim());
    const numLigne = i + 1;
    try {
      const classe = classes.find((c) => c.code.toUpperCase() === codeClasse?.toUpperCase());
      if (!classe) throw new ActionError(`classe « ${codeClasse} » inconnue`, 'CLASSE_INCONNUE');
      const matiere = matières.find((m) => m.code.toUpperCase() === codeMatiere?.toUpperCase());
      await creerCreneauEdtCore(ctx, ecoleId, {
        classeId: classe.id,
        matiereId: matiere?.id,
        enseignantId: enseignant?.id,
        jour: jour.toLowerCase(),
        heureDebut: hD, heureFin: hF,
        dateDebut: new Date(),
      });
      rapport.créés++;
    } catch (e) {
      const code = (e as any)?.code;
      if (code === 'CONFLIT_EDT') { rapport.conflits++; rapport.erreurs.push({ ligne: numLigne, erreur: 'conflit détecté (créneau ignoré)' }); }
      else rapport.erreurs.push({ ligne: numLigne, erreur: e instanceof ActionError ? e.message : String((e as Error).message).slice(0, 60) });
    }
  }
  return rapport;
}

// --------------------------------------------------------------------
// M14 — PV DE CONSEIL + CONVOCATIONS
// --------------------------------------------------------------------

export async function genererPvConseilCore(ctx: Ctx, conseilId: string) {
  assertPermission(ctx, 'bulletins.valider');
  const conseil = await db.conseilClasse.findUnique({
    where: { id: conseilId },
    include: { membres: true, deliberations: { include: { eleve: true, votes: true } } },
  });
  if (!conseil) throw new ActionError('Conseil introuvable.', 'INTROUVABLE');
  assertTenant(conseil.ecoleId, ctx, 'Ce conseil');
  const [classe, periode, utilisateursMembres] = await Promise.all([
    db.classe.findUnique({ where: { id: conseil.classeId } }),
    db.periode.findUnique({ where: { id: conseil.periodeId } }),
    db.utilisateur.findMany({ where: { id: { in: conseil.membres.map((m) => m.utilisateurId) } } }),
  ]);
  const nomUtilisateur = (id: string) => {
    const u = utilisateursMembres.find((x) => x.id === id);
    return u ? `${u.prenom} ${u.nom}` : '—';
  };
  const pv = {
    classe: classe?.libelle ?? '—',
    periode: periode?.libelle ?? '—',
    date: conseil.date,
    présences: conseil.membres.map((m) => ({ nom: nomUtilisateur(m.utilisateurId), présent: m.present, rôle: m.role })),
    délibérations: conseil.deliberations.map((d) => ({
      élève: `${d.eleve.prenom} ${d.eleve.nom}`,
      décision: d.decision, mention: d.mention,
      votes: { pour: d.votes.filter((v) => v.vote === 'pour').length, contre: d.votes.filter((v) => v.vote === 'contre').length, abstention: d.votes.filter((v) => v.vote === 'abstention').length },
    })),
    généréLe: new Date(),
  };
  const doc = await db.documentGenere.create({
    data: {
      ecoleId: conseil.ecoleId, cibleType: 'conseil', cibleId: conseilId,
      titre: `PV conseil — ${classe?.libelle ?? ''} (${periode?.libelle ?? ''})`,
      format: 'html', fichierUrl: `/documents/pv/${conseilId}`, genereParId: ctx.utilisateurId,
    },
  });
  return { documentId: doc.id, pv };
}

/** Convocations aux membres (notifications in-app). */
export async function convoquerConseilCore(ctx: Ctx, conseilId: string) {
  assertPermission(ctx, 'bulletins.valider');
  const conseil = await db.conseilClasse.findUnique({ where: { id: conseilId }, include: { membres: true } });
  if (!conseil) throw new ActionError('Conseil introuvable.', 'INTROUVABLE');
  assertTenant(conseil.ecoleId, ctx, 'Ce conseil');
  const [classe, periode] = await Promise.all([
    db.classe.findUnique({ where: { id: conseil.classeId } }),
    db.periode.findUnique({ where: { id: conseil.periodeId } }),
  ]);
  let envoyées = 0;
  for (const m of conseil.membres) {
    await db.notification.create({
      data: {
        ecoleId: conseil.ecoleId, destinataireType: 'personnel', destinataireId: m.utilisateurId,
        sujet: `Convocation — conseil de classe ${classe?.libelle ?? ""}`,
        corps: `Vous êtes convoqué(e) au conseil de classe de ${classe?.libelle ?? ''} (${periode?.libelle ?? ''}) le ${conseil.date.toISOString().slice(0, 10)}${conseil.salle ? ` — ${conseil.salle}` : ''}.`,
        canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(),
      },
    });
    envoyées++;
  }
  return { envoyées };
}

// --------------------------------------------------------------------
// M15 — RAPPROCHEMENT BANCAIRE
// --------------------------------------------------------------------

/** Format relevé : date(YYYY-MM-DD);montant(XOF);libelle */
export async function importerReleveCsvCore(ctx: Ctx, ecoleId: string, contenu: string) {
  assertPermission(ctx, 'finances.ecrire');
  const lignes = contenu.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lignes.length === 0) throw new ActionError('Relevé vide.', 'SAISIE_VIDE');
  let importées = 0;
  const début = /date/i.test(lignes[0]) ? 1 : 0;
  for (let i = début; i < lignes.length; i++) {
    const [dateStr, montantStr, ...libParts] = lignes[i].split(/[;]/).map((p) => p.trim());
    const montant = Math.round(parseFloat((montantStr ?? '0').replace(',', '.')) * 100);
    if (isNaN(new Date(dateStr).getTime()) || !Number.isFinite(montant)) continue;
    await db.ligneReleve.create({
      data: { ecoleId, date: new Date(dateStr), montant, libelle: (libParts.join(';') || '—').slice(0, 200) },
    });
    importées++;
  }
  return { importées };
}

/** Rapprochement automatique : ligne ↔ paiement par montant identique à ±3 jours. */
export async function rapprocherAutoCore(ctx: Ctx, ecoleId: string) {
  assertPermission(ctx, 'finances.valider');
  const lignes = await db.ligneReleve.findMany({ where: { ecoleId, rapprochee: false } });
  const paiements = await db.paiement.findMany({ where: { ecoleId, annule: false } });
  const rapprochées = new Set<string>();
  let matches = 0;
  for (const l of lignes) {
    const candidat = paiements.find(
      (p) =>
        p.montant === l.montant &&
        Math.abs(p.datePaiement.getTime() - l.date.getTime()) <= 3 * 86400000 &&
        !rapprochées.has(p.id),
    );
    if (candidat) {
      await db.ligneReleve.update({ where: { id: l.id }, data: { rapprochee: true, paiementId: candidat.id } });
      rapprochées.add(candidat.id);
      matches++;
    }
  }
  await logAction(db, ecoleId, ctx.utilisateurId, 'compta.rapprochement_auto', undefined, undefined, { matches, restantes: lignes.length - matches });
  return { matches, nonRapprochées: lignes.length - matches };
}

/** Export comptable CSV des écritures validées (pour l'expert-comptable). */
export async function exportComptableCsvCore(ctx: Ctx, ecoleId: string) {
  assertPermission(ctx, 'finances.voir');
  const écritures = await db.ecritureComptable.findMany({
    where: { ecoleId, statut: 'valide' },
    include: { lignes: { include: { compte: true } } },
    orderBy: { date: 'asc' },
  });
  const rows = ['date;piece;journal_libelle;compte;compte_libelle;debit;credit'];
  for (const e of écritures) {
    for (const l of e.lignes) {
      rows.push([
        e.date.toISOString().slice(0, 10),
        e.numeroPiece ?? '',
        e.libelle.replace(/;/g, ','),
        l.compte.numero,
        l.compte.libelle.replace(/;/g, ','),
        String(l.debit / 100),
        String(l.credit / 100),
      ].join(';'));
    }
  }
  return { csv: rows.join('\n'), écritures: écritures.length };
}

// --------------------------------------------------------------------
// M16 — EXPORT DES VIREMENTS DE PAIE
// --------------------------------------------------------------------

export async function exporterVirementsPaieCore(ctx: Ctx, ecoleId: string, periode: string) {
  assertPermission(ctx, 'rh.gerer');
  if (!/^\d{4}-\d{2}$/.test(periode)) throw new ActionError('Période invalide (AAAA-MM).', 'CHAMP_INVALIDE');
  const bulletins = await db.bulletinPaie.findMany({
    where: { ecoleId, periode, statut: { in: ['valide', 'paye'] } },
    include: { personnel: true },
  });
  const rows = ['beneficiaire_nom;prenom;matricule;rib;montant_net'];
  let sansRib = 0;
  for (const b of bulletins) {
    if (!b.personnel.rib) { sansRib++; continue; }
    rows.push([
      b.personnel.nom.replace(/;/g, ','),
      b.personnel.prenom.replace(/;/g, ','),
      b.personnel.matricule ?? '',
      b.personnel.rib,
      String(b.netAPayer / 100),
    ].join(';'));
  }
  return { csv: rows.join('\n'), bulletins: bulletins.length, sansRib };
}

// --------------------------------------------------------------------
// E19 — ABONNEMENT PUSH WEB (relais configurable)
// --------------------------------------------------------------------

export async function abonnerPushCore(ctx: Ctx, input: { endpoint: string; p256dh: string; auth: string }) {
  if (!/^https?:\/\//.test(input.endpoint)) throw new ActionError('Endpoint push invalide.', 'CHAMP_INVALIDE');
  await db.pushToken.upsert({
    where: { token: input.endpoint },
    create: { utilisateurId: ctx.utilisateurId, token: input.endpoint, provider: 'web_push', p256dh: input.p256dh, authKey: input.auth },
    update: { utilisateurId: ctx.utilisateurId, p256dh: input.p256dh, authKey: input.auth, actif: true },
  });
  return { ok: true };
}

// --------------------------------------------------------------------
// E21 — CANDIDATURE PUBLIQUE (sans compte, throttle par IP)
// --------------------------------------------------------------------

export async function creerCandidaturePubliqueCore(input: {
  ecoleSlug: string; nom: string; prenom: string; dateNaissance: Date; email: string; telephone?: string;
  niveauCode?: string; parentNom?: string; parentTelephone?: string; ip?: string;
}) {
  const école = await db.ecole.findUnique({ where: { slug: input.ecoleSlug } });
  if (!école || ['suspendu', 'resilie'].includes(école.statut)) {
    throw new ActionError('Établissement introuvable ou non ouvert aux candidatures.', 'INTROUVABLE');
  }
  if (!input.nom?.trim() || !input.prenom?.trim() || !input.email?.includes('@')) {
    throw new ActionError('Nom, prénom et email valides sont obligatoires.', 'CHAMP_MANQUANT');
  }
  if (isNaN(input.dateNaissance?.getTime())) throw new ActionError('Date de naissance invalide.', 'DATE_INVALIDE');
  // Throttle : max 5 candidatures / 24 h par IP
  if (input.ip) {
    const dernières24h = new Date(Date.now() - 86400000);
    const nb = await db.candidatureAdmission.count({
      where: { sourceIp: input.ip, dateSoumission: { gte: dernières24h } },
    });
    if (nb >= 5) throw new ActionError('Trop de candidatures depuis cette adresse. Réessayez demain.', 'LIMITE_ATTEINTE');
  }
  let niveauId: string | undefined;
  if (input.niveauCode) {
    const niveau = await db.niveau.findFirst({
      where: { code: input.niveauCode.toUpperCase(), section: { cycle: { ecoleId: école.id } } },
    });
    niveauId = niveau?.id;
  }
  const c = await db.candidatureAdmission.create({
    data: {
      ecoleId: école.id, nom: input.nom.trim(), prenom: input.prenom.trim(),
      dateNaissance: input.dateNaissance, email: input.email.trim().toLowerCase(),
      telephone: input.telephone?.trim() || null, niveauId,
      parentNom: input.parentNom?.trim() || null, parentTelephone: input.parentTelephone?.trim() || null,
      sourceIp: input.ip ?? null, statut: 'soumis',
    },
  });
  await db.etapeAdmission.create({ data: { candidatureId: c.id, etape: 'depot_dossier', statut: 'en_attente' } });
  // Notifier le secrétariat/direction
  const { getDirectionUserId } = await import('./commun');
  await db.notification.create({
    data: {
      ecoleId: école.id, destinataireType: 'personnel', destinataireId: await getDirectionUserId(école.id),
      sujet: 'Nouvelle candidature (formulaire public)',
      corps: `${input.prenom} ${input.nom} vient de candidater${input.niveauCode ? ` (niveau ${input.niveauCode})` : ''}. Dossier à instruire dans le module Admissions.`,
      canal: 'in_app', statut: 'envoye', dateEnvoi: new Date(),
    },
  }).catch(() => {});
  return { candidatureId: c.id };
}
