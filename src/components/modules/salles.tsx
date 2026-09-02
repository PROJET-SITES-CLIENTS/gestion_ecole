'use client';

// ====================================================================
// Module Salles & Calendrier scolaire officiel
// ====================================================================

import { useState, useTransition } from 'react';
import { Building, CalendarDays, CalendarClock } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import * as actions from '@/app/actions';
import { formatDate } from '@/lib/format';

export default function SallesModule({ initialData }: { initialData: any }) {
  const salles = initialData.salles ?? [];
  const reservations = initialData.reservations ?? [];
  const calendrier = initialData.calendrier ?? [];
  const emploisTemps = initialData.emploisTemps ?? [];
  const classes = initialData.classes ?? [];
  const matieres = initialData.matieres ?? [];
  const personnels = initialData.personnels ?? [];
  const anneeScolaire = initialData.anneeScolaire ?? null;
  const [pending, startTransition] = useTransition();
  const [messageAnnee, setMessageAnnee] = useState<string | null>(null);

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


      <SectionBlock
        title="Éditeur d'emploi du temps (avec détection de conflits)"
        description="Créneaux hebdomadaires — toute collision salle / enseignant / classe sur la même tranche horaire est refusée"
        action={
          <ModalForm
            trigger={<CreateButton label="Ajouter un créneau" />}
            title="Nouveau créneau hebdomadaire"
            fields={[
              { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })), required: true },
              { name: 'matiereId', label: 'Matière', type: 'select', options: matieres.map((m: any) => ({ value: m.id, label: m.libelle })) },
              { name: 'enseignantId', label: 'Enseignant', type: 'select', options: personnels.map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })) },
              { name: 'salleId', label: 'Salle', type: 'select', options: salles.map((s: any) => ({ value: s.id, label: s.nom })) },
              { name: 'jour', label: 'Jour', type: 'select', options: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].map((j) => ({ value: j, label: j.charAt(0).toUpperCase() + j.slice(1) })), required: true },
              { name: 'heureDebut', label: 'Début (HH:MM)', required: true, placeholder: '08:00' },
              { name: 'heureFin', label: 'Fin (HH:MM)', required: true, placeholder: '10:00' },
              { name: 'dateDebut', label: 'Effective à partir du', type: 'date', required: true },
            ]}
            action={actions.creerCreneauEdt}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'jour', label: 'Jour' },
            { key: 'classe', label: 'Classe', render: (e) => classes.find((c: any) => c.id === e.classeId)?.libelle ?? '—' },
            { key: 'matiere', label: 'Matière', render: (e) => matieres.find((m: any) => m.id === e.matiereId)?.libelle ?? '—' },
            { key: 'enseignant', label: 'Enseignant', render: (e) => { const p = personnels.find((x: any) => x.id === e.enseignantId); return p ? `${p.prenom} ${p.nom}` : '—'; } },
            { key: 'salle', label: 'Salle', render: (e) => salles.find((s: any) => s.id === e.salleId)?.nom ?? '—' },
            { key: 'horaire', label: 'Horaire', render: (e) => `${e.heureDebut} – ${e.heureFin}` },
            { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
          ]}
          rows={emploisTemps}
          emptyLabel="Aucun créneau défini — ajoutez le premier créneau de l'emploi du temps"
        />
      </SectionBlock>

      <SectionBlock
        title="Transition d'année scolaire"
        description="Clôture de l'année courante, historisation des affectations, montée de niveau des élèves et ouverture de l'année suivante"
        action={
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !anneeScolaire}
            onClick={() => startTransition(async () => {
              setMessageAnnee(null);
              const r = await actions.cloturerAnneeScolaire(anneeScolaire.id);
              setMessageAnnee(r?.ok
                ? `✓ Année ${r.libelle} ouverte : ${r.montes} élève(s) promu(s), ${r.dernierNiveau} en fin de cycle, historique créé.`
                : `✗ ${r?.error ?? 'Erreur'}`);
            })}
          >
            <CalendarClock className="h-3 w-3 mr-1" />Clôturer {anneeScolaire?.libelle ?? 'l\'année'}
          </Button>
        }
      >
        {messageAnnee && (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{messageAnnee}</div>
        )}
        <p className="text-sm text-gray-600">
          Année active : <span className="font-medium">{anneeScolaire?.libelle ?? '—'}</span>.
          Cette opération irréversible archive l'année en cours, enregistre l'historique de classe de chaque élève,
          fait monter les élèves au niveau supérieur lorsqu'il existe et notifie la direction.
        </p>
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
