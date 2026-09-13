'use client';

// ====================================================================
// MODULE RH+ — formations, sanctions disciplinaires, soldes de congés
// (acquisition automatique idempotente)
// ====================================================================

import { useEffect, useState, useTransition } from 'react';
import { GraduationCap, Gavel, CalendarCheck, CheckCircle2, Award } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as ext from '@/app/actions/rh-complements';

const sel = 'w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm';
const fmtD = (d: any) => new Date(d).toLocaleDateString('fr-FR');

export default function RhPlusModule({ initialData }: { initialData?: any }) {
  const [pending, start] = useTransition();
  const [data, setData] = useState<any>(null);
  const ret = useActionFeedback();
  const personnels = (initialData?.personnels ?? []).map((p: any) => ({ valeur: p.id, libelle: `${p.nom} ${p.prenom}${p.matricule ? ' — ' + p.matricule : ''}` }));

  function charger() { ext.lireRhComplements().then((r: any) => { if (r?.ok) setData(r); }); }
  useEffect(charger, []);

  function run(nom: string, fn: () => Promise<any>) {
    ret.run(async () => { const r = await fn(); if (r && r.ok === false) throw new Error(r.error); charger(); return { ok: true }; }, nom);
  }

  if (!data) return <div className="p-6 text-sm text-gray-500">Chargement RH…</div>;
  const formations = data.formations ?? [], sanctions = data.sanctions ?? [], soldes = data.soldes ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="RH — Formations, discipline, congés" subtitle="Derniers compléments RH : formations continues, registre des sanctions et acquisition automatique des soldes de congés." />
      {ret.Message}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Formations" value={formations.length} sub={`${formations.filter((f: any) => f.statut === 'terminee').length} terminée(s)`} icon={GraduationCap} color="emerald" />
        <StatCard title="Certificats obtenus" value={formations.filter((f: any) => f.certificatObtenu).length} icon={Award} color="blue" />
        <StatCard title="Sanctions (registre)" value={sanctions.length} icon={Gavel} color="amber" />
        <StatCard title="Soldes de congés" value={soldes.length} sub={`${soldes.reduce((s: number, x: any) => s + (x.droitsAcquis - x.joursPris), 0).toFixed(1)} j restants`} icon={CalendarCheck} color="purple" />
      </div>

      <SectionBlock title="Formations continues" description="Planifier, suivre et certifier les formations du personnel.">
        <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Formation créée', () => ext.creerFormation(fd)); (e.target as HTMLFormElement).reset(); }}>
          <div className="space-y-1"><Label className="text-xs">Employé</Label><select name="personnelId" className={sel + ' w-48'} required><option value="">—</option>{personnels.map((p: any) => <option key={p.valeur} value={p.valeur}>{p.libelle}</option>)}</select></div>
          <div className="space-y-1"><Label className="text-xs">Intitulé</Label><Input name="intitule" placeholder="Secourisme scolaire" required className="w-52" /></div>
          <div className="space-y-1"><Label className="text-xs">Organisme</Label><Input name="organisme" className="w-40" /></div>
          <div className="space-y-1"><Label className="text-xs">Début</Label><Input name="dateDebut" type="date" required className="w-36" /></div>
          <div className="space-y-1"><Label className="text-xs">Coût (F)</Label><Input name="cout" type="number" className="w-28" /></div>
          <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">Planifier</Button>
        </form>
        <DataTable columns={[
          { key: 'personnel', label: 'Employé', render: (f: any) => `${f.personnel?.prenom} ${f.personnel?.nom}` },
          { key: 'intitule', label: 'Formation' },
          { key: 'organisme', label: 'Organisme', render: (f: any) => f.organisme ?? '—' },
          { key: 'dateDebut', label: 'Début', render: (f: any) => fmtD(f.dateDebut) },
          { key: 'statut', label: 'Statut', render: (f: any) => <StatusBadge statut={f.statut} label={{ planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' }[f.statut]} /> },
          { key: 'actions', label: '', render: (f: any) => (
            <div className="flex gap-2 text-xs">
              {f.statut === 'planifiee' && <button className="text-blue-600" disabled={pending} onClick={() => run('Formation en cours', () => ext.majFormation(f.id, 'en_cours'))}>Démarrer</button>}
              {f.statut === 'en_cours' && <button className="text-emerald-700" disabled={pending} onClick={() => run('Formation terminée + certificat', () => ext.majFormation(f.id, 'terminee', true))}>Terminer ✓ + cert.</button>}
              <button className="text-rose-600" disabled={pending} onClick={() => run('Formation annulée', () => ext.majFormation(f.id, 'annulee'))}>Annuler</button>
            </div>
          ) },
        ]} rows={formations} emptyLabel="Aucune formation planifiée" />
      </SectionBlock>

      <SectionBlock title="Registre des sanctions disciplinaires" description="Fautes, sanctions échelonnées (avertissement → licenciement, réservé à la direction), notification écrite automatique.">
        <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Sanction notifiée', () => ext.sanctionnerPersonnel(fd)); }}>
          <div className="space-y-1"><Label className="text-xs">Employé</Label><select name="personnelId" className={sel + ' w-48'} required><option value="">—</option>{personnels.map((p: any) => <option key={p.valeur} value={p.valeur}>{p.libelle}</option>)}</select></div>
          <div className="space-y-1"><Label className="text-xs">Date des faits</Label><Input name="dateFaits" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-36" /></div>
          <div className="space-y-1"><Label className="text-xs">Sanction</Label><select name="typeSanction" className={sel + ' w-40'}><option value="avertissement">Avertissement</option><option value="oral">Observation orale</option><option value="blame">Blâme</option><option value="mise_a_demeure">Mise à demeure</option><option value="licenciement">Licenciement</option></select></div>
          <div className="space-y-1"><Label className="text-xs">Faute</Label><Input name="faute" placeholder="Absences répétées non justifiées" required className="w-52" /></div>
          <div className="space-y-1"><Label className="text-xs">Description factuelle</Label><Input name="description" required className="w-64" /></div>
          <Button type="submit" size="sm" variant="outline">Notifier</Button>
        </form>
        <DataTable columns={[
          { key: 'personnel', label: 'Employé', render: (s: any) => `${s.personnel?.prenom} ${s.personnel?.nom}` },
          { key: 'dateFaits', label: 'Faits du', render: (s: any) => fmtD(s.dateFaits) },
          { key: 'faute', label: 'Faute' },
          { key: 'typeSanction', label: 'Sanction', render: (s: any) => <StatusBadge statut={s.typeSanction} label={{ avertissement: 'Avertissement', oral: 'Oral', blame: 'Blâme', mise_a_demeure: 'Mise à demeure', licenciement: 'Licenciement' }[s.typeSanction]} /> },
        ]} rows={sanctions} emptyLabel="Aucune sanction — registre vierge" />
      </SectionBlock>

      <SectionBlock title="Soldes de congés — acquisition automatique" description="Crédit mensuel paramétrable (défaut 2,5 j/mois dès le mois suivant l'embauche), plafonné, IDEMPOTENT : re-exécuter ne double jamais le crédit.">
        <form className="flex flex-wrap items-end gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run('Soldes actualisés', () => ext.acquitterSoldes(Number(fd.get('j') || 2.5), Number(fd.get('p') || 30))); }}>
          <div className="space-y-1"><Label className="text-xs">Jours / mois</Label><Input name="j" type="number" step="0.5" defaultValue={2.5} className="w-24" /></div>
          <div className="space-y-1"><Label className="text-xs">Plafond (j)</Label><Input name="p" type="number" defaultValue={30} className="w-24" /></div>
          <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700"><CalendarCheck className="h-3.5 w-3.5 mr-1" />Exécuter l'acquisition mensuelle</Button>
        </form>
        <DataTable columns={[
          { key: 'personnel', label: 'Employé', render: (s: any) => `${s.personnel?.prenom} ${s.personnel?.nom}` },
          { key: 'annee', label: 'Année' },
          { key: 'droitsAcquis', label: 'Droits acquis', render: (s: any) => `${s.droitsAcquis.toFixed(1)} j` },
          { key: 'joursPris', label: 'Pris', render: (s: any) => `${s.joursPris.toFixed(1)} j` },
          { key: 'restants', label: 'Restants', render: (s: any) => <b className={s.joursRestants > 5 ? 'text-emerald-700' : ''}>{s.joursRestants.toFixed(1)} j</b> },
        ]} rows={soldes} emptyLabel="Aucun solde — exécutez l'acquisition" />
      </SectionBlock>
    </div>
  );
}
