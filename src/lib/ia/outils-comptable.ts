// ====================================================================
// OUTILS IA — COMPTABLE COMPLET (les 15 actions manquantes)
// Couvre : écritures brouillon/auto, fournisseurs, commandes, budgets,
// stock, plan comptable, clôture mensuelle, provisions, TVA, relevé.
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

export const outilsComptableFull: OutilIA[] = [
  // ═══ ÉCRITURES ═══
  {
    nom: 'generer_ecritures_automatiques',
    description: "Rattrape TOUTES les écritures manquantes (encaissements non comptabilisés + dépenses validées sans écriture) pour une période. À faire avant la clôture.",
    permission: 'finances.valider',
    parametres: P({ periode: { type: 'string', description: 'Période AAAA-MM (défaut: mois courant)' } }),
    executer: async (ctx, args) => {
      const { genererEcrituresAutomatiquesCore } = await import('@/lib/business/paie');
      return genererEcrituresAutomatiquesCore(ctx as never, ctx.ecoleId!);
    },
  },
  {
    nom: 'creer_ecriture_brouillon',
    description: "Saisit une écriture comptable en BAUILLON (débit = crédit obligatoire). Elle sera validée séparément (valider_ecriture).",
    permission: 'finances.ecrire',
    parametres: P({
      journal: { type: 'string', description: 'Code journal (VE/ACH/BQ/OD/PA)', enum: ['VE', 'ACH', 'BQ', 'OD', 'PA'] },
      libelle: { type: 'string', description: 'Libellé de l\\u2019écriture' },
      compteDebit: { type: 'string', description: 'Numéro du compte à débiter (ex: 601)' },
      compteCredit: { type: 'string', description: 'Numéro du compte à créditer (ex: 521)' },
      montant: { type: 'number', description: 'Montant en FCFA' },
    }, ['journal', 'libelle', 'compteDebit', 'compteCredit', 'montant']),
    executer: async (ctx, args) => {
      const cd = await db.compteComptable.findFirst({ where: { ecoleId: ctx.ecoleId!, numero: String(args.compteDebit) } });
      const cc = await db.compteComptable.findFirst({ where: { ecoleId: ctx.ecoleId!, numero: String(args.compteCredit) } });
      if (!cd) return { erreur: `Compte débit ${args.compteDebit} introuvable.` };
      if (!cc) return { erreur: `Compte crédit ${args.compteCredit} introuvable.` };
      const j = await db.journalComptable.findFirst({ where: { ecoleId: ctx.ecoleId!, code: String(args.journal) } });
      if (!j) return { erreur: `Journal ${args.journal} introuvable.` };
      const montant = Math.round(Number(args.montant) * 100);
      const e = await db.ecritureComptable.create({
        data: {
          ecoleId: ctx.ecoleId!, journalId: j.id, date: new Date(),
          libelle: String(args.libelle), statut: 'brouillon',
          lignes: { create: [
            { compteId: cd.id, libelle: cd.libelle ?? '', debit: montant, credit: 0 },
            { compteId: cc.id, libelle: cc.libelle ?? '', debit: 0, credit: montant },
          ] },
        },
        include: { lignes: true },
      });
      return { ecritureId: e.id, statut: 'brouillon', montant };
    },
  },
  {
    nom: 'valider_ecriture',
    description: "Valide une écriture brouillon (les soldes des comptes sont mis à jour). Identifie l'écriture par son libellé ou sa date.",
    permission: 'finances.valider',
    parametres: P({ libelle: { type: 'string', description: 'Libellé de l\\u2019écriture (ou début)' } }, ['libelle']),
    executer: async (ctx, args) => {
      const norm = (s: string) => s.normalize('NFD').replace(/[u0300-u036f]/g, '').toLowerCase();
      const brouillons = await db.ecritureComptable.findMany({
        where: { ecoleId: ctx.ecoleId!, statut: 'brouillon' }, orderBy: { date: 'desc' }, take: 50, include: { lignes: true },
      });
      const q = norm(String(args.libelle));
      const ev = brouillons.find((e) => norm(e.libelle).includes(q)) ?? null;
      if (!ev) return { erreur: `Écriture brouillon « ${args.libelle} » introuvable. Brouillons : ${brouillons.slice(0, 5).map((b) => b.libelle).join(' ; ') || 'aucun'}` };
      const { validerEcritureCore } = await import('@/lib/business/paie');
      await validerEcritureCore(ctx as never, ev.id);
      return { ecritureId: ev.id, statut: 'valide', libelle: ev.libelle };
    },
  },

  // ═══ FOURNISSEURS & ACHATS ═══
  {
    nom: 'creer_fournisseur',
    description: "Crée un nouveau fournisseur (nom, type, contact, RIB...).",
    permission: 'finances.ecrire',
    parametres: P({
      nom: { type: 'string', description: 'Nom / raison sociale' },
      type: { type: 'string', enum: ['fournisseur_prestataire', 'sous_traitant'] },
      contact: { type: 'string', description: 'Personne de contact (optionnel)' },
      telephone: { type: 'string', description: 'Téléphone (optionnel)' },
      rib: { type: 'string', description: 'RIB (optionnel)' },
    }, ['nom']),
    executer: async (ctx, args) => {
      const { creerFournisseurCore } = await import('@/lib/business/comptabilite');
      return creerFournisseurCore(ctx as never, {
        nom: String(args.nom), type: args.type ? String(args.type) : undefined,
        contact: args.contact ? String(args.contact) : undefined,
        telephone: args.telephone ? String(args.telephone) : undefined,
        rib: args.rib ? String(args.rib) : undefined,
      });
    },
  },
  {
    nom: 'creer_commande',
    description: "Passe une commande fournisseur (produit, quantité, prix unitaire FCFA). Le stock sera mis à jour à la réception.",
    permission: 'finances.ecrire',
    parametres: P({
      fournisseur: { type: 'string', description: 'Nom du fournisseur' },
      produit: { type: 'string', description: 'Produit commandé' },
      quantite: { type: 'number', description: 'Quantité' },
      prixUnitaire: { type: 'number', description: 'Prix unitaire en FCFA' },
    }, ['fournisseur', 'produit', 'quantite', 'prixUnitaire']),
    executer: async (ctx, args) => {
      const { creerCommandeCore } = await import('@/lib/business/comptabilite');
      return creerCommandeCore(ctx as never, {
        fournisseurNom: String(args.fournisseur),
        lignes: [{ produit: String(args.produit), quantite: Number(args.quantite), prixUnitaire: Number(args.prixUnitaire) }],
      } as never);
    },
  },

  // ═══ PLAN COMPTABLE ═══
  {
    nom: 'initialiser_plan',
    description: "Initialise le plan comptable SYSCOHADA (25 comptes + journaux VE/ACH/CA/BQ/OD). Ne fonctionne qu'une fois.",
    permission: 'finances.valider',
    parametres: P({}),
    executer: async (ctx) => {
      const { initialiserPlanComptableCore } = await import('@/lib/business/comptabilite');
      return initialiserPlanComptableCore(ctx as never);
    },
  },
  {
    nom: 'completer_plan',
    description: "Ajoute les comptes d'immobilisations (241), amortissements (281), dotations (681), reports (110) + journal Paie.",
    permission: 'finances.valider',
    parametres: P({}),
    executer: async (ctx) => {
      const { completerPlanComptableCore } = await import('@/lib/business/compta-plus');
      return completerPlanComptableCore(ctx as never);
    },
  },

  // ═══ STOCK ═══
  {
    nom: 'creer_article_stock',
    description: "Crée un article de stock (nom, catégorie, quantité initiale, prix unitaire, seuil d'alerte).",
    permission: 'finances.ecrire',
    parametres: P({
      nom: { type: 'string', description: 'Nom de l\\u2019article' },
      categorie: { type: 'string', description: 'Catégorie (fournitures, denrées...)' },
      quantite: { type: 'number', description: 'Quantité initiale' },
      prixUnitaire: { type: 'number', description: 'Prix unitaire en FCFA' },
      seuilAlerte: { type: 'number', description: 'Seuil d\\u2019alerte (optionnel)' },
      unite: { type: 'string', description: 'Unité (ex: unité, kg, litre)' },
    }, ['nom']),
    executer: async (ctx, args) => {
      const { creerArticleStockCore } = await import('@/lib/business/finances');
      return creerArticleStockCore(ctx as never, ctx.ecoleId!, {
        nom: String(args.nom), categorie: args.categorie ? String(args.categorie) : undefined,
        quantiteInitiale: Number(args.quantite ?? 0),
        prixUnitaire: args.prixUnitaire ? Math.round(Number(args.prixUnitaire) * 100) : undefined,
        seuilAlerte: args.seuilAlerte ? Number(args.seuilAlerte) : undefined,
        unite: args.unite ? String(args.unite) : undefined,
      } as never);
    },
  },
  {
    nom: 'mouvement_stock',
    description: "Enregistre un mouvement de stock (entrée ou sortie). La sortie est refusée si le stock est insuffisant.",
    permission: 'finances.ecrire',
    parametres: P({
      article: { type: 'string', description: 'Nom de l\\u2019article' },
      type: { type: 'string', enum: ['entree', 'sortie'] },
      quantite: { type: 'number', description: 'Quantité' },
      motif: { type: 'string', description: 'Motif (optionnel)' },
    }, ['article', 'type', 'quantite']),
    executer: async (ctx, args) => {
      const article = await db.stockArticle.findFirst({ where: { ecoleId: ctx.ecoleId!, nom: { contains: String(args.article), mode: 'insensitive' } } });
      if (!article) return { erreur: `Article « ${args.article} » introuvable.` };
      const { enregistrerMouvementStockCore } = await import('@/lib/business/finances');
      return enregistrerMouvementStockCore(ctx as never, {
        articleId: article.id, type: String(args.type) as 'entree' | 'sortie',
        quantite: Number(args.quantite), motif: args.motif ? String(args.motif) : undefined,
      });
    },
  },

  // ═══ BUDGET & CLÔTURE ═══
  {
    nom: 'creer_budget',
    description: "Crée un budget prévisionnel avec lignes (catégorie, sous-catégorie, montant prévu en FCFA).",
    permission: 'finances.valider',
    parametres: P({
      libelle: { type: 'string', description: 'Libellé du budget' },
      lignes: { type: 'string', description: 'Lignes « catégorie:sous-catégorie:montant » séparées par ; (ex: recettes:scolarité:5000000;depenses:fournitures:300000)' },
    }, ['libelle', 'lignes']),
    executer: async (ctx, args) => {
      const parsed = String(args.lignes).split(';').map((l) => l.trim()).filter(Boolean).map((l) => {
        const [categorie, sousCategorie, montant] = l.split(':').map((x) => x.trim());
        return { categorie: categorie ?? 'recettes', sousCategorie: sousCategorie ?? '—', montantPrevu: Math.round(Number(montant ?? 0) * 100) };
      }).filter((l) => l.montantPrevu > 0);
      if (parsed.length === 0) return { erreur: 'Format invalide. Ex: recettes:scolarité:5000000;depenses:fournitures:300000' };
      const { creerBudgetCore } = await import('@/lib/business/compta-plus');
      return creerBudgetCore(ctx as never, { libelle: String(args.libelle), lignes: parsed } as never);
    },
  },
  {
    nom: 'cloture_mensuelle',
    description: "Revue mensuelle : rattrape les écritures automatiques du mois + calcule la balance. Sans verrouillage.",
    permission: 'finances.valider',
    parametres: P({ periode: { type: 'string', description: 'Période AAAA-MM (défaut: mois courant)' } }),
    executer: async (ctx, args) => {
      const { clotureMensuelleCore } = await import('@/lib/business/compta-plus');
      return clotureMensuelleCore(ctx as never, args.periode ? String(args.periode) : undefined);
    },
  },
  {
    nom: 'provisionner_creances',
    description: "Passe les provisions pour créances douteuses (échéances échues +90 jours) : D 659 / C 431. Idempotent par année.",
    permission: 'finances.valider',
    parametres: P({}),
    executer: async (ctx) => {
      const { provisionnerCreancesDouteusesCore } = await import('@/lib/business/compta-plus');
      return provisionnerCreancesDouteusesCore(ctx as never);
    },
  },
  {
    nom: 'etat_tva',
    description: "Calcule l'état TVA du mois : TVA collectée (443), TVA déductible (445), net à payer.",
    permission: 'finances.voir',
    parametres: P({ periode: { type: 'string', description: 'Période AAAA-MM (défaut: mois courant)' } }),
    executer: async (ctx, args) => {
      const { etatTvaCore } = await import('@/lib/business/compta-plus');
      return etatTvaCore(ctx as never, args.periode ? String(args.periode) : undefined);
    },
  },

  // ═══ RELEVÉ BANCAIRE ═══
  {
    nom: 'importer_releve',
    description: "Importe un relevé bancaire CSV (format: date;montant;libelle — une ligne par opération).",
    permission: 'finances.ecrire',
    parametres: P({ contenu: { type: 'string', description: 'Contenu du relevé CSV' } }, ['contenu']),
    executer: async (ctx, args) => {
      const { importerReleveCsvCore } = await import('@/lib/business/completions');
      return importerReleveCsvCore(ctx as never, ctx.ecoleId!, String(args.contenu));
    },
  },
  {
    nom: 'rapprochement_auto',
    description: "Rapproche automatiquement les lignes du relevé bancaire avec les paiements (montant identique à ±3 jours).",
    permission: 'finances.ecrire',
    parametres: P({}),
    executer: async (ctx) => {
      const { rapprocherAutoCore } = await import('@/lib/business/completions');
      return rapprocherAutoCore(ctx as never, ctx.ecoleId!);
    },
  },
];
