'use client';

// ====================================================================
// Module Pédagogique — le cœur du système
// - Évaluations (CRUD + saisie de notes en grille)
// - Génération de bulletins (workflow: en_construction -> valide_pp -> publie)
// - Évaluation par compétences (cycles non chiffrés, maternelle)
// - Programmes + avancement (suivi des chapitres)
// ====================================================================

import { useState, useTransition } from 'react';
import { BookOpen, ClipboardCheck, Award, Plus, Eye, ListChecks, Printer } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, EmptyState, FormField, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import * as actions from '@/app/actions';
import * as actionsExt from '@/app/actions/extensions';
import * as ext from '@/app/actions/completions';
import { formatDate, formatDateTime, statutColor } from '@/lib/format';

// Libellés français des vocabulaires métier (B10)
const TYPE_DEVOIR_LABELS: Record<string, string> = {
  devoir: 'Devoir',
  dm: 'Devoir maison',
  projet: 'Projet',
  expose: 'Exposé',
};
const STATUT_DEVOIR_LABELS: Record<string, string> = {
  assigne: 'Assigné',
  ramasse: 'Ramassé',
  corrige: 'Corrigé',
  rendu: 'Rendu',
};
const MOTIF_DISPENSE_LABELS: Record<string, string> = {
  medical: 'Médical',
  sportif: 'Sportif',
  religieux: 'Religieux',
  autre: 'Autre',
};
const STATUT_DISPENSE_LABELS: Record<string, string> = {
  demandee: 'Demandée',
  validee: 'Validée',
  refusee: 'Refusée',
};

// Ouvre une fenêtre d'impression contenant le document (pattern RecuPaiement).
function imprimerDocument(titre: string, elementId: string) {
  const contenu = document.getElementById(elementId)?.innerHTML ?? '';
  const f = window.open('', '_blank', 'width=794,height=900');
  if (f) {
    f.document.write(`<html><head><title>${titre}</title><style>body{font-family:system-ui,sans-serif;padding:24px;font-size:13px;color:#111} table{width:100%;border-collapse:collapse;margin:12px 0} th,td{border:1px solid #999;padding:6px 8px;text-align:left} th{background:#f3f4f6;font-weight:600}</style></head><body>${contenu}</body></html>`);
    f.document.close();
    f.print();
  }
}

// --------------------------------------------------------------------
// M10 — parse bulletin.moyennes : deux formats coexistent en base :
//  - nouveau : [{matiere, coefficient, moyenne, nbNotes}]
//  - ancien  : {"MATHS": 14.5} (code matière → moyenne)
// --------------------------------------------------------------------
function parserMoyennes(brut: string | null | undefined): Array<{ nom: string; moyenne?: number; coefficient?: number; nbNotes?: number }> {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(brut || 'null');
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    return (parsed as any[])
      .map((m) => ({
        nom: String(m?.matiere ?? '').trim(),
        moyenne: typeof m?.moyenne === 'number' ? m.moyenne : undefined,
        coefficient: typeof m?.coefficient === 'number' ? m.coefficient : undefined,
        nbNotes: typeof m?.nbNotes === 'number' ? m.nbNotes : undefined,
      }))
      .filter((m) => m.nom.length > 0);
  }
  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed as Record<string, unknown>)
      .map(([nom, moyenne]) => ({ nom: nom.trim(), moyenne: typeof moyenne === 'number' ? moyenne : undefined }))
      .filter((m) => m.nom.length > 0);
  }
  return [];
}

/** Résout les matières d'un bulletin en IDs réels (par libellé ou code) — sinon toutes les matières de l'école. */
function matieresDuBulletin(bulletin: any, matieres: any[]): Array<{ id: string; libelle: string; moyenne?: number }> {
  const normaliser = (s: string) => s.trim().toLowerCase();
  const resolues: Array<{ id: string; libelle: string; moyenne?: number }> = parserMoyennes(bulletin?.moyennes)
    .map((b): { id: string; libelle: string; moyenne?: number } | null => {
      const m = matieres.find((x: any) => normaliser(String(x.libelle ?? '')) === normaliser(b.nom) || normaliser(String(x.code ?? '')) === normaliser(b.nom));
      return m ? { id: String(m.id), libelle: String(m.libelle), moyenne: b.moyenne } : null;
    })
    .filter((x): x is { id: string; libelle: string; moyenne?: number } => x !== null);
  if (resolues.length > 0) return resolues;
  return matieres.map((m: any) => ({ id: String(m.id), libelle: String(m.libelle) }));
}

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
  const devoirs = initialData.devoirs ?? [];
  const cahiersTexte = initialData.cahiersTexte ?? [];
  const dispenses = initialData.dispenses ?? [];

  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(evaluations[0]?.id ?? null);
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null);
  const [erreurNotes, setErreurNotes] = useState<string | null>(null);
  // F5.3 — feedback uniforme : plus aucun appel d'action silencieux.
  const retourBulletins = useActionFeedback();
  const retourEvaluations = useActionFeedback();
  const retourDevoirs = useActionFeedback();
  const retourCahier = useActionFeedback();
  const retourDispenses = useActionFeedback();

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
        {erreurNotes && (
          <div className="mx-6 mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {erreurNotes}
          </div>
        )}
        <CardContent>
          <form action={async (formData) => {
            setErreurNotes(null);
            const r = await actions.saisirNotes(formData);
            if (r && r.ok === false) setErreurNotes(r.error);
          }} className="space-y-3">
            <input type="hidden" name="evaluationId" value={evalSelectionnee.id} />
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
          {retourBulletins.Message}
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (b) => { const e = eleves.find((x: any) => x.id === b.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'version', label: 'V' },
              {key: 'moyenneGenerale', label: 'Moy.' },
              { key: 'rang', label: 'Rang', render: (b) => b.rang ? `${b.rang}ᵉ` : '—' },
              { key: 'appreciationGenerale', label: 'Appréciation', render: (b) => <span className="text-xs text-gray-600 line-clamp-1">{b.appreciationGenerale ?? '—'}</span> },
              { key: 'statut', label: 'Statut', render: (b) => <StatusBadge statut={b.statut} /> },
              { key: 'dateCreation', label: 'Créé', render: (b) => formatDate(b.dateCreation) },
              {
                key: 'actions', label: 'Actions', render: (b) => (
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setSelectedBulletinId(b.id)}>
                      Détail
                    </Button>
                    {b.statut === 'en_construction' && (
                      <Button size="sm" variant="outline" disabled={retourBulletins.pending} onClick={() => retourBulletins.run(() => actions.changerStatutBulletin(b.id, 'valide_pp'), 'Bulletin validé par le PP')}>
                        Valider PP
                      </Button>
                    )}
                    {b.statut === 'valide_pp' && (
                      <Button size="sm" variant="outline" disabled={retourBulletins.pending} onClick={() => retourBulletins.run(() => actions.changerStatutBulletin(b.id, 'publie'), 'Bulletin publié')}>
                        Publier
                      </Button>
                    )}
                    {b.statut === 'publie' && (
                      <Button size="sm" variant="outline" disabled={retourBulletins.pending} onClick={() => retourBulletins.run(() => actions.changerStatutBulletin(b.id, 'rectifie'), 'Bulletin remis en rectification')}>
                        Rectifier
                      </Button>
                    )}
                    {b.statut !== 'publie' && b.statut !== 'annule' && (
                      <Button size="sm" variant="outline" disabled={retourBulletins.pending} onClick={() => retourBulletins.run(() => actions.changerStatutBulletin(b.id, 'annule'), 'Bulletin annulé')}>
                        Annuler
                      </Button>
                    )}
                    <AppreciationsMatiereDialog bulletin={b} matieres={matieres} />
                    <BulletinImprimable bulletinId={b.id} />
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
              { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })), required: true },
            ]}
            action={actions.genererBulletin}
          />
        </div>

        {selectedBulletinId && (() => {
          const b = bulletins.find((x: any) => x.id === selectedBulletinId);
          if (!b) return null;
          const eleve = eleves.find((e: any) => e.id === b.eleveId);
          const moyennes = parserMoyennes(b.moyennes);
          return (
            <Card className="border-2 border-emerald-200">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle>Bulletin — {eleve?.prenom} {eleve?.nom} (v{b.version})</CardTitle>
                <StatusBadge statut={b.statut} />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {moyennes.map((m, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-100">
                      <span>{m.nom} <span className="text-xs text-gray-400">(coef {m.coefficient ?? '—'}, {m.nbNotes ?? '—'} notes)</span></span>
                      <span className="font-semibold">{m.moyenne !== undefined ? `${m.moyenne}/20` : '—'}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-base font-bold pt-2">
                    <span>Moyenne générale</span>
                    <span>{b.moyenneGenerale ?? '—'}/20</span>
                  </div>
                  {(b.rang || b.appreciationGenerale) && (
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-gray-600">Rang {b.rang ? `${b.rang}ᵉ de la classe` : '—'}</span>
                      <span className="text-gray-600 italic">{b.appreciationGenerale ?? ''}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    );
  }

  // --------------------------------------------------------------------
  // B10 — DEVOIRS & RENDUS
  // --------------------------------------------------------------------
  function renderDevoirs() {
    return (
      <div className="space-y-4">
        {retourDevoirs.Message}
        <SectionBlock
          title="Devoirs assignés"
          description="Devoirs, devoirs maison, projets et exposés — suivi des rendus par classe"
          action={
            <ModalForm
              trigger={<CreateButton label="Nouveau devoir" />}
              title="Assigner un devoir"
              fields={[
                { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })), required: true },
                { name: 'matiereId', label: 'Matière', type: 'select', options: matieres.map((m: any) => ({ value: m.id, label: m.libelle })) },
                { name: 'intitule', label: 'Intitulé', required: true, placeholder: 'Exercices chapitre 3' },
                { name: 'description', label: 'Consignes', type: 'textarea' },
                { name: 'dateRendu', label: 'À rendre le', type: 'date', required: true },
                { name: 'sur', label: 'Barème', type: 'number', defaultValue: '20' },
                { name: 'type', label: 'Type', type: 'select', options: [
                  { value: 'devoir', label: 'Devoir' },
                  { value: 'dm', label: 'Devoir maison' },
                  { value: 'projet', label: 'Projet' },
                  { value: 'expose', label: 'Exposé' },
                ] },
              ]}
              action={actionsExt.creerDevoir}
            />
          }
        >
          <DataTable
            columns={[
              { key: 'classe', label: 'Classe', render: (d) => d.classe?.libelle ?? classes.find((c: any) => c.id === d.classeId)?.libelle ?? '—' },
              { key: 'intitule', label: 'Intitulé' },
              { key: 'type', label: 'Type', render: (d) => TYPE_DEVOIR_LABELS[d.type] ?? d.type },
              { key: 'dateRendu', label: 'À rendre le', render: (d) => formatDate(d.dateRendu) },
              { key: 'sur', label: 'Barème', render: (d) => `${d.sur ?? 20}` },
              { key: 'statut', label: 'Statut', render: (d) => <StatusBadge statut={d.statut} label={STATUT_DEVOIR_LABELS[d.statut] ?? d.statut} /> },
              { key: 'rendus', label: 'Rendus', render: (d) => `${(d.rendus ?? []).length} rendu(s)` },
            ]}
            rows={devoirs}
            emptyLabel="Aucun devoir assigné — utilisez le bouton « Nouveau devoir »."
          />
        </SectionBlock>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // B10 — CAHIER DE TEXTES NUMÉRIQUE
  // --------------------------------------------------------------------
  function renderCahierTextes() {
    return (
      <div className="space-y-4">
        {retourCahier.Message}
        <SectionBlock
          title="Cahier de textes numérique"
          description="Par classe et matière : contenu des séances, travail à faire, publication aux familles"
          action={
            <ModalForm
              trigger={<CreateButton label="Nouvelle entrée" />}
              title="Ajouter une entrée au cahier de textes"
              fields={[
                { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })), required: true },
                { name: 'matiereId', label: 'Matière', type: 'select', options: matieres.map((m: any) => ({ value: m.id, label: m.libelle })) },
                { name: 'dateCours', label: 'Date du cours', type: 'date', required: true },
                { name: 'contenu', label: 'Contenu du cours', type: 'textarea', required: true },
                { name: 'travailAFaire', label: 'Travail à faire', type: 'textarea' },
                { name: 'publier', label: 'Publier immédiatement aux familles', type: 'checkbox' },
              ]}
              action={actionsExt.creerEntreeCahier}
            />
          }
        >
          {cahiersTexte.length === 0 && (
            <EmptyState title="Aucun cahier de textes" description="Créez une première entrée : le cahier de la classe et matière sera ouvert automatiquement." />
          )}
          <div className="space-y-4">
            {cahiersTexte.map((ct: any) => {
              const entrees = [...(ct.entrees ?? [])].sort((a: any, b: any) => new Date(b.dateCours).getTime() - new Date(a.dateCours).getTime());
              return (
                <Card key={ct.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {ct.classe?.libelle ?? classes.find((c: any) => c.id === ct.classeId)?.libelle ?? 'Classe'}
                      {ct.matiereId && <> — {matieres.find((m: any) => m.id === ct.matiereId)?.libelle ?? 'Matière'}</>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <DataTable
                      columns={[
                        { key: 'dateCours', label: 'Date', render: (e) => formatDate(e.dateCours) },
                        { key: 'contenu', label: 'Contenu du cours', render: (e) => <span className="text-xs text-gray-700 line-clamp-2">{e.contenu}</span> },
                        { key: 'travailAFaire', label: 'Travail à faire', render: (e) => <span className="text-xs text-gray-700 line-clamp-2">{e.travailAFaire ?? '—'}</span> },
                        { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} label={e.statut === 'publie' ? 'Publié' : e.statut === 'valide' ? 'Validé' : 'Brouillon'} /> },
                        {
                          key: 'actions', label: 'Actions', render: (e) => e.statut === 'brouillon' ? (
                            <Button size="sm" variant="outline" disabled={retourCahier.pending} onClick={() => retourCahier.run(() => actionsExt.publierEntreeCahier(e.id), 'Entrée publiée aux familles')}>
                              Publier
                            </Button>
                          ) : '—',
                        },
                      ]}
                      rows={entrees}
                      emptyLabel="Aucune entrée pour ce cahier."
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </SectionBlock>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // B11 — DISPENSES (EPS, médical…)
  // --------------------------------------------------------------------
  function renderDispenses() {
    return (
      <div className="space-y-4">
        {retourDispenses.Message}
        <SectionBlock
          title="Dispenses d'activité"
          description="Dispenses médicales, sportives ou religieuses — validation par la vie scolaire"
          action={
            <ModalForm
              trigger={<CreateButton label="Nouvelle dispense" />}
              title="Demander une dispense"
              fields={[
                { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
                { name: 'matiereId', label: 'Matière (facultative)', type: 'select', options: matieres.map((m: any) => ({ value: m.id, label: m.libelle })) },
                { name: 'motif', label: 'Motif', type: 'select', required: true, options: [
                  { value: 'medical', label: 'Médical' },
                  { value: 'sportif', label: 'Sportif' },
                  { value: 'religieux', label: 'Religieux' },
                  { value: 'autre', label: 'Autre' },
                ] },
                { name: 'description', label: 'Description', type: 'textarea', required: true },
                { name: 'dateDebut', label: 'Date de début', type: 'date', required: true },
                { name: 'dateFin', label: 'Date de fin', type: 'date' },
              ]}
              action={actionsExt.creerDispense}
            />
          }
        >
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (d) => { const e = d.eleve ?? eleves.find((x: any) => x.id === d.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'matiere', label: 'Matière', render: (d) => d.matiereId ? matieres.find((m: any) => m.id === d.matiereId)?.libelle ?? '—' : 'Toutes' },
              { key: 'motif', label: 'Motif', render: (d) => MOTIF_DISPENSE_LABELS[d.motif] ?? d.motif },
              { key: 'description', label: 'Description', render: (d) => <span className="text-xs text-gray-600 line-clamp-2">{d.description}</span> },
              { key: 'periode', label: 'Période', render: (d) => `${formatDate(d.dateDebut)} → ${d.dateFin ? formatDate(d.dateFin) : 'indéterminée'}` },
              { key: 'statut', label: 'Statut', render: (d) => <StatusBadge statut={d.statut} label={STATUT_DISPENSE_LABELS[d.statut] ?? d.statut} /> },
              {
                key: 'actions', label: 'Actions', render: (d) => d.statut === 'demandee' ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-emerald-700" disabled={retourDispenses.pending} onClick={() => retourDispenses.run(() => actionsExt.traiterDispense(d.id, 'validee'), 'Dispense validée')}>
                      Valider
                    </Button>
                    <Button size="sm" variant="outline" className="text-rose-700" disabled={retourDispenses.pending} onClick={() => retourDispenses.run(() => actionsExt.traiterDispense(d.id, 'refusee'), 'Dispense refusée')}>
                      Refuser
                    </Button>
                  </div>
                ) : '—',
              },
            ]}
            rows={dispenses}
            emptyLabel="Aucune dispense enregistrée."
          />
        </SectionBlock>
      </div>
    );
  }

  // Évaluation par compétences (maternelle)
  function renderCompetences() {
    return (
      <div className="space-y-4">
        <SectionBlock
          title="Saisie d'une évaluation par compétence"
          description="Choisissez un élève et une compétence, fixez le niveau d'acquisition puis enregistrez"
        >
          <SaisieCompetenceSimple eleves={eleves} competences={competences} periodes={periodes} />
        </SectionBlock>
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
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-4 h-auto">
          <TabsTrigger value="notes" className="text-xs">Saisie notes</TabsTrigger>
          <TabsTrigger value="evaluations" className="text-xs">Évaluations</TabsTrigger>
          <TabsTrigger value="devoirs" className="text-xs">Devoirs</TabsTrigger>
          <TabsTrigger value="cahier" className="text-xs">Cahier de textes</TabsTrigger>
          <TabsTrigger value="bulletins" className="text-xs">Bulletins</TabsTrigger>
          <TabsTrigger value="competences" className="text-xs">Compétences</TabsTrigger>
          <TabsTrigger value="programmes" className="text-xs">Programmes</TabsTrigger>
          <TabsTrigger value="dispenses" className="text-xs">Dispenses</TabsTrigger>
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

        <TabsContent value="evaluations" className="space-y-3">
          {retourEvaluations.Message}
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
              { key: 'nbNotes', label: 'Saisies', render: (e) => `${e._count?.notes ?? notes.filter((n: any) => n.evaluationId === e.id).length}/${eleves.filter((el: any) => el.classeActuelleId === e.classeId).length}` },
              {
                key: 'actions', label: 'Actions', render: (e) => {
                  const nbNotes = e._count?.notes ?? notes.filter((n: any) => n.evaluationId === e.id).length;
                  return (
                    <div className="flex gap-1 items-center flex-wrap">
                      <ModalForm
                        trigger={<Button size="sm" variant="outline">Modifier</Button>}
                        title={`Modifier l'évaluation — ${e.intitule}`}
                        fields={[
                          { name: 'evaluationId', type: 'hidden', label: 'ID', defaultValue: e.id },
                          { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })), required: true },
                          { name: 'matiereId', label: 'Matière', type: 'select', options: matieres.map((m: any) => ({ value: m.id, label: m.libelle })), required: true },
                          { name: 'enseignantId', label: 'Enseignant', type: 'select', options: enseignants.map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })), required: true },
                          { name: 'periodeId', label: 'Période', type: 'select', options: periodes.map((p: any) => ({ value: p.id, label: p.libelle })), required: true },
                          { name: 'type', label: 'Type', type: 'select', options: [{ value: 'devoir', label: 'Devoir' }, { value: 'composition', label: 'Composition' }, { value: 'interrogation', label: 'Interrogation' }], required: true },
                          { name: 'intitule', label: 'Intitulé', required: true },
                          { name: 'date', label: 'Date', type: 'date', required: true },
                          { name: 'sur', label: 'Barème', type: 'number', required: true },
                          { name: 'coefficient', label: 'Coefficient', type: 'number', step: '0.1', required: true },
                        ]}
                        defaultValues={{
                          evaluationId: e.id,
                          classeId: e.classeId ?? '',
                          matiereId: e.matiereId ?? '',
                          enseignantId: e.enseignantId ?? '',
                          periodeId: e.periodeId ?? '',
                          type: e.type,
                          intitule: e.intitule,
                          date: String(e.date ?? '').slice(0, 10),
                          sur: e.sur,
                          coefficient: e.coefficient,
                        }}
                        action={actions.modifierEvaluation}
                      />
                      {nbNotes === 0 ? (
                        <Button size="sm" variant="outline" disabled={retourEvaluations.pending} onClick={() => retourEvaluations.run(() => actions.supprimerEvaluation(e.id), 'Évaluation supprimée')}>
                          Supprimer
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400" title="Des notes sont rattachées : suppression refusée">verrouillée (notes)</span>
                      )}
                    </div>
                  );
                }
              },
            ]}
            rows={evaluations}
          />
        </TabsContent>

        <TabsContent value="devoirs">{renderDevoirs()}</TabsContent>
        <TabsContent value="cahier">{renderCahierTextes()}</TabsContent>
        <TabsContent value="bulletins">{renderBulletins()}</TabsContent>
        <TabsContent value="competences">{renderCompetences()}</TabsContent>
        <TabsContent value="programmes">{renderProgrammes()}</TabsContent>
        <TabsContent value="dispenses">{renderDispenses()}</TabsContent>
      </Tabs>
    </div>
  );
}

// --------------------------------------------------------------------
// B11 — Saisie simple d'une évaluation par compétence (un élève à la fois)
// --------------------------------------------------------------------
function SaisieCompetenceSimple({ eleves, competences, periodes }: { eleves: any[]; competences: any[]; periodes: any[] }) {
  const retour = useActionFeedback();
  const [periodeId, setPeriodeId] = useState(periodes[0]?.id ?? '');
  const [eleveId, setEleveId] = useState('');
  const [competenceId, setCompetenceId] = useState('');
  const [niveau, setNiveau] = useState('');

  const NIVEAUX: { value: string; label: string }[] = [
    { value: 'non_acquis', label: 'Non acquis' },
    { value: 'en_cours_d_acquisition', label: 'En cours' },
    { value: 'acquis', label: 'Acquis' },
    { value: 'maitrise', label: 'Maîtrise' },
  ];

  function enregistrer() {
    if (!periodeId || !eleveId || !competenceId || !niveau) return;
    const donnees = { periodeId, saisies: [{ eleveId, competenceId, niveauAcquisition: niveau }] };
    const fd = new FormData();
    fd.set('donnees', JSON.stringify(donnees));
    retour.run(() => actionsExt.saisirEvaluationsCompetence(fd), 'Évaluation de compétence enregistrée');
  }

  const classeSelect = 'w-full h-9 rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className="space-y-3">
      {retour.Message}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Période" required>
          <select className={classeSelect} value={periodeId} onChange={(e) => setPeriodeId(e.target.value)}>
            <option value="">— Choisir —</option>
            {periodes.map((p: any) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
          </select>
        </FormField>
        <FormField label="Élève" required>
          <select className={classeSelect} value={eleveId} onChange={(e) => setEleveId(e.target.value)}>
            <option value="">— Choisir —</option>
            {eleves.map((el: any) => <option key={el.id} value={el.id}>{el.prenom} {el.nom}</option>)}
          </select>
        </FormField>
        <FormField label="Compétence" required>
          <select className={classeSelect} value={competenceId} onChange={(e) => setCompetenceId(e.target.value)}>
            <option value="">— Choisir —</option>
            {competences.map((c: any) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Niveau d'acquisition" required>
        <div className="flex flex-wrap gap-2">
          {NIVEAUX.map((n) => (
            <button
              type="button"
              key={n.value}
              onClick={() => setNiveau(n.value)}
              className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                niveau === n.value
                  ? 'bg-emerald-600 border-emerald-600 text-white font-medium'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </FormField>
      <div className="flex justify-end">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={retour.pending || !periodeId || !eleveId || !competenceId || !niveau} onClick={enregistrer}>
          {retour.pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// M10 — APPRÉCIATIONS PAR MATIÈRE : un textarea par matière du bulletin,
// soumis en un seul FormData (clés appr_<matiereId>) vers l'action.
// --------------------------------------------------------------------
function AppreciationsMatiereDialog({ bulletin, matieres }: { bulletin: any; matieres: any[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [retour, setRetour] = useState<string | null>(null);

  const liste = matieresDuBulletin(bulletin, matieres);
  const eleve = bulletin.eleve;

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setRetour(null);
    const formData = new FormData(e.currentTarget);
    formData.set('bulletinId', bulletin.id);
    startTransition(async () => {
      const r: any = await ext.saisirAppreciationsMatiere(formData);
      if (r && r.ok === false) {
        setErreur(r.error ?? 'Enregistrement refusé.');
        return;
      }
      setRetour(`${r?.saisies ?? 0} appréciation(s) par matière enregistrée(s) pour ce bulletin.`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setErreur(null); setRetour(null); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" title="Saisir une appréciation par matière">✍ Appréciations</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Appréciations par matière — {eleve ? `${eleve.prenom} ${eleve.nom}` : 'bulletin'}</DialogTitle>
        </DialogHeader>
        {erreur && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{erreur}</div>}
        {retour && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{retour}</div>}
        {liste.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune matière à commenter (ni moyennes sur le bulletin, ni matières configurées pour l&apos;école).</p>
        ) : (
          <form onSubmit={soumettre} className="space-y-3">
            <input type="hidden" name="bulletinId" value={bulletin.id} />
            {liste.map((m) => (
              <div key={m.id} className="space-y-1.5">
                <label htmlFor={`appr_${m.id}`} className="text-xs font-medium text-gray-700 block">
                  {m.libelle}{m.moyenne !== undefined ? ` — moyenne ${m.moyenne}/20` : ''}
                </label>
                <Textarea id={`appr_${m.id}`} name={`appr_${m.id}`} rows={2} placeholder="Appréciation de la matière (laisser vide pour ne pas modifier)" />
              </div>
            ))}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>Fermer</Button>
              </DialogClose>
              <Button type="submit" disabled={pending} className="bg-emerald-600 hover:bg-emerald-700">
                {pending ? 'Enregistrement…' : 'Enregistrer les appréciations'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------------
// C8 — BULLETIN IMPRIMABLE (chargé à l'ouverture du dialogue)
// --------------------------------------------------------------------
function BulletinImprimable({ bulletinId }: { bulletinId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [bulletin, setBulletin] = useState<any>(null);

  function ouvrir(o: boolean) {
    setOpen(o);
    if (o && !bulletin) {
      setErreur(null);
      startTransition(async () => {
        const r: any = await actionsExt.marquerBulletinImprimable(bulletinId);
        if (r && r.ok === false) setErreur(r.error ?? 'Impression impossible.');
        else setBulletin(r.bulletin);
      });
    }
  }

  const b = bulletin;

  return (
    <Dialog open={open} onOpenChange={ouvrir}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Printer className="h-3 w-3 mr-1" />Imprimer</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bulletin imprimable</DialogTitle></DialogHeader>
        {erreur && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{erreur}</div>}
        {pending && !b && <p className="text-sm text-gray-500">Assemblage du bulletin…</p>}
        {b && (
          <>
            <div id="bulletin-imprimable" className="border border-gray-300 rounded-lg p-5 bg-white text-sm">
              <div style={{ textAlign: 'center', borderBottom: '1px solid #d1d5db', paddingBottom: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{b.ecole?.nom ?? 'École'}</div>
                {b.ecole?.devise && <div style={{ fontSize: 11, color: '#6b7280' }}>{b.ecole.devise}</div>}
                <div style={{ fontSize: 12, marginTop: 4 }}>BULLETIN SCOLAIRE — {b.periode}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span style={{ color: '#6b7280' }}>Élève</span>
                <span style={{ fontWeight: 600 }}>{b.eleve?.prenom} {b.eleve?.nom} ({b.eleve?.matricule ?? '—'})</span>
              </div>
              <table>
                <thead>
                  <tr><th>Matière</th><th>Coef.</th><th>Notes</th><th>Moyenne</th></tr>
                </thead>
                <tbody>
                  {(b.moyennes ?? []).map((m: any, i: number) => (
                    <tr key={i}>
                      <td>{m.matiere}</td>
                      <td>{m.coefficient}</td>
                      <td>{m.nbNotes}</td>
                      <td>{m.moyenne}/20</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid #d1d5db', paddingTop: 8, marginTop: 8 }}>
                <span>Moyenne générale</span>
                <span>{b.moyenneGenerale ?? '—'}/20</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span style={{ color: '#6b7280' }}>Rang</span>
                <span>{b.rang ? `${b.rang}ᵉ de la classe` : '—'}</span>
              </div>
              {b.appreciation && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: '#6b7280' }}>Appréciation générale : </span>
                  <span style={{ fontStyle: 'italic' }}>{b.appreciation}</span>
                </div>
              )}
              <div style={{ borderTop: '1px dashed #9ca3af', marginTop: 24, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                <span>Fait à l&apos;école, le {formatDate(new Date())}</span>
                <span>Signature de la direction</span>
              </div>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full" onClick={() => imprimerDocument('Bulletin', 'bulletin-imprimable')}>
              <Printer className="h-4 w-4 mr-2" />Imprimer le bulletin
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
