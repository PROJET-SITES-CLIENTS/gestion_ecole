'use client';

// ====================================================================
// Portail Parent — vue restreinte sur les enfants, bulletins,
// paiements, RDV, notifications.
// ====================================================================

import { useState } from 'react';
import { Users, Wallet, BookOpen, Bell, CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, EmptyState, ModalForm, CreateButton } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import { formatMontant, formatDate, formatDateTime } from '@/lib/format';

export default function ParentPortalModule({ initialData, mode = 'full' }: { initialData: any; mode?: 'dashboard' | 'full' }) {
  const eleves = initialData.eleves ?? [];
  const bulletins = initialData.bulletins ?? [];
  const echeances = initialData.echeances ?? [];
  const paiements = initialData.paiements ?? [];
  const creneaux = initialData.creneauxRdv ?? [];
  const rdvs = initialData.rdvs ?? [];
  const notifications = (initialData.notifications ?? []).filter((n: any) => n.destinataireId === initialData.session?.utilisateur?.id);
  const classes = initialData.classes ?? [];
  const personnels = initialData.personnels ?? [];

  // Enfants RÉELS du parent connecté (session) — fin du choix arbitraire.
  const session = initialData.session ?? {};
  const [enfantActifId, setEnfantActifId] = useState<string | null>(null);
  const mesEnfants = (session.enfantsIds ?? []).length > 0
    ? eleves.filter((e: any) => session.enfantsIds.includes(e.id))
    : eleves.slice(0, 1); // repli pour compatibilité
  const enfant = mesEnfants.find((e: any) => e.id === enfantActifId) ?? mesEnfants[0] ?? null;
  const enfantsListe = mesEnfants;
  const enfantClasse = enfant ? classes.find((c: any) => c.id === enfant.classeActuelleId) : null;
  const enfantBulletins = enfant ? bulletins.filter((b: any) => b.eleveId === enfant.id && b.statut === 'publie') : [];
  const enfantEcheances = enfant ? echeances.filter((e: any) => e.eleveId === enfant.id) : [];
  const enfantPaiements = enfant ? paiements.filter((p: any) => p.eleveId === enfant.id) : [];
  const enfantRdvs = enfant ? rdvs.filter((r: any) => r.eleveId === enfant.id) : [];

  const totalDu = enfantEcheances.filter((e: any) => e.statut !== 'payee').reduce((s: number, e: any) => s + (e.montant - e.montantPaye), 0);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Portail Parent"
        subtitle={enfant ? `Vous suivez ${enfant.prenom} ${enfant.nom} · ${enfantClasse?.libelle ?? '—'}` : 'Aucun enfant associé'}
      />

      {enfantsListe.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {enfantsListe.map((e: any) => (
            <Button key={e.id} variant="outline" size="sm" className={enfant?.id === e.id ? 'border-emerald-400 bg-emerald-50' : ''} onClick={() => setEnfantActifId(e.id)}>
              {e.prenom} {e.nom}
            </Button>
          ))}
        </div>
      )}

      {enfant && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard title="Échéances dues" value={formatMontant(totalDu, 'XOF')} sub={`${enfantEcheances.filter((e: any) => e.statut !== 'payee').length} échéance(s)`} icon={Wallet} color="rose" />
          <StatCard title="Bulletins reçus" value={enfantBulletins.length} icon={BookOpen} color="emerald" />
          <StatCard title="RDV à venir" value={enfantRdvs.length} icon={CalendarDays} color="blue" />
          <StatCard title="Notifications" value={notifications.length} icon={Bell} color="amber" />
        </div>
      )}

      <div className="space-y-6">
        {/* Bloc enfant */}
        <SectionBlock title={enfant ? `Mon enfant — ${enfant.prenom} ${enfant.nom}` : 'Mon enfant'}>
          {enfant ? (
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm space-y-1">
                  <div><span className="text-gray-500">Matricule :</span> <span className="font-medium">{enfant.matricule}</span></div>
                  <div><span className="text-gray-500">Classe :</span> <span className="font-medium">{enfantClasse?.libelle}</span></div>
                  <div><span className="text-gray-500">Statut :</span> <StatusBadge statut={enfant.statut} /></div>
                </div>
              </div>
              <div className="text-sm">
                <h4 className="font-medium mb-1">Dernier bulletin</h4>
                {enfantBulletins.length === 0 ? (
                  <p className="text-gray-500 text-xs">Aucun bulletin publié</p>
                ) : (
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Moyenne générale</span>
                      <span className="font-bold text-lg">{enfantBulletins[0].moyenneGenerale}/20</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : <EmptyState title="Aucun enfant associé à votre compte" />}
        </SectionBlock>

        {/* Échéances à payer + bouton encaissement */}
        <SectionBlock
          title="Échéances à régler"
          description="Suivi des paiements attendus pour votre enfant"
        >
          <DataTable
            columns={[
              { key: 'frais', label: 'Libellé', render: (e) => e.frais?.libelle ?? '—' },
              { key: 'montant', label: 'Attendu', render: (e) => formatMontant(e.montant, e.devise) },
              { key: 'montantPaye', label: 'Payé', render: (e) => formatMontant(e.montantPaye, e.devise) },
              { key: 'restant', label: 'Restant', render: (e) => formatMontant(e.montant - e.montantPaye, e.devise) },
              { key: 'dateEcheance', label: 'Échéance', render: (e) => formatDate(e.dateEcheance) },
              { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
            ]}
            rows={enfantEcheances}
            emptyLabel="Aucune échéance en attente"
          />
        </SectionBlock>

        {/* RDV à venir */}
        <SectionBlock
          title="Rendez-vous avec les enseignants"
          description="Vos RDV à venir"
        >
          <DataTable
            columns={[
              { key: 'personnel', label: 'Enseignant', render: (r) => { const c = creneaux.find((x: any) => x.id === r.creneauRdvId); const p = c ? personnels.find((y: any) => y.id === c.personnelId) : null; return p ? `${p.prenom} ${p.nom}` : '—'; } },
              { key: 'date', label: 'Date', render: (r) => { const c = creneaux.find((x: any) => x.id === r.creneauRdvId); return c ? formatDate(c.date) : '—'; } },
              { key: 'heure', label: 'Heure', render: (r) => { const c = creneaux.find((x: any) => x.id === r.creneauRdvId); return c ? `${c.heureDebut}-${c.heureFin}` : '—'; } },
              { key: 'motif', label: 'Motif' },
              { key: 'statut', label: 'Statut', render: (r) => <StatusBadge statut={r.statut} /> },
            ]}
            rows={enfantRdvs}
            emptyLabel="Aucun RDV à venir"
          />
        </SectionBlock>

        {/* Notifications */}
        <SectionBlock title="Mes notifications">
          <div className="space-y-2">
            {notifications.length === 0 && <p className="text-sm text-gray-500">Aucune notification</p>}
            {notifications.slice(0, 8).map((n: any) => (
              <div key={n.id} className="p-2 border border-gray-200 rounded bg-white">
                <div className="text-sm font-medium">{n.sujet}</div>
                <div className="text-xs text-gray-600">{n.corps}</div>
                <div className="text-[10px] text-gray-400 mt-1">{formatDateTime(n.dateEnvoi)}</div>
              </div>
            ))}
          </div>
        </SectionBlock>
      </div>
    </div>
  );
}
