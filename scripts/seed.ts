// Seed: crée 1 super-admin éditeur, 1 école cliente avec structure académique,
// élèves, personnel, matières, évaluations, frais, paiements, présences,
// notifications, audit. Pré-configuré pour démonstration de bout en bout.

import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Début du seed...");

  // 1) Plans tarifaires SaaS
  const planEssentiel = await db.planTarifaire.create({
    data: {
      nom: "Essentiel",
      prixMensuel: 25000,
      prixAnnuel: 270000,
      dureeEssaiJours: 14,
      modulesInclus: JSON.stringify(["eleves", "personnel", "pedagogique", "presences", "finances_basic"]),
    },
  });
  const planPro = await db.planTarifaire.create({
    data: {
      nom: "Pro",
      prixMensuel: 65000,
      prixAnnuel: 700000,
      dureeEssaiJours: 30,
      modulesInclus: JSON.stringify(["eleves", "personnel", "pedagogique", "presences", "finances_full", "vie_scolaire", "rh", "services", "salles", "rdv"]),
    },
  });
  const planIllimite = await db.planTarifaire.create({
    data: {
      nom: "Illimité",
      prixMensuel: 120000,
      prixAnnuel: 1300000,
      dureeEssaiJours: 30,
      modulesInclus: JSON.stringify(["*"]),
    },
  });

  // 2) École cliente démo
  const ecole = await db.ecole.create({
    data: {
      nom: "Institut Léonard de Vinci",
      slug: "vinci",
      pays: "SN",
      devise: "XOF",
      fuseauHoraire: "Africa/Dakar",
      statut: "actif",
      planCourantId: planPro.id,
    },
  });

  // 3) Abonnement actif
  const abonnement = await db.abonnement.create({
    data: {
      ecoleId: ecole.id,
      planId: planPro.id,
      statut: "actif",
      modeFacturation: "mensuel",
      dateDebut: new Date("2026-08-01"),
    },
  });

  // 4) Facture SaaS pour l'école
  await db.factureSaas.create({
    data: {
      ecoleId: ecole.id,
      abonnementId: abonnement.id,
      periode: "2026-08",
      montant: 65000,
      devise: "XOF",
      statut: "payee",
      modePaiement: "virement",
      datePaiement: new Date("2026-08-05"),
    },
  });

  // 5) Super-admin éditeur
  await db.utilisateur.create({
    data: {
      email: "editeur@platforme.com",
      motDePasseHash: "$2a$10$dummyhashforeditor12345678901234567890",
      nom: "Éditeur",
      prenom: "Super-Admin",
      type: "super_admin",
      twofaActive: true,
      consentementPortail: true,
      consentementDate: new Date(),
    },
  });

  // 6) Rôles de l'école
  const roleDirection = await db.role.create({
    data: { ecoleId: ecole.id, code: "direction", libelle: "Direction", twofaRequis: true },
  });
  const roleEnseignant = await db.role.create({
    data: { ecoleId: ecole.id, code: "enseignant", libelle: "Enseignant" },
  });
  const roleComptable = await db.role.create({
    data: { ecoleId: ecole.id, code: "comptabilite", libelle: "Comptabilité", twofaRequis: true },
  });
  const roleSurveillant = await db.role.create({
    data: { ecoleId: ecole.id, code: "surveillant", libelle: "Surveillant" },
  });

  // 7) Utilisateur directeur
  const dirUtilisateur = await db.utilisateur.create({
    data: {
      ecoleId: ecole.id,
      email: "direction@vinci.sn",
      motDePasseHash: "$2a$10$dummyhashfordirection12345678901234",
      nom: "Diop",
      prenom: "Awa",
      type: "personnel",
      twofaActive: true,
      consentementPortail: true,
      consentementDate: new Date(),
    },
  });

  // 8) Année scolaire active
  const annee = await db.anneeScolaire.create({
    data: {
      ecoleId: ecole.id,
      libelle: "2026-2027",
      dateDebut: new Date("2026-09-01"),
      dateFin: new Date("2027-07-15"),
      active: true,
    },
  });

  // 9) Cycles
  const cMaternelle = await db.cycle.create({
    data: { ecoleId: ecole.id, code: "MAT", libelle: "Maternelle", ordre: 1, modeEvaluation: "competences" },
  });
  const cPrimaire = await db.cycle.create({
    data: { ecoleId: ecole.id, code: "PRIM", libelle: "Primaire", ordre: 2, modeEvaluation: "chiffre" },
  });
  const cCollege = await db.cycle.create({
    data: { ecoleId: ecole.id, code: "COLL", libelle: "Collège", ordre: 3, modeEvaluation: "chiffre" },
  });
  const cLycee = await db.cycle.create({
    data: { ecoleId: ecole.id, code: "LYC", libelle: "Lycée", ordre: 4, modeEvaluation: "chiffre" },
  });

  // 10) Sections + Niveaux
  const sMaternelle = await db.section.create({ data: { cycleId: cMaternelle.id, code: "MAT", libelle: "Maternelle" } });
  await db.niveau.create({ data: { sectionId: sMaternelle.id, code: "PS", libelle: "Petite Section", ordre: 1 } });
  await db.niveau.create({ data: { sectionId: sMaternelle.id, code: "MS", libelle: "Moyenne Section", ordre: 2 } });
  await db.niveau.create({ data: { sectionId: sMaternelle.id, code: "GS", libelle: "Grande Section", ordre: 3 } });

  const sPrimaire = await db.section.create({ data: { cycleId: cPrimaire.id, code: "PRIM", libelle: "Primaire" } });
  const nCP = await db.niveau.create({ data: { sectionId: sPrimaire.id, code: "CP", libelle: "Cours Préparatoire", ordre: 4 } });
  const nCE1 = await db.niveau.create({ data: { sectionId: sPrimaire.id, code: "CE1", libelle: "Cours Élémentaire 1", ordre: 5 } });
  const nCE2 = await db.niveau.create({ data: { sectionId: sPrimaire.id, code: "CE2", libelle: "Cours Élémentaire 2", ordre: 6 } });
  const nCM1 = await db.niveau.create({ data: { sectionId: sPrimaire.id, code: "CM1", libelle: "Cours Moyen 1", ordre: 7 } });
  const nCM2 = await db.niveau.create({ data: { sectionId: sPrimaire.id, code: "CM2", libelle: "Cours Moyen 2", ordre: 8 } });

  const sCollege = await db.section.create({ data: { cycleId: cCollege.id, code: "COLL", libelle: "Collège" } });
  const n6 = await db.niveau.create({ data: { sectionId: sCollege.id, code: "6E", libelle: "Sixième", ordre: 9 } });
  const n5 = await db.niveau.create({ data: { sectionId: sCollege.id, code: "5E", libelle: "Cinquième", ordre: 10 } });
  const n4 = await db.niveau.create({ data: { sectionId: sCollege.id, code: "4E", libelle: "Quatrième", ordre: 11 } });
  const n3 = await db.niveau.create({ data: { sectionId: sCollege.id, code: "3E", libelle: "Troisième", ordre: 12 } });

  const sLycee = await db.section.create({ data: { cycleId: cLycee.id, code: "LYC", libelle: "Lycée" } });
  const n2nde = await db.niveau.create({ data: { sectionId: sLycee.id, code: "2NDE", libelle: "Seconde", ordre: 13 } });
  const n1ere = await db.niveau.create({ data: { sectionId: sLycee.id, code: "1ERE", libelle: "Première", ordre: 14 } });
  const nTale = await db.niveau.create({ data: { sectionId: sLycee.id, code: "TLE", libelle: "Terminale", ordre: 15 } });

  // 11) Classes
  const classe6A = await db.classe.create({
    data: { ecoleId: ecole.id, niveauId: n6.id, anneeScolaireId: annee.id, code: "6A", libelle: "Sixième A", capaciteMax: 35 },
  });
  const classe5B = await db.classe.create({
    data: { ecoleId: ecole.id, niveauId: n5.id, anneeScolaireId: annee.id, code: "5B", libelle: "Cinquième B", capaciteMax: 35 },
  });
  const classeCM2A = await db.classe.create({
    data: { ecoleId: ecole.id, niveauId: nCM2.id, anneeScolaireId: annee.id, code: "CM2-A", libelle: "CM2 A", capaciteMax: 30 },
  });

  // 12) Périodes
  const periodeT1 = await db.periode.create({
    data: {
      ecoleId: ecole.id,
      anneeScolaireId: annee.id,
      code: "T1",
      libelle: "Trimestre 1",
      dateDebut: new Date("2026-09-01"),
      dateFin: new Date("2026-12-15"),
      typeBulletin: "college_lycee",
    },
  });
  await db.periode.create({
    data: {
      ecoleId: ecole.id,
      anneeScolaireId: annee.id,
      code: "T2",
      libelle: "Trimestre 2",
      dateDebut: new Date("2027-01-05"),
      dateFin: new Date("2027-03-30"),
      typeBulletin: "college_lycee",
    },
  });

  // 13) Personnel (enseignants) + matières
  const enseignants = [] as any[];
  const enseignantData = [
    { nom: "Fall", prenom: "Mamadou", matiere: "MATHS", libelleMatiere: "Mathématiques" },
    { nom: "Sow", prenom: "Fatou", matiere: "FR", libelleMatiere: "Français" },
    { nom: "Ndiaye", prenom: "Cheikh", matiere: "HG", libelleMatiere: "Histoire-Géographie" },
    { nom: "Ba", prenom: "Aïssatou", matiere: "PC", libelleMatiere: "Physique-Chimie" },
    { nom: "Diallo", prenom: "Ousmane", matiere: "ANG", libelleMatiere: "Anglais" },
    { nom: "Gueye", prenom: "Mariama", matiere: "EPS", libelleMatiere: "EPS" },
  ];
  for (let i = 0; i < enseignantData.length; i++) {
    const e = enseignantData[i];
    const u = await db.utilisateur.create({
      data: {
        ecoleId: ecole.id,
        email: `${e.prenom.toLowerCase()}.${e.nom.toLowerCase()}@vinci.sn`,
        motDePasseHash: "$2a$10$dummyhashforenseignant12345678901234",
        nom: e.nom,
        prenom: e.prenom,
        type: "personnel",
        consentementPortail: true,
        consentementDate: new Date(),
      },
    });
    const p = await db.personnel.create({
      data: {
        ecoleId: ecole.id,
        utilisateurId: u.id,
        matricule: `ENS-${i + 1}`,
        nom: e.nom,
        prenom: e.prenom,
        dateEmbauche: new Date("2020-09-01"),
        statut: "actif",
        typeContrat: "CDI",
        salaireBrut: 350000,
        email: u.email!,
        telephone: "+221 77 000 00 00",
        diplomePrincipal: "Master Enseignement",
      },
    });
    await db.personnelRole.create({
      data: { personnelId: p.id, roleId: roleEnseignant.id, dateDebut: new Date() },
    });
    const m = await db.matiere.create({
      data: { ecoleId: ecole.id, code: e.matiere, libelle: e.libelleMatiere, coefficient: 1.0, couleur: "#10b981" },
    });
    enseignants.push({ personnel: p, utilisateur: u, matiere: m });
  }

  // 14) Élèves
  const eleveNoms = [
    "Adepo Ade", "Bello Idriss", "Camara Aminata", "Cissé Omar", "Dieng Khadija", "Diop Pape",
    "Faye Sokhna", "Gueye Awa", "Kane Moussa", "Mbaye Astou", "Sarr Ibou", "Sylla Mariama",
  ];
  const eleves = [] as any[];
  for (let i = 0; i < eleveNoms.length; i++) {
    const [prenom, nom] = eleveNoms[i].split(" ");
    const classe = i < 5 ? classe6A : i < 9 ? classe5B : classeCM2A;
    const eleve = await db.eleve.create({
      data: {
        ecoleId: ecole.id,
        matricule: `EL-${String(i + 1).padStart(4, "0")}`,
        nom,
        prenom,
        dateNaissance: new Date(2010 - i, (i % 12), 15),
        lieuNaissance: "Dakar",
        sexe: i % 2 === 0 ? "M" : "F",
        statut: "actif",
        dateInscription: new Date("2026-09-01"),
        classeActuelleId: classe.id,
        consentementPortailEleve: i < 9,
        consentementPortailEleveDate: i < 9 ? new Date("2026-09-15") : null,
        consentementPhotoInterne: i % 3 === 0,
        consentementPhotoExterne: i % 5 === 0,
      },
    });
    eleves.push({ eleve, classe });
  }

  // 15) Parents
  for (let i = 0; i < eleveNoms.length; i++) {
    const e = eleves[i];
    const parentEmail = `parent.${e.eleve.nom.toLowerCase()}@gmail.com`;
    const u = await db.utilisateur.create({
      data: {
        ecoleId: ecole.id,
        email: parentEmail,
        motDePasseHash: "$2a$10$dummyhashforparent1234567890123456789",
        nom: e.eleve.nom,
        prenom: i % 2 === 0 ? "Papa" : "Maman",
        type: "parent",
        consentementPortail: true,
        consentementDate: new Date(),
      },
    });
    const parent = await db.parentTuteur.create({
      data: {
        ecoleId: ecole.id,
        utilisateurId: u.id,
        nom: e.eleve.nom,
        prenom: u.prenom!,
        telephone: "+221 76 000 00 00",
        email: parentEmail,
        profession: "Commerçant",
        lienAvecEleve: i % 2 === 0 ? "pere" : "mere",
      },
    });
    await db.eleveParent.create({
      data: { eleveId: e.eleve.id, parentId: parent.id, autoriteParentale: true },
    });
  }

  // 16) Évaluations + notes pour 6A
  const eval1 = await db.evaluation.create({
    data: {
      ecoleId: ecole.id,
      classeId: classe6A.id,
      matiereId: enseignants[0].matiere.id,
      enseignantId: enseignants[0].personnel.id,
      type: "devoir",
      intitule: "Devoir 1 - Nombres décimaux",
      date: new Date("2026-09-25"),
      sur: 20,
      coefficient: 1.0,
      periodeId: periodeT1.id,
      statut: "planifiee",
    },
  });
  const eval2 = await db.evaluation.create({
    data: {
      ecoleId: ecole.id,
      classeId: classe6A.id,
      matiereId: enseignants[1].matiere.id,
      enseignantId: enseignants[1].personnel.id,
      type: "composition",
      intitule: "Composition T1 - Récit",
      date: new Date("2026-10-05"),
      sur: 20,
      coefficient: 2.0,
      periodeId: periodeT1.id,
      statut: "planifiee",
    },
  });

  for (let i = 0; i < 5; i++) {
    const e = eleves[i].eleve;
    await db.note.create({
      data: {
        eleveId: e.id,
        evaluationId: eval1.id,
        valeur: 10 + Math.floor(Math.random() * 9),
        saisiParId: enseignants[0].utilisateur.id,
      },
    });
    await db.note.create({
      data: {
        eleveId: e.id,
        evaluationId: eval2.id,
        valeur: 9 + Math.floor(Math.random() * 10),
        saisiParId: enseignants[1].utilisateur.id,
      },
    });
  }

  // 17) Frais + échéances
  const fraisScolarite = await db.frais.create({
    data: {
      ecoleId: ecole.id,
      libelle: "Frais de scolarité - Trimestre 1",
      type: "scolarite",
      montant: 75000,
      devise: "XOF",
      periodicite: "trimestriel",
      anneeScolaireId: annee.id,
    },
  });
  const fraisInscription = await db.frais.create({
    data: {
      ecoleId: ecole.id,
      libelle: "Frais d'inscription",
      type: "inscription",
      montant: 25000,
      devise: "XOF",
      periodicite: "unique",
      anneeScolaireId: annee.id,
    },
  });

  for (let i = 0; i < 5; i++) {
    const e = eleves[i].eleve;
    await db.echeanceFrais.create({
      data: {
        eleveId: e.id,
        fraisId: fraisScolarite.id,
        montant: 75000,
        devise: "XOF",
        dateEcheance: new Date("2026-09-15"),
        montantPaye: i < 3 ? 75000 : i === 3 ? 40000 : 0,
        statut: i < 3 ? "payee" : i === 3 ? "partiel" : "impayee",
      },
    });
    await db.echeanceFrais.create({
      data: {
        eleveId: e.id,
        fraisId: fraisInscription.id,
        montant: 25000,
        devise: "XOF",
        dateEcheance: new Date("2026-09-10"),
        montantPaye: 25000,
        statut: "payee",
      },
    });
  }

  // 18) Paiements
  for (let i = 0; i < 3; i++) {
    const e = eleves[i];
    await db.paiement.create({
      data: {
        ecoleId: ecole.id,
        eleveId: e.eleve.id,
        montant: 100000,
        devise: "XOF",
        modePaiement: "espece",
        referenceTransaction: `REF-${i}-${Date.now()}`,
        encaisseParId: dirUtilisateur.id,
      },
    });
  }

  // 19) Dépenses
  await db.depense.create({
    data: {
      ecoleId: ecole.id,
      categorie: "Fournitures bureau",
      description: "Achat papier + cartouches imprimante",
      montant: 45000,
      devise: "XOF",
      dateDepense: new Date("2026-09-12"),
      fournisseur: "Sénégal Boutique",
      validee: true,
      valideeParId: dirUtilisateur.id,
      dateValidation: new Date(),
    },
  });

  // 20) Salles
  await db.salle.createMany({
    data: [
      { ecoleId: ecole.id, nom: "A101", type: "classe", capacite: 35, equipements: JSON.stringify(["tableau", "bancs"]) },
      { ecoleId: ecole.id, nom: "A102", type: "classe", capacite: 35, equipements: JSON.stringify(["tableau", "bancs"]) },
      { ecoleId: ecole.id, nom: "LAB-SCIENCES", type: "labo", capacite: 24, equipements: JSON.stringify(["paillasses", "microscopes", "hotte"]) },
      { ecoleId: ecole.id, nom: "SALLE-INFO", type: "informatique", capacite: 30, equipements: JSON.stringify(["ordinateurs", "videoprojecteur"]) },
      { ecoleId: ecole.id, nom: "GYMNASE", type: "sport", capacite: 60, equipements: JSON.stringify(["tapis", "barres"]) },
    ],
  });

  // 21) Calendrier scolaire
  await db.calendrierScolaire.createMany({
    data: [
      { ecoleId: ecole.id, anneeScolaireId: annee.id, type: "vacances", libelle: "Toussaint", dateDebut: new Date("2026-10-25"), dateFin: new Date("2026-11-02") },
      { ecoleId: ecole.id, anneeScolaireId: annee.id, type: "vacances", libelle: "Noël", dateDebut: new Date("2026-12-19"), dateFin: new Date("2027-01-04") },
      { ecoleId: ecole.id, anneeScolaireId: annee.id, type: "jour_ferie", libelle: "Tabaski", dateDebut: new Date("2026-08-22"), dateFin: new Date("2026-08-22") },
      { ecoleId: ecole.id, anneeScolaireId: annee.id, type: "journee_pedagogique", libelle: "Formation équipe", dateDebut: new Date("2026-09-01"), dateFin: new Date("2026-09-01") },
    ],
  });

  // 22) Examens officiels
  const examenBepc = await db.examenOfficiel.create({
    data: {
      ecoleId: ecole.id,
      nom: "BEPC 2027",
      anneeScolaireId: annee.id,
      niveauId: n3.id,
      dateDebut: new Date("2027-06-15"),
      dateFin: new Date("2027-06-22"),
    },
  });
  await db.examenOfficiel.create({
    data: {
      ecoleId: ecole.id,
      nom: "BAC 2027",
      anneeScolaireId: annee.id,
      niveauId: nTale.id,
      dateDebut: new Date("2027-07-01"),
      dateFin: new Date("2027-07-12"),
    },
  });

  // 23) Incident
  const incident = await db.incident.create({
    data: {
      eleveId: eleves[1].eleve.id,
      dateHeure: new Date("2026-09-18"),
      lieu: "Cour",
      type: "comportement",
      description: "Retards répétés en cours de mathématiques",
      gravite: "leger",
      declareParId: enseignants[0].utilisateur.id,
    },
  });
  await db.sanction.create({
    data: {
      incidentId: incident.id,
      type: "avertissement",
      description: "Avertissement oral + convocation parent",
      statut: "decidee",
      decideParId: dirUtilisateur.id,
      notifieParents: true,
      dateNotification: new Date(),
    },
  });

  // 24) Besoin spécifique + aménagement
  const besoin = await db.besoinSpecifique.create({
    data: {
      eleveId: eleves[2].eleve.id,
      type: "trouble_apprentissage",
      description: "Dyslexie diagnostiquée",
      dateDiagnostic: new Date("2025-03-10"),
      confidentiel: true,
    },
  });
  await db.amenagement.create({
    data: {
      eleveId: eleves[2].eleve.id,
      besoinSpecifiqueId: besoin.id,
      typeAmenagement: "tiers_temps",
      description: "Tiers-temps sur compositions (+30 min sur 2h)",
      dateDebut: new Date("2026-09-01"),
      valideParId: dirUtilisateur.id,
    },
  });

  // 25) Modèles de messages
  const modeleEcheance = await db.modeleMessage.create({
    data: {
      ecoleId: ecole.id,
      code: "rappel_echeance",
      sujet: "Rappel : échéance de frais à venir",
      corps: "Bonjour {{parent_prenom}}, l'échéance de {{frais_libelle}} pour {{eleve_prenom}} {{eleve_nom}} est attendue pour le {{echeance_date}}. Montant : {{echeance_montant}}.",
      canaux: JSON.stringify(["sms", "email", "in_app"]),
      langue: "fr",
    },
  });
  await db.modeleMessage.create({
    data: {
      ecoleId: ecole.id,
      code: "bulletin_publie",
      sujet: "Bulletin {{periode}} disponible",
      corps: "Le bulletin {{periode}} de {{eleve_prenom}} {{eleve_nom}} est disponible sur le portail parent.",
      canaux: JSON.stringify(["email", "in_app"]),
      langue: "fr",
    },
  });
  await db.modeleMessage.create({
    data: {
      ecoleId: ecole.id,
      code: "absence_signalee",
      sujet: "Absence signalée",
      corps: "{{eleve_prenom}} {{eleve_nom}} a été absent(e) au cours de {{matiere_libelle}} le {{seance_date}}.",
      canaux: JSON.stringify(["sms", "in_app"]),
      langue: "fr",
    },
  });

  // 26) Notifications
  await db.notification.create({
    data: {
      ecoleId: ecole.id,
      destinataireId: dirUtilisateur.id,
      destinataireType: "personnel",
      modeleMessageId: modeleEcheance.id,
      sujet: "Rappel : 2 échéances impayées à relancer",
      corps: "Les familles Diop, Sylla et Kane ont des échéances de scolarité impayées depuis le 15/09. Relance recommandée.",
      canal: "in_app",
      statut: "envoye",
      dateEnvoi: new Date(),
    },
  });
  await db.notification.create({
    data: {
      ecoleId: ecole.id,
      destinataireId: dirUtilisateur.id,
      destinataireType: "personnel",
      sujet: "Nouvelle inscription validée",
      corps: "Astou Mbaye a été inscrite en CM2-A. Inscription validée par Awa Diop.",
      canal: "in_app",
      statut: "envoye",
      dateEnvoi: new Date(),
    },
  });

  // 27) Manuels
  const manuelMaths = await db.manuelScolaire.create({
    data: {
      ecoleId: ecole.id,
      titre: "Mathématiques 6e — Collection Triangle",
      matiereId: enseignants[0].matiere.id,
      niveauId: n6.id,
      editeur: "Nathan",
      anneeEdition: 2024,
      quantiteStock: 40,
    },
  });
  for (let i = 0; i < 5; i++) {
    await db.attributionManuel.create({
      data: {
        manuelScolaireId: manuelMaths.id,
        eleveId: eleves[i].eleve.id,
        dateAttribution: new Date("2026-09-05"),
        dateRestitutionPrevue: new Date("2027-07-10"),
        etatRemise: "bon",
        statut: "en_cours",
      },
    });
  }

  // 28) Stock
  const article = await db.stockArticle.create({
    data: {
      ecoleId: ecole.id,
      nom: "Cahier 200 pages",
      categorie: "Papeterie",
      quantite: 250,
      seuilAlerte: 50,
      unite: "pièce",
      prixUnitaire: 750,
    },
  });
  await db.mouvementStock.create({
    data: { articleId: article.id, type: "entree", quantite: 300, motif: "Achat rentrée scolaire", effectueParId: dirUtilisateur.id },
  });
  await db.mouvementStock.create({
    data: { articleId: article.id, type: "sortie", quantite: 50, motif: "Distribution classes primaires", effectueParId: dirUtilisateur.id },
  });

  // 29) Transport
  const ligne = await db.transportLigne.create({
    data: { ecoleId: ecole.id, nom: "Ligne Nord — Plateau", vehicule: "Bus 12 places", chauffeurId: enseignants[5].personnel.id },
  });
  await db.transportArret.createMany({
    data: [
      { ligneId: ligne.id, nom: "Marché HLM", ordre: 1, heure: "06:45" },
      { ligneId: ligne.id, nom: "Sicap Liberté 2", ordre: 2, heure: "06:55" },
      { ligneId: ligne.id, nom: "École", ordre: 3, heure: "07:20" },
    ],
  });
  await db.transportInscription.create({
    data: {
      ecoleId: ecole.id,
      eleveId: eleves[3].eleve.id,
      classeId: eleves[3].classe.id,
      ligneId: ligne.id,
      tarif: 15000,
      actif: true,
    },
  });

  // 30) Bibliothèque
  const livre = await db.biblioLivre.create({
    data: {
      ecoleId: ecole.id,
      isbn: "978-2-221-23456-7",
      titre: "Le Petit Prince",
      auteur: "Antoine de Saint-Exupéry",
      editeur: "Gallimard",
      anneePublication: 1943,
      exemplairesTotal: 5,
      exemplairesDisponibles: 4,
      categorie: "Littérature jeunesse",
      cote: "R-PE-001",
    },
  });
  await db.biblioPret.create({
    data: {
      livreId: livre.id,
      eleveId: eleves[0].eleve.id,
      datePret: new Date("2026-09-10"),
      dateRetourPrevue: new Date("2026-09-24"),
      statut: "en_cours",
    },
  });

  // 31) Séance
  const salleA101 = await db.salle.findFirst({ where: { ecoleId: ecole.id, nom: "A101" } });
  const seance = await db.seance.create({
    data: {
      classeId: classe6A.id,
      matiereId: enseignants[0].matiere.id,
      enseignantId: enseignants[0].personnel.id,
      date: new Date("2026-09-22T08:00:00"),
      heureDebut: "08:00",
      heureFin: "10:00",
      salleId: salleA101!.id,
      contenuPrevu: "Chapitre 1 : Nombres décimaux — addition et soustraction",
      statut: "passee",
    },
  });
  for (let i = 0; i < 5; i++) {
    await db.presence.create({
      data: {
        eleveId: eleves[i].eleve.id,
        seanceId: seance.id,
        statut: i === 1 ? "absent" : "present",
        motifAbsence: i === 1 ? "Maladie (certificat fourni)" : null,
        saisiParId: enseignants[0].utilisateur.id,
      },
    });
  }

  // 32) Créneau + RDV
  const creneau = await db.creneauRdv.create({
    data: {
      personnelId: enseignants[0].personnel.id,
      date: new Date("2026-09-30T16:00:00"),
      heureDebut: "16:00",
      heureFin: "16:15",
      statut: "reserve",
      lieu: "presentiel",
    },
  });
  const parent0 = await db.parentTuteur.findFirst({
    where: { eleves: { some: { eleveId: eleves[0].eleve.id } } },
  });
  if (parent0) {
    await db.rdv.create({
      data: {
        creneauRdvId: creneau.id,
        parentId: parent0.id,
        eleveId: eleves[0].eleve.id,
        motif: "Bilan mi-trimestre — progrès en maths",
        statut: "confirme",
      },
    });
  }

  // 33) Visiteurs
  await db.visiteur.create({
    data: {
      ecoleId: ecole.id,
      nom: "Inspecteur Régional DIOP",
      motifVisite: "Inspection pédagogique - Maths",
      pieceIdentiteVerifiee: true,
      badgeNumero: "V-0042",
    },
  });

  // 34) Autorisation de sortie
  await db.autorisationSortie.create({
    data: {
      eleveId: eleves[0].eleve.id,
      nomPersonneAutorisee: "Maman Diop",
      lienAvecEleve: "mere",
      telephone: "+221 76 000 00 00",
      active: true,
      valideeParId: dirUtilisateur.id,
    },
  });

  // 35) Audit logs
  await db.auditLog.createMany({
    data: [
      { ecoleId: ecole.id, utilisateurId: dirUtilisateur.id, action: "paiement.encaissement", cibleType: "paiement", details: JSON.stringify({ montant: 100000, eleveId: eleves[0].eleve.id }), dateAction: new Date() },
      { ecoleId: ecole.id, utilisateurId: enseignants[0].utilisateur.id, action: "note.saisie", cibleType: "evaluation", details: JSON.stringify({ evaluationId: eval1.id, classeId: classe6A.id }), dateAction: new Date() },
      { ecoleId: ecole.id, utilisateurId: dirUtilisateur.id, action: "eleve.inscription", cibleType: "eleve", details: JSON.stringify({ eleveId: eleves[4].eleve.id, classeId: classe6A.id }), dateAction: new Date() },
      { ecoleId: ecole.id, utilisateurId: dirUtilisateur.id, action: "support.connexion_en_tant_que", cibleType: "ecole", details: JSON.stringify({ motif: "Vérification paramètres" }), dateAction: new Date() },
    ],
  });

  // 36) Compétences pour cycle maternelle
  await db.competence.create({
    data: { ecoleId: ecole.id, cycleId: cMaternelle.id, libelle: "Distinguer les lettres de l'alphabet", ordre: 1 },
  });
  await db.competence.create({
    data: { ecoleId: ecole.id, cycleId: cMaternelle.id, libelle: "Compter jusqu'à 20", ordre: 2 },
  });

  console.log("✅ Seed terminé !");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
