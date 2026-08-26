'use client';

// ====================================================================
// Module Pédagogique — le cœur du système
// - Évaluations (CRUD + saisie de notes en grille)
// - Génération de bulletins (workflow: en_construction -> valide_pp -> publie)
// - Évaluation par compétences (cycles non chiffrés, maternelle)
// - Programmes + avancement (suivi des chapitres)
// ====================================================================

import { useState, useTransition } from 'react';
import { BookOpen, ClipboardCheck, Award, Plus, Eye, ListChecks } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, EmptyState, FormField } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import * as actions from '@/app/actions';
import { formatDate, formatDateTime, statutColor } from '@/lib/format';

export default function PedagogiqueModule({ initialData }: { initialData: any }) {
  const classes = initialData.classes ?? [];
  const matieres = initialData.matieres ?? [];
  const enseignants = initialData.personnels ?? [];
  const periodes = initialData.periodes ?? [];
  const evaluations = initialData.evaluations ?? [];
  const notes = initialData.notes ?? [];
  const bulletins = initialData.bulletins ?? [];
  const eleves = initialData.eleves ?? [];
  const competences = initialData.competences ?? [];
  const evalsCompetence = initialData.evalsCompetence ?? [];
  const programmes = initialData.programmes ?? [];
  const avancements = initialData.avancements ?? [];
  const dirUserId = initialData.dirUserId ?? 'system';

  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(evaluations[0]?.id ?? null);
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const evalSelectionnee = evaluations.find((e: any) => e.id === selectedEvalId);
  const elevesDeLaClasse = evalSelectionnee ? eleves.filter((e: any) => e.classeActuelleId === evalSelectionnee.classeId) : [];
  const notesPourEval = evalSelectionnee ? notes.filter((n: any) => n.evaluationId === evalSelectionnee.id) : [];

  // Grille de saisie de notes
  function renderSaisieNotes() {
    if (!evalSelectionnee) return <EmptyState title="Sélectionnez une évaluation" description="Choisissez une évaluation dans la liste pour saisir les notes." />;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Saisie des notes — {evalSelectionnee.intitule}</span>
            <StatusBadge statut={evalSelectionnee.statut} />
          </CardTitle>
          <p className="text-xs text-gray-500">
            {elevesDeLaClasse.length} élèves · Note sur {evalSelectionnee.sur} · Coefficient {evalSelectionnee.coefficient}
            <br />
            Astuce : saisir "abs" pour un absent — la note n'entrera pas dans le calcul de la moyenne.
          </p>
        </CardHeader>
        <CardContent>
          <form action={async (formData) => { await actions.saisirNotes(formData); }} className="space-y-3">
            <input type="hidden" name="evaluationId" value={evalSelectionnee.id} />
            <input type="hidden" name="saisiParId" value={dirUserId} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {elevesDeLaClasse.map((e: any) => {
                const n = notesPourEval.find((x: any) => x.eleveId === e.id);
                return (
                  <FormField key={e.id} label={`${e.prenom} ${e.nom}`}>
                    <Input
                      type="text"
                      name={`note_${e.id}`}
                      defaultValue={n?.absent ? 'abs' : (n?.valeur ?? '')}
                      placeholder="—"
                      className="w-full"
                    />
                  </FormField>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">Enregistrer les notes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Workflow bulletins
  function renderBulletins() {
    return (
      <div className="space-y-4">
        <SectionBlock
          title="Circuit de validation des bulletins"
          description="Génération -> Validation PP -> Validation direction -> Publication"
        >
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (b) => { const e = eleves.find((x: any) => x.id === b.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'version', label: 'V' },
              { key: 'moyenneGenerale', label: 'Moy.' },
              { key: 'statut', label: 'Statut', render: (b) => <StatusBadge statut={b.statut} /> },
              { key: 'dateCreation', label: 'Créé', render: (b) => formatDate(b.dateCreation) },
              {
                key: 'actions', label: 'Actions', render: (b) => (
                  <div className="flex gap-1 flex-wrap">
                    {b.statut === 'en_construction' && (
                      <Button size="sm" variant="outline" onClick={() => startTransition(() => { void actions.changerStatutBulletin(b.id, 'valide_pp', dirUserId, 'pp'); })}>
                        Valider PP
                      </Button>
                    )}
                    {b.statut === 'valide_pp' && (
                      <Button size="sm" variant="outline" onClick={() => startTransition(() => { void actions.changerStatutBulletin(b.id, 'publie', dirUserId, 'direction'); })}>
                        Publier
                      </Button>
                    )}
                    {b.statut === 'publie' && (
                      <Button size="sm" variant="outline" onClick={() => startTransition(() => { void actions.changerStatutBulletin(b.id, 'rectifie', dirUserId, 'direction'); })}>
                        Rectifier
                      </Button>
                    )}
                  </div>
                )
              },
            ]}
            rows={bulletins}
            emptyLabel="Aucun bulletin généré. Utilisez le bouton ci-dessous pour générer un bulletin pour un élève."
          />
        </SectionBlock>

        <div className="flex gap-2">
          <ModalForm
            trigger={<CreateButton label="Générer un bulletin" />}
            title="Générer un bulletin"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'periodeId', label: 'Période', type: 'select', options: periodes.map((p: any) => ({ value: p.id, label: p.libelle })), required: true },
              { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })) },
              { name: 'creeParId', label: 'Créé par', defaultValue: dirUserId, type: 'text' },
            ]}
            action={actions.genererBulletin}
          />
        </div>

        {selectedBulletinId && (() => {
          const b = bulletins.find((x: any) => x.id === selectedBulletinId);
          if (!b) return null;
          const eleve = eleves.find((e: any) => e.id === b.eleveId);
          const moyennes = JSON.parse(b.moyennes || '[]');
          return (
            <Card className="border-2 border-emerald-200">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle>Bulletin — {eleve?.prenom} {eleve?.nom} (v{b.version})</CardTitle>
                <StatusBadge statut={b.statut} />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {moyennes.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-100">
                      <span>{m.matiere} <span className="text-xs text-gray-400">(coef {m.coefficient}, {m.nbNotes} notes)</span></span>
                      <span className="font-semibold">{m.moyenne}/20</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-base font-bold pt-2">
                    <span>Moyenne générale</span>
                    <span>{b.moyenneGenerale ?? '—'}/20</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    );
  }

  // Évaluation par compétences (maternelle)
  function renderCompetences() {
    return (
      <div className="space-y-4">
        <SectionBlock
          title="Évaluation par compétences"
          description="Mode non chiffré — réservé aux cycles non chiffrés (ex. maternelle)"
        >
          <DataTable
            columns={[
              { key: 'libelle', label: 'Compétence' },
              { key: 'cycle', label: 'Cycle', render: (c) => 'Maternelle' },
              { key: 'ordre', label: 'Ordre' },
            ]}
            rows={competences}
            emptyLabel="Aucune compétence définie — définissez votre référentiel."
          />
        </SectionBlock>
        <SectionBlock title="Évaluations saisies (élèves/compétences)" description="Niveaux d'acquisition : non acquis / en cours / acquis / maîtrisé">
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (e) => { const el = eleves.find((x: any) => x.id === e.eleveId); return el ? `${el.prenom} ${el.nom}` : '—'; } },
              { key: 'competence', label: 'Compétence', render: (e) => competences.find((c: any) => c.id === e.competenceId)?.libelle ?? '—' },
              { key: 'niveauAcquisition', label: 'Niveau', render: (e) => <StatusBadge statut={e.niveauAcquisition} /> },
              { key: 'commentaire', label: 'Commentaire' },
            ]}
            rows={evalsCompetence}
            emptyLabel="Aucune évaluation par compétence saisie."
          />
        </SectionBlock>
      </div>
    );
  }

  // Programmes + avancement
  function renderProgrammes() {
    return (
      <div className="space-y-4">
        <SectionBlock title="Programmes pédagogiques" description="Programmes par matière et niveau">
          <DataTable
            columns={[
              { key: 'titre', label: 'Titre' },
              { key: 'matiere', label: 'Matière', render: (p) => matieres.find((m: any) => m.id === p.matiereId)?.libelle ?? '—' },
              { key: 'niveau', label: 'Niveau', render: (p) => p.niveauId },
              { key: 'publie', label: 'Statut', render: (p) => p.publie ? <StatusBadge statut="publie" /> : <StatusBadge statut="planifie" /> },
            ]}
            rows={programmes}
            emptyLabel="Aucun programme défini"
          />
        </SectionBlock>
        <SectionBlock title="Avancement par classe" description="Suivi des chapitres enseignés">
          <DataTable
            columns={[
              { key: 'classe', label: 'Classe', render: (a) => classes.find((c: any) => c.id === a.classeId)?.libelle ?? '—' },
              { key: 'chapitre', label: 'Chapitre', render: (a) => programmes.find((p: any) => p.id === a.chapitreId)?.titre ?? `Chapitre ${a.chapitreId.slice(-4)}` },
              { key: 'pourcentage', label: 'Progression', render: (a) => (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded">
                    <div className="h-2 bg-emerald-500 rounded" style={{ width: `${a.pourcentage}%` }} />
                  </div>
                  <span className="text-xs font-medium">{a.pourcentage}%</span>
                </div>
              ) },
              { key: 'dateMaj', label: 'Maj', render: (a) => formatDate(a.dateMaj) },
            ]}
            rows={avancements}
            emptyLabel="Aucun avancement déclaré"
          />
        </SectionBlock>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Pédagogique"
        subtitle="Évaluations, notes, bulletins, compétences, programmes"
        actions={
          <ModalForm
            trigger={<CreateButton label="Nouvelle évaluation" />}
            title="Créer une évaluation"
            fields={[
              { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })) },
              { name: 'matiereId', label: 'Matière', type: 'select', options: matieres.map((m: any) => ({ value: m.id, label: m.libelle })) },
              { name: 'enseignantId', label: 'Enseignant', type: 'select', options: enseignants.map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })) },
              { name: 'periodeId', label: 'Période', type: 'select', options: periodes.map((p: any) => ({ value: p.id, label: p.libelle })) },
              { name: 'intitule', label: 'Intitulé', required: true },
              { name: 'type', label: 'Type', type: 'select', options: [{ value: 'devoir', label: 'Devoir' }, { value: 'composition', label: 'Composition' }, { value: 'interrogation', label: 'Interrogation' }] },
              { name: 'date', label: 'Date', type: 'date', required: true },
              { name: 'sur', label: 'Barème', type: 'number', defaultValue: '20' },
              { name: 'coefficient', label: 'Coefficient', type: 'number', defaultValue: '1', step: '0.1' },
            ]}
            action={actions.creerEvaluation}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Évaluations" value={evaluations.length} icon={BookOpen} color="emerald" />
        <StatCard title="Notes saisies" value={notes.length} icon={ClipboardCheck} color="blue" />
        <StatCard title="Bulletins générés" value={bulletins.length} icon={Award} color="purple" />
        <StatCard title="Évaluations par compétence" value={evalsCompetence.length} sub="maternelle" icon={ListChecks} color="amber" />
      </div>

      <Tabs defaultValue="notes">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4 h-auto">
          <TabsTrigger value="notes" className="text-xs">Saisie notes</TabsTrigger>
          <TabsTrigger value="evaluations" className="text-xs">Évaluations</TabsTrigger>
          <TabsTrigger value="bulletins" className="text-xs">Bulletins</TabsTrigger>
          <TabsTrigger value="competences" className="text-xs">Compétences</TabsTrigger>
          <TabsTrigger value="programmes" className="text-xs">Programmes</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Évaluations</CardTitle></CardHeader>
              <CardContent className="p-2 max-h-[60vh] overflow-y-auto">
                {evaluations.map((e: any) => (
                  <button key={e.id} onClick={() => setSelectedEvalId(e.id)}
                    className={`w-full text-left p-2 rounded text-sm hover:bg-gray-50 ${selectedEvalId === e.id ? 'bg-emerald-50 border border-emerald-200' : ''}`}>
                    <div className="font-medium">{e.intitule}</div>
                    <div className="text-xs text-gray-500">
                      {matieres.find((m: any) => m.id === e.matiereId)?.libelle} · {formatDate(e.date)}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
            <div className="lg:col-span-2">{renderSaisieNotes()}</div>
          </div>
        </TabsContent>

        <TabsContent value="evaluations">
          <DataTable
            columns={[
              { key: 'intitule', label: 'Intitulé' },
              { key: 'matiere', label: 'Matière', render: (e) => matieres.find((m: any) => m.id === e.matiereId)?.libelle },
              { key: 'classe', label: 'Classe', render: (e) => classes.find((c: any) => c.id === e.classeId)?.libelle },
              { key: 'type', label: 'Type' },
              { key: 'date', label: 'Date', render: (e) => formatDate(e.date) },
              { key: 'sur', label: '/barème' },
              { key: 'coefficient', label: 'Coef' },
              { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
              { key: 'nbNotes', label: 'Saisies', render: (e) => `${notes.filter((n: any) => n.evaluationId === e.id).length}/${eleves.filter((el: any) => el.classeActuelleId === e.classeId).length}` },
            ]}
            rows={evaluations}
          />
        </TabsContent>

        <TabsContent value="bulletins">{renderBulletins()}</TabsContent>
        <TabsContent value="competences">{renderCompetences()}</TabsContent>
        <TabsContent value="programmes">{renderProgrammes()}</TabsContent>
      </Tabs>
    </div>
  );
}
