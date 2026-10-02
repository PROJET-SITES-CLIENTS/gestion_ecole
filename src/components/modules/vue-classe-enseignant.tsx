'use client';

// ====================================================================
// VUE CLASSE ENSEIGNANT — « j'entre dans MA classe et j'ai tout »
//   1. En-tête : classe, effectif G/F, ma moyenne de classe ;
//   2. Mes matières dans cette classe (+ avancement programme) ;
//   3. Ma semaine en 3 zones : PASSÉ (qu'ai-je enseigné — contenu du
//      cahier), AUJOURD'HUI (séance + appel + clôture), À VENIR (prochain
//      chapitre prévu) ;
//   4. Clôture de séance : contenu fait + chapitre + % avancement +
//      RESTE À RATTRAPER (conservé pour la séance suivante) ;
//   5. Mes élèves : moyenne dans MES matières, tendance ▲▼=, sparkline,
//      statut d'appel du jour ;
//   6. Évaluations : création pré-remplie (ma classe, ma matière) et
//      saisie des notes en grille, contextualisée.
// ====================================================================

import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, BookOpen, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { SectionBlock, StatusBadge, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import * as actions from '@/app/actions';
import * as actionsExt from '@/app/actions/extensions';
import { formatDate } from '@/lib/format';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const memeJour = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function VueClasseEnseignant({ initialData, classeId, onFermer, onNaviguer }: {
  initialData: any;
  classeId: string;
  onFermer: () => void;
  onNaviguer?: (module: string) => void;
}) {
  const retour = useActionFeedback();
  const seances = initialData.seances ?? [];
  const eleves = initialData.eleves ?? [];
  const classes = initialData.classes ?? [];
  const matieres = initialData.matieres ?? [];
  const personnels = initialData.personnels ?? [];
  const cahiers = initialData.cahiersTexte ?? [];
  const programmes = initialData.programmes ?? [];
  const avancements = initialData.avancements ?? [];
  const evaluations = initialData.evaluations ?? [];
  const notes = initialData.notes ?? [];
  const presences = initialData.presences ?? [];
  const niveaux = initialData.niveaux ?? [];
  const periodes = initialData.periodes ?? [];

  const classe = classes.find((c: any) => c.id === classeId);
  const moi = personnels.find((p: any) => p.utilisateurId === initialData.session?.utilisateur?.id) ?? null;

  // ── Mes matières dans CETTE classe (affectations) ──
  const mesMatieres = useMemo(() => {
    const affs = (initialData.affectationsEnseignant ?? []).filter((a: any) => a.classeId === classeId && (!moi || a.personnelId === moi.id));
    return affs.map((a: any) => matieres.find((m: any) => m.id === a.matiereId)).filter(Boolean);
  }, [initialData.affectationsEnseignant, classeId, matieres, moi]);
  const mesMatiereIds = mesMatieres.map((m: any) => m.id);

  const [matiereActive, setMatiereActive] = useState<string>(mesMatieres[0]?.id ?? '');
  const matiereChoisie = mesMatieres.find((m: any) => m.id === matiereActive) ?? mesMatieres[0] ?? null;

  // ── Mes séances dans cette classe ──
  const mesSeances = useMemo(() => seances
    .filter((s: any) => s.classeId === classeId && (!moi || s.enseignantId === moi.id) && s.statut !== 'annulee')
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()), [seances, classeId, moi]);

  const auj0 = new Date(); auj0.setHours(0, 0, 0, 0);
  const demain = new Date(auj0); demain.setDate(demain.getDate() + 1);
  const seancesPassees = mesSeances.filter((s: any) => new Date(s.date) < auj0).slice(-8).reverse();
  const seancesAujourdhui = mesSeances.filter((s: any) => { const d = new Date(s.date); return d >= auj0 && d < demain; });
  const seancesFutures = mesSeances.filter((s: any) => new Date(s.date) >= demain).slice(0, 8);

  // ── Ce qui a été enseigné : entrées du cahier (même jour, même matière) ──
  const entreePourSeance = (s: any) => {
    for (const ct of cahiers) {
      if (ct.classeId !== classeId || (ct.matiereId && ct.matiereId !== s.matiereId)) continue;
      const e = (ct.entrees ?? []).find((x: any) => memeJour(new Date(x.dateCours), new Date(s.date)));
      if (e) return e;
    }
    return null;
  };
  const avancementPour = (chapitreId?: string | null) => (chapitreId ? avancements.find((a: any) => a.chapitreId === chapitreId && a.classeId === classeId)?.pourcentage ?? null : null);

  // ── Prochain chapitre prévu (programme matière × niveau de la classe) ──
  const niveauClasse = niveaux.find((n: any) => n.id === classe?.niveauId);
  const prochainsChapitres = useMemo(() => {
    const map = new Map<string, any>();
    if (!niveauClasse) return map;
    for (const mid of mesMatiereIds.length ? mesMatiereIds : matieres.map((m: any) => m.id)) {
      const prog = programmes.find((p: any) => p.matiereId === mid && p.niveauId === niveauClasse.id);
      if (!prog) continue;
      const ch = (prog.chapitres ?? []).slice().sort((a: any, b: any) => (a.ordre ?? 0) - (b.ordre ?? 0))
        .find((c: any) => (avancementPour(c.id) ?? 0) < 100);
      if (ch) map.set(mid, ch);
    }
    return map;
  }, [programmes, niveauClasse, avancements, classeId]);

  // ── Élèves de la classe ──
  const elevesClasse = eleves.filter((e: any) => e.classeActuelleId === classeId && e.statut === 'actif');
  const effG = elevesClasse.filter((e: any) => e.sexe === 'M').length;
  const effF = elevesClasse.filter((e: any) => e.sexe === 'F').length;

  // ── Mes évaluations (mes matières, cette classe) ──
  const mesEvals = useMemo(() => evaluations
    .filter((e: any) => e.classeId === classeId && mesMatiereIds.includes(e.matiereId))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()), [evaluations, classeId, mesMatiereIds]);

  // ── Appel du jour (par élève, toutes matières confondues de la classe) ──
  const seancesJourClasse = seances.filter((s: any) => { const d = new Date(s.date); return s.classeId === classeId && d >= auj0 && d < demain && s.statut !== 'annulee'; });
  const appelDuJour = (eleveId: string) => {
    const ps = presences.filter((p: any) => p.eleveId === eleveId && seancesJourClasse.some((s: any) => s.id === p.seanceId));
    if (ps.length === 0) return null;
    const abs = ps.filter((p: any) => p.statut === 'absent').length;
    const pres = ps.filter((p: any) => p.statut === 'present').length;
    if (abs > 0) return 'absent';
    if (pres > 0) return 'present';
    return ps[0].statut;
  };

  // ── Notes de l'élève dans MES matières + tendance + sparkline ──
  const serieEleve = (eleveId: string) => notes
    .filter((n: any) => n.eleveId === eleveId && !n.absent && n.valeur != null && mesEvals.some((e: any) => e.id === n.evaluationId))
    .map((n: any) => {
      const ev = mesEvals.find((e: any) => e.id === n.evaluationId);
      return { date: new Date(ev.date).getTime(), sur20: (n.valeur / ev.sur) * 20, coef: ev.coefficient ?? 1 };
    })
    .sort((a, b) => a.date - b.date);
  const statsEleve = (eleveId: string) => {
    const serie = serieEleve(eleveId);
    if (serie.length === 0) return { moyenne: null, tendance: '—', serie: [] as number[] };
    const totC = serie.reduce((s, x) => s + x.coef, 0);
    const moyenne = Number((serie.reduce((s, x) => s + x.sur20 * x.coef, 0) / totC).toFixed(2));
    let tendance = '—';
    if (serie.length >= 2) {
      const k = Math.max(1, Math.floor(serie.length / 2));
      const dernieres = serie.slice(-k), precedentes = serie.slice(0, serie.length - k);
      const mD = dernieres.reduce((s, x) => s + x.sur20, 0) / k;
      const mP = precedentes.length > 0 ? precedentes.reduce((s, x) => s + x.sur20, 0) / precedentes.length : mD;
      const d = mD - mP;
      tendance = d > 0.75 ? 'hausse' : d < -0.75 ? 'baisse' : 'stable';
    }
    return { moyenne, tendance, serie: serie.map((x) => Number(x.sur20.toFixed(1))) };
  };

  const Sparkline = ({ valeurs }: { valeurs: number[] }) => {
    if (valeurs.length < 2) return <span className="text-[10px] text-gray-300">—</span>;
    const max = Math.max(...valeurs, 20);
    const points = valeurs.map((v, i) => `${(i / (valeurs.length - 1)) * 60},${20 - (v / max) * 18}`).join(' ');
    const derniere = valeurs[valeurs.length - 1];
    return (
      <svg width="62" height="22" className="flex-shrink-0" aria-label="Évolution des notes">
        <polyline points={points} fill="none" stroke={derniere >= 10 ? '#059669' : '#e11d48'} strokeWidth="1.5" />
        {valeurs.map((v, i) => <circle key={i} cx={(i / (valeurs.length - 1)) * 60} cy={20 - (v / max) * 18} r="1.3" fill="#6b7280" />)}
      </svg>
    );
  };

  // ── Moyenne de classe dans mes matières + distribution ──
  const moyennesClasse = elevesClasse.map((e: any) => statsEleve(e.id).moyenne).filter((m: any): m is number => m != null);
  const moyenneClasse = moyennesClasse.length ? Number((moyennesClasse.reduce((s, m) => s + m, 0) / moyennesClasse.length).toFixed(2)) : null;
  const distribution = {
    fortes: moyennesClasse.filter((m) => m >= 14).length,
    moyennes: moyennesClasse.filter((m) => m >= 10 && m < 14).length,
    faibles: moyennesClasse.filter((m) => m < 10).length,
  };

  // ── Clôture de séance (formulaire) ──
  const [seanceACloturer, setSeanceACloturer] = useState<any>(null);
  const chapitresMatiereActive = useMemo(() => {
    if (!niveauClasse || !matiereChoisie) return [];
    const prog = programmes.find((p: any) => p.matiereId === matiereChoisie.id && p.niveauId === niveauClasse.id);
    return (prog?.chapitres ?? []).slice().sort((a: any, b: any) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }, [programmes, niveauClasse, matiereChoisie]);

  // ── Saisie de notes inline ──
  const [evalActive, setEvalActive] = useState<string | null>(null);
  const evalChoisie = mesEvals.find((e: any) => e.id === evalActive) ?? null;
  const [erreurNotes, setErreurNotes] = useState<string | null>(null);
  const notesEval = evalChoisie ? notes.filter((n: any) => n.evaluationId === evalChoisie.id) : [];
  const periodeEnCours = periodes.find((p: any) => { const n = new Date(); return n >= new Date(p.dateDebut) && n <= new Date(p.dateFin); });

  if (!classe) return null;

  return (
    <div className="space-y-5">
      {/* ── En-tête classe ── */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onFermer} className="flex items-center gap-1 text-sm text-emerald-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Mes classes
        </button>
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-xl font-semibold text-gray-900">{classe.libelle}</h2>
          <p className="text-xs text-gray-500">
            {niveauClasse?.libelle} · {elevesClasse.length} élèves ({effG} G · {effF} F)
            {moyenneClasse != null && <> · ma moyenne de classe : <b className="text-gray-700">{moyenneClasse.toFixed(2)}/20</b></>}
          </p>
        </div>
      </div>

      {/* ── 1. Mes matières dans cette classe ── */}
      <SectionBlock title="Mes matières dans cette classe" description="Cliquez sur une matière pour contextualiser la clôture de séance et les chapitres">
        {mesMatieres.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune matière ne vous est affectée dans cette classe — demandez à la direction de configurer vos affectations.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mesMatieres.map((m: any) => {
              const prog = niveauClasse ? programmes.find((p: any) => p.matiereId === m.id && p.niveauId === niveauClasse.id) : null;
              const chaps = prog?.chapitres ?? [];
              const pct = chaps.length ? Math.round(chaps.reduce((s: number, c: any) => s + (avancementPour(c.id) ?? 0), 0) / chaps.length) : null;
              return (
                <button key={m.id} onClick={() => setMatiereActive(m.id)}
                  className={`px-3 py-1.5 rounded-xl border text-sm transition-colors ${matiereChoisie?.id === m.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'}`}>
                  {m.libelle}
                  {pct != null && <span className={`ml-1.5 text-[10px] ${matiereChoisie?.id === m.id ? 'text-emerald-100' : 'text-gray-400'}`}>prog. {pct}%</span>}
                </button>
              );
            })}
          </div>
        )}
      </SectionBlock>

      {/* ── 2. Ma semaine : passé / aujourd'hui / à venir ── */}
      <SectionBlock
        title="Ma semaine avec cette classe"
        description="Passé : ce que j'ai enseigné · Aujourd'hui : appel et clôture · À venir : le chapitre prévu"
      >
        <div className="overflow-x-auto grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* PASSÉ */}
          <Card className="border border-gray-100">
            <CardContent className="p-3">
              <div className="text-[11px] font-semibold text-gray-500 uppercase mb-2">📅 Déjà enseigné</div>
              {seancesPassees.length === 0 ? <p className="text-xs text-gray-400">Aucune séance passée récente.</p> : (
                <div className="space-y-1.5">
                  {seancesPassees.map((s: any) => {
                    const entree = entreePourSeance(s);
                    const pct = entree?.chapitreId ? avancementPour(entree.chapitreId) : null;
                    return (
                      <div key={s.id} className="p-2 bg-gray-50 rounded text-xs">
                        <div className="font-medium text-gray-700">
                          {JOURS[new Date(s.date).getDay()]} {formatDate(s.date)} · {s.heureDebut} — {matieres.find((m: any) => m.id === s.matiereId)?.libelle}
                        </div>
                        {entree ? (
                          <div className="mt-0.5">
                            <span className="text-gray-600 line-clamp-1">« {entree.contenu} »</span>
                            {entree.chapitre && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] mt-0.5">{entree.chapitre.titre}</Badge>}
                            {pct != null && pct < 100 && <span className="text-amber-600 block" title={avancements.find((a: any) => a.chapitreId === entree.chapitreId && a.classeId === classeId)?.commentaire ?? ''}>⚠ avancement {pct}% — à rattraper</span>}
                          </div>
                        ) : (
                          <button onClick={() => { setMatiereActive(s.matiereId); setSeanceACloturer(s); }} className="text-[11px] text-amber-700 hover:underline">Non renseigné — compléter le cahier</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AUJOURD'HUI */}
          <Card className="border border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-3">
              <div className="text-[11px] font-semibold text-emerald-700 uppercase mb-2">⏰ Aujourd&apos;hui</div>
              {seancesAujourdhui.length === 0 ? <p className="text-xs text-gray-400">Pas de séance aujourd&apos;hui avec cette classe.</p> : (
                <div className="space-y-2">
                  {seancesAujourdhui.map((s: any) => {
                    const fait = presences.some((p: any) => p.seanceId === s.id);
                    const entree = entreePourSeance(s);
                    return (
                      <div key={s.id} className="p-2 bg-white rounded border border-emerald-100 text-xs">
                        <div className="font-medium">{s.heureDebut}–{s.heureFin} · {matieres.find((m: any) => m.id === s.matiereId)?.libelle}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {fait
                            ? <StatusBadge statut="valide" label="Appel fait" />
                            : <button onClick={() => onNaviguer?.('presences')} className="text-emerald-700 font-medium hover:underline">→ Faire l&apos;appel</button>}
                          {entree
                            ? <StatusBadge statut="publie" label="Cahier rempli" />
                            : <button onClick={() => { setMatiereActive(s.matiereId); setSeanceACloturer(s); }} className="text-amber-700 font-medium hover:underline">→ Clôturer la séance</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* À VENIR */}
          <Card className="border border-gray-100">
            <CardContent className="p-3">
              <div className="text-[11px] font-semibold text-blue-700 uppercase mb-2">🔜 À venir</div>
              {seancesFutures.length === 0 ? <p className="text-xs text-gray-400">Aucune séance planifiée (vérifiez l&apos;EDT).</p> : (
                <div className="space-y-1.5">
                  {seancesFutures.map((s: any) => {
                    const chap = prochainsChapitres.get(s.matiereId);
                    const aRattraper = [...prochainsChapitres.entries()].some(([, c]) => (avancementPour(c.id) ?? 0) > 0 && (avancementPour(c.id) ?? 0) < 100);
                    return (
                      <div key={s.id} className="p-2 bg-blue-50/50 rounded text-xs">
                        <div className="font-medium text-gray-700">
                          {JOURS[new Date(s.date).getDay()]} {formatDate(s.date)} · {s.heureDebut} — {matieres.find((m: any) => m.id === s.matiereId)?.libelle}
                        </div>
                        {chap && <div className="text-[11px] text-gray-500 mt-0.5">Chapitre prévu : <span className="text-gray-700 font-medium">{chap.titre}</span></div>}
                        {aRattraper && <div className="text-[11px] text-amber-700 mt-0.5">⚠ prévoir le rattrapage des chapitres incomplets</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SectionBlock>

      {/* ── 3. Mes élèves : niveau dans MES matières ── */}
      <SectionBlock
        title="Mes élèves — niveau dans mes matières"
        description="Moyenne pondérée, tendance (▲ croissance · ▼ chute · = stable) et évolution des notes de chaque élève"
        action={onNaviguer ? <button onClick={() => onNaviguer('presences')} className="text-sm text-emerald-700 hover:underline">Signaler une absence (appel)</button> : undefined}
      >
        {elevesClasse.length === 0 ? <p className="text-sm text-gray-500">Aucun élève actif dans cette classe.</p> : (
          <>
            <div className="flex flex-wrap gap-2 mb-3 text-xs">
              <span className="px-2 py-1 bg-gray-100 rounded">Moyenne de classe : <b>{moyenneClasse?.toFixed(2) ?? '—'}/20</b></span>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded">≥14 : {distribution.fortes}</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">10–14 : {distribution.moyennes}</span>
              <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded">&lt;10 : {distribution.faibles}</span>
            </div>
            <div className="space-y-1">
              {elevesClasse.map((e: any) => {
                const st = statsEleve(e.id);
                const appel = appelDuJour(e.id);
                return (
                  <div key={e.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 ${e.sexe === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                      {e.sexe === 'F' ? 'F' : 'M'}
                    </div>
                    <div className="w-40 truncate font-medium" title={`${e.prenom} ${e.nom}`}>{e.prenom} {e.nom}</div>
                    <Sparkline valeurs={st.serie} />
                    <div className="w-14 text-right font-semibold">
                      {st.moyenne != null ? st.moyenne.toFixed(1) : <span className="text-gray-300">—</span>}
                      <span className="text-[10px] text-gray-400">/20</span>
                    </div>
                    <div className="w-16 text-center flex-shrink-0">
                      {st.tendance === 'hausse' && <span className="text-emerald-600 flex items-center justify-center gap-0.5 text-xs font-medium"><TrendingUp className="h-3.5 w-3.5" /> hausse</span>}
                      {st.tendance === 'baisse' && <span className="text-rose-600 flex items-center justify-center gap-0.5 text-xs font-medium"><TrendingDown className="h-3.5 w-3.5" /> baisse</span>}
                      {st.tendance === 'stable' && <span className="text-gray-500 flex items-center justify-center gap-0.5 text-xs"><Minus className="h-3.5 w-3.5" /> stable</span>}
                      {st.tendance === '—' && <span className="text-[10px] text-gray-300">pas de note</span>}
                    </div>
                    <div className="flex-1" />
                    {appel === 'absent' && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] flex-shrink-0"><AlertTriangle className="h-3 w-3 mr-1" />absent aujourd&apos;hui</Badge>}
                    {appel === 'present' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] flex-shrink-0">présent</Badge>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SectionBlock>

      {/* ── 4. Évaluations & notes ── */}
      <SectionBlock
        title="Évaluations & notes"
        description="Créez l'évaluation (votre matière est pré-selectionnée) puis saisissez les notes — le système sait que c'est pour cette classe et cette matière"
      >
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Button
            size="sm" className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setEvalActive('__nouvelle__')}
          >
            <ClipboardCheck className="h-4 w-4 mr-1" /> Nouvelle évaluation
          </Button>
          {mesEvals.slice(0, 6).map((e: any) => (
            <button key={e.id} onClick={() => { setEvalActive(e.id); setErreurNotes(null); }}
              className={`px-2.5 py-1 rounded-full text-xs border ${evalActive === e.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}>
              {matieres.find((m: any) => m.id === e.matiereId)?.libelle?.slice(0, 10)} · {e.intitule.slice(0, 18)} · {e._count?.notes ?? notes.filter((n: any) => n.evaluationId === e.id).length} note(s)
            </button>
          ))}
        </div>
        {retour.Message}

        {evalActive === '__nouvelle__' && (
          <Card className="border border-emerald-200 mb-3">
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-2">Nouvelle évaluation — {classe.libelle}</div>
              <form
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  const fd = new FormData(ev.currentTarget);
                  fd.set('classeId', classeId);
                  fd.set('matiereId', matiereChoisie?.id ?? '');
                  const periodeFiable = periodeEnCours ?? periodes[0];
                  if (periodeFiable) fd.set('periodeId', periodeFiable.id);
                  fd.set('enseignantId', moi?.id ?? '');
                  retour.run(async () => {
                    const r = await actions.creerEvaluation(fd);
                    if (r?.ok) { setEvalActive(null); }
                    return r;
                  }, 'Évaluation créée — sélectionnez-la pour saisir les notes.');
                }}
              >
                <label className="text-xs space-y-1"><span className="text-gray-600">Matière (la vôtre)</span>
                  <select defaultValue={matiereChoisie?.id ?? ''} disabled className="w-full h-8 rounded-md border border-gray-200 bg-gray-50 px-2 text-xs">{mesMatieres.map((m: any) => <option key={m.id} value={m.id}>{m.libelle}</option>)}</select>
                </label>
                <label className="text-xs space-y-1"><span className="text-gray-600">Type</span>
                  <select name="type" className="w-full h-8 rounded-md border border-gray-200 px-2 text-xs">
                    <option value="interrogation">Interrogation</option>
                    <option value="devoir">Devoir</option>
                    <option value="composition">Composition</option>
                  </select>
                </label>
                <label className="text-xs space-y-1"><span className="text-gray-600">Intitulé *</span>
                  <Input name="intitule" required placeholder="Interro chap. 3" className="h-8 text-xs" />
                </label>
                <label className="text-xs space-y-1"><span className="text-gray-600">Date</span>
                  <Input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="h-8 text-xs" />
                </label>
                <label className="text-xs space-y-1"><span className="text-gray-600">Barème (sur)</span>
                  <Input name="sur" type="number" defaultValue="20" min="5" max="100" className="h-8 text-xs" />
                </label>
                <label className="text-xs space-y-1"><span className="text-gray-600">Coefficient</span>
                  <Input name="coefficient" type="number" step="0.5" defaultValue="1" min="0.5" className="h-8 text-xs" />
                </label>
                <div className="col-span-2 sm:col-span-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEvalActive(null)}>Annuler</Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={retour.pending}>Créer</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {evalChoisie && (
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-1">
                Saisie des notes — {evalChoisie.intitule} · {matieres.find((m: any) => m.id === evalChoisie.matiereId)?.libelle} · /{evalChoisie.sur}
              </div>
              <p className="text-[11px] text-gray-500 mb-2">Astuce : « abs » pour un absent — la note n&apos;entrera pas dans la moyenne.</p>
              {erreurNotes && <div className="mb-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">{erreurNotes}</div>}
              <form
                action={async (formData) => {
                  setErreurNotes(null);
                  const r = await actions.saisirNotes(formData);
                  if (r && r.ok === false) setErreurNotes(r.error);
                }}
                className="space-y-2"
              >
                <input type="hidden" name="evaluationId" value={evalChoisie.id} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                  {elevesClasse.map((e: any) => {
                    const n = notesEval.find((x: any) => x.eleveId === e.id);
                    return (
                      <label key={e.id} className="flex items-center gap-1.5 text-xs">
                        <span className="flex-1 truncate" title={`${e.prenom} ${e.nom}`}>{e.prenom} {e.nom}</span>
                        <Input name={`note_${e.id}`} defaultValue={n?.absent ? 'abs' : (n?.valeur ?? '')} placeholder="—" className="w-14 h-8 text-xs" />
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">Enregistrer les notes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </SectionBlock>

      {/* ── 5. Formulaire de clôture de séance (modal léger) ── */}
      {seanceACloturer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSeanceACloturer(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">Clôturer la séance — {classe.libelle}</h3>
            <p className="text-xs text-gray-500">
              {formatDate(seanceACloturer.date)} · {seanceACloturer.heureDebut} — {matieres.find((m: any) => m.id === seanceACloturer.matiereId)?.libelle}
            </p>
            <form
              className="space-y-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                const fd = new FormData(ev.currentTarget);
                fd.set('classeId', classeId);
                fd.set('matiereId', seanceACloturer.matiereId ?? matiereChoisie?.id ?? '');
                fd.set('dateCours', new Date(seanceACloturer.date).toISOString().slice(0, 10));
                retour.run(async () => {
                  const r = await actionsExt.creerEntreeCahier(fd);
                  if (r?.ok) setSeanceACloturer(null);
                  return r;
                }, 'Séance clôturée — avancement du programme mis à jour.');
              }}
            >
              <label className="text-sm space-y-1 block">
                <span className="text-xs font-medium text-gray-600">Ce que j&apos;ai enseigné aujourd&apos;hui *</span>
                <Textarea name="contenu" required rows={2} placeholder="Notions traitées, activités…" />
              </label>
              <label className="text-sm space-y-1 block">
                <span className="text-xs font-medium text-gray-600">Chapitre du programme</span>
                <select name="chapitreId" className="w-full h-9 rounded-md border border-gray-200 bg-transparent px-2 text-sm" disabled={chapitresMatiereActive.length === 0}>
                  <option value="">— Non rattaché —</option>
                  {chapitresMatiereActive.map((c: any) => {
                    const pct = avancementPour(c.id);
                    return <option key={c.id} value={c.id}>#{c.ordre} {c.titre}{pct != null ? ` (actuellement ${pct}%)` : ''}</option>;
                  })}
                </select>
                {chapitresMatiereActive.length === 0 && <span className="text-[10px] text-amber-600 block mt-0.5">Aucun programme défini pour cette matière/niveau — l&apos;avancement ne pourra pas se mettre à jour.</span>}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm space-y-1">
                  <span className="text-xs font-medium text-gray-600">Avancement du chapitre (%)</span>
                  <Input name="pourcentageAvancement" type="number" min={0} max={100} defaultValue={100} className="h-9 text-sm" />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-xs font-medium text-gray-600">Travail à faire (élèves)</span>
                  <Input name="travailAFaire" placeholder="Exercices 4 et 5 p.32" className="h-9 text-sm" />
                </label>
              </div>
              <label className="text-sm space-y-1 block">
                <span className="text-xs font-medium text-amber-700">Ce qui RESTE à enseigner (rattrapage séance prochaine)</span>
                <Textarea name="resteAEnseigner" rows={2} placeholder="Ex. : fin de l'exemple 3 + exercices d'application — à reprendre en début de séance" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="publier" className="h-4 w-4 accent-emerald-600" />
                <span className="text-xs text-gray-700">Publier aux familles</span>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setSeanceACloturer(null)}>Annuler</Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={retour.pending}>
                  <BookOpen className="h-4 w-4 mr-1" /> {retour.pending ? 'Enregistrement…' : 'Clôturer la séance'}
                </Button>
              </div>
            </form>
            {retour.Message}
          </div>
        </div>
      )}
    </div>
  );
}
