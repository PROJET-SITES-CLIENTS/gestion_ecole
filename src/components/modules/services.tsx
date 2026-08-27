'use client';

// ====================================================================
// Module Services Complémentaires — cantine, transport, bibliothèque
// ====================================================================

import { useTransition } from 'react';
import { Bus, BookMarked, Utensils, Package, Users, ClipboardList } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import { formatDate, formatMontant } from '@/lib/format';

export default function ServicesModule({ initialData }: { initialData: any }) {
  const cantine = initialData.cantines ?? [];
  const transports = initialData.transports ?? [];
  const lignesTransport = initialData.lignesTransport ?? [];
  const arrets = initialData.arrets ?? [];
  const biblioLivres = initialData.biblioLivres ?? [];
  const biblioPrets = initialData.biblioPrets ?? [];
  const manuels = initialData.manuels ?? [];
  const attributionsManuel = initialData.attributionsManuel ?? [];
  const listesFourniture = initialData.listesFourniture ?? [];
  const niveaux = initialData.niveaux ?? [];
  const eleves = initialData.eleves ?? [];
  const classes = initialData.classes ?? [];
  const [pending, startTransition] = useTransition();

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Services complémentaires" subtitle="Cantine, transport, bibliothèque, manuels scolaires" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Inscriptions cantine" value={cantine.length} icon={Utensils} color="emerald" />
        <StatCard title="Inscriptions transport" value={transports.length} sub={`${lignesTransport.length} lignes`} icon={Bus} color="blue" />
        <StatCard title="Livres bibliothèque" value={biblioLivres.length} sub={`${biblioLivres.reduce((s: number, l: any) => s + l.exemplairesDisponibles, 0)} dispo`} icon={BookMarked} color="purple" />
        <StatCard title="Manuels attribués" value={attributionsManuel.length} sub={`${manuels.length} titres`} icon={Package} color="amber" />
      </div>

      <SectionBlock title="Cantine — inscriptions" description="Repas par élève et jours de la semaine">
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (c) => { const e = eleves.find((x: any) => x.id === c.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'classe', label: 'Classe', render: (c) => classes.find((x: any) => x.id === c.classeId)?.libelle ?? '—' },
            { key: 'joursSemaine', label: 'Jours', render: (c) => JSON.parse(c.joursSemaine || '[]').map((j: number) => ['Lun','Mar','Mer','Jeu','Ven','Sam'][j-1] ?? j).join(', ') },
            { key: 'tarifJournalier', label: 'Tarif/jour', render: (c) => formatMontant(c.tarifJournalier) },
            { key: 'actif', label: 'Statut', render: (c) => c.actif ? <StatusBadge statut="actif" /> : <StatusBadge statut="resilie" /> },
          ]}
          rows={cantine}
          emptyLabel="Aucune inscription cantine"
        />
      </SectionBlock>

      <SectionBlock title="Transport — lignes et inscriptions">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <h4 className="text-sm font-medium mb-2">Lignes</h4>
            <DataTable
              columns={[
                { key: 'nom', label: 'Ligne' },
                { key: 'vehicule', label: 'Véhicule' },
                { key: 'arrets', label: 'Arrêts', render: (l) => arrets.filter((a: any) => a.ligneId === l.id).length },
              ]}
              rows={lignesTransport}
              emptyLabel="Aucune ligne"
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Inscriptions transport</h4>
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (t) => { const e = eleves.find((x: any) => x.id === t.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
                { key: 'ligne', label: 'Ligne', render: (t) => lignesTransport.find((l: any) => l.id === t.ligneId)?.nom ?? '—' },
                { key: 'tarif', label: 'Tarif', render: (t) => formatMontant(t.tarif) },
              ]}
              rows={transports}
              emptyLabel="Aucune inscription transport"
            />
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="Bibliothèque" description="Catalogue de livres et prêts en cours">
        <DataTable
          columns={[
            { key: 'titre', label: 'Titre' },
            { key: 'auteur', label: 'Auteur' },
            { key: 'isbn', label: 'ISBN' },
            { key: 'disponibilite', label: 'Dispo', render: (l) => `${l.exemplairesDisponibles}/${l.exemplairesTotal}` },
            { key: 'cote', label: 'Cote' },
          ]}
          rows={biblioLivres}
          emptyLabel="Aucun livre au catalogue"
        />
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Prêts en cours</h4>
          <DataTable
            columns={[
              { key: 'livre', label: 'Livre', render: (p) => biblioLivres.find((l: any) => l.id === p.livreId)?.titre ?? '—' },
              { key: 'eleve', label: 'Élève', render: (p) => { const e = eleves.find((x: any) => x.id === p.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'datePret', label: 'Prêté le', render: (p) => formatDate(p.datePret) },
              { key: 'dateRetourPrevue', label: 'À rendre le', render: (p) => formatDate(p.dateRetourPrevue) },
              { key: 'statut', label: 'Statut', render: (p) => <StatusBadge statut={p.statut} /> },
            ]}
            rows={biblioPrets}
            emptyLabel="Aucun prêt en cours"
          />
        </div>
      </SectionBlock>

      <SectionBlock title="Manuels scolaires" description="Stock, attributions et retours">
        <DataTable
          columns={[
            { key: 'titre', label: 'Titre' },
            { key: 'editeur', label: 'Éditeur' },
            { key: 'anneeEdition', label: 'Édition' },
            { key: 'quantiteStock', label: 'Stock' },
            { key: 'attributions', label: 'Attribués', render: (m) => attributionsManuel.filter((a: any) => a.manuelScolaireId === m.id).length },
          ]}
          rows={manuels}
          emptyLabel="Aucun manuel scolaire"
        />
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Attributions en cours</h4>
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (a) => { const e = eleves.find((x: any) => x.id === a.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
              { key: 'manuel', label: 'Manuel', render: (a) => manuels.find((m: any) => m.id === a.manuelScolaireId)?.titre ?? '—' },
              { key: 'etatRemise', label: 'Remis en' },
              { key: 'dateAttribution', label: 'Attribué le', render: (a) => formatDate(a.dateAttribution) },
              { key: 'statut', label: 'Statut', render: (a) => <StatusBadge statut={a.statut} /> },
            ]}
            rows={attributionsManuel}
            emptyLabel="Aucune attribution de manuel"
          />
        </div>
      </SectionBlock>

      <SectionBlock title="Listes de fournitures" description="Fournitures demandées par niveau, publication aux familles">
        <DataTable
          columns={[
            { key: 'niveau', label: 'Niveau', render: (l) => niveaux.find((n: any) => n.id === l.niveauId)?.libelle ?? '—' },
            { key: 'articles', label: 'Articles', render: (l) => { try { return `${JSON.parse(l.contenu).length} article(s)`; } catch { return '—'; } } },
            { key: 'datePublication', label: 'Publiée le', render: (l) => l.datePublication ? formatDate(l.datePublication) : '—' },
            { key: 'publiee', label: 'Statut', render: (l) => <StatusBadge statut={l.publiee ? 'publie' : 'en_attente'} /> },
            {
              key: 'detail', label: 'Détail', render: (l) => {
                try {
                  const items = JSON.parse(l.contenu) as { article: string; quantite: number }[];
                  return <span className="text-xs text-gray-500">{items.slice(0, 3).map((i) => `${i.article} ×${i.quantite}`).join(', ')}{items.length > 3 ? '…' : ''}</span>;
                } catch { return '—'; }
              },
            },
          ]}
          rows={listesFourniture}
          emptyLabel="Aucune liste de fournitures"
        />
      </SectionBlock>
    </div>
  );
}
