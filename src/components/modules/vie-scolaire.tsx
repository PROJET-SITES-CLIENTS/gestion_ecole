'use client';

// ====================================================================
// Module Vie Scolaire / Discipline — incidents + sanctions
// ====================================================================

import { Shield, AlertTriangle, FileText } from 'lucide-react';
import { useState } from 'react';
import * as actionsExt from '@/app/actions/extensions';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import * as actions from '@/app/actions';
import { formatDate, formatDateTime } from '@/lib/format';

export default function VieScolaireModule({ initialData }: { initialData: any }) {
  const retards = initialData.retards ?? [];
  const surveillancesExamens = initialData.surveillancesExamens ?? [];
  const conseilsDiscipline = initialData.conseilsDiscipline ?? [];
  const [stats, setStats] = useState<any>(null);
  const incidents = initialData.incidents ?? [];
  const sanctions = initialData.sanctions ?? [];
  const eleves = initialData.eleves ?? [];
  const personnels = initialData.personnels ?? [];
  const retourSanctions = useActionFeedback();

  const incidentsGraves = incidents.filter((i: any) => i.gravite === 'grave').length;
  const incidentsModeres = incidents.filter((i: any) => i.gravite === 'modere').length;
  const sanctionsNotifiees = sanctions.filter((s: any) => s.notifieParents).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Vie scolaire & Discipline"
        subtitle="Déclaration d'incidents, sanctions, notification automatique aux parents"
        actions={
          <ModalForm
            trigger={<CreateButton label="Déclarer un incident" />}
            title="Déclarer un incident"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'dateHeure', label: 'Date et heure', type: 'datetime-local', required: true },
              { name: 'lieu', label: 'Lieu' },
              { name: 'type', label: 'Type', type: 'select', options: [
                { value: 'comportement', label: 'Comportement' },
                { value: 'violence', label: 'Violence' },
                { value: 'fraude', label: 'Fraude' },
                { value: 'autre', label: 'Autre' },
              ], required: true },
              { name: 'gravite', label: 'Gravité', type: 'select', options: [
                { value: 'leger', label: 'Léger' },
                { value: 'modere', label: 'Modéré' },
                { value: 'grave', label: 'Grave' },
              ], required: true },
              { name: 'description', label: 'Description', type: 'textarea', required: true },
            ]}
            action={actions.declarerIncident}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Incidents déclarés" value={incidents.length} icon={AlertTriangle} color="amber" />
        <StatCard title="Incidents graves" value={incidentsGraves} icon={Shield} color="rose" />
        <StatCard title="Sanctions décidées" value={sanctions.length} icon={FileText} color="blue" />
        <StatCard title="Parents notifiés" value={sanctionsNotifiees} sub="sur les sanctions" icon={Shield} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionBlock title="Incidents">
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (i) => { const e = eleves.find((x: any) => x.id === i.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'type', label: 'Type' },
              { key: 'gravite', label: 'Gravité', render: (i) => <StatusBadge statut={i.gravite} /> },
              { key: 'dateHeure', label: 'Date', render: (i) => formatDateTime(i.dateHeure) },
              { key: 'description', label: 'Description' },
            ]}
            rows={incidents}
            emptyLabel="Aucun incident déclaré"
          />
        </SectionBlock>

        <SectionBlock title="Sanctions">
          {retourSanctions.Message}
          <DataTable
            columns={[
              { key: 'incident', label: 'Incident', render: (s) => { const i = incidents.find((x: any) => x.id === s.incidentId); const e = i ? eleves.find((y: any) => y.id === i.eleveId) : null; return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'type', label: 'Type' },
              { key: 'description', label: 'Description' },
              { key: 'statut', label: 'Statut', render: (s) => <StatusBadge statut={s.statut} /> },
              { key: 'notifie', label: 'Parents', render: (s) => s.notifieParents ? <span className="text-emerald-600 text-xs">Notifiés</span> : <span className="text-gray-400 text-xs">Non</span> },
              {
                key: 'actions', label: 'Action', render: (s) => s.statut === 'decidee' ? (
                  <Button size="sm" variant="outline" disabled={retourSanctions.pending} onClick={() => retourSanctions.run(() => actions.executerSanction(s.id), 'Sanction exécutée')}>
                    Exécuter
                  </Button>
                ) : null,
              },
            ]}
            rows={sanctions}
            emptyLabel="Aucune sanction décidée"
          />
        </SectionBlock>
      </div>

      <SectionBlock title="Sanctionner un incident" description="La sanction notifie automatiquement les parents/tuteurs">
        <div className="flex gap-2 flex-wrap">
          <ModalForm
            trigger={<CreateButton label="Sanctionner un incident" />}
            title="Décider une sanction"
            fields={[
              { name: 'incidentId', label: 'Incident', type: 'select', options: incidents.map((i: any) => { const e = eleves.find((x: any) => x.id === i.eleveId); return { value: i.id, label: `${e?.prenom ?? ''} ${e?.nom ?? ''} — ${i.type} (${formatDate(i.dateHeure)})` }; }), required: true },
              { name: 'type', label: 'Type de sanction', type: 'select', options: [
                { value: 'avertissement', label: 'Avertissement' },
                { value: 'retenue', label: 'Retenue' },
                { value: 'exclusion', label: 'Exclusion' },
                { value: 'convocation', label: 'Convocation parent' },
              ], required: true },
              { name: 'description', label: 'Description', type: 'textarea', required: true },
            ]}
            action={actions.sanctionner}
          />
          <ModalForm
            trigger={<Button size="sm" variant="outline">Exclusion temporaire</Button>}
            title="Décider une exclusion temporaire"
            fields={[
              { name: 'incidentId', label: 'Incident', type: 'select', options: incidents.map((i: any) => { const e = eleves.find((x: any) => x.id === i.eleveId); return { value: i.id, label: `${e?.prenom ?? ''} ${e?.nom ?? ''} — ${i.type} (${formatDate(i.dateHeure)})` }; }), required: true },
              { name: 'dateDebut', label: 'Date de début', type: 'date', required: true },
              { name: 'dateFin', label: 'Date de fin', type: 'date', required: true },
              { name: 'description', label: 'Description / conditions', type: 'textarea', required: true },
            ]}
            action={actions.exclureTemporairement}
          />
        </div>
      </SectionBlock>

      {/* VIE SCOLAIRE+ */}
      <SectionBlock
        title="Registre des retards (billets numérotés)"
        description="Chaque retard reçoit un billet B-#### — alerte automatique aux parents au 3e retard non justifié sur 30 jours"
        action={
          <ModalForm
            trigger={<CreateButton label="Enregistrer un retard" />}
            title="Nouveau retard"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', required: true, options: (initialData.eleves ?? []).map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom} (${e.matricule})` })) },
              { name: 'dateHeure', label: 'Date et heure', type: 'datetime-local', required: true },
              { name: 'dureeMinutes', label: 'Durée du retard (min)', type: 'number', defaultValue: '15' },
              { name: 'motif', label: 'Motif avancé' },
            ]}
            action={actionsExt.enregistrerRetard}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'billetNumero', label: 'Billet' },
            { key: 'eleve', label: 'Élève', render: (r: any) => `${r.eleve?.prenom ?? ''} ${r.eleve?.nom ?? ''}` },
            { key: 'classe', label: 'Classe', render: (r: any) => r.eleve?.classeActuelle?.libelle ?? '—' },
            { key: 'dateHeure', label: 'Le', render: (r: any) => new Date(r.dateHeure).toLocaleString('fr-FR') },
            { key: 'dureeMinutes', label: 'Durée', render: (r: any) => `${r.dureeMinutes} min` },
            { key: 'justifie', label: 'Justifié', render: (r: any) => r.justifie ? <StatusBadge statut="valide" /> : <Button variant="outline" size="sm" onClick={() => actionsExt.justifierRetard(r.id)}>Justifier</Button> },
          ]}
          rows={retards}
          emptyLabel="Aucun retard enregistré"
        />
      </SectionBlock>

      <SectionBlock
        title="Statistiques de discipline (30 jours)"
        description="Pilotage censeur : incidents, retards, absences par classe et élèves à suivre"
        action={<Button size="sm" onClick={async () => { const r = await actionsExt.statsDiscipline(30); setStats(r); }}>Calculer</Button>}
      >
        {stats?.ok ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <StatCard title="Incidents" value={stats.totaux.incidents} color="amber" />
              <StatCard title="Graves" value={stats.totaux.graves} color="rose" />
              <StatCard title="Retards" value={stats.totaux.retards} sub={`${stats.totaux.retardsNonJustifies} non justifiés`} color="blue" />
              <StatCard title="Absences" value={stats.totaux.absences} color="purple" />
              <StatCard title="Sanctions" value={stats.totaux.sanctions} color="emerald" />
            </div>
            <DataTable
              columns={[
                { key: 'classe', label: 'Classe' }, { key: 'incidents', label: 'Incidents' },
                { key: 'retards', label: 'Retards' }, { key: 'absences', label: 'Absences' },
              ]}
              rows={stats.parClasse}
              emptyLabel="—"
            />
            <div>
              <div className="text-sm font-semibold mb-1">Élèves à suivre (score = incidents×3 + retards×2 + absences)</div>
              <DataTable
                columns={[
                  { key: 'eleve', label: 'Élève' }, { key: 'score', label: 'Score' },
                  { key: 'incidents', label: 'Incidents' }, { key: 'retards', label: 'Retards' }, { key: 'absences', label: 'Absences' },
                ]}
                rows={stats.elevesASuivre}
                emptyLabel="Aucun"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Cliquez sur « Calculer » pour actualiser les statistiques.</p>
        )}
      </SectionBlock>

      <SectionBlock
        title="Surveillance des compositions & examens"
        description="Planning des épreuves avec affectation des surveillants (anti-chevauchement automatique)"
        action={
          <ModalForm
            trigger={<CreateButton label="Planifier une épreuve" />}
            title="Nouvelle épreuve surveillée"
            fields={[
              { name: 'intitule', label: 'Intitulé', required: true, placeholder: 'Composition Mathématiques T1' },
              { name: 'dateHeureDebut', label: 'Début', type: 'datetime-local', required: true },
              { name: 'dateHeureFin', label: 'Fin', type: 'datetime-local', required: true },
              { name: 'surveillantsIds', label: 'Surveillants (ids séparés par virgules)', required: true },
              { name: 'nbElevesPrevus', label: 'Élèves attendus', type: 'number' },
              { name: 'observations', label: 'Observations' },
            ]}
            action={actionsExt.creerSurveillance}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'intitule', label: 'Épreuve' },
            { key: 'dateHeureDebut', label: 'Début', render: (x: any) => new Date(x.dateHeureDebut).toLocaleString('fr-FR') },
            { key: 'dateHeureFin', label: 'Fin', render: (x: any) => new Date(x.dateHeureFin).toLocaleTimeString('fr-FR') },
            { key: 'surveillants', label: 'Surveillants', render: (x: any) => `${JSON.parse(x.surveillantsIds ?? '[]').length} affecté(s)` },
            { key: 'nbElevesPrevus', label: 'Élèves' },
          ]}
          rows={surveillancesExamens}
          emptyLabel="Aucune épreuve planifiée"
        />
      </SectionBlock>

      <SectionBlock
        title="Conseils de discipline"
        description="Séances formalisées : convocation automatique des parents, décision notifiée"
        action={
          <ModalForm
            trigger={<CreateButton label="Convoquer un conseil" />}
            title="Conseil de discipline"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', required: true, options: (initialData.eleves ?? []).map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })) },
              { name: 'dateConseil', label: 'Date du conseil', type: 'datetime-local', required: true },
              { name: 'membresIds', label: 'Membres (ids séparés par virgules)', required: true },
              { name: 'faits', label: 'Faits reprochés', type: 'textarea', required: true },
            ]}
            action={actionsExt.creerConseilDiscipline}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (c: any) => `${c.eleve?.prenom ?? ''} ${c.eleve?.nom ?? ''}` },
            { key: 'dateConseil', label: 'Date', render: (c: any) => new Date(c.dateConseil).toLocaleString('fr-FR') },
            { key: 'statut', label: 'Statut', render: (c: any) => <StatusBadge statut={c.statut === 'tenu' ? 'valide' : 'en_attente'} /> },
            { key: 'decision', label: 'Décision', render: (c: any) => c.decision ?? '—' },
            { key: 'action', label: '', render: (c: any) => c.statut !== 'tenu' ? (
              <Button variant="outline" size="sm" onClick={() => {
                const decision = window.prompt('Décision du conseil :');
                if (decision) actionsExt.deciderConseilDiscipline(c.id, decision);
              }}>Statuer</Button>
            ) : null },
          ]}
          rows={conseilsDiscipline}
          emptyLabel="Aucun conseil programmé"
        />
      </SectionBlock>
    </div>
  );
}
