'use client';

// ====================================================================
// Module Communication — notifications + modèles de messages
// ====================================================================

import { useTransition } from 'react';
import { MessageSquare, Send, FileText } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import { formatDateTime } from '@/lib/format';

export default function CommunicationModule({ initialData }: { initialData: any }) {
  const notifications = initialData.notifications ?? [];
  const modeles = initialData.modelesMessage ?? [];
  const utilisateurs = initialData.utilisateurs ?? [];
  const [pending, startTransition] = useTransition();

  const notifEnvoyees = notifications.filter((n: any) => n.statut === 'envoye').length;
  const notifLues = notifications.filter((n: any) => n.dateLecture).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Communication & Notifications"
        subtitle="Moteur de notifications, modèles paramétrables, canaux SMS/email/push/in_app"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Notifications envoyées" value={notifEnvoyees} icon={Send} color="emerald" />
        <StatCard title="Notifications lues" value={notifLues} sub={`${notifEnvoyees > 0 ? Math.round(notifLues / notifEnvoyees * 100) : 0}% de taux de lecture`} icon={MessageSquare} color="blue" />
        <StatCard title="Modèles actifs" value={modeles.filter((m: any) => m.actif).length} icon={FileText} color="purple" />
        <StatCard title="Canaux configurés" value="4" sub="SMS, email, push, in_app" icon={Send} color="amber" />
      </div>

      <SectionBlock
        title="Notifications récentes"
        description="Toutes notifications émises"
        action={
          <ModalForm
            trigger={<CreateButton label="Envoyer une notification" />}
            title="Envoyer une notification"
            fields={[
              { name: 'destinataireType', label: 'Type destinataire', type: 'select', options: [
                { value: 'personnel', label: 'Personnel' },
                { value: 'parent', label: 'Parent' },
                { value: 'eleve', label: 'Élève' },
              ], required: true },
              { name: 'destinataireId', label: 'Destinataire (optionnel)', type: 'select', options: utilisateurs.map((u: any) => ({ value: u.id, label: `${u.prenom} ${u.nom}` })) },
              { name: 'sujet', label: 'Sujet', required: true },
              { name: 'corps', label: 'Message', type: 'textarea', required: true },
              { name: 'canal', label: 'Canal', type: 'select', options: [
                { value: 'in_app', label: 'In-app' },
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
                { value: 'push', label: 'Push' },
              ], required: true },
            ]}
            action={actions.envoyerNotification}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'sujet', label: 'Sujet' },
            { key: 'corps', label: 'Message', render: (n) => <span className="line-clamp-2 text-xs text-gray-600">{n.corps}</span> },
            { key: 'canal', label: 'Canal', render: (n) => <Badge variant="outline" className="text-xs">{n.canal}</Badge> },
            { key: 'statut', label: 'Statut', render: (n) => <StatusBadge statut={n.statut} /> },
            { key: 'dateEnvoi', label: 'Date', render: (n) => formatDateTime(n.dateEnvoi) },
          ]}
          rows={notifications}
          emptyLabel="Aucune notification envoyée"
        />
      </SectionBlock>

      <SectionBlock
        title="Modèles de messages"
        description="Templates paramétrables avec placeholders {{eleve_nom}}, {{echeance_montant}}, etc."
        action={
          <ModalForm
            trigger={<CreateButton label="Créer un modèle" />}
            title="Créer un modèle de message"
            fields={[
              { name: 'code', label: 'Code unique', required: true, placeholder: 'rappel_echeance' },
              { name: 'sujet', label: 'Sujet', required: true, placeholder: 'Rappel : échéance de {{frais_libelle}}' },
              { name: 'corps', label: 'Corps du message', type: 'textarea', required: true, placeholder: 'Bonjour {{parent_prenom}}, ...' },
              { name: 'canaux', label: 'Canaux (séparés par virgule)', defaultValue: 'in_app', placeholder: 'sms,email,in_app' },
            ]}
            action={actions.creerModeleMessage}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'sujet', label: 'Sujet' },
            { key: 'canaux', label: 'Canaux', render: (m) => JSON.parse(m.canaux || '[]').join(', ') },
            { key: 'langue', label: 'Langue' },
            { key: 'actif', label: 'Statut', render: (m) => m.actif ? <StatusBadge statut="actif" /> : <StatusBadge statut="resilie" /> },
          ]}
          rows={modeles}
          emptyLabel="Aucun modèle défini"
        />
      </SectionBlock>
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
