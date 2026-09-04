# -*- coding: utf-8 -*-
# S1 — Schéma : vie quotidienne, activités, appréciations, rapprochement
import io
p = 'prisma/schema.prisma'
s = io.open(p, encoding='utf-8').read()
n = [0]

def rep(old, new):
    global s
    assert old in s, 'INTROUVABLE: ' + old[:70]
    s = s.replace(old, new, 1)
    n[0] += 1

rep("""  accesUtilisateurs UtilisateurEcole[]
}""", """  accesUtilisateurs UtilisateurEcole[]
  cantineMenus     CantineMenu[]
  cantinePresences CantinePresence[]
  feuillesRoute    FeuilleRoute[]
  pointagesPersonnel PointagePersonnel[]
  activites        Activite[]
  garderieInscriptions GarderieInscription[]
  garderieSessions GarderieSession[]
  lignesReleve     LigneReleve[]
}""")

rep("""  numeroSecuriteSociale String?
  contactUrgence        String? // JSON""", """  numeroSecuriteSociale String?
  rib                   String? // RIB/IBAN pour l'export des virements de paie (M16)
  contactUrgence        String? // JSON""")

rep("""model CandidatureAdmission {
  id                   String    @id @default(cuid())""", """model CandidatureAdmission {
  id                   String    @id @default(cuid())
  sourceIp            String? // E21 — formulaire public (throttling)""")

rep("""model PushToken {
  id            String   @id @default(cuid())
  utilisateurId String
  utilisateur   Utilisateur @relation("PushTokenUser", fields: [utilisateurId], references: [id], onDelete: Cascade) // F17
  token         String
  provider      String // fcm/apns/web_push""", """model PushToken {
  id            String   @id @default(cuid())
  utilisateurId String
  utilisateur   Utilisateur @relation("PushTokenUser", fields: [utilisateurId], references: [id], onDelete: Cascade) // F17
  token         String    @unique
  provider      String // fcm/apns/web_push
  p256dh        String? // E19 — clé publique d'abonnement web-push
  authKey       String? // E19 — secret d'abonnement web-push""")

rep("""  eleves                Eleve[]
  seances               Seance[]""", """  eleves                Eleve[]
  seances               Seance[]""")

rep("""model Personnel {
  id                    String       @id @default(cuid())
  ecoleId               String
  ecole                 Ecole        @relation(fields: [ecoleId], references: [id])
  utilisateurId         String?      @unique""", """model Personnel {
  id                    String       @id @default(cuid())
  ecoleId               String
  ecole                 Ecole        @relation(fields: [ecoleId], references: [id])
  utilisateurId         String?      @unique""")

rep("""  soldeConges              SoldeConge[]
  devoirs                  Devoir[] // F17""", """  soldeConges              SoldeConge[]
  pointages                PointagePersonnel[] // O3
  devoirs                  Devoir[] // F17""")

rep("""model Eleve {
  id                           String       @id @default(cuid())""", """model Eleve {
  id                           String       @id @default(cuid())""")

rep("""  ficheSante                 FicheSante?
  passagesInfirmerie         PassageInfirmerie[]
  vaccinations               Vaccination[]""", """  ficheSante                 FicheSante?
  passagesInfirmerie         PassageInfirmerie[]
  vaccinations               Vaccination[]
  cantinePresences           CantinePresence[] // O1
  garderieInscription        GarderieInscription? // M8
  garderieSessions           GarderieSession[] // M8
  activiteParticipations     ActiviteParticipant[] // M7""")

rep("""  echeances PaiementEcheance[]
  avoirs    AvoirEcole[] // F17""", """  echeances PaiementEcheance[]
  avoirs    AvoirEcole[] // F17
  lignesReleve LigneReleve[] // M15""")

rep("""  programmes  Programme[]
  seances     Seance[]
  evaluations Evaluation[]""", """  programmes  Programme[]
  seances     Seance[]
  evaluations Evaluation[]
  appreciationsBulletin BulletinAppreciation[] // M10""")

rep("""  evaluations           Evaluation[]
  bulletins             Bulletin[]
  evaluationsCompetence EvaluationCompetence[]""", """  evaluations           Evaluation[]
  bulletins             Bulletin[]
  evaluationsCompetence EvaluationCompetence[]
  appreciationsBulletin BulletinAppreciation[] // M10""")

rep("""  arrets       TransportArret[]
  inscriptions TransportInscription[]""", """  arrets       TransportArret[]
  inscriptions TransportInscription[]
  feuillesRoute FeuilleRoute[] // O2""")

s += """

// ====================================================================
// VIE QUOTIDIENNE (O1-O3, M8) — cantine du jour, transport journalier,
// garderie, pointage du personnel
// ====================================================================

model CantineMenu {
  id            String   @id @default(cuid())
  ecoleId       String
  ecole         Ecole    @relation(fields: [ecoleId], references: [id])
  date          DateTime
  platPrincipal String
  accompagnement String?
  dessert       String?
  allergenes    String   @default("[]") // JSON: ["gluten","arachide"]

  @@unique([ecoleId, date])
}

model CantinePresence {
  id      String  @id @default(cuid())
  ecoleId String
  ecole   Ecole   @relation(fields: [ecoleId], references: [id])
  eleveId String
  eleve   Eleve   @relation(fields: [eleveId], references: [id], onDelete: Cascade)
  date    DateTime
  present Boolean @default(true)

  @@unique([eleveId, date])
  @@index([ecoleId, date])
}

model FeuilleRoute {
  id          String         @id @default(cuid())
  ecoleId     String
  ecole       Ecole          @relation(fields: [ecoleId], references: [id])
  ligneId     String
  ligne       TransportLigne @relation(fields: [ligneId], references: [id])
  date        DateTime
  statut      String         @default("planifiee") // planifiee/en_cours/terminee/annulee
  commentaire String?
  retardMin   Int            @default(0)

  passages PassageArret[]
  @@unique([ligneId, date])
  @@index([ecoleId, date])
}

model PassageArret {
  id          String      @id @default(cuid())
  feuilleId   String
  feuille     FeuilleRoute @relation(fields: [feuilleId], references: [id], onDelete: Cascade)
  arretId     String
  heurePrevue String
  heureReelle String?
  montes      String      @default("[]") // JSON eleveIds
  descendus   String      @default("[]") // JSON eleveIds
}

model PointagePersonnel {
  id           String    @id @default(cuid())
  ecoleId      String
  ecole        Ecole     @relation(fields: [ecoleId], references: [id])
  personnelId  String
  personnel    Personnel @relation(fields: [personnelId], references: [id], onDelete: Cascade)
  date         DateTime
  heureArrivee DateTime?
  heureDepart  DateTime?
  retardMin    Int       @default(0)
  commentaire  String?

  @@unique([personnelId, date])
  @@index([ecoleId, date])
}

model GarderieInscription {
  id           String  @id @default(cuid())
  ecoleId      String
  ecole        Ecole   @relation(fields: [ecoleId], references: [id])
  eleveId      String  @unique
  eleve        Eleve   @relation(fields: [eleveId], references: [id], onDelete: Cascade)
  formule      String  @default("horaire") // horaire/forfait_mensuel
  tarifHoraire Int     @default(0) // centimes
  actif        Boolean @default(true)
}

model GarderieSession {
  id               String   @id @default(cuid())
  ecoleId          String
  ecole            Ecole    @relation(fields: [ecoleId], references: [id])
  eleveId          String
  eleve            Eleve    @relation(fields: [eleveId], references: [id], onDelete: Cascade)
  date             DateTime
  heureArrivee     DateTime
  heureDepart      DateTime?
  minutesFacturees Int?

  @@index([ecoleId, date])
}

// ====================================================================
// M7 — ACTIVITÉS EXTRASCOLAIRES / SORTIES SCOLAIRES / VOYAGES
// ====================================================================

model Activite {
  id          String   @id @default(cuid())
  ecoleId     String
  ecole       Ecole    @relation(fields: [ecoleId], references: [id])
  type        String   @default("activite") // activite/sortie/voyage
  titre       String
  description String?
  destination String?
  dateDebut   DateTime
  dateFin     DateTime
  cout        Int      @default(0) // centimes par participant
  devise      String   @default("XOF")
  capacite    Int?
  statut      String   @default("planifiee")
  creeParId   String?

  participants ActiviteParticipant[]
  @@index([ecoleId, dateDebut])
}

model ActiviteParticipant {
  id               String    @id @default(cuid())
  activiteId       String
  activite         Activite  @relation(fields: [activiteId], references: [id], onDelete: Cascade)
  eleveId          String
  eleve            Eleve     @relation(fields: [eleveId], references: [id], onDelete: Cascade)
  statut           String    @default("inscrit") // inscrit/confirme/annule
  autorisation     String    @default("en_attente") // en_attente/accordee/refusee
  dateAutorisation DateTime?
  paiementStatut   String    @default("non_exigible") // non_exigible/a_payer/payee

  @@unique([activiteId, eleveId])
}

// ====================================================================
// M10 — Appréciation par matière sur les bulletins
// ====================================================================

model BulletinAppreciation {
  id           String   @id @default(cuid())
  bulletinId   String
  bulletin     Bulletin @relation(fields: [bulletinId], references: [id], onDelete: Cascade)
  matiereId    String
  matiere      Matiere  @relation(fields: [matiereId], references: [id])
  appreciation String
  enseignantId String?

  @@unique([bulletinId, matiereId])
}

// ====================================================================
// M15 — Rapprochement bancaire : lignes de relevé ↔ paiements
// ====================================================================

model LigneReleve {
  id         String    @id @default(cuid())
  ecoleId    String
  ecole      Ecole     @relation(fields: [ecoleId], references: [id])
  date       DateTime
  montant    Int // centimes
  libelle    String
  rapprochee Boolean   @default(false)
  paiementId String?
  paiement   Paiement? @relation(fields: [paiementId], references: [id], onDelete: SetNull)

  @@index([ecoleId, date])
}
"""

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('OK — %d patchs + 11 nouveaux modèles' % n[0])
