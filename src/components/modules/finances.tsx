'use client';

// ====================================================================
// Module Finances & Comptabilité
// - Frais, échéances, encaissements (multi-mode)
// - Dépenses (avec workflow validation)
// - Stocks (articles + mouvements)
// F16 : montants en CENTIMES en base → affichage via formatXOF.
// F19 : annulations tracées (paiement, échéance, dépense) + remise.
// ====================================================================

import { useState } from 'react';
import { Wallet, TrendingDown, TrendingUp, Coins, Printer, BookOpen, Landmark, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as actions from '@/app/actions';
import * as actionsExt from '@/app/actions/extensions';
import { formatXOF, formatDate, formatDateTime } from '@/lib/format';

export default function FinancesModule({ initialData }: { initialData: any }) {
  const eleves = initialData.eleves ?? [];
  const frais = initialData.frais ?? [];
  const echeances = initialData.echeances ?? [];
  const paiements = initialData.paiements ?? [];
  const depenses = initialData.depenses ?? [];
  const articles = initialData.articlesStock ?? [];
  const mouvements = initialData.mouvementsStock ?? [];
  const classes = initialData.classes ?? [];
  const niveaux = initialData.niveaux ?? [];
  const ecritures = initialData.ecrituresComptable ?? [];
  const devise = initialData.ecole?.devise ?? 'XOF';
  const { run, Message, pending } = useActionFeedback();

  // B2 — COMPTABILITÉ : le plan comptable n'est pas chargé dans initialData,
  // on dérive comptes et journaux des écritures existantes (dédupliqués).
  const comptesComptables: any[] = Object.values(
    ecritures.flatMap((e: any) => e.lignes ?? []).reduce((acc: Record<string, any>, l: any) => {
      if (l.compte && !acc[l.compte.id]) acc[l.compte.id] = l.compte;
      return acc;
    }, {}),
  );
  const journauxComptables: any[] = Object.values(
    ecritures.reduce((acc: Record<string, any>, e: any) => {
      if (e.journal && !acc[e.journal.id]) acc[e.journal.id] = e.journal;
      return acc;
    }, {}),
  );
  const ecrituresValides = ecritures.filter((e: any) => e.statut === 'valide');
  const totalDebitValide = ecrituresValides.reduce((s: number, e: any) => s + (e.lignes ?? []).reduce((s2: number, l: any) => s2 + (l.debit ?? 0), 0), 0);

  const [detailGenerationAuto, setDetailGenerationAuto] = useState<string | null>(null);
  function genererEcrituresAuto() {
    setDetailGenerationAuto(null);
    run(async () => {
      const r: any = await actionsExt.genererEcrituresAutomatiques();
      if (r?.ok) {
        setDetailGenerationAuto(`${r.creees} écriture(s) créée(s) et validée(s) automatiquement depuis les encaissements et dépenses validés.`);
      }
      return r;
    }, 'Génération automatique terminée');
  }

  // F16 — totaux en centimes ; F19 — net = montant - remise
  const netEcheance = (e: any) => (e.montant ?? 0) - (e.remise ?? 0);
  const totalEncaisse = paiements.reduce((s: number, p: any) => s + (p.annule ? 0 : p.montant), 0);
  const totalImpayes = echeances
    .filter((e: any) => e.statut !== 'payee' && e.statut !== 'annulee')
    .reduce((s: number, e: any) => s + Math.max(0, netEcheance(e) - (e.montantPaye ?? 0)), 0);
  const totalDepenses = depenses.filter((d: any) => d.validee && !d.annulee).reduce((s: number, d: any) => s + d.montant, 0);
  const solde = totalEncaisse - totalDepenses;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Finances & Comptabilité" subtitle="Encaissement, échéances, dépenses, stocks" />

      {Message}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total encaissé" value={formatXOF(totalEncaisse, devise)} sub={`${paiements.length} paiements`} icon={TrendingUp} color="emerald" />
        <StatCard title="Impayés restant dus" value={formatXOF(totalImpayes, devise)} sub={`${echeances.filter((e: any) => e.statut !== 'payee').length} échéances`} icon={TrendingDown} color="rose" />
        <StatCard title="Dépenses validées" value={formatXOF(totalDepenses, devise)} sub={`${depenses.filter((d: any) => d.validee).length} dépenses`} icon={Wallet} color="amber" />
        <StatCard title="Solde net" value={formatXOF(solde, devise)} sub="recettes - dépenses" icon={Coins} color="blue" />
      </div>

      <Tabs defaultValue="encaissement">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 mb-4 h-auto">
          <TabsTrigger value="encaissement" className="text-xs">Encaissement</TabsTrigger>
          <TabsTrigger value="echeances" className="text-xs">Échéances</TabsTrigger>
          <TabsTrigger value="frais" className="text-xs">Frais</TabsTrigger>
          <TabsTrigger value="depenses" className="text-xs">Dépenses</TabsTrigger>
          <TabsTrigger value="stock" className="text-xs">Stocks</TabsTrigger>
          <TabsTrigger value="comptabilite" className="text-xs">Comptabilité</TabsTrigger>
        </TabsList>

        <TabsContent value="encaissement" className="space-y-4">
          <SectionBlock
            title="Nouvel encaissement"
            description="L'imputation est automatique sur les échéances impayées (FIFO)"
            action={
              <ModalForm
                trigger={<CreateButton label="Encaisser un paiement" />}
                title="Encaisser un paiement"
                fields={[
                  { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom} — ${e.matricule}` })), required: true },
                  { name: 'montant', label: 'Montant (XOF)', type: 'number', required: true },
                  { name: 'modePaiement', label: 'Mode', type: 'select', options: [
                    { value: 'espece', label: 'Espèces' },
                    { value: 'cheque', label: 'Chèque' },
                    { value: 'virement', label: 'Virement' },
                    { value: 'carte', label: 'Carte' },
                    { value: 'mobile_money', label: 'Mobile Money' },
                  ], required: true },
                ]}
                action={actions.encaisserPaiement}
              />
            }
          >
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (p) => { const e = eleves.find((x: any) => x.id === p.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
                { key: 'montant', label: 'Montant', render: (p) => formatXOF(p.montant, p.devise) },
                { key: 'modePaiement', label: 'Mode' },
                { key: 'referenceTransaction', label: 'Référence' },
                { key: 'datePaiement', label: 'Date', render: (p) => formatDateTime(p.datePaiement) },
                { key: 'statut', label: 'Statut', render: (p) => p.annule ? <StatusBadge statut="annule" label={`Annulé${p.dateAnnulation ? ` le ${formatDate(p.dateAnnulation)}` : ''}`} /> : null },
                { key: 'recu', label: 'Reçu', render: (p) => <RecuPaiement paiement={p} ecole={initialData.ecole} eleve={eleves.find((x: any) => x.id === p.eleveId)} /> },
                {
                  key: 'actions', label: 'Action', render: (p) => !p.annule ? (
                    <div className="flex gap-1">
                      <ModalForm
                        trigger={<Button size="sm" variant="outline">Annuler</Button>}
                        title="Annuler le paiement"
                        fields={[
                          { name: 'paiementId', type: 'hidden', label: 'Paiement', defaultValue: p.id },
                          { name: 'motif', label: 'Motif d\'annulation', type: 'textarea', required: true },
                        ]}
                        action={(fd) => actions.annulerPaiement(String(fd.get('paiementId')), String(fd.get('motif')))}
                      />
                      <ModalForm
                        trigger={<Button size="sm" variant="outline">Rembourser</Button>}
                        title="Rembourser le paiement"
                        fields={[
                          { name: 'paiementId', type: 'hidden', label: 'Paiement', defaultValue: p.id },
                          { name: 'motif', label: 'Motif du remboursement', type: 'textarea', required: true },
                        ]}
                        action={(fd) => actions.rembourserPaiement(String(fd.get('paiementId')), String(fd.get('motif')))}
                      />
                    </div>
                  ) : null,
                },
              ]}
              rows={paiements}
              emptyLabel="Aucun paiement encaissé"
            />
          </SectionBlock>
        </TabsContent>

        <TabsContent value="echeances">
          <SectionBlock
            title="Échéances par élève"
            description="Suivi des paiements attendus — net = montant − remise éventuelle"
          >
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (e) => { const el = eleves.find((x: any) => x.id === e.eleveId); return el ? `${el.prenom} ${el.nom}` : '—'; } },
                { key: 'frais', label: 'Frais', render: (e) => frais.find((f: any) => f.id === e.fraisId)?.libelle ?? '—' },
                { key: 'montant', label: 'Attendu', render: (e) => formatXOF(e.montant, e.devise) },
                { key: 'remise', label: 'Remise', render: (e) => (e.remise ?? 0) > 0 ? <span className="text-emerald-700">−{formatXOF(e.remise, e.devise)}</span> : '—' },
                { key: 'montantPaye', label: 'Payé', render: (e) => formatXOF(e.montantPaye, e.devise) },
                { key: 'restant', label: 'Restant', render: (e) => formatXOF(Math.max(0, netEcheance(e) - (e.montantPaye ?? 0)), e.devise) },
                { key: 'dateEcheance', label: 'Échéance', render: (e) => formatDate(e.dateEcheance) },
                { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
                {
                  key: 'actions', label: 'Action', render: (e) => e.statut === 'annulee' ? null : (
                    <div className="flex gap-1">
                      <ModalForm
                        trigger={<Button size="sm" variant="outline">Remise</Button>}
                        title="Accorder une remise"
                        fields={[
                          { name: 'echeanceId', type: 'hidden', label: 'Échéance', defaultValue: e.id },
                          { name: 'remise', label: 'Remise (XOF)', type: 'number', required: true },
                          { name: 'motif', label: 'Motif (bourse, geste commercial…)', type: 'textarea', required: true },
                        ]}
                        action={actions.remiseEcheance}
                      />
                      {(e.montantPaye ?? 0) === 0 && (
                        <ModalForm
                          trigger={<Button size="sm" variant="outline">Annuler</Button>}
                          title="Annuler l'échéance"
                          fields={[
                            { name: 'echeanceId', type: 'hidden', label: 'Échéance', defaultValue: e.id },
                            { name: 'motif', label: 'Motif d\'annulation', type: 'textarea', required: true },
                          ]}
                          action={(fd) => actions.annulerEcheance(String(fd.get('echeanceId')), String(fd.get('motif')))}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
              rows={echeances}
              emptyLabel="Aucune échéance générée"
            />
          </SectionBlock>
          <SectionBlock
            title="Génération en masse"
            description="Génère les échéances pour tous les élèves d'une classe"
          >
            <ModalForm
              trigger={<CreateButton label="Générer échéances pour une classe" />}
              title="Générer des échéances"
              fields={[
                { name: 'fraisId', label: 'Type de frais', type: 'select', options: frais.map((f: any) => ({ value: f.id, label: `${f.libelle} — ${formatXOF(f.montant, f.devise)}` })), required: true },
                { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })), required: true },
                { name: 'dateEcheance', label: 'Date d\'échéance', type: 'date', required: true },
              ]}
              action={actions.genererEcheancesClasse}
            />
          </SectionBlock>
        </TabsContent>

        <TabsContent value="frais">
          <SectionBlock
            title="Catalogue des frais"
            description="Frais configurés par niveau et type"
            action={
              <ModalForm
                trigger={<CreateButton label="Créer un frais" />}
                title="Créer un type de frais"
                fields={[
                  { name: 'libelle', label: 'Libellé', required: true },
                  { name: 'type', label: 'Type', type: 'select', options: [
                    { value: 'scolarite', label: 'Scolarité' },
                    { value: 'inscription', label: 'Inscription' },
                    { value: 'cantine', label: 'Cantine' },
                    { value: 'transport', label: 'Transport' },
                    { value: 'activite', label: 'Activité' },
                  ], required: true },
                  { name: 'montant', label: 'Montant (XOF)', type: 'number', required: true },
                  { name: 'periodicite', label: 'Périodicité', type: 'select', options: [
                    { value: 'unique', label: 'Unique' },
                    { value: 'mensuel', label: 'Mensuel' },
                    { value: 'trimestriel', label: 'Trimestriel' },
                    { value: 'annuel', label: 'Annuel' },
                  ] },
                  { name: 'niveauId', label: 'Niveau (optionnel)', type: 'select', options: niveaux.map((n: any) => ({ value: n.id, label: n.libelle })) },
                ]}
                action={actions.creerFrais}
              />
            }
          >
            <DataTable
              columns={[
                { key: 'libelle', label: 'Libellé' },
                { key: 'type', label: 'Type' },
                { key: 'montant', label: 'Montant', render: (f) => formatXOF(f.montant, f.devise) },
                { key: 'periodicite', label: 'Périodicité' },
                { key: 'niveau', label: 'Niveau', render: (f) => f.niveauId ? niveaux.find((n: any) => n.id === f.niveauId)?.libelle ?? '—' : 'Tous' },
              ]}
              rows={frais}
              emptyLabel="Aucun frais configuré"
            />
          </SectionBlock>
        </TabsContent>

        <TabsContent value="depenses">
          <SectionBlock
            title="Dépenses"
            description="Workflow : saisie → validation direction. Séparation des tâches : la validation par le saisisseur lui-même est refusée."
            action={
              <ModalForm
                trigger={<CreateButton label="Enregistrer une dépense" />}
                title="Enregistrer une dépense"
                fields={[
                  { name: 'categorie', label: 'Catégorie', required: true, placeholder: 'Fournitures, électricité, etc.' },
                  { name: 'description', label: 'Description', type: 'textarea', required: true },
                  { name: 'montant', label: 'Montant (XOF)', type: 'number', required: true },
                  { name: 'dateDepense', label: 'Date', type: 'date', required: true },
                  { name: 'fournisseur', label: 'Fournisseur' },
                ]}
                action={actions.enregistrerDepense}
              />
            }
          >
            <DataTable
              columns={[
                { key: 'categorie', label: 'Catégorie' },
                { key: 'description', label: 'Description' },
                { key: 'montant', label: 'Montant', render: (d) => formatXOF(d.montant, d.devise) },
                { key: 'dateDepense', label: 'Date', render: (d) => formatDate(d.dateDepense) },
                { key: 'fournisseur', label: 'Fournisseur' },
                { key: 'validee', label: 'Statut', render: (d) => d.annulee ? <StatusBadge statut="annule" /> : d.validee ? <StatusBadge statut="validee" /> : <StatusBadge statut="en_attente" /> },
                {
                  key: 'actions', label: 'Action', render: (d) => !d.annulee ? (
                    <div className="flex gap-1">
                      {!d.validee && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          title="Séparation des tâches (C9) : la validation d'une dépense par son propre saisisseur est refusée — faites valider par un autre responsable."
                          onClick={() => run(() => actions.validerDepense(d.id), 'Dépense validée')}
                        >
                          Valider
                        </Button>
                      )}
                      {!d.validee && (
                        <ModalForm
                          trigger={<Button size="sm" variant="outline">Annuler</Button>}
                          title="Annuler la dépense"
                          fields={[
                            { name: 'depenseId', type: 'hidden', label: 'Dépense', defaultValue: d.id },
                            { name: 'motif', label: 'Motif d\'annulation', type: 'textarea', required: true },
                          ]}
                          action={(fd) => actions.annulerDepense(String(fd.get('depenseId')), String(fd.get('motif')))}
                        />
                      )}
                    </div>
                  ) : null,
                },
              ]}
              rows={depenses}
              emptyLabel="Aucune dépense enregistrée"
            />
          </SectionBlock>
        </TabsContent>

        <TabsContent value="stock">
          <SectionBlock
            title="Articles en stock"
            description="Suivi quantités et seuils d'alerte"
            action={
              <ModalForm
                trigger={<CreateButton label="Nouvel article" />}
                title="Créer un article en stock"
                fields={[
                  { name: 'nom', label: 'Nom de l\'article', required: true },
                  { name: 'categorie', label: 'Catégorie', required: true },
                  { name: 'quantite', label: 'Quantité initiale', type: 'number', required: true },
                  { name: 'unite', label: 'Unité', placeholder: 'pièce, carton, litre…' },
                  { name: 'seuilAlerte', label: 'Seuil d\'alerte', type: 'number' },
                  { name: 'prixUnitaire', label: 'Prix unitaire (XOF)', type: 'number', required: true },
                ]}
                action={actions.creerArticleStock}
              />
            }
          >
            <DataTable
              columns={[
                { key: 'nom', label: 'Article' },
                { key: 'categorie', label: 'Catégorie' },
                { key: 'quantite', label: 'Quantité', render: (a) => <span className={a.seuilAlerte && a.quantite <= a.seuilAlerte ? 'text-rose-600 font-medium' : ''}>{a.quantite} {a.unite ?? ''}</span> },
                { key: 'seuilAlerte', label: 'Seuil' },
                { key: 'prixUnitaire', label: 'Prix unitaire', render: (a) => formatXOF(a.prixUnitaire, devise) },
              ]}
              rows={articles}
              emptyLabel="Aucun article en stock"
            />
          </SectionBlock>

          <SectionBlock
            title="Mouvements de stock"
            description="Entrées et sorties"
            action={
              <ModalForm
                trigger={<CreateButton label="Nouveau mouvement" />}
                title="Enregistrer un mouvement de stock"
                fields={[
                  { name: 'articleId', label: 'Article', type: 'select', options: articles.map((a: any) => ({ value: a.id, label: a.nom })), required: true },
                  { name: 'type', label: 'Type', type: 'select', options: [{ value: 'entree', label: 'Entrée (réapprovisionnement)' }, { value: 'sortie', label: 'Sortie (consommation/dotation)' }], required: true },
                  { name: 'quantite', label: 'Quantité', type: 'number', required: true },
                  { name: 'motif', label: 'Motif' },
                ]}
                action={actions.enregistrerMouvementStock}
              />
            }
          >
            <DataTable
              columns={[
                { key: 'article', label: 'Article', render: (m) => articles.find((a: any) => a.id === m.articleId)?.nom ?? '—' },
                { key: 'type', label: 'Type', render: (m) => <StatusBadge statut={m.type} /> },
                { key: 'quantite', label: 'Quantité' },
                { key: 'motif', label: 'Motif' },
                { key: 'dateMouvement', label: 'Date', render: (m) => formatDateTime(m.dateMouvement) },
              ]}
              rows={mouvements}
              emptyLabel="Aucun mouvement enregistré"
            />
          </SectionBlock>
        </TabsContent>

        {/* B2 — COMPTABILITÉ EN PARTIE DOUBLE : écritures, plan comptable, génération auto */}
        <TabsContent value="comptabilite" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard title="Écritures" value={ecritures.length} sub={`${ecrituresValides.length} validée(s) · ${ecritures.filter((e: any) => e.statut === 'brouillon').length} brouillon(s)`} icon={BookOpen} color="blue" />
            <StatCard title="Total débit (valides)" value={formatXOF(totalDebitValide, devise)} sub="débit = crédit (partie double)" icon={Landmark} color="emerald" />
            <StatCard title="Comptes actifs" value={comptesComptables.filter((c: any) => c.actif !== false).length} sub="issus des écritures du journal" icon={Calculator} color="purple" />
          </div>

          <SectionBlock
            title="Journal comptable"
            description="Écritures en partie double — l'équilibre débit = crédit est vérifié à la saisie et à la validation (mise à jour des soldes)"
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={genererEcrituresAuto}>
                  Générer écritures automatiques
                </Button>
                <ModalForm
                  trigger={<CreateButton label="Nouveau compte" />}
                  title="Créer un compte comptable"
                  fields={[
                    { name: 'numero', label: 'Numéro (3 à 6 chiffres)', required: true, placeholder: 'ex. 512' },
                    { name: 'libelle', label: 'Libellé', required: true, placeholder: 'ex. Banque' },
                    { name: 'type', label: 'Type', type: 'select', options: [
                      { value: 'actif', label: 'Actif' },
                      { value: 'passif', label: 'Passif' },
                      { value: 'produit', label: 'Produit' },
                      { value: 'charge', label: 'Charge' },
                    ], required: true },
                  ]}
                  action={actionsExt.creerCompteComptable}
                />
              </div>
            }
          >
            {detailGenerationAuto && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 mb-3" role="status">
                {detailGenerationAuto}
              </div>
            )}
            <DataTable
              columns={[
                { key: 'date', label: 'Date', render: (e) => formatDate(e.date) },
                { key: 'numeroPiece', label: 'N° pièce' },
                { key: 'libelle', label: 'Libellé' },
                { key: 'journal', label: 'Journal', render: (e) => e.journal ? `${e.journal.code} — ${e.journal.libelle}` : '—' },
                { key: 'total', label: 'Débit = Crédit', render: (e) => <span className="font-semibold">{formatXOF((e.lignes ?? []).reduce((s: number, l: any) => s + (l.debit ?? 0), 0), devise)}</span> },
                { key: 'statut', label: 'Statut', render: (e) => e.statut === 'valide' ? <StatusBadge statut="confirme" label="Validée" /> : e.statut === 'annule' ? <StatusBadge statut="annule" label="Annulée" /> : <StatusBadge statut="en_attente" label="Brouillon" /> },
                {
                  key: 'actions', label: 'Action', render: (e) => e.statut === 'brouillon' ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => actionsExt.validerEcriture(e.id), 'Écriture validée — soldes des comptes mis à jour')}>Valider</Button>
                  ) : null,
                },
              ]}
              rows={ecritures}
              emptyLabel="Aucune écriture au journal"
            />
          </SectionBlock>

          <SectionBlock
            title="Saisie d'une écriture"
            description="Deux lignes fixes : un compte à débiter, un compte à créditer — montants saisis en XOF (convertis en centimes), débit strictement égal au crédit"
          >
            <SaisieEcriture comptes={comptesComptables} journaux={journauxComptables} />
          </SectionBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}


// --------------------------------------------------------------------
// B2 — SAISIE D'ÉCRITURE (mini-formulaire custom : deux lignes fixes,
// FormData construit à la main avec lignes = JSON)
// --------------------------------------------------------------------
function SaisieEcriture({ comptes, journaux }: { comptes: any[]; journaux: any[] }) {
  const { run, Message, pending } = useActionFeedback();
  const [journalId, setJournalId] = useState(journaux[0]?.id ?? '');
  const [libelle, setLibelle] = useState('');
  const [dateEcriture, setDateEcriture] = useState(() => new Date().toISOString().slice(0, 10));
  const [compteDebit, setCompteDebit] = useState(comptes[0]?.id ?? '');
  const [compteCredit, setCompteCredit] = useState(comptes[1]?.id ?? comptes[0]?.id ?? '');
  const [montantDebit, setMontantDebit] = useState('');
  const [montantCredit, setMontantCredit] = useState('');

  const classeChamp = 'w-full h-9 rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = parseFloat(String(montantDebit).replace(',', '.'));
    const c = parseFloat(String(montantCredit).replace(',', '.'));
    run(async () => {
      if (!Number.isFinite(d) || !Number.isFinite(c) || d <= 0 || d !== c) {
        return { ok: false, error: 'Écriture déséquilibrée : le débit doit être strictement égal au crédit.' };
      }
      const fd = new FormData();
      fd.set('journalId', journalId);
      fd.set('libelle', libelle);
      fd.set('date', dateEcriture);
      // Montants au format saisi (XOF) — convertis en centimes côté serveur
      fd.set('lignes', JSON.stringify([
        { compteId: compteDebit, libelle: libelle, debit: d, credit: 0 },
        { compteId: compteCredit, libelle: libelle, debit: 0, credit: c },
      ]));
      const r = await actionsExt.creerEcriture(fd);
      if (r && r.ok !== false) {
        setLibelle(''); setMontantDebit(''); setMontantCredit('');
      }
      return r;
    }, 'Écriture enregistrée au brouillon');
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 block">Journal <span className="text-rose-500">*</span></label>
          {journaux.length > 0 ? (
            <select value={journalId} onChange={(e) => setJournalId(e.target.value)} required className={classeChamp}>
              <option value="">— Choisir —</option>
              {journaux.map((j: any) => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}
            </select>
          ) : (
            <Input value={journalId} onChange={(e) => setJournalId(e.target.value)} required placeholder="Identifiant du journal" />
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 block">Libellé <span className="text-rose-500">*</span></label>
          <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} required placeholder="Ex. Règlement fournisseur papeterie" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 block">Date <span className="text-rose-500">*</span></label>
          <Input type="date" value={dateEcriture} onChange={(e) => setDateEcriture(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">Ligne 1 — Compte à débiter</div>
          {comptes.length > 0 ? (
            <select value={compteDebit} onChange={(e) => setCompteDebit(e.target.value)} required className={classeChamp}>
              <option value="">— Choisir —</option>
              {comptes.map((c: any) => <option key={c.id} value={c.id}>{c.numero} — {c.libelle}</option>)}
            </select>
          ) : (
            <Input value={compteDebit} onChange={(e) => setCompteDebit(e.target.value)} required placeholder="Identifiant du compte à débiter" />
          )}
          <Input type="number" min="0" step="0.01" value={montantDebit} onChange={(e) => setMontantDebit(e.target.value)} required placeholder="Montant (XOF)" />
        </div>
        <div className="rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">Ligne 2 — Compte à créditer</div>
          {comptes.length > 0 ? (
            <select value={compteCredit} onChange={(e) => setCompteCredit(e.target.value)} required className={classeChamp}>
              <option value="">— Choisir —</option>
              {comptes.map((c: any) => <option key={c.id} value={c.id}>{c.numero} — {c.libelle}</option>)}
            </select>
          ) : (
            <Input value={compteCredit} onChange={(e) => setCompteCredit(e.target.value)} required placeholder="Identifiant du compte à créditer" />
          )}
          <Input type="number" min="0" step="0.01" value={montantCredit} onChange={(e) => setMontantCredit(e.target.value)} required placeholder="Montant (XOF)" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="bg-emerald-600 hover:bg-emerald-700">
          {pending ? 'Enregistrement…' : 'Enregistrer l\u2019écriture (brouillon)'}
        </Button>
        <p className="text-xs text-gray-500">
          Les listes reprennent les comptes et journaux déjà utilisés dans des écritures
          {comptes.length === 0 && ' — aucun en base pour l\u2019instant : saisissez les identifiants ou créez les comptes via « Nouveau compte »'}.
        </p>
      </div>
      {Message}
    </form>
  );
}


// --------------------------------------------------------------------
// REÇU DE PAIEMENT IMPRIMABLE (P2)
// --------------------------------------------------------------------
function RecuPaiement({ paiement, ecole, eleve }: { paiement: any; ecole: any; eleve: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Printer className="h-3 w-3 mr-1" />Reçu</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Reçu de paiement</DialogTitle></DialogHeader>
        <div id="recu-paiement" className="border border-gray-300 rounded-lg p-4 bg-white text-sm">
          <div className="text-center border-b border-gray-200 pb-3 mb-3">
            <div className="font-bold text-base">{ecole?.nom ?? 'École'}</div>
            <div className="text-xs text-gray-500">Reçu de paiement n° {paiement.referenceTransaction ?? paiement.id.slice(0, 8)}</div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Élève</span><span className="font-medium">{eleve ? `${eleve.prenom} ${eleve.nom} (${eleve.matricule ?? '—'})` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Montant</span><span className="font-bold">{formatXOF(paiement.montant, paiement.devise)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Mode</span><span>{paiement.modePaiement}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{formatDateTime(paiement.datePaiement)}</span></div>
            {paiement.annule && <div className="flex justify-between"><span className="text-rose-600">Annulé</span><span className="font-medium text-rose-600">{paiement.dateAnnulation ? formatDate(paiement.dateAnnulation) : '—'}</span></div>}
          </div>
          <div className="border-t border-dashed border-gray-300 mt-3 pt-3 text-xs text-gray-500 text-center">
            Document généré par ScolaGestion — conservez ce reçu justificatif.
          </div>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 w-full"
          onClick={() => {
            const contenu = document.getElementById('recu-paiement')?.innerHTML ?? '';
            const f = window.open('', '_blank', 'width=420,height=560');
            if (f) {
              f.document.write(`<html><head><title>Reçu ${paiement.referenceTransaction ?? ''}</title><style>body{font-family:system-ui,sans-serif;padding:24px;font-size:14px;color:#111} .font-bold{font-weight:700} .text-center{text-align:center} .flex{display:flex;justify-content:space-between;margin:4px 0} .border-b{border-bottom:1px solid #ddd;padding-bottom:12px;margin-bottom:12px} .border-t{border-top:1px dashed #ccc;margin-top:12px;padding-top:12px}</style></head><body>${contenu}</body></html>`);
              f.document.close();
              f.print();
            }
          }}
        >
          <Printer className="h-4 w-4 mr-2" />Imprimer le reçu
        </Button>
      </DialogContent>
    </Dialog>
  );
}
