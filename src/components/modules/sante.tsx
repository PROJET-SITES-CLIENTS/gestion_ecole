'use client';

// ====================================================================
// Module Santé & Infirmerie (P2)
// - Fiches santé (allergies, traitements, urgence, autorisation)
// - Passages à l'infirmerie (issue sensible → vraie notification parents)
// - Vaccinations (rappels)
// ====================================================================

import { useTransition } from 'react';
import { HeartPulse, Stethoscope, Syringe, AlertTriangle } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import { formatDate, formatDateTime } from '@/lib/format';

export default function SanteModule({ initialData }: { initialData: any }) {
  const fichesSante = initialData.fichesSante ?? [];
  const passages = initialData.passagesInfirmerie ?? [];
  const vaccinations = initialData.vaccinations ?? [];
  const eleves = initialData.eleves ?? [];
  const [pending, startTransition] = useTransition();

  const nomEleve = (id: string) => {
    const e = eleves.find((x: any) => x.id === id);
    return e ? `${e.prenom} ${e.nom}` : '—';
  };

  const issuesSensibles = passages.filter((p: any) => p.issue !== 'retour_classe').length;
  const rappelsAVenir = vaccinations.filter((v: any) => v.dateRappel && new Date(v.dateRappel) > new Date()).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Santé & Infirmerie"
        subtitle="Fiches santé, passages à l'infirmerie, vaccinations et rappels"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Fiches santé" value={fichesSante.length} sub={`${eleves.length} élèves`} icon={HeartPulse} color="rose" />
        <StatCard title="Passages infirmerie" value={passages.length} icon={Stethoscope} color="emerald" />
        <StatCard title="Issues sensibles" value={issuesSensibles} sub="parents notifiés automatiquement" icon={AlertTriangle} color="amber" />
        <StatCard title="Rappels vaccins à venir" value={rappelsAVenir} icon={Syringe} color="blue" />
      </div>

      <SectionBlock
        title="Passages à l'infirmerie"
        description="Chaque passage avec issue sensible (retour domicile, hôpital, parents contactés) déclenche une notification réelle aux parents et à la direction"
        action={
          <ModalForm
            trigger={<CreateButton label="Enregistrer un passage" />}
            title="Nouveau passage à l'infirmerie"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'motif', label: 'Motif du passage', required: true, placeholder: 'Douleur abdominale, chute…' },
              { name: 'symptomes', label: 'Symptômes observés', type: 'textarea' },
              { name: 'soinsAdministres', label: 'Soins administrés', type: 'textarea' },
              { name: 'temperature', label: 'Température (°C)', type: 'number', step: '0.1' },
              { name: 'issue', label: 'Issue', type: 'select', options: [
                { value: 'retour_classe', label: 'Retour en classe' },
                { value: 'parents_contactes', label: 'Parents contactés' },
                { value: 'retour_domicile', label: 'Retour au domicile' },
                { value: 'depart_hopital', label: 'Départ hôpital' },
              ], required: true },
              { name: 'notifierParents', label: 'Notifier les parents (in_app)', type: 'checkbox' },
            ]}
            action={actions.enregistrerPassageInfirmerie}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (p) => nomEleve(p.eleveId) },
            { key: 'datePassage', label: 'Passage', render: (p) => formatDateTime(p.datePassage) },
            { key: 'motif', label: 'Motif' },
            { key: 'soinsAdministres', label: 'Soins', render: (p) => <span className="text-xs text-gray-600 line-clamp-1">{p.soinsAdministres ?? '—'}</span> },
            { key: 'temperature', label: 'T°', render: (p) => p.temperature ? `${p.temperature}°` : '—' },
            { key: 'issue', label: 'Issue', render: (p) => <StatusBadge statut={p.issue} /> },
            { key: 'parentsNotifies', label: 'Parents notifiés', render: (p) => p.parentsNotifies ? <span className="text-emerald-600 text-xs">✓</span> : '—' },
          ]}
          rows={passages}
          emptyLabel="Aucun passage enregistré"
        />
      </SectionBlock>

      <SectionBlock
        title="Fiches santé"
        description="Données médicales confidentielles — allergies, traitements, contacts d'urgence"
        action={
          <ModalForm
            trigger={<CreateButton label="Compléter une fiche santé" />}
            title="Fiche santé de l'élève"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'groupeSanguin', label: 'Groupe sanguin', type: 'select', options: ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((g) => ({ value: g, label: g })) },
              { name: 'allergies', label: 'Allergies', type: 'textarea', placeholder: 'Arachides, pénicilline…' },
              { name: 'traitementsEnCours', label: 'Traitements en cours', type: 'textarea' },
              { name: 'antecedents', label: 'Antécédents médicaux', type: 'textarea' },
              { name: 'medecinTraitant', label: 'Médecin traitant' },
              { name: 'telephoneUrgence', label: 'Téléphone d\'urgence' },
              { name: 'contactUrgenceNom', label: 'Contact d\'urgence (nom)' },
              { name: 'autorisationTraitement', label: 'Autorisation de traitement d\'urgence', type: 'checkbox' },
            ]}
            action={actions.enregistrerFicheSante}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (f) => nomEleve(f.eleveId) },
            { key: 'groupeSanguin', label: 'Groupe', render: (f) => f.groupeSanguin ?? '—' },
            { key: 'allergies', label: 'Allergies', render: (f) => <span className="text-xs text-gray-600 line-clamp-1">{f.allergies ?? '—'}</span> },
            { key: 'traitementsEnCours', label: 'Traitements', render: (f) => <span className="text-xs text-gray-600 line-clamp-1">{f.traitementsEnCours ?? '—'}</span> },
            { key: 'telephoneUrgence', label: 'Urgence' },
            { key: 'autorisationTraitement', label: 'Autor. soins', render: (f) => f.autorisationTraitement ? <span className="text-emerald-600 text-xs">✓</span> : <span className="text-gray-400 text-xs">✗</span> },
            { key: 'dateMiseAJour', label: 'Maj', render: (f) => formatDate(f.dateMiseAJour) },
          ]}
          rows={fichesSante}
          emptyLabel="Aucune fiche santé renseignée"
        />
      </SectionBlock>

      <SectionBlock
        title="Vaccinations"
        description="Suivi des vaccins et rappels"
        action={
          <ModalForm
            trigger={<CreateButton label="Enregistrer un vaccin" />}
            title="Vaccination"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'vaccin', label: 'Vaccin', required: true, placeholder: 'BCG, DTAP, Rougeole…' },
              { name: 'dateVaccination', label: 'Date de vaccination', type: 'date' },
              { name: 'dateRappel', label: 'Date de rappel', type: 'date' },
            ]}
            action={actions.enregistrerVaccination}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (v) => nomEleve(v.eleveId) },
            { key: 'vaccin', label: 'Vaccin' },
            { key: 'dateVaccination', label: 'Vacciné le', render: (v) => v.dateVaccination ? formatDate(v.dateVaccination) : '—' },
            { key: 'dateRappel', label: 'Rappel prévu', render: (v) => v.dateRappel ? formatDate(v.dateRappel) : '—' },
            { key: 'statut', label: 'Statut', render: (v) => <StatusBadge statut={v.statut === 'a_jour' ? 'payee' : v.statut === 'rappel_prevu' ? 'partiel' : 'impayee'} label={v.statut} /> },
          ]}
          rows={vaccinations}
          emptyLabel="Aucune vaccination enregistrée"
        />
      </SectionBlock>
    </div>
  );
}
