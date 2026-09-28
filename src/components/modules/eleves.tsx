'use client';

// ====================================================================
// Module Élèves — fiche élève + besoins spécifiques + aménagements +
// consentements mineurs (Partie C.2 + C.8 du cahier des charges)
// ====================================================================

import { useState } from 'react';
import { KeyRound, Users, Plus, Eye, Accessibility, FileCheck, AlertTriangle, Shield, BookMarked, FileText, Pencil, ArrowRightLeft, DoorOpen, UserPlus, Download, Trash2, Upload, Paperclip } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, InfoRow, EmptyState, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import * as actions from '@/app/actions';
import * as actionsExt from '@/app/actions/extensions';
import { formatDate, formatDateTime, formatMontant, initiales } from '@/lib/format';
import * as ext from '@/app/actions/completions';

const LIBELLES_PIECES: Record<string, string> = {
  acte_naissance: "Acte de naissance",
  certificat_medical: 'Certificat médical',
  photos_identite: "Photos d'identité",
  carnet_vaccination: "Carnet de vaccination",
  dernier_bulletin: "Dernier bulletin",
};

// AUDIT DOSSIER — types de fichiers importables (mis en cohérence avec le
// suivi de pièces : déposer le fichier marque automatiquement la pièce reçue)
const TYPES_DOCUMENT_IMPORT: Array<{ value: string; label: string }> = [
  { value: 'acte_naissance', label: 'Acte de naissance' },
  { value: 'certificat_medical', label: 'Certificat médical' },
  { value: 'photos_identite', label: "Photos d'identité" },
  { value: 'carnet_vaccination', label: 'Carnet de vaccination' },
  { value: 'dernier_bulletin', label: 'Dernier bulletin' },
  { value: 'certificat_transfert', label: 'Certificat de transfert' },
  { value: 'autre', label: 'Autre document' },
];

// AUDIT — périmètres RÉELS du portail connecté (les onglets distinguent
// « hors périmètre » de « aucune donnée » au lieu d'un message trompeur)
const PORTEES_FINANCES = ['direction', 'comptabilite', 'super_admin'];
const PORTEES_PEDAGOGIE = ['direction', 'enseignant', 'super_admin'];
const PORTEES_DOSSIER = ['direction', 'secretariat', 'super_admin'];

export default function ElevesModule({ initialData }: { initialData: any }) {
  const eleves = initialData.eleves ?? [];
  const classes = initialData.classes ?? [];
  const niveaux = initialData.niveaux ?? [];
  const besoinsSpecifiques = initialData.besoinsSpecifiques ?? [];
  const amenagements = initialData.amenagements ?? [];
  const documents = initialData.documents ?? [];
  const historiquesClasse = initialData.historiquesClasse ?? [];
  const attributionsManuel = initialData.attributionsManuel ?? [];
  const manuels = initialData.manuels ?? [];
  const autorisationsSortie = initialData.autorisationsSortie ?? [];
  const sortiesAnticipees = initialData.sortiesAnticipees ?? [];
  const incidentsEleve = initialData.incidents ?? [];
  const parents = initialData.parents ?? [];
  const consentementsImage = initialData.consentementsImage ?? [];
  const portal = initialData.session?.portal;
  const accesRgpd = portal === 'direction' || portal === 'secretariat';
  const peutEcrire = ['direction', 'secretariat', 'super_admin', 'assistant'].includes(portal ?? '');
  // AUDIT — périmètres réels pour des onglets honnêtes
  const peutVoirFinances = PORTEES_FINANCES.includes(portal ?? '');
  const peutVoirPedagogie = PORTEES_PEDAGOGIE.includes(portal ?? '') || portal === 'vie_scolaire';
  const peutVoirDossier = PORTEES_DOSSIER.includes(portal ?? '') || portal === 'vie_scolaire';
  const [selectedEleveId, setSelectedEleveId] = useState<string | null>(eleves[0]?.id ?? null);
  const [rechercheAncien, setRechercheAncien] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const consentementFb = useActionFeedback();
  const rgpdFb = useActionFeedback();
  const uploadFb = useActionFeedback();

  // ===== AUDIT NAVIGATION — organisation cycle → classe → élèves =====
  // Les classes sont rangées par cycle pédagogique (Maternelle, Primaire,
  // Collège, Lycée) puis par niveau ; l'utilisateur choisit une classe et
  // voit sa liste d'élèves — plus une recherche globale en secours.
  const [cycleActif, setCycleActif] = useState<string>('tous');
  const [classeActive, setClasseActive] = useState<string>('toutes');
  const [recherche, setRecherche] = useState('');
  const niveauParClasse = new Map<string, any>(niveaux.map((n: any) => [n.id, n]));
  const cycleDeClasse = (c: any): string => {
    const niv = niveauParClasse.get(c.niveauId);
    const cycle = niv?.section?.cycle;
    return cycle?.libelle ?? niv?.section?.libelle ?? 'Autre';
  };
  const cyclesDisponibles: string[] = ['tous', ...[...new Set<string>(classes.map((c: any) => cycleDeClasse(c)))].sort()];
  const classesDuCycle = cycleActif === 'tous' ? classes : classes.filter((c: any) => cycleDeClasse(c) === cycleActif);
  const elevesFiltres = eleves.filter((e: any) => {
    if (classeActive !== 'toutes' && e.classeActuelleId !== classeActive) return false;
    if (classeActive === 'toutes' && cycleActif !== 'tous' && e.classeActuelleId) {
      const c = classes.find((x: any) => x.id === e.classeActuelleId);
      if (c && cycleDeClasse(c) !== cycleActif) return false;
    }
    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase();
      return `${e.prenom} ${e.nom} ${e.matricule ?? ''}`.toLowerCase().includes(q);
    }
    return true;
  });

  const eleve = eleves.find((e: any) => e.id === selectedEleveId);
  const classeEleve = classes.find((c: any) => c.id === eleve?.classeActuelleId);
  const eleveBesoinSpec = besoinsSpecifiques.filter((b: any) => b.eleveId === selectedEleveId);
  const eleveAmenagements = amenagements.filter((a: any) => a.eleveId === selectedEleveId);
  const eleveManuels = attributionsManuel.filter((a: any) => a.eleveId === selectedEleveId);
  const eleveAutorisations = autorisationsSortie.filter((a: any) => a.eleveId === selectedEleveId);
  const eleveDocuments = documents.filter((d: any) => d.eleveId === selectedEleveId);
  const eleveHistorique = historiquesClasse.filter((h: any) => h.eleveId === selectedEleveId);
  const eleveIncidents = incidentsEleve.filter((i: any) => i.eleveId === selectedEleveId);
  const eleveConsentementsImage = consentementsImage
    .filter((c: any) => c.eleveId === selectedEleveId)
    .sort((a: any, b: any) => new Date(b.dateAccord ?? b.dateCreation ?? 0).getTime() - new Date(a.dateAccord ?? a.dateCreation ?? 0).getTime());
  const dernierConsentementImage = eleveConsentementsImage[0];

  // PARCOURS ÉLÈVE — situation financière par élève (échéances chargées pour
  // direction / comptabilité / secrétariat ; le journal des paiements reste
  // réservé aux portails financiers)
  const echeances = initialData.echeances ?? [];
  // SECRETARIAT — checklist de complétude du dossier d'inscription
  const piecesDossier = initialData.piecesDossier ?? [];
  const piecesEleve = piecesDossier.filter((p: any) => p.eleveId === selectedEleveId);
  const piecesManquantes = piecesEleve.filter((p: any) => p.statut !== 'recue').length;
  const reinscriptions = initialData.reinscriptions ?? [];
  const reinscritEleve = reinscriptions.find((x: any) => x.eleveId === selectedEleveId);
  const eleveEcheances = echeances.filter((e: any) => e.eleveId === selectedEleveId);
  const totalDu = eleveEcheances.reduce((s: number, e: any) => s + (e.montant - (e.remise ?? 0)), 0);
  const totalPaye = eleveEcheances.reduce((s: number, e: any) => s + (e.montantPaye ?? 0), 0);
  const restantDu = totalDu - totalPaye;

  // AUDIT ENSEIGNANT — profil pédagogique de l'élève (notes par matière,
  // forces/faiblesses, absences, incidents) — visible prof/direction
  const notes = initialData.notes ?? [];
  const presences = initialData.presences ?? [];
  const notesEleve = notes.filter((n: any) => n.eleveId === selectedEleveId && n.evaluation?.matiere && !n.absent && n.valeur != null);
  const parMatiereEleve = new Map<string, { somme: number; coef: number; n: number }>();
  for (const n of notesEleve) {
    const k = n.evaluation.matiere.libelle;
    const cur = parMatiereEleve.get(k) ?? { somme: 0, coef: 0, n: 0 };
    cur.somme += (n.valeur / n.evaluation.sur) * 20 * (n.evaluation.coefficient ?? 1);
    cur.coef += n.evaluation.coefficient ?? 1;
    cur.n++;
    parMatiereEleve.set(k, cur);
  }
  const moyennesMatiere = [...parMatiereEleve.entries()].map(([lib, v]) => ({ matiere: lib, moyenne: v.coef > 0 ? Number((v.somme / v.coef).toFixed(2)) : 0, nbNotes: v.n }));
  const moyenneGeneraleEleve = moyennesMatiere.length
    ? Number((moyennesMatiere.reduce((s2, m) => s2 + m.moyenne, 0) / moyennesMatiere.length).toFixed(2))
    : null;
  const meilleureMatiere = moyennesMatiere.length ? moyennesMatiere.reduce((a, b) => (b.moyenne > a.moyenne ? b : a)) : null;
  const matiereFaible = moyennesMatiere.length ? moyennesMatiere.reduce((a, b) => (b.moyenne < a.moyenne ? b : a)) : null;
  const absencesEleve = presences.filter((x: any) => x.eleveId === selectedEleveId && x.statut === 'absent').length;
  const retardsEleve = presences.filter((x: any) => x.eleveId === selectedEleveId && x.statut === 'retard').length;

  const consentementsEnAttente = eleves.filter((e: any) => !e.consentementPortailEleve).length;
  const elevesAvecBesoin = eleves.filter((e: any) => besoinsSpecifiques.some((b: any) => b.eleveId === e.id)).length;

  return (
    <div className="p-4 lg:p-6 max-w-full lg:max-w-7xl mx-auto">
      <PageHeader
        title="Élèves"
        subtitle={`${eleves.length} élèves · ${classes.length} classes`}
        actions={
          peutEcrire ? (
          <ModalForm
            trigger={<CreateButton label="Inscrire un élève" />}
            title="Inscrire un nouvel élève"
            fields={[
              { name: 'nom', label: 'Nom', required: true },
              { name: 'prenom', label: 'Prénom', required: true },
              { name: 'dateNaissance', label: 'Date de naissance', type: 'date', required: true },
              { name: 'lieuNaissance', label: 'Lieu de naissance', defaultValue: 'Dakar' },
              { name: 'sexe', label: 'Sexe', type: 'select', options: [{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }] },
              { name: 'classeId', label: 'Classe', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })) },
            ]}
            action={actions.inscrireEleve}
          />
          ) : undefined
        }
      />

      {/* KPIs */}
      <div className="overflow-x-auto grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Élèves actifs" value={eleves.length} icon={Users} color="emerald" />
        <StatCard title="Besoins spécifiques" value={elevesAvecBesoin} sub="élèves concernés" icon={Accessibility} color="amber" />
        <StatCard title="Consentements en attente" value={consentementsEnAttente} sub="portail élève mineur" icon={FileCheck} color="rose" />
        <StatCard title="Dernière inscription" value={eleves.length ? formatDate(eleves[eleves.length - 1].dateInscription) : '—'} icon={Users} color="blue" />
        {piecesDossier.length > 0 && (
          <StatCard title="Dossiers incomplets" value={new Set(piecesDossier.filter((p: any) => p.statut !== 'recue').map((p: any) => p.eleveId)).size} sub="il manque au moins une pièce" icon={FileText} color="rose" />
        )}
      </div>

      <div className="overflow-x-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste des élèves */}
        <div className="lg:col-span-1">
          {(reinscriptions.length > 0 || peutEcrire) && initialData.session?.portal !== 'enseignant' && (
            <SectionBlock
              title="Réinscriptions (année en cours)"
              description={`${reinscriptions.length} réinscrit(s) sur ${eleves.filter((e: any) => e.statut === 'actif').length} élèves actifs — frais de réinscription suivis`}
              action={peutEcrire ? (
                <ModalForm
                  trigger={<CreateButton label="Enregistrer une réinscription" />}
                  title="Réinscription d'un élève"
                  fields={[
                    { name: 'eleveId', label: 'Élève', type: 'select', required: true, options: eleves.filter((e: any) => e.statut === 'actif').map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom} (${e.matricule})` })) },
                    { name: 'classeVoulueId', label: 'Classe souhaitée', type: 'select', options: classes.map((c: any) => ({ value: c.id, label: c.libelle })) },
                    { name: 'fraisPayes', label: 'Frais de réinscription payés', type: 'checkbox' },
                  ]}
                  action={(fd: FormData) => actionsExt.enregistrerReinscription({
                    eleveId: String(fd.get('eleveId') ?? ''),
                    classeVoulueId: String(fd.get('classeVoulueId') ?? '') || undefined,
                    fraisPayes: fd.get('fraisPayes') === 'on',
                  })}
                />
              ) : undefined}
            >
              <DataTable
                columns={[
                  { key: 'eleve', label: 'Élève', render: (x) => `${x.eleve?.prenom ?? ''} ${x.eleve?.nom ?? ''}` },
                  { key: 'annee', label: 'Année', render: (x) => x.anneeScolaire?.libelle ?? '—' },
                  { key: 'classeVoulue', label: 'Classe souhaitée', render: (x) => x.classeVoulue?.libelle ?? '—' },
                  { key: 'fraisPayes', label: 'Frais', render: (x) => <StatusBadge statut={x.fraisPayes ? 'valide' : 'en_attente'} /> },
                  { key: 'dateReinscription', label: 'Date', render: (x) => formatDate(x.dateReinscription) },
                ]}
                rows={reinscriptions}
                emptyLabel="Aucune réinscription enregistrée"
              />
            </SectionBlock>
          )}

          {/* ARCHIVES — anciens élèves (sortis, diplômés, transférés, exclus) */}
          {initialData.session?.portal !== 'enseignant' && (
            <SectionBlock
              title="Archives — anciens élèves"
              description={`${eleves.filter((e: any) => e.statut !== 'actif').length} ancien(s) élève(s) · attestations de fréquentation délivrables sur archives`}
            >
              <div className="mb-2">
                <input
                  value={rechercheAncien}
                  onChange={(e) => setRechercheAncien(e.target.value)}
                  placeholder="Rechercher un ancien (nom, prénom, matricule)…"
                  className="w-full h-9 border rounded-md px-3 text-sm"
                />
              </div>
              <DataTable
                columns={[
                  { key: 'nom', label: 'Élève', render: (e) => `${e.prenom} ${e.nom}` },
                  { key: 'matricule', label: 'Matricule' },
                  { key: 'statut', label: 'Statut', render: (e) => <StatusBadge statut={e.statut === 'diplome' ? 'valide' : 'absent'} /> },
                  { key: 'entree', label: 'Entré(e) le', render: (e) => formatDate(e.dateInscription) },
                  { key: 'sortie', label: 'Sorti(e) le', render: (e) => e.dateSortie ? formatDate(e.dateSortie) : '—' },
                  { key: 'motifSortie', label: 'Motif', render: (e) => e.motifSortie ?? '—' },
                ]}
                rows={eleves.filter((e: any) => e.statut !== 'actif' && `${e.prenom} ${e.nom} ${e.matricule ?? ''}`.toLowerCase().includes(rechercheAncien.toLowerCase()))}
                emptyLabel="Aucun ancien élève"
              />
              <p className="text-xs text-gray-500 mt-2">Attestation de fréquentation (période + parcours) : ouvrez la fiche de l'ancien élève → Documents → « Attestation de scolarité (ancien élève) ».</p>
            </SectionBlock>
          )}

          <SectionBlock
            title="Répertoire des élèves"
            description="Parcourir par cycle → classe, ou rechercher directement"
          >
            {/* Filtres de cycle — Maternelle / Primaire / Collège / Lycée */}
            <div className="flex gap-1 flex-wrap mb-2">
              {cyclesDisponibles.map((cy: string) => (
                <button
                  key={cy}
                  onClick={() => { setCycleActif(cy); setClasseActive('toutes'); }}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    cycleActif === cy
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  {cy === 'tous' ? `Tous (${eleves.length})` : cy}
                </button>
              ))}
            </div>
            {/* Classes du cycle sélectionné */}
            <div className="flex gap-1 flex-wrap mb-2 pb-2 border-b border-gray-100">
              <button
                onClick={() => setClasseActive('toutes')}
                className={`px-2 py-0.5 rounded text-xs border ${
                  classeActive === 'toutes' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-200'
                }`}
              >
                Toutes les classes
              </button>
              {classesDuCycle.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setClasseActive(c.id)}
                  className={`px-2 py-0.5 rounded text-xs border ${
                    classeActive === c.id ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-200'
                  }`}
                  title={`${c.libelle}${niveauParClasse.get(c.niveauId)?.libelle ? ` — ${niveauParClasse.get(c.niveauId).libelle}` : ''}`}
                >
                  {c.libelle} · {eleves.filter((e: any) => e.classeActuelleId === c.id).length}
                </button>
              ))}
            </div>
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un élève (nom, prénom, matricule)…"
              className="w-full h-9 border rounded-md px-3 text-sm mb-2"
            />
            <div className="max-h-[55vh] overflow-y-auto -mx-2">
              {elevesFiltres.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 text-center">
                  {eleves.length === 0
                    ? "Aucun élève inscrit — utilisez « Inscrire un élève » pour commencer."
                    : 'Aucun élève pour ce filtre.'}
                </p>
              ) : elevesFiltres.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEleveId(e.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm hover:bg-gray-50 ${selectedEleveId === e.id ? 'bg-emerald-50 border border-emerald-200' : ''}`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${e.sexe === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                    {initiales(e.nom, e.prenom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{e.prenom} {e.nom}</div>
                    <div className="text-xs text-gray-500">{e.matricule} · {classes.find((c: any) => c.id === e.classeActuelleId)?.libelle ?? '—'}</div>
                  </div>
                  {besoinsSpecifiques.some((b: any) => b.eleveId === e.id) && (
                    <Accessibility className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </SectionBlock>
        </div>

        {/* Fiche élève */}
        <div className="lg:col-span-2">
          {eleve ? (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${eleve.sexe === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                      {initiales(eleve.nom, eleve.prenom)}
                    </div>
                    <div>
                      <div className="text-lg">{eleve.prenom} {eleve.nom}</div>
                      <div className="text-xs font-normal text-gray-500">{eleve.matricule} · {classeEleve?.libelle}</div>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <Tabs defaultValue="identite" className="mt-4">
                  <TabsList className="overflow-x-auto grid grid-cols-2 md:grid-cols-5 mb-2 h-auto">
                    <TabsTrigger value="identite" className="text-xs">Identité</TabsTrigger>
                    <TabsTrigger value="finances" className="text-xs">Finances</TabsTrigger>
                    <TabsTrigger value="pedagogie" className="text-xs">Pédagogie</TabsTrigger>
                    <TabsTrigger value="dossier" className="text-xs">Dossier</TabsTrigger>
                    <TabsTrigger value="besoins" className="text-xs">Besoins</TabsTrigger>
                    <TabsTrigger value="manuels" className="text-xs">Manuels</TabsTrigger>
                    <TabsTrigger value="securite" className="text-xs">Sécurité</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dossier" className="space-y-4">
                    {!peutVoirDossier ? (
                      <p className="text-sm text-gray-500">Suivi de dossier réservé à la direction et au secrétariat.</p>
                    ) : piecesEleve.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded text-sm text-amber-700 space-y-1">
                        <div className="font-medium">Aucune pièce suivie pour cet élève.</div>
                        <div className="text-xs">Importez un premier fichier ci-dessous — la pièce correspondante sera suivie automatiquement (reçue dès dépôt).</div>
                      </div>
                    ) : (
                      <>
                        <div className={`p-3 rounded ${piecesManquantes === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                          <div className={`text-sm font-semibold ${piecesManquantes === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {piecesManquantes === 0 ? '✓ Dossier complet' : `Dossier incomplet — ${piecesManquantes} pièce(s) manquante(s)`}
                          </div>
                          {piecesManquantes > 0 && <div className="text-xs text-amber-700 mt-1">Relancez la famille pour compléter le dossier avant la rentrée.</div>}
                        </div>
                        <div className="space-y-2">
                          {piecesEleve.map((p: any) => {
                            const fichierImporte = eleveDocuments.find((d: any) => d.type === p.type && d.nomFichier);
                            return (
                              <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium">{LIBELLES_PIECES[p.type] ?? p.type}</div>
                                  {p.remarque && <div className="text-xs text-gray-500 truncate">{p.remarque}</div>}
                                  {p.dateReception && <div className="text-xs text-gray-500">Reçue le {formatDate(p.dateReception)}</div>}
                                  {fichierImporte && (
                                    <a
                                      href={`/api/fichiers/${fichierImporte.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1 mt-0.5"
                                    >
                                      <Paperclip className="h-3 w-3" /> {fichierImporte.nomFichier}
                                      {fichierImporte.tailleOctets ? ` (${(fichierImporte.tailleOctets / 1024).toFixed(0)} Ko)` : ''}
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <StatusBadge statut={p.statut === 'recue' ? 'valide' : 'absent'} />
                                  {peutEcrire && (
                                    <Button
                                      variant="outline" size="sm"
                                      onClick={() => actionsExt.basculerPieceDossier(p.id, p.statut === 'recue' ? 'manquante' : 'recue')}
                                    >
                                      {p.statut === 'recue' ? 'Retirer' : 'Marquer reçue'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {peutEcrire && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-emerald-700">Exiger une pièce supplémentaire (ex. certificat de transfert)</summary>
                            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); actionsExt.ajouterPieceExigee(eleve.id, String(fd.get('type') ?? '')); }}>
                              <input name="type" placeholder="Libellé de la pièce" className="flex-1 h-8 border rounded px-2" required />
                              <Button size="sm">Exiger</Button>
                            </form>
                          </details>
                        )}
                      </>
                    )}

                    {/* AUDIT DOSSIER — import numérique réel du fichier (PDF/photo),
                        stocké de façon confidentielle ; marque la pièce « reçue » */}
                    {peutEcrire && (
                      <div className="border-t border-gray-200 pt-3">
                        <div className="text-sm font-medium mb-1">Importer un fichier au dossier</div>
                        <p className="text-xs text-gray-500 mb-2">PDF, JPEG, PNG ou Word — 5 Mo max. Le dépôt marque automatiquement la pièce correspondante comme reçue.</p>
                        <form
                          className="flex flex-col sm:flex-row gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const fd = new FormData(form);
                            fd.set('eleveId', eleve.id);
                            uploadFb.run(async () => {
                              const r = await actionsExt.televerserDocumentEleve(fd);
                              if (r?.ok) form.reset();
                              return r;
                            }, 'Fichier importé — pièce marquée reçue.');
                          }}
                        >
                          <select name="type" className="h-9 rounded-md border border-gray-200 bg-transparent px-3 text-sm sm:w-56" required defaultValue="">
                            <option value="" disabled>Type de pièce…</option>
                            {TYPES_DOCUMENT_IMPORT.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <input
                            type="file"
                            name="fichier"
                            required
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                            className="flex-1 text-sm border rounded-md px-2 py-1.5 file:mr-2 file:rounded file:border-0 file:bg-emerald-50 file:text-emerald-700 file:px-2 file:py-1"
                          />
                          <Button type="submit" size="sm" disabled={uploadFb.pending} className="bg-emerald-600 hover:bg-emerald-700">
                            <Upload className="h-4 w-4 mr-1" /> {uploadFb.pending ? 'Import…' : 'Importer'}
                          </Button>
                        </form>
                        {uploadFb.Message}
                        {eleveDocuments.filter((d: any) => d.nomFichier).length > 0 && (
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-medium text-gray-600 uppercase">Fichiers importés ({eleveDocuments.filter((d: any) => d.nomFichier).length})</div>
                            {eleveDocuments.filter((d: any) => d.nomFichier).map((d: any) => (
                              <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                <a href={`/api/fichiers/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline flex items-center gap-1.5 min-w-0">
                                  <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">{d.nomFichier}</span>
                                  <span className="text-xs text-gray-400 flex-shrink-0">{TYPES_DOCUMENT_IMPORT.find((t) => t.value === d.type)?.label ?? d.type}{d.tailleOctets ? ` · ${(d.tailleOctets / 1024).toFixed(0)} Ko` : ''}</span>
                                </a>
                                <Button
                                  variant="ghost" size="sm"
                                  className="text-rose-600 hover:text-rose-700 h-7"
                                  disabled={uploadFb.pending}
                                  onClick={() => uploadFb.run(() => actionsExt.supprimerDocumentEleve(d.id), 'Fichier supprimé du dossier.')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {reinscritEleve && (
                      <div className="p-2 bg-emerald-50 rounded text-xs text-emerald-700">
                        ✓ Réinscrit·e pour {reinscritEleve.anneeScolaire?.libelle} {reinscritEleve.classeVoulue ? `→ ${reinscritEleve.classeVoulue.libelle}` : ''} {reinscritEleve.fraisPayes ? '· frais payés' : '· frais en attente'}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="pedagogie" className="space-y-4">
                    {!peutVoirPedagogie ? (
                      <p className="text-sm text-gray-500">Profil pédagogique réservé aux portails pédagogiques (direction, enseignants).</p>
                    ) : moyennesMatiere.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded text-sm text-amber-700 space-y-1">
                        <div className="font-medium">Aucune note enregistrée pour cet élève.</div>
                        <div className="text-xs">Le profil se construit automatiquement : créez une évaluation dans le module <strong>Pédagogie</strong> (ou demandez à l'enseignant de la matière) puis saisissez les notes — moyennes par matière, points forts et axes de renforcement apparaîtront ici.</div>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="p-3 bg-emerald-50 rounded text-center">
                            <div className="text-xs text-emerald-700">Moyenne générale</div>
                            <div className="text-lg font-semibold text-emerald-700">{moyenneGeneraleEleve?.toFixed(2) ?? '—'}/20</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded text-center">
                            <div className="text-xs text-gray-500">Points forts</div>
                            <div className="text-sm font-semibold">{meilleureMatiere?.matiere} ({meilleureMatiere?.moyenne.toFixed(1)})</div>
                          </div>
                          <div className="p-3 bg-amber-50 rounded text-center">
                            <div className="text-xs text-amber-700">À renforcer</div>
                            <div className="text-sm font-semibold text-amber-700">{matiereFaible?.matiere} ({matiereFaible?.moyenne.toFixed(1)})</div>
                          </div>
                          <div className="p-3 bg-rose-50 rounded text-center">
                            <div className="text-xs text-rose-700">Assiduité</div>
                            <div className="text-sm font-semibold text-rose-700">{absencesEleve} abs. · {retardsEleve} retards · {eleveIncidents.length} incident(s)</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {moyennesMatiere.map((m) => (
                            <div key={m.matiere} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <div className="w-40 text-sm font-medium truncate">{m.matiere}</div>
                              <div className="flex-1 h-2 bg-gray-200 rounded">
                                <div className={`h-2 rounded ${m.moyenne >= 14 ? 'bg-emerald-500' : m.moyenne >= 10 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${(m.moyenne / 20) * 100}%` }} />
                              </div>
                              <div className="text-xs font-semibold w-20 text-right">{m.moyenne.toFixed(2)}/20 · {m.nbNotes} note(s)</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="finances" className="space-y-4">
                    {!peutVoirFinances ? (
                      <p className="text-sm text-gray-500">Suivi financier réservé aux portails financiers (direction, comptabilité).</p>
                    ) : eleveEcheances.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded text-sm text-amber-700 space-y-1">
                        <div className="font-medium">Aucune échéance pour cet élève.</div>
                        <div className="text-xs">Les échéances naissent des frais de scolarité : définissez un <strong>frais rattaché au niveau de sa classe</strong> dans le module Finances, puis générez les échéances de la classe — le suivi (dû, payé, restant) s'affichera ici.</div>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          <div className="p-3 bg-gray-50 rounded text-center">
                            <div className="text-xs text-gray-500">Total dû</div>
                            <div className="text-lg font-semibold">{formatMontant(totalDu)}</div>
                          </div>
                          <div className="p-3 bg-emerald-50 rounded text-center">
                            <div className="text-xs text-emerald-700">Payé</div>
                            <div className="text-lg font-semibold text-emerald-700">{formatMontant(totalPaye)}</div>
                          </div>
                          <div className={`p-3 rounded text-center ${restantDu > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                            <div className={`text-xs ${restantDu > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Restant dû</div>
                            <div className={`text-lg font-semibold ${restantDu > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatMontant(restantDu)}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {eleveEcheances.map((e: any) => {
                            const net = e.montant - (e.remise ?? 0);
                            const paye = e.montantPaye ?? 0;
                            const eRestant = net - paye;
                            return (
                              <div key={e.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                  <div className="text-sm font-medium">{e.frais?.libelle ?? 'Échéance'}</div>
                                  <div className="text-xs text-gray-500">
                                    Échéance du {formatDate(e.dateEcheance)} · {formatMontant(net)}
                                    {e.remise > 0 && ` (remise ${formatMontant(e.remise)})`}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <StatusBadge statut={e.statut === 'payee' ? 'valide' : e.statut === 'partiel' ? 'en_attente' : 'absent'} />
                                  <div className="text-xs text-gray-500 mt-1">{eRestant > 0 ? `Reste ${formatMontant(eRestant)}` : 'Soldée'}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="identite" className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <dl className="space-y-1">
                          <InfoRow label="Nom complet" value={`${eleve.prenom} ${eleve.nom}`} />
                          <InfoRow label="Matricule" value={eleve.matricule} />
                          <InfoRow label="Date de naissance" value={formatDate(eleve.dateNaissance)} />
                          <InfoRow label="Lieu de naissance" value={eleve.lieuNaissance} />
                          <InfoRow label="Sexe" value={eleve.sexe} />
                          <InfoRow label="Statut" value={<StatusBadge statut={eleve.statut} />} />
                          <InfoRow label="Date d'inscription" value={formatDate(eleve.dateInscription)} />
                          <InfoRow label="Classe actuelle" value={classeEleve?.libelle} />
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Historique des classes</CardTitle></CardHeader>
                      <CardContent>
                        {eleveHistorique.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucun historique enregistré — première année dans l'établissement.</p>
                        ) : (
                          <div className="space-y-2">
                            {eleveHistorique.map((h: any) => (
                              <div key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                  <div className="text-sm font-medium">{classes.find((c: any) => c.id === h.classeId)?.libelle ?? h.classeId}</div>
                                  <div className="text-xs text-gray-500">{formatDate(h.dateEntree)} → {h.dateSortie ? formatDate(h.dateSortie) : 'en cours'}</div>
                                </div>
                                {h.motif && <Badge variant="outline" className="text-xs">{h.motif}</Badge>}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Dossier documentaire</CardTitle></CardHeader>
                      <CardContent>
                        {eleveDocuments.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucun document associé à cet élève.</p>
                        ) : (
                          <div className="space-y-2">
                            {eleveDocuments.map((d: any) => (
                              <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <div>
                                    <div className="text-sm font-medium">
                                      {d.type === 'acte_naissance' ? 'Acte de naissance' : d.type === 'certificat_medical' ? 'Certificat médical' : d.type === 'diplome' ? 'Diplôme' : d.type === 'cv' ? 'CV' : d.type}
                                    </div>
                                    <div className="text-xs text-gray-500">Ajouté le {formatDate(d.dateAjout)}</div>
                                  </div>
                                </div>
                                {d.confidentiel && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">Confidentiel</Badge>}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Consentements mineurs (Partie C.8)</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <ConsentementRow label="Portail élève activé" checked={eleve.consentementPortailEleve} date={eleve.consentementPortailEleveDate}
                          disabled={consentementFb.pending}
                          onActivate={() => consentementFb.run(() => actions.activerConsentementPortailEleve(eleve.id), 'Consentement portail élève activé.')} />
                        <ConsentementRow label="Photo interne autorisée" checked={eleve.consentementPhotoInterne} />
                        <ConsentementRow label="Photo externe autorisée" checked={eleve.consentementPhotoExterne} />
                        <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <div>
                            <div className="text-sm font-medium text-gray-700">Consentement image</div>
                            <div className="text-[10px] text-gray-400">
                              {dernierConsentementImage
                                ? `${dernierConsentementImage.accord ? 'Accordé' : 'Refusé'} · ${dernierConsentementImage.usage}${dernierConsentementImage.duree ? ` · ${dernierConsentementImage.duree}` : ''}${dernierConsentementImage.dateAccord ? ` · le ${formatDate(dernierConsentementImage.dateAccord)}` : ''}`
                                : 'Aucun consentement image enregistré'}
                            </div>
                          </div>
                          <ModalForm
                            trigger={<Button size="sm" variant="outline">Enregistrer</Button>}
                            title={`Consentement image — ${eleve.prenom} ${eleve.nom}`}
                            fields={[
                              { name: 'eleveId', type: 'hidden', label: 'Élève', defaultValue: eleve.id },
                              { name: 'accord', label: 'Accord du titulaire de l\'autorité parentale', type: 'checkbox' },
                              { name: 'usage', label: 'Usage', type: 'select', required: true, options: [
                                { value: 'site_web', label: 'Site web' },
                                { value: 'reseaux_sociaux', label: 'Réseaux sociaux' },
                                { value: 'plaquette', label: 'Plaquette' },
                                { value: 'presse', label: 'Presse' },
                                { value: 'exposition_interne', label: 'Exposition interne' },
                              ] },
                              { name: 'duree', label: 'Durée', placeholder: 'ex. annee_scolaire, perpetuel, campagne' },
                            ]}
                            defaultValues={{ eleveId: eleve.id }}
                            action={actions.enregistrerConsentementImage}
                          />
                        </div>
                        {consentementFb.Message}
                      </CardContent>
                    </Card>

                    {eleveIncidents.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Incidents disciplinaires</CardTitle></CardHeader>
                        <CardContent>
                          {eleveIncidents.map((i: any) => (
                            <div key={i.id} className="text-sm py-2 border-b border-gray-100 last:border-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{i.type}</span>
                                <StatusBadge statut={i.gravite} />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{i.description}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(i.dateHeure)} — {i.lieu}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="besoins" className="space-y-4">
                    <div className="flex justify-end">
                      <ModalForm
                        trigger={<CreateButton label="Déclarer un besoin" />}
                        title="Déclarer un besoin spécifique"
                        fields={[
                          { name: 'eleveId', type: 'text', label: 'ID élève', defaultValue: eleve.id },
                          { name: 'type', label: 'Type', type: 'select', options: [
                            { value: 'trouble_apprentissage', label: 'Trouble d\'apprentissage' },
                            { value: 'handicap_moteur', label: 'Handicap moteur' },
                            { value: 'deficit_visuel', label: 'Déficience visuelle' },
                            { value: 'auditif', label: 'Déficience auditive' },
                            { value: 'autre', label: 'Autre' },
                          ], required: true },
                          { name: 'description', label: 'Description', type: 'textarea', required: true },
                          { name: 'dateDiagnostic', label: 'Date diagnostic', type: 'date' },
                        ]}
                        action={actions.ajouterBesoinSpecifique}
                      />
                    </div>

                    {eleveBesoinSpec.length === 0 ? (
                      <EmptyState title="Aucun besoin spécifique déclaré" description="L'élève ne présente pas de besoin particulier déclaré." />
                    ) : (
                      eleveBesoinSpec.map((b: any) => (
                        <Card key={b.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-medium">{b.type}</div>
                                <p className="text-xs text-gray-600 mt-1">{b.description}</p>
                                {b.dateDiagnostic && <p className="text-[10px] text-gray-400 mt-1">Diagnosé le {formatDate(b.dateDiagnostic)}</p>}
                              </div>
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">Confidentiel</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium mb-2">Aménagements actifs</h4>
                      <div className="flex justify-end">
                        <ModalForm
                          trigger={<CreateButton label="Ajouter aménagement" />}
                          title="Ajouter un aménagement"
                          fields={[
                            { name: 'eleveId', type: 'text', label: 'ID élève', defaultValue: eleve.id },
                            ...(eleveBesoinSpec.length > 0 ? [{
                              name: 'besoinSpecifiqueId',
                              label: 'Besoin spécifique',
                              type: 'select' as const,
                              options: eleveBesoinSpec.map((b: any) => ({ value: b.id, label: b.type })),
                            }] : []),
                            { name: 'typeAmenagement', label: 'Type', type: 'select', options: [
                              { value: 'tiers_temps', label: 'Tiers-temps examen' },
                              { value: 'AVS', label: 'Accompagnant (AVS)' },
                              { value: 'materiel_adapte', label: 'Matériel adapté' },
                              { value: 'amenagement_pedagogique', label: 'Aménagement pédagogique' },
                            ], required: true },
                            { name: 'descriptionAmenagement', label: 'Description', type: 'textarea', required: true },
                            { name: 'dateDebut', label: 'Date de début', type: 'date', required: true },
                          ]}
                          action={actions.ajouterAmenagement}
                        />
                      </div>
                      {eleveAmenagements.length === 0 ? (
                        <p className="text-sm text-gray-500">Aucun aménagement en cours.</p>
                      ) : (
                        <div className="space-y-2">
                          {eleveAmenagements.map((a: any) => (
                            <div key={a.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded border border-emerald-200">
                              <div>
                                <div className="text-sm font-medium">{a.typeAmenagement}</div>
                                <p className="text-xs text-gray-600">{a.description}</p>
                                <p className="text-[10px] text-gray-400 mt-1">Depuis le {formatDate(a.dateDebut)}</p>
                              </div>
                              <StatusBadge statut="actif" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="manuels" className="space-y-4">
                    {eleveManuels.length === 0 ? (
                      <EmptyState title="Aucun manuel attribué" />
                    ) : (
                      <DataTable
                        columns={[
                          { key: 'manuel', label: 'Manuel', render: (a) => manuels.find((m: any) => m.id === a.manuelScolaireId)?.titre ?? '—' },
                          { key: 'etatRemise', label: 'Remis en' },
                          { key: 'statut', label: 'Statut', render: (a) => <StatusBadge statut={a.statut} /> },
                          { key: 'dateAttribution', label: 'Attribué le', render: (a) => formatDate(a.dateAttribution) },
                        ]}
                        rows={eleveManuels}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="securite" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Personnes autorisées à récupérer l'élève</CardTitle></CardHeader>
                      <CardContent>
                        {eleveAutorisations.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucune autorisation enregistrée.</p>
                        ) : (
                          <div className="space-y-2">
                            {eleveAutorisations.map((a: any) => (
                              <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                  <div className="text-sm font-medium">{a.nomPersonneAutorisee}</div>
                                  <div className="text-xs text-gray-500">{a.lienAvecEleve} · {a.telephone}</div>
                                </div>
                                <StatusBadge statut={a.active ? 'actif' : 'resilie'} />
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {eleveIncidents.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Sorties anticipées enregistrées</CardTitle></CardHeader>
                        <CardContent className="text-sm text-gray-500">
                          {sortiesAnticipees.filter((s: any) => s.eleveId === eleve.id).length === 0
                            ? "Aucune sortie anticipée pour cet élève."
                            : `${sortiesAnticipees.filter((s: any) => s.eleveId === eleve.id).length} sortie(s) enregistrée(s).`}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>
          ) : null}

          <SectionBlock
            title={eleve ? `Fiche élève — ${eleve.prenom} ${eleve.nom}` : 'Sélectionnez un élève'}
            description={eleve ? `${eleve.matricule} · ${classeEleve?.libelle}` : 'Cliquez sur un élève dans la liste pour afficher sa fiche complète.'}
          >
            {eleve ? (
              <div className="space-y-3">
                <div className="overflow-x-auto grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Naissance</div><div className="text-sm font-medium">{formatDate(eleve.dateNaissance)}</div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Statut</div><div><StatusBadge statut={eleve.statut} /></div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Portail élève</div><div>{eleve.consentementPortailEleve ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Activé</Badge> : <Badge variant="outline" className="bg-amber-50 text-amber-700">En attente</Badge>}</div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Besoins</div><div className="text-sm font-medium">{eleveBesoinSpec.length > 0 ? `${eleveBesoinSpec.length} déclaré(s)` : 'Aucun'}</div></CardContent></Card>
                </div>

                <div className="overflow-x-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-gray-500 mb-1">Aménagements actifs</div>
                      {eleveAmenagements.length === 0 ? <div className="text-sm text-gray-400">Aucun</div> : (
                        <div className="space-y-1">{eleveAmenagements.map((a: any) => <div key={a.id} className="text-sm">{a.typeAmenagement}</div>)}</div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-gray-500 mb-1">Manuels en prêt</div>
                      <div className="text-sm font-medium">{eleveManuels.length} manuel(s)</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}><Eye className="h-4 w-4 mr-1" /> Voir la fiche complète</Button>
                  <ModalForm
                    trigger={<Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" /> Modifier</Button>}
                    title={`Modifier — ${eleve.prenom} ${eleve.nom}`}
                    fields={[
                      { name: 'eleveId', type: 'hidden', label: 'Élève', defaultValue: eleve.id },
                      { name: 'nom', label: 'Nom', required: true },
                      { name: 'prenom', label: 'Prénom', required: true },
                      { name: 'dateNaissance', label: 'Date de naissance', type: 'date', required: true },
                      { name: 'lieuNaissance', label: 'Lieu de naissance' },
                      { name: 'sexe', label: 'Sexe', type: 'select', required: true, options: [{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }] },
                    ]}
                    defaultValues={{
                      eleveId: eleve.id,
                      nom: eleve.nom,
                      prenom: eleve.prenom,
                      dateNaissance: eleve.dateNaissance ? String(eleve.dateNaissance).slice(0, 10) : '',
                      lieuNaissance: eleve.lieuNaissance ?? '',
                      sexe: eleve.sexe,
                    }}
                    action={actions.modifierEleve}
                  />
                  <ModalForm
                    trigger={<Button variant="outline" size="sm"><ArrowRightLeft className="h-4 w-4 mr-1" /> Changer de classe</Button>}
                    title={`Changer de classe — ${eleve.prenom} ${eleve.nom}`}
                    fields={[
                      { name: 'classeId', label: 'Nouvelle classe', type: 'select', required: true, options: classes.filter((c: any) => c.id !== eleve.classeActuelleId).map((c: any) => ({ value: c.id, label: c.libelle })) },
                      { name: 'motif', label: 'Motif du changement', type: 'textarea' },
                    ]}
                    action={(fd) => actions.transfererClasse(eleve.id, String(fd.get('classeId')), String(fd.get('motif') || ''))}
                  />
                  <ModalForm
                    trigger={<Button variant="outline" size="sm"><DoorOpen className="h-4 w-4 mr-1" /> Statut / Sortie</Button>}
                    title={`Changer le statut — ${eleve.prenom} ${eleve.nom}`}
                    fields={[
                      { name: 'eleveId', type: 'hidden', label: 'Élève', defaultValue: eleve.id },
                      { name: 'statut', label: 'Nouveau statut', type: 'select', required: true, options: [
                        { value: 'actif', label: 'Actif' },
                        { value: 'diplome', label: 'Diplômé' },
                        { value: 'transfere', label: 'Transféré' },
                        { value: 'exclu', label: 'Exclu' },
                        { value: 'sorti', label: 'Sorti' },
                      ] },
                      { name: 'dateSortie', label: 'Date de sortie', type: 'date' },
                      { name: 'motif', label: 'Motif', type: 'textarea' },
                    ]}
                    defaultValues={{ eleveId: eleve.id, statut: eleve.statut }}
                    action={actions.changerStatutEleve}
                  />
                  <ModalForm
                    trigger={<Button variant="outline" size="sm"><UserPlus className="h-4 w-4 mr-1" /> Rattacher un parent</Button>}
                    title={`Rattacher un parent — ${eleve.prenom} ${eleve.nom}`}
                    fields={[
                      { name: 'eleveId', type: 'hidden', label: 'Élève', defaultValue: eleve.id },
                      { name: 'parentId', label: 'Parent existant (optionnel — laisser vide pour créer)', type: 'select', options: parents.map((p: any) => ({ value: p.id, label: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || p.id })) },
                      { name: 'nom', label: 'Nom (nouveau parent)' },
                      { name: 'prenom', label: 'Prénom (nouveau parent)' },
                      { name: 'telephone', label: 'Téléphone' },
                      { name: 'email', label: 'Email' },
                      { name: 'profession', label: 'Profession' },
                      { name: 'lienAvecEleve', label: 'Lien avec l\'élève', type: 'select', required: true, options: [
                        { value: 'pere', label: 'Père' },
                        { value: 'mere', label: 'Mère' },
                        { value: 'tuteur_legal', label: 'Tuteur légal' },
                      ] },
                    ]}
                    defaultValues={{ eleveId: eleve.id }}
                    action={actions.rattacherParent}
                  />
                  <ModalForm
                    trigger={<Button variant="outline" size="sm"><Accessibility className="h-4 w-4 mr-1" /> Déclarer un besoin</Button>}
                    title={`Déclarer un besoin spécifique — ${eleve.prenom} ${eleve.nom}`}
                    fields={[
                      { name: 'eleveId', type: 'text', label: 'ID élève', defaultValue: eleve.id },
                      { name: 'type', label: 'Type', type: 'select', options: [
                        { value: 'trouble_apprentissage', label: 'Trouble d\'apprentissage' },
                        { value: 'handicap_moteur', label: 'Handicap moteur' },
                        { value: 'deficit_visuel', label: 'Déficience visuelle' },
                        { value: 'auditif', label: 'Déficience auditive' },
                        { value: 'autre', label: 'Autre' },
                      ], required: true },
                      { name: 'description', label: 'Description', type: 'textarea', required: true },
                      { name: 'dateDiagnostic', label: 'Date diagnostic', type: 'date' },
                    ]}
                    action={actions.ajouterBesoinSpecifique}
                  />
                  {!eleve.consentementPortailEleve && (
                    <Button variant="outline" size="sm" disabled={consentementFb.pending}
                      onClick={() => consentementFb.run(() => actions.activerConsentementPortailEleve(eleve.id), 'Consentement portail élève activé.')}>
                      <Shield className="h-4 w-4 mr-1" /> Activer consentement portail élève
                    </Button>
                  )}
                </div>
                {consentementFb.Message}
              </div>
            ) : (
              <EmptyState title="Aucun élève sélectionné" description="Sélectionnez un élève dans la liste à gauche." />
            )}
          </SectionBlock>

          {eleve && accesRgpd && (
            <SectionBlock
              title="RGPD — données de l'élève"
              description="Portabilité (art. 20) et droit à l'effacement (art. 17) pour l'élève sélectionné. Toute opération est journalisée."
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={rgpdFb.pending}
                  onClick={() => rgpdFb.run(async () => {
                    const r = await actions.exporterDonneesEleve(eleve.id);
                    if (r?.ok && r.json) {
                      const blob = new Blob([String(r.json)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'export-eleve.json';
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                    return r;
                  }, 'Export généré et téléchargé.')}
                >
                  <Download className="h-4 w-4 mr-1" /> Exporter les données (JSON)
                </Button>
                <ModalForm
                  trigger={<Button variant="outline" size="sm"><Trash2 className="h-4 w-4 mr-1" /> Demander l'effacement</Button>}
                  title={`Demander l'effacement — ${eleve.prenom} ${eleve.nom}`}
                  fields={[
                    { name: 'eleveId', type: 'hidden', label: 'Élève', defaultValue: eleve.id },
                    { name: 'motif', label: 'Motif', type: 'select', required: true, options: [
                      { value: 'droit_effacement', label: "Droit à l'effacement (art. 17)" },
                      { value: 'obligation_legale', label: 'Obligation légale' },
                      { value: 'demande_sujet', label: 'Demande du sujet (parent pour mineur)' },
                    ] },
                    { name: 'description', label: 'Description', type: 'textarea' },
                  ]}
                  defaultValues={{ eleveId: eleve.id }}
                  action={actions.demanderEffacement}
                />

              {!eleve.utilisateurId ? (
                <ModalForm
                  title={`Créer le compte portail — ${eleve.prenom} ${eleve.nom}`}
                  trigger={<Button variant="outline" size="sm"><KeyRound className="h-4 w-4 mr-1" /> Créer le compte élève</Button>}
                  fields={[
                    { name: 'eleveId', label: 'Élève', type: 'hidden', defaultValue: eleve.id },
                    { name: 'email', label: "Email de l'élève", type: 'email', required: true },
                    { name: 'motDePasse', label: 'Mot de passe initial (min 8)', type: 'password', required: true },
                  ]}
                  action={ext.creerCompteEleve}
                />
              ) : (
                <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">Compte portail actif</span>
              )}
              </div>
              <div className="mt-3">{rgpdFb.Message}</div>
            </SectionBlock>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsentementRow({ label, checked, date, onActivate, disabled }: { label: string; checked: boolean; date?: any; onActivate?: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {date && <div className="text-[10px] text-gray-400">Activé le {formatDate(date)}</div>}
      </div>
      {checked ? (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">✓ Activé</Badge>
      ) : onActivate ? (
        <Button size="sm" variant="outline" onClick={onActivate} disabled={disabled}>Activer</Button>
      ) : (
        <Badge variant="outline" className="bg-gray-100 text-gray-700">Non activé</Badge>
      )}
    </div>
  );
}
