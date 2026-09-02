'use client';

// ====================================================================
// Module Examens officiels / nationaux
// - Inscriptions des éligibles
// - CONVOCATIONS (P2) : envoi réel de notifications + n° de table
// - Saisie des résultats (workflow contrôlé)
// ====================================================================

import { useState, useTransition } from 'react';
import { FileCheck, Award, BellRing, ClipboardCheck } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import * as actions from '@/app/actions';
import { formatDate } from '@/lib/format';

export default function ExamensModule({ initialData }: { initialData: any }) {
  const examens = initialData.examensOfficiels ?? [];
  const inscriptions = initialData.inscriptionsExamen ?? [];
  const eleves = initialData.eleves ?? [];
  const niveaux = initialData.niveaux ?? [];
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Examens officiels" subtitle="Sessions nationales (CEPE, BEPC, BAC), inscriptions, convocations, résultats" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Sessions" value={examens.length} icon={FileCheck} color="emerald" />
        <StatCard title="Inscriptions" value={inscriptions.length} icon={Award} color="blue" />
        <StatCard title="Convoqués" value={inscriptions.filter((i: any) => i.statut === 'convoque').length} sub="convocations envoyées" icon={BellRing} color="purple" />
        <StatCard title="Admis" value={inscriptions.filter((i: any) => i.resultat === 'admis').length} icon={Award} color="emerald" />
      </div>

      {message && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{message}</div>
      )}

      <SectionBlock title="Sessions d'examens officiels" description="Inscription des éligibles et envoi des convocations (notifications réelles aux familles)">
        <DataTable
          columns={[
            { key: 'nom', label: 'Examen' },
            { key: 'niveau', label: 'Niveau', render: (e) => niveaux.find((n: any) => n.id === e.niveauId)?.libelle ?? '—' },
            { key: 'dateDebut', label: 'Du', render: (e) => formatDate(e.dateDebut) },
            { key: 'dateFin', label: 'Au', render: (e) => formatDate(e.dateFin) },
            { key: 'inscrits', label: 'Inscrits', render: (e) => inscriptions.filter((i: any) => i.examenOfficielId === e.id).length },
            {
              key: 'actions', label: 'Actions', render: (e) => (
                <div className="flex gap-1">
                  <ModalForm
                    trigger={<Button size="sm" variant="outline"><ClipboardCheck className="h-3 w-3 mr-1" />Inscrire éligibles</Button>}
                    title={`Inscrire les élèves éligibles — ${e.nom}`}
                    fields={[{ name: 'examenId', type: 'hidden', label: 'ID', defaultValue: e.id }]}
                    action={actions.inscrireElevesExamen}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      setMessage(null);
                      const r = await actions.envoyerConvocationsExamen(e.id);
                      setMessage(r?.ok ? `✓ ${r.convocations} convocation(s) envoyée(s) — notifications familles créées, numéros de table attribués.` : `✗ ${r?.error ?? 'Erreur'}`);
                    })}
                  >
                    <BellRing className="h-3 w-3 mr-1" />Convocations
                  </Button>
                </div>
              )
            },
          ]}
          rows={examens}
          emptyLabel="Aucune session d'examen officiel configurée"
        />
      </SectionBlock>

      <SectionBlock title="Inscriptions, convocations et résultats" description="Résultats externes — n'entrent pas dans le calcul des moyennes internes">
        <DataTable
          columns={[
            { key: 'examen', label: 'Examen', render: (i) => examens.find((e: any) => e.id === i.examenOfficielId)?.nom ?? '—' },
            { key: 'eleve', label: 'Élève', render: (i) => { const e = eleves.find((x: any) => x.id === i.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'numeroTable', label: 'N° table' },
            { key: 'centreExamen', label: 'Centre' },
            { key: 'statut', label: 'Statut', render: (i) => <StatusBadge statut={i.statut} /> },
            { key: 'resultat', label: 'Résultat', render: (i) => i.resultat ? <StatusBadge statut={i.resultat} /> : '—' },
            {
              key: 'saisie', label: 'Saisie', render: (i) => (i.statut === 'convoque' || i.statut === 'presente') && !i.resultat ? (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => {
                    const r = await actions.saisirResultatExamen(i.id, 'admis');
                    if (!r?.ok) setMessage(`✗ ${r?.error ?? 'Erreur'}`);
                  })}>Admis</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => {
                    const r = await actions.saisirResultatExamen(i.id, 'ajourne');
                    if (!r?.ok) setMessage(`✗ ${r?.error ?? 'Erreur'}`);
                  })}>Ajourné</Button>
                </div>
              ) : null,
            },
          ]}
          rows={inscriptions}
          emptyLabel="Aucune inscription"
        />
      </SectionBlock>
    </div>
  );
}
