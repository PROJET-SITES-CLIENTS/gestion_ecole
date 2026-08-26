'use client';

// ====================================================================
// Module Examens officiels / nationaux
// ====================================================================

import { useTransition } from 'react';
import { FileCheck, Award } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import { formatDate } from '@/lib/format';

export default function ExamensModule({ initialData }: { initialData: any }) {
  const examens = initialData.examensOfficiels ?? [];
  const inscriptions = initialData.inscriptionsExamen ?? [];
  const eleves = initialData.eleves ?? [];
  const niveaux = initialData.niveaux ?? [];
  const [pending, startTransition] = useTransition();

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Examens officiels" subtitle="Sessions nationales (CEPE, BEPC, BAC), inscriptions, résultats" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Sessions" value={examens.length} icon={FileCheck} color="emerald" />
        <StatCard title="Inscriptions" value={inscriptions.length} icon={Award} color="blue" />
        <StatCard title="Admis" value={inscriptions.filter((i: any) => i.resultat === 'admis').length} icon={Award} color="emerald" />
        <StatCard title="Ajournés" value={inscriptions.filter((i: any) => i.resultat === 'ajourne').length} icon={Award} color="rose" />
      </div>

      <SectionBlock title="Sessions d'examens officiels" description="Distinction visuelle avec évaluations internes">
        <DataTable
          columns={[
            { key: 'nom', label: 'Examen' },
            { key: 'niveau', label: 'Niveau', render: (e) => niveaux.find((n: any) => n.id === e.niveauId)?.libelle ?? '—' },
            { key: 'dateDebut', label: 'Du', render: (e) => formatDate(e.dateDebut) },
            { key: 'dateFin', label: 'Au', render: (e) => formatDate(e.dateFin) },
            { key: 'inscrits', label: 'Inscrits', render: (e) => inscriptions.filter((i: any) => i.examenOfficielId === e.id).length },
            {
              key: 'actions', label: 'Action', render: (e) => (
                <ModalForm
                  trigger={<CreateButton label="Inscrire les élèves éligibles" />}
                  title={`Inscrire les élèves éligibles à ${e.nom}`}
                  fields={[
                    { name: 'examenId', type: 'text', label: 'ID', defaultValue: e.id },
                  ]}
                  action={actions.inscrireElevesExamen}
                />
              )
            },
          ]}
          rows={examens}
          emptyLabel="Aucune session d'examen officiel configurée"
        />
      </SectionBlock>

      <SectionBlock title="Inscriptions et résultats" description="Résultats externes — n'entrent pas dans le calcul des moyennes internes">
        <DataTable
          columns={[
            { key: 'examen', label: 'Examen', render: (i) => examens.find((e: any) => e.id === i.examenOfficielId)?.nom ?? '—' },
            { key: 'eleve', label: 'Élève', render: (i) => { const e = eleves.find((x: any) => x.id === i.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'numeroTable', label: 'N° table' },
            { key: 'centreExamen', label: 'Centre' },
            { key: 'statut', label: 'Statut', render: (i) => <StatusBadge statut={i.statut} /> },
            { key: 'resultat', label: 'Résultat', render: (i) => i.resultat ? <StatusBadge statut={i.resultat} /> : '—' },
          ]}
          rows={inscriptions}
          emptyLabel="Aucune inscription"
        />
      </SectionBlock>
    </div>
  );
}
