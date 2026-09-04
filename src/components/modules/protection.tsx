'use client';

// ====================================================================
// Module Protection de l'enfance (B8) & Plans d'accompagnement (B9).
// Données SENSIBLES : présentation sobre, confidentialité rappelée,
// description jamais affichée en entier dans les listes (tronquée à
// 60 caractères, détail complet uniquement dans la fiche au clic).
// ====================================================================

import { useState } from 'react';
import { ShieldAlert, Inbox, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader, StatCard, DataTable, ModalForm, CreateButton, SectionBlock, InfoRow, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import * as ext from '@/app/actions/extensions';
import { formatDate, formatDateTime } from '@/lib/format';

type RunFn = ReturnType<typeof useActionFeedback>['run'];

// --------------------------------------------------------------------
// Libellés métier
// --------------------------------------------------------------------

const TYPES_SIGNALEMENT: Record<string, string> = {
  harcelement: 'Harcèlement',
  maltraitance: 'Maltraitance',
  fgm: 'MGF / excision',
  radicalisation: 'Radicalisation',
  abus: 'Abus',
  lautre: 'Autre',
};

const SOURCES: Record<string, string> = {
  enseignant: 'Enseignant',
  parent: 'Parent',
  eleve: 'Élève',
  tiers: 'Tiers',
  anonyme: 'Anonyme',
};

const GRAVITES: Record<string, { label: string; classe: string }> = {
  information: { label: 'Information', classe: 'bg-gray-100 text-gray-700 border-gray-200' },
  preoccupant: { label: 'Préoccupant', classe: 'bg-amber-100 text-amber-700 border-amber-200' },
  grave: { label: 'Grave', classe: 'bg-orange-100 text-orange-700 border-orange-200' },
  urgent: { label: 'Urgent', classe: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const STATUTS_SIGNALEMENT: Record<string, { label: string; classe: string }> = {
  recu: { label: 'Reçu', classe: 'bg-amber-100 text-amber-700 border-amber-200' },
  en_cours: { label: 'En cours', classe: 'bg-blue-100 text-blue-700 border-blue-200' },
  transmis_externe: { label: 'Transmis (externe)', classe: 'bg-purple-100 text-purple-700 border-purple-200' },
  traite: { label: 'Traité', classe: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  classe_sans_suite: { label: 'Classé sans suite', classe: 'bg-gray-200 text-gray-700 border-gray-300' },
};

const CONFIDENTIALITE: Record<string, { label: string; classe: string }> = {
  public: { label: 'Interne élargi', classe: 'bg-gray-100 text-gray-700 border-gray-200' },
  equipe_dir: { label: 'Équipe de direction', classe: 'bg-amber-100 text-amber-700 border-amber-200' },
  restreint: { label: 'Restreint', classe: 'bg-gray-100 text-gray-700 border-gray-200' },
  confidentiel: { label: 'Confidentiel', classe: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const TYPES_MESURE: Record<string, string> = {
  signalement_au_parquet: 'Signalement au parquet',
  accompagnement_psychologique: 'Accompagnement psychologique',
  mesure_de_securite: 'Mesure de sécurité',
  reorientation: 'Réorientation',
  saisine_ase: 'Saisine ASE',
};

const TYPES_PLAN: Record<string, string> = {
  PPS: 'PPS — Projet personnalisé de scolarisation (handicap)',
  PAP: 'PAP — Plan d\'accompagnement personnalisé (troubles des apprentissages)',
  PAI: 'PAI — Projet d\'accueil individualisé (maladie chronique)',
  PAPSI: 'PAPSI — Plan d\'accompagnement personnalisé et spécialisé',
};

const STATUTS_PLAN: Record<string, { label: string; classe: string }> = {
  actif: { label: 'Actif', classe: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  en_revision: { label: 'En révision', classe: 'bg-amber-100 text-amber-700 border-amber-200' },
  suspendu: { label: 'Suspendu', classe: 'bg-rose-100 text-rose-700 border-rose-200' },
  clos: { label: 'Clos', classe: 'bg-gray-200 text-gray-700 border-gray-300' },
};

const DOMAINES: Record<string, string> = {
  scolaire: 'Scolaire',
  social: 'Social',
  comportemental: 'Comportemental',
  therapeutique: 'Thérapeutique',
};

const ROLES_MEMBRE: Record<string, string> = {
  referent: 'Référent',
  enseignant: 'Enseignant',
  orthophoniste: 'Orthophoniste',
  psychologue: 'Psychologue',
  ergotherapeute: 'Ergothérapeute',
  parent: 'Parent',
  medecin: 'Médecin',
  avs: 'AVS',
};

function BadgeMetier({ valeur, map }: { valeur: string; map: Record<string, { label: string; classe: string }> }) {
  const s = map[valeur] ?? { label: valeur, classe: 'bg-gray-100 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={`text-xs ${s.classe}`}>{s.label}</Badge>;
}

/** Troncature stricte des descriptions en liste — jamais le texte complet. */
function tronquer(texte: string | null | undefined, limite = 60): string {
  if (!texte) return '—';
  return texte.length > limite ? `${texte.slice(0, limite).trimEnd()}…` : texte;
}

// --------------------------------------------------------------------
// Fiche signalement — détail complet, suivi, mesures, statuts, CRIP
// --------------------------------------------------------------------

function DetailSignalement({ s, eleves, run, pending }: { s: any; eleves: any[]; run: RunFn; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const eleve = eleves.find((e: any) => e.id === s.eleveId);
  const suivis = s.suivis ?? [];
  const mesures = s.mesures ?? [];

  const changerStatut = (statut: string, succes: string) =>
    run(() => ext.majStatutSignalement(s.id, statut), succes);
  const transmettreCrip = () =>
    run(() => ext.majStatutSignalement(s.id, 'transmis_externe', true), 'Signalement transmis au CRIP');
  const enregistrerNote = () => {
    if (!note.trim()) return;
    run(() => ext.ajouterSuiviSignalement(s.id, note.trim()), 'Note de suivi enregistrée');
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Consulter</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Signalement — {TYPES_SIGNALEMENT[s.type] ?? s.type}
            <span className="ml-2 text-sm font-normal text-gray-500">{formatDate(s.dateSignalement)}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <BadgeMetier valeur={s.gravite} map={GRAVITES} />
            <BadgeMetier valeur={s.statut} map={STATUTS_SIGNALEMENT} />
            <BadgeMetier valeur={s.confidentialiteNiveau} map={CONFIDENTIALITE} />
            {s.transfertCrip && (
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                Transmis CRIP{s.dateTransfertCrip ? ` · ${formatDate(s.dateTransfertCrip)}` : ''}
              </Badge>
            )}
          </div>

          <dl className="space-y-1">
            <InfoRow label="Élève concerné" value={eleve ? `${eleve.prenom} ${eleve.nom}` : 'Non précisé'} />
            <InfoRow label="Source" value={SOURCES[s.source] ?? s.source} />
            <InfoRow label="Date des faits" value={s.dateFaits ? formatDate(s.dateFaits) : '—'} />
            <InfoRow label="Lieu des faits" value={s.lieuFaits ?? '—'} />
            <InfoRow label="Signalé le" value={formatDateTime(s.dateSignalement)} />
          </dl>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">Description des faits</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-md bg-gray-50 border border-gray-100 px-3 py-2">{s.description}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Mesures de protection ({mesures.length})</h4>
              <ModalForm
                trigger={<Button size="sm" variant="outline">Ajouter une mesure</Button>}
                title="Ajouter une mesure de protection"
                fields={[
                  { name: 'signalementId', type: 'hidden', label: 'Signalement', defaultValue: s.id },
                  { name: 'type', label: 'Type de mesure', type: 'select', options: Object.entries(TYPES_MESURE).map(([value, label]) => ({ value, label })), required: true },
                  { name: 'description', label: 'Description', type: 'textarea', required: true },
                ]}
                action={ext.ajouterMesureProtection}
              />
            </div>
            {mesures.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune mesure enregistrée.</p>
            ) : (
              <ul className="space-y-2">
                {mesures.map((m: any) => (
                  <li key={m.id} className="rounded-md border border-gray-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{TYPES_MESURE[m.type] ?? m.type}</span>
                      <span className="text-xs text-gray-500">{formatDate(m.dateDecision)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{m.description}</p>
                    {m.decideePar && <p className="text-xs text-gray-400 mt-0.5">Décidée par : {m.decideePar}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Suivi du dossier ({suivis.length})</h4>
            {suivis.length === 0 ? (
              <p className="text-sm text-gray-500 mb-2">Aucun suivi enregistré.</p>
            ) : (
              <ul className="space-y-2 mb-2">
                {suivis.map((sv: any) => (
                  <li key={sv.id} className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
                    <span className="text-xs text-gray-500">{formatDateTime(sv.date)}</span>
                    <p className="text-sm text-gray-700">{sv.note}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`note-suivi-${s.id}`} className="text-xs font-medium text-gray-700">Ajouter une note de suivi</Label>
              <Textarea
                id={`note-suivi-${s.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Compte-rendu d'entretien, action menée, contact avec la famille…"
              />
              <Button size="sm" disabled={pending || !note.trim()} onClick={enregistrerNote} className="bg-emerald-600 hover:bg-emerald-700">
                Enregistrer le suivi
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Faire évoluer le statut</h4>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => changerStatut('en_cours', 'Dossier pris en charge')}>Prendre en charge</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => changerStatut('traite', 'Dossier marqué traité')}>Marquer traité</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => changerStatut('classe_sans_suite', 'Dossier classé sans suite')}>Classer sans suite</Button>
              {!s.transfertCrip && (
                <Button size="sm" variant="outline" className="text-purple-700 hover:text-purple-800" disabled={pending} onClick={transmettreCrip}>
                  Transmettre au CRIP
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------------
// Fiche plan d'accompagnement — objectifs cochables, révisions
// --------------------------------------------------------------------

function DetailPlan({ p, run, pending }: { p: any; run: RunFn; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const objectifs = p.objectifs ?? [];
  const revisions = p.revisions ?? [];
  const membres = p.membres ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Consulter</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {TYPES_PLAN[p.type] ?? p.type}
            <span className="ml-2 text-sm font-normal text-gray-500">
              {p.eleve ? `${p.eleve.prenom} ${p.eleve.nom}` : '—'}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <dl className="space-y-1">
            <InfoRow label="Statut" value={<BadgeMetier valeur={p.statut} map={STATUTS_PLAN} />} />
            <InfoRow label="Période" value={`du ${formatDate(p.dateDebut)}${p.dateFin ? ` au ${formatDate(p.dateFin)}` : ' — en cours'}`} />
            <InfoRow label="Équipe éducative" value={membres.length > 0 ? membres.map((m: any) => ROLES_MEMBRE[m.role] ?? m.role).join(', ') : '—'} />
            <InfoRow label="Diagnostic" value={p.diagnostic ?? '—'} />
            <InfoRow label="Objectifs généraux" value={p.objectifsGeneraux ?? '—'} />
          </dl>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">
                Objectifs ({objectifs.filter((o: any) => o.atteint).length}/{objectifs.length} atteints)
              </h4>
              <ModalForm
                trigger={<Button size="sm" variant="outline">Ajouter un objectif</Button>}
                title="Ajouter un objectif au plan"
                fields={[
                  { name: 'planId', type: 'hidden', label: 'Plan', defaultValue: p.id },
                  { name: 'description', label: 'Description de l\'objectif', type: 'textarea', required: true },
                  { name: 'domaine', label: 'Domaine', type: 'select', options: Object.entries(DOMAINES).map(([value, label]) => ({ value, label })), required: true },
                  { name: 'echeance', label: 'Échéance', type: 'date' },
                ]}
                action={ext.ajouterObjectifPlan}
              />
            </div>
            {objectifs.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun objectif défini.</p>
            ) : (
              <ul className="space-y-2">
                {objectifs.map((o: any) => (
                  <li key={o.id} className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2">
                    <Checkbox
                      className="mt-0.5"
                      checked={o.atteint}
                      disabled={pending}
                      onCheckedChange={(v) =>
                        run(() => ext.majObjectifPlan(o.id, v === true), v === true ? 'Objectif marqué atteint' : 'Objectif rouvert')
                      }
                      aria-label={o.atteint ? `Objectif atteint : ${o.description}` : `Objectif non atteint : ${o.description}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${o.atteint ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{o.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {DOMAINES[o.domaine] ?? o.domaine}
                        {o.echeance ? ` · échéance ${formatDate(o.echeance)}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Révisions du plan ({revisions.length})</h4>
              <ModalForm
                trigger={<Button size="sm" variant="outline">Ajouter une révision</Button>}
                title="Ajouter une révision au plan"
                fields={[
                  { name: 'planId', type: 'hidden', label: 'Plan', defaultValue: p.id },
                  { name: 'motif', label: 'Motif de la révision', required: true, placeholder: 'Bilan trimestriel, évolution du diagnostic…' },
                  { name: 'constats', label: 'Constats', type: 'textarea', required: true },
                  { name: 'ajustements', label: 'Ajustements apportés', type: 'textarea' },
                ]}
                action={ext.ajouterRevisionPlan}
              />
            </div>
            {revisions.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune révision enregistrée.</p>
            ) : (
              <ul className="space-y-2">
                {revisions.map((r: any) => (
                  <li key={r.id} className="rounded-md border border-gray-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{r.motif}</span>
                      <span className="text-xs text-gray-500">{formatDate(r.date)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5"><span className="text-gray-500">Constats :</span> {r.constats}</p>
                    {r.ajustements && <p className="text-sm text-gray-600 mt-0.5"><span className="text-gray-500">Ajustements :</span> {r.ajustements}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------------
// Module
// --------------------------------------------------------------------

export default function ProtectionModule({ initialData }: { initialData: any }) {
  const signalements = initialData.signalementsMineurs ?? [];
  const plans = initialData.plansAccompagnement ?? [];
  const eleves = initialData.eleves ?? [];
  const { run, Message, pending } = useActionFeedback();

  const kpi = {
    recus: signalements.filter((s: any) => s.statut === 'recu').length,
    enCours: signalements.filter((s: any) => s.statut === 'en_cours' || s.statut === 'transmis_externe').length,
    traites: signalements.filter((s: any) => s.statut === 'traite' || s.statut === 'classe_sans_suite').length,
    graves: signalements.filter((s: any) => s.gravite === 'grave' || s.gravite === 'urgent').length,
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Protection de l'enfance"
        subtitle="Recueil et traitement des informations préoccupantes — accès restreint aux personnels habilités"
        actions={
          <ModalForm
            trigger={<CreateButton label="Nouveau signalement" />}
            title="Enregistrer un signalement"
            fields={[
              { name: 'eleveId', label: 'Élève concerné', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })) },
              { name: 'type', label: 'Type de faits', type: 'select', options: Object.entries(TYPES_SIGNALEMENT).map(([value, label]) => ({ value, label })), required: true },
              { name: 'gravite', label: 'Gravité', type: 'select', options: Object.entries(GRAVITES).map(([value, g]) => ({ value, label: g.label })), required: true },
              { name: 'source', label: 'Source du signalement', type: 'select', options: Object.entries(SOURCES).map(([value, label]) => ({ value, label })), required: true },
              { name: 'description', label: 'Description factuelle des faits', type: 'textarea', required: true },
              { name: 'dateFaits', label: 'Date des faits', type: 'date' },
              { name: 'lieuFaits', label: 'Lieu des faits' },
            ]}
            action={ext.creerSignalement}
          />
        }
      />

      {/* Avertissement de confidentialité — en tête du module */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800" role="alert">
        <div className="flex items-start gap-2">
          <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Informations préoccupantes — données sensibles et confidentielles</p>
            <p className="text-xs mt-0.5">
              Accès restreint aux personnels habilités uniquement. Chaque enregistrement, consultation et action sur ces
              dossiers est journalisé (traçabilité). La création d&apos;un signalement engage la responsabilité de
              l&apos;établissement : décrivez les faits avec précision et objectivité, sans divulgation en dehors du cadre légal.
            </p>
          </div>
        </div>
      </div>

      {Message}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="À traiter (reçus)" value={kpi.recus} icon={Inbox} color="amber" />
        <StatCard title="En cours" value={kpi.enCours} sub="incl. transmis à un partenaire" icon={Clock} color="blue" />
        <StatCard title="Traités" value={kpi.traites} icon={CheckCircle2} color="emerald" />
        <StatCard title="Graves ou urgents" value={kpi.graves} sub="tous statuts confondus" icon={AlertTriangle} color="rose" />
      </div>

      <SectionBlock
        title="Signalements"
        description="Le détail complet d'un dossier n'est visible qu'en consultant la fiche (clic « Consulter »)"
      >
        <DataTable
          columns={[
            { key: 'dateSignalement', label: 'Signalé le', render: (s) => formatDate(s.dateSignalement) },
            { key: 'type', label: 'Type', render: (s) => <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-200">{TYPES_SIGNALEMENT[s.type] ?? s.type}</Badge> },
            { key: 'gravite', label: 'Gravité', render: (s) => <BadgeMetier valeur={s.gravite} map={GRAVITES} /> },
            { key: 'source', label: 'Source', render: (s) => SOURCES[s.source] ?? s.source },
            { key: 'statut', label: 'Statut', render: (s) => <BadgeMetier valeur={s.statut} map={STATUTS_SIGNALEMENT} /> },
            { key: 'confidentialiteNiveau', label: 'Confidentialité', render: (s) => <BadgeMetier valeur={s.confidentialiteNiveau} map={CONFIDENTIALITE} /> },
            { key: 'resume', label: 'Résumé', render: (s) => <span className="text-xs text-gray-500">{tronquer(s.description, 60)}</span> },
            { key: 'detail', label: '', render: (s) => <DetailSignalement s={s} eleves={eleves} run={run} pending={pending} /> },
          ]}
          rows={signalements}
          emptyLabel="Aucun signalement enregistré"
        />
      </SectionBlock>

      <SectionBlock
        title="Plans d'accompagnement (PPS / PAP / PAI / PAPSI)"
        description="Plans individualisés : objectifs suivis par l'équipe éducative, révisions périodiques"
        action={
          <ModalForm
            trigger={<CreateButton label="Nouveau plan" />}
            title="Créer un plan d'accompagnement"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'type', label: 'Type de plan', type: 'select', options: Object.keys(TYPES_PLAN).map((value) => ({ value, label: TYPES_PLAN[value] })), required: true },
              { name: 'dateDebut', label: 'Date de début', type: 'date', required: true },
              { name: 'dateFin', label: 'Date de fin (si connue)', type: 'date' },
              { name: 'diagnostic', label: 'Diagnostic', type: 'textarea' },
              { name: 'objectifsGeneraux', label: 'Objectifs généraux', type: 'textarea' },
            ]}
            action={ext.creerPlanAccompagnement}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (p) => p.eleve ? <span className="font-medium">{p.eleve.prenom} {p.eleve.nom}</span> : '—' },
            { key: 'type', label: 'Type', render: (p) => <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">{p.type}</Badge> },
            { key: 'dateDebut', label: 'Début', render: (p) => formatDate(p.dateDebut) },
            { key: 'dateFin', label: 'Fin', render: (p) => p.dateFin ? formatDate(p.dateFin) : '—' },
            { key: 'statut', label: 'Statut', render: (p) => <BadgeMetier valeur={p.statut} map={STATUTS_PLAN} /> },
            {
              key: 'objectifs', label: 'Objectifs',
              render: (p) => {
                const total = p.objectifs?.length ?? 0;
                return total === 0 ? '—' : `${p.objectifs.filter((o: any) => o.atteint).length}/${total} atteints`;
              },
            },
            { key: 'detail', label: '', render: (p) => <DetailPlan p={p} run={run} pending={pending} /> },
          ]}
          rows={plans}
          emptyLabel="Aucun plan d'accompagnement"
        />
      </SectionBlock>
    </div>
  );
}
