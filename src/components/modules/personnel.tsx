'use client';

// ====================================================================
// Module Personnel & RH — liste, fiches, rôles, congés, remplacements,
// évaluations du personnel.
// ====================================================================

import { useState, useTransition } from 'react';
import { GraduationCap, Users, CalendarOff, FileText, Eye } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, InfoRow, EmptyState, ModalForm, CreateButton } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import * as actions from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatMontant, formatDate, initiales } from '@/lib/format';

export default function PersonnelModule({ initialData }: { initialData: any }) {
  const personnels = initialData.personnels ?? [];
  const roles = initialData.roles ?? [];
  const conges = initialData.conges ?? [];
  const remplacements = initialData.remplacements ?? [];
  const evaluationsRh = initialData.evaluationsRh ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(personnels[0]?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const personnel = personnels.find((p: any) => p.id === selectedId);
  const personnelConges = conges.filter((c: any) => c.personnelId === selectedId);
  const personnelRemplacements = remplacements.filter((r: any) => r.personnelAbsentId === selectedId);
  const personnelEvals = evaluationsRh.filter((e: any) => e.personnelId === selectedId);

  const rolesParPersonnel = (pid: string) => roles.filter((r: any) => r.ecoleId !== null && personnels.find((p: any) => p.id === pid)?.utilisateurId);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Personnel & RH"
        subtitle={`${personnels.length} personnels · ${conges.length} demandes de congé · ${evaluationsRh.length} évaluations RH`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Personnels actifs" value={personnels.filter((p: any) => p.statut === 'actif').length} icon={Users} color="emerald" />
        <StatCard title="Congés en cours" value={personnelConges.filter((c: any) => c.statut === 'demande' || c.statut === 'valide').length} icon={CalendarOff} color="amber" />
        <StatCard title="Remplacements" value={remplacements.length} icon={FileText} color="blue" />
        <StatCard title="Évaluations RH" value={evaluationsRh.length} icon={GraduationCap} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <SectionBlock title="Liste du personnel">
            <div className="max-h-[60vh] overflow-y-auto -mx-2">
              {personnels.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm hover:bg-gray-50 ${selectedId === p.id ? 'bg-emerald-50 border border-emerald-200' : ''}`}
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {initiales(p.nom, p.prenom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.prenom} {p.nom}</div>
                    <div className="text-xs text-gray-500">{p.matricule} · {p.typeContrat ?? '—'}</div>
                  </div>
                  <StatusBadge statut={p.statut} />
                </button>
              ))}
            </div>
          </SectionBlock>
        </div>

        <div className="lg:col-span-2">
          {personnel ? (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{personnel.prenom} {personnel.nom}</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <Card><CardContent className="p-4">
                    <dl className="space-y-1">
                      <InfoRow label="Matricule" value={personnel.matricule} />
                      <InfoRow label="Email" value={personnel.email} />
                      <InfoRow label="Téléphone" value={personnel.telephone} />
                      <InfoRow label="Date d'embauche" value={formatDate(personnel.dateEmbauche)} />
                      <InfoRow label="Type de contrat" value={personnel.typeContrat} />
                      <InfoRow label="Salaire brut" value={formatMontant(personnel.salaireBrut, 'XOF')} />
                      <InfoRow label="Diplôme principal" value={personnel.diplomePrincipal} />
                      <InfoRow label="Statut" value={<StatusBadge statut={personnel.statut} />} />
                    </dl>
                  </CardContent></Card>

                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Congés</CardTitle></CardHeader><CardContent>
                    {personnelConges.length === 0 ? <p className="text-sm text-gray-500">Aucun congé</p> : (
                      <DataTable
                        columns={[
                          { key: 'type', label: 'Type' },
                          { key: 'dateDebut', label: 'Du', render: (c) => formatDate(c.dateDebut) },
                          { key: 'dateFin', label: 'Au', render: (c) => formatDate(c.dateFin) },
                          { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} /> },
                        ]}
                        rows={personnelConges}
                      />
                    )}
                  </CardContent></Card>

                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Évaluations RH</CardTitle></CardHeader><CardContent>
                    {personnelEvals.length === 0 ? <p className="text-sm text-gray-500">Aucune évaluation enregistrée</p> : (
                      <DataTable
                        columns={[
                          { key: 'periode', label: 'Période' },
                          { key: 'commentaireGlobal', label: 'Commentaire' },
                          { key: 'dateEvaluation', label: 'Date', render: (e) => formatDate(e.dateEvaluation) },
                        ]}
                        rows={personnelEvals}
                      />
                    )}
                  </CardContent></Card>
                </div>
              </SheetContent>
            </Sheet>
          ) : null}

          <SectionBlock title={personnel ? `Fiche personnel — ${personnel.prenom} ${personnel.nom}` : 'Sélectionnez un personnel'}>
            {personnel ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Embauche</div><div className="text-sm font-medium">{formatDate(personnel.dateEmbauche)}</div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Contrat</div><div className="text-sm font-medium">{personnel.typeContrat ?? '—'}</div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Salaire</div><div className="text-sm font-medium">{formatMontant(personnel.salaireBrut, 'XOF')}</div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Statut</div><StatusBadge statut={personnel.statut} /></CardContent></Card>
                </div>
                <button className="text-sm text-emerald-700 hover:underline" onClick={() => setSheetOpen(true)}>Voir la fiche complète →</button>
              </div>
            ) : <EmptyState title="Aucun personnel sélectionné" />}
          </SectionBlock>

        <div className="lg:col-span-3">
          <SectionBlock
            title="Workflow congés & remplacements (RH)"
            description="Demande → validation/refus direction → planification du remplacement (contrôles de chevauchement automatiques)"
            action={
              <ModalForm
                trigger={<CreateButton label="Demande de congé" />}
                title="Enregistrer une demande de congé"
                fields={[
                  { name: 'personnelId', label: 'Personnel', type: 'select', options: personnels.map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })), required: true },
                  { name: 'type', label: 'Type', type: 'select', options: [
                    { value: 'annuel', label: 'Congé annuel' },
                    { value: 'maladie', label: 'Maladie' },
                    { value: 'maternite', label: 'Maternité' },
                    { value: 'exceptionnel', label: 'Exceptionnel' },
                  ], required: true },
                  { name: 'dateDebut', label: 'Du', type: 'date', required: true },
                  { name: 'dateFin', label: 'Au', type: 'date', required: true },
                  { name: 'motif', label: 'Motif', type: 'textarea' },
                ]}
                action={actions.demanderConge}
              />
            }
          >
            <DataTable
              columns={[
                { key: 'personnel', label: 'Personnel', render: (c) => { const p = personnels.find((x: any) => x.id === c.personnelId); return p ? `${p.prenom} ${p.nom}` : '—'; } },
                { key: 'type', label: 'Type' },
                { key: 'dateDebut', label: 'Du', render: (c) => formatDate(c.dateDebut) },
                { key: 'dateFin', label: 'Au', render: (c) => formatDate(c.dateFin) },
                { key: 'motif', label: 'Motif' },
                { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} /> },
                {
                  key: 'actions', label: 'Actions', render: (c) => c.statut === 'demande' ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => { await actions.traiterConge(c.id, 'valide'); })}>Valider</Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => { await actions.traiterConge(c.id, 'refuse'); })}>Refuser</Button>
                    </div>
                  ) : c.statut === 'valide' ? (
                    <ModalForm
                      trigger={<Button size="sm" variant="outline">Remplacement</Button>}
                      title="Planifier le remplacement"
                      fields={[
                        { name: 'congeId', type: 'hidden', label: 'Congé', defaultValue: c.id },
                        { name: 'personnelRemplacantId', label: 'Remplaçant', type: 'select', options: personnels.filter((p: any) => p.id !== c.personnelId && p.statut === 'actif').map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })), required: true },
                        { name: 'dateDebut', label: 'Du', type: 'date', defaultValue: c.dateDebut?.toISOString().slice(0, 10), required: true },
                        { name: 'dateFin', label: 'Au', type: 'date', defaultValue: c.dateFin?.toISOString().slice(0, 10), required: true },
                      ]}
                      action={actions.assignerRemplacement}
                    />
                  ) : null,
                },
              ]}
              rows={conges}
              emptyLabel="Aucune demande de congé"
            />
          </SectionBlock>

          <SectionBlock title="Remplacements planifiés" description="Personnel absent → remplaçant affecté">
            <DataTable
              columns={[
                { key: 'absent', label: 'Absent', render: (r) => { const p = personnels.find((x: any) => x.id === r.personnelAbsentId); return p ? `${p.prenom} ${p.nom}` : '—'; } },
                { key: 'remplacant', label: 'Remplaçant', render: (r) => { const p = personnels.find((x: any) => x.id === r.personnelRemplacantId); return p ? `${p.prenom} ${p.nom}` : '—'; } },
                { key: 'dateDebut', label: 'Du', render: (r) => formatDate(r.dateDebut) },
                { key: 'dateFin', label: 'Au', render: (r) => formatDate(r.dateFin) },
                { key: 'statut', label: 'Statut', render: (r) => <StatusBadge statut={r.statut} /> },
              ]}
              rows={remplacements}
              emptyLabel="Aucun remplacement planifié"
            />
          </SectionBlock>
        </div>
        </div>
      </div>
    </div>
  );
}
