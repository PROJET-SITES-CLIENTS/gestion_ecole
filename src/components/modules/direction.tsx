'use client';

// ====================================================================
// Module Dashboard Direction — vue synthétique par école
// KPIs : élèves actifs, personnels, encaissé ce mois, présences taux,
// échéances en retard, bulletins en attente.
// ====================================================================

import { Users, GraduationCap, Wallet, ClipboardList, BookOpen, Bell, AlertCircle } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock } from '@/components/shared-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMontant, formatDate, formatDateTime } from '@/lib/format';

export default function DirectionModule({ initialData, mode = 'dashboard' }: { initialData: any; mode?: 'dashboard' | 'full' }) {
  const eleves = initialData.eleves ?? [];
  const personnels = initialData.personnels ?? [];
  const echeances = initialData.echeances ?? [];
  const paiements = initialData.paiements ?? [];
  const presences = initialData.presences ?? [];
  const incidents = initialData.incidents ?? [];
  const bulletins = initialData.bulletins ?? [];
  const notifications = initialData.notifications ?? [];
  const classes = initialData.classes ?? [];

  const elevesActifs = eleves.filter((e: any) => e.statut === 'actif').length;
  const personnelsActifs = personnels.filter((p: any) => p.statut === 'actif').length;
  const totalEncaisse = paiements.reduce((s: number, p: any) => s + p.montant, 0);
  const echeancesImpayees = echeances.filter((e: any) => e.statut === 'impayee' || e.statut === 'partiel');
  const montantImpaye = echeancesImpayees.reduce((s: number, e: any) => s + (e.montant - e.montantPaye), 0);
  const presentsCount = presences.filter((p: any) => p.statut === 'present').length;
  const absentsCount = presences.filter((p: any) => p.statut === 'absent').length;
  const tauxPresence = presences.length ? Math.round(presentsCount / presences.length * 100) : 0;
  const incidentsOuverts = incidents.length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={mode === 'dashboard' ? 'Tableau de bord — Direction' : 'Direction'}
        subtitle={`Année scolaire ${initialData.anneeScolaire?.libelle ?? '—'} · ${classes.length} classes`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Élèves actifs" value={elevesActifs} sub={`${classes.length} classes`} icon={Users} color="emerald" />
        <StatCard title="Personnels" value={personnelsActifs} sub="actifs" icon={GraduationCap} color="blue" />
        <StatCard title="Encaissé (cumulé)" value={formatMontant(totalEncaisse, initialData.ecole?.devise)} sub={`${paiements.length} paiements`} icon={Wallet} color="purple" />
        <StatCard title="Taux de présence" value={`${tauxPresence}%`} sub={`${absentsCount} absences signalées`} icon={ClipboardList} color="amber" />
      </div>

      {/* Alerte échéances */}
      {montantImpaye > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Échéances impayées à relancer</h3>
              <p className="text-xs text-amber-700 mt-1">
                {echeancesImpayees.length} échéance(s) en attente, soit un montant restant dû de <strong>{formatMontant(montantImpaye, initialData.ecole?.devise)}</strong>.
                Relance automatique recommandée via le module Communication → modèle "rappel_echeance".
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bloc activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBlock title="Notifications récentes" description="Messages internes">
          <div className="space-y-2">
            {notifications.length === 0 && <p className="text-sm text-gray-500">Aucune notification</p>}
            {notifications.slice(0, 6).map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                <Bell className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.sujet}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">{n.corps}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(n.dateEnvoi)}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>

        <SectionBlock title="Derniers paiements encaissés" description="Activité financière">
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (p) => { const e = eleves.find((x: any) => x.id === p.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'montant', label: 'Montant', render: (p) => formatMontant(p.montant, p.devise) },
              { key: 'modePaiement', label: 'Mode' },
              { key: 'datePaiement', label: 'Date', render: (p) => formatDate(p.datePaiement) },
            ]}
            rows={paiements.slice(0, 5)}
            emptyLabel="Aucun paiement"
          />
        </SectionBlock>
      </div>

      {/* Bloc incidents / vie scolaire */}
      <SectionBlock title="Vie scolaire — derniers incidents" description="Suivi discipline">
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (i) => { const e = eleves.find((x: any) => x.id === i.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'type', label: 'Type' },
            { key: 'gravite', label: 'Gravité', render: (i) => <StatusBadge statut={i.gravite} /> },
            { key: 'description', label: 'Description' },
            { key: 'dateHeure', label: 'Date', render: (i) => formatDateTime(i.dateHeure) },
          ]}
          rows={incidents}
          emptyLabel="Aucun incident déclaré"
        />
      </SectionBlock>

      {/* Bloc pédagogique — bulletins en cours */}
      <SectionBlock title="Bulletins — statut du circuit de validation" description="Workflow en cours">
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (b) => { const e = eleves.find((x: any) => x.id === b.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'version', label: 'Version' },
            { key: 'statut', label: 'Statut', render: (b) => <StatusBadge statut={b.statut} /> },
            { key: 'moyenneGenerale', label: 'Moy. gén.' },
            { key: 'dateCreation', label: 'Créé le', render: (b) => formatDate(b.dateCreation) },
          ]}
          rows={bulletins}
          emptyLabel="Aucun bulletin généré"
        />
      </SectionBlock>
    </div>
  );
}
