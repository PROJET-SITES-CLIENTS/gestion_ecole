'use client';

// ====================================================================
// MODULE INFRASTRUCTURES — options activables par établissement :
// Activation | Internat (dortoirs, permissions, incidents, buanderie,
// cuisine) | Laboratoire | Boutique | Parc info | Sport.
// ====================================================================

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  BedDouble, FlaskConical, ShoppingBag, Monitor, Trophy, ToggleLeft, ToggleRight,
  AlertTriangle, CheckCircle2, Plus, UserCheck, Clock, WashingMachine, ChefHat, Thermometer,
} from 'lucide-react';
import { PageHeader, SectionBlock, StatCard, DataTable, StatusBadge } from '@/components/shared-ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as ext from '@/app/actions/infrastructures';

type Donnees = any;

const INFOS_FLAGS: Array<{ code: string; libelle: string; desc: string; icone: any }> = [
  { code: 'INTERNAT', libelle: 'Internat / Pensionnat', desc: 'Dortoirs, chambres, lits, régimes, permissions de sortie, incidents, buanderie et cuisine centrale intégrée.', icone: BedDouble },
  { code: 'LABORATOIRE', libelle: 'Laboratoires', desc: 'Salles d\'expériences : équipements, consommables, réservation de créneaux.', icone: FlaskConical },
  { code: 'BOUTIQUE', libelle: 'Boutique / Uniformiserie', desc: 'Vente d\'uniformes et fournitures : stock, tailles, encaissement intégré aux finances.', icone: ShoppingBag },
  { code: 'PARC_INFO', libelle: 'Parc informatique', desc: 'Ordinateurs, tablettes, projecteurs : inventaire, prêts, pannes, amortissement.', icone: Monitor },
  { code: 'SPORT', libelle: 'Installations sportives', desc: 'Terrains, gymnase, piscine : occupation, créneaux, activités.', icone: Trophy },
];

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
const select = 'w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm';

export default function InfrastructuresModule({ initialData }: { initialData?: any }) {
  const [pending, start] = useTransition();
  const [data, setData] = useState<Donnees | null>(null);
  const [onglet, setOnglet] = useState<string>('activation');
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);

  function charger() {
    ext.lireInfrastructures().then((r: any) => { if (r?.ok) setData(r); });
  }
  useEffect(charger, []);
  useEffect(() => {
    if (data?.flags) {
      const actifs = INFOS_FLAGS.filter((f) => data.flags[f.code]);
      if (onglet === 'activation' && actifs.length === 1) setOnglet(actifs[0].code.toLowerCase());
    }
  }, [data?.flags]);

  function run(nom: string, fn: () => Promise<any>) {
    setMsg(null);
    start(async () => {
      try {
        const r = await fn();
        if (r && r.ok === false) { setMsg({ ok: false, texte: r.error }); return; }
        setMsg({ ok: true, texte: `${nom} : opération réussie ✓` });
        charger();
      } catch { setMsg({ ok: false, texte: 'Connexion instable — réessayez.' }); }
    });
  }

  const eleves = useMemo(() => (initialData?.eleves ?? []).map((e: any) => ({ valeur: e.id, label: `${e.nom} ${e.prenom}${e.classeActuelle?.libelle ? ' — ' + e.classeActuelle.libelle : ''}` })), [initialData]);
  const personnels = useMemo(() => (initialData?.personnels ?? []).map((p: any) => ({ valeur: p.id, label: `${p.nom} ${p.prenom}` })), [initialData]);
  const classes = useMemo(() => (initialData?.classes ?? []).map((c: any) => ({ valeur: c.id, label: c.libelle })), [initialData]);

  if (!data) return <div className="p-6 text-sm text-gray-500">Chargement des infrastructures…</div>;
  const flags: Record<string, boolean> = data.flags ?? {};
  const ta = useMemo2(data);

  return (
    <div className="space-y-4">
      <PageHeader title="Infrastructures de l'établissement"
        subtitle="Options activables : chaque établissement active ce qu'il possède réellement. L'activation configure l'infrastructure complète." />

      {msg && (
        <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${msg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {msg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}<span>{msg.texte}</span>
        </div>
      )}

      {/* Onglets */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <button onClick={() => setOnglet('activation')}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${onglet === 'activation' ? 'bg-emerald-600 text-white' : 'bg-white border hover:border-emerald-300'}`}>
          <ToggleRight className="h-4 w-4" />Activation
        </button>
        {INFOS_FLAGS.map((f) => flags[f.code] && (
          <button key={f.code} onClick={() => setOnglet(f.code.toLowerCase())}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${onglet === f.code.toLowerCase() ? 'bg-emerald-600 text-white' : 'bg-white border hover:border-emerald-300'}`}>
            <f.icone className="h-4 w-4" />{f.libelle.split(' /')[0]}
          </button>
        ))}
      </div>

      {/* ═══ ACTIVATION ═══ */}
      {onglet === 'activation' && (
        <SectionBlock title="Options de l'établissement" description="Activez uniquement les infrastructures que possède votre école. Chaque option est complète : configuration, suivi quotidien et facturation le cas échéant.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INFOS_FLAGS.map((f) => {
              const actif = !!flags[f.code];
              return (
                <div key={f.code} className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${actif ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${actif ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}><f.icone className="h-5 w-5" /></div>
                    <div>
                      <div className="font-semibold text-sm">{f.libelle}</div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                  <button disabled={pending} onClick={() => run(actif ? 'Désactivation' : 'Activation', () => ext.majFlagInfrastructure(f.code, !actif))}
                    className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${actif ? 'text-emerald-700 border-emerald-300 bg-white' : 'text-gray-400 border-gray-200'}`}>
                    {actif ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}{actif ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              );
            })}
          </div>
        </SectionBlock>
      )}

      {/* ═══ INTERNAT ═══ */}
      {onglet === 'internat' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Taux d'occupation" value={`${ta.taux}%`} sub={`${ta.occupes}/${ta.totalLits} lits`} icon={BedDouble} color="emerald" />
            <StatCard title="Lits libres" value={ta.libres} sub={`${ta.maintenance} en maintenance`} icon={CheckCircle2} color="blue" />
            <StatCard title="Permissions en cours" value={(data.permissions ?? []).length} sub="demandes et approuvées" icon={Clock} color="amber" />
            <StatCard title="Incidents (90j)" value={(data.incidents ?? []).length} sub="déclarés à l'internat" icon={AlertTriangle} color="rose" />
          </div>

          <SectionBlock title="Chambres et occupation" description={`${(data.chambres ?? []).length} chambres configurées.`}>
            <form className="flex flex-wrap items-end gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); (e.target as HTMLFormElement).reset(); run('Chambre créée', () => ext.creerChambre(fd)); }}>
              <Champ label="Nom *"><Input name="nom" placeholder="Dortoir A — Ch. 12" required /></Champ>
              <Champ label="Genre"><select name="genre" className={select}><option value="M">Garçons</option><option value="F">Filles</option><option value="mixte">Mixte</option></select></Champ>
              <Champ label="Lits"><Input name="capacite" type="number" min={1} max={20} defaultValue={4} className="w-20" required /></Champ>
              <Champ label="Surveillant"><select name="surveillantId" className={select + ' w-44'}><option value="">—</option>{personnels.map((p: any) => <option key={p.valeur} value={p.valeur}>{p.libelle}</option>)}</select></Champ>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Button>
            </form>
            <DataTable
              columns={[
                { key: 'nom', label: 'Chambre' },
                { key: 'genre', label: 'Genre', render: (c: any) => ({ M: 'Garçons', F: 'Filles', mixte: 'Mixte' }[c.genre] || c.genre) },
                { key: 'occupation', label: 'Occupation', render: (c: any) => `${c.lits?.filter((l: any) => l.statut === 'occupe').length ?? 0}/${c.lits?.length ?? c.capacite} lits` },
                { key: 'lits', label: 'Détail', render: (c: any) => (c.lits ?? []).map((l: any) => l.statut === 'occupe' ? '🛏' : l.statut === 'maintenance' ? '🔧' : '▫').join(' ') },
              ]}
              rows={data.chambres ?? []} emptyLabel="Aucune chambre — commencez par en créer" />
          </SectionBlock>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionBlock title="Inscriptions à l'internat" description="Attribution automatique d'un lit libre.">
              <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Inscription', () => ext.inscrireInternat(fd)); }}>
                <Champ label="Élève *"><select name="eleveId" className={select + ' w-52'} required><option value="">— Choisir —</option>{eleves.map((e: any) => <option key={e.valeur} value={e.valeur}>{e.libelle}</option>)}</select></Champ>
                <Champ label="Régime"><select name="regime" className={select + ' w-40'}><option value="interne">Interne</option><option value="demi_pensionnaire">Demi-pensionnaire</option></select></Champ>
                <Champ label="Tarif mensuel (F)"><Input name="tarifMensuel" type="number" min={0} defaultValue={50000} className="w-28" /></Champ>
                <Champ label="Chambre (facultatif)"><select name="chambreId" className={select + ' w-40'}><option value="">Automatique</option>{(data.chambres ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></Champ>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700"><UserCheck className="h-3.5 w-3.5 mr-1" />Inscrire</Button>
              </form>
              <DataTable
                columns={[
                  { key: 'eleve', label: 'Élève', render: (r: any) => `${r.eleve?.prenom ?? ''} ${r.eleve?.nom ?? ''}` },
                  { key: 'regime', label: 'Régime', render: (r: any) => r.regime === 'interne' ? 'Interne' : 'Demi-pension' },
                  { key: 'tarif', label: 'Tarif/mois', render: (r: any) => `${(r.tarifMensuel / 100).toLocaleString('fr-FR')} F` },
                  { key: 'action', label: '', render: (r: any) => (
                    <button className="text-xs text-rose-600 hover:underline" disabled={pending} onClick={() => run('Sortie', () => ext.libererInternat(r.id))}>Libérer</button>
                  ) },
                ]}
                rows={data.inscriptions ?? []} emptyLabel="Aucun interne inscrit" />
            </SectionBlock>

            <SectionBlock title="Permissions de sortie" description="Demandes, validation et retours.">
              <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Permission demandée', () => ext.permissionInternat(fd)); }}>
                <Champ label="Élève *"><select name="eleveId" className={select + ' w-44'} required><option value="">—</option>{(data.inscriptions ?? []).map((i: any) => <option key={i.eleveId} value={i.eleveId}>{i.eleve?.prenom} {i.eleve?.nom}</option>)}</select></Champ>
                <Champ label="Départ"><Input name="dateDepart" type="datetime-local" required /></Champ>
                <Champ label="Retour prévu"><Input name="dateRetourPrevue" type="datetime-local" required /></Champ>
                <Champ label="Motif"><Input name="motif" placeholder="Week-end familial" required className="w-36" /></Champ>
                <Button type="submit" size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Demander</Button>
              </form>
              <DataTable
                columns={[
                  { key: 'eleve', label: 'Élève', render: (r: any) => `${r.eleve?.prenom ?? ''} ${r.eleve?.nom ?? ''}` },
                  { key: 'sejour', label: 'Période', render: (r: any) => `${new Date(r.dateDepart).toLocaleDateString('fr-FR')} → ${new Date(r.dateRetourPrevue).toLocaleDateString('fr-FR')}` },
                  { key: 'statut', label: 'Statut', render: (r: any) => <StatusBadge statut={r.statut} /> },
                  { key: 'actions', label: '', render: (r: any) => (
                    <div className="flex gap-2 text-xs">
                      {r.statut === 'demande' && <>
                        <button className="text-emerald-600 hover:underline" disabled={pending} onClick={() => run('Approbation', () => ext.traiterPermission(r.id, 'approuvee'))}>Approuver</button>
                        <button className="text-rose-600 hover:underline" disabled={pending} onClick={() => run('Refus', () => ext.traiterPermission(r.id, 'refusee'))}>Refuser</button>
                      </>}
                      {r.statut === 'approuvee' && <button className="text-blue-600 hover:underline" disabled={pending} onClick={() => run('Retour', () => ext.traiterPermission(r.id, 'retour'))}>Retour effectif</button>}
                    </div>
                  ) },
                ]}
                rows={data.permissions ?? []} emptyLabel="Aucune permission en cours" />
            </SectionBlock>

            <SectionBlock title="Incidents d'internat" description="Suivi de la vie du soir.">
              <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Incident déclaré', () => ext.incidentInternat(fd)); }}>
                <Champ label="Élève"><select name="eleveId" className={select + ' w-40'}><option value="">—</option>{eleves.map((e: any) => <option key={e.valeur} value={e.valeur}>{e.libelle}</option>)}</select></Champ>
                <Champ label="Gravité"><select name="gravite" className={select + ' w-28'}><option value="leger">Léger</option><option value="moyen">Moyen</option><option value="grave">Grave</option></select></Champ>
                <Champ label="Description"><Input name="description" required className="w-52" placeholder="Description factuelle" /></Champ>
                <input type="hidden" name="dateHeure" value={new Date().toISOString()} />
                <Button type="submit" size="sm" variant="outline"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Déclarer</Button>
              </form>
              <DataTable
                columns={[
                  { key: 'date', label: 'Date', render: (r: any) => new Date(r.dateHeure).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) },
                  { key: 'gravite', label: 'Gravité', render: (r: any) => <StatusBadge statut={r.gravite} label={{ leger: 'Léger', moyen: 'Moyen', grave: 'Grave' }[r.gravite]} /> },
                  { key: 'description', label: 'Description' },
                ]}
                rows={data.incidents ?? []} emptyLabel="Aucun incident — bonne nuit 😴" />
            </SectionBlock>

            <SectionBlock title="Buanderie" description="Dépôts de linge, lavage, distribution.">
              <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('action', 'deposer'); run('Dépôt buanderie', () => ext.buanderie(fd)); }}>
                <Champ label="Élève"><select name="eleveId" className={select + ' w-40'}><option value="">—</option>{eleves.map((e: any) => <option key={e.valeur} value={e.valeur}>{e.libelle}</option>)}</select></Champ>
                <Champ label="Article"><Input name="type" placeholder="Draps, uniforme…" required className="w-32" /></Champ>
                <Champ label="Qté"><Input name="quantite" type="number" min={1} defaultValue={1} className="w-16" /></Champ>
                <Button type="submit" size="sm" variant="outline"><WashingMachine className="h-3.5 w-3.5 mr-1" />Déposer</Button>
              </form>
              <DataTable
                columns={[
                  { key: 'date', label: 'Déposé le', render: (r: any) => new Date(r.dateDepot).toLocaleDateString('fr-FR') },
                  { key: 'articles', label: 'Articles', render: (r: any) => { try { return (JSON.parse(r.articles) as any[]).map((a) => `${a.quantite}× ${a.type}`).join(', '); } catch { return '—'; } } },
                  { key: 'statut', label: 'Statut', render: (r: any) => <StatusBadge statut={r.statut} label={{ depose: 'Déposé', lave: 'Lavé', distribue: 'Distribué' }[r.statut]} /> },
                  { key: 'action', label: '', render: (r: any) => r.statut === 'depose' ? (
                    <button className="text-xs text-blue-600 hover:underline" disabled={pending} onClick={() => { const fd = new FormData(); fd.set('action', 'laver'); fd.set('depotId', r.id); run('Lavage', () => ext.buanderie(fd)); }}>Marquer lavé</button>
                  ) : r.statut === 'lave' ? (
                    <button className="text-xs text-emerald-600 hover:underline" disabled={pending} onClick={() => { const fd = new FormData(); fd.set('action', 'distribuer'); fd.set('depotId', r.id); run('Distribution', () => ext.buanderie(fd)); }}>Distribuer</button>
                  ) : null },
                ]}
                rows={data.buanderie ?? []} emptyLabel="Aucun linge en cours" />
            </SectionBlock>
          </div>

          <SectionBlock title="Cuisine centrale (intégrée à l'internat)" description="Plans de production et contrôles HACCP — chaîne du froid et points critiques.">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Production', () => ext.productionRepas(fd)); }}>
                  <Champ label="Service"><select name="service" className={select + ' w-36'}><option value="petit_dejeuner">Petit-déjeuner</option><option value="dejeuner">Déjeuner</option><option value="diner">Dîner</option><option value="collation">Collation</option></select></Champ>
                  <Champ label="Date"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Champ>
                  <Champ label="Effectif prévu"><Input name="effectifPrevu" type="number" min={0} defaultValue={0} className="w-24" /></Champ>
                  <Champ label="Servi"><Input name="effectifServi" type="number" min={0} defaultValue={0} className="w-24" /></Champ>
                  <Button type="submit" size="sm" variant="outline"><ChefHat className="h-3.5 w-3.5 mr-1" />Enregistrer</Button>
                </form>
                <DataTable
                  columns={[
                    { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('fr-FR') },
                    { key: 'service', label: 'Service', render: (r: any) => ({ petit_dejeuner: 'Petit-déj', dejeuner: 'Déjeuner', diner: 'Dîner', collation: 'Collation' }[r.service] || r.service) },
                    { key: 'effectifs', label: 'Prévu/Servi', render: (r: any) => `${r.effectifPrevu} / ${r.effectifServi}` },
                  ]}
                  rows={data.productions ?? []} emptyLabel="Aucune production enregistrée" />
              </div>
              <div>
                <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Contrôle HACCP', () => ext.controleHaccp(fd)); }}>
                  <Champ label="Point de contrôle"><select name="pointControle" className={select + ' w-44'}><option>Chambre froide</option><option>Congélateur</option><option>Hotte</option><option>Chaleur des plats</option><option>Propreté surfaces</option><option>Eau potable</option></select></Champ>
                  <Champ label="Valeur"><Input name="valeur" placeholder="+3 °C" className="w-24" /></Champ>
                  <Champ label="Conforme"><input type="checkbox" name="conforme" defaultChecked className="h-5 w-5 accent-emerald-600" /></Champ>
                  <input type="hidden" name="date" value={new Date().toISOString().slice(0, 10)} />
                  <Button type="submit" size="sm" variant="outline"><Thermometer className="h-3.5 w-3.5 mr-1" />Relever</Button>
                </form>
                <DataTable
                  columns={[
                    { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('fr-FR') },
                    { key: 'pointControle', label: 'Point' },
                    { key: 'valeur', label: 'Valeur', render: (r: any) => r.valeur || '—' },
                    { key: 'conforme', label: 'Conforme', render: (r: any) => r.conforme ? <span className="text-emerald-600 font-semibold">✓</span> : <span className="text-rose-600 font-bold">NON-CONFORME</span> },
                  ]}
                  rows={data.controlesHaccp ?? []} emptyLabel="Aucun contrôle relevé" />
              </div>
            </div>
          </SectionBlock>
        </div>
      )}

      {/* ═══ LABORATOIRE ═══ */}
      {onglet === 'laboratoire' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(data.laboratoires ?? []).map((l: any) => (
              <StatCard key={l.id} title={l.nom} value={`${(l.equipements ?? []).reduce((s: number, e: any) => s + e.quantite, 0)} équip.`}
                sub={`${(l.consommables ?? []).filter((c: any) => c.quantite <= c.seuilAlerte).length} consommable(s) sous seuil`} icon={FlaskConical} color="emerald" />
            ))}
          </div>
          <SectionBlock title="Laboratoires" description="Salles d'expériences avec équipements et consommables.">
            <form className="flex flex-wrap items-end gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Laboratoire créé', () => ext.creerLabo(fd)); }}>
              <Champ label="Nom *"><Input name="nom" placeholder="Labo Sciences Physiques" required /></Champ>
              <Champ label="Type"><select name="type" className={select + ' w-40'}><option value="sciences">Sciences</option><option value="chimie">Chimie</option><option value="biologie">Biologie</option><option value="informatique">Informatique</option></select></Champ>
              <Champ label="Responsable"><select name="responsableId" className={select + ' w-44'}><option value="">—</option>{personnels.map((p: any) => <option key={p.valeur} value={p.valeur}>{p.libelle}</option>)}</select></Champ>
              <Champ label="Capacité"><Input name="capacite" type="number" min={1} className="w-20" /></Champ>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-3.5 w-3.5 mr-1" />Créer</Button>
            </form>
            {(data.laboratoires ?? []).map((l: any) => (
              <div key={l.id} className="border rounded-lg p-4 mb-3">
                <div className="font-semibold text-sm mb-2">{l.nom} <span className="text-xs text-gray-400 font-normal">({l.type}{l.capacite ? ` · ${l.capacite} places` : ''})</span></div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Équipements</div>
                    <form className="flex gap-2 mb-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('laboratoireId', l.id); run('Équipement ajouté', () => ext.equipementLabo(fd)); }}>
                      <Input name="nom" placeholder="Microscope" required className="h-8 text-xs" />
                      <Input name="quantite" type="number" min={1} defaultValue={1} className="h-8 text-xs w-16" />
                      <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">+</Button>
                    </form>
                    {(l.consommables ?? []).length > 0 && (<>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5 mt-3">Consommables <span className="normal-case font-normal">(stock — seuil alerte auto)</span></div>
                      {(l.consommables ?? []).map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between text-xs border-b py-1">
                          <span>{c.nom} <span className="text-gray-400">({c.unite})</span></span>
                          <span className="flex items-center gap-2">
                            <span className={c.quantite <= c.seuilAlerte ? 'text-rose-600 font-bold' : 'font-semibold'}>{c.quantite}</span>
                            <button className="text-emerald-600" disabled={pending} onClick={() => run('Réappro +5', () => ext.majConsommable(c.id, 5))}>+5</button>
                            <button className="text-rose-600" disabled={pending} onClick={() => run('Consommé −1', () => ext.majConsommable(c.id, -1))}>−1</button>
                          </span>
                        </div>
                      ))}
                    </>)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Réservations (7 jours)</div>
                    {(data.reservationsLabo ?? []).filter((r: any) => r.laboratoireId === l.id).map((r: any) => (
                      <div key={r.id} className="text-xs border-b py-1 flex justify-between">
                        <span>{new Date(r.date).toLocaleDateString('fr-FR')} · {r.heureDebut}–{r.heureFin}</span>
                        <span className="text-gray-600">{r.experience}</span>
                      </div>
                    ))}
                    <form className="flex flex-wrap gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('laboratoireId', l.id); run('Réservation labo', () => ext.reserverLabo(fd)); }}>
                      <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="h-8 text-xs w-32" />
                      <Input name="heureDebut" placeholder="09:00" required className="h-8 text-xs w-20" />
                      <Input name="heureFin" placeholder="11:00" required className="h-8 text-xs w-20" />
                      <Input name="experience" placeholder="Expérience" required className="h-8 text-xs w-40" />
                      <select name="classeId" className="h-8 text-xs rounded-md border border-gray-200 px-2"><option value="">Classe…</option>{classes.map((c: any) => <option key={c.valeur} value={c.valeur}>{c.libelle}</option>)}</select>
                      <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Réserver</Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </SectionBlock>
        </div>
      )}

      {/* ═══ BOUTIQUE ═══ */}
      {onglet === 'boutique' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard title="Produits en vente" value={(data.produits ?? []).filter((p: any) => p.actif).length} icon={ShoppingBag} color="emerald" />
            <StatCard title="Ventes du jour" value={((data.ventesJour ?? []).reduce((s: number, v: any) => s + v.montantTotal, 0) / 100).toLocaleString('fr-FR') + ' F'} sub={`${(data.ventesJour ?? []).length} transaction(s)`} icon={CheckCircle2} color="blue" />
            <StatCard title="Sous le seuil d'alerte" value={(data.produits ?? []).filter((p: any) => p.stock <= p.seuilAlerte).length} sub="à réapprovisionner" icon={AlertTriangle} color="rose" />
          </div>
          <SectionBlock title="Catalogue" description="Uniformes (avec tailles), fournitures et accessoires.">
            <form className="flex flex-wrap items-end gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Produit créé', () => ext.creerProduit(fd)); }}>
              <Champ label="Catégorie"><select name="categorie" className={select + ' w-32'}><option value="uniforme">Uniforme</option><option value="fourniture">Fourniture</option><option value="autre">Autre</option></select></Champ>
              <Champ label="Nom *"><Input name="nom" placeholder="Chemise blanche" required /></Champ>
              <Champ label="Taille"><Input name="taille" placeholder="M / 164 cm" className="w-24" /></Champ>
              <Champ label="Prix (F)"><Input name="prix" type="number" min={0} required className="w-24" /></Champ>
              <Champ label="Stock"><Input name="stock" type="number" min={0} required className="w-20" /></Champ>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Button>
            </form>
            <DataTable
              columns={[
                { key: 'nom', label: 'Produit', render: (p: any) => `${p.nom}${p.taille ? ' — ' + p.taille : ''}` },
                { key: 'categorie', label: 'Cat.', render: (p: any) => ({ uniforme: 'Uniforme', fourniture: 'Fourniture', autre: 'Autre' }[p.categorie]) },
                { key: 'prix', label: 'Prix', render: (p: any) => `${(p.prixUnitaire / 100).toLocaleString('fr-FR')} F` },
                { key: 'stock', label: 'Stock', render: (p: any) => <span className={p.stock <= p.seuilAlerte ? 'text-rose-600 font-bold' : ''}>{p.stock}</span> },
                { key: 'vendre', label: 'Vendre', render: (p: any) => (
                  <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('produitId', p.id); fd.set('modePaiement', 'espèces'); run('Vente encaissée', () => ext.vendre(fd)); }}>
                    <input name="quantite" type="number" min={1} defaultValue={1} className="w-12 h-7 text-xs border rounded" />
                    <select name="eleveId" className="h-7 text-xs border rounded w-28"><option value="">Anonyme</option>{eleves.map((e: any) => <option key={e.valeur} value={e.valeur}>{e.libelle}</option>)}</select>
                    <button type="submit" className="text-xs text-emerald-700 hover:underline font-semibold" disabled={pending}>OK</button>
                  </form>
                ) },
              ]}
              rows={data.produits ?? []} emptyLabel="Boutique vide — ajoutez vos uniformes et fournitures" />
            {data.ventesJour?.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Ventes du jour (recettes intégrées aux finances)</div>
                <div className="text-sm space-y-1">
                  {data.ventesJour.map((v: any) => (
                    <div key={v.id} className="flex justify-between border-b py-1 text-xs">
                      <span>{new Date(v.dateVente).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {(data.produits ?? []).find((p: any) => p.id === v.produitId)?.nom ?? '—'} ×{v.quantite}</span>
                      <span className="font-semibold">{(v.montantTotal / 100).toLocaleString('fr-FR')} F</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionBlock>
        </div>
      )}

      {/* ═══ PARC INFO ═══ */}
      {onglet === 'parc_info' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols:4 gap-3 grid-cols-2">
            <StatCard title="Équipements" value={(data.equipementsInfo ?? []).length} icon={Monitor} color="emerald" />
            <StatCard title="En prêt" value={(data.pretsActifs ?? []).length} icon={UserCheck} color="blue" />
            <StatCard title="En panne" value={(data.equipementsInfo ?? []).filter((e: any) => e.etat === 'panne').length} icon={AlertTriangle} color="rose" />
          </div>
          <SectionBlock title="Inventaire" description="Ordinateurs, tablettes, projecteurs — prêts et états.">
            <form className="flex flex-wrap items-end gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Équipement ajouté', () => ext.ajouterInfo(fd)); }}>
              <Champ label="Catégorie"><select name="categorie" className={select + ' w-36'}><option value="ordinateur">Ordinateur</option><option value="tablette">Tablette</option><option value="videoprojecteur">Projecteur</option><option value="imprimante">Imprimante</option><option value="autre">Autre</option></select></Champ>
              <Champ label="Nom *"><Input name="nom" placeholder="PC Dell Latitude 5420" required /></Champ>
              <Champ label="N° série"><Input name="numeroSerie" className="w-32" /></Champ>
              <Champ label="Valeur (F)"><Input name="valeur" type="number" min={0} className="w-28" /></Champ>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Button>
            </form>
            <DataTable
              columns={[
                { key: 'nom', label: 'Équipement', render: (e: any) => `${e.nom}${e.numeroSerie ? ' · S/N ' + e.numeroSerie : ''}` },
                { key: 'categorie', label: 'Type' },
                { key: 'etat', label: 'État', render: (e: any) => <StatusBadge statut={e.etat} label={{ operationnel: 'Opérationnel', panne: 'En panne', maintenance: 'Maintenance', reforme: 'Réformé' }[e.etat]} /> },
                { key: 'pret', label: 'Prêt', render: (e: any) => {
                  const pret = (data.pretsActifs ?? []).find((p: any) => p.equipementId === e.id);
                  if (pret) return <form className="inline-flex gap-1" onSubmit={(ev) => { ev.preventDefault(); run('Retour', () => ext.retournerInfo(pret.id, 'bon')); }}><span className="text-xs text-blue-600">en prêt</span><button className="text-xs hover:underline" disabled={pending}>retour</button></form>;
                  if (e.etat !== 'operationnel') return '—';
                  return (
                    <form className="inline-flex gap-1" onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); fd.set('equipementId', e.id); run('Prêt', () => ext.preterInfo(fd)); }}>
                      <select name="emprunteParId" className="h-7 text-xs border rounded w-32"><option value="">Prêter à…</option>{personnels.map((p: any) => <option key={p.valeur} value={p.valeur}>{p.libelle}</option>)}</select>
                      <input name="retourPrevu" type="date" defaultValue={new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)} className="h-7 text-xs border rounded w-28" />
                      <button type="submit" className="text-xs text-emerald-700 font-semibold" disabled={pending}>OK</button>
                    </form>
                  );
                } },
                { key: 'actions', label: '', render: (e: any) => (
                  <div className="flex gap-1.5 text-xs">
                    {e.etat === 'operationnel' && <button className="text-amber-600 hover:underline" disabled={pending} onClick={() => run('Panne déclarée', () => ext.majEtatInfo(e.id, 'panne'))}>⚠</button>}
                    {e.etat === 'panne' && <button className="text-emerald-600 hover:underline" disabled={pending} onClick={() => run('Remis en service', () => ext.majEtatInfo(e.id, 'operationnel'))}>✓ réparé</button>}
                  </div>
                ) },
              ]}
              rows={data.equipementsInfo ?? []} emptyLabel="Parc vide — ajoutez vos équipements" />
          </SectionBlock>
        </div>
      )}

      {/* ═══ SPORT ═══ */}
      {onglet === 'sport' && (
        <div className="space-y-4">
          <SectionBlock title="Installations" description="Terrains, gymnase, piscine — avec occupation de la semaine.">
            <form className="flex flex-wrap items-end gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Installation créée', () => ext.creerTerrain(fd)); }}>
              <Champ label="Nom *"><Input name="nom" placeholder="Terrain principal" required /></Champ>
              <Champ label="Type"><select name="type" className={select + ' w-40'}><option value="terrain">Terrain</option><option value="gymnase">Gymnase</option><option value="piscine">Piscine</option><option value="multisport">Multisport</option><option value="terrain_ext">Terrain extérieur</option></select></Champ>
              <Champ label="Capacité"><Input name="capacite" type="number" min={1} className="w-20" /></Champ>
              <Champ label="Éclairage"><input type="checkbox" name="eclairage" className="h-5 w-5 accent-emerald-600" /></Champ>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-3.5 w-3.5 mr-1" />Créer</Button>
            </form>
            {(data.installations ?? []).map((inst: any) => {
              const occupations = (data.occupations ?? []).filter((o: any) => o.installationId === inst.id);
              return (
                <Card key={inst.id} className="mb-3"><CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="font-semibold text-sm">{inst.nom} <span className="text-xs text-gray-400 font-normal">({inst.type}{inst.capacite ? ` · ${inst.capacite} pers.` : ''}{inst.eclairage ? ' · éclairé' : ''})</span></div>
                    <div className="text-xs text-gray-500">{occupations.length} occupation(s) sur 7 jours</div>
                  </div>
                  {occupations.length > 0 && (
                    <div className="border rounded-lg divide-y mb-3">
                      {occupations.map((o: any) => (
                        <div key={o.id} className="flex flex-wrap justify-between gap-2 px-3 py-1.5 text-xs">
                          <span className="font-semibold">{new Date(o.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {o.heureDebut}–{o.heureFin}</span>
                          <span>{o.titre}</span>
                          <span className="text-gray-400">{o.parQui}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('installationId', inst.id); run('Créneau réservé', () => ext.occuperTerrain(fd)); }}>
                    <Champ label="Date"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-32" /></Champ>
                    <Champ label="De"><Input name="heureDebut" placeholder="16:00" required className="w-20" /></Champ>
                    <Champ label="À"><Input name="heureFin" placeholder="18:00" required className="w-20" /></Champ>
                    <Champ label="Titre"><Input name="titre" placeholder="EPS 6A / Entraînement" required className="w-40" /></Champ>
                    <Champ label="Classe"><select name="classeId" className={select + ' w-32'}><option value="">—</option>{classes.map((c: any) => <option key={c.valeur} value={c.valeur}>{c.libelle}</option>)}</select></Champ>
                    <Button type="submit" size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Occuper</Button>
                  </form>
                </CardContent></Card>
              );
            })}
          </SectionBlock>
        </div>
      )}
    </div>
  );
}

/** Taux d'occupation internat calculés côté client depuis les chambres. */
function useMemo2(data: Donnees) {
  const lits = (data?.chambres ?? []).flatMap((c: any) => c.lits ?? []);
  const occupes = lits.filter((l: any) => l.statut === 'occupe').length;
  return {
    totalLits: lits.length, occupes,
    libres: lits.filter((l: any) => l.statut === 'libre').length,
    maintenance: lits.filter((l: any) => l.statut === 'maintenance').length,
    taux: lits.length ? Math.round((occupes / lits.length) * 100) : 0,
  };
}
