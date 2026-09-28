'use client';

// ====================================================================
// AUDIT PRÉSENCES — Tableau de bord statistique de l'absentéisme
// Cumul de TOUS les appels de classe : courbes journalières et
// hebdomadaires, taux par classe, répartition garçons/filles, top
// absentéisme / top assiduité, justifiées vs non justifiées, tendance —
// et relance des familles (seuil d'absences non justifiées).
// ====================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { TrendingDown, TrendingUp, Bell, RefreshCw, Trophy, AlertTriangle } from 'lucide-react';
import { SectionBlock, StatusBadge } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import * as actionsExt from '@/app/actions/extensions';

const FENETRES = [
  { valeur: 7, libelle: '7 jours' },
  { valeur: 30, libelle: '30 jours' },
  { valeur: 60, libelle: '60 jours' },
  { valeur: 90, libelle: 'Trimestre' },
  { valeur: 365, libelle: 'Année' },
];

const dateCourte = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export default function PresencesStats({ initialData }: { initialData: any }) {
  const portal = initialData.session?.portal;
  const [fenetre, setFenetre] = useState(30);
  const [stats, setStats] = useState<any>(null);
  const [chargement, setChargement] = useState(false);
  const [seuil, setSeuil] = useState(3);
  const [retourNotif, setRetourNotif] = useState<string | null>(null);
  const [notifEnCours, setNotifEnCours] = useState(false);

  const charger = useCallback(async (jours: number) => {
    setChargement(true);
    try {
      const r: any = await actionsExt.statsAbsences(jours);
      setStats(r?.ok ? r.stats : null);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(fenetre); }, [fenetre, charger]);

  async function notifierFamilles() {
    setRetourNotif(null);
    setNotifEnCours(true);
    try {
      const r: any = await actionsExt.notifierFamillesAbsences(seuil, fenetre);
      setRetourNotif(r?.ok ? `✓ ${r.message}` : `✗ ${r?.error ?? 'Erreur'}`);
    } catch {
      setRetourNotif('✗ Une erreur est survenue.');
    } finally {
      setNotifEnCours(false);
    }
  }

  if (portal === 'eleve' || portal === 'parent') return null;

  const k = stats?.kpi;
  const totalSexe = stats ? stats.parSexe.garçons + stats.parSexe.filles + stats.parSexe.nonRenseigné : 0;

  return (
    <SectionBlock
      title="Statistiques d'absentéisme — cumul des appels de classe"
      description="Chaque appel saisi par les enseignants alimente ces courbes : taux, tendances, élèves à suivre"
      action={
        <div className="flex items-center gap-2">
          <select
            value={fenetre}
            onChange={(e) => setFenetre(Number(e.target.value))}
            className="h-8 rounded-md border border-gray-200 bg-transparent px-2 text-sm"
          >
            {FENETRES.map((f) => <option key={f.valeur} value={f.valeur}>{f.libelle}</option>)}
          </select>
          <Button variant="outline" size="sm" disabled={chargement} onClick={() => charger(fenetre)}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${chargement ? 'animate-spin' : ''}`} /> Recalculer
          </Button>
        </div>
      }
    >
      {!stats ? (
        <p className="text-sm text-gray-500">{chargement ? 'Calcul des statistiques…' : 'Statistiques non disponibles.'}</p>
      ) : k.totalAppels === 0 ? (
        <div className="p-3 bg-amber-50 rounded text-sm text-amber-700">
          <div className="font-medium">Aucun appel enregistré sur la période.</div>
          <div className="text-xs mt-1">Les statistiques se construisent automatiquement : dès que les enseignants saisissent l'appel de leurs séances (module Présences), les taux d'absentéisme, courbes et élèves à suivre apparaissent ici.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPI */}
          <div className="overflow-x-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <Card><CardContent className="p-3">
              <div className="text-[10px] uppercase text-gray-500">Taux d'absentéisme</div>
              <div className="text-xl font-semibold text-rose-600">{k.tauxAbsentéisme}%</div>
              <div className="text-[10px] text-gray-400">{k.totalAppels} appels cumulés</div>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <div className="text-[10px] uppercase text-gray-500">Absences</div>
              <div className="text-xl font-semibold">{k.absences}</div>
              <div className="text-[10px] text-gray-400">{k.absencesJustifiees} justifiée(s)</div>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <div className="text-[10px] uppercase text-gray-500">Retards</div>
              <div className="text-xl font-semibold text-amber-600">{k.retards}</div>
              <div className="text-[10px] text-gray-400">{k.excuse} excusé(s)</div>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <div className="text-[10px] uppercase text-gray-500">Présences</div>
              <div className="text-xl font-semibold text-emerald-600">{k.presents}</div>
              <div className="text-[10px] text-gray-400">
                {k.totalAppels > 0 ? Math.round((k.presents / k.totalAppels) * 100) : 0}% de présence
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <div className="text-[10px] uppercase text-gray-500">Tendance</div>
              <div className={`text-xl font-semibold flex items-center gap-1 ${k.tendanceAbsences > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {k.tendanceAbsences > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {k.tendanceAbsences > 0 ? '+' : ''}{k.tendanceAbsences}%
              </div>
              <div className="text-[10px] text-gray-400">vs période précédente</div>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <div className="text-[10px] uppercase text-gray-500">Garçons / Filles</div>
              <div className="text-sm font-semibold">
                {totalSexe > 0 ? Math.round((stats.parSexe.garçons / totalSexe) * 100) : 0}% / {totalSexe > 0 ? Math.round((stats.parSexe.filles / totalSexe) * 100) : 0}%
              </div>
              <div className="flex h-1.5 rounded overflow-hidden mt-1">
                <div className="bg-blue-400" style={{ width: `${totalSexe > 0 ? (stats.parSexe.garçons / totalSexe) * 100 : 0}%` }} />
                <div className="bg-rose-400" style={{ width: `${totalSexe > 0 ? (stats.parSexe.filles / totalSexe) * 100 : 0}%` }} />
              </div>
              <div className="text-[10px] text-gray-400">{stats.parSexe.garçons} G · {stats.parSexe.filles} F</div>
            </CardContent></Card>
          </div>

          {/* Courbe journalière */}
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase mb-1">Évolution quotidienne — absences et retards</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.parJour.map((j: any) => ({ ...j, date: dateCourte(j.date) }))} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="absences" name="Absences" stroke="#e11d48" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="retards" name="Retards" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Barres hebdomadaires (semaines ISO) */}
          {stats.parSemaine.length > 1 && (
            <div>
              <div className="text-xs font-medium text-gray-600 uppercase mb-1">Cumul par semaine</div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.parSemaine.map((s: any) => ({ ...s, semaine: `S${dateCourte(s.semaine)}` }))} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="semaine" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="absences" name="Absences" fill="#e11d48" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="retards" name="Retards" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Par classe */}
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase mb-1">Taux d'absentéisme par classe</div>
            <div className="space-y-1">
              {stats.parClasse.map((c: any) => (
                <div key={c.classeId} className="flex items-center gap-2 text-sm">
                  <div className="w-36 truncate flex-shrink-0" title={`${c.classe} (${c.cycle})`}>{c.classe}</div>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    <div
                      className={`h-5 flex items-center justify-end pr-1.5 ${c.taux > 15 ? 'bg-rose-500' : c.taux > 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, Math.max(6, c.taux))}%` }}
                    >
                      <span className="text-[10px] font-medium text-white">{c.taux}%</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 w-44 flex-shrink-0 hidden sm:block">
                    {c.absences} abs. · {c.retards} ret. · {c.elevesTouches} élève(s)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top absentéisme + top assiduité */}
          <div className="overflow-x-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-gray-600 uppercase mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Élèves à suivre — absentéisme
              </div>
              {stats.topAbsentéisme.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune absence sur la période.</p>
              ) : (
                <div className="space-y-1">
                  {stats.topAbsentéisme.slice(0, 10).map((e: any, i: number) => (
                    <div key={e.eleveId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                      <span className={`w-5 text-center text-xs font-bold flex-shrink-0 ${i < 3 ? 'text-rose-600' : 'text-gray-400'}`}>{i + 1}</span>
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 ${e.sexe === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                        {e.sexe === 'F' ? 'F' : 'M'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{e.prenom} {e.nom}</div>
                        <div className="text-[11px] text-gray-500 truncate">{e.classe} · {e.taux}% de ses cours</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-rose-600">{e.absences} abs.</div>
                        <div className="text-[10px] text-gray-400">{e.justifiees} justifiée(s) · {e.retards} ret.</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Relance des familles */}
              <div className="mt-3 p-3 border border-amber-200 bg-amber-50 rounded">
                <div className="text-xs font-medium text-amber-800 mb-1.5 flex items-center gap-1">
                  <Bell className="h-3.5 w-3.5" /> Prévenir les familles des absences répétées
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-amber-800">Seuil :</label>
                  <input
                    type="number" min={1} max={30} value={seuil}
                    onChange={(e) => setSeuil(Number(e.target.value) || 3)}
                    className="h-8 w-16 rounded-md border border-amber-300 bg-white px-2 text-sm"
                  />
                  <span className="text-xs text-amber-700">absences non justifiées sur la période</span>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={notifEnCours} onClick={notifierFamilles}>
                    {notifEnCours ? 'Envoi…' : 'Notifier les parents'}
                  </Button>
                </div>
                {retourNotif && <div className="text-xs mt-2 text-amber-900">{retourNotif}</div>}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-600 uppercase mb-1 flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-emerald-600" /> Top assiduité — 0 absence
              </div>
              {stats.topAssiduité.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun élève avec au moins 3 appels et 0 absence sur la période.</p>
              ) : (
                <div className="space-y-1">
                  {stats.topAssiduité.map((e: any, i: number) => (
                    <div key={e.eleveId} className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded text-sm">
                      <span className="w-5 text-center text-xs font-bold text-emerald-600 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{e.prenom} {e.nom}</div>
                        <div className="text-[11px] text-gray-500 truncate">{e.classe}</div>
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 flex-shrink-0">{e.presences} présences</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionBlock>
  );
}
