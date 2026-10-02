'use client';

// ====================================================================
// COCKPIT ENSEIGNANT — « ma journée, mes classes, mon programme »
// Page d'accueil du portail enseignant : tout ce qui le concerne à
// l'instant T, centré sur SES classes (affectations) :
//   1. Mes séances du jour (appel à faire) — avec appel déjà fait ou non ;
//   2. Mes classes + effectifs G/F ;
//   3. Devoirs à corriger (rendus non notés de ses matières) ;
//   4. Avancement de ses programmes (chapitres complétés, maj récente) ;
//   5. Dispenses actives de ses élèves.
// ====================================================================

import { useState } from 'react';
import { CalendarClock, Users, ClipboardCheck, BookOpen, HeartPulse, ArrowRight } from 'lucide-react';
import VueClasseEnseignant from './vue-classe-enseignant';
import { StatCard, SectionBlock, StatusBadge } from '@/components/shared-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

export default function EnseignantDashboard({ initialData, onNaviguer }: { initialData: any; onNaviguer?: (module: string) => void }) {
  const [classeOuverte, setClasseOuverte] = useState<string | null>(null);
  const seances = initialData.seances ?? [];
  const eleves = initialData.eleves ?? [];
  const classes = initialData.classes ?? [];
  const matieres = initialData.matieres ?? [];
  const personnels = initialData.personnels ?? [];
  const devoirs = initialData.devoirs ?? [];
  const avancements = initialData.avancements ?? [];
  const programmes = initialData.programmes ?? [];
  const dispenses = initialData.dispenses ?? [];
  const presences = initialData.presences ?? [];
  const periodes = initialData.periodes ?? [];
  const niveaux = initialData.niveaux ?? [];

  // Moi : personnel lié à mon compte
  const moi = personnels.find((p: any) => p.utilisateurId === initialData.session?.utilisateur?.id) ?? null;
  // Mes classes : celles de mes affectations (sinon toutes les classes)
  const affectations = (initialData.affectationsEnseignant ?? []).filter((a: any) => !moi || a.personnelId === moi.id);
  const mesClasseIds = [...new Set(affectations.map((a: any) => a.classeId).filter(Boolean))];
  const mesClasses = mesClasseIds.length > 0 ? classes.filter((c: any) => mesClasseIds.includes(c.id)) : classes;
  const mesMatiereIds = [...new Set(affectations.map((a: any) => a.matiereId).filter(Boolean))];

  // 1. Mes séances du jour
  const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
  const demain = new Date(aujourdhui); demain.setDate(demain.getDate() + 1);
  const seancesJour = seances
    .filter((s: any) => (!moi || s.enseignantId === moi.id) && new Date(s.date) >= aujourdhui && new Date(s.date) < demain && s.statut !== 'annulee')
    .sort((a: any, b: any) => String(a.heureDebut).localeCompare(String(b.heureDebut)));
  const appelsFaits = new Set(presences.filter((p: any) => seancesJour.some((s: any) => s.id === p.seanceId)).map((p: any) => p.seanceId));

  // 2. Effectifs de mes classes (G/F)
  const effectif = (classeId: string) => {
    const els = eleves.filter((e: any) => e.classeActuelleId === classeId && e.statut === 'actif');
    return { n: els.length, g: els.filter((e: any) => e.sexe === 'M').length, f: els.filter((e: any) => e.sexe === 'F').length };
  };

  // 3. Devoirs à corriger : rendus non notés sur mes matières
  const devoirsACorriger = devoirs
    .filter((d: any) => (mesMatiereIds.length === 0 || mesMatiereIds.includes(d.matiereId)) && (d.rendus ?? []).some((r: any) => r.note == null))
    .slice(0, 8);
  const nbRendusANoter = devoirsACorriger.reduce((s: number, d: any) => s + (d.rendus ?? []).filter((r: any) => r.note == null).length, 0);

  // 4. Avancement de mes programmes (par programme de mes matières)
  const mesProgrammes = programmes.filter((p: any) => mesMatiereIds.length === 0 || mesMatiereIds.includes(p.matiereId));
  const niveauParId = new Map<string, any>(niveaux.map((n: any) => [n.id as string, n]));
  const avancementProgramme = (prog: any) => {
    const chaps = prog.chapitres ?? [];
    if (chaps.length === 0) return null;
    const completés = chaps.filter((c: any) => (avancements.find((a: any) => a.chapitreId === c.id)?.pourcentage ?? 0) >= 100).length;
    const pct = Math.round(chaps.reduce((s: number, c: any) => s + (avancements.find((a: any) => a.chapitreId === c.id)?.pourcentage ?? 0), 0) / chaps.length);
    return { completés, total: chaps.length, pct };
  };

  // 5. Dispenses actives de mes élèves
  const auj = new Date();
  const dispensesActives = dispenses.filter((d: any) => {
    const eleve = eleves.find((e: any) => e.id === d.eleveId);
    return eleve && mesClasseIds.includes(eleve.classeActuelleId ?? '') && new Date(d.dateFin ?? d.dateDebut) >= auj;
  }).slice(0, 6);

  const periodeEnCours = periodes.find((p: any) => auj >= new Date(p.dateDebut) && auj <= new Date(p.dateFin));

  // AUDIT ENSEIGNANT — drill-down : cliquer sur une de MES classes ouvre
  // la vue dédiée (matières, EDT 3 zones, clôture, élèves + tendance, notes)
  if (classeOuverte) {
    return (
      <div className="p-4 lg:p-6 max-w-full lg:max-w-7xl mx-auto">
        <VueClasseEnseignant
          initialData={initialData}
          classeId={classeOuverte}
          onFermer={() => setClasseOuverte(null)}
          onNaviguer={onNaviguer}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-full lg:max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Bonjour {initialData.session?.utilisateur?.prenom ?? ''} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {periodeEnCours ? `Période en cours : ${periodeEnCours.libelle} · ` : ''}
          {mesClasses.length} classe(s) · {mesMatiereIds.length > 0 ? matieres.filter((m: any) => mesMatiereIds.includes(m.id)).length + ' matière(s)' : ''}
        </p>
      </div>

      {/* KPI */}
      <div className="overflow-x-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Séances aujourd'hui" value={seancesJour.length} sub={`${seancesJour.length - appelsFaits.size} appel(s) à faire`} icon={CalendarClock} color="emerald" />
        <StatCard title="Mes classes" value={mesClasses.length} sub={`${mesClasses.reduce((s: number, c: any) => s + effectif(c.id).n, 0)} élèves au total`} icon={Users} color="blue" />
        <StatCard title="Copies à corriger" value={nbRendusANoter} sub={`${devoirsACorriger.length} devoir(s) concerné(s)`} icon={ClipboardCheck} color="amber" />
        <StatCard title="Programmes suivis" value={mesProgrammes.length} sub={`${avancements.length} chapitre(s) déclarés`} icon={BookOpen} color="purple" />
      </div>

      <div className="overflow-x-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Mes séances du jour */}
        <SectionBlock
          title="Mes séances aujourd'hui"
          description="Faites l'appel de chaque séance — présences, absences et retards alimentent le suivi de l'école"
          action={onNaviguer ? <button onClick={() => onNaviguer('presences')} className="text-sm text-emerald-700 hover:underline flex items-center gap-1">Faire l'appel <ArrowRight className="h-3.5 w-3.5" /></button> : undefined}
        >
          {seancesJour.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune séance à votre nom aujourd'hui. Vérifiez l'emploi du temps (Salles & Calendrier) si cela semble anormal.</p>
          ) : (
            <div className="space-y-1.5">
              {seancesJour.map((s: any) => {
                const classe = classes.find((c: any) => c.id === s.classeId);
                const matiere = matieres.find((m: any) => m.id === s.matiereId);
                const eff = s.classeId ? effectif(s.classeId) : null;
                return (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded border border-gray-100">
                    <div className="text-center flex-shrink-0 px-2">
                      <div className="text-sm font-semibold text-emerald-700">{s.heureDebut}</div>
                      <div className="text-[10px] text-gray-400">{s.heureFin}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{classe?.libelle ?? '—'} · {matiere?.libelle ?? '—'}</div>
                      {eff && <div className="text-[11px] text-gray-500">{eff.n} élèves ({eff.g} G · {eff.f} F){s.salleId ? ' · salle ' + (initialData.salles ?? []).find((sa: any) => sa.id === s.salleId)?.nom : ''}</div>}
                    </div>
                    {appelsFaits.has(s.id)
                      ? <StatusBadge statut="valide" label="Appel fait" />
                      : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Appel à faire</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </SectionBlock>

        {/* 2. Mes classes */}
        <SectionBlock
          title="Mes classes"
          description="Effectifs et accès rapide au répertoire"
          action={onNaviguer ? <button onClick={() => onNaviguer('eleves')} className="text-sm text-emerald-700 hover:underline flex items-center gap-1">Mes élèves <ArrowRight className="h-3.5 w-3.5" /></button> : undefined}
        >
          {mesClasses.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune classe ne vous est affectée. Demandez à la direction de configurer vos affectations (Salles & Calendrier → Affectations enseignants).</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mesClasses.map((c: any) => {
                const eff = effectif(c.id);
                const niv = niveauParId.get(c.niveauId);
                const mesMat = affectations.filter((a: any) => a.classeId === c.id).map((a: any) => matieres.find((m: any) => m.id === a.matiereId)?.libelle).filter(Boolean);
                return (
                  <Card key={c.id} className="border border-gray-100 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer" onClick={() => setClasseOuverte(c.id)}>
                    <CardContent className="p-3">
                      <div className="text-sm font-semibold">{c.libelle}</div>
                      <div className="text-[11px] text-gray-500">{niv?.libelle ?? ''}</div>
                      <div className="mt-1 text-xs">{eff.n} élèves <span className="text-gray-500">({eff.g} G · {eff.f} F)</span></div>
                      {mesMat.length > 0 && <div className="text-[10px] text-emerald-700 mt-1 truncate" title={mesMat.join(', ')}>{mesMat.join(', ')}</div>}
                      <div className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-0.5">Ouvrir ma classe <ArrowRight className="h-2.5 w-2.5" /></div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </SectionBlock>

        {/* 3. Devoirs à corriger */}
        <SectionBlock
          title="Copies à corriger"
          description="Rendus reçus et non notés"
          action={onNaviguer ? <button onClick={() => onNaviguer('pedagogique')} className="text-sm text-emerald-700 hover:underline flex items-center gap-1">Corriger <ArrowRight className="h-3.5 w-3.5" /></button> : undefined}
        >
          {devoirsACorriger.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune copie en attente — tout est à jour. 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {devoirsACorriger.map((d: any) => {
                const aNoter = (d.rendus ?? []).filter((r: any) => r.note == null).length;
                return (
                  <div key={d.id} className="flex items-center justify-between gap-2 p-2 bg-amber-50 border border-amber-100 rounded text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{matieres.find((m: any) => m.id === d.matiereId)?.libelle ?? ''} — {d.titre ?? d.description ?? 'Devoir'}</div>
                      <div className="text-[11px] text-gray-500">{classes.find((c: any) => c.id === d.classeId)?.libelle} · à rendre le {formatDate(d.dateRendu)}</div>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 flex-shrink-0">{aNoter} à noter</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </SectionBlock>

        {/* 4. Avancement de mes programmes */}
        <SectionBlock
          title="Mon avancement programme"
          description="Chapitres complétés (alimentés par votre cahier de textes)"
          action={onNaviguer ? <button onClick={() => onNaviguer('pedagogique')} className="text-sm text-emerald-700 hover:underline flex items-center gap-1">Cahier & programme <ArrowRight className="h-3.5 w-3.5" /></button> : undefined}
        >
          {mesProgrammes.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun programme défini pour vos matières — la direction peut les créer (matière × niveau, chapitres par trimestre).</p>
          ) : (
            <div className="space-y-2">
              {mesProgrammes.slice(0, 6).map((p: any) => {
                const av = avancementProgramme(p);
                const mat = matieres.find((m: any) => m.id === p.matiereId)?.libelle ?? '';
                const niv = niveauParId.get(p.niveauId)?.libelle ?? '';
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium truncate">{mat} · {niv}</span>
                      {av ? <span className="text-gray-500 flex-shrink-0">{av.completés}/{av.total} chapitres · {av.pct}%</span> : <span className="text-gray-400 flex-shrink-0">aucun chapitre</span>}
                    </div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className={`h-2 rounded ${av && av.pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${av?.pct ?? 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionBlock>
      </div>

      {/* 5. Dispenses actives */}
      <SectionBlock
        title="Dispenses actives dans mes classes"
        description="Élèves dispensés (sport, médical…) à prendre en compte dans vos séances"
      >
        {dispensesActives.length === 0 ? (
          <p className="text-sm text-gray-500 flex items-center gap-2"><HeartPulse className="h-4 w-4 text-gray-300" /> Aucune dispense active dans vos classes.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dispensesActives.map((d: any) => {
              const e = eleves.find((x: any) => x.id === d.eleveId);
              return (
                <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-full text-xs">
                  <HeartPulse className="h-3.5 w-3.5 text-rose-500" />
                  <span className="font-medium">{e ? `${e.prenom} ${e.nom}` : '—'}</span>
                  <span className="text-gray-500">{classes.find((c: any) => c.id === e?.classeActuelleId)?.libelle} · {d.motif ?? 'dispense'} · jusqu&apos;au {formatDate(d.dateFin ?? d.dateDebut)}</span>
                </div>
              );
            })}
          </div>
        )}
      </SectionBlock>
    </div>
  );
}
