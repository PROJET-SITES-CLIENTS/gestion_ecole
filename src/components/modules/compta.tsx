'use client';

// ====================================================================
// MODULE COMPTABILITÉ — sections (primaire/secondaire/unique + consolida-
// tion), plan comptable, CAISSE, cycle achats complet, états financiers.
// ====================================================================

import { useEffect, useState, useTransition } from 'react';
import { Calculator, Wallet, Truck, BarChart3, Split, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as ext from '@/app/actions/comptabilite';

const fmt = (c: number) => `${(c / 100).toLocaleString('fr-FR')} F`;

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
const sel = 'w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm';

export default function ComptaModule({ initialData }: { initialData?: any }) {
  const [pending, start] = useTransition();
  const [data, setData] = useState<any>(null);
  const [onglet, setOnglet] = useState('accueil');
  const [rapport, setRapport] = useState<any>(null);
  const retours = { c: useActionFeedback(), r: useActionFeedback() };

  function charger() { ext.lireComptabilite().then((r: any) => { if (r?.ok) setData(r); }); }
  useEffect(charger, []);

  function run(ret: any, nom: string, fn: () => Promise<any>) {
    start(async () => {
      try { const r = await fn(); if (r && r.ok === false) { ret.run(() => Promise.resolve(r), nom); return; } ret.run(() => Promise.resolve({ ok: true }), nom); charger(); }
      catch { ret.run(() => Promise.resolve({ ok: false, error: 'Connexion instable' }), ''); }
    });
  }

  if (!data) return <div className="p-6 text-sm text-gray-500">Chargement de la comptabilité…</div>;
  const session = data.sessionCaisse;
  const fournisseurs = data.fournisseurs ?? [];
  const sections = data.sections ?? [];
  const separees = sections.some((s: any) => s.code === 'PRIMAIRE' || s.code === 'SECONDAIRE');

  return (
    <div className="space-y-4">
      <PageHeader title="Comptabilité" subtitle="Sections comptables, caisse, cycle achats complet et états financiers — partie double intégrée." />
      {retours.c.Message}{retours.r.Message}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {[['accueil', 'Accueil', Calculator], ['caisse', 'Caisse', Wallet], ['achats', 'Fournisseurs & achats', Truck], ['etats', 'États financiers', BarChart3]].map(([id, lib, Ic]: any) => (
          <button key={id} onClick={() => setOnglet(id)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${onglet === id ? 'bg-emerald-600 text-white' : 'bg-white border hover:border-emerald-300'}`}>
            <Ic className="h-4 w-4" />{lib}
          </button>
        ))}
      </div>

      {/* ═══ ACCUEIL : sections + plan ═══ */}
      {onglet === 'accueil' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Structure" value={separees ? 'Séparée' : 'Unique'} sub={separees ? 'Primaire + Secondaire' : 'Une comptabilité'} icon={Split} color="emerald" />
            <StatCard title="Comptes au plan" value={data.plan?.length ?? 0} sub={data.planInitialise ? 'SYSCOHADA école' : 'à initialiser'} icon={Calculator} color="blue" />
            <StatCard title="Dû clients" value={fmt(data.ageeClients?.total ?? 0)} sub={`${data.ageeClients?.lignes?.length ?? 0} échéance(s)`} icon={AlertTriangle} color="amber" />
            <StatCard title="Dû fournisseurs" value={fmt(data.ageeFournisseurs?.total ?? 0)} sub={`${data.ageeFournisseurs?.lignes?.length ?? 0} facture(s)`} icon={Truck} color="rose" />
          </div>
          <SectionBlock title="Sections comptables" description="Certaines écoles tiennent une comptabilité unique ; d'autres séparent primaire et secondaire, consolidées par le responsable comptable.">
            {sections.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(retours.c, 'Comptabilité unique', () => ext.configurerSections(false))}>Comptabilité UNIQUE</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending} onClick={() => run(retours.c, 'Comptabilités séparées', () => ext.configurerSections(true))}>SÉPARER Primaire / Secondaire</Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sections.map((s: any) => (
                  <div key={s.id} className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-medium">{s.libelle}</div>
                ))}
                <span className="text-xs text-gray-500 self-center">+ vue CONSOLIDÉE (toutes sections) dans les états financiers.</span>
              </div>
            )}
          </SectionBlock>
          {!data.planInitialise && (
            <SectionBlock title="Plan comptable" description="Génération du plan SYSCOHADA adapté aux écoles (caisse, banque, clients, fournisseurs, achats, ventes scolarité…) + journaux standards.">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending} onClick={() => run(retours.c, 'Plan comptable créé', () => ext.initialiserPlanComptable())}>
                <Plus className="h-3.5 w-3.5 mr-1" />Initialiser le plan comptable
              </Button>
            </SectionBlock>
          )}
          {/* Balances âgées */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionBlock title="Balance âgée clients (dûs)" description="Échéances impayées par ancienneté.">
              <div className="grid grid-cols-4 gap-2 mb-3 text-center text-xs">
                {Object.entries({ non_echu: 'Non échu', '1_30': '1-30 j', '31_60': '31-60 j', '60_plus': '+60 j' }).map(([k, l]) => (
                  <div key={k} className={`rounded-lg border p-2 ${k === '60_plus' && (data.ageeClients?.totaux?.[k] ?? 0) > 0 ? 'border-rose-300 bg-rose-50' : 'border-gray-200'}`}>
                    <div className="text-gray-500">{l}</div>
                    <div className="font-bold text-sm">{fmt(data.ageeClients?.totaux?.[k] ?? 0)}</div>
                  </div>
                ))}
              </div>
              <DataTable columns={[
                { key: 'eleve', label: 'Famille' }, { key: 'frais', label: 'Frais' },
                { key: 'restant', label: 'Restant', render: (l: any) => fmt(l.restant) },
                { key: 'jours', label: 'Retard', render: (l: any) => l.jours > 0 ? `${l.jours} j` : '—' },
              ]} rows={(data.ageeClients?.lignes ?? []).slice(0, 30)} emptyLabel="Aucun impayé" />
            </SectionBlock>
            <SectionBlock title="Balance âgée fournisseurs (dettes)" description="Factures dues par ancienneté.">
              <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
                {Object.entries({ '1_30': '1-30 j', '31_60': '31-60 j', '60_plus': '+60 j' }).map(([k, l]) => (
                  <div key={k} className="rounded-lg border border-gray-200 p-2">
                    <div className="text-gray-500">{l}</div>
                    <div className="font-bold text-sm">{fmt(data.ageeFournisseurs?.totaux?.[k] ?? 0)}</div>
                  </div>
                ))}
              </div>
              <DataTable columns={[
                { key: 'fournisseur', label: 'Fournisseur' }, { key: 'numero', label: 'Facture' },
                { key: 'restant', label: 'Restant', render: (l: any) => fmt(l.restant) },
              ]} rows={data.ageeFournisseurs?.lignes ?? []} emptyLabel="Aucune dette fournisseur" />
            </SectionBlock>
          </div>
        </div>
      )}

      {/* ═══ CAISSE ═══ */}
      {onglet === 'caisse' && (
        <SectionBlock title="Caisse" description="Session quotidienne : ouverture avec fond, opérations, fermeture avec contrôle physique et écart comptabilisé.">
          {!session ? (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(retours.c, 'Caisse ouverte', () => ext.ouvrirCaisse(fd)); }}>
              <Champ label="Fond de caisse (F)"><Input name="fondCaisse" type="number" min={0} defaultValue={10000} required /></Champ>
              {separees && <Champ label="Section"><select name="sectionComptableId" className={sel + ' w-52'}><option value="">Toutes</option>{sections.map((s: any) => <option key={s.id} value={s.id}>{s.libelle}</option>)}</select></Champ>}
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Wallet className="h-3.5 w-3.5 mr-1" />Ouvrir la caisse</Button>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <StatCard title="Solde théorique" value={fmt(session.soldeTheorique)} sub={`fond ${fmt(session.fondCaisse)}`} icon={Wallet} color="emerald" />
                <StatCard title="Entrées" value={fmt(session.operations.filter((o: any) => o.type === 'entree').reduce((s: number, o: any) => s + o.montant, 0))} icon={CheckCircle2} color="blue" />
                <StatCard title="Sorties" value={fmt(session.operations.filter((o: any) => o.type === 'sortie').reduce((s: number, o: any) => s + o.montant, 0))} icon={AlertTriangle} color="amber" />
                <StatCard title="Opérations" value={session.operations.length} icon={Calculator} color="purple" />
              </div>
              <form className="flex flex-wrap items-end gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('sessionCaisseId', session.id); run(retours.c, 'Opération enregistrée', () => ext.operationCaisse(fd)); (e.target as HTMLFormElement).reset(); }}>
                <Champ label="Type"><select name="type" className={sel + ' w-28'}><option value="entree">Entrée</option><option value="sortie">Sortie</option></select></Champ>
                <Champ label="Montant (F)"><Input name="montant" type="number" min={1} required className="w-28" /></Champ>
                <Champ label="Motif"><Input name="motif" placeholder="Achat urgent, recette…" required className="w-52" /></Champ>
                <Champ label="Référence"><Input name="reference" className="w-32" /></Champ>
                <Button type="submit" size="sm" variant="outline">Enregistrer</Button>
              </form>
              <form className="flex flex-wrap items-end gap-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(retours.c, 'Caisse fermée', () => ext.fermerCaisse(session.id, Number((fd.get('soldeCompte') as string)))); }}>
                <Champ label="Solde compté physiquement (F)"><Input name="soldeCompte" type="number" min={0} required className="w-36" /></Champ>
                <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700">Fermer la caisse (écart auto)</Button>
              </form>
              <table className="w-full text-sm mt-3">
                <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="py-1">Heure</th><th>Type</th><th>Motif</th><th className="text-right">Montant</th></tr></thead>
                <tbody>{session.operations.map((o: any) => (
                  <tr key={o.id} className="border-b"><td className="py-1 text-xs">{new Date(o.dateOperation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><StatusBadge statut={o.type} label={o.type === 'entree' ? 'Entrée' : 'Sortie'} /></td><td className="text-xs">{o.motif}</td>
                  <td className={`text-right font-semibold ${o.type === 'entree' ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(o.montant)}</td></tr>
                ))}</tbody>
              </table>
            </>
          )}
        </SectionBlock>
      )}

      {/* ═══ ACHATS ═══ */}
      {onglet === 'achats' && (
        <div className="space-y-4">
          <SectionBlock title="Nouvelle commande fournisseur" description="Bons de commande → réceptions (bons de livraison) → facture → règlement.">
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(retours.c, 'Commande créée', () => ext.creerCommandeFournisseur(fd)); }}>
              <Champ label="Fournisseur"><select name="fournisseurId" className={sel + ' w-48'} required><option value="">—</option>{fournisseurs.map((f: any) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></Champ>
              {separees && <Champ label="Section"><select name="sectionComptableId" className={sel + ' w-44'}><option value="">Toutes</option>{sections.map((s: any) => <option key={s.id} value={s.id}>{s.libelle}</option>)}</select></Champ>}
              <Champ label="Lignes (désignation | qté | prix F)"><textarea name="lignes" rows={3} required placeholder={'Craies | 50 | 500\nRames papier A4 | 20 | 3500'} className="rounded-md border px-3 py-2 text-sm w-72" /></Champ>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">Créer</Button>
            </form>
          </SectionBlock>
          <SectionBlock title="Commandes" description="Cycle : brouillon → envoyée → livraison (partielle/totale) → facturée → payée.">
            {(data.commandes ?? []).map((c: any) => (
              <div key={c.id} className="border rounded-lg p-3 mb-3">
                <div className="flex flex-wrap justify-between gap-2 items-center mb-2">
                  <div className="text-sm"><b>{c.numero}</b> — {c.fournisseur?.nom} · {fmt(c.montantTotal)}</div>
                  <div className="flex items-center gap-2"><StatusBadge statut={c.statut} />
                    {c.statut === 'brouillon' && <button className="text-xs text-emerald-700 font-semibold" disabled={pending} onClick={() => run(retours.c, 'Commande envoyée', () => ext.envoyerCommande(c.id))}>Envoyer</button>}
                  </div>
                </div>
                <div className="text-xs text-gray-600 space-y-0.5">
                  {c.lignes?.map((l: any) => <div key={l.id}>• {l.designation} — {l.quantite} × {fmt(l.prixUnitaire)} {l.recu ? '✓' : ''}</div>)}
                </div>
                {c.statut === 'envoyee' || c.statut === 'livraison_partielle' ? (
                  <form className="flex flex-wrap items-end gap-2 mt-2 border-t pt-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('commandeId', c.id);
                    const lignes = (c.lignes ?? []).map((l: any) => `${l.id}|${l.quantite - ((c.receptions ?? []).filter((r: any) => r.ligneId === l.id).reduce((s: number, r: any) => s + r.quantiteRecue, 0))}`).filter((x: string) => !x.endsWith('|0')).join('\n');
                    fd.set('lignes', lignes); run(retours.c, 'Réception enregistrée', () => ext.receptionnerCommande(fd)); }}>
                    <select name="controleQualite" className="h-8 text-xs border rounded px-2"><option value="conforme">Conforme</option><option value="reserve">Avec réserves</option><option value="refuse">Refusé</option></select>
                    <button type="submit" className="text-xs text-emerald-700 font-semibold" disabled={pending}>Réceptionner (bon de livraison)</button>
                  </form>
                ) : null}
              </div>
            ))}
          </SectionBlock>
          <SectionBlock title="Factures fournisseurs" description="Comptabilisées en partie double (charge + TVA / dette fournisseur).">
            <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(retours.c, 'Facture enregistrée', () => ext.enregistrerFacture(fd)); }}>
              <Champ label="Fournisseur"><select name="fournisseurId" className={sel + ' w-44'} required><option value="">—</option>{fournisseurs.map((f: any) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></Champ>
              <Champ label="N° facture"><Input name="numero" required className="w-28" /></Champ>
              <Champ label="HT (F)"><Input name="montantHT" type="number" required className="w-28" /></Champ>
              <Champ label="TVA (F)"><Input name="montantTVA" type="number" defaultValue={0} className="w-24" /></Champ>
              <Champ label="Échéance"><Input name="dateEcheance" type="date" className="w-36" /></Champ>
              <input type="hidden" name="dateEmission" value={new Date().toISOString().slice(0, 10)} />
              <Button type="submit" size="sm" variant="outline">Comptabiliser</Button>
            </form>
            <DataTable columns={[
              { key: 'numero', label: 'N°' }, { key: 'fournisseur', label: 'Fournisseur', render: (f: any) => f.fournisseur?.nom ?? '—' },
              { key: 'ttc', label: 'TTC', render: (f: any) => fmt(f.montantTTC) },
              { key: 'statut', label: 'Statut', render: (f: any) => <StatusBadge statut={f.statut} /> },
              { key: 'payer', label: '', render: (f: any) => {
                const restant = f.montantTTC - (f.paiements ?? []).reduce((s: number, p: any) => s + p.montant, 0);
                if (restant <= 0) return <span className="text-emerald-600 text-xs">✓ réglée</span>;
                return (
                  <form className="inline-flex gap-1" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('factureId', f.id); run(retours.c, 'Paiement fournisseur', () => ext.payerFacture(fd)); }}>
                    <input name="montant" type="number" defaultValue={restant / 100} className="w-24 h-7 text-xs border rounded px-1" />
                    <select name="mode" className="h-7 text-xs border rounded"><option>virement</option><option>especes</option><option>cheque</option></select>
                    <button className="text-xs text-emerald-700 font-semibold">Payer</button>
                  </form>
                );
              } },
            ]} rows={data.factures ?? []} emptyLabel="Aucune facture fournisseur" />
          </SectionBlock>
        </div>
      )}

      {/* ═══ ÉTATS FINANCIERS ═══ */}
      {onglet === 'etats' && (
        <SectionBlock title="États financiers" description="Balance, compte de résultat, bilan — par section ou consolidés.">
          <div className="flex flex-wrap items-end gap-2 mb-4">
            <Champ label="Vue"><select id="vue-section" className={sel + ' w-52'}>
              <option value="toutes">Consolidé (toutes sections)</option>
              <option value="global">Comptabilité unique</option>
              {sections.filter((s: any) => s.code !== 'GLOBAL').map((s: any) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
            </select></Champ>
            {(['balance', 'resultat', 'bilan'] as const).map((t) => (
              <Button key={t} size="sm" variant="outline" disabled={pending} onClick={() => {
                const section = (document.getElementById('vue-section') as HTMLSelectElement)?.value ?? 'toutes';
                start(async () => { const r: any = await ext.rapportComptable(t, section); setRapport({ type: t, ...(r?.ok ? r : { erreur: r?.error }) }); });
              }}>{t === 'balance' ? 'Balance' : t === 'resultat' ? 'Compte de résultat' : 'Bilan'}</Button>
            ))}
          </div>
          {rapport?.erreur && <div className="text-sm text-rose-700">{rapport.erreur}</div>}
          {rapport?.type === 'balance' && (
            <table className="w-full text-sm"><thead><tr className="text-xs text-gray-500 border-b"><th className="py-1 text-left">Compte</th><th>Libellé</th><th className="text-right">Débit</th><th className="text-right">Crédit</th></tr></thead>
              <tbody>{(rapport.comptes ?? []).map((c: any) => <tr key={c.numero} className="border-b"><td className="font-mono text-xs py-1">{c.numero}</td><td>{c.libelle}</td><td className="text-right tabular-nums">{fmt(c.debit)}</td><td className="text-right tabular-nums">{fmt(c.credit)}</td></tr>)}
                <tr className="font-bold border-t-2"><td colSpan={2}>TOTAL {rapport.equilibree ? '✓ équilibrée' : '⚠ DÉSÉQUILIBRE'}</td><td className="text-right">{fmt(rapport.totalDebit)}</td><td className="text-right">{fmt(rapport.totalCredit)}</td></tr></tbody></table>
          )}
          {rapport?.type === 'resultat' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><div className="font-semibold text-sm mb-1">Charges</div>{(rapport.charges ?? []).map((c: any) => <div key={c.numero} className="flex justify-between text-sm border-b py-1"><span>{c.numero} {c.libelle}</span><span>{fmt(c.debit - c.credit)}</span></div>)}
                <div className="flex justify-between font-bold pt-1"><span>Total charges</span><span>{fmt(rapport.totalCharges)}</span></div></div>
              <div><div className="font-semibold text-sm mb-1">Produits</div>{(rapport.produits ?? []).map((c: any) => <div key={c.numero} className="flex justify-between text-sm border-b py-1"><span>{c.numero} {c.libelle}</span><span>{fmt(c.credit - c.debit)}</span></div>)}
                <div className="flex justify-between font-bold pt-1"><span>Total produits</span><span>{fmt(rapport.totalProduits)}</span></div></div>
              <div className={`total-encadre md:col-span-2 !rounded-lg border-l-8 flex justify-between items-center px-4 py-3 ${rapport.resultat >= 0 ? 'border-emerald-600 text-emerald-800' : 'border-rose-600 text-rose-800'}`}>
                <span>RÉSULTAT {rapport.resultat >= 0 ? '(bénéfice)' : '(déficit)'}</span><span className="text-xl font-extrabold">{fmt(Math.abs(rapport.resultat))}</span>
              </div>
            </div>
          )}
          {rapport?.type === 'bilan' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><div className="font-semibold text-sm mb-1">Actif</div>{(rapport.actif ?? []).map((c: any) => <div key={c.numero} className="flex justify-between text-sm border-b py-1"><span>{c.numero} {c.libelle}</span><span>{fmt(c.debit - c.credit)}</span></div>)}
                <div className="flex justify-between font-bold pt-1"><span>Total actif</span><span>{fmt(rapport.totalActif)}</span></div></div>
              <div><div className="font-semibold text-sm mb-1">Passif + capitaux + résultat</div>
                {(rapport.capitaux ?? []).concat(rapport.passif ?? []).map((c: any) => <div key={c.numero} className="flex justify-between text-sm border-b py-1"><span>{c.numero} {c.libelle}</span><span>{fmt(c.credit - c.debit)}</span></div>)}
                <div className="flex justify-between text-sm border-b py-1"><span>Résultat de l'exercice</span><span>{fmt(rapport.resultat)}</span></div>
                <div className="flex justify-between font-bold pt-1"><span>Total passif</span><span>{fmt(rapport.totalPassif)}</span></div></div>
              <div className={`md:col-span-2 text-center text-sm font-semibold ${rapport.equilibre ? 'text-emerald-700' : 'text-amber-700'}`}>
                {rapport.equilibre ? '✓ Bilan équilibré (Actif = Passif)' : `⚠ Écart actif/passif : ${fmt(Math.abs(rapport.totalActif - rapport.totalPassif))}`}
              </div>
            </div>
          )}
        </SectionBlock>
      )}
    </div>
  );
}
