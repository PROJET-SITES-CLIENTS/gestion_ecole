'use client';

// ====================================================================
// Module Salles & Calendrier scolaire officiel
// ====================================================================

import { useTransition } from 'react';
import { Building, CalendarDays } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import { formatDate } from '@/lib/format';

export default function SallesModule({ initialData }: { initialData: any }) {
  const salles = initialData.salles ?? [];
  const reservations = initialData.reservations ?? [];
  const calendrier = initialData.calendrier ?? [];
  const [pending, startTransition] = useTransition();

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Salles & Calendrier scolaire" subtitle="Ressources physiques et calendrier officiel" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Salles" value={salles.length} icon={Building} color="emerald" />
        <StatCard title="Réservations" value={reservations.length} icon={CalendarDays} color="blue" />
        <StatCard title="Entrées calendrier" value={calendrier.length} sub="jours fériés, vacances, journées pédagogiques" icon={CalendarDays} color="purple" />
        <StatCard title="Jours non travaillés" value={calendrier.filter((c: any) => c.type === 'jour_ferie' || c.type === 'vacances').length} icon={CalendarDays} color="amber" />
      </div>

      <SectionBlock
        title="Salles"
        description="Capacité et équipements"
        action={
          <ModalForm
            trigger={<CreateButton label="Ajouter une salle" />}
            title="Ajouter une salle"
            fields={[
              { name: 'nom', label: 'Nom', required: true, placeholder: 'A103' },
              { name: 'type', label: 'Type', type: 'select', options: [
                { value: 'classe', label: 'Classe' },
                { value: 'labo', label: 'Laboratoire' },
                { value: 'informatique', label: 'Salle informatique' },
                { value: 'sport', label: 'Gymnase / Sport' },
                { value: 'polyvalente', label: 'Polyvalente' },
              ], required: true },
              { name: 'capacite', label: 'Capacité', type: 'number', required: true },
              { name: 'equipements', label: 'Équipements (séparés par virgule)', placeholder: 'videoprojecteur, tableau' },
            ]}
            action={actions.creerSalle}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'nom', label: 'Nom' },
            { key: 'type', label: 'Type' },
            { key: 'capacite', label: 'Capacité' },
            { key: 'equipements', label: 'Équipements', render: (s) => JSON.parse(s.equipements || '[]').join(', ') || '—' },
          ]}
          rows={salles}
          emptyLabel="Aucune salle enregistrée"
        />
      </SectionBlock>

      <SectionBlock
        title="Calendrier scolaire officiel"
        description="Jours fériés, vacances, journées pédagogiques — bloquent la planification par défaut"
        action={
          <ModalForm
            trigger={<CreateButton label="Ajouter au calendrier" />}
            title="Ajouter une entrée de calendrier"
            fields={[
              { name: 'type', label: 'Type', type: 'select', options: [
                { value: 'jour_ferie', label: 'Jour férié' },
                { value: 'vacances', label: 'Vacances' },
                { value: 'journee_pedagogique', label: 'Journée pédagogique' },
                { value: 'evenement', label: 'Événement' },
              ], required: true },
              { name: 'libelle', label: 'Libellé', required: true },
              { name: 'dateDebut', label: 'Date de début', type: 'date', required: true },
              { name: 'dateFin', label: 'Date de fin', type: 'date', required: true },
            ]}
            action={actions.ajouterCalendrier}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'libelle', label: 'Libellé' },
            { key: 'type', label: 'Type', render: (c) => <StatusBadge statut={c.type === 'jour_ferie' ? 'absent' : c.type === 'vacances' ? 'en_attente' : 'planifiee'} /> },
            { key: 'dateDebut', label: 'Du', render: (c) => formatDate(c.dateDebut) },
            { key: 'dateFin', label: 'Au', render: (c) => formatDate(c.dateFin) },
          ]}
          rows={calendrier}
          emptyLabel="Aucune entrée au calendrier"
        />
      </SectionBlock>

      <SectionBlock title="Réservations de salles" description="Réservations ponctuelles et liées aux séances">
        <DataTable
          columns={[
            { key: 'salle', label: 'Salle', render: (r) => salles.find((s: any) => s.id === r.salleId)?.nom ?? '—' },
            { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
            { key: 'heureDebut', label: 'De' },
            { key: 'heureFin', label: 'À' },
            { key: 'motif', label: 'Motif' },
          ]}
          rows={reservations}
          emptyLabel="Aucune réservation"
        />
      </SectionBlock>
    </div>
  );
}
