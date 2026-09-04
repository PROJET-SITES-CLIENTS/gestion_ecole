--
-- PostgreSQL database dump
--

\restrict swIQyyhvmo7Wq2j5ndWNKtlndUoNvPeGpvLUosYuK5oHN2jLOLdNTnJ6qmslnzz

-- Dumped from database version 18.6 (c5250a2)
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA neon_auth;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" uuid NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: invitation; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.invitation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    email text NOT NULL,
    role text,
    status text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "inviterId" uuid NOT NULL
);


--
-- Name: jwks; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.jwks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone
);


--
-- Name: member; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.member (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);


--
-- Name: organization; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.organization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    "createdAt" timestamp with time zone NOT NULL,
    metadata text
);


--
-- Name: project_config; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.project_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    endpoint_id text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trusted_origins jsonb NOT NULL,
    social_providers jsonb NOT NULL,
    email_provider jsonb,
    email_and_password jsonb,
    allow_localhost boolean NOT NULL,
    plugin_configs jsonb,
    webhook_config jsonb
);


--
-- Name: session; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" uuid NOT NULL,
    "impersonatedBy" text,
    "activeOrganizationId" text
);


--
-- Name: user; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone
);


--
-- Name: verification; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Abonnement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Abonnement" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "planId" text NOT NULL,
    "dateDebut" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateFin" timestamp(3) without time zone,
    statut text DEFAULT 'essai'::text NOT NULL,
    "modeFacturation" text DEFAULT 'mensuel'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Activite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Activite" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    type text DEFAULT 'activite'::text NOT NULL,
    titre text NOT NULL,
    description text,
    destination text,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL,
    cout integer DEFAULT 0 NOT NULL,
    devise text DEFAULT 'XOF'::text NOT NULL,
    capacite integer,
    statut text DEFAULT 'planifiee'::text NOT NULL,
    "creeParId" text
);


--
-- Name: ActiviteParticipant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActiviteParticipant" (
    id text NOT NULL,
    "activiteId" text NOT NULL,
    "eleveId" text NOT NULL,
    statut text DEFAULT 'inscrit'::text NOT NULL,
    autorisation text DEFAULT 'en_attente'::text NOT NULL,
    "dateAutorisation" timestamp(3) without time zone,
    "paiementStatut" text DEFAULT 'non_exigible'::text NOT NULL
);


--
-- Name: Amenagement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Amenagement" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    "besoinSpecifiqueId" text,
    "typeAmenagement" text NOT NULL,
    description text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone,
    "valideParId" text
);


--
-- Name: AnneeScolaire; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AnneeScolaire" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    libelle text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL,
    active boolean DEFAULT false NOT NULL
);


--
-- Name: Annonce; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Annonce" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    titre text NOT NULL,
    contenu text NOT NULL,
    "auteurId" text,
    "datePublication" timestamp(3) without time zone,
    "dateExpiration" timestamp(3) without time zone,
    statut text DEFAULT 'brouillon'::text NOT NULL,
    cible text NOT NULL,
    "cibleIds" text,
    pinned boolean DEFAULT false NOT NULL,
    "pieceJointeUrl" text
);


--
-- Name: AnnonceLecture; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AnnonceLecture" (
    id text NOT NULL,
    "annonceId" text NOT NULL,
    "utilisateurId" text NOT NULL,
    "dateLecture" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ApiToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApiToken" (
    id text NOT NULL,
    "ecoleId" text,
    nom text NOT NULL,
    description text,
    "tokenHash" text NOT NULL,
    prefix text NOT NULL,
    scopes text DEFAULT '[]'::text NOT NULL,
    "tauxLimiteHoraire" integer DEFAULT 1000 NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateExpiration" timestamp(3) without time zone,
    "dernierUsage" timestamp(3) without time zone,
    "totalRequettes" integer DEFAULT 0 NOT NULL
);


--
-- Name: ApiTokenLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApiTokenLog" (
    id integer NOT NULL,
    "apiTokenId" text NOT NULL,
    endpoint text NOT NULL,
    methode text NOT NULL,
    statut integer NOT NULL,
    "tempsReponse" integer NOT NULL,
    "adresseIp" text,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ApiTokenLog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ApiTokenLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ApiTokenLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ApiTokenLog_id_seq" OWNED BY public."ApiTokenLog".id;


--
-- Name: AttributionManuel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttributionManuel" (
    id text NOT NULL,
    "manuelScolaireId" text NOT NULL,
    "eleveId" text NOT NULL,
    "dateAttribution" timestamp(3) without time zone NOT NULL,
    "dateRestitutionPrevue" timestamp(3) without time zone,
    "etatRemise" text NOT NULL,
    "etatRetour" text,
    statut text DEFAULT 'en_cours'::text NOT NULL,
    "echeanceFraisGenereeId" text
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id integer NOT NULL,
    "ecoleId" text,
    "utilisateurId" text,
    action text NOT NULL,
    "cibleType" text,
    "cibleId" text,
    details text,
    "adresseIp" text,
    "userAgent" text,
    "dateAction" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditLog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AuditLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AuditLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AuditLog_id_seq" OWNED BY public."AuditLog".id;


--
-- Name: AutorisationSortie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AutorisationSortie" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    "nomPersonneAutorisee" text NOT NULL,
    "lienAvecEleve" text,
    telephone text,
    "photoUrl" text,
    active boolean DEFAULT true NOT NULL,
    "valideeParId" text
);


--
-- Name: AvancementProgramme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AvancementProgramme" (
    id text NOT NULL,
    "chapitreId" text NOT NULL,
    "classeId" text NOT NULL,
    "enseignantId" text NOT NULL,
    pourcentage double precision DEFAULT 0 NOT NULL,
    "dateMaj" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    commentaire text
);


--
-- Name: AvoirEcole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AvoirEcole" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    numero text NOT NULL,
    "dateEmission" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    montant integer NOT NULL,
    devise text NOT NULL,
    motif text NOT NULL,
    "paiementLieId" text,
    "factureFournisseurId" text,
    statut text DEFAULT 'emis'::text NOT NULL,
    "emisParId" text
);


--
-- Name: AvoirSaas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AvoirSaas" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "factureSaasLieeId" text,
    numero text NOT NULL,
    "dateEmission" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    montant integer NOT NULL,
    devise text NOT NULL,
    motif text NOT NULL,
    statut text DEFAULT 'emis'::text NOT NULL,
    "stripeCreditNoteId" text
);


--
-- Name: Batiment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Batiment" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    nom text NOT NULL,
    adresse text,
    "nombreEtages" integer DEFAULT 1 NOT NULL,
    "accessibilitePMR" boolean DEFAULT false NOT NULL,
    "dateConstruction" timestamp(3) without time zone,
    "dateMaj" timestamp(3) without time zone NOT NULL
);


--
-- Name: BesoinSpecifique; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BesoinSpecifique" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    "dateDiagnostic" timestamp(3) without time zone,
    "documentJustificatifUrl" text,
    confidentiel boolean DEFAULT true NOT NULL,
    "creeLe" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: BiblioLivre; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BiblioLivre" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    isbn text,
    titre text NOT NULL,
    auteur text,
    editeur text,
    "anneePublication" integer,
    "exemplairesTotal" integer NOT NULL,
    "exemplairesDisponibles" integer NOT NULL,
    categorie text,
    cote text
);


--
-- Name: BiblioPret; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BiblioPret" (
    id text NOT NULL,
    "livreId" text NOT NULL,
    "eleveId" text NOT NULL,
    "datePret" timestamp(3) without time zone NOT NULL,
    "dateRetourPrevue" timestamp(3) without time zone NOT NULL,
    "dateRetourEffective" timestamp(3) without time zone,
    statut text DEFAULT 'en_cours'::text NOT NULL,
    "penaliteGeneree" integer DEFAULT 0 NOT NULL
);


--
-- Name: Budget; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Budget" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "anneeScolaireId" text NOT NULL,
    libelle text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL,
    statut text DEFAULT 'brouillon'::text NOT NULL,
    "valideParId" text,
    "dateValidation" timestamp(3) without time zone
);


--
-- Name: Bulletin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Bulletin" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    "classeId" text NOT NULL,
    "periodeId" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    statut text DEFAULT 'en_construction'::text NOT NULL,
    moyennes text,
    "moyenneGenerale" double precision,
    rang integer,
    "appreciationGenerale" text,
    "decisionConseil" text,
    "pdfUrl" text,
    "creeParId" text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateValidationPp" timestamp(3) without time zone,
    "validePpParId" text,
    "dateValidationDirection" timestamp(3) without time zone,
    "valideDirectionParId" text,
    "datePublication" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BulletinAppreciation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BulletinAppreciation" (
    id text NOT NULL,
    "bulletinId" text NOT NULL,
    "matiereId" text NOT NULL,
    appreciation text NOT NULL,
    "enseignantId" text,
    "periodeId" text
);


--
-- Name: BulletinPaie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BulletinPaie" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "personnelId" text NOT NULL,
    periode text NOT NULL,
    "salaireBrut" integer NOT NULL,
    "salaireNet" integer NOT NULL,
    "cotisationsTotales" integer NOT NULL,
    "retenuesTotales" integer NOT NULL,
    "primesTotales" integer NOT NULL,
    "netAPayer" integer NOT NULL,
    devise text NOT NULL,
    statut text DEFAULT 'brouillon'::text NOT NULL,
    "dateEdition" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateValidation" timestamp(3) without time zone,
    "datePaiement" timestamp(3) without time zone,
    "valideParId" text,
    "pdfUrl" text
);


--
-- Name: CahierTexte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CahierTexte" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "classeId" text NOT NULL,
    "matiereId" text,
    "enseignantId" text NOT NULL,
    "periodeId" text,
    statut text DEFAULT 'actif'::text NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CalendrierScolaire; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CalendrierScolaire" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "anneeScolaireId" text NOT NULL,
    type text NOT NULL,
    libelle text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL
);


--
-- Name: Candidature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Candidature" (
    id text NOT NULL,
    "offreId" text NOT NULL,
    nom text NOT NULL,
    prenom text NOT NULL,
    email text NOT NULL,
    telephone text,
    "cvUrl" text,
    "lettreMotivation" text,
    source text NOT NULL,
    "dateReception" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    statut text DEFAULT 'recue'::text NOT NULL,
    "etapeActuelle" text
);


--
-- Name: CandidatureAdmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CandidatureAdmission" (
    id text NOT NULL,
    "sourceIp" text,
    "ecoleId" text NOT NULL,
    "niveauId" text,
    nom text NOT NULL,
    prenom text NOT NULL,
    "dateNaissance" timestamp(3) without time zone NOT NULL,
    "lieuNaissance" text,
    sexe text,
    email text NOT NULL,
    telephone text,
    "parentNom" text,
    "parentTelephone" text,
    statut text DEFAULT 'soumis'::text NOT NULL,
    "dateSoumission" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateDecision" timestamp(3) without time zone,
    "parcoursAnterieur" text,
    "etablissementOrigine" text,
    "dossierComplet" boolean DEFAULT false NOT NULL,
    "notesEntretien" text
);


--
-- Name: CantineInscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CantineInscription" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    "classeId" text NOT NULL,
    "anneeScolaireId" text NOT NULL,
    "joursSemaine" text NOT NULL,
    "tarifJournalier" integer NOT NULL,
    actif boolean DEFAULT true NOT NULL
);


--
-- Name: CantineMenu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CantineMenu" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "platPrincipal" text NOT NULL,
    accompagnement text,
    dessert text,
    allergenes text DEFAULT '[]'::text NOT NULL
);


--
-- Name: CantinePresence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CantinePresence" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    present boolean DEFAULT true NOT NULL
);


--
-- Name: Chapitre; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Chapitre" (
    id text NOT NULL,
    "programmeId" text NOT NULL,
    titre text NOT NULL,
    ordre integer NOT NULL,
    "volumeHorairePrevu" integer,
    contenu text,
    ressources text
);


--
-- Name: Classe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Classe" (
    id text NOT NULL,
    "niveauId" text NOT NULL,
    "anneeScolaireId" text NOT NULL,
    "ecoleId" text NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL,
    "capaciteMax" integer,
    "enseignantPrincipalId" text
);


--
-- Name: CommandeFournisseur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommandeFournisseur" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "fournisseurId" text NOT NULL,
    numero text NOT NULL,
    "dateCommande" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateLivraisonPrevue" timestamp(3) without time zone,
    "dateLivraisonEffective" timestamp(3) without time zone,
    "montantTotal" integer NOT NULL,
    devise text NOT NULL,
    statut text DEFAULT 'brouillon'::text NOT NULL,
    "valideeParId" text
);


--
-- Name: Competence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Competence" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "cycleId" text NOT NULL,
    "matiereId" text,
    libelle text NOT NULL,
    ordre integer NOT NULL
);


--
-- Name: CompteComptable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompteComptable" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    numero text NOT NULL,
    libelle text NOT NULL,
    type text NOT NULL,
    parent text,
    solde integer DEFAULT 0 NOT NULL,
    devise text NOT NULL,
    actif boolean DEFAULT true NOT NULL
);


--
-- Name: ConfigurationPaie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConfigurationPaie" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "tauxEmployeur" double precision DEFAULT 0.084 NOT NULL,
    "tauxSalarie" double precision DEFAULT 0.0524 NOT NULL,
    "primesRecurrentes" text DEFAULT '[]'::text NOT NULL,
    "majParId" text,
    "dateMaj" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Conge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Conge" (
    id text NOT NULL,
    "personnelId" text NOT NULL,
    type text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL,
    statut text DEFAULT 'demande'::text NOT NULL,
    motif text,
    "justificatifUrl" text,
    "traiteParId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ConseilClasse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConseilClasse" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "classeId" text NOT NULL,
    "periodeId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    salle text,
    statut text DEFAULT 'planifie'::text NOT NULL,
    "compteRendu" text,
    "presidentId" text
);


--
-- Name: ConsentementCommunication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConsentementCommunication" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "utilisateurId" text,
    "eleveId" text,
    canal text NOT NULL,
    accord boolean DEFAULT false NOT NULL,
    "dateAccord" timestamp(3) without time zone,
    "dateRetrait" timestamp(3) without time zone,
    motif text
);


--
-- Name: ConsentementImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConsentementImage" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    accord boolean DEFAULT false NOT NULL,
    usage text NOT NULL,
    "dateAccord" timestamp(3) without time zone,
    "valideParParentId" text,
    duree text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateMaj" timestamp(3) without time zone NOT NULL
);


--
-- Name: ConventionStage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConventionStage" (
    id text NOT NULL,
    "stageId" text NOT NULL,
    "numeroConvention" text,
    "dateSignature" timestamp(3) without time zone,
    "signeParEleve" boolean DEFAULT false NOT NULL,
    "signeParEcole" boolean DEFAULT false NOT NULL,
    "signeParEntreprise" boolean DEFAULT false NOT NULL,
    "fichierUrl" text,
    statut text DEFAULT 'brouillon'::text NOT NULL
);


--
-- Name: Conversation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Conversation" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    titre text NOT NULL,
    type text DEFAULT 'direct'::text NOT NULL,
    "creeParId" text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dernierMessageAt" timestamp(3) without time zone
);


--
-- Name: ConversationParticipant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConversationParticipant" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "utilisateurId" text NOT NULL,
    role text DEFAULT 'membre'::text NOT NULL,
    "dateAjout" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dernierLectureAt" timestamp(3) without time zone,
    archive boolean DEFAULT false NOT NULL
);


--
-- Name: CotisationSociale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CotisationSociale" (
    id text NOT NULL,
    "bulletinId" text NOT NULL,
    libelle text NOT NULL,
    assiette integer NOT NULL,
    "tauxEmployeur" double precision NOT NULL,
    "tauxSalarie" double precision NOT NULL,
    "partEmployeur" integer NOT NULL,
    "partSalarie" integer NOT NULL
);


--
-- Name: CreneauHebdo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CreneauHebdo" (
    id text NOT NULL,
    "emploiTempsId" text NOT NULL,
    "jourSemaine" integer NOT NULL,
    "heureDebut" text NOT NULL,
    "heureFin" text NOT NULL,
    "salleId" text,
    "matiereId" text,
    "enseignantId" text,
    "classeId" text,
    type text DEFAULT 'cours'::text NOT NULL
);


--
-- Name: CreneauRdv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CreneauRdv" (
    id text NOT NULL,
    "personnelId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "heureDebut" text NOT NULL,
    "heureFin" text NOT NULL,
    statut text DEFAULT 'disponible'::text NOT NULL,
    lieu text NOT NULL,
    "lienVisio" text
);


--
-- Name: Cycle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Cycle" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL,
    ordre integer NOT NULL,
    "modeEvaluation" text DEFAULT 'chiffre'::text NOT NULL
);


--
-- Name: DeliberationConseil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DeliberationConseil" (
    id text NOT NULL,
    "conseilId" text NOT NULL,
    "eleveId" text NOT NULL,
    decision text NOT NULL,
    mention text,
    "appreciationGenerale" text,
    "objectifSuivant" text,
    avis text
);


--
-- Name: DemandeEffacement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DemandeEffacement" (
    id text NOT NULL,
    "ecoleId" text,
    "utilisateurId" text,
    "cibleType" text NOT NULL,
    "cibleId" text NOT NULL,
    motif text NOT NULL,
    description text,
    statut text DEFAULT 'recu'::text NOT NULL,
    "dateDemande" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateTraitement" timestamp(3) without time zone,
    "traiteParId" text,
    "donneesAnonymisees" text
);


--
-- Name: Depense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Depense" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    categorie text NOT NULL,
    description text NOT NULL,
    montant integer NOT NULL,
    devise text NOT NULL,
    "dateDepense" timestamp(3) without time zone NOT NULL,
    fournisseur text,
    "justificatifUrl" text,
    "creeParId" text,
    validee boolean DEFAULT false NOT NULL,
    "valideeParId" text,
    "dateValidation" timestamp(3) without time zone,
    annulee boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Devoir; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Devoir" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "classeId" text NOT NULL,
    "matiereId" text,
    "enseignantId" text NOT NULL,
    intitule text NOT NULL,
    description text,
    "dateAssignation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateRendu" timestamp(3) without time zone NOT NULL,
    sur double precision DEFAULT 20 NOT NULL,
    coefficient double precision DEFAULT 1 NOT NULL,
    type text DEFAULT 'devoir'::text NOT NULL,
    "pieceJointeUrl" text,
    statut text DEFAULT 'assigne'::text NOT NULL,
    "cahierTexteId" text
);


--
-- Name: Dispense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Dispense" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    "matiereId" text,
    motif text NOT NULL,
    description text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone,
    "justificatifUrl" text,
    statut text DEFAULT 'demandee'::text NOT NULL,
    "valideParId" text,
    "dateValidation" timestamp(3) without time zone
);


--
-- Name: DocumentEleve; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DocumentEleve" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    type text NOT NULL,
    "fichierUrl" text NOT NULL,
    confidentiel boolean DEFAULT false NOT NULL,
    "dateAjout" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ajouteParId" text NOT NULL
);


--
-- Name: DocumentGenere; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DocumentGenere" (
    id text NOT NULL,
    "ecoleId" text,
    "templateId" text,
    "cibleType" text NOT NULL,
    "cibleId" text NOT NULL,
    titre text NOT NULL,
    format text DEFAULT 'pdf'::text NOT NULL,
    "fichierUrl" text NOT NULL,
    "tailleOctets" integer,
    version integer DEFAULT 1 NOT NULL,
    "genereParId" text,
    "dateGeneration" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "hashContenu" text
);


--
-- Name: DomainePersonnalise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DomainePersonnalise" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    domaine text NOT NULL,
    verifie boolean DEFAULT false NOT NULL,
    "enAttente" boolean DEFAULT true NOT NULL,
    "enregistrementCname" text,
    "certificatSSL" text,
    "certificatExpireLe" timestamp(3) without time zone,
    "dateAjout" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateVerification" timestamp(3) without time zone
);


--
-- Name: EcheanceFrais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EcheanceFrais" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    "fraisId" text NOT NULL,
    montant integer NOT NULL,
    remise integer DEFAULT 0 NOT NULL,
    "motifRemise" text,
    devise text NOT NULL,
    "dateEcheance" timestamp(3) without time zone NOT NULL,
    "montantPaye" integer DEFAULT 0 NOT NULL,
    statut text DEFAULT 'impayee'::text NOT NULL,
    source text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Ecole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Ecole" (
    id text NOT NULL,
    nom text NOT NULL,
    slug text NOT NULL,
    pays text DEFAULT 'SN'::text NOT NULL,
    devise text DEFAULT 'XOF'::text NOT NULL,
    "fuseauHoraire" text DEFAULT 'Africa/Dakar'::text NOT NULL,
    "logoUrl" text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    statut text DEFAULT 'essai'::text NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "planCourantId" text
);


--
-- Name: EcritureComptable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EcritureComptable" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "journalId" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "numeroPiece" text,
    libelle text NOT NULL,
    statut text DEFAULT 'brouillon'::text NOT NULL,
    "valideParId" text,
    "dateValidation" timestamp(3) without time zone,
    "pieceJustificativeUrl" text
);


--
-- Name: Eleve; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Eleve" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    matricule text,
    nom text NOT NULL,
    prenom text NOT NULL,
    "dateNaissance" timestamp(3) without time zone NOT NULL,
    "lieuNaissance" text,
    sexe text,
    "photoUrl" text,
    statut text DEFAULT 'actif'::text NOT NULL,
    "dateInscription" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateSortie" timestamp(3) without time zone,
    "motifSortie" text,
    "classeActuelleId" text,
    adresse text,
    allergies text,
    "conditionMedicale" text,
    "contactUrgence" text,
    "consentementPortailEleve" boolean DEFAULT false NOT NULL,
    "consentementPortailEleveDate" timestamp(3) without time zone,
    "consentementPhotoInterne" boolean DEFAULT false NOT NULL,
    "consentementPhotoExterne" boolean DEFAULT false NOT NULL,
    "utilisateurId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: EleveHistoriqueClasse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EleveHistoriqueClasse" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    "classeId" text NOT NULL,
    "dateEntree" timestamp(3) without time zone NOT NULL,
    "dateSortie" timestamp(3) without time zone,
    motif text
);


--
-- Name: EleveParent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EleveParent" (
    "eleveId" text NOT NULL,
    "parentId" text NOT NULL,
    "autoriteParentale" boolean DEFAULT true NOT NULL
);


--
-- Name: EmailLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmailLog" (
    id text NOT NULL,
    "ecoleId" text,
    destinataire text NOT NULL,
    sujet text NOT NULL,
    message text NOT NULL,
    statut text DEFAULT 'en_attente'::text NOT NULL,
    erreur text,
    "dateEnvoi" timestamp(3) without time zone,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EmploiTemps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmploiTemps" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "classeId" text,
    "enseignantId" text,
    "matiereId" text,
    "salleId" text,
    jour text NOT NULL,
    "heureDebut" text NOT NULL,
    "heureFin" text NOT NULL,
    "recurrenceRule" text,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone,
    statut text DEFAULT 'actif'::text NOT NULL,
    "creeParId" text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EntreeCahierTexte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EntreeCahierTexte" (
    id text NOT NULL,
    "cahierTexteId" text NOT NULL,
    "seanceId" text,
    "dateCours" timestamp(3) without time zone NOT NULL,
    contenu text NOT NULL,
    "travailAFaire" text,
    "ressourcesUrl" text,
    statut text DEFAULT 'brouillon'::text NOT NULL,
    "valideParId" text,
    "dateValidation" timestamp(3) without time zone
);


--
-- Name: EntretienRecrutement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EntretienRecrutement" (
    id text NOT NULL,
    "candidatureId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    lieu text NOT NULL,
    type text NOT NULL,
    intervieweurs text,
    "compteRendu" text,
    note integer,
    statut text DEFAULT 'planifie'::text NOT NULL
);


--
-- Name: Etage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Etage" (
    id text NOT NULL,
    "batimentId" text NOT NULL,
    numero integer NOT NULL,
    libelle text NOT NULL,
    "planUrl" text
);


--
-- Name: EtapeAdmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EtapeAdmission" (
    id text NOT NULL,
    "candidatureId" text NOT NULL,
    etape text NOT NULL,
    statut text DEFAULT 'en_attente'::text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "valideParId" text,
    commentaire text
);


--
-- Name: EtapeRecrutement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EtapeRecrutement" (
    id text NOT NULL,
    "candidatureId" text NOT NULL,
    etape text NOT NULL,
    statut text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note text,
    "decideurId" text
);


--
-- Name: Evaluation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Evaluation" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "classeId" text NOT NULL,
    "matiereId" text NOT NULL,
    "enseignantId" text NOT NULL,
    type text NOT NULL,
    intitule text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    sur double precision DEFAULT 20 NOT NULL,
    coefficient double precision DEFAULT 1.0 NOT NULL,
    "periodeId" text NOT NULL,
    statut text DEFAULT 'planifiee'::text NOT NULL,
    "calculeDansMoyenne" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EvaluationCompetence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EvaluationCompetence" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    "competenceId" text NOT NULL,
    "periodeId" text NOT NULL,
    "niveauAcquisition" text NOT NULL,
    commentaire text,
    "evalueParId" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EvaluationPersonnel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EvaluationPersonnel" (
    id text NOT NULL,
    "personnelId" text NOT NULL,
    "evaluateurId" text NOT NULL,
    periode text NOT NULL,
    criteres text NOT NULL,
    "commentaireGlobal" text,
    "dateEvaluation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ExamenOfficiel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExamenOfficiel" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    nom text NOT NULL,
    "anneeScolaireId" text NOT NULL,
    "niveauId" text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL
);


--
-- Name: ExportDonnees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExportDonnees" (
    id text NOT NULL,
    "ecoleId" text,
    "utilisateurId" text,
    "cibleType" text NOT NULL,
    "cibleId" text NOT NULL,
    format text DEFAULT 'json'::text NOT NULL,
    statut text DEFAULT 'en_cours'::text NOT NULL,
    "fichierUrl" text,
    "tailleOctets" integer,
    "dateDemande" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateGeneration" timestamp(3) without time zone,
    "dateExpiration" timestamp(3) without time zone
);


--
-- Name: FactureFournisseur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FactureFournisseur" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "fournisseurId" text NOT NULL,
    numero text NOT NULL,
    "dateEmission" timestamp(3) without time zone NOT NULL,
    "dateReception" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateEcheance" timestamp(3) without time zone,
    "montantHT" integer NOT NULL,
    "montantTVA" integer DEFAULT 0 NOT NULL,
    "montantTTC" integer NOT NULL,
    devise text NOT NULL,
    statut text DEFAULT 'recue'::text NOT NULL,
    "controleeParId" text,
    "dateControle" timestamp(3) without time zone,
    "fichierUrl" text,
    "commandeId" text
);


--
-- Name: FactureSaas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FactureSaas" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "abonnementId" text NOT NULL,
    periode text NOT NULL,
    montant integer NOT NULL,
    devise text NOT NULL,
    statut text DEFAULT 'impayee'::text NOT NULL,
    "modePaiement" text,
    "dateEmission" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "datePaiement" timestamp(3) without time zone
);


--
-- Name: FeatureFlag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeatureFlag" (
    id text NOT NULL,
    code text NOT NULL,
    description text,
    "actifGlobal" boolean DEFAULT false NOT NULL,
    "rolloutPourcentage" integer DEFAULT 0 NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateMaj" timestamp(3) without time zone NOT NULL
);


--
-- Name: FeatureFlagEcole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeatureFlagEcole" (
    id text NOT NULL,
    "featureFlagId" text NOT NULL,
    "ecoleId" text NOT NULL,
    actif boolean DEFAULT false NOT NULL,
    "dateActivation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FeuilleRoute; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeuilleRoute" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "ligneId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    statut text DEFAULT 'planifiee'::text NOT NULL,
    commentaire text,
    "retardMin" integer DEFAULT 0 NOT NULL
);


--
-- Name: FicheSante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FicheSante" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    "groupeSanguin" text,
    allergies text,
    "traitementsEnCours" text,
    antecedents text,
    "medecinTraitant" text,
    "telephoneUrgence" text,
    "contactUrgenceNom" text,
    "autorisationTraitement" boolean DEFAULT false NOT NULL,
    "dateMiseAJour" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "misAJourParId" text
);


--
-- Name: Fournisseur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Fournisseur" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    nom text NOT NULL,
    type text NOT NULL,
    contact text,
    email text,
    telephone text,
    adresse text,
    rib text,
    siret text,
    statut text DEFAULT 'actif'::text NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Frais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Frais" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    libelle text NOT NULL,
    type text NOT NULL,
    montant integer NOT NULL,
    devise text NOT NULL,
    periodicite text,
    "niveauId" text,
    "anneeScolaireId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: GarderieInscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GarderieInscription" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    formule text DEFAULT 'horaire'::text NOT NULL,
    "tarifHoraire" integer DEFAULT 0 NOT NULL,
    actif boolean DEFAULT true NOT NULL
);


--
-- Name: GarderieSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GarderieSession" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "heureArrivee" timestamp(3) without time zone NOT NULL,
    "heureDepart" timestamp(3) without time zone,
    "minutesFacturees" integer
);


--
-- Name: HabilitationPenale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HabilitationPenale" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "personnelId" text NOT NULL,
    "numeroHabilitation" text,
    "dateDelivrance" timestamp(3) without time zone,
    "dateExpiration" timestamp(3) without time zone,
    "autoriteEmettrice" text,
    statut text DEFAULT 'non_verifiee'::text NOT NULL
);


--
-- Name: Incident; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Incident" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    "dateHeure" timestamp(3) without time zone NOT NULL,
    lieu text,
    type text NOT NULL,
    description text NOT NULL,
    gravite text NOT NULL,
    "declareParId" text,
    temoins text
);


--
-- Name: InscriptionExamenOfficiel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InscriptionExamenOfficiel" (
    id text NOT NULL,
    "examenOfficielId" text NOT NULL,
    "eleveId" text NOT NULL,
    "numeroTable" text,
    "centreExamen" text,
    statut text DEFAULT 'inscrit'::text NOT NULL,
    resultat text,
    "amenagementAppliqueId" text,
    "certificatUrl" text
);


--
-- Name: JetonAuth; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JetonAuth" (
    id text NOT NULL,
    "utilisateurId" text,
    email text NOT NULL,
    type text NOT NULL,
    "tokenHash" text NOT NULL,
    "expireLe" timestamp(3) without time zone NOT NULL,
    utilise boolean DEFAULT false NOT NULL,
    "dateUtilisation" timestamp(3) without time zone,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "adresseIp" text,
    "userAgent" text
);


--
-- Name: JournalComptable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JournalComptable" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL,
    type text NOT NULL
);


--
-- Name: JustificationAbsence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JustificationAbsence" (
    id text NOT NULL,
    "ecoleId" text,
    "eleveId" text NOT NULL,
    "presenceId" text,
    "dateAbsence" timestamp(3) without time zone NOT NULL,
    "dureeHeures" double precision,
    motif text NOT NULL,
    description text,
    "justificatifUrl" text,
    statut text DEFAULT 'soumis'::text NOT NULL,
    "soumisParId" text,
    "valideParId" text,
    "dateSoumission" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateValidation" timestamp(3) without time zone,
    "commentaireValidation" text
);


--
-- Name: LigneBudget; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LigneBudget" (
    id text NOT NULL,
    "budgetId" text NOT NULL,
    categorie text NOT NULL,
    "sousCategorie" text NOT NULL,
    libelle text NOT NULL,
    "montantPrevu" integer NOT NULL,
    "montantRealise" integer DEFAULT 0 NOT NULL,
    devise text NOT NULL,
    "pourcentageRealise" double precision DEFAULT 0 NOT NULL,
    "dateDerniereMaj" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LigneBulletinPaie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LigneBulletinPaie" (
    id text NOT NULL,
    "bulletinId" text NOT NULL,
    type text NOT NULL,
    libelle text NOT NULL,
    montant integer NOT NULL,
    sens text NOT NULL,
    quantite double precision,
    taux integer
);


--
-- Name: LigneCommande; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LigneCommande" (
    id text NOT NULL,
    "commandeId" text NOT NULL,
    designation text NOT NULL,
    quantite double precision NOT NULL,
    unite text,
    "prixUnitaire" integer NOT NULL,
    "montantLigne" integer NOT NULL,
    recu boolean DEFAULT false NOT NULL
);


--
-- Name: LigneEcriture; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LigneEcriture" (
    id text NOT NULL,
    "ecritureId" text NOT NULL,
    "compteId" text NOT NULL,
    libelle text NOT NULL,
    debit integer DEFAULT 0 NOT NULL,
    credit integer DEFAULT 0 NOT NULL
);


--
-- Name: LigneReleve; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LigneReleve" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    montant integer NOT NULL,
    libelle text NOT NULL,
    rapprochee boolean DEFAULT false NOT NULL,
    "paiementId" text
);


--
-- Name: ListeFourniture; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ListeFourniture" (
    id text NOT NULL,
    "niveauId" text NOT NULL,
    "anneeScolaireId" text NOT NULL,
    contenu text NOT NULL,
    publiee boolean DEFAULT false NOT NULL,
    "datePublication" timestamp(3) without time zone
);


--
-- Name: ManuelScolaire; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ManuelScolaire" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    titre text NOT NULL,
    "matiereId" text,
    "niveauId" text,
    editeur text,
    "anneeEdition" integer,
    "quantiteStock" integer DEFAULT 0 NOT NULL
);


--
-- Name: Matiere; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Matiere" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL,
    coefficient double precision DEFAULT 1.0 NOT NULL,
    couleur text
);


--
-- Name: MembreConseil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembreConseil" (
    id text NOT NULL,
    "conseilId" text NOT NULL,
    "utilisateurId" text NOT NULL,
    role text NOT NULL,
    present boolean DEFAULT false NOT NULL,
    observation text
);


--
-- Name: MembreEquipeEducatif; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembreEquipeEducatif" (
    id text NOT NULL,
    "planAccompagnementId" text NOT NULL,
    "utilisateurId" text NOT NULL,
    role text NOT NULL,
    "dateInclusion" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "expediteurId" text NOT NULL,
    contenu text NOT NULL,
    "dateEnvoi" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    supprime boolean DEFAULT false NOT NULL,
    "luPar" text
);


--
-- Name: MesureProtection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MesureProtection" (
    id text NOT NULL,
    "signalementId" text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    "decideePar" text NOT NULL,
    "dateDecision" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateFin" timestamp(3) without time zone,
    statut text DEFAULT 'planifiee'::text NOT NULL
);


--
-- Name: ModeleMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ModeleMessage" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    code text NOT NULL,
    sujet text NOT NULL,
    corps text NOT NULL,
    canaux text DEFAULT '["in_app"]'::text NOT NULL,
    langue text DEFAULT 'fr'::text NOT NULL,
    actif boolean DEFAULT true NOT NULL
);


--
-- Name: MouvementStock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MouvementStock" (
    id text NOT NULL,
    "articleId" text NOT NULL,
    type text NOT NULL,
    quantite integer NOT NULL,
    motif text,
    "dateMouvement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "effectueParId" text
);


--
-- Name: Niveau; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Niveau" (
    id text NOT NULL,
    "sectionId" text NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL,
    ordre integer NOT NULL
);


--
-- Name: Note; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Note" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    "evaluationId" text NOT NULL,
    valeur double precision,
    absent boolean DEFAULT false NOT NULL,
    dispense boolean DEFAULT false NOT NULL,
    commentaire text,
    "saisiParId" text,
    "dateSaisie" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "synchroniseDepuisHorsLigne" boolean DEFAULT false NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "destinataireType" text NOT NULL,
    "destinataireId" text,
    "modeleMessageId" text,
    sujet text,
    corps text NOT NULL,
    canal text NOT NULL,
    statut text DEFAULT 'en_attente'::text NOT NULL,
    contexte text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateEnvoi" timestamp(3) without time zone,
    "dateLecture" timestamp(3) without time zone
);


--
-- Name: ObjectifPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ObjectifPlan" (
    id text NOT NULL,
    "planAccompagnementId" text NOT NULL,
    description text NOT NULL,
    domaine text NOT NULL,
    indicateurs text,
    echeance timestamp(3) without time zone,
    atteint boolean DEFAULT false NOT NULL,
    "dateEvaluation" timestamp(3) without time zone
);


--
-- Name: OffreEmploi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OffreEmploi" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    poste text NOT NULL,
    description text NOT NULL,
    "profilRecherche" text NOT NULL,
    "typeContrat" text NOT NULL,
    "dateOuverture" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateCloture" timestamp(3) without time zone,
    statut text DEFAULT 'ouverte'::text NOT NULL,
    lieu text
);


--
-- Name: Paiement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Paiement" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text,
    "parentId" text,
    montant integer NOT NULL,
    devise text NOT NULL,
    "modePaiement" text NOT NULL,
    "referenceTransaction" text,
    "datePaiement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "encaisseParId" text,
    "recuUrl" text,
    annule boolean DEFAULT false NOT NULL,
    "dateAnnulation" timestamp(3) without time zone,
    "motifAnnulation" text,
    "annuleParId" text
);


--
-- Name: PaiementEcheance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaiementEcheance" (
    "paiementId" text NOT NULL,
    "echeanceId" text NOT NULL,
    "montantApplique" integer NOT NULL
);


--
-- Name: PaiementFournisseur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaiementFournisseur" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "factureId" text NOT NULL,
    "datePaiement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    montant integer NOT NULL,
    devise text NOT NULL,
    mode text NOT NULL,
    reference text,
    "payeParId" text
);


--
-- Name: ParentTuteur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ParentTuteur" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "utilisateurId" text,
    nom text NOT NULL,
    prenom text NOT NULL,
    telephone text,
    email text,
    profession text,
    "lienAvecEleve" text NOT NULL
);


--
-- Name: PartenaireExterne; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PartenaireExterne" (
    id text NOT NULL,
    type text NOT NULL,
    nom text NOT NULL,
    contact text NOT NULL,
    email text,
    adresse text,
    actif boolean DEFAULT true NOT NULL
);


--
-- Name: PassageArret; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PassageArret" (
    id text NOT NULL,
    "feuilleId" text NOT NULL,
    "arretId" text NOT NULL,
    "heurePrevue" text NOT NULL,
    "heureReelle" text,
    montes text DEFAULT '[]'::text NOT NULL,
    descendus text DEFAULT '[]'::text NOT NULL,
    "transportArretId" text
);


--
-- Name: PassageInfirmerie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PassageInfirmerie" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    "ficheSanteId" text,
    "datePassage" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    motif text NOT NULL,
    symptomes text,
    "soinsAdministres" text,
    temperature double precision,
    "personnelId" text,
    issue text DEFAULT 'retour_classe'::text NOT NULL,
    "parentsNotifies" boolean DEFAULT false NOT NULL,
    commentaire text
);


--
-- Name: Periode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Periode" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "anneeScolaireId" text NOT NULL,
    libelle text NOT NULL,
    code text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL,
    "typeBulletin" text NOT NULL
);


--
-- Name: Permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL,
    module text NOT NULL
);


--
-- Name: Personnel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Personnel" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "utilisateurId" text,
    matricule text,
    nom text NOT NULL,
    prenom text NOT NULL,
    "dateNaissance" timestamp(3) without time zone,
    sexe text,
    telephone text,
    email text,
    adresse text,
    "photoUrl" text,
    "dateEmbauche" timestamp(3) without time zone NOT NULL,
    "dateSortie" timestamp(3) without time zone,
    "motifSortie" text,
    statut text DEFAULT 'actif'::text NOT NULL,
    "typeContrat" text,
    "salaireBrut" integer,
    "cvUrl" text,
    "diplomePrincipal" text,
    "numeroSecuriteSociale" text,
    rib text,
    "contactUrgence" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: PersonnelRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PersonnelRole" (
    "personnelId" text NOT NULL,
    "roleId" text NOT NULL,
    "classeId" text,
    "matiereId" text,
    "dateDebut" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateFin" timestamp(3) without time zone
);


--
-- Name: PieceJointe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PieceJointe" (
    id text NOT NULL,
    "messageId" text NOT NULL,
    "nomFichier" text NOT NULL,
    url text NOT NULL,
    taille integer,
    "mimeType" text,
    "dateUpload" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PlanAccompagnement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PlanAccompagnement" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    type text NOT NULL,
    "dateMiseEnPlace" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone,
    statut text DEFAULT 'actif'::text NOT NULL,
    diagnostic text,
    "objectifsGeneraux" text,
    "frequenceSuivi" text,
    "redigeParId" text,
    "valideParId" text,
    "dateValidation" timestamp(3) without time zone
);


--
-- Name: PlanTarifaire; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PlanTarifaire" (
    id text NOT NULL,
    nom text NOT NULL,
    "prixMensuel" integer NOT NULL,
    "prixAnnuel" integer NOT NULL,
    devise text DEFAULT 'XOF'::text NOT NULL,
    "limiteEleves" integer,
    "modulesInclus" text DEFAULT '[]'::text NOT NULL,
    "dureeEssaiJours" integer DEFAULT 14 NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PointagePersonnel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PointagePersonnel" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "personnelId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "heureArrivee" timestamp(3) without time zone,
    "heureDepart" timestamp(3) without time zone,
    "retardMin" integer DEFAULT 0 NOT NULL,
    commentaire text
);


--
-- Name: Presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Presence" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    "seanceId" text NOT NULL,
    statut text NOT NULL,
    "minuteRetard" integer,
    "motifAbsence" text,
    "justificatifUrl" text,
    "saisiParId" text,
    "dateSaisie" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "synchroniseDepuisHorsLigne" boolean DEFAULT false NOT NULL
);


--
-- Name: Programme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Programme" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "matiereId" text NOT NULL,
    "niveauId" text NOT NULL,
    "anneeScolaireId" text NOT NULL,
    titre text NOT NULL,
    objectifs text,
    "volumeHorairePrevu" integer,
    publie boolean DEFAULT false NOT NULL
);


--
-- Name: PushNotificationLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PushNotificationLog" (
    id text NOT NULL,
    "ecoleId" text,
    "notificationId" text,
    "pushTokenId" text NOT NULL,
    titre text NOT NULL,
    corps text NOT NULL,
    statut text DEFAULT 'en_attente'::text NOT NULL,
    "providerMessageId" text,
    "dateEnvoi" timestamp(3) without time zone,
    "dateLivraison" timestamp(3) without time zone,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    clic boolean DEFAULT false NOT NULL
);


--
-- Name: PushToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PushToken" (
    id text NOT NULL,
    "utilisateurId" text NOT NULL,
    token text NOT NULL,
    provider text NOT NULL,
    p256dh text,
    "authKey" text,
    plateforme text,
    "deviceModel" text,
    "osVersion" text,
    "appVersion" text,
    langue text,
    actif boolean DEFAULT true NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "derniereActivite" timestamp(3) without time zone
);


--
-- Name: QuotaUsage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QuotaUsage" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    periode text NOT NULL,
    ressource text NOT NULL,
    consommation integer DEFAULT 0 NOT NULL,
    limite integer,
    pourcentage double precision DEFAULT 0 NOT NULL,
    alerte80 boolean DEFAULT false NOT NULL,
    alerte100 boolean DEFAULT false NOT NULL,
    "dateDerniereMaj" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RapportSauvegarde; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RapportSauvegarde" (
    id text NOT NULL,
    "ecoleId" text,
    "utilisateurId" text NOT NULL,
    nom text NOT NULL,
    type text NOT NULL,
    configuration text NOT NULL,
    format text DEFAULT 'table'::text NOT NULL,
    partage boolean DEFAULT false NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "derniereExecution" timestamp(3) without time zone
);


--
-- Name: Rdv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Rdv" (
    id text NOT NULL,
    "creneauRdvId" text NOT NULL,
    "parentId" text NOT NULL,
    "eleveId" text,
    motif text,
    statut text DEFAULT 'confirme'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ReceptionCommande; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReceptionCommande" (
    id text NOT NULL,
    "commandeId" text NOT NULL,
    "dateReception" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "quantiteRecue" double precision NOT NULL,
    "bonLivraisonUrl" text,
    "controleQualite" boolean DEFAULT false NOT NULL,
    commentaire text,
    "receptionneParId" text
);


--
-- Name: RegistreTraitement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RegistreTraitement" (
    id text NOT NULL,
    "ecoleId" text,
    nom text NOT NULL,
    finalite text NOT NULL,
    "baseLegale" text NOT NULL,
    "donneesTraitees" text NOT NULL,
    "categoriesPersonnes" text NOT NULL,
    destinataires text,
    "transfertsHorsUE" text,
    "dureeConservation" text NOT NULL,
    "mesuresSecurite" text,
    responsable text,
    dpo text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateMaj" timestamp(3) without time zone NOT NULL
);


--
-- Name: RegleCalculMoyenne; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RegleCalculMoyenne" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "cycleId" text NOT NULL,
    methode text DEFAULT 'moyenne_ponderee'::text NOT NULL,
    "inclutAbsents" boolean DEFAULT false NOT NULL,
    "notePlancher" double precision,
    "notePlafond" double precision,
    arrondi integer DEFAULT 2 NOT NULL,
    "reglesSpecifiques" text
);


--
-- Name: Remplacement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Remplacement" (
    id text NOT NULL,
    "congeId" text,
    "personnelAbsentId" text NOT NULL,
    "personnelRemplacantId" text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL,
    statut text DEFAULT 'planifie'::text NOT NULL
);


--
-- Name: RenduDevoir; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RenduDevoir" (
    id text NOT NULL,
    "devoirId" text NOT NULL,
    "eleveId" text NOT NULL,
    "dateRendu" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "contenuUrl" text,
    "commentaireEleve" text,
    note double precision,
    appreciation text,
    "corrigeParId" text,
    "dateCorrection" timestamp(3) without time zone,
    statut text DEFAULT 'rendu'::text NOT NULL
);


--
-- Name: ReservationSalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReservationSalle" (
    id text NOT NULL,
    "salleId" text NOT NULL,
    "seanceId" text,
    date timestamp(3) without time zone NOT NULL,
    "heureDebut" text NOT NULL,
    "heureFin" text NOT NULL,
    "reserveParId" text NOT NULL,
    motif text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ReunionCollective; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReunionCollective" (
    id text NOT NULL,
    "classeId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    heure text NOT NULL,
    lieu text NOT NULL,
    description text
);


--
-- Name: RevisionPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RevisionPlan" (
    id text NOT NULL,
    "planAccompagnementId" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    motif text NOT NULL,
    constats text NOT NULL,
    ajustements text,
    "redigeParId" text
);


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    "ecoleId" text,
    code text NOT NULL,
    libelle text NOT NULL,
    "twofaRequis" boolean DEFAULT false NOT NULL
);


--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RolePermission" (
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL
);


--
-- Name: Salle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Salle" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    nom text NOT NULL,
    type text NOT NULL,
    capacite integer NOT NULL,
    equipements text DEFAULT '[]'::text NOT NULL,
    "batimentId" text,
    "etageId" text
);


--
-- Name: SalleEquipement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SalleEquipement" (
    id text NOT NULL,
    "salleId" text NOT NULL,
    type text NOT NULL,
    quantite integer DEFAULT 1 NOT NULL,
    etat text DEFAULT 'fonctionnel'::text NOT NULL,
    "dateDerniereMaintenance" timestamp(3) without time zone
);


--
-- Name: Sanction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Sanction" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    "dateDebut" timestamp(3) without time zone,
    "dateFin" timestamp(3) without time zone,
    "dureeHeures" integer,
    statut text DEFAULT 'decidee'::text NOT NULL,
    "decideParId" text,
    "notifieParents" boolean DEFAULT false NOT NULL,
    "dateNotification" timestamp(3) without time zone
);


--
-- Name: Sauvegarde; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Sauvegarde" (
    id text NOT NULL,
    "nomFichier" text NOT NULL,
    "tailleOctets" integer NOT NULL,
    checksum text,
    type text DEFAULT 'manuelle'::text NOT NULL,
    statut text DEFAULT 'reussie'::text NOT NULL,
    "creeParId" text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ecoleId" text
);


--
-- Name: Seance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Seance" (
    id text NOT NULL,
    "classeId" text NOT NULL,
    "matiereId" text NOT NULL,
    "enseignantId" text NOT NULL,
    "chapitreId" text,
    date timestamp(3) without time zone NOT NULL,
    "heureDebut" text NOT NULL,
    "heureFin" text NOT NULL,
    "salleId" text,
    "contenuPrevu" text,
    "contenuRealise" text,
    statut text DEFAULT 'planifiee'::text NOT NULL,
    "emploiTempsId" text
);


--
-- Name: Section; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Section" (
    id text NOT NULL,
    "cycleId" text NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL
);


--
-- Name: SessionUtilisateur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SessionUtilisateur" (
    id text NOT NULL,
    "utilisateurId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "ecoleActiveId" text,
    fingerprint text,
    "adresseIp" text,
    "userAgent" text,
    "deviceType" text,
    localisation text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateDerniereActivite" timestamp(3) without time zone,
    "dateExpiration" timestamp(3) without time zone NOT NULL,
    "expireManuellement" boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: SignalementMineur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SignalementMineur" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text,
    type text NOT NULL,
    description text NOT NULL,
    gravite text NOT NULL,
    source text NOT NULL,
    "dateSignalement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateFaits" timestamp(3) without time zone,
    "lieuFaits" text,
    "declareParId" text,
    "signalantAnonyme" boolean DEFAULT false NOT NULL,
    statut text DEFAULT 'recu'::text NOT NULL,
    "confidentialiteNiveau" text DEFAULT 'restreint'::text NOT NULL,
    "partenairesExternesIds" text,
    "transfertCrip" boolean DEFAULT false NOT NULL,
    "dateTransfertCrip" timestamp(3) without time zone,
    "mesuresProvisoires" text
);


--
-- Name: SignatureElectronique; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SignatureElectronique" (
    id text NOT NULL,
    "documentGenereId" text NOT NULL,
    "signataireId" text NOT NULL,
    "signataireNom" text NOT NULL,
    "hashDocument" text NOT NULL,
    certificat text,
    "horodatageRFC3161" text,
    "dateSignature" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "adresseIp" text,
    "userAgent" text,
    niveau text DEFAULT 'simple'::text NOT NULL
);


--
-- Name: SmsLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SmsLog" (
    id text NOT NULL,
    "ecoleId" text,
    "notificationId" text,
    destinataire text NOT NULL,
    expediteur text,
    message text NOT NULL,
    provider text NOT NULL,
    "providerMessageId" text,
    statut text DEFAULT 'en_attente'::text NOT NULL,
    "coutUnitaire" integer DEFAULT 0 NOT NULL,
    "coutTotal" integer DEFAULT 0 NOT NULL,
    segments integer DEFAULT 1 NOT NULL,
    "dateEnvoi" timestamp(3) without time zone,
    "dateLivraison" timestamp(3) without time zone,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "codeErreur" text,
    tentative integer DEFAULT 0 NOT NULL
);


--
-- Name: SoldeConge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SoldeConge" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "personnelId" text NOT NULL,
    annee text NOT NULL,
    "droitsAcquis" double precision DEFAULT 0 NOT NULL,
    "joursPris" double precision DEFAULT 0 NOT NULL,
    "joursRestants" double precision DEFAULT 0 NOT NULL,
    "reliquatAnterieur" double precision DEFAULT 0 NOT NULL,
    "derniereMaj" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SortieAnticipee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SortieAnticipee" (
    id text NOT NULL,
    "eleveId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    heure text NOT NULL,
    "autorisationSortieId" text,
    "recupereParNom" text NOT NULL,
    "validationExceptionnelle" boolean DEFAULT false NOT NULL,
    "valideParId" text,
    "parentsNotifies" boolean DEFAULT false NOT NULL,
    "dateSortie" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Stage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Stage" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    entreprise text NOT NULL,
    poste text NOT NULL,
    "dateDebut" timestamp(3) without time zone NOT NULL,
    "dateFin" timestamp(3) without time zone NOT NULL,
    "tuteurEntreprise" text,
    "encadrantEcoleId" text,
    objectifs text,
    evaluation text,
    statut text DEFAULT 'planifie'::text NOT NULL,
    "conventionUrl" text
);


--
-- Name: StockArticle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockArticle" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    nom text NOT NULL,
    categorie text,
    quantite integer DEFAULT 0 NOT NULL,
    "seuilAlerte" integer,
    unite text,
    "prixUnitaire" integer
);


--
-- Name: StockageFichier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockageFichier" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "nomFichier" text NOT NULL,
    chemin text NOT NULL,
    "mimeType" text NOT NULL,
    "tailleOctets" integer NOT NULL,
    confidentiel boolean DEFAULT true NOT NULL,
    "cibleType" text,
    "cibleId" text,
    "uploadeParId" text,
    "dateUpload" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StripeEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StripeEvent" (
    id text NOT NULL,
    "eventIdStripe" text NOT NULL,
    type text NOT NULL,
    donnees text NOT NULL,
    traite boolean DEFAULT false NOT NULL,
    "dateReception" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateTraitement" timestamp(3) without time zone,
    erreur text
);


--
-- Name: SuiviSignalement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SuiviSignalement" (
    id text NOT NULL,
    "signalementId" text NOT NULL,
    note text NOT NULL,
    "auteurId" text,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TemplateDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TemplateDocument" (
    id text NOT NULL,
    "ecoleId" text,
    code text NOT NULL,
    libelle text NOT NULL,
    type text NOT NULL,
    "contenuTemplate" text NOT NULL,
    "variablesDisponibles" text,
    langue text DEFAULT 'fr'::text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateMaj" timestamp(3) without time zone NOT NULL
);


--
-- Name: TentativeConnexion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TentativeConnexion" (
    id integer NOT NULL,
    "utilisateurId" text,
    email text NOT NULL,
    "adresseIp" text,
    "userAgent" text,
    succes boolean NOT NULL,
    "motifEchec" text,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TentativeConnexion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TentativeConnexion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TentativeConnexion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TentativeConnexion_id_seq" OWNED BY public."TentativeConnexion".id;


--
-- Name: TestAdmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TestAdmission" (
    id text NOT NULL,
    "candidatureId" text NOT NULL,
    matiere text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    note double precision,
    sur double precision DEFAULT 20 NOT NULL,
    appreciation text,
    "evalueParId" text
);


--
-- Name: ThemeEcole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ThemeEcole" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "couleurPrimaire" text DEFAULT '#0f766e'::text NOT NULL,
    "couleurSecondaire" text DEFAULT '#0ea5e9'::text NOT NULL,
    "couleurAccent" text DEFAULT '#f59e0b'::text NOT NULL,
    "couleurFond" text DEFAULT '#f9fafb'::text NOT NULL,
    "logoSidebarUrl" text,
    "faviconUrl" text,
    "policeFamille" text DEFAULT 'Inter'::text NOT NULL,
    "customCssUrl" text,
    "nomProduit" text,
    "dateMaj" timestamp(3) without time zone NOT NULL
);


--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Ticket" (
    id text NOT NULL,
    "ecoleId" text,
    sujet text NOT NULL,
    description text NOT NULL,
    categorie text DEFAULT 'fonctionnel'::text NOT NULL,
    priorite text DEFAULT 'normale'::text NOT NULL,
    statut text DEFAULT 'ouvert'::text NOT NULL,
    "slaContractuelHeures" integer,
    "slaEcheance" timestamp(3) without time zone,
    "creeParId" text,
    "assigneAId" text,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateCloture" timestamp(3) without time zone,
    "delaiResolutionMinutes" integer
);


--
-- Name: TicketMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TicketMessage" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "auteurId" text,
    "auteurRole" text NOT NULL,
    message text NOT NULL,
    "pieceJointeUrl" text,
    interne boolean DEFAULT false NOT NULL,
    "dateEnvoi" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TicketStatutHistorique; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TicketStatutHistorique" (
    id integer NOT NULL,
    "ticketId" text NOT NULL,
    "ancienStatut" text,
    "nouveauStatut" text NOT NULL,
    "modifieParId" text,
    "dateChangement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TicketStatutHistorique_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TicketStatutHistorique_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TicketStatutHistorique_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TicketStatutHistorique_id_seq" OWNED BY public."TicketStatutHistorique".id;


--
-- Name: TransportArret; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TransportArret" (
    id text NOT NULL,
    "ligneId" text NOT NULL,
    nom text NOT NULL,
    ordre integer NOT NULL,
    heure text NOT NULL
);


--
-- Name: TransportInscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TransportInscription" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    "classeId" text NOT NULL,
    "ligneId" text NOT NULL,
    "arretMonteeId" text,
    "arretDescenteId" text,
    tarif integer NOT NULL,
    actif boolean DEFAULT true NOT NULL
);


--
-- Name: TransportLigne; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TransportLigne" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    nom text NOT NULL,
    vehicule text,
    "chauffeurId" text
);


--
-- Name: TwoFactorBackupCode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TwoFactorBackupCode" (
    id text NOT NULL,
    "utilisateurId" text NOT NULL,
    "codeHash" text NOT NULL,
    utilise boolean DEFAULT false NOT NULL,
    "dateUtilisation" timestamp(3) without time zone,
    "dateGeneration" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TwoFactorMethod; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TwoFactorMethod" (
    id text NOT NULL,
    "utilisateurId" text NOT NULL,
    methode text NOT NULL,
    secret text,
    telephone text,
    email text,
    actif boolean DEFAULT true NOT NULL,
    "dateActivation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "derniereUtilisation" timestamp(3) without time zone
);


--
-- Name: Utilisateur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Utilisateur" (
    id text NOT NULL,
    "ecoleId" text,
    email text NOT NULL,
    "motDePasseHash" text NOT NULL,
    telephone text,
    nom text NOT NULL,
    prenom text NOT NULL,
    type text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "twofaActive" boolean DEFAULT false NOT NULL,
    "derniereConnexion" timestamp(3) without time zone,
    "tentativesEchouees" integer DEFAULT 0 NOT NULL,
    "verrouilleJusqua" timestamp(3) without time zone,
    "consentementPortail" boolean DEFAULT false NOT NULL,
    "consentementDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: UtilisateurEcole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UtilisateurEcole" (
    id text NOT NULL,
    "utilisateurId" text NOT NULL,
    "ecoleId" text NOT NULL,
    "roleLibelle" text,
    "dateAjout" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UtilisateurRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UtilisateurRole" (
    "utilisateurId" text NOT NULL,
    "roleId" text NOT NULL,
    "dateDebut" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateFin" timestamp(3) without time zone
);


--
-- Name: Vaccination; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Vaccination" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "eleveId" text NOT NULL,
    vaccin text NOT NULL,
    "dateVaccination" timestamp(3) without time zone,
    "dateRappel" timestamp(3) without time zone,
    statut text DEFAULT 'a_jour'::text NOT NULL,
    "certificatUrl" text,
    note text,
    "ficheSanteId" text
);


--
-- Name: VariablePaie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VariablePaie" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "personnelId" text NOT NULL,
    periode text NOT NULL,
    type text NOT NULL,
    libelle text NOT NULL,
    montant integer NOT NULL,
    "dateAttribution" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "attribueParId" text,
    "bulletinPaieId" text
);


--
-- Name: VerificationAntecedents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VerificationAntecedents" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "personnelId" text NOT NULL,
    type text NOT NULL,
    "referenceDossier" text,
    statut text DEFAULT 'demandee'::text NOT NULL,
    "dateDemande" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateObtention" timestamp(3) without time zone,
    "dateExpiration" timestamp(3) without time zone,
    "fichierUrl" text,
    "valideParId" text
);


--
-- Name: Visiteur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Visiteur" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    nom text NOT NULL,
    "motifVisite" text NOT NULL,
    "personneVisiteeId" text,
    "dateHeureEntree" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateHeureSortie" timestamp(3) without time zone,
    "pieceIdentiteVerifiee" boolean DEFAULT false NOT NULL,
    "badgeNumero" text
);


--
-- Name: VoteConseil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VoteConseil" (
    id text NOT NULL,
    "deliberationId" text NOT NULL,
    "membreId" text NOT NULL,
    vote text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: WebhookDelivery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WebhookDelivery" (
    id text NOT NULL,
    "webhookId" text NOT NULL,
    event text NOT NULL,
    payload text NOT NULL,
    "statutHttp" integer,
    "reponseCorps" text,
    tentative integer DEFAULT 0 NOT NULL,
    statut text DEFAULT 'en_attente'::text NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateEnvoi" timestamp(3) without time zone,
    "prochaineTentative" timestamp(3) without time zone
);


--
-- Name: WebhookSortant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WebhookSortant" (
    id text NOT NULL,
    "ecoleId" text,
    url text NOT NULL,
    secret text,
    events text DEFAULT '[]'::text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dernierEnvoi" timestamp(3) without time zone
);


--
-- Name: WidgetDashboard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WidgetDashboard" (
    id text NOT NULL,
    "utilisateurId" text NOT NULL,
    titre text NOT NULL,
    type text NOT NULL,
    source text NOT NULL,
    configuration text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    taille text DEFAULT 'md'::text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "dateCreation" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _EcoleToPermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_EcoleToPermission" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: ApiTokenLog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiTokenLog" ALTER COLUMN id SET DEFAULT nextval('public."ApiTokenLog_id_seq"'::regclass);


--
-- Name: AuditLog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog" ALTER COLUMN id SET DEFAULT nextval('public."AuditLog_id_seq"'::regclass);


--
-- Name: TentativeConnexion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TentativeConnexion" ALTER COLUMN id SET DEFAULT nextval('public."TentativeConnexion_id_seq"'::regclass);


--
-- Name: TicketStatutHistorique id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketStatutHistorique" ALTER COLUMN id SET DEFAULT nextval('public."TicketStatutHistorique_id_seq"'::regclass);


--
-- Data for Name: account; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invitation; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.invitation (id, "organizationId", email, role, status, "expiresAt", "createdAt", "inviterId") FROM stdin;
\.


--
-- Data for Name: jwks; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.jwks (id, "publicKey", "privateKey", "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: member; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.member (id, "organizationId", "userId", role, "createdAt") FROM stdin;
\.


--
-- Data for Name: organization; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.organization (id, name, slug, logo, "createdAt", metadata) FROM stdin;
\.


--
-- Data for Name: project_config; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.project_config (id, name, endpoint_id, created_at, updated_at, trusted_origins, social_providers, email_provider, email_and_password, allow_localhost, plugin_configs, webhook_config) FROM stdin;
0c317615-d392-4f0a-9e9a-01a01dab74d4	ECOLES GESTION	ep-steep-sea-ayrp5xrf	2026-09-04 03:08:38.708+00	2026-09-04 03:08:38.708+00	[]	[{"id": "google", "isShared": true}]	{"type": "shared"}	{"enabled": true, "disableSignUp": false, "emailVerificationMethod": "otp", "requireEmailVerification": false, "autoSignInAfterVerification": true, "sendVerificationEmailOnSignIn": false, "sendVerificationEmailOnSignUp": false}	t	{"magicLink": {"config": {"expiresIn": 5, "disableSignUp": false}, "enabled": false}, "phoneNumber": {"config": {"otp_expires_in": 300}, "enabled": false}, "organization": {"config": {"creatorRole": "owner", "membershipLimit": 100, "organizationLimit": 10, "sendInvitationEmail": false}, "enabled": true}}	{"enabled": false, "enabledEvents": [], "timeoutSeconds": 5}
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "impersonatedBy", "activeOrganizationId") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role, banned, "banReason", "banExpires") FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Abonnement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Abonnement" (id, "ecoleId", "planId", "dateDebut", "dateFin", statut, "modeFacturation", "createdAt", "updatedAt") FROM stdin;
cmtmemt330006uhkstkedwehb	cmtmemsqm0004uhkso4f52k70	cmtmems3i0001uhksrbv9zfqd	2026-08-01 00:00:00	\N	actif	mensuel	2026-09-04 03:38:52.479	2026-09-04 03:38:52.479
\.


--
-- Data for Name: Activite; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Activite" (id, "ecoleId", type, titre, description, destination, "dateDebut", "dateFin", cout, devise, capacite, statut, "creeParId") FROM stdin;
cmtmeqm3l00mquhks32jpegb0	cmtmemsqm0004uhkso4f52k70	sortie	Sortie pédagogique au Lac Rose	Journée découverte —lac de Retba, sel et écologie	Lac Rose, Retba	2026-09-25 03:41:50.048	2026-09-25 03:41:50.048	350000	XOF	30	planifiee	cmtmemw4t000tuhkslywkbxhv
cmtmeqn1y00myuhkswgqgt7ri	cmtmemsqm0004uhkso4f52k70	voyage	Voyage culturel — Sine-Saloum	\N	Toubacouta	2027-04-10 00:00:00	2027-04-13 00:00:00	1250000	XOF	20	planifiee	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: ActiviteParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActiviteParticipant" (id, "activiteId", "eleveId", statut, autorisation, "dateAutorisation", "paiementStatut") FROM stdin;
cmtmeqmf000msuhks2he47lle	cmtmeqm3l00mquhks32jpegb0	cmtmencnz004buhks96bk4qi3	confirme	accordee	2026-09-04 03:41:50.46	a_payer
cmtmeqmqm00muuhks504wq2nr	cmtmeqm3l00mquhks32jpegb0	cmtmendas004fuhksd51jkouv	inscrit	en_attente	\N	a_payer
cmtmeqmwa00mwuhkswz3gnh1g	cmtmeqm3l00mquhks32jpegb0	cmtmendmp004juhks3nrshdg4	inscrit	en_attente	\N	non_exigible
cmtmeqnd800n0uhks6lgh59wi	cmtmeqn1y00myuhkswgqgt7ri	cmtmenelf004vuhkswidp3578	inscrit	en_attente	\N	a_payer
\.


--
-- Data for Name: Amenagement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Amenagement" (id, "eleveId", "besoinSpecifiqueId", "typeAmenagement", description, "dateDebut", "dateFin", "valideParId") FROM stdin;
cmtmenyb4009guhksoju8fw5e	cmtmendmp004juhks3nrshdg4	cmtmenxzt009euhksfcewki09	tiers_temps	Tiers-temps sur compositions (+30 min sur 2h)	2026-09-01 00:00:00	\N	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: AnneeScolaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnneeScolaire" (id, "ecoleId", libelle, "dateDebut", "dateFin", active) FROM stdin;
cmtmemwgb000vuhks37pmo695	cmtmemsqm0004uhkso4f52k70	2026-2027	2026-09-01 00:00:00	2027-07-15 00:00:00	t
cmtmeqgf000lmuhksntq3hf7p	cmtmeqg3p00lkuhksukyqbaf3	2026-2027	2026-09-01 00:00:00	2027-07-15 00:00:00	t
\.


--
-- Data for Name: Annonce; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Annonce" (id, "ecoleId", titre, contenu, "auteurId", "datePublication", "dateExpiration", statut, cible, "cibleIds", pinned, "pieceJointeUrl") FROM stdin;
cmtmeoxvo00g5uhksiozxw7c8	cmtmemsqm0004uhkso4f52k70	Rentrée scolaire 2026-2027	Chères familles, la rentrée est fixée au lundi 1er septembre à 8h. Réunion parents-profs le 5 septembre à 17h.	cmtmemw4t000tuhkslywkbxhv	2026-08-20 00:00:00	\N	publie	toute_ecole	\N	t	\N
\.


--
-- Data for Name: AnnonceLecture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnnonceLecture" (id, "annonceId", "utilisateurId", "dateLecture") FROM stdin;
cmtmeoy7800g7uhksy9gt9p1i	cmtmeoxvo00g5uhksiozxw7c8	cmtmen282002juhksytux1kr3	2026-09-04 03:40:32.418
\.


--
-- Data for Name: ApiToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiToken" (id, "ecoleId", nom, description, "tokenHash", prefix, scopes, "tauxLimiteHoraire", actif, "dateCreation", "dateExpiration", "dernierUsage", "totalRequettes") FROM stdin;
cmtmep2qu00gxuhkss7u8r5ut	cmtmemsqm0004uhkso4f52k70	Intégration SIRH externe	Token pour synchronisation avec le SIRH régional	hash-api-token-1	sk_live_abcd	["eleves:read","classes:read"]	500	t	2026-09-04 03:40:38.31	\N	2026-09-04 03:40:38.308	42
\.


--
-- Data for Name: ApiTokenLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiTokenLog" (id, "apiTokenId", endpoint, methode, statut, "tempsReponse", "adresseIp", date) FROM stdin;
1	cmtmep2qu00gxuhkss7u8r5ut	/api/v1/eleves	GET	200	142	10.0.0.1	2026-09-04 03:40:38.717
\.


--
-- Data for Name: AttributionManuel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttributionManuel" (id, "manuelScolaireId", "eleveId", "dateAttribution", "dateRestitutionPrevue", "etatRemise", "etatRetour", statut, "echeanceFraisGenereeId") FROM stdin;
cmtmeo18g00a4uhksescjk3xu	cmtmeo0x400a2uhkskfatrt4q	cmtmencnz004buhks96bk4qi3	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmeo1jr00a6uhksfzolk19v	cmtmeo0x400a2uhkskfatrt4q	cmtmendas004fuhksd51jkouv	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmeo1pe00a8uhkszntlc7do	cmtmeo0x400a2uhkskfatrt4q	cmtmendmp004juhks3nrshdg4	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmeo1vj00aauhkszesn4urd	cmtmeo0x400a2uhkskfatrt4q	cmtmendyo004nuhkszt18nggf	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmeo21500acuhksv6c7j1f4	cmtmeo0x400a2uhkskfatrt4q	cmtmene9z004ruhksv0sgodqm	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "ecoleId", "utilisateurId", action, "cibleType", "cibleId", details, "adresseIp", "userAgent", "dateAction") FROM stdin;
1	cmtmemsqm0004uhkso4f52k70	cmtmemw4t000tuhkslywkbxhv	paiement.encaissement	paiement	\N	{"montantCentimes":10000000,"eleveId":"cmtmencnz004buhks96bk4qi3"}	\N	\N	2026-09-04 03:40:03.994
2	cmtmemsqm0004uhkso4f52k70	cmtmen282002juhksytux1kr3	note.saisie	evaluation	\N	{"evaluationId":"cmtmenora0071uhksigxnshyw","classeId":"cmtmen0wc0027uhks4c96aay6"}	\N	\N	2026-09-04 03:40:03.994
3	cmtmemsqm0004uhkso4f52k70	cmtmemw4t000tuhkslywkbxhv	eleve.inscription	eleve	\N	{"eleveId":"cmtmene9z004ruhksv0sgodqm","classeId":"cmtmen0wc0027uhks4c96aay6"}	\N	\N	2026-09-04 03:40:03.994
4	cmtmemsqm0004uhkso4f52k70	cmtmemw4t000tuhkslywkbxhv	support.connexion_en_tant_que	ecole	\N	{"motif":"Vérification paramètres"}	\N	\N	2026-09-04 03:40:03.994
\.


--
-- Data for Name: AutorisationSortie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AutorisationSortie" (id, "eleveId", "nomPersonneAutorisee", "lienAvecEleve", telephone, "photoUrl", active, "valideeParId") FROM stdin;
cmtmeobxx00cpuhkst7pelvo5	cmtmencnz004buhks96bk4qi3	Maman Diop	mere	+221 76 000 00 00	\N	t	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: AvancementProgramme; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AvancementProgramme" (id, "chapitreId", "classeId", "enseignantId", pourcentage, "dateMaj", commentaire) FROM stdin;
cmtmeq4e800jluhkswy2pssf8	cmtmeq3l900jfuhkso9e5kezv	cmtmen0wc0027uhks4c96aay6	cmtmen2ds002luhksrm9r1gw6	65	2026-09-04 03:41:27.104	Chapitre bien avancé, évaluation prévue semaine 42.
cmtmeq4pl00jnuhkslu7h13s6	cmtmeq3wl00jhuhksfzhyfc4p	cmtmen0wc0027uhks4c96aay6	cmtmen2ds002luhksrm9r1gw6	15	2026-09-04 03:41:27.513	\N
cmtmeq5c300jtuhksd8877y2y	cmtmeq56g00jruhksaja2kwtd	cmtmen17v0029uhksmj1gava6	cmtmen3mc002ruhkstwrtcias	80	2026-09-04 03:41:28.324	Bon rythme, dictées hebdomadaires en place.
cmtmeq5td00jzuhkszo5kixfw	cmtmeq5nf00jxuhksynju7x9b	cmtmen1dj002buhkszcf47okp	cmtmen4aq002xuhksp108niko	35	2026-09-04 03:41:28.945	Décalage dû à l'arrêt maladie — rattrapage planifié.
cmtmeq5z200k1uhks5zbwvzde	cmtmeq48e00jjuhksgs015fpe	cmtmen0wc0027uhks4c96aay6	cmtmen2ds002luhksrm9r1gw6	40	2026-09-04 03:41:29.15	\N
\.


--
-- Data for Name: AvoirEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AvoirEcole" (id, "ecoleId", numero, "dateEmission", montant, devise, motif, "paiementLieId", "factureFournisseurId", statut, "emisParId") FROM stdin;
cmtmeovxv00fvuhkslqdbu94p	cmtmemsqm0004uhkso4f52k70	AV-2026-001	2026-08-25 00:00:00	1500000	XOF	Cahiers défectueux (4 unités)	\N	cmtmeovb200fruhks7yoxmzov	emis	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: AvoirSaas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AvoirSaas" (id, "ecoleId", "factureSaasLieeId", numero, "dateEmission", montant, devise, motif, statut, "stripeCreditNoteId") FROM stdin;
cmtmep7yu00hmuhks9h9r4az4	cmtmemsqm0004uhkso4f52k70	\N	AV-SAAS-2026-001	2026-08-15 00:00:00	500000	XOF	Erreur de facturation — prorata jours de suspension	emis	\N
\.


--
-- Data for Name: Batiment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Batiment" (id, "ecoleId", nom, adresse, "nombreEtages", "accessibilitePMR", "dateConstruction", "dateMaj") FROM stdin;
cmtmepbfi00i5uhksztbues1w	cmtmemsqm0004uhkso4f52k70	Bâtiment Principal A	Avenue Léopold S. Senghor, Dakar	3	t	2010-09-01 00:00:00	2026-09-04 03:40:49.567
\.


--
-- Data for Name: BesoinSpecifique; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BesoinSpecifique" (id, "eleveId", type, description, "dateDiagnostic", "documentJustificatifUrl", confidentiel, "creeLe") FROM stdin;
cmtmenxzt009euhksfcewki09	cmtmendmp004juhks3nrshdg4	trouble_apprentissage	Dyslexie diagnostiquée	2025-03-10 00:00:00	\N	t	2026-09-04 03:39:45.496
\.


--
-- Data for Name: BiblioLivre; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiblioLivre" (id, "ecoleId", isbn, titre, auteur, editeur, "anneePublication", "exemplairesTotal", "exemplairesDisponibles", categorie, cote) FROM stdin;
cmtmeo4ev00aruhksjeb62bhm	cmtmemsqm0004uhkso4f52k70	978-2-221-23456-7	Le Petit Prince	Antoine de Saint-Exupéry	Gallimard	1943	5	4	Littérature jeunesse	R-PE-001
\.


--
-- Data for Name: BiblioPret; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiblioPret" (id, "livreId", "eleveId", "datePret", "dateRetourPrevue", "dateRetourEffective", statut, "penaliteGeneree") FROM stdin;
cmtmeo4q700atuhksd5pqf0tg	cmtmeo4ev00aruhksjeb62bhm	cmtmencnz004buhks96bk4qi3	2026-09-10 00:00:00	2026-09-24 00:00:00	\N	en_cours	0
\.


--
-- Data for Name: Budget; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Budget" (id, "ecoleId", "anneeScolaireId", libelle, "dateDebut", "dateFin", statut, "valideParId", "dateValidation") FROM stdin;
cmtmeoqki00exuhksn64zcfqr	cmtmemsqm0004uhkso4f52k70	cmtmemwgb000vuhks37pmo695	Budget prévisionnel 2026-2027	2026-09-01 00:00:00	2027-08-31 00:00:00	valide	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:40:22.526
\.


--
-- Data for Name: Bulletin; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Bulletin" (id, "eleveId", "classeId", "periodeId", version, statut, moyennes, "moyenneGenerale", rang, "appreciationGenerale", "decisionConseil", "pdfUrl", "creeParId", "dateCreation", "dateValidationPp", "validePpParId", "dateValidationDirection", "valideDirectionParId", "datePublication", "updatedAt") FROM stdin;
cmtmeq6rf00k7uhkswslpekv7	cmtmencnz004buhks96bk4qi3	cmtmen0wc0027uhks4c96aay6	cmtmen1jd002duhksrjjlc7i8	1	publie	{"MATHS":14.5,"FR":13,"HG":15.5}	14.3	2	Trimestre solide, continue ainsi !	admis	/documents/bulletins/bulletin-1-t1.pdf	cmtmen282002juhksytux1kr3	2026-09-04 03:41:30.171	2026-12-10 00:00:00	cmtmemw4t000tuhkslywkbxhv	2026-12-12 00:00:00	cmtmemw4t000tuhkslywkbxhv	2026-12-13 00:00:00	2026-09-04 03:41:30.171
cmtmeq72t00k9uhksxfbhcocg	cmtmendas004fuhksd51jkouv	cmtmen0wc0027uhks4c96aay6	cmtmen1jd002duhksrjjlc7i8	1	valide_pp	{"MATHS":11,"FR":16.5,"HG":12}	13.2	4	Bon trimestre en français.	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:41:30.581	2026-12-11 00:00:00	cmtmemw4t000tuhkslywkbxhv	\N	\N	\N	2026-09-04 03:41:30.581
cmtmeq7e200kbuhksyu01vri1	cmtmendmp004juhks3nrshdg4	cmtmen0wc0027uhks4c96aay6	cmtmen1jd002duhksrjjlc7i8	1	en_construction	{"MATHS":9.5,"FR":10.5,"HG":11}	\N	\N	\N	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:41:30.986	\N	\N	\N	\N	\N	2026-09-04 03:41:30.986
\.


--
-- Data for Name: BulletinAppreciation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BulletinAppreciation" (id, "bulletinId", "matiereId", appreciation, "enseignantId", "periodeId") FROM stdin;
cmtmeqnzq00n2uhkss46g12al	cmtmeq6rf00k7uhkswslpekv7	cmtmen2p9002nuhks1jtezmpw	Travail sérieux et régulier, continuez ainsi.	cmtmen282002juhksytux1kr3	\N
cmtmeqob100n4uhks7njdrxow	cmtmeq6rf00k7uhkswslpekv7	cmtmen3s1002tuhks3wiukm2a	Travail sérieux et régulier, continuez ainsi.	cmtmen3em002puhkso88h3lni	\N
\.


--
-- Data for Name: BulletinPaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BulletinPaie" (id, "ecoleId", "personnelId", periode, "salaireBrut", "salaireNet", "cotisationsTotales", "retenuesTotales", "primesTotales", "netAPayer", devise, statut, "dateEdition", "dateValidation", "datePaiement", "valideParId", "pdfUrl") FROM stdin;
cmtmeogl200dcuhksic59i7f3	cmtmemsqm0004uhkso4f52k70	cmtmen2ds002luhksrm9r1gw6	2026-08	28000000	21000000	7000000	0	2500000	23500000	XOF	valide	2026-09-04 03:40:09.591	2026-09-04 03:40:09.587	\N	cmtmemw4t000tuhkslywkbxhv	\N
\.


--
-- Data for Name: CahierTexte; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CahierTexte" (id, "ecoleId", "classeId", "matiereId", "enseignantId", "periodeId", statut, "dateCreation") FROM stdin;
cmtmeonuj00efuhks18inogme	cmtmemsqm0004uhkso4f52k70	cmtmen0wc0027uhks4c96aay6	cmtmen2p9002nuhks1jtezmpw	cmtmen2ds002luhksrm9r1gw6	cmtmen1jd002duhksrjjlc7i8	actif	2026-09-04 03:40:19.003
\.


--
-- Data for Name: CalendrierScolaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CalendrierScolaire" (id, "ecoleId", "anneeScolaireId", type, libelle, "dateDebut", "dateFin") FROM stdin;
cmtmenw9g0091uhkshok8zc5f	cmtmemsqm0004uhkso4f52k70	cmtmemwgb000vuhks37pmo695	vacances	Toussaint	2026-10-25 00:00:00	2026-11-02 00:00:00
cmtmenw9g0092uhkszvv95ww1	cmtmemsqm0004uhkso4f52k70	cmtmemwgb000vuhks37pmo695	vacances	Noël	2026-12-19 00:00:00	2027-01-04 00:00:00
cmtmenw9g0093uhksav4d006v	cmtmemsqm0004uhkso4f52k70	cmtmemwgb000vuhks37pmo695	jour_ferie	Tabaski	2026-08-22 00:00:00	2026-08-22 00:00:00
cmtmenw9g0094uhks0ov08gpy	cmtmemsqm0004uhkso4f52k70	cmtmemwgb000vuhks37pmo695	journee_pedagogique	Formation équipe	2026-09-01 00:00:00	2026-09-01 00:00:00
\.


--
-- Data for Name: Candidature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Candidature" (id, "offreId", nom, prenom, email, telephone, "cvUrl", "lettreMotivation", source, "dateReception", statut, "etapeActuelle") FROM stdin;
cmtmeoihd00douhks4fu7qond	cmtmeoi5u00dmuhksz4blfuqd	Ba	Awa	awa.ba@example.com	+221 77 000 11 22	\N	\N	offre	2026-09-04 03:40:12.049	entretien	entretien_direction
\.


--
-- Data for Name: CandidatureAdmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CandidatureAdmission" (id, "sourceIp", "ecoleId", "niveauId", nom, prenom, "dateNaissance", "lieuNaissance", sexe, email, telephone, "parentNom", "parentTelephone", statut, "dateSoumission", "dateDecision", "parcoursAnterieur", "etablissementOrigine", "dossierComplet", "notesEntretien") FROM stdin;
cmtmeokp000e0uhkss054hbve	\N	cmtmemsqm0004uhkso4f52k70	cmtmemzmd001ruhksa9k9d5m8	Sow	Moussa	2015-03-12 00:00:00	Dakar	M	famille.sow@example.com	+221 78 333 44 55	Sow (père)	+221 78 333 44 55	test	2026-09-04 03:40:14.916	\N	CM2 - École publique Pikine	École élélémentaire Pikine Nord	t	\N
\.


--
-- Data for Name: CantineInscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CantineInscription" (id, "ecoleId", "eleveId", "classeId", "anneeScolaireId", "joursSemaine", "tarifJournalier", actif) FROM stdin;
cmtmeqcxr00l3uhks6lzbf9fe	cmtmemsqm0004uhkso4f52k70	cmtmencnz004buhks96bk4qi3	cmtmen0wc0027uhks4c96aay6	cmtmemwgb000vuhks37pmo695	[1,3,5]	150000	t
cmtmeqd9700l5uhksa9mkcki3	cmtmemsqm0004uhkso4f52k70	cmtmenfjq0057uhkse6sfakfv	cmtmen17v0029uhksmj1gava6	cmtmemwgb000vuhks37pmo695	[1,2,3,4,5]	120000	t
\.


--
-- Data for Name: CantineMenu; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CantineMenu" (id, "ecoleId", date, "platPrincipal", accompagnement, dessert, allergenes) FROM stdin;
cmtmeqho400luuhkskec7n60c	cmtmemsqm0004uhkso4f52k70	2026-09-04 00:00:00	Thiéboudienne	Riz blanc	\N	["poisson"]
cmtmeqhzg00lwuhks5842k722	cmtmemsqm0004uhkso4f52k70	2026-09-05 00:00:00	Yassa poulet	\N	Fruit de saison	["oeuf"]
cmtmeqi5a00lyuhksqo9q5cab	cmtmemsqm0004uhkso4f52k70	2026-09-06 00:00:00	Couscous légumes	\N	\N	[]
\.


--
-- Data for Name: CantinePresence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CantinePresence" (id, "ecoleId", "eleveId", date, present) FROM stdin;
cmtmeqimc00m0uhksjnarps9p	cmtmemsqm0004uhkso4f52k70	cmtmencnz004buhks96bk4qi3	2026-09-04 00:00:00	t
cmtmeqixo00m2uhkstoc6c7qz	cmtmemsqm0004uhkso4f52k70	cmtmenfjq0057uhkse6sfakfv	2026-09-04 00:00:00	t
\.


--
-- Data for Name: Chapitre; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Chapitre" (id, "programmeId", titre, ordre, "volumeHorairePrevu", contenu, ressources) FROM stdin;
cmtmeq3l900jfuhkso9e5kezv	cmtmeq39z00jduhks96d36ufj	Nombres décimaux	1	12	Addition, soustraction, multiplication des décimaux.	\N
cmtmeq3wl00jhuhksfzhyfc4p	cmtmeq39z00jduhks96d36ufj	Proportionnalité	2	10	\N	\N
cmtmeq48e00jjuhksgs015fpe	cmtmeq39z00jduhks96d36ufj	Figures usuelles	3	14	\N	\N
cmtmeq56g00jruhksaja2kwtd	cmtmeq50t00jpuhks6ss2z0wx	Les types de phrases	1	10	\N	\N
cmtmeq5nf00jxuhksynju7x9b	cmtmeq5hr00jvuhksc41xxn7k	Les grandes découvertes	1	12	\N	\N
\.


--
-- Data for Name: Classe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Classe" (id, "niveauId", "anneeScolaireId", "ecoleId", code, libelle, "capaciteMax", "enseignantPrincipalId") FROM stdin;
cmtmen0wc0027uhks4c96aay6	cmtmemzmd001ruhksa9k9d5m8	cmtmemwgb000vuhks37pmo695	cmtmemsqm0004uhkso4f52k70	6A	Sixième A	35	cmtmen2ds002luhksrm9r1gw6
cmtmen17v0029uhksmj1gava6	cmtmemzsh001tuhksnocdtqhy	cmtmemwgb000vuhks37pmo695	cmtmemsqm0004uhkso4f52k70	5B	Cinquième B	35	cmtmen3mc002ruhkstwrtcias
cmtmen1dj002buhkszcf47okp	cmtmemzb3001nuhksn2633dzc	cmtmemwgb000vuhks37pmo695	cmtmemsqm0004uhkso4f52k70	CM2-A	CM2 A	30	cmtmen4aq002xuhksp108niko
cmtmeqh1f00lquhksng4lra8c	cmtmemzmd001ruhksa9k9d5m8	cmtmeqgf000lmuhksntq3hf7p	cmtmeqg3p00lkuhksukyqbaf3	6A-ETO	Sixième A (Étoile)	30	\N
\.


--
-- Data for Name: CommandeFournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CommandeFournisseur" (id, "ecoleId", "fournisseurId", numero, "dateCommande", "dateLivraisonPrevue", "dateLivraisonEffective", "montantTotal", devise, statut, "valideeParId") FROM stdin;
cmtmeou1m00fkuhksgbid2z5k	cmtmemsqm0004uhkso4f52k70	cmtmeotq900fiuhksgck86n9a	CMD-2026-001	2026-08-01 00:00:00	2026-08-15 00:00:00	\N	24000000	XOF	recue_partielle	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: Competence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Competence" (id, "ecoleId", "cycleId", "matiereId", libelle, ordre) FROM stdin;
cmtmeocwe00cruhks3gi89s2m	cmtmemsqm0004uhkso4f52k70	cmtmemwrq000xuhksq60h02rq	\N	Distinguer les lettres de l'alphabet	1
cmtmeod7o00ctuhksbl9v0fqw	cmtmemsqm0004uhkso4f52k70	cmtmemwrq000xuhksq60h02rq	\N	Compter jusqu'à 20	2
cmtmeq7po00kduhks23clm79a	cmtmemsqm0004uhkso4f52k70	cmtmemx31000zuhks27w7ig9i	\N	Lire couramment un texte adapté	1
cmtmeq80v00kfuhksfm2740ds	cmtmemsqm0004uhkso4f52k70	cmtmemx31000zuhks27w7ig9i	\N	Résoudre un problème à une étape	2
\.


--
-- Data for Name: CompteComptable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CompteComptable" (id, "ecoleId", numero, libelle, type, parent, solde, devise, actif) FROM stdin;
cmtmeoro500f4uhks62qsnqrt	cmtmemsqm0004uhkso4f52k70	512	Banque	actif	\N	250000000	XOF	t
cmtmeorzi00f6uhksth69jbkf	cmtmemsqm0004uhkso4f52k70	401	Fournisseurs	passif	\N	35000000	XOF	t
cmtmeos5800f8uhksls5brerc	cmtmemsqm0004uhkso4f52k70	411	Clients (parents)	actif	\N	85000000	XOF	t
cmtmeosav00fauhksvqgtendr	cmtmemsqm0004uhkso4f52k70	607	Achats de marchandises	charge	\N	42000000	XOF	t
\.


--
-- Data for Name: ConfigurationPaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConfigurationPaie" (id, "ecoleId", "tauxEmployeur", "tauxSalarie", "primesRecurrentes", "majParId", "dateMaj") FROM stdin;
cmtmeqfrw00ljuhks0kqd4udv	cmtmemsqm0004uhkso4f52k70	0.084	0.0524	[{"libelle":"Prime de transport","montant":100000}]	\N	2026-09-04 03:41:41.851
\.


--
-- Data for Name: Conge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Conge" (id, "personnelId", type, "dateDebut", "dateFin", statut, motif, "justificatifUrl", "traiteParId", "updatedAt") FROM stdin;
cmtmeq1v100j5uhks60d2svq8	cmtmen4aq002xuhksp108niko	maladie	2026-09-01 03:41:23.819	2026-09-10 03:41:23.819	valide	Arrêt maladie — certificat fourni	\N	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:41:23.82
cmtmeq26c00j7uhksqtc2i98p	cmtmen5to0039uhksjrbo8ufr	annuel	2026-12-21 00:00:00	2027-01-04 00:00:00	demande	Congés annuels fin d'année	\N	\N	2026-09-04 03:41:24.228
\.


--
-- Data for Name: ConseilClasse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConseilClasse" (id, "ecoleId", "classeId", "periodeId", date, salle, statut, "compteRendu", "presidentId") FROM stdin;
cmtmeooic00ejuhks274zlkid	cmtmemsqm0004uhkso4f52k70	cmtmen0wc0027uhks4c96aay6	cmtmen1jd002duhksrjjlc7i8	2026-10-15 17:00:00	Salle de conférence	planifie	Conseil de classe T1 — 25 élèves, 0 redoublement, 3 félicitations.	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: ConsentementCommunication; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConsentementCommunication" (id, "ecoleId", "utilisateurId", "eleveId", canal, accord, "dateAccord", "dateRetrait", motif) FROM stdin;
cmtmep54e00h7uhksluimadin	cmtmemsqm0004uhkso4f52k70	cmtmemw4t000tuhkslywkbxhv	\N	email	t	2026-08-01 00:00:00	\N	\N
\.


--
-- Data for Name: ConsentementImage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConsentementImage" (id, "ecoleId", "eleveId", accord, usage, "dateAccord", "valideParParentId", duree, "dateCreation", "dateMaj") FROM stdin;
cmtmep4t300h5uhkseggzvr5p	cmtmemsqm0004uhkso4f52k70	cmtmencnz004buhks96bk4qi3	t	site_web	2026-08-05 00:00:00	cmtmenh8a005puhks0g93atx4	annee_scolaire	2026-09-04 03:40:40.983	2026-09-04 03:40:40.983
\.


--
-- Data for Name: ConventionStage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConventionStage" (id, "stageId", "numeroConvention", "dateSignature", "signeParEleve", "signeParEcole", "signeParEntreprise", "fichierUrl", statut) FROM stdin;
cmtmeok2300dwuhksa8685cca	cmtmeojqq00duuhksqsikjwkz	CONV-2026-001	2026-08-22 00:00:00	t	t	t	\N	signe
\.


--
-- Data for Name: Conversation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Conversation" (id, "ecoleId", titre, type, "creeParId", "dateCreation", "dernierMessageAt") FROM stdin;
cmtmeow9600fxuhksw3q7ajtc	cmtmemsqm0004uhkso4f52k70	Direction ↔ Vie scolaire	direct	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:40:29.897	2026-09-04 03:40:29.897
\.


--
-- Data for Name: ConversationParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConversationParticipant" (id, "conversationId", "utilisateurId", role, "dateAjout", "dernierLectureAt", archive) FROM stdin;
cmtmeowkh00fyuhksnguwhcd2	cmtmeow9600fxuhksw3q7ajtc	cmtmemw4t000tuhkslywkbxhv	admin	2026-09-04 03:40:30.304	\N	f
cmtmeowkh00fzuhks5wc0pjqb	cmtmeow9600fxuhksw3q7ajtc	cmtmen282002juhksytux1kr3	membre	2026-09-04 03:40:30.304	\N	f
\.


--
-- Data for Name: CotisationSociale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CotisationSociale" (id, "bulletinId", libelle, assiette, "tauxEmployeur", "tauxSalarie", "partEmployeur", "partSalarie") FROM stdin;
cmtmeohj300diuhkshkfqkev9	cmtmeogl200dcuhksic59i7f3	IPM ( retraite)	28000000	0.084	0.0524	2352000	1467200
\.


--
-- Data for Name: CreneauHebdo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CreneauHebdo" (id, "emploiTempsId", "jourSemaine", "heureDebut", "heureFin", "salleId", "matiereId", "enseignantId", "classeId", type) FROM stdin;
cmtmeomkz00e7uhksmvcfflef	cmtmeom9l00e6uhksze8bdky9	1	08:00	10:00	\N	\N	\N	\N	cours
cmtmeomkz00e8uhksv9ep06fr	cmtmeom9l00e6uhksze8bdky9	3	10:00	12:00	\N	\N	\N	\N	cours
cmtmeomkz00e9uhksvlvipeyf	cmtmeom9l00e6uhksze8bdky9	5	08:00	10:00	\N	\N	\N	\N	cours
\.


--
-- Data for Name: CreneauRdv; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CreneauRdv" (id, "personnelId", date, "heureDebut", "heureFin", statut, lieu, "lienVisio") FROM stdin;
cmtmeoao900cjuhksz0pv72jk	cmtmen2ds002luhksrm9r1gw6	2026-09-30 16:00:00	16:00	16:15	reserve	presentiel	\N
\.


--
-- Data for Name: Cycle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Cycle" (id, "ecoleId", code, libelle, ordre, "modeEvaluation") FROM stdin;
cmtmemwrq000xuhksq60h02rq	cmtmemsqm0004uhkso4f52k70	MAT	Maternelle	1	competences
cmtmemx31000zuhks27w7ig9i	cmtmemsqm0004uhkso4f52k70	PRIM	Primaire	2	chiffre
cmtmemx8o0011uhkswply7le3	cmtmemsqm0004uhkso4f52k70	COLL	Collège	3	chiffre
cmtmemxew0013uhks3sqp5yae	cmtmemsqm0004uhkso4f52k70	LYC	Lycée	4	chiffre
\.


--
-- Data for Name: DeliberationConseil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DeliberationConseil" (id, "conseilId", "eleveId", decision, mention, "appreciationGenerale", "objectifSuivant", avis) FROM stdin;
cmtmeopao00epuhksxkgw3a2g	cmtmeooic00ejuhks274zlkid	cmtmencnz004buhks96bk4qi3	passage	felicitations	Excellent trimestre, travail rigoureux.	Maintenir le rythme en T2.	\N
\.


--
-- Data for Name: DemandeEffacement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DemandeEffacement" (id, "ecoleId", "utilisateurId", "cibleType", "cibleId", motif, description, statut, "dateDemande", "dateTraitement", "traiteParId", "donneesAnonymisees") FROM stdin;
cmtmep46c00h2uhksag79jmom	cmtmemsqm0004uhkso4f52k70	\N	eleve	cmtmene9z004ruhksv0sgodqm	obligation_legale	Élève transféré dans une autre école — droit à l'oubli.	en_cours	2026-09-04 03:40:40.163	\N	\N	\N
\.


--
-- Data for Name: Depense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Depense" (id, "ecoleId", categorie, description, montant, devise, "dateDepense", fournisseur, "justificatifUrl", "creeParId", validee, "valideeParId", "dateValidation", annulee, "updatedAt") FROM stdin;
cmtmenvaa008vuhksm8ynym2x	cmtmemsqm0004uhkso4f52k70	Fournitures bureau	Achat papier + cartouches imprimante	4500000	XOF	2026-09-12 00:00:00	Sénégal Boutique	\N	\N	t	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:39:41.983	f	2026-09-04 03:39:41.985
\.


--
-- Data for Name: Devoir; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Devoir" (id, "ecoleId", "classeId", "matiereId", "enseignantId", intitule, description, "dateAssignation", "dateRendu", sur, coefficient, type, "pieceJointeUrl", statut, "cahierTexteId") FROM stdin;
cmtmeon7i00ebuhksos65ahpm	cmtmemsqm0004uhkso4f52k70	cmtmen0wc0027uhks4c96aay6	cmtmen2p9002nuhks1jtezmpw	cmtmen2ds002luhksrm9r1gw6	Devoir maison n°1 — Fractions	Exercices 1 à 5 page 23.	2026-08-15 00:00:00	2026-08-22 00:00:00	20	1	dm	\N	corrige	\N
\.


--
-- Data for Name: Dispense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Dispense" (id, "ecoleId", "eleveId", "matiereId", motif, description, "dateDebut", "dateFin", "justificatifUrl", statut, "valideParId", "dateValidation") FROM stdin;
cmtmeopxq00etuhks1z90mcnv	cmtmemsqm0004uhkso4f52k70	cmtmendmp004juhks3nrshdg4	cmtmen3s1002tuhks3wiukm2a	medical	Asthme sévère — dispense d'EPS pour 4 semaines.	2026-08-15 00:00:00	2026-09-15 00:00:00	/uploads/certif-medical-eps.pdf	validee	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:40:21.709
\.


--
-- Data for Name: DocumentEleve; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DocumentEleve" (id, "eleveId", type, "fichierUrl", confidentiel, "dateAjout", "ajouteParId") FROM stdin;
cmtmeq1d200j1uhksljxdup5i	cmtmencnz004buhks96bk4qi3	acte_naissance	/uploads/docs/acte-diop.pdf	f	2026-09-04 03:41:23.174	cmtmemw4t000tuhkslywkbxhv
cmtmeq1ot00j3uhksvjcuj0cp	cmtmendas004fuhksd51jkouv	certificat_medical	/uploads/docs/cert-med.pdf	t	2026-09-04 03:41:23.598	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: DocumentGenere; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DocumentGenere" (id, "ecoleId", "templateId", "cibleType", "cibleId", titre, format, "fichierUrl", "tailleOctets", version, "genereParId", "dateGeneration", "hashContenu") FROM stdin;
cmtmepa6100hyuhkspy2592nn	cmtmemsqm0004uhkso4f52k70	cmtmep9uq00hwuhksxgukuy22	bulletin	demo-bulletin-1	Bulletin T1 - DIOP Awa - 6A	pdf	/documents/bulletin-demo.pdf	245000	1	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:40:47.93	sha256-demo-1
\.


--
-- Data for Name: DomainePersonnalise; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DomainePersonnalise" (id, "ecoleId", domaine, verifie, "enAttente", "enregistrementCname", "certificatSSL", "certificatExpireLe", "dateAjout", "dateVerification") FROM stdin;
cmtmep5r400hbuhkss6eqaff7	cmtmemsqm0004uhkso4f52k70	ecole.vinci.sn	t	f	vinci.platforme.com.	letsencrypt	2026-11-20 00:00:00	2026-08-01 00:00:00	2026-08-01 00:00:00
\.


--
-- Data for Name: EcheanceFrais; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EcheanceFrais" (id, "eleveId", "fraisId", montant, remise, "motifRemise", devise, "dateEcheance", "montantPaye", statut, source, "dateCreation", "updatedAt") FROM stdin;
cmtmenric007tuhks3mvtb93d	cmtmencnz004buhks96bk4qi3	cmtmenr13007puhkszip07r2z	7500000	0	\N	XOF	2026-09-15 00:00:00	7500000	payee	\N	2026-09-04 03:39:37.092	2026-09-04 03:39:37.092
cmtmenrvw007vuhksore28b70	cmtmencnz004buhks96bk4qi3	cmtmenrce007ruhksddwju464	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 03:39:37.581	2026-09-04 03:39:37.581
cmtmens7d007xuhkseeiyibvc	cmtmendas004fuhksd51jkouv	cmtmenr13007puhkszip07r2z	7500000	0	\N	XOF	2026-09-15 00:00:00	7500000	payee	\N	2026-09-04 03:39:37.792	2026-09-04 03:39:37.792
cmtmensd6007zuhksgrrh2ejy	cmtmendas004fuhksd51jkouv	cmtmenrce007ruhksddwju464	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 03:39:38.202	2026-09-04 03:39:38.202
cmtmensiw0081uhksum5n1341	cmtmendmp004juhks3nrshdg4	cmtmenr13007puhkszip07r2z	7500000	0	\N	XOF	2026-09-15 00:00:00	7500000	payee	\N	2026-09-04 03:39:38.408	2026-09-04 03:39:38.408
cmtmensok0083uhksvjode61b	cmtmendmp004juhks3nrshdg4	cmtmenrce007ruhksddwju464	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 03:39:38.612	2026-09-04 03:39:38.612
cmtmensu80085uhksf8kkfntb	cmtmendyo004nuhkszt18nggf	cmtmenr13007puhkszip07r2z	7500000	0	\N	XOF	2026-09-15 00:00:00	4000000	partiel	\N	2026-09-04 03:39:38.816	2026-09-04 03:39:38.816
cmtmenszv0087uhksvkf5wq6p	cmtmendyo004nuhkszt18nggf	cmtmenrce007ruhksddwju464	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 03:39:39.02	2026-09-04 03:39:39.02
cmtment5j0089uhks78mnd2ab	cmtmene9z004ruhksv0sgodqm	cmtmenr13007puhkszip07r2z	7500000	0	\N	XOF	2026-08-16 03:39:39.222	0	impayee	\N	2026-09-04 03:39:39.224	2026-09-04 03:39:39.224
cmtmentb7008buhksuqr85pna	cmtmene9z004ruhksv0sgodqm	cmtmenrce007ruhksddwju464	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 03:39:39.427	2026-09-04 03:39:39.427
cmtmentpf008duhks00ie6zvf	cmtmenelf004vuhkswidp3578	cmtmenr13007puhkszip07r2z	7500000	0	\N	XOF	2026-08-27 03:39:39.937	0	impayee	\N	2026-09-04 03:39:39.939	2026-09-04 03:39:39.939
cmtmentv2008fuhks2eycbv2u	cmtmenex1004zuhksfpxex9my	cmtmenr13007puhkszip07r2z	7500000	0	\N	XOF	2026-08-09 03:39:40.141	3000000	partiel	\N	2026-09-04 03:39:40.143	2026-09-04 03:39:40.143
cmtmenu0q008huhks4il0oppo	cmtmenf8d0053uhksbmz64ona	cmtmenr13007puhkszip07r2z	7500000	0	\N	XOF	2026-09-16 03:39:40.345	0	impayee	\N	2026-09-04 03:39:40.346	2026-09-04 03:39:40.346
cmtmenu6d008juhks3q2gnfec	cmtmenfjq0057uhkse6sfakfv	cmtmenr13007puhkszip07r2z	7500000	0	\N	XOF	2026-09-16 03:39:40.547	7500000	payee	\N	2026-09-04 03:39:40.549	2026-09-04 03:39:40.549
\.


--
-- Data for Name: Ecole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Ecole" (id, nom, slug, pays, devise, "fuseauHoraire", "logoUrl", "dateCreation", statut, "deletedAt", "planCourantId") FROM stdin;
cmtmemsqm0004uhkso4f52k70	Institut Léonard de Vinci	vinci	SN	XOF	Africa/Dakar	\N	2026-09-04 03:38:51.819	actif	\N	cmtmems3i0001uhksrbv9zfqd
cmtmeqg3p00lkuhksukyqbaf3	Cours Secondaire Étoile	etoile-demo	SN	XOF	Africa/Dakar	\N	2026-09-04 03:41:42.277	essai	\N	\N
\.


--
-- Data for Name: EcritureComptable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EcritureComptable" (id, "ecoleId", "journalId", date, "numeroPiece", libelle, statut, "valideParId", "dateValidation", "pieceJustificativeUrl") FROM stdin;
cmtmeosrx00feuhksv8dtac1o	cmtmemsqm0004uhkso4f52k70	cmtmeosgk00fcuhkswxrjj6hg	2026-08-05 00:00:00	ACH-2026-001	Achat fournitures bureau	valide	cmtmemw4t000tuhkslywkbxhv	2026-08-05 00:00:00	\N
\.


--
-- Data for Name: Eleve; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Eleve" (id, "ecoleId", matricule, nom, prenom, "dateNaissance", "lieuNaissance", sexe, "photoUrl", statut, "dateInscription", "dateSortie", "motifSortie", "classeActuelleId", adresse, allergies, "conditionMedicale", "contactUrgence", "consentementPortailEleve", "consentementPortailEleveDate", "consentementPhotoInterne", "consentementPhotoExterne", "utilisateurId", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmtmencnz004buhks96bk4qi3	cmtmemsqm0004uhkso4f52k70	EL-0001	Ade	Adepo	2010-01-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen0wc0027uhks4c96aay6	\N	\N	\N	\N	t	2026-09-15 00:00:00	t	t	\N	2026-09-04 03:39:17.855	2026-09-04 03:39:17.855	\N
cmtmendas004fuhksd51jkouv	cmtmemsqm0004uhkso4f52k70	EL-0002	Idriss	Bello	2009-02-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen0wc0027uhks4c96aay6	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 03:39:18.676	2026-09-04 03:39:18.676	\N
cmtmendmp004juhks3nrshdg4	cmtmemsqm0004uhkso4f52k70	EL-0003	Aminata	Camara	2008-03-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen0wc0027uhks4c96aay6	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 03:39:19.106	2026-09-04 03:39:19.106	\N
cmtmendyo004nuhkszt18nggf	cmtmemsqm0004uhkso4f52k70	EL-0004	Omar	Cissé	2007-04-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen0wc0027uhks4c96aay6	\N	\N	\N	\N	t	2026-09-15 00:00:00	t	f	\N	2026-09-04 03:39:19.536	2026-09-04 03:39:19.536	\N
cmtmene9z004ruhksv0sgodqm	cmtmemsqm0004uhkso4f52k70	EL-0005	Khadija	Dieng	2006-05-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen0wc0027uhks4c96aay6	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 03:39:19.943	2026-09-04 03:39:19.943	\N
cmtmenex1004zuhksfpxex9my	cmtmemsqm0004uhkso4f52k70	EL-0007	Sokhna	Faye	2004-07-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen17v0029uhksmj1gava6	\N	\N	\N	\N	t	2026-09-15 00:00:00	t	f	\N	2026-09-04 03:39:20.772	2026-09-04 03:39:20.772	\N
cmtmenf8d0053uhksbmz64ona	cmtmemsqm0004uhkso4f52k70	EL-0008	Awa	Gueye	2003-08-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen17v0029uhksmj1gava6	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 03:39:21.181	2026-09-04 03:39:21.181	\N
cmtmenfjq0057uhkse6sfakfv	cmtmemsqm0004uhkso4f52k70	EL-0009	Moussa	Kane	2002-09-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen17v0029uhksmj1gava6	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 03:39:21.59	2026-09-04 03:39:21.59	\N
cmtmenfvn005buhksee03wlhy	cmtmemsqm0004uhkso4f52k70	EL-0010	Astou	Mbaye	2001-10-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen1dj002buhkszcf47okp	\N	\N	\N	\N	f	\N	t	f	\N	2026-09-04 03:39:22.019	2026-09-04 03:39:22.019	\N
cmtmengd6005fuhks6vruo865	cmtmemsqm0004uhkso4f52k70	EL-0011	Ibou	Sarr	2000-11-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen1dj002buhkszcf47okp	\N	\N	\N	\N	f	\N	f	t	\N	2026-09-04 03:39:22.43	2026-09-04 03:39:22.43	\N
cmtmengoi005juhksyxdc9yk2	cmtmemsqm0004uhkso4f52k70	EL-0012	Mariama	Sylla	1999-12-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen1dj002buhkszcf47okp	\N	\N	\N	\N	f	\N	f	f	\N	2026-09-04 03:39:23.058	2026-09-04 03:39:23.058	\N
cmtmenelf004vuhkswidp3578	cmtmemsqm0004uhkso4f52k70	EL-0006	Pape	Diop	2005-06-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmen17v0029uhksmj1gava6	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	t	cmtmeno99006zuhksoqaz875o	2026-09-04 03:39:20.355	2026-09-04 03:39:33.083	\N
\.


--
-- Data for Name: EleveHistoriqueClasse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EleveHistoriqueClasse" (id, "eleveId", "classeId", "dateEntree", "dateSortie", motif) FROM stdin;
cmtmenczf004duhkssl06froy	cmtmencnz004buhks96bk4qi3	cmtmen0wc0027uhks4c96aay6	2026-09-01 00:00:00	\N	\N
cmtmendgj004huhksikvhce7v	cmtmendas004fuhksd51jkouv	cmtmen0wc0027uhks4c96aay6	2026-09-01 00:00:00	\N	\N
cmtmendsp004luhks5zp6z11h	cmtmendmp004juhks3nrshdg4	cmtmen0wc0027uhks4c96aay6	2026-09-01 00:00:00	\N	\N
cmtmene4c004puhkslfiv8t1h	cmtmendyo004nuhkszt18nggf	cmtmen0wc0027uhks4c96aay6	2026-09-01 00:00:00	\N	\N
cmtmenefr004tuhkskzk7meq1	cmtmene9z004ruhksv0sgodqm	cmtmen0wc0027uhks4c96aay6	2026-09-01 00:00:00	\N	\N
cmtmenerc004xuhksckvbn8f5	cmtmenelf004vuhkswidp3578	cmtmen17v0029uhksmj1gava6	2026-09-01 00:00:00	\N	\N
cmtmenf2q0051uhks99dksrs6	cmtmenex1004zuhksfpxex9my	cmtmen17v0029uhksmj1gava6	2026-09-01 00:00:00	\N	\N
cmtmenfe20055uhkspp26grxd	cmtmenf8d0053uhksbmz64ona	cmtmen17v0029uhksmj1gava6	2026-09-01 00:00:00	\N	\N
cmtmenfpm0059uhks6yn9dt2o	cmtmenfjq0057uhkse6sfakfv	cmtmen17v0029uhksmj1gava6	2026-09-01 00:00:00	\N	\N
cmtmeng1a005duhksjqgxkr3h	cmtmenfvn005buhksee03wlhy	cmtmen1dj002buhkszcf47okp	2026-09-01 00:00:00	\N	\N
cmtmengit005huhkspvzbkxx0	cmtmengd6005fuhks6vruo865	cmtmen1dj002buhkszcf47okp	2026-09-01 00:00:00	\N	\N
cmtmengum005luhks1s9tomcc	cmtmengoi005juhksyxdc9yk2	cmtmen1dj002buhkszcf47okp	2026-09-01 00:00:00	\N	\N
cmtmeq0w500ixuhkst2vwj69l	cmtmencnz004buhks96bk4qi3	cmtmen17v0029uhksmj1gava6	2025-09-01 00:00:00	2026-06-30 00:00:00	Passage en classe supérieure
cmtmeq17e00izuhksa7otwyyk	cmtmenelf004vuhkswidp3578	cmtmen0wc0027uhks4c96aay6	2025-09-01 00:00:00	2026-06-30 00:00:00	Réorientation
\.


--
-- Data for Name: EleveParent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EleveParent" ("eleveId", "parentId", "autoriteParentale") FROM stdin;
cmtmencnz004buhks96bk4qi3	cmtmenh8a005puhks0g93atx4	t
cmtmendas004fuhksd51jkouv	cmtmeni2v005tuhksekxa1f5a	t
cmtmendmp004juhks3nrshdg4	cmtmenim5005xuhksk2i3nbbf	t
cmtmendyo004nuhkszt18nggf	cmtmenj6a0061uhksywu9f9by	t
cmtmene9z004ruhksv0sgodqm	cmtmenjq80065uhks49015dt5	t
cmtmenelf004vuhkswidp3578	cmtmenk910069uhksylx8rcta	t
cmtmenex1004zuhksfpxex9my	cmtmenkv6006duhksgfcjpxzn	t
cmtmenf8d0053uhksbmz64ona	cmtmenlh6006huhksvlnmgjue	t
cmtmenfjq0057uhkse6sfakfv	cmtmenm0z006luhksfqj5v9ph	t
cmtmenfvn005buhksee03wlhy	cmtmenmnh006puhks3z97kxtr	t
cmtmengd6005fuhks6vruo865	cmtmenn7l006tuhkszls5nhwi	t
cmtmengoi005juhksyxdc9yk2	cmtmennsx006xuhks5gcmq6nf	t
\.


--
-- Data for Name: EmailLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmailLog" (id, "ecoleId", destinataire, sujet, message, statut, erreur, "dateEnvoi", "dateCreation") FROM stdin;
cmtmeqprn00n9uhkscrzwwcwf	cmtmemsqm0004uhkso4f52k70	famille.diop@example.com	Relance échéance	Bonjour, l'échéance de scolarité T1 est attendue.	en_attente	\N	\N	2026-09-04 03:41:54.795
\.


--
-- Data for Name: EmploiTemps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmploiTemps" (id, "ecoleId", "classeId", "enseignantId", "matiereId", "salleId", jour, "heureDebut", "heureFin", "recurrenceRule", "dateDebut", "dateFin", statut, "creeParId", "dateCreation", "updatedAt") FROM stdin;
cmtmeom9l00e6uhksze8bdky9	cmtmemsqm0004uhkso4f52k70	cmtmen0wc0027uhks4c96aay6	cmtmen2ds002luhksrm9r1gw6	cmtmen2p9002nuhks1jtezmpw	cmtmenvmf008wuhksqxwds3sy	lundi	08:00	10:00	FREQ=WEEKLY;UNTIL=20270630;BYDAY=MO	2026-09-01 00:00:00	2027-06-30 00:00:00	actif	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:40:16.953	2026-09-04 03:40:16.953
\.


--
-- Data for Name: EntreeCahierTexte; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EntreeCahierTexte" (id, "cahierTexteId", "seanceId", "dateCours", contenu, "travailAFaire", "ressourcesUrl", statut, "valideParId", "dateValidation") FROM stdin;
cmtmeoo6u00ehuhksy1h91btd	cmtmeonuj00efuhks18inogme	\N	2026-08-15 00:00:00	Chapitre 1 : Nombres décimaux — cours magistral + exercices d'application.	DM n°1 page 23 ex. 1-5.	\N	publie	cmtmemw4t000tuhkslywkbxhv	2026-08-15 00:00:00
\.


--
-- Data for Name: EntretienRecrutement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EntretienRecrutement" (id, "candidatureId", date, lieu, type, intervieweurs, "compteRendu", note, statut) FROM stdin;
cmtmeojfc00dsuhks82ob0f2n	cmtmeoihd00douhks4fu7qond	2026-08-25 10:00:00	Salle de conférence	physique	\N	Bon profil, maîtrise pédagogique solide. À confirmer par la direction.	4	realise
\.


--
-- Data for Name: Etage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Etage" (id, "batimentId", numero, libelle, "planUrl") FROM stdin;
cmtmepbqw00i7uhkslxldm415	cmtmepbfi00i5uhksztbues1w	0	Rez-de-chaussée	\N
cmtmepc2600i9uhks36bailio	cmtmepbfi00i5uhksztbues1w	1	Premier étage	\N
\.


--
-- Data for Name: EtapeAdmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EtapeAdmission" (id, "candidatureId", etape, statut, date, "valideParId", commentaire) FROM stdin;
cmtmeol0c00e1uhksjlmh9pqa	cmtmeokp000e0uhkss054hbve	depot_dossier	valide	2026-08-01 00:00:00	\N	\N
cmtmeol0c00e2uhks4ppqtrvx	cmtmeokp000e0uhkss054hbve	test_admission	en_attente	2026-08-25 00:00:00	\N	\N
\.


--
-- Data for Name: EtapeRecrutement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EtapeRecrutement" (id, "candidatureId", etape, statut, date, note, "decideurId") FROM stdin;
cmtmeoisx00dpuhks9ysmxigr	cmtmeoihd00douhks4fu7qond	tri_cv	valide	2026-08-10 00:00:00	\N	\N
cmtmeoisx00dquhks8kg8677k	cmtmeoihd00douhks4fu7qond	entretien_rh	valide	2026-08-15 00:00:00	\N	\N
\.


--
-- Data for Name: Evaluation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Evaluation" (id, "ecoleId", "classeId", "matiereId", "enseignantId", type, intitule, date, sur, coefficient, "periodeId", statut, "calculeDansMoyenne", "createdAt", "updatedAt") FROM stdin;
cmtmenora0071uhksigxnshyw	cmtmemsqm0004uhkso4f52k70	cmtmen0wc0027uhks4c96aay6	cmtmen2p9002nuhks1jtezmpw	cmtmen2ds002luhksrm9r1gw6	devoir	Devoir 1 - Nombres décimaux	2026-09-25 00:00:00	20	1	cmtmen1jd002duhksrjjlc7i8	planifiee	t	2026-09-04 03:39:33.514	2026-09-04 03:39:33.514
cmtmenp2n0073uhkskhys70ka	cmtmemsqm0004uhkso4f52k70	cmtmen0wc0027uhks4c96aay6	cmtmen3s1002tuhks3wiukm2a	cmtmen3mc002ruhkstwrtcias	composition	Composition T1 - Récit	2026-10-05 00:00:00	20	2	cmtmen1jd002duhksrjjlc7i8	planifiee	t	2026-09-04 03:39:33.935	2026-09-04 03:39:33.935
\.


--
-- Data for Name: EvaluationCompetence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EvaluationCompetence" (id, "eleveId", "competenceId", "periodeId", "niveauAcquisition", commentaire, "evalueParId", date) FROM stdin;
cmtmeq86l00kguhksjrzy4hzb	cmtmenfvn005buhksee03wlhy	cmtmeq7po00kduhks23clm79a	cmtmen1jd002duhksrjjlc7i8	maitrise	Fluidité remarquable.	cmtmen3em002puhkso88h3lni	2026-09-04 03:41:32.013
cmtmeq86l00khuhksy3tkbtux	cmtmenfvn005buhksee03wlhy	cmtmeq80v00kfuhksfm2740ds	cmtmen1jd002duhksrjjlc7i8	acquis	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:41:32.013
cmtmeq86l00kiuhksek2wy3uv	cmtmengd6005fuhks6vruo865	cmtmeq7po00kduhks23clm79a	cmtmen1jd002duhksrjjlc7i8	en_cours_d_acquisition	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:41:32.013
cmtmeq86l00kjuhkssc53xf7n	cmtmengoi005juhksyxdc9yk2	cmtmeq80v00kfuhksfm2740ds	cmtmen1jd002duhksrjjlc7i8	non_acquis	Besoin d'un soutien ciblé.	cmtmen282002juhksytux1kr3	2026-09-04 03:41:32.013
\.


--
-- Data for Name: EvaluationPersonnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EvaluationPersonnel" (id, "personnelId", "evaluateurId", periode, criteres, "commentaireGlobal", "dateEvaluation") FROM stdin;
cmtmeq2yn00jbuhks46kgz2tf	cmtmen2ds002luhksrm9r1gw6	cmtmemw4t000tuhkslywkbxhv	2025-2026	{"pedagogie":17,"assiduite":19,"travail_equipe":16,"communication_parents":15}	Excellente implication pédagogique. Points d'appui : rigueur, suivi individualisé.	2026-09-04 03:41:25.046
\.


--
-- Data for Name: ExamenOfficiel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExamenOfficiel" (id, "ecoleId", nom, "anneeScolaireId", "niveauId", "dateDebut", "dateFin") FROM stdin;
cmtmenww00096uhks1pj0ne40	cmtmemsqm0004uhkso4f52k70	BEPC 2027	cmtmemwgb000vuhks37pmo695	cmtmen03u001xuhksli1o2mq3	2027-06-15 00:00:00	2027-06-22 00:00:00
cmtmenx7c0098uhksdw5m0ws1	cmtmemsqm0004uhkso4f52k70	BAC 2027	cmtmemwgb000vuhks37pmo695	cmtmen0ql0025uhks91222tvs	2027-07-01 00:00:00	2027-07-12 00:00:00
\.


--
-- Data for Name: ExportDonnees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExportDonnees" (id, "ecoleId", "utilisateurId", "cibleType", "cibleId", format, statut, "fichierUrl", "tailleOctets", "dateDemande", "dateGeneration", "dateExpiration") FROM stdin;
cmtmep4hq00h3uhksdkzw731o	cmtmemsqm0004uhkso4f52k70	\N	eleve	cmtmencnz004buhks96bk4qi3	json	genere	/exports/eleve-export-demo.json	84000	2026-09-04 03:40:40.572	2026-09-04 03:40:40.572	2026-09-11 03:40:40.572
\.


--
-- Data for Name: FactureFournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FactureFournisseur" (id, "ecoleId", "fournisseurId", numero, "dateEmission", "dateReception", "dateEcheance", "montantHT", "montantTVA", "montantTTC", devise, statut, "controleeParId", "dateControle", "fichierUrl", "commandeId") FROM stdin;
cmtmeovb200fruhks7yoxmzov	cmtmemsqm0004uhkso4f52k70	cmtmeotq900fiuhksgck86n9a	FAC-F1-2026-008	2026-08-13 00:00:00	2026-08-14 00:00:00	2026-09-14 00:00:00	22200000	1800000	24000000	XOF	payee	cmtmemw4t000tuhkslywkbxhv	2026-08-15 00:00:00	\N	cmtmeou1m00fkuhksgbid2z5k
\.


--
-- Data for Name: FactureSaas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FactureSaas" (id, "ecoleId", "abonnementId", periode, montant, devise, statut, "modePaiement", "dateEmission", "datePaiement") FROM stdin;
cmtmemteg0008uhkswim8f3ac	cmtmemsqm0004uhkso4f52k70	cmtmemt330006uhkstkedwehb	2026-08	6500000	XOF	payee	virement	2026-09-04 03:38:52.888	2026-08-05 00:00:00
\.


--
-- Data for Name: FeatureFlag; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeatureFlag" (id, code, description, "actifGlobal", "rolloutPourcentage", "dateCreation", "dateMaj") FROM stdin;
cmtmep6e200heuhks2bhpwzmg	module_paie	Active le module de paie RH	f	0	2026-09-04 03:40:43.034	2026-09-04 03:40:43.034
\.


--
-- Data for Name: FeatureFlagEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeatureFlagEcole" (id, "featureFlagId", "ecoleId", actif, "dateActivation") FROM stdin;
cmtmep6pm00hguhksy2y76wuy	cmtmep6e200heuhks2bhpwzmg	cmtmemsqm0004uhkso4f52k70	t	2026-09-04 03:40:43.447
\.


--
-- Data for Name: FeuilleRoute; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeuilleRoute" (id, "ecoleId", "ligneId", date, statut, commentaire, "retardMin") FROM stdin;
cmtmeqj3d00m4uhksdmn2s1fr	cmtmemsqm0004uhkso4f52k70	cmtmeo2za00akuhksg3fqahg0	2026-09-04 00:00:00	en_cours	\N	18
\.


--
-- Data for Name: FicheSante; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FicheSante" (id, "ecoleId", "eleveId", "groupeSanguin", allergies, "traitementsEnCours", antecedents, "medecinTraitant", "telephoneUrgence", "contactUrgenceNom", "autorisationTraitement", "dateMiseAJour", "misAJourParId") FROM stdin;
cmtmeqdey00l7uhksnbahx641	cmtmemsqm0004uhkso4f52k70	cmtmencnz004buhks96bk4qi3	O+	Arachides (réaction cutanée)	Aucun	\N	Dr. Ndiaye — Cabinet Horizon	+221 77 123 45 67	Parent Adepo	t	2026-09-10 00:00:00	cmtmemw4t000tuhkslywkbxhv
cmtmeqdqn00l9uhksmz9gk0l0	cmtmemsqm0004uhkso4f52k70	cmtmenelf004vuhkswidp3578	A+	Pénicilline	Ventoline ( inhalateur conservé à l'infirmerie )	Asthme léger depuis 2022	Dr. Sow — Clinique Baobab	+221 76 555 12 34	Parent Diop	t	2026-09-12 00:00:00	cmtmemw4t000tuhkslywkbxhv
cmtmeqe1w00lbuhksoj0gepnn	cmtmemsqm0004uhkso4f52k70	cmtmenf8d0053uhksbmz64ona	B+	Aucune connue	\N	\N	Dr. Ndiaye — Cabinet Horizon	+221 78 900 11 22	Parent Gueye	f	2026-09-15 00:00:00	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: Fournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Fournisseur" (id, "ecoleId", nom, type, contact, email, telephone, adresse, rib, siret, statut, "dateCreation") FROM stdin;
cmtmeotq900fiuhksgck86n9a	cmtmemsqm0004uhkso4f52k70	ScolairePro SARL	fournisseur_prestataire	M. Fall	contact@scolairepro.sn	+221 33 860 00 00	Médina, Dakar	SN12 010 010 010123456789 00	SN123456789	actif	2026-09-04 03:40:26.625
\.


--
-- Data for Name: Frais; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Frais" (id, "ecoleId", libelle, type, montant, devise, periodicite, "niveauId", "anneeScolaireId", "updatedAt") FROM stdin;
cmtmenr13007puhkszip07r2z	cmtmemsqm0004uhkso4f52k70	Frais de scolarité - Trimestre 1	scolarite	7500000	XOF	trimestriel	\N	cmtmemwgb000vuhks37pmo695	2026-09-04 03:39:36.467
cmtmenrce007ruhksddwju464	cmtmemsqm0004uhkso4f52k70	Frais d'inscription	inscription	2500000	XOF	unique	\N	cmtmemwgb000vuhks37pmo695	2026-09-04 03:39:36.879
\.


--
-- Data for Name: GarderieInscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GarderieInscription" (id, "ecoleId", "eleveId", formule, "tarifHoraire", actif) FROM stdin;
cmtmeqkzu00miuhks3oxdawa1	cmtmemsqm0004uhkso4f52k70	cmtmenex1004zuhksfpxex9my	horaire	150000	t
cmtmeqlb700mkuhksfhih6lvk	cmtmemsqm0004uhkso4f52k70	cmtmenf8d0053uhksbmz64ona	horaire	150000	t
\.


--
-- Data for Name: GarderieSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GarderieSession" (id, "ecoleId", "eleveId", date, "heureArrivee", "heureDepart", "minutesFacturees") FROM stdin;
cmtmeqlgv00mmuhkskoeyj7dq	cmtmemsqm0004uhkso4f52k70	cmtmenex1004zuhksfpxex9my	2026-09-04 00:00:00	2026-09-04 17:00:00	2026-09-04 18:30:00	90
cmtmeqlsa00mouhksty24fpvz	cmtmemsqm0004uhkso4f52k70	cmtmenf8d0053uhksbmz64ona	2026-09-04 00:00:00	2026-09-04 17:00:00	\N	\N
\.


--
-- Data for Name: HabilitationPenale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HabilitationPenale" (id, "ecoleId", "personnelId", "numeroHabilitation", "dateDelivrance", "dateExpiration", "autoriteEmettrice", statut) FROM stdin;
cmtmeog9800dauhksvv93139c	cmtmemsqm0004uhkso4f52k70	cmtmen2ds002luhksrm9r1gw6	HAB-2026-0421	2026-08-01 00:00:00	2027-08-01 00:00:00	Tribunal de Dakar	validee
\.


--
-- Data for Name: Incident; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Incident" (id, "eleveId", "dateHeure", lieu, type, description, gravite, "declareParId", temoins) FROM stdin;
cmtmenxd1009auhksnqddt2ys	cmtmendas004fuhksd51jkouv	2026-09-18 00:00:00	Cour	comportement	Retards répétés en cours de mathématiques	leger	cmtmen282002juhksytux1kr3	\N
\.


--
-- Data for Name: InscriptionExamenOfficiel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InscriptionExamenOfficiel" (id, "examenOfficielId", "eleveId", "numeroTable", "centreExamen", statut, resultat, "amenagementAppliqueId", "certificatUrl") FROM stdin;
cmtmeqapv00kouhksvui0f7j8	cmtmenww00096uhks1pj0ne40	cmtmencnz004buhks96bk4qi3	SN-2027-00142	CEM Kennedy, Dakar	inscrit	\N	\N	\N
cmtmeqapv00kpuhks9caswuly	cmtmenww00096uhks1pj0ne40	cmtmendas004fuhksd51jkouv	SN-2027-00143	CEM Kennedy, Dakar	convoque	\N	\N	\N
\.


--
-- Data for Name: JetonAuth; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JetonAuth" (id, "utilisateurId", email, type, "tokenHash", "expireLe", utilise, "dateUtilisation", "dateCreation", "adresseIp", "userAgent") FROM stdin;
cmtmep0ug00gruhksrn3mj1ne	\N	editeur@platforme.com	reset_password	hash-jeton-reset-1	2026-09-04 04:40:35.844	f	\N	2026-09-04 03:40:35.844	\N	\N
cmtmep15z00gsuhksnwk12sk2	\N	direction@vinci.sn	reset_password	hash-jeton-reset-demo	2026-09-04 04:40:36.262	f	\N	2026-09-04 03:40:36.262	\N	\N
cmtmep1bn00gtuhksbn7z822h	\N	direction@vinci.sn	verify_email	hash-jeton-verify-demo	2026-09-11 03:40:36.464	t	2026-09-04 03:40:36.466	2026-09-04 03:40:36.466	\N	\N
\.


--
-- Data for Name: JournalComptable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JournalComptable" (id, "ecoleId", code, libelle, type) FROM stdin;
cmtmeosgk00fcuhkswxrjj6hg	cmtmemsqm0004uhkso4f52k70	ACH	Journal des achats	achat
\.


--
-- Data for Name: JustificationAbsence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JustificationAbsence" (id, "ecoleId", "eleveId", "presenceId", "dateAbsence", "dureeHeures", motif, description, "justificatifUrl", statut, "soumisParId", "valideParId", "dateSoumission", "dateValidation", "commentaireValidation") FROM stdin;
cmtmeoq9300evuhksklzxehie	cmtmemsqm0004uhkso4f52k70	cmtmendas004fuhksd51jkouv	\N	2026-08-20 00:00:00	4	maladie	Fièvre — certificat médical fourni.	/uploads/certif-medical-absence.pdf	valide	cmtmemw4t000tuhkslywkbxhv	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:40:22.119	2026-09-04 03:40:22.118	Justificatif accepté.
\.


--
-- Data for Name: LigneBudget; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneBudget" (id, "budgetId", categorie, "sousCategorie", libelle, "montantPrevu", "montantRealise", devise, "pourcentageRealise", "dateDerniereMaj") FROM stdin;
cmtmeoqvt00eyuhksen3y1msj	cmtmeoqki00exuhksn64zcfqr	recettes	frais_scolarite	Frais de scolarité	500000000	150000000	XOF	0	2026-09-04 03:40:22.937
cmtmeoqvt00ezuhksptx3e43v	cmtmeoqki00exuhksn64zcfqr	recettes	subventions	Subvention État	80000000	40000000	XOF	0	2026-09-04 03:40:22.937
cmtmeoqvt00f0uhksksitg0ay	cmtmeoqki00exuhksn64zcfqr	depenses	salaries	Salaires & charges	350000000	87500000	XOF	0	2026-09-04 03:40:22.937
cmtmeoqvt00f1uhksb5or3acy	cmtmeoqki00exuhksn64zcfqr	depenses	fonctionnement	Fonctionnement (eau/électricité/fournitures)	60000000	15000000	XOF	0	2026-09-04 03:40:22.937
cmtmeoqvt00f2uhksrb1s1hr4	cmtmeoqki00exuhksn64zcfqr	depenses	equipement	Équipements informatiques	120000000	0	XOF	0	2026-09-04 03:40:22.937
\.


--
-- Data for Name: LigneBulletinPaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneBulletinPaie" (id, "bulletinId", type, libelle, montant, sens, quantite, taux) FROM stdin;
cmtmeogwh00dduhksfd6wstfy	cmtmeogl200dcuhksic59i7f3	salaire_base	Salaire de base (35h)	25000000	plus	\N	\N
cmtmeogwh00deuhkscau7xlsj	cmtmeogl200dcuhksic59i7f3	prime	Prime d'ancienneté	1500000	plus	\N	\N
cmtmeogwh00dfuhks4pob4o1y	cmtmeogl200dcuhksic59i7f3	indemnite	Indemnité de transport	1000000	plus	\N	\N
cmtmeogwh00dguhksahb2hfzt	cmtmeogl200dcuhksic59i7f3	heures_sup	Heures supplémentaires (4h à 125%)	500000	plus	4	125000
\.


--
-- Data for Name: LigneCommande; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneCommande" (id, "commandeId", designation, quantite, unite, "prixUnitaire", "montantLigne", recu) FROM stdin;
cmtmeoud100fluhksoebt6dxp	cmtmeou1m00fkuhksgbid2z5k	Cahiers 200 pages (x100)	100	unite	80000	8000000	t
cmtmeoud100fmuhksmj0ua9ty	cmtmeou1m00fkuhksgbid2z5k	Stylos bille bleus (x500)	500	unite	10000	5000000	t
cmtmeoud100fnuhksmdk9cvwk	cmtmeou1m00fkuhksgbid2z5k	Calculatrices scientifiques (x20)	20	unite	550000	11000000	f
\.


--
-- Data for Name: LigneEcriture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneEcriture" (id, "ecritureId", "compteId", libelle, debit, credit) FROM stdin;
cmtmeot3a00ffuhksofewslui	cmtmeosrx00feuhksv8dtac1o	cmtmeosav00fauhksvqgtendr	Fournitures bureau	15000000	0
cmtmeot3b00fguhksoykfm14n	cmtmeosrx00feuhksv8dtac1o	cmtmeoro500f4uhks62qsnqrt	Règlement par virement	0	15000000
\.


--
-- Data for Name: LigneReleve; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneReleve" (id, "ecoleId", date, montant, libelle, rapprochee, "paiementId") FROM stdin;
cmtmeqogo00n5uhksiv9q98s9	cmtmemsqm0004uhkso4f52k70	2026-06-06 03:41:53.111	10000000	Virement scolarité — guichet 1	f	\N
cmtmeqogo00n6uhksqt9czr0l	cmtmemsqm0004uhkso4f52k70	2026-07-06 03:41:53.111	10000000	Virement scolarité — guichet 2	f	\N
cmtmeqogo00n7uhksqo2dtehy	cmtmemsqm0004uhkso4f52k70	2026-08-30 03:41:53.111	45000000	Subvention fonctionnement T4	f	\N
\.


--
-- Data for Name: ListeFourniture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ListeFourniture" (id, "niveauId", "anneeScolaireId", contenu, publiee, "datePublication") FROM stdin;
cmtmeqbtv00kvuhksnfgln353	cmtmemzmd001ruhksa9k9d5m8	cmtmemwgb000vuhks37pmo695	[{"article":"Cahier 200 pages","quantite":6},{"article":"Classeur à levier","quantite":2},{"article":"Calculatrice collège","quantite":1},{"article":"Kit géométrie","quantite":1}]	t	2026-08-20 00:00:00
cmtmeqc5h00kxuhksx6idi40l	cmtmemzb3001nuhksn2633dzc	cmtmemwgb000vuhks37pmo695	[{"article":"Cahier 96 pages","quantite":8},{"article":"Livre de lecture imposé","quantite":1}]	f	\N
\.


--
-- Data for Name: ManuelScolaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ManuelScolaire" (id, "ecoleId", titre, "matiereId", "niveauId", editeur, "anneeEdition", "quantiteStock") FROM stdin;
cmtmeo0x400a2uhkskfatrt4q	cmtmemsqm0004uhkso4f52k70	Mathématiques 6e — Collection Triangle	cmtmen2p9002nuhks1jtezmpw	cmtmemzmd001ruhksa9k9d5m8	Nathan	2024	40
\.


--
-- Data for Name: Matiere; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Matiere" (id, "ecoleId", code, libelle, coefficient, couleur) FROM stdin;
cmtmen2p9002nuhks1jtezmpw	cmtmemsqm0004uhkso4f52k70	MATHS	Mathématiques	1	#10b981
cmtmen3s1002tuhks3wiukm2a	cmtmemsqm0004uhkso4f52k70	FR	Français	1	#10b981
cmtmen4md002zuhksywgcar3i	cmtmemsqm0004uhkso4f52k70	HG	Histoire-Géographie	1	#10b981
cmtmen5aj0035uhks2o477y88	cmtmemsqm0004uhkso4f52k70	PC	Physique-Chimie	1	#10b981
cmtmen5zb003buhkskbuxi7sx	cmtmemsqm0004uhkso4f52k70	ANG	Anglais	1	#10b981
cmtmen6ni003huhks1b4p8cbf	cmtmemsqm0004uhkso4f52k70	EPS	EPS	1	#10b981
\.


--
-- Data for Name: MembreConseil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembreConseil" (id, "conseilId", "utilisateurId", role, present, observation) FROM stdin;
cmtmeootn00eluhks5cs9xxc3	cmtmeooic00ejuhks274zlkid	cmtmemw4t000tuhkslywkbxhv	president	t	\N
cmtmeop5000enuhksfm99c8gn	cmtmeooic00ejuhks274zlkid	cmtmen282002juhksytux1kr3	enseignant	t	\N
\.


--
-- Data for Name: MembreEquipeEducatif; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembreEquipeEducatif" (id, "planAccompagnementId", "utilisateurId", role, "dateInclusion") FROM stdin;
cmtmep8lk00hpuhksyn6b0ian	cmtmep8a900houhks115710yr	cmtmemw4t000tuhkslywkbxhv	referent	2026-08-10 00:00:00
cmtmep8lk00hquhksfxg88no3	cmtmep8a900houhks115710yr	cmtmen282002juhksytux1kr3	enseignant	2026-08-10 00:00:00
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Message" (id, "conversationId", "expediteurId", contenu, "dateEnvoi", supprime, "luPar") FROM stdin;
cmtmeox8p00g1uhksjvsp7l15	cmtmeow9600fxuhksw3q7ajtc	cmtmemw4t000tuhkslywkbxhv	Bonjour, merci de préparer le conseil de classe T1 pour le 15/10.	2026-09-04 03:40:31.174	f	\N
\.


--
-- Data for Name: MesureProtection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MesureProtection" (id, "signalementId", type, description, "decideePar", "dateDecision", "dateFin", statut) FROM stdin;
cmtmeof5d00d4uhkshi0zxoya	cmtmeoetv00d2uhks97q5gqtl	accompagnement_psychologique	Mise en place d'un suivi psychologue scolaire hebdomadaire.	Direction	2026-09-04 03:40:07.72	\N	planifiee
\.


--
-- Data for Name: ModeleMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ModeleMessage" (id, "ecoleId", code, sujet, corps, canaux, langue, actif) FROM stdin;
cmtmenymn009iuhksgwr9xjoy	cmtmemsqm0004uhkso4f52k70	rappel_echeance	Rappel : échéance de frais à venir	Bonjour {{parent_prenom}}, l'échéance de {{frais_libelle}} pour {{eleve_prenom}} {{eleve_nom}} est attendue pour le {{echeance_date}}. Montant : {{echeance_montant}}.	["sms","email","in_app"]	fr	t
cmtmenyxy009kuhksczv326pb	cmtmemsqm0004uhkso4f52k70	bulletin_publie	Bulletin {{periode}} disponible	Le bulletin {{periode}} de {{eleve_prenom}} {{eleve_nom}} est disponible sur le portail parent.	["email","in_app"]	fr	t
cmtmenz3l009muhkst98lr0xj	cmtmemsqm0004uhkso4f52k70	absence_signalee	Absence signalée	{{eleve_prenom}} {{eleve_nom}} a été absent(e) au cours de {{matiere_libelle}} le {{seance_date}}.	["sms","in_app"]	fr	t
\.


--
-- Data for Name: MouvementStock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MouvementStock" (id, "articleId", type, quantite, motif, "dateMouvement", "effectueParId") FROM stdin;
cmtmeo2i900aguhksusldka0y	cmtmeo26w00aeuhksa056t5ay	entree	300	Achat rentrée scolaire	2026-09-04 03:39:51.345	cmtmemw4t000tuhkslywkbxhv
cmtmeo2tl00aiuhks28bcrufb	cmtmeo26w00aeuhksa056t5ay	sortie	50	Distribution classes primaires	2026-09-04 03:39:51.753	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: Niveau; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Niveau" (id, "sectionId", code, libelle, ordre) FROM stdin;
cmtmemxvw0017uhksompav31a	cmtmemxkk0015uhksc7k26etz	PS	Petite Section	1
cmtmemy790019uhkszflhijj8	cmtmemxkk0015uhksc7k26etz	MS	Moyenne Section	2
cmtmemycw001buhks9npit1yz	cmtmemxkk0015uhksc7k26etz	GS	Grande Section	3
cmtmemyo6001fuhkscjjcnanm	cmtmemyij001duhksm5b38n5d	CP	Cours Préparatoire	4
cmtmemyu0001huhksmonjcacg	cmtmemyij001duhksm5b38n5d	CE1	Cours Élémentaire 1	5
cmtmemyzn001juhks6anni62p	cmtmemyij001duhksm5b38n5d	CE2	Cours Élémentaire 2	6
cmtmemz5e001luhks2ry7i5fq	cmtmemyij001duhksm5b38n5d	CM1	Cours Moyen 1	7
cmtmemzb3001nuhksn2633dzc	cmtmemyij001duhksm5b38n5d	CM2	Cours Moyen 2	8
cmtmemzmd001ruhksa9k9d5m8	cmtmemzgr001puhkscuhiq3v4	6E	Sixième	9
cmtmemzsh001tuhksnocdtqhy	cmtmemzgr001puhkscuhiq3v4	5E	Cinquième	10
cmtmemzy5001vuhksm43do3qu	cmtmemzgr001puhkscuhiq3v4	4E	Quatrième	11
cmtmen03u001xuhksli1o2mq3	cmtmemzgr001puhkscuhiq3v4	3E	Troisième	12
cmtmen0fb0021uhksrsqogruu	cmtmen09g001zuhksl18qbpxl	2NDE	Seconde	13
cmtmen0ky0023uhks1k5idalb	cmtmen09g001zuhksl18qbpxl	1ERE	Première	14
cmtmen0ql0025uhks91222tvs	cmtmen09g001zuhksl18qbpxl	TLE	Terminale	15
\.


--
-- Data for Name: Note; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Note" (id, "eleveId", "evaluationId", valeur, absent, dispense, commentaire, "saisiParId", "dateSaisie", "synchroniseDepuisHorsLigne") FROM stdin;
cmtmenp8w0075uhksaa6bg36m	cmtmencnz004buhks96bk4qi3	cmtmenora0071uhksigxnshyw	17	f	f	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:34.159	f
cmtmenpku0077uhkstlrw7dru	cmtmencnz004buhks96bk4qi3	cmtmenp2n0073uhkskhys70ka	11	f	f	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:39:34.59	f
cmtmenpqj0079uhksos815tcr	cmtmendas004fuhksd51jkouv	cmtmenora0071uhksigxnshyw	16	f	f	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:34.795	f
cmtmenpw8007buhksa7498x3t	cmtmendas004fuhksd51jkouv	cmtmenp2n0073uhkskhys70ka	13	f	f	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:39:35	f
cmtmenq2c007duhksj0khh33s	cmtmendmp004juhks3nrshdg4	cmtmenora0071uhksigxnshyw	11	f	f	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:35.221	f
cmtmenq88007fuhks2ayc11cy	cmtmendmp004juhks3nrshdg4	cmtmenp2n0073uhkskhys70ka	17	f	f	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:39:35.432	f
cmtmenqe0007huhksiepmjhfl	cmtmendyo004nuhkszt18nggf	cmtmenora0071uhksigxnshyw	10	f	f	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:35.64	f
cmtmenqjo007juhks89e4spi7	cmtmendyo004nuhkszt18nggf	cmtmenp2n0073uhkskhys70ka	17	f	f	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:39:35.844	f
cmtmenqpa007luhksyr8mmrlu	cmtmene9z004ruhksv0sgodqm	cmtmenora0071uhksigxnshyw	14	f	f	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:36.047	f
cmtmenquz007nuhks21jz1c7m	cmtmene9z004ruhksv0sgodqm	cmtmenp2n0073uhkskhys70ka	18	f	f	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:39:36.251	f
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "ecoleId", "destinataireType", "destinataireId", "modeleMessageId", sujet, corps, canal, statut, contexte, "dateCreation", "dateEnvoi", "dateLecture") FROM stdin;
cmtmenz9k009ouhkszd8na4co	cmtmemsqm0004uhkso4f52k70	personnel	cmtmemw4t000tuhkslywkbxhv	cmtmenymn009iuhksgwr9xjoy	Rappel : 2 échéances impayées à relancer	Les familles Diop, Sylla et Kane ont des échéances de scolarité impayées depuis le 15/09. Relance recommandée.	in_app	envoye	\N	2026-09-04 03:39:47.144	2026-09-04 03:39:47.141	\N
cmtmenzkw009quhksccp1sbeh	cmtmemsqm0004uhkso4f52k70	personnel	cmtmemw4t000tuhkslywkbxhv	\N	Nouvelle inscription validée	Astou Mbaye a été inscrite en CM2-A. Inscription validée par Awa Diop.	in_app	envoye	\N	2026-09-04 03:39:47.552	2026-09-04 03:39:47.55	\N
cmtmenzw7009suhksit5gwd2f	cmtmemsqm0004uhkso4f52k70	personnel	cmtmen7nr003juhksdt2mk4vc	\N	3 échéances en retard à relancer	Retards de 8 à 26 jours — restant dû cumulé : 900 000 XOF.	in_app	envoye	\N	2026-09-04 03:39:47.959	2026-09-04 03:39:47.955	\N
cmtmeo01u009uuhksnyybug41	cmtmemsqm0004uhkso4f52k70	personnel	cmtmen8nl003nuhksgz12jqmt	\N	1 demande de congé en attente	Ousmane Diallo — congés annuels du 21/12 au 04/01, à valider.	in_app	envoye	\N	2026-09-04 03:39:48.163	2026-09-04 03:39:48.161	\N
cmtmeo07h009wuhksfv4mhkxp	cmtmemsqm0004uhkso4f52k70	personnel	cmtmena0c003vuhksc09fi4im	\N	Appel non fait — CM2-A	2 séances planifiées ce matin, aucun pointage relevé. Relancer le titulaire.	in_app	envoye	\N	2026-09-04 03:39:48.366	2026-09-04 03:39:48.364	\N
cmtmeo0d6009yuhksxgie3w3s	cmtmemsqm0004uhkso4f52k70	personnel	cmtmenaod003zuhksqkqqnfnc	\N	2 candidatures à instruire	Dossiers complets reçus cette semaine — planifier les tests d'admission.	in_app	envoye	\N	2026-09-04 03:39:48.57	2026-09-04 03:39:48.569	\N
cmtmeo0mo00a0uhksq51jy1ns	cmtmemsqm0004uhkso4f52k70	personnel	cmtmenc0h0047uhksf83prdfl	\N	Rappel vaccin à vérifier	1 vaccination enregistrée avec rappel dépassé — contacter la famille.	in_app	envoye	\N	2026-09-04 03:39:48.912	2026-09-04 03:39:48.773	\N
\.


--
-- Data for Name: ObjectifPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ObjectifPlan" (id, "planAccompagnementId", description, domaine, indicateurs, echeance, atteint, "dateEvaluation") FROM stdin;
cmtmep98400hsuhks5li9eokl	cmtmep8a900houhks115710yr	Disponibilité permanente de l'inhalateur en classe	therapeutique	\N	2026-09-30 00:00:00	t	2026-09-04 03:40:46.706
\.


--
-- Data for Name: OffreEmploi; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OffreEmploi" (id, "ecoleId", poste, description, "profilRecherche", "typeContrat", "dateOuverture", "dateCloture", statut, lieu) FROM stdin;
cmtmeoi5u00dmuhksz4blfuqd	cmtmemsqm0004uhkso4f52k70	Enseignant Mathématiques (collège-lycée)	Poste à temps plein en mathématiques pour les classes 5e à Terminale.	Master Mathématiques + CAPES/AGREG. 3 ans d'expérience.	CDI	2026-08-01 00:00:00	2026-09-30 00:00:00	ouverte	Dakar
\.


--
-- Data for Name: Paiement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Paiement" (id, "ecoleId", "eleveId", "parentId", montant, devise, "modePaiement", "referenceTransaction", "datePaiement", "encaisseParId", "recuUrl", annule, "dateAnnulation", "motifAnnulation", "annuleParId") FROM stdin;
cmtmenuc8008luhksjlv9zmjf	cmtmemsqm0004uhkso4f52k70	cmtmencnz004buhks96bk4qi3	\N	10000000	XOF	espece	REF-0--3-1788493180752	2026-06-04 03:39:40.75	cmtmemw4t000tuhkslywkbxhv	\N	f	\N	\N	\N
cmtmenunk008nuhksyjg4l1nw	cmtmemsqm0004uhkso4f52k70	cmtmendas004fuhksd51jkouv	\N	10000000	XOF	mobile_money	REF-1--2-1788493181167	2026-07-04 03:39:41.166	cmtmemw4t000tuhkslywkbxhv	\N	f	\N	\N	\N
cmtmenut7008puhksk50znjpd	cmtmemsqm0004uhkso4f52k70	cmtmendmp004juhks3nrshdg4	\N	10000000	XOF	virement	REF-2--1-1788493181370	2026-08-04 03:39:41.37	cmtmemw4t000tuhkslywkbxhv	\N	f	\N	\N	\N
cmtmenuyv008ruhksmugpcnid	cmtmemsqm0004uhkso4f52k70	cmtmendyo004nuhkszt18nggf	\N	4000000	XOF	espece	REF-3-0-1788493181573	2026-09-04 03:39:41.573	cmtmemw4t000tuhkslywkbxhv	\N	f	\N	\N	\N
cmtmenv4i008tuhkshef1q3ge	cmtmemsqm0004uhkso4f52k70	cmtmenfjq0057uhkse6sfakfv	\N	7500000	XOF	cheque	REF-8--1-1788493181777	2026-08-04 03:39:41.777	cmtmemw4t000tuhkslywkbxhv	\N	f	\N	\N	\N
\.


--
-- Data for Name: PaiementEcheance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaiementEcheance" ("paiementId", "echeanceId", "montantApplique") FROM stdin;
cmtmenuc8008luhksjlv9zmjf	cmtmenric007tuhks3mvtb93d	7500000
cmtmenuc8008luhksjlv9zmjf	cmtmenrvw007vuhksore28b70	2500000
\.


--
-- Data for Name: PaiementFournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaiementFournisseur" (id, "ecoleId", "factureId", "datePaiement", montant, devise, mode, reference, "payeParId") FROM stdin;
cmtmeovmf00ftuhkshzgn9vu8	cmtmemsqm0004uhkso4f52k70	cmtmeovb200fruhks7yoxmzov	2026-08-20 00:00:00	24000000	XOF	virement	VIR-2026-042	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: ParentTuteur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ParentTuteur" (id, "ecoleId", "utilisateurId", nom, prenom, telephone, email, profession, "lienAvecEleve") FROM stdin;
cmtmenh8a005puhks0g93atx4	cmtmemsqm0004uhkso4f52k70	cmtmenh2k005nuhksak4bfupp	Ade	Papa	+221 76 000 00 00	parent.ade@gmail.com	Commerçant	pere
cmtmeni2v005tuhksekxa1f5a	cmtmemsqm0004uhkso4f52k70	cmtmenhx8005ruhksohoa7agc	Idriss	Maman	+221 76 000 00 00	parent.idriss@gmail.com	Commerçant	mere
cmtmenim5005xuhksk2i3nbbf	cmtmemsqm0004uhkso4f52k70	cmtmenigf005vuhksckbggcn5	Aminata	Papa	+221 76 000 00 00	parent.aminata@gmail.com	Commerçant	pere
cmtmenj6a0061uhksywu9f9by	cmtmemsqm0004uhkso4f52k70	cmtmenj0c005zuhksa184o4ee	Omar	Maman	+221 76 000 00 00	parent.omar@gmail.com	Commerçant	mere
cmtmenjq80065uhks49015dt5	cmtmemsqm0004uhkso4f52k70	cmtmenjkh0063uhksbc23cj7t	Khadija	Papa	+221 76 000 00 00	parent.khadija@gmail.com	Commerçant	pere
cmtmenk910069uhksylx8rcta	cmtmemsqm0004uhkso4f52k70	cmtmenk3d0067uhks008ald20	Pape	Maman	+221 76 000 00 00	parent.pape@gmail.com	Commerçant	mere
cmtmenkv6006duhksgfcjpxzn	cmtmemsqm0004uhkso4f52k70	cmtmenkpi006buhksae7ugx53	Sokhna	Papa	+221 76 000 00 00	parent.sokhna@gmail.com	Commerçant	pere
cmtmenlh6006huhksvlnmgjue	cmtmemsqm0004uhkso4f52k70	cmtmenlbc006fuhkss25si4bm	Awa	Maman	+221 76 000 00 00	parent.awa@gmail.com	Commerçant	mere
cmtmenm0z006luhksfqj5v9ph	cmtmemsqm0004uhkso4f52k70	cmtmenlvb006juhkslosbw2a1	Moussa	Papa	+221 76 000 00 00	parent.moussa@gmail.com	Commerçant	pere
cmtmenmnh006puhks3z97kxtr	cmtmemsqm0004uhkso4f52k70	cmtmenmht006nuhks7s86191y	Astou	Maman	+221 76 000 00 00	parent.astou@gmail.com	Commerçant	mere
cmtmenn7l006tuhkszls5nhwi	cmtmemsqm0004uhkso4f52k70	cmtmenn1f006ruhkssqf2p16o	Ibou	Papa	+221 76 000 00 00	parent.ibou@gmail.com	Commerçant	pere
cmtmennsx006xuhks5gcmq6nf	cmtmemsqm0004uhkso4f52k70	cmtmennn1006vuhksalbp0eu4	Mariama	Maman	+221 76 000 00 00	parent.mariama@gmail.com	Commerçant	mere
\.


--
-- Data for Name: PartenaireExterne; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PartenaireExterne" (id, type, nom, contact, email, adresse, actif) FROM stdin;
cmtmeoei900d0uhksod4ufxpa	crip	Cellule de Recueil des Informations Préoccupantes	+221 33 800 00 00	crip@sn.social.gouv	\N	t
\.


--
-- Data for Name: PassageArret; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PassageArret" (id, "feuilleId", "arretId", "heurePrevue", "heureReelle", montes, descendus, "transportArretId") FROM stdin;
cmtmeqjq200m6uhksz3biby16	cmtmeqj3d00m4uhksdmn2s1fr	cmtmeo3bc00aluhksz5i9i6sx	06:45	07:02	["cmtmendyo004nuhkszt18nggf"]	[]	\N
cmtmeqk1d00m8uhkstplhvl5a	cmtmeqj3d00m4uhksdmn2s1fr	cmtmeo3bc00amuhksgwqr5y8b	06:55	\N	[]	[]	\N
cmtmeqk7000mauhksva99c5gx	cmtmeqj3d00m4uhksdmn2s1fr	cmtmeo3bc00anuhksx3vsnbfv	07:20	\N	[]	[]	\N
\.


--
-- Data for Name: PassageInfirmerie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PassageInfirmerie" (id, "ecoleId", "eleveId", "ficheSanteId", "datePassage", motif, symptomes, "soinsAdministres", temperature, "personnelId", issue, "parentsNotifies", commentaire) FROM stdin;
cmtmeqed600lcuhksafb0fklo	cmtmemsqm0004uhkso4f52k70	cmtmencnz004buhks96bk4qi3	cmtmeqdey00l7uhksnbahx641	2026-09-18 10:15:00	Céphalées persistantes	Fatigue, sensibilité à la lumière	Repos 20 min, hydratation	37.2	cmtmemw4t000tuhkslywkbxhv	retour_classe	f	\N
cmtmeqed600lduhksvft65f5p	cmtmemsqm0004uhkso4f52k70	cmtmenelf004vuhkswidp3578	cmtmeqdqn00l9uhksmz9gk0l0	2026-09-20 14:40:00	Crise d'asthme légère après EPS	Respiration sifflante	Administration ventoline (autorisation parentale enregistrée), repos 30 min	36.9	cmtmemw4t000tuhkslywkbxhv	parents_contactes	t	\N
cmtmeqed600leuhks9umgpb2u	cmtmemsqm0004uhkso4f52k70	cmtmenf8d0053uhksbmz64ona	\N	2026-09-25 09:05:00	Chute dans la cour	Entorse cheville droite suspectée	Immobilisation, glace	36.8	cmtmemw4t000tuhkslywkbxhv	depart_hopital	t	\N
\.


--
-- Data for Name: Periode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Periode" (id, "ecoleId", "anneeScolaireId", libelle, code, "dateDebut", "dateFin", "typeBulletin") FROM stdin;
cmtmen1jd002duhksrjjlc7i8	cmtmemsqm0004uhkso4f52k70	cmtmemwgb000vuhks37pmo695	Trimestre 1	T1	2026-09-01 00:00:00	2026-12-15 00:00:00	college_lycee
cmtmen1ux002fuhksx13qqthe	cmtmemsqm0004uhkso4f52k70	cmtmemwgb000vuhks37pmo695	Trimestre 2	T2	2027-01-05 00:00:00	2027-03-30 00:00:00	college_lycee
cmtmen20l002huhksiz7kgizc	cmtmemsqm0004uhkso4f52k70	cmtmemwgb000vuhks37pmo695	Trimestre 3	T3	2027-04-01 00:00:00	2027-06-30 00:00:00	college_lycee
cmtmeqgq700louhksosogl1ay	cmtmeqg3p00lkuhksukyqbaf3	cmtmeqgf000lmuhksntq3hf7p	Trimestre 1	T1	2026-09-01 00:00:00	2026-12-15 00:00:00	college_lycee
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Permission" (id, code, libelle, module) FROM stdin;
cmtmepdha00iduhksp9lhes0f	eleves.lire	Consulter les élèves	eleves
cmtmepfe300ieuhksqqv8h4pv	eleves.ecrire	Créer/modifier les élèves	eleves
cmtmepgcb00ifuhksgi9srisf	notes.saisir	Saisir les notes	pedagogie
cmtmepkej00iguhksemoayrj4	bulletins.valider	Valider les bulletins	pedagogie
cmtmeplc800ihuhksecj01ktm	finances.voir	Consulter la trésorerie	finances
cmtmepm9w00iiuhksl2372p34	finances.ecrire	Opérations financières (encaissements, frais, annulations)	finances
cmtmepn7q00ijuhkskty0moa9	finances.valider	Valider les dépenses	finances
cmtmepo5a00ikuhksfs6z92g7	presences.saisir	Faire l'appel	presences
cmtmepp3f00iluhksf78wvbqy	rh.gerer	Gérer le personnel	rh
cmtmepq1000imuhksn2w55k41	communication.envoyer	Envoyer des communications	communication
cmtmepr4k00inuhks18wubddv	admin.saas	Administration SaaS	saas
cmtmeps2800iouhkshld8ygad	vie_scolaire.gerer	Gérer incidents et sanctions	vie_scolaire
cmtmepszw00ipuhks8hiey85w	securite.gerer	Gérer la sécurité du site (visiteurs, sorties)	securite
cmtmeptxj00iquhks74p3aw1m	examens.gerer	Gérer les examens officiels	examens
cmtmepuv400iruhks9fnjs3ib	services.gerer	Gérer cantine, bibliothèque, manuels	services
cmtmepvt400isuhksg0mpvvch	edt.gerer	Gérer les emplois du temps	edt
cmtmepwqv00ituhkssx2cke7x	sante.gerer	Gérer la santé et l'infirmerie	sante
cmtmepxrr00iuuhks6k06glww	salles.gerer	Gérer salles et calendrier	salles
cmtmepype00ivuhksbzey1vxo	protection.gerer	Gérer les signalements de protection de l'enfance	protection
\.


--
-- Data for Name: Personnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Personnel" (id, "ecoleId", "utilisateurId", matricule, nom, prenom, "dateNaissance", sexe, telephone, email, adresse, "photoUrl", "dateEmbauche", "dateSortie", "motifSortie", statut, "typeContrat", "salaireBrut", "cvUrl", "diplomePrincipal", "numeroSecuriteSociale", rib, "contactUrgence", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmtmen2ds002luhksrm9r1gw6	cmtmemsqm0004uhkso4f52k70	cmtmen282002juhksytux1kr3	ENS-1	Fall	Mamadou	\N	\N	+221 77 000 00 00	mamadou.fall@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 03:39:04.528	2026-09-04 03:39:04.528	\N
cmtmen3mc002ruhkstwrtcias	cmtmemsqm0004uhkso4f52k70	cmtmen3em002puhkso88h3lni	ENS-2	Sow	Fatou	\N	\N	+221 77 000 00 00	fatou.sow@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 03:39:06.132	2026-09-04 03:39:06.132	\N
cmtmen4aq002xuhksp108niko	cmtmemsqm0004uhkso4f52k70	cmtmen453002vuhks1kek4y7f	ENS-3	Ndiaye	Cheikh	\N	\N	+221 77 000 00 00	cheikh.ndiaye@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 03:39:07.01	2026-09-04 03:39:07.01	\N
cmtmen54v0033uhksph5gic8a	cmtmemsqm0004uhkso4f52k70	cmtmen4z60031uhks0on63d6x	ENS-4	Ba	Aïssatou	\N	\N	+221 77 000 00 00	aïssatou.ba@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 03:39:08.095	2026-09-04 03:39:08.095	\N
cmtmen5to0039uhksjrbo8ufr	cmtmemsqm0004uhkso4f52k70	cmtmen5nz0037uhksfmifv4na	ENS-5	Diallo	Ousmane	\N	\N	+221 77 000 00 00	ousmane.diallo@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 03:39:08.988	2026-09-04 03:39:08.988	\N
cmtmen6hu003fuhksmp2uv4y2	cmtmemsqm0004uhkso4f52k70	cmtmen6c6003duhksh7fvqi9u	ENS-6	Gueye	Mariama	\N	\N	+221 77 000 00 00	mariama.gueye@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 03:39:09.858	2026-09-04 03:39:09.858	\N
cmtmen7tg003luhkshe17lvra	cmtmemsqm0004uhkso4f52k70	cmtmen7nr003juhksdt2mk4vc	CPT-01	Sarr	Bineta	\N	\N	+221 76 000 00 00	comptable@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDD	28000000	\N	Comptable	\N	\N	\N	2026-09-04 03:39:11.572	2026-09-04 03:39:11.572	\N
cmtmen8ta003puhkspe1nmsvf	cmtmemsqm0004uhkso4f52k70	cmtmen8nl003nuhksgz12jqmt	RH-01	Ndiaye	Sophie	\N	\N	+221 76 000 00 00	rh@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	32000000	\N	Responsable RH	\N	\N	\N	2026-09-04 03:39:12.862	2026-09-04 03:39:12.862	\N
cmtmen9ha003tuhkszl4wxq8v	cmtmemsqm0004uhkso4f52k70	cmtmen9bm003ruhkssa0qmwjj	CEN-01	Diagne	Ibrahima	\N	\N	+221 76 000 00 00	censeur@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	34000000	\N	Censeur	\N	\N	\N	2026-09-04 03:39:13.726	2026-09-04 03:39:13.726	\N
cmtmena61003xuhksb7p834ns	cmtmemsqm0004uhkso4f52k70	cmtmena0c003vuhksc09fi4im	SUR-01	Kane	Modou	\N	\N	+221 76 000 00 00	surveillant@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDD	22000000	\N	Surveillant général	\N	\N	\N	2026-09-04 03:39:14.617	2026-09-04 03:39:14.617	\N
cmtmenau10041uhksk5xove5r	cmtmemsqm0004uhkso4f52k70	cmtmenaod003zuhksqkqqnfnc	SEC-01	Fall	Coumba	\N	\N	+221 76 000 00 00	secretariat@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	24000000	\N	Secrétaire	\N	\N	\N	2026-09-04 03:39:15.482	2026-09-04 03:39:15.482	\N
cmtmenbi20045uhks1fez8s67	cmtmemsqm0004uhkso4f52k70	cmtmenbce0043uhkskgg17n3o	AD-01	Mbaye	Khadija	\N	\N	+221 76 000 00 00	assistant@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	30000000	\N	Assistante de direction	\N	\N	\N	2026-09-04 03:39:16.346	2026-09-04 03:39:16.346	\N
cmtmenc6v0049uhksnpf30u6k	cmtmemsqm0004uhkso4f52k70	cmtmenc0h0047uhksf83prdfl	INF-01	Sow	Aminata	\N	\N	+221 76 000 00 00	infirmiere@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDD	23000000	\N	Infirmière	\N	\N	\N	2026-09-04 03:39:17.239	2026-09-04 03:39:17.239	\N
\.


--
-- Data for Name: PersonnelRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PersonnelRole" ("personnelId", "roleId", "classeId", "matiereId", "dateDebut", "dateFin") FROM stdin;
cmtmen2ds002luhksrm9r1gw6	cmtmemufr000duhksw2t5sl2g	cmtmen0wc0027uhks4c96aay6	cmtmen2p9002nuhks1jtezmpw	2026-09-01 00:00:00	\N
cmtmen3mc002ruhkstwrtcias	cmtmemufr000duhksw2t5sl2g	cmtmen17v0029uhksmj1gava6	cmtmen3s1002tuhks3wiukm2a	2026-09-01 00:00:00	\N
cmtmen4aq002xuhksp108niko	cmtmemufr000duhksw2t5sl2g	cmtmen1dj002buhkszcf47okp	cmtmen4md002zuhksywgcar3i	2026-09-01 00:00:00	\N
cmtmen54v0033uhksph5gic8a	cmtmemufr000duhksw2t5sl2g	cmtmen0wc0027uhks4c96aay6	cmtmen5aj0035uhks2o477y88	2026-09-01 00:00:00	\N
cmtmen5to0039uhksjrbo8ufr	cmtmemufr000duhksw2t5sl2g	cmtmen17v0029uhksmj1gava6	cmtmen5zb003buhkskbuxi7sx	2026-09-01 00:00:00	\N
cmtmen6hu003fuhksmp2uv4y2	cmtmemufr000duhksw2t5sl2g	cmtmen1dj002buhkszcf47okp	cmtmen6ni003huhks1b4p8cbf	2026-09-01 00:00:00	\N
cmtmen7tg003luhkshe17lvra	cmtmemulj000fuhks38zr69k1	\N	\N	2026-09-01 00:00:00	\N
cmtmen8ta003puhkspe1nmsvf	cmtmemuwy000juhkswcmkorz5	\N	\N	2026-09-01 00:00:00	\N
cmtmen9ha003tuhkszl4wxq8v	cmtmemv32000luhkslxpijhrv	\N	\N	2026-09-01 00:00:00	\N
cmtmena61003xuhksb7p834ns	cmtmemur7000huhksvvap2o0w	\N	\N	2026-09-01 00:00:00	\N
cmtmenau10041uhksk5xove5r	cmtmemv8q000nuhksemprf35w	\N	\N	2026-09-01 00:00:00	\N
cmtmenbi20045uhks1fez8s67	cmtmemved000puhksamhj4juv	\N	\N	2026-09-01 00:00:00	\N
cmtmenc6v0049uhksnpf30u6k	cmtmemvk3000ruhksjvd7uzit	\N	\N	2026-09-01 00:00:00	\N
\.


--
-- Data for Name: PieceJointe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PieceJointe" (id, "messageId", "nomFichier", url, taille, "mimeType", "dateUpload") FROM stdin;
cmtmeoxkb00g3uhks714edq6s	cmtmeox8p00g1uhksjvsp7l15	ordre_du_jour.pdf	/uploads/odj.pdf	124000	application/pdf	2026-09-04 03:40:31.595
\.


--
-- Data for Name: PlanAccompagnement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanAccompagnement" (id, "ecoleId", "eleveId", type, "dateMiseEnPlace", "dateDebut", "dateFin", statut, diagnostic, "objectifsGeneraux", "frequenceSuivi", "redigeParId", "valideParId", "dateValidation") FROM stdin;
cmtmep8a900houhks115710yr	cmtmemsqm0004uhkso4f52k70	cmtmendmp004juhks3nrshdg4	PAI	2026-08-10 00:00:00	2026-09-01 00:00:00	2027-08-31 00:00:00	actif	Asthme sévère — besoin d'accès au bureau infirmier et d'un protocole d'urgence.	Sécuriser la prise en charge médicale pendant les heures de cours.	trimestriel	cmtmemw4t000tuhkslywkbxhv	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:40:45.487
\.


--
-- Data for Name: PlanTarifaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanTarifaire" (id, nom, "prixMensuel", "prixAnnuel", devise, "limiteEleves", "modulesInclus", "dureeEssaiJours", actif, "createdAt", "updatedAt") FROM stdin;
cmtmemrr10000uhkspmj00vkm	Essentiel	2500000	27000000	XOF	\N	["eleves","personnel","pedagogique","presences","finances_basic"]	14	t	2026-09-04 03:38:50.744	2026-09-04 03:38:50.744
cmtmems3i0001uhksrbv9zfqd	Pro	6500000	70000000	XOF	100	["eleves","personnel","pedagogique","presences","finances_full","vie_scolaire","rh","services","salles","rdv"]	30	t	2026-09-04 03:38:51.198	2026-09-04 03:38:51.198
cmtmemsez0002uhkskmtv5ybw	Illimité	12000000	130000000	XOF	0	["*"]	30	t	2026-09-04 03:38:51.612	2026-09-04 03:38:51.612
\.


--
-- Data for Name: PointagePersonnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PointagePersonnel" (id, "ecoleId", "personnelId", date, "heureArrivee", "heureDepart", "retardMin", commentaire) FROM stdin;
cmtmeqkcr00mcuhks4uk60hp2	cmtmemsqm0004uhkso4f52k70	cmtmen2ds002luhksrm9r1gw6	2026-09-04 00:00:00	2026-09-04 07:10:00	\N	0	\N
cmtmeqko800meuhksk2q4l183	cmtmemsqm0004uhkso4f52k70	cmtmen3mc002ruhkstwrtcias	2026-09-04 00:00:00	2026-09-04 08:11:00	\N	0	\N
cmtmeqku500mguhks7e809x7h	cmtmemsqm0004uhkso4f52k70	cmtmen4aq002xuhksp108niko	2026-09-04 00:00:00	2026-09-04 09:10:00	\N	25	\N
\.


--
-- Data for Name: Presence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Presence" (id, "eleveId", "seanceId", statut, "minuteRetard", "motifAbsence", "justificatifUrl", "saisiParId", "dateSaisie", "synchroniseDepuisHorsLigne") FROM stdin;
cmtmeo5uh00axuhks994cjew6	cmtmencnz004buhks96bk4qi3	cmtmeo5j500avuhkskxv1hsi7	present	\N	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:55.673	f
cmtmeo66r00azuhksk6h7ulh4	cmtmendas004fuhksd51jkouv	cmtmeo5j500avuhkskxv1hsi7	absent	\N	Maladie (certificat fourni)	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:56.116	f
cmtmeo6cg00b1uhksd0rpkfvk	cmtmendmp004juhks3nrshdg4	cmtmeo5j500avuhkskxv1hsi7	present	\N	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:56.32	f
cmtmeo6i400b3uhksu0s7xa3h	cmtmendyo004nuhkszt18nggf	cmtmeo5j500avuhkskxv1hsi7	present	\N	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:56.525	f
cmtmeo6o500b5uhkscnu3kz6m	cmtmene9z004ruhksv0sgodqm	cmtmeo5j500avuhkskxv1hsi7	present	\N	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:56.741	f
cmtmeo7tb00bjuhksxybfzvbu	cmtmencnz004buhks96bk4qi3	cmtmeo6u400b7uhkstci5a7fe	present	\N	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:58.224	f
cmtmeo7z200bluhksax8h84af	cmtmendas004fuhksd51jkouv	cmtmeo6u400b7uhkstci5a7fe	absent	\N	Fever — parent notifié	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:58.43	f
cmtmeo84p00bnuhkszq1x6knw	cmtmendmp004juhks3nrshdg4	cmtmeo6u400b7uhkstci5a7fe	present	\N	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:58.634	f
cmtmeo8ad00bpuhksut87bfvo	cmtmendyo004nuhkszt18nggf	cmtmeo6u400b7uhkstci5a7fe	present	\N	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:58.837	f
cmtmeo8g000bruhksvl16utc6	cmtmene9z004ruhksv0sgodqm	cmtmeo6u400b7uhkstci5a7fe	present	\N	\N	\N	cmtmen282002juhksytux1kr3	2026-09-04 03:39:59.041	f
cmtmeo8ln00btuhkscmtllq3u	cmtmencnz004buhks96bk4qi3	cmtmeo70j00b9uhksa7dhn72b	present	\N	\N	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:39:59.244	f
cmtmeo8rb00bvuhks8xcub3oq	cmtmendas004fuhksd51jkouv	cmtmeo70j00b9uhksa7dhn72b	absent	\N	Fever — parent notifié	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:39:59.447	f
cmtmeo8wz00bxuhksslls3ne0	cmtmendmp004juhks3nrshdg4	cmtmeo70j00b9uhksa7dhn72b	present	\N	\N	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:39:59.651	f
cmtmeo92n00bzuhksuz48hlhl	cmtmendyo004nuhkszt18nggf	cmtmeo70j00b9uhksa7dhn72b	present	\N	\N	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:39:59.855	f
cmtmeo98a00c1uhksvq92r7e1	cmtmene9z004ruhksv0sgodqm	cmtmeo70j00b9uhksa7dhn72b	present	\N	\N	\N	cmtmen3em002puhkso88h3lni	2026-09-04 03:40:00.058	f
cmtmeo9dx00c3uhks6dmcq1qk	cmtmenelf004vuhkswidp3578	cmtmeo76600bbuhksnuh4cmac	present	\N	\N	\N	cmtmen453002vuhks1kek4y7f	2026-09-04 03:40:00.261	f
cmtmeo9jl00c5uhks51kppu8w	cmtmenex1004zuhksfpxex9my	cmtmeo76600bbuhksnuh4cmac	present	\N	\N	\N	cmtmen453002vuhks1kek4y7f	2026-09-04 03:40:00.465	f
cmtmeo9p900c7uhksgc8ce2pq	cmtmenf8d0053uhksbmz64ona	cmtmeo76600bbuhksnuh4cmac	retard	\N	Retard 20 min — transport	\N	cmtmen453002vuhks1kek4y7f	2026-09-04 03:40:00.669	f
cmtmeo9uw00c9uhks6ecvmwut	cmtmenfjq0057uhkse6sfakfv	cmtmeo76600bbuhksnuh4cmac	present	\N	\N	\N	cmtmen453002vuhks1kek4y7f	2026-09-04 03:40:00.873	f
cmtmeoa0k00cbuhksehvxgkk6	cmtmenelf004vuhkswidp3578	cmtmeo7bu00bduhks2esuv3kl	present	\N	\N	\N	cmtmen4z60031uhks0on63d6x	2026-09-04 03:40:01.076	f
cmtmeoa6g00cduhksyw8bmkr9	cmtmenex1004zuhksfpxex9my	cmtmeo7bu00bduhks2esuv3kl	present	\N	\N	\N	cmtmen4z60031uhks0on63d6x	2026-09-04 03:40:01.288	f
cmtmeoac900cfuhkstizjspeo	cmtmenf8d0053uhksbmz64ona	cmtmeo7bu00bduhks2esuv3kl	retard	\N	Retard 20 min — transport	\N	cmtmen4z60031uhks0on63d6x	2026-09-04 03:40:01.497	f
cmtmeoaik00chuhkse7yfz47f	cmtmenfjq0057uhkse6sfakfv	cmtmeo7bu00bduhks2esuv3kl	present	\N	\N	\N	cmtmen4z60031uhks0on63d6x	2026-09-04 03:40:01.724	f
\.


--
-- Data for Name: Programme; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Programme" (id, "ecoleId", "matiereId", "niveauId", "anneeScolaireId", titre, objectifs, "volumeHorairePrevu", publie) FROM stdin;
cmtmeq39z00jduhks96d36ufj	cmtmemsqm0004uhkso4f52k70	cmtmen2p9002nuhks1jtezmpw	cmtmemzmd001ruhksa9k9d5m8	cmtmemwgb000vuhks37pmo695	Mathématiques 6e — Programme annuel	Maîtriser les décimaux, la proportionnalité et la géométrie de base.	108	t
cmtmeq50t00jpuhks6ss2z0wx	cmtmemsqm0004uhkso4f52k70	cmtmen3s1002tuhks3wiukm2a	cmtmemzsh001tuhksnocdtqhy	cmtmemwgb000vuhks37pmo695	Français 5e — Programme annuel	Grammaire, conjugaison, expression écrite.	96	t
cmtmeq5hr00jvuhksc41xxn7k	cmtmemsqm0004uhkso4f52k70	cmtmen4md002zuhksywgcar3i	cmtmemzb3001nuhksn2633dzc	cmtmemwgb000vuhks37pmo695	Histoire-Géo CM2 — Programme annuel	Repères historiques et lecture de cartes.	72	t
\.


--
-- Data for Name: PushNotificationLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushNotificationLog" (id, "ecoleId", "notificationId", "pushTokenId", titre, corps, statut, "providerMessageId", "dateEnvoi", "dateLivraison", "dateCreation", clic) FROM stdin;
cmtmeoz5i00gcuhksjk963pgm	cmtmemsqm0004uhkso4f52k70	\N	cmtmeoyu300gbuhksnivuu1o1	Bulletins publiés	Les bulletins T1 sont disponibles sur le portail parent.	delivre	fcm-msg-1	2026-08-25 10:00:00	2026-08-25 10:00:02	2026-09-04 03:40:33.654	f
\.


--
-- Data for Name: PushToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushToken" (id, "utilisateurId", token, provider, p256dh, "authKey", plateforme, "deviceModel", "osVersion", "appVersion", langue, actif, "dateCreation", "derniereActivite") FROM stdin;
cmtmeoyu300gbuhksnivuu1o1	cmtmemw4t000tuhkslywkbxhv	fcm-token-demo-1	fcm	\N	\N	pwa	Pixel 7	Android 14	1.0.0	fr	t	2026-09-04 03:40:33.241	2026-09-04 03:40:33.24
\.


--
-- Data for Name: QuotaUsage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QuotaUsage" (id, "ecoleId", periode, ressource, consommation, limite, pourcentage, alerte80, alerte100, "dateDerniereMaj") FROM stdin;
cmtmep70z00hhuhksplu8sh65	cmtmemsqm0004uhkso4f52k70	2026-08	eleves	25	100	25	f	f	2026-09-04 03:40:43.86
cmtmep70z00hiuhksrbjintmb	cmtmemsqm0004uhkso4f52k70	2026-08	sms_envoyes	145	500	29	f	f	2026-09-04 03:40:43.86
cmtmep70z00hjuhksx5ef1vhy	cmtmemsqm0004uhkso4f52k70	2026-08	storage_go	2	10	20	f	f	2026-09-04 03:40:43.86
\.


--
-- Data for Name: RapportSauvegarde; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RapportSauvegarde" (id, "ecoleId", "utilisateurId", nom, type, configuration, format, partage, "dateCreation", "derniereExecution") FROM stdin;
cmtmepast00i2uhks8g7p36fo	cmtmemsqm0004uhkso4f52k70	cmtmemw4t000tuhkslywkbxhv	Suivi mensuel impayés	kpi_tableau_bord	{"filtres":{"statut":"impayee"},"colonnes":["eleve","montant"],"periode":"2026-08"}	table	f	2026-09-04 03:40:48.75	2026-09-04 03:40:48.748
\.


--
-- Data for Name: Rdv; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Rdv" (id, "creneauRdvId", "parentId", "eleveId", motif, statut, "createdAt") FROM stdin;
cmtmeobb800cluhksss66cjty	cmtmeoao900cjuhksz0pv72jk	cmtmenh8a005puhks0g93atx4	cmtmencnz004buhks96bk4qi3	Bilan mi-trimestre — progrès en maths	confirme	2026-09-04 03:40:02.756
\.


--
-- Data for Name: ReceptionCommande; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReceptionCommande" (id, "commandeId", "dateReception", "quantiteRecue", "bonLivraisonUrl", "controleQualite", commentaire, "receptionneParId") FROM stdin;
cmtmeouzp00fpuhksbzltx0hk	cmtmeou1m00fkuhksgbid2z5k	2026-08-12 00:00:00	130	/uploads/bl-001.pdf	t	Cahiers et stylos reçus conformes.	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: RegistreTraitement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RegistreTraitement" (id, "ecoleId", nom, finalite, "baseLegale", "donneesTraitees", "categoriesPersonnes", destinataires, "transfertsHorsUE", "dureeConservation", "mesuresSecurite", responsable, dpo, "dateCreation", "dateMaj") FROM stdin;
cmtmep5fr00h9uhks6oqc566i	cmtmemsqm0004uhkso4f52k70	Gestion des inscriptions élèves	Inscription et scolarisation des élèves	mission_publique	["identite_eleve","date_naissance","adresse","parent"]	["eleves","parents"]	équipe pédagogique, direction	Aucun	Durée de scolarité + 5 ans	\N	Directeur	DPO Éditeur SaaS	2026-09-04 03:40:41.798	2026-09-04 03:40:41.798
\.


--
-- Data for Name: RegleCalculMoyenne; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RegleCalculMoyenne" (id, "ecoleId", "cycleId", methode, "inclutAbsents", "notePlancher", "notePlafond", arrondi, "reglesSpecifiques") FROM stdin;
cmtmeq64s00k3uhkslper9fby	cmtmemsqm0004uhkso4f52k70	cmtmemx8o0011uhkswply7le3	moyenne_ponderee	f	0	20	2	{"coefficients":"par matiere","eleve_absent":"note neutralisee"}
cmtmeq6g300k5uhkslai0a1t4	cmtmemsqm0004uhkso4f52k70	cmtmemx31000zuhks27w7ig9i	moyenne_ponderee	f	0	20	0	\N
\.


--
-- Data for Name: Remplacement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Remplacement" (id, "congeId", "personnelAbsentId", "personnelRemplacantId", "dateDebut", "dateFin", statut) FROM stdin;
cmtmeq2ho00j9uhksctkfbtz0	cmtmeq1v100j5uhks60d2svq8	cmtmen4aq002xuhksp108niko	cmtmen6hu003fuhksmp2uv4y2	2026-09-01 03:41:24.634	2026-09-10 03:41:24.634	confirme
\.


--
-- Data for Name: RenduDevoir; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RenduDevoir" (id, "devoirId", "eleveId", "dateRendu", "contenuUrl", "commentaireEleve", note, appreciation, "corrigeParId", "dateCorrection", statut) FROM stdin;
cmtmeonj700eduhksu47fttbq	cmtmeon7i00ebuhksos65ahpm	cmtmencnz004buhks96bk4qi3	2026-09-04 03:40:18.594	/uploads/dm1-diop.pdf	\N	17	Très bon travail. Attention à la fraction irréductible ex.3.	cmtmen2ds002luhksrm9r1gw6	2026-08-24 00:00:00	corrige
\.


--
-- Data for Name: ReservationSalle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReservationSalle" (id, "salleId", "seanceId", date, "heureDebut", "heureFin", "reserveParId", motif, "createdAt") FROM stdin;
cmtmeqa2w00kluhks92eo4236	cmtmenvmf008wuhksqxwds3sy	cmtmeo5j500avuhkskxv1hsi7	2026-09-22 00:00:00	08:00	10:00	cmtmemw4t000tuhkslywkbxhv	Cours de mathématiques (séance régulière)	2026-09-04 03:41:34.472
cmtmeqae800knuhksqpr578zj	cmtmenvmf008xuhkse1wu0axl	\N	2026-10-14 00:00:00	17:00	19:00	cmtmemw4t000tuhkslywkbxhv	Réunion Comité d'Éducation à la Santé	2026-09-04 03:41:34.881
\.


--
-- Data for Name: ReunionCollective; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReunionCollective" (id, "classeId", date, heure, lieu, description) FROM stdin;
cmtmeqbcx00kruhks7we0wbi3	cmtmen0wc0027uhks4c96aay6	2026-10-03 00:00:00	18:00	Salle A101	Réunion de rentrée : présentation de l'équipe et du programme annuel.
cmtmeqbo700ktuhks5xftnqec	cmtmen1dj002buhkszcf47okp	2026-11-12 00:00:00	17:30	Salle B202	Préparation du concours d'entrée en sixième.
\.


--
-- Data for Name: RevisionPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RevisionPlan" (id, "planAccompagnementId", date, motif, constats, ajustements, "redigeParId") FROM stdin;
cmtmep9je00huuhksnein52ue	cmtmep8a900houhks115710yr	2026-09-04 03:40:47.115	Révision trimestrielle obligatoire	Plan respecté. Aucune crise rapportée ce trimestre.	Maintien du protocole actuel.	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, "ecoleId", code, libelle, "twofaRequis") FROM stdin;
cmtmemu3z000buhksccltc6k7	cmtmemsqm0004uhkso4f52k70	direction	Direction	t
cmtmemufr000duhksw2t5sl2g	cmtmemsqm0004uhkso4f52k70	enseignant	Enseignant	f
cmtmemulj000fuhks38zr69k1	cmtmemsqm0004uhkso4f52k70	comptabilite	Comptabilité	t
cmtmemur7000huhksvvap2o0w	cmtmemsqm0004uhkso4f52k70	surveillant	Surveillant	f
cmtmemuwy000juhkswcmkorz5	cmtmemsqm0004uhkso4f52k70	rh	Ressources Humaines	f
cmtmemv32000luhkslxpijhrv	cmtmemsqm0004uhkso4f52k70	censeur	Censeur	f
cmtmemv8q000nuhksemprf35w	cmtmemsqm0004uhkso4f52k70	secretariat	Secrétariat	f
cmtmemved000puhksamhj4juv	cmtmemsqm0004uhkso4f52k70	assistant_direction	Assistant de Direction	f
cmtmemvk3000ruhksjvd7uzit	cmtmemsqm0004uhkso4f52k70	infirmier	Infirmier(ère)	f
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RolePermission" ("roleId", "permissionId") FROM stdin;
cmtmemu3z000buhksccltc6k7	cmtmepdha00iduhksp9lhes0f
cmtmemu3z000buhksccltc6k7	cmtmepfe300ieuhksqqv8h4pv
cmtmemu3z000buhksccltc6k7	cmtmepkej00iguhksemoayrj4
cmtmemu3z000buhksccltc6k7	cmtmeplc800ihuhksecj01ktm
cmtmemu3z000buhksccltc6k7	cmtmepm9w00iiuhksl2372p34
cmtmemu3z000buhksccltc6k7	cmtmepn7q00ijuhkskty0moa9
cmtmemu3z000buhksccltc6k7	cmtmepp3f00iluhksf78wvbqy
cmtmemu3z000buhksccltc6k7	cmtmepq1000imuhksn2w55k41
cmtmemu3z000buhksccltc6k7	cmtmepr4k00inuhks18wubddv
cmtmemu3z000buhksccltc6k7	cmtmeps2800iouhkshld8ygad
cmtmemu3z000buhksccltc6k7	cmtmepszw00ipuhks8hiey85w
cmtmemu3z000buhksccltc6k7	cmtmeptxj00iquhks74p3aw1m
cmtmemu3z000buhksccltc6k7	cmtmepuv400iruhks9fnjs3ib
cmtmemu3z000buhksccltc6k7	cmtmepvt400isuhksg0mpvvch
cmtmemu3z000buhksccltc6k7	cmtmepwqv00ituhkssx2cke7x
cmtmemu3z000buhksccltc6k7	cmtmepxrr00iuuhks6k06glww
cmtmemu3z000buhksccltc6k7	cmtmepype00ivuhksbzey1vxo
cmtmemufr000duhksw2t5sl2g	cmtmepdha00iduhksp9lhes0f
cmtmemufr000duhksw2t5sl2g	cmtmepgcb00ifuhksgi9srisf
cmtmemufr000duhksw2t5sl2g	cmtmepo5a00ikuhksfs6z92g7
cmtmemufr000duhksw2t5sl2g	cmtmeps2800iouhkshld8ygad
cmtmemufr000duhksw2t5sl2g	cmtmepvt400isuhksg0mpvvch
cmtmemulj000fuhks38zr69k1	cmtmeplc800ihuhksecj01ktm
cmtmemulj000fuhks38zr69k1	cmtmepm9w00iiuhksl2372p34
cmtmemulj000fuhks38zr69k1	cmtmepn7q00ijuhkskty0moa9
cmtmemur7000huhksvvap2o0w	cmtmepdha00iduhksp9lhes0f
cmtmemur7000huhksvvap2o0w	cmtmepo5a00ikuhksfs6z92g7
cmtmemur7000huhksvvap2o0w	cmtmepszw00ipuhks8hiey85w
cmtmemur7000huhksvvap2o0w	cmtmeps2800iouhkshld8ygad
cmtmemuwy000juhkswcmkorz5	cmtmepp3f00iluhksf78wvbqy
cmtmemuwy000juhkswcmkorz5	cmtmepq1000imuhksn2w55k41
cmtmemv32000luhkslxpijhrv	cmtmepdha00iduhksp9lhes0f
cmtmemv32000luhkslxpijhrv	cmtmepo5a00ikuhksfs6z92g7
cmtmemv32000luhkslxpijhrv	cmtmeps2800iouhkshld8ygad
cmtmemv32000luhkslxpijhrv	cmtmepvt400isuhksg0mpvvch
cmtmemv32000luhkslxpijhrv	cmtmeptxj00iquhks74p3aw1m
cmtmemv32000luhkslxpijhrv	cmtmepkej00iguhksemoayrj4
cmtmemv32000luhkslxpijhrv	cmtmepype00ivuhksbzey1vxo
cmtmemv8q000nuhksemprf35w	cmtmepdha00iduhksp9lhes0f
cmtmemv8q000nuhksemprf35w	cmtmepfe300ieuhksqqv8h4pv
cmtmemv8q000nuhksemprf35w	cmtmepq1000imuhksn2w55k41
cmtmemved000puhksamhj4juv	cmtmepdha00iduhksp9lhes0f
cmtmemved000puhksamhj4juv	cmtmepfe300ieuhksqqv8h4pv
cmtmemved000puhksamhj4juv	cmtmepq1000imuhksn2w55k41
cmtmemved000puhksamhj4juv	cmtmepo5a00ikuhksfs6z92g7
cmtmemved000puhksamhj4juv	cmtmeps2800iouhkshld8ygad
cmtmemvk3000ruhksjvd7uzit	cmtmepwqv00ituhkssx2cke7x
cmtmemvk3000ruhksjvd7uzit	cmtmepdha00iduhksp9lhes0f
\.


--
-- Data for Name: Salle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Salle" (id, "ecoleId", nom, type, capacite, equipements, "batimentId", "etageId") FROM stdin;
cmtmenvmf008xuhkse1wu0axl	cmtmemsqm0004uhkso4f52k70	A102	classe	35	["tableau","bancs"]	\N	\N
cmtmenvmf008yuhks8qena0xv	cmtmemsqm0004uhkso4f52k70	LAB-SCIENCES	labo	24	["paillasses","microscopes","hotte"]	\N	\N
cmtmenvmf008zuhkshmnqehgj	cmtmemsqm0004uhkso4f52k70	SALLE-INFO	informatique	30	["ordinateurs","videoprojecteur"]	\N	\N
cmtmenvmf0090uhks3zif86tj	cmtmemsqm0004uhkso4f52k70	GYMNASE	sport	60	["tapis","barres"]	\N	\N
cmtmenvmf008wuhksqxwds3sy	cmtmemsqm0004uhkso4f52k70	A101	classe	35	["tableau","bancs"]	cmtmepbfi00i5uhksztbues1w	cmtmepbqw00i7uhkslxldm415
\.


--
-- Data for Name: SalleEquipement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SalleEquipement" (id, "salleId", type, quantite, etat, "dateDerniereMaintenance") FROM stdin;
cmtmepcur00iauhksau0kilsn	cmtmenvmf008wuhksqxwds3sy	videoprojecteur	1	fonctionnel	\N
cmtmepcur00ibuhks0nd87ivd	cmtmenvmf008wuhksqxwds3sy	TBI	1	fonctionnel	2026-07-15 00:00:00
cmtmepcur00icuhksajlqhjvb	cmtmenvmf008wuhksqxwds3sy	climatisation	1	panne	\N
\.


--
-- Data for Name: Sanction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sanction" (id, "incidentId", type, description, "dateDebut", "dateFin", "dureeHeures", statut, "decideParId", "notifieParents", "dateNotification") FROM stdin;
cmtmenxoe009cuhks9jlqvcq7	cmtmenxd1009auhksnqddt2ys	avertissement	Avertissement oral + convocation parent	\N	\N	\N	decidee	cmtmemw4t000tuhkslywkbxhv	t	2026-09-04 03:39:45.083
\.


--
-- Data for Name: Sauvegarde; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sauvegarde" (id, "nomFichier", "tailleOctets", checksum, type, statut, "creeParId", "dateCreation", "ecoleId") FROM stdin;
\.


--
-- Data for Name: Seance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Seance" (id, "classeId", "matiereId", "enseignantId", "chapitreId", date, "heureDebut", "heureFin", "salleId", "contenuPrevu", "contenuRealise", statut, "emploiTempsId") FROM stdin;
cmtmeo5j500avuhkskxv1hsi7	cmtmen0wc0027uhks4c96aay6	cmtmen2p9002nuhks1jtezmpw	cmtmen2ds002luhksrm9r1gw6	\N	2026-09-22 08:00:00	08:00	10:00	cmtmenvmf008wuhksqxwds3sy	Chapitre 1 : Nombres décimaux — addition et soustraction	\N	passee	\N
cmtmeo6u400b7uhkstci5a7fe	cmtmen0wc0027uhks4c96aay6	cmtmen2p9002nuhks1jtezmpw	cmtmen2ds002luhksrm9r1gw6	\N	2026-09-04 08:00:00	08:00	10:00	cmtmenvmf008wuhksqxwds3sy	Nombres décimaux — exercices	\N	passee	\N
cmtmeo70j00b9uhksa7dhn72b	cmtmen0wc0027uhks4c96aay6	cmtmen3s1002tuhks3wiukm2a	cmtmen3mc002ruhkstwrtcias	\N	2026-09-04 08:00:00	10:15	12:15	cmtmenvmf008wuhksqxwds3sy	Dictée et étude de texte	\N	passee	\N
cmtmeo76600bbuhksnuh4cmac	cmtmen17v0029uhksmj1gava6	cmtmen4md002zuhksywgcar3i	cmtmen4aq002xuhksp108niko	\N	2026-09-04 08:00:00	08:00	10:00	cmtmenvmf008xuhkse1wu0axl	L'Afrique précoloniale	\N	passee	\N
cmtmeo7bu00bduhks2esuv3kl	cmtmen17v0029uhksmj1gava6	cmtmen5aj0035uhks2o477y88	cmtmen54v0033uhksph5gic8a	\N	2026-09-04 08:00:00	10:15	12:15	cmtmenvmf008xuhkse1wu0axl	Les états de la matière	\N	passee	\N
cmtmeo7hi00bfuhks5mwwzo8n	cmtmen1dj002buhkszcf47okp	cmtmen5zb003buhkskbuxi7sx	cmtmen5to0039uhksjrbo8ufr	\N	2026-09-04 08:00:00	08:00	10:00	cmtmenvmf008wuhksqxwds3sy	Irregular verbs — unit 2	\N	passee	\N
cmtmeo7n600bhuhkssqax1o2e	cmtmen1dj002buhkszcf47okp	cmtmen6ni003huhks1b4p8cbf	cmtmen6hu003fuhksmp2uv4y2	\N	2026-09-04 08:00:00	10:15	12:15	cmtmenvmf008xuhkse1wu0axl	Athlétisme — course d'endurance	\N	passee	\N
\.


--
-- Data for Name: Section; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Section" (id, "cycleId", code, libelle) FROM stdin;
cmtmemxkk0015uhksc7k26etz	cmtmemwrq000xuhksq60h02rq	MAT	Maternelle
cmtmemyij001duhksm5b38n5d	cmtmemx31000zuhks27w7ig9i	PRIM	Primaire
cmtmemzgr001puhkscuhiq3v4	cmtmemx8o0011uhkswply7le3	COLL	Collège
cmtmen09g001zuhksl18qbpxl	cmtmemxew0013uhks3sqp5yae	LYC	Lycée
\.


--
-- Data for Name: SessionUtilisateur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SessionUtilisateur" (id, "utilisateurId", "tokenHash", "ecoleActiveId", fingerprint, "adresseIp", "userAgent", "deviceType", localisation, "dateCreation", "dateDerniereActivite", "dateExpiration", "expireManuellement", active) FROM stdin;
cmtmeozgu00geuhksxupwexic	cmtmemw4t000tuhkslywkbxhv	hash-demo-token-1	\N	fp-1	192.168.1.42	Mozilla/5.0 (Macintosh) Chrome/127.0	desktop	Dakar, Sénégal	2026-09-04 03:40:34.062	2026-09-04 03:40:34.061	2026-09-11 03:40:34.061	f	t
\.


--
-- Data for Name: SignalementMineur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SignalementMineur" (id, "ecoleId", "eleveId", type, description, gravite, source, "dateSignalement", "dateFaits", "lieuFaits", "declareParId", "signalantAnonyme", statut, "confidentialiteNiveau", "partenairesExternesIds", "transfertCrip", "dateTransfertCrip", "mesuresProvisoires") FROM stdin;
cmtmeoetv00d2uhks97q5gqtl	cmtmemsqm0004uhkso4f52k70	cmtmendas004fuhksd51jkouv	harcelement	Harcèlement verbal entre pairs observé en récréation. Trois témoins.	preoccupant	enseignant	2026-09-04 03:40:07.307	2026-08-20 00:00:00	Cour de récréation	cmtmen282002juhksytux1kr3	f	en_cours	restreint	["cmtmeoei900d0uhksod4ufxpa"]	f	\N	\N
\.


--
-- Data for Name: SignatureElectronique; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SignatureElectronique" (id, "documentGenereId", "signataireId", "signataireNom", "hashDocument", certificat, "horodatageRFC3161", "dateSignature", "adresseIp", "userAgent", niveau) FROM stdin;
cmtmepahi00i0uhksgw414bhk	cmtmepa6100hyuhkspy2592nn	cmtmemw4t000tuhkslywkbxhv	Direction - Vinci	sha256-demo-1	\N	\N	2026-09-04 03:40:48.341	192.168.1.42	Chrome/127	qualifie
\.


--
-- Data for Name: SmsLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SmsLog" (id, "ecoleId", "notificationId", destinataire, expediteur, message, provider, "providerMessageId", statut, "coutUnitaire", "coutTotal", segments, "dateEnvoi", "dateLivraison", "dateCreation", "codeErreur", tentative) FROM stdin;
cmtmeoyio00g9uhksdscqf2dm	cmtmemsqm0004uhkso4f52k70	\N	+221 78 333 44 55	\N	Rappel: réunion parents-profs le 5/9 à 17h. Direction.	orange_api	OMS-2026-123456	delivre	2500	2500	1	2026-08-25 10:00:00	2026-08-25 10:00:05	2026-09-04 03:40:32.831	\N	0
\.


--
-- Data for Name: SoldeConge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SoldeConge" (id, "ecoleId", "personnelId", annee, "droitsAcquis", "joursPris", "joursRestants", "reliquatAnterieur", "derniereMaj") FROM stdin;
cmtmeokdg00dyuhks181cegth	cmtmemsqm0004uhkso4f52k70	cmtmen2ds002luhksrm9r1gw6	2026	25	5	20	3	2026-09-04 03:40:14.5
\.


--
-- Data for Name: SortieAnticipee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SortieAnticipee" (id, "eleveId", date, heure, "autorisationSortieId", "recupereParNom", "validationExceptionnelle", "valideParId", "parentsNotifies", "dateSortie") FROM stdin;
cmtmeqcgq00kzuhks3mirbsyu	cmtmendmp004juhks3nrshdg4	2026-09-18 00:00:00	14:30	\N	Mme Camara (mère)	f	cmtmemw4t000tuhkslywkbxhv	t	2026-09-04 03:41:37.562
cmtmeqcs200l1uhksms1i7or1	cmtmenf8d0053uhksbmz64ona	2026-09-24 00:00:00	10:00	\N	M. Bello (père)	t	cmtmemw4t000tuhkslywkbxhv	t	2026-09-04 03:41:37.97
\.


--
-- Data for Name: Stage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Stage" (id, "ecoleId", "eleveId", entreprise, poste, "dateDebut", "dateFin", "tuteurEntreprise", "encadrantEcoleId", objectifs, evaluation, statut, "conventionUrl") FROM stdin;
cmtmeojqq00duuhksqsikjwkz	cmtmemsqm0004uhkso4f52k70	cmtmendyo004nuhkszt18nggf	Sonatel S.A.	Stage informatique - infrastructures	2026-09-01 00:00:00	2026-09-30 00:00:00	M. Ndiaye (DSI)	cmtmen2ds002luhksrm9r1gw6	Découverte du système d'information d'une grande entreprise. Participation au déploiement d'un serveur.	\N	planifie	\N
\.


--
-- Data for Name: StockArticle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockArticle" (id, "ecoleId", nom, categorie, quantite, "seuilAlerte", unite, "prixUnitaire") FROM stdin;
cmtmeo26w00aeuhksa056t5ay	cmtmemsqm0004uhkso4f52k70	Cahier 200 pages	Papeterie	250	50	pièce	75000
\.


--
-- Data for Name: StockageFichier; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockageFichier" (id, "ecoleId", "nomFichier", chemin, "mimeType", "tailleOctets", confidentiel, "cibleType", "cibleId", "uploadeParId", "dateUpload") FROM stdin;
cmtmeqq6x00nbuhksdo7t48mi	cmtmemsqm0004uhkso4f52k70	bienvenue.txt	cmtmemsqm0004uhkso4f52k70/bienvenue.txt	text/plain	130	f	eleve	cmtmencnz004buhks96bk4qi3	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:41:55.354
\.


--
-- Data for Name: StripeEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StripeEvent" (id, "eventIdStripe", type, donnees, traite, "dateReception", "dateTraitement", erreur) FROM stdin;
cmtmep7nh00hkuhksn6d6ujva	evt_2026_demo_001	invoice.payment_succeeded	{"invoiceId":"in_demo123","amountPaidCentimes":6500000}	t	2026-08-05 00:00:00	2026-08-05 00:00:00	\N
\.


--
-- Data for Name: SuiviSignalement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SuiviSignalement" (id, "signalementId", note, "auteurId", date) FROM stdin;
cmtmeofgo00d6uhks7aj2ocdh	cmtmeoetv00d2uhks97q5gqtl	Entretien réalisé avec l'élève. Comportement coopératif. Suivi à poursuivre.	cmtmemw4t000tuhkslywkbxhv	2026-09-04 03:40:08.136
\.


--
-- Data for Name: TemplateDocument; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TemplateDocument" (id, "ecoleId", code, libelle, type, "contenuTemplate", "variablesDisponibles", langue, actif, "dateCreation", "dateMaj") FROM stdin;
cmtmep9uq00hwuhksxgukuy22	cmtmemsqm0004uhkso4f52k70	bulletin	Bulletin trimestriel	html_template	<h1>{{ecole_nom}}</h1><h2>Bulletin {{periode_libelle}} — {{eleve_nom}}</h2><table>{{#notes}}<tr><td>{{matiere}}</td><td>{{moyenne}}</td></tr>{{/notes}}</table>	["ecole_nom","periode_libelle","eleve_nom","notes"]	fr	t	2026-09-04 03:40:47.522	2026-09-04 03:40:47.522
\.


--
-- Data for Name: TentativeConnexion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TentativeConnexion" (id, "utilisateurId", email, "adresseIp", "userAgent", succes, "motifEchec", date) FROM stdin;
1	\N	direction@vinci.sn	192.168.1.42	Chrome/127	t	\N	2026-09-04 03:40:37.49
2	\N	inconnu@example.com	10.0.0.5	Mozilla	f	utilisateur_inexistant	2026-09-04 03:40:37.901
3	\N	direction@vinci.sn	\N	\N	t	\N	2026-09-28 07:55:00
4	\N	inconnu@exemple.com	\N	\N	f	Identifiants incorrects	2026-09-28 09:12:00
5	\N	mamadou.fall@vinci.sn	\N	\N	t	\N	2026-09-28 10:30:00
\.


--
-- Data for Name: TestAdmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TestAdmission" (id, "candidatureId", matiere, date, note, sur, appreciation, "evalueParId") FROM stdin;
cmtmeolms00e4uhksq2tfuz79	cmtmeokp000e0uhkss054hbve	Mathématiques	2026-08-25 09:00:00	16.5	20	Bon niveau logique et arithmétique.	cmtmen282002juhksytux1kr3
\.


--
-- Data for Name: ThemeEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ThemeEcole" (id, "ecoleId", "couleurPrimaire", "couleurSecondaire", "couleurAccent", "couleurFond", "logoSidebarUrl", "faviconUrl", "policeFamille", "customCssUrl", "nomProduit", "dateMaj") FROM stdin;
cmtmep62g00hduhks47wosxzv	cmtmemsqm0004uhkso4f52k70	#059669	#0ea5e9	#f59e0b	#f8fafc	\N	\N	Inter	\N	ScolaGestion	2026-09-04 03:40:42.615
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Ticket" (id, "ecoleId", sujet, description, categorie, priorite, statut, "slaContractuelHeures", "slaEcheance", "creeParId", "assigneAId", "dateCreation", "dateCloture", "delaiResolutionMinutes") FROM stdin;
cmtmeodde00cvuhkskr947qxs	cmtmemsqm0004uhkso4f52k70	Bulletins PDF — erreur de génération pour 6A	Génération des bulletins T1 échoue sur la classe 6A (erreur 500).	technique	haute	en_cours	24	2026-09-05 03:40:05.423	cmtmemw4t000tuhkslywkbxhv	support-editeur-1	2026-09-04 03:40:05.425	\N	\N
\.


--
-- Data for Name: TicketMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TicketMessage" (id, "ticketId", "auteurId", "auteurRole", message, "pieceJointeUrl", interne, "dateEnvoi") FROM stdin;
cmtmeodot00cxuhkspemx2cbm	cmtmeodde00cvuhkskr947qxs	\N	direction_ecole	Bonjour, impossible de publier les bulletins depuis ce matin.	\N	f	2026-09-04 03:40:05.832
cmtmeoe0l00czuhks9v973rey	cmtmeodde00cvuhkskr947qxs	\N	support_editeur	Nous investiguons. Logs indiquent un timeout sur l'API PDF. Intervenant dans 2h.	\N	f	2026-09-04 04:40:06.259
\.


--
-- Data for Name: TicketStatutHistorique; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TicketStatutHistorique" (id, "ticketId", "ancienStatut", "nouveauStatut", "modifieParId", "dateChangement") FROM stdin;
1	cmtmeodde00cvuhkskr947qxs	ouvert	en_cours	support-editeur-1	2026-09-04 03:40:06.484
\.


--
-- Data for Name: TransportArret; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportArret" (id, "ligneId", nom, ordre, heure) FROM stdin;
cmtmeo3bc00aluhksz5i9i6sx	cmtmeo2za00akuhksg3fqahg0	Marché HLM	1	06:45
cmtmeo3bc00amuhksgwqr5y8b	cmtmeo2za00akuhksg3fqahg0	Sicap Liberté 2	2	06:55
cmtmeo3bc00anuhksx3vsnbfv	cmtmeo2za00akuhksg3fqahg0	École	3	07:20
\.


--
-- Data for Name: TransportInscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportInscription" (id, "ecoleId", "eleveId", "classeId", "ligneId", "arretMonteeId", "arretDescenteId", tarif, actif) FROM stdin;
cmtmeo43h00apuhks5s3c1oys	cmtmemsqm0004uhkso4f52k70	cmtmendyo004nuhkszt18nggf	cmtmen0wc0027uhks4c96aay6	cmtmeo2za00akuhksg3fqahg0	\N	\N	1500000	t
\.


--
-- Data for Name: TransportLigne; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportLigne" (id, "ecoleId", nom, vehicule, "chauffeurId") FROM stdin;
cmtmeo2za00akuhksg3fqahg0	cmtmemsqm0004uhkso4f52k70	Ligne Nord — Plateau	Bus 12 places	cmtmen6hu003fuhksmp2uv4y2
\.


--
-- Data for Name: TwoFactorBackupCode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TwoFactorBackupCode" (id, "utilisateurId", "codeHash", utilise, "dateUtilisation", "dateGeneration") FROM stdin;
cmtmep06q00ghuhks9vanec7a	cmtmemw4t000tuhkslywkbxhv	320020bf75b79026881c520159474ae194608168aed460dc4e4d7a2641f16f52	f	\N	2026-09-04 03:40:34.988
cmtmep06q00giuhkst9fn020b	cmtmemw4t000tuhkslywkbxhv	f0b10149d84e774be026b6728b991131b19fa92607dea1f3bea15037e5282bda	f	\N	2026-09-04 03:40:34.988
cmtmep06q00gjuhks341udjj8	cmtmemw4t000tuhkslywkbxhv	1c9cacd5f08fe40f2ad2f2b03e55a2621de7bccc89fd4a5c7d1f38885876d07b	f	\N	2026-09-04 03:40:34.988
cmtmep06q00gkuhkskvaczp9i	cmtmemw4t000tuhkslywkbxhv	da05c918203a3ab1289adb956bfc36a4486910efb053a6f752b72bef576dc67d	f	\N	2026-09-04 03:40:34.989
cmtmep06q00gluhks7d62ymnj	cmtmemw4t000tuhkslywkbxhv	165a880da591447d4eb6defa0b396c0e10b54483a31f540f32fcabef1e89913a	f	\N	2026-09-04 03:40:34.989
cmtmep06q00gmuhksth2j1nku	cmtmemw4t000tuhkslywkbxhv	c29633b0db451b9b10f7ab7525ef12e57a293036885e0ccc479c296d70568808	f	\N	2026-09-04 03:40:34.989
cmtmep06q00gnuhks5hne39qn	cmtmemw4t000tuhkslywkbxhv	00b7bd66583762f75d96135859c2009e83571e6ad6b0e213474d02dabda78ee7	f	\N	2026-09-04 03:40:34.993
cmtmep06q00gouhksewj96rc6	cmtmemw4t000tuhkslywkbxhv	f60d70f6460ff4626343afc29a666115d0fd6cf13cee309b0fd1bdbfb6e14627	f	\N	2026-09-04 03:40:34.993
cmtmep06q00gpuhks4tmcfctl	cmtmemw4t000tuhkslywkbxhv	7da5d08a2b6fceff681321508c08b4f5c37fa0d8a1af8ad6c74abc92672e29d1	f	\N	2026-09-04 03:40:34.993
cmtmep06q00gquhkslhgwmdl6	cmtmemw4t000tuhkslywkbxhv	7c64a711e876d19d75584e3ffbb987a4d974f9d5ce83a4deef3e7ff6ec1a7616	f	\N	2026-09-04 03:40:34.993
\.


--
-- Data for Name: TwoFactorMethod; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TwoFactorMethod" (id, "utilisateurId", methode, secret, telephone, email, actif, "dateActivation", "derniereUtilisation") FROM stdin;
cmtmeozsc00gguhks01j1y2do	cmtmemw4t000tuhkslywkbxhv	totp	JBSWY3DPEHPK3PXP	\N	\N	t	2026-08-01 00:00:00	\N
cmtmep1n200gvuhksrqjrd1wd	cmtmen7nr003juhksdt2mk4vc	totp	JBSWY3DPEHPK3PXP	\N	\N	t	2026-09-04 03:40:36.877	\N
\.


--
-- Data for Name: Utilisateur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Utilisateur" (id, "ecoleId", email, "motDePasseHash", telephone, nom, prenom, type, actif, "twofaActive", "derniereConnexion", "tentativesEchouees", "verrouilleJusqua", "consentementPortail", "consentementDate", "createdAt", "deletedAt") FROM stdin;
cmtmemtsl0009uhksjrhyx2nq	\N	editeur@platforme.com	scrypt$16384$8$1$6f3fa972e37da774b1ef47bb77cb927a$0c622110d6702cfaf97d0a00b1f2134dc14ab80bb2c17307445b3450b6696cf45c3c91061cb4d4adeed5c827eda7bcc1c8f7cbd9a25137a9e652f9ff6bbb55d6	\N	Éditeur	Super-Admin	super_admin	t	f	\N	0	\N	t	2026-09-04 03:38:53.395	2026-09-04 03:38:53.398	\N
cmtmemw4t000tuhkslywkbxhv	cmtmemsqm0004uhkso4f52k70	direction@vinci.sn	scrypt$16384$8$1$a98d38e23dac555f4ff56af433acfb72$15e748c69e7779d816ce9c07a0ff46bd19c8d232d8efa587789776287146d9ed0c45246f68dac44e15a8ced7b163557eeb72609f29d7a3256ead0ca7fd318b05	\N	Diop	Awa	personnel	t	t	\N	0	\N	t	2026-09-04 03:38:56.427	2026-09-04 03:38:56.429	\N
cmtmen282002juhksytux1kr3	cmtmemsqm0004uhkso4f52k70	mamadou.fall@vinci.sn	scrypt$16384$8$1$9e04b4076725982b46851f34c8045612$ece8036c36997440018e5f81f617f38606f896d7300a60d6b284ea6b854ac3c8c4367e9fcbcc81c1689646cf7b94388b56320bfdf736b3507f60a1226f44c4ee	\N	Fall	Mamadou	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:04.318	2026-09-04 03:39:04.321	\N
cmtmen3em002puhkso88h3lni	cmtmemsqm0004uhkso4f52k70	fatou.sow@vinci.sn	scrypt$16384$8$1$d222f9b1c5522fbca9e0840afab8b44c$58ed87f5501d7ab432ae840052ce7de7736a28da80c0ce88f739a7324c565dc6b1965e597faa3edd7f50d16bcd6b1ee654756d096013380d968c34e9ce93ecb5	\N	Sow	Fatou	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:05.85	2026-09-04 03:39:05.854	\N
cmtmen453002vuhks1kek4y7f	cmtmemsqm0004uhkso4f52k70	cheikh.ndiaye@vinci.sn	scrypt$16384$8$1$7c28ae8720202af4ec3248807bad9641$aa4dd4bc34b003f67c99588fcb7e91f3e7c7e784a88d9e7e0235d8d813edaa5d3d2752d1084dd0d1d664c5eb493c8ca774775616325f518781acb90440ad3426	\N	Ndiaye	Cheikh	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:06.804	2026-09-04 03:39:06.806	\N
cmtmen4z60031uhks0on63d6x	cmtmemsqm0004uhkso4f52k70	aïssatou.ba@vinci.sn	scrypt$16384$8$1$f4a5435e2e92e51cc396ef0e278210ea$32a9566cbe67ea9af386c251052c9858bf1a569f69d9f0ec123c062b1e32aeee9bcafde7607fe71407e5eea018a5be55bc3c2b3b8d65d12a6f0d4024a6fdea50	\N	Ba	Aïssatou	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:07.888	2026-09-04 03:39:07.89	\N
cmtmen5nz0037uhksfmifv4na	cmtmemsqm0004uhkso4f52k70	ousmane.diallo@vinci.sn	scrypt$16384$8$1$79042018c8212a04b1066f24f07d3a27$916a44228396f7de6cadf48089db53fee68e5f799c2e5f658025794b56c341495ae2b38ba1c701b2547d9b9e26fe8f200394d881f7ef6919d0e29959e7094a7a	\N	Diallo	Ousmane	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:08.781	2026-09-04 03:39:08.783	\N
cmtmen6c6003duhksh7fvqi9u	cmtmemsqm0004uhkso4f52k70	mariama.gueye@vinci.sn	scrypt$16384$8$1$a1d6db521248e768451ae601e54647c4$fedf38f9560fb44c7feca199a2cb5477ee5b317510d255ac1559101b358bda7ce85fde78b9da3e4115dc7a51b84a538124d66bb82083b7c10d0e70bc0f5bcc33	\N	Gueye	Mariama	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:09.652	2026-09-04 03:39:09.654	\N
cmtmen8nl003nuhksgz12jqmt	cmtmemsqm0004uhkso4f52k70	rh@vinci.sn	scrypt$16384$8$1$78a7dfa1f1ed84a4375ce4312b030891$b04ee58fd760fe5b3be395c95f48b279344a736904b05491d65c96510a11b8b7dfacceb18592754c55d5d2a8fd86107459d0284446f889e6788b038a93f838c9	\N	Ndiaye	Sophie	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:12.656	2026-09-04 03:39:12.657	\N
cmtmen9bm003ruhkssa0qmwjj	cmtmemsqm0004uhkso4f52k70	censeur@vinci.sn	scrypt$16384$8$1$353aad129c2e9ca95675db9d7e25780d$a341c8bb77a491e58ee737980c6ae5989e285a4df60a3f6c64e8b1febb49fd5d5995f5cbac9dbe7656ae6f9107ede4bc5c14cea315acb946af68791d55be4714	\N	Diagne	Ibrahima	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:13.52	2026-09-04 03:39:13.522	\N
cmtmena0c003vuhksc09fi4im	cmtmemsqm0004uhkso4f52k70	surveillant@vinci.sn	scrypt$16384$8$1$2d926ae877733ffacf25f62b6b24dd34$98379dd78c897ca5497b0ba8ae561a8f8350aaeea94528abe65846010d96be6dde1cdab6fa75bde1321460586b8f346104d9019eba29877221ccd6cff42ce227	\N	Kane	Modou	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:14.41	2026-09-04 03:39:14.412	\N
cmtmenaod003zuhksqkqqnfnc	cmtmemsqm0004uhkso4f52k70	secretariat@vinci.sn	scrypt$16384$8$1$58989a00a54ba5ed3f20315997891e88$b5f184f4b26a951275bb5840f088e9d253445fa2b6a553dc667b9fffaed84440a58cdec3b1aad8b6015352b9cb960549d851e7fb5dd8727ef7194f2af6a5e764	\N	Fall	Coumba	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:15.275	2026-09-04 03:39:15.277	\N
cmtmenbce0043uhkskgg17n3o	cmtmemsqm0004uhkso4f52k70	assistant@vinci.sn	scrypt$16384$8$1$cd2424fde69ed78ada0d8d983e2003da$2bd1ec7ce79eaf2d3a143f3c5ed765c13b848e51ea50f8595402e4c6d3a16e854466a5be56181027917882022f832da4ac456c617152391e75047207002a4810	\N	Mbaye	Khadija	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:16.14	2026-09-04 03:39:16.142	\N
cmtmenc0h0047uhksf83prdfl	cmtmemsqm0004uhkso4f52k70	infirmiere@vinci.sn	scrypt$16384$8$1$5cd1e23a7d890b6283dc94690bda36aa$664f809f500fcf2b86bf9b3f97900e7f8d0d4b00e7107dfe351214e5eef6b7e393122a9d41400b0d0a981a18788b38f7fcb08b56727ab9503e7816148d383b49	\N	Sow	Aminata	personnel	t	f	\N	0	\N	t	2026-09-04 03:39:17.008	2026-09-04 03:39:17.009	\N
cmtmenh2k005nuhksak4bfupp	cmtmemsqm0004uhkso4f52k70	parent.ade@gmail.com	scrypt$16384$8$1$797ccd8fa532d0776b0912fe8836cc31$4c214f38f6358d3086f42d7e413938644f096cbd8553c316eee8645831478354ed80753313d43859ac1e59d287c76afd54d4752fcd261f7c813e1e5c44810c7f	\N	Ade	Papa	parent	t	f	\N	0	\N	t	2026-09-04 03:39:23.562	2026-09-04 03:39:23.564	\N
cmtmenhx8005ruhksohoa7agc	cmtmemsqm0004uhkso4f52k70	parent.idriss@gmail.com	scrypt$16384$8$1$8fab9ab28c0a8602604b43c44b462713$a7a4c806618b20f62a63b02403d0262f7b792ef21dcec17623951afe63bc23ba3ebd69a80d8bcc184d0d35728ca0194372834999e3af61962ce4ef0c4eb7c271	\N	Idriss	Maman	parent	t	f	\N	0	\N	t	2026-09-04 03:39:24.665	2026-09-04 03:39:24.667	\N
cmtmenigf005vuhksckbggcn5	cmtmemsqm0004uhkso4f52k70	parent.aminata@gmail.com	scrypt$16384$8$1$37fd91f854606fda889b67c6feb77ef7$4042ada652aa2adece71e1848f14a0efe086804b5ebe4286af09213ee376250fad3a8b90b00606d31b92180e3b146c94ef6dce4da6c7d78cf4a82d4bedfed80b	\N	Aminata	Papa	parent	t	f	\N	0	\N	t	2026-09-04 03:39:25.356	2026-09-04 03:39:25.359	\N
cmtmenj0c005zuhksa184o4ee	cmtmemsqm0004uhkso4f52k70	parent.omar@gmail.com	scrypt$16384$8$1$f65e186ff90a31c33d37d9f7a116dd8f$749106ae34e5c5972ebf37aa95430dec0920544145f2cfc4ba88d4246b3e97102bbfba3f93c106ab97af7418028f7179bbd7fffd26cfdd66322def4f78695638	\N	Omar	Maman	parent	t	f	\N	0	\N	t	2026-09-04 03:39:26.075	2026-09-04 03:39:26.076	\N
cmtmenjkh0063uhksbc23cj7t	cmtmemsqm0004uhkso4f52k70	parent.khadija@gmail.com	scrypt$16384$8$1$aeda4eb894a627b082cbc8d9a1376fda$e9b9fc03afc53ef58afb8c515adfa3033e61be370a2f94a3da54787c913192abccb339b343d54b55d07703ce86c89077539d4dc621456099d6ece72b01ce43fe	\N	Khadija	Papa	parent	t	f	\N	0	\N	t	2026-09-04 03:39:26.799	2026-09-04 03:39:26.801	\N
cmtmenk3d0067uhks008ald20	cmtmemsqm0004uhkso4f52k70	parent.pape@gmail.com	scrypt$16384$8$1$7a886bba6f3c8c7d374bdac6e8d5a2ff$f32c07b708177f3ee34f5eeee923f9b182dda4e9b55681c753d3120eaae17036d119e2a61f656ac5fe7f90680a50050ef73018ece8049d613a0350abbf679e45	\N	Pape	Maman	parent	t	f	\N	0	\N	t	2026-09-04 03:39:27.479	2026-09-04 03:39:27.481	\N
cmtmenkpi006buhksae7ugx53	cmtmemsqm0004uhkso4f52k70	parent.sokhna@gmail.com	scrypt$16384$8$1$71a249f6d352c0a6e38fdeb8d275343f$0758d1537317cd6c3b9c735e5660aee3b40cecf10ee27c7789a19170976eba51f6afea14ad10f210f80a588dadfc1e8dca415aff9de1aa3e9cbcfcd345670e1e	\N	Sokhna	Papa	parent	t	f	\N	0	\N	t	2026-09-04 03:39:28.275	2026-09-04 03:39:28.278	\N
cmtmenlbc006fuhkss25si4bm	cmtmemsqm0004uhkso4f52k70	parent.awa@gmail.com	scrypt$16384$8$1$eb70fff63f31086e97468585b0d1f158$f60384c4cbb0cb199966249b186cfb959e689b2ed1e6d161e31ba9b9e667e18420e8af2bd71a71e0c656545d65db2208001febc362cb0f2ad30a73a623e71ca1	\N	Awa	Maman	parent	t	f	\N	0	\N	t	2026-09-04 03:39:29.062	2026-09-04 03:39:29.064	\N
cmtmenlvb006juhkslosbw2a1	cmtmemsqm0004uhkso4f52k70	parent.moussa@gmail.com	scrypt$16384$8$1$62caf065adb7668d065a789125a7f0ea$ac53962af7f82e9b3da43c84f038afd4b8382b54db1bf1bf1f651ca26ded94508e859b1db28a85890df2d61c0a0a3a79664c543e0d66f058f2528ca7e25038f9	\N	Moussa	Papa	parent	t	f	\N	0	\N	t	2026-09-04 03:39:29.781	2026-09-04 03:39:29.783	\N
cmtmenmht006nuhks7s86191y	cmtmemsqm0004uhkso4f52k70	parent.astou@gmail.com	scrypt$16384$8$1$0a27df8850d983a8900e411bc35e7f7b$2c2fca23c62bdb72595559bb4d166a9702a152d0a52e0afdfa3ac99defee041749b07901a545cb20ee277e0b4a9a497d2a38f68dda663061e54339709a22fbfc	\N	Astou	Maman	parent	t	f	\N	0	\N	t	2026-09-04 03:39:30.59	2026-09-04 03:39:30.593	\N
cmtmenn1f006ruhkssqf2p16o	cmtmemsqm0004uhkso4f52k70	parent.ibou@gmail.com	scrypt$16384$8$1$70484a1deb6d1ed3601b17d89b56bd9e$21ed416aa05c2133963fd71bf0621442ac0a5953a138bd24d793bee8e57401a064bdc9561dd636dabec264f8499908f51145503b2a523a3be03cfa8fc6c4c08e	\N	Ibou	Papa	parent	t	f	\N	0	\N	t	2026-09-04 03:39:31.296	2026-09-04 03:39:31.299	\N
cmtmennn1006vuhksalbp0eu4	cmtmemsqm0004uhkso4f52k70	parent.mariama@gmail.com	scrypt$16384$8$1$8b6ffbc4111c68dcabd07308387c8efb$98d4c48df754e28fcb5f19654904b07e80d09fc80f471ce18d3abe8ce35c806e58a40e89994d295aa8a673d4c166b9f27fd440465441398b43f8fbcf7e8df17d	\N	Mariama	Maman	parent	t	f	\N	0	\N	t	2026-09-04 03:39:32.074	2026-09-04 03:39:32.077	\N
cmtmeno99006zuhksoqaz875o	cmtmemsqm0004uhkso4f52k70	eleve.diop@vinci.sn	scrypt$16384$8$1$b2f9ea45c70cf698fd86397abbf1af02$444dd18a6be1ec4087e419b9e85931f7a929ae770ec897572e71865562faa10eb717d183dc56654c59b103d972ce0ae19f5f5401794c3fb6824d7a74599174e8	\N	Pape	Diop	eleve	t	f	\N	0	\N	t	2026-09-04 03:39:32.872	2026-09-04 03:39:32.876	\N
cmtmen7nr003juhksdt2mk4vc	cmtmemsqm0004uhkso4f52k70	comptable@vinci.sn	scrypt$16384$8$1$ce6ec121e1021fb46974aa0026dd1f8f$e33ac770f3d6ec99aebe4f7ebec08ae583a6eab5d94c679f35be7d8ba7dd0317c11c2dd157efe09ac45c5bfbbd3e0072b9dfd4b6090f5ce7cb79b5e66b7e82bf	\N	Sarr	Bineta	personnel	t	t	\N	0	\N	t	2026-09-04 03:39:11.364	2026-09-04 03:39:11.367	\N
\.


--
-- Data for Name: UtilisateurEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UtilisateurEcole" (id, "utilisateurId", "ecoleId", "roleLibelle", "dateAjout") FROM stdin;
cmtmeqhcq00lsuhkshyir4xl1	cmtmemw4t000tuhkslywkbxhv	cmtmeqg3p00lkuhksukyqbaf3	Directeur partenaire	2026-09-04 03:41:43.896
\.


--
-- Data for Name: UtilisateurRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UtilisateurRole" ("utilisateurId", "roleId", "dateDebut", "dateFin") FROM stdin;
cmtmen7nr003juhksdt2mk4vc	cmtmemulj000fuhks38zr69k1	2026-09-04 03:39:12.199	\N
cmtmen8nl003nuhksgz12jqmt	cmtmemuwy000juhkswcmkorz5	2026-09-04 03:39:13.269	\N
cmtmen9bm003ruhkssa0qmwjj	cmtmemv32000luhkslxpijhrv	2026-09-04 03:39:14.134	\N
cmtmena0c003vuhksc09fi4im	cmtmemur7000huhksvvap2o0w	2026-09-04 03:39:15.023	\N
cmtmenaod003zuhksqkqqnfnc	cmtmemv8q000nuhksemprf35w	2026-09-04 03:39:15.888	\N
cmtmenbce0043uhkskgg17n3o	cmtmemved000puhksamhj4juv	2026-09-04 03:39:16.754	\N
cmtmenc0h0047uhksf83prdfl	cmtmemvk3000ruhksjvd7uzit	2026-09-04 03:39:17.647	\N
cmtmemw4t000tuhkslywkbxhv	cmtmemu3z000buhksccltc6k7	2026-09-04 03:41:21.761	\N
cmtmen282002juhksytux1kr3	cmtmemufr000duhksw2t5sl2g	2026-09-04 03:41:21.761	\N
cmtmen3em002puhkso88h3lni	cmtmemufr000duhksw2t5sl2g	2026-09-04 03:41:21.761	\N
\.


--
-- Data for Name: Vaccination; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Vaccination" (id, "ecoleId", "eleveId", vaccin, "dateVaccination", "dateRappel", statut, "certificatUrl", note, "ficheSanteId") FROM stdin;
cmtmeqf5g00lfuhkss12ab31u	cmtmemsqm0004uhkso4f52k70	cmtmencnz004buhks96bk4qi3	DTaP	2024-03-10 00:00:00	\N	a_jour	\N	\N	\N
cmtmeqf5g00lguhkshawanbnw	cmtmemsqm0004uhkso4f52k70	cmtmenelf004vuhkswidp3578	BCG	2023-11-02 00:00:00	\N	a_jour	\N	\N	\N
cmtmeqf5g00lhuhks0gvkc8z9	cmtmemsqm0004uhkso4f52k70	cmtmenf8d0053uhksbmz64ona	ROR	2024-06-15 00:00:00	2027-06-15 00:00:00	rappel_prevu	\N	\N	\N
\.


--
-- Data for Name: VariablePaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VariablePaie" (id, "ecoleId", "personnelId", periode, type, libelle, montant, "dateAttribution", "attribueParId", "bulletinPaieId") FROM stdin;
cmtmeohuf00dkuhkskts0pte4	cmtmemsqm0004uhkso4f52k70	cmtmen2ds002luhksrm9r1gw6	2026-08	prime	Prime de rendement	1000000	2026-09-04 03:40:11.223	cmtmemw4t000tuhkslywkbxhv	\N
\.


--
-- Data for Name: VerificationAntecedents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VerificationAntecedents" (id, "ecoleId", "personnelId", type, "referenceDossier", statut, "dateDemande", "dateObtention", "dateExpiration", "fichierUrl", "valideParId") FROM stdin;
cmtmeofxk00d8uhksmyob7wwp	cmtmemsqm0004uhkso4f52k70	cmtmen2ds002luhksrm9r1gw6	casier_judiciaire	\N	obtenue	2026-07-15 00:00:00	2026-07-25 00:00:00	2027-07-25 00:00:00	\N	cmtmemw4t000tuhkslywkbxhv
\.


--
-- Data for Name: Visiteur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Visiteur" (id, "ecoleId", nom, "motifVisite", "personneVisiteeId", "dateHeureEntree", "dateHeureSortie", "pieceIdentiteVerifiee", "badgeNumero") FROM stdin;
cmtmeobmk00cnuhks1lrxd7y6	cmtmemsqm0004uhkso4f52k70	Inspecteur Régional DIOP	Inspection pédagogique - Maths	\N	2026-09-04 03:40:03.164	\N	t	V-0042
\.


--
-- Data for Name: VoteConseil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VoteConseil" (id, "deliberationId", "membreId", vote, date) FROM stdin;
cmtmeoplz00eruhksyp8dga6w	cmtmeopao00epuhksxkgw3a2g	cmtmeootn00eluhks5cs9xxc3	pour	2026-09-04 03:40:21.287
\.


--
-- Data for Name: WebhookDelivery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WebhookDelivery" (id, "webhookId", event, payload, "statutHttp", "reponseCorps", tentative, statut, "dateCreation", "dateEnvoi", "prochaineTentative") FROM stdin;
cmtmep3v100h1uhkshnfqs38j	cmtmep3jn00gzuhks460im511	eleve.inscription	{"eleveId":"cmtmencnz004buhks96bk4qi3"}	200	ok	1	livre	2026-09-04 03:40:39.757	2026-09-04 03:40:39.755	\N
\.


--
-- Data for Name: WebhookSortant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WebhookSortant" (id, "ecoleId", url, secret, events, actif, "dateCreation", "dernierEnvoi") FROM stdin;
cmtmep3jn00gzuhks460im511	cmtmemsqm0004uhkso4f52k70	https://sirh-region.sn/webhooks/eleves	whsec_demo	["eleve.inscription","eleve.sortie"]	t	2026-09-04 03:40:39.139	\N
\.


--
-- Data for Name: WidgetDashboard; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WidgetDashboard" (id, "utilisateurId", titre, type, source, configuration, "position", taille, actif, "dateCreation") FROM stdin;
cmtmepb4600i3uhksclv23xt1	cmtmemw4t000tuhkslywkbxhv	Effectifs par classe	chart	sql	{"chartType":"bar","dataset":"eleves_by_classe"}	0	md	t	2026-09-04 03:40:49.158
\.


--
-- Data for Name: _EcoleToPermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."_EcoleToPermission" ("A", "B") FROM stdin;
cmtmemsqm0004uhkso4f52k70	cmtmepdha00iduhksp9lhes0f
cmtmemsqm0004uhkso4f52k70	cmtmepfe300ieuhksqqv8h4pv
cmtmemsqm0004uhkso4f52k70	cmtmepgcb00ifuhksgi9srisf
cmtmemsqm0004uhkso4f52k70	cmtmepkej00iguhksemoayrj4
cmtmemsqm0004uhkso4f52k70	cmtmeplc800ihuhksecj01ktm
cmtmemsqm0004uhkso4f52k70	cmtmepm9w00iiuhksl2372p34
cmtmemsqm0004uhkso4f52k70	cmtmepn7q00ijuhkskty0moa9
cmtmemsqm0004uhkso4f52k70	cmtmepo5a00ikuhksfs6z92g7
cmtmemsqm0004uhkso4f52k70	cmtmepp3f00iluhksf78wvbqy
cmtmemsqm0004uhkso4f52k70	cmtmepq1000imuhksn2w55k41
cmtmemsqm0004uhkso4f52k70	cmtmepr4k00inuhks18wubddv
cmtmemsqm0004uhkso4f52k70	cmtmeps2800iouhkshld8ygad
cmtmemsqm0004uhkso4f52k70	cmtmepszw00ipuhks8hiey85w
cmtmemsqm0004uhkso4f52k70	cmtmeptxj00iquhks74p3aw1m
cmtmemsqm0004uhkso4f52k70	cmtmepuv400iruhks9fnjs3ib
cmtmemsqm0004uhkso4f52k70	cmtmepvt400isuhksg0mpvvch
cmtmemsqm0004uhkso4f52k70	cmtmepwqv00ituhkssx2cke7x
cmtmemsqm0004uhkso4f52k70	cmtmepxrr00iuuhks6k06glww
cmtmemsqm0004uhkso4f52k70	cmtmepype00ivuhksbzey1vxo
\.


--
-- Name: ApiTokenLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ApiTokenLog_id_seq"', 1, true);


--
-- Name: AuditLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AuditLog_id_seq"', 4, true);


--
-- Name: TentativeConnexion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TentativeConnexion_id_seq"', 5, true);


--
-- Name: TicketStatutHistorique_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TicketStatutHistorique_id_seq"', 1, true);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: invitation invitation_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT invitation_pkey PRIMARY KEY (id);


--
-- Name: jwks jwks_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.jwks
    ADD CONSTRAINT jwks_pkey PRIMARY KEY (id);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: organization organization_slug_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_slug_key UNIQUE (slug);


--
-- Name: project_config project_config_endpoint_id_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_endpoint_id_key UNIQUE (endpoint_id);


--
-- Name: project_config project_config_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: Abonnement Abonnement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Abonnement"
    ADD CONSTRAINT "Abonnement_pkey" PRIMARY KEY (id);


--
-- Name: ActiviteParticipant ActiviteParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActiviteParticipant"
    ADD CONSTRAINT "ActiviteParticipant_pkey" PRIMARY KEY (id);


--
-- Name: Activite Activite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activite"
    ADD CONSTRAINT "Activite_pkey" PRIMARY KEY (id);


--
-- Name: Amenagement Amenagement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Amenagement"
    ADD CONSTRAINT "Amenagement_pkey" PRIMARY KEY (id);


--
-- Name: AnneeScolaire AnneeScolaire_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnneeScolaire"
    ADD CONSTRAINT "AnneeScolaire_pkey" PRIMARY KEY (id);


--
-- Name: AnnonceLecture AnnonceLecture_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnonceLecture"
    ADD CONSTRAINT "AnnonceLecture_pkey" PRIMARY KEY (id);


--
-- Name: Annonce Annonce_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Annonce"
    ADD CONSTRAINT "Annonce_pkey" PRIMARY KEY (id);


--
-- Name: ApiTokenLog ApiTokenLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiTokenLog"
    ADD CONSTRAINT "ApiTokenLog_pkey" PRIMARY KEY (id);


--
-- Name: ApiToken ApiToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiToken"
    ADD CONSTRAINT "ApiToken_pkey" PRIMARY KEY (id);


--
-- Name: AttributionManuel AttributionManuel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttributionManuel"
    ADD CONSTRAINT "AttributionManuel_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: AutorisationSortie AutorisationSortie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutorisationSortie"
    ADD CONSTRAINT "AutorisationSortie_pkey" PRIMARY KEY (id);


--
-- Name: AvancementProgramme AvancementProgramme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvancementProgramme"
    ADD CONSTRAINT "AvancementProgramme_pkey" PRIMARY KEY (id);


--
-- Name: AvoirEcole AvoirEcole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvoirEcole"
    ADD CONSTRAINT "AvoirEcole_pkey" PRIMARY KEY (id);


--
-- Name: AvoirSaas AvoirSaas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvoirSaas"
    ADD CONSTRAINT "AvoirSaas_pkey" PRIMARY KEY (id);


--
-- Name: Batiment Batiment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Batiment"
    ADD CONSTRAINT "Batiment_pkey" PRIMARY KEY (id);


--
-- Name: BesoinSpecifique BesoinSpecifique_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BesoinSpecifique"
    ADD CONSTRAINT "BesoinSpecifique_pkey" PRIMARY KEY (id);


--
-- Name: BiblioLivre BiblioLivre_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiblioLivre"
    ADD CONSTRAINT "BiblioLivre_pkey" PRIMARY KEY (id);


--
-- Name: BiblioPret BiblioPret_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiblioPret"
    ADD CONSTRAINT "BiblioPret_pkey" PRIMARY KEY (id);


--
-- Name: Budget Budget_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_pkey" PRIMARY KEY (id);


--
-- Name: BulletinAppreciation BulletinAppreciation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BulletinAppreciation"
    ADD CONSTRAINT "BulletinAppreciation_pkey" PRIMARY KEY (id);


--
-- Name: BulletinPaie BulletinPaie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BulletinPaie"
    ADD CONSTRAINT "BulletinPaie_pkey" PRIMARY KEY (id);


--
-- Name: Bulletin Bulletin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bulletin"
    ADD CONSTRAINT "Bulletin_pkey" PRIMARY KEY (id);


--
-- Name: CahierTexte CahierTexte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CahierTexte"
    ADD CONSTRAINT "CahierTexte_pkey" PRIMARY KEY (id);


--
-- Name: CalendrierScolaire CalendrierScolaire_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CalendrierScolaire"
    ADD CONSTRAINT "CalendrierScolaire_pkey" PRIMARY KEY (id);


--
-- Name: CandidatureAdmission CandidatureAdmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CandidatureAdmission"
    ADD CONSTRAINT "CandidatureAdmission_pkey" PRIMARY KEY (id);


--
-- Name: Candidature Candidature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Candidature"
    ADD CONSTRAINT "Candidature_pkey" PRIMARY KEY (id);


--
-- Name: CantineInscription CantineInscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantineInscription"
    ADD CONSTRAINT "CantineInscription_pkey" PRIMARY KEY (id);


--
-- Name: CantineMenu CantineMenu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantineMenu"
    ADD CONSTRAINT "CantineMenu_pkey" PRIMARY KEY (id);


--
-- Name: CantinePresence CantinePresence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantinePresence"
    ADD CONSTRAINT "CantinePresence_pkey" PRIMARY KEY (id);


--
-- Name: Chapitre Chapitre_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Chapitre"
    ADD CONSTRAINT "Chapitre_pkey" PRIMARY KEY (id);


--
-- Name: Classe Classe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Classe"
    ADD CONSTRAINT "Classe_pkey" PRIMARY KEY (id);


--
-- Name: CommandeFournisseur CommandeFournisseur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommandeFournisseur"
    ADD CONSTRAINT "CommandeFournisseur_pkey" PRIMARY KEY (id);


--
-- Name: Competence Competence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Competence"
    ADD CONSTRAINT "Competence_pkey" PRIMARY KEY (id);


--
-- Name: CompteComptable CompteComptable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompteComptable"
    ADD CONSTRAINT "CompteComptable_pkey" PRIMARY KEY (id);


--
-- Name: ConfigurationPaie ConfigurationPaie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConfigurationPaie"
    ADD CONSTRAINT "ConfigurationPaie_pkey" PRIMARY KEY (id);


--
-- Name: Conge Conge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Conge"
    ADD CONSTRAINT "Conge_pkey" PRIMARY KEY (id);


--
-- Name: ConseilClasse ConseilClasse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConseilClasse"
    ADD CONSTRAINT "ConseilClasse_pkey" PRIMARY KEY (id);


--
-- Name: ConsentementCommunication ConsentementCommunication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsentementCommunication"
    ADD CONSTRAINT "ConsentementCommunication_pkey" PRIMARY KEY (id);


--
-- Name: ConsentementImage ConsentementImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsentementImage"
    ADD CONSTRAINT "ConsentementImage_pkey" PRIMARY KEY (id);


--
-- Name: ConventionStage ConventionStage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConventionStage"
    ADD CONSTRAINT "ConventionStage_pkey" PRIMARY KEY (id);


--
-- Name: ConversationParticipant ConversationParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY (id);


--
-- Name: Conversation Conversation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_pkey" PRIMARY KEY (id);


--
-- Name: CotisationSociale CotisationSociale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CotisationSociale"
    ADD CONSTRAINT "CotisationSociale_pkey" PRIMARY KEY (id);


--
-- Name: CreneauHebdo CreneauHebdo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreneauHebdo"
    ADD CONSTRAINT "CreneauHebdo_pkey" PRIMARY KEY (id);


--
-- Name: CreneauRdv CreneauRdv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreneauRdv"
    ADD CONSTRAINT "CreneauRdv_pkey" PRIMARY KEY (id);


--
-- Name: Cycle Cycle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cycle"
    ADD CONSTRAINT "Cycle_pkey" PRIMARY KEY (id);


--
-- Name: DeliberationConseil DeliberationConseil_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeliberationConseil"
    ADD CONSTRAINT "DeliberationConseil_pkey" PRIMARY KEY (id);


--
-- Name: DemandeEffacement DemandeEffacement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DemandeEffacement"
    ADD CONSTRAINT "DemandeEffacement_pkey" PRIMARY KEY (id);


--
-- Name: Depense Depense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Depense"
    ADD CONSTRAINT "Depense_pkey" PRIMARY KEY (id);


--
-- Name: Devoir Devoir_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Devoir"
    ADD CONSTRAINT "Devoir_pkey" PRIMARY KEY (id);


--
-- Name: Dispense Dispense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Dispense"
    ADD CONSTRAINT "Dispense_pkey" PRIMARY KEY (id);


--
-- Name: DocumentEleve DocumentEleve_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentEleve"
    ADD CONSTRAINT "DocumentEleve_pkey" PRIMARY KEY (id);


--
-- Name: DocumentGenere DocumentGenere_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentGenere"
    ADD CONSTRAINT "DocumentGenere_pkey" PRIMARY KEY (id);


--
-- Name: DomainePersonnalise DomainePersonnalise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DomainePersonnalise"
    ADD CONSTRAINT "DomainePersonnalise_pkey" PRIMARY KEY (id);


--
-- Name: EcheanceFrais EcheanceFrais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EcheanceFrais"
    ADD CONSTRAINT "EcheanceFrais_pkey" PRIMARY KEY (id);


--
-- Name: Ecole Ecole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ecole"
    ADD CONSTRAINT "Ecole_pkey" PRIMARY KEY (id);


--
-- Name: EcritureComptable EcritureComptable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EcritureComptable"
    ADD CONSTRAINT "EcritureComptable_pkey" PRIMARY KEY (id);


--
-- Name: EleveHistoriqueClasse EleveHistoriqueClasse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EleveHistoriqueClasse"
    ADD CONSTRAINT "EleveHistoriqueClasse_pkey" PRIMARY KEY (id);


--
-- Name: EleveParent EleveParent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EleveParent"
    ADD CONSTRAINT "EleveParent_pkey" PRIMARY KEY ("eleveId", "parentId");


--
-- Name: Eleve Eleve_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Eleve"
    ADD CONSTRAINT "Eleve_pkey" PRIMARY KEY (id);


--
-- Name: EmailLog EmailLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmailLog"
    ADD CONSTRAINT "EmailLog_pkey" PRIMARY KEY (id);


--
-- Name: EmploiTemps EmploiTemps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmploiTemps"
    ADD CONSTRAINT "EmploiTemps_pkey" PRIMARY KEY (id);


--
-- Name: EntreeCahierTexte EntreeCahierTexte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntreeCahierTexte"
    ADD CONSTRAINT "EntreeCahierTexte_pkey" PRIMARY KEY (id);


--
-- Name: EntretienRecrutement EntretienRecrutement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntretienRecrutement"
    ADD CONSTRAINT "EntretienRecrutement_pkey" PRIMARY KEY (id);


--
-- Name: Etage Etage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Etage"
    ADD CONSTRAINT "Etage_pkey" PRIMARY KEY (id);


--
-- Name: EtapeAdmission EtapeAdmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EtapeAdmission"
    ADD CONSTRAINT "EtapeAdmission_pkey" PRIMARY KEY (id);


--
-- Name: EtapeRecrutement EtapeRecrutement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EtapeRecrutement"
    ADD CONSTRAINT "EtapeRecrutement_pkey" PRIMARY KEY (id);


--
-- Name: EvaluationCompetence EvaluationCompetence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EvaluationCompetence"
    ADD CONSTRAINT "EvaluationCompetence_pkey" PRIMARY KEY (id);


--
-- Name: EvaluationPersonnel EvaluationPersonnel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EvaluationPersonnel"
    ADD CONSTRAINT "EvaluationPersonnel_pkey" PRIMARY KEY (id);


--
-- Name: Evaluation Evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Evaluation"
    ADD CONSTRAINT "Evaluation_pkey" PRIMARY KEY (id);


--
-- Name: ExamenOfficiel ExamenOfficiel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamenOfficiel"
    ADD CONSTRAINT "ExamenOfficiel_pkey" PRIMARY KEY (id);


--
-- Name: ExportDonnees ExportDonnees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExportDonnees"
    ADD CONSTRAINT "ExportDonnees_pkey" PRIMARY KEY (id);


--
-- Name: FactureFournisseur FactureFournisseur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FactureFournisseur"
    ADD CONSTRAINT "FactureFournisseur_pkey" PRIMARY KEY (id);


--
-- Name: FactureSaas FactureSaas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FactureSaas"
    ADD CONSTRAINT "FactureSaas_pkey" PRIMARY KEY (id);


--
-- Name: FeatureFlagEcole FeatureFlagEcole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureFlagEcole"
    ADD CONSTRAINT "FeatureFlagEcole_pkey" PRIMARY KEY (id);


--
-- Name: FeatureFlag FeatureFlag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureFlag"
    ADD CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY (id);


--
-- Name: FeuilleRoute FeuilleRoute_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeuilleRoute"
    ADD CONSTRAINT "FeuilleRoute_pkey" PRIMARY KEY (id);


--
-- Name: FicheSante FicheSante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FicheSante"
    ADD CONSTRAINT "FicheSante_pkey" PRIMARY KEY (id);


--
-- Name: Fournisseur Fournisseur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Fournisseur"
    ADD CONSTRAINT "Fournisseur_pkey" PRIMARY KEY (id);


--
-- Name: Frais Frais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Frais"
    ADD CONSTRAINT "Frais_pkey" PRIMARY KEY (id);


--
-- Name: GarderieInscription GarderieInscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GarderieInscription"
    ADD CONSTRAINT "GarderieInscription_pkey" PRIMARY KEY (id);


--
-- Name: GarderieSession GarderieSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GarderieSession"
    ADD CONSTRAINT "GarderieSession_pkey" PRIMARY KEY (id);


--
-- Name: HabilitationPenale HabilitationPenale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HabilitationPenale"
    ADD CONSTRAINT "HabilitationPenale_pkey" PRIMARY KEY (id);


--
-- Name: Incident Incident_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Incident"
    ADD CONSTRAINT "Incident_pkey" PRIMARY KEY (id);


--
-- Name: InscriptionExamenOfficiel InscriptionExamenOfficiel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InscriptionExamenOfficiel"
    ADD CONSTRAINT "InscriptionExamenOfficiel_pkey" PRIMARY KEY (id);


--
-- Name: JetonAuth JetonAuth_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JetonAuth"
    ADD CONSTRAINT "JetonAuth_pkey" PRIMARY KEY (id);


--
-- Name: JournalComptable JournalComptable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JournalComptable"
    ADD CONSTRAINT "JournalComptable_pkey" PRIMARY KEY (id);


--
-- Name: JustificationAbsence JustificationAbsence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JustificationAbsence"
    ADD CONSTRAINT "JustificationAbsence_pkey" PRIMARY KEY (id);


--
-- Name: LigneBudget LigneBudget_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneBudget"
    ADD CONSTRAINT "LigneBudget_pkey" PRIMARY KEY (id);


--
-- Name: LigneBulletinPaie LigneBulletinPaie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneBulletinPaie"
    ADD CONSTRAINT "LigneBulletinPaie_pkey" PRIMARY KEY (id);


--
-- Name: LigneCommande LigneCommande_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneCommande"
    ADD CONSTRAINT "LigneCommande_pkey" PRIMARY KEY (id);


--
-- Name: LigneEcriture LigneEcriture_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneEcriture"
    ADD CONSTRAINT "LigneEcriture_pkey" PRIMARY KEY (id);


--
-- Name: LigneReleve LigneReleve_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneReleve"
    ADD CONSTRAINT "LigneReleve_pkey" PRIMARY KEY (id);


--
-- Name: ListeFourniture ListeFourniture_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ListeFourniture"
    ADD CONSTRAINT "ListeFourniture_pkey" PRIMARY KEY (id);


--
-- Name: ManuelScolaire ManuelScolaire_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManuelScolaire"
    ADD CONSTRAINT "ManuelScolaire_pkey" PRIMARY KEY (id);


--
-- Name: Matiere Matiere_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Matiere"
    ADD CONSTRAINT "Matiere_pkey" PRIMARY KEY (id);


--
-- Name: MembreConseil MembreConseil_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembreConseil"
    ADD CONSTRAINT "MembreConseil_pkey" PRIMARY KEY (id);


--
-- Name: MembreEquipeEducatif MembreEquipeEducatif_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembreEquipeEducatif"
    ADD CONSTRAINT "MembreEquipeEducatif_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: MesureProtection MesureProtection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MesureProtection"
    ADD CONSTRAINT "MesureProtection_pkey" PRIMARY KEY (id);


--
-- Name: ModeleMessage ModeleMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ModeleMessage"
    ADD CONSTRAINT "ModeleMessage_pkey" PRIMARY KEY (id);


--
-- Name: MouvementStock MouvementStock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MouvementStock"
    ADD CONSTRAINT "MouvementStock_pkey" PRIMARY KEY (id);


--
-- Name: Niveau Niveau_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Niveau"
    ADD CONSTRAINT "Niveau_pkey" PRIMARY KEY (id);


--
-- Name: Note Note_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: ObjectifPlan ObjectifPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ObjectifPlan"
    ADD CONSTRAINT "ObjectifPlan_pkey" PRIMARY KEY (id);


--
-- Name: OffreEmploi OffreEmploi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OffreEmploi"
    ADD CONSTRAINT "OffreEmploi_pkey" PRIMARY KEY (id);


--
-- Name: PaiementEcheance PaiementEcheance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaiementEcheance"
    ADD CONSTRAINT "PaiementEcheance_pkey" PRIMARY KEY ("paiementId", "echeanceId");


--
-- Name: PaiementFournisseur PaiementFournisseur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaiementFournisseur"
    ADD CONSTRAINT "PaiementFournisseur_pkey" PRIMARY KEY (id);


--
-- Name: Paiement Paiement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Paiement"
    ADD CONSTRAINT "Paiement_pkey" PRIMARY KEY (id);


--
-- Name: ParentTuteur ParentTuteur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ParentTuteur"
    ADD CONSTRAINT "ParentTuteur_pkey" PRIMARY KEY (id);


--
-- Name: PartenaireExterne PartenaireExterne_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PartenaireExterne"
    ADD CONSTRAINT "PartenaireExterne_pkey" PRIMARY KEY (id);


--
-- Name: PassageArret PassageArret_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PassageArret"
    ADD CONSTRAINT "PassageArret_pkey" PRIMARY KEY (id);


--
-- Name: PassageInfirmerie PassageInfirmerie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PassageInfirmerie"
    ADD CONSTRAINT "PassageInfirmerie_pkey" PRIMARY KEY (id);


--
-- Name: Periode Periode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Periode"
    ADD CONSTRAINT "Periode_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: PersonnelRole PersonnelRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonnelRole"
    ADD CONSTRAINT "PersonnelRole_pkey" PRIMARY KEY ("personnelId", "roleId", "dateDebut");


--
-- Name: Personnel Personnel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Personnel"
    ADD CONSTRAINT "Personnel_pkey" PRIMARY KEY (id);


--
-- Name: PieceJointe PieceJointe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PieceJointe"
    ADD CONSTRAINT "PieceJointe_pkey" PRIMARY KEY (id);


--
-- Name: PlanAccompagnement PlanAccompagnement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlanAccompagnement"
    ADD CONSTRAINT "PlanAccompagnement_pkey" PRIMARY KEY (id);


--
-- Name: PlanTarifaire PlanTarifaire_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlanTarifaire"
    ADD CONSTRAINT "PlanTarifaire_pkey" PRIMARY KEY (id);


--
-- Name: PointagePersonnel PointagePersonnel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointagePersonnel"
    ADD CONSTRAINT "PointagePersonnel_pkey" PRIMARY KEY (id);


--
-- Name: Presence Presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Presence"
    ADD CONSTRAINT "Presence_pkey" PRIMARY KEY (id);


--
-- Name: Programme Programme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Programme"
    ADD CONSTRAINT "Programme_pkey" PRIMARY KEY (id);


--
-- Name: PushNotificationLog PushNotificationLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushNotificationLog"
    ADD CONSTRAINT "PushNotificationLog_pkey" PRIMARY KEY (id);


--
-- Name: PushToken PushToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushToken"
    ADD CONSTRAINT "PushToken_pkey" PRIMARY KEY (id);


--
-- Name: QuotaUsage QuotaUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuotaUsage"
    ADD CONSTRAINT "QuotaUsage_pkey" PRIMARY KEY (id);


--
-- Name: RapportSauvegarde RapportSauvegarde_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RapportSauvegarde"
    ADD CONSTRAINT "RapportSauvegarde_pkey" PRIMARY KEY (id);


--
-- Name: Rdv Rdv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rdv"
    ADD CONSTRAINT "Rdv_pkey" PRIMARY KEY (id);


--
-- Name: ReceptionCommande ReceptionCommande_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReceptionCommande"
    ADD CONSTRAINT "ReceptionCommande_pkey" PRIMARY KEY (id);


--
-- Name: RegistreTraitement RegistreTraitement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistreTraitement"
    ADD CONSTRAINT "RegistreTraitement_pkey" PRIMARY KEY (id);


--
-- Name: RegleCalculMoyenne RegleCalculMoyenne_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegleCalculMoyenne"
    ADD CONSTRAINT "RegleCalculMoyenne_pkey" PRIMARY KEY (id);


--
-- Name: Remplacement Remplacement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remplacement"
    ADD CONSTRAINT "Remplacement_pkey" PRIMARY KEY (id);


--
-- Name: RenduDevoir RenduDevoir_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RenduDevoir"
    ADD CONSTRAINT "RenduDevoir_pkey" PRIMARY KEY (id);


--
-- Name: ReservationSalle ReservationSalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReservationSalle"
    ADD CONSTRAINT "ReservationSalle_pkey" PRIMARY KEY (id);


--
-- Name: ReunionCollective ReunionCollective_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReunionCollective"
    ADD CONSTRAINT "ReunionCollective_pkey" PRIMARY KEY (id);


--
-- Name: RevisionPlan RevisionPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RevisionPlan"
    ADD CONSTRAINT "RevisionPlan_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId");


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: SalleEquipement SalleEquipement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SalleEquipement"
    ADD CONSTRAINT "SalleEquipement_pkey" PRIMARY KEY (id);


--
-- Name: Salle Salle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Salle"
    ADD CONSTRAINT "Salle_pkey" PRIMARY KEY (id);


--
-- Name: Sanction Sanction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sanction"
    ADD CONSTRAINT "Sanction_pkey" PRIMARY KEY (id);


--
-- Name: Sauvegarde Sauvegarde_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sauvegarde"
    ADD CONSTRAINT "Sauvegarde_pkey" PRIMARY KEY (id);


--
-- Name: Seance Seance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Seance"
    ADD CONSTRAINT "Seance_pkey" PRIMARY KEY (id);


--
-- Name: Section Section_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Section"
    ADD CONSTRAINT "Section_pkey" PRIMARY KEY (id);


--
-- Name: SessionUtilisateur SessionUtilisateur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SessionUtilisateur"
    ADD CONSTRAINT "SessionUtilisateur_pkey" PRIMARY KEY (id);


--
-- Name: SignalementMineur SignalementMineur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SignalementMineur"
    ADD CONSTRAINT "SignalementMineur_pkey" PRIMARY KEY (id);


--
-- Name: SignatureElectronique SignatureElectronique_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SignatureElectronique"
    ADD CONSTRAINT "SignatureElectronique_pkey" PRIMARY KEY (id);


--
-- Name: SmsLog SmsLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SmsLog"
    ADD CONSTRAINT "SmsLog_pkey" PRIMARY KEY (id);


--
-- Name: SoldeConge SoldeConge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SoldeConge"
    ADD CONSTRAINT "SoldeConge_pkey" PRIMARY KEY (id);


--
-- Name: SortieAnticipee SortieAnticipee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SortieAnticipee"
    ADD CONSTRAINT "SortieAnticipee_pkey" PRIMARY KEY (id);


--
-- Name: Stage Stage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Stage"
    ADD CONSTRAINT "Stage_pkey" PRIMARY KEY (id);


--
-- Name: StockArticle StockArticle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticle"
    ADD CONSTRAINT "StockArticle_pkey" PRIMARY KEY (id);


--
-- Name: StockageFichier StockageFichier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockageFichier"
    ADD CONSTRAINT "StockageFichier_pkey" PRIMARY KEY (id);


--
-- Name: StripeEvent StripeEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StripeEvent"
    ADD CONSTRAINT "StripeEvent_pkey" PRIMARY KEY (id);


--
-- Name: SuiviSignalement SuiviSignalement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SuiviSignalement"
    ADD CONSTRAINT "SuiviSignalement_pkey" PRIMARY KEY (id);


--
-- Name: TemplateDocument TemplateDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemplateDocument"
    ADD CONSTRAINT "TemplateDocument_pkey" PRIMARY KEY (id);


--
-- Name: TentativeConnexion TentativeConnexion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TentativeConnexion"
    ADD CONSTRAINT "TentativeConnexion_pkey" PRIMARY KEY (id);


--
-- Name: TestAdmission TestAdmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestAdmission"
    ADD CONSTRAINT "TestAdmission_pkey" PRIMARY KEY (id);


--
-- Name: ThemeEcole ThemeEcole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ThemeEcole"
    ADD CONSTRAINT "ThemeEcole_pkey" PRIMARY KEY (id);


--
-- Name: TicketMessage TicketMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_pkey" PRIMARY KEY (id);


--
-- Name: TicketStatutHistorique TicketStatutHistorique_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketStatutHistorique"
    ADD CONSTRAINT "TicketStatutHistorique_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: TransportArret TransportArret_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportArret"
    ADD CONSTRAINT "TransportArret_pkey" PRIMARY KEY (id);


--
-- Name: TransportInscription TransportInscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportInscription"
    ADD CONSTRAINT "TransportInscription_pkey" PRIMARY KEY (id);


--
-- Name: TransportLigne TransportLigne_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportLigne"
    ADD CONSTRAINT "TransportLigne_pkey" PRIMARY KEY (id);


--
-- Name: TwoFactorBackupCode TwoFactorBackupCode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TwoFactorBackupCode"
    ADD CONSTRAINT "TwoFactorBackupCode_pkey" PRIMARY KEY (id);


--
-- Name: TwoFactorMethod TwoFactorMethod_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TwoFactorMethod"
    ADD CONSTRAINT "TwoFactorMethod_pkey" PRIMARY KEY (id);


--
-- Name: UtilisateurEcole UtilisateurEcole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UtilisateurEcole"
    ADD CONSTRAINT "UtilisateurEcole_pkey" PRIMARY KEY (id);


--
-- Name: UtilisateurRole UtilisateurRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UtilisateurRole"
    ADD CONSTRAINT "UtilisateurRole_pkey" PRIMARY KEY ("utilisateurId", "roleId");


--
-- Name: Utilisateur Utilisateur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Utilisateur"
    ADD CONSTRAINT "Utilisateur_pkey" PRIMARY KEY (id);


--
-- Name: Vaccination Vaccination_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vaccination"
    ADD CONSTRAINT "Vaccination_pkey" PRIMARY KEY (id);


--
-- Name: VariablePaie VariablePaie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VariablePaie"
    ADD CONSTRAINT "VariablePaie_pkey" PRIMARY KEY (id);


--
-- Name: VerificationAntecedents VerificationAntecedents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VerificationAntecedents"
    ADD CONSTRAINT "VerificationAntecedents_pkey" PRIMARY KEY (id);


--
-- Name: Visiteur Visiteur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Visiteur"
    ADD CONSTRAINT "Visiteur_pkey" PRIMARY KEY (id);


--
-- Name: VoteConseil VoteConseil_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VoteConseil"
    ADD CONSTRAINT "VoteConseil_pkey" PRIMARY KEY (id);


--
-- Name: WebhookDelivery WebhookDelivery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WebhookDelivery"
    ADD CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY (id);


--
-- Name: WebhookSortant WebhookSortant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WebhookSortant"
    ADD CONSTRAINT "WebhookSortant_pkey" PRIMARY KEY (id);


--
-- Name: WidgetDashboard WidgetDashboard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WidgetDashboard"
    ADD CONSTRAINT "WidgetDashboard_pkey" PRIMARY KEY (id);


--
-- Name: _EcoleToPermission _EcoleToPermission_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_EcoleToPermission"
    ADD CONSTRAINT "_EcoleToPermission_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: account_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "account_userId_idx" ON neon_auth.account USING btree ("userId");


--
-- Name: invitation_email_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX invitation_email_idx ON neon_auth.invitation USING btree (email);


--
-- Name: invitation_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "invitation_organizationId_idx" ON neon_auth.invitation USING btree ("organizationId");


--
-- Name: member_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_organizationId_idx" ON neon_auth.member USING btree ("organizationId");


--
-- Name: member_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_userId_idx" ON neon_auth.member USING btree ("userId");


--
-- Name: organization_slug_uidx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE UNIQUE INDEX organization_slug_uidx ON neon_auth.organization USING btree (slug);


--
-- Name: session_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "session_userId_idx" ON neon_auth.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX verification_identifier_idx ON neon_auth.verification USING btree (identifier);


--
-- Name: ActiviteParticipant_activiteId_eleveId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ActiviteParticipant_activiteId_eleveId_key" ON public."ActiviteParticipant" USING btree ("activiteId", "eleveId");


--
-- Name: Activite_ecoleId_dateDebut_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activite_ecoleId_dateDebut_idx" ON public."Activite" USING btree ("ecoleId", "dateDebut");


--
-- Name: AnneeScolaire_ecoleId_libelle_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AnneeScolaire_ecoleId_libelle_key" ON public."AnneeScolaire" USING btree ("ecoleId", libelle);


--
-- Name: AnnonceLecture_annonceId_utilisateurId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AnnonceLecture_annonceId_utilisateurId_key" ON public."AnnonceLecture" USING btree ("annonceId", "utilisateurId");


--
-- Name: AuditLog_ecoleId_dateAction_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_ecoleId_dateAction_idx" ON public."AuditLog" USING btree ("ecoleId", "dateAction");


--
-- Name: AvancementProgramme_chapitreId_classeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AvancementProgramme_chapitreId_classeId_key" ON public."AvancementProgramme" USING btree ("chapitreId", "classeId");


--
-- Name: AvoirEcole_ecoleId_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AvoirEcole_ecoleId_numero_key" ON public."AvoirEcole" USING btree ("ecoleId", numero);


--
-- Name: AvoirSaas_ecoleId_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AvoirSaas_ecoleId_numero_key" ON public."AvoirSaas" USING btree ("ecoleId", numero);


--
-- Name: BulletinAppreciation_bulletinId_matiereId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BulletinAppreciation_bulletinId_matiereId_key" ON public."BulletinAppreciation" USING btree ("bulletinId", "matiereId");


--
-- Name: BulletinPaie_personnelId_periode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BulletinPaie_personnelId_periode_key" ON public."BulletinPaie" USING btree ("personnelId", periode);


--
-- Name: Bulletin_classeId_periodeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bulletin_classeId_periodeId_idx" ON public."Bulletin" USING btree ("classeId", "periodeId");


--
-- Name: Bulletin_eleveId_periodeId_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Bulletin_eleveId_periodeId_version_key" ON public."Bulletin" USING btree ("eleveId", "periodeId", version);


--
-- Name: CantineInscription_eleveId_anneeScolaireId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CantineInscription_eleveId_anneeScolaireId_key" ON public."CantineInscription" USING btree ("eleveId", "anneeScolaireId");


--
-- Name: CantineMenu_ecoleId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CantineMenu_ecoleId_date_key" ON public."CantineMenu" USING btree ("ecoleId", date);


--
-- Name: CantinePresence_ecoleId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CantinePresence_ecoleId_date_idx" ON public."CantinePresence" USING btree ("ecoleId", date);


--
-- Name: CantinePresence_eleveId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CantinePresence_eleveId_date_key" ON public."CantinePresence" USING btree ("eleveId", date);


--
-- Name: Classe_ecoleId_anneeScolaireId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Classe_ecoleId_anneeScolaireId_idx" ON public."Classe" USING btree ("ecoleId", "anneeScolaireId");


--
-- Name: Classe_ecoleId_code_anneeScolaireId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Classe_ecoleId_code_anneeScolaireId_key" ON public."Classe" USING btree ("ecoleId", code, "anneeScolaireId");


--
-- Name: CommandeFournisseur_ecoleId_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CommandeFournisseur_ecoleId_numero_key" ON public."CommandeFournisseur" USING btree ("ecoleId", numero);


--
-- Name: ConfigurationPaie_ecoleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ConfigurationPaie_ecoleId_key" ON public."ConfigurationPaie" USING btree ("ecoleId");


--
-- Name: Conge_personnelId_statut_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Conge_personnelId_statut_idx" ON public."Conge" USING btree ("personnelId", statut);


--
-- Name: Cycle_ecoleId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Cycle_ecoleId_code_key" ON public."Cycle" USING btree ("ecoleId", code);


--
-- Name: Depense_ecoleId_dateDepense_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Depense_ecoleId_dateDepense_idx" ON public."Depense" USING btree ("ecoleId", "dateDepense");


--
-- Name: DomainePersonnalise_domaine_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DomainePersonnalise_domaine_key" ON public."DomainePersonnalise" USING btree (domaine);


--
-- Name: EcheanceFrais_dateEcheance_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EcheanceFrais_dateEcheance_idx" ON public."EcheanceFrais" USING btree ("dateEcheance");


--
-- Name: EcheanceFrais_eleveId_fraisId_dateEcheance_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EcheanceFrais_eleveId_fraisId_dateEcheance_key" ON public."EcheanceFrais" USING btree ("eleveId", "fraisId", "dateEcheance");


--
-- Name: EcheanceFrais_eleveId_statut_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EcheanceFrais_eleveId_statut_idx" ON public."EcheanceFrais" USING btree ("eleveId", statut);


--
-- Name: Ecole_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Ecole_slug_key" ON public."Ecole" USING btree (slug);


--
-- Name: Eleve_ecoleId_matricule_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Eleve_ecoleId_matricule_key" ON public."Eleve" USING btree ("ecoleId", matricule);


--
-- Name: Eleve_ecoleId_nom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Eleve_ecoleId_nom_idx" ON public."Eleve" USING btree ("ecoleId", nom);


--
-- Name: Eleve_utilisateurId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Eleve_utilisateurId_key" ON public."Eleve" USING btree ("utilisateurId");


--
-- Name: EmailLog_ecoleId_dateCreation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmailLog_ecoleId_dateCreation_idx" ON public."EmailLog" USING btree ("ecoleId", "dateCreation");


--
-- Name: EvaluationCompetence_eleveId_competenceId_periodeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EvaluationCompetence_eleveId_competenceId_periodeId_key" ON public."EvaluationCompetence" USING btree ("eleveId", "competenceId", "periodeId");


--
-- Name: Evaluation_classeId_periodeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Evaluation_classeId_periodeId_idx" ON public."Evaluation" USING btree ("classeId", "periodeId");


--
-- Name: FactureFournisseur_ecoleId_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FactureFournisseur_ecoleId_numero_key" ON public."FactureFournisseur" USING btree ("ecoleId", numero);


--
-- Name: FactureSaas_ecoleId_abonnementId_periode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FactureSaas_ecoleId_abonnementId_periode_key" ON public."FactureSaas" USING btree ("ecoleId", "abonnementId", periode);


--
-- Name: FeatureFlagEcole_featureFlagId_ecoleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FeatureFlagEcole_featureFlagId_ecoleId_key" ON public."FeatureFlagEcole" USING btree ("featureFlagId", "ecoleId");


--
-- Name: FeatureFlag_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FeatureFlag_code_key" ON public."FeatureFlag" USING btree (code);


--
-- Name: FeuilleRoute_ecoleId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FeuilleRoute_ecoleId_date_idx" ON public."FeuilleRoute" USING btree ("ecoleId", date);


--
-- Name: FeuilleRoute_ligneId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FeuilleRoute_ligneId_date_key" ON public."FeuilleRoute" USING btree ("ligneId", date);


--
-- Name: FicheSante_eleveId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FicheSante_eleveId_key" ON public."FicheSante" USING btree ("eleveId");


--
-- Name: GarderieInscription_eleveId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "GarderieInscription_eleveId_key" ON public."GarderieInscription" USING btree ("eleveId");


--
-- Name: GarderieSession_ecoleId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GarderieSession_ecoleId_date_idx" ON public."GarderieSession" USING btree ("ecoleId", date);


--
-- Name: Incident_eleveId_dateHeure_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Incident_eleveId_dateHeure_idx" ON public."Incident" USING btree ("eleveId", "dateHeure");


--
-- Name: InscriptionExamenOfficiel_examenOfficielId_eleveId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InscriptionExamenOfficiel_examenOfficielId_eleveId_key" ON public."InscriptionExamenOfficiel" USING btree ("examenOfficielId", "eleveId");


--
-- Name: JetonAuth_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "JetonAuth_tokenHash_key" ON public."JetonAuth" USING btree ("tokenHash");


--
-- Name: JustificationAbsence_eleveId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JustificationAbsence_eleveId_idx" ON public."JustificationAbsence" USING btree ("eleveId");


--
-- Name: JustificationAbsence_presenceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "JustificationAbsence_presenceId_key" ON public."JustificationAbsence" USING btree ("presenceId");


--
-- Name: LigneReleve_ecoleId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LigneReleve_ecoleId_date_idx" ON public."LigneReleve" USING btree ("ecoleId", date);


--
-- Name: Matiere_ecoleId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Matiere_ecoleId_code_key" ON public."Matiere" USING btree ("ecoleId", code);


--
-- Name: ModeleMessage_ecoleId_code_langue_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ModeleMessage_ecoleId_code_langue_key" ON public."ModeleMessage" USING btree ("ecoleId", code, langue);


--
-- Name: MouvementStock_articleId_dateMouvement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MouvementStock_articleId_dateMouvement_idx" ON public."MouvementStock" USING btree ("articleId", "dateMouvement");


--
-- Name: Note_eleveId_evaluationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Note_eleveId_evaluationId_key" ON public."Note" USING btree ("eleveId", "evaluationId");


--
-- Name: Note_eleveId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Note_eleveId_idx" ON public."Note" USING btree ("eleveId");


--
-- Name: Notification_destinataireId_dateCreation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_destinataireId_dateCreation_idx" ON public."Notification" USING btree ("destinataireId", "dateCreation");


--
-- Name: Notification_destinataireId_statut_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_destinataireId_statut_idx" ON public."Notification" USING btree ("destinataireId", statut);


--
-- Name: Paiement_ecoleId_datePaiement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Paiement_ecoleId_datePaiement_idx" ON public."Paiement" USING btree ("ecoleId", "datePaiement");


--
-- Name: Paiement_referenceTransaction_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Paiement_referenceTransaction_key" ON public."Paiement" USING btree ("referenceTransaction");


--
-- Name: ParentTuteur_utilisateurId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ParentTuteur_utilisateurId_key" ON public."ParentTuteur" USING btree ("utilisateurId");


--
-- Name: Periode_ecoleId_anneeScolaireId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Periode_ecoleId_anneeScolaireId_code_key" ON public."Periode" USING btree ("ecoleId", "anneeScolaireId", code);


--
-- Name: Permission_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_code_key" ON public."Permission" USING btree (code);


--
-- Name: Personnel_ecoleId_matricule_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Personnel_ecoleId_matricule_key" ON public."Personnel" USING btree ("ecoleId", matricule);


--
-- Name: Personnel_utilisateurId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Personnel_utilisateurId_key" ON public."Personnel" USING btree ("utilisateurId");


--
-- Name: PointagePersonnel_ecoleId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PointagePersonnel_ecoleId_date_idx" ON public."PointagePersonnel" USING btree ("ecoleId", date);


--
-- Name: PointagePersonnel_personnelId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PointagePersonnel_personnelId_date_key" ON public."PointagePersonnel" USING btree ("personnelId", date);


--
-- Name: Presence_eleveId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Presence_eleveId_idx" ON public."Presence" USING btree ("eleveId");


--
-- Name: Presence_eleveId_seanceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Presence_eleveId_seanceId_key" ON public."Presence" USING btree ("eleveId", "seanceId");


--
-- Name: Presence_seanceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Presence_seanceId_idx" ON public."Presence" USING btree ("seanceId");


--
-- Name: PushToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PushToken_token_key" ON public."PushToken" USING btree (token);


--
-- Name: QuotaUsage_ecoleId_periode_ressource_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "QuotaUsage_ecoleId_periode_ressource_key" ON public."QuotaUsage" USING btree ("ecoleId", periode, ressource);


--
-- Name: Rdv_eleveId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Rdv_eleveId_idx" ON public."Rdv" USING btree ("eleveId");


--
-- Name: ReservationSalle_seanceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReservationSalle_seanceId_key" ON public."ReservationSalle" USING btree ("seanceId");


--
-- Name: Salle_ecoleId_nom_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Salle_ecoleId_nom_key" ON public."Salle" USING btree ("ecoleId", nom);


--
-- Name: Sanction_incidentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Sanction_incidentId_idx" ON public."Sanction" USING btree ("incidentId");


--
-- Name: Sauvegarde_dateCreation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Sauvegarde_dateCreation_idx" ON public."Sauvegarde" USING btree ("dateCreation");


--
-- Name: Seance_classeId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Seance_classeId_date_idx" ON public."Seance" USING btree ("classeId", date);


--
-- Name: Seance_enseignantId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Seance_enseignantId_date_idx" ON public."Seance" USING btree ("enseignantId", date);


--
-- Name: SessionUtilisateur_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SessionUtilisateur_tokenHash_key" ON public."SessionUtilisateur" USING btree ("tokenHash");


--
-- Name: SmsLog_ecoleId_dateCreation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SmsLog_ecoleId_dateCreation_idx" ON public."SmsLog" USING btree ("ecoleId", "dateCreation");


--
-- Name: SoldeConge_personnelId_annee_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SoldeConge_personnelId_annee_key" ON public."SoldeConge" USING btree ("personnelId", annee);


--
-- Name: StockageFichier_ecoleId_dateUpload_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockageFichier_ecoleId_dateUpload_idx" ON public."StockageFichier" USING btree ("ecoleId", "dateUpload");


--
-- Name: StripeEvent_eventIdStripe_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StripeEvent_eventIdStripe_key" ON public."StripeEvent" USING btree ("eventIdStripe");


--
-- Name: TentativeConnexion_adresseIp_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TentativeConnexion_adresseIp_date_idx" ON public."TentativeConnexion" USING btree ("adresseIp", date);


--
-- Name: TentativeConnexion_email_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TentativeConnexion_email_date_idx" ON public."TentativeConnexion" USING btree (email, date);


--
-- Name: ThemeEcole_ecoleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ThemeEcole_ecoleId_key" ON public."ThemeEcole" USING btree ("ecoleId");


--
-- Name: UtilisateurEcole_utilisateurId_ecoleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UtilisateurEcole_utilisateurId_ecoleId_key" ON public."UtilisateurEcole" USING btree ("utilisateurId", "ecoleId");


--
-- Name: Utilisateur_ecoleId_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Utilisateur_ecoleId_email_key" ON public."Utilisateur" USING btree ("ecoleId", email);


--
-- Name: Visiteur_ecoleId_dateHeureEntree_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Visiteur_ecoleId_dateHeureEntree_idx" ON public."Visiteur" USING btree ("ecoleId", "dateHeureEntree");


--
-- Name: VoteConseil_deliberationId_membreId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VoteConseil_deliberationId_membreId_key" ON public."VoteConseil" USING btree ("deliberationId", "membreId");


--
-- Name: _EcoleToPermission_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_EcoleToPermission_B_index" ON public."_EcoleToPermission" USING btree ("B");


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_inviterId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: Abonnement Abonnement_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Abonnement"
    ADD CONSTRAINT "Abonnement_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Abonnement Abonnement_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Abonnement"
    ADD CONSTRAINT "Abonnement_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."PlanTarifaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ActiviteParticipant ActiviteParticipant_activiteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActiviteParticipant"
    ADD CONSTRAINT "ActiviteParticipant_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES public."Activite"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActiviteParticipant ActiviteParticipant_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActiviteParticipant"
    ADD CONSTRAINT "ActiviteParticipant_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Activite Activite_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activite"
    ADD CONSTRAINT "Activite_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Amenagement Amenagement_besoinSpecifiqueId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Amenagement"
    ADD CONSTRAINT "Amenagement_besoinSpecifiqueId_fkey" FOREIGN KEY ("besoinSpecifiqueId") REFERENCES public."BesoinSpecifique"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Amenagement Amenagement_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Amenagement"
    ADD CONSTRAINT "Amenagement_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Amenagement Amenagement_valideParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Amenagement"
    ADD CONSTRAINT "Amenagement_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AnneeScolaire AnneeScolaire_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnneeScolaire"
    ADD CONSTRAINT "AnneeScolaire_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AnnonceLecture AnnonceLecture_annonceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnonceLecture"
    ADD CONSTRAINT "AnnonceLecture_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES public."Annonce"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Annonce Annonce_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Annonce"
    ADD CONSTRAINT "Annonce_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApiTokenLog ApiTokenLog_apiTokenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiTokenLog"
    ADD CONSTRAINT "ApiTokenLog_apiTokenId_fkey" FOREIGN KEY ("apiTokenId") REFERENCES public."ApiToken"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApiToken ApiToken_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiToken"
    ADD CONSTRAINT "ApiToken_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttributionManuel AttributionManuel_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttributionManuel"
    ADD CONSTRAINT "AttributionManuel_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttributionManuel AttributionManuel_manuelScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttributionManuel"
    ADD CONSTRAINT "AttributionManuel_manuelScolaireId_fkey" FOREIGN KEY ("manuelScolaireId") REFERENCES public."ManuelScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AutorisationSortie AutorisationSortie_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutorisationSortie"
    ADD CONSTRAINT "AutorisationSortie_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AutorisationSortie AutorisationSortie_valideeParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutorisationSortie"
    ADD CONSTRAINT "AutorisationSortie_valideeParId_fkey" FOREIGN KEY ("valideeParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AvancementProgramme AvancementProgramme_chapitreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvancementProgramme"
    ADD CONSTRAINT "AvancementProgramme_chapitreId_fkey" FOREIGN KEY ("chapitreId") REFERENCES public."Chapitre"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvancementProgramme AvancementProgramme_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvancementProgramme"
    ADD CONSTRAINT "AvancementProgramme_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvancementProgramme AvancementProgramme_enseignantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvancementProgramme"
    ADD CONSTRAINT "AvancementProgramme_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvoirEcole AvoirEcole_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvoirEcole"
    ADD CONSTRAINT "AvoirEcole_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvoirEcole AvoirEcole_factureFournisseurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvoirEcole"
    ADD CONSTRAINT "AvoirEcole_factureFournisseurId_fkey" FOREIGN KEY ("factureFournisseurId") REFERENCES public."FactureFournisseur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AvoirEcole AvoirEcole_paiementLieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvoirEcole"
    ADD CONSTRAINT "AvoirEcole_paiementLieId_fkey" FOREIGN KEY ("paiementLieId") REFERENCES public."Paiement"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AvoirSaas AvoirSaas_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvoirSaas"
    ADD CONSTRAINT "AvoirSaas_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Batiment Batiment_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Batiment"
    ADD CONSTRAINT "Batiment_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BesoinSpecifique BesoinSpecifique_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BesoinSpecifique"
    ADD CONSTRAINT "BesoinSpecifique_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BiblioLivre BiblioLivre_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiblioLivre"
    ADD CONSTRAINT "BiblioLivre_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BiblioPret BiblioPret_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiblioPret"
    ADD CONSTRAINT "BiblioPret_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BiblioPret BiblioPret_livreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiblioPret"
    ADD CONSTRAINT "BiblioPret_livreId_fkey" FOREIGN KEY ("livreId") REFERENCES public."BiblioLivre"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Budget Budget_anneeScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES public."AnneeScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Budget Budget_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BulletinAppreciation BulletinAppreciation_bulletinId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BulletinAppreciation"
    ADD CONSTRAINT "BulletinAppreciation_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES public."Bulletin"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BulletinAppreciation BulletinAppreciation_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BulletinAppreciation"
    ADD CONSTRAINT "BulletinAppreciation_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BulletinAppreciation BulletinAppreciation_periodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BulletinAppreciation"
    ADD CONSTRAINT "BulletinAppreciation_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES public."Periode"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BulletinPaie BulletinPaie_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BulletinPaie"
    ADD CONSTRAINT "BulletinPaie_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BulletinPaie BulletinPaie_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BulletinPaie"
    ADD CONSTRAINT "BulletinPaie_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Bulletin Bulletin_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bulletin"
    ADD CONSTRAINT "Bulletin_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Bulletin Bulletin_creeParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bulletin"
    ADD CONSTRAINT "Bulletin_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bulletin Bulletin_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bulletin"
    ADD CONSTRAINT "Bulletin_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Bulletin Bulletin_periodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bulletin"
    ADD CONSTRAINT "Bulletin_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES public."Periode"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Bulletin Bulletin_valideDirectionParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bulletin"
    ADD CONSTRAINT "Bulletin_valideDirectionParId_fkey" FOREIGN KEY ("valideDirectionParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bulletin Bulletin_validePpParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bulletin"
    ADD CONSTRAINT "Bulletin_validePpParId_fkey" FOREIGN KEY ("validePpParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CahierTexte CahierTexte_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CahierTexte"
    ADD CONSTRAINT "CahierTexte_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CahierTexte CahierTexte_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CahierTexte"
    ADD CONSTRAINT "CahierTexte_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CahierTexte CahierTexte_enseignantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CahierTexte"
    ADD CONSTRAINT "CahierTexte_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CahierTexte CahierTexte_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CahierTexte"
    ADD CONSTRAINT "CahierTexte_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CahierTexte CahierTexte_periodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CahierTexte"
    ADD CONSTRAINT "CahierTexte_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES public."Periode"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CalendrierScolaire CalendrierScolaire_anneeScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CalendrierScolaire"
    ADD CONSTRAINT "CalendrierScolaire_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES public."AnneeScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CalendrierScolaire CalendrierScolaire_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CalendrierScolaire"
    ADD CONSTRAINT "CalendrierScolaire_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CandidatureAdmission CandidatureAdmission_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CandidatureAdmission"
    ADD CONSTRAINT "CandidatureAdmission_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CandidatureAdmission CandidatureAdmission_niveauId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CandidatureAdmission"
    ADD CONSTRAINT "CandidatureAdmission_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES public."Niveau"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Candidature Candidature_offreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Candidature"
    ADD CONSTRAINT "Candidature_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES public."OffreEmploi"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CantineInscription CantineInscription_anneeScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantineInscription"
    ADD CONSTRAINT "CantineInscription_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES public."AnneeScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CantineInscription CantineInscription_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantineInscription"
    ADD CONSTRAINT "CantineInscription_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CantineInscription CantineInscription_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantineInscription"
    ADD CONSTRAINT "CantineInscription_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CantineInscription CantineInscription_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantineInscription"
    ADD CONSTRAINT "CantineInscription_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CantineMenu CantineMenu_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantineMenu"
    ADD CONSTRAINT "CantineMenu_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CantinePresence CantinePresence_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantinePresence"
    ADD CONSTRAINT "CantinePresence_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CantinePresence CantinePresence_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CantinePresence"
    ADD CONSTRAINT "CantinePresence_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Chapitre Chapitre_programmeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Chapitre"
    ADD CONSTRAINT "Chapitre_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES public."Programme"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Classe Classe_anneeScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Classe"
    ADD CONSTRAINT "Classe_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES public."AnneeScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Classe Classe_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Classe"
    ADD CONSTRAINT "Classe_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Classe Classe_niveauId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Classe"
    ADD CONSTRAINT "Classe_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES public."Niveau"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CommandeFournisseur CommandeFournisseur_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommandeFournisseur"
    ADD CONSTRAINT "CommandeFournisseur_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CommandeFournisseur CommandeFournisseur_fournisseurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommandeFournisseur"
    ADD CONSTRAINT "CommandeFournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES public."Fournisseur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Competence Competence_cycleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Competence"
    ADD CONSTRAINT "Competence_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES public."Cycle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Competence Competence_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Competence"
    ADD CONSTRAINT "Competence_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Competence Competence_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Competence"
    ADD CONSTRAINT "Competence_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CompteComptable CompteComptable_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompteComptable"
    ADD CONSTRAINT "CompteComptable_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConfigurationPaie ConfigurationPaie_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConfigurationPaie"
    ADD CONSTRAINT "ConfigurationPaie_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Conge Conge_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Conge"
    ADD CONSTRAINT "Conge_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Conge Conge_traiteParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Conge"
    ADD CONSTRAINT "Conge_traiteParId_fkey" FOREIGN KEY ("traiteParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConseilClasse ConseilClasse_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConseilClasse"
    ADD CONSTRAINT "ConseilClasse_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConseilClasse ConseilClasse_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConseilClasse"
    ADD CONSTRAINT "ConseilClasse_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConseilClasse ConseilClasse_periodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConseilClasse"
    ADD CONSTRAINT "ConseilClasse_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES public."Periode"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConsentementCommunication ConsentementCommunication_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsentementCommunication"
    ADD CONSTRAINT "ConsentementCommunication_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConsentementImage ConsentementImage_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsentementImage"
    ADD CONSTRAINT "ConsentementImage_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConsentementImage ConsentementImage_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsentementImage"
    ADD CONSTRAINT "ConsentementImage_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConventionStage ConventionStage_stageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConventionStage"
    ADD CONSTRAINT "ConventionStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public."Stage"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConversationParticipant ConversationParticipant_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."Conversation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Conversation Conversation_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CotisationSociale CotisationSociale_bulletinId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CotisationSociale"
    ADD CONSTRAINT "CotisationSociale_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES public."BulletinPaie"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CreneauHebdo CreneauHebdo_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreneauHebdo"
    ADD CONSTRAINT "CreneauHebdo_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CreneauHebdo CreneauHebdo_emploiTempsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreneauHebdo"
    ADD CONSTRAINT "CreneauHebdo_emploiTempsId_fkey" FOREIGN KEY ("emploiTempsId") REFERENCES public."EmploiTemps"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CreneauHebdo CreneauHebdo_enseignantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreneauHebdo"
    ADD CONSTRAINT "CreneauHebdo_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CreneauHebdo CreneauHebdo_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreneauHebdo"
    ADD CONSTRAINT "CreneauHebdo_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CreneauHebdo CreneauHebdo_salleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreneauHebdo"
    ADD CONSTRAINT "CreneauHebdo_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES public."Salle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CreneauRdv CreneauRdv_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreneauRdv"
    ADD CONSTRAINT "CreneauRdv_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Cycle Cycle_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cycle"
    ADD CONSTRAINT "Cycle_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DeliberationConseil DeliberationConseil_conseilId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeliberationConseil"
    ADD CONSTRAINT "DeliberationConseil_conseilId_fkey" FOREIGN KEY ("conseilId") REFERENCES public."ConseilClasse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DeliberationConseil DeliberationConseil_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeliberationConseil"
    ADD CONSTRAINT "DeliberationConseil_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Depense Depense_creeParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Depense"
    ADD CONSTRAINT "Depense_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Depense Depense_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Depense"
    ADD CONSTRAINT "Depense_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Depense Depense_valideeParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Depense"
    ADD CONSTRAINT "Depense_valideeParId_fkey" FOREIGN KEY ("valideeParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Devoir Devoir_cahierTexteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Devoir"
    ADD CONSTRAINT "Devoir_cahierTexteId_fkey" FOREIGN KEY ("cahierTexteId") REFERENCES public."CahierTexte"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Devoir Devoir_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Devoir"
    ADD CONSTRAINT "Devoir_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Devoir Devoir_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Devoir"
    ADD CONSTRAINT "Devoir_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Devoir Devoir_enseignantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Devoir"
    ADD CONSTRAINT "Devoir_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Devoir Devoir_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Devoir"
    ADD CONSTRAINT "Devoir_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Dispense Dispense_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Dispense"
    ADD CONSTRAINT "Dispense_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispense Dispense_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Dispense"
    ADD CONSTRAINT "Dispense_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DocumentEleve DocumentEleve_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentEleve"
    ADD CONSTRAINT "DocumentEleve_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DocumentGenere DocumentGenere_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentGenere"
    ADD CONSTRAINT "DocumentGenere_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DocumentGenere DocumentGenere_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentGenere"
    ADD CONSTRAINT "DocumentGenere_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."TemplateDocument"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DomainePersonnalise DomainePersonnalise_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DomainePersonnalise"
    ADD CONSTRAINT "DomainePersonnalise_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EcheanceFrais EcheanceFrais_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EcheanceFrais"
    ADD CONSTRAINT "EcheanceFrais_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EcheanceFrais EcheanceFrais_fraisId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EcheanceFrais"
    ADD CONSTRAINT "EcheanceFrais_fraisId_fkey" FOREIGN KEY ("fraisId") REFERENCES public."Frais"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ecole Ecole_planCourantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ecole"
    ADD CONSTRAINT "Ecole_planCourantId_fkey" FOREIGN KEY ("planCourantId") REFERENCES public."PlanTarifaire"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EcritureComptable EcritureComptable_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EcritureComptable"
    ADD CONSTRAINT "EcritureComptable_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EcritureComptable EcritureComptable_journalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EcritureComptable"
    ADD CONSTRAINT "EcritureComptable_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES public."JournalComptable"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EleveHistoriqueClasse EleveHistoriqueClasse_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EleveHistoriqueClasse"
    ADD CONSTRAINT "EleveHistoriqueClasse_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EleveHistoriqueClasse EleveHistoriqueClasse_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EleveHistoriqueClasse"
    ADD CONSTRAINT "EleveHistoriqueClasse_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EleveParent EleveParent_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EleveParent"
    ADD CONSTRAINT "EleveParent_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EleveParent EleveParent_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EleveParent"
    ADD CONSTRAINT "EleveParent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."ParentTuteur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Eleve Eleve_classeActuelleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Eleve"
    ADD CONSTRAINT "Eleve_classeActuelleId_fkey" FOREIGN KEY ("classeActuelleId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Eleve Eleve_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Eleve"
    ADD CONSTRAINT "Eleve_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Eleve Eleve_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Eleve"
    ADD CONSTRAINT "Eleve_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmailLog EmailLog_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmailLog"
    ADD CONSTRAINT "EmailLog_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmploiTemps EmploiTemps_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmploiTemps"
    ADD CONSTRAINT "EmploiTemps_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmploiTemps EmploiTemps_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmploiTemps"
    ADD CONSTRAINT "EmploiTemps_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmploiTemps EmploiTemps_enseignantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmploiTemps"
    ADD CONSTRAINT "EmploiTemps_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmploiTemps EmploiTemps_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmploiTemps"
    ADD CONSTRAINT "EmploiTemps_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmploiTemps EmploiTemps_salleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmploiTemps"
    ADD CONSTRAINT "EmploiTemps_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES public."Salle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EntreeCahierTexte EntreeCahierTexte_cahierTexteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntreeCahierTexte"
    ADD CONSTRAINT "EntreeCahierTexte_cahierTexteId_fkey" FOREIGN KEY ("cahierTexteId") REFERENCES public."CahierTexte"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EntretienRecrutement EntretienRecrutement_candidatureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntretienRecrutement"
    ADD CONSTRAINT "EntretienRecrutement_candidatureId_fkey" FOREIGN KEY ("candidatureId") REFERENCES public."Candidature"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Etage Etage_batimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Etage"
    ADD CONSTRAINT "Etage_batimentId_fkey" FOREIGN KEY ("batimentId") REFERENCES public."Batiment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EtapeAdmission EtapeAdmission_candidatureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EtapeAdmission"
    ADD CONSTRAINT "EtapeAdmission_candidatureId_fkey" FOREIGN KEY ("candidatureId") REFERENCES public."CandidatureAdmission"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EtapeRecrutement EtapeRecrutement_candidatureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EtapeRecrutement"
    ADD CONSTRAINT "EtapeRecrutement_candidatureId_fkey" FOREIGN KEY ("candidatureId") REFERENCES public."Candidature"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EvaluationCompetence EvaluationCompetence_competenceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EvaluationCompetence"
    ADD CONSTRAINT "EvaluationCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES public."Competence"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EvaluationCompetence EvaluationCompetence_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EvaluationCompetence"
    ADD CONSTRAINT "EvaluationCompetence_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EvaluationCompetence EvaluationCompetence_periodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EvaluationCompetence"
    ADD CONSTRAINT "EvaluationCompetence_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES public."Periode"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EvaluationPersonnel EvaluationPersonnel_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EvaluationPersonnel"
    ADD CONSTRAINT "EvaluationPersonnel_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Evaluation Evaluation_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Evaluation"
    ADD CONSTRAINT "Evaluation_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Evaluation Evaluation_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Evaluation"
    ADD CONSTRAINT "Evaluation_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Evaluation Evaluation_enseignantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Evaluation"
    ADD CONSTRAINT "Evaluation_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Evaluation Evaluation_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Evaluation"
    ADD CONSTRAINT "Evaluation_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Evaluation Evaluation_periodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Evaluation"
    ADD CONSTRAINT "Evaluation_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES public."Periode"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExamenOfficiel ExamenOfficiel_anneeScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamenOfficiel"
    ADD CONSTRAINT "ExamenOfficiel_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES public."AnneeScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExamenOfficiel ExamenOfficiel_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamenOfficiel"
    ADD CONSTRAINT "ExamenOfficiel_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExamenOfficiel ExamenOfficiel_niveauId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamenOfficiel"
    ADD CONSTRAINT "ExamenOfficiel_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES public."Niveau"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FactureFournisseur FactureFournisseur_commandeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FactureFournisseur"
    ADD CONSTRAINT "FactureFournisseur_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES public."CommandeFournisseur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FactureFournisseur FactureFournisseur_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FactureFournisseur"
    ADD CONSTRAINT "FactureFournisseur_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FactureFournisseur FactureFournisseur_fournisseurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FactureFournisseur"
    ADD CONSTRAINT "FactureFournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES public."Fournisseur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FactureSaas FactureSaas_abonnementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FactureSaas"
    ADD CONSTRAINT "FactureSaas_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES public."Abonnement"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FactureSaas FactureSaas_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FactureSaas"
    ADD CONSTRAINT "FactureSaas_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeatureFlagEcole FeatureFlagEcole_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureFlagEcole"
    ADD CONSTRAINT "FeatureFlagEcole_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeatureFlagEcole FeatureFlagEcole_featureFlagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureFlagEcole"
    ADD CONSTRAINT "FeatureFlagEcole_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES public."FeatureFlag"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeuilleRoute FeuilleRoute_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeuilleRoute"
    ADD CONSTRAINT "FeuilleRoute_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeuilleRoute FeuilleRoute_ligneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeuilleRoute"
    ADD CONSTRAINT "FeuilleRoute_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES public."TransportLigne"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FicheSante FicheSante_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FicheSante"
    ADD CONSTRAINT "FicheSante_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FicheSante FicheSante_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FicheSante"
    ADD CONSTRAINT "FicheSante_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Fournisseur Fournisseur_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Fournisseur"
    ADD CONSTRAINT "Fournisseur_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Frais Frais_anneeScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Frais"
    ADD CONSTRAINT "Frais_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES public."AnneeScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Frais Frais_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Frais"
    ADD CONSTRAINT "Frais_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Frais Frais_niveauId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Frais"
    ADD CONSTRAINT "Frais_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES public."Niveau"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: GarderieInscription GarderieInscription_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GarderieInscription"
    ADD CONSTRAINT "GarderieInscription_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GarderieInscription GarderieInscription_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GarderieInscription"
    ADD CONSTRAINT "GarderieInscription_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GarderieSession GarderieSession_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GarderieSession"
    ADD CONSTRAINT "GarderieSession_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GarderieSession GarderieSession_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GarderieSession"
    ADD CONSTRAINT "GarderieSession_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HabilitationPenale HabilitationPenale_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HabilitationPenale"
    ADD CONSTRAINT "HabilitationPenale_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HabilitationPenale HabilitationPenale_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HabilitationPenale"
    ADD CONSTRAINT "HabilitationPenale_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Incident Incident_declareParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Incident"
    ADD CONSTRAINT "Incident_declareParId_fkey" FOREIGN KEY ("declareParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Incident Incident_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Incident"
    ADD CONSTRAINT "Incident_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InscriptionExamenOfficiel InscriptionExamenOfficiel_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InscriptionExamenOfficiel"
    ADD CONSTRAINT "InscriptionExamenOfficiel_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InscriptionExamenOfficiel InscriptionExamenOfficiel_examenOfficielId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InscriptionExamenOfficiel"
    ADD CONSTRAINT "InscriptionExamenOfficiel_examenOfficielId_fkey" FOREIGN KEY ("examenOfficielId") REFERENCES public."ExamenOfficiel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JetonAuth JetonAuth_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JetonAuth"
    ADD CONSTRAINT "JetonAuth_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JournalComptable JournalComptable_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JournalComptable"
    ADD CONSTRAINT "JournalComptable_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JustificationAbsence JustificationAbsence_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JustificationAbsence"
    ADD CONSTRAINT "JustificationAbsence_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: JustificationAbsence JustificationAbsence_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JustificationAbsence"
    ADD CONSTRAINT "JustificationAbsence_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JustificationAbsence JustificationAbsence_presenceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JustificationAbsence"
    ADD CONSTRAINT "JustificationAbsence_presenceId_fkey" FOREIGN KEY ("presenceId") REFERENCES public."Presence"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LigneBudget LigneBudget_budgetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneBudget"
    ADD CONSTRAINT "LigneBudget_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES public."Budget"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LigneBulletinPaie LigneBulletinPaie_bulletinId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneBulletinPaie"
    ADD CONSTRAINT "LigneBulletinPaie_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES public."BulletinPaie"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LigneCommande LigneCommande_commandeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneCommande"
    ADD CONSTRAINT "LigneCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES public."CommandeFournisseur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LigneEcriture LigneEcriture_compteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneEcriture"
    ADD CONSTRAINT "LigneEcriture_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES public."CompteComptable"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LigneEcriture LigneEcriture_ecritureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneEcriture"
    ADD CONSTRAINT "LigneEcriture_ecritureId_fkey" FOREIGN KEY ("ecritureId") REFERENCES public."EcritureComptable"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LigneReleve LigneReleve_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneReleve"
    ADD CONSTRAINT "LigneReleve_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LigneReleve LigneReleve_paiementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LigneReleve"
    ADD CONSTRAINT "LigneReleve_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES public."Paiement"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ListeFourniture ListeFourniture_anneeScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ListeFourniture"
    ADD CONSTRAINT "ListeFourniture_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES public."AnneeScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ListeFourniture ListeFourniture_niveauId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ListeFourniture"
    ADD CONSTRAINT "ListeFourniture_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES public."Niveau"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ManuelScolaire ManuelScolaire_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManuelScolaire"
    ADD CONSTRAINT "ManuelScolaire_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ManuelScolaire ManuelScolaire_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManuelScolaire"
    ADD CONSTRAINT "ManuelScolaire_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ManuelScolaire ManuelScolaire_niveauId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManuelScolaire"
    ADD CONSTRAINT "ManuelScolaire_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES public."Niveau"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Matiere Matiere_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Matiere"
    ADD CONSTRAINT "Matiere_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MembreConseil MembreConseil_conseilId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembreConseil"
    ADD CONSTRAINT "MembreConseil_conseilId_fkey" FOREIGN KEY ("conseilId") REFERENCES public."ConseilClasse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MembreEquipeEducatif MembreEquipeEducatif_planAccompagnementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembreEquipeEducatif"
    ADD CONSTRAINT "MembreEquipeEducatif_planAccompagnementId_fkey" FOREIGN KEY ("planAccompagnementId") REFERENCES public."PlanAccompagnement"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Message Message_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."Conversation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MesureProtection MesureProtection_signalementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MesureProtection"
    ADD CONSTRAINT "MesureProtection_signalementId_fkey" FOREIGN KEY ("signalementId") REFERENCES public."SignalementMineur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ModeleMessage ModeleMessage_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ModeleMessage"
    ADD CONSTRAINT "ModeleMessage_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MouvementStock MouvementStock_articleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MouvementStock"
    ADD CONSTRAINT "MouvementStock_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public."StockArticle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MouvementStock MouvementStock_effectueParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MouvementStock"
    ADD CONSTRAINT "MouvementStock_effectueParId_fkey" FOREIGN KEY ("effectueParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Niveau Niveau_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Niveau"
    ADD CONSTRAINT "Niveau_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."Section"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Note Note_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Note Note_evaluationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES public."Evaluation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Note Note_saisiParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_saisiParId_fkey" FOREIGN KEY ("saisiParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_destinataireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_modeleMessageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_modeleMessageId_fkey" FOREIGN KEY ("modeleMessageId") REFERENCES public."ModeleMessage"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ObjectifPlan ObjectifPlan_planAccompagnementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ObjectifPlan"
    ADD CONSTRAINT "ObjectifPlan_planAccompagnementId_fkey" FOREIGN KEY ("planAccompagnementId") REFERENCES public."PlanAccompagnement"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OffreEmploi OffreEmploi_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OffreEmploi"
    ADD CONSTRAINT "OffreEmploi_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaiementEcheance PaiementEcheance_echeanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaiementEcheance"
    ADD CONSTRAINT "PaiementEcheance_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES public."EcheanceFrais"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaiementEcheance PaiementEcheance_paiementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaiementEcheance"
    ADD CONSTRAINT "PaiementEcheance_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES public."Paiement"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaiementFournisseur PaiementFournisseur_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaiementFournisseur"
    ADD CONSTRAINT "PaiementFournisseur_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaiementFournisseur PaiementFournisseur_factureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaiementFournisseur"
    ADD CONSTRAINT "PaiementFournisseur_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES public."FactureFournisseur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Paiement Paiement_annuleParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Paiement"
    ADD CONSTRAINT "Paiement_annuleParId_fkey" FOREIGN KEY ("annuleParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Paiement Paiement_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Paiement"
    ADD CONSTRAINT "Paiement_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Paiement Paiement_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Paiement"
    ADD CONSTRAINT "Paiement_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Paiement Paiement_encaisseParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Paiement"
    ADD CONSTRAINT "Paiement_encaisseParId_fkey" FOREIGN KEY ("encaisseParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Paiement Paiement_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Paiement"
    ADD CONSTRAINT "Paiement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."ParentTuteur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ParentTuteur ParentTuteur_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ParentTuteur"
    ADD CONSTRAINT "ParentTuteur_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ParentTuteur ParentTuteur_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ParentTuteur"
    ADD CONSTRAINT "ParentTuteur_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PassageArret PassageArret_arretId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PassageArret"
    ADD CONSTRAINT "PassageArret_arretId_fkey" FOREIGN KEY ("arretId") REFERENCES public."TransportArret"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PassageArret PassageArret_feuilleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PassageArret"
    ADD CONSTRAINT "PassageArret_feuilleId_fkey" FOREIGN KEY ("feuilleId") REFERENCES public."FeuilleRoute"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PassageInfirmerie PassageInfirmerie_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PassageInfirmerie"
    ADD CONSTRAINT "PassageInfirmerie_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PassageInfirmerie PassageInfirmerie_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PassageInfirmerie"
    ADD CONSTRAINT "PassageInfirmerie_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PassageInfirmerie PassageInfirmerie_ficheSanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PassageInfirmerie"
    ADD CONSTRAINT "PassageInfirmerie_ficheSanteId_fkey" FOREIGN KEY ("ficheSanteId") REFERENCES public."FicheSante"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Periode Periode_anneeScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Periode"
    ADD CONSTRAINT "Periode_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES public."AnneeScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Periode Periode_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Periode"
    ADD CONSTRAINT "Periode_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PersonnelRole PersonnelRole_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonnelRole"
    ADD CONSTRAINT "PersonnelRole_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PersonnelRole PersonnelRole_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonnelRole"
    ADD CONSTRAINT "PersonnelRole_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PersonnelRole PersonnelRole_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonnelRole"
    ADD CONSTRAINT "PersonnelRole_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PersonnelRole PersonnelRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonnelRole"
    ADD CONSTRAINT "PersonnelRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Personnel Personnel_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Personnel"
    ADD CONSTRAINT "Personnel_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Personnel Personnel_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Personnel"
    ADD CONSTRAINT "Personnel_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PieceJointe PieceJointe_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PieceJointe"
    ADD CONSTRAINT "PieceJointe_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PlanAccompagnement PlanAccompagnement_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlanAccompagnement"
    ADD CONSTRAINT "PlanAccompagnement_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PlanAccompagnement PlanAccompagnement_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlanAccompagnement"
    ADD CONSTRAINT "PlanAccompagnement_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PointagePersonnel PointagePersonnel_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointagePersonnel"
    ADD CONSTRAINT "PointagePersonnel_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PointagePersonnel PointagePersonnel_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointagePersonnel"
    ADD CONSTRAINT "PointagePersonnel_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Presence Presence_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Presence"
    ADD CONSTRAINT "Presence_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Presence Presence_saisiParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Presence"
    ADD CONSTRAINT "Presence_saisiParId_fkey" FOREIGN KEY ("saisiParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Presence Presence_seanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Presence"
    ADD CONSTRAINT "Presence_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES public."Seance"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Programme Programme_anneeScolaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Programme"
    ADD CONSTRAINT "Programme_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES public."AnneeScolaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Programme Programme_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Programme"
    ADD CONSTRAINT "Programme_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Programme Programme_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Programme"
    ADD CONSTRAINT "Programme_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Programme Programme_niveauId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Programme"
    ADD CONSTRAINT "Programme_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES public."Niveau"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PushToken PushToken_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushToken"
    ADD CONSTRAINT "PushToken_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QuotaUsage QuotaUsage_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuotaUsage"
    ADD CONSTRAINT "QuotaUsage_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RapportSauvegarde RapportSauvegarde_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RapportSauvegarde"
    ADD CONSTRAINT "RapportSauvegarde_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Rdv Rdv_creneauRdvId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rdv"
    ADD CONSTRAINT "Rdv_creneauRdvId_fkey" FOREIGN KEY ("creneauRdvId") REFERENCES public."CreneauRdv"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Rdv Rdv_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rdv"
    ADD CONSTRAINT "Rdv_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Rdv Rdv_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rdv"
    ADD CONSTRAINT "Rdv_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."ParentTuteur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReceptionCommande ReceptionCommande_commandeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReceptionCommande"
    ADD CONSTRAINT "ReceptionCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES public."CommandeFournisseur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RegistreTraitement RegistreTraitement_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistreTraitement"
    ADD CONSTRAINT "RegistreTraitement_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RegleCalculMoyenne RegleCalculMoyenne_cycleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegleCalculMoyenne"
    ADD CONSTRAINT "RegleCalculMoyenne_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES public."Cycle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RegleCalculMoyenne RegleCalculMoyenne_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegleCalculMoyenne"
    ADD CONSTRAINT "RegleCalculMoyenne_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Remplacement Remplacement_congeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remplacement"
    ADD CONSTRAINT "Remplacement_congeId_fkey" FOREIGN KEY ("congeId") REFERENCES public."Conge"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Remplacement Remplacement_personnelAbsentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remplacement"
    ADD CONSTRAINT "Remplacement_personnelAbsentId_fkey" FOREIGN KEY ("personnelAbsentId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Remplacement Remplacement_personnelRemplacantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remplacement"
    ADD CONSTRAINT "Remplacement_personnelRemplacantId_fkey" FOREIGN KEY ("personnelRemplacantId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RenduDevoir RenduDevoir_devoirId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RenduDevoir"
    ADD CONSTRAINT "RenduDevoir_devoirId_fkey" FOREIGN KEY ("devoirId") REFERENCES public."Devoir"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RenduDevoir RenduDevoir_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RenduDevoir"
    ADD CONSTRAINT "RenduDevoir_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReservationSalle ReservationSalle_salleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReservationSalle"
    ADD CONSTRAINT "ReservationSalle_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES public."Salle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReservationSalle ReservationSalle_seanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReservationSalle"
    ADD CONSTRAINT "ReservationSalle_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES public."Seance"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ReunionCollective ReunionCollective_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReunionCollective"
    ADD CONSTRAINT "ReunionCollective_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RevisionPlan RevisionPlan_planAccompagnementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RevisionPlan"
    ADD CONSTRAINT "RevisionPlan_planAccompagnementId_fkey" FOREIGN KEY ("planAccompagnementId") REFERENCES public."PlanAccompagnement"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RolePermission RolePermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Role Role_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SalleEquipement SalleEquipement_salleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SalleEquipement"
    ADD CONSTRAINT "SalleEquipement_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES public."Salle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Salle Salle_batimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Salle"
    ADD CONSTRAINT "Salle_batimentId_fkey" FOREIGN KEY ("batimentId") REFERENCES public."Batiment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Salle Salle_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Salle"
    ADD CONSTRAINT "Salle_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Salle Salle_etageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Salle"
    ADD CONSTRAINT "Salle_etageId_fkey" FOREIGN KEY ("etageId") REFERENCES public."Etage"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sanction Sanction_decideParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sanction"
    ADD CONSTRAINT "Sanction_decideParId_fkey" FOREIGN KEY ("decideParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sanction Sanction_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sanction"
    ADD CONSTRAINT "Sanction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."Incident"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sauvegarde Sauvegarde_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sauvegarde"
    ADD CONSTRAINT "Sauvegarde_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Seance Seance_chapitreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Seance"
    ADD CONSTRAINT "Seance_chapitreId_fkey" FOREIGN KEY ("chapitreId") REFERENCES public."Chapitre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Seance Seance_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Seance"
    ADD CONSTRAINT "Seance_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Seance Seance_emploiTempsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Seance"
    ADD CONSTRAINT "Seance_emploiTempsId_fkey" FOREIGN KEY ("emploiTempsId") REFERENCES public."EmploiTemps"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Seance Seance_enseignantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Seance"
    ADD CONSTRAINT "Seance_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Seance Seance_matiereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Seance"
    ADD CONSTRAINT "Seance_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES public."Matiere"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Seance Seance_salleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Seance"
    ADD CONSTRAINT "Seance_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES public."Salle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Section Section_cycleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Section"
    ADD CONSTRAINT "Section_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES public."Cycle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SessionUtilisateur SessionUtilisateur_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SessionUtilisateur"
    ADD CONSTRAINT "SessionUtilisateur_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SignalementMineur SignalementMineur_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SignalementMineur"
    ADD CONSTRAINT "SignalementMineur_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SignalementMineur SignalementMineur_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SignalementMineur"
    ADD CONSTRAINT "SignalementMineur_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SignatureElectronique SignatureElectronique_documentGenereId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SignatureElectronique"
    ADD CONSTRAINT "SignatureElectronique_documentGenereId_fkey" FOREIGN KEY ("documentGenereId") REFERENCES public."DocumentGenere"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SmsLog SmsLog_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SmsLog"
    ADD CONSTRAINT "SmsLog_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SoldeConge SoldeConge_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SoldeConge"
    ADD CONSTRAINT "SoldeConge_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SoldeConge SoldeConge_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SoldeConge"
    ADD CONSTRAINT "SoldeConge_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SortieAnticipee SortieAnticipee_autorisationSortieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SortieAnticipee"
    ADD CONSTRAINT "SortieAnticipee_autorisationSortieId_fkey" FOREIGN KEY ("autorisationSortieId") REFERENCES public."AutorisationSortie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SortieAnticipee SortieAnticipee_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SortieAnticipee"
    ADD CONSTRAINT "SortieAnticipee_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SortieAnticipee SortieAnticipee_valideParId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SortieAnticipee"
    ADD CONSTRAINT "SortieAnticipee_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Stage Stage_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Stage"
    ADD CONSTRAINT "Stage_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Stage Stage_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Stage"
    ADD CONSTRAINT "Stage_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockArticle StockArticle_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticle"
    ADD CONSTRAINT "StockArticle_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockageFichier StockageFichier_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockageFichier"
    ADD CONSTRAINT "StockageFichier_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SuiviSignalement SuiviSignalement_signalementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SuiviSignalement"
    ADD CONSTRAINT "SuiviSignalement_signalementId_fkey" FOREIGN KEY ("signalementId") REFERENCES public."SignalementMineur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TemplateDocument TemplateDocument_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemplateDocument"
    ADD CONSTRAINT "TemplateDocument_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TentativeConnexion TentativeConnexion_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TentativeConnexion"
    ADD CONSTRAINT "TentativeConnexion_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TestAdmission TestAdmission_candidatureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestAdmission"
    ADD CONSTRAINT "TestAdmission_candidatureId_fkey" FOREIGN KEY ("candidatureId") REFERENCES public."CandidatureAdmission"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ThemeEcole ThemeEcole_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ThemeEcole"
    ADD CONSTRAINT "ThemeEcole_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TicketMessage TicketMessage_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TicketStatutHistorique TicketStatutHistorique_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TicketStatutHistorique"
    ADD CONSTRAINT "TicketStatutHistorique_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ticket Ticket_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TransportArret TransportArret_ligneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportArret"
    ADD CONSTRAINT "TransportArret_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES public."TransportLigne"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TransportInscription TransportInscription_classeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportInscription"
    ADD CONSTRAINT "TransportInscription_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES public."Classe"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TransportInscription TransportInscription_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportInscription"
    ADD CONSTRAINT "TransportInscription_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TransportInscription TransportInscription_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportInscription"
    ADD CONSTRAINT "TransportInscription_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TransportInscription TransportInscription_ligneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportInscription"
    ADD CONSTRAINT "TransportInscription_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES public."TransportLigne"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TransportLigne TransportLigne_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportLigne"
    ADD CONSTRAINT "TransportLigne_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TwoFactorBackupCode TwoFactorBackupCode_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TwoFactorBackupCode"
    ADD CONSTRAINT "TwoFactorBackupCode_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TwoFactorMethod TwoFactorMethod_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TwoFactorMethod"
    ADD CONSTRAINT "TwoFactorMethod_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UtilisateurEcole UtilisateurEcole_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UtilisateurEcole"
    ADD CONSTRAINT "UtilisateurEcole_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UtilisateurEcole UtilisateurEcole_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UtilisateurEcole"
    ADD CONSTRAINT "UtilisateurEcole_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UtilisateurRole UtilisateurRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UtilisateurRole"
    ADD CONSTRAINT "UtilisateurRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UtilisateurRole UtilisateurRole_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UtilisateurRole"
    ADD CONSTRAINT "UtilisateurRole_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Utilisateur Utilisateur_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Utilisateur"
    ADD CONSTRAINT "Utilisateur_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Vaccination Vaccination_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vaccination"
    ADD CONSTRAINT "Vaccination_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vaccination Vaccination_eleveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vaccination"
    ADD CONSTRAINT "Vaccination_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES public."Eleve"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vaccination Vaccination_ficheSanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vaccination"
    ADD CONSTRAINT "Vaccination_ficheSanteId_fkey" FOREIGN KEY ("ficheSanteId") REFERENCES public."FicheSante"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VariablePaie VariablePaie_bulletinPaieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VariablePaie"
    ADD CONSTRAINT "VariablePaie_bulletinPaieId_fkey" FOREIGN KEY ("bulletinPaieId") REFERENCES public."BulletinPaie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VariablePaie VariablePaie_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VariablePaie"
    ADD CONSTRAINT "VariablePaie_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VariablePaie VariablePaie_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VariablePaie"
    ADD CONSTRAINT "VariablePaie_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VerificationAntecedents VerificationAntecedents_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VerificationAntecedents"
    ADD CONSTRAINT "VerificationAntecedents_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VerificationAntecedents VerificationAntecedents_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VerificationAntecedents"
    ADD CONSTRAINT "VerificationAntecedents_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public."Personnel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Visiteur Visiteur_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Visiteur"
    ADD CONSTRAINT "Visiteur_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VoteConseil VoteConseil_deliberationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VoteConseil"
    ADD CONSTRAINT "VoteConseil_deliberationId_fkey" FOREIGN KEY ("deliberationId") REFERENCES public."DeliberationConseil"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VoteConseil VoteConseil_membreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VoteConseil"
    ADD CONSTRAINT "VoteConseil_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES public."MembreConseil"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WebhookDelivery WebhookDelivery_webhookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WebhookDelivery"
    ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES public."WebhookSortant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WebhookSortant WebhookSortant_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WebhookSortant"
    ADD CONSTRAINT "WebhookSortant_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _EcoleToPermission _EcoleToPermission_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_EcoleToPermission"
    ADD CONSTRAINT "_EcoleToPermission_A_fkey" FOREIGN KEY ("A") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _EcoleToPermission _EcoleToPermission_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_EcoleToPermission"
    ADD CONSTRAINT "_EcoleToPermission_B_fkey" FOREIGN KEY ("B") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict swIQyyhvmo7Wq2j5ndWNKtlndUoNvPeGpvLUosYuK5oHN2jLOLdNTnJ6qmslnzz

