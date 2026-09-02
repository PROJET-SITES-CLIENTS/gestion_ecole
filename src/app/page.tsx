// ====================================================================
// Page principale — authentification OBLIGATOIRE (P0).
// - Session absente → redirection /login
// - Portail dérivé du compte connecté (plus de sélecteur de démo)
// - Payload : datasets AFFICHÉS uniquement (35 requêtes invisibles
//   purgées — audit P3) et secrets exclus par select (audit P0 :
//   plus aucun motDePasseHash / tokenHash / secret côté client)
// ====================================================================

import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import AppShell from '@/components/app-shell';
import { getSessionCourante, portailDuCompte } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ECOLE_DEMO_SLUG = 'vinci';

export default async function Home() {
  // ---- Session (P0) : pas de session → login ----
  const session = await getSessionCourante();
  if (!session) redirect('/login');

  const portal = portailDuCompte(session.utilisateur.type, session.permissions);

  // ---- École de travail : celle de l'utilisateur, sinon école démo
  // (super-admin éditeur = vue cross-tenant) ----
  const ecole = session.utilisateur.ecoleId
    ? await db.ecole.findFirst({ where: { id: session.utilisateur.ecoleId }, include: { plans: true } })
    : await db.ecole.findFirst({ where: { slug: ECOLE_DEMO_SLUG }, include: { plans: true } });

  if (!ecole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Aucune école associée à ce compte</h1>
          <p className="text-sm text-gray-500">Contactez l&apos;administrateur de la plateforme ou exécutez le seed.</p>
        </div>
      </div>
    );
  }

  // Direction : ciblage déterministe (email direction@, fallback createdAt).
  const dirUtilisateur =
    (await db.utilisateur.findFirst({
      where: { ecoleId: ecole.id, type: 'personnel', email: { startsWith: 'direction@' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })) ??
    (await db.utilisateur.findFirst({
      where: { ecoleId: ecole.id, type: 'personnel' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    }));
  const dirUserId = dirUtilisateur?.id ?? 'system';

  // ---- Données SaaS cross-tenant (super-admin uniquement) ----
  const [ecoles, plans, facturesSaas, totalElevesGeres] = session.utilisateur.type === 'super_admin'
    ? await Promise.all([
        db.ecole.findMany({ select: { id: true, nom: true, slug: true, pays: true, devise: true, statut: true } }),
        db.planTarifaire.findMany(),
        db.factureSaas.findMany(),
        db.eleve.count(),
      ])
    : [[], [], [], 0];

  // ---- Données de l'école — datasets AFFICHÉS uniquement ----
  const [
    anneeScolaire, niveaux, classes,
    eleves, personnels, parents,
    periodes, matieres, programmes, avancements,
    seances, presences,
    evaluations, notes, bulletins, evalsCompetence, competences,
    incidents, sanctions,
    frais, echeances, paiements, depenses, articlesStock, mouvementsStock,
    salles, reservations, calendrier,
    examensOfficiels, inscriptionsExamen,
    creneauxRdv, rdvs, reunionsCollectives,
    visiteurs, autorisationsSortie, sortiesAnticipees,
    modelesMessage, notifications,
    auditLogs,
    cantines, lignesTransport, arrets, transports,
    biblioLivres, biblioPrets,
    manuels, attributionsManuel,
    besoinsSpecifiques, amenagements,
    conges, remplacements, evaluationsRh, roles, personnelRoles,
    // === EXTENSION V4 — datasets réellement affichés ===
    tickets, signalementsMineurs,
    verificationsAntecedents,
    bulletinsPaie,
    offresEmploi,
    stages, soldesConge,
    candidaturesAdmission,
    emploisTemps,
    devoirs,
    cahiersTexte,
    conseilsClasse,
    dispenses,
    justificationsAbsence,
    budgets,
    ecrituresComptable,
    fournisseurs, facturesFournisseur,
    avoirsEcole,
    conversations, annonces,
    smsLogs,
    pushNotificationLogs,
    // Sécurité & conformité (selects SANS secrets — P0)
    tentativesConnexion,
    avoirsSaas,
    demandesEffacement,
    consentementsImage,
    domainesPersonnalises,
    quotaUsages,
    plansAccompagnement,
    batiments,
    // === SANTÉ & INFIRMERIE (P2) ===
    fichesSante, passagesInfirmerie, vaccinations,
  ] = await Promise.all([
    db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true }, orderBy: { dateDebut: 'desc' } }),
    db.niveau.findMany({ include: { section: { include: { cycle: true } } } }),
    db.classe.findMany({ where: { ecoleId: ecole.id } }),
    db.eleve.findMany({ where: { ecoleId: ecole.id }, orderBy: { nom: 'asc' } }),
    db.personnel.findMany({ where: { ecoleId: ecole.id }, orderBy: { nom: 'asc' } }),
    db.parentTuteur.findMany({ where: { ecoleId: ecole.id }, include: { eleves: { include: { eleve: true } } } }),
    db.periode.findMany({ where: { ecoleId: ecole.id } }),
    db.matiere.findMany({ where: { ecoleId: ecole.id } }),
    db.programme.findMany({ where: { ecoleId: ecole.id } }),
    db.avancementProgramme.findMany({ include: { chapitre: { include: { programme: { include: { matiere: true } } } } } }),
    db.seance.findMany({ include: { matiere: true, classe: true, enseignant: true } }),
    db.presence.findMany(),
    db.evaluation.findMany({ where: { ecoleId: ecole.id }, orderBy: { date: 'desc' } }),
    db.note.findMany(),
    db.bulletin.findMany(),
    db.evaluationCompetence.findMany(),
    db.competence.findMany({ where: { ecoleId: ecole.id } }),
    db.incident.findMany(),
    db.sanction.findMany(),
    db.frais.findMany({ where: { ecoleId: ecole.id } }),
    db.echeanceFrais.findMany({ include: { frais: true } }),
    db.paiement.findMany({ where: { ecoleId: ecole.id }, orderBy: { datePaiement: 'desc' } }),
    db.depense.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateDepense: 'desc' } }),
    db.stockArticle.findMany({ where: { ecoleId: ecole.id } }),
    db.mouvementStock.findMany({ orderBy: { dateMouvement: 'desc' } }),
    db.salle.findMany({ where: { ecoleId: ecole.id }, include: { batiment: true, etage: true } }),
    db.reservationSalle.findMany(),
    db.calendrierScolaire.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateDebut: 'asc' } }),
    db.examenOfficiel.findMany({ where: { ecoleId: ecole.id } }),
    db.inscriptionExamenOfficiel.findMany(),
    db.creneauRdv.findMany(),
    db.rdv.findMany(),
    db.reunionCollective.findMany(),
    db.visiteur.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateHeureEntree: 'desc' } }),
    db.autorisationSortie.findMany(),
    db.sortieAnticipee.findMany({ orderBy: { dateSortie: 'desc' } }),
    db.modeleMessage.findMany({ where: { ecoleId: ecole.id } }),
    // Notifications DU COMPTE CONNECTÉ (plus seulement la direction)
    db.notification.findMany({
      where: { ecoleId: ecole.id, destinataireId: session.utilisateur.id },
      orderBy: { dateCreation: 'desc' },
    }),
    db.auditLog.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateAction: 'desc' }, take: 100 }),
    db.cantineInscription.findMany({ where: { ecoleId: ecole.id } }),
    db.transportLigne.findMany({ where: { ecoleId: ecole.id } }),
    db.transportArret.findMany(),
    db.transportInscription.findMany({ where: { ecoleId: ecole.id } }),
    db.biblioLivre.findMany({ where: { ecoleId: ecole.id } }),
    db.biblioPret.findMany(),
    db.manuelScolaire.findMany({ where: { ecoleId: ecole.id } }),
    db.attributionManuel.findMany(),
    db.besoinSpecifique.findMany(),
    db.amenagement.findMany(),
    db.conge.findMany(),
    db.remplacement.findMany(),
    db.evaluationPersonnel.findMany(),
    db.role.findMany({ where: { ecoleId: ecole.id } }),
    // Affectations formelles "qui enseigne quelle matière / quelle classe" (vue 360° direction)
    db.personnelRole.findMany({
      where: { personnel: { ecoleId: ecole.id } },
      include: { personnel: true, role: true },
      orderBy: { dateDebut: 'asc' },
    }),
    // === EXTENSION V4 ===
    db.ticket.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateCreation: 'desc' }, include: { messages: true } }),
    db.signalementMineur.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateSignalement: 'desc' } }),
    db.verificationAntecedents.findMany({ where: { ecoleId: ecole.id } }),
    db.bulletinPaie.findMany({ where: { ecoleId: ecole.id }, orderBy: { periode: 'desc' }, include: { lignes: true, cotisations: true } }),
    db.offreEmploi.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateOuverture: 'desc' } }),
    db.stage.findMany({ where: { ecoleId: ecole.id } }),
    db.soldeConge.findMany({ where: { ecoleId: ecole.id } }),
    db.candidatureAdmission.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateSoumission: 'desc' } }),
    db.emploiTemps.findMany({ where: { ecoleId: ecole.id } }),
    db.devoir.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateRendu: 'desc' } }),
    db.cahierTexte.findMany({ where: { ecoleId: ecole.id }, include: { entrees: true } }),
    db.conseilClasse.findMany({ where: { ecoleId: ecole.id }, include: { membres: true, deliberations: true } }),
    db.dispense.findMany({ where: { ecoleId: ecole.id } }),
    db.justificationAbsence.findMany({ where: { ecoleId: ecole.id } }),
    db.budget.findMany({ where: { ecoleId: ecole.id }, include: { lignes: true } }),
    db.ecritureComptable.findMany({ include: { lignes: true } }),
    db.fournisseur.findMany({ where: { ecoleId: ecole.id } }),
    db.factureFournisseur.findMany({ where: { ecoleId: ecole.id } }),
    db.avoirEcole.findMany({ where: { ecoleId: ecole.id } }),
    db.conversation.findMany({ where: { ecoleId: ecole.id }, include: { participants: true, messages: true } }),
    db.annonce.findMany({ where: { ecoleId: ecole.id }, orderBy: { datePublication: 'desc' } }),
    db.smsLog.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateCreation: 'desc' } }),
    db.pushNotificationLog.findMany({ where: { ecoleId: ecole.id } }),
    // --- Sécurité : SANS SECRETS (P0) ---
    db.tentativeConnexion.findMany({ orderBy: { date: 'desc' }, take: 30, select: { id: true, email: true, succes: true, motifEchec: true, date: true, utilisateurId: true } }),
    db.avoirSaas.findMany({ where: { ecoleId: ecole.id } }),
    db.demandeEffacement.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateDemande: 'desc' } }),
    db.consentementImage.findMany({ where: { ecoleId: ecole.id } }),
    db.domainePersonnalise.findMany({ where: { ecoleId: ecole.id } }),
    db.quotaUsage.findMany({ where: { ecoleId: ecole.id } }),
    db.planAccompagnement.findMany({ where: { ecoleId: ecole.id }, include: { membres: true, objectifs: true, revisions: true } }),
    db.batiment.findMany({ where: { ecoleId: ecole.id }, include: { etages: true } }),
    // === SANTÉ & INFIRMERIE (P2) ===
    db.ficheSante.findMany({ where: { ecoleId: ecole.id } }),
    db.passageInfirmerie.findMany({ where: { ecoleId: ecole.id }, orderBy: { datePassage: 'desc' } }),
    db.vaccination.findMany({ where: { ecoleId: ecole.id } }),
  ]);

  // ---- Utilisateurs : select SANS motDePasseHash (P0 purge secrets) ----
  const utilisateurs = await db.utilisateur.findMany({
    where: { ecoleId: ecole.id },
    select: {
      id: true, ecoleId: true, email: true, nom: true, prenom: true, type: true,
      actif: true, derniereConnexion: true, createdAt: true, telephone: true,
    },
  });
  const sessionsUtilisateur = await db.sessionUtilisateur.findMany({
    select: { id: true, utilisateurId: true, dateCreation: true, dateDerniereActivite: true, dateExpiration: true, active: true, userAgent: true },
    where: { dateCreation: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
    orderBy: { dateCreation: 'desc' },
  });
  const twoFactorMethods = await db.twoFactorMethod.findMany({
    select: { id: true, utilisateurId: true, methode: true, actif: true, dateActivation: true, derniereUtilisation: true },
  });
  const jetonsAuth = await db.jetonAuth.findMany({
    select: { id: true, email: true, type: true, expireLe: true, utilise: true, dateCreation: true },
  });
  const apiTokens = await db.apiToken.findMany({
    where: { ecoleId: ecole.id },
    select: { id: true, nom: true, prefix: true, scopes: true, actif: true, dateCreation: true, dateExpiration: true },
  });
  const permissions = await db.permission.findMany({ include: { roles: true } });
  const rolePermissions = await db.rolePermission.findMany();
  const utilisateurRoles = await db.utilisateurRole.findMany();
  const documentsEleve = await db.documentEleve.findMany();
  const historiquesClasse = await db.eleveHistoriqueClasse.findMany();
  const listesFourniture = await db.listeFourniture.findMany();

  // ---- Identité réelle du portail connecté (P2) ----
  // Parent → ses enfants ; Élève → lui-même.
  let parentId: string | null = null;
  let eleveIdSession: string | null = null;
  const enfantsIds: string[] = [];
  if (portal === 'parent') {
    const parent = await db.parentTuteur.findFirst({ where: { utilisateurId: session.utilisateur.id } });
    if (parent) {
      parentId = parent.id;
      const liens = await db.eleveParent.findMany({ where: { parentId: parent.id }, select: { eleveId: true } });
      enfantsIds.push(...liens.map((l) => l.eleveId));
    }
  }
  if (portal === 'eleve') {
    const eleveLie = await db.eleve.findFirst({ where: { utilisateurId: session.utilisateur.id } });
    if (eleveLie) {
      eleveIdSession = eleveLie.id;
      enfantsIds.push(eleveLie.id);
    }
  }

  const initialData = {
    ecole,
    anneeScolaire,
    ecoles, plans, facturesSaas, totalElevesGeres,

    // Session (P0) — identité, portail, permissions
    session: {
      utilisateur: session.utilisateur,
      portal,
      permissions: [...session.permissions],
      parentId,
      eleveId: eleveIdSession,
      enfantsIds,
    },

    // Fondations
    niveaux, classes,
    roles, permissions, rolePermissions, utilisateurRoles,

    // Élèves
    eleves, parents,
    besoinsSpecifiques, amenagements,
    documents: documentsEleve,
    historiquesClasse,

    // Personnel & RH
    personnels, conges, remplacements, evaluationsRh, personnelRoles,

    // Pédagogique
    matieres, programmes, avancements, seances, periodes,
    evaluations, notes, bulletins,
    competences, evalsCompetence,

    // Présences
    presences,

    // Vie scolaire
    incidents, sanctions,

    // Finances
    frais, echeances, paiements, depenses,
    articlesStock, mouvementsStock,

    // Services
    cantines, transports, lignesTransport, arrets,
    biblioLivres, biblioPrets,
    manuels, attributionsManuel, listesFourniture,

    // Salles & calendrier
    salles, reservations, calendrier, emploisTemps,

    // Examens officiels
    examensOfficiels, inscriptionsExamen,

    // RDV
    creneauxRdv, rdvs, reunionsCollectives,

    // Sécurité
    visiteurs, autorisationsSortie, sortiesAnticipees,

    // Communication
    modelesMessage, notifications,

    // Audit
    auditLogs,

    // Utilisateurs (SANS secrets)
    utilisateurs, sessionsUtilisateur, twoFactorMethods, tentativesConnexion, jetonsAuth, apiTokens,

    // Santé & infirmerie (P2)
    fichesSante, passagesInfirmerie, vaccinations,

    // Compatibilité
    dirUserId,

    // === EXTENSION V4 — 37 FAILLES (datasets affichés) ===
    tickets, avoirsSaas,
    signalementsMineurs, verificationsAntecedents,
    bulletinsPaie,
    offresEmploi,
    stages, soldesConge,
    candidaturesAdmission,
    devoirs,
    cahiersTexte,
    conseilsClasse,
    dispenses,
    justificationsAbsence,
    budgets,
    ecrituresComptable,
    fournisseurs, facturesFournisseur,
    avoirsEcole,
    conversations, annonces,
    smsLogs, pushNotificationLogs,
    demandesEffacement,
    consentementsImage,
    domainesPersonnalises,
    quotaUsages,
    plansAccompagnement,
    batiments,
  };

  return <AppShell initialData={initialData} />;
}
