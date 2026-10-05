'use client';

// ====================================================================
// Module Présences — saisie d'appel en ligne + historique + justifications
// ====================================================================

import { useState, useTransition } from 'react';
import { Users, CheckCircle2, XCircle, Clock, Wifi } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, EmptyState, ModalForm, CreateButton, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as actions from '@/app/actions';
import { formatDate, formatDateTime, initiales } from '@/lib/format';
import PresencesStats from './presences-stats';

// Classes statiques EXPLICITES : les classes dynamiques `bg-${color}-100`
// ne sont pas compilées par Tailwind (le scanner ne résout pas les templates).
const CLASSES_STATUT_PRESENCE: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rose: 'bg-rose-100 text-rose-700 border-rose-300',
  amber: 'bg-amber-100 text-amber-700 border-amber-300',
  gray: 'bg-gray-100 text-gray-700 border-gray-300',
};

const LIBELLES_MOTIF: Record<string, string> = {
  maladie: 'Maladie',
  familial: 'Familial',
  rendez_vous_medical: 'Rendez-vous médical',
  ceremonie: 'Cérémonie',
  transport: 'Transport',
  autre: 'Autre',
};

const LIBELLES_STATUT_JUSTIFICATION: Record<string, { statut: string; label: string }> = {
  soumis: { statut: 'en_attente', label: 'Soumise' },
  valide: { statut: 'payee', label: 'Validée' },
  rejete: { statut: 'impayee', label: 'Rejetée' },
};

export default function PresencesModule({ initialData }: { initialData: any }) {
  const seances = initialData.seances ?? [];
  const presences = initialData.presences ?? [];
  const eleves = initialData.eleves ?? [];
  const matieres = initialData.matieres ?? [];
  const classes = initialData.classes ?? [];
  const personnels = initialData.personnels ?? [];
  const justifications = initialData.justificationsAbsence ?? [];

  const [selectedSeanceId, setSelectedSeanceId] = useState<string | null>(seances[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [erreurAppel, setErreurAppel] = useState<string | null>(null);
  const retourJustifications = useActionFeedback();

  // AUDIT ENSEIGNANT — « mes séances » : celles où l'enseignant connecté
  // intervient (résolu côté client depuis les personnels de l'école)
  const monId = personnels.find((p: any) => p.utilisateurId === initialData.session?.utilisateur?.id)?.id ?? null;
  const [mesSeules, setMesSeules] = useState(Boolean(monId));
  const seancesVisibles = mesSeules && monId ? seances.filter((s: any) => s.enseignantId === monId) : seances;
  const nbMesSeances = monId ? seances.filter((s: any) => s.enseignantId === monId).length : 0;

  const seance = seances.find((s: any) => s.id === selectedSeanceId);
  const elevesClasse = seance ? eleves.filter((e: any) => e.classeActuelleId === seance.classeId) : [];
  const presencesSeance = seance ? presences.filter((p: any) => p.seanceId === seance.id) : [];

  // AUDIT ENSEIGNANT — détail de l'appel de LA séance sélectionnée, avec
  // répartition garçons/filles comme dans un appel papier
  const eleveParId = new Map<string, any>(eleves.map((e: any) => [e.id as string, e]));
  const decompte = (statut: string) => {
    let g = 0, f = 0;
    for (const p of presencesSeance) {
      if (p.statut !== statut) continue;
      const sexe = eleveParId.get(p.eleveId)?.sexe;
      if (sexe === 'F') f++; else if (sexe === 'M') g++;
    }
    return { g, f, total: g + f };
  };
  const appelFait = presencesSeance.length > 0;
  const dp = decompte('present'), da = decompte('absent'), dr = decompte('retard');
  const effectifGF = { g: elevesClasse.filter((e: any) => e?.sexe === 'M').length, f: elevesClasse.filter((e: any) => e?.sexe === 'F').length };

  const totalPresences = presences.length;
  const presents = presences.filter((p: any) => p.statut === 'present').length;
  const absents = presences.filter((p: any) => p.statut === 'absent').length;
  const retards = presences.filter((p: any) => p.statut === 'retard').length;
  const taux = totalPresences > 0 ? Math.round(presents / totalPresences * 100) : 0;

  return (
    <div className="p-4 lg:p-6 max-w-full lg:max-w-7xl mx-auto">
      <PageHeader
        title="Présences — Appel de classe"
        subtitle="Saisie rapide par séance · statistiques d'absentéisme consolidées"
      />

      {/* AUDIT PRÉSENCES — tableau de bord statistique (courbes, tops, H/F,
          par classe) alimenté par le cumul de tous les appels */}
      <div className="mb-6">
        <PresencesStats initialData={initialData} />
      </div>

      <div className="overflow-x-auto grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard title="Taux de présence" value={`${taux}%`} icon={Users} color="emerald" />
        <StatCard title="Présents" value={presents} icon={CheckCircle2} color="emerald" />
        <StatCard title="Absents" value={absents} icon={XCircle} color="rose" />
        <StatCard title="Retards" value={retards} icon={Clock} color="amber" />
        <StatCard title="Saisie en ligne" value="Immédiate" sub="synchronisation directe" icon={Wifi} color="blue" />
      </div>

      <div className="overflow-x-auto grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Séances</span>
              {monId && nbMesSeances > 0 && (
                <button
                  onClick={() => { setMesSeules(!mesSeules); setSelectedSeanceId(null); }}
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${mesSeules ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}
                >
                  {mesSeules ? `Mes séances (${nbMesSeances})` : `Toutes (${seances.length})`}
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[60vh] overflow-y-auto">
            {seancesVisibles.length === 0 && <p className="text-sm text-gray-500 p-2">{mesSeules ? 'Aucune séance vous est attribuée (l\'EDT doit être configuré avec vous comme enseignant).' : 'Aucune séance planifiée'}</p>}
            {seancesVisibles.map((s: any) => {
              const classe = classes.find((c: any) => c.id === s.classeId);
              const matiere = matieres.find((m: any) => m.id === s.matiereId);
              const enseignant = personnels.find((p: any) => p.id === s.enseignantId);
              return (
                <button key={s.id} onClick={() => setSelectedSeanceId(s.id)}
                  className={`w-full text-left p-2 rounded text-sm hover:bg-gray-50 ${selectedSeanceId === s.id ? 'bg-emerald-50 border border-emerald-200' : ''}`}>
                  <div className="font-medium">{classe?.libelle} · {matiere?.libelle}</div>
                  <div className="text-xs text-gray-500">{formatDate(s.date)} · {s.heureDebut}–{s.heureFin}</div>
                  {enseignant && <div className="text-[10px] text-gray-400">{enseignant.prenom} {enseignant.nom}</div>}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {seance ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Appel — {classes.find((c: any) => c.id === seance.classeId)?.libelle}</span>
                  <span className="text-xs font-normal text-gray-500">{formatDate(seance.date)} · {seance.heureDebut}</span>
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Cliquez sur un statut pour chaque élève. La saisie est enregistrée côté serveur.
                </p>
                {/* AUDIT ENSEIGNANT — détail de l'appel comme sur le papier :
                    effectif G/F et répartition par statut, mis à jour en direct */}
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                  <div className="px-2 py-1.5 bg-gray-50 rounded border border-gray-100">
                    <div className="text-[10px] uppercase text-gray-500">Effectif</div>
                    <div className="font-semibold">{elevesClasse.length} élèves <span className="text-gray-500 font-normal">({effectifGF.g} G · {effectifGF.f} F)</span></div>
                  </div>
                  <div className={`px-2 py-1.5 rounded border ${appelFait ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="text-[10px] uppercase text-emerald-700">Présents</div>
                    <div className="font-semibold text-emerald-700">{dp.total} <span className="font-normal">({dp.g} G · {dp.f} F)</span></div>
                  </div>
                  <div className={`px-2 py-1.5 rounded border ${da.total > 0 ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="text-[10px] uppercase text-rose-700">Absents</div>
                    <div className="font-semibold text-rose-700">{da.total} <span className="font-normal">({da.g} G · {da.f} F)</span></div>
                  </div>
                  <div className={`px-2 py-1.5 rounded border ${dr.total > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="text-[10px] uppercase text-amber-700">Retards</div>
                    <div className="font-semibold text-amber-700">{dr.total} <span className="font-normal">({dr.g} G · {dr.f} F)</span></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {erreurAppel && (
                  <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                    {erreurAppel}
                  </div>
                )}
                <form action={(fd) => {
                  setErreurAppel(null);
                  startTransition(async () => {
                    try {
                      const r = await actions.saisirAppel(fd);
                      if (r && r.ok === false) setErreurAppel(r.error ?? 'Enregistrement refusé.');
                    } catch {
                      setErreurAppel('Une erreur est survenue. Réessayez.');
                    }
                  });
                }} className="space-y-2">
                  <input type="hidden" name="seanceId" value={seance.id} />
                  {elevesClasse.map((e: any) => {
                    const p = presencesSeance.find((x: any) => x.eleveId === e.id);
                    return (
                      <div key={e.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {initiales(e.nom, e.prenom)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{e.prenom} {e.nom}</div>
                          {p?.motifAbsence && <div className="text-xs text-gray-500 truncate">{p.motifAbsence}</div>}
                        </div>
                        <div className="flex gap-1">
                          {[
                            { value: 'present', label: 'Présent', color: 'emerald' },
                            { value: 'absent', label: 'Absent', color: 'rose' },
                            { value: 'retard', label: 'Retard', color: 'amber' },
                            { value: 'excuse', label: 'Excusé', color: 'gray' },
                          ].map(opt => (
                            <label key={opt.value} className={`cursor-pointer px-2 py-1 rounded text-xs border ${p?.statut === opt.value ? CLASSES_STATUT_PRESENCE[opt.color] : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                              <input type="radio" name={`presence_${e.id}`} value={opt.value} defaultChecked={p?.statut === opt.value} className="sr-only" />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                        <input type="text" name={`motif_${e.id}`} defaultValue={p?.motifAbsence ?? ''} placeholder="Motif (optionnel)" className="text-xs h-8 px-2 border border-gray-200 rounded w-32 hidden md:block" />
                      </div>
                    );
                  })}
                  <div className="flex justify-end pt-3">
                    <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending}>
                      {pending ? 'Enregistrement…' : 'Enregistrer l\'appel'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <EmptyState title="Aucune séance sélectionnée" />
          )}
        </div>
      </div>

      <SectionBlock
        title="Justifications d'absence"
        description="Déclaration par les familles ou l'établissement, puis validation ou rejet par la vie scolaire"
        action={
          <ModalForm
            trigger={<CreateButton label="Justifier une absence" />}
            title="Justifier une absence"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'presenceId', label: 'Absence précise (elle passera en « excusé » à la validation)', type: 'select', options: [
                { value: '', label: '— Générale —' },
                ...presences.filter((pp: any) => pp.statut === 'absent' && !justifications.some((jj: any) => jj.presenceId === pp.id)).slice(0, 100).map((pp: any) => {
                  const el = eleves.find((x: any) => x.id === pp.eleveId);
                  return { value: pp.id, label: `${el ? `${el.prenom} ${el.nom}` : '?'} — ${formatDate(pp.dateSaisie)}` };
                }),
              ] },
              { name: 'dateAbsence', label: 'Date de l\'absence', type: 'date', required: true },
              { name: 'motif', label: 'Motif', type: 'select', options: Object.entries(LIBELLES_MOTIF).map(([value, label]) => ({ value, label })), required: true },
              { name: 'dureeHeures', label: 'Durée (heures)', type: 'number', step: '0.5', placeholder: '2' },
              { name: 'description', label: 'Description', type: 'textarea' },
            ]}
            action={actions.justifierAbsence}
          />
        }
      >
        {retourJustifications.Message}
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (j) => { const e = eleves.find((x: any) => x.id === j.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'dateAbsence', label: 'Date', render: (j) => formatDate(j.dateAbsence) },
            { key: 'motif', label: 'Motif', render: (j) => LIBELLES_MOTIF[j.motif] ?? j.motif },
            { key: 'dureeHeures', label: 'Durée', render: (j) => (j.dureeHeures ? `${j.dureeHeures} h` : '—') },
            { key: 'description', label: 'Description', render: (j) => <span className="text-xs text-gray-600 line-clamp-1">{j.description ?? '—'}</span> },
            { key: 'statut', label: 'Statut', render: (j) => { const m = LIBELLES_STATUT_JUSTIFICATION[j.statut]; return m ? <StatusBadge statut={m.statut} label={m.label} /> : <StatusBadge statut={j.statut} />; } },
            {
              key: 'actions', label: 'Actions', render: (j) => j.statut === 'soumis' ? (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={retourJustifications.pending} onClick={() => retourJustifications.run(() => actions.traiterJustification(j.id, 'valide'), 'Justification validée')}>
                    Valider
                  </Button>
                  <Button size="sm" variant="outline" disabled={retourJustifications.pending} onClick={() => retourJustifications.run(() => actions.traiterJustification(j.id, 'rejete'), 'Justification rejetée')}>
                    Refuser
                  </Button>
                </div>
              ) : null,
            },
          ]}
          rows={justifications}
          emptyLabel="Aucune justification d'absence soumise"
        />
      </SectionBlock>

      <SectionBlock title="Historique des présences" description="Toutes les saisies récentes">
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (p) => { const e = eleves.find((x: any) => x.id === p.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'seance', label: 'Séance', render: (p) => { const s = seances.find((x: any) => x.id === p.seanceId); return s ? `${formatDate(s.date)} · ${s.heureDebut}` : '—'; } },
            { key: 'statut', label: 'Statut', render: (p) => <StatusBadge statut={p.statut} /> },
            { key: 'motif', label: 'Motif', render: (p) => p.motifAbsence ?? '—' },
            { key: 'dateSaisie', label: 'Saisi le', render: (p) => formatDateTime(p.dateSaisie) },
            { key: 'sync', label: 'Sync', render: (p) => p.synchroniseDepuisHorsLigne ? <span className="text-xs text-blue-600">Hors-ligne</span> : <span className="text-xs text-emerald-600">Direct</span> },
          ]}
          rows={presences}
        />
      </SectionBlock>
    </div>
  );
}
