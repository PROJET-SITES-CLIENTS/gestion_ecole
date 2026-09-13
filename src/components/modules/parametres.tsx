'use client';

// ====================================================================
// MODULE PARAMÈTRES ÉTABLISSEMENT — identité documentaire : logo, cachet,
// signature scannée, contacts, mentions légales, couleur. Renseignés une
// fois ici → injectés automatiquement dans TOUS les documents.
// ====================================================================

import { useEffect, useRef, useState, useTransition } from 'react';
import { Save, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { PageHeader, SectionBlock } from '@/components/shared-ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as ext from '@/app/actions/etablissement';

type Identite = {
  nom: string; adresse: string | null; ville: string | null; telephone: string | null;
  emailEcole: string | null; siteWeb: string | null; deviseOfficielle: string | null;
  couleurPrincipale: string | null; logoUrl: string | null; cachetUrl: string | null;
  signatureUrl: string | null; ninea: string | null; autorisation: string | null; affiliation: string | null;
};

function ChampImage({ id, libelle, aide, valeur, onChange }: {
  id: string; libelle: string; aide: string; valeur: string | null; onChange: (dataUrl: string | null) => void;
}) {
  const refInput = useRef<HTMLInputElement>(null);
  function choisir(f: File | undefined) {
    if (!f) return;
    if (f.size > 500_000) { alert('Image trop volumineuse (max 500 Ko) — compressez-la ou réduisez ses dimensions.'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(f);
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{libelle}</Label>
      <div className="flex items-start gap-3">
        <div className="h-20 w-28 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
          {valeur ? <img src={valeur} alt={libelle} className="max-h-[72px] max-w-[104px] object-contain" /> : <ImageIcon className="h-6 w-6 text-gray-300" />}
        </div>
        <div className="flex flex-col gap-1.5">
          <input ref={refInput} id={id} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={(e) => choisir(e.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" onClick={() => refInput.current?.click()}>
            <ImageIcon className="h-3.5 w-3.5 mr-1.5" />{valeur ? 'Remplacer' : 'Choisir une image'}
          </Button>
          {valeur && <Button type="button" variant="ghost" size="sm" className="text-rose-600" onClick={() => onChange(null)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />Retirer
          </Button>}
          <p className="text-[11px] text-gray-400 max-w-[260px]">{aide}</p>
        </div>
      </div>
    </div>
  );
}

export default function ParametresEtablissement() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [etab, setEtab] = useState<Identite | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [cachet, setCachet] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    ext.lireIdentiteEtablissement().then((r: any) => {
      if (r?.ok && r.ecole) {
        setEtab(r.ecole);
        setLogo(r.ecole.logoUrl ?? null);
        setCachet(r.ecole.cachetUrl ?? null);
        setSignature(r.ecole.signatureUrl ?? null);
      }
    });
  }, []);

  function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    fd.set('logoDataUrl', logo ?? '');
    fd.set('cachetDataUrl', cachet ?? '');
    fd.set('signatureDataUrl', signature ?? '');
    start(async () => {
      try {
        const r = await ext.majIdentiteEtablissement(fd);
        if (r && r.ok === false) { setMessage({ ok: false, texte: r.error }); return; }
        setMessage({ ok: true, texte: 'Identité enregistrée — elle apparaît désormais sur tous les documents.' });
      } catch {
        setMessage({ ok: false, texte: 'Impossible d\'enregistrer (connexion instable). Réessayez.' });
      }
    });
  }

  if (!etab) return <div className="p-6 text-sm text-gray-500">Chargement des paramètres…</div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Paramètres de l'établissement"
        subtitle="Identité officielle injectée automatiquement dans l'en-tête, le pied de page et les signatures de tous les documents." />

      {message && (
        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {message.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertCircle className="h-4 w-4 mt-0.5" />}
          <span>{message.texte}</span>
        </div>
      )}

      <form onSubmit={enregistrer} className="space-y-4">
        <Card><CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Building2 className="h-4 w-4" />Identité</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2"><Label>Nom officiel de l'établissement *</Label><Input name="nom" defaultValue={etab.nom} required /></div>
            <div className="space-y-1.5"><Label>Adresse (voie)</Label><Input name="adresse" defaultValue={etab.adresse ?? ''} placeholder="12, avenue L. S. Senghor" /></div>
            <div className="space-y-1.5"><Label>Ville</Label><Input name="ville" defaultValue={etab.ville ?? ''} placeholder="Dakar" /></div>
            <div className="space-y-1.5"><Label>Téléphone</Label><Input name="telephone" defaultValue={etab.telephone ?? ''} placeholder="+221 33 800 00 00" /></div>
            <div className="space-y-1.5"><Label>Email officiel</Label><Input name="emailEcole" type="email" defaultValue={etab.emailEcole ?? ''} placeholder="contact@ecole.sn" /></div>
            <div className="space-y-1.5"><Label>Site web</Label><Input name="siteWeb" defaultValue={etab.siteWeb ?? ''} placeholder="www.ecole.sn" /></div>
            <div className="space-y-1.5"><Label>Devise de l'établissement</Label><Input name="deviseOfficielle" defaultValue={etab.deviseOfficielle ?? ''} placeholder="Excellence • Discipline • Réussite" /></div>
          </div>
        </CardContent></Card>

        <SectionBlock title="Images officielles" description="Logo (en-tête), cachet et signature scannée (zone de signature des documents). Format PNG transparent recommandé, ~500 Ko max.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChampImage id="logo" libelle="Logo de l'école" aide="Affiché en haut à gauche de chaque document."
              valeur={logo} onChange={setLogo} />
            <ChampImage id="cachet" libelle="Cachet officiel" aide="Apposé automatiquement à côté des signatures."
              valeur={cachet} onChange={setCachet} />
            <ChampImage id="signature" libelle="Signature de la direction" aide="Signature scannée de la main de la direction."
              valeur={signature} onChange={setSignature} />
          </div>
        </SectionBlock>

        <SectionBlock title="Mentions légales (pied de page)" description="Identifiants repris dans le pied de page de tous les documents officiels.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>NINEA</Label><Input name="ninea" defaultValue={etab.ninea ?? ''} /></div>
            <div className="space-y-1.5"><Label>N° autorisation d'ouverture</Label><Input name="autorisation" defaultValue={etab.autorisation ?? ''} /></div>
            <div className="space-y-1.5"><Label>Affiliation / tutelle</Label><Input name="affiliation" defaultValue={etab.affiliation ?? ''} placeholder="Ex : Ministère de l'Éducation Nationale" /></div>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <div className="space-y-1.5"><Label>Couleur institutionnelle</Label><Input name="couleurPrincipale" type="color" defaultValue={etab.couleurPrincipale || '#047857'} className="h-9 w-20 p-1" /></div>
            <p className="text-[11px] text-gray-400 pb-2">Utilisée pour les filets d'en-tête, titres de tableaux et cadres des documents.</p>
          </div>
        </SectionBlock>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="h-4 w-4 mr-2" />{pending ? 'Enregistrement…' : 'Enregistrer l\'identité'}
          </Button>
        </div>
      </form>
    </div>
  );
}
