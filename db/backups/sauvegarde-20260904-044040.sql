--
-- PostgreSQL database dump
--

\restrict lMGKsByUWzG8C5Vcy8BiDTCDiu3J010be3clbGHYWisPu1lns2HRO8i3tCZm5nP

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
cmtmgo75b0006uh88688ey4bd	cmtmgo6sx0004uh88s2x44zis	cmtmgo6ay0001uh884drho0ne	2026-08-01 00:00:00	\N	actif	mensuel	2026-09-04 04:35:56.591	2026-09-04 04:35:56.591
\.


--
-- Data for Name: Activite; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Activite" (id, "ecoleId", type, titre, description, destination, "dateDebut", "dateFin", cout, devise, capacite, statut, "creeParId") FROM stdin;
cmtmgs85800mquh88x74jbt7i	cmtmgo6sx0004uh88s2x44zis	sortie	Sortie pédagogique au Lac Rose	Journée découverte —lac de Retba, sel et écologie	Lac Rose, Retba	2026-09-25 04:39:04.506	2026-09-25 04:39:04.506	350000	XOF	30	planifiee	cmtmgo9vh000tuh885aak9o8v
cmtmgs93600myuh882m0g5w00	cmtmgo6sx0004uh88s2x44zis	voyage	Voyage culturel — Sine-Saloum	\N	Toubacouta	2027-04-10 00:00:00	2027-04-13 00:00:00	1250000	XOF	20	planifiee	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: ActiviteParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActiviteParticipant" (id, "activiteId", "eleveId", statut, autorisation, "dateAutorisation", "paiementStatut") FROM stdin;
cmtmgs8gl00msuh889vds8ndm	cmtmgs85800mquh88x74jbt7i	cmtmgorat004buh88hr1gqs35	confirme	accordee	2026-09-04 04:39:04.914	a_payer
cmtmgs8rv00muuh88ovbjymgv	cmtmgs85800mquh88x74jbt7i	cmtmgory9004fuh88zsi0593d	inscrit	en_attente	\N	a_payer
cmtmgs8xk00mwuh88vtpmvfvb	cmtmgs85800mquh88x74jbt7i	cmtmgosa4004juh88wvwv1eh6	inscrit	en_attente	\N	non_exigible
cmtmgs9ef00n0uh88ppknyxl1	cmtmgs93600myuh882m0g5w00	cmtmgot9u004vuh88peonuxaw	inscrit	en_attente	\N	a_payer
\.


--
-- Data for Name: Amenagement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Amenagement" (id, "eleveId", "besoinSpecifiqueId", "typeAmenagement", description, "dateDebut", "dateFin", "valideParId") FROM stdin;
cmtmgpdqy009guh88e2njyhcf	cmtmgosa4004juh88wvwv1eh6	cmtmgpdf4009euh88r1l7tqmi	tiers_temps	Tiers-temps sur compositions (+30 min sur 2h)	2026-09-01 00:00:00	\N	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: AnneeScolaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnneeScolaire" (id, "ecoleId", libelle, "dateDebut", "dateFin", active) FROM stdin;
cmtmgoacz000vuh889r1st2jf	cmtmgo6sx0004uh88s2x44zis	2026-2027	2026-09-01 00:00:00	2027-07-15 00:00:00	t
cmtmgs18200lmuh881woii6po	cmtmgs0wc00lkuh88quxpe5xg	2026-2027	2026-09-01 00:00:00	2027-07-15 00:00:00	t
\.


--
-- Data for Name: Annonce; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Annonce" (id, "ecoleId", titre, contenu, "auteurId", "datePublication", "dateExpiration", statut, cible, "cibleIds", pinned, "pieceJointeUrl") FROM stdin;
cmtmgqi8a00g5uh887e457is8	cmtmgo6sx0004uh88s2x44zis	Rentrée scolaire 2026-2027	Chères familles, la rentrée est fixée au lundi 1er septembre à 8h. Réunion parents-profs le 5 septembre à 17h.	cmtmgo9vh000tuh885aak9o8v	2026-08-20 00:00:00	\N	publie	toute_ecole	\N	t	\N
\.


--
-- Data for Name: AnnonceLecture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnnonceLecture" (id, "annonceId", "utilisateurId", "dateLecture") FROM stdin;
cmtmgqikl00g7uh889ljjubhb	cmtmgqi8a00g5uh887e457is8	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:44.707
\.


--
-- Data for Name: ApiToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiToken" (id, "ecoleId", nom, description, "tokenHash", prefix, scopes, "tauxLimiteHoraire", actif, "dateCreation", "dateExpiration", "dernierUsage", "totalRequettes") FROM stdin;
cmtmgqndf00gxuh881ldq0zka	cmtmgo6sx0004uh88s2x44zis	Intégration SIRH externe	Token pour synchronisation avec le SIRH régional	hash-api-token-1	sk_live_abcd	["eleves:read","classes:read"]	500	t	2026-09-04 04:37:50.931	\N	2026-09-04 04:37:50.929	42
\.


--
-- Data for Name: ApiTokenLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiTokenLog" (id, "apiTokenId", endpoint, methode, statut, "tempsReponse", "adresseIp", date) FROM stdin;
2	cmtmgqndf00gxuh881ldq0zka	/api/v1/eleves	GET	200	142	10.0.0.1	2026-09-04 04:37:51.354
\.


--
-- Data for Name: AttributionManuel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttributionManuel" (id, "manuelScolaireId", "eleveId", "dateAttribution", "dateRestitutionPrevue", "etatRemise", "etatRetour", statut, "echeanceFraisGenereeId") FROM stdin;
cmtmgpgj100a4uh88qkm245ex	cmtmgpg7900a2uh88driuk6qf	cmtmgorat004buh88hr1gqs35	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmgpgut00a6uh88n5wiwsj3	cmtmgpg7900a2uh88driuk6qf	cmtmgory9004fuh88zsi0593d	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmgph0p00a8uh88aal8l363	cmtmgpg7900a2uh88driuk6qf	cmtmgosa4004juh88wvwv1eh6	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmgph6k00aauh88kcqv7d7d	cmtmgpg7900a2uh88driuk6qf	cmtmgosm9004nuh88zuai7w3x	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
cmtmgphce00acuh88mgj8jtnz	cmtmgpg7900a2uh88driuk6qf	cmtmgosy4004ruh88uq1eevfi	2026-09-05 00:00:00	2027-07-10 00:00:00	bon	\N	en_cours	\N
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "ecoleId", "utilisateurId", action, "cibleType", "cibleId", details, "adresseIp", "userAgent", "dateAction") FROM stdin;
85	cmtmgo6sx0004uh88s2x44zis	cmtmgo9vh000tuh885aak9o8v	paiement.encaissement	paiement	\N	{"montantCentimes":10000000,"eleveId":"cmtmgorat004buh88hr1gqs35"}	\N	\N	2026-09-04 04:37:15.064
86	cmtmgo6sx0004uh88s2x44zis	cmtmgogi5002juh88vhsapsfo	note.saisie	evaluation	\N	{"evaluationId":"cmtmgp3ed0071uh88kvidwogq","classeId":"cmtmgof590027uh885f9q1ffp"}	\N	\N	2026-09-04 04:37:15.064
87	cmtmgo6sx0004uh88s2x44zis	cmtmgo9vh000tuh885aak9o8v	eleve.inscription	eleve	\N	{"eleveId":"cmtmgosy4004ruh88uq1eevfi","classeId":"cmtmgof590027uh885f9q1ffp"}	\N	\N	2026-09-04 04:37:15.064
88	cmtmgo6sx0004uh88s2x44zis	cmtmgo9vh000tuh885aak9o8v	support.connexion_en_tant_que	ecole	\N	{"motif":"Vérification paramètres"}	\N	\N	2026-09-04 04:37:15.064
\.


--
-- Data for Name: AutorisationSortie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AutorisationSortie" (id, "eleveId", "nomPersonneAutorisee", "lienAvecEleve", telephone, "photoUrl", active, "valideeParId") FROM stdin;
cmtmgpvdg00cpuh88s8cu39o6	cmtmgorat004buh88hr1gqs35	Maman Diop	mere	+221 76 000 00 00	\N	t	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: AvancementProgramme; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AvancementProgramme" (id, "chapitreId", "classeId", "enseignantId", pourcentage, "dateMaj", commentaire) FROM stdin;
cmtmgrnf600jluh886qjiqonx	cmtmgrmlz00jfuh88wnxo8fe3	cmtmgof590027uh885f9q1ffp	cmtmgogop002luh88qdoewzyw	65	2026-09-04 04:38:37.65	Chapitre bien avancé, évaluation prévue semaine 42.
cmtmgrnqw00jnuh88qo5c2f1z	cmtmgrmxo00jhuh887sw25zqn	cmtmgof590027uh885f9q1ffp	cmtmgogop002luh88qdoewzyw	15	2026-09-04 04:38:38.072	\N
cmtmgroea00jtuh88ssjs4z25	cmtmgro8f00jruh88mzbss5ky	cmtmgofgz0029uh88fxh173kn	cmtmgohvt002ruh88urmcnww6	80	2026-09-04 04:38:38.914	Bon rythme, dictées hebdomadaires en place.
cmtmgrp7o00jzuh885k2oeoh9	cmtmgrp1q00jxuh8855j8ral2	cmtmgofmu002buh88919kv67g	cmtmgoilf002xuh881z4m5vbm	35	2026-09-04 04:38:39.972	Décalage dû à l'arrêt maladie — rattrapage planifié.
cmtmgrpdi00k1uh882aikiwxu	cmtmgrn9b00jjuh88qxylrkoz	cmtmgof590027uh885f9q1ffp	cmtmgogop002luh88qdoewzyw	40	2026-09-04 04:38:40.183	\N
\.


--
-- Data for Name: AvoirEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AvoirEcole" (id, "ecoleId", numero, "dateEmission", montant, devise, motif, "paiementLieId", "factureFournisseurId", statut, "emisParId") FROM stdin;
cmtmgqg9300fvuh88292p2ktq	cmtmgo6sx0004uh88s2x44zis	AV-2026-001	2026-08-25 00:00:00	1500000	XOF	Cahiers défectueux (4 unités)	\N	cmtmgqfl600fruh88a8c10if9	emis	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: AvoirSaas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AvoirSaas" (id, "ecoleId", "factureSaasLieeId", numero, "dateEmission", montant, devise, motif, statut, "stripeCreditNoteId") FROM stdin;
cmtmgqslb00hmuh88jdrjdpbs	cmtmgo6sx0004uh88s2x44zis	\N	AV-SAAS-2026-001	2026-08-15 00:00:00	500000	XOF	Erreur de facturation — prorata jours de suspension	emis	\N
\.


--
-- Data for Name: Batiment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Batiment" (id, "ecoleId", nom, adresse, "nombreEtages", "accessibilitePMR", "dateConstruction", "dateMaj") FROM stdin;
cmtmgqw7m00i5uh880iopx45x	cmtmgo6sx0004uh88s2x44zis	Bâtiment Principal A	Avenue Léopold S. Senghor, Dakar	3	t	2010-09-01 00:00:00	2026-09-04 04:38:02.386
\.


--
-- Data for Name: BesoinSpecifique; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BesoinSpecifique" (id, "eleveId", type, description, "dateDiagnostic", "documentJustificatifUrl", confidentiel, "creeLe") FROM stdin;
cmtmgpdf4009euh88r1l7tqmi	cmtmgosa4004juh88wvwv1eh6	trouble_apprentissage	Dyslexie diagnostiquée	2025-03-10 00:00:00	\N	t	2026-09-04 04:36:51.374
\.


--
-- Data for Name: BiblioLivre; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiblioLivre" (id, "ecoleId", isbn, titre, auteur, editeur, "anneePublication", "exemplairesTotal", "exemplairesDisponibles", categorie, cote) FROM stdin;
cmtmgpjm500aruh88wgu8i296	cmtmgo6sx0004uh88s2x44zis	978-2-221-23456-7	Le Petit Prince	Antoine de Saint-Exupéry	Gallimard	1943	5	4	Littérature jeunesse	R-PE-001
\.


--
-- Data for Name: BiblioPret; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiblioPret" (id, "livreId", "eleveId", "datePret", "dateRetourPrevue", "dateRetourEffective", statut, "penaliteGeneree") FROM stdin;
cmtmgpjxw00atuh883lz5732s	cmtmgpjm500aruh88wgu8i296	cmtmgorat004buh88hr1gqs35	2026-09-10 00:00:00	2026-09-24 00:00:00	\N	en_cours	0
\.


--
-- Data for Name: Budget; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Budget" (id, "ecoleId", "anneeScolaireId", libelle, "dateDebut", "dateFin", statut, "valideParId", "dateValidation") FROM stdin;
cmtmgqars00exuh88z36wbgl1	cmtmgo6sx0004uh88s2x44zis	cmtmgoacz000vuh889r1st2jf	Budget prévisionnel 2026-2027	2026-09-01 00:00:00	2027-08-31 00:00:00	valide	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:37:34.598
\.


--
-- Data for Name: Bulletin; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Bulletin" (id, "eleveId", "classeId", "periodeId", version, statut, moyennes, "moyenneGenerale", rang, "appreciationGenerale", "decisionConseil", "pdfUrl", "creeParId", "dateCreation", "dateValidationPp", "validePpParId", "dateValidationDirection", "valideDirectionParId", "datePublication", "updatedAt") FROM stdin;
cmtmgrq6y00k7uh88bqwnbeom	cmtmgorat004buh88hr1gqs35	cmtmgof590027uh885f9q1ffp	cmtmgofss002duh88aterf035	1	publie	{"MATHS":14.5,"FR":13,"HG":15.5}	14.3	2	Trimestre solide, continue ainsi !	admis	/documents/bulletins/bulletin-1-t1.pdf	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:38:41.242	2026-12-10 00:00:00	cmtmgo9vh000tuh885aak9o8v	2026-12-12 00:00:00	cmtmgo9vh000tuh885aak9o8v	2026-12-13 00:00:00	2026-09-04 04:38:41.242
cmtmgrr1z00k9uh88k2bsh549	cmtmgory9004fuh88zsi0593d	cmtmgof590027uh885f9q1ffp	cmtmgofss002duh88aterf035	1	valide_pp	{"MATHS":11,"FR":16.5,"HG":12}	13.2	4	Bon trimestre en français.	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:38:42.359	2026-12-11 00:00:00	cmtmgo9vh000tuh885aak9o8v	\N	\N	\N	2026-09-04 04:38:42.359
cmtmgrrdq00kbuh88vrz5ziig	cmtmgosa4004juh88wvwv1eh6	cmtmgof590027uh885f9q1ffp	cmtmgofss002duh88aterf035	1	en_construction	{"MATHS":9.5,"FR":10.5,"HG":11}	\N	\N	\N	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:38:42.783	\N	\N	\N	\N	\N	2026-09-04 04:38:42.783
\.


--
-- Data for Name: BulletinAppreciation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BulletinAppreciation" (id, "bulletinId", "matiereId", appreciation, "enseignantId", "periodeId") FROM stdin;
cmtmgsa0x00n2uh885bloorqk	cmtmgrq6y00k7uh88bqwnbeom	cmtmgoh0i002nuh88k1pjyp0u	Travail sérieux et régulier, continuez ainsi.	cmtmgogi5002juh88vhsapsfo	\N
cmtmgsacb00n4uh885avntsnd	cmtmgrq6y00k7uh88bqwnbeom	cmtmgoi1v002tuh88tll4xgkx	Travail sérieux et régulier, continuez ainsi.	cmtmgohpy002puh88gjp9m8e6	\N
\.


--
-- Data for Name: BulletinPaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BulletinPaie" (id, "ecoleId", "personnelId", periode, "salaireBrut", "salaireNet", "cotisationsTotales", "retenuesTotales", "primesTotales", "netAPayer", devise, statut, "dateEdition", "dateValidation", "datePaiement", "valideParId", "pdfUrl") FROM stdin;
cmtmgq09c00dcuh88qi8qk0ce	cmtmgo6sx0004uh88s2x44zis	cmtmgogop002luh88qdoewzyw	2026-08	28000000	21000000	7000000	0	2500000	23500000	XOF	valide	2026-09-04 04:37:20.976	2026-09-04 04:37:20.973	\N	cmtmgo9vh000tuh885aak9o8v	\N
\.


--
-- Data for Name: CahierTexte; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CahierTexte" (id, "ecoleId", "classeId", "matiereId", "enseignantId", "periodeId", statut, "dateCreation") FROM stdin;
cmtmgq7su00efuh88f4mwu3cf	cmtmgo6sx0004uh88s2x44zis	cmtmgof590027uh885f9q1ffp	cmtmgoh0i002nuh88k1pjyp0u	cmtmgogop002luh88qdoewzyw	cmtmgofss002duh88aterf035	actif	2026-09-04 04:37:30.744
\.


--
-- Data for Name: CalendrierScolaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CalendrierScolaire" (id, "ecoleId", "anneeScolaireId", type, libelle, "dateDebut", "dateFin") FROM stdin;
cmtmgpawn0091uh8871l6ixco	cmtmgo6sx0004uh88s2x44zis	cmtmgoacz000vuh889r1st2jf	vacances	Toussaint	2026-10-25 00:00:00	2026-11-02 00:00:00
cmtmgpawn0092uh88zy8ymp6m	cmtmgo6sx0004uh88s2x44zis	cmtmgoacz000vuh889r1st2jf	vacances	Noël	2026-12-19 00:00:00	2027-01-04 00:00:00
cmtmgpawn0093uh88sak5h603	cmtmgo6sx0004uh88s2x44zis	cmtmgoacz000vuh889r1st2jf	jour_ferie	Tabaski	2026-08-22 00:00:00	2026-08-22 00:00:00
cmtmgpawn0094uh88hxc6qpxy	cmtmgo6sx0004uh88s2x44zis	cmtmgoacz000vuh889r1st2jf	journee_pedagogique	Formation équipe	2026-09-01 00:00:00	2026-09-01 00:00:00
\.


--
-- Data for Name: Candidature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Candidature" (id, "offreId", nom, prenom, email, telephone, "cvUrl", "lettreMotivation", source, "dateReception", statut, "etapeActuelle") FROM stdin;
cmtmgq27v00douh888fwobq6q	cmtmgq1w400dmuh886bvrzxqq	Ba	Awa	awa.ba@example.com	+221 77 000 11 22	\N	\N	offre	2026-09-04 04:37:23.516	entretien	entretien_direction
\.


--
-- Data for Name: CandidatureAdmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CandidatureAdmission" (id, "sourceIp", "ecoleId", "niveauId", nom, prenom, "dateNaissance", "lieuNaissance", sexe, email, telephone, "parentNom", "parentTelephone", statut, "dateSoumission", "dateDecision", "parcoursAnterieur", "etablissementOrigine", "dossierComplet", "notesEntretien") FROM stdin;
cmtmgq4iq00e0uh8840msx3he	\N	cmtmgo6sx0004uh88s2x44zis	cmtmgodu9001ruh888tefyz7z	Sow	Moussa	2015-03-12 00:00:00	Dakar	M	famille.sow@example.com	+221 78 333 44 55	Sow (père)	+221 78 333 44 55	test	2026-09-04 04:37:26.498	\N	CM2 - École publique Pikine	École élélémentaire Pikine Nord	t	\N
\.


--
-- Data for Name: CantineInscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CantineInscription" (id, "ecoleId", "eleveId", "classeId", "anneeScolaireId", "joursSemaine", "tarifJournalier", actif) FROM stdin;
cmtmgrxsw00l3uh88tnhcnthc	cmtmgo6sx0004uh88s2x44zis	cmtmgorat004buh88hr1gqs35	cmtmgof590027uh885f9q1ffp	cmtmgoacz000vuh889r1st2jf	[1,3,5]	150000	t
cmtmgry4n00l5uh88gh7539p2	cmtmgo6sx0004uh88s2x44zis	cmtmgou9b0057uh88n7wx77hb	cmtmgofgz0029uh88fxh173kn	cmtmgoacz000vuh889r1st2jf	[1,2,3,4,5]	120000	t
\.


--
-- Data for Name: CantineMenu; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CantineMenu" (id, "ecoleId", date, "platPrincipal", accompagnement, dessert, allergenes) FROM stdin;
cmtmgs3qd00luuh88pvoynio4	cmtmgo6sx0004uh88s2x44zis	2026-09-04 00:00:00	Thiéboudienne	Riz blanc	\N	["poisson"]
cmtmgs41q00lwuh88aycv3fcg	cmtmgo6sx0004uh88s2x44zis	2026-09-05 00:00:00	Yassa poulet	\N	Fruit de saison	["oeuf"]
cmtmgs47e00lyuh889li3mfau	cmtmgo6sx0004uh88s2x44zis	2026-09-06 00:00:00	Couscous légumes	\N	\N	[]
\.


--
-- Data for Name: CantinePresence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CantinePresence" (id, "ecoleId", "eleveId", date, present) FROM stdin;
cmtmgs4of00m0uh88cf89m5wr	cmtmgo6sx0004uh88s2x44zis	cmtmgorat004buh88hr1gqs35	2026-09-04 00:00:00	t
cmtmgs4zu00m2uh88cvvakwek	cmtmgo6sx0004uh88s2x44zis	cmtmgou9b0057uh88n7wx77hb	2026-09-04 00:00:00	t
\.


--
-- Data for Name: Chapitre; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Chapitre" (id, "programmeId", titre, ordre, "volumeHorairePrevu", contenu, ressources) FROM stdin;
cmtmgrmlz00jfuh88wnxo8fe3	cmtmgrma700jduh884kbeozy9	Nombres décimaux	1	12	Addition, soustraction, multiplication des décimaux.	\N
cmtmgrmxo00jhuh887sw25zqn	cmtmgrma700jduh884kbeozy9	Proportionnalité	2	10	\N	\N
cmtmgrn9b00jjuh88qxylrkoz	cmtmgrma700jduh884kbeozy9	Figures usuelles	3	14	\N	\N
cmtmgro8f00jruh88mzbss5ky	cmtmgro2j00jpuh888tz6hfrx	Les types de phrases	1	10	\N	\N
cmtmgrp1q00jxuh8855j8ral2	cmtmgrok500jvuh88umkwfs7v	Les grandes découvertes	1	12	\N	\N
\.


--
-- Data for Name: Classe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Classe" (id, "niveauId", "anneeScolaireId", "ecoleId", code, libelle, "capaciteMax", "enseignantPrincipalId") FROM stdin;
cmtmgof590027uh885f9q1ffp	cmtmgodu9001ruh888tefyz7z	cmtmgoacz000vuh889r1st2jf	cmtmgo6sx0004uh88s2x44zis	6A	Sixième A	35	cmtmgogop002luh88qdoewzyw
cmtmgofgz0029uh88fxh173kn	cmtmgoe03001tuh88kdq6x6j9	cmtmgoacz000vuh889r1st2jf	cmtmgo6sx0004uh88s2x44zis	5B	Cinquième B	35	cmtmgohvt002ruh88urmcnww6
cmtmgofmu002buh88919kv67g	cmtmgodik001nuh882ng65v4l	cmtmgoacz000vuh889r1st2jf	cmtmgo6sx0004uh88s2x44zis	CM2-A	CM2 A	30	cmtmgoilf002xuh881z4m5vbm
cmtmgs1vl00lquh88mbovufbj	cmtmgodu9001ruh888tefyz7z	cmtmgs18200lmuh881woii6po	cmtmgs0wc00lkuh88quxpe5xg	6A-ETO	Sixième A (Étoile)	30	\N
\.


--
-- Data for Name: CommandeFournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CommandeFournisseur" (id, "ecoleId", "fournisseurId", numero, "dateCommande", "dateLivraisonPrevue", "dateLivraisonEffective", "montantTotal", devise, statut, "valideeParId") FROM stdin;
cmtmgqe9n00fkuh884ngxbqgm	cmtmgo6sx0004uh88s2x44zis	cmtmgqdxp00fiuh88nc4iffa3	CMD-2026-001	2026-08-01 00:00:00	2026-08-15 00:00:00	\N	24000000	XOF	recue_partielle	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: Competence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Competence" (id, "ecoleId", "cycleId", "matiereId", libelle, ordre) FROM stdin;
cmtmgpwcd00cruh8872matw8z	cmtmgo6sx0004uh88s2x44zis	cmtmgoaol000xuh88idtn1b76	\N	Distinguer les lettres de l'alphabet	1
cmtmgpwo500ctuh88i7eq76to	cmtmgo6sx0004uh88s2x44zis	cmtmgoaol000xuh88idtn1b76	\N	Compter jusqu'à 20	2
cmtmgrrph00kduh88iqpgv00w	cmtmgo6sx0004uh88s2x44zis	cmtmgob0a000zuh88w39s6w1i	\N	Lire couramment un texte adapté	1
cmtmgrsie00kfuh88uebuu250	cmtmgo6sx0004uh88s2x44zis	cmtmgob0a000zuh88w39s6w1i	\N	Résoudre un problème à une étape	2
\.


--
-- Data for Name: CompteComptable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CompteComptable" (id, "ecoleId", numero, libelle, type, parent, solde, devise, actif) FROM stdin;
cmtmgqbrd00f4uh88aaqlexiy	cmtmgo6sx0004uh88s2x44zis	512	Banque	actif	\N	250000000	XOF	t
cmtmgqc3300f6uh8840qmgunt	cmtmgo6sx0004uh88s2x44zis	401	Fournisseurs	passif	\N	35000000	XOF	t
cmtmgqc8y00f8uh88sd6lxuoe	cmtmgo6sx0004uh88s2x44zis	411	Clients (parents)	actif	\N	85000000	XOF	t
cmtmgqcex00fauh881zhh8s07	cmtmgo6sx0004uh88s2x44zis	607	Achats de marchandises	charge	\N	42000000	XOF	t
\.


--
-- Data for Name: ConfigurationPaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConfigurationPaie" (id, "ecoleId", "tauxEmployeur", "tauxSalarie", "primesRecurrentes", "majParId", "dateMaj") FROM stdin;
cmtmgs0ki00ljuh8853unmv79	cmtmgo6sx0004uh88s2x44zis	0.084	0.0524	[{"libelle":"Prime de transport","montant":100000}]	\N	2026-09-04 04:38:54.689
\.


--
-- Data for Name: Conge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Conge" (id, "personnelId", type, "dateDebut", "dateFin", statut, motif, "justificatifUrl", "traiteParId", "updatedAt") FROM stdin;
cmtmgrk4h00j5uh886x6r3mpx	cmtmgoilf002xuh881z4m5vbm	maladie	2026-09-01 04:38:33.374	2026-09-10 04:38:33.374	valide	Arrêt maladie — certificat fourni	\N	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:38:33.377
cmtmgrkgb00j7uh88qd8qxc38	cmtmgok000039uh88lfxvziqb	annuel	2026-12-21 00:00:00	2027-01-04 00:00:00	demande	Congés annuels fin d'année	\N	\N	2026-09-04 04:38:33.803
\.


--
-- Data for Name: ConseilClasse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConseilClasse" (id, "ecoleId", "classeId", "periodeId", date, salle, statut, "compteRendu", "presidentId") FROM stdin;
cmtmgq8gf00ejuh88828xsflo	cmtmgo6sx0004uh88s2x44zis	cmtmgof590027uh885f9q1ffp	cmtmgofss002duh88aterf035	2026-10-15 17:00:00	Salle de conférence	planifie	Conseil de classe T1 — 25 élèves, 0 redoublement, 3 félicitations.	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: ConsentementCommunication; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConsentementCommunication" (id, "ecoleId", "utilisateurId", "eleveId", canal, accord, "dateAccord", "dateRetrait", motif) FROM stdin;
cmtmgqpnq00h7uh88cqbrnkiw	cmtmgo6sx0004uh88s2x44zis	cmtmgo9vh000tuh885aak9o8v	\N	email	t	2026-08-01 00:00:00	\N	\N
\.


--
-- Data for Name: ConsentementImage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConsentementImage" (id, "ecoleId", "eleveId", accord, usage, "dateAccord", "valideParParentId", duree, "dateCreation", "dateMaj") FROM stdin;
cmtmgqpbv00h5uh88ksw1zoac	cmtmgo6sx0004uh88s2x44zis	cmtmgorat004buh88hr1gqs35	t	site_web	2026-08-05 00:00:00	cmtmgovto005puh88u2t7gifb	annee_scolaire	2026-09-04 04:37:53.467	2026-09-04 04:37:53.467
\.


--
-- Data for Name: ConventionStage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConventionStage" (id, "stageId", "numeroConvention", "dateSignature", "signeParEleve", "signeParEcole", "signeParEntreprise", "fichierUrl", statut) FROM stdin;
cmtmgq3v100dwuh88yfrtb7n1	cmtmgq3j900duuh88j2okbgyq	CONV-2026-001	2026-08-22 00:00:00	t	t	t	\N	signe
\.


--
-- Data for Name: Conversation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Conversation" (id, "ecoleId", titre, type, "creeParId", "dateCreation", "dernierMessageAt") FROM stdin;
cmtmgqglo00fxuh88gcsi88cf	cmtmgo6sx0004uh88s2x44zis	Direction ↔ Vie scolaire	direct	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:37:42.148	2026-09-04 04:37:42.148
\.


--
-- Data for Name: ConversationParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConversationParticipant" (id, "conversationId", "utilisateurId", role, "dateAjout", "dernierLectureAt", archive) FROM stdin;
cmtmgqgxg00fyuh88cuqggq93	cmtmgqglo00fxuh88gcsi88cf	cmtmgo9vh000tuh885aak9o8v	admin	2026-09-04 04:37:42.579	\N	f
cmtmgqgxg00fzuh88o0uz5tv5	cmtmgqglo00fxuh88gcsi88cf	cmtmgogi5002juh88vhsapsfo	membre	2026-09-04 04:37:42.579	\N	f
\.


--
-- Data for Name: CotisationSociale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CotisationSociale" (id, "bulletinId", libelle, assiette, "tauxEmployeur", "tauxSalarie", "partEmployeur", "partSalarie") FROM stdin;
cmtmgq18b00diuh885qwk8r1d	cmtmgq09c00dcuh88qi8qk0ce	IPM ( retraite)	28000000	0.084	0.0524	2352000	1467200
\.


--
-- Data for Name: CreneauHebdo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CreneauHebdo" (id, "emploiTempsId", "jourSemaine", "heureDebut", "heureFin", "salleId", "matiereId", "enseignantId", "classeId", type) FROM stdin;
cmtmgq6hr00e7uh88v3uw4ji5	cmtmgq65m00e6uh88wo3jchhc	1	08:00	10:00	\N	\N	\N	\N	cours
cmtmgq6hr00e8uh884lfaz091	cmtmgq65m00e6uh88wo3jchhc	3	10:00	12:00	\N	\N	\N	\N	cours
cmtmgq6hr00e9uh886y9q3kba	cmtmgq65m00e6uh88wo3jchhc	5	08:00	10:00	\N	\N	\N	\N	cours
\.


--
-- Data for Name: CreneauRdv; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CreneauRdv" (id, "personnelId", date, "heureDebut", "heureFin", statut, lieu, "lienVisio") FROM stdin;
cmtmgpqms00cjuh88ay4u5g4v	cmtmgogop002luh88qdoewzyw	2026-09-30 16:00:00	16:00	16:15	reserve	presentiel	\N
\.


--
-- Data for Name: Cycle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Cycle" (id, "ecoleId", code, libelle, ordre, "modeEvaluation") FROM stdin;
cmtmgoaol000xuh88idtn1b76	cmtmgo6sx0004uh88s2x44zis	MAT	Maternelle	1	competences
cmtmgob0a000zuh88w39s6w1i	cmtmgo6sx0004uh88s2x44zis	PRIM	Primaire	2	chiffre
cmtmgob630011uh88yjtn8ugb	cmtmgo6sx0004uh88s2x44zis	COLL	Collège	3	chiffre
cmtmgobbx0013uh886zxw3tfp	cmtmgo6sx0004uh88s2x44zis	LYC	Lycée	4	chiffre
\.


--
-- Data for Name: DeliberationConseil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DeliberationConseil" (id, "conseilId", "eleveId", decision, mention, "appreciationGenerale", "objectifSuivant", avis) FROM stdin;
cmtmgq9fp00epuh884wmnwrng	cmtmgq8gf00ejuh88828xsflo	cmtmgorat004buh88hr1gqs35	passage	felicitations	Excellent trimestre, travail rigoureux.	Maintenir le rythme en T2.	\N
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
cmtmgp9wk008vuh88cjgxx84z	cmtmgo6sx0004uh88s2x44zis	Fournitures bureau	Achat papier + cartouches imprimante	4500000	XOF	2026-09-12 00:00:00	Sénégal Boutique	\N	\N	t	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:36:46.606	f	2026-09-04 04:36:46.61
\.


--
-- Data for Name: Devoir; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Devoir" (id, "ecoleId", "classeId", "matiereId", "enseignantId", intitule, description, "dateAssignation", "dateRendu", sur, coefficient, type, "pieceJointeUrl", statut, "cahierTexteId") FROM stdin;
cmtmgq75100ebuh882ejkqx4f	cmtmgo6sx0004uh88s2x44zis	cmtmgof590027uh885f9q1ffp	cmtmgoh0i002nuh88k1pjyp0u	cmtmgogop002luh88qdoewzyw	Devoir maison n°1 — Fractions	Exercices 1 à 5 page 23.	2026-08-15 00:00:00	2026-08-22 00:00:00	20	1	dm	\N	corrige	\N
\.


--
-- Data for Name: Dispense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Dispense" (id, "ecoleId", "eleveId", "matiereId", motif, description, "dateDebut", "dateFin", "justificatifUrl", statut, "valideParId", "dateValidation") FROM stdin;
cmtmgqa4500etuh88ras1p366	cmtmgo6sx0004uh88s2x44zis	cmtmgosa4004juh88wvwv1eh6	cmtmgoi1v002tuh88tll4xgkx	medical	Asthme sévère — dispense d'EPS pour 4 semaines.	2026-08-15 00:00:00	2026-09-15 00:00:00	/uploads/certif-medical-eps.pdf	validee	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:37:33.746
\.


--
-- Data for Name: DocumentEleve; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DocumentEleve" (id, "eleveId", type, "fichierUrl", confidentiel, "dateAjout", "ajouteParId") FROM stdin;
cmtmgrjmq00j1uh88nd98w2uo	cmtmgorat004buh88hr1gqs35	acte_naissance	/uploads/docs/acte-diop.pdf	f	2026-09-04 04:38:32.738	cmtmgo9vh000tuh885aak9o8v
cmtmgrjyg00j3uh883ghq23eb	cmtmgory9004fuh88zsi0593d	certificat_medical	/uploads/docs/cert-med.pdf	t	2026-09-04 04:38:33.16	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: DocumentGenere; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DocumentGenere" (id, "ecoleId", "templateId", "cibleType", "cibleId", titre, format, "fichierUrl", "tailleOctets", version, "genereParId", "dateGeneration", "hashContenu") FROM stdin;
cmtmgquwm00hyuh88n7cqy00h	cmtmgo6sx0004uh88s2x44zis	cmtmgqukn00hwuh88avwa188g	bulletin	demo-bulletin-1	Bulletin T1 - DIOP Awa - 6A	pdf	/documents/bulletin-demo.pdf	245000	1	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:38:00.693	sha256-demo-1
\.


--
-- Data for Name: DomainePersonnalise; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DomainePersonnalise" (id, "ecoleId", domaine, verifie, "enAttente", "enregistrementCname", "certificatSSL", "certificatExpireLe", "dateAjout", "dateVerification") FROM stdin;
cmtmgqqb600hbuh881vdbjfiq	cmtmgo6sx0004uh88s2x44zis	ecole.vinci.sn	t	f	vinci.platforme.com.	letsencrypt	2026-11-20 00:00:00	2026-08-01 00:00:00	2026-08-01 00:00:00
\.


--
-- Data for Name: EcheanceFrais; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EcheanceFrais" (id, "eleveId", "fraisId", montant, remise, "motifRemise", devise, "dateEcheance", "montantPaye", statut, source, "dateCreation", "updatedAt") FROM stdin;
cmtmgp69r007tuh882knhiokd	cmtmgorat004buh88hr1gqs35	cmtmgp5s3007puh88z63sklny	7500000	0	\N	XOF	2026-09-15 00:00:00	7500000	payee	\N	2026-09-04 04:36:42.111	2026-09-04 04:36:42.111
cmtmgp6lf007vuh8834ta3qbe	cmtmgorat004buh88hr1gqs35	cmtmgp63t007ruh88wim9f4gc	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:36:42.531	2026-09-04 04:36:42.531
cmtmgp6rb007xuh88shcnqlkp	cmtmgory9004fuh88zsi0593d	cmtmgp5s3007puh88z63sklny	7500000	0	\N	XOF	2026-09-15 00:00:00	7500000	payee	\N	2026-09-04 04:36:42.743	2026-09-04 04:36:42.743
cmtmgp6x6007zuh88x77jdiaq	cmtmgory9004fuh88zsi0593d	cmtmgp63t007ruh88wim9f4gc	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:36:42.954	2026-09-04 04:36:42.954
cmtmgp7320081uh88ess2xd8z	cmtmgosa4004juh88wvwv1eh6	cmtmgp5s3007puh88z63sklny	7500000	0	\N	XOF	2026-09-15 00:00:00	7500000	payee	\N	2026-09-04 04:36:43.166	2026-09-04 04:36:43.166
cmtmgp78x0083uh88o5jpwuv9	cmtmgosa4004juh88wvwv1eh6	cmtmgp63t007ruh88wim9f4gc	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:36:43.378	2026-09-04 04:36:43.378
cmtmgp7eq0085uh880g2yao91	cmtmgosm9004nuh88zuai7w3x	cmtmgp5s3007puh88z63sklny	7500000	0	\N	XOF	2026-09-15 00:00:00	4000000	partiel	\N	2026-09-04 04:36:43.586	2026-09-04 04:36:43.586
cmtmgp7kk0087uh889he1dfxn	cmtmgosm9004nuh88zuai7w3x	cmtmgp63t007ruh88wim9f4gc	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:36:43.796	2026-09-04 04:36:43.796
cmtmgp7qf0089uh88jnybcf8w	cmtmgosy4004ruh88uq1eevfi	cmtmgp5s3007puh88z63sklny	7500000	0	\N	XOF	2026-08-16 04:36:44.005	0	impayee	\N	2026-09-04 04:36:44.007	2026-09-04 04:36:44.007
cmtmgp7wl008buh887o1gci66	cmtmgosy4004ruh88uq1eevfi	cmtmgp63t007ruh88wim9f4gc	2500000	0	\N	XOF	2026-09-10 00:00:00	2500000	payee	\N	2026-09-04 04:36:44.229	2026-09-04 04:36:44.229
cmtmgp82u008duh889b56kppz	cmtmgot9u004vuh88peonuxaw	cmtmgp5s3007puh88z63sklny	7500000	0	\N	XOF	2026-08-27 04:36:44.453	0	impayee	\N	2026-09-04 04:36:44.455	2026-09-04 04:36:44.455
cmtmgp88o008fuh88vzxbwrb0	cmtmgotlm004zuh883nzgofgh	cmtmgp5s3007puh88z63sklny	7500000	0	\N	XOF	2026-08-09 04:36:44.663	3000000	partiel	\N	2026-09-04 04:36:44.665	2026-09-04 04:36:44.665
cmtmgp8em008huh88xbx0lkez	cmtmgotxd0053uh88wckmigfj	cmtmgp5s3007puh88z63sklny	7500000	0	\N	XOF	2026-09-16 04:36:44.876	0	impayee	\N	2026-09-04 04:36:44.878	2026-09-04 04:36:44.878
cmtmgp8kh008juh882s882ruv	cmtmgou9b0057uh88n7wx77hb	cmtmgp5s3007puh88z63sklny	7500000	0	\N	XOF	2026-09-16 04:36:45.088	7500000	payee	\N	2026-09-04 04:36:45.089	2026-09-04 04:36:45.089
\.


--
-- Data for Name: Ecole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Ecole" (id, nom, slug, pays, devise, "fuseauHoraire", "logoUrl", "dateCreation", statut, "deletedAt", "planCourantId") FROM stdin;
cmtmgo6sx0004uh88s2x44zis	Institut Léonard de Vinci	vinci	SN	XOF	Africa/Dakar	\N	2026-09-04 04:35:56.139	actif	\N	cmtmgo6ay0001uh884drho0ne
cmtmgs0wc00lkuh88quxpe5xg	Cours Secondaire Étoile	etoile-demo	SN	XOF	Africa/Dakar	\N	2026-09-04 04:38:55.115	essai	\N	\N
\.


--
-- Data for Name: EcritureComptable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EcritureComptable" (id, "ecoleId", "journalId", date, "numeroPiece", libelle, statut, "valideParId", "dateValidation", "pieceJustificativeUrl") FROM stdin;
cmtmgqcwn00feuh88d7n6f5dp	cmtmgo6sx0004uh88s2x44zis	cmtmgqckt00fcuh88rqdvl6fl	2026-08-05 00:00:00	ACH-2026-001	Achat fournitures bureau	valide	cmtmgo9vh000tuh885aak9o8v	2026-08-05 00:00:00	\N
\.


--
-- Data for Name: Eleve; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Eleve" (id, "ecoleId", matricule, nom, prenom, "dateNaissance", "lieuNaissance", sexe, "photoUrl", statut, "dateInscription", "dateSortie", "motifSortie", "classeActuelleId", adresse, allergies, "conditionMedicale", "contactUrgence", "consentementPortailEleve", "consentementPortailEleveDate", "consentementPhotoInterne", "consentementPhotoExterne", "utilisateurId", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmtmgorat004buh88hr1gqs35	cmtmgo6sx0004uh88s2x44zis	EL-0001	Ade	Adepo	2010-01-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgof590027uh885f9q1ffp	\N	\N	\N	\N	t	2026-09-15 00:00:00	t	t	\N	2026-09-04 04:36:22.708	2026-09-04 04:36:22.708	\N
cmtmgory9004fuh88zsi0593d	cmtmgo6sx0004uh88s2x44zis	EL-0002	Idriss	Bello	2009-02-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgof590027uh885f9q1ffp	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:36:23.553	2026-09-04 04:36:23.553	\N
cmtmgosa4004juh88wvwv1eh6	cmtmgo6sx0004uh88s2x44zis	EL-0003	Aminata	Camara	2008-03-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgof590027uh885f9q1ffp	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:36:23.98	2026-09-04 04:36:23.98	\N
cmtmgosm9004nuh88zuai7w3x	cmtmgo6sx0004uh88s2x44zis	EL-0004	Omar	Cissé	2007-04-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgof590027uh885f9q1ffp	\N	\N	\N	\N	t	2026-09-15 00:00:00	t	f	\N	2026-09-04 04:36:24.416	2026-09-04 04:36:24.416	\N
cmtmgosy4004ruh88uq1eevfi	cmtmgo6sx0004uh88s2x44zis	EL-0005	Khadija	Dieng	2006-05-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgof590027uh885f9q1ffp	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:36:24.844	2026-09-04 04:36:24.844	\N
cmtmgotlm004zuh883nzgofgh	cmtmgo6sx0004uh88s2x44zis	EL-0007	Sokhna	Faye	2004-07-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgofgz0029uh88fxh173kn	\N	\N	\N	\N	t	2026-09-15 00:00:00	t	f	\N	2026-09-04 04:36:25.69	2026-09-04 04:36:25.69	\N
cmtmgotxd0053uh88wckmigfj	cmtmgo6sx0004uh88s2x44zis	EL-0008	Awa	Gueye	2003-08-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgofgz0029uh88fxh173kn	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:36:26.113	2026-09-04 04:36:26.113	\N
cmtmgou9b0057uh88n7wx77hb	cmtmgo6sx0004uh88s2x44zis	EL-0009	Moussa	Kane	2002-09-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgofgz0029uh88fxh173kn	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	f	\N	2026-09-04 04:36:26.543	2026-09-04 04:36:26.543	\N
cmtmgoul1005buh88liihk6zb	cmtmgo6sx0004uh88s2x44zis	EL-0010	Astou	Mbaye	2001-10-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgofmu002buh88919kv67g	\N	\N	\N	\N	f	\N	t	f	\N	2026-09-04 04:36:26.965	2026-09-04 04:36:26.965	\N
cmtmgouwt005fuh88ayapvc5f	cmtmgo6sx0004uh88s2x44zis	EL-0011	Ibou	Sarr	2000-11-15 00:00:00	Dakar	M	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgofmu002buh88919kv67g	\N	\N	\N	\N	f	\N	f	t	\N	2026-09-04 04:36:27.389	2026-09-04 04:36:27.389	\N
cmtmgov8p005juh88weazn0sb	cmtmgo6sx0004uh88s2x44zis	EL-0012	Mariama	Sylla	1999-12-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgofmu002buh88919kv67g	\N	\N	\N	\N	f	\N	f	f	\N	2026-09-04 04:36:27.817	2026-09-04 04:36:27.817	\N
cmtmgot9u004vuh88peonuxaw	cmtmgo6sx0004uh88s2x44zis	EL-0006	Pape	Diop	2005-06-15 00:00:00	Dakar	F	\N	actif	2026-09-01 00:00:00	\N	\N	cmtmgofgz0029uh88fxh173kn	\N	\N	\N	\N	t	2026-09-15 00:00:00	f	t	cmtmgp2ws006zuh8842kvq0td	2026-09-04 04:36:25.266	2026-09-04 04:36:37.968	\N
\.


--
-- Data for Name: EleveHistoriqueClasse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EleveHistoriqueClasse" (id, "eleveId", "classeId", "dateEntree", "dateSortie", motif) FROM stdin;
cmtmgormj004duh88x1de6zk6	cmtmgorat004buh88hr1gqs35	cmtmgof590027uh885f9q1ffp	2026-09-01 00:00:00	\N	\N
cmtmgos49004huh88q126rsjj	cmtmgory9004fuh88zsi0593d	cmtmgof590027uh885f9q1ffp	2026-09-01 00:00:00	\N	\N
cmtmgosg0004luh88p2tf3tcw	cmtmgosa4004juh88wvwv1eh6	cmtmgof590027uh885f9q1ffp	2026-09-01 00:00:00	\N	\N
cmtmgoss7004puh88bzix07j6	cmtmgosm9004nuh88zuai7w3x	cmtmgof590027uh885f9q1ffp	2026-09-01 00:00:00	\N	\N
cmtmgot3z004tuh8855nlsp56	cmtmgosy4004ruh88uq1eevfi	cmtmgof590027uh885f9q1ffp	2026-09-01 00:00:00	\N	\N
cmtmgotfp004xuh889nolrn7h	cmtmgot9u004vuh88peonuxaw	cmtmgofgz0029uh88fxh173kn	2026-09-01 00:00:00	\N	\N
cmtmgotri0051uh882wk9wfzt	cmtmgotlm004zuh883nzgofgh	cmtmgofgz0029uh88fxh173kn	2026-09-01 00:00:00	\N	\N
cmtmgou3d0055uh884fqncsf3	cmtmgotxd0053uh88wckmigfj	cmtmgofgz0029uh88fxh173kn	2026-09-01 00:00:00	\N	\N
cmtmgouf60059uh88gya665g4	cmtmgou9b0057uh88n7wx77hb	cmtmgofgz0029uh88fxh173kn	2026-09-01 00:00:00	\N	\N
cmtmgouqy005duh887j3jw4rk	cmtmgoul1005buh88liihk6zb	cmtmgofmu002buh88919kv67g	2026-09-01 00:00:00	\N	\N
cmtmgov2o005huh881f84o3v3	cmtmgouwt005fuh88ayapvc5f	cmtmgofmu002buh88919kv67g	2026-09-01 00:00:00	\N	\N
cmtmgovf2005luh88csolkh3q	cmtmgov8p005juh88weazn0sb	cmtmgofmu002buh88919kv67g	2026-09-01 00:00:00	\N	\N
cmtmgrj5700ixuh883icrmuue	cmtmgorat004buh88hr1gqs35	cmtmgofgz0029uh88fxh173kn	2025-09-01 00:00:00	2026-06-30 00:00:00	Passage en classe supérieure
cmtmgrjgv00izuh88o1nqagu1	cmtmgot9u004vuh88peonuxaw	cmtmgof590027uh885f9q1ffp	2025-09-01 00:00:00	2026-06-30 00:00:00	Réorientation
\.


--
-- Data for Name: EleveParent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EleveParent" ("eleveId", "parentId", "autoriteParentale") FROM stdin;
cmtmgorat004buh88hr1gqs35	cmtmgovto005puh88u2t7gifb	t
cmtmgory9004fuh88zsi0593d	cmtmgowqb005tuh88wxpeiyxe	t
cmtmgosa4004juh88wvwv1eh6	cmtmgoxag005xuh880w94j9zc	t
cmtmgosm9004nuh88zuai7w3x	cmtmgoxzz0061uh881hpc53cn	t
cmtmgosy4004ruh88uq1eevfi	cmtmgoyjp0065uh88d6cczjq4	t
cmtmgot9u004vuh88peonuxaw	cmtmgoz3a0069uh884yexubup	t
cmtmgotlm004zuh883nzgofgh	cmtmgozr8006duh88vxgsvght	t
cmtmgotxd0053uh88wckmigfj	cmtmgp0cy006huh88arxs623f	t
cmtmgou9b0057uh88n7wx77hb	cmtmgp0wt006luh88oan7sh88	t
cmtmgoul1005buh88liihk6zb	cmtmgp1g9006puh88xxcyv5rh	t
cmtmgouwt005fuh88ayapvc5f	cmtmgp1z8006tuh88ufa8dskm	t
cmtmgov8p005juh88weazn0sb	cmtmgp2j6006xuh88b9kdia2n	t
\.


--
-- Data for Name: EmailLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmailLog" (id, "ecoleId", destinataire, sujet, message, statut, erreur, "dateEnvoi", "dateCreation") FROM stdin;
cmtmgsce300n9uh88sey8co8o	cmtmgo6sx0004uh88s2x44zis	famille.diop@example.com	Relance échéance	Bonjour, l'échéance de scolarité T1 est attendue.	en_attente	\N	\N	2026-09-04 04:39:10.011
\.


--
-- Data for Name: EmploiTemps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmploiTemps" (id, "ecoleId", "classeId", "enseignantId", "matiereId", "salleId", jour, "heureDebut", "heureFin", "recurrenceRule", "dateDebut", "dateFin", statut, "creeParId", "dateCreation", "updatedAt") FROM stdin;
cmtmgq65m00e6uh88wo3jchhc	cmtmgo6sx0004uh88s2x44zis	cmtmgof590027uh885f9q1ffp	cmtmgogop002luh88qdoewzyw	cmtmgoh0i002nuh88k1pjyp0u	cmtmgpa91008wuh88txhtqi7c	lundi	08:00	10:00	FREQ=WEEKLY;UNTIL=20270630;BYDAY=MO	2026-09-01 00:00:00	2027-06-30 00:00:00	actif	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:37:28.618	2026-09-04 04:37:28.618
\.


--
-- Data for Name: EntreeCahierTexte; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EntreeCahierTexte" (id, "cahierTexteId", "seanceId", "dateCours", contenu, "travailAFaire", "ressourcesUrl", statut, "valideParId", "dateValidation") FROM stdin;
cmtmgq84k00ehuh88yasw2e0d	cmtmgq7su00efuh88f4mwu3cf	\N	2026-08-15 00:00:00	Chapitre 1 : Nombres décimaux — cours magistral + exercices d'application.	DM n°1 page 23 ex. 1-5.	\N	publie	cmtmgo9vh000tuh885aak9o8v	2026-08-15 00:00:00
\.


--
-- Data for Name: EntretienRecrutement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EntretienRecrutement" (id, "candidatureId", date, lieu, type, intervieweurs, "compteRendu", note, statut) FROM stdin;
cmtmgq37e00dsuh8854ge0mqx	cmtmgq27v00douh888fwobq6q	2026-08-25 10:00:00	Salle de conférence	physique	\N	Bon profil, maîtrise pédagogique solide. À confirmer par la direction.	4	realise
\.


--
-- Data for Name: Etage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Etage" (id, "batimentId", numero, libelle, "planUrl") FROM stdin;
cmtmgqwjc00i7uh88pb0tm874	cmtmgqw7m00i5uh880iopx45x	0	Rez-de-chaussée	\N
cmtmgqwv200i9uh88xv1hyal3	cmtmgqw7m00i5uh880iopx45x	1	Premier étage	\N
\.


--
-- Data for Name: EtapeAdmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EtapeAdmission" (id, "candidatureId", etape, statut, date, "valideParId", commentaire) FROM stdin;
cmtmgq4ui00e1uh88qya0c72c	cmtmgq4iq00e0uh8840msx3he	depot_dossier	valide	2026-08-01 00:00:00	\N	\N
cmtmgq4ui00e2uh88nbmzrijn	cmtmgq4iq00e0uh8840msx3he	test_admission	en_attente	2026-08-25 00:00:00	\N	\N
\.


--
-- Data for Name: EtapeRecrutement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EtapeRecrutement" (id, "candidatureId", etape, statut, date, note, "decideurId") FROM stdin;
cmtmgq2jl00dpuh88r0xf98ky	cmtmgq27v00douh888fwobq6q	tri_cv	valide	2026-08-10 00:00:00	\N	\N
cmtmgq2jl00dquh885i9egfp4	cmtmgq27v00douh888fwobq6q	entretien_rh	valide	2026-08-15 00:00:00	\N	\N
\.


--
-- Data for Name: Evaluation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Evaluation" (id, "ecoleId", "classeId", "matiereId", "enseignantId", type, intitule, date, sur, coefficient, "periodeId", statut, "calculeDansMoyenne", "createdAt", "updatedAt") FROM stdin;
cmtmgp3ed0071uh88kvidwogq	cmtmgo6sx0004uh88s2x44zis	cmtmgof590027uh885f9q1ffp	cmtmgoh0i002nuh88k1pjyp0u	cmtmgogop002luh88qdoewzyw	devoir	Devoir 1 - Nombres décimaux	2026-09-25 00:00:00	20	1	cmtmgofss002duh88aterf035	planifiee	t	2026-09-04 04:36:38.388	2026-09-04 04:36:38.388
cmtmgp3qv0073uh88mi19j8va	cmtmgo6sx0004uh88s2x44zis	cmtmgof590027uh885f9q1ffp	cmtmgoi1v002tuh88tll4xgkx	cmtmgohvt002ruh88urmcnww6	composition	Composition T1 - Récit	2026-10-05 00:00:00	20	2	cmtmgofss002duh88aterf035	planifiee	t	2026-09-04 04:36:38.839	2026-09-04 04:36:38.839
\.


--
-- Data for Name: EvaluationCompetence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EvaluationCompetence" (id, "eleveId", "competenceId", "periodeId", "niveauAcquisition", commentaire, "evalueParId", date) FROM stdin;
cmtmgrso800kguh881o0zt3wh	cmtmgoul1005buh88liihk6zb	cmtmgrrph00kduh88iqpgv00w	cmtmgofss002duh88aterf035	maitrise	Fluidité remarquable.	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:38:44.456
cmtmgrso800khuh884qlnue1k	cmtmgoul1005buh88liihk6zb	cmtmgrsie00kfuh88uebuu250	cmtmgofss002duh88aterf035	acquis	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:38:44.456
cmtmgrso800kiuh88au5iq5a8	cmtmgouwt005fuh88ayapvc5f	cmtmgrrph00kduh88iqpgv00w	cmtmgofss002duh88aterf035	en_cours_d_acquisition	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:38:44.456
cmtmgrso800kjuh88o4k4p88r	cmtmgov8p005juh88weazn0sb	cmtmgrsie00kfuh88uebuu250	cmtmgofss002duh88aterf035	non_acquis	Besoin d'un soutien ciblé.	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:38:44.456
\.


--
-- Data for Name: EvaluationPersonnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EvaluationPersonnel" (id, "personnelId", "evaluateurId", periode, criteres, "commentaireGlobal", "dateEvaluation") FROM stdin;
cmtmgrlyh00jbuh88c2j5sc8t	cmtmgogop002luh88qdoewzyw	cmtmgo9vh000tuh885aak9o8v	2025-2026	{"pedagogie":17,"assiduite":19,"travail_equipe":16,"communication_parents":15}	Excellente implication pédagogique. Points d'appui : rigueur, suivi individualisé.	2026-09-04 04:38:35.754
\.


--
-- Data for Name: ExamenOfficiel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExamenOfficiel" (id, "ecoleId", nom, "anneeScolaireId", "niveauId", "dateDebut", "dateFin") FROM stdin;
cmtmgpbrm0096uh88em2o464z	cmtmgo6sx0004uh88s2x44zis	BEPC 2027	cmtmgoacz000vuh889r1st2jf	cmtmgoebs001xuh88zzlwyhxw	2027-06-15 00:00:00	2027-06-22 00:00:00
cmtmgpc3h0098uh88a8akmp2p	cmtmgo6sx0004uh88s2x44zis	BAC 2027	cmtmgoacz000vuh889r1st2jf	cmtmgoezb0025uh88efe6962d	2027-07-01 00:00:00	2027-07-12 00:00:00
\.


--
-- Data for Name: ExportDonnees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExportDonnees" (id, "ecoleId", "utilisateurId", "cibleType", "cibleId", format, statut, "fichierUrl", "tailleOctets", "dateDemande", "dateGeneration", "dateExpiration") FROM stdin;
cmtmgqp0200h3uh88w78xshe6	cmtmgo6sx0004uh88s2x44zis	\N	eleve	cmtmgorat004buh88hr1gqs35	json	genere	/exports/eleve-export-demo.json	84000	2026-09-04 04:37:53.039	2026-09-04 04:37:53.039	2026-09-11 04:37:53.039
\.


--
-- Data for Name: FactureFournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FactureFournisseur" (id, "ecoleId", "fournisseurId", numero, "dateEmission", "dateReception", "dateEcheance", "montantHT", "montantTVA", "montantTTC", devise, statut, "controleeParId", "dateControle", "fichierUrl", "commandeId") FROM stdin;
cmtmgqfl600fruh88a8c10if9	cmtmgo6sx0004uh88s2x44zis	cmtmgqdxp00fiuh88nc4iffa3	FAC-F1-2026-008	2026-08-13 00:00:00	2026-08-14 00:00:00	2026-09-14 00:00:00	22200000	1800000	24000000	XOF	payee	cmtmgo9vh000tuh885aak9o8v	2026-08-15 00:00:00	\N	cmtmgqe9n00fkuh884ngxbqgm
\.


--
-- Data for Name: FactureSaas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FactureSaas" (id, "ecoleId", "abonnementId", periode, montant, devise, statut, "modePaiement", "dateEmission", "datePaiement") FROM stdin;
cmtmgo7h20008uh88m56ww9cc	cmtmgo6sx0004uh88s2x44zis	cmtmgo75b0006uh88688ey4bd	2026-08	6500000	XOF	payee	virement	2026-09-04 04:35:57.014	2026-08-05 00:00:00
\.


--
-- Data for Name: FeatureFlag; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeatureFlag" (id, code, description, "actifGlobal", "rolloutPourcentage", "dateCreation", "dateMaj") FROM stdin;
cmtmgqqyn00heuh88furodzp2	module_paie	Active le module de paie RH	f	0	2026-09-04 04:37:55.583	2026-09-04 04:37:55.583
\.


--
-- Data for Name: FeatureFlagEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeatureFlagEcole" (id, "featureFlagId", "ecoleId", actif, "dateActivation") FROM stdin;
cmtmgqrah00hguh88cklu0w34	cmtmgqqyn00heuh88furodzp2	cmtmgo6sx0004uh88s2x44zis	t	2026-09-04 04:37:56.006
\.


--
-- Data for Name: FeuilleRoute; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeuilleRoute" (id, "ecoleId", "ligneId", date, statut, commentaire, "retardMin") FROM stdin;
cmtmgs55l00m4uh88mynjd6s1	cmtmgo6sx0004uh88s2x44zis	cmtmgpibi00akuh8806t8rnzy	2026-09-04 00:00:00	en_cours	\N	18
\.


--
-- Data for Name: FicheSante; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FicheSante" (id, "ecoleId", "eleveId", "groupeSanguin", allergies, "traitementsEnCours", antecedents, "medecinTraitant", "telephoneUrgence", "contactUrgenceNom", "autorisationTraitement", "dateMiseAJour", "misAJourParId") FROM stdin;
cmtmgryal00l7uh88n6s1am4c	cmtmgo6sx0004uh88s2x44zis	cmtmgorat004buh88hr1gqs35	O+	Arachides (réaction cutanée)	Aucun	\N	Dr. Ndiaye — Cabinet Horizon	+221 77 123 45 67	Parent Adepo	t	2026-09-10 00:00:00	cmtmgo9vh000tuh885aak9o8v
cmtmgrymd00l9uh88y49gmvzb	cmtmgo6sx0004uh88s2x44zis	cmtmgot9u004vuh88peonuxaw	A+	Pénicilline	Ventoline ( inhalateur conservé à l'infirmerie )	Asthme léger depuis 2022	Dr. Sow — Clinique Baobab	+221 76 555 12 34	Parent Diop	t	2026-09-12 00:00:00	cmtmgo9vh000tuh885aak9o8v
cmtmgryy100lbuh88moi38xxn	cmtmgo6sx0004uh88s2x44zis	cmtmgotxd0053uh88wckmigfj	B+	Aucune connue	\N	\N	Dr. Ndiaye — Cabinet Horizon	+221 78 900 11 22	Parent Gueye	f	2026-09-15 00:00:00	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: Fournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Fournisseur" (id, "ecoleId", nom, type, contact, email, telephone, adresse, rib, siret, statut, "dateCreation") FROM stdin;
cmtmgqdxp00fiuh88nc4iffa3	cmtmgo6sx0004uh88s2x44zis	ScolairePro SARL	fournisseur_prestataire	M. Fall	contact@scolairepro.sn	+221 33 860 00 00	Médina, Dakar	SN12 010 010 010123456789 00	SN123456789	actif	2026-09-04 04:37:38.701
\.


--
-- Data for Name: Frais; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Frais" (id, "ecoleId", libelle, type, montant, devise, periodicite, "niveauId", "anneeScolaireId", "updatedAt") FROM stdin;
cmtmgp5s3007puh88z63sklny	cmtmgo6sx0004uh88s2x44zis	Frais de scolarité - Trimestre 1	scolarite	7500000	XOF	trimestriel	\N	cmtmgoacz000vuh889r1st2jf	2026-09-04 04:36:41.474
cmtmgp63t007ruh88wim9f4gc	cmtmgo6sx0004uh88s2x44zis	Frais d'inscription	inscription	2500000	XOF	unique	\N	cmtmgoacz000vuh889r1st2jf	2026-09-04 04:36:41.897
\.


--
-- Data for Name: GarderieInscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GarderieInscription" (id, "ecoleId", "eleveId", formule, "tarifHoraire", actif) FROM stdin;
cmtmgs71m00miuh88nfcaakes	cmtmgo6sx0004uh88s2x44zis	cmtmgotlm004zuh883nzgofgh	horaire	150000	t
cmtmgs7cz00mkuh88wvzfdblf	cmtmgo6sx0004uh88s2x44zis	cmtmgotxd0053uh88wckmigfj	horaire	150000	t
\.


--
-- Data for Name: GarderieSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GarderieSession" (id, "ecoleId", "eleveId", date, "heureArrivee", "heureDepart", "minutesFacturees") FROM stdin;
cmtmgs7im00mmuh885xt08n28	cmtmgo6sx0004uh88s2x44zis	cmtmgotlm004zuh883nzgofgh	2026-09-04 00:00:00	2026-09-04 17:00:00	2026-09-04 18:30:00	90
cmtmgs7tw00mouh88yoixj52m	cmtmgo6sx0004uh88s2x44zis	cmtmgotxd0053uh88wckmigfj	2026-09-04 00:00:00	2026-09-04 17:00:00	\N	\N
\.


--
-- Data for Name: HabilitationPenale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HabilitationPenale" (id, "ecoleId", "personnelId", "numeroHabilitation", "dateDelivrance", "dateExpiration", "autoriteEmettrice", statut) FROM stdin;
cmtmgpzxl00dauh88yi7ggopv	cmtmgo6sx0004uh88s2x44zis	cmtmgogop002luh88qdoewzyw	HAB-2026-0421	2026-08-01 00:00:00	2027-08-01 00:00:00	Tribunal de Dakar	validee
\.


--
-- Data for Name: Incident; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Incident" (id, "eleveId", "dateHeure", lieu, type, description, gravite, "declareParId", temoins) FROM stdin;
cmtmgpc9d009auh88e9l0xy08	cmtmgory9004fuh88zsi0593d	2026-09-18 00:00:00	Cour	comportement	Retards répétés en cours de mathématiques	leger	cmtmgogi5002juh88vhsapsfo	\N
\.


--
-- Data for Name: InscriptionExamenOfficiel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InscriptionExamenOfficiel" (id, "examenOfficielId", "eleveId", "numeroTable", "centreExamen", statut, resultat, "amenagementAppliqueId", "certificatUrl") FROM stdin;
cmtmgrvca00kouh88bpgdi9ex	cmtmgpbrm0096uh88em2o464z	cmtmgorat004buh88hr1gqs35	SN-2027-00142	CEM Kennedy, Dakar	inscrit	\N	\N	\N
cmtmgrvca00kpuh88uv1nrth4	cmtmgpbrm0096uh88em2o464z	cmtmgory9004fuh88zsi0593d	SN-2027-00143	CEM Kennedy, Dakar	convoque	\N	\N	\N
\.


--
-- Data for Name: JetonAuth; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JetonAuth" (id, "utilisateurId", email, type, "tokenHash", "expireLe", utilise, "dateUtilisation", "dateCreation", "adresseIp", "userAgent") FROM stdin;
cmtmgqlem00gruh881gzxmpvd	\N	editeur@platforme.com	reset_password	hash-jeton-reset-1	2026-09-04 05:37:48.166	f	\N	2026-09-04 04:37:48.166	\N	\N
cmtmgqlqc00gsuh883bc7x66a	\N	direction@vinci.sn	reset_password	hash-jeton-reset-demo	2026-09-04 05:37:48.802	f	\N	2026-09-04 04:37:48.802	\N	\N
cmtmgqlw700gtuh88kwl50thr	\N	direction@vinci.sn	verify_email	hash-jeton-verify-demo	2026-09-11 04:37:49.013	t	2026-09-04 04:37:49.013	2026-09-04 04:37:49.013	\N	\N
\.


--
-- Data for Name: JournalComptable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JournalComptable" (id, "ecoleId", code, libelle, type) FROM stdin;
cmtmgqckt00fcuh88rqdvl6fl	cmtmgo6sx0004uh88s2x44zis	ACH	Journal des achats	achat
\.


--
-- Data for Name: JustificationAbsence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JustificationAbsence" (id, "ecoleId", "eleveId", "presenceId", "dateAbsence", "dureeHeures", motif, description, "justificatifUrl", statut, "soumisParId", "valideParId", "dateSoumission", "dateValidation", "commentaireValidation") FROM stdin;
cmtmgqafy00evuh88tfyix196	cmtmgo6sx0004uh88s2x44zis	cmtmgory9004fuh88zsi0593d	\N	2026-08-20 00:00:00	4	maladie	Fièvre — certificat médical fourni.	/uploads/certif-medical-absence.pdf	valide	cmtmgo9vh000tuh885aak9o8v	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:37:34.174	2026-09-04 04:37:34.171	Justificatif accepté.
\.


--
-- Data for Name: LigneBudget; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneBudget" (id, "budgetId", categorie, "sousCategorie", libelle, "montantPrevu", "montantRealise", devise, "pourcentageRealise", "dateDerniereMaj") FROM stdin;
cmtmgqb3q00eyuh88f1f29ig4	cmtmgqars00exuh88z36wbgl1	recettes	frais_scolarite	Frais de scolarité	500000000	150000000	XOF	0	2026-09-04 04:37:35.027
cmtmgqb3q00ezuh88z5ck70uh	cmtmgqars00exuh88z36wbgl1	recettes	subventions	Subvention État	80000000	40000000	XOF	0	2026-09-04 04:37:35.027
cmtmgqb3q00f0uh88ozd73d3w	cmtmgqars00exuh88z36wbgl1	depenses	salaries	Salaires & charges	350000000	87500000	XOF	0	2026-09-04 04:37:35.027
cmtmgqb3q00f1uh880962ysd6	cmtmgqars00exuh88z36wbgl1	depenses	fonctionnement	Fonctionnement (eau/électricité/fournitures)	60000000	15000000	XOF	0	2026-09-04 04:37:35.027
cmtmgqb3q00f2uh88yv7rx7gb	cmtmgqars00exuh88z36wbgl1	depenses	equipement	Équipements informatiques	120000000	0	XOF	0	2026-09-04 04:37:35.027
\.


--
-- Data for Name: LigneBulletinPaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneBulletinPaie" (id, "bulletinId", type, libelle, montant, sens, quantite, taux) FROM stdin;
cmtmgq0l100dduh8800xi6q90	cmtmgq09c00dcuh88qi8qk0ce	salaire_base	Salaire de base (35h)	25000000	plus	\N	\N
cmtmgq0l100deuh888thxt9pr	cmtmgq09c00dcuh88qi8qk0ce	prime	Prime d'ancienneté	1500000	plus	\N	\N
cmtmgq0l100dfuh88hmmuoftg	cmtmgq09c00dcuh88qi8qk0ce	indemnite	Indemnité de transport	1000000	plus	\N	\N
cmtmgq0l100dguh88fgksr5m2	cmtmgq09c00dcuh88qi8qk0ce	heures_sup	Heures supplémentaires (4h à 125%)	500000	plus	4	125000
\.


--
-- Data for Name: LigneCommande; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneCommande" (id, "commandeId", designation, quantite, unite, "prixUnitaire", "montantLigne", recu) FROM stdin;
cmtmgqeli00fluh880gw9yw8x	cmtmgqe9n00fkuh884ngxbqgm	Cahiers 200 pages (x100)	100	unite	80000	8000000	t
cmtmgqeli00fmuh88b62uo6ha	cmtmgqe9n00fkuh884ngxbqgm	Stylos bille bleus (x500)	500	unite	10000	5000000	t
cmtmgqeli00fnuh88or8yy5p8	cmtmgqe9n00fkuh884ngxbqgm	Calculatrices scientifiques (x20)	20	unite	550000	11000000	f
\.


--
-- Data for Name: LigneEcriture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneEcriture" (id, "ecritureId", "compteId", libelle, debit, credit) FROM stdin;
cmtmgqd8k00ffuh88r8681na9	cmtmgqcwn00feuh88d7n6f5dp	cmtmgqcex00fauh881zhh8s07	Fournitures bureau	15000000	0
cmtmgqd8k00fguh88h3fw5i4e	cmtmgqcwn00feuh88d7n6f5dp	cmtmgqbrd00f4uh88aaqlexiy	Règlement par virement	0	15000000
\.


--
-- Data for Name: LigneReleve; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LigneReleve" (id, "ecoleId", date, montant, libelle, rapprochee, "paiementId") FROM stdin;
cmtmgsai100n5uh88yoecya0d	cmtmgo6sx0004uh88s2x44zis	2026-06-06 04:39:07.557	10000000	Virement scolarité — guichet 1	f	\N
cmtmgsai100n6uh88v9t2veds	cmtmgo6sx0004uh88s2x44zis	2026-07-06 04:39:07.557	10000000	Virement scolarité — guichet 2	f	\N
cmtmgsai100n7uh8880sjlnvb	cmtmgo6sx0004uh88s2x44zis	2026-08-30 04:39:07.557	45000000	Subvention fonctionnement T4	f	\N
\.


--
-- Data for Name: ListeFourniture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ListeFourniture" (id, "niveauId", "anneeScolaireId", contenu, publiee, "datePublication") FROM stdin;
cmtmgrwi300kvuh88pgt6p825	cmtmgodu9001ruh888tefyz7z	cmtmgoacz000vuh889r1st2jf	[{"article":"Cahier 200 pages","quantite":6},{"article":"Classeur à levier","quantite":2},{"article":"Calculatrice collège","quantite":1},{"article":"Kit géométrie","quantite":1}]	t	2026-08-20 00:00:00
cmtmgrwtr00kxuh882t2eus7a	cmtmgodik001nuh882ng65v4l	cmtmgoacz000vuh889r1st2jf	[{"article":"Cahier 96 pages","quantite":8},{"article":"Livre de lecture imposé","quantite":1}]	f	\N
\.


--
-- Data for Name: ManuelScolaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ManuelScolaire" (id, "ecoleId", titre, "matiereId", "niveauId", editeur, "anneeEdition", "quantiteStock") FROM stdin;
cmtmgpg7900a2uh88driuk6qf	cmtmgo6sx0004uh88s2x44zis	Mathématiques 6e — Collection Triangle	cmtmgoh0i002nuh88k1pjyp0u	cmtmgodu9001ruh888tefyz7z	Nathan	2024	40
\.


--
-- Data for Name: Matiere; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Matiere" (id, "ecoleId", code, libelle, coefficient, couleur) FROM stdin;
cmtmgoh0i002nuh88k1pjyp0u	cmtmgo6sx0004uh88s2x44zis	MATHS	Mathématiques	1	#10b981
cmtmgoi1v002tuh88tll4xgkx	cmtmgo6sx0004uh88s2x44zis	FR	Français	1	#10b981
cmtmgoirb002zuh88babhz5bf	cmtmgo6sx0004uh88s2x44zis	HG	Histoire-Géographie	1	#10b981
cmtmgojgl0035uh88lihtky0e	cmtmgo6sx0004uh88s2x44zis	PC	Physique-Chimie	1	#10b981
cmtmgok5x003buh88v1rcw5fz	cmtmgo6sx0004uh88s2x44zis	ANG	Anglais	1	#10b981
cmtmgokv9003huh88jkgrpvtv	cmtmgo6sx0004uh88s2x44zis	EPS	EPS	1	#10b981
\.


--
-- Data for Name: MembreConseil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembreConseil" (id, "conseilId", "utilisateurId", role, present, observation) FROM stdin;
cmtmgq8s600eluh887ytyp0sf	cmtmgq8gf00ejuh88828xsflo	cmtmgo9vh000tuh885aak9o8v	president	t	\N
cmtmgq93w00enuh88coztetak	cmtmgq8gf00ejuh88828xsflo	cmtmgogi5002juh88vhsapsfo	enseignant	t	\N
\.


--
-- Data for Name: MembreEquipeEducatif; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembreEquipeEducatif" (id, "planAccompagnementId", "utilisateurId", role, "dateInclusion") FROM stdin;
cmtmgqt8s00hpuh88gxn5ajx2	cmtmgqsx100houh880k0huchm	cmtmgo9vh000tuh885aak9o8v	referent	2026-08-10 00:00:00
cmtmgqt8s00hquh888hlf1gqq	cmtmgqsx100houh880k0huchm	cmtmgogi5002juh88vhsapsfo	enseignant	2026-08-10 00:00:00
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Message" (id, "conversationId", "expediteurId", contenu, "dateEnvoi", supprime, "luPar") FROM stdin;
cmtmgqhkp00g1uh880d9mm3s2	cmtmgqglo00fxuh88gcsi88cf	cmtmgo9vh000tuh885aak9o8v	Bonjour, merci de préparer le conseil de classe T1 pour le 15/10.	2026-09-04 04:37:43.415	f	\N
\.


--
-- Data for Name: MesureProtection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MesureProtection" (id, "signalementId", type, description, "decideePar", "dateDecision", "dateFin", statut) FROM stdin;
cmtmgpywa00d4uh888wzdx961	cmtmgpygy00d2uh88z7exqgjy	accompagnement_psychologique	Mise en place d'un suivi psychologue scolaire hebdomadaire.	Direction	2026-09-04 04:37:19.208	\N	planifiee
\.


--
-- Data for Name: ModeleMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ModeleMessage" (id, "ecoleId", code, sujet, corps, canaux, langue, actif) FROM stdin;
cmtmgpe33009iuh882yd19d9x	cmtmgo6sx0004uh88s2x44zis	rappel_echeance	Rappel : échéance de frais à venir	Bonjour {{parent_prenom}}, l'échéance de {{frais_libelle}} pour {{eleve_prenom}} {{eleve_nom}} est attendue pour le {{echeance_date}}. Montant : {{echeance_montant}}.	["sms","email","in_app"]	fr	t
cmtmgpeev009kuh88wc31a5ga	cmtmgo6sx0004uh88s2x44zis	bulletin_publie	Bulletin {{periode}} disponible	Le bulletin {{periode}} de {{eleve_prenom}} {{eleve_nom}} est disponible sur le portail parent.	["email","in_app"]	fr	t
cmtmgpekp009muh88fglf48ml	cmtmgo6sx0004uh88s2x44zis	absence_signalee	Absence signalée	{{eleve_prenom}} {{eleve_nom}} a été absent(e) au cours de {{matiere_libelle}} le {{seance_date}}.	["sms","in_app"]	fr	t
\.


--
-- Data for Name: MouvementStock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MouvementStock" (id, "articleId", type, quantite, motif, "dateMouvement", "effectueParId") FROM stdin;
cmtmgphu000aguh884uh17d61	cmtmgphic00aeuh88nbu2fye2	entree	300	Achat rentrée scolaire	2026-09-04 04:36:57.096	cmtmgo9vh000tuh885aak9o8v
cmtmgpi5n00aiuh88li1hhecr	cmtmgphic00aeuh88nbu2fye2	sortie	50	Distribution classes primaires	2026-09-04 04:36:57.516	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: Niveau; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Niveau" (id, "sectionId", code, libelle, ordre) FROM stdin;
cmtmgobtm0017uh8872j14wl9	cmtmgobhz0015uh88nb2egxwv	PS	Petite Section	1
cmtmgoc5b0019uh88v5vhyhq3	cmtmgobhz0015uh88nb2egxwv	MS	Moyenne Section	2
cmtmgocb7001buh88x2xba1s9	cmtmgobhz0015uh88nb2egxwv	GS	Grande Section	3
cmtmgocof001fuh881djhr074	cmtmgoch5001duh880pfv8hpo	CP	Cours Préparatoire	4
cmtmgod0z001huh88bb3b9a3h	cmtmgoch5001duh880pfv8hpo	CE1	Cours Élémentaire 1	5
cmtmgod6u001juh88f9xv78kw	cmtmgoch5001duh880pfv8hpo	CE2	Cours Élémentaire 2	6
cmtmgodcp001luh888pum0rhl	cmtmgoch5001duh880pfv8hpo	CM1	Cours Moyen 1	7
cmtmgodik001nuh882ng65v4l	cmtmgoch5001duh880pfv8hpo	CM2	Cours Moyen 2	8
cmtmgodu9001ruh888tefyz7z	cmtmgodoe001puh884oz6ml92	6E	Sixième	9
cmtmgoe03001tuh88kdq6x6j9	cmtmgodoe001puh884oz6ml92	5E	Cinquième	10
cmtmgoe5y001vuh883t13dqjo	cmtmgodoe001puh884oz6ml92	4E	Quatrième	11
cmtmgoebs001xuh88zzlwyhxw	cmtmgodoe001puh884oz6ml92	3E	Troisième	12
cmtmgoenl0021uh8871piux2i	cmtmgoehn001zuh88ic0z27xa	2NDE	Seconde	13
cmtmgoetf0023uh88kokn1qd1	cmtmgoehn001zuh88ic0z27xa	1ERE	Première	14
cmtmgoezb0025uh88efe6962d	cmtmgoehn001zuh88ic0z27xa	TLE	Terminale	15
\.


--
-- Data for Name: Note; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Note" (id, "eleveId", "evaluationId", valeur, absent, dispense, commentaire, "saisiParId", "dateSaisie", "synchroniseDepuisHorsLigne") FROM stdin;
cmtmgp3wv0075uh88p51nuvcj	cmtmgorat004buh88hr1gqs35	cmtmgp3ed0071uh88kvidwogq	15	f	f	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:36:39.055	f
cmtmgp48m0077uh88t0w478o4	cmtmgorat004buh88hr1gqs35	cmtmgp3qv0073uh88mi19j8va	17	f	f	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:36:39.478	f
cmtmgp4eg0079uh886s3rwtyi	cmtmgory9004fuh88zsi0593d	cmtmgp3ed0071uh88kvidwogq	13	f	f	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:36:39.689	f
cmtmgp4kd007buh881pjqiaf6	cmtmgory9004fuh88zsi0593d	cmtmgp3qv0073uh88mi19j8va	11	f	f	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:36:39.901	f
cmtmgp4q8007duh88zi3vfn16	cmtmgosa4004juh88wvwv1eh6	cmtmgp3ed0071uh88kvidwogq	16	f	f	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:36:40.113	f
cmtmgp4w3007fuh88a9n3kr6d	cmtmgosa4004juh88wvwv1eh6	cmtmgp3qv0073uh88mi19j8va	14	f	f	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:36:40.323	f
cmtmgp51y007huh88m5d3bq2f	cmtmgosm9004nuh88zuai7w3x	cmtmgp3ed0071uh88kvidwogq	15	f	f	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:36:40.534	f
cmtmgp58w007juh88qgislcaz	cmtmgosm9004nuh88zuai7w3x	cmtmgp3qv0073uh88mi19j8va	16	f	f	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:36:40.784	f
cmtmgp5f1007luh88ewh86t3a	cmtmgosy4004ruh88uq1eevfi	cmtmgp3ed0071uh88kvidwogq	12	f	f	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:36:41.005	f
cmtmgp5m5007nuh88qx5q05za	cmtmgosy4004ruh88uq1eevfi	cmtmgp3qv0073uh88mi19j8va	18	f	f	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:36:41.262	f
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "ecoleId", "destinataireType", "destinataireId", "modeleMessageId", sujet, corps, canal, statut, contexte, "dateCreation", "dateEnvoi", "dateLecture") FROM stdin;
cmtmgpeqk009ouh880rcm6p8i	cmtmgo6sx0004uh88s2x44zis	personnel	cmtmgo9vh000tuh885aak9o8v	cmtmgpe33009iuh882yd19d9x	Rappel : 2 échéances impayées à relancer	Les familles Diop, Sylla et Kane ont des échéances de scolarité impayées depuis le 15/09. Relance recommandée.	in_app	envoye	\N	2026-09-04 04:36:53.084	2026-09-04 04:36:53.083	\N
cmtmgpf28009quh888u03k3fy	cmtmgo6sx0004uh88s2x44zis	personnel	cmtmgo9vh000tuh885aak9o8v	\N	Nouvelle inscription validée	Astou Mbaye a été inscrite en CM2-A. Inscription validée par Awa Diop.	in_app	envoye	\N	2026-09-04 04:36:53.505	2026-09-04 04:36:53.504	\N
cmtmgpfdx009suh885rhvv34r	cmtmgo6sx0004uh88s2x44zis	personnel	cmtmgolwj003juh88a1v703lw	\N	3 échéances en retard à relancer	Retards de 8 à 26 jours — restant dû cumulé : 900 000 XOF.	in_app	envoye	\N	2026-09-04 04:36:53.925	2026-09-04 04:36:53.923	\N
cmtmgpfju009uuh8888ubbc0h	cmtmgo6sx0004uh88s2x44zis	personnel	cmtmgon38003nuh88a86qudhn	\N	1 demande de congé en attente	Ousmane Diallo — congés annuels du 21/12 au 04/01, à valider.	in_app	envoye	\N	2026-09-04 04:36:54.138	2026-09-04 04:36:54.137	\N
cmtmgpfpp009wuh88ug0ou4ka	cmtmgo6sx0004uh88s2x44zis	personnel	cmtmgoohy003vuh88g3p1gbyf	\N	Appel non fait — CM2-A	2 séances planifiées ce matin, aucun pointage relevé. Relancer le titulaire.	in_app	envoye	\N	2026-09-04 04:36:54.349	2026-09-04 04:36:54.348	\N
cmtmgpfvj009yuh88ceyy38gz	cmtmgo6sx0004uh88s2x44zis	personnel	cmtmgop8h003zuh88luusk8a6	\N	2 candidatures à instruire	Dossiers complets reçus cette semaine — planifier les tests d'admission.	in_app	envoye	\N	2026-09-04 04:36:54.56	2026-09-04 04:36:54.559	\N
cmtmgpg1e00a0uh88maaxcvza	cmtmgo6sx0004uh88s2x44zis	personnel	cmtmgoqn60047uh885udpqdn6	\N	Rappel vaccin à vérifier	1 vaccination enregistrée avec rappel dépassé — contacter la famille.	in_app	envoye	\N	2026-09-04 04:36:54.771	2026-09-04 04:36:54.769	\N
\.


--
-- Data for Name: ObjectifPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ObjectifPlan" (id, "planAccompagnementId", description, domaine, indicateurs, echeance, atteint, "dateEvaluation") FROM stdin;
cmtmgqtwb00hsuh88783ez7rm	cmtmgqsx100houh880k0huchm	Disponibilité permanente de l'inhalateur en classe	therapeutique	\N	2026-09-30 00:00:00	t	2026-09-04 04:37:59.385
\.


--
-- Data for Name: OffreEmploi; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OffreEmploi" (id, "ecoleId", poste, description, "profilRecherche", "typeContrat", "dateOuverture", "dateCloture", statut, lieu) FROM stdin;
cmtmgq1w400dmuh886bvrzxqq	cmtmgo6sx0004uh88s2x44zis	Enseignant Mathématiques (collège-lycée)	Poste à temps plein en mathématiques pour les classes 5e à Terminale.	Master Mathématiques + CAPES/AGREG. 3 ans d'expérience.	CDI	2026-08-01 00:00:00	2026-09-30 00:00:00	ouverte	Dakar
\.


--
-- Data for Name: Paiement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Paiement" (id, "ecoleId", "eleveId", "parentId", montant, devise, "modePaiement", "referenceTransaction", "datePaiement", "encaisseParId", "recuUrl", annule, "dateAnnulation", "motifAnnulation", "annuleParId") FROM stdin;
cmtmgp8qg008luh883be3wwbw	cmtmgo6sx0004uh88s2x44zis	cmtmgorat004buh88hr1gqs35	\N	10000000	XOF	espece	REF-0--3-1788496605302	2026-06-04 04:36:45.299	cmtmgo9vh000tuh885aak9o8v	\N	f	\N	\N	\N
cmtmgp927008nuh884nkgwr1m	cmtmgo6sx0004uh88s2x44zis	cmtmgory9004fuh88zsi0593d	\N	10000000	XOF	mobile_money	REF-1--2-1788496605724	2026-07-04 04:36:45.724	cmtmgo9vh000tuh885aak9o8v	\N	f	\N	\N	\N
cmtmgp98g008puh888prbzpzr	cmtmgo6sx0004uh88s2x44zis	cmtmgosa4004juh88wvwv1eh6	\N	10000000	XOF	virement	REF-2--1-1788496605943	2026-08-04 04:36:45.94	cmtmgo9vh000tuh885aak9o8v	\N	f	\N	\N	\N
cmtmgp9ee008ruh88y13tqxhz	cmtmgo6sx0004uh88s2x44zis	cmtmgosm9004nuh88zuai7w3x	\N	4000000	XOF	espece	REF-3-0-1788496606164	2026-09-04 04:36:46.164	cmtmgo9vh000tuh885aak9o8v	\N	f	\N	\N	\N
cmtmgp9ki008tuh88wam8nw0d	cmtmgo6sx0004uh88s2x44zis	cmtmgou9b0057uh88n7wx77hb	\N	7500000	XOF	cheque	REF-8--1-1788496606384	2026-08-04 04:36:46.384	cmtmgo9vh000tuh885aak9o8v	\N	f	\N	\N	\N
\.


--
-- Data for Name: PaiementEcheance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaiementEcheance" ("paiementId", "echeanceId", "montantApplique") FROM stdin;
cmtmgp8qg008luh883be3wwbw	cmtmgp69r007tuh882knhiokd	7500000
cmtmgp8qg008luh883be3wwbw	cmtmgp6lf007vuh8834ta3qbe	2500000
\.


--
-- Data for Name: PaiementFournisseur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaiementFournisseur" (id, "ecoleId", "factureId", "datePaiement", montant, devise, mode, reference, "payeParId") FROM stdin;
cmtmgqfxb00ftuh88chfdr9m0	cmtmgo6sx0004uh88s2x44zis	cmtmgqfl600fruh88a8c10if9	2026-08-20 00:00:00	24000000	XOF	virement	VIR-2026-042	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: ParentTuteur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ParentTuteur" (id, "ecoleId", "utilisateurId", nom, prenom, telephone, email, profession, "lienAvecEleve") FROM stdin;
cmtmgovto005puh88u2t7gifb	cmtmgo6sx0004uh88s2x44zis	cmtmgovni005nuh88br2xghic	Ade	Papa	+221 76 000 00 00	parent.ade@gmail.com	Commerçant	pere
cmtmgowqb005tuh88wxpeiyxe	cmtmgo6sx0004uh88s2x44zis	cmtmgowkg005ruh88fpyd4eed	Idriss	Maman	+221 76 000 00 00	parent.idriss@gmail.com	Commerçant	mere
cmtmgoxag005xuh880w94j9zc	cmtmgo6sx0004uh88s2x44zis	cmtmgox4k005vuh88c01woirm	Aminata	Papa	+221 76 000 00 00	parent.aminata@gmail.com	Commerçant	pere
cmtmgoxzz0061uh881hpc53cn	cmtmgo6sx0004uh88s2x44zis	cmtmgoxob005zuh88urwfk4ot	Omar	Maman	+221 76 000 00 00	parent.omar@gmail.com	Commerçant	mere
cmtmgoyjp0065uh88d6cczjq4	cmtmgo6sx0004uh88s2x44zis	cmtmgoydu0063uh88vm9v6d3i	Khadija	Papa	+221 76 000 00 00	parent.khadija@gmail.com	Commerçant	pere
cmtmgoz3a0069uh884yexubup	cmtmgo6sx0004uh88s2x44zis	cmtmgoyxg0067uh889d4ww8ky	Pape	Maman	+221 76 000 00 00	parent.pape@gmail.com	Commerçant	mere
cmtmgozr8006duh88vxgsvght	cmtmgo6sx0004uh88s2x44zis	cmtmgozgr006buh88zfrqibn9	Sokhna	Papa	+221 76 000 00 00	parent.sokhna@gmail.com	Commerçant	pere
cmtmgp0cy006huh88arxs623f	cmtmgo6sx0004uh88s2x44zis	cmtmgp071006fuh88yokg19gq	Awa	Maman	+221 76 000 00 00	parent.awa@gmail.com	Commerçant	mere
cmtmgp0wt006luh88oan7sh88	cmtmgo6sx0004uh88s2x44zis	cmtmgp0qv006juh883egwkjw6	Moussa	Papa	+221 76 000 00 00	parent.moussa@gmail.com	Commerçant	pere
cmtmgp1g9006puh88xxcyv5rh	cmtmgo6sx0004uh88s2x44zis	cmtmgp1ae006nuh88eyst5lhl	Astou	Maman	+221 76 000 00 00	parent.astou@gmail.com	Commerçant	mere
cmtmgp1z8006tuh88ufa8dskm	cmtmgo6sx0004uh88s2x44zis	cmtmgp1td006ruh88pf4f9iu8	Ibou	Papa	+221 76 000 00 00	parent.ibou@gmail.com	Commerçant	pere
cmtmgp2j6006xuh88b9kdia2n	cmtmgo6sx0004uh88s2x44zis	cmtmgp2db006vuh88jvfpwqtb	Mariama	Maman	+221 76 000 00 00	parent.mariama@gmail.com	Commerçant	mere
\.


--
-- Data for Name: PartenaireExterne; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PartenaireExterne" (id, type, nom, contact, email, adresse, actif) FROM stdin;
cmtmgpy5500d0uh88ezjelubo	crip	Cellule de Recueil des Informations Préoccupantes	+221 33 800 00 00	crip@sn.social.gouv	\N	t
\.


--
-- Data for Name: PassageArret; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PassageArret" (id, "feuilleId", "arretId", "heurePrevue", "heureReelle", montes, descendus, "transportArretId") FROM stdin;
cmtmgs5s700m6uh884enhdz8h	cmtmgs55l00m4uh88mynjd6s1	cmtmgpin700aluh88d9ey11bg	06:45	07:02	["cmtmgosm9004nuh88zuai7w3x"]	[]	\N
cmtmgs63h00m8uh88oxros211	cmtmgs55l00m4uh88mynjd6s1	cmtmgpin700amuh88wved1qvp	06:55	\N	[]	[]	\N
cmtmgs69500mauh88fupfcojm	cmtmgs55l00m4uh88mynjd6s1	cmtmgpin700anuh88piwc903i	07:20	\N	[]	[]	\N
\.


--
-- Data for Name: PassageInfirmerie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PassageInfirmerie" (id, "ecoleId", "eleveId", "ficheSanteId", "datePassage", motif, symptomes, "soinsAdministres", temperature, "personnelId", issue, "parentsNotifies", commentaire) FROM stdin;
cmtmgrz9q00lcuh88rf19b1kb	cmtmgo6sx0004uh88s2x44zis	cmtmgorat004buh88hr1gqs35	cmtmgryal00l7uh88n6s1am4c	2026-09-18 10:15:00	Céphalées persistantes	Fatigue, sensibilité à la lumière	Repos 20 min, hydratation	37.2	cmtmgo9vh000tuh885aak9o8v	retour_classe	f	\N
cmtmgrz9q00lduh887wuai6yq	cmtmgo6sx0004uh88s2x44zis	cmtmgot9u004vuh88peonuxaw	cmtmgrymd00l9uh88y49gmvzb	2026-09-20 14:40:00	Crise d'asthme légère après EPS	Respiration sifflante	Administration ventoline (autorisation parentale enregistrée), repos 30 min	36.9	cmtmgo9vh000tuh885aak9o8v	parents_contactes	t	\N
cmtmgrz9q00leuh882xftykzb	cmtmgo6sx0004uh88s2x44zis	cmtmgotxd0053uh88wckmigfj	\N	2026-09-25 09:05:00	Chute dans la cour	Entorse cheville droite suspectée	Immobilisation, glace	36.8	cmtmgo9vh000tuh885aak9o8v	depart_hopital	t	\N
\.


--
-- Data for Name: Periode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Periode" (id, "ecoleId", "anneeScolaireId", libelle, code, "dateDebut", "dateFin", "typeBulletin") FROM stdin;
cmtmgofss002duh88aterf035	cmtmgo6sx0004uh88s2x44zis	cmtmgoacz000vuh889r1st2jf	Trimestre 1	T1	2026-09-01 00:00:00	2026-12-15 00:00:00	college_lycee
cmtmgog4n002fuh88unrw3r4l	cmtmgo6sx0004uh88s2x44zis	cmtmgoacz000vuh889r1st2jf	Trimestre 2	T2	2027-01-05 00:00:00	2027-03-30 00:00:00	college_lycee
cmtmgogag002huh88z5ut0ot9	cmtmgo6sx0004uh88s2x44zis	cmtmgoacz000vuh889r1st2jf	Trimestre 3	T3	2027-04-01 00:00:00	2027-06-30 00:00:00	college_lycee
cmtmgs1jv00louh88t90aelf9	cmtmgs0wc00lkuh88quxpe5xg	cmtmgs18200lmuh881woii6po	Trimestre 1	T1	2026-09-01 00:00:00	2026-12-15 00:00:00	college_lycee
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Permission" (id, code, libelle, module) FROM stdin;
cmtmgqyhu00iduh884sjl688p	eleves.lire	Consulter les élèves	eleves
cmtmgr04400ieuh888itm7ex4	eleves.ecrire	Créer/modifier les élèves	eleves
cmtmgr13300ifuh881l28z3po	notes.saisir	Saisir les notes	pedagogie
cmtmgr21v00iguh882lrl4p79	bulletins.valider	Valider les bulletins	pedagogie
cmtmgr30p00ihuh888yjuzw2j	finances.voir	Consulter la trésorerie	finances
cmtmgr3zh00iiuh88qbu5mn69	finances.ecrire	Opérations financières (encaissements, frais, annulations)	finances
cmtmgr4ya00ijuh881glzln02	finances.valider	Valider les dépenses	finances
cmtmgr5x600ikuh88l3sucbef	presences.saisir	Faire l'appel	presences
cmtmgr71700iluh88kvu1x8km	rh.gerer	Gérer le personnel	rh
cmtmgr80200imuh88h1tv374k	communication.envoyer	Envoyer des communications	communication
cmtmgr94t00inuh88xfquscrq	admin.saas	Administration SaaS	saas
cmtmgra3k00iouh88a9i9qzvs	vie_scolaire.gerer	Gérer incidents et sanctions	vie_scolaire
cmtmgrb2c00ipuh88wyfl8z8s	securite.gerer	Gérer la sécurité du site (visiteurs, sorties)	securite
cmtmgrc1400iquh88i6xsbura	examens.gerer	Gérer les examens officiels	examens
cmtmgrczw00iruh88wm7hvj4n	services.gerer	Gérer cantine, bibliothèque, manuels	services
cmtmgrdys00isuh88gf0ogv5h	edt.gerer	Gérer les emplois du temps	edt
cmtmgrexm00ituh883jjleejf	sante.gerer	Gérer la santé et l'infirmerie	sante
cmtmgrfwf00iuuh88en818o32	salles.gerer	Gérer salles et calendrier	salles
cmtmgrgvk00ivuh88y5ods94j	protection.gerer	Gérer les signalements de protection de l'enfance	protection
\.


--
-- Data for Name: Personnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Personnel" (id, "ecoleId", "utilisateurId", matricule, nom, prenom, "dateNaissance", sexe, telephone, email, adresse, "photoUrl", "dateEmbauche", "dateSortie", "motifSortie", statut, "typeContrat", "salaireBrut", "cvUrl", "diplomePrincipal", "numeroSecuriteSociale", rib, "contactUrgence", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmtmgogop002luh88qdoewzyw	cmtmgo6sx0004uh88s2x44zis	cmtmgogi5002juh88vhsapsfo	ENS-1	Fall	Mamadou	\N	\N	+221 77 000 00 00	mamadou.fall@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:36:08.953	2026-09-04 04:36:08.953	\N
cmtmgohvt002ruh88urmcnww6	cmtmgo6sx0004uh88s2x44zis	cmtmgohpy002puh88gjp9m8e6	ENS-2	Sow	Fatou	\N	\N	+221 77 000 00 00	fatou.sow@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:36:10.505	2026-09-04 04:36:10.505	\N
cmtmgoilf002xuh881z4m5vbm	cmtmgo6sx0004uh88s2x44zis	cmtmgoifc002vuh882pofuypi	ENS-3	Ndiaye	Cheikh	\N	\N	+221 77 000 00 00	cheikh.ndiaye@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:36:11.427	2026-09-04 04:36:11.427	\N
cmtmgojar0033uh88n96onwja	cmtmgo6sx0004uh88s2x44zis	cmtmgoj4v0031uh88bq28m189	ENS-4	Ba	Aïssatou	\N	\N	+221 77 000 00 00	aïssatou.ba@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:36:12.339	2026-09-04 04:36:12.339	\N
cmtmgok000039uh88lfxvziqb	cmtmgo6sx0004uh88s2x44zis	cmtmgoju70037uh88suxbvb79	ENS-5	Diallo	Ousmane	\N	\N	+221 77 000 00 00	ousmane.diallo@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:36:13.248	2026-09-04 04:36:13.248	\N
cmtmgokpd003fuh88otd8240o	cmtmgo6sx0004uh88s2x44zis	cmtmgokjb003duh88dkmpfy8v	ENS-6	Gueye	Mariama	\N	\N	+221 77 000 00 00	mariama.gueye@vinci.sn	\N	\N	2020-09-01 00:00:00	\N	\N	actif	CDI	35000000	\N	Master Enseignement	\N	\N	\N	2026-09-04 04:36:14.161	2026-09-04 04:36:14.161	\N
cmtmgom88003luh8820ge7qep	cmtmgo6sx0004uh88s2x44zis	cmtmgolwj003juh88a1v703lw	CPT-01	Sarr	Bineta	\N	\N	+221 76 000 00 00	comptable@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDD	28000000	\N	Comptable	\N	\N	\N	2026-09-04 04:36:15.928	2026-09-04 04:36:15.928	\N
cmtmgon96003puh881wnihu47	cmtmgo6sx0004uh88s2x44zis	cmtmgon38003nuh88a86qudhn	RH-01	Ndiaye	Sophie	\N	\N	+221 76 000 00 00	rh@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	32000000	\N	Responsable RH	\N	\N	\N	2026-09-04 04:36:17.466	2026-09-04 04:36:17.466	\N
cmtmgonyh003tuh88hn68ih5a	cmtmgo6sx0004uh88s2x44zis	cmtmgonsk003ruh882vwzj5uq	CEN-01	Diagne	Ibrahima	\N	\N	+221 76 000 00 00	censeur@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	34000000	\N	Censeur	\N	\N	\N	2026-09-04 04:36:18.377	2026-09-04 04:36:18.377	\N
cmtmgoonu003xuh88m46s9k6c	cmtmgo6sx0004uh88s2x44zis	cmtmgoohy003vuh88g3p1gbyf	SUR-01	Kane	Modou	\N	\N	+221 76 000 00 00	surveillant@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDD	22000000	\N	Surveillant général	\N	\N	\N	2026-09-04 04:36:19.29	2026-09-04 04:36:19.29	\N
cmtmgopep0041uh88s035h2u5	cmtmgo6sx0004uh88s2x44zis	cmtmgop8h003zuh88luusk8a6	SEC-01	Fall	Coumba	\N	\N	+221 76 000 00 00	secretariat@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	24000000	\N	Secrétaire	\N	\N	\N	2026-09-04 04:36:20.258	2026-09-04 04:36:20.258	\N
cmtmgoq3y0045uh88upddvyf9	cmtmgo6sx0004uh88s2x44zis	cmtmgopy40043uh881197d5mz	AD-01	Mbaye	Khadija	\N	\N	+221 76 000 00 00	assistant@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDI	30000000	\N	Assistante de direction	\N	\N	\N	2026-09-04 04:36:21.166	2026-09-04 04:36:21.166	\N
cmtmgoqt10049uh88ltz7rzha	cmtmgo6sx0004uh88s2x44zis	cmtmgoqn60047uh885udpqdn6	INF-01	Sow	Aminata	\N	\N	+221 76 000 00 00	infirmiere@vinci.sn	\N	\N	2022-01-10 00:00:00	\N	\N	actif	CDD	23000000	\N	Infirmière	\N	\N	\N	2026-09-04 04:36:22.069	2026-09-04 04:36:22.069	\N
\.


--
-- Data for Name: PersonnelRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PersonnelRole" ("personnelId", "roleId", "classeId", "matiereId", "dateDebut", "dateFin") FROM stdin;
cmtmgogop002luh88qdoewzyw	cmtmgo8ip000duh883i9c70o3	cmtmgof590027uh885f9q1ffp	cmtmgoh0i002nuh88k1pjyp0u	2026-09-01 00:00:00	\N
cmtmgohvt002ruh88urmcnww6	cmtmgo8ip000duh883i9c70o3	cmtmgofgz0029uh88fxh173kn	cmtmgoi1v002tuh88tll4xgkx	2026-09-01 00:00:00	\N
cmtmgoilf002xuh881z4m5vbm	cmtmgo8ip000duh883i9c70o3	cmtmgofmu002buh88919kv67g	cmtmgoirb002zuh88babhz5bf	2026-09-01 00:00:00	\N
cmtmgojar0033uh88n96onwja	cmtmgo8ip000duh883i9c70o3	cmtmgof590027uh885f9q1ffp	cmtmgojgl0035uh88lihtky0e	2026-09-01 00:00:00	\N
cmtmgok000039uh88lfxvziqb	cmtmgo8ip000duh883i9c70o3	cmtmgofgz0029uh88fxh173kn	cmtmgok5x003buh88v1rcw5fz	2026-09-01 00:00:00	\N
cmtmgokpd003fuh88otd8240o	cmtmgo8ip000duh883i9c70o3	cmtmgofmu002buh88919kv67g	cmtmgokv9003huh88jkgrpvtv	2026-09-01 00:00:00	\N
cmtmgom88003luh8820ge7qep	cmtmgo8oj000fuh88e6fj34e2	\N	\N	2026-09-01 00:00:00	\N
cmtmgon96003puh881wnihu47	cmtmgo90b000juh881bp3l99k	\N	\N	2026-09-01 00:00:00	\N
cmtmgonyh003tuh88hn68ih5a	cmtmgo965000luh88hcba94hc	\N	\N	2026-09-01 00:00:00	\N
cmtmgoonu003xuh88m46s9k6c	cmtmgo8ue000huh881k952197	\N	\N	2026-09-01 00:00:00	\N
cmtmgopep0041uh88s035h2u5	cmtmgo9c0000nuh88suipm73b	\N	\N	2026-09-01 00:00:00	\N
cmtmgoq3y0045uh88upddvyf9	cmtmgo9hv000puh88khmd38a0	\N	\N	2026-09-01 00:00:00	\N
cmtmgoqt10049uh88ltz7rzha	cmtmgo9no000ruh88xvkm3f0g	\N	\N	2026-09-01 00:00:00	\N
\.


--
-- Data for Name: PieceJointe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PieceJointe" (id, "messageId", "nomFichier", url, taille, "mimeType", "dateUpload") FROM stdin;
cmtmgqhwf00g3uh88y8el3hue	cmtmgqhkp00g1uh880d9mm3s2	ordre_du_jour.pdf	/uploads/odj.pdf	124000	application/pdf	2026-09-04 04:37:43.839
\.


--
-- Data for Name: PlanAccompagnement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanAccompagnement" (id, "ecoleId", "eleveId", type, "dateMiseEnPlace", "dateDebut", "dateFin", statut, diagnostic, "objectifsGeneraux", "frequenceSuivi", "redigeParId", "valideParId", "dateValidation") FROM stdin;
cmtmgqsx100houh880k0huchm	cmtmgo6sx0004uh88s2x44zis	cmtmgosa4004juh88wvwv1eh6	PAI	2026-08-10 00:00:00	2026-09-01 00:00:00	2027-08-31 00:00:00	actif	Asthme sévère — besoin d'accès au bureau infirmier et d'un protocole d'urgence.	Sécuriser la prise en charge médicale pendant les heures de cours.	trimestriel	cmtmgo9vh000tuh885aak9o8v	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:37:58.115
\.


--
-- Data for Name: PlanTarifaire; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanTarifaire" (id, nom, "prixMensuel", "prixAnnuel", devise, "limiteEleves", "modulesInclus", "dureeEssaiJours", actif, "createdAt", "updatedAt") FROM stdin;
cmtmgo5yc0000uh8843fl0s0o	Essentiel	2500000	27000000	XOF	\N	["eleves","personnel","pedagogique","presences","finances_basic"]	14	t	2026-09-04 04:35:55.039	2026-09-04 04:35:55.039
cmtmgo6ay0001uh884drho0ne	Pro	6500000	70000000	XOF	100	["eleves","personnel","pedagogique","presences","finances_full","vie_scolaire","rh","services","salles","rdv"]	30	t	2026-09-04 04:35:55.498	2026-09-04 04:35:55.498
cmtmgo6mm0002uh88yjeldayb	Illimité	12000000	130000000	XOF	0	["*"]	30	t	2026-09-04 04:35:55.919	2026-09-04 04:35:55.919
\.


--
-- Data for Name: PointagePersonnel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PointagePersonnel" (id, "ecoleId", "personnelId", date, "heureArrivee", "heureDepart", "retardMin", commentaire) FROM stdin;
cmtmgs6eu00mcuh88rlecm4fb	cmtmgo6sx0004uh88s2x44zis	cmtmgogop002luh88qdoewzyw	2026-09-04 00:00:00	2026-09-04 07:10:00	\N	0	\N
cmtmgs6q600meuh88unpj2j3j	cmtmgo6sx0004uh88s2x44zis	cmtmgohvt002ruh88urmcnww6	2026-09-04 00:00:00	2026-09-04 08:11:00	\N	0	\N
cmtmgs6vv00mguh88p3zvr34e	cmtmgo6sx0004uh88s2x44zis	cmtmgoilf002xuh881z4m5vbm	2026-09-04 00:00:00	2026-09-04 09:10:00	\N	25	\N
\.


--
-- Data for Name: Presence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Presence" (id, "eleveId", "seanceId", statut, "minuteRetard", "motifAbsence", "justificatifUrl", "saisiParId", "dateSaisie", "synchroniseDepuisHorsLigne") FROM stdin;
cmtmgpl3300axuh88dxrqpoj8	cmtmgorat004buh88hr1gqs35	cmtmgpkrf00avuh88vk1m6jp9	present	\N	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:01.311	f
cmtmgplev00azuh882gsmxqoq	cmtmgory9004fuh88zsi0593d	cmtmgpkrf00avuh88vk1m6jp9	absent	\N	Maladie (certificat fourni)	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:01.735	f
cmtmgplqg00b1uh88qgmble7p	cmtmgosa4004juh88wvwv1eh6	cmtmgpkrf00avuh88vk1m6jp9	present	\N	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:01.946	f
cmtmgplwa00b3uh886qgdjbng	cmtmgosm9004nuh88zuai7w3x	cmtmgpkrf00avuh88vk1m6jp9	present	\N	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:02.363	f
cmtmgpm2400b5uh88jezg1dpn	cmtmgosy4004ruh88uq1eevfi	cmtmgpkrf00avuh88vk1m6jp9	present	\N	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:02.573	f
cmtmgpndh00bjuh8822hsatdd	cmtmgorat004buh88hr1gqs35	cmtmgpm7z00b7uh88p2h9s07r	present	\N	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:04.277	f
cmtmgpnjb00bluh880oshtr96	cmtmgory9004fuh88zsi0593d	cmtmgpm7z00b7uh88p2h9s07r	absent	\N	Fever — parent notifié	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:04.488	f
cmtmgpnp600bnuh88mkqnfx8p	cmtmgosa4004juh88wvwv1eh6	cmtmgpm7z00b7uh88p2h9s07r	present	\N	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:04.698	f
cmtmgpnv000bpuh88ycri30z2	cmtmgosm9004nuh88zuai7w3x	cmtmgpm7z00b7uh88p2h9s07r	present	\N	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:04.909	f
cmtmgpo0v00bruh88ol064mb1	cmtmgosy4004ruh88uq1eevfi	cmtmgpm7z00b7uh88p2h9s07r	present	\N	\N	\N	cmtmgogi5002juh88vhsapsfo	2026-09-04 04:37:05.119	f
cmtmgpo6p00btuh88f8d9blcy	cmtmgorat004buh88hr1gqs35	cmtmgpmdt00b9uh88kj3hs5jq	present	\N	\N	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:37:05.329	f
cmtmgpocj00bvuh8824ijygun	cmtmgory9004fuh88zsi0593d	cmtmgpmdt00b9uh88kj3hs5jq	absent	\N	Fever — parent notifié	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:37:05.54	f
cmtmgpoie00bxuh886ibns3p9	cmtmgosa4004juh88wvwv1eh6	cmtmgpmdt00b9uh88kj3hs5jq	present	\N	\N	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:37:05.75	f
cmtmgpoo900bzuh88zzpvb43f	cmtmgosm9004nuh88zuai7w3x	cmtmgpmdt00b9uh88kj3hs5jq	present	\N	\N	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:37:05.961	f
cmtmgpou600c1uh8860cb4gj4	cmtmgosy4004ruh88uq1eevfi	cmtmgpmdt00b9uh88kj3hs5jq	present	\N	\N	\N	cmtmgohpy002puh88gjp9m8e6	2026-09-04 04:37:06.174	f
cmtmgpp0100c3uh88eg2rzbmt	cmtmgot9u004vuh88peonuxaw	cmtmgpmjp00bbuh883g1ln3oy	present	\N	\N	\N	cmtmgoifc002vuh882pofuypi	2026-09-04 04:37:06.385	f
cmtmgpp5v00c5uh885hs4ovyq	cmtmgotlm004zuh883nzgofgh	cmtmgpmjp00bbuh883g1ln3oy	present	\N	\N	\N	cmtmgoifc002vuh882pofuypi	2026-09-04 04:37:06.595	f
cmtmgppbp00c7uh88s8dh43qa	cmtmgotxd0053uh88wckmigfj	cmtmgpmjp00bbuh883g1ln3oy	retard	\N	Retard 20 min — transport	\N	cmtmgoifc002vuh882pofuypi	2026-09-04 04:37:06.805	f
cmtmgpphj00c9uh88jnqhmu1h	cmtmgou9b0057uh88n7wx77hb	cmtmgpmjp00bbuh883g1ln3oy	present	\N	\N	\N	cmtmgoifc002vuh882pofuypi	2026-09-04 04:37:07.016	f
cmtmgppnf00cbuh88sp9f209q	cmtmgot9u004vuh88peonuxaw	cmtmgpmpj00bduh88y89wk3f0	present	\N	\N	\N	cmtmgoj4v0031uh88bq28m189	2026-09-04 04:37:07.227	f
cmtmgppt900cduh888o86twzp	cmtmgotlm004zuh883nzgofgh	cmtmgpmpj00bduh88y89wk3f0	present	\N	\N	\N	cmtmgoj4v0031uh88bq28m189	2026-09-04 04:37:07.438	f
cmtmgpqb200cfuh88l0079e8p	cmtmgotxd0053uh88wckmigfj	cmtmgpmpj00bduh88y89wk3f0	retard	\N	Retard 20 min — transport	\N	cmtmgoj4v0031uh88bq28m189	2026-09-04 04:37:08.078	f
cmtmgpqgx00chuh88j7gm93ft	cmtmgou9b0057uh88n7wx77hb	cmtmgpmpj00bduh88y89wk3f0	present	\N	\N	\N	cmtmgoj4v0031uh88bq28m189	2026-09-04 04:37:08.289	f
\.


--
-- Data for Name: Programme; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Programme" (id, "ecoleId", "matiereId", "niveauId", "anneeScolaireId", titre, objectifs, "volumeHorairePrevu", publie) FROM stdin;
cmtmgrma700jduh884kbeozy9	cmtmgo6sx0004uh88s2x44zis	cmtmgoh0i002nuh88k1pjyp0u	cmtmgodu9001ruh888tefyz7z	cmtmgoacz000vuh889r1st2jf	Mathématiques 6e — Programme annuel	Maîtriser les décimaux, la proportionnalité et la géométrie de base.	108	t
cmtmgro2j00jpuh888tz6hfrx	cmtmgo6sx0004uh88s2x44zis	cmtmgoi1v002tuh88tll4xgkx	cmtmgoe03001tuh88kdq6x6j9	cmtmgoacz000vuh889r1st2jf	Français 5e — Programme annuel	Grammaire, conjugaison, expression écrite.	96	t
cmtmgrok500jvuh88umkwfs7v	cmtmgo6sx0004uh88s2x44zis	cmtmgoirb002zuh88babhz5bf	cmtmgodik001nuh882ng65v4l	cmtmgoacz000vuh889r1st2jf	Histoire-Géo CM2 — Programme annuel	Repères historiques et lecture de cartes.	72	t
\.


--
-- Data for Name: PushNotificationLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushNotificationLog" (id, "ecoleId", "notificationId", "pushTokenId", titre, corps, statut, "providerMessageId", "dateEnvoi", "dateLivraison", "dateCreation", clic) FROM stdin;
cmtmgqjju00gcuh88bknw3zyj	cmtmgo6sx0004uh88s2x44zis	\N	cmtmgqj8200gbuh88z3ez0d5q	Bulletins publiés	Les bulletins T1 sont disponibles sur le portail parent.	delivre	fcm-msg-1	2026-08-25 10:00:00	2026-08-25 10:00:02	2026-09-04 04:37:45.978	f
\.


--
-- Data for Name: PushToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushToken" (id, "utilisateurId", token, provider, p256dh, "authKey", plateforme, "deviceModel", "osVersion", "appVersion", langue, actif, "dateCreation", "derniereActivite") FROM stdin;
cmtmgqj8200gbuh88z3ez0d5q	cmtmgo9vh000tuh885aak9o8v	fcm-token-demo-1	fcm	\N	\N	pwa	Pixel 7	Android 14	1.0.0	fr	t	2026-09-04 04:37:45.554	2026-09-04 04:37:45.552
\.


--
-- Data for Name: QuotaUsage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QuotaUsage" (id, "ecoleId", periode, ressource, consommation, limite, pourcentage, alerte80, alerte100, "dateDerniereMaj") FROM stdin;
cmtmgqrm800hhuh882elmdpm8	cmtmgo6sx0004uh88s2x44zis	2026-08	eleves	25	100	25	f	f	2026-09-04 04:37:56.432
cmtmgqrm800hiuh88dhfrp5oy	cmtmgo6sx0004uh88s2x44zis	2026-08	sms_envoyes	145	500	29	f	f	2026-09-04 04:37:56.432
cmtmgqrm800hjuh884mznyfq9	cmtmgo6sx0004uh88s2x44zis	2026-08	storage_go	2	10	20	f	f	2026-09-04 04:37:56.432
\.


--
-- Data for Name: RapportSauvegarde; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RapportSauvegarde" (id, "ecoleId", "utilisateurId", nom, type, configuration, format, partage, "dateCreation", "derniereExecution") FROM stdin;
cmtmgqvk500i2uh885nowj2y6	cmtmgo6sx0004uh88s2x44zis	cmtmgo9vh000tuh885aak9o8v	Suivi mensuel impayés	kpi_tableau_bord	{"filtres":{"statut":"impayee"},"colonnes":["eleve","montant"],"periode":"2026-08"}	table	f	2026-09-04 04:38:01.541	2026-09-04 04:38:01.539
\.


--
-- Data for Name: Rdv; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Rdv" (id, "creneauRdvId", "parentId", "eleveId", motif, statut, "createdAt") FROM stdin;
cmtmgprxh00cluh88ho4yyupu	cmtmgpqms00cjuh88ay4u5g4v	cmtmgovto005puh88u2t7gifb	cmtmgorat004buh88hr1gqs35	Bilan mi-trimestre — progrès en maths	confirme	2026-09-04 04:37:10.181
\.


--
-- Data for Name: ReceptionCommande; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReceptionCommande" (id, "commandeId", "dateReception", "quantiteRecue", "bonLivraisonUrl", "controleQualite", commentaire, "receptionneParId") FROM stdin;
cmtmgqf9500fpuh88n6o40rnv	cmtmgqe9n00fkuh884ngxbqgm	2026-08-12 00:00:00	130	/uploads/bl-001.pdf	t	Cahiers et stylos reçus conformes.	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: RegistreTraitement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RegistreTraitement" (id, "ecoleId", nom, finalite, "baseLegale", "donneesTraitees", "categoriesPersonnes", destinataires, "transfertsHorsUE", "dureeConservation", "mesuresSecurite", responsable, dpo, "dateCreation", "dateMaj") FROM stdin;
cmtmgqpzg00h9uh88r61dtwja	cmtmgo6sx0004uh88s2x44zis	Gestion des inscriptions élèves	Inscription et scolarisation des élèves	mission_publique	["identite_eleve","date_naissance","adresse","parent"]	["eleves","parents"]	équipe pédagogique, direction	Aucun	Durée de scolarité + 5 ans	\N	Directeur	DPO Éditeur SaaS	2026-09-04 04:37:54.316	2026-09-04 04:37:54.316
\.


--
-- Data for Name: RegleCalculMoyenne; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RegleCalculMoyenne" (id, "ecoleId", "cycleId", methode, "inclutAbsents", "notePlancher", "notePlafond", arrondi, "reglesSpecifiques") FROM stdin;
cmtmgrpjh00k3uh88m8r0swqm	cmtmgo6sx0004uh88s2x44zis	cmtmgob630011uh88yjtn8ugb	moyenne_ponderee	f	0	20	2	{"coefficients":"par matiere","eleve_absent":"note neutralisee"}
cmtmgrpv500k5uh8802dqfof8	cmtmgo6sx0004uh88s2x44zis	cmtmgob0a000zuh88w39s6w1i	moyenne_ponderee	f	0	20	0	\N
\.


--
-- Data for Name: Remplacement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Remplacement" (id, "congeId", "personnelAbsentId", "personnelRemplacantId", "dateDebut", "dateFin", statut) FROM stdin;
cmtmgrlh500j9uh88kl6pnpvp	cmtmgrk4h00j5uh886x6r3mpx	cmtmgoilf002xuh881z4m5vbm	cmtmgokpd003fuh88otd8240o	2026-09-01 04:38:34.916	2026-09-10 04:38:34.916	confirme
\.


--
-- Data for Name: RenduDevoir; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RenduDevoir" (id, "devoirId", "eleveId", "dateRendu", "contenuUrl", "commentaireEleve", note, appreciation, "corrigeParId", "dateCorrection", statut) FROM stdin;
cmtmgq7gq00eduh880mw9fahs	cmtmgq75100ebuh882ejkqx4f	cmtmgorat004buh88hr1gqs35	2026-09-04 04:37:30.315	/uploads/dm1-diop.pdf	\N	17	Très bon travail. Attention à la fraction irréductible ex.3.	cmtmgogop002luh88qdoewzyw	2026-08-24 00:00:00	corrige
\.


--
-- Data for Name: ReservationSalle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReservationSalle" (id, "salleId", "seanceId", date, "heureDebut", "heureFin", "reserveParId", motif, "createdAt") FROM stdin;
cmtmgruop00kluh882sgqebau	cmtmgpa91008wuh88txhtqi7c	cmtmgpkrf00avuh88vk1m6jp9	2026-09-22 00:00:00	08:00	10:00	cmtmgo9vh000tuh885aak9o8v	Cours de mathématiques (séance régulière)	2026-09-04 04:38:47.065
cmtmgrv0m00knuh889memy4g8	cmtmgpa91008xuh88w9yy946g	\N	2026-10-14 00:00:00	17:00	19:00	cmtmgo9vh000tuh885aak9o8v	Réunion Comité d'Éducation à la Santé	2026-09-04 04:38:47.494
\.


--
-- Data for Name: ReunionCollective; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ReunionCollective" (id, "classeId", date, heure, lieu, description) FROM stdin;
cmtmgrvzj00kruh88b773u81g	cmtmgof590027uh885f9q1ffp	2026-10-03 00:00:00	18:00	Salle A101	Réunion de rentrée : présentation de l'équipe et du programme annuel.
cmtmgrwc500ktuh88xr9a0fi3	cmtmgofmu002buh88919kv67g	2026-11-12 00:00:00	17:30	Salle B202	Préparation du concours d'entrée en sixième.
\.


--
-- Data for Name: RevisionPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RevisionPlan" (id, "planAccompagnementId", date, motif, constats, ajustements, "redigeParId") FROM stdin;
cmtmgqu8100huuh88gk2mtd3e	cmtmgqsx100houh880k0huchm	2026-09-04 04:37:59.808	Révision trimestrielle obligatoire	Plan respecté. Aucune crise rapportée ce trimestre.	Maintien du protocole actuel.	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, "ecoleId", code, libelle, "twofaRequis") FROM stdin;
cmtmgo871000buh886xw7l9pa	cmtmgo6sx0004uh88s2x44zis	direction	Direction	t
cmtmgo8ip000duh883i9c70o3	cmtmgo6sx0004uh88s2x44zis	enseignant	Enseignant	f
cmtmgo8oj000fuh88e6fj34e2	cmtmgo6sx0004uh88s2x44zis	comptabilite	Comptabilité	t
cmtmgo8ue000huh881k952197	cmtmgo6sx0004uh88s2x44zis	surveillant	Surveillant	f
cmtmgo90b000juh881bp3l99k	cmtmgo6sx0004uh88s2x44zis	rh	Ressources Humaines	f
cmtmgo965000luh88hcba94hc	cmtmgo6sx0004uh88s2x44zis	censeur	Censeur	f
cmtmgo9c0000nuh88suipm73b	cmtmgo6sx0004uh88s2x44zis	secretariat	Secrétariat	f
cmtmgo9hv000puh88khmd38a0	cmtmgo6sx0004uh88s2x44zis	assistant_direction	Assistant de Direction	f
cmtmgo9no000ruh88xvkm3f0g	cmtmgo6sx0004uh88s2x44zis	infirmier	Infirmier(ère)	f
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RolePermission" ("roleId", "permissionId") FROM stdin;
cmtmgo871000buh886xw7l9pa	cmtmgqyhu00iduh884sjl688p
cmtmgo871000buh886xw7l9pa	cmtmgr04400ieuh888itm7ex4
cmtmgo871000buh886xw7l9pa	cmtmgr21v00iguh882lrl4p79
cmtmgo871000buh886xw7l9pa	cmtmgr30p00ihuh888yjuzw2j
cmtmgo871000buh886xw7l9pa	cmtmgr3zh00iiuh88qbu5mn69
cmtmgo871000buh886xw7l9pa	cmtmgr4ya00ijuh881glzln02
cmtmgo871000buh886xw7l9pa	cmtmgr71700iluh88kvu1x8km
cmtmgo871000buh886xw7l9pa	cmtmgr80200imuh88h1tv374k
cmtmgo871000buh886xw7l9pa	cmtmgr94t00inuh88xfquscrq
cmtmgo871000buh886xw7l9pa	cmtmgra3k00iouh88a9i9qzvs
cmtmgo871000buh886xw7l9pa	cmtmgrb2c00ipuh88wyfl8z8s
cmtmgo871000buh886xw7l9pa	cmtmgrc1400iquh88i6xsbura
cmtmgo871000buh886xw7l9pa	cmtmgrczw00iruh88wm7hvj4n
cmtmgo871000buh886xw7l9pa	cmtmgrdys00isuh88gf0ogv5h
cmtmgo871000buh886xw7l9pa	cmtmgrexm00ituh883jjleejf
cmtmgo871000buh886xw7l9pa	cmtmgrfwf00iuuh88en818o32
cmtmgo871000buh886xw7l9pa	cmtmgrgvk00ivuh88y5ods94j
cmtmgo8ip000duh883i9c70o3	cmtmgqyhu00iduh884sjl688p
cmtmgo8ip000duh883i9c70o3	cmtmgr13300ifuh881l28z3po
cmtmgo8ip000duh883i9c70o3	cmtmgr5x600ikuh88l3sucbef
cmtmgo8ip000duh883i9c70o3	cmtmgra3k00iouh88a9i9qzvs
cmtmgo8ip000duh883i9c70o3	cmtmgrdys00isuh88gf0ogv5h
cmtmgo8oj000fuh88e6fj34e2	cmtmgr30p00ihuh888yjuzw2j
cmtmgo8oj000fuh88e6fj34e2	cmtmgr3zh00iiuh88qbu5mn69
cmtmgo8oj000fuh88e6fj34e2	cmtmgr4ya00ijuh881glzln02
cmtmgo8ue000huh881k952197	cmtmgqyhu00iduh884sjl688p
cmtmgo8ue000huh881k952197	cmtmgr5x600ikuh88l3sucbef
cmtmgo8ue000huh881k952197	cmtmgrb2c00ipuh88wyfl8z8s
cmtmgo8ue000huh881k952197	cmtmgra3k00iouh88a9i9qzvs
cmtmgo90b000juh881bp3l99k	cmtmgr71700iluh88kvu1x8km
cmtmgo90b000juh881bp3l99k	cmtmgr80200imuh88h1tv374k
cmtmgo965000luh88hcba94hc	cmtmgqyhu00iduh884sjl688p
cmtmgo965000luh88hcba94hc	cmtmgr5x600ikuh88l3sucbef
cmtmgo965000luh88hcba94hc	cmtmgra3k00iouh88a9i9qzvs
cmtmgo965000luh88hcba94hc	cmtmgrdys00isuh88gf0ogv5h
cmtmgo965000luh88hcba94hc	cmtmgrc1400iquh88i6xsbura
cmtmgo965000luh88hcba94hc	cmtmgr21v00iguh882lrl4p79
cmtmgo965000luh88hcba94hc	cmtmgrgvk00ivuh88y5ods94j
cmtmgo9c0000nuh88suipm73b	cmtmgqyhu00iduh884sjl688p
cmtmgo9c0000nuh88suipm73b	cmtmgr04400ieuh888itm7ex4
cmtmgo9c0000nuh88suipm73b	cmtmgr80200imuh88h1tv374k
cmtmgo9hv000puh88khmd38a0	cmtmgqyhu00iduh884sjl688p
cmtmgo9hv000puh88khmd38a0	cmtmgr04400ieuh888itm7ex4
cmtmgo9hv000puh88khmd38a0	cmtmgr80200imuh88h1tv374k
cmtmgo9hv000puh88khmd38a0	cmtmgr5x600ikuh88l3sucbef
cmtmgo9hv000puh88khmd38a0	cmtmgra3k00iouh88a9i9qzvs
cmtmgo9no000ruh88xvkm3f0g	cmtmgrexm00ituh883jjleejf
cmtmgo9no000ruh88xvkm3f0g	cmtmgqyhu00iduh884sjl688p
\.


--
-- Data for Name: Salle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Salle" (id, "ecoleId", nom, type, capacite, equipements, "batimentId", "etageId") FROM stdin;
cmtmgpa91008xuh88w9yy946g	cmtmgo6sx0004uh88s2x44zis	A102	classe	35	["tableau","bancs"]	\N	\N
cmtmgpa91008yuh88v1jjjy5a	cmtmgo6sx0004uh88s2x44zis	LAB-SCIENCES	labo	24	["paillasses","microscopes","hotte"]	\N	\N
cmtmgpa91008zuh88ddvqenfm	cmtmgo6sx0004uh88s2x44zis	SALLE-INFO	informatique	30	["ordinateurs","videoprojecteur"]	\N	\N
cmtmgpa910090uh88iue6yetc	cmtmgo6sx0004uh88s2x44zis	GYMNASE	sport	60	["tapis","barres"]	\N	\N
cmtmgpa91008wuh88txhtqi7c	cmtmgo6sx0004uh88s2x44zis	A101	classe	35	["tableau","bancs"]	cmtmgqw7m00i5uh880iopx45x	cmtmgqwjc00i7uh88pb0tm874
\.


--
-- Data for Name: SalleEquipement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SalleEquipement" (id, "salleId", type, quantite, etat, "dateDerniereMaintenance") FROM stdin;
cmtmgqxui00iauh88k3ytgguw	cmtmgpa91008wuh88txhtqi7c	videoprojecteur	1	fonctionnel	\N
cmtmgqxui00ibuh88e6rpsnrw	cmtmgpa91008wuh88txhtqi7c	TBI	1	fonctionnel	2026-07-15 00:00:00
cmtmgqxui00icuh88xl3yuhew	cmtmgpa91008wuh88txhtqi7c	climatisation	1	panne	\N
\.


--
-- Data for Name: Sanction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sanction" (id, "incidentId", type, description, "dateDebut", "dateFin", "dureeHeures", statut, "decideParId", "notifieParents", "dateNotification") FROM stdin;
cmtmgpcww009cuh8800yozxyl	cmtmgpc9d009auh88e9l0xy08	avertissement	Avertissement oral + convocation parent	\N	\N	\N	decidee	cmtmgo9vh000tuh885aak9o8v	t	2026-09-04 04:36:50.719
\.


--
-- Data for Name: Sauvegarde; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sauvegarde" (id, "nomFichier", "tailleOctets", checksum, type, statut, "creeParId", "dateCreation", "ecoleId") FROM stdin;
cmtmgtrcu00ncuh880flw5f56	sauvegarde-20260904-043911.sql	373203	\N	manuelle	reussie	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:40:15.848	\N
\.


--
-- Data for Name: Seance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Seance" (id, "classeId", "matiereId", "enseignantId", "chapitreId", date, "heureDebut", "heureFin", "salleId", "contenuPrevu", "contenuRealise", statut, "emploiTempsId") FROM stdin;
cmtmgpkrf00avuh88vk1m6jp9	cmtmgof590027uh885f9q1ffp	cmtmgoh0i002nuh88k1pjyp0u	cmtmgogop002luh88qdoewzyw	\N	2026-09-22 08:00:00	08:00	10:00	cmtmgpa91008wuh88txhtqi7c	Chapitre 1 : Nombres décimaux — addition et soustraction	\N	passee	\N
cmtmgpm7z00b7uh88p2h9s07r	cmtmgof590027uh885f9q1ffp	cmtmgoh0i002nuh88k1pjyp0u	cmtmgogop002luh88qdoewzyw	\N	2026-09-04 08:00:00	08:00	10:00	cmtmgpa91008wuh88txhtqi7c	Nombres décimaux — exercices	\N	passee	\N
cmtmgpmdt00b9uh88kj3hs5jq	cmtmgof590027uh885f9q1ffp	cmtmgoi1v002tuh88tll4xgkx	cmtmgohvt002ruh88urmcnww6	\N	2026-09-04 08:00:00	10:15	12:15	cmtmgpa91008wuh88txhtqi7c	Dictée et étude de texte	\N	passee	\N
cmtmgpmjp00bbuh883g1ln3oy	cmtmgofgz0029uh88fxh173kn	cmtmgoirb002zuh88babhz5bf	cmtmgoilf002xuh881z4m5vbm	\N	2026-09-04 08:00:00	08:00	10:00	cmtmgpa91008xuh88w9yy946g	L'Afrique précoloniale	\N	passee	\N
cmtmgpmpj00bduh88y89wk3f0	cmtmgofgz0029uh88fxh173kn	cmtmgojgl0035uh88lihtky0e	cmtmgojar0033uh88n96onwja	\N	2026-09-04 08:00:00	10:15	12:15	cmtmgpa91008xuh88w9yy946g	Les états de la matière	\N	passee	\N
cmtmgpmvh00bfuh88sd1lkk4t	cmtmgofmu002buh88919kv67g	cmtmgok5x003buh88v1rcw5fz	cmtmgok000039uh88lfxvziqb	\N	2026-09-04 08:00:00	08:00	10:00	cmtmgpa91008wuh88txhtqi7c	Irregular verbs — unit 2	\N	passee	\N
cmtmgpn7k00bhuh88v1f9568v	cmtmgofmu002buh88919kv67g	cmtmgokv9003huh88jkgrpvtv	cmtmgokpd003fuh88otd8240o	\N	2026-09-04 08:00:00	10:15	12:15	cmtmgpa91008xuh88w9yy946g	Athlétisme — course d'endurance	\N	passee	\N
\.


--
-- Data for Name: Section; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Section" (id, "cycleId", code, libelle) FROM stdin;
cmtmgobhz0015uh88nb2egxwv	cmtmgoaol000xuh88idtn1b76	MAT	Maternelle
cmtmgoch5001duh880pfv8hpo	cmtmgob0a000zuh88w39s6w1i	PRIM	Primaire
cmtmgodoe001puh884oz6ml92	cmtmgob630011uh88yjtn8ugb	COLL	Collège
cmtmgoehn001zuh88ic0z27xa	cmtmgobbx0013uh886zxw3tfp	LYC	Lycée
\.


--
-- Data for Name: SessionUtilisateur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SessionUtilisateur" (id, "utilisateurId", "tokenHash", "ecoleActiveId", fingerprint, "adresseIp", "userAgent", "deviceType", localisation, "dateCreation", "dateDerniereActivite", "dateExpiration", "expireManuellement", active) FROM stdin;
cmtmgqjvn00geuh88rvd1oc61	cmtmgo9vh000tuh885aak9o8v	hash-demo-token-1	\N	fp-1	192.168.1.42	Mozilla/5.0 (Macintosh) Chrome/127.0	desktop	Dakar, Sénégal	2026-09-04 04:37:46.403	2026-09-04 04:37:46.4	2026-09-11 04:37:46.4	f	t
\.


--
-- Data for Name: SignalementMineur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SignalementMineur" (id, "ecoleId", "eleveId", type, description, gravite, source, "dateSignalement", "dateFaits", "lieuFaits", "declareParId", "signalantAnonyme", statut, "confidentialiteNiveau", "partenairesExternesIds", "transfertCrip", "dateTransfertCrip", "mesuresProvisoires") FROM stdin;
cmtmgpygy00d2uh88z7exqgjy	cmtmgo6sx0004uh88s2x44zis	cmtmgory9004fuh88zsi0593d	harcelement	Harcèlement verbal entre pairs observé en récréation. Trois témoins.	preoccupant	enseignant	2026-09-04 04:37:18.658	2026-08-20 00:00:00	Cour de récréation	cmtmgogi5002juh88vhsapsfo	f	en_cours	restreint	["cmtmgpy5500d0uh88ezjelubo"]	f	\N	\N
\.


--
-- Data for Name: SignatureElectronique; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SignatureElectronique" (id, "documentGenereId", "signataireId", "signataireNom", "hashDocument", certificat, "horodatageRFC3161", "dateSignature", "adresseIp", "userAgent", niveau) FROM stdin;
cmtmgqv8e00i0uh88yyt1wa5v	cmtmgquwm00hyuh88n7cqy00h	cmtmgo9vh000tuh885aak9o8v	Direction - Vinci	sha256-demo-1	\N	\N	2026-09-04 04:38:01.116	192.168.1.42	Chrome/127	qualifie
\.


--
-- Data for Name: SmsLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SmsLog" (id, "ecoleId", "notificationId", destinataire, expediteur, message, provider, "providerMessageId", statut, "coutUnitaire", "coutTotal", segments, "dateEnvoi", "dateLivraison", "dateCreation", "codeErreur", tentative) FROM stdin;
cmtmgqiwb00g9uh887nfehqkl	cmtmgo6sx0004uh88s2x44zis	\N	+221 78 333 44 55	\N	Rappel: réunion parents-profs le 5/9 à 17h. Direction.	orange_api	OMS-2026-123456	delivre	2500	2500	1	2026-08-25 10:00:00	2026-08-25 10:00:05	2026-09-04 04:37:45.13	\N	0
\.


--
-- Data for Name: SoldeConge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SoldeConge" (id, "ecoleId", "personnelId", annee, "droitsAcquis", "joursPris", "joursRestants", "reliquatAnterieur", "derniereMaj") FROM stdin;
cmtmgq46r00dyuh88f21ab8qr	cmtmgo6sx0004uh88s2x44zis	cmtmgogop002luh88qdoewzyw	2026	25	5	20	3	2026-09-04 04:37:26.066
\.


--
-- Data for Name: SortieAnticipee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SortieAnticipee" (id, "eleveId", date, heure, "autorisationSortieId", "recupereParNom", "validationExceptionnelle", "valideParId", "parentsNotifies", "dateSortie") FROM stdin;
cmtmgrxb800kzuh88gqe670f3	cmtmgosa4004juh88wvwv1eh6	2026-09-18 00:00:00	14:30	\N	Mme Camara (mère)	f	cmtmgo9vh000tuh885aak9o8v	t	2026-09-04 04:38:50.259
cmtmgrxmz00l1uh88knjbcu84	cmtmgotxd0053uh88wckmigfj	2026-09-24 00:00:00	10:00	\N	M. Bello (père)	t	cmtmgo9vh000tuh885aak9o8v	t	2026-09-04 04:38:50.891
\.


--
-- Data for Name: Stage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Stage" (id, "ecoleId", "eleveId", entreprise, poste, "dateDebut", "dateFin", "tuteurEntreprise", "encadrantEcoleId", objectifs, evaluation, statut, "conventionUrl") FROM stdin;
cmtmgq3j900duuh88j2okbgyq	cmtmgo6sx0004uh88s2x44zis	cmtmgosm9004nuh88zuai7w3x	Sonatel S.A.	Stage informatique - infrastructures	2026-09-01 00:00:00	2026-09-30 00:00:00	M. Ndiaye (DSI)	cmtmgogop002luh88qdoewzyw	Découverte du système d'information d'une grande entreprise. Participation au déploiement d'un serveur.	\N	planifie	\N
\.


--
-- Data for Name: StockArticle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockArticle" (id, "ecoleId", nom, categorie, quantite, "seuilAlerte", unite, "prixUnitaire") FROM stdin;
cmtmgphic00aeuh88nbu2fye2	cmtmgo6sx0004uh88s2x44zis	Cahier 200 pages	Papeterie	250	50	pièce	75000
\.


--
-- Data for Name: StockageFichier; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockageFichier" (id, "ecoleId", "nomFichier", chemin, "mimeType", "tailleOctets", confidentiel, "cibleType", "cibleId", "uploadeParId", "dateUpload") FROM stdin;
cmtmgsd3n00nbuh88pt3kv21s	cmtmgo6sx0004uh88s2x44zis	bienvenue.txt	cmtmgo6sx0004uh88s2x44zis/bienvenue.txt	text/plain	130	f	eleve	cmtmgorat004buh88hr1gqs35	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:39:10.931
\.


--
-- Data for Name: StripeEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StripeEvent" (id, "eventIdStripe", type, donnees, traite, "dateReception", "dateTraitement", erreur) FROM stdin;
cmtmgqs9j00hkuh887rys3wa2	evt_2026_demo_001	invoice.payment_succeeded	{"invoiceId":"in_demo123","amountPaidCentimes":6500000}	t	2026-08-05 00:00:00	2026-08-05 00:00:00	\N
\.


--
-- Data for Name: SuiviSignalement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SuiviSignalement" (id, "signalementId", note, "auteurId", date) FROM stdin;
cmtmgpz8200d6uh88jx3uzpqh	cmtmgpygy00d2uh88z7exqgjy	Entretien réalisé avec l'élève. Comportement coopératif. Suivi à poursuivre.	cmtmgo9vh000tuh885aak9o8v	2026-09-04 04:37:19.634
\.


--
-- Data for Name: TemplateDocument; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TemplateDocument" (id, "ecoleId", code, libelle, type, "contenuTemplate", "variablesDisponibles", langue, actif, "dateCreation", "dateMaj") FROM stdin;
cmtmgqukn00hwuh88avwa188g	cmtmgo6sx0004uh88s2x44zis	bulletin	Bulletin trimestriel	html_template	<h1>{{ecole_nom}}</h1><h2>Bulletin {{periode_libelle}} — {{eleve_nom}}</h2><table>{{#notes}}<tr><td>{{matiere}}</td><td>{{moyenne}}</td></tr>{{/notes}}</table>	["ecole_nom","periode_libelle","eleve_nom","notes"]	fr	t	2026-09-04 04:38:00.263	2026-09-04 04:38:00.263
\.


--
-- Data for Name: TentativeConnexion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TentativeConnexion" (id, "utilisateurId", email, "adresseIp", "userAgent", succes, "motifEchec", date) FROM stdin;
34	\N	direction@vinci.sn	192.168.1.42	Chrome/127	t	\N	2026-09-04 04:37:50.091
35	\N	inconnu@example.com	10.0.0.5	Mozilla	f	utilisateur_inexistant	2026-09-04 04:37:50.511
36	\N	direction@vinci.sn	\N	\N	t	\N	2026-09-28 07:55:00
37	\N	inconnu@exemple.com	\N	\N	f	Identifiants incorrects	2026-09-28 09:12:00
38	\N	mamadou.fall@vinci.sn	\N	\N	t	\N	2026-09-28 10:30:00
\.


--
-- Data for Name: TestAdmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TestAdmission" (id, "candidatureId", matiere, date, note, sur, appreciation, "evalueParId") FROM stdin;
cmtmgq5hs00e4uh88yundb6g2	cmtmgq4iq00e0uh8840msx3he	Mathématiques	2026-08-25 09:00:00	16.5	20	Bon niveau logique et arithmétique.	cmtmgogi5002juh88vhsapsfo
\.


--
-- Data for Name: ThemeEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ThemeEcole" (id, "ecoleId", "couleurPrimaire", "couleurSecondaire", "couleurAccent", "couleurFond", "logoSidebarUrl", "faviconUrl", "policeFamille", "customCssUrl", "nomProduit", "dateMaj") FROM stdin;
cmtmgqqmw00hduh88fhz06drn	cmtmgo6sx0004uh88s2x44zis	#059669	#0ea5e9	#f59e0b	#f8fafc	\N	\N	Inter	\N	ScolaGestion	2026-09-04 04:37:55.16
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Ticket" (id, "ecoleId", sujet, description, categorie, priorite, statut, "slaContractuelHeures", "slaEcheance", "creeParId", "assigneAId", "dateCreation", "dateCloture", "delaiResolutionMinutes") FROM stdin;
cmtmgpwu300cvuh8807puo9ar	cmtmgo6sx0004uh88s2x44zis	Bulletins PDF — erreur de génération pour 6A	Génération des bulletins T1 échoue sur la classe 6A (erreur 500).	technique	haute	en_cours	24	2026-09-05 04:37:16.536	cmtmgo9vh000tuh885aak9o8v	support-editeur-1	2026-09-04 04:37:16.539	\N	\N
\.


--
-- Data for Name: TicketMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TicketMessage" (id, "ticketId", "auteurId", "auteurRole", message, "pieceJointeUrl", interne, "dateEnvoi") FROM stdin;
cmtmgpx5v00cxuh88rcg6cujb	cmtmgpwu300cvuh8807puo9ar	\N	direction_ecole	Bonjour, impossible de publier les bulletins depuis ce matin.	\N	f	2026-09-04 04:37:16.962
cmtmgpxng00czuh88jcwxi466	cmtmgpwu300cvuh8807puo9ar	\N	support_editeur	Nous investiguons. Logs indiquent un timeout sur l'API PDF. Intervenant dans 2h.	\N	f	2026-09-04 05:37:17.386
\.


--
-- Data for Name: TicketStatutHistorique; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TicketStatutHistorique" (id, "ticketId", "ancienStatut", "nouveauStatut", "modifieParId", "dateChangement") FROM stdin;
2	cmtmgpwu300cvuh8807puo9ar	ouvert	en_cours	support-editeur-1	2026-09-04 04:37:17.808
\.


--
-- Data for Name: TransportArret; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportArret" (id, "ligneId", nom, ordre, heure) FROM stdin;
cmtmgpin700aluh88d9ey11bg	cmtmgpibi00akuh8806t8rnzy	Marché HLM	1	06:45
cmtmgpin700amuh88wved1qvp	cmtmgpibi00akuh8806t8rnzy	Sicap Liberté 2	2	06:55
cmtmgpin700anuh88piwc903i	cmtmgpibi00akuh8806t8rnzy	École	3	07:20
\.


--
-- Data for Name: TransportInscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportInscription" (id, "ecoleId", "eleveId", "classeId", "ligneId", "arretMonteeId", "arretDescenteId", tarif, actif) FROM stdin;
cmtmgpjag00apuh88tdltr1il	cmtmgo6sx0004uh88s2x44zis	cmtmgosm9004nuh88zuai7w3x	cmtmgof590027uh885f9q1ffp	cmtmgpibi00akuh8806t8rnzy	\N	\N	1500000	t
\.


--
-- Data for Name: TransportLigne; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportLigne" (id, "ecoleId", nom, vehicule, "chauffeurId") FROM stdin;
cmtmgpibi00akuh8806t8rnzy	cmtmgo6sx0004uh88s2x44zis	Ligne Nord — Plateau	Bus 12 places	cmtmgokpd003fuh88otd8240o
\.


--
-- Data for Name: TwoFactorBackupCode; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TwoFactorBackupCode" (id, "utilisateurId", "codeHash", utilise, "dateUtilisation", "dateGeneration") FROM stdin;
cmtmgqklc00ghuh88h7ocoat6	cmtmgo9vh000tuh885aak9o8v	bf02145ce788ab3795952e6ecf5e8fa0d8461e8f3267168816a1a824a6df38f7	f	\N	2026-09-04 04:37:47.323
cmtmgqklc00giuh8856sj54b3	cmtmgo9vh000tuh885aak9o8v	c90226c52ce3b7d8753f9b8352b63e3c1e55c1a04887c514a98a31a24ef98bcf	f	\N	2026-09-04 04:37:47.323
cmtmgqklc00gjuh8830qrl5hv	cmtmgo9vh000tuh885aak9o8v	432dd09d29c7e5aba0c59d21b2ff192642c061f6e08a2752af7609e731a06ff5	f	\N	2026-09-04 04:37:47.323
cmtmgqklc00gkuh88whkchrmw	cmtmgo9vh000tuh885aak9o8v	bd3904aa06b969119d7377744030bef227af7d7c21ba43e55243a9b39c52a31a	f	\N	2026-09-04 04:37:47.323
cmtmgqklc00gluh88c1pp56xb	cmtmgo9vh000tuh885aak9o8v	05d6f245fda0cace23141b0703c3fe6bd192b721bb1a34494b98d9ae43dbb859	f	\N	2026-09-04 04:37:47.323
cmtmgqklc00gmuh883ka6vqn2	cmtmgo9vh000tuh885aak9o8v	2a119e4da5b80be22bb3992f6672a33c6da8c69ff4cadd4dffb7b598c7239c7a	f	\N	2026-09-04 04:37:47.324
cmtmgqklc00gnuh88zttre3pw	cmtmgo9vh000tuh885aak9o8v	164d42800b1cc0a295355a956e40240dcf1b90f66b4c3367fdcfd5a90c4c9f95	f	\N	2026-09-04 04:37:47.324
cmtmgqklc00gouh88p3cxklms	cmtmgo9vh000tuh885aak9o8v	47d8aa18beaa37e6cbb5766e3d23fd3f5c092049945be845d829d03afe2a12c1	f	\N	2026-09-04 04:37:47.325
cmtmgqklc00gpuh88cvwin1m5	cmtmgo9vh000tuh885aak9o8v	7d31fc9e2b223aee9395095f4559caf46eab26375897de521bc2a526b79f9d07	f	\N	2026-09-04 04:37:47.325
cmtmgqklc00gquh88j8jiicta	cmtmgo9vh000tuh885aak9o8v	4dbdb954527ad642d4b529dfba9ff2b76e9ded904891bdd5f110a052cdf4593d	f	\N	2026-09-04 04:37:47.325
\.


--
-- Data for Name: TwoFactorMethod; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TwoFactorMethod" (id, "utilisateurId", methode, secret, telephone, email, actif, "dateActivation", "derniereUtilisation") FROM stdin;
cmtmgqk7m00gguh88i8txhjwx	cmtmgo9vh000tuh885aak9o8v	totp	JBSWY3DPEHPK3PXP	\N	\N	t	2026-08-01 00:00:00	\N
cmtmgqm7t00gvuh88mgxfs70q	cmtmgolwj003juh88a1v703lw	totp	JBSWY3DPEHPK3PXP	\N	\N	t	2026-09-04 04:37:49.431	\N
\.


--
-- Data for Name: Utilisateur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Utilisateur" (id, "ecoleId", email, "motDePasseHash", telephone, nom, prenom, type, actif, "twofaActive", "derniereConnexion", "tentativesEchouees", "verrouilleJusqua", "consentementPortail", "consentementDate", "createdAt", "deletedAt") FROM stdin;
cmtmgoohy003vuh88g3p1gbyf	cmtmgo6sx0004uh88s2x44zis	surveillant@vinci.sn	scrypt$16384$8$1$4b15c2b04899e4c6b23b0d49e798ffad$d8bc57e2d8a180ce686b5ccbda4ba06130d91f2a427daf69a67d5ef3a67d75d4afcb189d707f72758ca34fc78b4a33c083a53fe919d18de91a7369d321438f4d	\N	Kane	Modou	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:19.075	2026-09-04 04:36:19.078	\N
cmtmgo7vc0009uh88fauam1ma	\N	editeur@platforme.com	scrypt$16384$8$1$c475877c4e23125255adb5439733e699$76465672583bc00b0de5f459d7b02e81ae488f721215a0cc7d82cb6c8d2f8ae30cdb8d280e69a8f4bdeaa5ab22083bbe8383dac776d4a6257baf5593dcb90698	\N	Éditeur	Super-Admin	super_admin	t	f	\N	0	\N	t	2026-09-04 04:35:57.524	2026-09-04 04:35:57.528	\N
cmtmgo9vh000tuh885aak9o8v	cmtmgo6sx0004uh88s2x44zis	direction@vinci.sn	scrypt$16384$8$1$21afdf14c28b0bd6397e717baafe01a3$a6e351d850df09d187894e7046683c5276ad35ba64c627e6ed639dfbebe3ff250296820ff7f4a2f39f0d58badb72f5c859087cd60f63274e85039a473a995cae	\N	Diop	Awa	personnel	t	t	\N	0	\N	t	2026-09-04 04:36:00.121	2026-09-04 04:36:00.122	\N
cmtmgogi5002juh88vhsapsfo	cmtmgo6sx0004uh88s2x44zis	mamadou.fall@vinci.sn	scrypt$16384$8$1$0e35f32827b63bb1904ae59ebc96d48a$b5c282e25460cf62e50717da77ca706791a7de2345db7ae452d0dd473efe1e80febc1c3b20cdcc195fa596e696e1ed31e4b0018fe5d6a5dcba4bfb53ea6ff7ff	\N	Fall	Mamadou	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:08.714	2026-09-04 04:36:08.716	\N
cmtmgohpy002puh88gjp9m8e6	cmtmgo6sx0004uh88s2x44zis	fatou.sow@vinci.sn	scrypt$16384$8$1$6d5e825ee12bab178f7fa6946d370d63$bd909a47cf5a3cd7802d5e5c3b35d428c6e3602cd1a63ee8973fad15ad41e24cc8fd1790a1b9d808193f19960bb64e3194ac455334de32dddfd2fabfad6d2ec2	\N	Sow	Fatou	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:10.292	2026-09-04 04:36:10.294	\N
cmtmgoifc002vuh882pofuypi	cmtmgo6sx0004uh88s2x44zis	cheikh.ndiaye@vinci.sn	scrypt$16384$8$1$83d452f73b959040222a780e5e294f97$d1599f4b82e840dc3160c65547997e9338b961090b3ee0dbf6406740866bc372d89cb2b6daaf091f23ca65f43febf4cf59cb7f9779e056b4852085935352e00f	\N	Ndiaye	Cheikh	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:11.206	2026-09-04 04:36:11.207	\N
cmtmgoj4v0031uh88bq28m189	cmtmgo6sx0004uh88s2x44zis	aïssatou.ba@vinci.sn	scrypt$16384$8$1$eee8d4e70fbf94a6268aa290ad2fa62a$a6d4dd9054eb835bd2b5e1ee64063e2e79de3b62f66c76a439a664677cde6eccc849d076e23b4721b10e6a6baf4df3c16e81e28a723fa90e037b0ef39136dcbd	\N	Ba	Aïssatou	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:12.125	2026-09-04 04:36:12.127	\N
cmtmgoju70037uh88suxbvb79	cmtmgo6sx0004uh88s2x44zis	ousmane.diallo@vinci.sn	scrypt$16384$8$1$071ce17b463660e8946cea2c598b17b6$d123e6d8f0030e206fce00e9e8394d894be87fea6b4ef84dffc74dd338e2e472e97aa883ffb8859da6b59ed36ab2dc94b1c96ef8130bb1d3cf89455f8fefb99b	\N	Diallo	Ousmane	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:13.038	2026-09-04 04:36:13.039	\N
cmtmgokjb003duh88dkmpfy8v	cmtmgo6sx0004uh88s2x44zis	mariama.gueye@vinci.sn	scrypt$16384$8$1$d514677688864950dd866da25cec1282$9559273f54800ed178d0dd59d11f27d7314f96e7a815d0a258ff40c61927c547ddd8b609fdaf16fc47a6a0d4ea64bbd664ee59354b723fdb9de9109e54430a81	\N	Gueye	Mariama	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:13.94	2026-09-04 04:36:13.942	\N
cmtmgon38003nuh88a86qudhn	cmtmgo6sx0004uh88s2x44zis	rh@vinci.sn	scrypt$16384$8$1$f3b7cf268de55d3fad7d3b488668f460$f904f7b993ef81a499085c8045b8ec9d0df475493dcf831b30ee4edd8be09afa277513d2f4a1d2d91ff0c8f668ce5ef52a03bf79d892fb9a49ec7b22aa7d4def	\N	Ndiaye	Sophie	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:17.251	2026-09-04 04:36:17.252	\N
cmtmgonsk003ruh882vwzj5uq	cmtmgo6sx0004uh88s2x44zis	censeur@vinci.sn	scrypt$16384$8$1$f8b3250f39021ebb63149da9a56ee3fe$de0834a36e840c57376f6e5d072fc5a76564b984d9b3130016638b29595b796b84bc3444373a609371d65b40f5736715b60119a274746036631270e60459618f	\N	Diagne	Ibrahima	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:18.163	2026-09-04 04:36:18.164	\N
cmtmgop8h003zuh88luusk8a6	cmtmgo6sx0004uh88s2x44zis	secretariat@vinci.sn	scrypt$16384$8$1$d2a795d95d0b1330c86e9d91ffcc420d$e042b80210a93444b8a48de3aa313713274d3889c946d03adde751b72bc046cf8676397b311b33fed806a90b04a3da57f16e13e84622f723a74b606736c1e6a7	\N	Fall	Coumba	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:20.032	2026-09-04 04:36:20.033	\N
cmtmgopy40043uh881197d5mz	cmtmgo6sx0004uh88s2x44zis	assistant@vinci.sn	scrypt$16384$8$1$acc28da45baf08a91a158c31d1dc1a5d$5f508ff912bd5f65f5d2afc57e0a708ed80058f8f15cf5b77300add3b317c40b82c946468e1a89c30ee9868d092bbfd0305fbb7754a7b42377a1dea4b0f2d031	\N	Mbaye	Khadija	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:20.954	2026-09-04 04:36:20.956	\N
cmtmgoqn60047uh885udpqdn6	cmtmgo6sx0004uh88s2x44zis	infirmiere@vinci.sn	scrypt$16384$8$1$72e1d0f8e1f0407b2bb228f3b299cd3a$0629d8753087ce71fc59a213562073167372021f7a6026ad6726047eb8ce7f0c2a19c666392eefc8f32929dc08ec9fed8c4c9c3fe62f165bfc8a78ff8528a920	\N	Sow	Aminata	personnel	t	f	\N	0	\N	t	2026-09-04 04:36:21.856	2026-09-04 04:36:21.857	\N
cmtmgovni005nuh88br2xghic	cmtmgo6sx0004uh88s2x44zis	parent.ade@gmail.com	scrypt$16384$8$1$316d98e30229f02d5c959ddd3c020543$1e3d1742dc07b5caa52c1138d77ae0bcf5d3b49ea06e341ef3b32f9d24a1e327a5a2408064e45c9748e1bb7843d472619910dda30cc1bcc399ee12cf5edf3efc	\N	Ade	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:36:28.349	2026-09-04 04:36:28.35	\N
cmtmgowkg005ruh88fpyd4eed	cmtmgo6sx0004uh88s2x44zis	parent.idriss@gmail.com	scrypt$16384$8$1$b0943867e78593d03b46b4980f1b764d$37583aedce546bfe885af4cca0ebb260f86ba35460dd503f0f766065d91fdd70b516579cb7dcd43bdddf3a2010aa4ed6e9407992a7afb3f73613f4d1a0930f78	\N	Idriss	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:36:29.534	2026-09-04 04:36:29.536	\N
cmtmgox4k005vuh88c01woirm	cmtmgo6sx0004uh88s2x44zis	parent.aminata@gmail.com	scrypt$16384$8$1$8df7879a9cd1c1669faa202ebd8d4270$fc24f246ef44cc59503d21a50890822fcffb401e2a1576193a018851cea4792a60cf05400ae5e5d9741f331d4c5cc7a3da2ac9686f6c48ffe24393bec38871f0	\N	Aminata	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:36:30.259	2026-09-04 04:36:30.26	\N
cmtmgoxob005zuh88urwfk4ot	cmtmgo6sx0004uh88s2x44zis	parent.omar@gmail.com	scrypt$16384$8$1$9f28b4ac1d9179200cb0715fd1414bb6$7611171b29a0e96612ef6690353f2b840d238724e536497fd76298df13abaa0c9b99ecf674235afee97a36f7dd2e7a6c547a811bed07f80a8b9d9363372642c2	\N	Omar	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:36:30.97	2026-09-04 04:36:30.971	\N
cmtmgoydu0063uh88vm9v6d3i	cmtmgo6sx0004uh88s2x44zis	parent.khadija@gmail.com	scrypt$16384$8$1$77e88b87b3b16bbd415a2fa6e92c4981$2cf7d33c53d5a1367cfda7cd503b12f6ee80672cf664aef7d8bd362b22b5111a475ffbdb3b3ed147605f5f3f7002ffd4a413bbf84cc27a9e10b77d5cacf2b4c1	\N	Khadija	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:36:31.888	2026-09-04 04:36:31.89	\N
cmtmgoyxg0067uh889d4ww8ky	cmtmgo6sx0004uh88s2x44zis	parent.pape@gmail.com	scrypt$16384$8$1$568e5d63922b59e0c46cb2d1dc42d06a$c23b4c72f0ef34e696bea6c9d699d195263178f6ec1c3ae054e57c08a5f24afd9db42dbc1b6cc28c020a9a30bceed07863bbaec03c1267d3f88e8f0f2796fb32	\N	Pape	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:36:32.593	2026-09-04 04:36:32.596	\N
cmtmgozgr006buh88zfrqibn9	cmtmgo6sx0004uh88s2x44zis	parent.sokhna@gmail.com	scrypt$16384$8$1$bba56dc661609330e807c7dd024fb75e$ec628e2158053eb2fa47f67adbc7fac5fdeb09822f3c69970257406ef8faad779d51bfad3a7ee2caa4eeb9ce29d908d3562607643ffd2406e2047ae6bce233a8	\N	Sokhna	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:36:33.289	2026-09-04 04:36:33.291	\N
cmtmgp071006fuh88yokg19gq	cmtmgo6sx0004uh88s2x44zis	parent.awa@gmail.com	scrypt$16384$8$1$6f734d0ad01a04f4c42e30acee888249$8dd1dc3c1a1854ef0514ab5a50c6d2a98fc5eb5ab00316593947492f8eee5177d0006809ff757325d8d4ddc64996953d831a61142431c2be058f79e15efc2956	\N	Awa	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:36:34.235	2026-09-04 04:36:34.237	\N
cmtmgp0qv006juh883egwkjw6	cmtmgo6sx0004uh88s2x44zis	parent.moussa@gmail.com	scrypt$16384$8$1$8cf3fb766fb09bd797b3e9d77c9d50af$95a4ed0d7a81e5da23ecf1d425d5bd1de35749654d1f70da3ff5c02ad830b6887b218a4caf54ede84bb0bee95930561f9ab37d6e057590606a08e359a123c9e0	\N	Moussa	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:36:34.949	2026-09-04 04:36:34.951	\N
cmtmgp1ae006nuh88eyst5lhl	cmtmgo6sx0004uh88s2x44zis	parent.astou@gmail.com	scrypt$16384$8$1$4b3e276819de2e527ae77222593865fd$0cf6086938120da12270b3dda37fbfa4ab58f1d2adcf2ff5da973a3d94f6baa96fa74deed18ae612bd6c2b9a02a007c11ae1fc9ebbff5e3a53aa60b54187e494	\N	Astou	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:36:35.653	2026-09-04 04:36:35.654	\N
cmtmgp1td006ruh88pf4f9iu8	cmtmgo6sx0004uh88s2x44zis	parent.ibou@gmail.com	scrypt$16384$8$1$16e2b40046cf5f93fd0b4bc3143dcab7$a7d0e1b3ec2a852cf0f587a6a576daad7c03774f14740110cec68f0fd65a58dc1cc4851000be36f1920433510e03d66ef735feb353437311dd9a743c17ac6bc0	\N	Ibou	Papa	parent	t	f	\N	0	\N	t	2026-09-04 04:36:36.336	2026-09-04 04:36:36.337	\N
cmtmgp2db006vuh88jvfpwqtb	cmtmgo6sx0004uh88s2x44zis	parent.mariama@gmail.com	scrypt$16384$8$1$e53c8f141a3be81303f1af29e222202f$ab77a3c36c1456dfe863458cd8f14103c9a692abd39f5ce825dc3b1fbe6c05a4d6662888c7596d8253a3076cddd0e86a739c6c43e9eaee6ea63a40e7e15b9648	\N	Mariama	Maman	parent	t	f	\N	0	\N	t	2026-09-04 04:36:37.054	2026-09-04 04:36:37.055	\N
cmtmgp2ws006zuh8842kvq0td	cmtmgo6sx0004uh88s2x44zis	eleve.diop@vinci.sn	scrypt$16384$8$1$0283a3ac8e017b811e277593feba0961$85f9789793f47913c83d621eaba2a0c13d73029bf11d2c80251bc244459ae4b461165cddd53ca74c73d96967efcd12970f1e7ad67d8c1a9845ef0187e1b8544c	\N	Pape	Diop	eleve	t	f	\N	0	\N	t	2026-09-04 04:36:37.754	2026-09-04 04:36:37.756	\N
cmtmgolwj003juh88a1v703lw	cmtmgo6sx0004uh88s2x44zis	comptable@vinci.sn	scrypt$16384$8$1$e4d0d6e1f347e26ddf35064f6d52fa53$65205b0bf3a0006c7eb4f259dd881bfff8cc0f9f33ccc1cc3f8de206343c52de26366a5d1ac620d89f35b6ad24927adc5538c0c89c94bde8ab3b16169ecda6a0	\N	Sarr	Bineta	personnel	t	t	\N	0	\N	t	2026-09-04 04:36:15.714	2026-09-04 04:36:15.715	\N
\.


--
-- Data for Name: UtilisateurEcole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UtilisateurEcole" (id, "utilisateurId", "ecoleId", "roleLibelle", "dateAjout") FROM stdin;
cmtmgs27900lsuh88xy1m79y1	cmtmgo9vh000tuh885aak9o8v	cmtmgs0wc00lkuh88quxpe5xg	Directeur partenaire	2026-09-04 04:38:56.805
\.


--
-- Data for Name: UtilisateurRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UtilisateurRole" ("utilisateurId", "roleId", "dateDebut", "dateFin") FROM stdin;
cmtmgolwj003juh88a1v703lw	cmtmgo8oj000fuh88e6fj34e2	2026-09-04 04:36:16.776	\N
cmtmgon38003nuh88a86qudhn	cmtmgo90b000juh881bp3l99k	2026-09-04 04:36:17.888	\N
cmtmgonsk003ruh882vwzj5uq	cmtmgo965000luh88hcba94hc	2026-09-04 04:36:18.8	\N
cmtmgoohy003vuh88g3p1gbyf	cmtmgo8ue000huh881k952197	2026-09-04 04:36:19.733	\N
cmtmgop8h003zuh88luusk8a6	cmtmgo9c0000nuh88suipm73b	2026-09-04 04:36:20.688	\N
cmtmgopy40043uh881197d5mz	cmtmgo9hv000puh88khmd38a0	2026-09-04 04:36:21.589	\N
cmtmgoqn60047uh885udpqdn6	cmtmgo9no000ruh88xvkm3f0g	2026-09-04 04:36:22.49	\N
cmtmgo9vh000tuh885aak9o8v	cmtmgo871000buh886xw7l9pa	2026-09-04 04:38:31.271	\N
cmtmgogi5002juh88vhsapsfo	cmtmgo8ip000duh883i9c70o3	2026-09-04 04:38:31.271	\N
cmtmgohpy002puh88gjp9m8e6	cmtmgo8ip000duh883i9c70o3	2026-09-04 04:38:31.271	\N
\.


--
-- Data for Name: Vaccination; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Vaccination" (id, "ecoleId", "eleveId", vaccin, "dateVaccination", "dateRappel", statut, "certificatUrl", note, "ficheSanteId") FROM stdin;
cmtmgrzx400lfuh88g7wq7ck1	cmtmgo6sx0004uh88s2x44zis	cmtmgorat004buh88hr1gqs35	DTaP	2024-03-10 00:00:00	\N	a_jour	\N	\N	\N
cmtmgrzx400lguh884e08imhk	cmtmgo6sx0004uh88s2x44zis	cmtmgot9u004vuh88peonuxaw	BCG	2023-11-02 00:00:00	\N	a_jour	\N	\N	\N
cmtmgrzx400lhuh88cnayccxm	cmtmgo6sx0004uh88s2x44zis	cmtmgotxd0053uh88wckmigfj	ROR	2024-06-15 00:00:00	2027-06-15 00:00:00	rappel_prevu	\N	\N	\N
\.


--
-- Data for Name: VariablePaie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VariablePaie" (id, "ecoleId", "personnelId", periode, type, libelle, montant, "dateAttribution", "attribueParId", "bulletinPaieId") FROM stdin;
cmtmgq1jz00dkuh8889p8fa57	cmtmgo6sx0004uh88s2x44zis	cmtmgogop002luh88qdoewzyw	2026-08	prime	Prime de rendement	1000000	2026-09-04 04:37:22.655	cmtmgo9vh000tuh885aak9o8v	\N
\.


--
-- Data for Name: VerificationAntecedents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VerificationAntecedents" (id, "ecoleId", "personnelId", type, "referenceDossier", statut, "dateDemande", "dateObtention", "dateExpiration", "fichierUrl", "valideParId") FROM stdin;
cmtmgpzlr00d8uh88ujlklo4t	cmtmgo6sx0004uh88s2x44zis	cmtmgogop002luh88qdoewzyw	casier_judiciaire	\N	obtenue	2026-07-15 00:00:00	2026-07-25 00:00:00	2027-07-25 00:00:00	\N	cmtmgo9vh000tuh885aak9o8v
\.


--
-- Data for Name: Visiteur; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Visiteur" (id, "ecoleId", nom, "motifVisite", "personneVisiteeId", "dateHeureEntree", "dateHeureSortie", "pieceIdentiteVerifiee", "badgeNumero") FROM stdin;
cmtmgpuvy00cnuh882xkyqhn4	cmtmgo6sx0004uh88s2x44zis	Inspecteur Régional DIOP	Inspection pédagogique - Maths	\N	2026-09-04 04:37:14.015	\N	t	V-0042
\.


--
-- Data for Name: VoteConseil; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VoteConseil" (id, "deliberationId", "membreId", vote, date) FROM stdin;
cmtmgq9s700eruh88p8v0f1kr	cmtmgq9fp00epuh884wmnwrng	cmtmgq8s600eluh887ytyp0sf	pour	2026-09-04 04:37:33.318
\.


--
-- Data for Name: WebhookDelivery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WebhookDelivery" (id, "webhookId", event, payload, "statutHttp", "reponseCorps", tentative, statut, "dateCreation", "dateEnvoi", "prochaineTentative") FROM stdin;
cmtmgqoco00h1uh883of4h47y	cmtmgqo0w00gzuh88ziw6oqlr	eleve.inscription	{"eleveId":"cmtmgorat004buh88hr1gqs35"}	200	ok	1	livre	2026-09-04 04:37:52.2	2026-09-04 04:37:52.197	\N
\.


--
-- Data for Name: WebhookSortant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WebhookSortant" (id, "ecoleId", url, secret, events, actif, "dateCreation", "dernierEnvoi") FROM stdin;
cmtmgqo0w00gzuh88ziw6oqlr	cmtmgo6sx0004uh88s2x44zis	https://sirh-region.sn/webhooks/eleves	whsec_demo	["eleve.inscription","eleve.sortie"]	t	2026-09-04 04:37:51.775	\N
\.


--
-- Data for Name: WidgetDashboard; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WidgetDashboard" (id, "utilisateurId", titre, type, source, configuration, "position", taille, actif, "dateCreation") FROM stdin;
cmtmgqvvv00i3uh88ghx7zm3w	cmtmgo9vh000tuh885aak9o8v	Effectifs par classe	chart	sql	{"chartType":"bar","dataset":"eleves_by_classe"}	0	md	t	2026-09-04 04:38:01.963
\.


--
-- Data for Name: _EcoleToPermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."_EcoleToPermission" ("A", "B") FROM stdin;
cmtmgo6sx0004uh88s2x44zis	cmtmgqyhu00iduh884sjl688p
cmtmgo6sx0004uh88s2x44zis	cmtmgr04400ieuh888itm7ex4
cmtmgo6sx0004uh88s2x44zis	cmtmgr13300ifuh881l28z3po
cmtmgo6sx0004uh88s2x44zis	cmtmgr21v00iguh882lrl4p79
cmtmgo6sx0004uh88s2x44zis	cmtmgr30p00ihuh888yjuzw2j
cmtmgo6sx0004uh88s2x44zis	cmtmgr3zh00iiuh88qbu5mn69
cmtmgo6sx0004uh88s2x44zis	cmtmgr4ya00ijuh881glzln02
cmtmgo6sx0004uh88s2x44zis	cmtmgr5x600ikuh88l3sucbef
cmtmgo6sx0004uh88s2x44zis	cmtmgr71700iluh88kvu1x8km
cmtmgo6sx0004uh88s2x44zis	cmtmgr80200imuh88h1tv374k
cmtmgo6sx0004uh88s2x44zis	cmtmgr94t00inuh88xfquscrq
cmtmgo6sx0004uh88s2x44zis	cmtmgra3k00iouh88a9i9qzvs
cmtmgo6sx0004uh88s2x44zis	cmtmgrb2c00ipuh88wyfl8z8s
cmtmgo6sx0004uh88s2x44zis	cmtmgrc1400iquh88i6xsbura
cmtmgo6sx0004uh88s2x44zis	cmtmgrczw00iruh88wm7hvj4n
cmtmgo6sx0004uh88s2x44zis	cmtmgrdys00isuh88gf0ogv5h
cmtmgo6sx0004uh88s2x44zis	cmtmgrexm00ituh883jjleejf
cmtmgo6sx0004uh88s2x44zis	cmtmgrfwf00iuuh88en818o32
cmtmgo6sx0004uh88s2x44zis	cmtmgrgvk00ivuh88y5ods94j
\.


--
-- Name: ApiTokenLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ApiTokenLog_id_seq"', 2, true);


--
-- Name: AuditLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AuditLog_id_seq"', 88, true);


--
-- Name: TentativeConnexion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TentativeConnexion_id_seq"', 38, true);


--
-- Name: TicketStatutHistorique_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TicketStatutHistorique_id_seq"', 2, true);


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

\unrestrict lMGKsByUWzG8C5Vcy8BiDTCDiu3J010be3clbGHYWisPu1lns2HRO8i3tCZm5nP

