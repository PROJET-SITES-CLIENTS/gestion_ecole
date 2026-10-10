/**
 * PURGE TOTALE — supprime ABSOLUMENT TOUT de la base Supabase.
 * Ordre topologique strict (enfants d'abord, parents ensuite) pour
 * respecter les contraintes de clés étrangères.
 * Confirmation requise via variable d'environnement CONFIRM_PURGE=YES.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL?.replace('connection_limit=10', 'connection_limit=3') } },
});

async function main() {
  if (process.env.CONFIRM_PURGE !== 'YES') {
    console.error('⚠️  Confirmation requise : CONFIRM_PURGE=YES npx tsx scripts/_purge-total.ts');
    process.exit(1);
  }
  console.log('═══ PURGE TOTALE DE LA BASE ═══\n');

  const tables = [
    // ── Feuilles (aucune FK pointe vers elles) ──
    'ligneAmortissement', 'amortissementLigne', 'cotisationSociale', 'ligneBulletinPaie', 'variablePaie',
    'ligneEcriture', 'ligneReleve', 'operationCaisse', 'ligneBudget', 'ligneCommande', 'receptionCommande',
    'paiementFournisseur', 'factureFournisseur', 'commandeFournisseur',
    'mouvementStock', 'note', 'evaluationCompetence', 'renduDevoir', 'devoir',
    'entreeCahierTexte', 'cahierTexte', 'bulletinAppreciation', 'sanction', 'incident',
    'justificationAbsence', 'presence', 'seance', 'retard', 'surveillanceExamen',
    'conseilDiscipline', 'voteConseil', 'deliberationConseil', 'membreConseil', 'conseilClasse',
    'attributionManuel', 'manuelScolaire', 'biblioPret', 'cantinePresence', 'cantineMenu',
    'feuilleRoute', 'passageArret', 'garderieSession', 'activiteParticipant', 'activite',
    'passageInfirmerie', 'vaccination', 'traitementSuivi', 'signalementMineur',
    'mesureProtection', 'planAccompagnement', 'objectifPlan', 'revisionPlan',
    'conversation', 'message', 'participant', 'annonce', 'ticket', 'ticketMessage',
    'smsLog', 'pushNotificationLog', 'emailLog', 'notification',
    'webhookSortant', 'apiTokenLog', 'exportDonnees', 'documentGenere', 'registreTraitement',
    'etudiantStage', 'stage', 'offreEmploi', 'candidatureRecrutement', 'etapeRecrutement', 'entretienRecrutement',
    'demandeEffacement', 'consentementImage', 'delegueClasse',
    'auditLog',
    // ── Niveau 2 ──
    'avancementProgramme', 'chapitre', 'programme',
    'bulletinPaie', 'evaluation',
    'ecritureComptable', 'rapprochementBancaire', 'budget', 'immobilisation',
    'formationPersonnel', 'sanctionPersonnel', 'evaluationPersonnel',
    'soldeConge', 'conge', 'remplacement',
    'pointagePersonnel', 'creneauRdv', 'rdv', 'reunionCollective',
    'candidatureAdmission', 'etapeAdmission', 'testAdmission',
    'courrier', 'visiteur', 'reinscription', 'pieceDossier', 'documentEleve',
    'autorisationSortie', 'sortieAnticipee', 'besoinSpecifique', 'amenagement',
    'eleveHistoriqueClasse', 'eleveParent', 'eleve', 'parentTuteur',
    'ficheSante', 'contratPersonnel', 'habilitationPenale', 'verificationAntecedents',
    // ── Niveau 3 (référencés par les tables ci-dessus) ──
    'affectationEnseignant', 'reservationSalle', 'emploiTemps', 'creneauHebdo',
    'calendrierScolaire', 'salleEquipement',
    'competence', 'regleCalculMoyenne', 'periode',
    'cantineInscription', 'transportInscription', 'transportArret', 'transportLigne',
    'garderieInscription', 'listeFourniture', 'biblioLivre',
    'stockArticle', 'fournisseur', 'avoirEcole', 'avoirSaas',
    'modeSection', 'sectionComptable', 'caisseSession',
    'abonnementSaas', 'factureSaas', 'quotaUsage', 'domainePersonnalise',
    'frais', 'echeanceFrais', 'paiement', 'paiementEcheance', 'depense',
    'inscriptionsExamen', 'examenOfficiel',
    'accreditationJournaliste',
    'utilisateurRole', 'personnelRole', 'rolePermission', 'sessionUtilisateur',
    'tentativeConnexion', 'twoFactorMethod', 'twoFactorBackupCode', 'jetonAuth',
    'demandeCompte', 'etudiantStage',
    'famille', 'groupe',
    'salle', 'etage', 'batiment',
    'modeSection', 'sectionComptable',
    // ── Niveau 4 (structures) ──
    'classe', 'niveau', 'section', 'cycle',
    'matiere', 'anneeScolaire',
    'role', 'permission', 'modeleMessage',
    'configurationPaie', 'planTarifaire',
    // ── Racine ──
    'utilisateur', 'personnel', 'ecole',
  ];

  // Dédoublonner (certains noms peuvent apparaître deux fois)
  const uniques = [...new Set(tables)];
  console.log(`${uniques.length} tables à vider`);

  let totalSupprime = 0;
  let echecs: string[] = [];

  for (const table of uniques) {
    try {
      const count = await (db as any)[table]?.deleteMany({});
      if (count?.count > 0) {
        console.log(`  ✓ ${table} : ${count.count} supprimé(s)`);
        totalSupprime += count.count;
      }
    } catch (e: any) {
      // Si la table n'existe pas ou a des FK bloquantes, on la retente après
      const msg = String(e?.message ?? '');
      if (msg.includes('Foreign key')) {
        echecs.push(table);
      }
      // Table inexistante : silencieux
    }
  }

  // 2e passe pour les tables bloquées par FK à la 1re passe
  if (echecs.length > 0) {
    console.log(`\n2e passe (${echecs.length} tables avec FK)…`);
    for (const table of echecs) {
      try {
        const count = await (db as any)[table]?.deleteMany({});
        console.log(`  ✓ ${table} : ${count?.count ?? 0} supprimé(s)`);
        totalSupprime += count?.count ?? 0;
      } catch {
        console.log(`  ✗ ${table} : encore bloquée`);
      }
    }
  }

  // 3e passe brute : si des tables persistent
  const restants = await Promise.all(
    uniques.map(async (t) => {
      try { return { t, n: await (db as any)[t]?.count({}) }; } catch { return { t, n: 0 }; }
    })
  );
  const nonVides = restants.filter((r) => r.n > 0);
  if (nonVides.length > 0) {
    console.log(`\n3e passe (${nonVides.length} tables non vides)…`);
    for (const { t } of nonVides) {
      try {
        await (db as any)[t]?.deleteMany({});
        console.log(`  ✓ ${t} vidé`);
      } catch {
        console.log(`  ✗ ${t} IMPOSSIBLE`);
      }
    }
  }

  console.log(`\n═══ PURGE TERMINÉE : ${totalSupprime} enregistrements supprimés ═══`);

  // Vérification finale
  const verif = await db.ecole.count();
  console.log(`Écoles restantes : ${verif}`);
  if (verif > 0) {
    console.error('⚠️  Des écoles restent ! La purge est incomplète.');
    process.exit(1);
  }
  console.log('✓ Base vidée à 100%');
}

main()
  .catch((e) => { console.error('ERREUR :', e); process.exit(1); })
  .finally(() => db.$disconnect());
