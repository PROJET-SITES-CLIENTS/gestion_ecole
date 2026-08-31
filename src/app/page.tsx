// ====================================================================
// Page principale — charge toutes les données initiales et les passe
// au shell applicatif côté client.
// ====================================================================

import { db } from '@/lib/db';
import AppShell from '@/components/app-shell';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // École démo (slug "vinci")
  const ecole = await db.ecole.findFirst({
    where: { slug: 'vinci' },
    include: { plans: true },
  });

  if (!ecole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Base de données vide</h1>
          <p className="text-sm text-gray-500">Exécutez le script de seed : <code>bunx tsx scripts/seed.ts</code></p>
        </div>
      </div>
    );
  }

  // Super-admin éditeur (le 1er)
  const superAdmin = await db.utilisateur.findFirst({ where: { type: 'super_admin' } });

  // Direction : le compte de direction (démo : direction@…) est ciblé explicitement,
  // car findFirst sans tri renvoie un personnel arbitraire (enseignant, etc.),
  // ce qui rendait les notifications de la direction invisibles.
  const dirUtilisateur =
    (await db.utilisateur.findFirst({
      where: { ecoleId: ecole.id, type: 'personnel', email: { startsWith: 'direction@' } },
    })) ??
    (await db.utilisateur.findFirst({ where: { ecoleId: ecole.id, type: 'personnel' } }));
  const dirUserId = dirUtilisateur?.id ?? 'system';

  // Données SaaS cross-tenant
  const [ecoles, plans, facturesSaas, totalElevesGeres] = await Promise.all([
    db.ecole.findMany({ include: { plans: true } }),
    db.planTarifaire.findMany(),
    db.factureSaas.findMany(),
    db.eleve.count(),
  ]);

  // Données de l'école démo — tout en parallèle
  const [
    anneeScolaire, cycles, sections, niveaux, classes,
    eleves, personnels, parents, utilisateurs,
    periodes, matieres, programmes, avancements,
    seances, presences,
    evaluations, notes, bulletins, evalsCompetence, competences, reglesCalcul,
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
    conges, remplacements, evaluationsRh, roles,
    // === EXTENSION V4 — 37 FAILLES ===
    tickets, signalementsMineurs, partenairesExternes, mesuresProtection,
    verificationsAntecedents, habilitationsPenales,
    bulletinsPaie, variablesPaie,
    offresEmploi, candidatures, entretiensRecrutement,
    stages, conventionsStage, soldesConge,
    candidaturesAdmission,
    emploisTemps, creneauxHebdo,
    devoirs, rendusDevoir,
    cahiersTexte, entreesCahierTexte,
    conseilsClasse, deliberationsConseil,
    dispenses,
    justificationsAbsence,
    budgets, lignesBudget,
    comptesComptables, journauxComptables, ecrituresComptable,
    fournisseurs, commandesFournisseur, facturesFournisseur, paiementsFournisseur,
    avoirsEcole,
    conversations, messages, piecesJointes,
    annonces,
    smsLogs, devicesMobiles, pushNotificationLogs,
    sessionsUtilisateur, twoFactorMethods, tentativesConnexion,
    jetonsAuth,
    apiTokens, apiTokenLogs,
    webhooksSortants, webhookDeliveries,
    demandesEffacement, exportsDonnees,
    consentementsImage, consentementsCommunication, registreTraitements,
    domainesPersonnalises, themesEcole,
    featureFlags, featureFlagEcoles, quotaUsages, stripeEvents, avoirsSaas,
    plansAccompagnement,
    templatesDocument, documentsGeneres, signaturesElectroniques, rapportsSauvegardes,
    batiments, etages, salleEquipements,
    permissions, rolePermissions, utilisateurRoles,
    documentsEleve, historiquesClasse, listesFourniture,
  ] = await Promise.all([
    db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } }),
    db.cycle.findMany({ where: { ecoleId: ecole.id }, orderBy: { ordre: 'asc' } }),
    db.section.findMany(),
    db.niveau.findMany(),
    db.classe.findMany({ where: { ecoleId: ecole.id } }),
    db.eleve.findMany({ where: { ecoleId: ecole.id }, orderBy: { nom: 'asc' } }),
    db.personnel.findMany({ where: { ecoleId: ecole.id }, orderBy: { nom: 'asc' } }),
    db.parentTuteur.findMany({ where: { ecoleId: ecole.id } }),
    db.utilisateur.findMany({ where: { ecoleId: ecole.id } }),
    db.periode.findMany({ where: { ecoleId: ecole.id } }),
    db.matiere.findMany({ where: { ecoleId: ecole.id } }),
    db.programme.findMany({ where: { ecoleId: ecole.id } }),
    db.avancementProgramme.findMany(),
    db.seance.findMany(),
    db.presence.findMany(),
    db.evaluation.findMany({ where: { ecoleId: ecole.id }, orderBy: { date: 'desc' } }),
    db.note.findMany(),
    db.bulletin.findMany(),
    db.evaluationCompetence.findMany(),
    db.competence.findMany({ where: { ecoleId: ecole.id } }),
    db.regleCalculMoyenne.findMany({ where: { ecoleId: ecole.id } }),
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
    db.notification.findMany({ where: { ecoleId: ecole.id, destinataireId: dirUserId }, orderBy: { dateCreation: 'desc' } }),
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
    // === EXTENSION V4 — chargement des 37 failles ===
    db.ticket.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateCreation: 'desc' }, include: { messages: true } }),
    db.signalementMineur.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateSignalement: 'desc' } }),
    db.partenaireExterne.findMany(),
    db.mesureProtection.findMany(),
    db.verificationAntecedents.findMany({ where: { ecoleId: ecole.id } }),
    db.habilitationPenale.findMany({ where: { ecoleId: ecole.id } }),
    db.bulletinPaie.findMany({ where: { ecoleId: ecole.id }, orderBy: { periode: 'desc' }, include: { lignes: true, cotisations: true } }),
    db.variablePaie.findMany({ where: { ecoleId: ecole.id } }),
    db.offreEmploi.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateOuverture: 'desc' } }),
    db.candidature.findMany({ include: { offre: true } }),
    db.entretienRecrutement.findMany(),
    db.stage.findMany({ where: { ecoleId: ecole.id } }),
    db.conventionStage.findMany(),
    db.soldeConge.findMany({ where: { ecoleId: ecole.id } }),
    db.candidatureAdmission.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateSoumission: 'desc' } }),
    db.emploiTemps.findMany({ where: { ecoleId: ecole.id }, include: { creneauHebdos: true } }),
    db.creneauHebdo.findMany(),
    db.devoir.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateRendu: 'desc' } }),
    db.renduDevoir.findMany(),
    db.cahierTexte.findMany({ where: { ecoleId: ecole.id }, include: { entrees: true } }),
    db.entreeCahierTexte.findMany(),
    db.conseilClasse.findMany({ where: { ecoleId: ecole.id }, include: { membres: true, deliberations: true } }),
    db.deliberationConseil.findMany(),
    db.dispense.findMany({ where: { ecoleId: ecole.id } }),
    db.justificationAbsence.findMany({ where: { ecoleId: ecole.id } }),
    db.budget.findMany({ where: { ecoleId: ecole.id }, include: { lignes: true } }),
    db.ligneBudget.findMany(),
    db.compteComptable.findMany({ where: { ecoleId: ecole.id } }),
    db.journalComptable.findMany({ where: { ecoleId: ecole.id } }),
    db.ecritureComptable.findMany({ where: { ecoleId: ecole.id }, include: { lignes: true } }),
    db.fournisseur.findMany({ where: { ecoleId: ecole.id } }),
    db.commandeFournisseur.findMany({ where: { ecoleId: ecole.id }, include: { lignes: true } }),
    db.factureFournisseur.findMany({ where: { ecoleId: ecole.id } }),
    db.paiementFournisseur.findMany({ where: { ecoleId: ecole.id } }),
    db.avoirEcole.findMany({ where: { ecoleId: ecole.id } }),
    db.conversation.findMany({ where: { ecoleId: ecole.id }, include: { participants: true, messages: true } }),
    db.message.findMany(),
    db.pieceJointe.findMany(),
    db.annonce.findMany({ where: { ecoleId: ecole.id }, orderBy: { datePublication: 'desc' } }),
    db.smsLog.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateCreation: 'desc' } }),
    db.deviceMobile.findMany(),
    db.pushNotificationLog.findMany({ where: { ecoleId: ecole.id } }),
    db.sessionUtilisateur.findMany(),
    db.twoFactorMethod.findMany(),
    db.tentativeConnexion.findMany({ orderBy: { date: 'desc' } }),
    db.jetonAuth.findMany(),
    db.apiToken.findMany({ where: { ecoleId: ecole.id } }),
    db.apiTokenLog.findMany(),
    db.webhookSortant.findMany({ where: { ecoleId: ecole.id } }),
    db.webhookDelivery.findMany(),
    db.demandeEffacement.findMany({ where: { ecoleId: ecole.id }, orderBy: { dateDemande: 'desc' } }),
    db.exportDonnees.findMany({ where: { ecoleId: ecole.id } }),
    db.consentementImage.findMany({ where: { ecoleId: ecole.id } }),
    db.consentementCommunication.findMany({ where: { ecoleId: ecole.id } }),
    db.registreTraitement.findMany({ where: { ecoleId: ecole.id } }),
    db.domainePersonnalise.findMany({ where: { ecoleId: ecole.id } }),
    db.themeEcole.findMany({ where: { ecoleId: ecole.id } }),
    db.featureFlag.findMany({ include: { ecoles: true } }),
    db.featureFlagEcole.findMany(),
    db.quotaUsage.findMany({ where: { ecoleId: ecole.id } }),
    db.stripeEvent.findMany(),
    db.avoirSaas.findMany({ where: { ecoleId: ecole.id } }),
    db.planAccompagnement.findMany({ where: { ecoleId: ecole.id }, include: { membres: true, objectifs: true, revisions: true } }),
    db.templateDocument.findMany({ where: { ecoleId: ecole.id } }),
    db.documentGenere.findMany({ where: { ecoleId: ecole.id }, include: { signatures: true } }),
    db.signatureElectronique.findMany(),
    db.rapportSauvegarde.findMany({ where: { ecoleId: ecole.id } }),
    db.batiment.findMany({ where: { ecoleId: ecole.id }, include: { etages: true } }),
    db.etage.findMany(),
    db.salleEquipement.findMany(),
    // === AUDIT COMPLÉMENT — RBAC, documents, historique, fournitures ===
    db.permission.findMany({ include: { roles: true } }),
    db.rolePermission.findMany(),
    db.utilisateurRole.findMany(),
    db.documentEleve.findMany(),
    db.eleveHistoriqueClasse.findMany(),
    db.listeFourniture.findMany(),
  ]);

  // Données agrégées et structurées pour le shell
  const initialData = {
    ecole,
    anneeScolaire,
    ecoles,
    plans,
    facturesSaas,
    totalElevesGeres,
    superAdmin,

    // Fondations
    cycles, sections, niveaux, classes,
    roles,
    permissions,
    rolePermissions,
    utilisateurRoles,

    // Élèves
    eleves,
    parents,
    besoinsSpecifiques,
    amenagements,
    documents: documentsEleve,
    historiquesClasse,

    // Personnel & RH
    personnels,
    conges,
    remplacements,
    evaluationsRh,

    // Pédagogique
    matieres,
    programmes,
    avancements,
    seances,
    periodes,
    evaluations,
    notes,
    bulletins,
    competences,
    evalsCompetence,
    reglesCalcul,

    // Présences
    presences,

    // Vie scolaire
    incidents,
    sanctions,

    // Finances
    frais,
    echeances,
    paiements,
    depenses,
    articlesStock,
    mouvementsStock,

    // Services
    cantines,
    transports,
    lignesTransport,
    arrets,
    biblioLivres,
    biblioPrets,
    manuels,
    attributionsManuel,
    listesFourniture,

    // Salles & calendrier
    salles,
    reservations,
    calendrier,

    // Examens officiels
    examensOfficiels,
    inscriptionsExamen,

    // RDV
    creneauxRdv,
    rdvs,
    reunionsCollectives,

    // Sécurité
    visiteurs,
    autorisationsSortie,
    sortiesAnticipees,

    // Communication
    modelesMessage,
    notifications,

    // Audit
    auditLogs,

    // Utilisateurs
    utilisateurs,

    // User IDs pour les actions
    dirUserId,

    // === EXTENSION V4 — 37 FAILLES ===
    // P0 / SaaS éditeur
    tickets, avoirsSaas,
    // Conformité mineurs
    signalementsMineurs, partenairesExternes, mesuresProtection,
    verificationsAntecedents, habilitationsPenales,
    // RH complète
    bulletinsPaie, variablesPaie, offresEmploi, candidatures,
    entretiensRecrutement, stages, conventionsStage, soldesConge,
    // Admissions
    candidaturesAdmission,
    // Pédagogique+
    emploisTemps, creneauxHebdo, devoirs, rendusDevoir,
    cahiersTexte, entreesCahierTexte, conseilsClasse, deliberationsConseil,
    dispenses,
    // Présences workflow
    justificationsAbsence,
    // Finances complètes
    budgets, lignesBudget,
    comptesComptables, journauxComptables, ecrituresComptable,
    fournisseurs, commandesFournisseur, facturesFournisseur, paiementsFournisseur,
    avoirsEcole,
    // Communication riche
    conversations, messages, piecesJointes, annonces,
    smsLogs, devicesMobiles, pushNotificationLogs,
    // Sécurité & Conformité
    sessionsUtilisateur, twoFactorMethods, tentativesConnexion, jetonsAuth,
    apiTokens, apiTokenLogs, webhooksSortants, webhookDeliveries,
    demandesEffacement, exportsDonnees,
    consentementsImage, consentementsCommunication, registreTraitements,
    // SaaS éditeur (suite)
    domainesPersonnalises, themesEcole,
    featureFlags, featureFlagEcoles, quotaUsages, stripeEvents,
    // Inclusion
    plansAccompagnement,
    // Documents
    templatesDocument, documentsGeneres, signaturesElectroniques, rapportsSauvegardes,
    // Salles+
    batiments, etages, salleEquipements,
  };

  return <AppShell initialData={initialData} />;
}
