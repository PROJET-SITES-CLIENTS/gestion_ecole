'use client';

// ====================================================================
// PORTAILS MÉTIERS — un tableau de bord dédié par poste de l'école.
// Chaque intervenant se connecte et voit SON périmètre, en direct :
//   • comptabilite  : encaissements, retards, dépenses, budgets
//   • rh            : effectifs, congés, paie, évaluations
//   • vie_scolaire  : absents du jour, APPEL NON FAIT, incidents,
//                     sorties anticipées, visiteurs (censeur/surveillant)
//   • secretariat   : élèves, candidatures, RDV, réunions
//   • sante         : passages infirmerie, vaccinations, fiches santé
//   • assistant     : vue synthétique d'appui à la direction
// Hydratation : `now` null au premier rendu, matérialisé au montage.
// ====================================================================

import { useEffect, useState } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, AlertTriangle, UserCheck, ClipboardList,
  GraduationCap, HeartPulse, CalendarDays, FileCheck, Users, Bell, Stethoscope,
  CheckCircle2, Clock, PiggyBank, Award, Shield, Activity,
} from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock } from '@/components/shared-ui';
import { formatMontant, formatDate, formatDateTime } from '@/lib/format';
import { toJour, toMois, nomComplet, etatAppels, joursEntre } from '@/lib/cockpit';

type PortailMetier = 'comptabilite' | 'rh' | 'vie_scolaire' | 'secretariat' | 'sante' | 'assistant';

const TITRES: Record<PortailMetier, { titre: string; sous: string }> = {
  comptabilite: { titre: 'Cockpit Comptabilité', sous: 'Encaissements, recouvrement, dépenses et budgets de l\'école' },
  rh: { titre: 'Cockpit Ressources Humaines', sous: 'Effectifs, congés, paie et évaluations du personnel' },
  vie_scolaire: { titre: 'Cockpit Vie Scolaire & Surveillance', sous: 'Absences du jour, appel, incidents, sorties et visiteurs' },
  secretariat: { titre: 'Cockpit Secrétariat', sous: 'Élèves, candidatures, rendez-vous et réunions' },
  sante: { titre: 'Cockpit Infirmerie & Santé', sous: 'Passages, urgences, vaccinations et fiches santé' },
  assistant: { titre: 'Cockpit Assistant de Direction', sous: 'Vue synthétique d\'appui à la direction' },
};

export default function PortailMetiers({ initialData, portal }: { initialData: any; portal: PortailMetier }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const ecole = initialData.ecole ?? {};
  const devise = ecole.devise ?? 'XOF';
  const eleves = initialData.eleves ?? [];
  const personnels = initialData.personnels ?? [];
  const classes = initialData.classes ?? [];
  const niveaux = initialData.niveaux ?? [];
  const echeances = initialData.echeances ?? [];
  const paiements = initialData.paiements ?? [];
  const depenses = initialData.depenses ?? [];
  const budgets = initialData.budgets ?? [];
  const conges = initialData.conges ?? [];
  const bulletinsPaie = initialData.bulletinsPaie ?? [];
  const evaluationsRh = initialData.evaluationsRh ?? [];
  const seances = initialData.seances ?? [];
  const presences = initialData.presences ?? [];
  const incidents = initialData.incidents ?? [];
  const sanctions = initialData.sanctions ?? [];
  const visiteurs = initialData.visiteurs ?? [];
  const sortiesAnticipees = initialData.sortiesAnticipees ?? [];
  const candidatures = initialData.candidaturesAdmission ?? [];
  const creneauxRdv = initialData.creneauxRdv ?? [];
  const rdvs = initialData.rdvs ?? [];
  const reunions = initialData.reunionsCollectives ?? [];
  const fichesSante = initialData.fichesSante ?? [];
  const passagesInfirmerie = initialData.passagesInfirmerie ?? [];
  const vaccinations = initialData.vaccinations ?? [];
  const notifications = initialData.notifications ?? [];
  const personnelsRoles = initialData.personnelRoles ?? [];

  const eleveById: Map<string, any> = new Map(eleves.map((e: any) => [e.id, e]));
  const personnelById: Map<string, any> = new Map(personnels.map((p: any) => [p.id, p]));
  const classeById: Map<string, any> = new Map(classes.map((c: any) => [c.id, c]));
  const niveauById: Map<string, any> = new Map(niveaux.map((n: any) => [n.id, n]));
  const creneauById: Map<string, any> = new Map(creneauxRdv.map((c: any) => [c.id, c]));
  const seanceById: Map<string, any> = new Map(seances.map((s: any) => [s.id, s]));

  const classeDeEleve = (eleveId: any) => {
    const e = eleveById.get(eleveId);
    return e ? classeById.get(e.classeActuelleId)?.code ?? '—' : '—';
  };

  // Date de référence : aujourd'hui après montage, dernier relevé en SSR
  const dernierReleve = seances.length ? new Date(Math.max(...seances.map((s: any) => new Date(s.date).getTime()))) : null;
  const refDate = now ?? dernierReleve;
  const jourActif = refDate ? toJour(refDate) : null;
  const estAujourdhui = now != null && jourActif != null && toJour(now) === jourActif;
  const moisActif = refDate ? toMois(refDate) : null;

  // Appel / anti-oubli
  const appels = jourActif ? etatAppels(classes, seances, presences, jourActif) : null;
  const seancesJour = jourActif ? seances.filter((s: any) => toJour(s.date) === jourActif) : [];
  const presencesJour = presences.filter((p: any) => {
    const s = seanceById.get(p.seanceId);
    return s && toJour(s.date) === jourActif;
  });
  const absentsJour = presencesJour.filter((p: any) => p.statut === 'absent');
  const presentsJour = presencesJour.filter((p: any) => p.statut === 'present');
  const retardsJour = presencesJour.filter((p: any) => p.statut === 'retard');

  const meta = TITRES[portal];

  // ============================ COMPTABILITÉ ============================
  if (portal === 'comptabilite') {
    const encaisseMois = paiements.filter((p: any) => moisActif && toMois(p.datePaiement) === moisActif).reduce((s: number, p: any) => s + p.montant, 0);
    const depensesMois = depenses.filter((d: any) => moisActif && toMois(d.dateDepense) === moisActif).reduce((s: number, d: any) => s + d.montant, 0);
    const aValider = depenses.filter((d: any) => !d.validee);
    const retardataires = refDate
      ? echeances
          .filter((e: any) => (e.statut === 'impayee' || e.statut === 'partiel') && new Date(e.dateEcheance) < refDate)
          .map((e: any) => ({
            id: e.id,
            eleve: nomComplet(eleveById.get(e.eleveId)),
            classe: classeDeEleve(e.eleveId),
            restant: (e.montant ?? 0) - (e.montantPaye ?? 0),
            jours: Math.max(1, joursEntre(new Date(e.dateEcheance), refDate)),
            statut: e.statut,
          }))
          .sort((a: any, b: any) => b.jours - a.jours)
      : [];
    const restantDu = echeances.filter((e: any) => e.statut !== 'annulee').reduce((s: number, e: any) => s + (e.montant ?? 0) - (e.montantPaye ?? 0), 0);
    const budgetLignes = budgets.flatMap((b: any) => (b.lignes ?? []).map((l: any) => ({ ...l, budget: b.libelle })));

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <PageHeader title={meta.titre} subtitle={`${meta.sous} · Année ${initialData.anneeScolaire?.libelle ?? '—'}`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard title={`Encaissé ${moisActif ?? '—'}`} value={formatMontant(encaisseMois, devise)} sub={`${paiements.length} paiements au total`} icon={TrendingUp} color="emerald" />
          <StatCard title={`Dépenses ${moisActif ?? '—'}`} value={formatMontant(depensesMois, devise)} sub={aValider.length ? `${aValider.length} à valider` : 'toutes validées'} icon={TrendingDown} color="amber" />
          <StatCard title="Restant dû scolarité" value={formatMontant(restantDu, devise)} sub={`${retardataires.length} échéance(s) en retard`} icon={PiggyBank} color={retardataires.length ? 'rose' : 'emerald'} />
          <StatCard title="Solde du mois" value={formatMontant(encaisseMois - depensesMois, devise)} sub="recettes − dépenses" icon={Wallet} color={encaisseMois - depensesMois >= 0 ? 'emerald' : 'rose'} />
        </div>
        <SectionBlock title="Retards de paiement — à relancer" description="Trié par ancienneté de retard">
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève' },
              { key: 'classe', label: 'Classe' },
              { key: 'restant', label: 'Restant dû', render: (r) => <span className="font-semibold text-rose-700">{formatMontant(r.restant, devise)}</span> },
              { key: 'jours', label: 'Retard', render: (r) => `${r.jours} j` },
              { key: 'statut', label: 'Statut', render: (r) => <StatusBadge statut={r.statut} /> },
            ]}
            rows={retardataires}
            emptyLabel="Aucun retard — toutes les échéances échues sont couvertes"
          />
        </SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionBlock title="Derniers paiements encaissés" description="Activité de caisse">
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (p) => nomComplet(eleveById.get(p.eleveId)) },
                { key: 'montant', label: 'Montant', render: (p) => formatMontant(p.montant, p.devise ?? devise) },
                { key: 'modePaiement', label: 'Mode' },
                { key: 'datePaiement', label: 'Date', render: (p) => formatDate(p.datePaiement) },
              ]}
              rows={paiements.slice(0, 8)}
              emptyLabel="Aucun paiement"
            />
          </SectionBlock>
          <SectionBlock title="Suivi budgétaire" description={`${budgetLignes.length} ligne(s)`}>
            <DataTable
              columns={[
                { key: 'budget', label: 'Budget' },
                { key: 'libelle', label: 'Ligne' },
                { key: 'montantPrevu', label: 'Prévu', render: (l) => formatMontant(l.montantPrevu, devise) },
                { key: 'montantRealise', label: 'Réalisé', render: (l) => formatMontant(l.montantRealise, devise) },
              ]}
              rows={budgetLignes}
              emptyLabel="Aucun budget"
            />
          </SectionBlock>
        </div>
        <SectionBlock title="Dépenses récentes" description={`${aValider.length} en attente de validation`}>
          <DataTable
            columns={[
              { key: 'categorie', label: 'Catégorie' },
              { key: 'description', label: 'Description' },
              { key: 'montant', label: 'Montant', render: (d) => formatMontant(d.montant, d.devise ?? devise) },
              { key: 'validee', label: 'Validée', render: (d) => <StatusBadge statut={d.validee ? 'valide' : 'en_attente'} label={d.validee ? 'Validée' : 'À valider'} /> },
              { key: 'dateDepense', label: 'Date', render: (d) => formatDate(d.dateDepense) },
            ]}
            rows={depenses.slice(0, 10)}
            emptyLabel="Aucune dépense"
          />
        </SectionBlock>
      </div>
    );
  }

  // ============================ RH ============================
  if (portal === 'rh') {
    const actifs = personnels.filter((p: any) => p.statut === 'actif');
    const aValider = conges.filter((c: any) => c.statut === 'demande');
    const enCours = refDate ? conges.filter((c: any) => c.statut === 'accepte' && new Date(c.dateDebut) <= refDate && refDate <= new Date(c.dateFin)) : [];
    const masseSalariale = bulletinsPaie.filter((b: any) => b.periode === moisActif).reduce((s: number, b: any) => s + (b.netAPayer ?? 0), 0);
    const parContrat = new Map<string, number>();
    actifs.forEach((p: any) => parContrat.set(p.typeContrat ?? 'non précisé', (parContrat.get(p.typeContrat ?? 'non précisé') ?? 0) + 1));
    const derniersPaies = [...bulletinsPaie].sort((a: any, b: any) => (b.periode ?? '').localeCompare(a.periode ?? ''));

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <PageHeader title={meta.titre} subtitle={`${meta.sous} · ${actifs.length} personnels actifs`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard title="Effectif actif" value={actifs.length} sub={`${personnels.length} au total`} icon={Users} color="emerald" />
          <StatCard title="Congés à valider" value={aValider.length} sub="demandes en attente" icon={ClipboardList} color={aValider.length ? 'amber' : 'gray'} />
          <StatCard title="En congé" value={enCours.length} sub="actuellement absents" icon={CalendarDays} color="blue" />
          <StatCard title="Masse salariale" value={formatMontant(masseSalariale, devise)} sub={moisActif ?? '—'} icon={Wallet} color="purple" />
        </div>
        <SectionBlock title="Congés — validations en attente" description="À traiter depuis le module Personnel">
          <DataTable
            columns={[
              { key: 'personnel', label: 'Personnel', render: (c) => nomComplet(personnelById.get(c.personnelId)) },
              { key: 'type', label: 'Type' },
              { key: 'dateDebut', label: 'Du', render: (c) => formatDate(c.dateDebut) },
              { key: 'dateFin', label: 'Au', render: (c) => formatDate(c.dateFin) },
              { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} /> },
              { key: 'motif', label: 'Motif', render: (c) => c.motif ?? '—' },
            ]}
            rows={[...aValider, ...enCours]}
            emptyLabel="Aucun congé à traiter"
          />
        </SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionBlock title="Bulletins de paie" description={`${bulletinsPaie.length} bulletin(s)`}>
            <DataTable
              columns={[
                { key: 'personnel', label: 'Personnel', render: (b) => nomComplet(personnelById.get(b.personnelId)) },
                { key: 'periode', label: 'Période' },
                { key: 'netAPayer', label: 'Net à payer', render: (b) => <span className="font-semibold">{formatMontant(b.netAPayer, devise)}</span> },
                { key: 'statut', label: 'Statut', render: (b) => <StatusBadge statut={b.statut} /> },
              ]}
              rows={derniersPaies.slice(0, 8)}
              emptyLabel="Aucun bulletin de paie"
            />
          </SectionBlock>
          <SectionBlock title="Évaluations du personnel" description="Évaluations enregistrées">
            <DataTable
              columns={[
                { key: 'personnel', label: 'Personnel', render: (e) => nomComplet(personnelById.get(e.personnelId)) },
                { key: 'periode', label: 'Période' },
                { key: 'commentaireGlobal', label: 'Commentaire', render: (e) => e.commentaireGlobal ?? '—' },
              ]}
              rows={evaluationsRh.slice(0, 6)}
              emptyLabel="Aucune évaluation enregistrée"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[...parContrat.entries()].map(([t, n]) => (
                <span key={t} className="inline-flex items-center rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-700">{n} {t}</span>
              ))}
            </div>
          </SectionBlock>
        </div>
      </div>
    );
  }

  // ============================ VIE SCOLAIRE (censeur / surveillant) ============================
  if (portal === 'vie_scolaire') {
    const visiteursPresents = visiteurs.filter((v: any) => !v.dateHeureSortie);
    const sortiesDuJour = jourActif ? sortiesAnticipees.filter((s: any) => toJour(s.dateSortie) === jourActif || toJour(s.date) === jourActif) : [];
    const incidentsRecents = [...incidents].sort((a: any, b: any) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime());
    const taux = presencesJour.length ? Math.round(presentsJour.length / presencesJour.length * 100) : null;

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <PageHeader title={meta.titre} subtitle={`${meta.sous} · ${jourActif ? formatDate(jourActif) : '—'}`} />
        {appels && appels.manquants.length > 0 && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-rose-900">Appel non fait — {appels.manquants.length} classe(s) concernée(s)</h3>
              <p className="text-xs text-rose-700 mt-1">
                {appels.manquants.map((m: any) => `${m.code} (${m.nbSeances} séance(s))`).join(' · ')} — aucun pointage de présence relevé {estAujourdhui ? "aujourd'hui" : 'sur le dernier relevé'}. Relancez l'enseignant ou le titulaire.
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard title="Présents" value={presentsJour.length} sub={`${seancesJour.length} séance(s) · ${presencesJour.length} pointages`} icon={UserCheck} color="emerald" />
          <StatCard title="Absents" value={absentsJour.length} sub={`${retardsJour.length} retard(s)`} icon={AlertTriangle} color={absentsJour.length ? 'rose' : 'gray'} />
          <StatCard title="Appel non fait" value={appels?.manquants.length ?? 0} sub={appels?.appelees.length ? `${appels.appelees.length} classe(s) appelée(s)` : 'aucune classe appelée'} icon={ClipboardList} color={appels?.manquants.length ? 'rose' : 'emerald'} />
          <StatCard title="Visiteurs sur site" value={visiteursPresents.length} sub="entrés non sortis" icon={Shield} color="blue" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionBlock title={`Absents ${estAujourdhui ? "du jour" : 'du dernier relevé'}`} description={taux != null ? `Taux de présence : ${taux}%` : 'Aucun pointage'}>
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (p) => nomComplet(eleveById.get(p.eleveId)) },
                { key: 'classe', label: 'Classe', render: (p) => classeDeEleve(p.eleveId) },
                { key: 'statut', label: 'Statut', render: (p) => <StatusBadge statut={p.statut} /> },
                { key: 'motif', label: 'Motif', render: (p) => p.motifAbsence ?? '—' },
              ]}
              rows={[...absentsJour, ...retardsJour]}
              emptyLabel="Aucune absence ni retard"
            />
          </SectionBlock>
          <SectionBlock title="Incidents récents" description="Vie scolaire — discipline">
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (i) => nomComplet(eleveById.get(i.eleveId)) },
                { key: 'type', label: 'Type' },
                { key: 'gravite', label: 'Gravité', render: (i) => <StatusBadge statut={i.gravite} /> },
                { key: 'dateHeure', label: 'Date', render: (i) => formatDateTime(i.dateHeure) },
              ]}
              rows={incidentsRecents.slice(0, 8)}
              emptyLabel="Aucun incident"
            />
          </SectionBlock>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionBlock title="Sorties anticipées" description="Mineurs sortis avant l'heure">
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (s) => nomComplet(eleveById.get(s.eleveId)) },
                { key: 'recupereParNom', label: 'Récupéré par' },
                { key: 'validationExceptionnelle', label: 'Autorisation', render: (s) => s.validationExceptionnelle ? <StatusBadge statut="exception" label="Exception motivée" /> : <StatusBadge statut="valide" label="Autorisation vérifiée" /> },
                { key: 'dateSortie', label: 'Sortie', render: (s) => formatDateTime(s.dateSortie) },
              ]}
              rows={sortiesDuJour.length ? sortiesDuJour : sortiesAnticipees.slice(0, 6)}
              emptyLabel="Aucune sortie anticipée"
            />
          </SectionBlock>
          <SectionBlock title="Registre des visiteurs" description={`${visiteursPresents.length} présent(s) sur site`}>
            <DataTable
              columns={[
                { key: 'nom', label: 'Visiteur' },
                { key: 'motifVisite', label: 'Motif' },
                { key: 'pieceIdentiteVerifiee', label: 'Pièce', render: (v) => <StatusBadge statut={v.pieceIdentiteVerifiee ? 'valide' : 'en_attente'} label={v.pieceIdentiteVerifiee ? 'Vérifiée' : 'Non vérifiée'} /> },
                { key: 'dateHeureEntree', label: 'Entrée', render: (v) => formatDateTime(v.dateHeureEntree) },
                { key: 'dateHeureSortie', label: 'Sortie', render: (v) => v.dateHeureSortie ? formatDateTime(v.dateHeureSortie) : <span className="text-emerald-700 font-medium">sur site</span> },
              ]}
              rows={visiteurs.slice(0, 8)}
              emptyLabel="Aucun visiteur"
            />
          </SectionBlock>
        </div>
        {sanctions.length > 0 && (
          <SectionBlock title="Sanctions en cours" description="Mesures disciplinaires">
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (s) => nomComplet(eleveById.get(s.eleveId)) },
                { key: 'type', label: 'Type' },
                { key: 'motif', label: 'Motif', render: (s) => s.motif ?? '—' },
                { key: 'dateDebut', label: 'Début', render: (s) => formatDate(s.dateDebut) },
              ]}
              rows={sanctions.slice(0, 8)}
              emptyLabel="Aucune sanction"
            />
          </SectionBlock>
        )}
      </div>
    );
  }

  // ============================ SECRÉTARIAT ============================
  if (portal === 'secretariat') {
    const candidaturesEnCours = candidatures.filter((c: any) => ['soumis', 'test', 'entretien'].includes(c.statut));
    const rdvsAVenir = rdvs.filter((r: any) => {
      const c = creneauById.get(r.creneauRdvId);
      return c && new Date(c.date) >= (refDate ?? new Date()) && r.statut !== 'annule';
    });
    const reunionsAVenir = reunions
      .filter((r: any) => new Date(r.date) >= (refDate ?? new Date()))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const elevesActifs = eleves.filter((e: any) => e.statut === 'actif');
    const documents = initialData.documents ?? [];

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <PageHeader title={meta.titre} subtitle={`${meta.sous} · Année ${initialData.anneeScolaire?.libelle ?? '—'}`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard title="Élèves actifs" value={elevesActifs.length} sub={`${classes.length} classes`} icon={Users} color="emerald" />
          <StatCard title="Candidatures en cours" value={candidaturesEnCours.length} sub={`${candidatures.length} au total`} icon={FileCheck} color={candidaturesEnCours.length ? 'amber' : 'gray'} />
          <StatCard title="RDV à venir" value={rdvsAVenir.length} sub="parents-enseignants" icon={CalendarDays} color="blue" />
          <StatCard title="Réunions prévues" value={reunionsAVenir.length} sub="collectives" icon={CalendarDays} color="purple" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionBlock title="Candidatures / admissions" description="Pipeline d'inscriptions">
            <DataTable
              columns={[
                { key: 'candidat', label: 'Candidat', render: (c) => `${c.prenom} ${c.nom}` },
                { key: 'niveau', label: 'Niveau', render: (c) => niveauById.get(c.niveauId)?.libelle ?? '—' },
                { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} /> },
                { key: 'dateSoumission', label: 'Soumis le', render: (c) => formatDate(c.dateSoumission) },
              ]}
              rows={candidatures.slice(0, 8)}
              emptyLabel="Aucune candidature"
            />
          </SectionBlock>
          <SectionBlock title="Rendez-vous parents-enseignants" description="Créneaux réservés">
            <DataTable
              columns={[
                { key: 'parent', label: 'Parent', render: (r) => {
                  const p = (initialData.parents ?? []).find((x: any) => x.id === r.parentId);
                  return p ? `${p.prenom ?? ''} ${p.nom ?? ''}` : '—';
                } },
                { key: 'eleve', label: 'Élève', render: (r) => nomComplet(eleveById.get(r.eleveId)) },
                { key: 'creneau', label: 'Créneau', render: (r) => {
                  const c = creneauById.get(r.creneauRdvId);
                  return c ? `${formatDate(c.date)} ${c.heureDebut}` : '—';
                } },
                { key: 'statut', label: 'Statut', render: (r) => <StatusBadge statut={r.statut} /> },
              ]}
              rows={rdvs.slice(0, 8)}
              emptyLabel="Aucun rendez-vous"
            />
          </SectionBlock>
        </div>
        <SectionBlock title="Réunions collectives" description="Conseils et rencontres prévues">
          <DataTable
            columns={[
              { key: 'classe', label: 'Classe', render: (r) => classeById.get(r.classeId)?.code ?? '—' },
              { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
              { key: 'heure', label: 'Heure' },
              { key: 'lieu', label: 'Lieu' },
              { key: 'description', label: 'Description', render: (r) => r.description ?? '—' },
            ]}
            rows={reunions}
            emptyLabel="Aucune réunion planifiée"
          />
        </SectionBlock>
        <SectionBlock title="Derniers documents élèves" description={`${documents.length} document(s)`}>
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (d) => nomComplet(eleveById.get(d.eleveId)) },
              { key: 'type', label: 'Type' },
              { key: 'confidentiel', label: 'Confidentiel', render: (d) => d.confidentiel ? <StatusBadge statut="confidentiel" label="Confidentiel" /> : <StatusBadge statut="valide" label="Standard" /> },
            ]}
            rows={documents.slice(0, 8)}
            emptyLabel="Aucun document"
          />
        </SectionBlock>
      </div>
    );
  }

  // ============================ SANTÉ / INFIRMERIE ============================
  if (portal === 'sante') {
    const passagesJour = jourActif ? passagesInfirmerie.filter((p: any) => toJour(p.datePassage) === jourActif) : [];
    const urgences = passagesInfirmerie.filter((p: any) => p.issue === 'depart_hopital' || p.issue === 'retour_domicile');
    const vaccinsARappeler = vaccinations.filter((v: any) => v.dateRappel && new Date(v.dateRappel) <= (refDate ?? new Date()));
    const fichesIncompletes = eleves.filter((e: any) => {
      const f = fichesSante.find((x: any) => x.eleveId === e.id);
      return !f || !f.contactUrgenceNom || !f.telephoneUrgence;
    });
    const derniersPassages = [...passagesInfirmerie].sort((a: any, b: any) => new Date(b.datePassage).getTime() - new Date(a.datePassage).getTime());

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <PageHeader title={meta.titre} subtitle={`${meta.sous} · ${passagesInfirmerie.length} passage(s) au total`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard title={`Passages ${estAujourdhui ? "du jour" : 'dernier relevé'}`} value={passagesJour.length} sub={jourActif ? formatDate(jourActif) : '—'} icon={Stethoscope} color="blue" />
          <StatCard title="Issues graves" value={urgences.length} sub="départs hôpital/domicile" icon={AlertTriangle} color={urgences.length ? 'rose' : 'gray'} />
          <StatCard title="Rappels vaccins" value={vaccinsARappeler.length} sub="dates dépassées" icon={HeartPulse} color={vaccinsARappeler.length ? 'amber' : 'emerald'} />
          <StatCard title="Fiches incomplètes" value={fichesIncompletes.length} sub="contacts d'urgence manquants" icon={ClipboardList} color={fichesIncompletes.length ? 'amber' : 'emerald'} />
        </div>
        <SectionBlock title="Passages à l'infirmerie" description="Du plus récent au plus ancien">
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (p) => nomComplet(eleveById.get(p.eleveId)) },
              { key: 'motif', label: 'Motif' },
              { key: 'temperature', label: 'Temp.', render: (p) => p.temperature != null ? `${p.temperature}°C` : '—' },
              { key: 'issue', label: 'Issue', render: (p) => <StatusBadge statut={p.issue} /> },
              { key: 'parentsNotifies', label: 'Parents', render: (p) => p.parentsNotifies ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Bell className="h-4 w-4 text-gray-300" /> },
              { key: 'datePassage', label: 'Passage', render: (p) => formatDateTime(p.datePassage) },
            ]}
            rows={derniersPassages.slice(0, 12)}
            emptyLabel="Aucun passage enregistré"
          />
        </SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionBlock title="Vaccinations" description={`${vaccinations.length} enregistrement(s)`}>
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (v) => nomComplet(eleveById.get(v.eleveId)) },
                { key: 'vaccin', label: 'Vaccin' },
                { key: 'dateVaccination', label: 'Fait le', render: (v) => v.dateVaccination ? formatDate(v.dateVaccination) : '—' },
                { key: 'dateRappel', label: 'Rappel', render: (v) => v.dateRappel ? formatDate(v.dateRappel) : '—' },
                { key: 'statut', label: 'Statut', render: (v) => <StatusBadge statut={v.statut} /> },
              ]}
              rows={vaccinations.slice(0, 8)}
              emptyLabel="Aucune vaccination enregistrée"
            />
          </SectionBlock>
          <SectionBlock title="Fiches santé — contacts d'urgence" description="Vérification de complétude">
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (f) => nomComplet(eleveById.get(f.eleveId)) },
                { key: 'groupeSanguin', label: 'Groupe', render: (f) => f.groupeSanguin ?? '—' },
                { key: 'contactUrgenceNom', label: 'Contact', render: (f) => f.contactUrgenceNom ?? <span className="text-rose-600 font-medium">à compléter</span> },
                { key: 'telephoneUrgence', label: 'Téléphone', render: (f) => f.telephoneUrgence ?? <span className="text-rose-600 font-medium">à compléter</span> },
                { key: 'allergies', label: 'Allergies', render: (f) => f.allergies ?? '—' },
              ]}
              rows={fichesSante.slice(0, 8)}
              emptyLabel="Aucune fiche santé"
            />
            {fichesIncompletes.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
                {fichesIncompletes.length} élève(s) sans fiche complète — complétez depuis le module Santé & Infirmerie.
              </p>
            )}
          </SectionBlock>
        </div>
      </div>
    );
  }

  // ============================ ASSISTANT DE DIRECTION ============================
  const encaisseMois = paiements.filter((p: any) => moisActif && toMois(p.datePaiement) === moisActif).reduce((s: number, p: any) => s + p.montant, 0);
  const retardataires = refDate
    ? echeances.filter((e: any) => (e.statut === 'impayee' || e.statut === 'partiel') && new Date(e.dateEcheance) < refDate).length
    : 0;
  const congesAValider = conges.filter((c: any) => c.statut === 'demande').length;
  const candidaturesEnCours = candidatures.filter((c: any) => ['soumis', 'test', 'entretien'].includes(c.statut)).length;
  const affectations = personnelsRoles.filter((pr: any) => !pr.dateFin).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title={meta.titre} subtitle={`${meta.sous} · Année ${initialData.anneeScolaire?.libelle ?? '—'}`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Élèves actifs" value={eleves.filter((e: any) => e.statut === 'actif').length} sub={`${classes.length} classes`} icon={Users} color="emerald" />
        <StatCard title="Absents du jour" value={absentsJour.length} sub={`${appels?.manquants.length ?? 0} appel(s) non fait(s)`} icon={AlertTriangle} color={absentsJour.length ? 'rose' : 'gray'} />
        <StatCard title="Retards scolarité" value={retardataires} sub="échéances échues impayées" icon={PiggyBank} color={retardataires ? 'amber' : 'emerald'} />
        <StatCard title="Encaissé du mois" value={formatMontant(encaisseMois, devise)} sub={moisActif ?? '—'} icon={Wallet} color="purple" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Congés à valider" value={congesAValider} sub="RH" icon={ClipboardList} color={congesAValider ? 'amber' : 'gray'} />
        <StatCard title="Candidatures" value={candidaturesEnCours} sub="en cours d'instruction" icon={FileCheck} color="blue" />
        <StatCard title="Affectations actives" value={affectations} sub="enseignant·matière·classe" icon={GraduationCap} color="purple" />
        <StatCard title="Incidents" value={incidents.length} sub="vie scolaire" icon={Shield} color={incidents.length ? 'amber' : 'gray'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBlock title={`Absences ${estAujourdhui ? "du jour" : 'du dernier relevé'}`} description={`${presentsJour.length} présents · ${absentsJour.length} absents · ${retardsJour.length} retards`}>
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (p) => nomComplet(eleveById.get(p.eleveId)) },
              { key: 'classe', label: 'Classe', render: (p) => classeDeEleve(p.eleveId) },
              { key: 'statut', label: 'Statut', render: (p) => <StatusBadge statut={p.statut} /> },
            ]}
            rows={[...absentsJour, ...retardsJour]}
            emptyLabel="Aucune absence ni retard"
          />
        </SectionBlock>
        <SectionBlock title="Notifications récentes" description="Messages internes">
          <div className="space-y-2">
            {notifications.length === 0 && <p className="text-sm text-gray-500">Aucune notification</p>}
            {notifications.slice(0, 6).map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                <Bell className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.sujet}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">{n.corps}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(n.dateEnvoi)}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
      </div>
    </div>
  );
}
