# 📄 CATALOGUE DOCUMENTAIRE DE L'ÉCOLE
## Norme de production documentaire — en-têtes, corps, pieds de page

> **Objet** : référentiel unique de TOUS les documents produits par l'établissement.
> Chaque document suit la **charte commune** (Partie A) puis sa **structure propre** (Partie B).
> Les `code` correspondent au champ `TemplateDocument.code` de la base — production directe depuis ScolaGestion.
> Statuts : 🟢 existant dans l'outil · 🔵 à produire

---

# PARTIE A — CHARTE GRAPHIQUE COMMUNE

## A.1 L'identité institutionnelle (variables maîtresses)

| Variable | Contenu | Règle |
|---|---|---|
| `{ECOLE_NOM}` | Nom complet officiel | MAJUSCULES, police serif (ex. Playfair Display / Garamond) |
| `{ECOLE_DEVISE}` | Devise de l'établissement | Italique, petites capitales |
| `{ECOLE_ADRESSE}` | Adresse complète | 1 ligne, 9 pt |
| `{ECOLE_CONTACTS}` | Tél · email · site web | 1 ligne, 9 pt |
| `{ECOLE_IDENTIFIANTS}` | NINEA / SIRET · n° autorisation d'ouverture · affiliation | Pied de page, 7,5 pt |
| `{LOGO}` | Logo officiel | Zone 60 × 60 mm, haute résolution |
| `{ANNEE_SCOLAIRE}` | 2026-2027 | Toujours présent |
| `{REF_DOC}` | `{CODE}-{AAAA}{MM}-{N°SEQ}` ex. `BUL-202612-0184` | Traçabilité, anti-duplication |

## A.2 EN-TÊTE MAJEUR — documents officiels (bulletins, attestations, diplômes)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [LOGO]   INSTITUT LÉONARD DE VINCI                    ┌───────────┐ │
│           « Excellence • Discipline • Réussite »        │ BULLETIN  │ │
│           Année scolaire 2026-2027                      │ SCOLAIRE  │ │
│           12, av. Léopold Sédar Senghor — Dakar         │ ─────────  │ │
│           +221 33 800 00 00 · contact@vinci.sn          │ Réf. BUL- │ │
│                                                         │ 202612-   │ │
│                                                         │   0184    │ │
│                                                         └───────────┘ │
├──────────────────────────────────────────────────────────────────────┤ ← filet 2 pt couleur institutionnelle
```

- Nom de l'école : **16 pt gras serif** · devise : 10 pt italique · adresse/contacts : 9 pt gris
- Le **bloc référence** (droite, bordure fine) : type de document, n° unique, date d'émission
- Filet de séparation : 2 pt, couleur institutionnelle (défaut : vert émeraude `#047857`)

## A.3 EN-TÊTE MINEUR — documents internes (notes de service, circulaires)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [LOGO 30pt]  INSTITUT LÉONARD DE VINCI — Dakar                      │
│  NOTE DE SERVICE N° 2026-047         Dakar, le 12 septembre 2026      │
├──────────────────────────────────────────────────────────────────────┤
```
- Une seule ligne d'identité + objet du document à gauche, date de lieu à droite (style administratif français)
- Filet simple 1 pt

## A.4 EN-TÊTE FINANCIER — pièces comptables (factures, reçus)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [LOGO]   INSTITUT LÉONARD DE VINCI                                   │
│           Facturation Scolarité — NINEA 0045 882 331                  │
│                                    N° PIÈCE : FAC-202609-0231         │
│                                    Émis le 12/09/2026 · Échéance 05/10│
├──────────────────────────────────────────────────────────────────────┤
```
- Le **n° de pièce unique** domine : c'est lui qui relie facture ↔ échéance ↔ reçu ↔ écriture comptable

## A.5 PIED DE PAGE STANDARD (3 zones)

```
├──────────────────────────────────────────────────────────────────────┤
│ 12, av. L. S. Senghor — Dakar        NINEA 0045 882 331              │
│ +221 33 800 00 00 · vinci.sn         Autorisation d'ouverture        │
│ contact@vinci.sn                     n° 1247/ME/DSAGES/2019          │
│ ────────────────────────────────────────────────────────────────────│
│ Document généré par ScolaGestion · Réf. {REF_DOC} · Page X/Y    [QR] │
└──────────────────────────────────────────────────────────────────────┘
```
- **Zone gauche** : coordonnées · **Zone centre** : mentions légales/identifiants · **Zone droite** : traçabilité + QR de vérification
- Documents confidentiels (santé, RH) : bandeau rouge discret « CONFIDENTIEL — Diffusion restreinte »
- Documents officiels : zone **cachet + signature** ajoutée au-dessus du pied

## A.6 Règles typographiques générales

| Élément | Règle |
|---|---|
| Police titres | Serif (Garamond/Playfair) — sobriété académique |
| Police corps | Sans-serif lisible (Inter/Source Sans), 10,5 pt, interligne 1,4 |
| Titres internes | Petites capitales + filet court à gauche, 12 pt |
| Chiffres financiers | Alignés à droite, tabulaires, `formatXOF()` |
| Dates | « 12 septembre 2026 » (lettres) ; tableaux : JJ/MM/AAAA |
| Signatures | Toujours 2 zones : émetteur (gauche) + hiérarchie (droite), 60 mm chacune |
| Couleurs | 1 couleur institutionnelle + noir + gris — jamais plus |

---

# PARTIE B — CATALOGUE PAR DOMAINE

## DOMAINE 1 — SCOLARITÉ & PÉDAGOGIE

### 1.1 🟢 Bulletin scolaire trimestriel (`bulletin`) — collège/lycée
**En-tête** : majeur + « Trimestre 1 — Classe de Sixième A »
**Corps** :
1. **Bloc élève** : photo (facultative) · Prénom NOM · matricule · date de naissance · classe · professeur principal · régime (externe/demi-pensionnaire) · effectif de la classe
2. **Tableau des notes** : Matière | Professeur | Note de l'élève | Note la plus haute | Note la plus basse | Moyenne de la classe | Coefficient | Points
3. **Ligne de synthèse** : Moyenne générale /20 · Moyenne de la classe · **Rang : 3ᵉ / 30** · Mention (Insuffisant <10 · Passable · Assez bien ≥12 · Bien ≥14 · Très bien ≥16 · Excellent ≥18)
4. **Appréciations par matière** (2-3 lignes, cadres séparés)
5. **Appréciation générale du conseil de classe** + décision (admis/classe supérieure, redoublement proposé…)
6. **Absences** : total demi-journées · retards · absences justifiées/non justifiées
7. **Workflow signatures** : Le Professeur principal → Le Censeur (validation PP) → Le Chef d'établissement (validation direction) + dates de validation
8. **Communication** : date de publication + QR de consultation portail parent
**Pied** : standard + cachet de l'établissement sur la signature direction
**Variantes** : `bulletin_primaire` (notation A/B/C/D + compétences) · `bulletin_maternelle` (évaluations par compétence : maîtrisée/en cours/à renforcer)

### 1.2 🟢 Relevé de notes (`releve_notes`)
Bloc élève → tableau chronologique (Évaluation | Matière | Coef | Note | Moyenne classe | Date | Saisi par) → synthèse par matière (moyenne cumulée) → signature PP.
*Sans appréciations ni décision — document d'information.*

### 1.3 🔵 Attestation de scolarité (`attestation_scolarite`) — 🟢 cœur existant
**Corps (5 parties, 1 page stricte)** :
1. Titre centré : « ATTESTATION DE SCOLOLARITÉ » + n° / année scolaire
2. « Le Chef de l'établissement atteste que l'élève ci-dessous désigné(e) est régulièrement inscrit(e)… »
3. Bloc élève : Prénom NOM (majuscules) · date et lieu de naissance · matricule · classe · date d'entrée (et de sortie le cas échéant) · régime
4. « En foi de quoi, la présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit. »
5. Fait à ______, le ______ — Cachet + signature du Chef d'établissement (droite)
**Pied** : standard — « Faux et usage de faux punis par la loi »

### 1.4 🔵 Certificat de fin d'études / Diplôme (`certificat_fin_etudes`)
Style diploma : bordure décorative fine · intitulé du cycle et année · nom en grandes capitales · mention · « décerné par » · jury (noms) · cachet + signatures croisées (Chef + Président du conseil). **Papier : A4 paysage ou format diplôme.**

### 1.5 🔵 Certificat de transfert / radiation (`certificat_transfert`)
Élève + classe + motif de départ (mutation, déménagement…) + dernières notes du trimestre en cours + régime + solde de scolarité réglé OUI/NON — **bloque si solde impayé (règle métier)**.

### 1.6 🔵 Emploi du temps (`edt_classe` / `edt_enseignant`)
Grille hebdomadaire : créneaux horaires en lignes (08:00–09:00…) · jours en colonnes · chaque cellule : Matière + salle + enseignant · pauses/recréations grisées · legal : « sous réserve de modifications ».

### 1.7 🟢 PV de conseil de classe (`pv_conseil`)
Liste de présence (membres + fonction, signés) → déroulé : moyenne de classe, élèves en difficulté (décisions d'aide), félicitations (liste nominative), tableau « Élève | Moyenne | Rang | Décision » → observations → signatures (PP, Censeur, Chef).

### 1.8 🔵 Rapport d'orientation (`rapport_orientation`)
Synthèse des 2 années · moyennes par grande discipline · avis du PP · vœux de la famille (1, 2, 3) · décision du conseil d'orientation · signatures PP/Famille/Chef.

### 1.9 🔵 Liste de fournitures (`liste_fournitures`)
Par niveau : tableau Fourniture | Quantité | Obligatoire/Conseillée + manuels scolaires (titre, éditeur, ISBN) + avertissement « aucune fourniture n'est commercialisée par l'établissement ».

### 1.10 🔵 Fiche d'inscription / réinscription (`fiche_inscription`)
Élève (état civil complet, photo, niveau demandé, ancien établissement) + Parents (2 contacts, professions, personnes autorisées à récupérer l'enfant) + Santé (bref : allergies, traitement en cours — renvoi vers infirmerie pour le détail) + Déclaration sur l'honneur + Autorisations (photo, sorties, communication) + Signatures parents + Emplacement cachet.

### 1.11 🔵 Convocation au conseil de classe (`convocation_conseil`) — 🟢 cœur existant
Destinataire + fonction · date/heure/salle · ordre du jour numéroté · convocation à caractère obligatoire · signature Censeur.

---

## DOMAINE 2 — VIE SCOLAIRE & DISCIPLINE

### 2.1 🔵 Note de service (`note_service`)
**En-tête mineur**. **Corps** : N° + objet (gras, centré, souligné) · « La Direction de {ECOLE_NOM} porte à la connaissance de… » · destinataires (À : personnel enseignant / parents / élèves) · corps numéroté (art. 1, art. 2…) · date d'application · **Pied** : « La Directrice / Le Directeur » + signature + diffusion (liste de distribution en dernière page).

### 2.2 🔵 Note d'information (`note_information`)
Identique note de service, sans caractère contraignant — verbes : « informe de… ».

### 2.3 🔵 Circulaire aux parents (`circulaire_parents`)
En-tête mineur + « AUX PARENTS D'ÉLÈVES » · objet · corps simple · **detachable reply slip** (coupon-réponse à retourner signé avec zone élève/classe) · signatures.

### 2.4 🔵 Convocation élève/parent (`convocation_eleve`)
Élève + classe + motif (entretien discipline/résultats) · date/heure · présence du parent obligatoire · possibilté de report · signature Vie scolaire.

### 2.5 🔵 Rapport d'incident (`rapport_incident`) — 🟢 données existantes
Élève(s) concerné(s) + classe · date/heure/lieu précis · **description factuelle** (qui-quoi-comment, sans jugement) · circonstances atténuantes · témoin(s) · gravité (léger/moyen/grave) · mesure immédiate prise · suite donnée (commission éducative ?) · signature déclarant + visa Censeur.

### 2.6 🔵 Avertissement / blâme (`avertissement`)
Référence à l'incident + faits constatés · rappel de l'article du règlement intérieur violé · sanction prononcée (avertissement oral/écrit/blâme) · date · **signatures : élève + parent (pour prise de connaissance)** + Censeur.

### 2.7 🔵 Décision d'exclusion temporaire (`exclusion_temporaire`)
Motif + référence incident · durée (jours, dates exactes de sortie/retour) · conditions de retour (engagement signé) · références réglementaires · signatures Chef + parent.

### 2.8 🔵 Justificatif d'absence (`justificatif_absence`)
Élève + classe · date(s)/heure(s) d'absence · motif (maladie, raison familiale…) · justificatif joint OUI/NON · parent + signature · zone visa vie scolaire (accepté/refusé).

### 2.9 🔵 Autorisation de sortie exceptionnelle (`autorisation_sortie`) — 🟢 cœur existant
Élève · date/heure de sortie · destination motivée · accompagnateur autorisé (nom + pièce d'identité) · **double validation** (parent + direction) · validity duration limitée.

### 2.10 🔵 Autorisation parentale droit à l'image (`autorisation_image`) — 🟢 modèle existant
Élève · période · types d'usages autorisés (site, réseaux, presse — cases distinctes) · droit de retrait · signature parent.

### 2.11 🔵 Règlement intérieur — engagement signé (`engagement_reglement`)
« J'ai pris connaissance du règlement intérieur et m'engage à le respecter » — élève (signé) + parent (signé) + date · version du règlement (v2026).

---

## DOMAINE 3 — FINANCES & SCOLARITÉ

### 3.1 🟢 Facture / échéancier de scolarité (`facture_scolarite`)
**En-tête financier**. **Corps** : Bloc élève + responsable de paiement → tableau : Nature (frais d'inscription, 1ʳᵉ tranche, cantine, transport…) | Montant | Échéance | Statut → **Total dû / Déjà payé / Restant à payer** (encadré) → modes de paiement + référence client (matricule) → mention pénalités de retard.
**Pied** : + mentions légales de facturation + « Ordre comptable n° {ECRITURE_REF} ».

### 3.2 🟢 Reçu de paiement (`recu_paiement`)
**En-tête financier** + N° REÇU proéminent. Reçu de la famille {NOM} · la somme de **{montant XOF en chiffres et en lettres}** · en règlement de {libellé} · mode (espèces/chèque n°/virement/mobile money + référence transaction) · payé par · encaissé par · date · cachet.
*Encaissement impossible sans partenaire de paiement → tout reçu est relié à une écriture.*

### 3.3 🟢 Échéancier personnalisé (`echeancier_personnalise`)
Tranches négociées : N° | Montant | Date d'échéance | Statut (payé/partiel/impayé) — tableau signé par la direction ET le parent (accord des deux parties).

### 3.4 🟢 Lettre de relance impayé (`relance_impaye`)
3 niveaux de fermeté : relance courtoise (rappel) · relance 2 (invitation à rencontrer la direction) · mise en demeure (dernier avis avant suspension de services) · solde détaillé + date limite + contact.

### 3.5 🔵 Attestation de paiement / de non-endettement (`attestation_paiement`)
Solde : entièrement réglé au {date} — OU — plan en cours conforme. Génération **refusée si impayé non négocié** (règle métier).

### 3.6 🔵 Notification de bourse / remise fratrie (`notification_remise`) — 🟢 moteur existant
Enfant(s) concerné(s) · type de remise (fratrie/bourse d'excellence/sociale) · **% appliqué et base de calcul** · date d'effet · cumul autorisé plafonné · signature direction.

### 3.7 🔵 Avoir (`avoir_scolarite`)
Référence à la facture/reçu d'origine · motif (erreur, départ, remboursement) · montant crédité · imputation sur prochaine échéance ou remboursement.

### 3.8 🟢 État des recettes-dépenses (`etat_recettes_depenses`) — 🟢 analytics existant
Période · tableau recettes par nature (scolarité, cantine, transport, activités) · tableau dépenses par nature · **solde de période + cumul** · par classe de recouvrement · graphiques (pareto, évolution 12 mois) · signature direction + comptable.

### 3.9 🔵 Budget prévisionnel (`budget_previsionnel`)
Ligne | Poste | Réalisé N-1 | Prévu N | Écart | % — par service, avec notes de lecture.

### 3.10 🟢 Ordre de virement de paie (`ordre_virement`) — 🟢 export existant
Fichier bancaire + édition PDF : Bénéficiaire + RIB masqué + net à payer + total général (contrôle : Σ virements = Σ nets des bulletins payés).

---

## DOMAINE 4 — RH & PERSONNEL

### 4.1 🔵 Contrat de travail (`contrat_travail`)
**2 exemplaires** mentionnés · type (CDI/CDD/vacataire/stagiaire) + motif CDD · fonctions + fiche de poste annexée · classification · rémunération brute + périodicité · période d'essai · dates début/fin · lieu · clauses (confidentialité, non-concurrence facultative, mobilité) · articles légaux de référence · **signatures en double** (employeur + salarié) + paraphes chaque page.

### 4.2 🔵 Avenant au contrat (`avenant`)
Référence contrat d'origine + nature de la modification (fonction, salaire, temps) · « toutes les autres clauses demeurent inchangées » · double signature.

### 4.3 🟢 Bulletin de paie (`bulletin_paie`)
**En-tête employeur** (identifiants légaux) + salarié (matricule, fonction, ancienneté) → tableau : Libellé | Base | Taux | Gain | Retenu (salaire base, primes récurrentes, heures sup, cotisations employeur/salarié) → **NET À PAYER** (encadré, chiffres + lettres) → cumuls annuels → « établi le {date}, à conserver sans limitation de temps » · virement n°.

### 4.4 🔵 Certificat de travail (`certificat_travail`)
Délivré obligatoirement à la fin du contrat · fonction(s) exercée(s) · période exacte · « délivré à l'intéressé pour lui servir ce que de droit » · cachet + signature — **aucune mention disciplinaire** (neutralité légale).

### 4.5 🔵 Attestation de travail / de salaire (`attestation_travail`)
Deux variantes : simple (emploi + fonction) · ou avec rémunération (pour bail, crédit : moyenne des 3 derniers mois) — génération contrôlée par permission RH.

### 4.6 🔵 Demande de congé / autorisation d'absence (`demande_conge`)
Demandeur + fonction · type (annuel/maladie/exceptionnel/non payé) · dates · solde actuel · **visa hiérarchique : accord/refuse +签字 date** · zone RH (décompte).

### 4.7 🔵 Compte rendu d'entretien annuel (`evaluation_personnel`)
Grille de critères notés · points forts · axes d'amélioration · objectifs N+1 (SMART) · formation envisagée · signatures évaluateur + évalué (visa, pas accord).

### 4.8 🔵 Avertissement disciplinaire personnel (`avertissement_personnel`)
Facts + reference article · sanction · signature — même trame que 2.6, zone RH.

---

## DOMAINE 5 — SANTÉ & BIEN-ÊTRE

### 5.1 🔵 Fiche de santé scolaire (`fiche_sante`) — 🟢 données chiffrées AES-256
**En-tête : bandeau CONFIDENTIEL rouge**. Antécédents · allergies (encadré rouge si sévère) · conditions chroniques · traitement en cours · vaccinations (tableau daté) · contacts d'urgence (2) · médecin traitant · personne habilitée à récupérer en urgence · consentement soins · signature parent. **Accès : infirmerie + direction uniquement (journalisé).**

### 5.2 🔵 Rapport de passage à l'infirmerie (`rapport_infirmerie`) — 🟢 données existantes
Élève · date/heure entrée-sortie · motif · symptômes · soins prodigués · issue (retour classe / domicile / hôpital) · **parents notifiés à {heure}** · signature infirmier(ère).

### 5.3 🔵 Déclaration d'accident scolaire (`declaration_accident`)
Identité victime + témoins · circonstances (chronologie) · lésions constatées · secours · prévention (mesures correctrices à mettre en place) · visés : Chef + infirmerie + parent informé.

### 5.4 🔵 Protocole d'urgence individuel (`protocole_urgence`)
Élève + pathologie (asthme, diabète, allergie anaphylaxie…) · signes d'alerte · **gestes à faire / à ne pas faire** · médicament d'urgence (lieu de stockage) · contacts — affichage infirmerie (version anonymisée pour la salle de classe).

### 5.5 🔵 Autorisation d'administration de médicament (`autorisation_medicament`)
Médicament + posologie + horaires · durée · signature parent + visa infirmerie.

---

## DOMAINE 6 — COMMUNICATION & ÉVÉNEMENTS

### 6.1 🔵 Invitation à une cérémonie (`invitation_ceremonie`)
Style soigné : motif (remise de diplômes, cérémonie de rentrée) · date/heure/lieu · programme · dress code éventuel · RSVP avant le {date} (contact) · le Chef d'établissement.

### 6.2 🔵 Convocation réunion parents-professeurs (`convocation_reunion_parents`)
Individuelle : vos créneaux réservés (table) — ou collective : programme par salle/niveau · parking, entrée · coupon réponse.

### 6.3 🔵 Compte rendu de réunion (`compte_rendu_reunion`)
Type + date + participants (signés) + ordre du jour → délibérations numérotées → **décisions** (tableau : décision | responsable | échéance) → prochaine réunion → signatures.

### 6.4 🔵 Lettre de félicitations (`lettre_felicitations`)
À l'élève + copie aux parents : motif (moyenne ≥ {seuil}, progrès remarquable, comportement exemplaire) · message personnalisé du PP · signature — **générée automatiquement depuis les seuils du cockpit direction.**

### 6.5 🔵 Lettre d'encouragement aux familles d'élèves en difficulté (`lettre_accompagnement`)
Bilan chiffré sobre + plan d'aide proposé (remédiation, tutorat) + invitation à RDV — **ton constructif, jamais stigmatisant.**

### 6.6 🔵 Newsletter de l'établissement (`newsletter`)
En-tête graphique élargi · sommaire · une (fait marquant) · réussites · agenda à venir · contacts — diffusion trimestrielle.

### 6.7 🔵 Affichette événement (`affiche_evenement`)
Format A3 : visuel ⅔ page · titre fort · 5 informations clés (quoi/quand/où/qui/contact) · QR inscription.

---

## DOMAINE 7 — ADMISSIONS & EXAMENS

### 7.1 🔵 Confirmation d'admission (`confirmation_admission`) — 🟢 workflow existant
Félicitations + classe et niveau attribués · **liste des pièces à fournir avec échéance** · conditions financières (frais d'inscription à régler avant le {date} — place non garantie sinon) · cachet.

### 7.2 🔵 Convocation à un test d'admission (`convocation_test`) — 🟢 cœur existant
Date/heure/durée/salle · disciplines évaluées · matériel à apporter · pièce d'identité obligatoire · absence = renoncement.

### 7.3 🔵 Notification de résultat d'admission (`notification_resultat_admission`)
Admis(e) / liste d'attente (rang) / non retenu(e) — courtoisie et motivé uniquement si demandé · contact pour suite.

### 7.4 🔵 Convocation aux examens officiels (`convocation_examen`) — 🟢 données existantes
Candidat + n° table + salle + horaires précis + **pièces OBLIGATOIRES** (CNI, convocation) + règlement (retard, fraude) · signatures.

### 7.5 🔵 Certificat de réussite à un examen interne (`certificat_reussite`)
Examen + session + note/mention · jury (composition nominative) · cachet.

### 7.6 🔵 Relevé d'identité bancaire établissement / attestation RIB (`attestation_rib`)
Coordonnées bancaires officielles de l'école pour virements des familles — mention anti-fraude « vérifiez ces coordonnées par téléphone avant tout paiement ».

---

## DOMAINE 8 — SERVICES (CANTINE, TRANSPORT, GARDE)

### 8.1 🔵 Fiche d'inscription cantine (`inscription_cantine`) — 🟢 moteur existant
Élève · régimes (allergies signalées → **encadré rouge automatique**) · jours de présence hebdomadaires · tarif journalier × calcul mensuel · signature parent.

### 8.2 🔵 Menu hebdomadaire cantine (`menu_cantine`) — 🟢 données existantes
Tableau jour × plats (entrée/plat/dessert) + **allergènes en évidence** + équilibre (féculents/légumes/protéines badges) + version affichée A3.

### 8.3 🔵 Carte de transport (`carte_transport`) — 🟢 données existantes
Format carte : photo + identité + ligne + arrêt + horaires montée/descente + validity + QR de vérification + « non transférable ».

### 8.4 🔵 Planning de garderie (`planning_garderie`) — 🟢 moteur existant
Semaine type + tarification à la minute + inscriptions ponctuelles (date, heures, coût calculé).

### 8.5 🔵 Facture de services (`facture_services`) — 🟢 moteur existant
Trame 3.1 spécialisée : cantine (repas × jours) · transport (mensuel) · garderie (minutes) · avec détail des consommations jour par jour.

### 8.6 🔵 Autorisation de sortie sorties pédagogiques / voyages (`autorisation_voyage`)
Destination + dates + encadrants (noms) + hébergement/restauration + **risques spécifiques détaillés** + trousse/materiel + attestation d'assurance + urgence médicale + coût et échéancier · double signature parent · visa direction.

---

# PARTIE C — RÈGLES TRANSVERSES DE PRODUCTION

| Règle | Détail |
|---|---|
| **Numérotation** | `{CODE}-{AAAA}{MM}-{SEQ}` continue par type, jamais réutilisée — anti-fraude |
| **Traçabilité** | Chaque PDF généré est journalisé (`DocumentGenere`) : qui, quand, pour qui, version |
| **Versionning** | Modification de contenu → version N+1, l'ancienne reste archivée |
| **Verrous métier** | Attestation de paiement refusée si impayé · certificat de transfert bloqué si solde · liste de sorties sans autorisation parentale = avertissement |
| **QR de vérification** | Chaque document officiel embarque un QR pointant vers sa vérification (réf + hachage) — anti-falsification |
| **Impression** | A4 portrait par défaut · marges 15 mm · diplôme : A4 paysage · carton : 85×54 mm |
| **Accessibilité** | Contraste AA · taille min. 9 pt · pas d'information portée par la couleur seule |
| **Bilinguisme** | Variantes EN disponibles pour : attestations, invitations, bulletin (champ `langue`) |
| **Confidentialité** | Santé + RH : bandeau CONFIDENTIEL, accès journalisé, chiffrement au repos |
| **Conservation** | Bulletins 50 ans · pièces comptables 10 ans · RH 5 ans post-départ · santé 10 ans |

---

## 📊 Récapitulatif

| Domaine | Documents | Existant 🟢 | À produire 🔵 |
|---|---|---|---|
| 1. Scolarité & pédagogie | 11 | 4 | 7 |
| 2. Vie scolaire & discipline | 11 | 2 | 9 |
| 3. Finances | 10 | 5 | 5 |
| 4. RH & personnel | 8 | 1 | 7 |
| 5. Santé | 5 | 1 | 4 |
| 6. Communication & événements | 7 | 0 | 7 |
| 7. Admissions & examens | 6 | 2 | 4 |
| 8. Services | 6 | 4 | 2 |
| **TOTAL** | **64** | **19** | **45** |
