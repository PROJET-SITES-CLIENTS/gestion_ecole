'use client';

// ====================================================================
// Module SaaS Super-Admin (Partie A du cahier des charges)
// - Dashboard global (MRR, écoles actives, élèves gérés, résiliations)
// - Liste des écoles clientes (filtre, suspension, réactivation, changement plan)
// - Plans tarifaires (CRUD)
// - Factures SaaS
// ====================================================================

import { useState, useTransition } from 'react';
import { Building2, Plus, TrendingUp, Users, Activity, ShieldCheck } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as actions from '@/app/actions';
import { formatMontant, formatDate } from '@/lib/format';

export default function SaasModule({ initialData, mode = 'full' }: { initialData: any; mode?: 'dashboard' | 'full' }) {
  const ecoles = initialData.ecoles ?? [];
  const plans = initialData.plans ?? [];
  const factures = initialData.facturesSaas ?? [];
  const [pending, startTransition] = useTransition();

  // KPIs
  const ecolesActives = ecoles.filter((e: any) => e.statut === 'actif').length;
  const ecolesEssai = ecoles.filter((e: any) => e.statut === 'essai').length;
  const totalElevesGeres = initialData.totalElevesGeres ?? 0;
  const mrr = ecoles
    .filter((e: any) => e.statut === 'actif')
    .reduce((sum: number, e: any) => {
      const plan = plans.find((p: any) => p.id === e.planCourantId);
      return sum + (plan?.prixMensuel ?? 0);
    }, 0);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Back-Office Éditeur SaaS"
        subtitle="Supervision des écoles clientes, plans tarifaires, facturation éditeur"
        actions={
          <ModalForm
            trigger={<CreateButton label="Nouvelle école cliente" />}
            title="Créer une nouvelle école cliente"
            fields={[
              { name: 'nom', label: 'Nom de l\'école', required: true, placeholder: 'Ex. Institut Léonard de Vinci' },
              { name: 'slug', label: 'Slug (sous-domaine)', required: true, placeholder: 'vinci' },
              { name: 'pays', label: 'Code pays (ISO)', defaultValue: 'SN' },
              { name: 'devise', label: 'Devise', defaultValue: 'XOF' },
              { name: 'planId', label: 'Plan', type: 'select', options: plans.map((p: any) => ({ value: p.id, label: `${p.nom} — ${formatMontant(p.prixMensuel, p.devise)}/mois` })) },
            ]}
            action={actions.creerEcoleClient}
          />
        }
      />

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Écoles actives" value={ecolesActives} sub={`${ecolesEssai} en essai`} icon={Building2} color="emerald" />
        <StatCard title="MRR (revenu récurrent)" value={formatMontant(mrr)} sub="par mois" icon={TrendingUp} color="blue" />
        <StatCard title="Élèves gérés (total)" value={totalElevesGeres.toLocaleString('fr-FR')} sub="sur la plateforme" icon={Users} color="purple" />
        <StatCard title="Taux de résiliation" value="0%" sub="ce mois" icon={Activity} color="amber" />
      </div>

      {mode === 'dashboard' && (
        <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-8 w-8 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Couche SaaS multi-tenant</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Chaque école cliente dispose de son propre espace isolé (par <code className="bg-white/60 px-1 rounded">ecole_id</code>).
                  Toute connexion du support éditeur "en tant que" une école est tracée dans le journal d'audit de cette école,
                  visible par la direction. Les limites du plan déclenchent une alerte progressive (80%, 100%) plutôt qu'un blocage brutal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'full' && (
        <>
          {/* Liste des écoles clientes */}
          <PageHeader title="Écoles clientes" subtitle={`${ecoles.length} école(s) au total`} />
          <DataTable
            columns={[
              { key: 'nom', label: 'École', render: (e) => <div><div className="font-medium">{e.nom}</div><div className="text-xs text-gray-500">{e.slug}.platforme.com</div></div> },
              { key: 'pays', label: 'Pays' },
              { key: 'plan', label: 'Plan', render: (e) => { const p = plans.find((p: any) => p.id === e.planCourantId); return p?.nom ?? '—'; } },
              { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
              { key: 'dateCreation', label: 'Créée le', render: (e) => formatDate(e.dateCreation) },
              {
                key: 'actions', label: 'Actions', render: (e) => (
                  <div className="flex gap-1">
                    {e.statut !== 'suspendu' && (
                      <Button size="sm" variant="outline" onClick={() => startTransition(() => actions.changerStatutEcole(e.id, 'suspendu'))}>
                        Suspendre
                      </Button>
                    )}
                    {e.statut === 'suspendu' && (
                      <Button size="sm" variant="outline" onClick={() => startTransition(() => actions.changerStatutEcole(e.id, 'actif'))}>
                        Réactiver
                      </Button>
                    )}
                  </div>
                )
              },
            ]}
            rows={ecoles}
          />

          {/* Plans tarifaires */}
          <PageHeader
            title="Plans tarifaires"
            subtitle="Offres disponibles"
            actions={
              <ModalForm
                trigger={<CreateButton label="Nouveau plan" />}
                title="Créer un plan tarifaire"
                fields={[
                  { name: 'nom', label: 'Nom du plan', required: true, placeholder: 'Essentiel / Pro / Illimité' },
                  { name: 'prixMensuel', label: 'Prix mensuel', type: 'number', required: true },
                  { name: 'prixAnnuel', label: 'Prix annuel', type: 'number', required: true },
                  { name: 'devise', label: 'Devise', defaultValue: 'XOF' },
                  { name: 'dureeEssaiJours', label: 'Durée d\'essai (jours)', type: 'number', defaultValue: '14' },
                  { name: 'modules', label: 'Modules inclus (séparés par virgule)', placeholder: 'eleves,personnel,finances_full' },
                ]}
                action={actions.creerPlanTarifaire}
              />
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {plans.map((p: any) => {
              const ecolesSurPlan = ecoles.filter((e: any) => e.planCourantId === p.id).length;
              return (
                <Card key={p.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span>{p.nom}</span>
                      <StatusBadge statut={p.actif ? 'actif' : 'resilie'} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Mensuel</span><span className="font-medium">{formatMontant(p.prixMensuel, p.devise)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Annuel</span><span className="font-medium">{formatMontant(p.prixAnnuel, p.devise)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Essai</span><span className="font-medium">{p.dureeEssaiJours} jours</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Écoles</span><span className="font-medium">{ecolesSurPlan}</span></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Modules inclus</div>
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(p.modulesInclus || '[]').map((m: string) => (
                          <span key={m} className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{m}</span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Factures SaaS */}
          <PageHeader title="Factures éditeur (SaaS)" subtitle="Facturation émise aux écoles clientes" />
          <DataTable
            columns={[
              { key: 'ecole', label: 'École', render: (f) => { const e = ecoles.find((x: any) => x.id === f.ecoleId); return e?.nom ?? '—'; } },
              { key: 'periode', label: 'Période' },
              { key: 'montant', label: 'Montant', render: (f) => formatMontant(f.montant, f.devise) },
              { key: 'statut', label: 'Statut', render: (f) => <StatusBadge statut={f.statut} /> },
              { key: 'modePaiement', label: 'Mode' },
              { key: 'dateEmission', label: 'Émise le', render: (f) => formatDate(f.dateEmission) },
              { key: 'datePaiement', label: 'Payée le', render: (f) => formatDate(f.datePaiement) },
            ]}
            rows={factures}
          />
        </>
      )}
    </div>
  );
}
