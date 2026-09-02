// Seed: crée 1 super-admin éditeur, 1 école cliente avec structure académique,
// élèves, personnel, matières, évaluations, frais, paiements, présences,
// notifications, audit. Pré-configuré pour démonstration de bout en bout.

import { db } from "../src/lib/db";
import { Prisma } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

// Mot de passe de démonstration unique — haché en scrypt (P0 auth réelle)
const MOT_DE_PASSE_DEMO = "Demo1234!";
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const N = 16384, r = 8, p = 1;
  const hash = scryptSync(password, salt, 64, { N, r, p }).toString("hex");
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

// Nettoyage idempotent : supprime toutes les lignes de toutes les tables,
// dans l'ordre topologique (tables porteuses de FK supprimées en premier),
// pour pouvoir ré-exécuter le seed sans erreur de contrainte unique.
async function wipeAll() {
  // Désactive les FK au cas où la connexion le permette (SQLite par connexion)
  try {
    await db.$executeRawUnsafe("PRAGMA foreign_keys = OFF;");
  } catch { /* non bloquant : l'ordre topologique suffit */ }

  const models = Prisma.dmmf.datamodel.models;
  const names = new Set(models.map((m) => m.name));
  // Graphe : modèle -> modèles référencés (lorsqu'il porte la FK)
  const deps = new Map<string, Set<string>>();
  for (const m of models) {
    deps.set(m.name, new Set());
    for (const f of m.fields as any[]) {
      if (f.kind === "object" && Array.isArray(f.relationFromFields) && f.relationFromFields.length > 0) {
        if (names.has(f.type)) deps.get(m.name)!.add(f.type);
      }
    }
  }

  // Tri topologique (algorithme de Kahn itératif)
  const done = new Set<string>();
  const remaining = [...names];
  let progress = true;
  while (remaining.length > 0 && progress) {
    progress = false;
    for (let i = 0; i < remaining.length; i++) {
      const name = remaining[i];
      const pending = [...deps.get(name)!].filter((d) => !done.has(d));
      if (pending.length === 0) {
        const key = name.charAt(0).toLowerCase() + name.slice(1);
        const delegate = (db as any)[key];
        if (delegate && typeof delegate.deleteMany === "function") {
          await delegate.deleteMany({});
        }
        done.add(name);
        remaining.splice(i, 1);
        i--;
        progress = true;
      }
    }
  }

  // Filet de sécurité pour les cycles résiduels (self-relations, etc.)
  for (const name of remaining) {
    const key = name.charAt(0).toLowerCase() + name.slice(1);
    const delegate = (db as any)[key];
    if (delegate && typeof delegate.deleteMany === "function") {
      try {
        await delegate.deleteMany({});
      } catch { /* cycle protégé par le PRAGMA OFF si actif */ }
    }
  }

  // Tables de jointure implicites many-to-many : absentes du DMMF, il faut
  // les vider en SQL brut, sinon leurs lignes deviennent orphelines à chaque
  // re-seed (violation PRAGMA foreign_key_check).
  const implicitJoinTables = ["_EcoleToPermission"];
  for (const t of implicitJoinTables) {
    try {
      await db.$executeRawUnsafe(`DELETE FROM "${t}";`);
    } catch { /* table absente : schéma sans cette relation */ }
  }

  try {
    await db.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
  } catch { /* non bloquant */ }
}

async function main() {
  console.log("🌱 Début du seed...");
  console.log("🧹 Nettoyage de la base (idempotence)...");
  await wipeAll();

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
      motDePasseHash: hashPassword(MOT_DE_PASSE_DEMO),
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
      motDePasseHash: hashPassword(MOT_DE_PASSE_DEMO),
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
        motDePasseHash: hashPassword(MOT_DE_PASSE_DEMO),
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
        motDePasseHash: hashPassword(MOT_DE_PASSE_DEMO),
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


  // 15bis) Compte élève (portail élève réel — P2)
  const eleveCompte = await db.utilisateur.create({
    data: {
      ecoleId: ecole.id,
      email: "eleve.diop@vinci.sn",
      motDePasseHash: hashPassword(MOT_DE_PASSE_DEMO),
      nom: eleves[5].eleve.nom,
      prenom: eleves[5].eleve.prenom,
      type: "eleve",
      consentementPortail: true,
      consentementDate: new Date(),
    },
  });
  await db.eleve.update({ where: { id: eleves[5].eleve.id }, data: { utilisateurId: eleveCompte.id } });

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

  // ==================================================================
  // EXTENSION V4 — 37 FAILLES (seed données pour chaque nouveau module)
  // ==================================================================

  // POINT 1 — Tickets Support SaaS
  const ticket1 = await db.ticket.create({
    data: {
      ecoleId: ecole.id,
      sujet: "Bulletins PDF — erreur de génération pour 6A",
      description: "Génération des bulletins T1 échoue sur la classe 6A (erreur 500).",
      categorie: "technique",
      priorite: "haute",
      statut: "en_cours",
      slaContractuelHeures: 24,
      slaEcheance: new Date(Date.now() + 24 * 3600 * 1000),
      creeParId: dirUtilisateur.id,
      assigneAId: "support-editeur-1",
    },
  });
  await db.ticketMessage.create({
    data: { ticketId: ticket1.id, auteurRole: "direction_ecole", message: "Bonjour, impossible de publier les bulletins depuis ce matin.", dateEnvoi: new Date() },
  });
  await db.ticketMessage.create({
    data: { ticketId: ticket1.id, auteurRole: "support_editeur", message: "Nous investiguons. Logs indiquent un timeout sur l'API PDF. Intervenant dans 2h.", dateEnvoi: new Date(Date.now() + 3600000) },
  });
  await db.ticketStatutHistorique.create({
    data: { ticketId: ticket1.id, ancienStatut: "ouvert", nouveauStatut: "en_cours", modifieParId: "support-editeur-1" },
  });

  // POINT 2 — Signalements protection mineurs
  const partenaireCrip = await db.partenaireExterne.create({
    data: { type: "crip", nom: "Cellule de Recueil des Informations Préoccupantes", contact: "+221 33 800 00 00", email: "crip@sn.social.gouv" },
  });
  const signalement1 = await db.signalementMineur.create({
    data: {
      ecoleId: ecole.id,
      eleveId: eleves[1].eleve.id,
      type: "harcelement",
      description: "Harcèlement verbal entre pairs observé en récréation. Trois témoins.",
      gravite: "preoccupant",
      source: "enseignant",
      dateFaits: new Date("2026-08-20"),
      lieuFaits: "Cour de récréation",
      declareParId: enseignants[0].utilisateur.id,
      statut: "en_cours",
      confidentialiteNiveau: "restreint",
      partenairesExternesIds: JSON.stringify([partenaireCrip.id]),
    },
  });
  await db.mesureProtection.create({
    data: { signalementId: signalement1.id, type: "accompagnement_psychologique", description: "Mise en place d'un suivi psychologue scolaire hebdomadaire.", decideePar: "Direction", dateDecision: new Date(), statut: "planifiee" },
  });
  await db.suiviSignalement.create({
    data: { signalementId: signalement1.id, note: "Entretien réalisé avec l'élève. Comportement coopératif. Suivi à poursuivre.", auteurId: dirUtilisateur.id },
  });

  // POINT 3 — Habilitation pénale / vérification antécédents
  await db.verificationAntecedents.create({
    data: { ecoleId: ecole.id, personnelId: enseignants[0].personnel.id, type: "casier_judiciaire", statut: "obtenue", dateDemande: new Date("2026-07-15"), dateObtention: new Date("2026-07-25"), dateExpiration: new Date("2027-07-25"), valideParId: dirUtilisateur.id },
  });
  await db.habilitationPenale.create({
    data: { ecoleId: ecole.id, personnelId: enseignants[0].personnel.id, numeroHabilitation: "HAB-2026-0421", dateDelivrance: new Date("2026-08-01"), dateExpiration: new Date("2027-08-01"), autoriteEmettrice: "Tribunal de Dakar", statut: "validee" },
  });

  // POINT 4 — Bulletins de paie
  const bulletinPaie1 = await db.bulletinPaie.create({
    data: {
      ecoleId: ecole.id,
      personnelId: enseignants[0].personnel.id,
      periode: "2026-08",
      salaireBrut: 280000,
      salaireNet: 210000,
      cotisationsTotales: 70000,
      retenuesTotales: 0,
      primesTotales: 25000,
      netAPayer: 235000,
      devise: "XOF",
      statut: "valide",
      dateValidation: new Date(),
      valideParId: dirUtilisateur.id,
    },
  });
  await db.ligneBulletinPaie.createMany({
    data: [
      { bulletinId: bulletinPaie1.id, type: "salaire_base", libelle: "Salaire de base (35h)", montant: 250000, sens: "plus" },
      { bulletinId: bulletinPaie1.id, type: "prime", libelle: "Prime d'ancienneté", montant: 15000, sens: "plus" },
      { bulletinId: bulletinPaie1.id, type: "indemnite", libelle: "Indemnité de transport", montant: 10000, sens: "plus" },
      { bulletinId: bulletinPaie1.id, type: "heures_sup", libelle: "Heures supplémentaires (4h à 125%)", montant: 5000, sens: "plus", quantite: 4, taux: 1250 },
    ],
  });
  await db.cotisationSociale.create({
    data: { bulletinId: bulletinPaie1.id, libelle: "IPM ( retraite)", assiette: 280000, tauxEmployeur: 0.084, tauxSalarie: 0.0524, partEmployeur: 23520, partSalarie: 14672 },
  });
  await db.variablePaie.create({
    data: { ecoleId: ecole.id, personnelId: enseignants[0].personnel.id, periode: "2026-08", type: "prime", libelle: "Prime de rendement", montant: 10000, attribueParId: dirUtilisateur.id },
  });

  // POINT 5 — Recrutement
  const offreMaths = await db.offreEmploi.create({
    data: { ecoleId: ecole.id, poste: "Enseignant Mathématiques (collège-lycée)", description: "Poste à temps plein en mathématiques pour les classes 5e à Terminale.", profilRecherche: "Master Mathématiques + CAPES/AGREG. 3 ans d'expérience.", typeContrat: "CDI", dateOuverture: new Date("2026-08-01"), dateCloture: new Date("2026-09-30"), statut: "ouverte", lieu: "Dakar" },
  });
  const candidat1 = await db.candidature.create({
    data: { offreId: offreMaths.id, nom: "Ba", prenom: "Awa", email: "awa.ba@example.com", telephone: "+221 77 000 11 22", source: "offre", statut: "entretien", etapeActuelle: "entretien_direction" },
  });
  await db.etapeRecrutement.createMany({
    data: [
      { candidatureId: candidat1.id, etape: "tri_cv", statut: "valide", date: new Date("2026-08-10") },
      { candidatureId: candidat1.id, etape: "entretien_rh", statut: "valide", date: new Date("2026-08-15") },
    ],
  });
  await db.entretienRecrutement.create({
    data: { candidatureId: candidat1.id, date: new Date("2026-08-25T10:00:00"), lieu: "Salle de conférence", type: "physique", compteRendu: "Bon profil, maîtrise pédagogique solide. À confirmer par la direction.", note: 4, statut: "realise" },
  });

  // POINT 6 — Stages & conventions
  const stage1 = await db.stage.create({
    data: { ecoleId: ecole.id, eleveId: eleves[3].eleve.id, entreprise: "Sonatel S.A.", poste: "Stage informatique - infrastructures", dateDebut: new Date("2026-09-01"), dateFin: new Date("2026-09-30"), tuteurEntreprise: "M. Ndiaye (DSI)", encadrantEcoleId: enseignants[0].personnel.id, objectifs: "Découverte du système d'information d'une grande entreprise. Participation au déploiement d'un serveur.", statut: "planifie" },
  });
  await db.conventionStage.create({
    data: { stageId: stage1.id, numeroConvention: "CONV-2026-001", dateSignature: new Date("2026-08-22"), signeParEleve: true, signeParEcole: true, signeParEntreprise: true, statut: "signe" },
  });

  // POINT 7 — Soldes de congés payés
  await db.soldeConge.create({
    data: { ecoleId: ecole.id, personnelId: enseignants[0].personnel.id, annee: "2026", droitsAcquis: 25, joursPris: 5, joursRestants: 20, reliquatAnterieur: 3 },
  });

  // POINT 8 — Admissions / pré-inscriptions
  const candidatureAdm1 = await db.candidatureAdmission.create({
    data: {
      ecoleId: ecole.id,
      niveauId: n6.id,
      nom: "Sow",
      prenom: "Moussa",
      dateNaissance: new Date("2015-03-12"),
      lieuNaissance: "Dakar",
      sexe: "M",
      email: "famille.sow@example.com",
      telephone: "+221 78 333 44 55",
      parentNom: "Sow (père)",
      parentTelephone: "+221 78 333 44 55",
      statut: "test",
      parcoursAnterieur: "CM2 - École publique Pikine",
      etablissementOrigine: "École élélémentaire Pikine Nord",
      dossierComplet: true,
    },
  });
  await db.etapeAdmission.createMany({
    data: [
      { candidatureId: candidatureAdm1.id, etape: "depot_dossier", statut: "valide", date: new Date("2026-08-01") },
      { candidatureId: candidatureAdm1.id, etape: "test_admission", statut: "en_attente", date: new Date("2026-08-25") },
    ],
  });
  await db.testAdmission.create({
    data: { candidatureId: candidatureAdm1.id, matiere: "Mathématiques", date: new Date("2026-08-25T09:00:00"), note: 16.5, sur: 20, appreciation: "Bon niveau logique et arithmétique.", evalueParId: enseignants[0].utilisateur.id },
  });

  // POINT 9 — Emploi du temps récurrent
  const edt1 = await db.emploiTemps.create({
    data: {
      ecoleId: ecole.id,
      classeId: classe6A.id,
      enseignantId: enseignants[0].personnel.id,
      matiereId: enseignants[0].matiere.id,
      salleId: (await db.salle.findFirst({ where: { ecoleId: ecole.id } }))?.id,
      jour: "lundi",
      heureDebut: "08:00",
      heureFin: "10:00",
      recurrenceRule: "FREQ=WEEKLY;UNTIL=20270630;BYDAY=MO",
      dateDebut: new Date("2026-09-01"),
      dateFin: new Date("2027-06-30"),
      statut: "actif",
      creeParId: dirUtilisateur.id,
    },
  });
  await db.creneauHebdo.createMany({
    data: [
      { emploiTempsId: edt1.id, jourSemaine: 1, heureDebut: "08:00", heureFin: "10:00", type: "cours" },
      { emploiTempsId: edt1.id, jourSemaine: 3, heureDebut: "10:00", heureFin: "12:00", type: "cours" },
      { emploiTempsId: edt1.id, jourSemaine: 5, heureDebut: "08:00", heureFin: "10:00", type: "cours" },
    ],
  });

  // POINT 10 — Devoirs + rendus
  const devoir1 = await db.devoir.create({
    data: { ecoleId: ecole.id, classeId: classe6A.id, matiereId: enseignants[0].matiere.id, enseignantId: enseignants[0].personnel.id, intitule: "Devoir maison n°1 — Fractions", description: "Exercices 1 à 5 page 23.", dateAssignation: new Date("2026-08-15"), dateRendu: new Date("2026-08-22"), sur: 20, coefficient: 1, type: "dm", statut: "corrige" },
  });
  await db.renduDevoir.create({
    data: { devoirId: devoir1.id, eleveId: eleves[0].eleve.id, contenuUrl: "/uploads/dm1-diop.pdf", note: 17, appreciation: "Très bon travail. Attention à la fraction irréductible ex.3.", corrigeParId: enseignants[0].personnel.id, dateCorrection: new Date("2026-08-24"), statut: "corrige" },
  });

  // POINT 11 — Cahier de textes
  const cahier1 = await db.cahierTexte.create({
    data: { ecoleId: ecole.id, classeId: classe6A.id, matiereId: enseignants[0].matiere.id, enseignantId: enseignants[0].personnel.id, periodeId: periodeT1.id, statut: "actif" },
  });
  await db.entreeCahierTexte.create({
    data: { cahierTexteId: cahier1.id, dateCours: new Date("2026-08-15"), contenu: "Chapitre 1 : Nombres décimaux — cours magistral + exercices d'application.", travailAFaire: "DM n°1 page 23 ex. 1-5.", statut: "publie", valideParId: dirUtilisateur.id, dateValidation: new Date("2026-08-15") },
  });

  // POINT 12 — Conseil de classe + délibérations
  const conseil1 = await db.conseilClasse.create({
    data: { ecoleId: ecole.id, classeId: classe6A.id, periodeId: periodeT1.id, date: new Date("2026-10-15T17:00:00"), salle: "Salle de conférence", statut: "planifie", presidentId: dirUtilisateur.id, compteRendu: "Conseil de classe T1 — 25 élèves, 0 redoublement, 3 félicitations." },
  });
  const membre1 = await db.membreConseil.create({ data: { conseilId: conseil1.id, utilisateurId: dirUtilisateur.id, role: "president", present: true } });
  await db.membreConseil.create({ data: { conseilId: conseil1.id, utilisateurId: enseignants[0].utilisateur.id, role: "enseignant", present: true } });
  const delib1 = await db.deliberationConseil.create({
    data: { conseilId: conseil1.id, eleveId: eleves[0].eleve.id, decision: "passage", mention: "felicitations", appreciationGenerale: "Excellent trimestre, travail rigoureux.", objectifSuivant: "Maintenir le rythme en T2." },
  });
  await db.voteConseil.create({ data: { deliberationId: delib1.id, membreId: membre1.id, vote: "pour" } });

  // POINT 13 — Dispenses
  await db.dispense.create({
    data: { ecoleId: ecole.id, eleveId: eleves[2].eleve.id, matiereId: enseignants[1]?.matiere?.id ?? enseignants[0].matiere.id, motif: "medical", description: "Asthme sévère — dispense d'EPS pour 4 semaines.", dateDebut: new Date("2026-08-15"), dateFin: new Date("2026-09-15"), justificatifUrl: "/uploads/certif-medical-eps.pdf", statut: "validee", valideParId: dirUtilisateur.id, dateValidation: new Date() },
  });

  // POINT 14 — Justification d'absence
  await db.justificationAbsence.create({
    data: { ecoleId: ecole.id, eleveId: eleves[1].eleve.id, dateAbsence: new Date("2026-08-20"), dureeHeures: 4, motif: "maladie", description: "Fièvre — certificat médical fourni.", justificatifUrl: "/uploads/certif-medical-absence.pdf", statut: "valide", soumisParId: dirUtilisateur.id, valideParId: dirUtilisateur.id, dateValidation: new Date(), commentaireValidation: "Justificatif accepté." },
  });

  // POINT 15 — Budgets
  const budget2026 = await db.budget.create({
    data: { ecoleId: ecole.id, anneeScolaireId: annee.id, libelle: "Budget prévisionnel 2026-2027", dateDebut: new Date("2026-09-01"), dateFin: new Date("2027-08-31"), statut: "valide", valideParId: dirUtilisateur.id, dateValidation: new Date() },
  });
  await db.ligneBudget.createMany({
    data: [
      { budgetId: budget2026.id, categorie: "recettes", sousCategorie: "frais_scolarite", libelle: "Frais de scolarité", montantPrevu: 5000000, montantRealise: 1500000, devise: "XOF" },
      { budgetId: budget2026.id, categorie: "recettes", sousCategorie: "subventions", libelle: "Subvention État", montantPrevu: 800000, montantRealise: 400000, devise: "XOF" },
      { budgetId: budget2026.id, categorie: "depenses", sousCategorie: "salaries", libelle: "Salaires & charges", montantPrevu: 3500000, montantRealise: 875000, devise: "XOF" },
      { budgetId: budget2026.id, categorie: "depenses", sousCategorie: "fonctionnement", libelle: "Fonctionnement (eau/électricité/fournitures)", montantPrevu: 600000, montantRealise: 150000, devise: "XOF" },
      { budgetId: budget2026.id, categorie: "depenses", sousCategorie: "equipement", libelle: "Équipements informatiques", montantPrevu: 1200000, montantRealise: 0, devise: "XOF" },
    ],
  });

  // POINT 16 — Comptabilité générale
  const compteBanque = await db.compteComptable.create({ data: { ecoleId: ecole.id, numero: "512", libelle: "Banque", type: "actif", solde: 2500000, devise: "XOF" } });
  const compteFournisseurs = await db.compteComptable.create({ data: { ecoleId: ecole.id, numero: "401", libelle: "Fournisseurs", type: "passif", solde: 350000, devise: "XOF" } });
  const compteClients = await db.compteComptable.create({ data: { ecoleId: ecole.id, numero: "411", libelle: "Clients (parents)", type: "actif", solde: 850000, devise: "XOF" } });
  const compteAchats = await db.compteComptable.create({ data: { ecoleId: ecole.id, numero: "607", libelle: "Achats de marchandises", type: "charge", solde: 420000, devise: "XOF" } });
  const journalACH = await db.journalComptable.create({ data: { ecoleId: ecole.id, code: "ACH", libelle: "Journal des achats", type: "achat" } });
  const ecriture1 = await db.ecritureComptable.create({
    data: { ecoleId: ecole.id, journalId: journalACH.id, date: new Date("2026-08-05"), numeroPiece: "ACH-2026-001", libelle: "Achat fournitures bureau", statut: "valide", valideParId: dirUtilisateur.id, dateValidation: new Date("2026-08-05") },
  });
  await db.ligneEcriture.createMany({
    data: [
      { ecritureId: ecriture1.id, compteId: compteAchats.id, libelle: "Fournitures bureau", debit: 150000, credit: 0 },
      { ecritureId: ecriture1.id, compteId: compteBanque.id, libelle: "Règlement par virement", debit: 0, credit: 150000 },
    ],
  });

  // POINT 17 — Fournisseurs & commandes
  const fournisseur1 = await db.fournisseur.create({
    data: { ecoleId: ecole.id, nom: "ScolairePro SARL", type: "fournisseur_prestataire", contact: "M. Fall", email: "contact@scolairepro.sn", telephone: "+221 33 860 00 00", adresse: "Médina, Dakar", rib: "SN12 010 010 010123456789 00", siret: "SN123456789", statut: "actif" },
  });
  const commande1 = await db.commandeFournisseur.create({
    data: { ecoleId: ecole.id, fournisseurId: fournisseur1.id, numero: "CMD-2026-001", dateCommande: new Date("2026-08-01"), dateLivraisonPrevue: new Date("2026-08-15"), montantTotal: 240000, devise: "XOF", statut: "recue_partielle", valideeParId: dirUtilisateur.id },
  });
  await db.ligneCommande.createMany({
    data: [
      { commandeId: commande1.id, designation: "Cahiers 200 pages (x100)", quantite: 100, unite: "unite", prixUnitaire: 800, montantLigne: 80000, recu: true },
      { commandeId: commande1.id, designation: "Stylos bille bleus (x500)", quantite: 500, unite: "unite", prixUnitaire: 100, montantLigne: 50000, recu: true },
      { commandeId: commande1.id, designation: "Calculatrices scientifiques (x20)", quantite: 20, unite: "unite", prixUnitaire: 5500, montantLigne: 110000, recu: false },
    ],
  });
  await db.receptionCommande.create({ data: { commandeId: commande1.id, dateReception: new Date("2026-08-12"), quantiteRecue: 130, bonLivraisonUrl: "/uploads/bl-001.pdf", controleQualite: true, commentaire: "Cahiers et stylos reçus conformes.", receptionneParId: dirUtilisateur.id } });

  // POINT 18 — Factures & paiements fournisseurs
  const factureFourn1 = await db.factureFournisseur.create({
    data: { ecoleId: ecole.id, fournisseurId: fournisseur1.id, numero: "FAC-F1-2026-008", dateEmission: new Date("2026-08-13"), dateReception: new Date("2026-08-14"), dateEcheance: new Date("2026-09-14"), montantHT: 222000, montantTVA: 18000, montantTTC: 240000, devise: "XOF", statut: "payee", controleeParId: dirUtilisateur.id, dateControle: new Date("2026-08-15"), commandeId: commande1.id },
  });
  await db.paiementFournisseur.create({ data: { ecoleId: ecole.id, factureId: factureFourn1.id, datePaiement: new Date("2026-08-20"), montant: 240000, devise: "XOF", mode: "virement", reference: "VIR-2026-042", payeParId: dirUtilisateur.id } });

  // POINT 19 — Avoirs école
  await db.avoirEcole.create({
    data: { ecoleId: ecole.id, numero: "AV-2026-001", dateEmission: new Date("2026-08-25"), montant: 15000, devise: "XOF", motif: "Cahiers défectueux (4 unités)", factureFournisseurId: factureFourn1.id, statut: "emis", emisParId: dirUtilisateur.id },
  });

  // POINT 20 — Messagerie interne
  const conv1 = await db.conversation.create({ data: { ecoleId: ecole.id, titre: "Direction ↔ Vie scolaire", type: "direct", creeParId: dirUtilisateur.id, dateCreation: new Date(), dernierMessageAt: new Date() } });
  await db.conversationParticipant.createMany({ data: [
    { conversationId: conv1.id, utilisateurId: dirUtilisateur.id, role: "admin", dateAjout: new Date() },
    { conversationId: conv1.id, utilisateurId: enseignants[0].utilisateur.id, role: "membre", dateAjout: new Date() },
  ] });
  const msg1 = await db.message.create({ data: { conversationId: conv1.id, expediteurId: dirUtilisateur.id, contenu: "Bonjour, merci de préparer le conseil de classe T1 pour le 15/10.", dateEnvoi: new Date() } });
  await db.pieceJointe.create({ data: { messageId: msg1.id, nomFichier: "ordre_du_jour.pdf", url: "/uploads/odj.pdf", taille: 124000, mimeType: "application/pdf" } });

  // POINT 21 — Annonces
  const annonce1 = await db.annonce.create({
    data: { ecoleId: ecole.id, titre: "Rentrée scolaire 2026-2027", contenu: "Chères familles, la rentrée est fixée au lundi 1er septembre à 8h. Réunion parents-profs le 5 septembre à 17h.", auteurId: dirUtilisateur.id, datePublication: new Date("2026-08-20"), statut: "publie", cible: "toute_ecole", pinned: true },
  });
  await db.annonceLecture.create({ data: { annonceId: annonce1.id, utilisateurId: enseignants[0].utilisateur.id, dateLecture: new Date() } });

  // POINT 22 — SMS log
  await db.smsLog.create({
    data: { ecoleId: ecole.id, destinataire: "+221 78 333 44 55", message: "Rappel: réunion parents-profs le 5/9 à 17h. Direction.", provider: "orange_api", providerMessageId: "OMS-2026-123456", statut: "delivre", coutUnitaire: 25, coutTotal: 25, segments: 1, dateEnvoi: new Date("2026-08-25T10:00:00"), dateLivraison: new Date("2026-08-25T10:00:05") },
  });

  // POINT 23 — Push notifications & devices
  const device1 = await db.deviceMobile.create({ data: { utilisateurId: dirUtilisateur.id, plateforme: "pwa", deviceToken: "device-token-demo-1", deviceModel: "Pixel 7", osVersion: "Android 14", appVersion: "1.0.0", langue: "fr", actif: true, derniereActivite: new Date() } });
  const pushToken1 = await db.pushToken.create({ data: { utilisateurId: dirUtilisateur.id, token: "fcm-token-demo-1", provider: "fcm", deviceId: device1.id, actif: true } });
  await db.pushNotificationLog.create({ data: { ecoleId: ecole.id, pushTokenId: pushToken1.id, titre: "Bulletins publiés", corps: "Les bulletins T1 sont disponibles sur le portail parent.", statut: "delivre", providerMessageId: "fcm-msg-1", dateEnvoi: new Date("2026-08-25T10:00:00"), dateLivraison: new Date("2026-08-25T10:00:02") } });

  // POINT 24 — Sessions actives
  await db.sessionUtilisateur.create({
    data: { utilisateurId: dirUtilisateur.id, tokenHash: "hash-demo-token-1", fingerprint: "fp-1", adresseIp: "192.168.1.42", userAgent: "Mozilla/5.0 (Macintosh) Chrome/127.0", deviceType: "desktop", localisation: "Dakar, Sénégal", dateDerniereActivite: new Date(), dateExpiration: new Date(Date.now() + 7 * 24 * 3600 * 1000), active: true },
  });

  // POINT 25 — 2FA complet
  await db.twoFactorMethod.create({ data: { utilisateurId: dirUtilisateur.id, methode: "totp", secret: "JBSWY3DPEHPK3PXP", actif: true, dateActivation: new Date("2026-08-01") } });
  await db.twoFactorBackupCode.createMany({
    data: Array.from({ length: 10 }).map((_, i) => ({
      utilisateurId: dirUtilisateur.id, codeHash: `hash-backup-code-${i + 1}`, dateGeneration: new Date(),
    })),
  });

  // POINT 26 — Tokens d'authentification
  await db.jetonAuth.create({ data: { email: "editeur@platforme.com", type: "reset_password", tokenHash: "hash-jeton-reset-1", expireLe: new Date(Date.now() + 3600 * 1000), dateCreation: new Date() } }).catch(() => {});
  await db.jetonAuth.create({ data: { email: dirUtilisateur.email, type: "reset_password", tokenHash: "hash-jeton-reset-demo", expireLe: new Date(Date.now() + 3600 * 1000), dateCreation: new Date() } }).catch(() => {});
  await db.jetonAuth.create({ data: { email: dirUtilisateur.email, type: "verify_email", tokenHash: "hash-jeton-verify-demo", expireLe: new Date(Date.now() + 7 * 24 * 3600 * 1000), dateCreation: new Date(), utilise: true, dateUtilisation: new Date() } }).catch(() => {});
  await db.tentativeConnexion.create({ data: { email: dirUtilisateur.email, adresseIp: "192.168.1.42", userAgent: "Chrome/127", succes: true, date: new Date() } });
  await db.tentativeConnexion.create({ data: { email: "inconnu@example.com", adresseIp: "10.0.0.5", userAgent: "Mozilla", succes: false, motifEchec: "utilisateur_inexistant", date: new Date() } });

  // POINT 27 — API tokens publics
  const apiToken1 = await db.apiToken.create({
    data: { ecoleId: ecole.id, nom: "Intégration SIRH externe", description: "Token pour synchronisation avec le SIRH régional", tokenHash: "hash-api-token-1", prefix: "sk_live_abcd", scopes: JSON.stringify(["eleves:read", "classes:read"]), tauxLimiteHoraire: 500, actif: true, totalRequettes: 42, dernierUsage: new Date() },
  });
  await db.apiTokenLog.create({ data: { apiTokenId: apiToken1.id, endpoint: "/api/v1/eleves", methode: "GET", statut: 200, tempsReponse: 142, adresseIp: "10.0.0.1" } });

  // POINT 28 — Webhooks sortants
  const webhook1 = await db.webhookSortant.create({
    data: { ecoleId: ecole.id, url: "https://sirh-region.sn/webhooks/eleves", secret: "whsec_demo", events: JSON.stringify(["eleve.inscription", "eleve.sortie"]), actif: true, dateCreation: new Date() },
  });
  await db.webhookDelivery.create({
    data: { webhookId: webhook1.id, event: "eleve.inscription", payload: JSON.stringify({ eleveId: eleves[0].eleve.id }), statutHttp: 200, reponseCorps: "ok", tentative: 1, statut: "livre", dateEnvoi: new Date() },
  });

  // POINT 29 — Demandes d'effacement RGPD
  await db.demandeEffacement.create({
    data: { ecoleId: ecole.id, utilisateurId: null, cibleType: "eleve", cibleId: eleves[4].eleve.id, motif: "obligation_legale", description: "Élève transféré dans une autre école — droit à l'oubli.", statut: "en_cours", dateDemande: new Date() },
  });

  // POINT 30 — Export données
  await db.exportDonnees.create({
    data: { ecoleId: ecole.id, cibleType: "eleve", cibleId: eleves[0].eleve.id, format: "json", statut: "genere", fichierUrl: "/exports/eleve-export-demo.json", tailleOctets: 84000, dateDemande: new Date(), dateGeneration: new Date(), dateExpiration: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
  });

  // POINT 31 — Consentements (image + communication)
  await db.consentementImage.create({
    data: { ecoleId: ecole.id, eleveId: eleves[0].eleve.id, accord: true, usage: "site_web", dateAccord: new Date("2026-08-05"), valideParParentId: parent0?.id ?? null, duree: "annee_scolaire" },
  });
  await db.consentementCommunication.create({
    data: { ecoleId: ecole.id, utilisateurId: dirUtilisateur.id, canal: "email", accord: true, dateAccord: new Date("2026-08-01") },
  });

  // POINT 32 — Registre des traitements (article 30 RGPD)
  await db.registreTraitement.create({
    data: { ecoleId: ecole.id, nom: "Gestion des inscriptions élèves", finalite: "Inscription et scolarisation des élèves", baseLegale: "mission_publique", donneesTraitees: JSON.stringify(["identite_eleve", "date_naissance", "adresse", "parent"]), categoriesPersonnes: JSON.stringify(["eleves", "parents"]), destinataires: "équipe pédagogique, direction", transfertsHorsUE: "Aucun", dureeConservation: "Durée de scolarité + 5 ans", responsable: "Directeur", dpo: "DPO Éditeur SaaS" },
  });

  // POINT 33 — Domaine personnalisé & thème
  await db.domainePersonnalise.create({
    data: { ecoleId: ecole.id, domaine: "ecole.vinci.sn", verifie: true, enAttente: false, enregistrementCname: "vinci.platforme.com.", certificatSSL: "letsencrypt", certificatExpireLe: new Date("2026-11-20"), dateAjout: new Date("2026-08-01"), dateVerification: new Date("2026-08-01") },
  });
  await db.themeEcole.create({
    data: { ecoleId: ecole.id, couleurPrimaire: "#1e3a8a", couleurSecondaire: "#0ea5e9", couleurAccent: "#f59e0b", couleurFond: "#f8fafc", policeFamille: "Inter", nomProduit: "VinciGestion" },
  });

  // POINT 34 — Feature flags, quotas, Stripe webhook events, avoirs SaaS
  const flagPaie = await db.featureFlag.create({ data: { code: "module_paie", description: "Active le module de paie RH", actifGlobal: false, rolloutPourcentage: 0 } });
  await db.featureFlagEcole.create({ data: { featureFlagId: flagPaie.id, ecoleId: ecole.id, actif: true, dateActivation: new Date() } });
  await db.quotaUsage.createMany({ data: [
    { ecoleId: ecole.id, periode: "2026-08", ressource: "eleves", consommation: 25, limite: 100, pourcentage: 25 },
    { ecoleId: ecole.id, periode: "2026-08", ressource: "sms_envoyes", consommation: 145, limite: 500, pourcentage: 29 },
    { ecoleId: ecole.id, periode: "2026-08", ressource: "storage_go", consommation: 2, limite: 10, pourcentage: 20 },
  ] });
  await db.stripeEvent.create({
    data: { eventIdStripe: "evt_2026_demo_001", type: "invoice.payment_succeeded", donnees: JSON.stringify({ invoiceId: "in_demo123", amountPaid: 65000 }), traite: true, dateReception: new Date("2026-08-05"), dateTraitement: new Date("2026-08-05") },
  });
  await db.avoirSaas.create({
    data: { ecoleId: ecole.id, numero: "AV-SAAS-2026-001", dateEmission: new Date("2026-08-15"), montant: 5000, devise: "XOF", motif: "Erreur de facturation — prorata jours de suspension", statut: "emis" },
  });

  // POINT 35 — Plans PPS / PAP / PAI / PAPSI
  const planPPS = await db.planAccompagnement.create({
    data: { ecoleId: ecole.id, eleveId: eleves[2].eleve.id, type: "PAI", dateMiseEnPlace: new Date("2026-08-10"), dateDebut: new Date("2026-09-01"), dateFin: new Date("2027-08-31"), statut: "actif", diagnostic: "Asthme sévère — besoin d'accès au bureau infirmier et d'un protocole d'urgence.", objectifsGeneraux: "Sécuriser la prise en charge médicale pendant les heures de cours.", frequenceSuivi: "trimestriel", redigeParId: dirUtilisateur.id, valideParId: dirUtilisateur.id, dateValidation: new Date() },
  });
  await db.membreEquipeEducatif.createMany({ data: [
    { planAccompagnementId: planPPS.id, utilisateurId: dirUtilisateur.id, role: "referent", dateInclusion: new Date("2026-08-10") },
    { planAccompagnementId: planPPS.id, utilisateurId: enseignants[0].utilisateur.id, role: "enseignant", dateInclusion: new Date("2026-08-10") },
  ] });
  await db.objectifPlan.create({ data: { planAccompagnementId: planPPS.id, description: "Disponibilité permanente de l'inhalateur en classe", domaine: "therapeutique", echeance: new Date("2026-09-30"), atteint: true, dateEvaluation: new Date() } });
  await db.revisionPlan.create({ data: { planAccompagnementId: planPPS.id, motif: "Révision trimestrielle obligatoire", constats: "Plan respecté. Aucune crise rapportée ce trimestre.", ajustements: "Maintien du protocole actuel.", redigeParId: dirUtilisateur.id } });

  // POINT 36 — Templates PDF, documents générés, signatures
  const tplBulletin = await db.templateDocument.create({
    data: { ecoleId: ecole.id, code: "bulletin", libelle: "Bulletin trimestriel", type: "html_template", contenuTemplate: "<h1>{{ecole_nom}}</h1><h2>Bulletin {{periode_libelle}} — {{eleve_nom}}</h2><table>{{#notes}}<tr><td>{{matiere}}</td><td>{{moyenne}}</td></tr>{{/notes}}</table>", variablesDisponibles: JSON.stringify(["ecole_nom", "periode_libelle", "eleve_nom", "notes"]), langue: "fr", actif: true },
  });
  const docBulletin = await db.documentGenere.create({
    data: { ecoleId: ecole.id, templateId: tplBulletin.id, cibleType: "bulletin", cibleId: "demo-bulletin-1", titre: "Bulletin T1 - DIOP Awa - 6A", format: "pdf", fichierUrl: "/documents/bulletin-demo.pdf", tailleOctets: 245000, version: 1, genereParId: dirUtilisateur.id, hashContenu: "sha256-demo-1" },
  });
  await db.signatureElectronique.create({
    data: { documentGenereId: docBulletin.id, signataireId: dirUtilisateur.id, signataireNom: "Direction - Vinci", hashDocument: "sha256-demo-1", dateSignature: new Date(), adresseIp: "192.168.1.42", userAgent: "Chrome/127", niveau: "qualifie" },
  });
  await db.rapportSauvegarde.create({ data: { ecoleId: ecole.id, utilisateurId: dirUtilisateur.id, nom: "Suivi mensuel impayés", type: "kpi_tableau_bord", configuration: JSON.stringify({ filtres: { statut: "impayee" }, colonnes: ["eleve", "montant"], periode: "2026-08" }), format: "table", partage: false, derniereExecution: new Date() } });
  await db.widgetDashboard.create({ data: { utilisateurId: dirUtilisateur.id, titre: "Effectifs par classe", type: "chart", source: "sql", configuration: JSON.stringify({ chartType: "bar", dataset: "eleves_by_classe" }), position: 0, taille: "md", actif: true } });

  // POINT 37 — Hiérarchie bâtiment/étage + équipements salle
  const batimentA = await db.batiment.create({ data: { ecoleId: ecole.id, nom: "Bâtiment Principal A", adresse: "Avenue Léopold S. Senghor, Dakar", nombreEtages: 3, accessibilitePMR: true, dateConstruction: new Date("2010-09-01") } });
  const etageRdc = await db.etage.create({ data: { batimentId: batimentA.id, numero: 0, libelle: "Rez-de-chaussée" } });
  const etage1 = await db.etage.create({ data: { batimentId: batimentA.id, numero: 1, libelle: "Premier étage" } });
  // Associer des salles existantes à un bâtiment/étage
  const sallesEcole = await db.salle.findMany({ where: { ecoleId: ecole.id } });
  if (sallesEcole[0]) {
    await db.salle.update({ where: { id: sallesEcole[0].id }, data: { batimentId: batimentA.id, etageId: etageRdc.id } });
    await db.salleEquipement.createMany({ data: [
      { salleId: sallesEcole[0].id, type: "videoprojecteur", quantite: 1, etat: "fonctionnel" },
      { salleId: sallesEcole[0].id, type: "TBI", quantite: 1, etat: "fonctionnel", dateDerniereMaintenance: new Date("2026-07-15") },
      { salleId: sallesEcole[0].id, type: "climatisation", quantite: 1, etat: "panne" },
    ] });
  }

  // ==================================================================
  // COMPLÉTION AUDIT — 21 tables pré-existantes non seedées
  // (RBAC, historique, documents, congés, programmes, bulletins,
  //  compétences, réservations, examens, cantine, etc.)
  // ==================================================================

  // A) RBAC : Permissions + associations rôles/utilisateurs
  const permsData = [
    { code: "eleves.lire", libelle: "Consulter les élèves", module: "eleves" },
    { code: "eleves.ecrire", libelle: "Créer/modifier les élèves", module: "eleves" },
    { code: "notes.saisir", libelle: "Saisir les notes", module: "pedagogie" },
    { code: "bulletins.valider", libelle: "Valider les bulletins", module: "pedagogie" },
    { code: "finances.voir", libelle: "Consulter la trésorerie", module: "finances" },
    { code: "finances.valider", libelle: "Valider les dépenses", module: "finances" },
    { code: "presences.saisir", libelle: "Faire l'appel", module: "presences" },
    { code: "rh.gerer", libelle: "Gérer le personnel", module: "rh" },
    { code: "communication.envoyer", libelle: "Envoyer des communications", module: "communication" },
    { code: "admin.saas", libelle: "Administration SaaS", module: "saas" },
    { code: "vie_scolaire.gerer", libelle: "Gérer incidents et sanctions", module: "vie_scolaire" },
    { code: "securite.gerer", libelle: "Gérer la sécurité du site (visiteurs, sorties)", module: "securite" },
    { code: "examens.gerer", libelle: "Gérer les examens officiels", module: "examens" },
    { code: "services.gerer", libelle: "Gérer cantine, bibliothèque, manuels", module: "services" },
    { code: "edt.gerer", libelle: "Gérer les emplois du temps", module: "edt" },
    { code: "sante.gerer", libelle: "Gérer la santé et l'infirmerie", module: "sante" },
    { code: "salles.gerer", libelle: "Gérer salles et calendrier", module: "salles" },
  ];
  const perms = [] as any[];
  for (const p of permsData) {
    perms.push(await db.permission.create({ data: { ...p, ecoles: { connect: { id: ecole.id } } } }));
  }
  const byCode = (c: string) => perms.find((p) => p.code === c)!.id;
  await db.rolePermission.createMany({ data: [
    { roleId: roleDirection.id, permissionId: byCode("eleves.lire") },
    { roleId: roleDirection.id, permissionId: byCode("eleves.ecrire") },
    { roleId: roleDirection.id, permissionId: byCode("bulletins.valider") },
    { roleId: roleDirection.id, permissionId: byCode("finances.voir") },
    { roleId: roleDirection.id, permissionId: byCode("finances.valider") },
    { roleId: roleDirection.id, permissionId: byCode("rh.gerer") },
    { roleId: roleDirection.id, permissionId: byCode("communication.envoyer") },
    { roleId: roleDirection.id, permissionId: byCode("admin.saas") },
    { roleId: roleDirection.id, permissionId: byCode("vie_scolaire.gerer") },
    { roleId: roleDirection.id, permissionId: byCode("securite.gerer") },
    { roleId: roleDirection.id, permissionId: byCode("examens.gerer") },
    { roleId: roleDirection.id, permissionId: byCode("services.gerer") },
    { roleId: roleDirection.id, permissionId: byCode("edt.gerer") },
    { roleId: roleDirection.id, permissionId: byCode("sante.gerer") },
    { roleId: roleDirection.id, permissionId: byCode("salles.gerer") },
    { roleId: roleEnseignant.id, permissionId: byCode("eleves.lire") },
    { roleId: roleEnseignant.id, permissionId: byCode("notes.saisir") },
    { roleId: roleEnseignant.id, permissionId: byCode("presences.saisir") },
    { roleId: roleEnseignant.id, permissionId: byCode("vie_scolaire.gerer") },
    { roleId: roleEnseignant.id, permissionId: byCode("edt.gerer") },
    { roleId: roleComptable.id, permissionId: byCode("finances.voir") },
    { roleId: roleComptable.id, permissionId: byCode("finances.valider") },
    { roleId: roleSurveillant.id, permissionId: byCode("eleves.lire") },
    { roleId: roleSurveillant.id, permissionId: byCode("presences.saisir") },
    { roleId: roleSurveillant.id, permissionId: byCode("securite.gerer") },
  ] });
  await db.utilisateurRole.createMany({ data: [
    { utilisateurId: dirUtilisateur.id, roleId: roleDirection.id },
    { utilisateurId: enseignants[0].utilisateur.id, roleId: roleEnseignant.id },
    { utilisateurId: enseignants[1].utilisateur.id, roleId: roleEnseignant.id },
  ] });

  // B) Historique de classe (passage 5B -> 6A pour un redoublant fictif)
  await db.eleveHistoriqueClasse.create({ data: {
    eleveId: eleves[0].eleve.id, classeId: classe5B.id,
    dateEntree: new Date("2025-09-01"), dateSortie: new Date("2026-06-30"), motif: "Passage en classe supérieure",
  } });
  await db.eleveHistoriqueClasse.create({ data: {
    eleveId: eleves[5].eleve.id, classeId: classe6A.id,
    dateEntree: new Date("2025-09-01"), dateSortie: new Date("2026-06-30"), motif: "Réorientation",
  } });

  // C) Documents élèves
  await db.documentEleve.create({ data: {
    eleveId: eleves[0].eleve.id, type: "acte_naissance", fichierUrl: "/uploads/docs/acte-diop.pdf",
    confidentiel: false, ajouteParId: dirUtilisateur.id,
  } });
  await db.documentEleve.create({ data: {
    eleveId: eleves[1].eleve.id, type: "certificat_medical", fichierUrl: "/uploads/docs/cert-med.pdf",
    confidentiel: true, ajouteParId: dirUtilisateur.id,
  } });

  // D) Congés + remplacement
  const congeMaladie = await db.conge.create({ data: {
    personnelId: enseignants[2].personnel.id, type: "maladie",
    dateDebut: new Date("2026-09-28"), dateFin: new Date("2026-10-09"),
    statut: "accepte", motif: "Arrêt maladie — certificat fourni", traiteParId: dirUtilisateur.id,
  } });
  await db.conge.create({ data: {
    personnelId: enseignants[4].personnel.id, type: "annuel",
    dateDebut: new Date("2026-12-21"), dateFin: new Date("2027-01-04"),
    statut: "demande", motif: "Congés annuels fin d'année",
  } });
  await db.remplacement.create({ data: {
    congeId: congeMaladie.id,
    personnelAbsentId: enseignants[2].personnel.id,
    personnelRemplacantId: enseignants[5].personnel.id,
    dateDebut: new Date("2026-09-28"), dateFin: new Date("2026-10-09"), statut: "confirme",
  } });

  // E) Évaluation annuelle du personnel
  await db.evaluationPersonnel.create({ data: {
    personnelId: enseignants[0].personnel.id, evaluateurId: dirUtilisateur.id, periode: "2025-2026",
    criteres: JSON.stringify({ pedagogie: 17, assiduite: 19, travail_equipe: 16, communication_parents: 15 }),
    commentaireGlobal: "Excellente implication pédagogique. Points d'appui : rigueur, suivi individualisé.",
  } });

  // F) Programme pédagogique + chapitres + avancement
  const programmeMaths = await db.programme.create({ data: {
    ecoleId: ecole.id, matiereId: enseignants[0].matiere.id, niveauId: n6.id, anneeScolaireId: annee.id,
    titre: "Mathématiques 6e — Programme annuel",
    objectifs: "Maîtriser les décimaux, la proportionnalité et la géométrie de base.",
    volumeHorairePrevu: 108, publie: true,
  } });
  const chap1 = await db.chapitre.create({ data: { programmeId: programmeMaths.id, titre: "Nombres décimaux", ordre: 1, volumeHorairePrevu: 12, contenu: "Addition, soustraction, multiplication des décimaux." } });
  const chap2 = await db.chapitre.create({ data: { programmeId: programmeMaths.id, titre: "Proportionnalité", ordre: 2, volumeHorairePrevu: 10 } });
  const chap3 = await db.chapitre.create({ data: { programmeId: programmeMaths.id, titre: "Figures usuelles", ordre: 3, volumeHorairePrevu: 14 } });
  await db.avancementProgramme.create({ data: {
    chapitreId: chap1.id, classeId: classe6A.id, enseignantId: enseignants[0].personnel.id,
    pourcentage: 65, commentaire: "Chapitre bien avancé, évaluation prévue semaine 42.",
  } });
  await db.avancementProgramme.create({ data: {
    chapitreId: chap2.id, classeId: classe6A.id, enseignantId: enseignants[0].personnel.id,
    pourcentage: 15,
  } });

  // G) Règles de calcul de moyenne par cycle
  await db.regleCalculMoyenne.create({ data: {
    ecoleId: ecole.id, cycleId: cCollege.id, methode: "moyenne_ponderee",
    inclutAbsents: false, notePlancher: 0, notePlafond: 20, arrondi: 2,
    reglesSpecifiques: JSON.stringify({ coefficients: "par matiere", eleve_absent: "note neutralisee" }),
  } });
  await db.regleCalculMoyenne.create({ data: {
    ecoleId: ecole.id, cycleId: cPrimaire.id, methode: "moyenne_ponderee",
    inclutAbsents: false, notePlancher: 0, notePlafond: 20, arrondi: 0,
  } });

  // H) Bulletins (workflow complet : en_construction -> valide_pp -> publie)
  await db.bulletin.create({ data: {
    eleveId: eleves[0].eleve.id, classeId: classe6A.id, periodeId: periodeT1.id, version: 1,
    statut: "publie", moyennes: JSON.stringify({ MATHS: 14.5, FR: 13.0, HG: 15.5 }),
    moyenneGenerale: 14.3, rang: 2, appreciationGenerale: "Trimestre solide, continue ainsi !",
    decisionConseil: "admis", pdfUrl: "/documents/bulletins/bulletin-1-t1.pdf",
    creeParId: enseignants[0].utilisateur.id,
    dateValidationPp: new Date("2026-12-10"), validePpParId: dirUtilisateur.id,
    dateValidationDirection: new Date("2026-12-12"), valideDirectionParId: dirUtilisateur.id,
    datePublication: new Date("2026-12-13"),
  } });
  await db.bulletin.create({ data: {
    eleveId: eleves[1].eleve.id, classeId: classe6A.id, periodeId: periodeT1.id, version: 1,
    statut: "valide_pp", moyennes: JSON.stringify({ MATHS: 11.0, FR: 16.5, HG: 12.0 }),
    moyenneGenerale: 13.2, rang: 4, appreciationGenerale: "Bon trimestre en français.",
    creeParId: enseignants[0].utilisateur.id,
    dateValidationPp: new Date("2026-12-11"), validePpParId: dirUtilisateur.id,
  } });
  await db.bulletin.create({ data: {
    eleveId: eleves[2].eleve.id, classeId: classe6A.id, periodeId: periodeT1.id, version: 1,
    statut: "en_construction",
    moyennes: JSON.stringify({ MATHS: 9.5, FR: 10.5, HG: 11.0 }),
    creeParId: enseignants[0].utilisateur.id,
  } });

  // I) Compétences (cycle primaire) + évaluations compétences
  const compLecture = await db.competence.create({ data: { ecoleId: ecole.id, cycleId: cPrimaire.id, libelle: "Lire couramment un texte adapté", ordre: 1 } });
  const compCalcul = await db.competence.create({ data: { ecoleId: ecole.id, cycleId: cPrimaire.id, libelle: "Résoudre un problème à une étape", ordre: 2 } });
  await db.evaluationCompetence.createMany({ data: [
    { eleveId: eleves[9].eleve.id, competenceId: compLecture.id, periodeId: periodeT1.id, niveauAcquisition: "maitrise", commentaire: "Fluidité remarquable.", evalueParId: enseignants[1].utilisateur.id },
    { eleveId: eleves[9].eleve.id, competenceId: compCalcul.id, periodeId: periodeT1.id, niveauAcquisition: "acquis", evalueParId: enseignants[0].utilisateur.id },
    { eleveId: eleves[10].eleve.id, competenceId: compLecture.id, periodeId: periodeT1.id, niveauAcquisition: "en_cours_d_acquisition", evalueParId: enseignants[1].utilisateur.id },
    { eleveId: eleves[11].eleve.id, competenceId: compCalcul.id, periodeId: periodeT1.id, niveauAcquisition: "non_acquis", commentaire: "Besoin d'un soutien ciblé.", evalueParId: enseignants[0].utilisateur.id },
  ] });

  // J) Affectation des paiements aux échéances
  const paiementsExistants = await db.paiement.findMany({ where: { ecoleId: ecole.id }, orderBy: { datePaiement: "asc" } });
  const echeancesExistantes = await db.echeanceFrais.findMany({ where: { eleveId: eleves[0].eleve.id } });
  if (paiementsExistants[0] && echeancesExistantes[0]) {
    await db.paiementEcheance.createMany({ data: [
      { paiementId: paiementsExistants[0].id, echeanceId: echeancesExistantes[0].id, montantApplique: echeancesExistantes[0].montantPaye },
      { paiementId: paiementsExistants[0].id, echeanceId: echeancesExistantes[1].id, montantApplique: echeancesExistantes[1].montantPaye },
    ] });
  }

  // K) Réservations de salles
  await db.reservationSalle.create({ data: {
    salleId: salleA101!.id, seanceId: seance.id, date: new Date("2026-09-22"),
    heureDebut: "08:00", heureFin: "10:00", reserveParId: dirUtilisateur.id,
    motif: "Cours de mathématiques (séance régulière)",
  } });
  const salleB202 = sallesEcole.find((s: any) => s.nom !== "A101") ?? sallesEcole[0];
  await db.reservationSalle.create({ data: {
    salleId: salleB202.id, date: new Date("2026-10-14"),
    heureDebut: "17:00", heureFin: "19:00", reserveParId: dirUtilisateur.id,
    motif: "Réunion Comité d'Éducation à la Santé",
  } });

  // L) Inscriptions à l'examen officiel (BEPC)
  await db.inscriptionExamenOfficiel.createMany({ data: [
    { examenOfficielId: examenBepc.id, eleveId: eleves[0].eleve.id, numeroTable: "SN-2027-00142", centreExamen: "CEM Kennedy, Dakar", statut: "inscrit" },
    { examenOfficielId: examenBepc.id, eleveId: eleves[1].eleve.id, numeroTable: "SN-2027-00143", centreExamen: "CEM Kennedy, Dakar", statut: "convoque" },
  ] });

  // M) Réunion collective parents
  await db.reunionCollective.create({ data: {
    classeId: classe6A.id, date: new Date("2026-10-03"), heure: "18:00", lieu: "Salle A101",
    description: "Réunion de rentrée : présentation de l'équipe et du programme annuel.",
  } });
  await db.reunionCollective.create({ data: {
    classeId: classeCM2A.id, date: new Date("2026-11-12"), heure: "17:30", lieu: "Salle B202",
    description: "Préparation du concours d'entrée en sixième.",
  } });

  // N) Listes de fournitures
  await db.listeFourniture.create({ data: {
    niveauId: n6.id, anneeScolaireId: annee.id,
    contenu: JSON.stringify([
      { article: "Cahier 200 pages", quantite: 6 },
      { article: "Classeur à levier", quantite: 2 },
      { article: "Calculatrice collège", quantite: 1 },
      { article: "Kit géométrie", quantite: 1 },
    ]),
    publiee: true, datePublication: new Date("2026-08-20"),
  } });
  await db.listeFourniture.create({ data: {
    niveauId: nCM2.id, anneeScolaireId: annee.id,
    contenu: JSON.stringify([
      { article: "Cahier 96 pages", quantite: 8 },
      { article: "Livre de lecture imposé", quantite: 1 },
    ]),
    publiee: false,
  } });

  // O) Sortie anticipée
  await db.sortieAnticipee.create({ data: {
    eleveId: eleves[2].eleve.id, date: new Date("2026-09-18"), heure: "14:30",
    recupereParNom: "Mme Camara (mère)", validationExceptionnelle: false,
    valideParId: dirUtilisateur.id, parentsNotifies: true,
  } });
  await db.sortieAnticipee.create({ data: {
    eleveId: eleves[7].eleve.id, date: new Date("2026-09-24"), heure: "10:00",
    recupereParNom: "M. Bello (père)", validationExceptionnelle: true,
    valideParId: dirUtilisateur.id, parentsNotifies: true,
  } });

  // P) Inscriptions cantine
  await db.cantineInscription.create({ data: {
    ecoleId: ecole.id, eleveId: eleves[0].eleve.id, classeId: classe6A.id, anneeScolaireId: annee.id,
    joursSemaine: JSON.stringify([1, 3, 5]), tarifJournalier: 1500, actif: true,
  } });
  await db.cantineInscription.create({ data: {
    ecoleId: ecole.id, eleveId: eleves[8].eleve.id, classeId: classe5B.id, anneeScolaireId: annee.id,
    joursSemaine: JSON.stringify([1, 2, 3, 4, 5]), tarifJournalier: 1200, actif: true,
  } });

  
  // SANTE — Fiches santé, passages infirmerie, vaccinations (P2)
  const ficheS1 = await db.ficheSante.create({ data: {
    ecoleId: ecole.id, eleveId: eleves[0].eleve.id,
    groupeSanguin: "O+",
    allergies: "Arachides (réaction cutanée)",
    traitementsEnCours: "Aucun",
    medecinTraitant: "Dr. Ndiaye — Cabinet Horizon",
    telephoneUrgence: "+221 77 123 45 67",
    contactUrgenceNom: "Parent Adepo",
    autorisationTraitement: true,
    dateMiseAJour: new Date("2026-09-10"),
    misAJourParId: dirUtilisateur.id,
  } });
  const ficheS2 = await db.ficheSante.create({ data: {
    ecoleId: ecole.id, eleveId: eleves[5].eleve.id,
    groupeSanguin: "A+",
    allergies: "Pénicilline",
    traitementsEnCours: "Ventoline ( inhalateur conservé à l'infirmerie )",
    antecedents: "Asthme léger depuis 2022",
    medecinTraitant: "Dr. Sow — Clinique Baobab",
    telephoneUrgence: "+221 76 555 12 34",
    contactUrgenceNom: "Parent Diop",
    autorisationTraitement: true,
    dateMiseAJour: new Date("2026-09-12"),
    misAJourParId: dirUtilisateur.id,
  } });
  await db.ficheSante.create({ data: {
    ecoleId: ecole.id, eleveId: eleves[7].eleve.id,
    groupeSanguin: "B+",
    allergies: "Aucune connue",
    medecinTraitant: "Dr. Ndiaye — Cabinet Horizon",
    telephoneUrgence: "+221 78 900 11 22",
    contactUrgenceNom: "Parent Gueye",
    autorisationTraitement: false,
    dateMiseAJour: new Date("2026-09-15"),
    misAJourParId: dirUtilisateur.id,
  } });

  await db.passageInfirmerie.createMany({ data: [
    { ecoleId: ecole.id, eleveId: eleves[0].eleve.id, ficheSanteId: ficheS1.id, datePassage: new Date("2026-09-18T10:15:00"), motif: "Céphalées persistantes", symptomes: "Fatigue, sensibilité à la lumière", soinsAdministres: "Repos 20 min, hydratation", temperature: 37.2, issue: "retour_classe", personnelId: dirUtilisateur.id },
    { ecoleId: ecole.id, eleveId: eleves[5].eleve.id, ficheSanteId: ficheS2.id, datePassage: new Date("2026-09-20T14:40:00"), motif: "Crise d'asthme légère après EPS", symptomes: "Respiration sifflante", soinsAdministres: "Administration ventoline (autorisation parentale enregistrée), repos 30 min", temperature: 36.9, issue: "parents_contactes", parentsNotifies: true, personnelId: dirUtilisateur.id },
    { ecoleId: ecole.id, eleveId: eleves[7].eleve.id, datePassage: new Date("2026-09-25T09:05:00"), motif: "Chute dans la cour", symptomes: "Entorse cheville droite suspectée", soinsAdministres: "Immobilisation, glace", temperature: 36.8, issue: "depart_hopital", parentsNotifies: true, personnelId: dirUtilisateur.id },
  ] });

  await db.vaccination.createMany({ data: [
    { ecoleId: ecole.id, eleveId: eleves[0].eleve.id, vaccin: "DTaP", dateVaccination: new Date("2024-03-10"), statut: "a_jour" },
    { ecoleId: ecole.id, eleveId: eleves[5].eleve.id, vaccin: "BCG", dateVaccination: new Date("2023-11-02"), statut: "a_jour" },
    { ecoleId: ecole.id, eleveId: eleves[7].eleve.id, vaccin: "ROR", dateVaccination: new Date("2024-06-15"), dateRappel: new Date("2027-06-15"), statut: "rappel_prevu" },
  ] });

  // Tentatives de connexion d'exemple (panneau sécurité)
  await db.tentativeConnexion.createMany({ data: [
    { email: "direction@vinci.sn", succes: true, date: new Date("2026-09-28T07:55:00") },
    { email: "inconnu@exemple.com", succes: false, motifEchec: "Identifiants incorrects", date: new Date("2026-09-28T09:12:00") },
    { email: "mamadou.fall@vinci.sn", succes: true, date: new Date("2026-09-28T10:30:00") },
  ] });

console.log("✅ Seed terminé (avec 37 failles corrigées) !");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
