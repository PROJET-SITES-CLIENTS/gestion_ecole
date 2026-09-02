'use client';

// ====================================================================
// Module Vie Scolaire / Discipline — incidents + sanctions
// ====================================================================

import { useTransition } from 'react';
import { Shield, AlertTriangle, FileText } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import { formatDate, formatDateTime } from '@/lib/format';

export default function VieScolaireModule({ initialData }: { initialData: any }) {
  const incidents = initialData.incidents ?? [];
  const sanctions = initialData.sanctions ?? [];
  const eleves = initialData.eleves ?? [];
  const personnels = initialData.personnels ?? [];
  const [pending, startTransition] = useTransition();

  const incidentsGraves = incidents.filter((i: any) => i.gravite === 'grave').length;
  const incidentsModeres = incidents.filter((i: any) => i.gravite === 'modere').length;
  const sanctionsNotifiees = sanctions.filter((s: any) => s.notifieParents).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Vie scolaire & Discipline"
        subtitle="Déclaration d'incidents, sanctions, notification automatique aux parents"
        actions={
          <ModalForm
            trigger={<CreateButton label="Déclarer un incident" />}
            title="Déclarer un incident"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'dateHeure', label: 'Date et heure', type: 'datetime-local', required: true },
              { name: 'lieu', label: 'Lieu' },
              { name: 'type', label: 'Type', type: 'select', options: [
                { value: 'comportement', label: 'Comportement' },
                { value: 'violence', label: 'Violence' },
                { value: 'fraude', label: 'Fraude' },
                { value: 'autre', label: 'Autre' },
              ], required: true },
              { name: 'gravite', label: 'Gravité', type: 'select', options: [
                { value: 'leger', label: 'Léger' },
                { value: 'modere', label: 'Modéré' },
                { value: 'grave', label: 'Grave' },
              ], required: true },
              { name: 'description', label: 'Description', type: 'textarea', required: true },
            ]}
            action={actions.declarerIncident}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Incidents déclarés" value={incidents.length} icon={AlertTriangle} color="amber" />
        <StatCard title="Incidents graves" value={incidentsGraves} icon={Shield} color="rose" />
        <StatCard title="Sanctions décidées" value={sanctions.length} icon={FileText} color="blue" />
        <StatCard title="Parents notifiés" value={sanctionsNotifiees} sub="sur les sanctions" icon={Shield} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionBlock title="Incidents">
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (i) => { const e = eleves.find((x: any) => x.id === i.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'type', label: 'Type' },
              { key: 'gravite', label: 'Gravité', render: (i) => <StatusBadge statut={i.gravite} /> },
              { key: 'dateHeure', label: 'Date', render: (i) => formatDateTime(i.dateHeure) },
              { key: 'description', label: 'Description' },
            ]}
            rows={incidents}
            emptyLabel="Aucun incident déclaré"
          />
        </SectionBlock>

        <SectionBlock title="Sanctions">
          <DataTable
            columns={[
              { key: 'incident', label: 'Incident', render: (s) => { const i = incidents.find((x: any) => x.id === s.incidentId); const e = i ? eleves.find((y: any) => y.id === i.eleveId) : null; return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'type', label: 'Type' },
              { key: 'description', label: 'Description' },
              { key: 'statut', label: 'Statut', render: (s) => <StatusBadge statut={s.statut} /> },
              { key: 'notifie', label: 'Parents', render: (s) => s.notifieParents ? <span className="text-emerald-600 text-xs">Notifiés</span> : <span className="text-gray-400 text-xs">Non</span> },
            ]}
            rows={sanctions}
            emptyLabel="Aucune sanction décidée"
          />
        </SectionBlock>
      </div>

      <SectionBlock title="Sanctionner un incident" description="La sanction notifie automatiquement les parents/tuteurs">
        <ModalForm
          trigger={<CreateButton label="Sanctionner un incident" />}
          title="Décider une sanction"
          fields={[
            { name: 'incidentId', label: 'Incident', type: 'select', options: incidents.map((i: any) => { const e = eleves.find((x: any) => x.id === i.eleveId); return { value: i.id, label: `${e?.prenom ?? ''} ${e?.nom ?? ''} — ${i.type} (${formatDate(i.dateHeure)})` }; }), required: true },
            { name: 'type', label: 'Type de sanction', type: 'select', options: [
              { value: 'avertissement', label: 'Avertissement' },
              { value: 'retenue', label: 'Retenue' },
              { value: 'exclusion', label: 'Exclusion' },
              { value: 'convocation', label: 'Convocation parent' },
            ], required: true },
            { name: 'description', label: 'Description', type: 'textarea', required: true },
          ]}
          action={actions.sanctionner}
        />
      </SectionBlock>
    </div>
  );
}
