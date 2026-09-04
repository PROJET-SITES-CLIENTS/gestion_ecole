'use client';

// ====================================================================
// Module RDV parents-professeurs + réunions collectives
// ====================================================================

import { CalendarDays, Clock, Users } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import * as actions from '@/app/actions';
import { formatDate, formatDateTime } from '@/lib/format';

export default function RdvModule({ initialData }: { initialData: any }) {
  const creneaux = initialData.creneauxRdv ?? [];
  const rdvs = initialData.rdvs ?? [];
  const reunions = initialData.reunionsCollectives ?? [];
  const personnels = initialData.personnels ?? [];
  const classes = initialData.classes ?? [];
  const retourRdvs = useActionFeedback();

  const creneauxDisponibles = creneaux.filter((c: any) => c.statut === 'disponible').length;
  const rdvsAVenir = rdvs.filter((r: any) => r.statut === 'confirme').length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Rendez-vous parents-professeurs"
        subtitle="Créneaux individuels + réunions collectives de classe"
        actions={
          <ModalForm
            trigger={<CreateButton label="Ouvrir un créneau" />}
            title="Ouvrir un créneau de disponibilité"
            fields={[
              { name: 'personnelId', label: 'Enseignant', type: 'select', options: personnels.map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })), required: true },
              { name: 'date', label: 'Date', type: 'date', required: true },
              { name: 'heureDebut', label: 'Heure début', required: true, placeholder: '16:00' },
              { name: 'heureFin', label: 'Heure fin', required: true, placeholder: '16:15' },
              { name: 'lieu', label: 'Lieu', type: 'select', options: [{ value: 'presentiel', label: 'Présentiel' }, { value: 'visio', label: 'Visio' }] },
            ]}
            action={actions.ouvrirCreneauRdv}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Créneaux disponibles" value={creneauxDisponibles} icon={Clock} color="emerald" />
        <StatCard title="RDV confirmés" value={rdvsAVenir} icon={CalendarDays} color="blue" />
        <StatCard title="Réunions collectives" value={reunions.length} icon={Users} color="purple" />
        <StatCard title="Créneaux réservés" value={creneaux.filter((c: any) => c.statut === 'reserve').length} icon={CalendarDays} color="amber" />
      </div>

      <SectionBlock title="Créneaux individuels">
        <DataTable
          columns={[
            { key: 'personnel', label: 'Enseignant', render: (c) => { const p = personnels.find((x: any) => x.id === c.personnelId); return p ? `${p.prenom} ${p.nom}` : '—'; } },
            { key: 'date', label: 'Date', render: (c) => formatDate(c.date) },
            { key: 'heureDebut', label: 'Heure' },
            { key: 'lieu', label: 'Lieu' },
            { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} /> },
          ]}
          rows={creneaux}
          emptyLabel="Aucun créneau ouvert"
        />
      </SectionBlock>

      <SectionBlock title="RDV individuels réservés" description="Rappel automatique notifié 24h avant">
        {retourRdvs.Message}
        <DataTable
          columns={[
            { key: 'personnel', label: 'Enseignant', render: (r) => { const c = creneaux.find((x: any) => x.id === r.creneauRdvId); const p = c ? personnels.find((y: any) => y.id === c.personnelId) : null; return p ? `${p.prenom} ${p.nom}` : '—'; } },
            { key: 'date', label: 'Date', render: (r) => { const c = creneaux.find((x: any) => x.id === r.creneauRdvId); return c ? formatDate(c.date) : '—'; } },
            { key: 'motif', label: 'Motif' },
            { key: 'statut', label: 'Statut', render: (r) => <StatusBadge statut={r.statut} /> },
            { key: 'createdAt', label: 'Réservé le', render: (r) => formatDate(r.createdAt) },
            {
              key: 'actions', label: 'Action', render: (r) => r.statut === 'confirme' ? (
                <Button size="sm" variant="outline" disabled={retourRdvs.pending} onClick={() => retourRdvs.run(() => actions.annulerRdv(r.id), 'Rendez-vous annulé')}>
                  Annuler
                </Button>
              ) : null,
            },
          ]}
          rows={rdvs}
          emptyLabel="Aucun RDV réservé"
        />
      </SectionBlock>

      <SectionBlock title="Réunions collectives parents-profs" description="Réunions de classe entières">
        <DataTable
          columns={[
            { key: 'classe', label: 'Classe', render: (r) => classes.find((c: any) => c.id === r.classeId)?.libelle ?? '—' },
            { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
            { key: 'heure', label: 'Heure' },
            { key: 'lieu', label: 'Lieu' },
            { key: 'description', label: 'Description' },
          ]}
          rows={reunions}
          emptyLabel="Aucune réunion collective planifiée"
        />
      </SectionBlock>
    </div>
  );
}
