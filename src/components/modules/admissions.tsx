'use client';

// ====================================================================
// Module Admissions (B4) — candidatures, tests, entretiens, décision,
// conversion d'un candidat admis en élève inscrit.
// ====================================================================

import { useState } from 'react';
import { UserPlus, ClipboardCheck, UserCheck, GraduationCap } from 'lucide-react';
import { PageHeader, StatCard, DataTable, ModalForm, CreateButton, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import * as ext from '@/app/actions/extensions';
import { formatDate } from '@/lib/format';

// Statuts du workflow d'admission (dépôt → test → entretien → décision → inscription)
const STATUTS_ADMISSION: Record<string, { label: string; classe: string }> = {
  soumis: { label: 'Soumis', classe: 'bg-gray-100 text-gray-700 border-gray-200' },
  test: { label: 'Test', classe: 'bg-blue-100 text-blue-700 border-blue-200' },
  entretien: { label: 'Entretien', classe: 'bg-amber-100 text-amber-700 border-amber-200' },
  admis: { label: 'Admis', classe: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  refuse: { label: 'Refusé', classe: 'bg-rose-100 text-rose-700 border-rose-200' },
  inscrit: { label: 'Inscrit', classe: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

function BadgeAdmission({ statut }: { statut: string }) {
  const s = STATUTS_ADMISSION[statut] ?? { label: statut, classe: 'bg-gray-100 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={`text-xs ${s.classe}`}>{s.label}</Badge>;
}

// --------------------------------------------------------------------
// Inscription d'un candidat admis : choix de la classe → conversion.
// --------------------------------------------------------------------
function DialogInscription({ candidature, classes, onInscrire, pending }: {
  candidature: any;
  classes: any[];
  onInscrire: (candidatureId: string, classeId: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [classeId, setClasseId] = useState('');

  // SEC-7 FIX — seules les classes du NIVEAU DEMANDÉ sont proposées (avant :
  // toutes les classes → un admis de 6è pouvait atterrir en CM2). Repli sur
  // toutes les classes si le niveau demandé est inconnu.
  const classesCoherentes = candidature.niveauId
    ? classes.filter((c: any) => c.niveauId === candidature.niveauId)
    : classes;
  const classesProposees = classesCoherentes.length > 0 ? classesCoherentes : classes;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">Inscrire</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrire {candidature.prenom} {candidature.nom}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Le dossier va être converti en inscription : un élève sera créé et affecté à la classe choisie
            (le parent déclaré sera rattaché automatiquement si ses coordonnées sont connues).
          </p>
          {classesCoherentes.length === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Niveau demandé inconnu — toutes les classes sont proposées, vérifiez la cohérence.
            </p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Classe d&apos;affectation <span className="text-rose-500">*</span></Label>
            <select
              value={classeId}
              onChange={(e) => setClasseId(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">— Choisir une classe —</option>
              {classesProposees.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.libelle ?? c.code}{c.niveau?.libelle ? ` · ${c.niveau.libelle}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
          <Button
            type="button"
            disabled={pending || !classeId}
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { setOpen(false); onInscrire(candidature.id, classeId); }}
          >
            Confirmer l&apos;inscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdmissionsModule({ initialData }: { initialData: any }) {
  const candidatures = initialData.candidaturesAdmission ?? [];
  const niveaux = initialData.niveaux ?? [];
  const classes = initialData.classes ?? [];
  const { run, Message, pending } = useActionFeedback();

  const avancer = (id: string, statut: 'test' | 'entretien' | 'admis' | 'refuse', succes: string) =>
    run(() => ext.avancerCandidatureAdmission(id, statut), succes);

  // SEC-20 — filtre par statut + recherche
  const [filtreStatut, setFiltreStatut] = useState('toutes');
  const [recherche, setRecherche] = useState('');
  const candidaturesFiltrees = candidatures.filter((c: any) => {
    if (filtreStatut !== 'toutes' && c.statut !== filtreStatut) return false;
    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase();
      return `${c.prenom} ${c.nom} ${c.parentNom ?? ''}`.toLowerCase().includes(q);
    }
    return true;
  });

  // SEC-6 — moyenne des tests ramenée sur 20 (base de décision admis/refus)
  const moyenneTests = (c: any): number | null => {
    const t = c.tests ?? [];
    if (t.length === 0) return null;
    return t.reduce((s: number, x: any) => s + (x.sur > 0 ? (x.note / x.sur) * 20 : 0), 0) / t.length;
  };

  const kpi = {
    soumis: candidatures.filter((c: any) => c.statut === 'soumis').length,
    test: candidatures.filter((c: any) => c.statut === 'test').length,
    admis: candidatures.filter((c: any) => c.statut === 'admis').length,
    inscrits: candidatures.filter((c: any) => c.statut === 'inscrit').length,
  };

  return (
    <div className="p-4 lg:p-6 max-w-full lg:max-w-7xl mx-auto">
      <PageHeader
        title="Admissions"
        subtitle="Candidatures, tests d'entrée, entretiens et inscription des admis"
        actions={
          <ModalForm
            trigger={<CreateButton label="Nouvelle candidature" />}
            title="Enregistrer une candidature d'admission"
            fields={[
              { name: 'prenom', label: 'Prénom du candidat', required: true },
              { name: 'nom', label: 'Nom', required: true },
              { name: 'dateNaissance', label: 'Date de naissance', type: 'date', required: true },
              { name: 'lieuNaissance', label: 'Lieu de naissance' },
              { name: 'sexe', label: 'Sexe', type: 'select', options: [
                { value: 'M', label: 'Masculin' },
                { value: 'F', label: 'Féminin' },
              ] },
              { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'parent@exemple.com' },
              { name: 'telephone', label: 'Téléphone' },
              { name: 'niveauId', label: 'Niveau demandé', type: 'select', options: niveaux.map((n: any) => ({ value: n.id, label: n.libelle })) },
              { name: 'parentNom', label: 'Parent / tuteur (nom complet)' },
              { name: 'parentTelephone', label: 'Téléphone parent' },
              { name: 'etablissementOrigine', label: 'Établissement d\'origine' },
            ]}
            action={ext.creerCandidatureAdmission}
          />
        }
      />

      {Message}

      <div className="overflow-x-auto grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Dossiers soumis" value={kpi.soumis} icon={UserPlus} color="gray" />
        <StatCard title="En phase de test" value={kpi.test} icon={ClipboardCheck} color="blue" />
        <StatCard title="Admis (à inscrire)" value={kpi.admis} icon={UserCheck} color="amber" />
        <StatCard title="Inscrits" value={kpi.inscrits} icon={GraduationCap} color="emerald" />
      </div>

      <SectionBlock
        title="Candidatures"
        description="Faire avancer chaque dossier : convocation au test → entretien → décision, puis inscription des admis"
      >
        {/* SEC-20 — filtres statut + recherche */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {['toutes', 'soumis', 'test', 'entretien', 'admis', 'refuse', 'inscrit'].map((s) => (
              <button key={s} onClick={() => setFiltreStatut(s)}
                className={`px-2.5 py-1 rounded-full text-xs border ${filtreStatut === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                {s === 'toutes' ? `Toutes (${candidatures.length})` : `${STATUTS_ADMISSION[s]?.label ?? s} (${candidatures.filter((c: any) => c.statut === s).length})`}
              </button>
            ))}
          </div>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher (candidat, parent)…"
            className="h-8 border rounded-md px-3 text-sm ml-auto w-56"
          />
        </div>
        <DataTable
          columns={[
            { key: 'candidat', label: 'Candidat', render: (c) => <span className="font-medium">{c.prenom} {c.nom}</span> },
            { key: 'niveau', label: 'Niveau demandé', render: (c) => niveaux.find((n: any) => n.id === c.niveauId)?.libelle ?? '—' },
            // SEC-6 — notes des tests + moyenne : la décision se prend les
            // yeux ouverts (avant : saisies mais jamais affichées)
            {
              key: 'tests', label: 'Tests d\'admission', render: (c) => {
                const t = c.tests ?? [];
                if (t.length === 0) return <span className="text-xs text-gray-400">—</span>;
                const moy = moyenneTests(c);
                return (
                  <div className="text-xs">
                    {t.map((x: any) => (
                      <div key={x.id} className="text-gray-600">{x.matiere} : <b>{x.note}/{x.sur}</b></div>
                    ))}
                    <div className={`font-semibold mt-0.5 ${(moy ?? 0) >= 10 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      Moyenne : {(moy ?? 0).toFixed(1)}/20
                    </div>
                  </div>
                );
              },
            },
            { key: 'statut', label: 'Statut', render: (c) => <BadgeAdmission statut={c.statut} /> },
            { key: 'dateSoumission', label: 'Soumis le', render: (c) => formatDate(c.dateSoumission) },
            {
              key: 'parent', label: 'Parent / tuteur',
              render: (c) => c.parentNom ? <span className="text-sm">{c.parentNom}{c.parentTelephone ? <span className="text-gray-500"> · {c.parentTelephone}</span> : null}</span> : '—',
            },
            {
              key: 'actions', label: 'Actions', render: (c) => {
                if (c.statut === 'inscrit') return <span className="text-xs text-emerald-700">Dossier converti</span>;
                if (c.statut === 'refuse') return <span className="text-xs text-gray-500">Refusé</span>;
                return (
                  <div className="flex flex-wrap items-center gap-1">
                    {c.statut === 'soumis' && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => avancer(c.id, 'test', 'Candidat convoqué au test')}>→ Test</Button>
                    )}
                    {c.statut === 'test' && (
                      <ModalForm
                        trigger={<Button size="sm" variant="outline">Saisir un test</Button>}
                        title={`Test d'admission — ${c.prenom} ${c.nom}`}
                        fields={[
                          { name: 'candidatureId', type: 'hidden', label: 'Candidature', defaultValue: c.id },
                          { name: 'matiere', label: 'Matière', required: true, placeholder: 'Mathématiques' },
                          { name: 'note', label: 'Note obtenue', type: 'number', required: true },
                          { name: 'sur', label: 'Barème (sur)', type: 'number', defaultValue: 20, required: true },
                          { name: 'appreciation', label: 'Appréciation', type: 'textarea' },
                        ]}
                        action={ext.saisirTestAdmission}
                      />
                    )}
                    {(c.statut === 'soumis' || c.statut === 'test') && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => avancer(c.id, 'entretien', 'Candidat convoqué en entretien')}>→ Entretien</Button>
                    )}
                    {c.statut === 'entretien' && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => avancer(c.id, 'admis', 'Candidat admis')}>→ Admis</Button>
                    )}
                    {c.statut !== 'admis' && (
                      <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700" disabled={pending} onClick={() => avancer(c.id, 'refuse', 'Candidature refusée')}>Refus</Button>
                    )}
                    {c.statut === 'admis' && (
                      <DialogInscription
                        candidature={c}
                        classes={classes}
                        pending={pending}
                        onInscrire={(candidatureId, classeId) => run(() => ext.convertirAdmission(candidatureId, classeId), 'Candidat inscrit — élève créé')}
                      />
                    )}
                  </div>
                );
              },
            },
          ]}
          rows={candidaturesFiltrees}
          emptyLabel="Aucune candidature enregistrée"
        />
      </SectionBlock>
    </div>
  );
}
