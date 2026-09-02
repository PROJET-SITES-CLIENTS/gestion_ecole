'use client';

// ====================================================================
// Portail Élève — vue restreinte : mes notes, mes bulletins, mes
// absences, mon emploi du temps, mes échéances, mes incidents.
// ====================================================================

import { BookOpen, GraduationCap, CalendarDays, Bell, ClipboardList, AlertTriangle, Wallet } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, EmptyState } from '@/components/shared-ui';
import { formatMontant, formatDate, formatDateTime } from '@/lib/format';

export default function ElevePortalModule({ initialData, mode = 'full' }: { initialData: any; mode?: 'dashboard' | 'full' }) {
  const eleves = initialData.eleves ?? [];
  const classes = initialData.classes ?? [];
  const matieres = initialData.matieres ?? [];
  const personnels = initialData.personnels ?? [];
  const notes = initialData.notes ?? [];
  const evaluations = initialData.evaluations ?? [];
  const bulletins = initialData.bulletins ?? [];
  const presences = initialData.presences ?? [];
  const seances = initialData.seances ?? [];
  const echeances = initialData.echeances ?? [];
  const incidents = initialData.incidents ?? [];
  const sanctions = initialData.sanctions ?? [];
  const creneaux = initialData.creneauxRdv ?? [];
  const rdvs = initialData.rdvs ?? [];
  const notifications = (initialData.notifications ?? []).filter((n: any) => n.destinataireId === initialData.session?.utilisateur?.id);

  // Élève RÉEL connecté (session) — fin du choix arbitraire de démo.
  const session = initialData.session ?? {};
  const moi = session.eleveId ? (eleves.find((e: any) => e.id === session.eleveId) ?? null) : (eleves[0] ?? null);
  const maClasse = moi ? classes.find((c: any) => c.id === moi.classeActuelleId) : null;

  // Mes notes (avec matière via évaluation)
  const mesNotes = moi
    ? notes
        .filter((n: any) => n.eleveId === moi.id && n.valeur !== null && n.valeur !== undefined)
        .map((n: any) => {
          const ev = evaluations.find((e: any) => e.id === n.evaluationId);
          const mat = ev ? matieres.find((m: any) => m.id === ev.matiereId) : null;
          return { ...n, evaluation: ev, matiere: mat?.libelle ?? '—' };
        })
        .slice(0, 10)
    : [];

  // Ma moyenne générale
  const moyenneGenerale = mesNotes.length
    ? mesNotes.reduce((s: number, n: any) => s + n.valeur, 0) / mesNotes.length
    : null;

  // Mes bulletins publiés
  const mesBulletins = moi ? bulletins.filter((b: any) => b.eleveId === moi.id && b.statut === 'publie') : [];

  // Mes absences et retards
  const mesPresences = moi ? presences.filter((p: any) => p.eleveId === moi.id) : [];
  const mesAbsences = mesPresences.filter((p: any) => p.statut === 'absent');
  const mesRetards = mesPresences.filter((p: any) => p.statut === 'retard');

  // Mon emploi du temps (séances de ma classe)
  const mesSeances = maClasse
    ? seances
        .filter((s: any) => s.classeId === maClasse.id)
        .map((s: any) => {
          const mat = matieres.find((m: any) => m.id === s.matiereId);
          const prof = personnels.find((p: any) => p.id === s.enseignantId);
          return { ...s, matiere: mat?.libelle ?? '—', enseignant: prof ? `${prof.prenom} ${prof.nom}` : '—' };
        })
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 8)
    : [];

  // Mes échéances restantes
  const mesEcheances = moi ? echeances.filter((e: any) => e.eleveId === moi.id && e.statut !== 'payee') : [];
  const totalDu = mesEcheances.reduce((s: number, e: any) => s + (e.montant - e.montantPaye), 0);

  // Mes incidents & sanctions
  const mesIncidents = moi ? incidents.filter((i: any) => i.eleveId === moi.id) : [];
  const mesSanctions = sanctions.filter((s: any) => mesIncidents.some((i: any) => i.id === s.incidentId));

  // Mes RDV
  const mesRdvs = moi
    ? rdvs
        .filter((r: any) => r.eleveId === moi.id)
        .map((r: any) => ({ ...r, creneau: creneaux.find((c: any) => c.id === r.creneauRdvId) }))
    : [];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Portail Élève"
        subtitle={moi ? `${moi.prenom} ${moi.nom} · ${maClasse?.libelle ?? '—'} · Matricule ${moi.matricule}` : 'Aucun compte élève associé'}
      />

      {moi && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            title="Ma moyenne"
            value={moyenneGenerale !== null ? `${moyenneGenerale.toFixed(2)}/20` : '—'}
            sub={`${mesNotes.length} note(s)`}
            icon={GraduationCap}
            color="emerald"
          />
          <StatCard title="Mes bulletins" value={mesBulletins.length} sub="publiés" icon={BookOpen} color="blue" />
          <StatCard
            title="Mes absences"
            value={mesAbsences.length}
            sub={`${mesRetards.length} retard(s)`}
            icon={ClipboardList}
            color={mesAbsences.length > 0 ? 'rose' : 'emerald'}
          />
          <StatCard title="Notifications" value={notifications.length} icon={Bell} color="amber" />
        </div>
      )}

      <div className="space-y-6">
        {/* Mon dernier bulletin */}
        <SectionBlock title="Mon dernier bulletin">
          {mesBulletins.length === 0 ? (
            <EmptyState title="Aucun bulletin publié pour le moment" />
          ) : (
            <div className="grid md:grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                <div className="text-[10px] uppercase text-emerald-700">Moyenne générale</div>
                <div className="text-2xl font-bold text-emerald-800">{mesBulletins[0].moyenneGenerale}/20</div>
              </div>
              <div className="p-3 bg-gray-50 rounded border">
                <div className="text-[10px] uppercase text-gray-500">Période</div>
                <div className="text-sm font-medium">{mesBulletins[0].periode?.libelle ?? mesBulletins[0].periodeId?.slice(0, 8) ?? '—'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded border">
                <div className="text-[10px] uppercase text-gray-500">Statut</div>
                <StatusBadge statut={mesBulletins[0].statut} />
              </div>
            </div>
          )}
        </SectionBlock>

        {/* Mes dernières notes */}
        <SectionBlock title="Mes dernières notes" description="Notes saisies par vos professeurs">
          {mesNotes.length === 0 ? (
            <EmptyState title="Aucune note saisie" />
          ) : (
            <DataTable
              columns={[
                { key: 'matiere', label: 'Matière' },
                { key: 'valeur', label: 'Note', render: (n: any) => <span className="font-bold">{n.valeur}/20</span> },
                { key: 'dateSaisie', label: 'Saisie le', render: (n: any) => formatDate(n.dateSaisie) },
                { key: 'commentaire', label: 'Appréciation', render: (n: any) => n.commentaire ?? '—' },
              ]}
              rows={mesNotes}
            />
          )}
        </SectionBlock>

        {/* Mon emploi du temps */}
        <SectionBlock title="Mon emploi du temps" description="Prochaines séances de ma classe">
          {mesSeances.length === 0 ? (
            <EmptyState title="Aucune séance planifiée" />
          ) : (
            <DataTable
              columns={[
                { key: 'date', label: 'Date', render: (s: any) => formatDate(s.date) },
                { key: 'heureDebut', label: 'Horaire', render: (s: any) => `${s.heureDebut} – ${s.heureFin}` },
                { key: 'matiere', label: 'Matière' },
                { key: 'enseignant', label: 'Professeur' },
                { key: 'salle', label: 'Salle', render: (s: any) => s.salle ?? '—' },
              ]}
              rows={mesSeances}
            />
          )}
        </SectionBlock>

        {/* Mes absences */}
        <SectionBlock title="Mes absences et retards" description="Suivi de votre assiduité">
          {mesPresences.length === 0 ? (
            <EmptyState title="Aucun relevé de présence" />
          ) : (
            <DataTable
              columns={[
                { key: 'date', label: 'Date', render: (p: any) => {
                  const s = seances.find((x: any) => x.id === p.seanceId);
                  return s ? formatDate(s.date) : '—';
                } },
                { key: 'statut', label: 'Statut', render: (p: any) => <StatusBadge statut={p.statut} /> },
                { key: 'minuteRetard', label: 'Retard (min)', render: (p: any) => p.minuteRetard ?? '—' },
                { key: 'motifAbsence', label: 'Motif', render: (p: any) => p.motifAbsence ?? '—' },
              ]}
              rows={mesPresences.slice(0, 8)}
            />
          )}
        </SectionBlock>

        {/* Mes échéances (vue informationnelle — les parents règlent) */}
        <SectionBlock title="Frais scolaires restants" description="Vue informative — le règlement se fait via le portail parent">
          {mesEcheances.length === 0 ? (
            <EmptyState title="Aucune échéance en attente" />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3 p-3 bg-amber-50 rounded border border-amber-200">
                <Wallet className="h-5 w-5 text-amber-600" />
                <div className="text-sm">
                  <span className="font-medium">Restant à régler :</span>{' '}
                  <span className="font-bold text-amber-700">{formatMontant(totalDu, 'XOF')}</span>{' '}
                  <span className="text-gray-500">({mesEcheances.length} échéance(s))</span>
                </div>
              </div>
              <DataTable
                columns={[
                  { key: 'dateEcheance', label: 'Échéance', render: (e: any) => formatDate(e.dateEcheance) },
                  { key: 'montant', label: 'Montant', render: (e: any) => formatMontant(e.montant, e.devise) },
                  { key: 'montantPaye', label: 'Payé', render: (e: any) => formatMontant(e.montantPaye, e.devise) },
                  { key: 'statut', label: 'Statut', render: (e: any) => <StatusBadge statut={e.statut} /> },
                ]}
                rows={mesEcheances}
              />
            </>
          )}
        </SectionBlock>

        {/* Vie scolaire : incidents et sanctions */}
        <SectionBlock title="Vie scolaire" description="Incidents et sanctions vous concernant">
          {mesIncidents.length === 0 && mesSanctions.length === 0 ? (
            <EmptyState title="Aucun incident signalé — bonne continuation !" />
          ) : (
            <div className="space-y-2">
              {mesIncidents.map((i: any) => (
                <div key={i.id} className="p-3 bg-gray-50 rounded border flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{i.description ?? i.type ?? 'Incident'}</div>
                    <div className="text-xs text-gray-500">{formatDateTime(i.dateHeure)} — {i.lieu}</div>
                    <StatusBadge statut={i.gravite} />
                  </div>
                </div>
              ))}
              {mesSanctions.map((s: any) => (
                <div key={s.id} className="p-3 bg-rose-50 rounded border border-rose-200 text-sm">
                  <span className="font-medium">Sanction :</span> {s.type} {s.dureeHeures ? `(${s.dureeHeures}h)` : ''} — <StatusBadge statut={s.statut} />
                </div>
              ))}
            </div>
          )}
        </SectionBlock>

        {/* Mes RDV parents-professeurs */}
        <SectionBlock title="Mes rendez-vous" description="Rencontres parents-professeurs programmées">
          {mesRdvs.length === 0 ? (
            <EmptyState title="Aucun rendez-vous programmé" />
          ) : (
            <DataTable
              columns={[
                { key: 'date', label: 'Date', render: (r: any) => (r.creneau ? formatDate(r.creneau.date) : '—') },
                { key: 'creneau', label: 'Horaire', render: (r: any) => (r.creneau ? `${r.creneau.heureDebut} – ${r.creneau.heureFin}` : '—') },
                { key: 'statut', label: 'Statut', render: (r: any) => <StatusBadge statut={r.statut} /> },
              ]}
              rows={mesRdvs}
            />
          )}
        </SectionBlock>

        {/* Notifications récentes */}
        <SectionBlock title="Mes notifications">
          {notifications.length === 0 ? (
            <EmptyState title="Aucune notification" />
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n: any) => (
                <div key={n.id} className="p-3 bg-gray-50 rounded border">
                  <div className="text-sm font-medium">{n.sujet}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(n.dateEnvoi)}</div>
                </div>
              ))}
            </div>
          )}
        </SectionBlock>
      </div>
    </div>
  );
}
