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
  const mesJustifications: any[] = initialData.mesJustifications ?? [];
  const cahiersPublies: any[] = initialData.cahiersPublies ?? [];
  const creneauxDisponibles: any[] = (initialData.creneauxRdv ?? []).filter((c: any) => c.statut === 'disponible');
  const notifications: any[] = initialData.notifications ?? [];
  const kpi = initialData.kpi ?? {};

  const [enfantActifId, setEnfantActifId] = useState<string | null>(null);
  const { run, Message, pending } = useActionFeedback();
  const enfant = mesEnfants.find((e: any) => e.id === enfantActifId) ?? mesEnfants[0] ?? null;
  const mesPresences: any[] = (initialData.mesPresences ?? []).filter((p: any) => !enfant || p.eleveId === enfant.id);
  const mesDevoirs: any[] = (initialData.mesDevoirs ?? []).filter((d: any) => !enfant || d.classeId === enfant.classeActuelleId);
  const mesPaiements: any[] = (initialData.mesPaiements ?? []).filter((p: any) => !enfant || p.eleveId === enfant.id);
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

          {/* ── AUDIT PARENT : absences & justifications en ligne ── */}
          <SectionBlock title="Absences et retards" description="Suivi d'assiduité — justifiez en ligne une absence non couverte.">
            <DataTable
              columns={[
                { key: 'date', label: 'Date', render: (p: any) => formatDate(p.dateSaisie) },
                { key: 'type', label: 'Type', render: (p: any) => <StatusBadge statut={p.statut} label={p.statut === 'absent' ? 'Absent' : 'Retard'} /> },
                { key: 'matiere', label: 'Matière', render: (p: any) => p.seance?.matiere?.libelle ?? '—' },
                { key: 'justif', label: 'Justification', render: (p: any) => {
                  const j = mesJustifications.find((x: any) => x.presenceId === p.id);
                  if (!j) return (
                    <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget);
                      fd.set('eleveId', p.eleveId); fd.set('dateAbsence', new Date(p.dateSaisie).toISOString().slice(0, 10));
                      fd.set('motif', 'maladie'); run(() => actions.justifierAbsence(fd), 'Justification envoyée'); }}>
                      <input name="description" placeholder="Motif" className="h-7 w-28 text-xs border rounded px-1" />
                      <button className="text-xs text-emerald-700 font-semibold">Justifier</button>
                    </form>
                  );
                  return <StatusBadge statut={j.statut ?? 'en_attente'} label={j.statut === 'acceptee' ? '✓ Acceptée' : j.statut === 'refusee' ? '✗ Refusée' : 'En attente'} />;
                } },
              ]}
              rows={mesPresences.slice(0, 20)}
              emptyLabel="Aucune absence ni retard — félicitations !"
            />
          </SectionBlock>

          {/* ── AUDIT PARENT : cahier de textes publié aux familles ── */}
          <SectionBlock title="Cahier de textes" description="Contenu des cours et travail à faire, publiés par les enseignants.">
            <div className="space-y-2">
              {cahiersPublies.slice(0, 12).map((c: any) => {
                let entrees: any[] = [];
                try { entrees = JSON.parse(c.entrees || '[]'); } catch { /* vide */ }
                const derniere = entrees[entrees.length - 1];
                return (
                  <div key={c.id} className="border rounded-lg p-3">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <b>{c.classe?.libelle ?? ''} — {c.matiere?.libelle ?? 'Général'}</b>
                      <span className="text-xs text-gray-500">{derniere?.dateCours ? formatDate(derniere.dateCours) : formatDate(c.dateCreation)}</span>
                    </div>
                    {derniere?.contenu && <p className="text-sm text-gray-700 mt-1">{derniere.contenu}</p>}
                    {derniere?.travailAFaire && (
                      <p className="text-sm mt-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        <b>Travail à faire :</b> {derniere.travailAFaire}
                      </p>
                    )}
                  </div>
                );
              })}
              {cahiersPublies.length === 0 && <p className="text-sm text-gray-500">Aucune publication pour le moment.</p>}
            </div>
          </SectionBlock>

          {/* ── AUDIT PARENT : devoirs à venir ── */}
          <SectionBlock title="Devoirs et travail à la maison" description="Échéances à venir par matière.">
            <DataTable
              columns={[
                { key: 'intitule', label: 'Devoir' },
                { key: 'matiere', label: 'Matière', render: (d: any) => d.matiere?.libelle ?? '—' },
                { key: 'date', label: 'À rendre le', render: (d: any) => formatDate(d.dateRendu) },
                { key: 'type', label: 'Type', render: (d: any) => ({ devoir: 'Devoir', dm: 'Devoir maison', projet: 'Projet', expose: 'Exposé' }[d.type as string] ?? d.type) },
              ]}
              rows={mesDevoirs}
              emptyLabel="Aucun devoir à venir"
            />
          </SectionBlock>

          {/* ── AUDIT PARENT : historique des paiements ── */}
          <SectionBlock title="Historique des paiements" description="Vos règlements et leurs références.">
            <DataTable
              columns={[
                { key: 'date', label: 'Date', render: (p: any) => formatDate(p.datePaiement) },
                { key: 'montant', label: 'Montant', render: (p: any) => formatXOF(p.montant) },
                { key: 'mode', label: 'Mode' },
                { key: 'ref', label: 'Référence', render: (p: any) => p.referenceTransaction ?? '—' },
              ]}
              rows={mesPaiements}
              emptyLabel="Aucun paiement enregistré"
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
