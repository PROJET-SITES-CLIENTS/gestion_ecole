'use client';

// ====================================================================
// Module Salles & Calendrier scolaire officiel
// ====================================================================

import { useState, useTransition } from 'react';
import { Building, CalendarDays, CalendarClock } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import * as actions from '@/app/actions';
import * as actionsExt from '@/app/actions/extensions';
import { formatDate } from '@/lib/format';

export default function SallesModule({ initialData }: { initialData: any }) {
  const salles = initialData.salles ?? [];
  const reservations = initialData.reservations ?? [];
  const calendrier = initialData.calendrier ?? [];
  const emploisTemps = initialData.emploisTemps ?? [];
  const classes = initialData.classes ?? [];
  const matieres = initialData.matieres ?? [];
  const niveaux = initialData.niveaux ?? [];
  const personnels = initialData.personnels ?? [];
  const anneeScolaire = initialData.anneeScolaire ?? null;
  const [messageAnnee, setMessageAnnee] = useState<string | null>(null);
  const retourEdt = useActionFeedback();

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Salles & Calendrier scolaire" subtitle="Ressources physiques et calendrier officiel" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Salles" value={salles.length} icon={Building} color="emerald" />
        <StatCard title="Réservations" value={reservations.length} icon={CalendarDays} color="blue" />
        <StatCard title="Entrées calendrier" value={calendrier.length} sub="jours fériés, vacances, journées pédagogiques" icon={CalendarDays} color="purple" />
        <StatCard title="Jours non travaillés" value={calendrier.filter((c: any) => c.type === 'jour_ferie' || c.type === 'vacances').length} icon={CalendarDays} color="amber" />
      </div>

      <SectionBlock
        title="Matières"
        description="Référentiel pédagogique de l'établissement (notes, bulletins et EDT s'y rattachent)"
        action={
          <ModalForm
            trigger={<CreateButton label="Ajouter une matière" />}
            title="Ajouter une matière"
            fields={[
              { name: 'code', label: 'Code', required: true, placeholder: 'MATHS' },
              { name: 'libelle', label: 'Libellé', required: true, placeholder: 'Mathématiques' },
              { name: 'coefficient', label: 'Coefficient', type: 'number', step: '0.5', defaultValue: '1' },
            ]}
            action={actionsExt.creerMatiere}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'libelle', label: 'Libellé' },
            { key: 'coefficient', label: 'Coefficient', render: (m: any) => String(m.coefficient ?? '—') },
          ]}
          rows={matieres}
          emptyLabel="Aucune matière — ajoutez le référentiel de votre établissement"
        />
      </SectionBlock>

      <SectionBlock
        title="Classes"
        description={`Classes de l'année ${anneeScolaire?.libelle ?? 'active'} — créez vos divisions réelles (6A, 6B…) et affectez les titulaires`}
        action={
          <ModalForm
            trigger={<CreateButton label="Ajouter une classe" />}
            title="Ajouter une classe"
            fields={[
              { name: 'niveauId', label: 'Niveau', type: 'select', required: true,
                options: niveaux.map((n: any) => ({ value: n.id, label: n.libelle })) },
              { name: 'code', label: 'Code', required: true, placeholder: '6B' },
              { name: 'libelle', label: 'Libellé', required: true, placeholder: 'Sixième B' },
              { name: 'capaciteMax', label: 'Capacité', type: 'number', defaultValue: '40' },
              { name: 'enseignantPrincipalId', label: 'Titulaire (optionnel)', type: 'select',
                options: personnels.map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })) },
            ]}
            action={actionsExt.creerClasse}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'libelle', label: 'Libellé' },
            { key: 'niveau', label: 'Niveau', render: (c: any) => c.niveau?.libelle ?? '—' },
            { key: 'capaciteMax', label: 'Capacité', render: (c: any) => c.capaciteMax ?? '—' },
            { key: 'titulaire', label: 'Titulaire', render: (c: any) => {
              const t = personnels.find((p: any) => p.id === c.enseignantPrincipalId);
              return t ? `${t.prenom} ${t.nom}` : '—';
            } },
          ]}
          rows={classes}
          emptyLabel="Aucune classe pour l'année active"
        />
      </SectionBlock>

      <SectionBlock
        title="Salles"
        description="Capacité et équipements"
        action={
          <ModalForm
            trigger={<CreateButton label="Ajouter une salle" />}
            title="Ajouter une salle"
            fields={[
              { name: 'nom', label: 'Nom', required: true, placeholder: 'A103' },
              { name: 'type', label: 'Type', type: 'select', options: [
                { value: 'classe', label: 'Classe' },
                { value: 'labo', label: 'Laboratoire' },
                { value: 'informatique', label: 'Salle informatique' },
                { value: 'sport', label: 'Gymnase / Sport' },
                { value: 'polyvalente', label: 'Polyvalente' },
              ], required: true },
              { name: 'capacite', label: 'Capacité', type: 'number', required: true },
              { name: 'equipements', label: 'Équipements (séparés par virgule)', placeholder: 'videoprojecteur, tableau' },
            ]}
            action={actions.creerSalle}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'nom', label: 'Nom' },
            { key: 'type', label: 'Type' },
            { key: 'capacite', label: 'Capacité' },
            { key: 'equipements', label: 'Équipements', render: (s) => JSON.parse(s.equipements || '[]').join(', ') || '—' },
          ]}
          rows={salles}
          emptyLabel="Aucune salle enregistrée"
        />
      </SectionBlock>

      <SectionBlock
        title="Calendrier scolaire officiel"
        description="Jours fériés, vacances, journées pédagogiques — bloquent la planification par défaut"
        action={
          <ModalForm
            trigger={<CreateButton label="Ajouter au calendrier" />}
            title="Ajouter une entrée de calendrier"
            fields={[
              { name: 'type', label: 'Type', type: 'select', options: [
                { value: 'jour_ferie', label: 'Jour férié' },
                { value: 'vacances', label: 'Vacances' },
                { value: 'journee_pedagogique', label: 'Journée pédagogique' },
                { value: 'evenement', label: 'Événement' },
              ], required: true },
              { name: 'libelle', label: 'Libellé', required: true },
              { name: 'dateDebut', label: 'Date de début', type: 'date', required: true },
              { name: 'dateFin', label: 'Date de fin', type: 'date', required: true },
            ]}
            action={actions.ajouterCalendrier}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'libelle', label: 'Libellé' },
            { key: 'type', label: 'Type', render: (c) => <StatusBadge statut={c.type === 'jour_ferie' ? 'absent' : c.type === 'vacances' ? 'en_attente' : 'planifiee'} /> },
            { key: 'dateDebut', label: 'Du', render: (c) => formatDate(c.dateDebut) },
            { key: 'dateFin', label: 'Au', render: (c) => formatDate(c.dateFin) },
          ]}
          rows={calendrier}
          emptyLabel="Aucune entrée au calendrier"
        />
      </SectionBlock>


      <SectionBlock
        title="Éditeur d'emploi du temps (avec détection de conflits)"
        description="Créneaux hebdomadaires — toute collision salle / enseignant / classe sur la même tranche horaire est refusée"
        action={
          <ModalForm
            trigger={<CreateButton label="Ajouter un créneau" />}
            title="Nouveau créneau hebdomadaire"
            fields={[
              { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })), required: true },
              { name: 'matiereId', label: 'Matière', type: 'select', options: matieres.map((m: any) => ({ value: m.id, label: m.libelle })) },
              { name: 'enseignantId', label: 'Enseignant', type: 'select', options: personnels.map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })) },
              { name: 'salleId', label: 'Salle', type: 'select', options: salles.map((s: any) => ({ value: s.id, label: s.nom })) },
              { name: 'jour', label: 'Jour', type: 'select', options: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].map((j) => ({ value: j, label: j.charAt(0).toUpperCase() + j.slice(1) })), required: true },
              { name: 'heureDebut', label: 'Début (HH:MM)', required: true, placeholder: '08:00' },
              { name: 'heureFin', label: 'Fin (HH:MM)', required: true, placeholder: '10:00' },
              { name: 'dateDebut', label: 'Effective à partir du', type: 'date', required: true },
            ]}
            action={actions.creerCreneauEdt}
          />
        }
      >
        {retourEdt.Message}
        <DataTable
          columns={[
            { key: 'jour', label: 'Jour' },
            { key: 'classe', label: 'Classe', render: (e) => classes.find((c: any) => c.id === e.classeId)?.libelle ?? '—' },
            { key: 'matiere', label: 'Matière', render: (e) => matieres.find((m: any) => m.id === e.matiereId)?.libelle ?? '—' },
            { key: 'enseignant', label: 'Enseignant', render: (e) => { const p = personnels.find((x: any) => x.id === e.enseignantId); return p ? `${p.prenom} ${p.nom}` : '—'; } },
            { key: 'salle', label: 'Salle', render: (e) => salles.find((s: any) => s.id === e.salleId)?.nom ?? '—' },
            { key: 'horaire', label: 'Horaire', render: (e) => `${e.heureDebut} – ${e.heureFin}` },
            { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut} /> },
            {
              key: 'actions', label: 'Actions', render: (e) => (
                <div className="flex gap-1 flex-wrap">
                  <ModalForm
                    trigger={<Button size="sm" variant="outline">Modifier</Button>}
                    title="Modifier le créneau hebdomadaire"
                    fields={[
                      { name: 'emploiTempsId', type: 'hidden', label: 'ID', defaultValue: e.id },
                      { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })) },
                      { name: 'matiereId', label: 'Matière', type: 'select', options: matieres.map((m: any) => ({ value: m.id, label: m.libelle })) },
                      { name: 'enseignantId', label: 'Enseignant', type: 'select', options: personnels.map((p: any) => ({ value: p.id, label: `${p.prenom} ${p.nom}` })) },
                      { name: 'salleId', label: 'Salle', type: 'select', options: salles.map((s: any) => ({ value: s.id, label: s.nom })) },
                      { name: 'jour', label: 'Jour', type: 'select', options: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].map((j) => ({ value: j, label: j.charAt(0).toUpperCase() + j.slice(1) })), required: true },
                      { name: 'heureDebut', label: 'Début (HH:MM)', required: true, placeholder: '08:00' },
                      { name: 'heureFin', label: 'Fin (HH:MM)', required: true, placeholder: '10:00' },
                      { name: 'dateDebut', label: 'Effective à partir du', type: 'date', required: true },
                    ]}
                    defaultValues={{
                      emploiTempsId: e.id,
                      classeId: e.classeId ?? '',
                      matiereId: e.matiereId ?? '',
                      enseignantId: e.enseignantId ?? '',
                      salleId: e.salleId ?? '',
                      jour: e.jour,
                      heureDebut: e.heureDebut,
                      heureFin: e.heureFin,
                      dateDebut: String(e.dateDebut ?? '').slice(0, 10),
                    }}
                    action={actions.modifierCreneauEdt}
                  />
                  <Button size="sm" variant="outline" disabled={retourEdt.pending} onClick={() => retourEdt.run(() => actions.supprimerCreneauEdt(e.id), 'Créneau supprimé')}>
                    Supprimer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retourEdt.pending}
                    title="Crée les séances concrètes de ce créneau sur les 3 prochains mois"
                    onClick={() => retourEdt.run(
                      () => actions.genererSeancesDepuisEdt(e.id, new Date(Date.now() + 90 * 864e5).toISOString()),
                      'Séances générées',
                    )}
                  >
                    Générer séances
                  </Button>
                </div>
              )
            },
          ]}
          rows={emploisTemps}
          emptyLabel="Aucun créneau défini — ajoutez le premier créneau de l'emploi du temps"
        />
      </SectionBlock>

      <SectionBlock
        title="Transition d'année scolaire"
        description="Clôture de l'année courante, historisation des affectations, montée de niveau des élèves et ouverture de l'année suivante"
        action={
          <DialogClotureAnnee
            libelleAnnee={anneeScolaire?.libelle}
            desactive={!anneeScolaire}
            onResultat={setMessageAnnee}
          />
        }
      >
        {messageAnnee && (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{messageAnnee}</div>
        )}
        <p className="text-sm text-gray-600">
          Année active : <span className="font-medium">{anneeScolaire?.libelle ?? '—'}</span>.
          Cette opération irréversible archive l'année en cours, enregistre l'historique de classe de chaque élève,
          fait monter les élèves au niveau supérieur lorsqu'il existe et notifie la direction.
          Les élèves concernés peuvent être marqués <span className="font-medium">« redoublera »</span> au moment de la clôture.
        </p>
      </SectionBlock>

      <SectionBlock title="Réservations de salles" description="Réservations ponctuelles et liées aux séances">
        <DataTable
          columns={[
            { key: 'salle', label: 'Salle', render: (r) => salles.find((s: any) => s.id === r.salleId)?.nom ?? '—' },
            { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
            { key: 'heureDebut', label: 'De' },
            { key: 'heureFin', label: 'À' },
            { key: 'motif', label: 'Motif' },
          ]}
          rows={reservations}
          emptyLabel="Aucune réservation"
        />
      </SectionBlock>
    </div>
  );
}

// --------------------------------------------------------------------
// C1 — DIALOGUE DE CLÔTURE D'ANNÉE AVEC SÉLECTION DES REDOUBLANTS
// Au clic : chargement des élèves actifs (elevesPourCloture), puis
// liste à cocher « redoublera », confirmation tapée, et clôture
// effective via cloturerAnneeScolaire(anneeId, idsSélectionnés).
// --------------------------------------------------------------------
function DialogClotureAnnee({ libelleAnnee, desactive, onResultat }: { libelleAnnee?: string | null; desactive?: boolean; onResultat: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pendingChargement, startChargement] = useTransition();
  const [pendingCloture, startCloture] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [donnees, setDonnees] = useState<{ anneeId: string; libelle: string; eleves: any[] } | null>(null);
  const [redoublants, setRedoublants] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState('');

  function ouvrir(o: boolean) {
    setOpen(o);
    if (o && !donnees) {
      setErreur(null);
      startChargement(async () => {
        const r: any = await actionsExt.elevesPourCloture();
        if (r && r.ok === false) {
          setErreur(r.error ?? 'Chargement impossible.');
          return;
        }
        setDonnees({ anneeId: r.anneeId, libelle: r.libelle, eleves: r.eleves ?? [] });
      });
    }
  }

  function basculer(id: string, coche: boolean) {
    setRedoublants((prev) => {
      const s = new Set(prev);
      if (coche) s.add(id);
      else s.delete(id);
      return s;
    });
  }

  function cloturer() {
    if (!donnees || confirmation.trim().toUpperCase() !== 'CLOTURER') return;
    setErreur(null);
    startCloture(async () => {
      const r: any = await actions.cloturerAnneeScolaire(donnees.anneeId, [...redoublants]);
      if (r && r.ok === false) {
        setErreur(r.error ?? 'Clôture refusée.');
        return;
      }
      setOpen(false);
      onResultat(
        `✓ Année ${r.libelle} ouverte : ${r.promus} promu(s), ${r.redoublants} redoublant(s), ${r.diplomes} diplômé(s)` +
        (r.sansClasse ? `, ${r.sansClasse} sans affectation` : '') +
        ` — ${r.classesCreees} classe(s) recréée(s).`,
      );
    });
  }

  const confirmee = confirmation.trim().toUpperCase() === 'CLOTURER';

  return (
    <Dialog open={open} onOpenChange={ouvrir}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={desactive}>
          <CalendarClock className="h-3 w-3 mr-1" />Clôturer {libelleAnnee ?? 'l\'année'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Clôture de l&apos;année scolaire</DialogTitle>
        </DialogHeader>
        {erreur && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{erreur}</div>}
        {pendingChargement && !donnees && <p className="text-sm text-gray-500">Chargement des élèves actifs…</p>}
        {donnees && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Année <span className="font-medium">{donnees.libelle}</span> — {donnees.eleves.length} élève(s) actif(s).
              Cochez les élèves qui <span className="font-medium">redoubleront</span> : les autres seront promus
              (ou déclarés diplômés en fin de cycle).
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500 border border-gray-100 rounded-md px-3 py-2 bg-gray-50">
              <span>Redoublants sélectionnés : <span className="font-semibold text-gray-900">{redoublants.size}</span></span>
              <button
                type="button"
                className="text-emerald-700 hover:underline"
                onClick={() => setRedoublants(new Set())}
              >
                Tout décocher
              </button>
            </div>
            <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto divide-y divide-gray-100">
              {donnees.eleves.length === 0 && <p className="p-3 text-sm text-gray-500">Aucun élève actif.</p>}
              {donnees.eleves.map((e: any) => (
                <label key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <Checkbox checked={redoublants.has(e.id)} onCheckedChange={(v) => basculer(e.id, v === true)} />
                  <span className="text-sm flex-1">{e.prenom} {e.nom}</span>
                  <span className="text-xs text-gray-400">{e.matricule ?? '—'}</span>
                  <span className="text-xs text-gray-600">{e.classeActuelle?.libelle ?? 'Sans classe'}</span>
                </label>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Confirmation — tapez <span className="font-mono font-semibold">CLOTURER</span> pour activer le bouton
              </label>
              <Input value={confirmation} onChange={(ev) => setConfirmation(ev.target.value)} placeholder="CLOTURER" />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pendingCloture}>Annuler</Button>
              </DialogClose>
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" disabled={pendingCloture || !confirmee} onClick={cloturer}>
                {pendingCloture ? 'Clôture en cours…' : 'Clôturer l\'année'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
