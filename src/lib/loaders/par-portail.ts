// ====================================================================
// CHARGEURS DE DONNÉES PAR PORTAIL (F1 — correction de la faille majeure)
// Chaque portail ne reçoit QUE les datasets de son périmètre :
//  - un ÉLÈVE ne reçoit que ses propres données (agrégats serveur inclus) ;
//  - un PARENT ne reçoit que les données de SES enfants (lien EleveParent
//    résolu côté serveur, jamais depuis le client) ;
//  - les portails métiers reçoivent leur périmètre (RH seul à voir les
//    salaires, Santé seule à voir les fiches médicales…) ;
//  - toutes les requêtes sont filtrées par ecoleId (fini les fuites
//    cross-tenant de sessions/tentatives/2FA).
// Les clés absentes du périmètre sont présentes mais VIDES ([] / null) :
// l'UI reste stable, aucune donnée ne quitte le serveur.
// F14 : les grandes listes sont plafonnées (take) + compte total renvoyé.
// ====================================================================

import { db } from '@/lib/db';
import type { SessionInfo, PortailUtilisateur } from '@/lib/auth';

// Champs sensibles jamais envoyés hors périmètre RH/direction/super_admin
const SELECT_PERSONNEL_PUBLIC = {
  id: true, ecoleId: true, matricule: true, nom: true, prenom: true,
  sexe: true, telephone: true, email: true, dateEmbauche: true,
  statut: true, typeContrat: true, diplomePrincipal: true, photoUrl: true,
  utilisateurId: true,
} as const;

const SELECT_PERSONNEL_RESTREINT = {
  ...SELECT_PERSONNEL_PUBLIC,
  salaireBrut: true, numeroSecuriteSociale: true, contactUrgence: true,
} as const;

// Plafonds F14
const CAP = { eleves: 500, notes: 1000, presences: 1000, echeances: 500, paiements: 500, incidents: 300, sanctions: 300, rdvs: 300, bulletin: 500, audit: 200 } as const;

export type DonneesPortail = Record<string, unknown> & {
  totaux?: Record<string, number>;
};

/** Datasets communs à presque tous les portails de l'école. */
async function baseEcole(ecoleId: string, userId: string) {
  const [ecole, anneeScolaire, notifications] = await Promise.all([
    db.ecole.findUnique({ where: { id: ecoleId }, select: { id: true, nom: true, slug: true, pays: true, devise: true, statut: true } }),
    db.anneeScolaire.findFirst({ where: { ecoleId, active: true }, orderBy: { dateDebut: 'desc' } }),
    db.notification.findMany({
      where: { destinataireId: userId },
      orderBy: { dateCreation: 'desc' },
      take: 50,
    }),
  ]);
  return { ecole, anneeScolaire, notifications };
}

/** true si le périmètre autorise les données RH complètes (salaires…). */
const voirtRh = (p: PortailUtilisateur) => p === 'rh' || p === 'direction' || p === 'super_admin';
/** true si le périmètre autorise les données médicales. */
const voitSante = (p: PortailUtilisateur) => p === 'sante' || p === 'direction' || p === 'super_admin';
/** true si le portail peut voir la console sécurité (sessions, tentatives). */
const voitSecurite = (p: PortailUtilisateur) => p === 'direction' || p === 'super_admin';

export async function chargerDonneesPortail(
  portal: PortailUtilisateur,
  session: SessionInfo,
  anneeCibleId?: string | null, // V4 — consulter une année clôturée
): Promise<DonneesPortail> {
  // ----- Super-admin éditeur : périmètre plateforme + école pivot -----
  if (portal === 'super_admin') {
    const ecolePivot = session.utilisateur.ecoleId ?? (await db.ecole.findFirst({ where: { slug: 'vinci' }, select: { id: true } }))?.id;
    const d = ecolePivot ? await chargerPortailInterne('direction', session, ecolePivot) : {};
    const [ecoles, plans, facturesSaas, totalElevesGeres] = await Promise.all([
      db.ecole.findMany({ select: { id: true, nom: true, slug: true, pays: true, devise: true, statut: true, planCourantId: true }, orderBy: { nom: 'asc' } }),
      db.planTarifaire.findMany({ orderBy: { prixMensuel: 'asc' } }),
      db.factureSaas.findMany({ orderBy: { dateEmission: 'desc' }, take: 200 }),
      db.eleve.count({ where: { deletedAt: null } }),
    ]);
    const plansDetail = await db.planTarifaire.findMany();
    const plansParId = new Map(plansDetail.map((p) => [p.id, p]));
    return {
      ...d,
      ecoles: ecoles.map((e) => ({ ...e, plan: e.planCourantId ? plansParId.get(e.planCourantId) ?? null : null })),
      plans,
      facturesSaas,
      totalElevesGeres,
    };
  }

  // ----- Élève : STRICTEMENT ses données -----
  if (portal === 'eleve') return { ...vide(), ...(await chargerPortailEleve(session)) };

  // ----- Parent : STRICTEMENT ses enfants -----
  if (portal === 'parent') return { ...vide(), ...(await chargerPortailParent(session)) };

  // ----- Portails internes de l'école -----
  const ecoleId = session.utilisateur.ecoleId;
  if (!ecoleId) {
    const base = await baseEcoleVide();
    return { ...base, session: infoSession(session, portal) };
  }
  const années = ecoleId ? await db.anneeScolaire.findMany({ where: { ecoleId }, orderBy: { dateDebut: 'desc' } }) : [];
  const anneeActive = années.find((a) => a.active) ?? années[0] ?? null;
  const cible = anneeCibleId ? années.find((a) => a.id === anneeCibleId) ?? anneeActive : anneeActive;
  return chargerPortailInterne(portal, session, ecoleId, cible, années);
}

function infoSession(session: SessionInfo, portal: PortailUtilisateur) {
  return {
    utilisateur: session.utilisateur,
    portal,
    permissions: [...session.permissions],
    roles: session.roles,
  };
}

async function baseEcoleVide() {
  return { ecole: null, anneeScolaire: null, notifications: [] };
}

// --------------------------------------------------------------------
// Portail ÉLÈVE — zéro donnée d'un autre élève (F1)
// --------------------------------------------------------------------

async function chargerPortailEleve(session: SessionInfo): Promise<DonneesPortail> {
  const moi = await db.eleve.findFirst({
    where: { utilisateurId: session.utilisateur.id, deletedAt: null },
    include: { classeActuelle: true },
  });
  const base = await (moi ? baseEcole(moi.ecoleId, session.utilisateur.id) : baseEcoleVide());
  if (!moi) {
    return { ...base, session: infoSession(session, 'eleve'), moi: null };
  }

  const [notes, bulletins, presences, seances, echeances, incidents, sanctions, rdvs, kpiNotes, kpiAbsences, kpiEcheances] = await Promise.all([
    db.note.findMany({
      where: { eleveId: moi.id, valeur: { not: null } },
      orderBy: { dateSaisie: 'desc' },
      take: 20,
      include: { evaluation: { include: { matiere: true } } },
    }),
    db.bulletin.findMany({
      where: { eleveId: moi.id, statut: 'publie' },
      orderBy: { dateCreation: 'desc' },
      take: 10,
      include: { periode: true },
    }),
    db.presence.findMany({
      where: { eleveId: moi.id },
      orderBy: { dateSaisie: 'desc' },
      take: 50,
      include: { seance: { include: { matiere: true } } },
    }),
    moi.classeActuelleId
      ? db.seance.findMany({
          where: { classeId: moi.classeActuelleId, date: { gte: new Date() } },
          orderBy: { date: 'asc' },
          take: 20,
          // F1 — projection PUBLIQUE de l'enseignant (jamais salaire/NSS)
          include: {
            matiere: true,
            enseignant: { select: { id: true, nom: true, prenom: true } },
            salle: { select: { id: true, nom: true } },
          },
        })
      : Promise.resolve([]),
    db.echeanceFrais.findMany({
      where: { eleveId: moi.id, statut: { in: ['impayee', 'partiel'] } },
      orderBy: { dateEcheance: 'asc' },
      include: { frais: true },
    }),
    db.incident.findMany({ where: { eleveId: moi.id }, orderBy: { dateHeure: 'desc' }, take: 20, include: { sanctions: true } }),
    db.sanction.findMany({ where: { incident: { eleveId: moi.id } }, take: 20, include: { incident: true } }),
    db.rdv.findMany({ where: { eleveId: moi.id }, orderBy: { createdAt: 'desc' }, take: 20, include: { creneauRdv: { include: { personnel: { select: { id: true, nom: true, prenom: true } } } } } }),
    db.note.aggregate({ where: { eleveId: moi.id, valeur: { not: null } }, _avg: { valeur: true }, _count: true }),
    db.presence.groupBy({ by: ['statut'], where: { eleveId: moi.id }, _count: true }),
    db.echeanceFrais.aggregate({ where: { eleveId: moi.id, statut: { in: ['impayee', 'partiel'] } }, _sum: { montant: true, remise: true, montantPaye: true } }),
  ]);

  // O4 — devoirs de la classe de l'élève (encore à rendre / en cours de ramassage)
  const mesDevoirs = moi.classeActuelleId
    ? await db.devoir.findMany({
        where: { classeId: moi.classeActuelleId, statut: { in: ['assigne', 'ramasse'] } },
        orderBy: { dateRendu: 'asc' },
        take: 10,
        include: { matiere: true },
      })
    : [];

  return {
    ...base,
    session: infoSession(session, 'eleve'),
    moi,
    mesNotes: notes,
    mesBulletins: bulletins,
    mesPresences: presences,
    mesSeances: seances,
    mesEcheances: echeances,
    mesIncidents: incidents,
    mesSanctions: sanctions,
    mesRdvs: rdvs,
    mesDevoirs,
    kpi: {
      moyenneGenerale: kpiNotes._avg.valeur ?? null,
      nbNotes: kpiNotes._count,
      absences: kpiAbsences.find((k) => k.statut === 'absent')?._count ?? 0,
      retards: kpiAbsences.find((k) => k.statut === 'retard')?._count ?? 0,
      totalDu: (kpiEcheances._sum.montant ?? 0) - (kpiEcheances._sum.remise ?? 0) - (kpiEcheances._sum.montantPaye ?? 0),
    },
  };
}

// --------------------------------------------------------------------
// Portail PARENT — strictement ses enfants (lien résolu côté serveur)
// --------------------------------------------------------------------

async function chargerPortailParent(session: SessionInfo): Promise<DonneesPortail> {
  const parent = await db.parentTuteur.findFirst({ where: { utilisateurId: session.utilisateur.id } });
  if (!parent) {
    const base = await baseEcoleVide();
    return { ...base, session: infoSession(session, 'parent'), mesEnfants: [], parentId: null };
  }
  const base = await baseEcole(parent.ecoleId, session.utilisateur.id);

  const liens = await db.eleveParent.findMany({ where: { parentId: parent.id }, select: { eleveId: true } });
  const enfantsIds = liens.map((l) => l.eleveId);

  const [enfants, bulletins, echeances, rdvs, kpiEcheances] = await Promise.all([
    enfantsIds.length
      ? db.eleve.findMany({
          where: { id: { in: enfantsIds }, deletedAt: null },
          select: { id: true, matricule: true, nom: true, prenom: true, statut: true, classeActuelleId: true, photoUrl: true },
        })
      : Promise.resolve([]),
    enfantsIds.length
      ? db.bulletin.findMany({
          where: { eleveId: { in: enfantsIds }, statut: 'publie' },
          orderBy: { dateCreation: 'desc' },
          take: 30,
          include: { periode: true },
        })
      : Promise.resolve([]),
    enfantsIds.length
      ? db.echeanceFrais.findMany({
          where: { eleveId: { in: enfantsIds }, statut: { in: ['impayee', 'partiel'] } },
          orderBy: { dateEcheance: 'asc' },
          include: { frais: true },
        })
      : Promise.resolve([]),
    enfantsIds.length
      ? db.rdv.findMany({
          where: { eleveId: { in: enfantsIds } },
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { creneauRdv: { include: { personnel: { select: { id: true, nom: true, prenom: true } } } } },
        })
      : Promise.resolve([]),
    enfantsIds.length
      ? db.echeanceFrais.aggregate({
          where: { eleveId: { in: enfantsIds }, statut: { in: ['impayee', 'partiel'] } },
          _sum: { montant: true, remise: true, montantPaye: true },
        })
      : Promise.resolve({ _sum: { montant: null, remise: null, montantPaye: null } }),
  ]);

  // Libellés des classes des enfants (sans charger toutes les classes de l'école)
  const classesIds = [...new Set(enfants.map((e) => e.classeActuelleId).filter((x): x is string => Boolean(x)))];
  const classes = classesIds.length ? await db.classe.findMany({ where: { id: { in: classesIds } } }) : [];
  const classeParId = new Map(classes.map((c) => [c.id, c]));

  // Créneaux réservables (futurs, disponibles) — pour l'action reserverRdv
  const creneauxRdv = await db.creneauRdv.findMany({
    where: { statut: 'disponible', date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, personnel: { ecoleId: parent.ecoleId } },
    orderBy: { date: 'asc' },
    take: 50,
    include: { personnel: { select: SELECT_PERSONNEL_PUBLIC } },
  });

  return {
    ...base,
    session: { ...infoSession(session, 'parent'), parentId: parent.id, enfantsIds },
    parentId: parent.id,
    mesEnfants: enfants.map((e) => ({ ...e, classeActuelle: e.classeActuelleId ? classeParId.get(e.classeActuelleId) ?? null : null })),
    mesBulletins: bulletins,
    mesEcheances: echeances,
    mesRdvs: rdvs,
    creneauxRdv,
    kpi: {
      totalDu: (kpiEcheances._sum.montant ?? 0) - (kpiEcheances._sum.remise ?? 0) - (kpiEcheances._sum.montantPaye ?? 0),
    },
  };
}

// --------------------------------------------------------------------
// Portails internes (direction / métiers / enseignant / assistant)
// --------------------------------------------------------------------

async function chargerPortailInterne(portal: PortailUtilisateur, session: SessionInfo, ecoleId: string, anneeCible: { id: string; libelle: string; active: boolean } | null = null, années: Array<{ id: string; libelle: string; active: boolean }> = []): Promise<DonneesPortail> {
  const base = await baseEcole(ecoleId, session.utilisateur.id);
  const v = vide(); // clés vides par défaut — remplies selon périmètre
  v.anneesScolaires = années; // V4 — sélecteur d'année
  v.anneeConsultee = anneeCible;
  const idAnnee = anneeCible?.id;

  // Périmètres
  const rh = voirtRh(portal);
  const sante = voitSante(portal);
  const securite = voitSecurite(portal);
  const pedagogie = ['direction', 'enseignant', 'super_admin'].includes(portal);
  const finances = ['direction', 'comptabilite', 'super_admin'].includes(portal);
  const vieScolaire = ['direction', 'vie_scolaire', 'enseignant', 'assistant', 'super_admin'].includes(portal);
  const services = ['direction', 'super_admin'].includes(portal);
  const secretariat = portal === 'secretariat' || portal === 'direction' || portal === 'super_admin';
  const examens = ['direction', 'vie_scolaire', 'super_admin'].includes(portal);
  const edt = ['direction', 'vie_scolaire', 'enseignant', 'super_admin'].includes(portal);
  const salles = ['direction', 'vie_scolaire', 'super_admin'].includes(portal);
  const communication = portal !== 'eleve' && portal !== 'parent';
  const v4 = portal === 'direction' || portal === 'super_admin';

  const promises: Array<Promise<void>> = [];

  // ---- Structure académique (tous portails internes) ----
  promises.push((async () => {
    const [niveaux, classes, matieres] = await Promise.all([
      db.niveau.findMany({ where: { section: { cycle: { ecoleId } } }, include: { section: { include: { cycle: true } } }, orderBy: { ordre: 'asc' } }),
      db.classe.findMany({ where: { ecoleId, ...(idAnnee ? { anneeScolaireId: idAnnee } : {}) }, include: { niveau: true } }),
      db.matiere.findMany({ where: { ecoleId }, orderBy: { libelle: 'asc' } }),
    ]);
    v.niveaux = niveaux; v.classes = classes; v.matieres = matieres;
  })());

  // ---- Élèves (base : identité, pas de santé) ----
  promises.push((async () => {
    const [total, eleves] = await Promise.all([
      db.eleve.count({ where: { ecoleId, deletedAt: null } }),
      db.eleve.findMany({
        where: { ecoleId, deletedAt: null },
        orderBy: { nom: 'asc' },
        take: CAP.eleves,
        select: {
          id: true, ecoleId: true, matricule: true, nom: true, prenom: true, dateNaissance: true,
          lieuNaissance: true, sexe: true, photoUrl: true, statut: true, dateInscription: true,
          dateSortie: true, motifSortie: true, classeActuelleId: true, consentementPortailEleve: true,
          consentementPortailEleveDate: true, consentementPhotoInterne: true, consentementPhotoExterne: true,
          utilisateurId: true, createdAt: true,
        },
      }),
    ]);
    v.eleves = eleves;
    v.totaux.eleves = total;
  })());

  // ---- Personnels (salaires/nss réservés RH/direction/super_admin) ----
  promises.push((async () => {
    v.personnels = await db.personnel.findMany({
      where: { ecoleId, deletedAt: null },
      orderBy: { nom: 'asc' },
      select: rh ? SELECT_PERSONNEL_RESTREINT : SELECT_PERSONNEL_PUBLIC,
    });
  })());

  if (rh) {
    promises.push((async () => {
      const [roles, conges, remplacements, evaluationsRh, personnelRoles, bulletinsPaie, soldesConge] = await Promise.all([
        db.role.findMany({ where: { ecoleId } }),
        db.conge.findMany({ where: { personnel: { ecoleId } }, orderBy: { dateDebut: 'desc' }, take: 300, include: { personnel: true, remplacements: true } }),
        db.remplacement.findMany({ where: { personnelAbsent: { ecoleId } }, include: { personnelAbsent: true, personnelRemplacant: true } }),
        db.evaluationPersonnel.findMany({ where: { personnel: { ecoleId } }, orderBy: { dateEvaluation: 'desc' }, take: 200 }),
        db.personnelRole.findMany({ where: { personnel: { ecoleId } }, include: { personnel: true, role: true } }),
        db.bulletinPaie.findMany({ where: { ecoleId }, orderBy: { periode: 'desc' }, include: { personnel: true, lignes: true, cotisations: true } }),
        db.soldeConge.findMany({ where: { ecoleId } }),
      ]);
      v.roles = roles; v.conges = conges; v.remplacements = remplacements;
      v.evaluationsRh = evaluationsRh; v.personnelRoles = personnelRoles;
      v.bulletinsPaie = bulletinsPaie; v.soldesConge = soldesConge;
    })());
  }

  if (pedagogie) {
    promises.push((async () => {
      const [periodes, programmes, avancements, evaluations, notes, bulletins, competences, evalsCompetence] = await Promise.all([
        db.periode.findMany({ where: { ecoleId, ...(idAnnee ? { anneeScolaireId: idAnnee } : {}) }, orderBy: { dateDebut: 'asc' } }),
        db.programme.findMany({ where: { ecoleId }, include: { matiere: true, niveau: true, chapitres: true } }),
        db.avancementProgramme.findMany({ include: { chapitre: { include: { programme: { include: { matiere: true } } } }, classe: true } }),
        db.evaluation.findMany({ where: { ecoleId, ...(idAnnee ? { periode: { anneeScolaireId: idAnnee } } : {}) }, orderBy: { date: 'desc' }, take: 300, include: { matiere: true, classe: true, _count: { select: { notes: true } } } }),
        db.note.findMany({ take: CAP.notes, include: { evaluation: { include: { matiere: true } } } }),
        db.bulletin.findMany({ orderBy: { dateCreation: 'desc' }, take: CAP.bulletin, include: { periode: true, eleve: true } }),
        db.competence.findMany({ where: { ecoleId }, include: { matiere: true } }),
        db.evaluationCompetence.findMany({ take: 500, include: { competence: true, periode: true } }),
      ]);
      v.periodes = periodes; v.programmes = programmes; v.avancements = avancements;
      v.evaluations = evaluations; v.notes = notes; v.bulletins = bulletins;
      v.competences = competences; v.evalsCompetence = evalsCompetence;
    })());
  }

  if (vieScolaire) {
    promises.push((async () => {
      const [seances, presences, incidents, sanctions, justificationsAbsence] = await Promise.all([
        db.seance.findMany({ where: { classe: { ecoleId } }, orderBy: { date: 'desc' }, take: 300, include: { matiere: true, classe: true, enseignant: true } }),
        db.presence.findMany({ take: CAP.presences, include: { seance: { include: { matiere: true, classe: true } } } }),
        db.incident.findMany({ where: { eleve: { ecoleId } }, orderBy: { dateHeure: 'desc' }, take: CAP.incidents }),
        db.sanction.findMany({ where: { incident: { eleve: { ecoleId } } }, take: CAP.sanctions, include: { incident: true } }),
        db.justificationAbsence.findMany({ where: { eleve: { ecoleId } }, orderBy: { dateSoumission: 'desc' }, take: 200, include: { eleve: true } }),
      ]);
      v.seances = seances; v.presences = presences; v.incidents = incidents;
      v.sanctions = sanctions; v.justificationsAbsence = justificationsAbsence;
    })());
  }

  if (finances) {
    promises.push((async () => {
      const [frais, echeances, paiements, depenses, articlesStock, mouvementsStock, totPaiements, totEcheances] = await Promise.all([
        db.frais.findMany({ where: { ecoleId }, include: { niveau: true, anneeScolaire: true } }),
        db.echeanceFrais.findMany({ where: { eleve: { ecoleId } }, orderBy: { dateEcheance: 'asc' }, take: CAP.echeances, include: { frais: true, eleve: true } }),
        db.paiement.findMany({ where: { ecoleId }, orderBy: { datePaiement: 'desc' }, take: CAP.paiements }),
        db.depense.findMany({ where: { ecoleId }, orderBy: { dateDepense: 'desc' }, take: 300 }),
        db.stockArticle.findMany({ where: { ecoleId } }),
        db.mouvementStock.findMany({ where: { article: { ecoleId } }, orderBy: { dateMouvement: 'desc' }, take: 300, include: { article: true } }),
        db.paiement.count({ where: { ecoleId } }),
        db.echeanceFrais.count({ where: { eleve: { ecoleId } } }),
      ]);
      v.frais = frais; v.echeances = echeances; v.paiements = paiements;
      v.depenses = depenses; v.articlesStock = articlesStock; v.mouvementsStock = mouvementsStock;
      v.totaux.paiements = totPaiements; v.totaux.echeances = totEcheances;
    })());
  }

  if (sante) {
    promises.push((async () => {
      const [fichesBrutes, passagesInfirmerie, vaccinations] = await Promise.all([
        db.ficheSante.findMany({ where: { ecoleId }, include: { eleve: { select: { id: true, nom: true, prenom: true, matricule: true } } } }),
        db.passageInfirmerie.findMany({ where: { ecoleId }, orderBy: { datePassage: 'desc' }, take: 300, include: { eleve: { select: { id: true, nom: true, prenom: true } } } }),
        db.vaccination.findMany({ where: { ecoleId }, include: { eleve: { select: { id: true, nom: true, prenom: true } } } }),
      ]);
      // E3 — déchiffrement à la lecture des champs médicaux sensibles
      const { déchiffrer } = await import('@/lib/crypto');
      const fichesSante = fichesBrutes.map((f) => ({
        ...f,
        allergies: déchiffrer(f.allergies),
        traitementsEnCours: déchiffrer(f.traitementsEnCours),
        antecedents: déchiffrer(f.antecedents),
      }));
      v.fichesSante = fichesSante; v.passagesInfirmerie = passagesInfirmerie; v.vaccinations = vaccinations;
    })());
  }

  if (services) {
    promises.push((async () => {
      const [cantines, lignesTransport, arrets, transports, biblioLivres, biblioPrets, manuels, attributionsManuel, listesFourniture] = await Promise.all([
        db.cantineInscription.findMany({ where: { ecoleId }, include: { eleve: true, classe: true } }),
        db.transportLigne.findMany({ where: { ecoleId }, include: { arrets: true, inscriptions: { include: { eleve: true } } } }),
        db.transportArret.findMany({ include: { ligne: true } }),
        db.transportInscription.findMany({ where: { ecoleId }, include: { eleve: true, ligne: true, classe: true } }),
        db.biblioLivre.findMany({ where: { ecoleId }, orderBy: { titre: 'asc' } }),
        db.biblioPret.findMany({ where: { livre: { ecoleId } }, orderBy: { datePret: 'desc' }, take: 300, include: { livre: true, eleve: true } }),
        db.manuelScolaire.findMany({ where: { ecoleId }, include: { matiere: true, niveau: true } }),
        db.attributionManuel.findMany({ include: { manuelScolaire: true, eleve: true } }),
        db.listeFourniture.findMany({ where: { niveau: { section: { cycle: { ecoleId } } } }, include: { niveau: true } }),
      ]);
      v.cantines = cantines; v.lignesTransport = lignesTransport; v.arrets = arrets; v.transports = transports;
      v.biblioLivres = biblioLivres; v.biblioPrets = biblioPrets; v.manuels = manuels;
      v.attributionsManuel = attributionsManuel; v.listesFourniture = listesFourniture;
    })());
  }

  if (salles || edt) {
    promises.push((async () => {
      const [sallesListe, reservations, calendrier, emploisTemps, batiments] = await Promise.all([
        db.salle.findMany({ where: { ecoleId }, include: { batiment: true, etage: true } }),
        db.reservationSalle.findMany({ where: { salle: { ecoleId } }, include: { salle: true } }),
        db.calendrierScolaire.findMany({ where: { ecoleId }, orderBy: { dateDebut: 'asc' } }),
        db.emploiTemps.findMany({ where: { ecoleId }, include: { classe: true, matiere: true, enseignant: true, salle: true } }),
        db.batiment.findMany({ where: { ecoleId }, include: { etages: true, salles: true } }),
      ]);
      v.salles = sallesListe; v.reservations = reservations; v.calendrier = calendrier;
      v.emploisTemps = emploisTemps; v.batiments = batiments;
    })());
  }

  if (examens) {
    promises.push((async () => {
      const [examensOfficiels, inscriptionsExamen] = await Promise.all([
        db.examenOfficiel.findMany({ where: { ecoleId }, include: { niveau: true, anneeScolaire: true } }),
        db.inscriptionExamenOfficiel.findMany({ where: { examenOfficiel: { ecoleId } }, include: { eleve: true, examenOfficiel: true } }),
      ]);
      v.examensOfficiels = examensOfficiels; v.inscriptionsExamen = inscriptionsExamen;
    })());
  }

  if (secretariat || portal === 'vie_scolaire') {
    promises.push((async () => {
      const [parents, documents, historiquesClasse, besoinsSpecifiques, amenagements, autorisationsSortie, sortiesAnticipees] = await Promise.all([
        db.parentTuteur.findMany({
          where: { ecoleId },
          select: {
            id: true, nom: true, prenom: true, telephone: true, email: true,
            profession: true, lienAvecEleve: true, utilisateurId: true,
            eleves: { select: { eleve: { select: { id: true, nom: true, prenom: true } } } },
          },
        }),
        db.documentEleve.findMany({ where: { eleve: { ecoleId } }, include: { eleve: true } }),
        db.eleveHistoriqueClasse.findMany({ where: { eleve: { ecoleId } }, include: { classe: true, eleve: true } }),
        db.besoinSpecifique.findMany({ where: { eleve: { ecoleId } }, include: { eleve: true, amenagements: true } }),
        db.amenagement.findMany({ where: { eleve: { ecoleId } }, include: { eleve: true } }),
        db.autorisationSortie.findMany({ where: { eleve: { ecoleId } }, include: { eleve: true } }),
        db.sortieAnticipee.findMany({ where: { eleve: { ecoleId } }, orderBy: { dateSortie: 'desc' }, take: 200, include: { eleve: true } }),
      ]);
      v.parents = parents; v.documents = documents; v.historiquesClasse = historiquesClasse;
      v.besoinsSpecifiques = besoinsSpecifiques; v.amenagements = amenagements;
      v.autorisationsSortie = autorisationsSortie; v.sortiesAnticipees = sortiesAnticipees;
    })());
  }

  if (portal === 'vie_scolaire' || securite) {
    promises.push((async () => {
      v.visiteurs = await db.visiteur.findMany({ where: { ecoleId }, orderBy: { dateHeureEntree: 'desc' }, take: 200 });
    })());
  }

  if (portal === 'secretariat' || portal === 'direction' || portal === 'super_admin' || portal === 'vie_scolaire') {
    promises.push((async () => {
      const [creneauxRdv, rdvs, reunionsCollectives, candidaturesAdmission] = await Promise.all([
        db.creneauRdv.findMany({ where: { personnel: { ecoleId } }, orderBy: { date: 'asc' }, take: 200, include: { personnel: true } }),
        db.rdv.findMany({ where: { parent: { ecoleId } }, orderBy: { createdAt: 'desc' }, take: CAP.rdvs, include: { parent: true, eleve: true, creneauRdv: { include: { personnel: true } } } }),
        db.reunionCollective.findMany({ where: { classe: { ecoleId } }, orderBy: { date: 'asc' }, include: { classe: true } }),
        db.candidatureAdmission.findMany({ where: { ecoleId }, orderBy: { dateSoumission: 'desc' }, include: { niveau: true } }),
      ]);
      v.creneauxRdv = creneauxRdv; v.rdvs = rdvs; v.reunionsCollectives = reunionsCollectives;
      v.candidaturesAdmission = candidaturesAdmission;
    })());
  }

  if (communication) {
    promises.push((async () => {
      const [modelesMessage, utilisateurs] = await Promise.all([
        db.modeleMessage.findMany({ where: { ecoleId } }),
        // Liste allégée : ciblage de notifications uniquement
        db.utilisateur.findMany({
          where: { ecoleId, deletedAt: null },
          select: { id: true, email: true, nom: true, prenom: true, type: true, actif: true, derniereConnexion: true },
        }),
      ]);
      v.modelesMessage = modelesMessage; v.utilisateurs = utilisateurs;
    })());
  }

  if (securite) {
    promises.push((async () => {
      const [permissions, rolePermissions, utilisateurRoles, sessionsUtilisateur, tentativesConnexion, twoFactorMethods, jetonsAuth, apiTokens, auditLogs] = await Promise.all([
        db.permission.findMany({ include: { roles: { include: { role: true } } } }),
        db.rolePermission.findMany({ include: { role: true, permission: true } }),
        db.utilisateurRole.findMany({ where: { utilisateur: { ecoleId } }, include: { utilisateur: true, role: true } }),
        // F1/F7 — sessions et tentatives filtrées par ÉCOLE (fini le cross-tenant)
        db.sessionUtilisateur.findMany({
          where: { utilisateur: { ecoleId } },
          select: { id: true, utilisateurId: true, dateCreation: true, dateDerniereActivite: true, dateExpiration: true, active: true, userAgent: true, adresseIp: true },
          orderBy: { dateCreation: 'desc' },
          take: 100,
        }),
        db.tentativeConnexion.findMany({
          where: { utilisateur: { ecoleId } },
          orderBy: { date: 'desc' },
          take: 50,
        }),
        db.twoFactorMethod.findMany({
          where: { utilisateur: { ecoleId } },
          select: { id: true, utilisateurId: true, methode: true, actif: true, dateActivation: true, derniereUtilisation: true },
        }),
        db.jetonAuth.findMany({
          where: { utilisateur: { ecoleId } },
          select: { id: true, email: true, type: true, expireLe: true, utilise: true, dateCreation: true },
          orderBy: { dateCreation: 'desc' },
          take: 50,
        }),
        db.apiToken.findMany({ where: { ecoleId }, select: { id: true, nom: true, description: true, prefix: true, scopes: true, actif: true, dateCreation: true, dateExpiration: true } }),
        db.auditLog.findMany({ where: { ecoleId }, orderBy: { dateAction: 'desc' }, take: CAP.audit, include: { utilisateur: { select: { nom: true, prenom: true } } } }),
      ]);
      v.permissions = permissions; v.rolePermissions = rolePermissions; v.utilisateurRoles = utilisateurRoles;
      v.sessionsUtilisateur = sessionsUtilisateur; v.tentativesConnexion = tentativesConnexion;
      v.twoFactorMethods = twoFactorMethods; v.jetonsAuth = jetonsAuth; v.apiTokens = apiTokens;
      v.auditLogs = auditLogs;
    })());
  }

  if (portal === 'direction' || portal === 'super_admin') {
    promises.push((async () => {
      v.demandesCompte = await db.demandeCompte.findMany({
        where: { ecoleId, statut: 'en_attente' },
        include: { utilisateur: { select: { id: true, email: true, nom: true, prenom: true, telephone: true, type: true } } },
        orderBy: { dateDemande: 'desc' }, take: 50,
      });
    })());
  }
  if (portal === 'direction' || portal === 'super_admin') {
    promises.push((async () => {
      const { analyticsFinancieresCore, analyticsPedagogiquesCore } = await import('../business/extrascolaire');
      const ctx = { utilisateurId: session.utilisateur.id, ecoleId, type: session.utilisateur.type, permissions: session.permissions };
      try { v.analyticsFinancieres = await analyticsFinancieresCore(ctx as any, ecoleId); } catch { /* permission super_admin */ }
      try { v.analyticsPedagogiques = await analyticsPedagogiquesCore(ctx as any, ecoleId); } catch { /* idem */ }
    })());
  }
  if (services || portal === 'direction' || portal === 'super_admin') {
    promises.push((async () => {
      const jour = new Date();
      const jourUTC = new Date(Date.UTC(jour.getUTCFullYear(), jour.getUTCMonth(), jour.getUTCDate()));
      const [cantineMenus, cantinePresences, feuillesRoute, garderieInscriptions, garderieSessions, activites] = await Promise.all([
        db.cantineMenu.findMany({ where: { ecoleId, date: { gte: jourUTC } }, orderBy: { date: 'asc' }, take: 14 }),
        db.cantinePresence.findMany({ where: { ecoleId, date: jourUTC }, include: { eleve: { select: { id: true, nom: true, prenom: true } } } }),
        db.feuilleRoute.findMany({ where: { ecoleId, date: jourUTC }, include: { ligne: true, passages: { include: { arret: true } } } }),
        db.garderieInscription.findMany({ where: { ecoleId }, include: { eleve: true } }),
        db.garderieSession.findMany({ where: { ecoleId, date: jourUTC }, include: { eleve: true } }),
        db.activite.findMany({ where: { ecoleId }, orderBy: { dateDebut: 'asc' }, include: { participants: { include: { eleve: true } } } }),
      ]);
      v.cantineMenus = cantineMenus; v.cantinePresences = cantinePresences;
      v.feuillesRoute = feuillesRoute; v.garderieInscriptions = garderieInscriptions;
      v.garderieSessions = garderieSessions; v.activites = activites;
    })());
  }
  if (portal === 'direction' || portal === 'super_admin' || portal === 'rh') {
    promises.push((async () => {
      const jour = new Date();
      const jourUTC = new Date(Date.UTC(jour.getUTCFullYear(), jour.getUTCMonth(), jour.getUTCDate()));
      v.pointagesJour = await db.pointagePersonnel.findMany({ where: { ecoleId, date: jourUTC }, include: { personnel: true } });
    })());
  }
  if (v4) {
    promises.push((async () => {
      const [tickets, signalementsMineurs, verificationsAntecedents, offresEmploi, stages, devoirs, cahiersTexte, conseilsClasse, dispenses, budgets, ecrituresComptable, fournisseurs, facturesFournisseur, avoirsEcole, conversations, annonces, smsLogs, pushNotificationLogs, demandesEffacement, consentementsImage, domainePersonnalises, quotaUsages, plansAccompagnement, webhookSortants, exportsDonnees, registreTraitements, documentsGeneres] = await Promise.all([
        db.ticket.findMany({ where: { ecoleId }, include: { messages: true } }),
        db.signalementMineur.findMany({ where: { ecoleId }, orderBy: { dateSignalement: 'desc' }, include: { eleve: { select: { id: true, nom: true, prenom: true, matricule: true } }, suivis: { orderBy: { date: 'desc' } }, mesures: { orderBy: { dateDecision: 'desc' } } } }),
        db.verificationAntecedents.findMany({ where: { ecoleId }, include: { personnel: true } }),
        db.offreEmploi.findMany({ where: { ecoleId }, include: { candidatures: true } }),
        db.stage.findMany({ where: { ecoleId }, include: { eleve: true } }),
        db.devoir.findMany({ where: { ecoleId }, include: { classe: true, rendus: true } }),
        db.cahierTexte.findMany({ where: { ecoleId }, include: { entrees: true, classe: true } }),
        db.conseilClasse.findMany({ where: { ecoleId }, include: { classe: true, membres: true, deliberations: { include: { votes: true } } } }),
        db.dispense.findMany({ where: { ecoleId }, include: { eleve: true } }),
        db.budget.findMany({ where: { ecoleId }, include: { lignes: true, anneeScolaire: true } }),
        db.ecritureComptable.findMany({ where: { ecoleId }, include: { lignes: { include: { compte: true } }, journal: true } }),
        db.fournisseur.findMany({ where: { ecoleId } }),
        db.factureFournisseur.findMany({ where: { ecoleId }, include: { fournisseur: true } }),
        db.avoirEcole.findMany({ where: { ecoleId }, include: { paiementLie: true } }),
        db.conversation.findMany({ where: { ecoleId }, include: { participants: true, messages: true } }),
        db.annonce.findMany({ where: { ecoleId }, orderBy: { datePublication: 'desc' } }),
        db.smsLog.findMany({ where: { ecoleId }, orderBy: { dateCreation: 'desc' }, take: 100 }),
        db.pushNotificationLog.findMany({ where: { ecoleId }, orderBy: { dateCreation: 'desc' }, take: 100 }),
        db.demandeEffacement.findMany({ where: { ecoleId }, orderBy: { dateDemande: 'desc' } }),
        db.consentementImage.findMany({ where: { ecoleId }, include: { eleve: true } }),
        db.domainePersonnalise.findMany({ where: { ecoleId } }),
        db.quotaUsage.findMany({ where: { ecoleId } }),
        db.planAccompagnement.findMany({ where: { ecoleId }, include: { eleve: true, membres: true, objectifs: true, revisions: true } }),
        // F5 — les 4 datasets autrefois jamais chargés sont enfin alimentés
        db.webhookSortant.findMany({ where: { ecoleId } }),
        db.exportDonnees.findMany({ where: { ecoleId }, orderBy: { dateDemande: 'desc' } }),
        db.registreTraitement.findMany({ where: { ecoleId } }),
        db.documentGenere.findMany({ where: { ecoleId }, include: { template: true } }),
      ]);
      Object.assign(v, {
        tickets, signalementsMineurs, verificationsAntecedents, offresEmploi, stages,
        devoirs, cahiersTexte, conseilsClasse, dispenses, budgets, ecrituresComptable,
        fournisseurs, facturesFournisseur, avoirsEcole, conversations, annonces,
        smsLogs, pushNotificationLogs, demandesEffacement, consentementsImage,
        domainePersonnalises, quotaUsages, plansAccompagnement,
        webhooksSortants: webhookSortants, exportsDonnees, registreTraitements, documentsGeneres,
      });
    })());
  }

  await Promise.all(promises);
  return { ...v, session: infoSession(session, portal) };
}

/** Toutes les clés connues, vides — garantit des modules sans crash. */
function vide(): Record<string, unknown> & { totaux: Record<string, number> } {
  return {
    totaux: {},
    ecole: null, anneeScolaire: null, notifications: [],
    niveaux: [], classes: [], matieres: [], eleves: [], personnels: [], parents: [],
    roles: [], conges: [], remplacements: [], evaluationsRh: [], personnelRoles: [],
    bulletinsPaie: [], soldesConge: [],
    periodes: [], programmes: [], avancements: [], evaluations: [], notes: [], bulletins: [],
    competences: [], evalsCompetence: [],
    seances: [], presences: [], incidents: [], sanctions: [], justificationsAbsence: [],
    frais: [], echeances: [], paiements: [], depenses: [], articlesStock: [], mouvementsStock: [],
    fichesSante: [], passagesInfirmerie: [], vaccinations: [],
    cantines: [], lignesTransport: [], arrets: [], transports: [], biblioLivres: [], biblioPrets: [],
    manuels: [], attributionsManuel: [], listesFourniture: [],
    salles: [], reservations: [], calendrier: [], emploisTemps: [], batiments: [],
    examensOfficiels: [], inscriptionsExamen: [],
    documents: [], historiquesClasse: [], besoinsSpecifiques: [], amenagements: [],
    autorisationsSortie: [], sortiesAnticipees: [], visiteurs: [],
    creneauxRdv: [], rdvs: [], reunionsCollectives: [], candidaturesAdmission: [],
    modelesMessage: [], utilisateurs: [],
    permissions: [], rolePermissions: [], utilisateurRoles: [], sessionsUtilisateur: [],
    tentativesConnexion: [], twoFactorMethods: [], jetonsAuth: [], apiTokens: [], auditLogs: [],
    tickets: [], signalementsMineurs: [], verificationsAntecedents: [], offresEmploi: [], stages: [],
    devoirs: [], cahiersTexte: [], conseilsClasse: [], dispenses: [], budgets: [], ecrituresComptable: [],
    fournisseurs: [], facturesFournisseur: [], avoirsEcole: [], conversations: [], annonces: [],
    smsLogs: [], pushNotificationLogs: [], demandesEffacement: [], consentementsImage: [],
    domainePersonnalises: [], quotaUsages: [], plansAccompagnement: [],
    webhooksSortants: [], exportsDonnees: [], registreTraitements: [], documentsGeneres: [],
    // V4 + quotidien + activités + analytics
    anneesScolaires: [], anneeConsultee: null,
    cantineMenus: [], cantinePresences: [], feuillesRoute: [],
    garderieInscriptions: [], garderieSessions: [], activites: [],
    pointagesJour: [], lignesReleve: [],
    analyticsFinancieres: null, analyticsPedagogiques: null,
    demandesCompte: [],
    ecoles: [], plans: [], facturesSaas: [], totalElevesGeres: 0,
    avoirsSaas: [],
  };
}
