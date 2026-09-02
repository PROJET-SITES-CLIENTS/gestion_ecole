'use client';

// ====================================================================
// Module Finances & Comptabilité
// - Frais, échéances, encaissements (multi-mode)
// - Dépenses (avec workflow validation)
// - Stocks (articles + mouvements)
// ====================================================================

import { useTransition, useState } from 'react';
import { Wallet, FileText, Package, TrendingDown, TrendingUp, Plus, Coins, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, FormField } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import * as actions from '@/app/actions';
import { formatMontant, formatDate, formatDateTime } from '@/lib/format';

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
  const devise = initialData.ecole?.devise ?? 'XOF';
  const [pending, startTransition] = useTransition();

  const totalEncaisse = paiements.reduce((s: number, p: any) => s + p.montant, 0);
  const totalImpayes = echeances.filter((e: any) => e.statut !== 'payee').reduce((s: number, e: any) => s + (e.montant - e.montantPaye), 0);
  const totalDepenses = depenses.filter((d: any) => d.validee).reduce((s: number, d: any) => s + d.montant, 0);
  const solde = totalEncaisse - totalDepenses;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Finances & Comptabilité" subtitle="Encaissement, échéances, dépenses, stocks" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total encaissé" value={formatMontant(totalEncaisse, devise)} sub={`${paiements.length} paiements`} icon={TrendingUp} color="emerald" />
        <StatCard title="Impayés restant dus" value={formatMontant(totalImpayes, devise)} sub={`${echeances.filter((e: any) => e.statut !== 'payee').length} échéances`} icon={TrendingDown} color="rose" />
        <StatCard title="Dépenses validées" value={formatMontant(totalDepenses, devise)} sub={`${depenses.filter((d: any) => d.validee).length} dépenses`} icon={Wallet} color="amber" />
        <StatCard title="Solde net" value={formatMontant(solde, devise)} sub="recettes - dépenses" icon={Coins} color="blue" />
      </div>

      <Tabs defaultValue="encaissement">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4 h-auto">
          <TabsTrigger value="encaissement" className="text-xs">Encaissement</TabsTrigger>
          <TabsTrigger value="echeances" className="text-xs">Échéances</TabsTrigger>
          <TabsTrigger value="frais" className="text-xs">Frais</TabsTrigger>
          <TabsTrigger value="depenses" className="text-xs">Dépenses</TabsTrigger>
          <TabsTrigger value="stock" className="text-xs">Stocks</TabsTrigger>
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
                  { name: 'montant', label: 'Montant', type: 'number', required: true },
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
                { key: 'montant', label: 'Montant', render: (p) => formatMontant(p.montant, p.devise) },
                { key: 'modePaiement', label: 'Mode' },
                { key: 'referenceTransaction', label: 'Référence' },
                { key: 'datePaiement', label: 'Date', render: (p) => formatDateTime(p.datePaiement) },
                { key: 'recu', label: 'Reçu', render: (p) => <RecuPaiement paiement={p} ecole={initialData.ecole} eleve={eleves.find((x: any) => x.id === p.eleveId)} /> },
              ]}
              rows={paiements}
              emptyLabel="Aucun paiement encaissé"
            />
          </SectionBlock>
        </TabsContent>

        <TabsContent value="echeances">
          <SectionBlock
            title="Échéances par élève"
            description="Suivi des paiements attendus"
          >
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (e) => { const el = eleves.find((x: any) => x.id === e.eleveId); return el ? `${el.prenom} ${el.nom}` : '—'; } },
                { key: 'frais', label: 'Frais', render: (e) => frais.find((f: any) => f.id === e.fraisId)?.libelle ?? '—' },
                { key: 'montant', label: 'Attendu', render: (e) => formatMontant(e.montant, e.devise) },
                { key: 'montantPaye', label: 'Payé', render: (e) => formatMontant(e.montantPaye, e.devise) },
                { key: 'restant', label: 'Restant', render: (e) => formatMontant(e.montant - e.montantPaye, e.devise) },
                { key: 'dateEcheance', label: 'Échéance', render: (e) => formatDate(e.dateEcheance) },
                { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
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
                { name: 'fraisId', label: 'Type de frais', type: 'select', options: frais.map((f: any) => ({ value: f.id, label: `${f.libelle} — ${formatMontant(f.montant, f.devise)}` })), required: true },
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
                  { name: 'montant', label: 'Montant', type: 'number', required: true },
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
                { key: 'montant', label: 'Montant', render: (f) => formatMontant(f.montant, f.devise) },
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
            description="Workflow : saisie -> validation direction"
            action={
              <ModalForm
                trigger={<CreateButton label="Enregistrer une dépense" />}
                title="Enregistrer une dépense"
                fields={[
                  { name: 'categorie', label: 'Catégorie', required: true, placeholder: 'Fournitures, électricité, etc.' },
                  { name: 'description', label: 'Description', type: 'textarea', required: true },
                  { name: 'montant', label: 'Montant', type: 'number', required: true },
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
                { key: 'montant', label: 'Montant', render: (d) => formatMontant(d.montant, d.devise) },
                { key: 'dateDepense', label: 'Date', render: (d) => formatDate(d.dateDepense) },
                { key: 'fournisseur', label: 'Fournisseur' },
                { key: 'validee', label: 'Statut', render: (d) => d.validee ? <StatusBadge statut="validee" /> : <StatusBadge statut="en_attente" /> },
                {
                  key: 'actions', label: 'Action', render: (d) => !d.validee ? (
                    <Button size="sm" variant="outline" onClick={() => startTransition(() => { void actions.validerDepense(d.id); })}>Valider</Button>
                  ) : null,
                },
              ]}
              rows={depenses}
              emptyLabel="Aucune dépense enregistrée"
            />
          </SectionBlock>
        </TabsContent>

        <TabsContent value="stock">
          <SectionBlock title="Articles en stock" description="Suivi quantités et seuils d'alerte">
            <DataTable
              columns={[
                { key: 'nom', label: 'Article' },
                { key: 'categorie', label: 'Catégorie' },
                { key: 'quantite', label: 'Quantité', render: (a) => <span className={a.seuilAlerte && a.quantite <= a.seuilAlerte ? 'text-rose-600 font-medium' : ''}>{a.quantite} {a.unite ?? ''}</span> },
                { key: 'seuilAlerte', label: 'Seuil' },
                { key: 'prixUnitaire', label: 'Prix unitaire', render: (a) => formatMontant(a.prixUnitaire, devise) },
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
      </Tabs>
    </div>
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
            <div className="flex justify-between"><span className="text-gray-500">Montant</span><span className="font-bold">{formatMontant(paiement.montant, paiement.devise)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Mode</span><span>{paiement.modePaiement}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{formatDateTime(paiement.datePaiement)}</span></div>
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
