'use client';

// ====================================================================
// Portail Élève — F1 : les données arrivent DÉJÀ filtrées côté serveur
// (loader par portail). Ce composant n'affiche QUE ses propres données.
// Plus AUCUNE liste d'autres élèves dans le payload.
// ====================================================================

import { GraduationCap, CalendarDays, Bell, ClipboardList, AlertTriangle, Wallet, BookOpen } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, EmptyState, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import * as ext from '@/app/actions/completions';
import { formatXOF, formatDate, formatDateTime } from '@/lib/format';

export default function ElevePortalModule({ initialData, mode = 'full' }: { initialData: any; mode?: 'dashboard' | 'full' }) {
  const moi: any = initialData.moi ?? null;
  const kpi = initialData.kpi ?? {};
  const mesNotes: any[] = initialData.mesNotes ?? [];
  const mesBulletins: any[] = initialData.mesBulletins ?? [];
  const mesPresences: any[] = initialData.mesPresences ?? [];
  const mesSeances: any[] = initialData.mesSeances ?? [];
  const mesEcheances: any[] = initialData.mesEcheances ?? [];
  const mesIncidents: any[] = initialData.mesIncidents ?? [];
  const mesRdvs: any[] = initialData.mesRdvs ?? [];
  const mesDevoirs: any[] = initialData.mesDevoirs ?? [];
  const notifications: any[] = initialData.notifications ?? [];

  const dernierBulletin = mesBulletins[0] ?? null;
  const maClasse = moi?.classeActuelle ?? null;

  if (!moi) {
    return (
      <div className="p-6">
        <EmptyState
          title="Aucun dossier élève associé à ce compte"
          description="Contactez le secrétariat de votre établissement pour faire le lien entre votre compte et votre dossier."
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={`${moi.prenom} ${moi.nom}`}
        subtitle={`${maClasse?.libelle ?? 'Classe non affectée'} · Matricule ${moi.matricule ?? '—'}`}
      />

      {/* KPI — calculés côté SERVEUR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ma moyenne"
          value={kpi.moyenneGenerale !== null && kpi.moyenneGenerale !== undefined ? `${Number(kpi.moyenneGenerale).toFixed(2)}/20` : '—'}
          sub={`${kpi.nbNotes ?? 0} note(s)`}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard title="Absences / retards" value={`${kpi.absences ?? 0} / ${kpi.retards ?? 0}`} sub="cumul de l'année" icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard title="Restant dû" value={formatXOF(kpi.totalDu ?? 0)} sub="frais en cours" icon={<Wallet className="h-4 w-4" />} />
        <StatCard title="Notifications" value={String(notifications.length)} sub="reçues" icon={<Bell className="h-4 w-4" />} />
      </div>

      {/* Dernier bulletin */}
      <SectionBlock title="Dernier bulletin publié">
        {dernierBulletin ? (
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{dernierBulletin.periode?.libelle ?? 'Période'}</div>
                <div className="text-xs text-gray-500">Publié le {formatDate(dernierBulletin.datePublication)}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{dernierBulletin.moyenneGenerale?.toFixed(2) ?? '—'}/20</div>
                <div className="text-xs text-gray-500">Rang {dernierBulletin.rang ?? '—'}</div>
              </div>
            </div>
            {dernierBulletin.appreciationGenerale && (
              <p className="mt-3 text-sm text-gray-600 border-t pt-3">{dernierBulletin.appreciationGenerale}</p>
            )}
          </div>
        ) : (
          <EmptyState title="Aucun bulletin publié" description="Vos bulletins apparaîtront ici dès leur publication par la direction." />
        )}
      </SectionBlock>

      {/* Dernières notes */}
      <SectionBlock title="Mes dernières notes">
        <DataTable
          columns={[
            { key: 'matiere', label: 'Matière', render: (n: any) => n.evaluation?.matiere?.libelle ?? '—' },
            { key: 'valeur', label: 'Note', render: (n: any) => (n.valeur != null ? `${n.valeur}/${n.evaluation?.sur ?? 20}` : '—') },
            { key: 'date', label: 'Date', render: (n: any) => formatDate(n.dateSaisie) },
            { key: 'commentaire', label: 'Commentaire', render: (n: any) => n.commentaire ?? '—' },
          ]}
          rows={mesNotes.slice(0, 10)}
        />
      </SectionBlock>

      {/* Emploi du temps */}
      <SectionBlock title="Mes prochains cours">
        <DataTable
          columns={[
            { key: 'date', label: 'Date', render: (s: any) => formatDate(s.date) },
            { key: 'horaire', label: 'Horaire', render: (s: any) => `${s.heureDebut} – ${s.heureFin}` },
            { key: 'matiere', label: 'Matière', render: (s: any) => s.matiere?.libelle ?? '—' },
            { key: 'enseignant', label: 'Enseignant', render: (s: any) => (s.enseignant ? `${s.enseignant.prenom} ${s.enseignant.nom}` : '—') },
            { key: 'salle', label: 'Salle', render: (s: any) => s.salle?.nom ?? '—' },
          ]}
          rows={mesSeances.slice(0, 8)}
        />
      </SectionBlock>

      {/* O4 — Mes devoirs : dépôt du rendu (lien + commentaire) avant la date limite */}
      <SectionBlock
        title="Mes devoirs"
        description="Déposez votre rendu (lien vers votre fichier) avant la date limite — votre enseignant est notifié."
      >
        {mesDevoirs.length === 0 ? (
          <EmptyState title="Aucun devoir à rendre pour le moment" description="Les devoirs assignés à votre classe apparaîtront ici." />
        ) : (
          <div className="space-y-3">
            {mesDevoirs.map((d: any) => (
              <CarteDevoir key={d.id} devoir={d} />
            ))}
          </div>
        )}
      </SectionBlock>

      {/* Absences / retards */}
      <SectionBlock title="Mes absences et retards">
        <DataTable
          columns={[
            { key: 'date', label: 'Date', render: (p: any) => formatDate(p.seance?.date ?? p.dateSaisie) },
            { key: 'matiere', label: 'Matière', render: (p: any) => p.seance?.matiere?.libelle ?? '—' },
            { key: 'statut', label: 'Statut', render: (p: any) => <StatusBadge statut={p.statut} /> },
            { key: 'motif', label: 'Motif / retard', render: (p: any) => (p.statut === 'retard' ? `${p.minuteRetard ?? 0} min` : p.motifAbsence ?? '—') },
          ]}
          rows={mesPresences.slice(0, 12)}
        />
      </SectionBlock>

      {/* Échéances */}
      <SectionBlock title="Mes échéances de paiement">
        <DataTable
          columns={[
            { key: 'frais', label: 'Frais', render: (e: any) => e.frais?.libelle ?? '—' },
            { key: 'date', label: 'Échéance', render: (e: any) => formatDate(e.dateEcheance) },
            { key: 'net', label: 'Montant', render: (e: any) => formatXOF((e.montant ?? 0) - (e.remise ?? 0)) },
            { key: 'paye', label: 'Payé', render: (e: any) => formatXOF(e.montantPaye) },
            { key: 'restant', label: 'Restant', render: (e: any) => formatXOF(Math.max(0, (e.montant ?? 0) - (e.remise ?? 0) - (e.montantPaye ?? 0))) },
            { key: 'statut', label: 'Statut', render: (e: any) => <StatusBadge statut={e.statut} /> },
          ]}
          rows={mesEcheances}
        />
      </SectionBlock>

      {/* Incidents */}
      {mesIncidents.length > 0 && (
        <SectionBlock title="Vie scolaire">
          <DataTable
            columns={[
              { key: 'date', label: 'Date', render: (i: any) => formatDateTime(i.dateHeure) },
              { key: 'type', label: 'Type' },
              { key: 'gravite', label: 'Gravité', render: (i: any) => <StatusBadge statut={i.gravite} /> },
              { key: 'description', label: 'Description' },
            ]}
            rows={mesIncidents.slice(0, 6)}
          />
        </SectionBlock>
      )}

      {/* RDV */}
      <SectionBlock title="Mes rendez-vous">
        <DataTable
          columns={[
            { key: 'date', label: 'Date', render: (r: any) => formatDate(r.creneauRdv?.date) },
            { key: 'horaire', label: 'Horaire', render: (r: any) => (r.creneauRdv ? `${r.creneauRdv.heureDebut} – ${r.creneauRdv.heureFin}` : '—') },
            { key: 'enseignant', label: 'Enseignant', render: (r: any) => (r.creneauRdv?.personnel ? `${r.creneauRdv.personnel.prenom} ${r.creneauRdv.personnel.nom}` : '—') },
            { key: 'statut', label: 'Statut', render: (r: any) => <StatusBadge statut={r.statut} /> },
          ]}
          rows={mesRdvs.slice(0, 6)}
        />
      </SectionBlock>

      {/* Notifications */}
      <SectionBlock title="Mes notifications">
        <DataTable
          columns={[
            { key: 'sujet', label: 'Sujet', render: (n: any) => n.sujet ?? '—' },
            { key: 'corps', label: 'Message', render: (n: any) => (n.corps ?? '').slice(0, 80) },
            { key: 'date', label: 'Reçue le', render: (n: any) => formatDateTime(n.dateEnvoi ?? n.dateCreation) },
          ]}
          rows={notifications.slice(0, 5)}
        />
      </SectionBlock>
    </div>
  );
}

// --------------------------------------------------------------------
// O4 — carte d'un devoir : formulaire de rendu (lien + commentaire)
// pour les devoirs dont la date limite n'est pas passée.
// --------------------------------------------------------------------
function CarteDevoir({ devoir }: { devoir: any }) {
  const { run, pending, Message } = useActionFeedback();
  const aVenir = new Date(devoir.dateRendu).getTime() >= Date.now();

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    run(() => ext.rendreDevoir(formData), 'Devoir rendu — votre enseignant est notifié.');
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{devoir.intitule}</div>
          <div className="text-xs text-gray-500">
            {devoir.matiere?.libelle ?? 'Matière non précisée'} · à rendre le {formatDate(devoir.dateRendu)}
          </div>
        </div>
        <StatusBadge statut={devoir.statut} label={devoir.statut === 'ramasse' ? 'Ramassé' : 'Assigné'} />
      </div>
      {devoir.description && <p className="mt-2 text-xs text-gray-600">{devoir.description}</p>}
      {aVenir ? (
        <form onSubmit={soumettre} className="mt-3 space-y-2">
          <input type="hidden" name="devoirId" value={devoir.id} />
          <Input name="contenuUrl" placeholder="Lien de mon rendu (Google Drive, Dropbox…)" className="h-9 text-sm" />
          <Textarea name="commentaireEleve" rows={2} placeholder="Un commentaire pour l'enseignant (facultatif)" className="text-sm" />
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending}>
              {pending ? 'Envoi…' : 'Rendre ce devoir'}
            </Button>
          </div>
          {Message}
        </form>
      ) : (
        <p className="mt-2 text-xs text-rose-600">Échéance dépassée — contactez votre enseignant pour un rendu tardif.</p>
      )}
    </div>
  );
}
