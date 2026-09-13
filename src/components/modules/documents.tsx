'use client';

// ====================================================================
// MODULE DOCUMENTS — catalogue des 65 documents de l'école : génération
// en un clic (formulaire dynamique → page imprimable avec charte,
// en-tête, signatures, pied de page — impression PDF automatique).
// ====================================================================

import { useEffect, useMemo, useState, useTransition } from 'react';
import { FileText, Printer, Search, X, ShieldAlert, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/shared-ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as ext from '@/app/actions/etablissement';

type Param = { cle: string; libelle: string; type: string; requis?: boolean; options?: Array<{ valeur: string; libelle: string }>; aide?: string };
type Modele = { code: string; libelle: string; domaine: string; description: string; entete: string; confidential: boolean; parametres: Param[] };

export default function DocumentsModule() {
  const [pending, start] = useTransition();
  const [catalogue, setCatalogue] = useState<Modele[]>([]);
  const [cibles, setCibles] = useState<Record<string, Array<{ valeur: string; libelle: string }>>>({});
  const [q, setQ] = useState('');
  const [selection, setSelection] = useState<Modele | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});

  useEffect(() => {
    ext.listerCatalogueDocuments().then((r: any) => { if (r?.ok) setCatalogue(r.catalogue); });
    ext.listerCiblesDocuments().then((r: any) => { if (r?.ok) setCibles(r.cibles); });
  }, []);

  const parDomaine = useMemo(() => {
    const groupes = new Map<string, Modele[]>();
    const terme = q.trim().toLowerCase();
    for (const m of catalogue) {
      if (terme && !(`${m.libelle} ${m.description} ${m.code}`.toLowerCase().includes(terme))) continue;
      if (!groupes.has(m.domaine)) groupes.set(m.domaine, []);
      groupes.get(m.domaine)!.push(m);
    }
    return groupes;
  }, [catalogue, q]);

  function ouvrir(m: Modele) {
    setSelection(m);
    const init: Record<string, string> = {};
    for (const p of m.parametres) init[p.cle] = p.type === 'select' && p.options?.length ? p.options[0].valeur : '';
    setValeurs(init);
  }

  function generer() {
    if (!selection) return;
    const params = new URLSearchParams();
    for (const p of selection.parametres) {
      const v = valeurs[p.cle];
      if (v) params.set(p.cle, v);
    }
    params.set('auto', '1');
    window.open(`/api/documents/${selection.code}?${params.toString()}`, '_blank');
  }

  const champ = (p: Param) => {
    const v = valeurs[p.cle] ?? '';
    const maj = (x: string) => setValeurs((avant) => ({ ...avant, [p.cle]: x }));
    if (['eleve', 'classe', 'periode', 'personnel', 'paiement', 'incident', 'candidature', 'passage', 'evaluationRh', 'bulletinPaie'].includes(p.type)) {
      const liste = cibles[p.type] ?? [];
      return (
        <select value={v} onChange={(e) => maj(e.target.value)} required={p.requis}
          className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm">
          <option value="">— Choisir —</option>
          {liste.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
          {liste.length === 0 && <option value="" disabled>Aucun élément disponible</option>}
        </select>
      );
    }
    if (p.type === 'select') {
      return (
        <select value={v} onChange={(e) => maj(e.target.value)} required={p.requis}
          className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm">
          <option value="">— Choisir —</option>
          {(p.options ?? []).map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
        </select>
      );
    }
    if (p.type === 'textarea') {
      return <textarea value={v} onChange={(e) => maj(e.target.value)} rows={3} required={p.requis}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm" placeholder={p.aide || ''} />;
    }
    return <Input type={p.type === 'date' ? 'date' : 'text'} value={v} onChange={(e) => maj(e.target.value)}
      required={p.requis} placeholder={p.aide || ''} />;
  };

  const pretAGenerer = !selection || selection.parametres.every((p) => !p.requis || valeurs[p.cle]);

  return (
    <div className="space-y-4">
      <PageHeader title="Documents de l'établissement"
        subtitle={`${catalogue.length} modèles officiels — en-tête, identité, cachet et signature injectés automatiquement. Cliquez sur « Générer » : le document s'ouvre prêt à imprimer (Ctrl+P → Enregistrer en PDF).`} />

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un document (bulletin, reçu, note de service…)" className="pl-9" />
      </div>

      {[...parDomaine.entries()].map(([domaine, modeles]) => (
        <div key={domaine}>
          <div className="flex items-center gap-2 mb-2 mt-4">
            <ChevronDown className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{domaine}</h3>
            <span className="text-xs text-gray-400">{modeles.length} document(s)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {modeles.map((m) => (
              <button key={m.code} onClick={() => ouvrir(m)}
                className="text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-emerald-400 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  {m.confidential && <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 flex items-center gap-1"><ShieldAlert className="h-3 w-3" />Confidentiel</span>}
                </div>
                <div className="mt-2.5 font-semibold text-sm text-gray-900 leading-tight">{m.libelle}</div>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{m.description}</p>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-400">
                  <Printer className="h-3 w-3" />Générer & imprimer
                  <span className="mx-1">·</span>
                  <span className="uppercase">{m.entete}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {catalogue.length === 0 && <div className="text-sm text-gray-500 p-6 text-center">Chargement du catalogue…</div>}

      {/* ─── Formulaire de génération ─── */}
      {selection && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelection(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <div>
                <div className="font-bold text-gray-900">{selection.libelle}</div>
                <div className="text-xs text-gray-500">{selection.domaine} · {selection.description}</div>
              </div>
              <button onClick={() => setSelection(null)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {selection.parametres.length === 0 && <p className="text-sm text-gray-500">Ce document ne requiert aucune information : générez-le directement.</p>}
              {selection.parametres.map((p) => (
                <div key={p.cle} className="space-y-1.5">
                  <Label>{p.libelle} {p.requis && <span className="text-rose-500">*</span>}</Label>
                  {champ(p)}
                  {p.aide && p.type !== 'textarea' && <p className="text-[11px] text-gray-400">{p.aide}</p>}
                </div>
              ))}
              {selection.confidential && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                  Document confidentiel : sa production est journalisée (auteur, date, cible).
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setSelection(null)}>Annuler</Button>
              <Button onClick={generer} disabled={!pretAGenerer || pending} className="bg-emerald-600 hover:bg-emerald-700"
                onMouseEnter={() => start(() => {})}>
                <Printer className="h-4 w-4 mr-2" />Générer le document
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
