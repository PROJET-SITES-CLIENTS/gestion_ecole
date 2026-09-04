'use client';

// ====================================================================
// Module Conseils de classe (B11)
// - Programmation des conseils (classe, période, date, salle, membres)
// - Délibérations par élève (décision, mention, appréciation générale)
// - Votes des membres (pour / contre / abstention — un membre = un vote)
// ====================================================================

import { useState, useTransition } from 'react';
import { Users, Gavel, Vote as VoteIcon, ClipboardList } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, EmptyState, FormField, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import * as actionsExt from '@/app/actions/extensions';
import { formatDate } from '@/lib/format';

// Vocabulaires métier en français
const STATUT_CONSEIL_LABELS: Record<string, string> = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
};
const DECISION_LABELS: Record<string, string> = {
  passage: 'Passage',
  redoublement: 'Redoublement',
  exclusion_orientation: 'Exclusion / orientation',
  doublement: 'Doublement',
};
const MENTION_LABELS: Record<string, string> = {
  encouragements: 'Encouragements',
  felicitations: 'Félicitations',
  tableau_honneur: "Tableau d'honneur",
};

export default function ConseilsModule({ initialData }: { initialData: any }) {
  const classes = initialData.classes ?? [];
  const periodes = initialData.periodes ?? [];
  const eleves = initialData.eleves ?? [];
  const utilisateurs = initialData.utilisateurs ?? [];
  const conseils = initialData.conseilsClasse ?? [];
  const retourVotes = useActionFeedback();

  const deliberationsTotal = conseils.reduce(
    (n: number, c: any) => n + (c.deliberations?.length ?? 0), 0);
  const votesTotal = conseils.reduce(
    (n: number, c: any) => n + (c.deliberations ?? []).reduce((m: number, d: any) => m + (d.votes?.length ?? 0), 0), 0);

  const nomUtilisateur = (id: string) => {
    const u = utilisateurs.find((x: any) => x.id === id);
    return u ? `${u.prenom} ${u.nom}` : '—';
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Conseils de classe"
        subtitle="Programmation, délibérations par élève et votes des membres"
        actions={<NouveauConseilDialog classes={classes} periodes={periodes} utilisateurs={utilisateurs} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Conseils" value={conseils.length} icon={Gavel} color="emerald" />
        <StatCard title="Délibérations" value={deliberationsTotal} icon={ClipboardList} color="blue" />
        <StatCard title="Votes exprimés" value={votesTotal} icon={VoteIcon} color="purple" />
        <StatCard title="Membres convoqués" value={conseils.reduce((n: number, c: any) => n + (c.membres?.length ?? 0), 0)} icon={Users} color="amber" />
      </div>

      <SectionBlock title="Conseils programmés" description="Vue d'ensemble — classe, période, membres présents et délibérations">
        <DataTable
          columns={[
            { key: 'classe', label: 'Classe', render: (c) => c.classe?.libelle ?? classes.find((x: any) => x.id === c.classeId)?.libelle ?? '—' },
            { key: 'periode', label: 'Période', render: (c) => c.periode?.libelle ?? periodes.find((p: any) => p.id === c.periodeId)?.libelle ?? '—' },
            { key: 'date', label: 'Date', render: (c) => formatDate(c.date) },
            { key: 'salle', label: 'Salle', render: (c) => c.salle ?? '—' },
            { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} label={STATUT_CONSEIL_LABELS[c.statut] ?? c.statut} /> },
            { key: 'membres', label: 'Membres', render: (c) => `${(c.membres ?? []).filter((m: any) => m.present).length}/${(c.membres ?? []).length} présent(s)` },
            { key: 'deliberations', label: 'Délibérations', render: (c) => (c.deliberations ?? []).length },
          ]}
          rows={conseils}
          emptyLabel="Aucun conseil programmé — planifiez le premier conseil de classe."
        />
      </SectionBlock>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Délibérations par conseil</h2>
        {retourVotes.Message}
        {conseils.length === 0 && (
          <EmptyState title="Aucune délibération" description="Créez un conseil de classe pour enregistrer les décisions (passage, redoublement…) et les soumettre au vote." />
        )}
        {conseils.map((c: any) => {
          const classeLibelle = c.classe?.libelle ?? classes.find((x: any) => x.id === c.classeId)?.libelle ?? 'Classe';
          const elevesDeLaClasse = eleves.filter((e: any) => e.classeActuelleId === c.classeId);
          return (
            <Card key={c.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {classeLibelle} — {c.periode?.libelle ?? periodes.find((p: any) => p.id === c.periodeId)?.libelle ?? 'Période'}
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(c.date)}{c.salle ? ` · Salle ${c.salle}` : ''} · {(c.membres ?? []).filter((m: any) => m.present).length}/{(c.membres ?? []).length} membre(s) présent(s)
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Membres : {(c.membres ?? []).map((m: any) => nomUtilisateur(m.utilisateurId)).join(', ') || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge statut={c.statut} label={STATUT_CONSEIL_LABELS[c.statut] ?? c.statut} />
                  <ModalForm
                    trigger={<Button size="sm" variant="outline">Nouvelle délibération</Button>}
                    title={`Délibération — ${classeLibelle}`}
                    fields={[
                      { name: 'conseilId', type: 'hidden', label: 'ID', defaultValue: c.id },
                      { name: 'eleveId', label: 'Élève', type: 'select', options: (elevesDeLaClasse.length > 0 ? elevesDeLaClasse : eleves).map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
                      { name: 'decision', label: 'Décision', type: 'select', required: true, options: [
                        { value: 'passage', label: 'Passage' },
                        { value: 'redoublement', label: 'Redoublement' },
                        { value: 'exclusion_orientation', label: 'Exclusion / orientation' },
                        { value: 'doublement', label: 'Doublement' },
                      ] },
                      { name: 'mention', label: 'Mention', type: 'select', options: [
                        { value: 'encouragements', label: 'Encouragements' },
                        { value: 'felicitations', label: 'Félicitations' },
                        { value: 'tableau_honneur', label: "Tableau d'honneur" },
                      ] },
                      { name: 'appreciationGenerale', label: 'Appréciation générale', type: 'textarea' },
                    ]}
                    action={actionsExt.creerDeliberation}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'eleve', label: 'Élève', render: (d) => { const e = eleves.find((x: any) => x.id === d.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
                    { key: 'decision', label: 'Décision', render: (d) => <StatusBadge statut={d.decision === 'passage' ? 'publie' : 'en_attente'} label={DECISION_LABELS[d.decision] ?? d.decision} /> },
                    { key: 'mention', label: 'Mention', render: (d) => d.mention ? (MENTION_LABELS[d.mention] ?? d.mention) : '—' },
                    { key: 'appreciationGenerale', label: 'Appréciation', render: (d) => <span className="text-xs text-gray-600 line-clamp-1">{d.appreciationGenerale ?? '—'}</span> },
                    {
                      key: 'votes', label: 'Votes', render: (d) => {
                        const vs = d.votes ?? [];
                        const pour = vs.filter((v: any) => v.vote === 'pour').length;
                        const contre = vs.filter((v: any) => v.vote === 'contre').length;
                        const abstention = vs.filter((v: any) => v.vote === 'abstention').length;
                        return <span className="text-xs">✓ {pour} · ✗ {contre} · ⊘ {abstention}</span>;
                      },
                    },
                    {
                      key: 'voter', label: 'Voter', render: (d) => (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-emerald-700" disabled={retourVotes.pending} onClick={() => retourVotes.run(() => actionsExt.voterDeliberation(d.id, 'pour'), 'Vote « pour » enregistré')}>Pour</Button>
                          <Button size="sm" variant="outline" className="text-rose-700" disabled={retourVotes.pending} onClick={() => retourVotes.run(() => actionsExt.voterDeliberation(d.id, 'contre'), 'Vote « contre » enregistré')}>Contre</Button>
                          <Button size="sm" variant="outline" disabled={retourVotes.pending} onClick={() => retourVotes.run(() => actionsExt.voterDeliberation(d.id, 'abstention'), 'Abstention enregistrée')}>Abstention</Button>
                        </div>
                      ),
                    },
                  ]}
                  rows={c.deliberations ?? []}
                  emptyLabel="Aucune délibération pour ce conseil."
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Nouveau conseil — mini-formulaire custom : les membres (checkbox
// multiples) sont assemblés dans `donnees` (JSON) avant soumission.
// --------------------------------------------------------------------
function NouveauConseilDialog({ classes, periodes, utilisateurs }: { classes: any[]; periodes: any[]; utilisateurs: any[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [classeId, setClasseId] = useState('');
  const [periodeId, setPeriodeId] = useState('');
  const [date, setDate] = useState('');
  const [salle, setSalle] = useState('');
  const [membresIds, setMembresIds] = useState<Set<string>>(new Set());

  function basculerMembre(id: string, coche: boolean) {
    setMembresIds((prev) => {
      const s = new Set(prev);
      if (coche) s.add(id);
      else s.delete(id);
      return s;
    });
  }

  function reinitialiser() {
    setClasseId('');
    setPeriodeId('');
    setDate('');
    setSalle('');
    setMembresIds(new Set());
    setErreur(null);
  }

  function enregistrer() {
    if (!classeId || !periodeId || !date || membresIds.size === 0) {
      setErreur('Classe, période, date et au moins un membre sont obligatoires.');
      return;
    }
    const donnees = { classeId, periodeId, date, salle: salle || undefined, membresIds: [...membresIds] };
    const fd = new FormData();
    fd.set('donnees', JSON.stringify(donnees));
    startTransition(async () => {
      const r: any = await actionsExt.creerConseilClasse(fd);
      if (r && r.ok === false) {
        setErreur(r.error ?? 'Création refusée.');
        return;
      }
      setOpen(false);
      reinitialiser();
    });
  }

  const classeSelect = 'w-full h-9 rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reinitialiser(); }}>
      <DialogTrigger asChild>
        <CreateButton label="Nouveau conseil" />
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Programmer un conseil de classe</DialogTitle></DialogHeader>
        {erreur && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{erreur}</div>}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Classe" required>
              <select className={classeSelect} value={classeId} onChange={(e) => setClasseId(e.target.value)}>
                <option value="">— Choisir —</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
              </select>
            </FormField>
            <FormField label="Période" required>
              <select className={classeSelect} value={periodeId} onChange={(e) => setPeriodeId(e.target.value)}>
                <option value="">— Choisir —</option>
                {periodes.map((p: any) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Date du conseil" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </FormField>
            <FormField label="Salle">
              <Input value={salle} onChange={(e) => setSalle(e.target.value)} placeholder="B12" />
            </FormField>
          </div>
          <FormField label={`Membres du conseil (${membresIds.size} sélectionné(s))`} required>
            <div className="border border-gray-200 rounded-md max-h-56 overflow-y-auto divide-y divide-gray-100">
              {utilisateurs.length === 0 && <p className="p-3 text-sm text-gray-500">Aucun utilisateur disponible.</p>}
              {utilisateurs.map((u: any) => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <Checkbox checked={membresIds.has(u.id)} onCheckedChange={(v) => basculerMembre(u.id, v === true)} />
                  <span className="text-sm flex-1">{u.prenom} {u.nom}</span>
                  <span className="text-xs text-gray-400">{u.type}</span>
                </label>
              ))}
            </div>
          </FormField>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>Annuler</Button>
            </DialogClose>
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending} onClick={enregistrer}>
              {pending ? 'Enregistrement…' : 'Programmer le conseil'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
