// ====================================================================
// OUTILS IA — FINANCES RÉSIDUELLES, COMMUNICATION, ADMINISTRATION
// Remboursements, écritures multi-lignes, cycle achats (envoi/réception),
// exports & analytiques direction, notifications masse, annonces,
// messagerie, tickets, SaaS éditeur, établissement, RGPD, comptes,
// imports CSV, RDV/réinscriptions/calendrier, documents, infrastructures.
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';
import { resoudreEleve, resoudreClasse, normaliser } from './resolution';
import * as biz from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

export const outilsIaCommAdmin: OutilIA[] = [
  // ═══ FINANCES RÉSIDUELLES ═══
  {
    nom: 'rembourser_paiement_ia',
    description: "Annule un paiement AVEC émission d'un avoir de remboursement (pièce AV-…). Identifie le paiement par sa référence.",
    permission: 'finances.ecrire',
    parametres: P({
      reference: { type: 'string', description: 'Référence transaction du paiement' },
      motif: { type: 'string', description: 'Motif de l\'annulation/remboursement' },
    }, ['reference', 'motif']),
    executer: async (ctx, args) => {
      const paiement = await db.paiement.findUnique({ where: { referenceTransaction: String(args.reference) } });
      if (!paiement) return { erreur: `Paiement « ${args.reference} » introuvable.` };
      return biz.annulerPaiementCore(ctx as never, paiement.id, String(args.motif), true);
    },
  },
  {
    nom: 'creer_ecriture_multiligne',
    description: "Saisit une écriture comptable multi-lignes au BROUILLON. Lignes : « numeroCompte:debit:credit » (montants FCFA, 0 pour le côté vide), séparées par ; — débit total = crédit total obligatoire.",
    permission: 'finances.ecrire',
    parametres: P({
      journal: { type: 'string', description: 'Code journal (VE/ACH/CA/BQ/OD/PA)' },
      libelle: { type: 'string' },
      date: { type: 'string', description: 'AAAA-MM-JJ' },
      lignes: { type: 'string', description: 'Ex : « 601:50000:0; 445:10000:0; 401:0:60000 »' },
    }, ['journal', 'libelle', 'date', 'lignes']),
    executer: async (ctx, args) => {
      const journal = await db.journalComptable.findFirst({ where: { ecoleId: ctx.ecoleId!, code: String(args.journal).toUpperCase() } });
      if (!journal) return { erreur: `Journal ${args.journal} introuvable (initialisez le plan).` };
      const lignesInput: Array<{ compteId: string; libelle: string; debit: number; credit: number }> = [];
      for (const l of String(args.lignes).split(';').map((s) => s.trim()).filter(Boolean)) {
        const [numero, d, c] = l.split(':').map((x) => x.trim());
        const compte = await db.compteComptable.findFirst({ where: { ecoleId: ctx.ecoleId!, numero } });
        if (!compte) return { erreur: `Compte ${numero} introuvable.` };
        lignesInput.push({
          compteId: compte.id, libelle: String(args.libelle).slice(0, 60),
          debit: Math.round(Number(d ?? 0) * 100), credit: Math.round(Number(c ?? 0) * 100),
        });
      }
      if (lignesInput.length < 2) return { erreur: 'Au moins deux lignes requises.' };
      return biz.creerEcritureCore(ctx as never, ctx.ecoleId!, {
        journalId: journal.id, libelle: String(args.libelle), date: new Date(String(args.date)), lignes: lignesInput,
      } as never);
    },
  },
  {
    nom: 'envoyer_commande_fournisseur',
    description: "Marque une commande fournisseur comme envoyée (brouillon → envoyée).",
    permission: 'finances.ecrire',
    parametres: P({ commandeId: { type: 'string', description: 'ID de la commande (via lister via lecture comptable)' } }, ['commandeId']),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/comptabilite');
      return actions.envoyerCommande(String(args.commandeId));
    },
  },
  {
    nom: 'receptionner_commande_fournisseur',
    description: "Enregistre la réception d'une commande (bons de livraison, entrée en stock). Lignes : « ligneId:quantité » séparées par ; (quantités restantes par défaut).",
    permission: 'finances.ecrire',
    parametres: P({
      commandeId: { type: 'string' },
      lignes: { type: 'string', description: 'Ex : « abc123:10; def456:5 » (optionnel = tout le restant)' },
      controleQualite: { type: 'string', enum: ['conforme', 'reserve', 'refuse'] },
    }, ['commandeId']),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/comptabilite');
      const fd = new FormData();
      fd.set('commandeId', String(args.commandeId));
      fd.set('lignes', String(args.lignes ?? ''));
      if (args.controleQualite) fd.set('controleQualite', String(args.controleQualite));
      return actions.receptionnerCommande(fd);
    },
  },
  {
    nom: 'export_comptable_ia',
    description: "Génère l'export comptable CSV des écritures VALIDÉES (pour l'expert-comptable).",
    permission: 'finances.voir',
    parametres: P({}),
    executer: async (ctx) => {
      const { exportComptableCsvCore } = await import('@/lib/business');
      return exportComptableCsvCore(ctx as never, ctx.ecoleId!);
    },
  },
  {
    nom: 'analytique_finances',
    description: "Analytique financière consolidée : recettes par type, recouvrement par classe, vieillissement des impayés, projection de trésorerie.",
    permission: ['finances.voir', 'admin.saas'],
    parametres: P({}),
    executer: async (ctx) => biz.analyticsFinancieresCore(ctx as never, ctx.ecoleId!),
  },
  {
    nom: 'analytique_pedagogie',
    description: "Analytique pédagogique : moyennes par matière, classe et enseignant (difficultés en premier).",
    permission: ['bulletins.valider', 'admin.saas'],
    parametres: P({ periode: { type: 'string', description: 'Période (optionnel)' } }),
    executer: async (ctx, args) => {
      let periodeId: string | undefined;
      if (args.periode) {
        const p = await db.periode.findFirst({ where: { anneeScolaire: { ecoleId: ctx.ecoleId!, active: true }, libelle: { contains: String(args.periode), mode: 'insensitive' } } });
        periodeId = p?.id;
      }
      return biz.analyticsPedagogiquesCore(ctx as never, ctx.ecoleId!, periodeId);
    },
  },
  {
    nom: 'rapport_trimestre_ia',
    description: "Génère le rapport de trimestre consolidé (effectifs, résultats, finances, vie scolaire) pour une période.",
    permission: ['admin.saas', 'bulletins.valider'],
    parametres: P({ periode: { type: 'string', description: 'Période (ex: Trimestre 1)' } }, ['periode']),
    executer: async (ctx, args) => {
      const p = await db.periode.findFirst({ where: { anneeScolaire: { ecoleId: ctx.ecoleId!, active: true }, libelle: { contains: String(args.periode), mode: 'insensitive' } } });
      if (!p) return { erreur: `Période « ${args.periode} » introuvable.` };
      return biz.genererRapportTrimestreCore(ctx as never, ctx.ecoleId!, p.id);
    },
  },
  {
    nom: 'synthese_annuelle_ia',
    description: "Synthèse annuelle d'un élève (toutes périodes, toutes matières).",
    permission: ['eleves.lire', 'bulletins.valider'],
    parametres: P({ eleve: { type: 'string' } }, ['eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.syntheseAnnuelleCore(ctx as never, re.entite.id);
    },
  },

  // ═══ COMMUNICATION ═══
  {
    nom: 'notifier_masse',
    description: "Envoie une notification in-app en MASSE : tout le personnel, tous les parents, une classe ou un niveau (par nom).",
    permission: 'communication.envoyer',
    parametres: P({
      cible: { type: 'string', enum: ['tous_personnel', 'tous_parents', 'classe', 'niveau'] },
      classeOuNiveau: { type: 'string', description: 'Nom de la classe ou du niveau (si cible=classe/niveau)' },
      sujet: { type: 'string' }, corps: { type: 'string' },
    }, ['cible', 'sujet', 'corps']),
    executer: async (ctx, args) => {
      let cible = String(args.cible);
      if (cible === 'classe' || cible === 'niveau') {
        if (!args.classeOuNiveau) return { erreur: 'Précisez la classe ou le niveau.' };
        const qN = normaliser(String(args.classeOuNiveau));
        if (cible === 'classe') {
          const rc = await resoudreClasse(ctx.ecoleId!, String(args.classeOuNiveau));
          if (!rc.trouve) return { erreur: rc.erreur, candidats: rc.candidats };
          cible = `classe:${rc.entite.id}`;
        } else {
          const n = await db.niveau.findFirst({
            where: { section: { cycle: { ecoleId: ctx.ecoleId! } }, OR: [{ code: String(args.classeOuNiveau).toUpperCase() }, { libelle: { contains: String(args.classeOuNiveau), mode: 'insensitive' } }] },
          });
          if (!n) return { erreur: `Niveau « ${args.classeOuNiveau} » introuvable.` };
          cible = `niveau:${n.id}`;
        }
        void qN;
      }
      return biz.envoyerNotificationMasseCore(ctx as never, ctx.ecoleId!, {
        cible, sujet: String(args.sujet), corps: String(args.corps),
      } as never);
    },
  },
  {
    nom: 'creer_annonce_ia',
    description: "Rédige une annonce (brouillon ou publiée) ciblée : école, cycle, niveau, classe, personnel ou parents.",
    permission: 'communication.envoyer',
    parametres: P({
      titre: { type: 'string' }, contenu: { type: 'string' },
      cible: { type: 'string', enum: ['toute_ecole', 'cycle', 'niveau', 'classe', 'personnel', 'parents'] },
      publier: { type: 'boolean', description: 'Publier immédiatement (défaut : brouillon)' },
      pinned: { type: 'boolean', description: 'Épingler (optionnel)' },
    }, ['titre', 'contenu', 'cible']),
    executer: async (ctx, args) =>
      biz.creerAnnonceCore(ctx as never, {
        titre: String(args.titre), contenu: String(args.contenu), cible: String(args.cible),
        ...(args.publier !== undefined ? { publier: args.publier === true } : {}),
        ...(args.pinned !== undefined ? { pinned: args.pinned === true } : {}),
      } as never),
  },
  {
    nom: 'publier_annonce_ia',
    description: "Publie une annonce rédigée (par son titre).",
    permission: 'communication.envoyer',
    parametres: P({ titre: { type: 'string' } }, ['titre']),
    executer: async (ctx, args) => {
      const annonce = await db.annonce.findFirst({ where: { ecoleId: ctx.ecoleId!, titre: { contains: String(args.titre), mode: 'insensitive' } } });
      if (!annonce) return { erreur: `Annonce « ${args.titre} » introuvable.` };
      return biz.publierAnnonceCore(ctx as never, annonce.id);
    },
  },
  {
    nom: 'creer_modele_message_ia',
    description: "Crée un modèle de message réutilisable (code, sujet, corps).",
    permission: 'communication.envoyer',
    parametres: P({ code: { type: 'string' }, sujet: { type: 'string' }, corps: { type: 'string' } }, ['code', 'sujet', 'corps']),
    executer: async (ctx, args) =>
      biz.creerModeleMessageCore(ctx as never, ctx.ecoleId!, {
        code: String(args.code), sujet: String(args.sujet), corps: String(args.corps),
      } as never),
  },
  {
    nom: 'envoyer_message_ia',
    description: "Envoie un message dans une conversation existante (par titre).",
    permission: 'communication.envoyer',
    parametres: P({ conversation: { type: 'string', description: 'Titre de la conversation' }, contenu: { type: 'string' } }, ['conversation', 'contenu']),
    executer: async (ctx, args) => {
      const conv = await db.conversation.findFirst({ where: { ecoleId: ctx.ecoleId!, titre: { contains: String(args.conversation), mode: 'insensitive' } } });
      if (!conv) return { erreur: `Conversation « ${args.conversation} » introuvable.` };
      return biz.envoyerMessageCore(ctx as never, conv.id, String(args.contenu));
    },
  },
  {
    nom: 'creer_ticket_ia',
    description: "Ouvre un ticket au support (fonctionnel, technique, facturation, demande).",
    permission: 'communication.envoyer',
    parametres: P({
      sujet: { type: 'string' }, description: { type: 'string' },
      categorie: { type: 'string', enum: ['fonctionnel', 'technique', 'facturation', 'demande'] },
      priorite: { type: 'string', enum: ['basse', 'normale', 'haute', 'critique'] },
    }, ['sujet', 'description', 'categorie', 'priorite']),
    executer: async (ctx, args) =>
      biz.creerTicketCore(ctx as never, {
        sujet: String(args.sujet), description: String(args.description),
        categorie: String(args.categorie), priorite: String(args.priorite),
      } as never),
  },
  {
    nom: 'repondre_ticket_ia',
    description: "Répond à un ticket (par son sujet).",
    permission: 'communication.envoyer',
    parametres: P({ sujet: { type: 'string' }, message: { type: 'string' } }, ['sujet', 'message']),
    executer: async (ctx, args) => {
      const ticket = await db.ticket.findFirst({ where: { ecoleId: ctx.ecoleId!, sujet: { contains: String(args.sujet), mode: 'insensitive' } } });
      if (!ticket) return { erreur: `Ticket « ${args.sujet} » introuvable.` };
      return biz.repondreTicketCore(ctx as never, ticket.id, String(args.message));
    },
  },

  // ═══ SAAS ÉDITEUR ═══
  {
    nom: 'creer_ecole_client_ia',
    description: "Crée une école cliente AVEC onboarding complet (année, 15 niveaux/classes, 9 rôles, compte direction). Super-admin uniquement.",
    permission: 'admin.saas',
    parametres: P({
      nom: { type: 'string' }, slug: { type: 'string', description: 'Slug (3+ caractères alphanumériques)' },
      pays: { type: 'string', description: 'Code ISO (défaut SN)' }, devise: { type: 'string', description: 'XOF, EUR, USD, MAD, XAF' },
      emailDirection: { type: 'string', description: 'Email du compte direction (optionnel)' },
      motDePasseDirection: { type: 'string', description: 'Mot de passe initial ≥ 8 (sinon généré et retourné)' },
    }, ['nom', 'slug']),
    executer: async (ctx, args) => {
      const r = await biz.creerEcoleClientCore(ctx as never, {
        nom: String(args.nom), slug: String(args.slug),
        ...(args.pays ? { pays: String(args.pays) } : {}),
        ...(args.devise ? { devise: String(args.devise) } : {}),
        ...(args.emailDirection ? { emailDirection: String(args.emailDirection) } : {}),
        ...(args.motDePasseDirection ? { motDePasseDirection: String(args.motDePasseDirection) } : {}),
      } as never);
      return { ...r, note: r.motDePasseTemporaire ? `Mot de passe direction à communiquer : ${r.motDePasseTemporaire}` : 'Aucun compte direction créé (email absent).' };
    },
  },
  {
    nom: 'changer_statut_ecole_ia',
    description: "Change le statut d'une école cliente : essai, actif, suspendu (sessions révoquées) ou resilie.",
    permission: 'admin.saas',
    parametres: P({
      ecole: { type: 'string', description: 'Nom ou slug de l\'école' },
      statut: { type: 'string', enum: ['essai', 'actif', 'suspendu', 'resilie'] },
    }, ['ecole', 'statut']),
    executer: async (ctx, args) => {
      const ecole = await db.ecole.findFirst({
        where: { OR: [{ nom: { contains: String(args.ecole), mode: 'insensitive' } }, { slug: String(args.ecole).toLowerCase() }] },
      });
      if (!ecole) return { erreur: `École « ${args.ecole} » introuvable.` };
      return biz.changerStatutEcoleCore(ctx as never, ecole.id, String(args.statut));
    },
  },
  {
    nom: 'generer_factures_saas_ia',
    description: "Génère les factures SaaS du mois pour tous les abonnements actifs (idempotent).",
    permission: 'admin.saas',
    parametres: P({}),
    executer: async (ctx) => biz.genererFacturesSaasCore(ctx as never),
  },
  {
    nom: 'encaisser_facture_saas_ia',
    description: "Marque une facture éditeur comme payée (mode + référence).",
    permission: 'admin.saas',
    parametres: P({
      factureId: { type: 'string', description: 'ID de la facture SaaS' },
      modePaiement: { type: 'string', description: 'virement, cheque, mobile…' },
      reference: { type: 'string', description: 'N° de référence (optionnel)' },
    }, ['factureId']),
    executer: async (ctx, args) =>
      biz.marquerFactureSaasPayeeCore(ctx as never, String(args.factureId),
        args.modePaiement ? String(args.modePaiement) : undefined,
        args.reference ? String(args.reference) : undefined),
  },

  // ═══ ÉTABLISSEMENT & INTÉGRATIONS ═══
  {
    nom: 'maj_identite_etablissement',
    description: "Met à jour l'identité de l'établissement (nom, adresse, ville, téléphone, email, site web).",
    permission: 'admin.saas',
    parametres: P({
      nom: { type: 'string' }, adresse: { type: 'string' }, ville: { type: 'string' },
      telephone: { type: 'string' }, emailEcole: { type: 'string' }, siteWeb: { type: 'string' },
    }),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/etablissement');
      const fd = new FormData();
      for (const k of ['nom', 'adresse', 'ville', 'telephone', 'emailEcole', 'siteWeb']) {
        if (args[k] !== undefined) fd.set(k, String(args[k]));
      }
      return actions.majIdentiteEtablissement(fd);
    },
  },
  {
    nom: 'creer_webhook_ia',
    description: "Crée un webhook sortant (URL + événements).",
    permission: 'admin.saas',
    parametres: P({
      url: { type: 'string', description: 'URL https://…' },
      events: { type: 'string', description: 'Événements séparés par virgules (ex: paiement.encaissement, eleve.inscription)' },
    }, ['url', 'events']),
    executer: async (ctx, args) =>
      biz.creerWebhookCore(ctx as never, {
        url: String(args.url), events: String(args.events).split(',').map((s) => s.trim()).filter(Boolean),
      } as never),
  },
  {
    nom: 'creer_api_token_ia',
    description: "Crée un token d'API (nom, scopes, validité en jours). Le secret est affiché UNE fois.",
    permission: 'admin.saas',
    parametres: P({
      nom: { type: 'string' }, description: { type: 'string' },
      scopes: { type: 'string', description: 'Scopes séparés par virgules' },
      joursValidite: { type: 'number', description: 'Validité en jours (1-365)' },
    }, ['nom', 'scopes']),
    executer: async (ctx, args) =>
      biz.creerApiTokenCore(ctx as never, {
        nom: String(args.nom), scopes: String(args.scopes).split(',').map((s) => s.trim()).filter(Boolean),
        ...(args.description ? { description: String(args.description) } : {}),
        ...(args.joursValidite !== undefined ? { joursValidite: Number(args.joursValidite) } : {}),
      } as never),
  },
  {
    nom: 'maj_theme_ecole_ia',
    description: "Personnalise le thème de l'école (couleurs primaire/secondaire/accent/fond, nom produit).",
    permission: 'admin.saas',
    parametres: P({
      couleurPrimaire: { type: 'string', description: 'Hex (ex: #2563EB)' },
      couleurSecondaire: { type: 'string' }, couleurAccent: { type: 'string' }, couleurFond: { type: 'string' },
      nomProduit: { type: 'string' },
    }),
    executer: async (ctx, args) => {
      const d: Record<string, unknown> = {};
      for (const k of ['couleurPrimaire', 'couleurSecondaire', 'couleurAccent', 'couleurFond', 'nomProduit']) {
        if (args[k] !== undefined) d[k] = String(args[k]);
      }
      if (Object.keys(d).length === 0) return { erreur: 'Aucun champ fourni.' };
      return biz.majThemeEcoleCore(ctx as never, d as never);
    },
  },

  // ═══ RGPD & COMPTES ═══
  {
    nom: 'exporter_donnees_eleve_ia',
    description: "Export RGPD complet des données d'un élève (JSON téléchargeable, enregistré au registre).",
    permission: ['admin.saas', 'eleves.ecrire'],
    parametres: P({ eleve: { type: 'string' } }, ['eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const actions = await import('@/app/actions');
      return actions.exporterDonneesEleve(re.entite.id);
    },
  },
  {
    nom: 'traiter_demande_effacement_ia',
    description: "Traite une demande RGPD d'effacement (par son ID).",
    permission: 'admin.saas',
    parametres: P({ demandeId: { type: 'string' } }, ['demandeId']),
    executer: async (ctx, args) => biz.traiterDemandeEffacementCore(ctx as never, String(args.demandeId)),
  },
  {
    nom: 'creer_compte_eleve_ia',
    description: "Crée le compte portail d'un élève (email + mot de passe ≥ 8 — à communiquer).",
    permission: ['admin.saas', 'eleves.ecrire'],
    parametres: P({
      eleve: { type: 'string' }, email: { type: 'string' }, motDePasse: { type: 'string', description: '≥ 8 caractères' },
    }, ['eleve', 'email', 'motDePasse']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.creerCompteEleveCore(ctx as never, re.entite.id, String(args.email), String(args.motDePasse));
    },
  },
  {
    nom: 'traiter_demande_compte_ia',
    description: "Approuve ou refuse une demande de compte publique (avec rôle à donner si approuvée).",
    permission: 'admin.saas',
    parametres: P({
      demandeId: { type: 'string' },
      decision: { type: 'string', enum: ['approuve', 'refuse'] },
      motifRefus: { type: 'string' },
      roleADonner: { type: 'string', description: 'Rôle si approuvée (ex: enseignant)' },
    }, ['demandeId', 'decision']),
    executer: async (ctx, args) =>
      biz.traiterDemandeCompteCore(ctx as never, String(args.demandeId), args.decision as never,
        args.motifRefus ? String(args.motifRefus) : undefined,
        args.roleADonner ? String(args.roleADonner) : undefined),
  },
  {
    nom: 'reinitialiser_mdp_admin_ia',
    description: "Réinitialise le mot de passe d'un utilisateur (temporaire affiché une fois) — par email.",
    permission: 'admin.saas',
    parametres: P({ email: { type: 'string' } }, ['email']),
    executer: async (ctx, args) => {
      const u = await db.utilisateur.findFirst({ where: { email: String(args.email).toLowerCase(), deletedAt: null } });
      if (!u) return { erreur: `Compte « ${args.email} » introuvable.` };
      return biz.reinitialiserMotDePasseAdminCore(ctx as never, u.id);
    },
  },
  {
    nom: 'revoquer_session_ia',
    description: "Révoque une session active (par son ID — via la sécurité).",
    permission: 'admin.saas',
    parametres: P({ sessionId: { type: 'string' } }, ['sessionId']),
    executer: async (ctx, args) => biz.revoquerSessionCore(ctx as never, String(args.sessionId)),
  },

  // ═══ IMPORTS CSV ═══
  {
    nom: 'importer_eleves_csv_ia',
    description: "Importe des élèves en masse. CSV : nom;prenom;dateNaissance (AAAA-MM-JJ);sexe (M/F);classe — une ligne par élève.",
    permission: 'eleves.ecrire',
    parametres: P({ contenu: { type: 'string', description: 'Contenu CSV complet' } }, ['contenu']),
    executer: async (ctx, args) => {
      const { importerElevesCsvCore } = await import('@/lib/business');
      return importerElevesCsvCore(ctx as never, ctx.ecoleId!, String(args.contenu));
    },
  },
  {
    nom: 'importer_personnel_csv_ia',
    description: "Importe du personnel en masse. CSV : nom;prenom;email;telephone;dateEmbauche;typeContrat;salaireFCFA.",
    permission: 'rh.gerer',
    parametres: P({ contenu: { type: 'string', description: 'Contenu CSV complet' } }, ['contenu']),
    executer: async (ctx, args) => {
      const { importerPersonnelCsvCore } = await import('@/lib/business');
      return importerPersonnelCsvCore(ctx as never, ctx.ecoleId!, String(args.contenu));
    },
  },

  // ═══ RDV / RÉINSCRIPTIONS / CALENDRIER / DOCUMENTS ═══
  {
    nom: 'reserver_rdv_ia',
    description: "Réserve un créneau de RDV AU NOM d'un parent (back-office). Créneau par ID, parent par nom.",
    permission: 'communication.envoyer',
    parametres: P({
      creneauRdvId: { type: 'string' }, parent: { type: 'string', description: 'Nom du parent' },
      eleve: { type: 'string', description: 'Enfant concerné (optionnel)' }, motif: { type: 'string' },
    }, ['creneauRdvId', 'parent']),
    executer: async (ctx, args) => {
      const { normaliser } = await import('./resolution');
      const qN = normaliser(String(args.parent));
      const parent = await db.parentTuteur.findFirst({ where: { ecoleId: ctx.ecoleId! }, });
      const tous = await db.parentTuteur.findMany({ where: { ecoleId: ctx.ecoleId! } });
      const cible = tous.find((p) => normaliser(`${p.prenom ?? ''} ${p.nom ?? ''}`).includes(qN) || normaliser(`${p.nom ?? ''}`).includes(qN));
      if (!cible && !parent) return { erreur: `Parent « ${args.parent} » introuvable.` };
      let eleveId: string | undefined;
      if (args.eleve) {
        const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
        if (!re.trouve) return { erreur: 'Élève : ' + re.erreur };
        eleveId = re.entite.id;
      }
      return biz.reserverRdvCore(ctx as never, {
        creneauRdvId: String(args.creneauRdvId), parentId: (cible ?? parent)!.id,
        ...(eleveId ? { eleveId } : {}), ...(args.motif ? { motif: String(args.motif) } : {}),
      } as never);
    },
  },
  {
    nom: 'annuler_rdv_ia',
    description: "Annule un rendez-vous (le créneau est libéré, l'enseignant notifié).",
    permission: 'communication.envoyer',
    parametres: P({ rdvId: { type: 'string' } }, ['rdvId']),
    executer: async (ctx, args) => biz.annulerRdvCore(ctx as never, String(args.rdvId)),
  },
  {
    nom: 'enregistrer_reinscription_ia',
    description: "Enregistre la réinscription d'un élève pour l'année suivante (classe voulue optionnelle — honorée à la clôture).",
    permission: 'eleves.ecrire',
    parametres: P({
      eleve: { type: 'string' }, classeVoulue: { type: 'string', description: 'Classe souhaitée (optionnel)' },
      fraisPayes: { type: 'boolean', description: 'Frais de réinscription réglés' },
    }, ['eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      let classeVoulueId: string | undefined;
      if (args.classeVoulue) {
        const rc = await resoudreClasse(ctx.ecoleId!, String(args.classeVoulue));
        if (!rc.trouve) return { erreur: 'Classe : ' + rc.erreur, candidats: rc.candidats };
        classeVoulueId = rc.entite.id;
      }
      const { enregistrerReinscriptionCore } = await import('@/lib/business');
      return enregistrerReinscriptionCore(ctx as never, {
        eleveId: re.entite.id,
        ...(classeVoulueId ? { classeVoulueId } : {}),
        ...(args.fraisPayes !== undefined ? { fraisPayes: args.fraisPayes === true } : {}),
      });
    },
  },
  {
    nom: 'ajouter_calendrier_ia',
    description: "Ajoute un événement au calendrier scolaire (vacances, jour férié, examen…).",
    permission: ['salles.gerer', 'admin.saas'],
    parametres: P({
      type: { type: 'string', description: 'vacances, ferie, examen, evenement' },
      libelle: { type: 'string' }, dateDebut: { type: 'string', description: 'AAAA-MM-JJ' }, dateFin: { type: 'string', description: 'AAAA-MM-JJ' },
    }, ['type', 'libelle', 'dateDebut', 'dateFin']),
    executer: async (ctx, args) =>
      biz.ajouterCalendrierCore(ctx as never, ctx.ecoleId!, {
        type: String(args.type), libelle: String(args.libelle),
        dateDebut: new Date(String(args.dateDebut)), dateFin: new Date(String(args.dateFin)),
      } as never),
  },
  {
    nom: 'lister_catalogue_documents_ia',
    description: "Liste les modèles de documents générables (certificats, attestations, PV, reçus…) avec leurs codes.",
    permission: 'eleves.lire',
    parametres: P({}),
    executer: async () => {
      const actions = await import('@/app/actions/etablissement');
      return actions.listerCatalogueDocuments();
    },
  },
  {
    nom: 'generer_attestation_ia',
    description: "Génère une attestation officielle pour un élève (certificat_scolarite ou attestation_inscription).",
    permission: 'eleves.ecrire',
    parametres: P({
      eleve: { type: 'string' },
      type: { type: 'string', enum: ['certificat_scolarite', 'attestation_inscription'] },
    }, ['eleve', 'type']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const actions = await import('@/app/actions/completions');
      return actions.genererAttestation(re.entite.id, args.type as never);
    },
  },
];
