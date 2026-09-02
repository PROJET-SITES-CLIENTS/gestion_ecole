'use client';

// ====================================================================
// COCKPIT 360° DIRECTION — vision temps réel complète de l'école.
// Répond point par point aux questions du directeur / fondateur :
//   • Qui sont les profs ? Qui garde quelle classe (titulariat) ?
//   • Qui enseigne quelle matière (affectations) ?
//   • Effectifs élèves (cycles primaire/secondaire, niveaux, classes)
//   • Programmes des matières + AVANCEMENT (le programme est-il suivi ?)
//   • Programmes des examens officiels + inscrits
//   • Absences du jour (tous les élèves sont-ils présents ?)
//   • Meilleures notes (top élèves)
//   • Scolarité : qui a payé / pas payé / en retard (+ jours de retard)
//   • Comptabilité : recettes, dépenses, budget, solde
//   • RH : congés, paie, effectifs
//   • Temps réel : auto-refresh 60 s (router.refresh)
// Hydratation : `now` initialisé à null côté serveur ET premier rendu
// client, matérialisé après montage → aucun mismatch SSR/CSR.
// ====================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, GraduationCap, Wallet, ClipboardList, BookOpen, Bell, AlertCircle,
  TrendingUp, TrendingDown, CalendarClock, PiggyBank, FileCheck, UserCheck,
  Activity, AlertTriangle, School, Clock, Award, Stethoscope,
} from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock } from '@/components/shared-ui';
import { Card, CardContent } from '@/components/ui/card';
import { formatMontant, formatDate, formatDateTime } from '@/lib/format';

const SEUIL_AVANCEMENT_RETARD = 50; // % en dessous duquel un avancement est signalé

const nomComplet = (p: any) => (p ? `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() : '—');
const toJour = (d: any) => new Date(d).toISOString().slice(0, 10);
const toMois = (d: any) => new Date(d).toISOString().slice(0, 7);
const joursEntre = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86_400_000);

function MiniBar({ pct, seuil }: { pct: number; seuil?: number }) {
  const color = seuil != null && pct < seuil ? 'bg-rose-500' : pct >= 90 ? 'bg-emerald-500' : 'bg-amber-400';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 tabular-nums w-9 text-right">{Math.round(pct)}%</span>
    </div>
  );
}

function TagRouge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">{children}</span>;
}
function TagVert({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">{children}</span>;
}

export default function DirectionModule({ initialData, mode = 'dashboard', portalLabel = 'Direction' }: { initialData: any; mode?: 'dashboard' | 'full'; portalLabel?: string }) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  // ---- Temps réel : date client au montage + rafraîchissement auto 60 s ----
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [router]);

  // ---- Datasets ----
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
  const presences = initialData.presences ?? [];
  const seances = initialData.seances ?? [];
  const avancements = initialData.avancements ?? [];
  const bulletins = initialData.bulletins ?? [];
  const conges = initialData.conges ?? [];
  const bulletinsPaie = initialData.bulletinsPaie ?? [];
  const personnelRoles = initialData.personnelRoles ?? [];
  const examensOfficiels = initialData.examensOfficiels ?? [];
  const inscriptionsExamen = initialData.inscriptionsExamen ?? [];
  const matieres = initialData.matieres ?? [];
  const incidents = initialData.incidents ?? [];
  const notifications = initialData.notifications ?? [];

  // Vue complète (finances + RH) réservée à la direction — pas au portail enseignant
  const vueComplete = portalLabel !== 'Enseignant';

  // ---- Index de recherche (typage explicite — les FK sans relation Prisma se résolvent en JS) ----
  const eleveById: Map<string, any> = new Map(eleves.map((e: any) => [e.id, e]));
  const classeById: Map<string, any> = new Map(classes.map((c: any) => [c.id, c]));
  const niveauById: Map<string, any> = new Map(niveaux.map((n: any) => [n.id, n]));
  const personnelById: Map<string, any> = new Map(personnels.map((p: any) => [p.id, p]));
  const matiereById: Map<string, any> = new Map(matieres.map((m: any) => [m.id, m]));
  const seanceById: Map<string, any> = new Map(seances.map((s: any) => [s.id, s]));

  const cycleDeClasse = (classeId: any) => {
    const c = classeById.get(classeId);
    if (!c) return null;
    const n = niveauById.get(c.niveauId);
    return n?.section?.cycle?.libelle ?? n?.section?.libelle ?? null;
  };

  // ---- Date de référence (déterministe SSR ; temps réel après montage) ----
  const fallbackRef = (() => {
    const ts: number[] = [];
    seances.forEach((s: any) => ts.push(new Date(s.date).getTime()));
    paiements.forEach((p: any) => ts.push(new Date(p.datePaiement).getTime()));
    depenses.forEach((d: any) => ts.push(new Date(d.dateDepense).getTime()));
    echeances.forEach((e: any) => ts.push(new Date(e.dateEcheance).getTime()));
    return ts.length ? new Date(Math.max(...ts)) : null;
  })();
  const refDate = now ?? fallbackRef;

  // ============ 1. EFFECTIFS 360° ============
  const elevesActifs = eleves.filter((e: any) => e.statut === 'actif');
  const personnelsActifs = personnels.filter((p: any) => p.statut === 'actif');

  const effectifsParCycle = new Map<string, number>();
  let nonAffectes = 0;
  elevesActifs.forEach((e: any) => {
    const cycle = cycleDeClasse(e.classeActuelleId);
    if (!cycle) { nonAffectes++; return; }
    effectifsParCycle.set(cycle, (effectifsParCycle.get(cycle) ?? 0) + 1);
  });

  const effectifsParNiveau = niveaux.map((n: any) => ({
    id: n.id,
    libelle: n.libelle,
    cycle: n.section?.cycle?.libelle ?? n.section?.libelle ?? '—',
    classes: classes.filter((c: any) => c.niveauId === n.id).length,
    effectif: elevesActifs.filter((e: any) => {
      const c = classeById.get(e.classeActuelleId);
      return c && c.niveauId === n.id;
    }).length,
  })).sort((a: any, b: any) => b.effectif - a.effectif);

  const effectifParClasse = (classeId: any) =>
    elevesActifs.filter((e: any) => e.classeActuelleId === classeId).length;

  // ============ 2. TITULARIAT — « quel prof garde quelle classe » ============
  const lignesTitulariat = classes.map((c: any) => ({
    id: c.id,
    code: c.code,
    niveau: niveauById.get(c.niveauId)?.libelle ?? '—',
    cycle: cycleDeClasse(c.id) ?? '—',
    titulaire: c.enseignantPrincipalId ? nomComplet(personnelById.get(c.enseignantPrincipalId)) : null,
    effectif: effectifParClasse(c.id),
  })).sort((a: any, b: any) => (a.niveau ?? '').localeCompare(b.niveau ?? '') || (a.code ?? '').localeCompare(b.code ?? ''));
  const titulariatManquant = lignesTitulariat.filter((l: any) => !l.titulaire).length;

  // ============ 3. AFFECTATIONS — « quel prof enseigne quelle matière » ============
  const affectationsFormelles = personnelRoles
    .filter((pr: any) => !pr.dateFin)
    .map((pr: any) => ({
      id: `${pr.personnelId}-${pr.roleId}-${pr.matiereId ?? 'x'}-${pr.classeId ?? 'x'}`,
      enseignant: nomComplet(pr.personnel),
      role: pr.role?.libelle ?? pr.role?.code ?? '—',
      matiere: pr.matiereId ? matiereById.get(pr.matiereId)?.libelle ?? '—' : '—',
      classe: pr.classeId ? classeById.get(pr.classeId)?.code ?? '—' : '—',
      dateDebut: pr.dateDebut,
    }));
  // Repli : dérivation depuis les séances réellement planifiées
  const affectationsSeances = (() => {
    const vues = new Map<string, any>();
    seances.forEach((s: any) => {
      const key = `${s.enseignantId}-${s.matiereId}-${s.classeId}`;
      if (vues.has(key)) return;
      vues.set(key, {
        id: key,
        enseignant: nomComplet(s.enseignant) !== '—' ? nomComplet(s.enseignant) : nomComplet(personnelById.get(s.enseignantId)),
        role: 'Enseignant',
        matiere: s.matiere?.libelle ?? '—',
        classe: s.classe?.code ?? '—',
        dateDebut: s.date,
      });
    });
    return [...vues.values()];
  })();
  const affectations = affectationsFormelles.length > 0 ? affectationsFormelles : affectationsSeances;

  // ============ 4. AVANCEMENT DU PROGRAMME — « le programme est-il suivi ? » ============
  const avancementsDetail = avancements.map((a: any) => ({
    id: a.id,
    classe: classeById.get(a.classeId)?.code ?? '—',
    matiere: a.chapitre?.programme?.matiere?.libelle ?? '—',
    chapitre: a.chapitre?.titre ?? '—',
    enseignant: nomComplet(personnelById.get(a.enseignantId)),
    pourcentage: a.pourcentage ?? 0,
    dateMaj: a.dateMaj,
    commentaire: a.commentaire,
  })).sort((a: any, b: any) => a.pourcentage - b.pourcentage); // les plus en retard d'abord
  const avancementMoyen = avancementsDetail.length
    ? Math.round(avancementsDetail.reduce((s: number, a: any) => s + a.pourcentage, 0) / avancementsDetail.length)
    : null;
  const avancementsEnRetard = avancementsDetail.filter((a: any) => a.pourcentage < SEUIL_AVANCEMENT_RETARD);

  // ============ 5. PRÉSENCES DU JOUR — « tous les élèves sont-ils présents ? » ============
  const dernierReleve = seances.length
    ? new Date(Math.max(...seances.map((s: any) => new Date(s.date).getTime())))
    : null;
  const jourActif = now ? toJour(now) : dernierReleve ? toJour(dernierReleve) : null;
  const estAujourdhui = now != null && jourActif != null && toJour(now) === jourActif;
  const seancesDuJour = jourActif ? seances.filter((s: any) => toJour(s.date) === jourActif) : [];
  const presencesDuJour = presences.filter((p: any) => {
    const s = seanceById.get(p.seanceId);
    return s && toJour(s.date) === jourActif;
  });
  const presentsJour = presencesDuJour.filter((p: any) => p.statut === 'present').length;
  const absentsJour = presencesDuJour.filter((p: any) => p.statut === 'absent');
  const retardsJour = presencesDuJour.filter((p: any) => p.statut === 'retard');
  const excusesJour = presencesDuJour.filter((p: any) => p.statut === 'excuse');
  const tauxJour = presencesDuJour.length ? Math.round(presentsJour / presencesDuJour.length * 100) : null;

  // ============ 6. TOP ÉLÈVES — « meilleures notes » ============
  const topEleves = bulletins
    .filter((b: any) => b.moyenneGenerale != null)
    .sort((a: any, b: any) => b.moyenneGenerale - a.moyenneGenerale)
    .slice(0, 10)
    .map((b: any, i: number) => ({
      id: b.id,
      rang: b.rang ?? i + 1,
      eleve: nomComplet(eleveById.get(b.eleveId)),
      classe: classeById.get(b.classeId)?.code ?? '—',
      moyenne: b.moyenneGenerale,
      statut: b.statut,
    }));

  // ============ 7. SCOLARITÉ — « qui a payé / pas payé / qui est en retard ? » ============
  const echeancesDu = echeances.filter((e: any) => e.statut !== 'annulee');
  const totalDu = echeancesDu.reduce((s: number, e: any) => s + (e.montant ?? 0), 0);
  const totalPaye = echeancesDu.reduce((s: number, e: any) => s + (e.montantPaye ?? 0), 0);
  const restantDu = Math.max(0, totalDu - totalPaye);
  const tauxRecouvrement = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 100;

  const retardataires = refDate
    ? echeancesDu
        .filter((e: any) => (e.statut === 'impayee' || e.statut === 'partiel') && new Date(e.dateEcheance) < refDate)
        .map((e: any) => ({
          id: e.id,
          eleve: nomComplet(eleveById.get(e.eleveId)),
          classe: eleveById.get(e.eleveId) ? classeById.get(eleveById.get(e.eleveId).classeActuelleId)?.code ?? '—' : '—',
          frais: e.frais?.libelle ?? '—',
          restant: (e.montant ?? 0) - (e.montantPaye ?? 0),
          statut: e.statut,
          jours: Math.max(1, joursEntre(new Date(e.dateEcheance), refDate)),
        }))
        .sort((a: any, b: any) => b.jours - a.jours)
    : [];
  const elevesAJour = elevesActifs.length - new Set(retardataires.map((r: any) => r.eleve)).size;

  // ============ 8. COMPTABILITÉ — recettes / dépenses / budget ============
  const moisActif = refDate ? toMois(refDate) : null;
  const encaisseMois = paiements
    .filter((p: any) => moisActif && toMois(p.datePaiement) === moisActif)
    .reduce((s: number, p: any) => s + p.montant, 0);
  const depensesMois = depenses
    .filter((d: any) => moisActif && toMois(d.dateDepense) === moisActif)
    .reduce((s: number, d: any) => s + d.montant, 0);
  const depensesNonValidees = depenses.filter((d: any) => !d.validee);
  const soldeMois = encaisseMois - depensesMois;
  const encaisseCumule = paiements.reduce((s: number, p: any) => s + p.montant, 0);
  const depensesCumulees = depenses.reduce((s: number, d: any) => s + d.montant, 0);

  const budgetLignes = budgets.flatMap((b: any) =>
    (b.lignes ?? []).map((l: any) => ({ ...l, budget: b.libelle, statutBudget: b.statut }))
  );
  const budgetPrevu = budgetLignes.reduce((s: number, l: any) => s + (l.montantPrevu ?? 0), 0);
  const budgetRealise = budgetLignes.reduce((s: number, l: any) => s + (l.montantRealise ?? 0), 0);
  const budgetPct = budgetPrevu > 0 ? Math.round((budgetRealise / budgetPrevu) * 100) : null;

  // ============ 9. RH 360° ============
  const congesEnCours = refDate
    ? conges.filter((c: any) => c.statut === 'approuve' && new Date(c.dateDebut) <= refDate && refDate <= new Date(c.dateFin))
    : [];
  const congesAValider = conges.filter((c: any) => c.statut === 'demande');
  const derniersPaies = [...bulletinsPaie]
    .sort((a: any, b: any) => (b.periode ?? '').localeCompare(a.periode ?? ''))
    .slice(0, 6)
    .map((b: any) => ({
      id: b.id,
      personnel: nomComplet(personnelById.get(b.personnelId)),
      periode: b.periode,
      net: b.netAPayer,
      statut: b.statut,
    }));
  const masseSalarialeMois = derniersPaies.length
    ? bulletinsPaie
        .filter((b: any) => b.periode === moisActif)
        .reduce((s: number, b: any) => s + (b.netAPayer ?? 0), 0)
    : 0;
  const parContrat = new Map<string, number>();
  personnelsActifs.forEach((p: any) => {
    const t = p.typeContrat ?? 'non précisé';
    parContrat.set(t, (parContrat.get(t) ?? 0) + 1);
  });

  // ============ 10. EXAMENS OFFICIELS ============
  const prochainsExamens = [...examensOfficiels]
    .sort((a: any, b: any) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())
    .map((x: any) => ({
      id: x.id,
      nom: x.nom,
      niveau: niveauById.get(x.niveauId)?.libelle ?? '—',
      dateDebut: x.dateDebut,
      dateFin: x.dateFin,
      inscrits: inscriptionsExamen.filter((i: any) => i.examenOfficielId === x.id).length,
      passe: refDate ? new Date(x.dateFin) < refDate : false,
    }));
  const prochainExamen = prochainsExamens.find((x: any) => !x.passe);

  // ============ 11. ALERTES CONSOLIDÉES ============
  const alertes: { label: string; detail: string; severite: 'rouge' | 'ambre' }[] = [];
  if (retardataires.length > 0 && vueComplete)
    alertes.push({ label: `${retardataires.length} échéance(s) de scolarité en retard`, detail: `Restant dû cumulé : ${formatMontant(restantDu, devise)} — ${new Set(retardataires.map((r: any) => r.eleve)).size} élève(s) concerné(s)`, severite: 'rouge' });
  if (avancementsEnRetard.length > 0)
    alertes.push({ label: `${avancementsEnRetard.length} programme(s) en retard`, detail: `Avancement < ${SEUIL_AVANCEMENT_RETARD}% — voir « Suivi du programme »`, severite: 'ambre' });
  if (titulariatManquant > 0)
    alertes.push({ label: `${titulariatManquant} classe(s) sans titulaire`, detail: 'Aucun enseignant principal affecté — voir « Titulariat »', severite: 'ambre' });
  if (congesAValider.length > 0 && vueComplete)
    alertes.push({ label: `${congesAValider.length} demande(s) de congé à valider`, detail: 'Module Personnel → congés', severite: 'ambre' });
  if (depensesNonValidees.length > 0 && vueComplete)
    alertes.push({ label: `${depensesNonValidees.length} dépense(s) à valider`, detail: `Montant en attente : ${formatMontant(depensesNonValidees.reduce((s: number, d: any) => s + d.montant, 0), devise)}`, severite: 'ambre' });
  if (nonAffectes > 0)
    alertes.push({ label: `${nonAffectes} élève(s) actif(s) sans classe`, detail: 'Aucune classe actuelle renseignée', severite: 'rouge' });

  // ================================ RENDU ================================
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={mode === 'dashboard' ? `Cockpit 360° — ${portalLabel}` : 'Cockpit 360° — Direction'}
        subtitle={`Année ${initialData.anneeScolaire?.libelle ?? '—'} · ${classes.length} classes · ${elevesActifs.length} élèves actifs · ${personnelsActifs.length} personnels`}
        actions={
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-emerald-700 font-medium">
              <Activity className="h-3 w-3" /> Temps réel · 60 s
            </span>
            <span className="tabular-nums">
              {now ? `Actualisé à ${now.toLocaleTimeString('fr-FR')}` : 'Actualisation…'}
            </span>
          </div>
        }
      />

      {/* ---------- KPIs principaux ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard title="Élèves actifs" value={elevesActifs.length} sub={`${classes.length} classes · ${nonAffectes > 0 ? `${nonAffectes} non affectés` : 'tous affectés'}`} icon={Users} color="emerald" />
        <StatCard title="Personnels actifs" value={personnelsActifs.length} sub={[...parContrat.entries()].map(([k, v]) => `${v} ${k}`).slice(0, 2).join(' · ') || '—'} icon={GraduationCap} color="blue" />
        <StatCard
          title={`Présence ${estAujourdhui ? "aujourd'hui" : 'dernier relevé'}`}
          value={tauxJour != null ? `${tauxJour}%` : '—'}
          sub={jourActif ? `${presentsJour} présents / ${presencesDuJour.length} pointages · ${absentsJour.length} absents` : 'Aucun pointage'}
          icon={ClipboardList}
          color={tauxJour != null && tauxJour < 90 ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Avancement programmes"
          value={avancementMoyen != null ? `${avancementMoyen}%` : '—'}
          sub={avancementsEnRetard.length > 0 ? `${avancementsEnRetard.length} en retard (< ${SEUIL_AVANCEMENT_RETARD}%)` : `${avancementsDetail.length} suivis · tous à l'heure`}
          icon={BookOpen}
          color={avancementsEnRetard.length > 0 ? 'rose' : 'purple'}
        />
        {vueComplete && (
          <>
            <StatCard title={`Encaissé ${moisActif ? `(${moisActif})` : 'mois courant'}`} value={formatMontant(encaisseMois, devise)} sub={`${paiements.length} paiements au total`} icon={Wallet} color="purple" />
            <StatCard title="Scolarité — restant dû" value={formatMontant(restantDu, devise)} sub={`Recouvrement : ${tauxRecouvrement}% · ${retardataires.length} en retard`} icon={PiggyBank} color={retardataires.length > 0 ? 'amber' : 'emerald'} />
            <StatCard title={`Dépenses ${moisActif ? `(${moisActif})` : 'mois courant'}`} value={formatMontant(depensesMois, devise)} sub={depensesNonValidees.length > 0 ? `${depensesNonValidees.length} à valider` : `${depenses.length} au total`} icon={TrendingDown} color="amber" />
            <StatCard title="Solde du mois" value={formatMontant(soldeMois, devise)} sub={`Cumul : ${formatMontant(encaisseCumule - depensesCumulees, devise)}`} icon={TrendingUp} color={soldeMois >= 0 ? 'emerald' : 'rose'} />
          </>
        )}
        {!vueComplete && (
          <>
            <StatCard title="Séances du jour" value={seancesDuJour.length} sub={jourActif ? formatDate(jourActif) : '—'} icon={CalendarClock} color="purple" />
            <StatCard title="Top élève" value={topEleves[0] ? `${topEleves[0].moyenne?.toFixed(2) ?? '—'}/20` : '—'} sub={topEleves[0] ? topEleves[0].eleve : 'Aucun bulletin'} icon={Award} color="amber" />
            <StatCard title="Prochain examen" value={prochainExamen ? prochainExamen.nom : '—'} sub={prochainExamen ? formatDate(prochainExamen.dateDebut) : 'Aucun programmé'} icon={FileCheck} color="blue" />
            <StatCard title="Absents du jour" value={absentsJour.length} sub={`${retardsJour.length} retard(s) · ${excusesJour.length} excusé(s)`} icon={AlertTriangle} color={absentsJour.length > 0 ? 'rose' : 'gray'} />
          </>
        )}
      </div>

      {/* ---------- Bandeau d'alertes consolidées ---------- */}
      {alertes.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/60">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" /> Points d&apos;attention ({alertes.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {alertes.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded border ${a.severite === 'rouge' ? 'bg-rose-50 border-rose-200' : 'bg-white border-amber-200'}`}>
                  <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${a.severite === 'rouge' ? 'text-rose-600' : 'text-amber-600'}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${a.severite === 'rouge' ? 'text-rose-900' : 'text-amber-900'}`}>{a.label}</p>
                    <p className="text-[11px] text-gray-600">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- 1. Effectifs 360° ---------- */}
      <SectionBlock title="Effectifs 360° — cycles, niveaux, classes" description="Répartition complète des élèves actifs du primaire au secondaire">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[...effectifsParCycle.entries()].map(([cycle, effectif]) => (
            <Card key={cycle}>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{cycle}</p>
                <p className="text-2xl font-bold text-gray-900">{effectif}</p>
                <p className="text-[11px] text-gray-500">{Math.round(effectif / Math.max(1, elevesActifs.length) * 100)}% des effectifs</p>
              </CardContent>
            </Card>
          ))}
          {nonAffectes > 0 && (
            <Card className="border-rose-200">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wider text-rose-600 font-medium">Sans classe</p>
                <p className="text-2xl font-bold text-rose-700">{nonAffectes}</p>
                <p className="text-[11px] text-rose-600">À régulariser</p>
              </CardContent>
            </Card>
          )}
        </div>
        <DataTable
          columns={[
            { key: 'libelle', label: 'Niveau' },
            { key: 'cycle', label: 'Cycle' },
            { key: 'classes', label: 'Classes' },
            { key: 'effectif', label: 'Élèves actifs' },
            { key: 'moyenne', label: 'Moy. / classe', render: (r) => (r.classes > 0 ? (r.effectif / r.classes).toFixed(1) : '—') },
          ]}
          rows={effectifsParNiveau}
          emptyLabel="Aucun niveau configuré"
        />
      </SectionBlock>

      {/* ---------- 2. Titulariat ---------- */}
      <SectionBlock
        title="Titulariat — quel enseignant garde quelle classe"
        description={`${classes.length} classes · ${titulariatManquant > 0 ? `${titulariatManquant} sans titulaire` : 'toutes couvertes'}`}
      >
        <DataTable
          columns={[
            { key: 'code', label: 'Classe' },
            { key: 'niveau', label: 'Niveau' },
            { key: 'cycle', label: 'Cycle' },
            { key: 'titulaire', label: 'Enseignant principal (titulaire)', render: (r) => r.titulaire ? <TagVert>{r.titulaire}</TagVert> : <TagRouge>Non attribué</TagRouge> },
            { key: 'effectif', label: 'Élèves' },
          ]}
          rows={lignesTitulariat}
          emptyLabel="Aucune classe configurée"
        />
      </SectionBlock>

      {/* ---------- 3. Affectations ---------- */}
      <SectionBlock
        title="Équipe pédagogique — qui enseigne quelle matière"
        description={affectationsFormelles.length > 0
          ? `${affectationsFormelles.length} affectation(s) formelle(s) en cours`
          : `${affectationsSeances.length} affectation(s) déduite(s) des séances planifiées (aucune affectation formelle saisie)`}
      >
        <DataTable
          columns={[
            { key: 'enseignant', label: 'Enseignant' },
            { key: 'role', label: 'Rôle' },
            { key: 'matiere', label: 'Matière' },
            { key: 'classe', label: 'Classe' },
            { key: 'dateDebut', label: 'Depuis', render: (r) => formatDate(r.dateDebut) },
          ]}
          rows={affectations}
          emptyLabel="Aucune affectation — saisissez les rôles du personnel (module Personnel) ou planifiez des séances"
        />
      </SectionBlock>

      {/* ---------- 4. Suivi du programme ---------- */}
      <SectionBlock
        title="Suivi du programme — avancement par classe et matière"
        description={`Avancement moyen : ${avancementMoyen != null ? `${avancementMoyen}%` : '—'} · ${avancementsEnRetard.length} sous le seuil de ${SEUIL_AVANCEMENT_RETARD}% · trié du plus en retard au plus avancé`}
      >
        <DataTable
          columns={[
            { key: 'classe', label: 'Classe' },
            { key: 'matiere', label: 'Matière' },
            { key: 'chapitre', label: 'Chapitre en cours' },
            { key: 'enseignant', label: 'Enseignant' },
            { key: 'pourcentage', label: 'Avancement', render: (r) => <MiniBar pct={r.pourcentage} seuil={SEUIL_AVANCEMENT_RETARD} /> },
            { key: 'dateMaj', label: 'Mise à jour', render: (r) => formatDate(r.dateMaj) },
            { key: 'commentaire', label: 'Commentaire', render: (r) => r.commentaire ?? '—' },
          ]}
          rows={avancementsDetail}
          emptyLabel="Aucun avancement déclaré — module Pédagogique → avancement des chapitres"
        />
      </SectionBlock>

      {/* ---------- 5. Présences du jour ---------- */}
      <SectionBlock
        title={`Présences ${estAujourdhui ? "du jour" : 'du dernier relevé'} — tous les élèves sont-ils présents ?`}
        description={`${jourActif ? formatDate(jourActif) : '—'} · ${seancesDuJour.length} séance(s) · ${presencesDuJour.length} pointage(s) · taux ${tauxJour != null ? `${tauxJour}%` : '—'}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard title="Présents" value={presentsJour} icon={UserCheck} color="emerald" />
          <StatCard title="Absents" value={absentsJour.length} icon={AlertTriangle} color={absentsJour.length ? 'rose' : 'gray'} />
          <StatCard title="Retards" value={retardsJour.length} icon={Clock} color={retardsJour.length ? 'amber' : 'gray'} />
          <StatCard title="Excusés" value={excusesJour.length} icon={Stethoscope} color="blue" />
        </div>
        {(absentsJour.length > 0 || retardsJour.length > 0) && (
          <DataTable
            columns={[
              { key: 'eleve', label: 'Élève', render: (p) => nomComplet(eleveById.get(p.eleveId)) },
              { key: 'classe', label: 'Classe', render: (p) => {
                const e: any = eleveById.get(p.eleveId);
                return e ? classeById.get(e.classeActuelleId)?.code ?? '—' : '—';
              } },
              { key: 'statut', label: 'Statut', render: (p) => <StatusBadge statut={p.statut} /> },
              { key: 'motif', label: 'Motif', render: (p) => p.motifAbsence ?? '—' },
              { key: 'creneau', label: 'Séance', render: (p) => {
                const s: any = seanceById.get(p.seanceId);
                return s ? `${s.matiere?.libelle ?? '—'} ${s.heureDebut ?? ''}` : '—';
              } },
            ]}
            rows={[...absentsJour, ...retardsJour]}
            emptyLabel="Aucune absence ni retard relevé"
          />
        )}
        {absentsJour.length === 0 && retardsJour.length === 0 && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            Tous les élèves pointés sont présents — aucune absence ni retard à signaler.
          </p>
        )}
      </SectionBlock>

      {/* ---------- 6. Top élèves ---------- */}
      <SectionBlock title="Meilleures notes — podium des élèves" description="Classement des bulletins par moyenne générale (toutes périodes confondues)">
        <DataTable
          columns={[
            { key: 'rang', label: 'Rang', render: (r) => <span className="font-bold text-gray-900">#{r.rang}</span> },
            { key: 'eleve', label: 'Élève' },
            { key: 'classe', label: 'Classe' },
            { key: 'moyenne', label: 'Moyenne générale', render: (r) => <span className={`font-semibold ${r.moyenne >= 14 ? 'text-emerald-700' : r.moyenne >= 10 ? 'text-amber-600' : 'text-rose-700'}`}>{r.moyenne?.toFixed(2) ?? '—'}/20</span> },
            { key: 'statut', label: 'Bulletin', render: (r) => <StatusBadge statut={r.statut} /> },
          ]}
          rows={topEleves}
          emptyLabel="Aucun bulletin avec moyenne calculée"
        />
      </SectionBlock>

      {vueComplete && (
        <>
          {/* ---------- 7. Scolarité / recouvrement ---------- */}
          <SectionBlock
            title="Scolarité — qui a payé, qui n'a pas payé, qui est en retard"
            description={`Restant dû global : ${formatMontant(restantDu, devise)} · taux de recouvrement : ${tauxRecouvrement}% · ${retardataires.length} échéance(s) en retard (trié par ancienneté)`}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard title="Élèves à jour" value={Math.max(0, elevesAJour)} sub={`sur ${elevesActifs.length} actifs`} icon={UserCheck} color="emerald" />
              <StatCard title="En retard" value={new Set(retardataires.map((r: any) => r.eleve)).size} sub={`${retardataires.length} échéance(s)`} icon={AlertTriangle} color={retardataires.length ? 'rose' : 'gray'} />
              <StatCard title="Restant dû" value={formatMontant(restantDu, devise)} sub={`sur ${formatMontant(totalDu, devise)} attendus`} icon={PiggyBank} color="amber" />
              <StatCard title="Encaissé" value={formatMontant(totalPaye, devise)} sub={`${paiements.length} paiements`} icon={Wallet} color="purple" />
            </div>
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève' },
                { key: 'classe', label: 'Classe' },
                { key: 'frais', label: 'Frais' },
                { key: 'restant', label: 'Restant dû', render: (r) => <span className="font-semibold text-rose-700">{formatMontant(r.restant, devise)}</span> },
                { key: 'jours', label: 'Retard', render: (r) => <TagRouge>{r.jours} j</TagRouge> },
                { key: 'statut', label: 'Statut', render: (r) => <StatusBadge statut={r.statut} /> },
              ]}
              rows={retardataires.slice(0, 15)}
              emptyLabel="Aucun retard — toutes les échéances échues sont couvertes"
            />
            {retardataires.length > 15 && (
              <p className="text-xs text-gray-500 mt-2">+ {retardataires.length - 15} autre(s) échéance(s) en retard — détail dans le module Finances.</p>
            )}
          </SectionBlock>

          {/* ---------- 8. Comptabilité ---------- */}
          <SectionBlock
            title="Comptabilité — recettes, dépenses, budget"
            description={`Mois de référence : ${moisActif ?? '—'} · ${depenses.length} dépense(s) enregistrée(s) · ${budgetLignes.length} ligne(s) budgétaires`}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard title="Recettes du mois" value={formatMontant(encaisseMois, devise)} sub="scolarité & frais encaissés" icon={TrendingUp} color="emerald" />
              <StatCard title="Dépenses du mois" value={formatMontant(depensesMois, devise)} sub={depensesNonValidees.length ? `${depensesNonValidees.length} en attente de validation` : 'toutes validées'} icon={TrendingDown} color="amber" />
              <StatCard title="Solde du mois" value={formatMontant(soldeMois, devise)} sub={`cumul saison : ${formatMontant(encaisseCumule - depensesCumulees, devise)}`} icon={Wallet} color={soldeMois >= 0 ? 'emerald' : 'rose'} />
              <StatCard title="Masse salariale" value={formatMontant(masseSalarialeMois, devise)} sub={moisActif ?? '—'} icon={GraduationCap} color="purple" />
            </div>
            <DataTable
              columns={[
                { key: 'budget', label: 'Budget' },
                { key: 'libelle', label: 'Ligne' },
                { key: 'montantPrevu', label: 'Prévu', render: (l) => formatMontant(l.montantPrevu, devise) },
                { key: 'montantRealise', label: 'Réalisé', render: (l) => formatMontant(l.montantRealise, devise) },
                { key: 'consommation', label: 'Consommation', render: (l) => (l.montantPrevu > 0 ? <MiniBar pct={(l.montantRealise / l.montantPrevu) * 100} /> : '—') },
              ]}
              rows={budgetLignes}
              emptyLabel="Aucun budget ligne — module Finances → budgets"
            />
            {budgetPct != null && (
              <p className="text-xs text-gray-500 mt-2">
                Consommation budgétaire globale : <strong>{budgetPct}%</strong> ({formatMontant(budgetRealise, devise)} réalisés sur {formatMontant(budgetPrevu, devise)} prévus)
                {budgetPct > 95 && ' — budget quasi épuisé, vigilance requise.'}
              </p>
            )}
          </SectionBlock>

          {/* ---------- 9. RH 360° ---------- */}
          <SectionBlock
            title="RH 360° — congés, paie, effectifs"
            description={`${personnelsActifs.length} actifs · ${congesEnCours.length} en congé · ${congesAValider.length} demande(s) à valider · ${bulletinsPaie.length} bulletin(s) de paie`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Congés en cours & à valider</h4>
                <DataTable
                  columns={[
                    { key: 'personnel', label: 'Personnel', render: (c) => nomComplet(personnelById.get(c.personnelId)) },
                    { key: 'dateDebut', label: 'Du', render: (c) => formatDate(c.dateDebut) },
                    { key: 'dateFin', label: 'Au', render: (c) => formatDate(c.dateFin) },
                    { key: 'statut', label: 'Statut', render: (c) => <StatusBadge statut={c.statut} /> },
                    { key: 'motif', label: 'Motif', render: (c) => c.motif ?? '—' },
                  ]}
                  rows={[...congesEnCours, ...congesAValider]}
                  emptyLabel="Aucun congé en cours ni en attente"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...parContrat.entries()].map(([t, n]) => (
                    <span key={t} className="inline-flex items-center rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-700">{n} {t}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Derniers bulletins de paie</h4>
                <DataTable
                  columns={[
                    { key: 'personnel', label: 'Personnel' },
                    { key: 'periode', label: 'Période' },
                    { key: 'net', label: 'Net à payer', render: (b) => <span className="font-semibold">{formatMontant(b.net, devise)}</span> },
                    { key: 'statut', label: 'Statut', render: (b) => <StatusBadge statut={b.statut} /> },
                  ]}
                  rows={derniersPaies}
                  emptyLabel="Aucun bulletin de paie émis"
                />
              </div>
            </div>
          </SectionBlock>

          {/* ---------- 10. Examens officiels ---------- */}
          <SectionBlock
            title="Examens officiels — programmes et inscriptions"
            description={prochainExamen ? `Prochain : ${prochainExamen.nom} le ${formatDate(prochainExamen.dateDebut)} (${prochainExamen.inscrits} inscrits)` : 'Aucun examen à venir'}
          >
            <DataTable
              columns={[
                { key: 'nom', label: 'Examen' },
                { key: 'niveau', label: 'Niveau' },
                { key: 'dateDebut', label: 'Début', render: (x) => formatDate(x.dateDebut) },
                { key: 'dateFin', label: 'Fin', render: (x) => formatDate(x.dateFin) },
                { key: 'inscrits', label: 'Inscrits', render: (x) => <span className="font-semibold">{x.inscrits}</span> },
                { key: 'etat', label: 'État', render: (x) => x.passe ? <TagVert>Passé</TagVert> : <StatusBadge statut="planifie" label="À venir" /> },
              ]}
              rows={prochainsExamens}
              emptyLabel="Aucun examen officiel programmé"
            />
          </SectionBlock>
        </>
      )}

      {/* ---------- 11. Activité récente ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBlock title="Notifications récentes" description="Messages internes du compte connecté">
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

        {vueComplete ? (
          <SectionBlock title="Derniers paiements encaissés" description="Activité financière">
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (p) => nomComplet(eleveById.get(p.eleveId)) },
                { key: 'montant', label: 'Montant', render: (p) => formatMontant(p.montant, p.devise ?? devise) },
                { key: 'modePaiement', label: 'Mode' },
                { key: 'datePaiement', label: 'Date', render: (p) => formatDate(p.datePaiement) },
              ]}
              rows={paiements.slice(0, 6)}
              emptyLabel="Aucun paiement"
            />
          </SectionBlock>
        ) : (
          <SectionBlock title="Bulletins — circuit de validation" description="Workflow en cours">
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (b) => nomComplet(eleveById.get(b.eleveId)) },
                { key: 'version', label: 'Version' },
                { key: 'statut', label: 'Statut', render: (b) => <StatusBadge statut={b.statut} /> },
                { key: 'moyenneGenerale', label: 'Moy. gén.' },
                { key: 'dateCreation', label: 'Créé le', render: (b) => formatDate(b.dateCreation) },
              ]}
              rows={bulletins.slice(0, 8)}
              emptyLabel="Aucun bulletin généré"
            />
          </SectionBlock>
        )}
      </div>

      {/* ---------- 12. Vie scolaire ---------- */}
      <SectionBlock title="Vie scolaire — derniers incidents" description="Suivi discipline">
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (i) => nomComplet(eleveById.get(i.eleveId)) },
            { key: 'type', label: 'Type' },
            { key: 'gravite', label: 'Gravité', render: (i) => <StatusBadge statut={i.gravite} /> },
            { key: 'description', label: 'Description' },
            { key: 'dateHeure', label: 'Date', render: (i) => formatDateTime(i.dateHeure) },
          ]}
          rows={incidents.slice(0, 10)}
          emptyLabel="Aucun incident déclaré"
        />
      </SectionBlock>
    </div>
  );
}
