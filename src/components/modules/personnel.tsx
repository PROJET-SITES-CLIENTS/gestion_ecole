'use client';

// ====================================================================
// Module Personnel & RH — liste, fiches, rôles, congés, remplacements,
// évaluations du personnel.
// ====================================================================

import { useState } from 'react';
import { GraduationCap, Users, CalendarOff, FileText, Banknote, CalendarClock, Briefcase, UserPlus } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, InfoRow, EmptyState, ModalForm, CreateButton, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import * as actions from '@/app/actions';
import * as actionsExt from '@/app/actions/extensions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatXOF, formatDate, initiales } from '@/lib/format';

export default function PersonnelModule({ initialData }: { initialData: any }) {
  const personnels = initialData.personnels ?? [];
  const roles = initialData.roles ?? [];
  const conges = initialData.conges ?? [];
  const remplacements = initialData.remplacements ?? [];
  const evaluationsRh = initialData.evaluationsRh ?? [];
  const bulletinsPaie = initialData.bulletinsPaie ?? [];
  const soldesConge = initialData.soldesConge ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(personnels[0]?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { run, Message, pending } = useActionFeedback();

  // B1 — PAIE : génération mensuelle + workflow brouillon → validé → payé
  const moisCourant = new Date().toISOString().slice(0, 7);
  const [moisPaie, setMoisPaie] = useState(moisCourant);
  const [detailGeneration, setDetailGeneration] = useState<string | null>(null);
  const portal = initialData.session?.portal;
  const estDirection = portal === 'direction' || portal === 'super_admin';

  const personnel = personnels.find((p: any) => p.id === selectedId);
  const personnelConges = conges.filter((c: any) => c.personnelId === selectedId);
  const personnelRemplacements = remplacements.filter((r: any) => r.personnelAbsentId === selectedId);
  const personnelEvals = evaluationsRh.filter((e: any) => e.personnelId === selectedId);

  // KPI paie : dernière période présente en base
  const dernierePeriode = bulletinsPaie.reduce((max: string | null, b: any) => (!max || (b.periode ?? '') > max ? b.periode : max), null as string | null);
  const bulletinsDernierePeriode = bulletinsPaie.filter((b: any) => b.periode === dernierePeriode);
  const totalNetDernierePeriode = bulletinsDernierePeriode.reduce((s: number, b: any) => s + (b.netAPayer ?? 0), 0);

  // Soldes de congés : le plus récent par personnel (jours restants / droits acquis)
  const soldeParPersonnel = new Map<string, any>();
  soldesConge.forEach((s: any) => {
    const courant = soldeParPersonnel.get(s.personnelId);
    if (!courant || (s.annee ?? '') > (courant.annee ?? '')) soldeParPersonnel.set(s.personnelId, s);
  });
  const afficheSoldes = soldesConge.length > 0;
  const totalJoursRestants = soldesConge.reduce((s: number, x: any) => s + (x.joursRestants ?? 0), 0);

  function genererBulletins() {
    setDetailGeneration(null);
    run(async () => {
      const r: any = await actionsExt.genererBulletinsPaie(moisPaie);
      if (r?.ok) {
        setDetailGeneration(`${r.bulletins} bulletin(s) généré(s) · ${r.sautes} déjà existant(s) ignoré(s) · net total ${formatXOF(r.totalNet)}`);
      }
      return r;
    }, 'Génération de la paie terminée');
  }

  const rolesParPersonnel = (pid: string) => roles.filter((r: any) => r.ecoleId !== null && personnels.find((p: any) => p.id === pid)?.utilisateurId);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Personnel & RH"
        subtitle={`${personnels.length} personnels · ${conges.length} demandes de congé · ${evaluationsRh.length} évaluations RH`}
        actions={
          <ModalForm
            trigger={<CreateButton label="Nouveau personnel" />}
            title="Créer un personnel"
            fields={[
              { name: 'nom', label: 'Nom', required: true },
              { name: 'prenom', label: 'Prénom', required: true },
              { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'prenom.nom@ecole.com' },
              { name: 'telephone', label: 'Téléphone' },
              { name: 'dateEmbauche', label: 'Date d\'embauche', type: 'date', required: true },
              { name: 'typeContrat', label: 'Type de contrat', type: 'select', options: [
                { value: 'CDI', label: 'CDI' },
                { value: 'CDD', label: 'CDD' },
                { value: 'vacataire', label: 'Vacataire' },
                { value: 'stagiaire', label: 'Stagiaire' },
              ], required: true },
              { name: 'salaireBrut', label: 'Salaire brut (XOF)', type: 'number', required: true },
              { name: 'diplomePrincipal', label: 'Diplôme principal' },
              { name: 'creerCompte', label: 'Créer le compte utilisateur (accès au portail)', type: 'checkbox' },
              { name: 'motDePasseInitial', label: 'Mot de passe initial — minimum 8 caractères', type: 'text', placeholder: 'À communiquer au personnel (≥ 8 caractères)' },
            ]}
            action={actions.creerPersonnel}
          />
        }
      />

      <div className="mb-4">{Message}</div>

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
                  {afficheSoldes && (soldeParPersonnel.get(p.id) ? (
                    <span className="text-[11px] text-gray-500 flex-shrink-0" title="Congés — jours restants / droits acquis">
                      {Math.round(soldeParPersonnel.get(p.id).joursRestants ?? 0)}/{Math.round(soldeParPersonnel.get(p.id).droitsAcquis ?? 0)} j
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-300 flex-shrink-0" title="Aucun solde de congés enregistré">—</span>
                  ))}
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
                      <InfoRow label="Salaire brut" value={formatXOF(personnel.salaireBrut, 'XOF')} />
                      <InfoRow label="Diplôme principal" value={personnel.diplomePrincipal} />
                      {afficheSoldes && soldeParPersonnel.get(personnel.id) && (
                        <InfoRow
                          label="Solde de congés"
                          value={`${Math.round(soldeParPersonnel.get(personnel.id).joursRestants ?? 0)} j restants / ${Math.round(soldeParPersonnel.get(personnel.id).droitsAcquis ?? 0)} j acquis (${soldeParPersonnel.get(personnel.id).annee})`}
                        />
                      )}
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
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Salaire</div><div className="text-sm font-medium">{formatXOF(personnel.salaireBrut, 'XOF')}</div></CardContent></Card>
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
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => actions.traiterConge(c.id, 'valide'), 'Congé validé')}>Valider</Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => actions.traiterConge(c.id, 'refuse'), 'Congé refusé')}>Refuser</Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => actions.annulerConge(c.id), 'Demande annulée')}>Annuler</Button>
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

          {/* B1 — PAIE : génération mensuelle, variables, workflow brouillon → validé → payé */}
          <SectionBlock
            title="Paie"
            description="Génération mensuelle des bulletins (salaire de base + primes récurrentes + variables) — workflow brouillon → validé → payé"
            action={
              <ModalForm
                trigger={<CreateButton label="Ajouter une variable" />}
                title="Ajouter une variable de paie"
                fields={[
                  { name: 'personnelId', label: 'Personnel', type: 'select', options: personnels.map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })), required: true },
                  { name: 'periode', label: 'Période', type: 'month', defaultValue: moisCourant, required: true },
                  { name: 'type', label: 'Type', type: 'select', options: [
                    { value: 'prime', label: 'Prime' },
                    { value: 'indemnite', label: 'Indemnité' },
                    { value: 'avantage', label: 'Avantage en nature' },
                    { value: 'heure_sup', label: 'Heures supplémentaires' },
                  ], required: true },
                  { name: 'libelle', label: 'Libellé', required: true, placeholder: 'Prime de rendement, garde du soir…' },
                  { name: 'montant', label: 'Montant (XOF)', type: 'number', required: true },
                ]}
                action={actionsExt.ajouterVariablePaie}
              />
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <StatCard title="Bulletins de paie" value={bulletinsDernierePeriode.length} sub={dernierePeriode ? `dernière période : ${dernierePeriode}` : 'aucune paie générée'} icon={FileText} color="blue" />
              <StatCard title="Net à payer (total)" value={formatXOF(totalNetDernierePeriode)} sub={dernierePeriode ? `période ${dernierePeriode}` : undefined} icon={Banknote} color="emerald" />
              {afficheSoldes && (
                <StatCard title="Soldes de congés" value={`${Math.round(totalJoursRestants)} j`} sub={`${soldesConge.length} personnel(s) couvert(s)`} icon={CalendarClock} color="amber" />
              )}
            </div>

            <form className="flex flex-wrap items-end gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); genererBulletins(); }}>
              <div className="space-y-1.5">
                <label htmlFor="paie-mois" className="text-xs font-medium text-gray-700 block">Période</label>
                <Input id="paie-mois" type="month" value={moisPaie} onChange={(e) => setMoisPaie(e.target.value)} required className="w-44" />
              </div>
              <Button type="submit" disabled={pending} className="bg-emerald-600 hover:bg-emerald-700">
                {pending ? 'Génération…' : 'Générer les bulletins du mois'}
              </Button>
            </form>
            {detailGeneration && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 mb-4" role="status">
                {detailGeneration}
              </div>
            )}

            <DataTable
              columns={[
                { key: 'personnel', label: 'Personnel', render: (b) => { const p = personnels.find((x: any) => x.id === b.personnelId) ?? b.personnel; return p ? `${p.prenom} ${p.nom}` : '—'; } },
                { key: 'periode', label: 'Période' },
                { key: 'salaireBrut', label: 'Brut', render: (b) => formatXOF(b.salaireBrut, b.devise) },
                { key: 'cotisationsTotales', label: 'Cotisations', render: (b) => formatXOF(b.cotisationsTotales, b.devise) },
                { key: 'netAPayer', label: 'Net à payer', render: (b) => <span className="font-semibold">{formatXOF(b.netAPayer, b.devise)}</span> },
                { key: 'statut', label: 'Statut', render: (b) => b.statut === 'paye' ? <StatusBadge statut="payee" label="Payé" /> : b.statut === 'valide' ? <StatusBadge statut="confirme" label="Validé" /> : <StatusBadge statut="en_attente" label="Brouillon" /> },
                {
                  key: 'actions', label: 'Action', render: (b) => b.statut === 'brouillon' ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => actionsExt.traiterBulletinPaie(b.id, 'valide'), 'Bulletin validé')}>Valider</Button>
                  ) : b.statut === 'valide' ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => actionsExt.traiterBulletinPaie(b.id, 'paye'), 'Bulletin marqué payé')}>Marquer payé</Button>
                  ) : null,
                },
              ]}
              rows={bulletinsPaie}
              emptyLabel="Aucun bulletin — générez la paie du mois ci-dessus"
            />
          </SectionBlock>

          {estDirection && (
            <SectionBlock
              title="Configuration de la paie"
              description="Taux de cotisations sociales appliqués lors de la génération des bulletins"
              action={
                <ModalForm
                  trigger={<CreateButton label="Taux de cotisations" />}
                  title="Modifier la configuration de paie"
                  fields={[
                    { name: 'tauxEmployeur', label: 'Taux employeur (0 à 1)', type: 'number', step: '0.001', defaultValue: 0.084, required: true },
                    { name: 'tauxSalarie', label: 'Taux salarié (0 à 1)', type: 'number', step: '0.001', defaultValue: 0.0524, required: true },
                  ]}
                  action={actionsExt.majConfigurationPaie}
                />
              }
            >
              <p className="text-sm text-gray-500">
                Taux par défaut : <span className="font-medium text-gray-700">8,4 % employeur / 5,24 % salarié</span> (IPM/RC).
                Toute modification s'applique aux prochaines générations de bulletins — les bulletins déjà émis restent figés.
              </p>
            </SectionBlock>
          )}

          {/* B3 — RECRUTEMENT : offres, candidatures, conversion en personnel.
              Section présentée uniquement quand le dataset RH v4 est chargé
              (direction / super-admin) et contient des offres. */}
          {(initialData.offresEmploi?.length ?? 0) > 0 && (
            <SectionRecrutement initialData={initialData} run={run} pending={pending} />
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// B3 — RECRUTEMENT (suite) : sous-composants
// --------------------------------------------------------------------

const STATUTS_OFFRE: Record<string, { label: string; classe: string }> = {
  ouverte: { label: 'Ouverte', classe: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  fermee: { label: 'Fermée', classe: 'bg-gray-200 text-gray-700 border-gray-300' },
  pourvue: { label: 'Pourvue', classe: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const STATUTS_CANDIDATURE: Record<string, { label: string; classe: string }> = {
  recue: { label: 'Reçue', classe: 'bg-gray-100 text-gray-700 border-gray-200' },
  presel: { label: 'Présélectionnée', classe: 'bg-blue-100 text-blue-700 border-blue-200' },
  entretien: { label: 'Entretien', classe: 'bg-amber-100 text-amber-700 border-amber-200' },
  retenu: { label: 'Retenu', classe: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  refuse: { label: 'Refusée', classe: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const ETAPES_RECRUTEMENT = [
  { value: 'tri_cv', label: 'Tri CV' },
  { value: 'entretien_rh', label: 'Entretien RH' },
  { value: 'entretien_direction', label: 'Entretien direction' },
  { value: 'essai', label: 'Période d\'essai' },
  { value: 'decision', label: 'Décision' },
];

function BadgeRecrutement({ statut, map }: { statut: string; map: Record<string, { label: string; classe: string }> }) {
  const s = map[statut] ?? { label: statut, classe: 'bg-gray-100 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={`text-xs ${s.classe}`}>{s.label}</Badge>;
}

/** Avancement d'une candidature : choix de l'étape puis validation ou refus. */
function LigneAvancerCandidature({ candidatureId, etapeActuelle, run, pending }: {
  candidatureId: string;
  etapeActuelle?: string | null;
  run: ReturnType<typeof useActionFeedback>['run'];
  pending: boolean;
}) {
  const [etape, setEtape] = useState(etapeActuelle ?? 'tri_cv');
  return (
    <div className="flex flex-wrap items-center gap-1">
      <select
        value={etape}
        onChange={(e) => setEtape(e.target.value)}
        aria-label="Étape du recrutement"
        className="h-8 rounded-md border border-gray-200 bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {ETAPES_RECRUTEMENT.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
      </select>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => actionsExt.avancerCandidature(candidatureId, etape, 'valide'), 'Étape validée')}>Valider</Button>
      <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700" disabled={pending} onClick={() => run(() => actionsExt.avancerCandidature(candidatureId, etape, 'refuse'), 'Candidature refusée à cette étape')}>Refuser</Button>
    </div>
  );
}

function SectionRecrutement({ initialData, run, pending }: {
  initialData: any;
  run: ReturnType<typeof useActionFeedback>['run'];
  pending: boolean;
}) {
  const offres = initialData.offresEmploi ?? [];
  const candidatures = offres.flatMap((o: any) => (o.candidatures ?? []).map((c: any) => ({ ...c, offre: o })));
  const offresOuvertes = offres.filter((o: any) => o.statut === 'ouverte');

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard title="Offres ouvertes" value={offresOuvertes.length} sub={`${offres.length} offre(s) au total`} icon={Briefcase} color="emerald" />
        <StatCard title="Candidatures reçues" value={candidatures.length} sub={`${candidatures.filter((c: any) => c.statut === 'retenu').length} retenu(s)`} icon={UserPlus} color="blue" />
      </div>

      <SectionBlock
        title="Offres d'emploi"
        description="Publication des postes ouverts et suivi des candidatures associées"
        action={
          <ModalForm
            trigger={<CreateButton label="Nouvelle offre" />}
            title="Publier une offre d'emploi"
            fields={[
              { name: 'poste', label: 'Poste', required: true, placeholder: 'Professeur de mathématiques' },
              { name: 'description', label: 'Description du poste', type: 'textarea' },
              { name: 'profilRecherche', label: 'Profil recherché', type: 'textarea' },
              { name: 'typeContrat', label: 'Type de contrat', type: 'select', options: [
                { value: 'CDI', label: 'CDI' },
                { value: 'CDD', label: 'CDD' },
                { value: 'Stage', label: 'Stage' },
                { value: 'Vacataire', label: 'Vacataire' },
              ], required: true },
              { name: 'dateCloture', label: 'Date de clôture', type: 'date' },
            ]}
            action={actionsExt.creerOffre}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'poste', label: 'Poste', render: (o) => <span className="font-medium">{o.poste}</span> },
            { key: 'typeContrat', label: 'Contrat' },
            { key: 'dateOuverture', label: 'Ouverte le', render: (o) => formatDate(o.dateOuverture) },
            { key: 'dateCloture', label: 'Clôture', render: (o) => formatDate(o.dateCloture) },
            { key: 'statut', label: 'Statut', render: (o) => <BadgeRecrutement statut={o.statut} map={STATUTS_OFFRE} /> },
            { key: 'candidatures', label: 'Candidatures', render: (o) => o.candidatures?.length ?? 0 },
          ]}
          rows={offres}
          emptyLabel="Aucune offre d'emploi"
        />
      </SectionBlock>

      <SectionBlock
        title="Candidatures"
        description="Avancer chaque candidature étape par étape ; un candidat retenu peut être converti en personnel"
        action={
          offresOuvertes.length > 0 ? (
            <ModalForm
              trigger={<CreateButton label="Nouvelle candidature" />}
              title="Enregistrer une candidature"
              fields={[
                { name: 'offreId', label: 'Offre', type: 'select', options: offresOuvertes.map((o: any) => ({ value: o.id, label: `${o.poste} (${o.typeContrat})` })), required: true },
                { name: 'nom', label: 'Nom', required: true },
                { name: 'prenom', label: 'Prénom', required: true },
                { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'candidat@exemple.com' },
                { name: 'telephone', label: 'Téléphone' },
                { name: 'lettreMotivation', label: 'Lettre de motivation', type: 'textarea' },
              ]}
              action={actionsExt.creerCandidatureRecrutement}
            />
          ) : null
        }
      >
        <DataTable
          columns={[
            { key: 'offre', label: 'Offre', render: (c) => c.offre?.poste ?? '—' },
            { key: 'candidat', label: 'Candidat', render: (c) => <span className="font-medium">{c.prenom} {c.nom}</span> },
            { key: 'statut', label: 'Statut', render: (c) => <BadgeRecrutement statut={c.statut} map={STATUTS_CANDIDATURE} /> },
            { key: 'etapeActuelle', label: 'Étape', render: (c) => ETAPES_RECRUTEMENT.find((e) => e.value === c.etapeActuelle)?.label ?? '—' },
            { key: 'dateReception', label: 'Reçue le', render: (c) => formatDate(c.dateReception) },
            {
              key: 'actions', label: 'Actions', render: (c) => {
                if (c.statut === 'refuse') return <span className="text-xs text-gray-500">Refusée</span>;
                if (c.statut === 'retenu') {
                  return (
                    <div className="flex flex-col gap-1">
                      <ModalForm
                        trigger={<Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">Convertir en personnel</Button>}
                        title={`Conversion — ${c.prenom} ${c.nom}`}
                        fields={[
                          { name: 'candidatureId', type: 'hidden', label: 'Candidature', defaultValue: c.id },
                          { name: 'dateEmbauche', label: 'Date d\'embauche', type: 'date', required: true },
                          { name: 'salaireBrut', label: 'Salaire brut (XOF)', type: 'number', required: true },
                        ]}
                        action={actionsExt.convertirCandidat}
                      />
                      <LigneAvancerCandidature candidatureId={c.id} etapeActuelle={c.etapeActuelle} run={run} pending={pending} />
                    </div>
                  );
                }
                return <LigneAvancerCandidature candidatureId={c.id} etapeActuelle={c.etapeActuelle} run={run} pending={pending} />;
              },
            },
          ]}
          rows={candidatures}
          emptyLabel="Aucune candidature reçue"
        />
      </SectionBlock>
    </>
  );
}
