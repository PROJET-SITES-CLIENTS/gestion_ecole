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
  Activity, AlertTriangle, School, Clock, Award, Stethoscope, Download, Settings2,
  CalendarRange, Printer, BarChart3, Hourglass,
} from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatXOF, depuisCentimes, formatDate, formatDateTime } from '@/lib/format';
import { toJour, toMois, joursEntre, nomComplet, etatAppels, serieMensuelle, telechargerCsv } from '@/lib/cockpit';
import * as ext from '@/app/actions/completions';

// Seuils d'alerte paramétrables (persistés en localStorage du poste)
const SEUILS_DEFAUT = { retardJours: 15, avancement: 50, budget: 90, absence: 8 };
const CLE_SEUILS = 'cockpit-seuils';

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

// V1 — barre de taux de recouvrement : rouge < 50 %, ambre < 80 %, vert ≥ 80 %
// `inverse` : pour un taux « négatif » (ex. absentéisme) — élevé = rouge.
function BarreTaux({ taux, inverse = false }: { taux: number; inverse?: boolean }) {
  const reference = inverse ? 100 - taux : taux;
  const couleur = reference < 50 ? 'bg-rose-500' : reference < 80 ? 'bg-amber-400' : 'bg-emerald-500';
  const texte = reference < 50 ? 'text-rose-700' : reference < 80 ? 'text-amber-700' : 'text-emerald-700';
  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${couleur}`} style={{ width: `${Math.min(100, Math.max(0, taux))}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-12 text-right ${texte}`}>{taux.toFixed(1)}%</span>
    </div>
  );
}

// Libellés de mois courts en français — déterministes (aucun Intl local → zéro mismatch SSR)
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const libelleMois = (cle: string) => {
  const [annee, mois] = cle.split('-');
  return `${MOIS_COURTS[Number(mois) - 1] ?? mois} ${annee?.slice(2) ?? ''}`;
};

// V1 — couleurs des tranches de vieillissement des impayés
const COULEURS_VIEILLISSEMENT: Record<string, string> = {
  'à jour': 'bg-emerald-50 border-emerald-200 text-emerald-800',
  '1-30 j': 'bg-sky-50 border-sky-200 text-sky-800',
  '31-60 j': 'bg-amber-50 border-amber-200 text-amber-800',
  '61-90 j': 'bg-orange-50 border-orange-200 text-orange-800',
  '90+ j': 'bg-rose-50 border-rose-200 text-rose-800',
};

// Ouvre une fenêtre d'impression contenant le document (pattern bulletin imprimable).
function imprimerDocument(titre: string, elementId: string) {
  const contenu = document.getElementById(elementId)?.innerHTML ?? '';
  const f = window.open('', '_blank', 'width=900,height=1000');
  if (f) {
    f.document.write(`<html><head><title>${titre}</title><style>body{font-family:system-ui,sans-serif;padding:24px;font-size:13px;color:#111} table{width:100%;border-collapse:collapse;margin:12px 0} th,td{border:1px solid #999;padding:6px 8px;text-align:left} th{background:#f3f4f6;font-weight:600}</style></head><body>${contenu}</body></html>`);
    f.document.close();
    f.print();
  } else {
    window.print(); // fenêtre bloquée : impression de la page courante
  }
}

// --------------------------------------------------------------------
// V7 — RAPPORT DE TRIMESTRE CONSOLIDÉ (génération à la demande + impression)
// --------------------------------------------------------------------
function RapportTrimestre({ periodes, devise }: { periodes: any[]; devise: string }) {
  const [periodeId, setPeriodeId] = useState('');
  const [rapport, setRapport] = useState<any>(null);
  const [ouvert, setOuvert] = useState(false);
  const retour = useActionFeedback();

  function generer() {
    if (!periodeId) return;
    retour.run(async () => {
      const r: any = await ext.genererRapportTrimestre(periodeId);
      if (r && r.ok === false) return { ok: false, error: r.error };
      setRapport(r.rapport);
      setOuvert(true);
      return { ok: true };
    }, 'Rapport de trimestre généré');
  }

  const r = rapport;
  const tauxEncaissement = r?.finances?.attendu > 0 ? Math.round((r.finances.encaissé / r.finances.attendu) * 100) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label className="text-[11px] font-medium text-gray-700 block mb-1">Période (trimestre / semestre)</label>
          <select
            value={periodeId}
            onChange={(e) => setPeriodeId(e.target.value)}
            className="h-8 min-w-[220px] rounded-md border border-gray-200 bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">— Choisir une période —</option>
            {periodes.map((p: any) => (
              <option key={p.id} value={p.id}>{p.libelle}</option>
            ))}
          </select>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 gap-1.5" disabled={!periodeId || retour.pending} onClick={generer}>
          <Printer className="h-3.5 w-3.5" /> {retour.pending ? 'Génération…' : 'Générer le rapport'}
        </Button>
      </div>
      {retour.Message}
      {periodes.length === 0 && (
        <p className="text-sm text-gray-500">Aucune période configurée pour l&apos;année consultée — créez les trimestres dans le module Pédagogique.</p>
      )}

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Rapport de trimestre consolidé</DialogTitle></DialogHeader>
          {r && (
            <>
              <div id="rapport-trimestre-imprimable" className="border border-gray-300 rounded-lg p-5 bg-white text-sm">
                {/* En-tête école / période */}
                <div style={{ textAlign: 'center', borderBottom: '1px solid #d1d5db', paddingBottom: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{r.ecole?.nom ?? 'École'}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>RAPPORT CONSOLIDÉ — {r.periode?.libelle}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>du {formatDate(r.periode?.debut)} au {formatDate(r.periode?.fin)}</div>
                </div>

                {/* Effectifs & résultats */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 140, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>Effectifs</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{r.effectifs}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>élèves actifs</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>Moyenne générale</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{r.pedagogie?.moyenneGénérale ?? '—'}/20</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>toutes matières</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>Taux de réussite</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{r.pedagogie?.tauxRéussite != null ? `${r.pedagogie.tauxRéussite}%` : '—'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>moyenne ≥ 10/20</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>Bulletins</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{r.pedagogie?.bulletinsPubliés ?? 0}/{r.pedagogie?.bulletinsTotal ?? 0}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>publiés / total</div>
                  </div>
                </div>

                {/* Finances */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 140, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>Attendu sur la période</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{formatXOF(r.finances?.attendu, devise)}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>Encaissé</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{formatXOF(r.finances?.encaissé, devise)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{tauxEncaissement != null ? `taux d'encaissement : ${tauxEncaissement}%` : '—'}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>Vie scolaire</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{r.vieScolaire?.incidents ?? 0} incident(s)</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{r.vieScolaire?.absences ?? 0} absence(s) relevée(s)</div>
                  </div>
                </div>

                {/* Résultats par matière */}
                <div style={{ fontWeight: 600, margin: '14px 0 4px' }}>Résultats par matière</div>
                <table>
                  <thead><tr><th>Matière</th><th>Moyenne /20</th><th>Notes</th></tr></thead>
                  <tbody>
                    {(r.pedagogie?.parMatiere ?? []).map((m: any, i: number) => (
                      <tr key={i}><td>{m.matiere}</td><td>{m.moyenne ?? '—'}</td><td>{m.notes}</td></tr>
                    ))}
                  </tbody>
                </table>

                {/* Résultats par classe */}
                <div style={{ fontWeight: 600, margin: '14px 0 4px' }}>Résultats par classe</div>
                <table>
                  <thead><tr><th>Classe</th><th>Moyenne /20</th><th>Notes</th></tr></thead>
                  <tbody>
                    {(r.pedagogie?.parClasse ?? []).map((c: any, i: number) => (
                      <tr key={i}><td>{c.classe}</td><td>{c.moyenne ?? '—'}</td><td>{c.notes}</td></tr>
                    ))}
                  </tbody>
                </table>

                {/* Pied : génération + signature */}
                <div style={{ borderTop: '1px dashed #9ca3af', marginTop: 24, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                  <span>Généré le {r.généréLe ? formatDateTime(r.généréLe) : '—'}</span>
                  <span>Signature de la direction</span>
                </div>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full" onClick={() => imprimerDocument(`Rapport ${r.periode?.libelle ?? 'trimestre'}`, 'rapport-trimestre-imprimable')}>
                <Printer className="h-4 w-4 mr-2" />Imprimer le rapport
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Courbe de tendance SVG native — recettes vs dépenses sur 6 mois.
// Aucune dépendance externe, rendu identique serveur/client (valeurs pures).
function CourbeTendances({ recettes, depenses, devise }: { recettes: { label: string; total: number }[]; depenses: { label: string; total: number }[]; devise: string }) {
  const L = 560, H = 160, PAD = 34;
  const max = Math.max(1, ...recettes.map((r) => r.total), ...depenses.map((d) => d.total));
  const n = recettes.length || 1;
  const x = (i: number) => PAD + (i * (L - 2 * PAD)) / (n - 1);
  const y = (v: number) => H - PAD - (v / max) * (H - 2 * PAD);
  const chemin = (serie: { total: number }[]) => serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.total)}`).join(' ');
  // F16 — totaux en centimes : conversion en unités avant formatage de l'axe
  const fmt = (v: number) => { const u = depuisCentimes(v); return u >= 1000000 ? `${(u / 1000000).toFixed(1)}M` : u >= 1000 ? `${Math.round(u / 1000)}k` : `${u}`; };

  if (recettes.every((r) => r.total === 0) && depenses.every((d) => d.total === 0)) return null;

  return (
    <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">Tendances — recettes vs dépenses (6 mois)</h4>
        <div className="flex items-center gap-3 text-[11px] text-gray-600">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-emerald-500" /> Recettes</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-amber-500" /> Dépenses</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${L} ${H}`} className="w-full h-auto" role="img" aria-label="Tendances recettes et dépenses">
        {/* grille horizontale */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const gy = H - PAD - t * (H - 2 * PAD);
          return (
            <g key={t}>
              <line x1={PAD} x2={L - PAD} y1={gy} y2={gy} stroke="#f3f4f6" strokeWidth={1} />
              <text x={6} y={gy + 3} fontSize={9} fill="#9ca3af">{fmt(max * t)}</text>
            </g>
          );
        })}
        {/* axes */}
        <line x1={PAD} x2={L - PAD} y1={H - PAD} y2={H - PAD} stroke="#e5e7eb" strokeWidth={1} />
        {/* courbes */}
        <path d={chemin(depenses)} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinejoin="round" />
        <path d={chemin(recettes)} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" />
        {/* points + étiquettes de mois */}
        {recettes.map((r, i) => (
          <g key={r.label}>
            <circle cx={x(i)} cy={y(r.total)} r={3.5} fill="#10b981" />
            <circle cx={x(i)} cy={y(depenses[i]?.total ?? 0)} r={3.5} fill="#f59e0b" />
            <text x={x(i)} y={H - PAD + 14} fontSize={9} fill="#6b7280" textAnchor="middle">{r.label.slice(2)}</text>
          </g>
        ))}
      </svg>
      <p className="text-[11px] text-gray-500">Montants en {devise} · encaissements de scolarité vs dépenses enregistrées · {recettes.at(-1)?.label} : +{formatXOF(recettes.at(-1)?.total ?? 0, devise)} / −{formatXOF(depenses.at(-1)?.total ?? 0, devise)}</p>
    </div>
  );
}

export default function DirectionModule({ initialData, mode = 'dashboard', portalLabel = 'Direction' }: { initialData: any; mode?: 'dashboard' | 'full'; portalLabel?: string }) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  // Seuils d'alerte — chargés au montage (hydratation-safe)
  const [seuils, setSeuils] = useState({ ...SEUILS_DEFAUT });
  const [panneauSeuils, setPanneauSeuils] = useState(false);

  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE_SEUILS);
      if (brut) setSeuils({ ...SEUILS_DEFAUT, ...JSON.parse(brut) });
    } catch { /* valeur corrompue : défauts conservés */ }
  }, []);

  const majSeuil = (cle: keyof typeof SEUILS_DEFAUT, valeur: number) => {
    const prochains = { ...seuils, [cle]: valeur };
    setSeuils(prochains);
    try { localStorage.setItem(CLE_SEUILS, JSON.stringify(prochains)); } catch { /* stockage indisponible */ }
  };

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
  // V1/V2 — analytics pré-agrégées côté serveur (direction / super_admin)
  const anneesScolaires: any[] = initialData.anneesScolaires ?? [];
  const anneeConsultee: any = initialData.anneeConsultee ?? null;
  const financieres: any = initialData.analyticsFinancieres ?? null;
  const pedagogiques: any = initialData.analyticsPedagogiques ?? null;
  const periodes: any[] = initialData.periodes ?? [];

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
    presences.forEach((p: any) => ts.push(new Date(p.dateSaisie).getTime())); // V3 — absentéisme 12 mois
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
  const avancementsEnRetard = avancementsDetail.filter((a: any) => a.pourcentage < seuils.avancement);

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

  // ---- Anti-oubli d'appel : classe avec séances mais AUCUN pointage ----
  const appels = jourActif ? etatAppels(classes, seances, presences, jourActif) : null;
  const appelsManquants = appels?.manquants ?? [];

  // ---- Tendances : recettes vs dépenses (6 derniers mois) ----
  const serieRecettes = serieMensuelle(paiements, 'datePaiement', 'montant', 6, refDate);
  const serieDepenses = serieMensuelle(depenses, 'dateDepense', 'montant', 6, refDate);

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
    ? conges.filter((c: any) => c.statut === 'valide' && new Date(c.dateDebut) <= refDate && refDate <= new Date(c.dateFin))
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

  // ============ 10bis. V1 — ANALYTIQUE FINANCIÈRE (agrégats serveur) ============
  const recettesParType: any[] = financieres?.recettesParType ?? [];
  const maxRecetteType = Math.max(1, ...recettesParType.map((r: any) => r.montant ?? 0));
  const recouvrementParClasse: any[] = [...(financieres?.recouvrementParClasse ?? [])].sort((a: any, b: any) => (a.taux ?? 0) - (b.taux ?? 0)); // les plus en difficulté d'abord
  const vieillissementImpayes: any[] = financieres?.vieillissementImpayes ?? [];
  const projectionTresorerie: any[] = financieres?.projectionTresorerie ?? [];

  // ============ 10ter. V2 — ANALYTIQUE PÉDAGOGIQUE ============
  const pedagoParMatiere: any[] = [...(pedagogiques?.parMatiere ?? [])].sort((a: any, b: any) => (a.moyenne ?? 0) - (b.moyenne ?? 0)); // difficultés en premier
  const pedagoParClasse: any[] = [...(pedagogiques?.parClasse ?? [])].sort((a: any, b: any) => (a.moyenne ?? 0) - (b.moyenne ?? 0));
  const pedagoParEnseignant: any[] = [...(pedagogiques?.parEnseignant ?? [])].sort((a: any, b: any) => (a.moyenne ?? 0) - (b.moyenne ?? 0));
  const couleurMoyenne = (m: number | null | undefined) => (m == null ? 'text-gray-500' : m >= 14 ? 'text-emerald-700' : m >= 10 ? 'text-amber-600' : 'text-rose-700');

  // ============ 10quater. V3 — ABSENTÉISME 12 DERNIERS MOIS ============
  const presences12m = refDate
    ? presences.filter((p: any) => p.dateSaisie && new Date(p.dateSaisie) >= new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth() - 11, 1)))
    : [];
  const absences12m = presences12m.filter((p: any) => p.statut === 'absent').length;
  const retards12m = presences12m.filter((p: any) => p.statut === 'retard').length;
  const presents12m = presences12m.filter((p: any) => p.statut === 'present').length;
  const tauxAbsenteisme = presents12m + absences12m > 0 ? Number(((absences12m / (presents12m + absences12m)) * 100).toFixed(1)) : null;

  // Par classe — la classe vient de la séance pointée (incluse par le loader)
  const absenteismeParClasse = (() => {
    const m = new Map<string, { id: string; classe: string; absences: number; retards: number; pointages: number }>();
    presences12m.forEach((p: any) => {
      const classe = p.seance?.classe?.libelle ?? p.seance?.classe?.code ?? 'Sans classe';
      const cur = m.get(classe) ?? { id: classe, classe, absences: 0, retards: 0, pointages: 0 };
      cur.pointages += 1;
      if (p.statut === 'absent') cur.absences += 1;
      if (p.statut === 'retard') cur.retards += 1;
      m.set(classe, cur);
    });
    return [...m.values()]
      .map((l) => ({ ...l, taux: l.pointages > 0 ? Number(((l.absences / l.pointages) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.taux - a.taux); // classes les plus impactées d'abord
  })();

  // Par mois — barres simples sur 12 mois (via dateSaisie)
  const serieAbsences12m = (() => {
    if (!refDate) return [];
    const mois: { cle: string; absences: number; retards: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth() - i, 1));
      mois.push({ cle: d.toISOString().slice(0, 7), absences: 0, retards: 0 });
    }
    const index = new Map(mois.map((m) => [m.cle, m]));
    presences12m.forEach((p: any) => {
      const cible = index.get(toMois(p.dateSaisie));
      if (!cible) return;
      if (p.statut === 'absent') cible.absences += 1;
      else if (p.statut === 'retard') cible.retards += 1;
    });
    return mois;
  })();
  const maxAbsMois = Math.max(1, ...serieAbsences12m.map((m) => m.absences));

  // ============ 11. ALERTES CONSOLIDÉES ============
  const alertes: { label: string; detail: string; severite: 'rouge' | 'ambre' }[] = [];
  if (appelsManquants.length > 0)
    alertes.push({ label: `Appel non fait — ${appelsManquants.length} classe(s)`, detail: `${appelsManquants.map((m: any) => m.code).join(', ')} : séances planifiées sans aucun pointage. Relancez le titulaire.`, severite: 'rouge' });
  if (tauxJour != null && 100 - tauxJour > seuils.absence && presencesDuJour.length > 0)
    alertes.push({ label: `Absentéisme élevé : ${100 - tauxJour}%`, detail: `Au-delà du seuil de ${seuils.absence}% paramétré (${absentsJour.length + retardsJour.length} absences/retards sur ${presencesDuJour.length} pointages)`, severite: 'rouge' });
  if (retardataires.length > 0 && vueComplete) {
    const critiques = retardataires.filter((r: any) => r.jours > seuils.retardJours);
    alertes.push({ label: `${retardataires.length} échéance(s) de scolarité en retard`, detail: `Restant dû cumulé : ${formatXOF(restantDu, devise)} — ${new Set(retardataires.map((r: any) => r.eleve)).size} élève(s) concerné(s)${critiques.length ? `, dont ${critiques.length} au-delà de ${seuils.retardJours} j` : ''}`, severite: critiques.length ? 'rouge' : 'ambre' });
  }
  if (avancementsEnRetard.length > 0)
    alertes.push({ label: `${avancementsEnRetard.length} programme(s) en retard`, detail: `Avancement < ${seuils.avancement}% — voir « Suivi du programme »`, severite: 'ambre' });
  if (titulariatManquant > 0)
    alertes.push({ label: `${titulariatManquant} classe(s) sans titulaire`, detail: 'Aucun enseignant principal affecté — voir « Titulariat »', severite: 'ambre' });
  if (congesAValider.length > 0 && vueComplete)
    alertes.push({ label: `${congesAValider.length} demande(s) de congé à valider`, detail: 'Module Personnel → congés', severite: 'ambre' });
  if (depensesNonValidees.length > 0 && vueComplete)
    alertes.push({ label: `${depensesNonValidees.length} dépense(s) à valider`, detail: `Montant en attente : ${formatXOF(depensesNonValidees.reduce((s: number, d: any) => s + d.montant, 0), devise)}`, severite: 'ambre' });
  if (budgetPct != null && budgetPct > seuils.budget && vueComplete)
    alertes.push({ label: `Budget consommé à ${budgetPct}%`, detail: `Au-delà du seuil de ${seuils.budget}% paramétré — ${formatXOF(budgetRealise, devise)} réalisés sur ${formatXOF(budgetPrevu, devise)} prévus`, severite: 'rouge' });
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
              <Activity className="h-3 w-3" /> En direct
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setPanneauSeuils(!panneauSeuils)}
              title="Paramétrer les seuils d'alerte"
            >
              <Settings2 className="h-3.5 w-3.5" /> Seuils
            </Button>
            <span className="tabular-nums">
              {now ? `Actualisé à ${now.toLocaleTimeString('fr-FR')}` : 'Actualisation…'}
            </span>
          </div>
        }
      />

      {/* ---------- V4 — Sélecteur d'année scolaire ---------- */}
      {anneesScolaires.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            <label htmlFor="select-annee" className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-emerald-600" /> Année scolaire consultée
            </label>
            <select
              id="select-annee"
              value={anneeConsultee?.id ?? ''}
              onChange={(e) => {
                router.push(`/?annee=${e.target.value}`);
                router.refresh();
              }}
              className="h-8 rounded-md border border-gray-200 bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {anneesScolaires.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.libelle}{a.active ? ' (active)' : ''}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-gray-500">Basculez d&apos;année pour consulter les archives — les données du cockpit suivent l&apos;année choisie.</span>
          </CardContent>
        </Card>
      )}
      {anneeConsultee && anneeConsultee.active === false && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900" role="status">
          📚 Consultation de l&apos;année {anneeConsultee.libelle} (clôturée) — données en lecture
        </div>
      )}

      {/* ---------- Panneau des seuils paramétrables ---------- */}
      {panneauSeuils && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-emerald-900 mb-1">Seuils d&apos;alerte du cockpit</h3>
            <p className="text-xs text-gray-600 mb-3">Personnalisez les déclencheurs — enregistrés sur ce poste (localStorage).</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {([
                ['retardJours', 'Retard de paiement (jours)', 1, 120],
                ['avancement', 'Avancement programme (%)', 0, 100],
                ['budget', 'Consommation budget (%)', 50, 100],
                ['absence', 'Absentéisme (%)', 0, 50],
              ] as const).map(([cle, libelle, min, max]) => (
                <div key={cle}>
                  <label className="text-[11px] font-medium text-gray-700 block mb-1">{libelle}</label>
                  <Input
                    type="number"
                    min={min}
                    max={max}
                    value={seuils[cle]}
                    onChange={(e) => majSeuil(cle, Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- V1 — Analytique financière ---------- */}
      {vueComplete && financieres && (
        <SectionBlock
          title="Analytique financière — recettes, recouvrement, impayés, trésorerie"
          description={`Recettes par type (année civile) · recouvrement par classe (tri croissant) · vieillissement des impayés · projection de trésorerie à 3 mois`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
            {/* Bloc 1 — Recettes par type de frais (mini barres horizontales) */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Recettes par type de frais</h4>
              {recettesParType.length === 0 && <p className="text-sm text-gray-500">Aucun encaissement enregistré cette année civile.</p>}
              <div className="space-y-2">
                {recettesParType.map((r: any) => (
                  <div key={r.type} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 w-32 truncate capitalize flex-shrink-0" title={r.type}>{r.type.replace(/_/g, ' ')}</span>
                    <div className="h-3 flex-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(((r.montant ?? 0) / maxRecetteType) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 tabular-nums whitespace-nowrap">{formatXOF(r.montant, devise)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Bloc 3 — Vieillissement des impayés (5 badges) */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1.5"><Hourglass className="h-3.5 w-3.5" /> Vieillissement des impayés</h4>
              <div className="flex flex-wrap gap-2">
                {vieillissementImpayes.map((v: any) => (
                  <span key={v.tranche} className={`inline-flex flex-col items-start rounded-lg border px-3 py-2 ${COULEURS_VIEILLISSEMENT[v.tranche] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                    <span className="text-[11px] font-medium">{v.tranche}</span>
                    <span className="text-sm font-bold tabular-nums">{formatXOF(v.montant, devise)}</span>
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">Restant dû par ancienneté d&apos;échéance — au-delà de 60 j, relancez les familles (module Finances).</p>
            </div>
          </div>

          {/* Bloc 2 — Recouvrement par classe (table, tri par taux croissant) */}
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Recouvrement par classe — les plus en difficulté en premier</h4>
          <DataTable
            columns={[
              { key: 'classe', label: 'Classe' },
              { key: 'du', label: 'Dû', render: (r) => formatXOF(r.du, devise) },
              { key: 'paye', label: 'Payé', render: (r) => <span className="font-semibold">{formatXOF(r.paye, devise)}</span> },
              { key: 'taux', label: 'Taux de recouvrement', render: (r) => <BarreTaux taux={r.taux} /> },
            ]}
            rows={recouvrementParClasse}
            emptyLabel="Aucune échéance de frais sur l'année — module Finances → frais & échéanciers"
          />

          {/* Bloc 4 — Projection de trésorerie 3 mois */}
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2 mt-4">Projection de trésorerie — 3 prochains mois</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {projectionTresorerie.map((p: any) => (
              <Card key={p.mois} className={depuisCentimes(p.montant) === 0 ? 'border-gray-200' : 'border-emerald-200 bg-emerald-50/40'}>
                <CardContent className="p-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{libelleMois(p.mois)}</p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums">{formatXOF(p.montant, devise)}</p>
                  <p className="text-[11px] text-gray-500">attendu (échéances restant dues)</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* ---------- V2 — Analytique pédagogique ---------- */}
      {pedagogiques && (
        <SectionBlock
          title="Analytique pédagogique — moyennes par matière, classe et enseignant"
          description={`${pedagogiques.totalNotes ?? 0} notes prises en compte · matière la plus fragile en premier (tri croissant) · échelle /20`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard
              title="Moyenne générale"
              value={pedagogiques.moyenneGlobale != null ? `${pedagogiques.moyenneGlobale.toFixed(2)}/20` : '—'}
              sub={`${pedagogiques.totalNotes ?? 0} notes · ${pedagoParMatiere.length} matière(s)`}
              icon={Award}
              color={pedagogiques.moyenneGlobale != null && pedagogiques.moyenneGlobale < 10 ? 'rose' : pedagogiques.moyenneGlobale != null && pedagogiques.moyenneGlobale < 14 ? 'amber' : 'emerald'}
            />
            <StatCard title="Classes évaluées" value={pedagoParClasse.length} sub="moyenne par classe" icon={School} color="blue" />
            <StatCard title="Enseignants notés" value={pedagoParEnseignant.length} sub="moyenne par enseignant" icon={GraduationCap} color="purple" />
            <StatCard
              title="Matière la plus fragile"
              value={pedagoParMatiere[0]?.moyenne != null ? `${pedagoParMatiere[0].moyenne.toFixed(2)}/20` : '—'}
              sub={pedagoParMatiere[0]?.matiere ?? 'Aucune note'}
              icon={AlertTriangle}
              color={pedagoParMatiere[0]?.moyenne != null && pedagoParMatiere[0].moyenne < 10 ? 'rose' : 'amber'}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Par matière — difficultés en premier</h4>
              <DataTable
                columns={[
                  { key: 'matiere', label: 'Matière' },
                  { key: 'moyenne', label: 'Moy. /20', render: (r) => <span className={`font-semibold ${couleurMoyenne(r.moyenne)}`}>{r.moyenne != null ? r.moyenne.toFixed(2) : '—'}</span> },
                  { key: 'notes', label: 'Notes' },
                ]}
                rows={pedagoParMatiere}
                emptyLabel="Aucune note saisie"
              />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Par classe</h4>
              <DataTable
                columns={[
                  { key: 'classe', label: 'Classe' },
                  { key: 'moyenne', label: 'Moy. /20', render: (r) => <span className={`font-semibold ${couleurMoyenne(r.moyenne)}`}>{r.moyenne != null ? r.moyenne.toFixed(2) : '—'}</span> },
                  { key: 'notes', label: 'Notes' },
                ]}
                rows={pedagoParClasse}
                emptyLabel="Aucune note saisie"
              />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Par enseignant</h4>
              <DataTable
                columns={[
                  { key: 'enseignant', label: 'Enseignant' },
                  { key: 'moyenne', label: 'Moy. /20', render: (r) => <span className={`font-semibold ${couleurMoyenne(r.moyenne)}`}>{r.moyenne != null ? r.moyenne.toFixed(2) : '—'}</span> },
                  { key: 'notes', label: 'Notes' },
                ]}
                rows={pedagoParEnseignant}
                emptyLabel="Aucune note saisie"
              />
            </div>
          </div>
        </SectionBlock>
      )}

      {/* ---------- V3 — Absentéisme 12 mois ---------- */}
      <SectionBlock
        title="Absentéisme — 12 derniers mois"
        description={`${presences12m.length} pointage(s) sur la fenêtre · ${absences12m} absence(s) · ${retards12m} retard(s) · taux d'absentéisme : ${tauxAbsenteisme != null ? `${tauxAbsenteisme}%` : '—'}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard title="Absences (12 mois)" value={absences12m} sub="tous élèves confondus" icon={AlertTriangle} color={absences12m > 0 ? 'rose' : 'gray'} />
          <StatCard title="Retards (12 mois)" value={retards12m} sub="tous élèves confondus" icon={Clock} color={retards12m > 0 ? 'amber' : 'gray'} />
          <StatCard title="Taux d'absentéisme" value={tauxAbsenteisme != null ? `${tauxAbsenteisme}%` : '—'} sub="absences / (présences + absences)" icon={ClipboardList} color={tauxAbsenteisme != null && tauxAbsenteisme > seuils.absence ? 'rose' : 'emerald'} />
          <StatCard title="Présences pointées" value={presents12m} sub={`${presences12m.length} pointages au total`} icon={UserCheck} color="emerald" />
        </div>

        {/* Barres simples par mois (absences et retards, via dateSaisie) */}
        {serieAbsences12m.length > 0 && (
          <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-white">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">Évolution mensuelle — absences & retards</h4>
              <div className="flex items-center gap-3 text-[11px] text-gray-600">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-rose-500" /> Absences</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-amber-400" /> Retards</span>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-28">
              {serieAbsences12m.map((m) => (
                <div key={m.cle} className="flex-1 flex flex-col items-center gap-1 group" title={`${libelleMois(m.cle)} — ${m.absences} absence(s), ${m.retards} retard(s)`}>
                  <div className="w-full flex items-end justify-center gap-0.5 h-20">
                    <div className="w-2.5 rounded-t bg-rose-500" style={{ height: `${Math.round((m.absences / maxAbsMois) * 100)}%`, minHeight: m.absences > 0 ? 3 : 0 }} />
                    <div className="w-2.5 rounded-t bg-amber-400" style={{ height: `${Math.round((m.retards / maxAbsMois) * 100)}%`, minHeight: m.retards > 0 ? 3 : 0 }} />
                  </div>
                  <span className="text-[9px] text-gray-500 tabular-nums">{libelleMois(m.cle).replace(' ', '\u00a0')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DataTable
          columns={[
            { key: 'classe', label: 'Classe' },
            { key: 'pointages', label: 'Pointages' },
            { key: 'absences', label: 'Absences', render: (r) => (r.absences > 0 ? <TagRouge>{r.absences}</TagRouge> : <TagVert>0</TagVert>) },
            { key: 'retards', label: 'Retards' },
            { key: 'taux', label: 'Taux d\'absentéisme', render: (r) => <BarreTaux taux={r.taux} inverse /> },
          ]}
          rows={absenteismeParClasse}
          emptyLabel="Aucun pointage de présence sur les 12 derniers mois"
        />
      </SectionBlock>

      {/* ---------- V7 — Rapport de trimestre ---------- */}
      {vueComplete && (
        <SectionBlock
          title="Rapport de trimestre consolidé"
          description="Synthèse officielle d'une période : effectifs, résultats, finances, vie scolaire — générée à la demande, imprimable"
        >
          <RapportTrimestre periodes={periodes} devise={devise} />
        </SectionBlock>
      )}

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
          sub={avancementsEnRetard.length > 0 ? `${avancementsEnRetard.length} en retard (< ${seuils.avancement}%)` : `${avancementsDetail.length} suivis · tous à l'heure`}
          icon={BookOpen}
          color={avancementsEnRetard.length > 0 ? 'rose' : 'purple'}
        />
        {vueComplete && (
          <>
            <StatCard title={`Encaissé ${moisActif ? `(${moisActif})` : 'mois courant'}`} value={formatXOF(encaisseMois, devise)} sub={`${paiements.length} paiements au total`} icon={Wallet} color="purple" />
            <StatCard title="Scolarité — restant dû" value={formatXOF(restantDu, devise)} sub={`Recouvrement : ${tauxRecouvrement}% · ${retardataires.length} en retard`} icon={PiggyBank} color={retardataires.length > 0 ? 'amber' : 'emerald'} />
            <StatCard title={`Dépenses ${moisActif ? `(${moisActif})` : 'mois courant'}`} value={formatXOF(depensesMois, devise)} sub={depensesNonValidees.length > 0 ? `${depensesNonValidees.length} à valider` : `${depenses.length} au total`} icon={TrendingDown} color="amber" />
            <StatCard title="Solde du mois" value={formatXOF(soldeMois, devise)} sub={`Cumul : ${formatXOF(encaisseCumule - depensesCumulees, devise)}`} icon={TrendingUp} color={soldeMois >= 0 ? 'emerald' : 'rose'} />
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
        action={
          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => telechargerCsv('titulariat', ['Classe', 'Niveau', 'Cycle', 'Titulaire', 'Effectif'], lignesTitulariat.map((l: any) => [l.code, l.niveau, l.cycle, l.titulaire ?? 'NON ATTRIBUÉ', l.effectif]))}
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
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
        description={`Avancement moyen : ${avancementMoyen != null ? `${avancementMoyen}%` : '—'} · ${avancementsEnRetard.length} sous le seuil de ${seuils.avancement}% · trié du plus en retard au plus avancé`}
        action={
          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => telechargerCsv('avancement-programmes', ['Classe', 'Matière', 'Chapitre', 'Enseignant', 'Avancement %', 'Mis à jour'], avancementsDetail.map((a: any) => [a.classe, a.matiere, a.chapitre, a.enseignant, a.pourcentage, a.dateMaj ? formatDate(a.dateMaj) : '—']))}
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      >
        <DataTable
          columns={[
            { key: 'classe', label: 'Classe' },
            { key: 'matiere', label: 'Matière' },
            { key: 'chapitre', label: 'Chapitre en cours' },
            { key: 'enseignant', label: 'Enseignant' },
            { key: 'pourcentage', label: 'Avancement', render: (r) => <MiniBar pct={r.pourcentage} seuil={seuils.avancement} /> },
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
        {/* Anti-oubli d'appel : séances planifiées mais aucun pointage */}
        {appelsManquants.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-2">Appel non fait — classes à relancer</h4>
            <DataTable
              columns={[
                { key: 'code', label: 'Classe' },
                { key: 'libelle', label: 'Libellé' },
                { key: 'nbSeances', label: 'Séances planifiées' },
                { key: 'action', label: 'À faire', render: (r) => <TagRouge>Relancer le titulaire — aucun pointage</TagRouge> },
              ]}
              rows={appelsManquants}
              emptyLabel=""
            />
          </div>
        )}
      </SectionBlock>

      {/* ---------- 6. Top élèves ---------- */}
      <SectionBlock
        title="Meilleures notes — podium des élèves"
        description="Classement des bulletins par moyenne générale (toutes périodes confondues)"
        action={
          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => telechargerCsv('top-eleves', ['Rang', 'Élève', 'Classe', 'Moyenne', 'Statut bulletin'], topEleves.map((r: any) => [r.rang, r.eleve, r.classe, r.moyenne, r.statut]))}
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      >
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
            description={`Restant dû global : ${formatXOF(restantDu, devise)} · taux de recouvrement : ${tauxRecouvrement}% · ${retardataires.length} échéance(s) en retard (trié par ancienneté)`}
            action={
              <Button
                variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                onClick={() => telechargerCsv('retards-scolarite', ['Élève', 'Classe', 'Frais', 'Restant dû', 'Retard (j)', 'Statut'], retardataires.map((r: any) => [r.eleve, r.classe, r.frais, r.restant, r.jours, r.statut]))}
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard title="Élèves à jour" value={Math.max(0, elevesAJour)} sub={`sur ${elevesActifs.length} actifs`} icon={UserCheck} color="emerald" />
              <StatCard title="En retard" value={new Set(retardataires.map((r: any) => r.eleve)).size} sub={`${retardataires.length} échéance(s)`} icon={AlertTriangle} color={retardataires.length ? 'rose' : 'gray'} />
              <StatCard title="Restant dû" value={formatXOF(restantDu, devise)} sub={`sur ${formatXOF(totalDu, devise)} attendus`} icon={PiggyBank} color="amber" />
              <StatCard title="Encaissé" value={formatXOF(totalPaye, devise)} sub={`${paiements.length} paiements`} icon={Wallet} color="purple" />
            </div>
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève' },
                { key: 'classe', label: 'Classe' },
                { key: 'frais', label: 'Frais' },
                { key: 'restant', label: 'Restant dû', render: (r) => <span className="font-semibold text-rose-700">{formatXOF(r.restant, devise)}</span> },
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
              <StatCard title="Recettes du mois" value={formatXOF(encaisseMois, devise)} sub="scolarité & frais encaissés" icon={TrendingUp} color="emerald" />
              <StatCard title="Dépenses du mois" value={formatXOF(depensesMois, devise)} sub={depensesNonValidees.length ? `${depensesNonValidees.length} en attente de validation` : 'toutes validées'} icon={TrendingDown} color="amber" />
              <StatCard title="Solde du mois" value={formatXOF(soldeMois, devise)} sub={`cumul saison : ${formatXOF(encaisseCumule - depensesCumulees, devise)}`} icon={Wallet} color={soldeMois >= 0 ? 'emerald' : 'rose'} />
              <StatCard title="Masse salariale" value={formatXOF(masseSalarialeMois, devise)} sub={moisActif ?? '—'} icon={GraduationCap} color="purple" />
            </div>
            {/* Tendances recettes vs dépenses — 6 derniers mois (SVG natif) */}
            <CourbeTendances recettes={serieRecettes} depenses={serieDepenses} devise={devise} />
            <DataTable
              columns={[
                { key: 'budget', label: 'Budget' },
                { key: 'libelle', label: 'Ligne' },
                { key: 'montantPrevu', label: 'Prévu', render: (l) => formatXOF(l.montantPrevu, devise) },
                { key: 'montantRealise', label: 'Réalisé', render: (l) => formatXOF(l.montantRealise, devise) },
                { key: 'consommation', label: 'Consommation', render: (l) => (l.montantPrevu > 0 ? <MiniBar pct={(l.montantRealise / l.montantPrevu) * 100} /> : '—') },
              ]}
              rows={budgetLignes}
              emptyLabel="Aucun budget ligne — module Finances → budgets"
            />
            {budgetPct != null && (
              <p className="text-xs text-gray-500 mt-2">
                Consommation budgétaire globale : <strong>{budgetPct}%</strong> ({formatXOF(budgetRealise, devise)} réalisés sur {formatXOF(budgetPrevu, devise)} prévus)
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
                    { key: 'net', label: 'Net à payer', render: (b) => <span className="font-semibold">{formatXOF(b.net, devise)}</span> },
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
                { key: 'montant', label: 'Montant', render: (p) => formatXOF(p.montant, p.devise ?? devise) },
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
