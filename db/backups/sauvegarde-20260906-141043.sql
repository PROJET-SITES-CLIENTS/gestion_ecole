--
-- PostgreSQL database dump
--

\restrict 9Uw2dauiJXcyvJRm3UZqNl1l3j7LjcoVTRlhSRnlKicAS60BIRiG2Ym5O8TgyYl

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
-- Name: DemandeCompte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DemandeCompte" (
    id text NOT NULL,
    "ecoleId" text NOT NULL,
    "utilisateurId" text NOT NULL,
    type text NOT NULL,
    "roleDemande" text,
    motivation text,
    statut text DEFAULT 'en_attente'::text NOT NULL,
    "dateDemande" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateDecision" timestamp(3) without time zone,
    "traiteParId" text,
    "motifRefus" text,
    "sourceIp" text
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
cmtmh27jm0006uhmcwu6s7rxd	cmtmh278b0004uhmc9ijeasvj	cmtmh26qr0001uhmcd4zri6kz	2026-08-01 00:00:00	\N	actif	mensuel	2026-09-04 04:46:50.291	2026-09-04 04:46:50.291
\.


--
-- Data for Name: Activite; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Activite" (id, "ecoleId", type, titre, description, destination, "dateDebut", "dateFin", cout, devise, capacite, statut, "creeParId") FROM stdin;
cmtmh6wvi00mquhmce5o6vlzq	cmtmh278b0004uhmc9ijeasvj	sortie	Sortie pédagogique au Lac Rose	Journée découverte —lac de Retba, sel et écologie	Lac Rose, Retba	2026-09-25 04:50:29.741	2026-09-25 04:50:29.741	350000	XOF	30	planifiee	cmtmh2b61000tuhmcb913gwgr
cmtmh6ykh00myuhmc5o86092a	cmtmh278b0004uhmc9ijeasvj	voyage	Voyage culturel — Sine-Saloum	\N	Toubacouta	2027-04-10 00:00:00	2027-04-13 00:00:00	1250000	XOF	20	planifiee	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: ActiviteParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActiviteParticipant" (id, "activiteId", "eleveId", statut, autorisation, "dateAutorisation", "paiementStatut") FROM stdin;
cmtmh6xxz00msuhmcux4lwyqo	cmtmh6wvi00mquhmce5o6vlzq	cmtmh2wzr004buhmc9crpu0t6	confirme	accordee	2026-09-04 04:50:30.831	a_payer
cmtmh6y9800muuhmc5tfgw8uf	cmtmh6wvi00mquhmce5o6vlzq	cmtmh2xm3004fuhmcgntcpsvf	inscrit	en_attente	\N	a_payer
cmtmh6yev00mwuhmcvyiokhxa	cmtmh6wvi00mquhmce5o6vlzq	cmtmh2xxf004juhmcwe9ylhvx	inscrit	en_attente	\N	non_exigible
cmtmh6yvp00n0uhmcbbn96afc	cmtmh6ykh00myuhmc5o86092a	cmtmh2yvu004vuhmcp3m1bkwz	inscrit	en_attente	\N	a_payer
\.


--
-- Data for Name: Amenagement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Amenagement" (id, "eleveId", "besoinSpecifiqueId", "typeAmenagement", description, "dateDebut", "dateFin", "valideParId") FROM stdin;
cmtmh3lra009guhmc8y5v8oi6	cmtmh2xxf004juhmcwe9ylhvx	cmtmh3lg4009euhmc4kb2av7z	tiers_temps	Tiers-temps sur compositions (+30 min sur 2h)	2026-09-01 00:00:00	\N	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: AnneeScolaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnneeScolaire" (id, "ecoleId", libelle, "dateDebut", "dateFin", active) FROM stdin;
cmtmh2bh9000vuhmcm08pmhfh	cmtmh278b0004uhmc9ijeasvj	2026-2027	2026-09-01 00:00:00	2027-07-15 00:00:00	t
cmtmh6qpq00lmuhmcrn6gnyv4	cmtmh6qdx00lkuhmchendtvn1	2026-2027	2026-09-01 00:00:00	2027-07-15 00:00:00	t
cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	2026-2027	2026-09-01 00:00:00	2027-07-31 00:00:00	t
cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	2026-2027	2026-09-01 00:00:00	2027-07-31 00:00:00	t
\.


--
-- Data for Name: Annonce; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Annonce" (id, "ecoleId", titre, contenu, "auteurId", "datePublication", "dateExpiration", statut, cible, "cibleIds", pinned, "pieceJointeUrl") FROM stdin;
cmtmh50qh00g5uhmcydetgyo6	cmtmh278b0004uhmc9ijeasvj	Rentrée scolaire 2026-2027	Chères familles, la rentrée est fixée au lundi 1er septembre à 8h. Réunion parents-profs le 5 septembre à 17h.	cmtmh2b61000tuhmcb913gwgr	2026-08-20 00:00:00	\N	publie	toute_ecole	\N	t	\N
\.


--
-- Data for Name: AnnonceLecture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnnonceLecture" (id, "annonceId", "utilisateurId", "dateLecture") FROM stdin;
cmtmh511n00g7uhmcbpo2e7y7	cmtmh50qh00g5uhmcydetgyo6	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:49:01.833
\.


--
-- Data for Name: ApiToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiToken" (id, "ecoleId", nom, description, "tokenHash", prefix, scopes, "tauxLimiteHoraire", actif, "dateCreation", "dateExpiration", "dernierUsage", "totalRequettes") FROM stdin;
cmtmh56f500gxuhmcp2pub9i7	cmtmh278b0004uhmc9ijeasvj	Intégration SIRH externe	Token pour synchronisation avec le SIRH régional	hash-api-token-1	sk_live_abcd	["eleves:read","classes:read"]	500	t	2026-09-04 04:49:08.801	\N	2026-09-04 04:49:08.799	42
\.


--
-- Data for Name: ApiTokenLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiTokenLog" (id, "apiTokenId", endpoint, methode, statut, "tempsReponse", "adresseIp", date) FROM stdin;
3	cmtmh56f500gxuhmcp2pub9i7	/api/v1/eleves	GET	200	142	10.0.0.1	2026-09-04 04:49:09.205
\.


--
-- Data for Name: AttributionManuel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttributionManuel" (id, "manuelScolaireId", "eleveId", "dateAttribution", "dateRestitutionPrevue", "etatRemise", "etatRetour", statut, "echeanceFraisGenereeId") FROM stdin;
cmtmh3ooy00a4uhmcp3gzg6yt	cmtmh3ods00a2uhmcpua1xmca	cmtmh2wzr004buhmc9crpu0t6	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmh3p0700a6uhmchp79tauv	cmtmh3ods00a2uhmcpua1xmca	cmtmh2xm3004fuhmcgntcpsvf	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmh3phr00a8uhmcmcustvzm	cmtmh3ods00a2uhmcpua1xmca	cmtmh2xxf004juhmcwe9ylhvx	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmh3po700aauhmc3qjif1jp	cmtmh3ods00a2uhmcpua1xmca	cmtmh2y8r004nuhmcunq3tc6y	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmh3ptt00acuhmcc5bvy845	cmtmh3ods00a2uhmcpua1xmca	cmtmh2yk1004ruhmcb5bdx13g	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "ecoleId", "utilisateurId", action, "cibleType", "cibleId", details, "adresseIp", "userAgent", "dateAction") FROM stdin;
298	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpu2ea40001uhdwe69t1qya","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:14:22.787
299	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpu2ea40001uhdwe69t1qya","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:14:28.977
156	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtoi26un0001uh0o1dw99qkw","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-05 14:50:34.839
157	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtoi26un0001uh0o1dw99qkw","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-05 14:50:38.725
302	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-06 13:15:17.118
303	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtpu430q000luhdwmjnr9a9s	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-06 13:15:34.535
160	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-05 14:51:02.715
161	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtoi4of3000luh0ozdkwxrwv	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-05 14:52:40.003
164	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtoi5jgj000ruh0owmkpq037	{"sortieId":"cmtoi67aj000zuh0opjtgkd0a","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":1}	\N	\N	2026-09-05 14:53:32.842
165	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.changement_statut	bulletin	cmtmh6gej00k9uhmc3mmg4763	{"statut":"en_attente_direction","precedent":"valide_pp","eleveId":"cmtmh2xm3004fuhmcgntcpsvf","role":"direction"}	\N	\N	2026-09-05 14:54:42.848
166	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtoidxh90001uhsod78ecd7a","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-05 14:59:47.165
167	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtoidxh90001uhsod78ecd7a","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-05 14:59:51.717
170	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-05 15:00:26.097
171	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtoifi5p000juhso3go5inoz	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-05 15:00:45.849
124	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	\N	{"montantCentimes":10000000,"eleveId":"cmtmh2wzr004buhmc9crpu0t6"}	\N	\N	2026-09-04 04:48:21.694
125	cmtmh278b0004uhmc9ijeasvj	cmtmh2k4c002juhmcu8bjec0z	note.saisie	evaluation	\N	{"evaluationId":"cmtmh399u0071uhmcodn3izqo","classeId":"cmtmh2io40027uhmco5514if6"}	\N	\N	2026-09-04 04:48:21.694
126	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.inscription	eleve	\N	{"eleveId":"cmtmh2yk1004ruhmcb5bdx13g","classeId":"cmtmh2io40027uhmco5514if6"}	\N	\N	2026-09-04 04:48:21.694
127	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	support.connexion_en_tant_que	ecole	\N	{"motif":"Vérification paramètres"}	\N	\N	2026-09-04 04:48:21.694
129	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	cantine.pointage	cantine_presence	\N	{"jour":"2026-09-04","présents":1,"alertes":1}	\N	\N	2026-09-04 04:52:17.719
130	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	transport.feuille_creation	feuille_route	cmtmh9a87000buhdkiiyyba0g	{"ligneId":"cmtmh98nt0007uhdk27vel7vn","arrêts":1}	\N	\N	2026-09-04 04:52:22.387
131	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paie.variable_ajoutee	variable_paie	cmtmh9j0e000juhdkj1lk4rue	{"personnelId":"cmtmh2k9y002luhmcsd3wk406","periode":"2026-09"}	\N	\N	2026-09-04 04:52:32.151
133	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	activite.inscriptions	activite	cmtmh9ji2000luhdkilkdibv9	{"inscrits":2}	\N	\N	2026-09-04 04:52:36.439
134	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	activite.facturation	activite	cmtmh9ji2000luhdkilkdibv9	{"échéances":2}	\N	\N	2026-09-04 04:52:43.949
135	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	activite.facturation	activite	cmtmh9ji2000luhdkilkdibv9	{"échéances":0}	\N	\N	2026-09-04 04:52:46.225
136	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	garderie.facturation	frais	cmtmh9yes0011uhdkolms1pvs	{"periode":"2026-09","échéances":1,"totalMinutes":90}	\N	\N	2026-09-04 04:52:53.33
137	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	referentiel.matiere_creation	matiere	cmtmha0rp0015uhdky8z70v88	{"code":"V3X","libelle":"Matière import test"}	\N	\N	2026-09-04 04:52:55.172
140	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleves.import_csv	\N	\N	{"créés":2,"ignorés":0,"erreurs":[{"ligne":4,"erreur":"Le sexe doit être M ou F."}]}	\N	\N	2026-09-04 04:53:04.118
141	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	edt.creneau_creation	emploi_temps	cmtmha9kh001nuhdkcn3utlk1	{"jour":"samedi","heureDebut":"14:00","heureFin":"16:00","classeId":"cmtmh2io40027uhmco5514if6"}	\N	\N	2026-09-04 04:53:06.571
142	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	finances.remises_familles	\N	\N	{"remises":4,"totalRemis":830000,"pourcentage":10}	\N	\N	2026-09-04 04:53:15.072
143	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	compta.rapprochement_auto	\N	\N	{"matches":3,"restantes":1}	\N	\N	2026-09-04 04:53:22.859
145	cmtnebu1g0000l704ty18jg4n	cmtnebv44002tl7040aggzb7i	ecole.initialisation	ecole	cmtnebu1g0000l704ty18jg4n	{"nom":"Écoles Martis","slug":"ecoles-martis","admin":"lycagbessi@gmail.com"}	\N	\N	2026-09-04 20:18:08.204
150	cmtnfcyel0000kw045oa97bhl	cmtnfczfg002tkw04zz9x7xld	ecole.initialisation	ecole	cmtnfcyel0000kw045oa97bhl	{"nom":"601","slug":"601","admin":"projetsites601@gmail.com"}	\N	\N	2026-09-04 20:47:00.042
174	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtoifsdi000puhso3v4dtbei	{"sortieId":"cmtoifzda000xuhsoqw2mqwvn","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":1}	\N	\N	2026-09-05 15:01:08.406
175	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.changement_statut	bulletin	cmtmh6gej00k9uhmc3mmg4763	{"statut":"en_attente_direction","precedent":"valide_pp","eleveId":"cmtmh2xm3004fuhmcgntcpsvf","role":"direction"}	\N	\N	2026-09-05 15:01:49.352
176	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtougx2b0001uhcwhn2fhbmv","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-05 20:38:00.702
177	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtougx2b0001uhcwhn2fhbmv","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-05 20:38:03.33
306	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtmh2xm3004fuhmcgntcpsvf	{"sortieId":"cmtpu4fzy000zuhdw4akx1czw","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:15:51.895
336	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtpuep4f000juh2812gu9sr5	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-06 13:23:49.622
180	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-05 20:38:26.617
181	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtoui898000juhcwk20ro6wp	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-05 20:38:47.829
184	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtouihrc000puhcw035j71zy	{"sortieId":"cmtouimch000xuhcwrulc3gua","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":1}	\N	\N	2026-09-05 20:39:06.41
185	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtps7fbg0011uhcwwxzudor1","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 12:22:14.232
186	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtps7fbg0011uhcwwxzudor1","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 12:22:19.117
339	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtpuew9i000puh28aph741mr	{"sortieId":"cmtpuf1xh000xuh28at5yehw7","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":1}	\N	\N	2026-09-06 13:24:05.508
360	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpuic17008suh28rf0hm5ro	{"montantCentimes":100000,"eleveId":"cmtmh2yk1004ruhmcb5bdx13g","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPUIBDX-CE065C"}	\N	\N	2026-09-06 13:26:36.769
189	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-06 12:22:33.942
190	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtps88a0001juhcwp1bldl7j	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-06 12:22:47.371
362	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":1}	\N	\N	2026-09-06 13:26:41.535
363	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":0}	\N	\N	2026-09-06 13:26:43.178
197	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpt190z0001uhrost67e91h","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 12:45:33.676
198	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpt190z0001uhrost67e91h","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 12:45:37.188
368	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-06 13:30:20.117
369	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtpundbx000juh9g6eho3voh	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-06 13:30:33.366
241	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtmh2zy20057uhmccluf8ocy	{"sortieId":"cmtptgh75000zuhp8rxxc8gq1","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":2}	\N	\N	2026-09-06 12:57:16.32
242	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.changement_statut	bulletin	cmtmh6gej00k9uhmc3mmg4763	{"statut":"en_attente_direction","precedent":"valide_pp","eleveId":"cmtmh2xm3004fuhmcgntcpsvf","role":"direction"}	\N	\N	2026-09-06 12:57:40.401
201	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-06 12:46:04.037
202	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtpt2iob000juhroxmznzp2y	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-06 12:46:21.414
205	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtpt2r4q000puhrowbtmaq8l	{"sortieId":"cmtpt2y11000xuhro8cg02wjb","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":1}	\N	\N	2026-09-06 12:46:42.531
206	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.changement_statut	bulletin	cmtmh6gej00k9uhmc3mmg4763	{"statut":"en_attente_direction","precedent":"valide_pp","eleveId":"cmtmh2xm3004fuhmcgntcpsvf","role":"direction"}	\N	\N	2026-09-06 12:47:05.179
307	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.changement_statut	bulletin	cmtmh6gej00k9uhmc3mmg4763	{"statut":"en_attente_direction","precedent":"valide_pp","eleveId":"cmtmh2xm3004fuhmcgntcpsvf","role":"direction"}	\N	\N	2026-09-06 13:16:52.833
214	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	annee.cloture_transition	annee_scolaire	cmtpt6pek0072uhroa0r7ehud	{"ancienne":"2026-2027","nouvelle":"2027-2028","eleves":14,"promus":8,"redoublants":0,"diplomes":0,"sansClasse":6,"classesCreees":3}	\N	\N	2026-09-06 12:49:55.95
215	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtpt7w96007yuhro3548e9i4	{"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":1,"moyenneGenerale":14.5,"mention":"Bien","rang":1}	\N	\N	2026-09-06 12:50:32.58
216	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtpt83qm0080uhro6wcnbcnk	{"eleveId":"cmtmh2yk1004ruhmcb5bdx13g","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":1,"moyenneGenerale":13.5,"mention":"Assez bien","rang":3}	\N	\N	2026-09-06 12:50:41.269
218	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpt8buj0088uhro5c6dwc1r	{"sanctionId":"cmtpt8d6c008auhrouu7g3uda","notificationsEnvoyees":1}	\N	\N	2026-09-06 12:51:03.321
219	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.rattachement_parent	eleve	cmtpt88xw0084uhrovtv1ecem	{"parentId":"cmtmh32c5005puhmczpgn7nma"}	\N	\N	2026-09-06 12:51:05.982
220	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpt8buj0088uhro5c6dwc1r	{"sanctionId":"cmtpt8p1e008euhrotl25v4nb","notificationsEnvoyees":2}	\N	\N	2026-09-06 12:51:09.394
221	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	rdv.creneau_ouvert	creneau_rdv	cmtpt8xf7008kuhromlo8vdla	{}	\N	\N	2026-09-06 12:51:18.104
222	cmtmh278b0004uhmc9ijeasvj	cmtmh36rd006juhmct94pka6o	rdv.reservation	rdv	cmtpt8zcq008muhroyl27cf4y	{"creneauId":"cmtpt8xf7008kuhromlo8vdla","parentId":"cmtmh36wz006luhmcbhmy92f9"}	\N	\N	2026-09-06 12:51:21.249
223	cmtmh278b0004uhmc9ijeasvj	cmtmh36rd006juhmct94pka6o	rdv.annulation	rdv	cmtpt8zcq008muhroyl27cf4y	\N	\N	\N	2026-09-06 12:51:25.245
224	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpt960e008suhropp0txz0x	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPT95DI-7B6AE5"}	\N	\N	2026-09-06 12:51:29.433
226	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpt9c0r008uuhroxfqjrle1	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPT9B0W-0DA413"}	\N	\N	2026-09-06 12:51:37.271
315	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	annee.cloture_transition	annee_scolaire	cmtpu81is0076uhdweoi2q1m7	{"ancienne":"2026-2027","nouvelle":"2027-2028","eleves":14,"promus":8,"redoublants":0,"diplomes":0,"sansClasse":6,"classesCreees":3}	\N	\N	2026-09-06 13:18:45.846
228	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpt9gdt008wuhroi5gm7b30	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPT9FCL-3898FE"}	\N	\N	2026-09-06 12:51:43.434
230	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":1}	\N	\N	2026-09-06 12:52:02.897
231	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":0}	\N	\N	2026-09-06 12:52:06.517
232	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtptc8ad0001uhp8cew4x9qg","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 12:54:02.483
233	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtptc8ad0001uhp8cew4x9qg","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 12:54:06.199
317	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpu8lga0088uhdwfo4hn22m	{"sanctionId":"cmtpu8mf8008auhdwy184slzn","notificationsEnvoyees":1}	\N	\N	2026-09-06 13:19:04.992
318	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.rattachement_parent	eleve	cmtpu8kat0084uhdwaau6wi3y	{"parentId":"cmtmh32c5005puhmczpgn7nma"}	\N	\N	2026-09-06 13:19:07.113
236	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-06 12:54:40.023
237	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtptdoyx000juhp88t7yfd5d	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-06 12:55:03.701
238	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtptfulp000luhp8ly1767j2	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":3,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-06 12:56:45.603
319	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpu8lga0088uhdwfo4hn22m	{"sanctionId":"cmtpu8q7s008euhdwb38hgxj4","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:19:10.074
320	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	rdv.creneau_ouvert	creneau_rdv	cmtpu8whd008kuhdwozky9bwa	{}	\N	\N	2026-09-06 13:19:16.513
321	cmtmh278b0004uhmc9ijeasvj	cmtmh32zr005ruhmcp0ryu7dc	rdv.reservation	rdv	cmtpu8yfy008muhdwlo13sesz	{"creneauId":"cmtpu8whd008kuhdwozky9bwa","parentId":"cmtmh335d005tuhmcag91xin0"}	\N	\N	2026-09-06 13:19:20.367
250	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	annee.cloture_transition	annee_scolaire	cmtptjeo80076uhp8kyvxf30k	{"ancienne":"2026-2027","nouvelle":"2027-2028","eleves":14,"promus":8,"redoublants":0,"diplomes":0,"sansClasse":6,"classesCreees":3}	\N	\N	2026-09-06 12:59:36.605
322	cmtmh278b0004uhmc9ijeasvj	cmtmh32zr005ruhmcp0ryu7dc	rdv.annulation	rdv	cmtpu8yfy008muhdwlo13sesz	\N	\N	\N	2026-09-06 13:19:24.252
252	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtptk0dm0088uhp8n4gdjdms	{"sanctionId":"cmtptk1t8008auhp8o0kgr6du","notificationsEnvoyees":1}	\N	\N	2026-09-06 13:00:01.438
253	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.rattachement_parent	eleve	cmtptjz320084uhp8v8us0os6	{"parentId":"cmtmh32c5005puhmczpgn7nma"}	\N	\N	2026-09-06 13:00:03.923
254	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtptk0dm0088uhp8n4gdjdms	{"sanctionId":"cmtptk84f008euhp8pll2un24","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:00:07.125
255	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	rdv.creneau_ouvert	creneau_rdv	cmtptkiy6008kuhp8a5zf08ve	{}	\N	\N	2026-09-06 13:00:19.215
256	cmtmh278b0004uhmc9ijeasvj	cmtmh326g005nuhmchxupt7s4	rdv.reservation	rdv	cmtptkksw008muhp89tahy63j	{"creneauId":"cmtptkiy6008kuhp8a5zf08ve","parentId":"cmtmh32c5005puhmczpgn7nma"}	\N	\N	2026-09-06 13:00:22.242
257	cmtmh278b0004uhmc9ijeasvj	cmtmh326g005nuhmchxupt7s4	rdv.annulation	rdv	cmtptkksw008muhp89tahy63j	\N	\N	\N	2026-09-06 13:00:26.02
258	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtptkrg2008suhp8ofrjwewq	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPTKQRH-057C80"}	\N	\N	2026-09-06 13:00:30.457
323	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpu95j4008suhdwcj8xipor	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPU94VH-6F0794"}	\N	\N	2026-09-06 13:19:28.443
260	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtptkvlq008uuhp8kidz7yzs	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPTKUG8-DDA315"}	\N	\N	2026-09-06 13:00:35.814
262	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtptl2w8008wuhp80c1jjih1	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPTKYII-142AF4"}	\N	\N	2026-09-06 13:00:45.881
325	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpu98sm008uuhdwi4uidtcd	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPU9854-F46D2D"}	\N	\N	2026-09-06 13:19:32.702
264	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":1}	\N	\N	2026-09-06 13:00:55.38
265	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtptrn1y0001uhasz917qine","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:06:00.287
266	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtptrn1y0001uhasz917qine","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:06:03.361
327	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpu9bxb008wuhdwqecnrcvk	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPU9B9S-A095D5"}	\N	\N	2026-09-06 13:19:36.731
269	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-06 13:06:19.276
270	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtptsibt000juhasw6hxgilt	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-06 13:06:33.842
329	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":1}	\N	\N	2026-09-06 13:19:41.847
273	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtmh2wzr004buhmc9crpu0t6	{"sortieId":"cmtptsu8c000xuhasvqz4vpum","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:06:51.731
274	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.changement_statut	bulletin	cmtmh6gej00k9uhmc3mmg4763	{"statut":"en_attente_direction","precedent":"valide_pp","eleveId":"cmtmh2xm3004fuhmcgntcpsvf","role":"direction"}	\N	\N	2026-09-06 13:07:12.822
330	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":0}	\N	\N	2026-09-06 13:19:43.554
356	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpui5ua008ouh28v4i2gykn	{"montantCentimes":100000,"eleveId":"cmtmh2yk1004ruhmcb5bdx13g","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPUI57F-86FB0D"}	\N	\N	2026-09-06 13:26:28.725
358	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpui8v0008quh28zfe2vnbp	{"montantCentimes":100000,"eleveId":"cmtmh2yk1004ruhmcb5bdx13g","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPUI88B-B78F7E"}	\N	\N	2026-09-06 13:26:32.637
364	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpumj300001uh9g0ksok1sp","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:29:58.659
365	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpumj300001uh9g0ksok1sp","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:30:05.207
331	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpudy1e0001uh280w6ymvsi","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:23:17.546
332	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpudy1e0001uh280w6ymvsi","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:23:20.027
282	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	annee.cloture_transition	annee_scolaire	cmtptvidq0074uhasmkl3amfq	{"ancienne":"2026-2027","nouvelle":"2027-2028","eleves":14,"promus":8,"redoublants":0,"diplomes":0,"sansClasse":6,"classesCreees":3}	\N	\N	2026-09-06 13:09:02.233
284	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtptw2iu0086uhas01y9x4av	{"sanctionId":"cmtptw3hp0088uhasrxe5kw0r","notificationsEnvoyees":1}	\N	\N	2026-09-06 13:09:20.533
285	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.rattachement_parent	eleve	cmtptw1130082uhas5em43w7y	{"parentId":"cmtmh32c5005puhmczpgn7nma"}	\N	\N	2026-09-06 13:09:22.612
286	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtptw2iu0086uhas01y9x4av	{"sanctionId":"cmtptw77m008cuhash4bro45l","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:09:26.433
287	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	rdv.creneau_ouvert	creneau_rdv	cmtptwehu008iuhasvikhxzby	{}	\N	\N	2026-09-06 13:09:33.309
288	cmtmh278b0004uhmc9ijeasvj	cmtmh32zr005ruhmcp0ryu7dc	rdv.reservation	rdv	cmtptwgpy008kuhashtlinver	{"creneauId":"cmtptwehu008iuhasvikhxzby","parentId":"cmtmh335d005tuhmcag91xin0"}	\N	\N	2026-09-06 13:09:37.73
289	cmtmh278b0004uhmc9ijeasvj	cmtmh32zr005ruhmcp0ryu7dc	rdv.annulation	rdv	cmtptwgpy008kuhashtlinver	\N	\N	\N	2026-09-06 13:09:47.187
290	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtptwtf8008quhashbgeab9b	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPTWSJO-4307DE"}	\N	\N	2026-09-06 13:09:53.103
292	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtptwxl3008suhasv0hbecvf	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPTWWXP-77BACE"}	\N	\N	2026-09-06 13:09:58.256
335	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-06 13:23:34.472
294	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtptx446008uuhasb764ygr9	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPTX0OJ-E1B71A"}	\N	\N	2026-09-06 13:10:06.719
340	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.changement_statut	bulletin	cmtmh6gej00k9uhmc3mmg4763	{"statut":"en_attente_direction","precedent":"valide_pp","eleveId":"cmtmh2xm3004fuhmcgntcpsvf","role":"direction"}	\N	\N	2026-09-06 13:24:22.372
296	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":0}	\N	\N	2026-09-06 13:10:33.026
297	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":0}	\N	\N	2026-09-06 13:10:36.549
348	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	annee.cloture_transition	annee_scolaire	cmtpuh5r80072uh288jstr4k7	{"ancienne":"2026-2027","nouvelle":"2027-2028","eleves":14,"promus":8,"redoublants":0,"diplomes":0,"sansClasse":6,"classesCreees":3}	\N	\N	2026-09-06 13:25:50.807
350	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpuhnfs0084uh28ykinis3c	{"sanctionId":"cmtpuhoej0086uh28zsmjfpec","notificationsEnvoyees":1}	\N	\N	2026-09-06 13:26:07.385
351	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.rattachement_parent	eleve	cmtpuhmbr0080uh28loyt7x9a	{"parentId":"cmtmh32c5005puhmczpgn7nma"}	\N	\N	2026-09-06 13:26:09.457
352	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpuhnfs0084uh28ykinis3c	{"sanctionId":"cmtpuhs2x008auh28ckztjxm2","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:26:12.327
353	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	rdv.creneau_ouvert	creneau_rdv	cmtpuhxph008guh28c9odkt3v	{}	\N	\N	2026-09-06 13:26:17.984
354	cmtmh278b0004uhmc9ijeasvj	cmtmh37rw006ruhmcg2j4d06k	rdv.reservation	rdv	cmtpuhzln008iuh28acwhivbk	{"creneauId":"cmtpuhxph008guh28c9odkt3v","parentId":"cmtmh37xj006tuhmcv6cfe14w"}	\N	\N	2026-09-06 13:26:21.062
355	cmtmh278b0004uhmc9ijeasvj	cmtmh37rw006ruhmcg2j4d06k	rdv.annulation	rdv	cmtpuhzln008iuh28acwhivbk	\N	\N	\N	2026-09-06 13:26:24.809
435	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paie.generation	bulletin_paie	\N	{"periode":"2030-01","bulletins":13,"sautes":0}	\N	\N	2026-09-06 13:57:35.276
436	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paie.generation	bulletin_paie	\N	{"periode":"2030-01","bulletins":0,"sautes":13}	\N	\N	2026-09-06 13:57:43.787
437	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paie.valide	bulletin_paie	cmtpvlpu80006uhi4drk9i0uk	\N	\N	\N	2026-09-06 13:57:45.979
438	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paie.paye	bulletin_paie	cmtpvlpu80006uhi4drk9i0uk	\N	\N	\N	2026-09-06 13:57:46.811
439	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	compta.ecriture_creation	ecriture_comptable	cmtpvmhix0032uhi4th6hqkjc	{"numero":"OD-MTPVMHIN","total":100000}	\N	\N	2026-09-06 13:57:51.6
440	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	compta.ecriture_validation	ecriture_comptable	cmtpvmhix0032uhi4th6hqkjc	\N	\N	\N	2026-09-06 13:57:54.081
441	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	compta.generation_auto	ecriture_comptable	\N	{"créées":6}	\N	\N	2026-09-06 13:58:04.508
442	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	compta.generation_auto	ecriture_comptable	\N	{"créées":0}	\N	\N	2026-09-06 13:58:06.791
444	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	admission.etape	candidature_admission	cmtpvmxdc0041uhi401k5zhna	{"statut":"admis"}	\N	\N	2026-09-06 13:58:12.449
446	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.rattachement_parent	eleve	cmtpvn2n60049uhi4taz4wvr1	{"parentId":"cmtpvn5cl004fuhi4nalm8g91"}	\N	\N	2026-09-06 13:58:21.233
432	cmtmh278b0004uhmc9ijeasvj	\N	compte.changement_mot_de_passe	utilisateur	cmtpvlfid0002uhi45lmpy219	\N	\N	\N	2026-09-06 13:57:05.317
433	cmtmh278b0004uhmc9ijeasvj	\N	compte.demande_reinitialisation	utilisateur	cmtpvlfid0002uhi45lmpy219	\N	\N	\N	2026-09-06 13:57:07.235
434	\N	\N	compte.reinitialisation_mot_de_passe	utilisateur	cmtpvlfid0002uhi45lmpy219	\N	\N	\N	2026-09-06 13:57:10.199
372	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtmh31i6005fuhmczi53pjoe	{"sortieId":"cmtpunnbz000xuh9g2l63lsyo","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:30:47.135
373	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.changement_statut	bulletin	cmtmh6gej00k9uhmc3mmg4763	{"statut":"en_attente_direction","precedent":"valide_pp","eleveId":"cmtmh2xm3004fuhmcgntcpsvf","role":"direction"}	\N	\N	2026-09-06 13:31:02.806
381	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	annee.cloture_transition	annee_scolaire	cmtpuq4fb0074uh9gn9eypc8m	{"ancienne":"2026-2027","nouvelle":"2027-2028","eleves":14,"promus":8,"redoublants":0,"diplomes":0,"sansClasse":6,"classesCreees":3}	\N	\N	2026-09-06 13:32:51.048
383	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpuqosh0086uh9gskpoln2l	{"sanctionId":"cmtpuqpt20088uh9gk1ifct28","notificationsEnvoyees":1}	\N	\N	2026-09-06 13:33:09.472
384	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.rattachement_parent	eleve	cmtpuqn910082uh9gbhukhlat	{"parentId":"cmtmh32c5005puhmczpgn7nma"}	\N	\N	2026-09-06 13:33:11.948
385	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpuqosh0086uh9gskpoln2l	{"sanctionId":"cmtpuqukh008cuh9glawopot8","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:33:17.897
386	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	rdv.creneau_ouvert	creneau_rdv	cmtpur37n008iuh9g4ddpdcbz	{}	\N	\N	2026-09-06 13:33:25.229
387	cmtmh278b0004uhmc9ijeasvj	cmtmh32zr005ruhmcp0ryu7dc	rdv.reservation	rdv	cmtpur5px008kuh9gp5w0ugqa	{"creneauId":"cmtpur37n008iuh9g4ddpdcbz","parentId":"cmtmh335d005tuhmcag91xin0"}	\N	\N	2026-09-06 13:33:28.987
388	cmtmh278b0004uhmc9ijeasvj	cmtmh32zr005ruhmcp0ryu7dc	rdv.annulation	rdv	cmtpur5px008kuh9gp5w0ugqa	\N	\N	\N	2026-09-06 13:33:32.938
389	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpurco7008quh9g69bvkg4p	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPURC00-0D87EF"}	\N	\N	2026-09-06 13:33:37.55
391	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpurg4i008suh9g0hte203w	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPURFGD-0E8010"}	\N	\N	2026-09-06 13:33:42.042
393	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpurjkf008uuh9g4tflge1r	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPURIVO-E64735"}	\N	\N	2026-09-06 13:33:46.553
395	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":1}	\N	\N	2026-09-06 13:33:52.211
396	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":0}	\N	\N	2026-09-06 13:33:55.263
397	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpv8fs40001uhvsablofvqo","eleves":5,"nouvelles":5,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:47:00.349
398	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	echeances.generation	classe	cmtmh2io40027uhmco5514if6	{"fraisId":"cmtpv8fs40001uhvsablofvqo","eleves":5,"nouvelles":0,"dateEcheance":"2026-10-05T00:00:00.000Z"}	\N	\N	2026-09-06 13:47:02.814
401	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	stock.mouvement	stock_article	cmtmh3pzg00aeuhmcoosjjddf	{"type":"entree","quantite":50,"stockApres":300}	\N	\N	2026-09-06 13:47:17.662
402	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtpv97hl000juhvs8flylei5	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":2,"moyenneGenerale":17,"mention":"Très bien","rang":1}	\N	\N	2026-09-06 13:47:32.208
467	cmtmh278b0004uhmc9ijeasvj	cmtpw02gf0002uhyo4bcb3sgp	compte.changement_mot_de_passe	utilisateur	cmtpw02gf0002uhyo4bcb3sgp	\N	\N	\N	2026-09-06 14:08:27.161
468	cmtmh278b0004uhmc9ijeasvj	cmtpw02gf0002uhyo4bcb3sgp	compte.demande_reinitialisation	utilisateur	cmtpw02gf0002uhyo4bcb3sgp	\N	\N	\N	2026-09-06 14:08:28.874
469	\N	cmtpw02gf0002uhyo4bcb3sgp	compte.reinitialisation_mot_de_passe	utilisateur	cmtpw02gf0002uhyo4bcb3sgp	\N	\N	\N	2026-09-06 14:08:31.224
470	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paie.generation	bulletin_paie	\N	{"periode":"2030-01","bulletins":0,"sautes":13}	\N	\N	2026-09-06 14:08:36.091
471	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paie.generation	bulletin_paie	\N	{"periode":"2030-01","bulletins":0,"sautes":13}	\N	\N	2026-09-06 14:08:40.465
472	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paie.valide	bulletin_paie	cmtpvlrhn000euhi4g8al6bnv	\N	\N	\N	2026-09-06 14:08:42.54
473	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paie.paye	bulletin_paie	cmtpvlrhn000euhi4g8al6bnv	\N	\N	\N	2026-09-06 14:08:43.367
474	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	compta.ecriture_creation	ecriture_comptable	cmtpw0jyd0006uhyo2010uzgq	{"numero":"OD-MTPW0JY7","total":100000}	\N	\N	2026-09-06 14:08:47.908
475	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	compta.ecriture_validation	ecriture_comptable	cmtpw0jyd0006uhyo2010uzgq	\N	\N	\N	2026-09-06 14:08:50.19
476	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	compta.generation_auto	ecriture_comptable	\N	{"créées":0}	\N	\N	2026-09-06 14:08:54.114
477	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	compta.generation_auto	ecriture_comptable	\N	{"créées":0}	\N	\N	2026-09-06 14:08:56.211
479	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	admission.etape	candidature_admission	cmtpw0uag000buhyoub1vdcef	{"statut":"admis"}	\N	\N	2026-09-06 14:09:01.573
481	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.rattachement_parent	eleve	cmtpw0z0h000juhyo4aabx63i	{"parentId":"cmtpw11k1000puhyo34qteowy"}	\N	\N	2026-09-06 14:09:09.506
405	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sortie_anticipee.enregistree	eleve	cmtmh2xm3004fuhmcgntcpsvf	{"sortieId":"cmtpv9j3y000xuhvsrea9lmbx","exceptionnelle":true,"motifException":"Urgence médicale confirmée","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:47:48.128
406	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.changement_statut	bulletin	cmtpv74uh0003uhlwooxeoj8u	{"statut":"en_attente_direction","precedent":"valide_pp","eleveId":"cmtmh2xm3004fuhmcgntcpsvf","role":"direction"}	\N	\N	2026-09-06 13:48:05.157
414	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	annee.cloture_transition	annee_scolaire	cmtpvck1z0074uhvsek5pr13y	{"ancienne":"2026-2027","nouvelle":"2027-2028","eleves":14,"promus":8,"redoublants":0,"diplomes":0,"sansClasse":6,"classesCreees":3}	\N	\N	2026-09-06 13:50:17.69
415	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtpvddm10080uhvseukqfiri	{"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":1,"moyenneGenerale":14.5,"mention":"Bien","rang":1}	\N	\N	2026-09-06 13:50:47.07
416	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	bulletin.generation	bulletin	cmtpvdjln0082uhvsfkemzx1j	{"eleveId":"cmtmh2yk1004ruhmcb5bdx13g","periodeId":"cmtmh2jgb002duhmcys0dqtnx","version":1,"moyenneGenerale":13.5,"mention":"Assez bien","rang":3}	\N	\N	2026-09-06 13:50:55.179
418	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpvdtr5008auhvsawkrj5oj	{"sanctionId":"cmtpvdval008cuhvscohmlqsd","notificationsEnvoyees":1}	\N	\N	2026-09-06 13:51:13.964
419	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	eleve.rattachement_parent	eleve	cmtpvdrkv0086uhvse5bkxky1	{"parentId":"cmtmh32c5005puhmczpgn7nma"}	\N	\N	2026-09-06 13:51:19.373
420	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	sanction.notifier_parents	incident	cmtpvdtr5008auhvsawkrj5oj	{"sanctionId":"cmtpve5no008guhvssurpki4j","notificationsEnvoyees":2}	\N	\N	2026-09-06 13:51:24.396
421	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	rdv.creneau_ouvert	creneau_rdv	cmtpveqey008muhvs010ki7ff	{}	\N	\N	2026-09-06 13:51:48.249
422	cmtmh278b0004uhmc9ijeasvj	cmtmh340f005zuhmc0b7v0ujv	rdv.reservation	rdv	cmtpvesr5008ouhvs7n3ndulk	{"creneauId":"cmtpveqey008muhvs010ki7ff","parentId":"cmtmh34620061uhmceyy3wdi7"}	\N	\N	2026-09-06 13:51:52.261
423	cmtmh278b0004uhmc9ijeasvj	cmtmh340f005zuhmc0b7v0ujv	rdv.annulation	rdv	cmtpvesr5008ouhvs7n3ndulk	\N	\N	\N	2026-09-06 13:51:58.204
424	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpvf2n9008uuhvsj5s64zll	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPVF1H9-C678EB"}	\N	\N	2026-09-06 13:52:04.514
426	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpvf6ue008wuhvsp6mm2hny	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPVF5UY-578E50"}	\N	\N	2026-09-06 13:52:09.917
428	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	paiement.encaissement	paiement	cmtpvfayn008yuhvszfnn7dlg	{"montantCentimes":100000,"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","modePaiement":"espece","alloueCentimes":100000,"reference":"PAY-MTPVF9LY-77B94F"}	\N	\N	2026-09-06 13:52:15.09
430	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":1}	\N	\N	2026-09-06 13:52:30.326
431	\N	cmtmh2b61000tuhmcb913gwgr	saas.factures_generation	facture_saas	\N	{"periode":"2026-09","crees":0}	\N	\N	2026-09-06 13:52:33.704
447	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	admission.conversion_inscription	candidature_admission	cmtpvmxdc0041uhi401k5zhna	{"eleveId":"cmtpvn2n60049uhi4taz4wvr1","matricule":"EL-0013"}	\N	\N	2026-09-06 13:58:21.59
449	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	transport.inscription	transport_inscription	cmtpvn9ls004juhi4fk04odg3	{"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","ligneId":"cmtpvn794004huhi4yb7qxa3n"}	\N	\N	2026-09-06 13:58:26.789
450	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	services.facturation_cantine	frais	cmtpvnchd004luhi4emfe3spj	{"periode":"2026-10","échéances":2}	\N	\N	2026-09-06 13:58:31.493
451	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	services.facturation_transport	frais	cmtpvnfrk004ruhi4rzvjlhjf	{"periode":"2026-10","échéances":1}	\N	\N	2026-09-06 13:58:34.927
452	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	services.facturation_cantine	frais	cmtpvnchd004luhi4emfe3spj	{"periode":"2026-10","échéances":0}	\N	\N	2026-09-06 13:58:37.461
453	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	biblio.pret	biblio_pret	cmtpvnkiw004xuhi4z1guteb9	{"livreId":"cmtpvnix9004vuhi467jbt3o5","eleveId":"cmtmh2y8r004nuhmcunq3tc6y"}	\N	\N	2026-09-06 13:58:40.955
454	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	biblio.retour	biblio_pret	cmtpvnkiw004xuhi4z1guteb9	{"penalite":27500}	\N	\N	2026-09-06 13:58:46.121
455	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	protection.signalement	signalement_mineur	cmtpvnqbe0053uhi47zjfi5cy	{"type":"harcelement","gravite":"urgent"}	\N	\N	2026-09-06 13:58:48.881
456	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	protection.suivi	suivi_signalement	cmtpvnrzd0057uhi4wmkrtig3	{"signalementId":"cmtpvnqbe0053uhi47zjfi5cy"}	\N	\N	2026-09-06 13:58:50.183
458	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	competences.saisie	evaluation_competence	\N	{"count":1}	\N	\N	2026-09-06 13:58:57.919
459	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	securite.session_revoquee	session	cmtpvnzwv005fuhi4zqgzjd72	{"proprietaire":"direction@vinci.sn"}	\N	\N	2026-09-06 13:59:01.922
460	cmtmh6qdx00lkuhmchendtvn1	cmtmh2b61000tuhmcb913gwgr	compte.changement_ecole_active	ecole	cmtmh6qdx00lkuhmchendtvn1	\N	\N	\N	2026-09-06 13:59:09.491
462	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	rgpd.effacement_traite	eleve	cmtpvo98c005nuhi4f410x9g8	{"demandeId":"cmtpvoat7005suhi4n8mkbetq"}	\N	\N	2026-09-06 13:59:18.625
463	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	absentéisme.relance	\N	\N	{"seuil":99,"fenêtre":365,"notifiés":0}	\N	\N	2026-09-06 13:59:27.28
464	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	webhook.creation	webhook_sortant	cmtpvolft0060uhi4d8dbx10b	{"url":"https://example.invalid/h","events":["eleve.inscription"]}	\N	\N	2026-09-06 13:59:28.941
465	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	referentiel.matiere_creation	matiere	cmtpvonno0062uhi45osenf3j	{"code":"AMX1","libelle":"Matière test"}	\N	\N	2026-09-06 13:59:31.249
466	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	referentiel.classe_creation	classe	cmtpvopr30064uhi4m3icsbwf	{"code":"6Z","libelle":"Sixième Z","annee":"2026-2027","titulaire":null}	\N	\N	2026-09-06 13:59:33.947
482	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	admission.conversion_inscription	candidature_admission	cmtpw0uag000buhyoub1vdcef	{"eleveId":"cmtpw0z0h000juhyo4aabx63i","matricule":"EL-0015"}	\N	\N	2026-09-06 14:09:09.716
484	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	transport.inscription	transport_inscription	cmtpw153n000tuhyonh42es0w	{"eleveId":"cmtmh2y8r004nuhmcunq3tc6y","ligneId":"cmtpw13cg000ruhyoo4ok4sjg"}	\N	\N	2026-09-06 14:09:13.658
485	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	services.facturation_cantine	frais	cmtpvnchd004luhi4emfe3spj	{"periode":"2026-10","échéances":0}	\N	\N	2026-09-06 14:09:17.218
486	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	services.facturation_transport	frais	cmtpvnfrk004ruhi4rzvjlhjf	{"periode":"2026-10","échéances":0}	\N	\N	2026-09-06 14:09:20.126
487	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	services.facturation_cantine	frais	cmtpvnchd004luhi4emfe3spj	{"periode":"2026-10","échéances":0}	\N	\N	2026-09-06 14:09:22.216
488	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	biblio.pret	biblio_pret	cmtpw1e46000xuhyo5jgm69g1	{"livreId":"cmtpw1cj1000vuhyoo14ecmo8","eleveId":"cmtmh2y8r004nuhmcunq3tc6y"}	\N	\N	2026-09-06 14:09:25.751
489	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	biblio.retour	biblio_pret	cmtpw1e46000xuhyo5jgm69g1	{"penalite":27500}	\N	\N	2026-09-06 14:09:29.832
490	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	protection.signalement	signalement_mineur	cmtpw1iye0011uhyom572gqxd	{"type":"harcelement","gravite":"urgent"}	\N	\N	2026-09-06 14:09:32.44
491	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	protection.suivi	suivi_signalement	cmtpw1kka0015uhyoml6evjzv	{"signalementId":"cmtpw1iye0011uhyom572gqxd"}	\N	\N	2026-09-06 14:09:33.689
493	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	competences.saisie	evaluation_competence	\N	{"count":1}	\N	\N	2026-09-06 14:09:41.262
\.


--
-- Data for Name: AutorisationSortie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AutorisationSortie" (id, "eleveId", "nomPersonneAutorisee", "lienAvecEleve", telephone, "photoUrl", active, "valideeParId") FROM stdin;
cmtmh45re00cpuhmcr6iin5mx	cmtmh2wzr004buhmc9crpu0t6	Maman Diop	mere	+221 76 000 00 00	\N	t	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: AvancementProgramme; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AvancementProgramme" (id, "chapitreId", "classeId", "enseignantId", pourcentage, "dateMaj", commentaire) FROM stdin;
cmtmh6ct900jluhmck5gfnfl8	cmtmh6bzy00jfuhmc2fl1uhkf	cmtmh2io40027uhmco5514if6	cmtmh2k9y002luhmcsd3wk406	65	2026-09-04 04:50:03.741	Chapitre bien avancé, évaluation prévue semaine 42.
cmtmh6d4h00jnuhmcfo4zb2o8	cmtmh6cbf00jhuhmc1eltmu4e	cmtmh2io40027uhmco5514if6	cmtmh2k9y002luhmcsd3wk406	15	2026-09-04 04:50:04.145	\N
cmtmh6e5k00jtuhmcb425p004	cmtmh6dlc00jruhmcpunu0unx	cmtmh2j520029uhmcakkepakv	cmtmh2lex002ruhmchh9li2y5	80	2026-09-04 04:50:05.48	Bon rythme, dictées hebdomadaires en place.
cmtmh6f5h00jzuhmcz1k5cxwq	cmtmh6ezs00jxuhmctr308bdz	cmtmh2jap002buhmccif5empg	cmtmh2m33002xuhmcjioc8q12	35	2026-09-04 04:50:06.773	Décalage dû à l'arrêt maladie — rattrapage planifié.
cmtmh6fb600k1uhmcgyzvqdd1	cmtmh6cnf00jjuhmc9dlk1pww	cmtmh2io40027uhmco5514if6	cmtmh2k9y002luhmcsd3wk406	40	2026-09-04 04:50:06.978	\N
\.


--
-- Data for Name: AvoirEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AvoirEcole" (id, "ecoleId", numero, "dateEmission", montant, devise, motif, "paiementLieId", "factureFournisseurId", statut, "emisParId") FROM stdin;
cmtmh4yuu00fvuhmcpw7154b7	cmtmh278b0004uhmc9ijeasvj	AV-2026-001	2026-08-25 00:00:00	1500000	XOF	Cahiers défectueux (4 unités)	\N	cmtmh4xxg00fruhmc0dxzbm55	emis	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: AvoirSaas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AvoirSaas" (id, "ecoleId", "factureSaasLieeId", numero, "dateEmission", montant, devise, motif, statut, "stripeCreditNoteId") FROM stdin;
cmtmh5bko00hmuhmcni7ofaih	cmtmh278b0004uhmc9ijeasvj	\N	AV-SAAS-2026-001	2026-08-15 00:00:00	500000	XOF	Erreur de facturation — prorata jours de suspension	emis	\N
\.


--
-- Data for Name: Batiment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Batiment" (id, "ecoleId", nom, adresse, "nombreEtages", "accessibilitePMR", "dateConstruction", "dateMaj") FROM stdin;
cmtmh5fxb00i5uhmc7l8j92fp	cmtmh278b0004uhmc9ijeasvj	Bâtiment Principal A	Avenue Léopold S. Senghor, Dakar	3	t	2010-09-01 00:00:00	2026-09-04 04:49:21.12
\.


--
-- Data for Name: BesoinSpecifique; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BesoinSpecifique" (id, "eleveId", type, description, "dateDiagnostic", "documentJustificatifUrl", confidentiel, "creeLe") FROM stdin;
cmtmh3lg4009euhmc4kb2av7z	cmtmh2xxf004juhmcwe9ylhvx	trouble_apprentissage	Dyslexie diagnostiquée	2025-03-10 00:00:00	\N	t	2026-09-04 04:47:54.965
\.


--
-- Data for Name: BiblioLivre; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiblioLivre" (id, "ecoleId", isbn, titre, auteur, editeur, "anneePublication", "exemplairesTotal", "exemplairesDisponibles", categorie, cote) FROM stdin;
cmtmh3t6s00aruhmcljuv8ye6	cmtmh278b0004uhmc9ijeasvj	978-2-221-23456-7	Le Petit Prince	Antoine de Saint-Exupéry	Gallimard	1943	5	4	Littérature jeunesse	R-PE-001
\.


--
-- Data for Name: BiblioPret; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiblioPret" (id, "livreId", "eleveId", "datePret", "dateRetourPrevue", "dateRetourEffective", statut, "penaliteGeneree") FROM stdin;
cmtmh3trz00atuhmc20ylf2lm	cmtmh3t6s00aruhmcljuv8ye6	cmtmh2wzr004buhmc9crpu0t6	2026-09-10 00:00:00	2026-09-24 00:00:00	\N	en_cours	0
\.


--
-- Data for Name: Budget; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Budget" (id, "ecoleId", "anneeScolaireId", libelle, "dateDebut", "dateFin", statut, "valideParId", "dateValidation") FROM stdin;
cmtmh4n2100exuhmcd0y14jsk	cmtmh278b0004uhmc9ijeasvj	cmtmh2bh9000vuhmcm08pmhfh	Budget prévisionnel 2026-2027	2026-09-01 00:00:00	2027-08-31 00:00:00	valide	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:48:43.704
\.


--
-- Data for Name: Bulletin; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Bulletin" (id, "eleveId", "classeId", "periodeId", version, statut, moyennes, "moyenneGenerale", rang, "appreciationGenerale", "decisionConseil", "pdfUrl", "creeParId", "dateCreation", "dateValidationPp", "validePpParId", "dateValidationDirection", "valideDirectionParId", "datePublication", "updatedAt") FROM stdin;
cmtpv756h0005uhlweh2qyx0i	cmtmh2xxf004juhmcwe9ylhvx	cmtmh2io40027uhmco5514if6	cmtmh2jgb002duhmcys0dqtnx	1	en_construction	{"MATHS":9.5,"FR":10.5,"HG":11}	\N	\N	\N	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-06 13:45:53.658	\N	\N	\N	\N	\N	2026-09-06 13:50:57.889
cmtpv74uh0003uhlwooxeoj8u	cmtmh2xm3004fuhmcgntcpsvf	cmtmh2io40027uhmco5514if6	cmtmh2jgb002duhmcys0dqtnx	1	valide_pp	{"MATHS":11,"FR":16.5,"HG":12}	13.2	2	Bon trimestre en français.	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-06 13:45:53.225	2026-12-10 00:00:00	cmtmh2b61000tuhmcb913gwgr	\N	\N	\N	2026-09-06 13:50:59.095
cmtpv74c40001uhlw5upzo09y	cmtmh2wzr004buhmc9crpu0t6	cmtmh2io40027uhmco5514if6	cmtmh2jgb002duhmcys0dqtnx	1	publie	{"MATHS":14.5,"FR":13,"HG":15.5}	14.3	2	Trimestre solide, continue ainsi !	admis	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-06 13:45:52.564	2026-12-10 00:00:00	cmtmh2b61000tuhmcb913gwgr	2026-12-12 00:00:00	cmtmh2b61000tuhmcb913gwgr	2026-12-13 00:00:00	2026-09-06 13:50:59.354
\.


--
-- Data for Name: BulletinAppreciation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BulletinAppreciation" (id, "bulletinId", "matiereId", appreciation, "enseignantId", "periodeId") FROM stdin;
\.


--
-- Data for Name: BulletinPaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BulletinPaie" (id, "ecoleId", "personnelId", periode, "salaireBrut", "salaireNet", "cotisationsTotales", "retenuesTotales", "primesTotales", "netAPayer", devise, statut, "dateEdition", "dateValidation", "datePaiement", "valideParId", "pdfUrl") FROM stdin;
cmtmh4abg00dcuhmcbhyalhcr	cmtmh278b0004uhmc9ijeasvj	cmtmh2k9y002luhmcsd3wk406	2026-08	28000000	21000000	7000000	0	2500000	23500000	XOF	valide	2026-09-04 04:48:27.196	2026-09-04 04:48:27.194	\N	cmtmh2b61000tuhmcb913gwgr	\N
cmtpvlsju000muhi4cbwx4vao	cmtmh278b0004uhmc9ijeasvj	cmtmh2m33002xuhmcjioc8q12	2030-01	35100000	33260760	4787640	1839240	100000	33260760	XOF	brouillon	2026-09-06 13:57:17.131	\N	\N	\N	\N
cmtpvltjq000uuhi4ivygt7jp	cmtmh278b0004uhmc9ijeasvj	cmtmh2mrs0033uhmc489yb2x9	2030-01	35100000	33260760	4787640	1839240	100000	33260760	XOF	brouillon	2026-09-06 13:57:18.422	\N	\N	\N	\N
cmtpvluhx0012uhi4hmu75cpz	cmtmh278b0004uhmc9ijeasvj	cmtmh2o3a0039uhmc81y6hre7	2030-01	35100000	33260760	4787640	1839240	100000	33260760	XOF	brouillon	2026-09-06 13:57:19.653	\N	\N	\N	\N
cmtpvlw6x001auhi4u8gqlusf	cmtmh278b0004uhmc9ijeasvj	cmtmh2orf003fuhmc31ixyw6u	2030-01	35100000	33260760	4787640	1839240	100000	33260760	XOF	brouillon	2026-09-06 13:57:21.849	\N	\N	\N	\N
cmtpvlx61001iuhi4cru530o7	cmtmh278b0004uhmc9ijeasvj	cmtmh2q2b003luhmc3xpwbz87	2030-01	28100000	26627560	3832840	1472440	100000	26627560	XOF	brouillon	2026-09-06 13:57:23.113	\N	\N	\N	\N
cmtpvlyl1001quhi4hw686k2t	cmtmh278b0004uhmc9ijeasvj	cmtmh2sph003puhmc6o7plyox	2030-01	32100000	30417960	4378440	1682040	100000	30417960	XOF	brouillon	2026-09-06 13:57:24.95	\N	\N	\N	\N
cmtpvlzx5001yuhi4xuv9oc0u	cmtmh278b0004uhmc9ijeasvj	cmtmh2tdi003tuhmc5xi6cfr5	2030-01	34100000	32313160	4651240	1786840	100000	32313160	XOF	brouillon	2026-09-06 13:57:26.682	\N	\N	\N	\N
cmtpvm1i10026uhi4wu2qrg18	cmtmh278b0004uhmc9ijeasvj	cmtmh2u1p003xuhmca8o1yqyx	2030-01	22100000	20941960	3014440	1158040	100000	20941960	XOF	brouillon	2026-09-06 13:57:28.729	\N	\N	\N	\N
cmtpvm2jr002euhi4f16tijsw	cmtmh278b0004uhmc9ijeasvj	cmtmh2uvk0041uhmcu0bxn49c	2030-01	24100000	22837160	3287240	1262840	100000	22837160	XOF	brouillon	2026-09-06 13:57:30.087	\N	\N	\N	\N
cmtpvm4g6002muhi4zys5uh2g	cmtmh278b0004uhmc9ijeasvj	cmtmh2vji0045uhmcuy5stzju	2030-01	30100000	28522760	4105640	1577240	100000	28522760	XOF	brouillon	2026-09-06 13:57:32.55	\N	\N	\N	\N
cmtpvm5i4002uuhi4g4vpyqbh	cmtmh278b0004uhmc9ijeasvj	cmtmh2w7h0049uhmchl3phe5e	2030-01	23100000	21889560	3150840	1210440	100000	21889560	XOF	brouillon	2026-09-06 13:57:33.916	\N	\N	\N	\N
cmtpvlpu80006uhi4drk9i0uk	cmtmh278b0004uhmc9ijeasvj	cmtmh2k9y002luhmcsd3wk406	2030-01	35100000	33260760	4787640	1839240	100000	33260760	XOF	paye	2026-09-06 13:57:13.614	2026-09-06 13:57:45.362	2026-09-06 13:57:46.392	cmtmh2b61000tuhmcb913gwgr	\N
cmtpvlrhn000euhi4g8al6bnv	cmtmh278b0004uhmc9ijeasvj	cmtmh2lex002ruhmchh9li2y5	2030-01	35100000	33260760	4787640	1839240	100000	33260760	XOF	paye	2026-09-06 13:57:15.755	2026-09-06 14:08:42.123	2026-09-06 14:08:42.952	cmtmh2b61000tuhmcb913gwgr	\N
\.


--
-- Data for Name: CahierTexte; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CahierTexte" (id, "ecoleId", "classeId", "matiereId", "enseignantId", "periodeId", statut, "dateCreation") FROM stdin;
cmtmh4j8y00efuhmc4a8e6y0n	cmtmh278b0004uhmc9ijeasvj	cmtmh2io40027uhmco5514if6	cmtmh2kl7002nuhmcair5l2ws	cmtmh2k9y002luhmcsd3wk406	cmtmh2jgb002duhmcys0dqtnx	actif	2026-09-04 04:48:38.77
\.


--
-- Data for Name: CalendrierScolaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CalendrierScolaire" (id, "ecoleId", "anneeScolaireId", type, libelle, "dateDebut", "dateFin") FROM stdin;
cmtmh3j5p0091uhmcmsd83bvq	cmtmh278b0004uhmc9ijeasvj	cmtmh2bh9000vuhmcm08pmhfh	vacances	Toussaint	2026-10-25 00:00:00	2026-11-02 00:00:00
cmtmh3j5p0092uhmczx8awrvv	cmtmh278b0004uhmc9ijeasvj	cmtmh2bh9000vuhmcm08pmhfh	vacances	Noël	2026-12-19 00:00:00	2027-01-04 00:00:00
cmtmh3j5p0093uhmc10z787cu	cmtmh278b0004uhmc9ijeasvj	cmtmh2bh9000vuhmcm08pmhfh	jour_ferie	Tabaski	2026-08-22 00:00:00	2026-08-22 00:00:00
cmtmh3j5p0094uhmcfzlsg414	cmtmh278b0004uhmc9ijeasvj	cmtmh2bh9000vuhmcm08pmhfh	journee_pedagogique	Formation équipe	2026-09-01 00:00:00	2026-09-01 00:00:00
\.


--
-- Data for Name: Candidature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Candidature" (id, "offreId", nom, prenom, email, telephone, "cvUrl", "lettreMotivation", source, "dateReception", statut, "etapeActuelle") FROM stdin;
cmtmh4d7400douhmcx042hfij	cmtmh4cvv00dmuhmcko14ouxh	Ba	Awa	awa.ba@example.com	+221 77 000 11 22	\N	\N	offre	2026-09-04 04:48:30.928	entretien	entretien_direction
\.


--
-- Data for Name: CandidatureAdmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CandidatureAdmission" (id, "sourceIp", "ecoleId", "niveauId", nom, prenom, "dateNaissance", "lieuNaissance", sexe, email, telephone, "parentNom", "parentTelephone", statut, "dateSoumission", "dateDecision", "parcoursAnterieur", "etablissementOrigine", "dossierComplet", "notesEntretien") FROM stdin;
cmtmh4fdi00e0uhmcocwjwhac	\N	cmtmh278b0004uhmc9ijeasvj	cmtmh2fwh001ruhmcq6gplxq7	Sow	Moussa	2015-03-12 00:00:00	Dakar	M	famille.sow@example.com	+221 78 333 44 55	Sow (père)	+221 78 333 44 55	test	2026-09-04 04:48:33.75	\N	CM2 - École publique Pikine	École élélémentaire Pikine Nord	t	\N
\.


--
-- Data for Name: CantineInscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CantineInscription" (id, "ecoleId", "eleveId", "classeId", "anneeScolaireId", "joursSemaine", "tarifJournalier", actif) FROM stdin;
cmtmh6mep00l3uhmcf4imi0nz	cmtmh278b0004uhmc9ijeasvj	cmtmh2wzr004buhmc9crpu0t6	cmtmh2io40027uhmco5514if6	cmtmh2bh9000vuhmcm08pmhfh	[1,3,5]	150000	t
cmtmh6mq600l5uhmc63mbwchw	cmtmh278b0004uhmc9ijeasvj	cmtmh2zy20057uhmccluf8ocy	cmtmh2j520029uhmcakkepakv	cmtmh2bh9000vuhmcm08pmhfh	[1,2,3,4,5]	120000	t
\.


--
-- Data for Name: CantineMenu; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CantineMenu" (id, "ecoleId", date, "platPrincipal", accompagnement, dessert, allergenes) FROM stdin;
cmtmh6sae00lwuhmc1qqgg5wf	cmtmh278b0004uhmc9ijeasvj	2026-09-05 00:00:00	Yassa poulet	\N	Fruit de saison	["oeuf"]
cmtmh6sg200lyuhmczx15fub4	cmtmh278b0004uhmc9ijeasvj	2026-09-06 00:00:00	Couscous légumes	\N	\N	[]
\.


--
-- Data for Name: CantinePresence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CantinePresence" (id, "ecoleId", "eleveId", date, present) FROM stdin;
cmtmh6swt00m0uhmcr33nbpcv	cmtmh278b0004uhmc9ijeasvj	cmtmh2wzr004buhmc9crpu0t6	2026-09-04 00:00:00	t
cmtmh6t8000m2uhmcu61dygl0	cmtmh278b0004uhmc9ijeasvj	cmtmh2zy20057uhmccluf8ocy	2026-09-04 00:00:00	t
\.


--
-- Data for Name: Chapitre; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Chapitre" (id, "programmeId", titre, ordre, "volumeHorairePrevu", contenu, ressources) FROM stdin;
cmtmh6bzy00jfuhmc2fl1uhkf	cmtmh6boh00jduhmcgyiw6t0x	Nombres décimaux	1	12	Addition, soustraction, multiplication des décimaux.	\N
cmtmh6cbf00jhuhmc1eltmu4e	cmtmh6boh00jduhmcgyiw6t0x	Proportionnalité	2	10	\N	\N
cmtmh6cnf00jjuhmc9dlk1pww	cmtmh6boh00jduhmcgyiw6t0x	Figures usuelles	3	14	\N	\N
cmtmh6dlc00jruhmcpunu0unx	cmtmh6dfp00jpuhmcc2gzx5if	Les types de phrases	1	10	\N	\N
cmtmh6ezs00jxuhmctr308bdz	cmtmh6eu500jvuhmc8yb6zrco	Les grandes découvertes	1	12	\N	\N
\.


--
-- Data for Name: Classe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Classe" (id, "niveauId", "anneeScolaireId", "ecoleId", code, libelle, "capaciteMax", "enseignantPrincipalId") FROM stdin;
cmtnfcyj3000dkw04dut2vql3	cmtnfcyid000bkw04yxr4mvde	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	PS-A	Petite section A	40	\N
cmtnfcyk9000hkw0403ud0zps	cmtnfcyjv000fkw04zzz1xrrb	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	MS-A	Moyenne section A	40	\N
cmtnfcyl1000lkw04a5gcb79u	cmtnfcyko000jkw04h8dbv2ru	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	GS-A	Grande section A	40	\N
cmtnfcyml000tkw04tqthuimw	cmtnfcym7000rkw04173mob4v	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	CP-A	CP A	40	\N
cmtnfcynd000xkw04eajl0o73	cmtnfcymz000vkw04vsyac18j	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	CE1-A	CE1 A	40	\N
cmtnfcyo30011kw04ktejsf3a	cmtnfcynq000zkw04zl5adz0c	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	CE2-A	CE2 A	40	\N
cmtnfcyov0015kw04hdoxqqgd	cmtnfcyoh0013kw04brbkp31t	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	CM1-A	CM1 A	40	\N
cmtnfcypn0019kw042vj16vu5	cmtnfcyp90017kw04w3lpbasx	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	CM2-A	CM2 A	40	\N
cmtnfcyr6001hkw04vbojewr1	cmtnfcyqs001fkw0497reme52	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	6E-A	Sixième A	40	\N
cmtnfcyry001lkw0441gtm661	cmtnfcyrk001jkw040unsnw86	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	5E-A	Cinquième A	40	\N
cmtnfcysp001pkw048sqz64jg	cmtnfcysc001nkw04i316ua80	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	4E-A	Quatrième A	40	\N
cmtnfcyth001tkw04id89kdqy	cmtnfcyt3001rkw04j4kyxowt	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	3E-A	Troisième A	40	\N
cmtnfcyv10021kw04n2wl60ia	cmtnfcyun001zkw04fcwp4sgb	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	2NDE-A	Seconde A	40	\N
cmtnfcyvs0025kw04wlnejaim	cmtnfcyvf0023kw042uo4j4tw	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	1ERE-A	Première A	40	\N
cmtnfcywk0029kw04dr91smuw	cmtnfcyw60027kw04dd6opdvf	cmtnfcyfd0002kw045zqcgxdt	cmtnfcyel0000kw045oa97bhl	TLE-A	Terminale A	40	\N
cmtmh2io40027uhmco5514if6	cmtmh2fwh001ruhmcq6gplxq7	cmtmh2bh9000vuhmcm08pmhfh	cmtmh278b0004uhmc9ijeasvj	6A	Sixième A	35	cmtmh2k9y002luhmcsd3wk406
cmtmh2j520029uhmcakkepakv	cmtmh2g21001tuhmcgk27bex7	cmtmh2bh9000vuhmcm08pmhfh	cmtmh278b0004uhmc9ijeasvj	5B	Cinquième B	35	cmtmh2lex002ruhmchh9li2y5
cmtmh2jap002buhmccif5empg	cmtmh2fl9001nuhmcql4dktof	cmtmh2bh9000vuhmcm08pmhfh	cmtmh278b0004uhmc9ijeasvj	CM2-A	CM2 A	30	cmtmh2m33002xuhmcjioc8q12
cmtmh6rc600lquhmce1pt21ik	cmtmh2fwh001ruhmcq6gplxq7	cmtmh6qpq00lmuhmcrn6gnyv4	cmtmh6qdx00lkuhmchendtvn1	6A-ETO	Sixième A (Étoile)	30	\N
cmtnebu77000dl704fcs0lfig	cmtnebu6b000bl7049hvinmpv	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	PS-A	Petite section A	40	\N
cmtnebu8i000hl704bb5mbcav	cmtnebu85000fl704h0gp5asm	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	MS-A	Moyenne section A	40	\N
cmtnebu99000ll704nwlns1dw	cmtnebu8w000jl704h7p1wjoi	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	GS-A	Grande section A	40	\N
cmtnebuat000tl7046hwa5ryu	cmtnebuaf000rl704kv31aqxv	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	CP-A	CP A	40	\N
cmtnebubk000xl704tp1ajlsi	cmtnebub7000vl704l6ggl63s	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	CE1-A	CE1 A	40	\N
cmtnebucb0011l704qs7x5d0t	cmtnebuby000zl704r5snz512	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	CE2-A	CE2 A	40	\N
cmtnebud20015l704qpwujxpp	cmtnebucp0013l704387nn6wp	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	CM1-A	CM1 A	40	\N
cmtnebudt0019l7046vzf6xib	cmtnebudg0017l704v0ssnri9	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	CM2-A	CM2 A	40	\N
cmtnebufb001hl704g67or1ku	cmtnebuex001fl704yiuibtvz	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	6E-A	Sixième A	40	\N
cmtnebug2001ll7042xakn8qe	cmtnebufo001jl7043ck84jzy	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	5E-A	Cinquième A	40	\N
cmtnebugt001pl70438t9ixgk	cmtnebugf001nl704duack67b	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	4E-A	Quatrième A	40	\N
cmtnebuhk001tl704iji2skr4	cmtnebuh6001rl704u1ybk7lw	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	3E-A	Troisième A	40	\N
cmtnebuj20021l704wgbcsw85	cmtnebuio001zl7047go5v6fe	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	2NDE-A	Seconde A	40	\N
cmtnebujt0025l704l5loacw3	cmtnebujf0023l704lz6ilcyq	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	1ERE-A	Première A	40	\N
cmtnebukl0029l704hnxmtvnb	cmtnebuk60027l704mtyzeno0	cmtnebu2m0002l704jdqfx963	cmtnebu1g0000l704ty18jg4n	TLE-A	Terminale A	40	\N
\.


--
-- Data for Name: CommandeFournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CommandeFournisseur" (id, "ecoleId", "fournisseurId", numero, "dateCommande", "dateLivraisonPrevue", "dateLivraisonEffective", "montantTotal", devise, statut, "valideeParId") FROM stdin;
cmtmh4r1g00fkuhmcm66vmn9w	cmtmh278b0004uhmc9ijeasvj	cmtmh4q2q00fiuhmc3a3hkj48	CMD-2026-001	2026-08-01 00:00:00	2026-08-15 00:00:00	\N	24000000	XOF	recue_partielle	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: Competence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Competence" (id, "ecoleId", "cycleId", "matiereId", libelle, ordre) FROM stdin;
cmtmh46uz00cruhmck77uxejq	cmtmh278b0004uhmc9ijeasvj	cmtmh2bsg000xuhmcsyxyiwud	\N	Distinguer les lettres de l'alphabet	1
cmtmh476600ctuhmc3tvkffxn	cmtmh278b0004uhmc9ijeasvj	cmtmh2bsg000xuhmcsyxyiwud	\N	Compter jusqu'à 20	2
cmtmh6h1600kduhmci4p268l0	cmtmh278b0004uhmc9ijeasvj	cmtmh2c3m000zuhmc4t0g61gk	\N	Lire couramment un texte adapté	1
cmtmh6hcw00kfuhmc9g4esyf5	cmtmh278b0004uhmc9ijeasvj	cmtmh2c3m000zuhmc4t0g61gk	\N	Résoudre un problème à une étape	2
\.


--
-- Data for Name: CompteComptable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CompteComptable" (id, "ecoleId", numero, libelle, type, parent, solde, devise, actif) FROM stdin;
cmtmh4oms00fauhmcanmvvoqk	cmtmh278b0004uhmc9ijeasvj	607	Achats de marchandises	charge	\N	46500000	XOF	t
cmtmh4o0900f4uhmcq5njgxqn	cmtmh278b0004uhmc9ijeasvj	512	Banque	actif	\N	287100000	XOF	t
cmtmh4obl00f6uhmckav2w0db	cmtmh278b0004uhmc9ijeasvj	401	Fournisseurs	passif	\N	35000000	XOF	t
cmtmh4oh700f8uhmcveykjmlm	cmtmh278b0004uhmc9ijeasvj	411	Clients (parents)	actif	\N	43400000	XOF	t
\.


--
-- Data for Name: ConfigurationPaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConfigurationPaie" (id, "ecoleId", "tauxEmployeur", "tauxSalarie", "primesRecurrentes", "majParId", "dateMaj") FROM stdin;
cmtmh6q2m00ljuhmcnu2sqsbs	cmtmh278b0004uhmc9ijeasvj	0.084	0.0524	[{"libelle":"Prime de transport","montant":100000}]	\N	2026-09-04 04:50:20.924
cmtnebv6u002xl704s1b89f46	cmtnebu1g0000l704ty18jg4n	0.084	0.0524	[]	\N	2026-09-04 20:18:08.166
cmtnfczhr002xkw041k125vsc	cmtnfcyel0000kw045oa97bhl	0.084	0.0524	[]	\N	2026-09-04 20:47:00.015
\.


--
-- Data for Name: Conge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Conge" (id, "personnelId", type, "dateDebut", "dateFin", statut, motif, "justificatifUrl", "traiteParId", "updatedAt") FROM stdin;
cmtmh6aez00j5uhmcdqy0qz5k	cmtmh2m33002xuhmcjioc8q12	maladie	2026-09-01 04:50:00.633	2026-09-10 04:50:00.633	valide	Arrêt maladie — certificat fourni	\N	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:50:00.635
cmtmh6aqd00j7uhmcjk74x7t1	cmtmh2o3a0039uhmc81y6hre7	annuel	2026-12-21 00:00:00	2027-01-04 00:00:00	demande	Congés annuels fin d'année	\N	\N	2026-09-04 04:50:01.046
\.


--
-- Data for Name: ConseilClasse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConseilClasse" (id, "ecoleId", "classeId", "periodeId", date, salle, statut, "compteRendu", "presidentId") FROM stdin;
cmtmh4jvu00ejuhmci6a5kn46	cmtmh278b0004uhmc9ijeasvj	cmtmh2io40027uhmco5514if6	cmtmh2jgb002duhmcys0dqtnx	2026-10-15 17:00:00	Salle de conférence	planifie	Conseil de classe T1 — 25 élèves, 0 redoublement, 3 félicitations.	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: ConsentementCommunication; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConsentementCommunication" (id, "ecoleId", "utilisateurId", "eleveId", canal, accord, "dateAccord", "dateRetrait", motif) FROM stdin;
cmtmh58ls00h7uhmc9ofon8im	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	\N	email	t	2026-08-01 00:00:00	\N	\N
\.


--
-- Data for Name: ConsentementImage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConsentementImage" (id, "ecoleId", "eleveId", accord, usage, "dateAccord", "valideParParentId", duree, "dateCreation", "dateMaj") FROM stdin;
cmtmh58am00h5uhmcj1qu037l	cmtmh278b0004uhmc9ijeasvj	cmtmh2wzr004buhmc9crpu0t6	t	site_web	2026-08-05 00:00:00	cmtmh32c5005puhmczpgn7nma	annee_scolaire	2026-09-04 04:49:11.231	2026-09-04 04:49:11.231
\.


--
-- Data for Name: ConventionStage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConventionStage" (id, "stageId", "numeroConvention", "dateSignature", "signeParEleve", "signeParEcole", "signeParEntreprise", "fichierUrl", statut) FROM stdin;
cmtmh4eqv00dwuhmc2e7gn70q	cmtmh4efq00duuhmc82gmfbkl	CONV-2026-001	2026-08-22 00:00:00	t	t	t	\N	signe
\.


--
-- Data for Name: Conversation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Conversation" (id, "ecoleId", titre, type, "creeParId", "dateCreation", "dernierMessageAt") FROM stdin;
cmtmh4z6400fxuhmc1jmhtjhe	cmtmh278b0004uhmc9ijeasvj	Direction ↔ Vie scolaire	direct	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:48:59.4	2026-09-04 04:48:59.4
\.


--
-- Data for Name: ConversationParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConversationParticipant" (id, "conversationId", "utilisateurId", role, "dateAjout", "dernierLectureAt", archive) FROM stdin;
cmtmh4zh900fyuhmc2cn2k0xn	cmtmh4z6400fxuhmc1jmhtjhe	cmtmh2b61000tuhmcb913gwgr	admin	2026-09-04 04:48:59.803	\N	f
cmtmh4zh900fzuhmcald61goi	cmtmh4z6400fxuhmc1jmhtjhe	cmtmh2k4c002juhmcu8bjec0z	membre	2026-09-04 04:48:59.803	\N	f
\.


--
-- Data for Name: CotisationSociale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CotisationSociale" (id, "bulletinId", libelle, assiette, "tauxEmployeur", "tauxSalarie", "partEmployeur", "partSalarie") FROM stdin;
cmtmh4c9600diuhmcwdl144g7	cmtmh4abg00dcuhmcbhyalhcr	IPM ( retraite)	28000000	0.084	0.0524	2352000	1467200
cmtpvlqoq000cuhi4cecoj55e	cmtpvlpu80006uhi4drk9i0uk	Cotisations sociales (IPM/RC)	35100000	0.084	0.0524	2948400	1839240
cmtpvlrz8000kuhi478vae8br	cmtpvlrhn000euhi4g8al6bnv	Cotisations sociales (IPM/RC)	35100000	0.084	0.0524	2948400	1839240
cmtpvlt16000suhi41vym0eft	cmtpvlsju000muhi4cbwx4vao	Cotisations sociales (IPM/RC)	35100000	0.084	0.0524	2948400	1839240
cmtpvlu0w0010uhi4dy7qp0eg	cmtpvltjq000uuhi4ivygt7jp	Cotisations sociales (IPM/RC)	35100000	0.084	0.0524	2948400	1839240
cmtpvlvd90018uhi4bojc42bj	cmtpvluhx0012uhi4hmu75cpz	Cotisations sociales (IPM/RC)	35100000	0.084	0.0524	2948400	1839240
cmtpvlwof001guhi4kcjwjf28	cmtpvlw6x001auhi4u8gqlusf	Cotisations sociales (IPM/RC)	35100000	0.084	0.0524	2948400	1839240
cmtpvlxo3001ouhi4llzor94o	cmtpvlx61001iuhi4cru530o7	Cotisations sociales (IPM/RC)	28100000	0.084	0.0524	2360400	1472440
cmtpvlz82001wuhi4u2ebx2bq	cmtpvlyl1001quhi4hw686k2t	Cotisations sociales (IPM/RC)	32100000	0.084	0.0524	2696400	1682040
cmtpvm0rc0024uhi43p2krayq	cmtpvlzx5001yuhi4xuv9oc0u	Cotisations sociales (IPM/RC)	34100000	0.084	0.0524	2864400	1786840
cmtpvm21d002cuhi4kzagnady	cmtpvm1i10026uhi4wu2qrg18	Cotisations sociales (IPM/RC)	22100000	0.084	0.0524	1856400	1158040
cmtpvm36t002kuhi4ecqjhsc2	cmtpvm2jr002euhi4f16tijsw	Cotisations sociales (IPM/RC)	24100000	0.084	0.0524	2024400	1262840
cmtpvm4xl002suhi4df52l1f5	cmtpvm4g6002muhi4zys5uh2g	Cotisations sociales (IPM/RC)	30100000	0.084	0.0524	2528400	1577240
cmtpvm6b10030uhi4csxl9jsp	cmtpvm5i4002uuhi4g4vpyqbh	Cotisations sociales (IPM/RC)	23100000	0.084	0.0524	1940400	1210440
\.


--
-- Data for Name: CreneauHebdo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CreneauHebdo" (id, "emploiTempsId", "jourSemaine", "heureDebut", "heureFin", "salleId", "matiereId", "enseignantId", "classeId", type) FROM stdin;
cmtmh4hjm00e7uhmccred1qbr	cmtmh4gx700e6uhmcstmnfrfm	1	08:00	10:00	\N	\N	\N	\N	cours
cmtmh4hjm00e8uhmcir3d4suj	cmtmh4gx700e6uhmcstmnfrfm	3	10:00	12:00	\N	\N	\N	\N	cours
cmtmh4hjm00e9uhmcx27ltrv4	cmtmh4gx700e6uhmcstmnfrfm	5	08:00	10:00	\N	\N	\N	\N	cours
\.


--
-- Data for Name: CreneauRdv; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CreneauRdv" (id, "personnelId", date, "heureDebut", "heureFin", statut, lieu, "lienVisio") FROM stdin;
cmtmh44c300cjuhmcn1p75qwx	cmtmh2k9y002luhmcsd3wk406	2026-09-30 16:00:00	16:00	16:15	reserve	presentiel	\N
\.


--
-- Data for Name: Cycle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Cycle" (id, "ecoleId", code, libelle, ordre, "modeEvaluation") FROM stdin;
cmtmh2bsg000xuhmcsyxyiwud	cmtmh278b0004uhmc9ijeasvj	MAT	Maternelle	1	competences
cmtmh2c3m000zuhmc4t0g61gk	cmtmh278b0004uhmc9ijeasvj	PRIM	Primaire	2	chiffre
cmtmh2c970011uhmco2h5i9vt	cmtmh278b0004uhmc9ijeasvj	COLL	Collège	3	chiffre
cmtmh2ceu0013uhmc0jkr2mxs	cmtmh278b0004uhmc9ijeasvj	LYC	Lycée	4	chiffre
cmtnebu4j0007l704kyhc79zm	cmtnebu1g0000l704ty18jg4n	MAT	Maternelle	1	competences
cmtnebu9n000nl70421ju456n	cmtnebu1g0000l704ty18jg4n	PRIM	Primaire	5	chiffre
cmtnebue6001bl704py6oapkk	cmtnebu1g0000l704ty18jg4n	COLL	Collège	11	chiffre
cmtnebuhx001vl704qs4ne1gy	cmtnebu1g0000l704ty18jg4n	LYC	Lycée	16	chiffre
cmtnfcygu0007kw04sjn0oj4e	cmtnfcyel0000kw045oa97bhl	MAT	Maternelle	1	competences
cmtnfcylg000nkw04jem3egn2	cmtnfcyel0000kw045oa97bhl	PRIM	Primaire	5	chiffre
cmtnfcyq1001bkw04ba0izmwj	cmtnfcyel0000kw045oa97bhl	COLL	Collège	11	chiffre
cmtnfcytv001vkw04w5j9wm7d	cmtnfcyel0000kw045oa97bhl	LYC	Lycée	16	chiffre
\.


--
-- Data for Name: DeliberationConseil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DeliberationConseil" (id, "conseilId", "eleveId", decision, mention, "appreciationGenerale", "objectifSuivant", avis) FROM stdin;
cmtmh4lsp00epuhmciy1a8fxu	cmtmh4jvu00ejuhmci6a5kn46	cmtmh2wzr004buhmc9crpu0t6	passage	felicitations	Excellent trimestre, travail rigoureux.	Maintenir le rythme en T2.	\N
\.


--
-- Data for Name: DemandeCompte; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DemandeCompte" (id, "ecoleId", "utilisateurId", type, "roleDemande", motivation, statut, "dateDemande", "dateDecision", "traiteParId", "motifRefus", "sourceIp") FROM stdin;
cmtn4ca9g0003jo04ulgrmq2q	cmtmh278b0004uhmc9ijeasvj	cmtn4ca8l0001jo0403oo9z87	personnel	comptabilite	\N	en_attente	2026-09-04 15:38:31.54	\N	\N	\N	197.149.244.47
\.


--
-- Data for Name: DemandeEffacement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DemandeEffacement" (id, "ecoleId", "utilisateurId", "cibleType", "cibleId", motif, description, statut, "dateDemande", "dateTraitement", "traiteParId", "donneesAnonymisees") FROM stdin;
\.


--
-- Data for Name: Depense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Depense" (id, "ecoleId", categorie, description, montant, devise, "dateDepense", fournisseur, "justificatifUrl", "creeParId", validee, "valideeParId", "dateValidation", annulee, "updatedAt") FROM stdin;
cmtmh3gys008vuhmcy1qumyl0	cmtmh278b0004uhmc9ijeasvj	Fournitures bureau	Achat papier + cartouches imprimante	4500000	XOF	2026-09-12 00:00:00	Sénégal Boutique	\N	\N	t	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:47:49.154	f	2026-09-04 04:47:49.156
\.


--
-- Data for Name: Devoir; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Devoir" (id, "ecoleId", "classeId", "matiereId", "enseignantId", intitule, description, "dateAssignation", "dateRendu", sur, coefficient, type, "pieceJointeUrl", statut, "cahierTexteId") FROM stdin;
cmtmh4i5w00ebuhmcut6k4p73	cmtmh278b0004uhmc9ijeasvj	cmtmh2io40027uhmco5514if6	cmtmh2kl7002nuhmcair5l2ws	cmtmh2k9y002luhmcsd3wk406	Devoir maison n°1 — Fractions	Exercices 1 à 5 page 23.	2026-08-15 00:00:00	2026-08-22 00:00:00	20	1	dm	\N	corrige	\N
\.


--
-- Data for Name: Dispense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Dispense" (id, "ecoleId", "eleveId", "matiereId", motif, description, "dateDebut", "dateFin", "justificatifUrl", statut, "valideParId", "dateValidation") FROM stdin;
cmtmh4mfj00etuhmc06o6ynkr	cmtmh278b0004uhmc9ijeasvj	cmtmh2xxf004juhmcwe9ylhvx	cmtmh2lkk002tuhmcq1h82y0i	medical	Asthme sévère — dispense d'EPS pour 4 semaines.	2026-08-15 00:00:00	2026-09-15 00:00:00	/uploads/certif-medical-eps.pdf	validee	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:48:42.894
\.


--
-- Data for Name: DocumentEleve; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DocumentEleve" (id, "eleveId", type, "fichierUrl", confidentiel, "dateAjout", "ajouteParId") FROM stdin;
cmtmh69y100j1uhmctr59j5ep	cmtmh2wzr004buhmc9crpu0t6	acte_naissance	/uploads/docs/acte-diop.pdf	f	2026-09-04 04:50:00.025	cmtmh2b61000tuhmcb913gwgr
cmtmh6a9b00j3uhmcnpo8jx9y	cmtmh2xm3004fuhmcgntcpsvf	certificat_medical	/uploads/docs/cert-med.pdf	t	2026-09-04 04:50:00.431	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: DocumentGenere; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DocumentGenere" (id, "ecoleId", "templateId", "cibleType", "cibleId", titre, format, "fichierUrl", "tailleOctets", version, "genereParId", "dateGeneration", "hashContenu") FROM stdin;
cmtmh5eoc00hyuhmctqzu5dlz	cmtmh278b0004uhmc9ijeasvj	cmtmh5ecv00hwuhmc6wecf04o	bulletin	demo-bulletin-1	Bulletin T1 - DIOP Awa - 6A	pdf	/documents/bulletin-demo.pdf	245000	1	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:49:19.5	sha256-demo-1
\.


--
-- Data for Name: DomainePersonnalise; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DomainePersonnalise" (id, "ecoleId", domaine, verifie, "enAttente", "enregistrementCname", "certificatSSL", "certificatExpireLe", "dateAjout", "dateVerification") FROM stdin;
cmtmh598500hbuhmcej8mfusd	cmtmh278b0004uhmc9ijeasvj	ecole.vinci.sn	t	f	vinci.platforme.com.	letsencrypt	2026-11-20 00:00:00	2026-08-01 00:00:00	2026-08-01 00:00:00
\.


--
-- Data for Name: EcheanceFrais; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EcheanceFrais" (id, "eleveId", "fraisId", montant, remise, "motifRemise", devise, "dateEcheance", "montantPaye", statut, source, "dateCreation", "updatedAt") FROM stdin;
cmtmh3dcd007tuhmcjsjbr14m	cmtmh2wzr004buhmc9crpu0t6	cmtmh3ck7007puhmceph7z1ct	7500000	0	\N	XOF	2026-09-15 00:00:00	7500000	payee	\N	2026-09-04 04:47:44.461	2026-09-04 04:47:44.461
cmtmh3dnj007vuhmccto32ble	cmtmh2wzr004buhmc9crpu0t6	cmtmh3d6q007ruhmcra14itn5	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:47:44.863	2026-09-04 04:47:44.863
cmtmh3dt6007xuhmc9od0oaie	cmtmh2xm3004fuhmcgntcpsvf	cmtmh3ck7007puhmceph7z1ct	7500000	0	\N	XOF	2026-09-15 00:00:00	7500000	payee	\N	2026-09-04 04:47:45.067	2026-09-04 04:47:45.067
cmtmh3dys007zuhmchpktrig6	cmtmh2xm3004fuhmcgntcpsvf	cmtmh3d6q007ruhmcra14itn5	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:47:45.269	2026-09-04 04:47:45.269
cmtmh3e4e0081uhmc4mn39oz4	cmtmh2xxf004juhmcwe9ylhvx	cmtmh3ck7007puhmceph7z1ct	7500000	0	\N	XOF	2026-09-15 00:00:00	7500000	payee	\N	2026-09-04 04:47:45.471	2026-09-04 04:47:45.471
cmtmh3ea00083uhmcfdoxl0bk	cmtmh2xxf004juhmcwe9ylhvx	cmtmh3d6q007ruhmcra14itn5	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:47:45.672	2026-09-04 04:47:45.672
cmtmh3efq0085uhmcdgf8fifq	cmtmh2y8r004nuhmcunq3tc6y	cmtmh3ck7007puhmceph7z1ct	7500000	0	\N	XOF	2026-09-15 00:00:00	4000000	partiel	\N	2026-09-04 04:47:45.878	2026-09-04 04:47:45.878
cmtmh3eld0087uhmcttpcmq88	cmtmh2y8r004nuhmcunq3tc6y	cmtmh3d6q007ruhmcra14itn5	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:47:46.082	2026-09-04 04:47:46.082
cmtmh3ewr008buhmchz8rfkyz	cmtmh2yk1004ruhmcb5bdx13g	cmtmh3d6q007ruhmcra14itn5	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:47:46.491	2026-09-04 04:47:46.491
cmtmh3f2f008duhmcsq37w4vn	cmtmh2yvu004vuhmcp3m1bkwz	cmtmh3ck7007puhmceph7z1ct	7500000	0	\N	XOF	2026-08-27 04:47:46.694	0	impayee	\N	2026-09-04 04:47:46.696	2026-09-04 04:47:46.696
cmtmh3f84008fuhmcy7hbqhzr	cmtmh2zbm004zuhmcx6q0pmyw	cmtmh3ck7007puhmceph7z1ct	7500000	0	\N	XOF	2026-08-09 04:47:46.899	3000000	partiel	\N	2026-09-04 04:47:46.9	2026-09-04 04:47:46.9
cmtmh3fdt008huhmc5ro0c1yi	cmtmh2zmv0053uhmcahccrcf8	cmtmh3ck7007puhmceph7z1ct	7500000	0	\N	XOF	2026-09-16 04:47:47.104	0	impayee	\N	2026-09-04 04:47:47.106	2026-09-04 04:47:47.106
cmtmh3fjj008juhmcoy1x2tpe	cmtmh2zy20057uhmccluf8ocy	cmtmh3ck7007puhmceph7z1ct	7500000	0	\N	XOF	2026-09-16 04:47:47.31	7500000	payee	\N	2026-09-04 04:47:47.312	2026-09-04 04:47:47.312
cmtmhabxc001puhdk93kabqdp	cmtmh2wzr004buhmc9crpu0t6	cmtmh3ck7007puhmceph7z1ct	3750000	375000	Fratrie (10% — 2 enfants)	XOF	2027-01-15 00:00:00	1736328	partiel	échéancier personnalisé	2026-09-04 04:53:09.217	2026-09-04 04:53:14.662
cmtmhac8n001ruhdk4297ffuk	cmtmh2wzr004buhmc9crpu0t6	cmtmh3ck7007puhmceph7z1ct	3750000	375000	Fratrie (10% — 2 enfants)	XOF	2027-02-15 00:00:00	0	impayee	échéancier personnalisé	2026-09-04 04:53:09.624	2026-09-04 04:53:14.867
cmtmh3er40089uhmcdugai0l7	cmtmh2yk1004ruhmcb5bdx13g	cmtmh3ck7007puhmceph7z1ct	7500000	0	\N	XOF	2026-08-16 04:47:46.285	1250000	partiel	\N	2026-09-04 04:47:46.288	2026-09-04 04:47:46.288
cmtpvnda7004nuhi44z7cd8an	cmtmh2wzr004buhmc9crpu0t6	cmtpvnchd004luhi4emfe3spj	1950000	0	\N	XOF	2026-11-05 00:00:00	0	impayee	Cantine 2026-10 (Adepo Ade, 13 repas)	2026-09-06 13:58:30.655	2026-09-06 13:58:30.655
cmtpvndrt004puhi4yna55qkz	cmtmh2zy20057uhmccluf8ocy	cmtpvnchd004luhi4emfe3spj	2640000	0	\N	XOF	2026-11-05 00:00:00	0	impayee	Cantine 2026-10 (Kane Moussa, 22 repas)	2026-09-06 13:58:31.29	2026-09-06 13:58:31.29
cmtpvng8p004tuhi4t4y5zalz	cmtmh2y8r004nuhmcunq3tc6y	cmtpvnfrk004ruhi4rzvjlhjf	1500000	0	\N	XOF	2026-11-05 00:00:00	0	impayee	Transport 2026-10 — ligne Ligne Nord — Plateau (Cissé Omar)	2026-09-06 13:58:34.489	2026-09-06 13:58:34.489
\.


--
-- Data for Name: Ecole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Ecole" (id, nom, slug, pays, devise, "fuseauHoraire", "logoUrl", "dateCreation", statut, "deletedAt", "planCourantId") FROM stdin;
cmtmh278b0004uhmc9ijeasvj	Institut Léonard de Vinci	vinci	SN	XOF	Africa/Dakar	\N	2026-09-04 04:46:49.88	actif	\N	cmtmh26qr0001uhmcd4zri6kz
cmtmh6qdx00lkuhmchendtvn1	Cours Secondaire Étoile	etoile-demo	SN	XOF	Africa/Dakar	\N	2026-09-04 04:50:21.333	essai	\N	\N
cmtnebu1g0000l704ty18jg4n	Écoles Martis	ecoles-martis	SN	XOF	Africa/Dakar	\N	2026-09-04 20:18:06.676	actif	\N	\N
cmtnfcyel0000kw045oa97bhl	601	601	SN	XOF	Africa/Dakar	\N	2026-09-04 20:46:58.605	actif	\N	\N
cmtptuels003zuhas1fcuzhxm	RegressionV2 École C	regression-q-mtptue1i	SN	XOF	Africa/Dakar	\N	2026-09-06 13:07:59.727	essai	\N	\N
cmtpu6nak0041uhdw9a2m83nx	RegressionV2 École C	regression-q-mtpu6mya	SN	XOF	Africa/Dakar	\N	2026-09-06 13:17:30.86	essai	\N	\N
cmtpt4jje003xuhrovckola8o	RegressionV2 École C	regression-q-mtpt4j6n	SN	XOF	Africa/Dakar	\N	2026-09-06 12:47:53.066	essai	\N	\N
cmtpthz0v0041uhp8mgmbzrxv	RegressionV2 École C	regression-q-mtpthygs	SN	XOF	Africa/Dakar	\N	2026-09-06 12:58:19.663	essai	\N	\N
cmtpug5k0003xuh28gy15jkaq	RegressionV2 École C	regression-q-mtpug57k	SN	XOF	Africa/Dakar	\N	2026-09-06 13:24:54.432	essai	\N	\N
cmtpuox59003zuh9gbtcj5jt9	RegressionV2 École C	regression-q-mtpuowsi	SN	XOF	Africa/Dakar	\N	2026-09-06 13:31:43.437	essai	\N	\N
cmtpvau73003zuhvst5w93j0n	RegressionV2 École C	regression-q-mtpvatrj	SN	XOF	Africa/Dakar	\N	2026-09-06 13:48:46.047	essai	\N	\N
\.


--
-- Data for Name: EcritureComptable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EcritureComptable" (id, "ecoleId", "journalId", date, "numeroPiece", libelle, statut, "valideParId", "dateValidation", "pieceJustificativeUrl") FROM stdin;
cmtmh4p4900feuhmct7v74dix	cmtmh278b0004uhmc9ijeasvj	cmtmh4osd00fcuhmcaizsvygb	2026-08-05 00:00:00	ACH-2026-001	Achat fournitures bureau	valide	cmtmh2b61000tuhmcb913gwgr	2026-08-05 00:00:00	\N
cmtpvmnox0037uhi4ouh48xa4	cmtmh278b0004uhmc9ijeasvj	cmtmh4osd00fcuhmcaizsvygb	2026-06-04 04:47:47.514	ENC-mcxw73b0sb	Encaissement REF-0--3-1788497267517	valide	cmtmh2b61000tuhmcb913gwgr	2026-09-06 13:57:57.487	\N
cmtpvmoon003cuhi4vxs50kxt	cmtmh278b0004uhmc9ijeasvj	cmtmh4osd00fcuhmcaizsvygb	2026-07-04 04:47:47.93	ENC-mc5bkfwhdy	Encaissement REF-1--2-1788497267930	valide	cmtmh2b61000tuhmcb913gwgr	2026-09-06 13:57:58.773	\N
cmtpvmphu003huhi4qatbma8f	cmtmh278b0004uhmc9ijeasvj	cmtmh4osd00fcuhmcaizsvygb	2026-08-04 04:47:48.133	ENC-mc1424tojs	Encaissement REF-2--1-1788497268133	valide	cmtmh2b61000tuhmcb913gwgr	2026-09-06 13:57:59.825	\N
cmtpvmqam003muhi48lwbhi78	cmtmh278b0004uhmc9ijeasvj	cmtmh4osd00fcuhmcaizsvygb	2026-09-04 04:47:48.746	ENC-mcsxwko4gr	Encaissement REF-3-0-1788497268746	valide	cmtmh2b61000tuhmcb913gwgr	2026-09-06 13:58:00.86	\N
cmtpvmr3s003ruhi43vime665	cmtmh278b0004uhmc9ijeasvj	cmtmh4osd00fcuhmcaizsvygb	2026-08-04 04:47:48.948	ENC-mca5mmadeu	Encaissement REF-8--1-1788497268948	valide	cmtmh2b61000tuhmcb913gwgr	2026-09-06 13:58:01.911	\N
cmtpvms8r003wuhi4uxf7gv7v	cmtmh278b0004uhmc9ijeasvj	cmtmh4osd00fcuhmcaizsvygb	2026-09-12 00:00:00	DEP-mcy1qumyl0	Dépense : Achat papier + cartouches imprimante	valide	cmtmh2b61000tuhmcb913gwgr	2026-09-06 13:58:03.384	\N
\.


--
-- Data for Name: Eleve; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Eleve" (id, "ecoleId", matricule, nom, prenom, "dateNaissance", "lieuNaissance", sexe, "photoUrl", statut, "dateInscription", "dateSortie", "motifSortie", "classeActuelleId", adresse, allergies, "conditionMedicale", "contactUrgence", "consentementPortailEleve", "consentementPortailEleveDate", "consentementPhotoInterne", "consentementPhotoExterne", "utilisateurId", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmtmh2y8r004nuhmcunq3tc6y	cmtmh278b0004uhmc9ijeasvj	EL-0004	Omar	Cissé	2007-04-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2io40027uhmco5514if6	\N	\N	\N	\N	t	2026-09-15 00:00:00	t	f	\N	2026-09-04 04:47:24.891	2026-09-06 13:50:22.862	\N
cmtmh2yk1004ruhmcb5bdx13g	cmtmh278b0004uhmc9ijeasvj	EL-0005	Khadija	Dieng	2006-05-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2io40027uhmco5514if6	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:47:25.297	2026-09-06 13:50:23.116	\N
cmtmh2zbm004zuhmcx6q0pmyw	cmtmh278b0004uhmc9ijeasvj	EL-0007	Sokhna	Faye	2004-07-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2j520029uhmcakkepakv	\N	\N	\N	\N	t	2026-09-15 00:00:00	t	f	\N	2026-09-04 04:47:26.29	2026-09-06 13:50:23.323	\N
cmtmh2zmv0053uhmcahccrcf8	cmtmh278b0004uhmc9ijeasvj	EL-0008	Awa	Gueye	2003-08-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2j520029uhmcakkepakv	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:47:26.695	2026-09-06 13:50:23.676	\N
cmtmh2zy20057uhmccluf8ocy	cmtmh278b0004uhmc9ijeasvj	EL-0009	Moussa	Kane	2002-09-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2j520029uhmcakkepakv	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:47:27.098	2026-09-06 13:50:24.595	\N
cmtmh316y005buhmcs0ygq3sc	cmtmh278b0004uhmc9ijeasvj	EL-0010	Astou	Mbaye	2001-10-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2jap002buhmccif5empg	\N	\N	\N	\N	f	\N	t	f	\N	2026-09-04 04:47:28.714	2026-09-06 13:50:25.093	\N
cmtmh31i6005fuhmczi53pjoe	cmtmh278b0004uhmc9ijeasvj	EL-0011	Ibou	Sarr	2000-11-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2jap002buhmccif5empg	\N	\N	\N	\N	f	\N	f	t	\N	2026-09-04 04:47:29.119	2026-09-06 13:50:26.199	\N
cmtmh31tf005juhmcrx0hufc6	cmtmh278b0004uhmc9ijeasvj	EL-0012	Mariama	Sylla	1999-12-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2jap002buhmccif5empg	\N	\N	\N	\N	f	\N	f	f	\N	2026-09-04 04:47:29.523	2026-09-06 13:50:26.407	\N
cmtmh2yvu004vuhmcp3m1bkwz	cmtmh278b0004uhmc9ijeasvj	EL-0006	Pape	Diop	2005-06-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2j520029uhmcakkepakv	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	t	cmtmh38su006zuhmc9t70opxs	2026-09-04 04:47:25.722	2026-09-06 13:50:26.805	\N
cmtmh2wzr004buhmc9crpu0t6	cmtmh278b0004uhmc9ijeasvj	EL-0001	Ade	Adepo	2010-01-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2io40027uhmco5514if6	\N	\N	\N	\N	t	2026-09-15 00:00:00	t	t	\N	2026-09-04 04:47:23.272	2026-09-06 13:50:27.376	\N
cmtpvo98c005nuhi4f410x9g8	cmtmh278b0004uhmc9ijeasvj	EL-0014	ANONYMISÉ-a9f6a889	Élève	2013-01-01 00:00:00	\N	F	\N	sorti	2026-09-06 13:59:12.059	2026-09-06 13:59:15.859	RGPD — anonymisation (cmtpvoat7005suhi4n8mkbetq)	\N	\N	\N	\N	\N	f	\N	f	f	\N	2026-09-06 13:59:12.061	2026-09-06 13:59:15.861	2026-09-06 13:59:15.859
cmtmh2xm3004fuhmcgntcpsvf	cmtmh278b0004uhmc9ijeasvj	EL-0002	Idriss	Bello	2009-02-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2io40027uhmco5514if6	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:47:24.075	2026-09-06 13:50:21.247	\N
cmtmh2xxf004juhmcwe9ylhvx	cmtmh278b0004uhmc9ijeasvj	EL-0003	Aminata	Camara	2008-03-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmh2io40027uhmco5514if6	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:47:24.483	2026-09-06 13:50:22.456	\N
\.


--
-- Data for Name: EleveHistoriqueClasse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EleveHistoriqueClasse" (id, "eleveId", "classeId", "dateEntree", "dateSortie", motif) FROM stdin;
cmtmh69bg00ixuhmcg2qqh3dn	cmtmh2wzr004buhmc9crpu0t6	cmtmh2j520029uhmcakkepakv	2025-09-01 00:00:00	2026-06-30 00:00:00	Passage en classe supérieure
cmtmh69s700izuhmczd9mwmpv	cmtmh2yvu004vuhmcp3m1bkwz	cmtmh2io40027uhmco5514if6	2025-09-01 00:00:00	2026-06-30 00:00:00	Réorientation
cmtmh2xax004duhmcc5iveslg	cmtmh2wzr004buhmc9crpu0t6	cmtmh2io40027uhmco5514if6	2026-09-01 00:00:00	2026-09-06 12:49:39.095	Clôture année 2026-2027
cmtmh2xrs004huhmcl3ftestf	cmtmh2xm3004fuhmcgntcpsvf	cmtmh2io40027uhmco5514if6	2026-09-01 00:00:00	2026-09-06 12:49:46.071	Clôture année 2026-2027
cmtmh2y30004luhmc9g01e5g0	cmtmh2xxf004juhmcwe9ylhvx	cmtmh2io40027uhmco5514if6	2026-09-01 00:00:00	2026-09-06 12:49:47.645	Clôture année 2026-2027
cmtmh2yeg004puhmc5ox8pbs5	cmtmh2y8r004nuhmcunq3tc6y	cmtmh2io40027uhmco5514if6	2026-09-01 00:00:00	2026-09-06 12:49:48.286	Clôture année 2026-2027
cmtmh2ypn004tuhmcaa0gzppd	cmtmh2yk1004ruhmcb5bdx13g	cmtmh2io40027uhmco5514if6	2026-09-01 00:00:00	2026-09-06 12:49:49.02	Clôture année 2026-2027
cmtmh2zh80051uhmcafo76dmm	cmtmh2zbm004zuhmcx6q0pmyw	cmtmh2j520029uhmcakkepakv	2026-09-01 00:00:00	2026-09-06 12:49:50.097	Clôture année 2026-2027
cmtmh2zsg0055uhmckdotvxrg	cmtmh2zmv0053uhmcahccrcf8	cmtmh2j520029uhmcakkepakv	2026-09-01 00:00:00	2026-09-06 12:49:50.315	Clôture année 2026-2027
cmtmh30if0059uhmcjysxraa7	cmtmh2zy20057uhmccluf8ocy	cmtmh2j520029uhmcakkepakv	2026-09-01 00:00:00	2026-09-06 12:49:50.584	Clôture année 2026-2027
cmtmh31ck005duhmcvgx0wgia	cmtmh316y005buhmcs0ygq3sc	cmtmh2jap002buhmccif5empg	2026-09-01 00:00:00	2026-09-06 12:49:51.219	Clôture année 2026-2027
cmtmh31ns005huhmcsvx0zq97	cmtmh31i6005fuhmczi53pjoe	cmtmh2jap002buhmccif5empg	2026-09-01 00:00:00	2026-09-06 12:49:52.805	Clôture année 2026-2027
cmtmh31z1005luhmc8x4c4bf5	cmtmh31tf005juhmcrx0hufc6	cmtmh2jap002buhmccif5empg	2026-09-01 00:00:00	2026-09-06 12:49:53.541	Clôture année 2026-2027
cmtmh2z5z004xuhmc5dw7atzu	cmtmh2yvu004vuhmcp3m1bkwz	cmtmh2j520029uhmcakkepakv	2026-09-01 00:00:00	2026-09-06 12:49:54.531	Clôture année 2026-2027
\.


--
-- Data for Name: EleveParent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EleveParent" ("eleveId", "parentId", "autoriteParentale") FROM stdin;
cmtmh2wzr004buhmc9crpu0t6	cmtmh32c5005puhmczpgn7nma	t
cmtmh2xm3004fuhmcgntcpsvf	cmtmh335d005tuhmcag91xin0	t
cmtmh2xxf004juhmcwe9ylhvx	cmtmh33nn005xuhmcc111uv93	t
cmtmh2y8r004nuhmcunq3tc6y	cmtmh34620061uhmceyy3wdi7	t
cmtmh2yk1004ruhmcb5bdx13g	cmtmh34os0065uhmcw6xk8znm	t
cmtmh2yvu004vuhmcp3m1bkwz	cmtmh357d0069uhmcdk556k4i	t
cmtmh2zbm004zuhmcx6q0pmyw	cmtmh35pq006duhmccwxxcaxy	t
cmtmh2zmv0053uhmcahccrcf8	cmtmh36dz006huhmcwy1ypa0s	t
cmtmh2zy20057uhmccluf8ocy	cmtmh36wz006luhmcbhmy92f9	t
cmtmh316y005buhmcs0ygq3sc	cmtmh37fe006puhmcorvy618m	t
cmtmh31i6005fuhmczi53pjoe	cmtmh37xj006tuhmcv6cfe14w	t
cmtmh31tf005juhmcrx0hufc6	cmtmh38g5006xuhmcdq3xeyp7	t
cmtmh31tf005juhmcrx0hufc6	cmtmh32c5005puhmczpgn7nma	t
\.


--
-- Data for Name: EmailLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmailLog" (id, "ecoleId", destinataire, sujet, message, statut, erreur, "dateEnvoi", "dateCreation") FROM stdin;
cmtmh718700n9uhmcmi5ldjhf	cmtmh278b0004uhmc9ijeasvj	famille.diop@example.com	Relance échéance	Bonjour, l'échéance de scolarité T1 est attendue.	en_attente	\N	\N	2026-09-04 04:50:35.384
\.


--
-- Data for Name: EmploiTemps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmploiTemps" (id, "ecoleId", "classeId", "enseignantId", "matiereId", "salleId", jour, "heureDebut", "heureFin", "recurrenceRule", "dateDebut", "dateFin", statut, "creeParId", "dateCreation", "updatedAt") FROM stdin;
cmtmh4gx700e6uhmcstmnfrfm	cmtmh278b0004uhmc9ijeasvj	cmtmh2io40027uhmco5514if6	cmtmh2k9y002luhmcsd3wk406	cmtmh2kl7002nuhmcair5l2ws	cmtmh3hr8008wuhmct2kes5ay	lundi	08:00	10:00	FREQ=WEEKLY;UNTIL=20270630;BYDAY=MO	2026-09-01 00:00:00	2027-06-30 00:00:00	actif	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:48:35.755	2026-09-06 13:50:30.099
\.


--
-- Data for Name: EntreeCahierTexte; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EntreeCahierTexte" (id, "cahierTexteId", "seanceId", "dateCours", contenu, "travailAFaire", "ressourcesUrl", statut, "valideParId", "dateValidation") FROM stdin;
cmtmh4jk300ehuhmc7a5mzn3n	cmtmh4j8y00efuhmc4a8e6y0n	\N	2026-08-15 00:00:00	Chapitre 1 : Nombres décimaux — cours magistral + exercices d'application.	DM n°1 page 23 ex. 1-5.	\N	publie	cmtmh2b61000tuhmcb913gwgr	2026-08-15 00:00:00
\.


--
-- Data for Name: EntretienRecrutement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EntretienRecrutement" (id, "candidatureId", date, lieu, type, intervieweurs, "compteRendu", note, statut) FROM stdin;
cmtmh4e4j00dsuhmc4q8b6bao	cmtmh4d7400douhmcx042hfij	2026-08-25 10:00:00	Salle de conférence	physique	\N	Bon profil, maîtrise pédagogique solide. À confirmer par la direction.	4	realise
\.


--
-- Data for Name: Etage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Etage" (id, "batimentId", numero, libelle, "planUrl") FROM stdin;
cmtmh5g8h00i7uhmceh675kqg	cmtmh5fxb00i5uhmc7l8j92fp	0	Rez-de-chaussée	\N
cmtmh5gjn00i9uhmchx4jdur9	cmtmh5fxb00i5uhmc7l8j92fp	1	Premier étage	\N
\.


--
-- Data for Name: EtapeAdmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EtapeAdmission" (id, "candidatureId", etape, statut, date, "valideParId", commentaire) FROM stdin;
cmtmh4foo00e1uhmchf1s2bk4	cmtmh4fdi00e0uhmcocwjwhac	depot_dossier	valide	2026-08-01 00:00:00	\N	\N
cmtmh4foo00e2uhmcvdyc7lf1	cmtmh4fdi00e0uhmcocwjwhac	test_admission	en_attente	2026-08-25 00:00:00	\N	\N
\.


--
-- Data for Name: EtapeRecrutement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EtapeRecrutement" (id, "candidatureId", etape, statut, date, note, "decideurId") FROM stdin;
cmtmh4dic00dpuhmc23rfkjuu	cmtmh4d7400douhmcx042hfij	tri_cv	valide	2026-08-10 00:00:00	\N	\N
cmtmh4dic00dquhmcjc32xce9	cmtmh4d7400douhmcx042hfij	entretien_rh	valide	2026-08-15 00:00:00	\N	\N
\.


--
-- Data for Name: Evaluation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Evaluation" (id, "ecoleId", "classeId", "matiereId", "enseignantId", type, intitule, date, sur, coefficient, "periodeId", statut, "calculeDansMoyenne", "createdAt", "updatedAt") FROM stdin;
cmtmh399u0071uhmcodn3izqo	cmtmh278b0004uhmc9ijeasvj	cmtmh2io40027uhmco5514if6	cmtmh2kl7002nuhmcair5l2ws	cmtmh2k9y002luhmcsd3wk406	devoir	Devoir 1 - Nombres décimaux	2026-09-25 00:00:00	20	1	cmtmh2jgb002duhmcys0dqtnx	planifiee	t	2026-09-04 04:47:39.186	2026-09-04 04:47:39.186
cmtmh3anw0073uhmcfhn7gs6y	cmtmh278b0004uhmc9ijeasvj	cmtmh2io40027uhmco5514if6	cmtmh2lkk002tuhmcq1h82y0i	cmtmh2lex002ruhmchh9li2y5	composition	Composition T1 - Récit	2026-10-05 00:00:00	20	2	cmtmh2jgb002duhmcys0dqtnx	planifiee	t	2026-09-04 04:47:40.988	2026-09-04 04:47:40.988
\.


--
-- Data for Name: EvaluationCompetence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EvaluationCompetence" (id, "eleveId", "competenceId", "periodeId", "niveauAcquisition", commentaire, "evalueParId", date) FROM stdin;
cmtmh6hij00kguhmcgadvv34h	cmtmh316y005buhmcs0ygq3sc	cmtmh6h1600kduhmci4p268l0	cmtmh2jgb002duhmcys0dqtnx	maitrise	Fluidité remarquable.	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:50:09.836
cmtmh6hij00khuhmc4unr490w	cmtmh316y005buhmcs0ygq3sc	cmtmh6hcw00kfuhmc9g4esyf5	cmtmh2jgb002duhmcys0dqtnx	acquis	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:50:09.836
cmtmh6hij00kiuhmctf2jv7to	cmtmh31i6005fuhmczi53pjoe	cmtmh6h1600kduhmci4p268l0	cmtmh2jgb002duhmcys0dqtnx	en_cours_d_acquisition	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:50:09.836
cmtmh6hij00kjuhmcyvtsx02g	cmtmh31tf005juhmcrx0hufc6	cmtmh6hcw00kfuhmc9g4esyf5	cmtmh2jgb002duhmcys0dqtnx	non_acquis	Besoin d'un soutien ciblé.	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:50:09.836
cmtpvnxzz005duhi4qsk96zfa	cmtmh2y8r004nuhmcunq3tc6y	cmtmh46uz00cruhmck77uxejq	cmtmh2jgb002duhmcys0dqtnx	acquis	\N	cmtmh2b61000tuhmcb913gwgr	2026-09-06 13:58:57.501
\.


--
-- Data for Name: EvaluationPersonnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EvaluationPersonnel" (id, "personnelId", "evaluateurId", periode, criteres, "commentaireGlobal", "dateEvaluation") FROM stdin;
cmtmh6bd600jbuhmckluqgnzt	cmtmh2k9y002luhmcsd3wk406	cmtmh2b61000tuhmcb913gwgr	2025-2026	{"pedagogie":17,"assiduite":19,"travail_equipe":16,"communication_parents":15}	Excellente implication pédagogique. Points d'appui : rigueur, suivi individualisé.	2026-09-04 04:50:01.866
\.


--
-- Data for Name: ExamenOfficiel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExamenOfficiel" (id, "ecoleId", nom, "anneeScolaireId", "niveauId", "dateDebut", "dateFin") FROM stdin;
cmtmh3kcd0096uhmcr9nq435e	cmtmh278b0004uhmc9ijeasvj	BEPC 2027	cmtmh2bh9000vuhmcm08pmhfh	cmtmh2gdk001xuhmc07jaccir	2027-06-15 00:00:00	2027-06-22 00:00:00
cmtmh3knm0098uhmc63r87ren	cmtmh278b0004uhmc9ijeasvj	BAC 2027	cmtmh2bh9000vuhmcm08pmhfh	cmtmh2hul0025uhmc1cpd9auz	2027-07-01 00:00:00	2027-07-12 00:00:00
\.


--
-- Data for Name: ExportDonnees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExportDonnees" (id, "ecoleId", "utilisateurId", "cibleType", "cibleId", format, statut, "fichierUrl", "tailleOctets", "dateDemande", "dateGeneration", "dateExpiration") FROM stdin;
cmtmh57zh00h3uhmcxc8aq2gw	cmtmh278b0004uhmc9ijeasvj	\N	eleve	cmtmh2wzr004buhmc9crpu0t6	json	genere	/exports/eleve-export-demo.json	84000	2026-09-04 04:49:10.828	2026-09-04 04:49:10.828	2026-09-11 04:49:10.828
\.


--
-- Data for Name: FactureFournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FactureFournisseur" (id, "ecoleId", "fournisseurId", numero, "dateEmission", "dateReception", "dateEcheance", "montantHT", "montantTVA", "montantTTC", devise, statut, "controleeParId", "dateControle", "fichierUrl", "commandeId") FROM stdin;
cmtmh4xxg00fruhmc0dxzbm55	cmtmh278b0004uhmc9ijeasvj	cmtmh4q2q00fiuhmc3a3hkj48	FAC-F1-2026-008	2026-08-13 00:00:00	2026-08-14 00:00:00	2026-09-14 00:00:00	22200000	1800000	24000000	XOF	payee	cmtmh2b61000tuhmcb913gwgr	2026-08-15 00:00:00	\N	cmtmh4r1g00fkuhmcm66vmn9w
\.


--
-- Data for Name: FactureSaas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FactureSaas" (id, "ecoleId", "abonnementId", periode, montant, devise, statut, "modePaiement", "dateEmission", "datePaiement") FROM stdin;
cmtmh27ut0008uhmckxver8a2	cmtmh278b0004uhmc9ijeasvj	cmtmh27jm0006uhmcwu6s7rxd	2026-08	6500000	XOF	payee	virement	2026-09-04 04:46:50.693	2026-08-05 00:00:00
\.


--
-- Data for Name: FeatureFlag; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeatureFlag" (id, code, description, "actifGlobal", "rolloutPourcentage", "dateCreation", "dateMaj") FROM stdin;
cmtmh5a0200heuhmcrd6w2cdo	module_paie	Active le module de paie RH	f	0	2026-09-04 04:49:13.442	2026-09-04 04:49:13.442
\.


--
-- Data for Name: FeatureFlagEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeatureFlagEcole" (id, "featureFlagId", "ecoleId", actif, "dateActivation") FROM stdin;
cmtmh5ab900hguhmcvhhq8t2k	cmtmh5a0200heuhmcrd6w2cdo	cmtmh278b0004uhmc9ijeasvj	t	2026-09-04 04:49:13.843
\.


--
-- Data for Name: FeuilleRoute; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeuilleRoute" (id, "ecoleId", "ligneId", date, statut, commentaire, "retardMin") FROM stdin;
cmtmh6teb00m4uhmci0njt2o0	cmtmh278b0004uhmc9ijeasvj	cmtmh3qwy00akuhmc60kzc1y2	2026-09-04 00:00:00	en_cours	\N	18
\.


--
-- Data for Name: FicheSante; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FicheSante" (id, "ecoleId", "eleveId", "groupeSanguin", allergies, "traitementsEnCours", antecedents, "medecinTraitant", "telephoneUrgence", "contactUrgenceNom", "autorisationTraitement", "dateMiseAJour", "misAJourParId") FROM stdin;
cmtmh6mvt00l7uhmcimj6cakx	cmtmh278b0004uhmc9ijeasvj	cmtmh2wzr004buhmc9crpu0t6	O+	Arachides (réaction cutanée)	Aucun	\N	Dr. Ndiaye — Cabinet Horizon	+221 77 123 45 67	Parent Adepo	t	2026-09-10 00:00:00	cmtmh2b61000tuhmcb913gwgr
cmtmh6o6f00l9uhmcj2w6aszy	cmtmh278b0004uhmc9ijeasvj	cmtmh2yvu004vuhmcp3m1bkwz	A+	Pénicilline	Ventoline ( inhalateur conservé à l'infirmerie )	Asthme léger depuis 2022	Dr. Sow — Clinique Baobab	+221 76 555 12 34	Parent Diop	t	2026-09-12 00:00:00	cmtmh2b61000tuhmcb913gwgr
cmtmh6ohm00lbuhmc9qyxe41g	cmtmh278b0004uhmc9ijeasvj	cmtmh2zmv0053uhmcahccrcf8	B+	Aucune connue	\N	\N	Dr. Ndiaye — Cabinet Horizon	+221 78 900 11 22	Parent Gueye	f	2026-09-15 00:00:00	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: Fournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Fournisseur" (id, "ecoleId", nom, type, contact, email, telephone, adresse, rib, siret, statut, "dateCreation") FROM stdin;
cmtmh4q2q00fiuhmc3a3hkj48	cmtmh278b0004uhmc9ijeasvj	ScolairePro SARL	fournisseur_prestataire	M. Fall	contact@scolairepro.sn	+221 33 860 00 00	Médina, Dakar	SN12 010 010 010123456789 00	SN123456789	actif	2026-09-04 04:48:47.618
\.


--
-- Data for Name: Frais; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Frais" (id, "ecoleId", libelle, type, montant, devise, periodicite, "niveauId", "anneeScolaireId", "updatedAt") FROM stdin;
cmtmh3ck7007puhmceph7z1ct	cmtmh278b0004uhmc9ijeasvj	Frais de scolarité - Trimestre 1	scolarite	7500000	XOF	trimestriel	\N	cmtmh2bh9000vuhmcm08pmhfh	2026-09-04 04:47:43.446
cmtmh3d6q007ruhmcra14itn5	cmtmh278b0004uhmc9ijeasvj	Frais d'inscription	inscription	2500000	XOF	unique	\N	cmtmh2bh9000vuhmcm08pmhfh	2026-09-04 04:47:44.258
cmtpvnchd004luhi4emfe3spj	cmtmh278b0004uhmc9ijeasvj	Cantine — 2026-10	cantine	0	XOF	mensuel	\N	cmtmh2bh9000vuhmcm08pmhfh	2026-09-06 13:58:29.616
cmtpvnfrk004ruhi4rzvjlhjf	cmtmh278b0004uhmc9ijeasvj	Transport — 2026-10	transport	0	XOF	mensuel	\N	cmtmh2bh9000vuhmcm08pmhfh	2026-09-06 13:58:33.872
cmtpvnopi004zuhi4mjssgyvp	cmtmh278b0004uhmc9ijeasvj	Pénalités de bibliothèque	activite	0	XOF	unique	\N	cmtmh2bh9000vuhmcm08pmhfh	2026-09-06 13:58:45.462
\.


--
-- Data for Name: GarderieInscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GarderieInscription" (id, "ecoleId", "eleveId", formule, "tarifHoraire", actif) FROM stdin;
cmtmh6va500miuhmcwilwmkh4	cmtmh278b0004uhmc9ijeasvj	cmtmh2zbm004zuhmcx6q0pmyw	horaire	150000	t
cmtmh6vlc00mkuhmcmfjqlxmw	cmtmh278b0004uhmc9ijeasvj	cmtmh2zmv0053uhmcahccrcf8	horaire	150000	t
cmtmh9v9v000xuhdkgd29fjbp	cmtmh278b0004uhmc9ijeasvj	cmtmh2wzr004buhmc9crpu0t6	horaire	200000	t
\.


--
-- Data for Name: GarderieSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GarderieSession" (id, "ecoleId", "eleveId", date, "heureArrivee", "heureDepart", "minutesFacturees") FROM stdin;
\.


--
-- Data for Name: HabilitationPenale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HabilitationPenale" (id, "ecoleId", "personnelId", "numeroHabilitation", "dateDelivrance", "dateExpiration", "autoriteEmettrice", statut) FROM stdin;
cmtmh4a0c00dauhmc3hr6zr71	cmtmh278b0004uhmc9ijeasvj	cmtmh2k9y002luhmcsd3wk406	HAB-2026-0421	2026-08-01 00:00:00	2027-08-01 00:00:00	Tribunal de Dakar	validee
\.


--
-- Data for Name: Incident; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Incident" (id, "eleveId", "dateHeure", lieu, type, description, gravite, "declareParId", temoins) FROM stdin;
cmtmh3kt9009auhmcgzmutl3n	cmtmh2xm3004fuhmcgntcpsvf	2026-09-18 00:00:00	Cour	comportement	Retards répétés en cours de mathématiques	leger	cmtmh2k4c002juhmcu8bjec0z	\N
\.


--
-- Data for Name: InscriptionExamenOfficiel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InscriptionExamenOfficiel" (id, "examenOfficielId", "eleveId", "numeroTable", "centreExamen", statut, resultat, "amenagementAppliqueId", "certificatUrl") FROM stdin;
cmtmh6k1d00kouhmczbomkwin	cmtmh3kcd0096uhmcr9nq435e	cmtmh2wzr004buhmc9crpu0t6	SN-2027-00142	CEM Kennedy, Dakar	inscrit	\N	\N	\N
cmtmh6k1d00kpuhmc1u7ck2q1	cmtmh3kcd0096uhmcr9nq435e	cmtmh2xm3004fuhmcgntcpsvf	SN-2027-00143	CEM Kennedy, Dakar	convoque	\N	\N	\N
\.


--
-- Data for Name: JetonAuth; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JetonAuth" (id, "utilisateurId", email, type, "tokenHash", "expireLe", utilise, "dateUtilisation", "dateCreation", "adresseIp", "userAgent") FROM stdin;
cmtmh54ju00gruhmc7xdi08y7	\N	editeur@platforme.com	reset_password	hash-jeton-reset-1	2026-09-04 05:49:06.373	f	\N	2026-09-04 04:49:06.373	\N	\N
cmtmh54uz00gsuhmcsh2psqhr	\N	direction@vinci.sn	reset_password	hash-jeton-reset-demo	2026-09-04 05:49:06.778	f	\N	2026-09-04 04:49:06.778	\N	\N
cmtmh550l00gtuhmcft9bqvh8	\N	direction@vinci.sn	verify_email	hash-jeton-verify-demo	2026-09-11 04:49:06.979	t	2026-09-04 04:49:06.979	2026-09-04 04:49:06.979	\N	\N
cmtpw06jt0004uhyo1w6frihu	cmtpw02gf0002uhyo4bcb3sgp	anglesmorts@test.sn	reset_password	a894116477b5b788707c4f69570499beb43fd25c5d858ec2cf369e3bc49b7fc4	2026-09-06 14:38:28.454	t	2026-09-06 14:08:29.71	2026-09-06 14:08:28.457	\N	\N
\.


--
-- Data for Name: JournalComptable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JournalComptable" (id, "ecoleId", code, libelle, type) FROM stdin;
cmtmh4osd00fcuhmcaizsvygb	cmtmh278b0004uhmc9ijeasvj	ACH	Journal des achats	achat
\.


--
-- Data for Name: JustificationAbsence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JustificationAbsence" (id, "ecoleId", "eleveId", "presenceId", "dateAbsence", "dureeHeures", motif, description, "justificatifUrl", statut, "soumisParId", "valideParId", "dateSoumission", "dateValidation", "commentaireValidation") FROM stdin;
cmtmh4mqs00evuhmcnpisjve1	cmtmh278b0004uhmc9ijeasvj	cmtmh2xm3004fuhmcgntcpsvf	\N	2026-08-20 00:00:00	4	maladie	Fièvre — certificat médical fourni.	/uploads/certif-medical-absence.pdf	valide	cmtmh2b61000tuhmcb913gwgr	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:48:43.3	2026-09-04 04:48:43.299	Justificatif accepté.
\.


--
-- Data for Name: LigneBudget; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneBudget" (id, "budgetId", categorie, "sousCategorie", libelle, "montantPrevu", "montantRealise", devise, "pourcentageRealise", "dateDerniereMaj") FROM stdin;
cmtmh4nd600eyuhmch9lpwx4h	cmtmh4n2100exuhmcd0y14jsk	recettes	frais_scolarite	Frais de scolarité	500000000	150000000	XOF	0	2026-09-04 04:48:44.107
cmtmh4nd600ezuhmc9ssk2y2v	cmtmh4n2100exuhmcd0y14jsk	recettes	subventions	Subvention État	80000000	40000000	XOF	0	2026-09-04 04:48:44.107
cmtmh4nd600f0uhmcryrah22l	cmtmh4n2100exuhmcd0y14jsk	depenses	salaries	Salaires & charges	350000000	87500000	XOF	0	2026-09-04 04:48:44.107
cmtmh4nd600f1uhmc7jrdjfct	cmtmh4n2100exuhmcd0y14jsk	depenses	fonctionnement	Fonctionnement (eau/électricité/fournitures)	60000000	15000000	XOF	0	2026-09-04 04:48:44.107
cmtmh4nd600f2uhmcreksrdqr	cmtmh4n2100exuhmcd0y14jsk	depenses	equipement	Équipements informatiques	120000000	0	XOF	0	2026-09-04 04:48:44.107
\.


--
-- Data for Name: LigneBulletinPaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneBulletinPaie" (id, "bulletinId", type, libelle, montant, sens, quantite, taux) FROM stdin;
cmtmh4ank00dduhmczgxv8z2x	cmtmh4abg00dcuhmcbhyalhcr	salaire_base	Salaire de base (35h)	25000000	plus	\N	\N
cmtmh4ank00deuhmc8gdnqes0	cmtmh4abg00dcuhmcbhyalhcr	prime	Prime d'ancienneté	1500000	plus	\N	\N
cmtmh4ank00dfuhmcwbbtve68	cmtmh4abg00dcuhmcbhyalhcr	indemnite	Indemnité de transport	1000000	plus	\N	\N
cmtmh4ank00dguhmc6d8uo7fn	cmtmh4abg00dcuhmcbhyalhcr	heures_sup	Heures supplémentaires (4h à 125%)	500000	plus	4	125000
cmtpvlq5p0008uhi4u466py2e	cmtpvlpu80006uhi4drk9i0uk	salaire_base	Salaire de base	35000000	plus	\N	\N
cmtpvlqi7000auhi48t0ty3d3	cmtpvlpu80006uhi4drk9i0uk	prime	Prime de transport	100000	plus	\N	\N
cmtpvlrng000guhi42znoidg1	cmtpvlrhn000euhi4g8al6bnv	salaire_base	Salaire de base	35000000	plus	\N	\N
cmtpvlrt8000iuhi4u2lxosui	cmtpvlrhn000euhi4g8al6bnv	prime	Prime de transport	100000	plus	\N	\N
cmtpvlspg000ouhi4zjwl22ti	cmtpvlsju000muhi4cbwx4vao	salaire_base	Salaire de base	35000000	plus	\N	\N
cmtpvlsv6000quhi4fkrf2r1v	cmtpvlsju000muhi4cbwx4vao	prime	Prime de transport	100000	plus	\N	\N
cmtpvltpj000wuhi4i4lymq0w	cmtpvltjq000uuhi4ivygt7jp	salaire_base	Salaire de base	35000000	plus	\N	\N
cmtpvltv9000yuhi46t4c2tmv	cmtpvltjq000uuhi4ivygt7jp	prime	Prime de transport	100000	plus	\N	\N
cmtpvlup60014uhi4urmfkk1z	cmtpvluhx0012uhi4hmu75cpz	salaire_base	Salaire de base	35000000	plus	\N	\N
cmtpvluzr0016uhi4tmzncwkr	cmtpvluhx0012uhi4hmu75cpz	prime	Prime de transport	100000	plus	\N	\N
cmtpvlwd5001cuhi4xg8px181	cmtpvlw6x001auhi4u8gqlusf	salaire_base	Salaire de base	35000000	plus	\N	\N
cmtpvlwit001euhi4d0w5dm4z	cmtpvlw6x001auhi4u8gqlusf	prime	Prime de transport	100000	plus	\N	\N
cmtpvlxby001kuhi4vwkrha9n	cmtpvlx61001iuhi4cru530o7	salaire_base	Salaire de base	28000000	plus	\N	\N
cmtpvlxhn001muhi4kj51mk1y	cmtpvlx61001iuhi4cru530o7	prime	Prime de transport	100000	plus	\N	\N
cmtpvlysm001suhi44xkh0v0x	cmtpvlyl1001quhi4hw686k2t	salaire_base	Salaire de base	32000000	plus	\N	\N
cmtpvlyzi001uuhi46hk0joij	cmtpvlyl1001quhi4hw686k2t	prime	Prime de transport	100000	plus	\N	\N
cmtpvm0780020uhi4q7g7a5ah	cmtpvlzx5001yuhi4xuv9oc0u	salaire_base	Salaire de base	34000000	plus	\N	\N
cmtpvm0fu0022uhi42y76yn63	cmtpvlzx5001yuhi4xuv9oc0u	prime	Prime de transport	100000	plus	\N	\N
cmtpvm1p90028uhi47w1ytino	cmtpvm1i10026uhi4wu2qrg18	salaire_base	Salaire de base	22000000	plus	\N	\N
cmtpvm1vh002auhi4wux5t8a6	cmtpvm1i10026uhi4wu2qrg18	prime	Prime de transport	100000	plus	\N	\N
cmtpvm2sx002guhi48yjz5z00	cmtpvm2jr002euhi4f16tijsw	salaire_base	Salaire de base	24000000	plus	\N	\N
cmtpvm2yq002iuhi4gnj521gb	cmtpvm2jr002euhi4f16tijsw	prime	Prime de transport	100000	plus	\N	\N
cmtpvm4mb002ouhi4q8elcw4q	cmtpvm4g6002muhi4zys5uh2g	salaire_base	Salaire de base	30000000	plus	\N	\N
cmtpvm4rz002quhi4hyb8qfwi	cmtpvm4g6002muhi4zys5uh2g	prime	Prime de transport	100000	plus	\N	\N
cmtpvm5qj002wuhi4kkuta687	cmtpvm5i4002uuhi4g4vpyqbh	salaire_base	Salaire de base	23000000	plus	\N	\N
cmtpvm606002yuhi46tknwmn2	cmtpvm5i4002uuhi4g4vpyqbh	prime	Prime de transport	100000	plus	\N	\N
\.


--
-- Data for Name: LigneCommande; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneCommande" (id, "commandeId", designation, quantite, unite, "prixUnitaire", "montantLigne", recu) FROM stdin;
cmtmh4so400fluhmc2k7q59dt	cmtmh4r1g00fkuhmcm66vmn9w	Cahiers 200 pages (x100)	100	unite	80000	8000000	t
cmtmh4so400fmuhmcw0jxmh80	cmtmh4r1g00fkuhmcm66vmn9w	Stylos bille bleus (x500)	500	unite	10000	5000000	t
cmtmh4so400fnuhmcr4zoii5z	cmtmh4r1g00fkuhmcm66vmn9w	Calculatrices scientifiques (x20)	20	unite	550000	11000000	f
\.


--
-- Data for Name: LigneEcriture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneEcriture" (id, "ecritureId", "compteId", libelle, debit, credit) FROM stdin;
cmtmh4pfh00ffuhmclher3yd4	cmtmh4p4900feuhmct7v74dix	cmtmh4oms00fauhmcanmvvoqk	Fournitures bureau	15000000	0
cmtmh4pfh00fguhmczxmc974u	cmtmh4p4900feuhmct7v74dix	cmtmh4o0900f4uhmcq5njgxqn	Règlement par virement	0	15000000
cmtpvmnox0039uhi4akn02xnb	cmtpvmnox0037uhi4ouh48xa4	cmtmh4o0900f4uhmcq5njgxqn	Banque	10000000	0
cmtpvmnox003auhi4r7m8n4wa	cmtpvmnox0037uhi4ouh48xa4	cmtmh4oh700f8uhmcveykjmlm	Recettes scolarité	0	10000000
cmtpvmoon003euhi4wrh2su0f	cmtpvmoon003cuhi4vxs50kxt	cmtmh4o0900f4uhmcq5njgxqn	Banque	10000000	0
cmtpvmoon003fuhi4q0i8pube	cmtpvmoon003cuhi4vxs50kxt	cmtmh4oh700f8uhmcveykjmlm	Recettes scolarité	0	10000000
cmtpvmphu003juhi4lmzoxxms	cmtpvmphu003huhi4qatbma8f	cmtmh4o0900f4uhmcq5njgxqn	Banque	10000000	0
cmtpvmphu003kuhi4o7ahmcuc	cmtpvmphu003huhi4qatbma8f	cmtmh4oh700f8uhmcveykjmlm	Recettes scolarité	0	10000000
cmtpvmqam003ouhi4gvlznvv4	cmtpvmqam003muhi48lwbhi78	cmtmh4o0900f4uhmcq5njgxqn	Banque	4000000	0
cmtpvmqam003puhi4no8b360v	cmtpvmqam003muhi48lwbhi78	cmtmh4oh700f8uhmcveykjmlm	Recettes scolarité	0	4000000
cmtpvmr3s003tuhi4f4d02s34	cmtpvmr3s003ruhi43vime665	cmtmh4o0900f4uhmcq5njgxqn	Banque	7500000	0
cmtpvmr3s003uuhi4v4pjmuj3	cmtpvmr3s003ruhi43vime665	cmtmh4oh700f8uhmcveykjmlm	Recettes scolarité	0	7500000
cmtpvms8r003yuhi4y3mr7gdg	cmtpvms8r003wuhi4uxf7gv7v	cmtmh4oms00fauhmcanmvvoqk	Fournitures bureau	4500000	0
cmtpvms8r003zuhi4zri26jf2	cmtpvms8r003wuhi4uxf7gv7v	cmtmh4o0900f4uhmcq5njgxqn	Banque	0	4500000
\.


--
-- Data for Name: LigneReleve; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneReleve" (id, "ecoleId", date, montant, libelle, rapprochee, "paiementId") FROM stdin;
cmtmh6zz100n7uhmc14v3bjls	cmtmh278b0004uhmc9ijeasvj	2026-08-30 04:50:33.756	45000000	Subvention fonctionnement T4	f	\N
cmtmh6zz100n5uhmcsovg1zmp	cmtmh278b0004uhmc9ijeasvj	2026-06-06 04:50:33.756	10000000	Virement scolarité — guichet 1	t	cmtmh3fpc008luhmcxw73b0sb
cmtmh6zz100n6uhmcw4atw7bq	cmtmh278b0004uhmc9ijeasvj	2026-07-06 04:50:33.756	10000000	Virement scolarité — guichet 2	t	cmtmh3g0r008nuhmc5bkfwhdy
\.


--
-- Data for Name: ListeFourniture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ListeFourniture" (id, "niveauId", "anneeScolaireId", contenu, publiee, "datePublication") FROM stdin;
cmtmh6l4l00kvuhmchojnilfu	cmtmh2fwh001ruhmcq6gplxq7	cmtmh2bh9000vuhmcm08pmhfh	[{"article":"Cahier 200 pages","quantite":6},{"article":"Classeur à levier","quantite":2},{"article":"Calculatrice collège","quantite":1},{"article":"Kit géométrie","quantite":1}]	t	2026-08-20 00:00:00
cmtmh6lm100kxuhmcuqrjxian	cmtmh2fl9001nuhmcql4dktof	cmtmh2bh9000vuhmcm08pmhfh	[{"article":"Cahier 96 pages","quantite":8},{"article":"Livre de lecture imposé","quantite":1}]	f	\N
\.


--
-- Data for Name: ManuelScolaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ManuelScolaire" (id, "ecoleId", titre, "matiereId", "niveauId", editeur, "anneeEdition", "quantiteStock") FROM stdin;
cmtmh3ods00a2uhmcpua1xmca	cmtmh278b0004uhmc9ijeasvj	Mathématiques 6e — Collection Triangle	cmtmh2kl7002nuhmcair5l2ws	cmtmh2fwh001ruhmcq6gplxq7	Nathan	2024	40
\.


--
-- Data for Name: Matiere; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Matiere" (id, "ecoleId", code, libelle, coefficient, couleur) FROM stdin;
cmtmh2kl7002nuhmcair5l2ws	cmtmh278b0004uhmc9ijeasvj	MATHS	Mathématiques	1	#10b981
cmtmh2lkk002tuhmcq1h82y0i	cmtmh278b0004uhmc9ijeasvj	FR	Français	1	#10b981
cmtmh2m9a002zuhmckj61ccqk	cmtmh278b0004uhmc9ijeasvj	HG	Histoire-Géographie	1	#10b981
cmtmh2n980035uhmccs3utepv	cmtmh278b0004uhmc9ijeasvj	PC	Physique-Chimie	1	#10b981
cmtmh2o8x003buhmcerigpu04	cmtmh278b0004uhmc9ijeasvj	ANG	Anglais	1	#10b981
cmtmh2ox1003huhmclfqgqfpb	cmtmh278b0004uhmc9ijeasvj	EPS	EPS	1	#10b981
\.


--
-- Data for Name: MembreConseil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembreConseil" (id, "conseilId", "utilisateurId", role, present, observation) FROM stdin;
cmtmh4kns00eluhmcgp85exjo	cmtmh4jvu00ejuhmci6a5kn46	cmtmh2b61000tuhmcb913gwgr	president	t	\N
cmtmh4ln300enuhmch853amqg	cmtmh4jvu00ejuhmci6a5kn46	cmtmh2k4c002juhmcu8bjec0z	enseignant	t	\N
\.


--
-- Data for Name: MembreEquipeEducatif; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembreEquipeEducatif" (id, "planAccompagnementId", "utilisateurId", role, "dateInclusion") FROM stdin;
cmtmh5c7e00hpuhmc8p2yjja5	cmtmh5bvw00houhmc40uzze16	cmtmh2b61000tuhmcb913gwgr	referent	2026-08-10 00:00:00
cmtmh5c7e00hquhmcsjcf6z7s	cmtmh5bvw00houhmc40uzze16	cmtmh2k4c002juhmcu8bjec0z	enseignant	2026-08-10 00:00:00
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Message" (id, "conversationId", "expediteurId", contenu, "dateEnvoi", supprime, "luPar") FROM stdin;
cmtmh503k00g1uhmc0994c5b2	cmtmh4z6400fxuhmc1jmhtjhe	cmtmh2b61000tuhmcb913gwgr	Bonjour, merci de préparer le conseil de classe T1 pour le 15/10.	2026-09-04 04:49:00.607	f	\N
\.


--
-- Data for Name: MesureProtection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MesureProtection" (id, "signalementId", type, description, "decideePar", "dateDecision", "dateFin", statut) FROM stdin;
cmtmh492200d4uhmcoanl1uww	cmtmh48qy00d2uhmc2hnqx6pu	accompagnement_psychologique	Mise en place d'un suivi psychologue scolaire hebdomadaire.	Direction	2026-09-04 04:48:25.561	\N	planifiee
\.


--
-- Data for Name: ModeleMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ModeleMessage" (id, "ecoleId", code, sujet, corps, canaux, langue, actif) FROM stdin;
cmtmh3mc6009iuhmc6z9c58qp	cmtmh278b0004uhmc9ijeasvj	rappel_echeance	Rappel : échéance de frais à venir	Bonjour {{parent_prenom}}, l'échéance de {{frais_libelle}} pour {{eleve_prenom}} {{eleve_nom}} est attendue pour le {{echeance_date}}. Montant : {{echeance_montant}}.	["sms","email","in_app"]	fr	t
cmtmh3mne009kuhmccl0twssl	cmtmh278b0004uhmc9ijeasvj	bulletin_publie	Bulletin {{periode}} disponible	Le bulletin {{periode}} de {{eleve_prenom}} {{eleve_nom}} est disponible sur le portail parent.	["email","in_app"]	fr	t
cmtmh3mt0009muhmcjnjqz1n3	cmtmh278b0004uhmc9ijeasvj	absence_signalee	Absence signalée	{{eleve_prenom}} {{eleve_nom}} a été absent(e) au cours de {{matiere_libelle}} le {{seance_date}}.	["sms","in_app"]	fr	t
\.


--
-- Data for Name: MouvementStock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MouvementStock" (id, "articleId", type, quantite, motif, "dateMouvement", "effectueParId") FROM stdin;
cmtmh3qg400aguhmc8v9fqy5d	cmtmh3pzg00aeuhmcoosjjddf	entree	300	Achat rentrée scolaire	2026-09-04 04:48:01.445	cmtmh2b61000tuhmcb913gwgr
cmtmh3qrd00aiuhmc8pcsa3ch	cmtmh3pzg00aeuhmcoosjjddf	sortie	50	Distribution classes primaires	2026-09-04 04:48:01.849	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: Niveau; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Niveau" (id, "sectionId", code, libelle, ordre) FROM stdin;
cmtmh2e1f0017uhmcmq523s58	cmtmh2cki0015uhmcwmzhjp1w	PS	Petite Section	1
cmtmh2ei30019uhmc36n7cvna	cmtmh2cki0015uhmcwmzhjp1w	MS	Moyenne Section	2
cmtmh2eno001buhmciwrqcfha	cmtmh2cki0015uhmcwmzhjp1w	GS	Grande Section	3
cmtmh2eyw001fuhmcv2p72i73	cmtmh2eta001duhmc0nrolsbm	CP	Cours Préparatoire	4
cmtmh2f4i001huhmck8t9jgx2	cmtmh2eta001duhmc0nrolsbm	CE1	Cours Élémentaire 1	5
cmtmh2fa3001juhmc7rxd2xrk	cmtmh2eta001duhmc0nrolsbm	CE2	Cours Élémentaire 2	6
cmtmh2ffp001luhmcxuyg09zc	cmtmh2eta001duhmc0nrolsbm	CM1	Cours Moyen 1	7
cmtmh2fl9001nuhmcql4dktof	cmtmh2eta001duhmc0nrolsbm	CM2	Cours Moyen 2	8
cmtmh2fwh001ruhmcq6gplxq7	cmtmh2fqu001puhmccj4wbxpc	6E	Sixième	9
cmtmh2g21001tuhmcgk27bex7	cmtmh2fqu001puhmccj4wbxpc	5E	Cinquième	10
cmtmh2g7t001vuhmc9azsl8ic	cmtmh2fqu001puhmccj4wbxpc	4E	Quatrième	11
cmtmh2gdk001xuhmc07jaccir	cmtmh2fqu001puhmccj4wbxpc	3E	Troisième	12
cmtmh2h0h0021uhmcai5n7nig	cmtmh2gj8001zuhmcq3aniqto	2NDE	Seconde	13
cmtmh2h620023uhmcnopy23d5	cmtmh2gj8001zuhmcq3aniqto	1ERE	Première	14
cmtmh2hul0025uhmc1cpd9auz	cmtmh2gj8001zuhmcq3aniqto	TLE	Terminale	15
cmtnebu6b000bl7049hvinmpv	cmtnebu5f0009l7047brkuscp	PS	Petite section	2
cmtnebu85000fl704h0gp5asm	cmtnebu5f0009l7047brkuscp	MS	Moyenne section	3
cmtnebu8w000jl704h7p1wjoi	cmtnebu5f0009l7047brkuscp	GS	Grande section	4
cmtnebuaf000rl704kv31aqxv	cmtnebua2000pl704znfwl8yq	CP	CP	6
cmtnebub7000vl704l6ggl63s	cmtnebua2000pl704znfwl8yq	CE1	CE1	7
cmtnebuby000zl704r5snz512	cmtnebua2000pl704znfwl8yq	CE2	CE2	8
cmtnebucp0013l704387nn6wp	cmtnebua2000pl704znfwl8yq	CM1	CM1	9
cmtnebudg0017l704v0ssnri9	cmtnebua2000pl704znfwl8yq	CM2	CM2	10
cmtnebuex001fl704yiuibtvz	cmtnebuej001dl7042a4vk5li	6E	Sixième	12
cmtnebufo001jl7043ck84jzy	cmtnebuej001dl7042a4vk5li	5E	Cinquième	13
cmtnebugf001nl704duack67b	cmtnebuej001dl7042a4vk5li	4E	Quatrième	14
cmtnebuh6001rl704u1ybk7lw	cmtnebuej001dl7042a4vk5li	3E	Troisième	15
cmtnebuio001zl7047go5v6fe	cmtnebuia001xl704t5dpy116	2NDE	Seconde	17
cmtnebujf0023l704lz6ilcyq	cmtnebuia001xl704t5dpy116	1ERE	Première	18
cmtnebuk60027l704mtyzeno0	cmtnebuia001xl704t5dpy116	TLE	Terminale	19
cmtnfcyid000bkw04yxr4mvde	cmtnfcyhl0009kw04j3vlm5qx	PS	Petite section	2
cmtnfcyjv000fkw04zzz1xrrb	cmtnfcyhl0009kw04j3vlm5qx	MS	Moyenne section	3
cmtnfcyko000jkw04h8dbv2ru	cmtnfcyhl0009kw04j3vlm5qx	GS	Grande section	4
cmtnfcym7000rkw04173mob4v	cmtnfcylt000pkw04u8v53bha	CP	CP	6
cmtnfcymz000vkw04vsyac18j	cmtnfcylt000pkw04u8v53bha	CE1	CE1	7
cmtnfcynq000zkw04zl5adz0c	cmtnfcylt000pkw04u8v53bha	CE2	CE2	8
cmtnfcyoh0013kw04brbkp31t	cmtnfcylt000pkw04u8v53bha	CM1	CM1	9
cmtnfcyp90017kw04w3lpbasx	cmtnfcylt000pkw04u8v53bha	CM2	CM2	10
cmtnfcyqs001fkw0497reme52	cmtnfcyqf001dkw04y4x90mre	6E	Sixième	12
cmtnfcyrk001jkw040unsnw86	cmtnfcyqf001dkw04y4x90mre	5E	Cinquième	13
cmtnfcysc001nkw04i316ua80	cmtnfcyqf001dkw04y4x90mre	4E	Quatrième	14
cmtnfcyt3001rkw04j4kyxowt	cmtnfcyqf001dkw04y4x90mre	3E	Troisième	15
cmtnfcyun001zkw04fcwp4sgb	cmtnfcyu9001xkw04ur6ejrqn	2NDE	Seconde	17
cmtnfcyvf0023kw042uo4j4tw	cmtnfcyu9001xkw04ur6ejrqn	1ERE	Première	18
cmtnfcyw60027kw04dd6opdvf	cmtnfcyu9001xkw04ur6ejrqn	TLE	Terminale	19
\.


--
-- Data for Name: Note; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Note" (id, "eleveId", "evaluationId", valeur, absent, dispense, commentaire, "saisiParId", "dateSaisie", "synchroniseDepuisHorsLigne") FROM stdin;
cmtmh3atr0075uhmc3e7enuie	cmtmh2wzr004buhmc9crpu0t6	cmtmh399u0071uhmcodn3izqo	16	f	f	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:47:41.199	f
cmtmh3b4x0077uhmcfx1nfaew	cmtmh2wzr004buhmc9crpu0t6	cmtmh3anw0073uhmcfhn7gs6y	18	f	f	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:47:41.601	f
cmtmh3baj0079uhmcvnf8gq8v	cmtmh2xm3004fuhmcgntcpsvf	cmtmh399u0071uhmcodn3izqo	15	f	f	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:47:41.803	f
cmtmh3bg5007buhmcl8la7ems	cmtmh2xm3004fuhmcgntcpsvf	cmtmh3anw0073uhmcfhn7gs6y	17	f	f	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:47:42.005	f
cmtmh3blq007duhmc23qmuhuo	cmtmh2xxf004juhmcwe9ylhvx	cmtmh399u0071uhmcodn3izqo	15	f	f	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:47:42.207	f
cmtmh3brz007fuhmcclx9zayv	cmtmh2xxf004juhmcwe9ylhvx	cmtmh3anw0073uhmcfhn7gs6y	12	f	f	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:47:42.432	f
cmtmh3bxl007huhmcsba8j2j3	cmtmh2y8r004nuhmcunq3tc6y	cmtmh399u0071uhmcodn3izqo	13	f	f	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:47:42.634	f
cmtmh3c38007juhmc8cuf7wo2	cmtmh2y8r004nuhmcunq3tc6y	cmtmh3anw0073uhmcfhn7gs6y	16	f	f	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:47:42.836	f
cmtmh3c8u007luhmczi8dclxu	cmtmh2yk1004ruhmcb5bdx13g	cmtmh399u0071uhmcodn3izqo	18	f	f	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:47:43.038	f
cmtmh3ceh007nuhmcdyvuv2pj	cmtmh2yk1004ruhmcb5bdx13g	cmtmh3anw0073uhmcfhn7gs6y	9	f	f	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:47:43.242	f
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "ecoleId", "destinataireType", "destinataireId", "modeleMessageId", sujet, corps, canal, statut, contexte, "dateCreation", "dateEnvoi", "dateLecture") FROM stdin;
cmtpu92ma008quhdwgrif8j01	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2k4c002juhmcu8bjec0z	\N	Rendez-vous annulé	Le rendez-vous du 2026-09-13 10:00-10:15 a été annulé par Maman Idriss.	in_app	envoye	\N	2026-09-06 13:19:24.034	2026-09-06 13:19:24.033	\N
cmtpui34t008muh28awy8gp6p	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2k4c002juhmcu8bjec0z	\N	Rendez-vous annulé	Le rendez-vous du 2026-09-13 10:00-10:15 a été annulé par Papa Ibou.	in_app	envoye	\N	2026-09-06 13:26:24.605	2026-09-06 13:26:24.604	\N
cmtpvnr0m0055uhi4ye7sdpo0	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2b61000tuhmcb913gwgr	\N	🚨 Signalement urgent — protection de l'enfance	Un signalement de type « harcelement » (gravité urgent) vient d'être enregistré. Accès réservé aux personnes habilitées.	in_app	envoye	\N	2026-09-06 13:58:48.454	2026-09-06 13:58:48.453	2026-09-06 13:58:58.332
cmtmhaihw001tuhdkhcux5n0w	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2b61000tuhmcb913gwgr	\N	Relance impayé (relance 2) — Dieng Khadija	Échéance « Frais de scolarité - Trimestre 1 » en retard de 19 jours. Restant dû : 75 000 XOF.	in_app	envoye	{"relance":"cmtmh3er40089uhmcdugai0l7-15"}	2026-09-04 04:53:17.732	2026-09-04 04:53:17.73	2026-09-06 13:58:58.332
cmtmhaj4q001vuhdk0x2h6odm	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2b61000tuhmcb913gwgr	\N	Relance impayé (relance 1) — Diop Pape	Échéance « Frais de scolarité - Trimestre 1 » en retard de 8 jours. Restant dû : 75 000 XOF.	in_app	envoye	{"relance":"cmtmh3f2f008duhmcsq37w4vn-7"}	2026-09-04 04:53:18.554	2026-09-04 04:53:18.552	2026-09-06 13:58:58.332
cmtmhajlr001xuhdkadaekuv6	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2b61000tuhmcb913gwgr	\N	Relance impayé (relance 2) — Faye Sokhna	Échéance « Frais de scolarité - Trimestre 1 » en retard de 26 jours. Restant dû : 45 000 XOF.	in_app	envoye	{"relance":"cmtmh3f84008fuhmcy7hbqhzr-15"}	2026-09-04 04:53:19.167	2026-09-04 04:53:19.165	2026-09-06 13:58:58.332
cmtpw1jll0013uhyo3ikmzws4	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2b61000tuhmcb913gwgr	\N	🚨 Signalement urgent — protection de l'enfance	Un signalement de type « harcelement » (gravité urgent) vient d'être enregistré. Accès réservé aux personnes habilitées.	in_app	envoye	\N	2026-09-06 14:09:32.026	2026-09-06 14:09:32.024	2026-09-06 14:09:41.674
cmtptwpcq008ouhaspigo0mno	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2k4c002juhmcu8bjec0z	\N	Rendez-vous annulé	Le rendez-vous du 2026-09-13 10:00-10:15 a été annulé par Maman Idriss.	in_app	envoye	\N	2026-09-06 13:09:46.97	2026-09-06 13:09:46.969	\N
cmtmh3nl1009suhmcdh59yu24	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2pwo003juhmc9w13xo2p	\N	3 échéances en retard à relancer	Retards de 8 à 26 jours — restant dû cumulé : 900 000 XOF.	in_app	envoye	\N	2026-09-04 04:47:57.734	2026-09-04 04:47:57.731	\N
cmtmh3nqo009uuhmcp7yh27ch	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2sjs003nuhmcleyf6m4i	\N	1 demande de congé en attente	Ousmane Diallo — congés annuels du 21/12 au 04/01, à valider.	in_app	envoye	\N	2026-09-04 04:47:57.937	2026-09-04 04:47:57.935	\N
cmtmh3nwd009wuhmc1zsbgg2d	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2tvz003vuhmcmuifhosf	\N	Appel non fait — CM2-A	2 séances planifiées ce matin, aucun pointage relevé. Relancer le titulaire.	in_app	envoye	\N	2026-09-04 04:47:58.141	2026-09-04 04:47:58.14	\N
cmtmh3o22009yuhmcrthuz4b8	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2upx003zuhmclzmrwabo	\N	2 candidatures à instruire	Dossiers complets reçus cette semaine — planifier les tests d'admission.	in_app	envoye	\N	2026-09-04 04:47:58.346	2026-09-04 04:47:58.345	\N
cmtmh3o7r00a0uhmcnff4l96j	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2w1v0047uhmcx0233oda	\N	Rappel vaccin à vérifier	1 vaccination enregistrée avec rappel dépassé — contacter la famille.	in_app	envoye	\N	2026-09-04 04:47:58.551	2026-09-04 04:47:58.55	\N
cmtpur9g9008ouh9g2jcd6wnr	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2k4c002juhmcu8bjec0z	\N	Rendez-vous annulé	Le rendez-vous du 2026-09-13 10:00-10:15 a été annulé par Maman Idriss.	in_app	envoye	\N	2026-09-06 13:33:32.698	2026-09-06 13:33:32.697	\N
cmtpvey7h008suhvsw4efxawa	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2k4c002juhmcu8bjec0z	\N	Rendez-vous annulé	Le rendez-vous du 2026-09-13 10:00-10:15 a été annulé par Maman Omar.	in_app	envoye	\N	2026-09-06 13:51:57.869	2026-09-06 13:51:57.868	\N
cmtpt933j008quhror2gr6rew	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2k4c002juhmcu8bjec0z	\N	Rendez-vous annulé	Le rendez-vous du 2026-09-13 10:00-10:15 a été annulé par Papa Moussa.	in_app	envoye	\N	2026-09-06 12:51:25.039	2026-09-06 12:51:25.038	\N
cmtmh3myn009ouhmcm27mx3it	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2b61000tuhmcb913gwgr	cmtmh3mc6009iuhmc6z9c58qp	Rappel : 2 échéances impayées à relancer	Les familles Diop, Sylla et Kane ont des échéances de scolarité impayées depuis le 15/09. Relance recommandée.	in_app	envoye	\N	2026-09-04 04:47:56.927	2026-09-04 04:47:56.925	2026-09-06 13:58:58.332
cmtmh3n9t009quhmctswnz4dt	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2b61000tuhmcb913gwgr	\N	Nouvelle inscription validée	Astou Mbaye a été inscrite en CM2-A. Inscription validée par Awa Diop.	in_app	envoye	\N	2026-09-04 04:47:57.329	2026-09-04 04:47:57.327	2026-09-06 13:58:58.332
cmtmh9em0000fuhdkdt1wzapb	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2b61000tuhmcb913gwgr	\N	🚌 Retard transport — ligne Vague3 Ligne	Retard de 25 min à l'arrêt prévu 07:00 (passé à 07:25).	in_app	envoye	\N	2026-09-04 04:52:26.04	2026-09-04 04:52:26.039	2026-09-06 13:58:58.332
cmtptkocv008quhp8f6xmstt1	cmtmh278b0004uhmc9ijeasvj	personnel	cmtmh2k4c002juhmcu8bjec0z	\N	Rendez-vous annulé	Le rendez-vous du 2026-09-13 10:00-10:15 a été annulé par Papa Ade.	in_app	envoye	\N	2026-09-06 13:00:25.807	2026-09-06 13:00:25.805	\N
\.


--
-- Data for Name: ObjectifPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ObjectifPlan" (id, "planAccompagnementId", description, domaine, indicateurs, echeance, atteint, "dateEvaluation") FROM stdin;
cmtmh5dqg00hsuhmctqk5fndb	cmtmh5bvw00houhmc40uzze16	Disponibilité permanente de l'inhalateur en classe	therapeutique	\N	2026-09-30 00:00:00	t	2026-09-04 04:49:18.279
\.


--
-- Data for Name: OffreEmploi; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OffreEmploi" (id, "ecoleId", poste, description, "profilRecherche", "typeContrat", "dateOuverture", "dateCloture", statut, lieu) FROM stdin;
cmtmh4cvv00dmuhmcko14ouxh	cmtmh278b0004uhmc9ijeasvj	Enseignant Mathématiques (collège-lycée)	Poste à temps plein en mathématiques pour les classes 5e à Terminale.	Master Mathématiques + CAPES/AGREG. 3 ans d'expérience.	CDI	2026-08-01 00:00:00	2026-09-30 00:00:00	ouverte	Dakar
\.


--
-- Data for Name: Paiement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Paiement" (id, "ecoleId", "eleveId", "parentId", montant, devise, "modePaiement", "referenceTransaction", "datePaiement", "encaisseParId", "recuUrl", annule, "dateAnnulation", "motifAnnulation", "annuleParId") FROM stdin;
cmtpurco7008quh9g69bvkg4p	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPURC00-0D87EF	2026-09-06 13:33:36.872	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:33:39.526	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpui5ua008ouh28v4i2gykn	cmtmh278b0004uhmc9ijeasvj	cmtmh2yk1004ruhmcb5bdx13g	\N	100000	XOF	espece	PAY-MTPUI57F-86FB0D	2026-09-06 13:26:28.114	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:26:30.396	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpui8v0008quh28zfe2vnbp	cmtmh278b0004uhmc9ijeasvj	cmtmh2yk1004ruhmcb5bdx13g	\N	100000	XOF	espece	PAY-MTPUI88B-B78F7E	2026-09-06 13:26:32.028	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:26:34.48	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpuic17008suh28rf0hm5ro	cmtmh278b0004uhmc9ijeasvj	cmtmh2yk1004ruhmcb5bdx13g	\N	100000	XOF	espece	PAY-MTPUIBDX-CE065C	2026-09-06 13:26:36.139	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:26:38.411	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpurg4i008suh9g0hte203w	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPURFGD-0E8010	2026-09-06 13:33:41.346	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:33:43.799	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpurjkf008uuh9g4tflge1r	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPURIVO-E64735	2026-09-06 13:33:45.807	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:33:48.486	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpvf2n9008uuhvsj5s64zll	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPVF1H9-C678EB	2026-09-06 13:52:03.622	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:52:06.879	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpvf6ue008wuhvsp6mm2hny	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPVF5UY-578E50	2026-09-06 13:52:09.063	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:52:11.759	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpvfayn008yuhvszfnn7dlg	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPVF9LY-77B94F	2026-09-06 13:52:14.399	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:52:17.912	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtmh3fpc008luhmcxw73b0sb	cmtmh278b0004uhmc9ijeasvj	cmtmh2wzr004buhmc9crpu0t6	\N	10000000	XOF	espece	REF-0--3-1788497267517	2026-06-04 04:47:47.514	cmtmh2b61000tuhmcb913gwgr	\N	f	\N	\N	\N
cmtmh3g0r008nuhmc5bkfwhdy	cmtmh278b0004uhmc9ijeasvj	cmtmh2xm3004fuhmcgntcpsvf	\N	10000000	XOF	mobile_money	REF-1--2-1788497267930	2026-07-04 04:47:47.93	cmtmh2b61000tuhmcb913gwgr	\N	f	\N	\N	\N
cmtmh3g6e008puhmc1424tojs	cmtmh278b0004uhmc9ijeasvj	cmtmh2xxf004juhmcwe9ylhvx	\N	10000000	XOF	virement	REF-2--1-1788497268133	2026-08-04 04:47:48.133	cmtmh2b61000tuhmcb913gwgr	\N	f	\N	\N	\N
cmtmh3gnf008ruhmcsxwko4gr	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	4000000	XOF	espece	REF-3-0-1788497268746	2026-09-04 04:47:48.746	cmtmh2b61000tuhmcb913gwgr	\N	f	\N	\N	\N
cmtmh3gt1008tuhmca5mmadeu	cmtmh278b0004uhmc9ijeasvj	cmtmh2zy20057uhmccluf8ocy	\N	7500000	XOF	cheque	REF-8--1-1788497268948	2026-08-04 04:47:48.948	cmtmh2b61000tuhmcb913gwgr	\N	f	\N	\N	\N
cmtpt960e008suhropp0txz0x	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPT95DI-7B6AE5	2026-09-06 12:51:28.814	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 12:51:33.51	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpt9c0r008uuhroxfqjrle1	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPT9B0W-0DA413	2026-09-06 12:51:36.603	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 12:51:39.545	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpt9gdt008wuhroi5gm7b30	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPT9FCL-3898FE	2026-09-06 12:51:42.257	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 12:51:49.047	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtptwtf8008quhashbgeab9b	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPTWSJO-4307DE	2026-09-06 13:09:52.244	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:09:55.97	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtptkrg2008suhp8ofrjwewq	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPTKQRH-057C80	2026-09-06 13:00:29.811	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:00:32.324	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtptkvlq008uuhp8kidz7yzs	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPTKUG8-DDA315	2026-09-06 13:00:35.198	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:00:38.107	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtptl2w8008wuhp80c1jjih1	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPTKYII-142AF4	2026-09-06 13:00:44.648	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:00:47.858	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtptwxl3008suhasv0hbecvf	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPTWWXP-77BACE	2026-09-06 13:09:57.639	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:10:00.515	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtptx446008uuhasb764ygr9	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPTX0OJ-E1B71A	2026-09-06 13:10:06.102	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:10:08.887	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpu95j4008suhdwcj8xipor	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPU94VH-6F0794	2026-09-06 13:19:27.809	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:19:30.136	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpu98sm008uuhdwi4uidtcd	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPU9854-F46D2D	2026-09-06 13:19:32.038	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:19:34.386	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
cmtpu9bxb008wuhdwqecnrcvk	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	\N	100000	XOF	espece	PAY-MTPU9B9S-A095D5	2026-09-06 13:19:36.095	cmtmh2b61000tuhmcb913gwgr	\N	t	2026-09-06 13:19:38.432	RegressionV2 ref unique	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: PaiementEcheance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaiementEcheance" ("paiementId", "echeanceId", "montantApplique") FROM stdin;
cmtmh3fpc008luhmcxw73b0sb	cmtmh3dcd007tuhmcjsjbr14m	7500000
cmtmh3fpc008luhmcxw73b0sb	cmtmh3dnj007vuhmccto32ble	2500000
\.


--
-- Data for Name: PaiementFournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaiementFournisseur" (id, "ecoleId", "factureId", "datePaiement", montant, devise, mode, reference, "payeParId") FROM stdin;
cmtmh4ye400ftuhmc4iytfjoi	cmtmh278b0004uhmc9ijeasvj	cmtmh4xxg00fruhmc0dxzbm55	2026-08-20 00:00:00	24000000	XOF	virement	VIR-2026-042	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: ParentTuteur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ParentTuteur" (id, "ecoleId", "utilisateurId", nom, prenom, telephone, email, profession, "lienAvecEleve") FROM stdin;
cmtpvn5cl004fuhi4nalm8g91	cmtmh278b0004uhmc9ijeasvj	\N	Test	Parent	+221 77 000 00 00	anglesmorts.cand@test.sn	\N	tuteur_legal
cmtpw11k1000puhyo34qteowy	cmtmh278b0004uhmc9ijeasvj	\N	Test	Parent	+221 77 000 00 00	anglesmorts.cand@test.sn	\N	tuteur_legal
cmtmh32c5005puhmczpgn7nma	cmtmh278b0004uhmc9ijeasvj	cmtmh326g005nuhmchxupt7s4	Ade	Papa	+221 76 000 00 00	parent.ade@gmail.com	Commerçant	pere
cmtmh335d005tuhmcag91xin0	cmtmh278b0004uhmc9ijeasvj	cmtmh32zr005ruhmcp0ryu7dc	Idriss	Maman	+221 76 000 00 00	parent.idriss@gmail.com	Commerçant	mere
cmtmh33nn005xuhmcc111uv93	cmtmh278b0004uhmc9ijeasvj	cmtmh33hz005vuhmckbxz3fz3	Aminata	Papa	+221 76 000 00 00	parent.aminata@gmail.com	Commerçant	pere
cmtmh34620061uhmceyy3wdi7	cmtmh278b0004uhmc9ijeasvj	cmtmh340f005zuhmc0b7v0ujv	Omar	Maman	+221 76 000 00 00	parent.omar@gmail.com	Commerçant	mere
cmtmh34os0065uhmcw6xk8znm	cmtmh278b0004uhmc9ijeasvj	cmtmh34j60063uhmc28kmel5m	Khadija	Papa	+221 76 000 00 00	parent.khadija@gmail.com	Commerçant	pere
cmtmh357d0069uhmcdk556k4i	cmtmh278b0004uhmc9ijeasvj	cmtmh351r0067uhmcho3phpp3	Pape	Maman	+221 76 000 00 00	parent.pape@gmail.com	Commerçant	mere
cmtmh35pq006duhmccwxxcaxy	cmtmh278b0004uhmc9ijeasvj	cmtmh35k4006buhmclgygwi6k	Sokhna	Papa	+221 76 000 00 00	parent.sokhna@gmail.com	Commerçant	pere
cmtmh36dz006huhmcwy1ypa0s	cmtmh278b0004uhmc9ijeasvj	cmtmh362g006fuhmcv26gy7w0	Awa	Maman	+221 76 000 00 00	parent.awa@gmail.com	Commerçant	mere
cmtmh36wz006luhmcbhmy92f9	cmtmh278b0004uhmc9ijeasvj	cmtmh36rd006juhmct94pka6o	Moussa	Papa	+221 76 000 00 00	parent.moussa@gmail.com	Commerçant	pere
cmtmh37fe006puhmcorvy618m	cmtmh278b0004uhmc9ijeasvj	cmtmh379r006nuhmc4l39soav	Astou	Maman	+221 76 000 00 00	parent.astou@gmail.com	Commerçant	mere
cmtmh37xj006tuhmcv6cfe14w	cmtmh278b0004uhmc9ijeasvj	cmtmh37rw006ruhmcg2j4d06k	Ibou	Papa	+221 76 000 00 00	parent.ibou@gmail.com	Commerçant	pere
cmtmh38g5006xuhmcdq3xeyp7	cmtmh278b0004uhmc9ijeasvj	cmtmh38aj006vuhmcot1y2yfr	Mariama	Maman	+221 76 000 00 00	parent.mariama@gmail.com	Commerçant	mere
\.


--
-- Data for Name: PartenaireExterne; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PartenaireExterne" (id, type, nom, contact, email, adresse, actif) FROM stdin;
cmtmh48fu00d0uhmcxtdk0qw6	crip	Cellule de Recueil des Informations Préoccupantes	+221 33 800 00 00	crip@sn.social.gouv	\N	t
\.


--
-- Data for Name: PassageArret; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PassageArret" (id, "feuilleId", "arretId", "heurePrevue", "heureReelle", montes, descendus, "transportArretId") FROM stdin;
cmtmh6u0l00m6uhmca19m3mk3	cmtmh6teb00m4uhmci0njt2o0	cmtmh3r8q00aluhmc58zyj56c	06:45	07:02	["cmtmh2y8r004nuhmcunq3tc6y"]	[]	\N
cmtmh6ubu00m8uhmcihiat1yc	cmtmh6teb00m4uhmci0njt2o0	cmtmh3r8q00amuhmcny109uwx	06:55	\N	[]	[]	\N
cmtmh6uhi00mauhmcrqwqw15r	cmtmh6teb00m4uhmci0njt2o0	cmtmh3r8q00anuhmcqiwrk4h9	07:20	\N	[]	[]	\N
\.


--
-- Data for Name: PassageInfirmerie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PassageInfirmerie" (id, "ecoleId", "eleveId", "ficheSanteId", "datePassage", motif, symptomes, "soinsAdministres", temperature, "personnelId", issue, "parentsNotifies", commentaire) FROM stdin;
cmtmh6otz00lcuhmc7bj4hm54	cmtmh278b0004uhmc9ijeasvj	cmtmh2wzr004buhmc9crpu0t6	cmtmh6mvt00l7uhmcimj6cakx	2026-09-18 10:15:00	Céphalées persistantes	Fatigue, sensibilité à la lumière	Repos 20 min, hydratation	37.2	cmtmh2b61000tuhmcb913gwgr	retour_classe	f	\N
cmtmh6otz00lduhmcadaf8r3e	cmtmh278b0004uhmc9ijeasvj	cmtmh2yvu004vuhmcp3m1bkwz	cmtmh6o6f00l9uhmcj2w6aszy	2026-09-20 14:40:00	Crise d'asthme légère après EPS	Respiration sifflante	Administration ventoline (autorisation parentale enregistrée), repos 30 min	36.9	cmtmh2b61000tuhmcb913gwgr	parents_contactes	t	\N
cmtmh6otz00leuhmc0zrfn9nu	cmtmh278b0004uhmc9ijeasvj	cmtmh2zmv0053uhmcahccrcf8	\N	2026-09-25 09:05:00	Chute dans la cour	Entorse cheville droite suspectée	Immobilisation, glace	36.8	cmtmh2b61000tuhmcb913gwgr	depart_hopital	t	\N
\.


--
-- Data for Name: Periode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Periode" (id, "ecoleId", "anneeScolaireId", libelle, code, "dateDebut", "dateFin", "typeBulletin") FROM stdin;
cmtmh2jgb002duhmcys0dqtnx	cmtmh278b0004uhmc9ijeasvj	cmtmh2bh9000vuhmcm08pmhfh	Trimestre 1	T1	2026-09-01 00:00:00	2026-12-15 00:00:00	college_lycee
cmtmh2jrg002fuhmcr7jtz93c	cmtmh278b0004uhmc9ijeasvj	cmtmh2bh9000vuhmcm08pmhfh	Trimestre 2	T2	2027-01-05 00:00:00	2027-03-30 00:00:00	college_lycee
cmtmh2jx9002huhmc33b3mb8z	cmtmh278b0004uhmc9ijeasvj	cmtmh2bh9000vuhmcm08pmhfh	Trimestre 3	T3	2027-04-01 00:00:00	2027-06-30 00:00:00	college_lycee
cmtmh6r0x00louhmche52uvox	cmtmh6qdx00lkuhmchendtvn1	cmtmh6qpq00lmuhmcrn6gnyv4	Trimestre 1	T1	2026-09-01 00:00:00	2026-12-15 00:00:00	college_lycee
cmtnebu3i0003l704lmsx62y8	cmtnebu1g0000l704ty18jg4n	cmtnebu2m0002l704jdqfx963	Trimestre 1	T1	2026-09-01 00:00:00	2026-12-15 00:00:00	college_lycee
cmtnebu3i0004l704sc8z3mlw	cmtnebu1g0000l704ty18jg4n	cmtnebu2m0002l704jdqfx963	Trimestre 2	T2	2027-01-05 00:00:00	2027-03-30 00:00:00	college_lycee
cmtnebu3i0005l7047n3xd642	cmtnebu1g0000l704ty18jg4n	cmtnebu2m0002l704jdqfx963	Trimestre 3	T3	2027-04-01 00:00:00	2027-06-30 00:00:00	college_lycee
cmtnfcyg40003kw04lylvkg3o	cmtnfcyel0000kw045oa97bhl	cmtnfcyfd0002kw045zqcgxdt	Trimestre 1	T1	2026-09-01 00:00:00	2026-12-15 00:00:00	college_lycee
cmtnfcyg40004kw04wzxwgeeh	cmtnfcyel0000kw045oa97bhl	cmtnfcyfd0002kw045zqcgxdt	Trimestre 2	T2	2027-01-05 00:00:00	2027-03-30 00:00:00	college_lycee
cmtnfcyg40005kw045tlk81d5	cmtnfcyel0000kw045oa97bhl	cmtnfcyfd0002kw045zqcgxdt	Trimestre 3	T3	2027-04-01 00:00:00	2027-06-30 00:00:00	college_lycee
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Permission" (id, code, libelle, module) FROM stdin;
cmtmh5hy100iduhmcfkyre9hh	eleves.lire	Consulter les élèves	eleves
cmtmh5jif00ieuhmcdwenlr31	eleves.ecrire	Créer/modifier les élèves	eleves
cmtmh5kfr00ifuhmcupqx3zn6	notes.saisir	Saisir les notes	pedagogie
cmtmh5liy00iguhmckrqxtz36	bulletins.valider	Valider les bulletins	pedagogie
cmtmh5ne600ihuhmc4cmcmkym	finances.voir	Consulter la trésorerie	finances
cmtmh5obx00iiuhmc6ptj5c40	finances.ecrire	Opérations financières (encaissements, frais, annulations)	finances
cmtmh5pa700ijuhmcbnfsxzs3	finances.valider	Valider les dépenses	finances
cmtmh5q7l00ikuhmco73kwpnh	presences.saisir	Faire l'appel	presences
cmtmh5r5000iluhmcy0qee0nt	rh.gerer	Gérer le personnel	rh
cmtmh5s2t00imuhmcvc9sy39q	communication.envoyer	Envoyer des communications	communication
cmtmh5t0a00inuhmcviso63ks	admin.saas	Administration SaaS	saas
cmtmh5txl00iouhmct6bdxw44	vie_scolaire.gerer	Gérer incidents et sanctions	vie_scolaire
cmtmh5uv200ipuhmce6gjt1wf	securite.gerer	Gérer la sécurité du site (visiteurs, sorties)	securite
cmtmh5xym00iquhmcyss6znqi	examens.gerer	Gérer les examens officiels	examens
cmtmh5zij00iruhmc2od8m01k	services.gerer	Gérer cantine, bibliothèque, manuels	services
cmtmh60ga00isuhmcj5vw860x	edt.gerer	Gérer les emplois du temps	edt
cmtmh61ge00ituhmcpa3wh2ap	sante.gerer	Gérer la santé et l'infirmerie	sante
cmtmh62e500iuuhmcitikhtt8	salles.gerer	Gérer salles et calendrier	salles
cmtmh63c100ivuhmcl2255e8b	protection.gerer	Gérer les signalements de protection de l'enfance	protection
\.


--
-- Data for Name: Personnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Personnel" (id, "ecoleId", "utilisateurId", matricule, nom, prenom, "dateNaissance", sexe, telephone, email, adresse, "photoUrl", "dateEmbauche", "dateSortie", "motifSortie", statut, "typeContrat", "salaireBrut", "cvUrl", "diplomePrincipal", "numeroSecuriteSociale", rib, "contactUrgence", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmtmh2k9y002luhmcsd3wk406	cmtmh278b0004uhmc9ijeasvj	cmtmh2k4c002juhmcu8bjec0z	ENS-1	Fall	Mamadou	\N	\N	+221 77 000 00 00	mamadou.fall@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:47:06.79	2026-09-04 04:47:06.79	\N
cmtmh2lex002ruhmchh9li2y5	cmtmh278b0004uhmc9ijeasvj	cmtmh2l9a002puhmcd461g6jg	ENS-2	Sow	Fatou	\N	\N	+221 77 000 00 00	fatou.sow@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:47:08.265	2026-09-04 04:47:08.265	\N
cmtmh2m33002xuhmcjioc8q12	cmtmh278b0004uhmc9ijeasvj	cmtmh2lxf002vuhmciawbttre	ENS-3	Ndiaye	Cheikh	\N	\N	+221 77 000 00 00	cheikh.ndiaye@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:47:09.135	2026-09-04 04:47:09.135	\N
cmtmh2mrs0033uhmc489yb2x9	cmtmh278b0004uhmc9ijeasvj	cmtmh2mm60031uhmcnqkwqg2h	ENS-4	Ba	Aïssatou	\N	\N	+221 77 000 00 00	aïssatou.ba@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:47:10.024	2026-09-04 04:47:10.024	\N
cmtmh2o3a0039uhmc81y6hre7	cmtmh278b0004uhmc9ijeasvj	cmtmh2nxo0037uhmc921brlo4	ENS-5	Diallo	Ousmane	\N	\N	+221 77 000 00 00	ousmane.diallo@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:47:11.734	2026-09-04 04:47:11.734	\N
cmtmh2orf003fuhmc31ixyw6u	cmtmh278b0004uhmc9ijeasvj	cmtmh2olt003duhmckoebt5mr	ENS-6	Gueye	Mariama	\N	\N	+221 77 000 00 00	mariama.gueye@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:47:12.603	2026-09-04 04:47:12.603	\N
cmtmh2q2b003luhmc3xpwbz87	cmtmh278b0004uhmc9ijeasvj	cmtmh2pwo003juhmc9w13xo2p	CPT-01	Sarr	Bineta	\N	\N	+221 76 000 00 00	comptable@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDD	28000000	\N	Comptable	\N	\N	\N	2026-09-04 04:47:14.291	2026-09-04 04:47:14.291	\N
cmtmh2sph003puhmc6o7plyox	cmtmh278b0004uhmc9ijeasvj	cmtmh2sjs003nuhmcleyf6m4i	RH-01	Ndiaye	Sophie	\N	\N	+221 76 000 00 00	rh@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	32000000	\N	Responsable RH	\N	\N	\N	2026-09-04 04:47:17.717	2026-09-04 04:47:17.717	\N
cmtmh2tdi003tuhmc5xi6cfr5	cmtmh278b0004uhmc9ijeasvj	cmtmh2t7x003ruhmc6qk0apn9	CEN-01	Diagne	Ibrahima	\N	\N	+221 76 000 00 00	censeur@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	34000000	\N	Censeur	\N	\N	\N	2026-09-04 04:47:18.583	2026-09-04 04:47:18.583	\N
cmtmh2u1p003xuhmca8o1yqyx	cmtmh278b0004uhmc9ijeasvj	cmtmh2tvz003vuhmcmuifhosf	SUR-01	Kane	Modou	\N	\N	+221 76 000 00 00	surveillant@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDD	22000000	\N	Surveillant général	\N	\N	\N	2026-09-04 04:47:19.453	2026-09-04 04:47:19.453	\N
cmtmh2uvk0041uhmcu0bxn49c	cmtmh278b0004uhmc9ijeasvj	cmtmh2upx003zuhmclzmrwabo	SEC-01	Fall	Coumba	\N	\N	+221 76 000 00 00	secretariat@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	24000000	\N	Secrétaire	\N	\N	\N	2026-09-04 04:47:20.529	2026-09-04 04:47:20.529	\N
cmtmh2vji0045uhmcuy5stzju	cmtmh278b0004uhmc9ijeasvj	cmtmh2vdw0043uhmcegiqne0g	AD-01	Mbaye	Khadija	\N	\N	+221 76 000 00 00	assistant@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	30000000	\N	Assistante de direction	\N	\N	\N	2026-09-04 04:47:21.391	2026-09-04 04:47:21.391	\N
cmtmh2w7h0049uhmchl3phe5e	cmtmh278b0004uhmc9ijeasvj	cmtmh2w1v0047uhmcx0233oda	INF-01	Sow	Aminata	\N	\N	+221 76 000 00 00	infirmiere@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDD	23000000	\N	Infirmière	\N	\N	\N	2026-09-04 04:47:22.253	2026-09-04 04:47:22.253	\N
cmtnebv5u002vl704scsw3rwv	cmtnebu1g0000l704ty18jg4n	cmtnebv44002tl7040aggzb7i	PER-0001	GBESSI CALYRIS MAHUNAN	Calyris Mahunan	\N	\N	\N	lycagbessi@gmail.com	\N	\N	2026-09-04 20:18:08.127	\N	\N	actif	CDI	\N	\N	\N	\N	\N	\N	2026-09-04 20:18:08.128	2026-09-04 20:18:08.128	\N
cmtnfczgz002vkw04xuo44hhc	cmtnfcyel0000kw045oa97bhl	cmtnfczfg002tkw04zz9x7xld	PER-0001	Projet sites 601	Projet	\N	\N	\N	projetsites601@gmail.com	\N	\N	2026-09-04 20:46:59.986	\N	\N	actif	CDI	\N	\N	\N	\N	\N	\N	2026-09-04 20:46:59.987	2026-09-04 20:46:59.987	\N
\.


--
-- Data for Name: PersonnelRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PersonnelRole" ("personnelId", "roleId", "classeId", "matiereId", "dateDebut", "dateFin") FROM stdin;
cmtmh2k9y002luhmcsd3wk406	cmtmh29uq000duhmc5nxwa64g	cmtmh2io40027uhmco5514if6	cmtmh2kl7002nuhmcair5l2ws	2026-09-01 00:00:00	\N
cmtmh2lex002ruhmchh9li2y5	cmtmh29uq000duhmc5nxwa64g	cmtmh2j520029uhmcakkepakv	cmtmh2lkk002tuhmcq1h82y0i	2026-09-01 00:00:00	\N
cmtmh2m33002xuhmcjioc8q12	cmtmh29uq000duhmc5nxwa64g	cmtmh2jap002buhmccif5empg	cmtmh2m9a002zuhmckj61ccqk	2026-09-01 00:00:00	\N
cmtmh2mrs0033uhmc489yb2x9	cmtmh29uq000duhmc5nxwa64g	cmtmh2io40027uhmco5514if6	cmtmh2n980035uhmccs3utepv	2026-09-01 00:00:00	\N
cmtmh2o3a0039uhmc81y6hre7	cmtmh29uq000duhmc5nxwa64g	cmtmh2j520029uhmcakkepakv	cmtmh2o8x003buhmcerigpu04	2026-09-01 00:00:00	\N
cmtmh2orf003fuhmc31ixyw6u	cmtmh29uq000duhmc5nxwa64g	cmtmh2jap002buhmccif5empg	cmtmh2ox1003huhmclfqgqfpb	2026-09-01 00:00:00	\N
cmtmh2q2b003luhmc3xpwbz87	cmtmh2a0b000fuhmc6cr7ay9l	\N	\N	2026-09-01 00:00:00	\N
cmtmh2sph003puhmc6o7plyox	cmtmh2ach000juhmcacoi5ra5	\N	\N	2026-09-01 00:00:00	\N
cmtmh2tdi003tuhmc5xi6cfr5	cmtmh2ai2000luhmc2uqhoab8	\N	\N	2026-09-01 00:00:00	\N
cmtmh2u1p003xuhmca8o1yqyx	cmtmh2a5w000huhmc7p4zo15n	\N	\N	2026-09-01 00:00:00	\N
cmtmh2uvk0041uhmcu0bxn49c	cmtmh2ann000nuhmcwsdhopzy	\N	\N	2026-09-01 00:00:00	\N
cmtmh2vji0045uhmcuy5stzju	cmtmh2at8000puhmcw3dzwj9d	\N	\N	2026-09-01 00:00:00	\N
cmtmh2w7h0049uhmchl3phe5e	cmtmh2ayt000ruhmckuterqsc	\N	\N	2026-09-01 00:00:00	\N
\.


--
-- Data for Name: PieceJointe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PieceJointe" (id, "messageId", "nomFichier", url, taille, "mimeType", "dateUpload") FROM stdin;
cmtmh50ew00g3uhmcjmvho5km	cmtmh503k00g1uhmc0994c5b2	ordre_du_jour.pdf	/uploads/odj.pdf	124000	application/pdf	2026-09-04 04:49:01.016
\.


--
-- Data for Name: PlanAccompagnement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanAccompagnement" (id, "ecoleId", "eleveId", type, "dateMiseEnPlace", "dateDebut", "dateFin", statut, diagnostic, "objectifsGeneraux", "frequenceSuivi", "redigeParId", "valideParId", "dateValidation") FROM stdin;
cmtmh5bvw00houhmc40uzze16	cmtmh278b0004uhmc9ijeasvj	cmtmh2xxf004juhmcwe9ylhvx	PAI	2026-08-10 00:00:00	2026-09-01 00:00:00	2027-08-31 00:00:00	actif	Asthme sévère — besoin d'accès au bureau infirmier et d'un protocole d'urgence.	Sécuriser la prise en charge médicale pendant les heures de cours.	trimestriel	cmtmh2b61000tuhmcb913gwgr	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:49:15.882
\.


--
-- Data for Name: PlanTarifaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanTarifaire" (id, nom, "prixMensuel", "prixAnnuel", devise, "limiteEleves", "modulesInclus", "dureeEssaiJours", actif, "createdAt", "updatedAt") FROM stdin;
cmtmh263x0000uhmcnitv00c8	Essentiel	2500000	27000000	XOF	\N	["eleves","personnel","pedagogique","presences","finances_basic"]	14	t	2026-09-04 04:46:48.425	2026-09-04 04:46:48.425
cmtmh26qr0001uhmcd4zri6kz	Pro	6500000	70000000	XOF	100	["eleves","personnel","pedagogique","presences","finances_full","vie_scolaire","rh","services","salles","rdv"]	30	t	2026-09-04 04:46:49.053	2026-09-04 04:46:49.053
cmtmh271y0002uhmcfj6jdw1g	Illimité	12000000	130000000	XOF	0	["*"]	30	t	2026-09-04 04:46:49.655	2026-09-04 04:46:49.655
cmtpt4ihk003wuhrod6dht3vp	RegressionV2 Plan Quota 1	1000000	10000000	XOF	1	[]	14	t	2026-09-06 12:47:51.704	2026-09-06 12:47:51.704
cmtpthy580040uhp8rd8b8fxn	RegressionV2 Plan Quota 1	1000000	10000000	XOF	1	[]	14	t	2026-09-06 12:58:18.524	2026-09-06 12:58:18.524
cmtptudpd003yuhasu6bwizhq	RegressionV2 Plan Quota 1	1000000	10000000	XOF	1	[]	14	t	2026-09-06 13:07:58.559	2026-09-06 13:07:58.559
cmtpu6mn00040uhdwqpumnrzj	RegressionV2 Plan Quota 1	1000000	10000000	XOF	1	[]	14	t	2026-09-06 13:17:30.011	2026-09-06 13:17:30.011
cmtpug4wd003wuh28aio56in8	RegressionV2 Plan Quota 1	1000000	10000000	XOF	1	[]	14	t	2026-09-06 13:24:53.58	2026-09-06 13:24:53.58
cmtpuowfk003yuh9gyp8mi82w	RegressionV2 Plan Quota 1	1000000	10000000	XOF	1	[]	14	t	2026-09-06 13:31:42.51	2026-09-06 13:31:42.51
cmtpvatg1003yuhvs4whhdndw	RegressionV2 Plan Quota 1	1000000	10000000	XOF	1	[]	14	t	2026-09-06 13:48:45.071	2026-09-06 13:48:45.071
\.


--
-- Data for Name: PointagePersonnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PointagePersonnel" (id, "ecoleId", "personnelId", date, "heureArrivee", "heureDepart", "retardMin", commentaire) FROM stdin;
cmtmh6uyv00meuhmc6qhacsyh	cmtmh278b0004uhmc9ijeasvj	cmtmh2lex002ruhmchh9li2y5	2026-09-04 00:00:00	2026-09-04 08:11:00	\N	0	\N
cmtmh6v4h00mguhmcgcwj39a8	cmtmh278b0004uhmc9ijeasvj	cmtmh2m33002xuhmcjioc8q12	2026-09-04 00:00:00	2026-09-04 09:10:00	\N	25	\N
cmtmh9gha000huhdklj89mhfs	cmtmh278b0004uhmc9ijeasvj	cmtmh2k9y002luhmcsd3wk406	2026-09-04 00:00:00	2026-09-04 07:00:27.248	2026-09-04 19:00:28.871	0	\N
\.


--
-- Data for Name: Presence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Presence" (id, "eleveId", "seanceId", statut, "minuteRetard", "motifAbsence", "justificatifUrl", "saisiParId", "dateSaisie", "synchroniseDepuisHorsLigne") FROM stdin;
cmtmh3vcq00axuhmcmdgnx0zx	cmtmh2wzr004buhmc9crpu0t6	cmtmh3v1i00avuhmclyz9m8j8	present	\N	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:07.802	f
cmtmh3vnv00azuhmcium4ycry	cmtmh2xm3004fuhmcgntcpsvf	cmtmh3v1i00avuhmclyz9m8j8	absent	\N	Maladie (certificat fourni)	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:08.204	f
cmtmh3vth00b1uhmc1fcdjfz8	cmtmh2xxf004juhmcwe9ylhvx	cmtmh3v1i00avuhmclyz9m8j8	present	\N	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:08.405	f
cmtmh3vzh00b3uhmcygv0kilk	cmtmh2y8r004nuhmcunq3tc6y	cmtmh3v1i00avuhmclyz9m8j8	present	\N	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:08.621	f
cmtmh3wgl00b5uhmcpev3didx	cmtmh2yk1004ruhmcb5bdx13g	cmtmh3v1i00avuhmclyz9m8j8	present	\N	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:09.237	f
cmtmh3xk500bjuhmc67jgjj4m	cmtmh2wzr004buhmc9crpu0t6	cmtmh3wm900b7uhmcieppsm51	present	\N	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:10.661	f
cmtmh3xpq00bluhmctuqzharq	cmtmh2xm3004fuhmcgntcpsvf	cmtmh3wm900b7uhmcieppsm51	absent	\N	Fever — parent notifié	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:10.862	f
cmtmh3xvf00bnuhmcumprojc1	cmtmh2xxf004juhmcwe9ylhvx	cmtmh3wm900b7uhmcieppsm51	present	\N	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:11.067	f
cmtmh3y0z00bpuhmci1ugda6i	cmtmh2y8r004nuhmcunq3tc6y	cmtmh3wm900b7uhmcieppsm51	present	\N	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:11.268	f
cmtmh3y6n00bruhmcq5bq900g	cmtmh2yk1004ruhmcb5bdx13g	cmtmh3wm900b7uhmcieppsm51	present	\N	\N	\N	cmtmh2k4c002juhmcu8bjec0z	2026-09-04 04:48:11.471	f
cmtmh3ycc00btuhmcjhjq02s4	cmtmh2wzr004buhmc9crpu0t6	cmtmh3wrw00b9uhmc0cdt10zl	present	\N	\N	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:48:11.676	f
cmtmh3yi000bvuhmc95vjkuns	cmtmh2xm3004fuhmcgntcpsvf	cmtmh3wrw00b9uhmc0cdt10zl	absent	\N	Fever — parent notifié	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:48:11.881	f
cmtmh3ynp00bxuhmc5p82gtdn	cmtmh2xxf004juhmcwe9ylhvx	cmtmh3wrw00b9uhmc0cdt10zl	present	\N	\N	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:48:12.086	f
cmtmh41wx00bzuhmcyyabf3h5	cmtmh2y8r004nuhmcunq3tc6y	cmtmh3wrw00b9uhmc0cdt10zl	present	\N	\N	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:48:16.306	f
cmtmh42lh00c1uhmcj442bg0c	cmtmh2yk1004ruhmcb5bdx13g	cmtmh3wrw00b9uhmc0cdt10zl	present	\N	\N	\N	cmtmh2l9a002puhmcd461g6jg	2026-09-04 04:48:17.189	f
cmtmh432n00c3uhmcwmru6i6a	cmtmh2yvu004vuhmcp3m1bkwz	cmtmh3wxj00bbuhmc1lmoy8nt	present	\N	\N	\N	cmtmh2lxf002vuhmciawbttre	2026-09-04 04:48:17.807	f
cmtmh438b00c5uhmc05lss8j0	cmtmh2zbm004zuhmcx6q0pmyw	cmtmh3wxj00bbuhmc1lmoy8nt	present	\N	\N	\N	cmtmh2lxf002vuhmciawbttre	2026-09-04 04:48:18.012	f
cmtmh43dz00c7uhmchzepjxga	cmtmh2zmv0053uhmcahccrcf8	cmtmh3wxj00bbuhmc1lmoy8nt	retard	\N	Retard 20 min — transport	\N	cmtmh2lxf002vuhmciawbttre	2026-09-04 04:48:18.215	f
cmtmh43jt00c9uhmcsficwx0c	cmtmh2zy20057uhmccluf8ocy	cmtmh3wxj00bbuhmc1lmoy8nt	present	\N	\N	\N	cmtmh2lxf002vuhmciawbttre	2026-09-04 04:48:18.425	f
cmtmh43pg00cbuhmczwl0liyh	cmtmh2yvu004vuhmcp3m1bkwz	cmtmh3x3600bduhmccin1muao	present	\N	\N	\N	cmtmh2mm60031uhmcnqkwqg2h	2026-09-04 04:48:18.629	f
cmtmh43v200cduhmcxmcxj1o3	cmtmh2zbm004zuhmcx6q0pmyw	cmtmh3x3600bduhmccin1muao	present	\N	\N	\N	cmtmh2mm60031uhmcnqkwqg2h	2026-09-04 04:48:18.83	f
cmtmh440o00cfuhmcwm66u7mf	cmtmh2zmv0053uhmcahccrcf8	cmtmh3x3600bduhmccin1muao	retard	\N	Retard 20 min — transport	\N	cmtmh2mm60031uhmcnqkwqg2h	2026-09-04 04:48:19.032	f
cmtmh446c00chuhmc07bthjwy	cmtmh2zy20057uhmccluf8ocy	cmtmh3x3600bduhmccin1muao	present	\N	\N	\N	cmtmh2mm60031uhmcnqkwqg2h	2026-09-04 04:48:19.236	f
\.


--
-- Data for Name: Programme; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Programme" (id, "ecoleId", "matiereId", "niveauId", "anneeScolaireId", titre, objectifs, "volumeHorairePrevu", publie) FROM stdin;
cmtmh6boh00jduhmcgyiw6t0x	cmtmh278b0004uhmc9ijeasvj	cmtmh2kl7002nuhmcair5l2ws	cmtmh2fwh001ruhmcq6gplxq7	cmtmh2bh9000vuhmcm08pmhfh	Mathématiques 6e — Programme annuel	Maîtriser les décimaux, la proportionnalité et la géométrie de base.	108	t
cmtmh6dfp00jpuhmcc2gzx5if	cmtmh278b0004uhmc9ijeasvj	cmtmh2lkk002tuhmcq1h82y0i	cmtmh2g21001tuhmcgk27bex7	cmtmh2bh9000vuhmcm08pmhfh	Français 5e — Programme annuel	Grammaire, conjugaison, expression écrite.	96	t
cmtmh6eu500jvuhmc8yb6zrco	cmtmh278b0004uhmc9ijeasvj	cmtmh2m9a002zuhmckj61ccqk	cmtmh2fl9001nuhmcql4dktof	cmtmh2bh9000vuhmcm08pmhfh	Histoire-Géo CM2 — Programme annuel	Repères historiques et lecture de cartes.	72	t
\.


--
-- Data for Name: PushNotificationLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushNotificationLog" (id, "ecoleId", "notificationId", "pushTokenId", titre, corps, statut, "providerMessageId", "dateEnvoi", "dateLivraison", "dateCreation", clic) FROM stdin;
cmtmh51zb00gcuhmc3k2a6998	cmtmh278b0004uhmc9ijeasvj	\N	cmtmh51o300gbuhmc46c02qme	Bulletins publiés	Les bulletins T1 sont disponibles sur le portail parent.	delivre	fcm-msg-1	2026-08-25 10:00:00	2026-08-25 10:00:02	2026-09-04 04:49:03.048	f
\.


--
-- Data for Name: PushToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushToken" (id, "utilisateurId", token, provider, p256dh, "authKey", plateforme, "deviceModel", "osVersion", "appVersion", langue, actif, "dateCreation", "derniereActivite") FROM stdin;
cmtmh51o300gbuhmc46c02qme	cmtmh2b61000tuhmcb913gwgr	fcm-token-demo-1	fcm	\N	\N	pwa	Pixel 7	Android 14	1.0.0	fr	t	2026-09-04 04:49:02.643	2026-09-04 04:49:02.641
\.


--
-- Data for Name: QuotaUsage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QuotaUsage" (id, "ecoleId", periode, ressource, consommation, limite, pourcentage, alerte80, alerte100, "dateDerniereMaj") FROM stdin;
cmtmha2tf0017uhdkbl4n824g	cmtmh278b0004uhmc9ijeasvj	2026	eleves	12	100	12	f	f	2026-09-06 14:09:03.856
cmtmh5amg00hhuhmc5j2dv0l0	cmtmh278b0004uhmc9ijeasvj	2026-08	eleves	25	100	25	f	f	2026-09-04 04:49:14.248
cmtmh5amg00hiuhmc5f8jz13p	cmtmh278b0004uhmc9ijeasvj	2026-08	sms_envoyes	145	500	29	f	f	2026-09-04 04:49:14.248
cmtmh5amg00hjuhmcca02auia	cmtmh278b0004uhmc9ijeasvj	2026-08	storage_go	2	10	20	f	f	2026-09-04 04:49:14.248
cmtpt5phz006uuhrops144y1o	cmtpt4jje003xuhrovckola8o	2026	eleves	0	1	0	f	f	2026-09-06 12:48:47.447
cmtptighm006yuhp8tfjokrpw	cmtpthz0v0041uhp8mgmbzrxv	2026	eleves	0	1	0	f	f	2026-09-06 12:58:42.298
cmtptuzdb006wuhastippsnfi	cmtptuels003zuhas1fcuzhxm	2026	eleves	0	1	0	f	f	2026-09-06 13:08:26.637
cmtpu7dvh006yuhdwo21czgg4	cmtpu6nak0041uhdw9a2m83nx	2026	eleves	0	1	0	f	f	2026-09-06 13:18:05.31
cmtpuglta006uuh28060aftce	cmtpug5k0003xuh28gy15jkaq	2026	eleves	0	1	0	f	f	2026-09-06 13:25:15.502
cmtpuphcg006wuh9gn6mbuiwg	cmtpuox59003zuh9gbtcj5jt9	2026	eleves	0	1	0	f	f	2026-09-06 13:32:09.616
cmtpvbpt2006wuhvsyxle9fxk	cmtpvau73003zuhvst5w93j0n	2026	eleves	0	1	0	f	f	2026-09-06 13:49:27.012
\.


--
-- Data for Name: RapportSauvegarde; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RapportSauvegarde" (id, "ecoleId", "utilisateurId", nom, type, configuration, format, partage, "dateCreation", "derniereExecution") FROM stdin;
cmtmh5fap00i2uhmc77qe1u9j	cmtmh278b0004uhmc9ijeasvj	cmtmh2b61000tuhmcb913gwgr	Suivi mensuel impayés	kpi_tableau_bord	{"filtres":{"statut":"impayee"},"colonnes":["eleve","montant"],"periode":"2026-08"}	table	f	2026-09-04 04:49:20.305	2026-09-04 04:49:20.304
\.


--
-- Data for Name: Rdv; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Rdv" (id, "creneauRdvId", "parentId", "eleveId", motif, statut, "createdAt") FROM stdin;
cmtmh455100cluhmc9mur8jab	cmtmh44c300cjuhmcn1p75qwx	cmtmh32c5005puhmczpgn7nma	cmtmh2wzr004buhmc9crpu0t6	Bilan mi-trimestre — progrès en maths	confirme	2026-09-04 04:48:20.485
\.


--
-- Data for Name: ReceptionCommande; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReceptionCommande" (id, "commandeId", "dateReception", "quantiteRecue", "bonLivraisonUrl", "controleQualite", commentaire, "receptionneParId") FROM stdin;
cmtmh4tfw00fpuhmc2vxji468	cmtmh4r1g00fkuhmcm66vmn9w	2026-08-12 00:00:00	130	/uploads/bl-001.pdf	t	Cahiers et stylos reçus conformes.	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: RegistreTraitement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RegistreTraitement" (id, "ecoleId", nom, finalite, "baseLegale", "donneesTraitees", "categoriesPersonnes", destinataires, "transfertsHorsUE", "dureeConservation", "mesuresSecurite", responsable, dpo, "dateCreation", "dateMaj") FROM stdin;
cmtmh58wy00h9uhmczh0r7som	cmtmh278b0004uhmc9ijeasvj	Gestion des inscriptions élèves	Inscription et scolarisation des élèves	mission_publique	["identite_eleve","date_naissance","adresse","parent"]	["eleves","parents"]	équipe pédagogique, direction	Aucun	Durée de scolarité + 5 ans	\N	Directeur	DPO Éditeur SaaS	2026-09-04 04:49:12.034	2026-09-04 04:49:12.034
\.


--
-- Data for Name: RegleCalculMoyenne; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RegleCalculMoyenne" (id, "ecoleId", "cycleId", methode, "inclutAbsents", "notePlancher", "notePlafond", arrondi, "reglesSpecifiques") FROM stdin;
cmtmh6fgv00k3uhmcqha3dwwm	cmtmh278b0004uhmc9ijeasvj	cmtmh2c970011uhmco2h5i9vt	moyenne_ponderee	f	0	20	2	{"coefficients":"par matiere","eleve_absent":"note neutralisee"}
cmtmh6fs300k5uhmch34h7kc9	cmtmh278b0004uhmc9ijeasvj	cmtmh2c3m000zuhmc4t0g61gk	moyenne_ponderee	f	0	20	0	\N
\.


--
-- Data for Name: Remplacement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Remplacement" (id, "congeId", "personnelAbsentId", "personnelRemplacantId", "dateDebut", "dateFin", statut) FROM stdin;
cmtmh6b1t00j9uhmckh9f2j2n	cmtmh6aez00j5uhmcdqy0qz5k	cmtmh2m33002xuhmcjioc8q12	cmtmh2orf003fuhmc31ixyw6u	2026-09-01 04:50:01.456	2026-09-10 04:50:01.456	confirme
\.


--
-- Data for Name: RenduDevoir; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RenduDevoir" (id, "devoirId", "eleveId", "dateRendu", "contenuUrl", "commentaireEleve", note, appreciation, "corrigeParId", "dateCorrection", statut) FROM stdin;
cmtmh4imm00eduhmcshjuh6qo	cmtmh4i5w00ebuhmcut6k4p73	cmtmh2wzr004buhmc9crpu0t6	2026-09-04 04:48:37.767	/uploads/dm1-diop.pdf	\N	17	Très bon travail. Attention à la fraction irréductible ex.3.	cmtmh2k9y002luhmcsd3wk406	2026-08-24 00:00:00	corrige
\.


--
-- Data for Name: ReservationSalle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReservationSalle" (id, "salleId", "seanceId", date, "heureDebut", "heureFin", "reserveParId", motif, "createdAt") FROM stdin;
cmtmh6jec00kluhmcc19fedkl	cmtmh3hr8008wuhmct2kes5ay	cmtmh3v1i00avuhmclyz9m8j8	2026-09-22 00:00:00	08:00	10:00	cmtmh2b61000tuhmcb913gwgr	Cours de mathématiques (séance régulière)	2026-09-04 04:50:12.276
cmtmh6jpl00knuhmcaqd18npq	cmtmh3hr8008xuhmc7gulaqyi	\N	2026-10-14 00:00:00	17:00	19:00	cmtmh2b61000tuhmcb913gwgr	Réunion Comité d'Éducation à la Santé	2026-09-04 04:50:12.681
\.


--
-- Data for Name: ReunionCollective; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReunionCollective" (id, "classeId", date, heure, lieu, description) FROM stdin;
cmtmh6kns00kruhmcjn67vby7	cmtmh2io40027uhmco5514if6	2026-10-03 00:00:00	18:00	Salle A101	Réunion de rentrée : présentation de l'équipe et du programme annuel.
cmtmh6kyy00ktuhmcyqvgu8mo	cmtmh2jap002buhmccif5empg	2026-11-12 00:00:00	17:30	Salle B202	Préparation du concours d'entrée en sixième.
\.


--
-- Data for Name: RevisionPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RevisionPlan" (id, "planAccompagnementId", date, motif, constats, ajustements, "redigeParId") FROM stdin;
cmtmh5e1q00huuhmc3t5m79bj	cmtmh5bvw00houhmc40uzze16	2026-09-04 04:49:18.684	Révision trimestrielle obligatoire	Plan respecté. Aucune crise rapportée ce trimestre.	Maintien du protocole actuel.	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, "ecoleId", code, libelle, "twofaRequis") FROM stdin;
cmtnfcywy002bkw04q0dxyo71	cmtnfcyel0000kw045oa97bhl	direction	Direction	f
cmtnfcyxp002dkw04195e5wl7	cmtnfcyel0000kw045oa97bhl	enseignant	Enseignant	f
cmtnfcyy2002fkw04awwudxzo	cmtnfcyel0000kw045oa97bhl	comptabilite	Comptabilité	f
cmtnfcyyg002hkw04p4e07hh5	cmtnfcyel0000kw045oa97bhl	surveillant	Surveillant	f
cmtnfcyyu002jkw04kb3j35fb	cmtnfcyel0000kw045oa97bhl	rh	Ressources Humaines	f
cmtnfcyz7002lkw048g85hcfo	cmtnfcyel0000kw045oa97bhl	censeur	Censeur	f
cmtnfcyzl002nkw04o7ozau3w	cmtnfcyel0000kw045oa97bhl	secretariat	Secrétariat	f
cmtnfcyzz002pkw0440gqjj6i	cmtnfcyel0000kw045oa97bhl	assistant_direction	Assistant de Direction	f
cmtnfcz0d002rkw04us148vui	cmtnfcyel0000kw045oa97bhl	infirmier	Infirmier(ère)	f
cmtmh2ach000juhmcacoi5ra5	cmtmh278b0004uhmc9ijeasvj	rh	Ressources Humaines	f
cmtmh29uq000duhmc5nxwa64g	cmtmh278b0004uhmc9ijeasvj	enseignant	Enseignant	f
cmtmh2a5w000huhmc7p4zo15n	cmtmh278b0004uhmc9ijeasvj	surveillant	Surveillant	f
cmtmh2ai2000luhmc2uqhoab8	cmtmh278b0004uhmc9ijeasvj	censeur	Censeur	f
cmtmh2ann000nuhmcwsdhopzy	cmtmh278b0004uhmc9ijeasvj	secretariat	Secrétariat	f
cmtmh2at8000puhmcw3dzwj9d	cmtmh278b0004uhmc9ijeasvj	assistant_direction	Assistant de Direction	f
cmtmh2ayt000ruhmckuterqsc	cmtmh278b0004uhmc9ijeasvj	infirmier	Infirmier(ère)	f
cmtmh29ji000buhmczb4tf34n	cmtmh278b0004uhmc9ijeasvj	direction	Direction	f
cmtmh2a0b000fuhmc6cr7ay9l	cmtmh278b0004uhmc9ijeasvj	comptabilite	Comptabilité	f
cmtnebukz002bl704wx8exz0t	cmtnebu1g0000l704ty18jg4n	direction	Direction	f
cmtnebulu002dl704n9ap991p	cmtnebu1g0000l704ty18jg4n	enseignant	Enseignant	f
cmtnebum8002fl704i0zezul9	cmtnebu1g0000l704ty18jg4n	comptabilite	Comptabilité	f
cmtnebuml002hl704t8m1jpo1	cmtnebu1g0000l704ty18jg4n	surveillant	Surveillant	f
cmtnebun0002jl704gu6tu99r	cmtnebu1g0000l704ty18jg4n	rh	Ressources Humaines	f
cmtnebund002ll7046noqrmvd	cmtnebu1g0000l704ty18jg4n	censeur	Censeur	f
cmtnebunq002nl704haupu1xp	cmtnebu1g0000l704ty18jg4n	secretariat	Secrétariat	f
cmtnebuo3002pl7042edltt0x	cmtnebu1g0000l704ty18jg4n	assistant_direction	Assistant de Direction	f
cmtnebuoh002rl704pjp0tzhf	cmtnebu1g0000l704ty18jg4n	infirmier	Infirmier(ère)	f
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RolePermission" ("roleId", "permissionId") FROM stdin;
cmtmh29ji000buhmczb4tf34n	cmtmh5hy100iduhmcfkyre9hh
cmtmh29ji000buhmczb4tf34n	cmtmh5jif00ieuhmcdwenlr31
cmtmh29ji000buhmczb4tf34n	cmtmh5liy00iguhmckrqxtz36
cmtmh29ji000buhmczb4tf34n	cmtmh5ne600ihuhmc4cmcmkym
cmtmh29ji000buhmczb4tf34n	cmtmh5obx00iiuhmc6ptj5c40
cmtmh29ji000buhmczb4tf34n	cmtmh5pa700ijuhmcbnfsxzs3
cmtmh29ji000buhmczb4tf34n	cmtmh5r5000iluhmcy0qee0nt
cmtmh29ji000buhmczb4tf34n	cmtmh5s2t00imuhmcvc9sy39q
cmtmh29ji000buhmczb4tf34n	cmtmh5t0a00inuhmcviso63ks
cmtmh29ji000buhmczb4tf34n	cmtmh5txl00iouhmct6bdxw44
cmtmh29ji000buhmczb4tf34n	cmtmh5uv200ipuhmce6gjt1wf
cmtmh29ji000buhmczb4tf34n	cmtmh5xym00iquhmcyss6znqi
cmtmh29ji000buhmczb4tf34n	cmtmh5zij00iruhmc2od8m01k
cmtmh29ji000buhmczb4tf34n	cmtmh60ga00isuhmcj5vw860x
cmtmh29ji000buhmczb4tf34n	cmtmh61ge00ituhmcpa3wh2ap
cmtmh29ji000buhmczb4tf34n	cmtmh62e500iuuhmcitikhtt8
cmtmh29ji000buhmczb4tf34n	cmtmh63c100ivuhmcl2255e8b
cmtmh29uq000duhmc5nxwa64g	cmtmh5hy100iduhmcfkyre9hh
cmtmh29uq000duhmc5nxwa64g	cmtmh5kfr00ifuhmcupqx3zn6
cmtmh29uq000duhmc5nxwa64g	cmtmh5q7l00ikuhmco73kwpnh
cmtmh29uq000duhmc5nxwa64g	cmtmh5txl00iouhmct6bdxw44
cmtmh29uq000duhmc5nxwa64g	cmtmh60ga00isuhmcj5vw860x
cmtmh2a0b000fuhmc6cr7ay9l	cmtmh5ne600ihuhmc4cmcmkym
cmtmh2a0b000fuhmc6cr7ay9l	cmtmh5obx00iiuhmc6ptj5c40
cmtmh2a0b000fuhmc6cr7ay9l	cmtmh5pa700ijuhmcbnfsxzs3
cmtmh2a5w000huhmc7p4zo15n	cmtmh5hy100iduhmcfkyre9hh
cmtmh2a5w000huhmc7p4zo15n	cmtmh5q7l00ikuhmco73kwpnh
cmtmh2a5w000huhmc7p4zo15n	cmtmh5uv200ipuhmce6gjt1wf
cmtmh2a5w000huhmc7p4zo15n	cmtmh5txl00iouhmct6bdxw44
cmtmh2ach000juhmcacoi5ra5	cmtmh5r5000iluhmcy0qee0nt
cmtmh2ach000juhmcacoi5ra5	cmtmh5s2t00imuhmcvc9sy39q
cmtmh2ai2000luhmc2uqhoab8	cmtmh5hy100iduhmcfkyre9hh
cmtmh2ai2000luhmc2uqhoab8	cmtmh5q7l00ikuhmco73kwpnh
cmtmh2ai2000luhmc2uqhoab8	cmtmh5txl00iouhmct6bdxw44
cmtmh2ai2000luhmc2uqhoab8	cmtmh60ga00isuhmcj5vw860x
cmtmh2ai2000luhmc2uqhoab8	cmtmh5xym00iquhmcyss6znqi
cmtmh2ai2000luhmc2uqhoab8	cmtmh5liy00iguhmckrqxtz36
cmtmh2ai2000luhmc2uqhoab8	cmtmh63c100ivuhmcl2255e8b
cmtmh2ann000nuhmcwsdhopzy	cmtmh5hy100iduhmcfkyre9hh
cmtmh2ann000nuhmcwsdhopzy	cmtmh5jif00ieuhmcdwenlr31
cmtmh2ann000nuhmcwsdhopzy	cmtmh5s2t00imuhmcvc9sy39q
cmtmh2at8000puhmcw3dzwj9d	cmtmh5hy100iduhmcfkyre9hh
cmtmh2at8000puhmcw3dzwj9d	cmtmh5jif00ieuhmcdwenlr31
cmtmh2at8000puhmcw3dzwj9d	cmtmh5s2t00imuhmcvc9sy39q
cmtmh2at8000puhmcw3dzwj9d	cmtmh5q7l00ikuhmco73kwpnh
cmtmh2at8000puhmcw3dzwj9d	cmtmh5txl00iouhmct6bdxw44
cmtmh2ayt000ruhmckuterqsc	cmtmh61ge00ituhmcpa3wh2ap
cmtmh2ayt000ruhmckuterqsc	cmtmh5hy100iduhmcfkyre9hh
cmtnebukz002bl704wx8exz0t	cmtmh5hy100iduhmcfkyre9hh
cmtnebukz002bl704wx8exz0t	cmtmh5jif00ieuhmcdwenlr31
cmtnebukz002bl704wx8exz0t	cmtmh5liy00iguhmckrqxtz36
cmtnebukz002bl704wx8exz0t	cmtmh5ne600ihuhmc4cmcmkym
cmtnebukz002bl704wx8exz0t	cmtmh5obx00iiuhmc6ptj5c40
cmtnebukz002bl704wx8exz0t	cmtmh5pa700ijuhmcbnfsxzs3
cmtnebukz002bl704wx8exz0t	cmtmh5r5000iluhmcy0qee0nt
cmtnebukz002bl704wx8exz0t	cmtmh5s2t00imuhmcvc9sy39q
cmtnebukz002bl704wx8exz0t	cmtmh5t0a00inuhmcviso63ks
cmtnebukz002bl704wx8exz0t	cmtmh5txl00iouhmct6bdxw44
cmtnebukz002bl704wx8exz0t	cmtmh5uv200ipuhmce6gjt1wf
cmtnebukz002bl704wx8exz0t	cmtmh5xym00iquhmcyss6znqi
cmtnebukz002bl704wx8exz0t	cmtmh5zij00iruhmc2od8m01k
cmtnebukz002bl704wx8exz0t	cmtmh60ga00isuhmcj5vw860x
cmtnebukz002bl704wx8exz0t	cmtmh61ge00ituhmcpa3wh2ap
cmtnebukz002bl704wx8exz0t	cmtmh62e500iuuhmcitikhtt8
cmtnebukz002bl704wx8exz0t	cmtmh63c100ivuhmcl2255e8b
cmtnebulu002dl704n9ap991p	cmtmh5hy100iduhmcfkyre9hh
cmtnebulu002dl704n9ap991p	cmtmh5kfr00ifuhmcupqx3zn6
cmtnebulu002dl704n9ap991p	cmtmh5q7l00ikuhmco73kwpnh
cmtnebulu002dl704n9ap991p	cmtmh5txl00iouhmct6bdxw44
cmtnebulu002dl704n9ap991p	cmtmh60ga00isuhmcj5vw860x
cmtnebum8002fl704i0zezul9	cmtmh5ne600ihuhmc4cmcmkym
cmtnebum8002fl704i0zezul9	cmtmh5obx00iiuhmc6ptj5c40
cmtnebum8002fl704i0zezul9	cmtmh5pa700ijuhmcbnfsxzs3
cmtnebuml002hl704t8m1jpo1	cmtmh5hy100iduhmcfkyre9hh
cmtnebuml002hl704t8m1jpo1	cmtmh5q7l00ikuhmco73kwpnh
cmtnebuml002hl704t8m1jpo1	cmtmh5txl00iouhmct6bdxw44
cmtnebuml002hl704t8m1jpo1	cmtmh5uv200ipuhmce6gjt1wf
cmtnebun0002jl704gu6tu99r	cmtmh5hy100iduhmcfkyre9hh
cmtnebun0002jl704gu6tu99r	cmtmh5r5000iluhmcy0qee0nt
cmtnebun0002jl704gu6tu99r	cmtmh5s2t00imuhmcvc9sy39q
cmtnebund002ll7046noqrmvd	cmtmh5hy100iduhmcfkyre9hh
cmtnebund002ll7046noqrmvd	cmtmh5liy00iguhmckrqxtz36
cmtnebund002ll7046noqrmvd	cmtmh5q7l00ikuhmco73kwpnh
cmtnebund002ll7046noqrmvd	cmtmh5txl00iouhmct6bdxw44
cmtnebund002ll7046noqrmvd	cmtmh5xym00iquhmcyss6znqi
cmtnebund002ll7046noqrmvd	cmtmh60ga00isuhmcj5vw860x
cmtnebund002ll7046noqrmvd	cmtmh63c100ivuhmcl2255e8b
cmtnebunq002nl704haupu1xp	cmtmh5hy100iduhmcfkyre9hh
cmtnebunq002nl704haupu1xp	cmtmh5jif00ieuhmcdwenlr31
cmtnebunq002nl704haupu1xp	cmtmh5s2t00imuhmcvc9sy39q
cmtnebuo3002pl7042edltt0x	cmtmh5hy100iduhmcfkyre9hh
cmtnebuo3002pl7042edltt0x	cmtmh5jif00ieuhmcdwenlr31
cmtnebuo3002pl7042edltt0x	cmtmh5q7l00ikuhmco73kwpnh
cmtnebuo3002pl7042edltt0x	cmtmh5txl00iouhmct6bdxw44
cmtnebuo3002pl7042edltt0x	cmtmh5s2t00imuhmcvc9sy39q
cmtnebuoh002rl704pjp0tzhf	cmtmh5hy100iduhmcfkyre9hh
cmtnebuoh002rl704pjp0tzhf	cmtmh61ge00ituhmcpa3wh2ap
cmtnfcywy002bkw04q0dxyo71	cmtmh5hy100iduhmcfkyre9hh
cmtnfcywy002bkw04q0dxyo71	cmtmh5jif00ieuhmcdwenlr31
cmtnfcywy002bkw04q0dxyo71	cmtmh5liy00iguhmckrqxtz36
cmtnfcywy002bkw04q0dxyo71	cmtmh5ne600ihuhmc4cmcmkym
cmtnfcywy002bkw04q0dxyo71	cmtmh5obx00iiuhmc6ptj5c40
cmtnfcywy002bkw04q0dxyo71	cmtmh5pa700ijuhmcbnfsxzs3
cmtnfcywy002bkw04q0dxyo71	cmtmh5r5000iluhmcy0qee0nt
cmtnfcywy002bkw04q0dxyo71	cmtmh5s2t00imuhmcvc9sy39q
cmtnfcywy002bkw04q0dxyo71	cmtmh5t0a00inuhmcviso63ks
cmtnfcywy002bkw04q0dxyo71	cmtmh5txl00iouhmct6bdxw44
cmtnfcywy002bkw04q0dxyo71	cmtmh5uv200ipuhmce6gjt1wf
cmtnfcywy002bkw04q0dxyo71	cmtmh5xym00iquhmcyss6znqi
cmtnfcywy002bkw04q0dxyo71	cmtmh5zij00iruhmc2od8m01k
cmtnfcywy002bkw04q0dxyo71	cmtmh60ga00isuhmcj5vw860x
cmtnfcywy002bkw04q0dxyo71	cmtmh61ge00ituhmcpa3wh2ap
cmtnfcywy002bkw04q0dxyo71	cmtmh62e500iuuhmcitikhtt8
cmtnfcywy002bkw04q0dxyo71	cmtmh63c100ivuhmcl2255e8b
cmtnfcyxp002dkw04195e5wl7	cmtmh5hy100iduhmcfkyre9hh
cmtnfcyxp002dkw04195e5wl7	cmtmh5kfr00ifuhmcupqx3zn6
cmtnfcyxp002dkw04195e5wl7	cmtmh5q7l00ikuhmco73kwpnh
cmtnfcyxp002dkw04195e5wl7	cmtmh5txl00iouhmct6bdxw44
cmtnfcyxp002dkw04195e5wl7	cmtmh60ga00isuhmcj5vw860x
cmtnfcyy2002fkw04awwudxzo	cmtmh5ne600ihuhmc4cmcmkym
cmtnfcyy2002fkw04awwudxzo	cmtmh5obx00iiuhmc6ptj5c40
cmtnfcyy2002fkw04awwudxzo	cmtmh5pa700ijuhmcbnfsxzs3
cmtnfcyyg002hkw04p4e07hh5	cmtmh5hy100iduhmcfkyre9hh
cmtnfcyyg002hkw04p4e07hh5	cmtmh5q7l00ikuhmco73kwpnh
cmtnfcyyg002hkw04p4e07hh5	cmtmh5txl00iouhmct6bdxw44
cmtnfcyyg002hkw04p4e07hh5	cmtmh5uv200ipuhmce6gjt1wf
cmtnfcyyu002jkw04kb3j35fb	cmtmh5hy100iduhmcfkyre9hh
cmtnfcyyu002jkw04kb3j35fb	cmtmh5r5000iluhmcy0qee0nt
cmtnfcyyu002jkw04kb3j35fb	cmtmh5s2t00imuhmcvc9sy39q
cmtnfcyz7002lkw048g85hcfo	cmtmh5hy100iduhmcfkyre9hh
cmtnfcyz7002lkw048g85hcfo	cmtmh5liy00iguhmckrqxtz36
cmtnfcyz7002lkw048g85hcfo	cmtmh5q7l00ikuhmco73kwpnh
cmtnfcyz7002lkw048g85hcfo	cmtmh5txl00iouhmct6bdxw44
cmtnfcyz7002lkw048g85hcfo	cmtmh5xym00iquhmcyss6znqi
cmtnfcyz7002lkw048g85hcfo	cmtmh60ga00isuhmcj5vw860x
cmtnfcyz7002lkw048g85hcfo	cmtmh63c100ivuhmcl2255e8b
cmtnfcyzl002nkw04o7ozau3w	cmtmh5hy100iduhmcfkyre9hh
cmtnfcyzl002nkw04o7ozau3w	cmtmh5jif00ieuhmcdwenlr31
cmtnfcyzl002nkw04o7ozau3w	cmtmh5s2t00imuhmcvc9sy39q
cmtnfcyzz002pkw0440gqjj6i	cmtmh5hy100iduhmcfkyre9hh
cmtnfcyzz002pkw0440gqjj6i	cmtmh5jif00ieuhmcdwenlr31
cmtnfcyzz002pkw0440gqjj6i	cmtmh5q7l00ikuhmco73kwpnh
cmtnfcyzz002pkw0440gqjj6i	cmtmh5txl00iouhmct6bdxw44
cmtnfcyzz002pkw0440gqjj6i	cmtmh5s2t00imuhmcvc9sy39q
cmtnfcz0d002rkw04us148vui	cmtmh5hy100iduhmcfkyre9hh
cmtnfcz0d002rkw04us148vui	cmtmh61ge00ituhmcpa3wh2ap
\.


--
-- Data for Name: Salle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Salle" (id, "ecoleId", nom, type, capacite, equipements, "batimentId", "etageId") FROM stdin;
cmtmh3hr8008xuhmc7gulaqyi	cmtmh278b0004uhmc9ijeasvj	A102	classe	35	["tableau","bancs"]	\N	\N
cmtmh3hr8008yuhmcv99owfoc	cmtmh278b0004uhmc9ijeasvj	LAB-SCIENCES	labo	24	["paillasses","microscopes","hotte"]	\N	\N
cmtmh3hr8008zuhmcm0bn4t0j	cmtmh278b0004uhmc9ijeasvj	SALLE-INFO	informatique	30	["ordinateurs","videoprojecteur"]	\N	\N
cmtmh3hr80090uhmc8u38rtde	cmtmh278b0004uhmc9ijeasvj	GYMNASE	sport	60	["tapis","barres"]	\N	\N
cmtmh3hr8008wuhmct2kes5ay	cmtmh278b0004uhmc9ijeasvj	A101	classe	35	["tableau","bancs"]	cmtmh5fxb00i5uhmc7l8j92fp	cmtmh5g8h00i7uhmceh675kqg
\.


--
-- Data for Name: SalleEquipement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SalleEquipement" (id, "salleId", type, quantite, etat, "dateDerniereMaintenance") FROM stdin;
cmtmh5hbq00iauhmcjh4hpw03	cmtmh3hr8008wuhmct2kes5ay	videoprojecteur	1	fonctionnel	\N
cmtmh5hbq00ibuhmcmphvhm1b	cmtmh3hr8008wuhmct2kes5ay	TBI	1	fonctionnel	2026-07-15 00:00:00
cmtmh5hbq00icuhmck9jc8mn0	cmtmh3hr8008wuhmct2kes5ay	climatisation	1	panne	\N
\.


--
-- Data for Name: Sanction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sanction" (id, "incidentId", type, description, "dateDebut", "dateFin", "dureeHeures", statut, "decideParId", "notifieParents", "dateNotification") FROM stdin;
cmtmh3l4x009cuhmc7s9pcuun	cmtmh3kt9009auhmcgzmutl3n	avertissement	Avertissement oral + convocation parent	\N	\N	\N	decidee	cmtmh2b61000tuhmcb913gwgr	t	2026-09-04 04:47:54.559
\.


--
-- Data for Name: Sauvegarde; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sauvegarde" (id, "nomFichier", "tailleOctets", checksum, type, statut, "creeParId", "dateCreation", "ecoleId") FROM stdin;
cmtmh8o7b00ncuhmc5v1fxomp	sauvegarde-20260904-045036.sql	373198	\N	manuelle	reussie	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:51:51.561	\N
cmtnfij6e0000uhf4ai2oliei	auto-sauvegarde-20260904-204857.json	518	\N	automatique	reussie	\N	2026-09-04 20:51:18.803	\N
cmtpvlequ0000uhi4sjalgmb7	sauvegarde-20260906-135457.json	8825	\N	manuelle	reussie	cmtmh2b61000tuhmcb913gwgr	2026-09-06 13:56:59.237	\N
cmtpvvz2z0000uh48v3gi4j4i	sauvegarde-20260906-140345.sql	470610	\N	manuelle	reussie	cmtmh2b61000tuhmcb913gwgr	2026-09-06 14:05:11.817	\N
cmtpw01qw0000uhyorqdnipe2	sauvegarde-20260906-140647.sql	469734	\N	manuelle	reussie	cmtmh2b61000tuhmcb913gwgr	2026-09-06 14:08:21.842	\N
\.


--
-- Data for Name: Seance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Seance" (id, "classeId", "matiereId", "enseignantId", "chapitreId", date, "heureDebut", "heureFin", "salleId", "contenuPrevu", "contenuRealise", statut, "emploiTempsId") FROM stdin;
cmtmh3v1i00avuhmclyz9m8j8	cmtmh2io40027uhmco5514if6	cmtmh2kl7002nuhmcair5l2ws	cmtmh2k9y002luhmcsd3wk406	\N	2026-09-22 08:00:00	08:00	10:00	cmtmh3hr8008wuhmct2kes5ay	Chapitre 1 : Nombres décimaux — addition et soustraction	\N	passee	\N
cmtmh3wm900b7uhmcieppsm51	cmtmh2io40027uhmco5514if6	cmtmh2kl7002nuhmcair5l2ws	cmtmh2k9y002luhmcsd3wk406	\N	2026-09-04 08:00:00	08:00	10:00	cmtmh3hr8008wuhmct2kes5ay	Nombres décimaux — exercices	\N	passee	\N
cmtmh3wrw00b9uhmc0cdt10zl	cmtmh2io40027uhmco5514if6	cmtmh2lkk002tuhmcq1h82y0i	cmtmh2lex002ruhmchh9li2y5	\N	2026-09-04 08:00:00	10:15	12:15	cmtmh3hr8008wuhmct2kes5ay	Dictée et étude de texte	\N	passee	\N
cmtmh3wxj00bbuhmc1lmoy8nt	cmtmh2j520029uhmcakkepakv	cmtmh2m9a002zuhmckj61ccqk	cmtmh2m33002xuhmcjioc8q12	\N	2026-09-04 08:00:00	08:00	10:00	cmtmh3hr8008xuhmc7gulaqyi	L'Afrique précoloniale	\N	passee	\N
cmtmh3x3600bduhmccin1muao	cmtmh2j520029uhmcakkepakv	cmtmh2n980035uhmccs3utepv	cmtmh2mrs0033uhmc489yb2x9	\N	2026-09-04 08:00:00	10:15	12:15	cmtmh3hr8008xuhmc7gulaqyi	Les états de la matière	\N	passee	\N
cmtmh3x8s00bfuhmc7nszi17e	cmtmh2jap002buhmccif5empg	cmtmh2o8x003buhmcerigpu04	cmtmh2o3a0039uhmc81y6hre7	\N	2026-09-04 08:00:00	08:00	10:00	cmtmh3hr8008wuhmct2kes5ay	Irregular verbs — unit 2	\N	passee	\N
cmtmh3xee00bhuhmcdibxrp2s	cmtmh2jap002buhmccif5empg	cmtmh2ox1003huhmclfqgqfpb	cmtmh2orf003fuhmc31ixyw6u	\N	2026-09-04 08:00:00	10:15	12:15	cmtmh3hr8008xuhmc7gulaqyi	Athlétisme — course d'endurance	\N	passee	\N
\.


--
-- Data for Name: Section; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Section" (id, "cycleId", code, libelle) FROM stdin;
cmtnfcyhl0009kw04j3vlm5qx	cmtnfcygu0007kw04sjn0oj4e	MAT	Maternelle
cmtnfcylt000pkw04u8v53bha	cmtnfcylg000nkw04jem3egn2	PRIM	Primaire
cmtnfcyqf001dkw04y4x90mre	cmtnfcyq1001bkw04ba0izmwj	COLL	Collège
cmtnfcyu9001xkw04ur6ejrqn	cmtnfcytv001vkw04w5j9wm7d	LYC	Lycée
cmtmh2cki0015uhmcwmzhjp1w	cmtmh2bsg000xuhmcsyxyiwud	MAT	Maternelle
cmtmh2eta001duhmc0nrolsbm	cmtmh2c3m000zuhmc4t0g61gk	PRIM	Primaire
cmtmh2fqu001puhmccj4wbxpc	cmtmh2c970011uhmco2h5i9vt	COLL	Collège
cmtmh2gj8001zuhmcq3aniqto	cmtmh2ceu0013uhmc0jkr2mxs	LYC	Lycée
cmtnebu5f0009l7047brkuscp	cmtnebu4j0007l704kyhc79zm	MAT	Maternelle
cmtnebua2000pl704znfwl8yq	cmtnebu9n000nl70421ju456n	PRIM	Primaire
cmtnebuej001dl7042a4vk5li	cmtnebue6001bl704py6oapkk	COLL	Collège
cmtnebuia001xl704t5dpy116	cmtnebuhx001vl704qs4ne1gy	LYC	Lycée
\.


--
-- Data for Name: SessionUtilisateur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SessionUtilisateur" (id, "utilisateurId", "tokenHash", "ecoleActiveId", fingerprint, "adresseIp", "userAgent", "deviceType", localisation, "dateCreation", "dateDerniereActivite", "dateExpiration", "expireManuellement", active) FROM stdin;
cmtmh52cd00geuhmcitytgrt5	cmtmh2b61000tuhmcb913gwgr	hash-demo-token-1	\N	fp-1	192.168.1.42	Mozilla/5.0 (Macintosh) Chrome/127.0	desktop	Dakar, Sénégal	2026-09-04 04:49:03.517	2026-09-04 04:49:03.515	2026-09-11 04:49:03.515	f	t
cmtnebv9j002zl704xknjkjrm	cmtnebv44002tl7040aggzb7i	4d74d0d29d0113ee387daf600cfb7f87c358ec953ad834d8b78d10d7fd3e01e6	\N	\N	197.149.244.47	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36	\N	\N	2026-09-04 20:18:08.263	2026-09-04 20:18:21.292	2026-09-05 04:18:08.262	f	t
cmtnfczjo002zkw043znh5pox	cmtnfczfg002tkw04zz9x7xld	5cf6adce3869b089c05ec4e312fcea1287dd9ed694343b6796e060133e11a113	\N	\N	41.223.49.130	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	\N	\N	2026-09-04 20:47:00.085	2026-09-04 20:59:15.053	2026-09-05 04:47:00.084	f	t
cmtpvnzwv005fuhi4zqgzjd72	cmtmh2b61000tuhmcb913gwgr	4ca4b86ac1e9113c170825313953eb77d88e294797a60318b012a52463cb06c4	\N	\N	\N	\N	\N	\N	2026-09-06 13:58:59.982	\N	2026-09-06 13:59:01.503	t	f
cmtpvo5lb005juhi4p1l618bl	cmtmh2b61000tuhmcb913gwgr	876d5936a058026fa07a336b68e60420fbf88a915ee2a3e482eefde55deefdf0	cmtmh6qdx00lkuhmchendtvn1	\N	\N	\N	\N	\N	2026-09-06 13:59:07.343	\N	2026-09-06 14:59:07.34	f	t
\.


--
-- Data for Name: SignalementMineur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SignalementMineur" (id, "ecoleId", "eleveId", type, description, gravite, source, "dateSignalement", "dateFaits", "lieuFaits", "declareParId", "signalantAnonyme", statut, "confidentialiteNiveau", "partenairesExternesIds", "transfertCrip", "dateTransfertCrip", "mesuresProvisoires") FROM stdin;
cmtmh48qy00d2uhmc2hnqx6pu	cmtmh278b0004uhmc9ijeasvj	cmtmh2xm3004fuhmcgntcpsvf	harcelement	Harcèlement verbal entre pairs observé en récréation. Trois témoins.	preoccupant	enseignant	2026-09-04 04:48:25.163	2026-08-20 00:00:00	Cour de récréation	cmtmh2k4c002juhmcu8bjec0z	f	en_cours	restreint	["cmtmh48fu00d0uhmcxtdk0qw6"]	f	\N	\N
\.


--
-- Data for Name: SignatureElectronique; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SignatureElectronique" (id, "documentGenereId", "signataireId", "signataireNom", "hashDocument", certificat, "horodatageRFC3161", "dateSignature", "adresseIp", "userAgent", niveau) FROM stdin;
cmtmh5ezj00i0uhmcx8xirqf5	cmtmh5eoc00hyuhmctqzu5dlz	cmtmh2b61000tuhmcb913gwgr	Direction - Vinci	sha256-demo-1	\N	\N	2026-09-04 04:49:19.902	192.168.1.42	Chrome/127	qualifie
\.


--
-- Data for Name: SmsLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SmsLog" (id, "ecoleId", "notificationId", destinataire, expediteur, message, provider, "providerMessageId", statut, "coutUnitaire", "coutTotal", segments, "dateEnvoi", "dateLivraison", "dateCreation", "codeErreur", tentative) FROM stdin;
cmtmh51cv00g9uhmcpekdqnli	cmtmh278b0004uhmc9ijeasvj	\N	+221 78 333 44 55	\N	Rappel: réunion parents-profs le 5/9 à 17h. Direction.	orange_api	OMS-2026-123456	delivre	2500	2500	1	2026-08-25 10:00:00	2026-08-25 10:00:05	2026-09-04 04:49:02.239	\N	0
\.


--
-- Data for Name: SoldeConge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SoldeConge" (id, "ecoleId", "personnelId", annee, "droitsAcquis", "joursPris", "joursRestants", "reliquatAnterieur", "derniereMaj") FROM stdin;
cmtmh4f2400dyuhmctma7r7p0	cmtmh278b0004uhmc9ijeasvj	cmtmh2k9y002luhmcsd3wk406	2026	25	5	20	3	2026-09-04 04:48:33.341
\.


--
-- Data for Name: SortieAnticipee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SortieAnticipee" (id, "eleveId", date, heure, "autorisationSortieId", "recupereParNom", "validationExceptionnelle", "valideParId", "parentsNotifies", "dateSortie") FROM stdin;
cmtmh6lxa00kzuhmcvnn7ttcf	cmtmh2xxf004juhmcwe9ylhvx	2026-09-18 00:00:00	14:30	\N	Mme Camara (mère)	f	cmtmh2b61000tuhmcb913gwgr	t	2026-09-04 04:50:15.55
cmtmh6m8s00l1uhmcu22u387w	cmtmh2zmv0053uhmcahccrcf8	2026-09-24 00:00:00	10:00	\N	M. Bello (père)	t	cmtmh2b61000tuhmcb913gwgr	t	2026-09-04 04:50:15.964
\.


--
-- Data for Name: Stage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Stage" (id, "ecoleId", "eleveId", entreprise, poste, "dateDebut", "dateFin", "tuteurEntreprise", "encadrantEcoleId", objectifs, evaluation, statut, "conventionUrl") FROM stdin;
cmtmh4efq00duuhmc82gmfbkl	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	Sonatel S.A.	Stage informatique - infrastructures	2026-09-01 00:00:00	2026-09-30 00:00:00	M. Ndiaye (DSI)	cmtmh2k9y002luhmcsd3wk406	Découverte du système d'information d'une grande entreprise. Participation au déploiement d'un serveur.	\N	planifie	\N
\.


--
-- Data for Name: StockArticle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockArticle" (id, "ecoleId", nom, categorie, quantite, "seuilAlerte", unite, "prixUnitaire") FROM stdin;
cmtmh3pzg00aeuhmcoosjjddf	cmtmh278b0004uhmc9ijeasvj	Cahier 200 pages	Papeterie	250	50	pièce	75000
\.


--
-- Data for Name: StockageFichier; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockageFichier" (id, "ecoleId", "nomFichier", chemin, "mimeType", "tailleOctets", confidentiel, "cibleType", "cibleId", "uploadeParId", "dateUpload") FROM stdin;
cmtmh71l800nbuhmcmhruzytt	cmtmh278b0004uhmc9ijeasvj	bienvenue.txt	cmtmh278b0004uhmc9ijeasvj/bienvenue.txt	text/plain	130	f	eleve	cmtmh2wzr004buhmc9crpu0t6	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:50:35.853
\.


--
-- Data for Name: StripeEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StripeEvent" (id, "eventIdStripe", type, donnees, traite, "dateReception", "dateTraitement", erreur) FROM stdin;
cmtmh5b9c00hkuhmcul957zfz	evt_2026_demo_001	invoice.payment_succeeded	{"invoiceId":"in_demo123","amountPaidCentimes":6500000}	t	2026-08-05 00:00:00	2026-08-05 00:00:00	\N
\.


--
-- Data for Name: SuiviSignalement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SuiviSignalement" (id, "signalementId", note, "auteurId", date) FROM stdin;
cmtmh49e300d6uhmcbt2uy5br	cmtmh48qy00d2uhmc2hnqx6pu	Entretien réalisé avec l'élève. Comportement coopératif. Suivi à poursuivre.	cmtmh2b61000tuhmcb913gwgr	2026-09-04 04:48:25.996
\.


--
-- Data for Name: TemplateDocument; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TemplateDocument" (id, "ecoleId", code, libelle, type, "contenuTemplate", "variablesDisponibles", langue, actif, "dateCreation", "dateMaj") FROM stdin;
cmtmh5ecv00hwuhmc6wecf04o	cmtmh278b0004uhmc9ijeasvj	bulletin	Bulletin trimestriel	html_template	<h1>{{ecole_nom}}</h1><h2>Bulletin {{periode_libelle}} — {{eleve_nom}}</h2><table>{{#notes}}<tr><td>{{matiere}}</td><td>{{moyenne}}</td></tr>{{/notes}}</table>	["ecole_nom","periode_libelle","eleve_nom","notes"]	fr	t	2026-09-04 04:49:19.088	2026-09-04 04:49:19.088
\.


--
-- Data for Name: TentativeConnexion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TentativeConnexion" (id, "utilisateurId", email, "adresseIp", "userAgent", succes, "motifEchec", date) FROM stdin;
73	\N	personne.inconnue@nulle.part	127.0.0.7	ua	f	compte_inconnu	2026-09-06 13:10:44.127
74	cmtmh2pwo003juhmc9w13xo2p	comptable@vinci.sn	127.0.0.7	ua	f	mot_de_passe	2026-09-06 13:10:45.651
142	\N	personne.inconnue@nulle.part	127.0.0.7	ua	f	compte_inconnu	2026-09-06 13:34:04.049
143	cmtmh2pwo003juhmc9w13xo2p	comptable@vinci.sn	127.0.0.7	ua	f	mot_de_passe	2026-09-06 13:34:06.116
96	\N	personne.inconnue@nulle.part	127.0.0.7	ua	f	compte_inconnu	2026-09-06 13:19:48.416
97	cmtmh2pwo003juhmc9w13xo2p	comptable@vinci.sn	127.0.0.7	ua	f	mot_de_passe	2026-09-06 13:19:51.561
165	\N	personne.inconnue@nulle.part	127.0.0.7	ua	f	compte_inconnu	2026-09-06 13:52:40.615
166	cmtmh2pwo003juhmc9w13xo2p	comptable@vinci.sn	127.0.0.7	ua	f	mot_de_passe	2026-09-06 13:52:43.246
40	\N	direction@vinci.sn	192.168.1.42	Chrome/127	t	\N	2026-09-04 04:49:07.989
41	\N	inconnu@example.com	10.0.0.5	Mozilla	f	utilisateur_inexistant	2026-09-04 04:49:08.397
42	\N	direction@vinci.sn	\N	\N	t	\N	2026-09-28 07:55:00
43	\N	inconnu@exemple.com	\N	\N	f	Identifiants incorrects	2026-09-28 09:12:00
44	\N	mamadou.fall@vinci.sn	\N	\N	t	\N	2026-09-28 10:30:00
45	\N	mdoumbou2@gmail.com	197.149.244.47	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36	f	compte_inconnu	2026-09-04 15:37:24.165
47	\N	inconnu@nulle.part	127.0.0.1	\N	f	compte_inconnu	2026-09-06 12:34:16.168
49	\N	inconnu@nulle.part	127.0.0.1	\N	f	compte_inconnu	2026-09-06 12:42:46.168
50	\N	personne.inconnue@nulle.part	127.0.0.7	ua	f	compte_inconnu	2026-09-06 12:52:14.832
51	cmtmh2pwo003juhmc9w13xo2p	comptable@vinci.sn	127.0.0.7	ua	f	mot_de_passe	2026-09-06 12:52:17.022
119	\N	personne.inconnue@nulle.part	127.0.0.7	ua	f	compte_inconnu	2026-09-06 13:26:47.842
120	cmtmh2pwo003juhmc9w13xo2p	comptable@vinci.sn	127.0.0.7	ua	f	mot_de_passe	2026-09-06 13:26:49.58
\.


--
-- Data for Name: TestAdmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TestAdmission" (id, "candidatureId", matiere, date, note, sur, appreciation, "evalueParId") FROM stdin;
cmtmh4gaw00e4uhmc0q0fofo5	cmtmh4fdi00e0uhmcocwjwhac	Mathématiques	2026-08-25 09:00:00	16.5	20	Bon niveau logique et arithmétique.	cmtmh2k4c002juhmcu8bjec0z
\.


--
-- Data for Name: ThemeEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ThemeEcole" (id, "ecoleId", "couleurPrimaire", "couleurSecondaire", "couleurAccent", "couleurFond", "logoSidebarUrl", "faviconUrl", "policeFamille", "customCssUrl", "nomProduit", "dateMaj") FROM stdin;
cmtmh59ov00hduhmcipcezq8v	cmtmh278b0004uhmc9ijeasvj	#059669	#0ea5e9	#f59e0b	#f8fafc	\N	\N	Inter	\N	ScolaGestion	2026-09-04 04:49:12.84
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Ticket" (id, "ecoleId", sujet, description, categorie, priorite, statut, "slaContractuelHeures", "slaEcheance", "creeParId", "assigneAId", "dateCreation", "dateCloture", "delaiResolutionMinutes") FROM stdin;
cmtmh47bu00cvuhmch6fsk1xd	cmtmh278b0004uhmc9ijeasvj	Bulletins PDF — erreur de génération pour 6A	Génération des bulletins T1 échoue sur la classe 6A (erreur 500).	technique	haute	en_cours	24	2026-09-05 04:48:23.32	cmtmh2b61000tuhmcb913gwgr	support-editeur-1	2026-09-04 04:48:23.322	\N	\N
\.


--
-- Data for Name: TicketMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TicketMessage" (id, "ticketId", "auteurId", "auteurRole", message, "pieceJointeUrl", interne, "dateEnvoi") FROM stdin;
cmtmh47n400cxuhmcnb46wb6b	cmtmh47bu00cvuhmch6fsk1xd	\N	direction_ecole	Bonjour, impossible de publier les bulletins depuis ce matin.	\N	f	2026-09-04 04:48:23.727
cmtmh47z000czuhmcevhoriix	cmtmh47bu00cvuhmch6fsk1xd	\N	support_editeur	Nous investiguons. Logs indiquent un timeout sur l'API PDF. Intervenant dans 2h.	\N	f	2026-09-04 05:48:24.154
\.


--
-- Data for Name: TicketStatutHistorique; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TicketStatutHistorique" (id, "ticketId", "ancienStatut", "nouveauStatut", "modifieParId", "dateChangement") FROM stdin;
3	cmtmh47bu00cvuhmch6fsk1xd	ouvert	en_cours	support-editeur-1	2026-09-04 04:48:24.358
\.


--
-- Data for Name: TransportArret; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportArret" (id, "ligneId", nom, ordre, heure) FROM stdin;
cmtmh3r8q00aluhmc58zyj56c	cmtmh3qwy00akuhmc60kzc1y2	Marché HLM	1	06:45
cmtmh3r8q00amuhmcny109uwx	cmtmh3qwy00akuhmc60kzc1y2	Sicap Liberté 2	2	06:55
cmtmh3r8q00anuhmcqiwrk4h9	cmtmh3qwy00akuhmc60kzc1y2	École	3	07:20
\.


--
-- Data for Name: TransportInscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportInscription" (id, "ecoleId", "eleveId", "classeId", "ligneId", "arretMonteeId", "arretDescenteId", tarif, actif) FROM stdin;
cmtmh3rv400apuhmc15qht2l0	cmtmh278b0004uhmc9ijeasvj	cmtmh2y8r004nuhmcunq3tc6y	cmtmh2io40027uhmco5514if6	cmtmh3qwy00akuhmc60kzc1y2	\N	\N	1500000	t
\.


--
-- Data for Name: TransportLigne; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportLigne" (id, "ecoleId", nom, vehicule, "chauffeurId") FROM stdin;
cmtmh3qwy00akuhmc60kzc1y2	cmtmh278b0004uhmc9ijeasvj	Ligne Nord — Plateau	Bus 12 places	cmtmh2orf003fuhmc31ixyw6u
\.


--
-- Data for Name: TwoFactorBackupCode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TwoFactorBackupCode" (id, "utilisateurId", "codeHash", utilise, "dateUtilisation", "dateGeneration") FROM stdin;
cmtmh53gu00ghuhmci4eminfg	cmtmh2b61000tuhmcb913gwgr	45098d99639c2eac4ede2adcd07ac7c6eee95be36c6ce7c7210534bee9b11132	f	\N	2026-09-04 04:49:04.972
cmtmh53gv00giuhmcxrpq71da	cmtmh2b61000tuhmcb913gwgr	f576cf38efad83fa37bda459331a8dd7891121472edc29438ed860e9f3122aa4	f	\N	2026-09-04 04:49:04.972
cmtmh53gv00gjuhmcazkx16w7	cmtmh2b61000tuhmcb913gwgr	00ef9931b6c15f14661b80acda9c93970895bced5fb93fb5fc522eb37c9d836f	f	\N	2026-09-04 04:49:04.972
cmtmh53gv00gkuhmch58vfuyi	cmtmh2b61000tuhmcb913gwgr	655a1b90e550b6f5eae65ee6dd01d5db5de4a4e11e32e9c103cd5d0985c5f662	f	\N	2026-09-04 04:49:04.972
cmtmh53gv00gluhmc36tpeeg6	cmtmh2b61000tuhmcb913gwgr	43fe41013ba5db1b10ea284aaed53919a8ed5f048277b0a19e2df43c68f34572	f	\N	2026-09-04 04:49:04.972
cmtmh53gv00gmuhmchxq694nq	cmtmh2b61000tuhmcb913gwgr	85ed71050cae53c655d1f5da37b29b91889d3541408941c7a756cac77930cbcb	f	\N	2026-09-04 04:49:04.973
cmtmh53gv00gnuhmcfk6d22uh	cmtmh2b61000tuhmcb913gwgr	0824ff54a44ebcff47ebe3ce8153f04ac487b811a64965058eb640d98fe6a251	f	\N	2026-09-04 04:49:04.973
cmtmh53gv00gouhmcq2v9nj5r	cmtmh2b61000tuhmcb913gwgr	6eae0a166c9f1a47c6e8b927eebc444ebda3577c8d6595d6f339cfc81ed1b7e5	f	\N	2026-09-04 04:49:04.973
cmtmh53gv00gpuhmc5zh8jjiq	cmtmh2b61000tuhmcb913gwgr	4a93000f163c45a07e19e67c6c060ab99a2bf23570ebe703784e4238c8bfedd6	f	\N	2026-09-04 04:49:04.973
cmtmh53gv00gquhmcd5bl5xin	cmtmh2b61000tuhmcb913gwgr	329484cc655a2b290bec45da29ba17ff087aa0364d64872a04f443ce8b117d90	f	\N	2026-09-04 04:49:04.973
\.


--
-- Data for Name: TwoFactorMethod; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TwoFactorMethod" (id, "utilisateurId", methode, secret, telephone, email, actif, "dateActivation", "derniereUtilisation") FROM stdin;
cmtmh52ni00gguhmc72d9jkaf	cmtmh2b61000tuhmcb913gwgr	totp	JBSWY3DPEHPK3PXP	\N	\N	f	2026-08-01 00:00:00	\N
cmtmh55bq00gvuhmczkdlmjxd	cmtmh2pwo003juhmc9w13xo2p	totp	JBSWY3DPEHPK3PXP	\N	\N	f	2026-09-04 04:49:07.381	\N
\.


--
-- Data for Name: Utilisateur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Utilisateur" (id, "ecoleId", email, "motDePasseHash", telephone, nom, prenom, type, actif, "twofaActive", "derniereConnexion", "tentativesEchouees", "verrouilleJusqua", "consentementPortail", "consentementDate", "createdAt", "deletedAt") FROM stdin;
cmtmh298d0009uhmczpfd7o2y	\N	editeur@platforme.com	scrypt$16384$8$1$9beb546ac9652f78389d0a764008d4a3$fef9e8e3268955731599b1d0e0c453c1f5b2c0bb12b16dc42df9e9986caf970adf18abd29b195f76590a3e1af0209f8cb3b72890c7441adedf9e364e5579bdb6	\N	Éditeur	Super-Admin	super_admin	t	f	\N	0	\N	t	2026-09-04 04:46:52.475	2026-09-04 04:46:52.477	\N
cmtmh2k4c002juhmcu8bjec0z	cmtmh278b0004uhmc9ijeasvj	mamadou.fall@vinci.sn	scrypt$16384$8$1$fb01075813d289871ecb762c520d87c7$86f2aef52f9f1c5493559001128c23b1a106f964f298ef465f6fe96faa42efd0011d4338735576a8e88451318f65829d4980af20dd96bef4b3bb0c9130c4e21f	\N	Fall	Mamadou	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:06.587	2026-09-04 04:47:06.588	\N
cmtmh2l9a002puhmcd461g6jg	cmtmh278b0004uhmc9ijeasvj	fatou.sow@vinci.sn	scrypt$16384$8$1$0752cecb2b5b93629e43b725e31ced5e$7cb4daec6cfb9ebf6e79a28cade7f11bb85af04038e594b7b251b9101c8d2a41dada1a611a0f5979f6514ab178afae690ddcea18b3dac11b7b797a9640f78caa	\N	Sow	Fatou	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:08.061	2026-09-04 04:47:08.062	\N
cmtmh2lxf002vuhmciawbttre	cmtmh278b0004uhmc9ijeasvj	cheikh.ndiaye@vinci.sn	scrypt$16384$8$1$13b53685d11cd0eb6bbddad77c5120c1$3ba22539c9a2d84b88645a9865efc2b6a0ebddadeced11fd9943b4e9c9e174c13862baa69ca63572953ff5e0baca400d3814beffd2e3fa86b1671e7af7b9a09c	\N	Ndiaye	Cheikh	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:08.929	2026-09-04 04:47:08.931	\N
cmtmh2mm60031uhmcnqkwqg2h	cmtmh278b0004uhmc9ijeasvj	aïssatou.ba@vinci.sn	scrypt$16384$8$1$c1c2d74e813abe6b9466d71b938626da$f53cc45d7a897ccf2ecdd607c874754f5bdd9beddb1309318c85520d6760e269faf5ffac9160087e94c8a9e4c40ec1b00aa0adca3083540ad2c7ef2f33b2b6ad	\N	Ba	Aïssatou	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:09.821	2026-09-04 04:47:09.822	\N
cmtmh2nxo0037uhmc921brlo4	cmtmh278b0004uhmc9ijeasvj	ousmane.diallo@vinci.sn	scrypt$16384$8$1$edf69463799107b4f4499aec8635c3ff$1559d8797a6a7e86502a3544d309f9820337923fa24f096c6b37ab91c838da911514e81b7c60698fa2dd3b289c823696d530fd958ed0e76cfce38b789fe733bd	\N	Diallo	Ousmane	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:11.53	2026-09-04 04:47:11.532	\N
cmtmh2olt003duhmckoebt5mr	cmtmh278b0004uhmc9ijeasvj	mariama.gueye@vinci.sn	scrypt$16384$8$1$361aa75c7af94da44773e19b1a4f56f6$24ce10fee8eb1404dae8766f61e4a4b6bbf77c129d7b5f170b183d8f109670967b05c0b1a3f737b81c3ef5e97a5817a53e65648a5b20a0aee3e429e048963b5f	\N	Gueye	Mariama	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:12.399	2026-09-04 04:47:12.401	\N
cmtmh2sjs003nuhmcleyf6m4i	cmtmh278b0004uhmc9ijeasvj	rh@vinci.sn	scrypt$16384$8$1$8e415250a192e4f81c37adc376d791bf$fc4cd861d2c73b213c03867ecf860bc42571184af12e3c04173cb33d336210c93626bc0faedeb25ae3d494a6e61e0eabd95fe3ded52fb1636e5e094d0abde782	\N	Ndiaye	Sophie	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:17.511	2026-09-04 04:47:17.512	\N
cmtmh2t7x003ruhmc6qk0apn9	cmtmh278b0004uhmc9ijeasvj	censeur@vinci.sn	scrypt$16384$8$1$cbd113c76e3d8618d389b771a65c86af$5874956463e13e48eb868f701e02fc5c121ae242d162c7a33e73a90e10c52225dca9ea8bb522d14f8b9cabd99bfcf077844148df39a228e4a0959a4c3659a137	\N	Diagne	Ibrahima	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:18.379	2026-09-04 04:47:18.381	\N
cmtmh2tvz003vuhmcmuifhosf	cmtmh278b0004uhmc9ijeasvj	surveillant@vinci.sn	scrypt$16384$8$1$08534b37909e48627395a647d2ac3b9e$455d094b2b4efca473b7e8157a185d1978572faee9363fe0c2313a4a99820a8325858c9779c53ad54ff127fe0d9b2d3715d5766c7adac1e07f5331ad51c16d3b	\N	Kane	Modou	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:19.245	2026-09-04 04:47:19.247	\N
cmtmh2upx003zuhmclzmrwabo	cmtmh278b0004uhmc9ijeasvj	secretariat@vinci.sn	scrypt$16384$8$1$ad456bb9b5525bc35768602158138261$4cdc585c34b840664a0b5ab24499505b5fbfddbd3a3112c9748c2afabf06bace64c9c5167bb329bb476c399cf2068e2c5a3f3142b5cdcb5df9104a5114ae4044	\N	Fall	Coumba	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:20.323	2026-09-04 04:47:20.325	\N
cmtmh2vdw0043uhmcegiqne0g	cmtmh278b0004uhmc9ijeasvj	assistant@vinci.sn	scrypt$16384$8$1$b2bf775b182a206511e3c3e80ca4a7ef$fd57336714cd78543a47fa7b5936c85ba028623153fd2ab015f2313898ffc14eeb10d7892f50503a09894b79168f92c9b042d1bf8f7a601489776857274b5961	\N	Mbaye	Khadija	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:21.187	2026-09-04 04:47:21.189	\N
cmtmh2w1v0047uhmcx0233oda	cmtmh278b0004uhmc9ijeasvj	infirmiere@vinci.sn	scrypt$16384$8$1$6ce4c7a8fcfcc3d9024646a69df0150d$006ac9f74f4bedeb61f67b30fec0c22c9b7fa1484c175e4ef0adb2e3b5a85127b8206da6ac5d721c51d7625ed946fdecdf1587d260d939368404cdbb1d522d2d	\N	Sow	Aminata	personnel	t	f	\N	0	\N	t	2026-09-04 04:47:22.049	2026-09-04 04:47:22.051	\N
cmtmh326g005nuhmchxupt7s4	cmtmh278b0004uhmc9ijeasvj	parent.ade@gmail.com	scrypt$16384$8$1$9a6aee7f71a1f813d55c737093c17b1a$704198327f52d90dafa5f74cdeb8f9860d164ce784c0f56a93db384d754c035eb4a88c4694b91cf28f13b8a241b380791d6f28017c2391af089c7fc88fe09cf2	\N	Ade	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:47:29.99	2026-09-04 04:47:29.992	\N
cmtmh32zr005ruhmcp0ryu7dc	cmtmh278b0004uhmc9ijeasvj	parent.idriss@gmail.com	scrypt$16384$8$1$cd57058240b29e4833bd731ca8ae2dad$d239567d07dadf39245492535146d047340780a54080185ee5eb57a4f1db4c5ef7b7b4ac5e898a92102b08ad2b04aee6f90a0e62846841d7538abeb83782ba4b	\N	Idriss	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:47:31.045	2026-09-04 04:47:31.047	\N
cmtmh33hz005vuhmckbxz3fz3	cmtmh278b0004uhmc9ijeasvj	parent.aminata@gmail.com	scrypt$16384$8$1$28689db460c329008c60dcd0f399abd0$f46f37eb85b8f8020d45ea815b9630b25031ca1738ec1d5595fdfe277df5b18045e536a2a6d937430b920c517e3bcf365d36a7454b4cc15904e9315e68bc9243	\N	Aminata	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:47:31.702	2026-09-04 04:47:31.704	\N
cmtmh340f005zuhmc0b7v0ujv	cmtmh278b0004uhmc9ijeasvj	parent.omar@gmail.com	scrypt$16384$8$1$a1a2278354ba014507c59d93c0f6260b$8400e00e85e9525699d913cdcabdbe9a726d04cf76f77abd1fdce93f7aedde50c5646bb566dc25a8c156b3ba76cb1aea1a73f3336a5f01103017599724dc8348	\N	Omar	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:47:32.366	2026-09-04 04:47:32.367	\N
cmtmh34j60063uhmc28kmel5m	cmtmh278b0004uhmc9ijeasvj	parent.khadija@gmail.com	scrypt$16384$8$1$46058829db168a12120cda6aa5333e51$6eb4a256043744886a6f95ef179610714e689280a4f1a7a33fe6f561e4281e43801ab0c584a22f8d55339e4657dff1fdf9f46efb107ffa2656d4e7b3b5368548	\N	Khadija	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:47:33.04	2026-09-04 04:47:33.042	\N
cmtmh351r0067uhmcho3phpp3	cmtmh278b0004uhmc9ijeasvj	parent.pape@gmail.com	scrypt$16384$8$1$6127f66ff5d2c5378a36f68d6fc7858e$60b3b6fcf9a9dc09fa5bbf9566345db542829b907f376d045172b079c7dda1f8266ebd1d9ae2ea5c2b1c4a175a3d5f5a4cda2396d1a895c1c36cb5c64792e247	\N	Pape	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:47:33.71	2026-09-04 04:47:33.711	\N
cmtmh35k4006buhmclgygwi6k	cmtmh278b0004uhmc9ijeasvj	parent.sokhna@gmail.com	scrypt$16384$8$1$8352006b08d1b06872287ccc03330f62$db8a3661cea6da996f6cd4e7a990d3f9d3ff5f14a4a2839d6381b6e58ecf917d785ff6fd490317772f09fda625b6669bdc71b2aa6363e5c6d416e41316db58eb	\N	Sokhna	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:47:34.371	2026-09-04 04:47:34.372	\N
cmtmh362g006fuhmcv26gy7w0	cmtmh278b0004uhmc9ijeasvj	parent.awa@gmail.com	scrypt$16384$8$1$99afe86c1bb762df168f5b26ddbdc5ce$08975045a7dc7e506f25649fa470728898ecf81dfba4c42281005ca61f15a7b898ba6fe1950fdc8249e06ffb1cc88688c42dab97641f7f1d5f83ae9c24c411ed	\N	Awa	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:47:35.03	2026-09-04 04:47:35.032	\N
cmtmh2b61000tuhmcb913gwgr	cmtmh278b0004uhmc9ijeasvj	direction@vinci.sn	scrypt$16384$8$1$949c61bde23b9c332506fa8e08fc1a3b$dd78141f23ebfc2c5bd51fcc923e940d4809e24100bf802a945ce9868c5043fe9f9b15b227b6248591d9c1e8d0b7f276ebc66e451bca20300d49d4fe8e27e84a	\N	Diop	Awa	personnel	t	f	\N	0	\N	t	2026-09-04 04:46:54.983	2026-09-04 04:46:54.985	\N
cmtmh36rd006juhmct94pka6o	cmtmh278b0004uhmc9ijeasvj	parent.moussa@gmail.com	scrypt$16384$8$1$a35fcfb457e509e5d4eca4948bc6ea0a$b710015ebee20c0416ff90927950a0aca560ee5dc01ed7e44ac6abfca2f645e67238ee2e530bc440340bdf234d9c78ad3975b827340de9ba0ecd4b3c38bf3181	\N	Moussa	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:47:35.928	2026-09-04 04:47:35.929	\N
cmtmh379r006nuhmc4l39soav	cmtmh278b0004uhmc9ijeasvj	parent.astou@gmail.com	scrypt$16384$8$1$c3962e93c824444c7a0c9877fe7ae3c8$6e15d374c89ed7be49f6d685c21c06a6919631f8864a633a16668f87bcf5168726c600fa986c42843821b4f7191640e075a1760369f64f10e299b355aabddcae	\N	Astou	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:47:36.59	2026-09-04 04:47:36.591	\N
cmtmh37rw006ruhmcg2j4d06k	cmtmh278b0004uhmc9ijeasvj	parent.ibou@gmail.com	scrypt$16384$8$1$6b12863ccb5d9f76072283950bf054cd$3e4800e0228112c11b188d69eaa2a7ec7d7b320c5f9ce62a4891942d92de4880f649209e42c290ec256f6206406446638bff01eb21dd89ffb9ee8adc9093d61e	\N	Ibou	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:47:37.243	2026-09-04 04:47:37.244	\N
cmtmh38aj006vuhmcot1y2yfr	cmtmh278b0004uhmc9ijeasvj	parent.mariama@gmail.com	scrypt$16384$8$1$7cbfb21f3d6aeb439b4f00c33251228e$084e3ef0f28951c94322fb72837d9569228d2db025e9cd15ea38040af4fff2bd38d5a74fe82fdee6fcbd03ca64a68ccc86d727dc02aa75ff6cafb2c94c118f3d	\N	Mariama	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:47:37.914	2026-09-04 04:47:37.915	\N
cmtmh38su006zuhmc9t70opxs	cmtmh278b0004uhmc9ijeasvj	eleve.diop@vinci.sn	scrypt$16384$8$1$0fab302d10200d78c0b228d613815f55$1eea85fc6926fdd538800fccefaf3f54b0f1e15bb9b2f0410ce9e7e9b3c810fad3f91fb551b823f0f9eb5f1137388357c47a26486101ab779eaaaa083220c880	\N	Pape	Diop	eleve	t	f	\N	0	\N	t	2026-09-04 04:47:38.573	2026-09-04 04:47:38.574	\N
cmtn4ca8l0001jo0403oo9z87	cmtmh278b0004uhmc9ijeasvj	mdoumbou2@gmail.com	scrypt$16384$8$1$a2bc718968f76721e3dcd59dfdd61651$5602dc0303da7d60c2c53b14a0c938973026070ede5b1663f91033041d2766abed23236a263210fbe766acdad30fb98aa88d2229582bd35f466daf09f263f4df	622 46 24 85	DOUMBOU	Marina	personnel	f	f	\N	0	\N	f	\N	2026-09-04 15:38:31.51	\N
cmtmh2pwo003juhmc9w13xo2p	cmtmh278b0004uhmc9ijeasvj	comptable@vinci.sn	scrypt$16384$8$1$72d34f656cce128588fe18ed18bf0566$e9fc8f5e0bdbffcb38a29c194ebe129b9dbfb6bd954f030a1d5ed7c6953b4fb61218d305c497ae6176db68d5c9debc54425d83d1ef31ad1fc394b98640089309	\N	Sarr	Bineta	personnel	t	f	\N	6	2026-09-06 14:07:42.515	t	2026-09-04 04:47:14.087	2026-09-04 04:47:14.088	\N
cmtnebv44002tl7040aggzb7i	cmtnebu1g0000l704ty18jg4n	lycagbessi@gmail.com	scrypt$16384$8$1$2c7b02205fcff767336dbc91f9fcd0c1$ecd8991b1dcc8d15ee30e2ef7433b2b9e3788aaafd1e29a65901020dc1824f56bf40a4abaf1c1bb5fba2121e809f42b061cb305409399fcb85d17e4c5419cac0	\N	GBESSI CALYRIS MAHUNAN	Calyris Mahunan	personnel	t	f	2026-09-04 20:18:08.314	0	\N	t	2026-09-04 20:18:08.067	2026-09-04 20:18:08.068	\N
cmtnfczfg002tkw04zz9x7xld	cmtnfcyel0000kw045oa97bhl	projetsites601@gmail.com	scrypt$16384$8$1$def675b3857e2f0f4c103d3ce709c750$0e5288ec5765ded08dd57695c92359241f3ba2624f0f5994126bd40211e413beba5f6f6a269e4e3f4a0fb15c16d298474a60e30c54169ed61d7b212f54eba137	\N	Projet sites 601	Projet	personnel	t	f	2026-09-04 20:47:00.112	0	\N	t	2026-09-04 20:46:59.931	2026-09-04 20:46:59.932	\N
cmtpw02gf0002uhyo4bcb3sgp	cmtmh278b0004uhmc9ijeasvj	anglesmorts@test.sn	scrypt$16384$8$1$2f62e95c6d4cd46cace7affcee57e93c$44d0abb8fcab3250e84eec32f9ee9fb8d2172ff257266b73476847e1f5be18f2536ef387001be9a7850f088ed49ea6ccafbacc9f22e5cc137e5540acf7ee8ff4	\N	Test	Mdp	personnel	t	f	\N	0	\N	f	\N	2026-09-06 14:08:23.151	\N
\.


--
-- Data for Name: UtilisateurEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UtilisateurEcole" (id, "utilisateurId", "ecoleId", "roleLibelle", "dateAjout") FROM stdin;
cmtmh6rnc00lsuhmc53oslowg	cmtmh2b61000tuhmcb913gwgr	cmtmh6qdx00lkuhmchendtvn1	Directeur partenaire	2026-09-04 04:50:22.968
\.


--
-- Data for Name: UtilisateurRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UtilisateurRole" ("utilisateurId", "roleId", "dateDebut", "dateFin") FROM stdin;
cmtmh2pwo003juhmc9w13xo2p	cmtmh2a0b000fuhmc6cr7ay9l	2026-09-04 04:47:17.026	\N
cmtmh2sjs003nuhmcleyf6m4i	cmtmh2ach000juhmcacoi5ra5	2026-09-04 04:47:18.127	\N
cmtmh2t7x003ruhmc6qk0apn9	cmtmh2ai2000luhmc2uqhoab8	2026-09-04 04:47:18.989	\N
cmtmh2tvz003vuhmcmuifhosf	cmtmh2a5w000huhmc7p4zo15n	2026-09-04 04:47:19.862	\N
cmtmh2upx003zuhmclzmrwabo	cmtmh2ann000nuhmcwsdhopzy	2026-09-04 04:47:20.933	\N
cmtmh2vdw0043uhmcegiqne0g	cmtmh2at8000puhmcw3dzwj9d	2026-09-04 04:47:21.796	\N
cmtmh2w1v0047uhmcx0233oda	cmtmh2ayt000ruhmckuterqsc	2026-09-04 04:47:22.656	\N
cmtmh2b61000tuhmcb913gwgr	cmtmh29ji000buhmczb4tf34n	2026-09-04 04:49:58.41	\N
cmtmh2k4c002juhmcu8bjec0z	cmtmh29uq000duhmc5nxwa64g	2026-09-04 04:49:58.41	\N
cmtmh2l9a002puhmcd461g6jg	cmtmh29uq000duhmc5nxwa64g	2026-09-04 04:49:58.41	\N
cmtnebv44002tl7040aggzb7i	cmtnebukz002bl704wx8exz0t	2026-09-04 20:18:08.098	\N
cmtnfczfg002tkw04zz9x7xld	cmtnfcywy002bkw04q0dxyo71	2026-09-04 20:46:59.96	\N
\.


--
-- Data for Name: Vaccination; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Vaccination" (id, "ecoleId", "eleveId", vaccin, "dateVaccination", "dateRappel", statut, "certificatUrl", note, "ficheSanteId") FROM stdin;
cmtmh6pg700lfuhmctsz8k4p6	cmtmh278b0004uhmc9ijeasvj	cmtmh2wzr004buhmc9crpu0t6	DTaP	2024-03-10 00:00:00	\N	a_jour	\N	\N	\N
cmtmh6pg700lguhmcpui0gldn	cmtmh278b0004uhmc9ijeasvj	cmtmh2yvu004vuhmcp3m1bkwz	BCG	2023-11-02 00:00:00	\N	a_jour	\N	\N	\N
cmtmh6pg700lhuhmci3r4jg1i	cmtmh278b0004uhmc9ijeasvj	cmtmh2zmv0053uhmcahccrcf8	ROR	2024-06-15 00:00:00	2027-06-15 00:00:00	rappel_prevu	\N	\N	\N
\.


--
-- Data for Name: VariablePaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VariablePaie" (id, "ecoleId", "personnelId", periode, type, libelle, montant, "dateAttribution", "attribueParId", "bulletinPaieId") FROM stdin;
cmtmh4ckg00dkuhmcdzl6kgme	cmtmh278b0004uhmc9ijeasvj	cmtmh2k9y002luhmcsd3wk406	2026-08	prime	Prime de rendement	1000000	2026-09-04 04:48:30.112	cmtmh2b61000tuhmcb913gwgr	\N
\.


--
-- Data for Name: VerificationAntecedents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VerificationAntecedents" (id, "ecoleId", "personnelId", type, "referenceDossier", statut, "dateDemande", "dateObtention", "dateExpiration", "fichierUrl", "valideParId") FROM stdin;
cmtmh49p700d8uhmc3e6jofcg	cmtmh278b0004uhmc9ijeasvj	cmtmh2k9y002luhmcsd3wk406	casier_judiciaire	\N	obtenue	2026-07-15 00:00:00	2026-07-25 00:00:00	2027-07-25 00:00:00	\N	cmtmh2b61000tuhmcb913gwgr
\.


--
-- Data for Name: Visiteur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Visiteur" (id, "ecoleId", nom, "motifVisite", "personneVisiteeId", "dateHeureEntree", "dateHeureSortie", "pieceIdentiteVerifiee", "badgeNumero") FROM stdin;
cmtmh45g800cnuhmcf8adrft3	cmtmh278b0004uhmc9ijeasvj	Inspecteur Régional DIOP	Inspection pédagogique - Maths	\N	2026-09-04 04:48:20.889	\N	t	V-0042
\.


--
-- Data for Name: VoteConseil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VoteConseil" (id, "deliberationId", "membreId", vote, date) FROM stdin;
cmtmh4m3y00eruhmcenb7lg4h	cmtmh4lsp00epuhmciy1a8fxu	cmtmh4kns00eluhmcgp85exjo	pour	2026-09-04 04:48:42.478
\.


--
-- Data for Name: WebhookDelivery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WebhookDelivery" (id, "webhookId", event, payload, "statutHttp", "reponseCorps", tentative, statut, "dateCreation", "dateEnvoi", "prochaineTentative") FROM stdin;
cmtmh57cr00h1uhmc8kxra2b9	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"eleveId":"cmtmh2wzr004buhmc9crpu0t6"}	200	ok	1	livre	2026-09-04 04:49:10.011	2026-09-04 04:49:10.009	\N
cmtmha5gn001duhdkskqpetvz	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtmha3x00019uhdk74d7v9hs","matricule":"EL-0013"},"timestamp":"2026-09-04T04:53:00.669Z"}	\N	fetch failed	1	echec	2026-09-04 04:53:00.839	\N	\N
cmtmha7u1001luhdktc2qr9ga	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtmha71g001huhdkogw1gpzx","matricule":"EL-0014"},"timestamp":"2026-09-04T04:53:03.907Z"}	\N	fetch failed	1	echec	2026-09-04 04:53:03.913	\N	\N
cmtoi5l46000tuh0orn5xanha	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtoi5jgj000ruh0owmkpq037","matricule":"EL-0013"},"timestamp":"2026-09-05T14:52:59.417Z"}	\N	fetch failed	1	echec	2026-09-05 14:52:59.813	\N	\N
cmtoi5nkx000xuh0oal8dbtjc	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtoi5mge000vuh0o4thjjgbj","matricule":"EL-0014"},"timestamp":"2026-09-05T14:53:03.002Z"}	\N	fetch failed	1	echec	2026-09-05 14:53:03.01	\N	\N
cmtoifv0f000ruhso3kw3f5ek	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtoifsdi000puhso3v4dtbei","matricule":"EL-0013"},"timestamp":"2026-09-05T15:00:58.851Z"}	\N	fetch failed	1	echec	2026-09-05 15:00:59.199	\N	\N
cmtoifx8c000vuhso5vip9ojl	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtoifw2d000tuhsozlu33lpi","matricule":"EL-0014"},"timestamp":"2026-09-05T15:01:02.065Z"}	\N	fetch failed	1	echec	2026-09-05 15:01:02.076	\N	\N
cmtouiisj000ruhcw6087e52u	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtouihrc000puhcw035j71zy","matricule":"EL-0013"},"timestamp":"2026-09-05T20:38:58.408Z"}	\N	fetch failed	1	echec	2026-09-05 20:38:58.724	\N	\N
cmtouikod000vuhcw2dlbh6kw	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtouijzr000tuhcwpc7q3syk","matricule":"EL-0014"},"timestamp":"2026-09-05T20:39:01.158Z"}	\N	fetch failed	1	echec	2026-09-05 20:39:01.165	\N	\N
cmtpt2soj000ruhroymfg6ay8	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpt2r4q000puhrowbtmaq8l","matricule":"EL-0013"},"timestamp":"2026-09-06T12:46:31.301Z"}	\N	fetch failed	1	echec	2026-09-06 12:46:31.603	\N	\N
cmtpt2v25000vuhropsq6f9mq	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpt2tlh000tuhro25sjc548","matricule":"EL-0014"},"timestamp":"2026-09-06T12:46:34.681Z"}	\N	fetch failed	1	echec	2026-09-06 12:46:34.686	\N	\N
cmtpt8auw0086uhronlxt1t83	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpt88xw0084uhrovtv1ecem","matricule":"EL-0015"},"timestamp":"2026-09-06T12:50:48.433Z"}	\N	fetch failed	1	echec	2026-09-06 12:50:48.441	\N	\N
cmtptgafj000tuhp8r9aw23ln	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtptg90g000ruhp8x847bgrs","matricule":"EL-0013"},"timestamp":"2026-09-06T12:57:00.743Z"}	\N	fetch failed	1	echec	2026-09-06 12:57:01.135	\N	\N
cmtptgd9d000xuhp811h1bh9w	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtptgbav000vuhp87vzvfb75","matricule":"EL-0014"},"timestamp":"2026-09-06T12:57:04.793Z"}	\N	fetch failed	1	echec	2026-09-06 12:57:04.802	\N	\N
cmtptjzwi0086uhp8den46jre	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtptjz320084uhp8v8us0os6","matricule":"EL-0015"},"timestamp":"2026-09-06T12:59:54.094Z"}	\N	fetch failed	1	echec	2026-09-06 12:59:54.115	\N	\N
cmtptsqe5000ruhash90poyyx	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtptsphy000puhasuqej8jq7","matricule":"EL-0013"},"timestamp":"2026-09-06T13:06:41.567Z"}	\N	fetch failed	1	echec	2026-09-06 13:06:41.694	\N	\N
cmtptssgq000vuhaspi0q5riy	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtptsr6p000tuhastf5rmxsh","matricule":"EL-0014"},"timestamp":"2026-09-06T13:06:44.374Z"}	\N	fetch failed	1	echec	2026-09-06 13:06:44.379	\N	\N
cmtptw21i0084uhas4nuf9dan	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtptw1130082uhas5em43w7y","matricule":"EL-0015"},"timestamp":"2026-09-06T13:09:16.491Z"}	\N	fetch failed	1	echec	2026-09-06 13:09:16.758	\N	\N
cmtpu4d2d000tuhdw3f0a5ozs	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpu4bqj000ruhdwelijh3hg","matricule":"EL-0013"},"timestamp":"2026-09-06T13:15:44.059Z"}	\N	fetch failed	1	echec	2026-09-06 13:15:44.293	\N	\N
cmtpu4eju000xuhdwqvgox88x	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpu4dvu000vuhdwhhqh751j","matricule":"EL-0014"},"timestamp":"2026-09-06T13:15:46.210Z"}	\N	fetch failed	1	echec	2026-09-06 13:15:46.219	\N	\N
cmtpu8l4i0086uhdw3n891ihu	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpu8kat0084uhdwaau6wi3y","matricule":"EL-0015"},"timestamp":"2026-09-06T13:19:01.351Z"}	\N	fetch failed	1	echec	2026-09-06 13:19:01.362	\N	\N
cmtpuey1w000ruh28rcujzns9	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpuew9i000puh28aph741mr","matricule":"EL-0013"},"timestamp":"2026-09-06T13:23:57.824Z"}	\N	fetch failed	1	echec	2026-09-06 13:23:58.052	\N	\N
cmtpuf035000vuh28ilclwl6w	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpuez23000tuh28ailq4ori","matricule":"EL-0014"},"timestamp":"2026-09-06T13:24:00.686Z"}	\N	fetch failed	1	echec	2026-09-06 13:24:00.69	\N	\N
cmtpuhn4d0082uh28ny4c6sfw	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpuhmbr0080uh28loyt7x9a","matricule":"EL-0015"},"timestamp":"2026-09-06T13:26:03.836Z"}	\N	fetch failed	1	echec	2026-09-06 13:26:03.853	\N	\N
cmtpunkbw000ruh9geit9qiyf	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpunjdw000puh9g92929kt1","matricule":"EL-0013"},"timestamp":"2026-09-06T13:30:39.972Z"}	\N	fetch failed	1	echec	2026-09-06 13:30:40.171	\N	\N
cmtpunlra000vuh9g9fdcj66t	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpunl4h000tuh9g0j3n7we2","matricule":"EL-0014"},"timestamp":"2026-09-06T13:30:42.015Z"}	\N	fetch failed	1	echec	2026-09-06 13:30:42.022	\N	\N
cmtpuqofv0084uh9gjh55q44k	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpuqn910082uh9gbhukhlat","matricule":"EL-0015"},"timestamp":"2026-09-06T13:33:05.431Z"}	\N	fetch failed	1	echec	2026-09-06 13:33:05.468	\N	\N
cmtpv9fyp000ruhvsk59lxctk	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpv9ejp000puhvs825f9xwm","matricule":"EL-0013"},"timestamp":"2026-09-06T13:47:40.726Z"}	\N	fetch failed	1	echec	2026-09-06 13:47:40.945	\N	\N
cmtpv9hsn000vuhvsin33tgm2	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpv9gvx000tuhvsrrq8iulo","matricule":"EL-0014"},"timestamp":"2026-09-06T13:47:43.313Z"}	\N	fetch failed	1	echec	2026-09-06 13:47:43.319	\N	\N
cmtpvdt410088uhvsb38wpk17	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpvdrkv0086uhvse5bkxky1","matricule":"EL-0015"},"timestamp":"2026-09-06T13:51:04.497Z"}	\N	fetch failed	1	echec	2026-09-06 13:51:04.609	\N	\N
cmtpvn4du004duhi46yn1nqwu	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpvn2n60049uhi4taz4wvr1","matricule":"EL-0013"},"timestamp":"2026-09-06T13:58:18.715Z"}	\N	fetch failed	1	echec	2026-09-06 13:58:19.122	\N	\N
cmtpvoa3e005puhi4qcv81lan	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpvo98c005nuhi4f410x9g8","matricule":"EL-0014"},"timestamp":"2026-09-06T13:59:13.163Z"}	\N	fetch failed	1	echec	2026-09-06 13:59:13.178	\N	\N
cmtpw10hg000nuhyocblx65pj	cmtmh571j00gzuhmcyt53trud	eleve.inscription	{"event":"eleve.inscription","ecoleId":"cmtmh278b0004uhmc9ijeasvj","data":{"eleveId":"cmtpw0z0h000juhyo4aabx63i","matricule":"EL-0015"},"timestamp":"2026-09-06T14:09:07.022Z"}	\N	fetch failed	1	echec	2026-09-06 14:09:07.252	\N	\N
\.


--
-- Data for Name: WebhookSortant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WebhookSortant" (id, "ecoleId", url, secret, events, actif, "dateCreation", "dernierEnvoi") FROM stdin;
cmtmh571j00gzuhmcyt53trud	cmtmh278b0004uhmc9ijeasvj	https://sirh-region.sn/webhooks/eleves	whsec_demo	["eleve.inscription","eleve.sortie"]	t	2026-09-04 04:49:09.606	\N
\.


--
-- Data for Name: WidgetDashboard; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WidgetDashboard" (id, "utilisateurId", titre, type, source, configuration, "position", taille, actif, "dateCreation") FROM stdin;
cmtmh5flu00i3uhmcx83p0cpe	cmtmh2b61000tuhmcb913gwgr	Effectifs par classe	chart	sql	{"chartType":"bar","dataset":"eleves_by_classe"}	0	md	t	2026-09-04 04:49:20.706
\.


--
-- Data for Name: _EcoleToPermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."_EcoleToPermission" ("A", "B") FROM stdin;
cmtmh278b0004uhmc9ijeasvj	cmtmh5hy100iduhmcfkyre9hh
cmtmh278b0004uhmc9ijeasvj	cmtmh5jif00ieuhmcdwenlr31
cmtmh278b0004uhmc9ijeasvj	cmtmh5kfr00ifuhmcupqx3zn6
cmtmh278b0004uhmc9ijeasvj	cmtmh5liy00iguhmckrqxtz36
cmtmh278b0004uhmc9ijeasvj	cmtmh5ne600ihuhmc4cmcmkym
cmtmh278b0004uhmc9ijeasvj	cmtmh5obx00iiuhmc6ptj5c40
cmtmh278b0004uhmc9ijeasvj	cmtmh5pa700ijuhmcbnfsxzs3
cmtmh278b0004uhmc9ijeasvj	cmtmh5q7l00ikuhmco73kwpnh
cmtmh278b0004uhmc9ijeasvj	cmtmh5r5000iluhmcy0qee0nt
cmtmh278b0004uhmc9ijeasvj	cmtmh5s2t00imuhmcvc9sy39q
cmtmh278b0004uhmc9ijeasvj	cmtmh5t0a00inuhmcviso63ks
cmtmh278b0004uhmc9ijeasvj	cmtmh5txl00iouhmct6bdxw44
cmtmh278b0004uhmc9ijeasvj	cmtmh5uv200ipuhmce6gjt1wf
cmtmh278b0004uhmc9ijeasvj	cmtmh5xym00iquhmcyss6znqi
cmtmh278b0004uhmc9ijeasvj	cmtmh5zij00iruhmc2od8m01k
cmtmh278b0004uhmc9ijeasvj	cmtmh60ga00isuhmcj5vw860x
cmtmh278b0004uhmc9ijeasvj	cmtmh61ge00ituhmcpa3wh2ap
cmtmh278b0004uhmc9ijeasvj	cmtmh62e500iuuhmcitikhtt8
cmtmh278b0004uhmc9ijeasvj	cmtmh63c100ivuhmcl2255e8b
\.


--
-- Name: ApiTokenLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ApiTokenLog_id_seq"', 3, true);


--
-- Name: AuditLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AuditLog_id_seq"', 493, true);


--
-- Name: TentativeConnexion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TentativeConnexion_id_seq"', 187, true);


--
-- Name: TicketStatutHistorique_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TicketStatutHistorique_id_seq"', 3, true);


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
-- Name: DemandeCompte DemandeCompte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DemandeCompte"
    ADD CONSTRAINT "DemandeCompte_pkey" PRIMARY KEY (id);


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
-- Name: DemandeCompte_ecoleId_statut_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DemandeCompte_ecoleId_statut_idx" ON public."DemandeCompte" USING btree ("ecoleId", statut);


--
-- Name: DemandeCompte_utilisateurId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DemandeCompte_utilisateurId_key" ON public."DemandeCompte" USING btree ("utilisateurId");


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
-- Name: DemandeCompte DemandeCompte_ecoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DemandeCompte"
    ADD CONSTRAINT "DemandeCompte_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES public."Ecole"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DemandeCompte DemandeCompte_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DemandeCompte"
    ADD CONSTRAINT "DemandeCompte_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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

\unrestrict 9Uw2dauiJXcyvJRm3UZqNl1l3j7LjcoVTRlhSRnlKicAS60BIRiG2Ym5O8TgyYl

