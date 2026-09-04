'use client';

// ====================================================================
// Portail Parent — F1 : données déjà filtrées côté serveur (mesEnfants,
// mesBulletins, mesEcheances, mesRdvs). Plus AUCUNE donnée d'enfants
// d'autres familles dans le payload, plus de repli « premier élève ».
// F13 : réservation/annulation de RDV + justification d'absence en ligne.
// ====================================================================

import { useState } from 'react';
import { Wallet, BookOpen, Bell, CalendarDays } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, EmptyState, ModalForm, useActionFeedback } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import { formatXOF, formatDate, formatDateTime } from '@/lib/format';

export default function ParentPortalModule({ initialData, mode = 'full' }: { initialData: any; mode?: 'dashboard' | 'full' }) {
  const mesEnfants: any[] = initialData.mesEnfants ?? [];
  const mesBulletins: any[] = initialData.mesBulletins ?? [];
  const mesEcheances: any[] = initialData.mesEcheances ?? [];
  const mesRdvs: any[] = initialData.mesRdvs ?? [];
  const creneauxDisponibles: any[] = (initialData.creneauxRdv ?? []).filter((c: any) => c.statut === 'disponible');
  const notifications: any[] = initialData.notifications ?? [];
  const kpi = initialData.kpi ?? {};

  const [enfantActifId, setEnfantActifId] = useState<string | null>(null);
  const { run, Message, pending } = useActionFeedback();
  const enfant = mesEnfants.find((e: any) => e.id === enfantActifId) ?? mesEnfants[0] ?? null;
  const enfantBulletins = enfant ? mesBulletins.filter((b: any) => b.eleveId === enfant.id) : [];
  const enfantEcheances = enfant ? mesEcheances.filter((e: any) => e.eleveId === enfant.id) : [];
  const enfantRdvs = enfant ? mesRdvs.filter((r: any) => r.eleveId === enfant.id) : [];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Portail Parent"
        subtitle={enfant ? `Vous suivez ${enfant.prenom} ${enfant.nom} · ${enfant.classeActuelle?.libelle ?? '—'}` : 'Aucun enfant associé à votre compte'}
      />

      {Message}

      {mesEnfants.length === 0 ? (
        <EmptyState
          title="Aucun enfant rattaché à votre compte"
          description="Contactez le secrétariat de l'établissement pour rattacher votre compte à votre (vos) enfant(s)."
        />
      ) : (
        <>
          {mesEnfants.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {mesEnfants.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => setEnfantActifId(e.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    enfant?.id === e.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:border-emerald-300'
                  }`}
                >
                  {e.prenom} {e.nom}
                </button>
              ))}
            </div>
          )}

          {/* KPI serveur */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Restant dû" value={formatXOF(kpi.totalDu ?? 0)} sub="tous enfants" icon={<Wallet className="h-4 w-4" />} />
            <StatCard title="Bulletins publiés" value={String(mesBulletins.length)} sub="année en cours" icon={<BookOpen className="h-4 w-4" />} />
            <StatCard title="Rendez-vous" value={String(mesRdvs.length)} sub="avec les enseignants" icon={<CalendarDays className="h-4 w-4" />} />
            <StatCard title="Notifications" value={String(notifications.length)} sub="reçues" icon={<Bell className="h-4 w-4" />} />
          </div>

          {/* Dernier bulletin */}
          <SectionBlock title="Dernier bulletin">
            {enfantBulletins[0] ? (
              <div className="rounded-lg border p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{enfantBulletins[0].periode?.libelle ?? 'Période'}</div>
                  <div className="text-xs text-gray-500">Publié le {formatDate(enfantBulletins[0].datePublication)}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{enfantBulletins[0].moyenneGenerale?.toFixed(2) ?? '—'}/20</div>
                  <div className="text-xs text-gray-500">Rang {enfantBulletins[0].rang ?? '—'}</div>
                </div>
              </div>
            ) : (
              <EmptyState title="Aucun bulletin publié" description="Les bulletins apparaîtront ici dès leur publication." />
            )}
          </SectionBlock>

          {/* Échéances */}
          <SectionBlock title="Échéances de paiement">
            <DataTable
              columns={[
                { key: 'frais', label: 'Frais', render: (e: any) => e.frais?.libelle ?? '—' },
                { key: 'date', label: 'Échéance', render: (e: any) => formatDate(e.dateEcheance) },
                { key: 'net', label: 'Montant', render: (e: any) => formatXOF((e.montant ?? 0) - (e.remise ?? 0)) },
                { key: 'paye', label: 'Payé', render: (e: any) => formatXOF(e.montantPaye) },
                { key: 'restant', label: 'Restant', render: (e: any) => formatXOF(Math.max(0, (e.montant ?? 0) - (e.remise ?? 0) - (e.montantPaye ?? 0))) },
                { key: 'statut', label: 'Statut', render: (e: any) => <StatusBadge statut={e.statut} /> },
              ]}
              rows={enfantEcheances}
            />
          </SectionBlock>

          {/* F13 — RDV : réservation en ligne par le parent */}
          <SectionBlock
            title="Rendez-vous enseignants"
            action={
              creneauxDisponibles.length > 0 ? (
                <ModalForm
                  title="Réserver un rendez-vous"
                  action={actions.reserverRdv}
                  trigger={<button className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5">Réserver un créneau</button>}
                  fields={[
                    { name: 'creneauRdvId', label: 'Créneau', type: 'select', required: true,
                      options: creneauxDisponibles.slice(0, 30).map((c: any) => ({
                        value: c.id,
                        label: `${formatDate(c.date)} ${c.heureDebut}–${c.heureFin} · ${c.personnel ? `${c.personnel.prenom} ${c.personnel.nom}` : '—'}`,
                      })) },
                    ...(enfant ? [{ name: 'eleveId', label: 'Enfant', type: 'hidden' as const, defaultValue: enfant.id }] : []),
                    { name: 'motif', label: 'Motif', type: 'textarea' },
                  ]}
                />
              ) : undefined
            }
          >
            <DataTable
              columns={[
                { key: 'date', label: 'Date', render: (r: any) => formatDate(r.creneauRdv?.date) },
                { key: 'horaire', label: 'Horaire', render: (r: any) => (r.creneauRdv ? `${r.creneauRdv.heureDebut}–${r.creneauRdv.heureFin}` : '—') },
                { key: 'enseignant', label: 'Enseignant', render: (r: any) => (r.creneauRdv?.personnel ? `${r.creneauRdv.personnel.prenom} ${r.creneauRdv.personnel.nom}` : '—') },
                { key: 'motif', label: 'Motif', render: (r: any) => r.motif ?? '—' },
                { key: 'statut', label: 'Statut', render: (r: any) => <StatusBadge statut={r.statut} /> },
                { key: 'action', label: 'Action', render: (r: any) =>
                  r.statut === 'confirme' ? (
                    <button onClick={() => run(() => actions.annulerRdv(r.id), 'Rendez-vous annulé — le créneau est libéré.')} disabled={pending} className="text-xs text-rose-600 hover:underline">
                      Annuler
                    </button>
                  ) : '—' },
              ]}
              rows={enfantRdvs}
            />
          </SectionBlock>

          {/* F13 — justification d'absence en ligne */}
          {enfant && (
            <SectionBlock
              title="Justifier une absence"
              description="Les justifications soumises en ligne sont validées par la vie scolaire ; l'absence passe alors en « excusé »."
              action={
                <ModalForm
                  title={`Justifier une absence — ${enfant.prenom} ${enfant.nom}`}
                  action={actions.justifierAbsence}
                  trigger={<button className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5">Soumettre une justification</button>}
                  fields={[
                    { name: 'eleveId', label: 'Enfant', type: 'hidden', defaultValue: enfant.id },
                    { name: 'dateAbsence', label: "Date de l'absence", type: 'date', required: true },
                    { name: 'motif', label: 'Motif', type: 'select', required: true,
                      options: [
                        { value: 'maladie', label: 'Maladie' },
                        { value: 'familial', label: 'Raison familiale' },
                        { value: 'rendez_vous_medical', label: 'Rendez-vous médical' },
                        { value: 'ceremonie', label: 'Cérémonie' },
                        { value: 'transport', label: 'Problème de transport' },
                        { value: 'autre', label: 'Autre' },
                      ] },
                    { name: 'dureeHeures', label: 'Durée (heures)', type: 'number', step: '1' },
                    { name: 'description', label: 'Précisions', type: 'textarea' },
                  ]}
                />
              }
            >
              <p className="text-sm text-gray-500">Aucun justificatif papier requis au dépôt : la vie scolaire peut vous contacter pour pièces complémentaires.</p>
            </SectionBlock>
          )}

          {/* Notifications */}
          <SectionBlock title="Notifications">
            <DataTable
              columns={[
                { key: 'sujet', label: 'Sujet', render: (n: any) => n.sujet ?? '—' },
                { key: 'corps', label: 'Message', render: (n: any) => (n.corps ?? '').slice(0, 80) },
                { key: 'date', label: 'Reçue le', render: (n: any) => formatDateTime(n.dateEnvoi ?? n.dateCreation) },
              ]}
              rows={notifications.slice(0, 8)}
            />
          </SectionBlock>
        </>
      )}
    </div>
  );
}
