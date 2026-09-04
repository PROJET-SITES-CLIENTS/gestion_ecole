'use client';

// ====================================================================
// Module Examens officiels / nationaux
// - Inscriptions des éligibles
// - CONVOCATIONS (P2) : envoi réel de notifications + n° de table
// - Saisie des résultats (workflow contrôlé)
// ====================================================================

import { useState, useTransition } from 'react';
import { FileCheck, Award, BellRing, ClipboardCheck, Printer } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import * as actions from '@/app/actions';
import * as actionsExt from '@/app/actions/extensions';
import { formatDate } from '@/lib/format';

// C7 — ouvre une fenêtre d'impression contenant le document (pattern RecuPaiement).
function imprimerConvocation(titre: string, elementId: string) {
  const contenu = document.getElementById(elementId)?.innerHTML ?? '';
  const f = window.open('', '_blank', 'width=794,height=560');
  if (f) {
    f.document.write(`<html><head><title>${titre}</title><style>body{font-family:system-ui,sans-serif;padding:24px;font-size:13px;color:#111}</style></head><body>${contenu}</body></html>`);
    f.document.close();
    f.print();
  }
}

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
                    // inscrireElevesExamen(examenId: string) — le FormData du
                    // formulaire de confirmation est réduit à l'identifiant.
                    action={async (fd: FormData) => actions.inscrireElevesExamen(String(fd.get('examenId') ?? ''))}
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
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => {
                    const r = await actions.saisirResultatExamen(i.id, 'absent');
                    if (!r?.ok) setMessage(`✗ ${r?.error ?? 'Erreur'}`);
                  })}>Absent</Button>
                </div>
              ) : null,
            },
            {
              key: 'actions', label: 'Actions', render: (i) => (i.statut === 'convoque' || i.statut === 'presente') ? (
                <ConvocationExamen inscriptionId={i.id} />
              ) : '—',
            },
          ]}
          rows={inscriptions}
          emptyLabel="Aucune inscription"
        />
      </SectionBlock>
    </div>
  );
}

// --------------------------------------------------------------------
// C7 — CONVOCATION D'EXAMEN IMPRIMABLE (données assemblées au clic)
// --------------------------------------------------------------------
function ConvocationExamen({ inscriptionId }: { inscriptionId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  function ouvrir(o: boolean) {
    setOpen(o);
    if (o && !data) {
      setErreur(null);
      startTransition(async () => {
        const r: any = await actionsExt.genererConvocationImprimable(inscriptionId);
        if (r && r.ok === false) setErreur(r.error ?? 'Convocation impossible.');
        else setData({ ecole: r.ecole, examen: r.examen, candidat: r.candidat });
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={ouvrir}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Printer className="h-3 w-3 mr-1" />Convocation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Convocation à l&apos;examen</DialogTitle></DialogHeader>
        {erreur && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{erreur}</div>}
        {pending && !data && <p className="text-sm text-gray-500">Assemblage de la convocation…</p>}
        {data && (
          <>
            <div id="convocation-examen" className="border border-gray-300 rounded-lg p-5 bg-white text-sm">
              <div style={{ textAlign: 'center', borderBottom: '1px solid #d1d5db', paddingBottom: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{data.ecole?.nom ?? 'École'}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6, textDecoration: 'underline' }}>CONVOCATION À UN EXAMEN OFFICIEL</div>
              </div>
              <div style={{ margin: '12px 0', fontWeight: 600, textAlign: 'center', fontSize: 15 }}>{data.examen?.nom}{data.examen?.niveau ? ` — ${data.examen.niveau}` : ''}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span style={{ color: '#6b7280' }}>Dates de l&apos;examen</span>
                <span>du {formatDate(data.examen?.dateDebut)} au {formatDate(data.examen?.dateFin)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span style={{ color: '#6b7280' }}>Candidat</span>
                <span style={{ fontWeight: 600 }}>{data.candidat?.prenom} {data.candidat?.nom}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span style={{ color: '#6b7280' }}>Matricule</span>
                <span>{data.candidat?.matricule ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span style={{ color: '#6b7280' }}>Numéro de table</span>
                <span style={{ fontWeight: 700 }}>{data.candidat?.numeroTable ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span style={{ color: '#6b7280' }}>Centre d&apos;examen</span>
                <span>{data.candidat?.centre ?? '—'}</span>
              </div>
              <div style={{ marginTop: 16, padding: 8, border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', textAlign: 'center', fontWeight: 600 }}>
                Le candidat doit se présenter muni d&apos;une PIÈCE D&apos;IDENTITÉ OBLIGATOIRE en cours de validité.
              </div>
              <div style={{ borderTop: '1px dashed #9ca3af', marginTop: 24, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                <span>Fait à l&apos;école, le {formatDate(new Date())}</span>
                <span>Le Chef d&apos;établissement</span>
              </div>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full" onClick={() => imprimerConvocation('Convocation examen', 'convocation-examen')}>
              <Printer className="h-4 w-4 mr-2" />Imprimer la convocation
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
