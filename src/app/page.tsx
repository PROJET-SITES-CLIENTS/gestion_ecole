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

  // Direction (le 1er personnel de l'école)
  const dirUtilisateur = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id, type: 'personnel' } });
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
    db.salle.findMany({ where: { ecoleId: ecole.id } }),
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

    // Élèves
    eleves,
    parents,
    besoinsSpecifiques,
    amenagements,
    documents: [] as any[],

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
  };

  return <AppShell initialData={initialData} />;
}
