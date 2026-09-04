'use client';

// ====================================================================
// Module Services Complémentaires — cantine, transport, bibliothèque
// + VIE QUOTIDIENNE : Cantine du jour (menus/pointage/allergènes),
//   Transport du jour (feuilles de route/passages/retards), Garderie
//   (inscriptions/pointage/facturation mensuelle).
// F16 : montants en CENTIMES en base → affichage via formatXOF.
// ====================================================================

import { useState } from 'react';
import { Bus, BookMarked, Utensils, Package, Clock, Baby } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, FormField, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as actions from '@/app/actions';
import * as ext from '@/app/actions/extensions';
import * as comp from '@/app/actions/completions';
import { formatDate, formatXOF } from '@/lib/format';

// Jour courant (instant identique SSR/client → rendu stable) — la base
// travaille en jours UTC, on aligne le calcul dessus.
const MAINTENANT = new Date();
const JOUR_ISO = MAINTENANT.toISOString().slice(0, 10);
const JOUR_SEMAINE = MAINTENANT.getUTCDay(); // 0=dimanche, 1=lundi … 6=samedi

function parseJours(json: string | null | undefined): number[] {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v.map(Number) : [];
  } catch {
    return [];
  }
}

function parseIds(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function heureCourte(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  return isNaN(x.getTime()) ? '—' : formatDate(x, { hour: '2-digit', minute: '2-digit' });
}

export default function ServicesModule({ initialData }: { initialData: any }) {
  const cantine = initialData.cantines ?? [];
  const transports = initialData.transports ?? [];
  const lignesTransport = initialData.lignesTransport ?? [];
  const arrets = initialData.arrets ?? [];
  const biblioLivres = initialData.biblioLivres ?? [];
  const biblioPrets = initialData.biblioPrets ?? [];
  const manuels = initialData.manuels ?? [];
  const attributionsManuel = initialData.attributionsManuel ?? [];
  const listesFourniture = initialData.listesFourniture ?? [];
  const niveaux = initialData.niveaux ?? [];
  const eleves = initialData.eleves ?? [];
  const classes = initialData.classes ?? [];
  // Vie quotidienne (O1/O2/M8 + M7 activités hors de ce module)
  const cantineMenus = initialData.cantineMenus ?? [];
  const cantinePresences = initialData.cantinePresences ?? [];
  const feuillesRoute = initialData.feuillesRoute ?? [];
  const garderieInscriptions = initialData.garderieInscriptions ?? [];
  const garderieSessions = initialData.garderieSessions ?? [];
  const { run, Message, pending } = useActionFeedback();
  // Pénalité (centimes) renvoyée par le dernier retour de livre
  const [penaliteRetour, setPenaliteRetour] = useState<number | null>(null);

  // ---- O1 — Cantine du jour : feedback dédié + alertes allergènes ----
  const cantineFb = useActionFeedback();
  const [alertesAllergenes, setAlertesAllergenes] = useState<Array<{ eleve: string; allergene: string }> | null>(null);
  const menuDuJour = cantineMenus.find((m: any) => String(m.date).slice(0, 10) === JOUR_ISO);
  const inscritsJour = cantine.filter((c: any) => c.actif && parseJours(c.joursSemaine).includes(JOUR_SEMAINE));
  const presentsJour = cantinePresences.filter((p: any) => p.present).length;
  const absentsJour = cantinePresences.filter((p: any) => !p.present).length;

  function soumettreRepas(formData: FormData) {
    setAlertesAllergenes(null);
    cantineFb.run(async () => {
      const res: any = await comp.pointerRepas(formData);
      if (res?.ok) setAlertesAllergenes((res.alertes ?? []) as Array<{ eleve: string; allergene: string }>);
      return res;
    }, 'Pointage des repas enregistré');
  }

  // ---- O2 — Transport du jour ----
  const transportFb = useActionFeedback();
  const [retourArret, setRetourArret] = useState<{ passageId: string; retardMin: number; alerte: boolean } | null>(null);

  function pointerUnArret(formData: FormData) {
    setRetourArret(null);
    transportFb.run(async () => {
      const res: any = await comp.pointerArret(formData);
      if (res?.ok) {
        setRetourArret({ passageId: String(formData.get('passageId')), retardMin: res.retardMin ?? 0, alerte: Boolean(res.alerte) });
      }
      return res;
    }, 'Passage pointé');
  }

  // ---- M8 — Garderie ----
  const garderieFb = useActionFeedback();
  const [minutesDernierDepart, setMinutesDernierDepart] = useState<{ eleve: string; minutes: number } | null>(null);
  const [moisGarderie, setMoisGarderie] = useState('');
  const [retourFactGarderie, setRetourFactGarderie] = useState<string | null>(null);
  const sessionsOuvertes = garderieSessions.filter((s: any) => !s.heureDepart);
  const sessionsFermees = garderieSessions.filter((s: any) => s.heureDepart);
  const idsAvecSession = new Set(garderieSessions.map((s: any) => s.eleveId));
  const inscritsActifsGarderie = garderieInscriptions.filter((g: any) => g.actif);
  const sansSession = inscritsActifsGarderie.filter((g: any) => !idsAvecSession.has(g.eleveId));

  function pointerGarderie(eleveId: string, sens: 'arrivee' | 'depart', nomEleve: string) {
    setMinutesDernierDepart(null);
    garderieFb.run(async () => {
      const res: any = await comp.pointerGarderie(eleveId, sens);
      if (res?.ok && sens === 'depart' && typeof res.minutes === 'number') {
        setMinutesDernierDepart({ eleve: nomEleve, minutes: res.minutes });
      }
      return res;
    }, sens === 'arrivee' ? 'Arrivée garderie pointée' : 'Départ garderie pointé');
  }

  // B5/B6 — Facturation mensuelle des services (cantine / transport)
  const facturation = useActionFeedback();
  const [moisFacturation, setMoisFacturation] = useState('');
  const [retourFacturation, setRetourFacturation] = useState<string | null>(null);

  function facturer(service: 'cantine' | 'transport') {
    if (!moisFacturation) return;
    setRetourFacturation(null);
    facturation.run(async () => {
      const r: any = await ext.genererEcheancesServices(service, `${moisFacturation}-01`);
      if (r?.ok) {
        setRetourFacturation(
          `${service === 'cantine' ? 'Cantine' : 'Transport'} ${r.periode ?? moisFacturation} — ${r['échéancesCréées'] ?? 0} échéance(s) créée(s) pour ${r['totalÉlèves'] ?? 0} élève(s).`,
        );
      }
      return r;
    }, 'Facturation du mois générée');
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Services complémentaires" subtitle="Vie quotidienne (cantine, transport, garderie), inscriptions, bibliothèque et manuels scolaires" />

      {Message}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Inscriptions cantine" value={cantine.length} icon={Utensils} color="emerald" />
        <StatCard title="Inscriptions transport" value={transports.length} sub={`${lignesTransport.length} lignes`} icon={Bus} color="blue" />
        <StatCard title="Inscriptions garderie" value={garderieInscriptions.length} sub={`${sessionsOuvertes.length} session(s) en cours`} icon={Baby} color="purple" />
        <StatCard title="Manuels attribués" value={attributionsManuel.length} sub={`${manuels.length} titres`} icon={Package} color="amber" />
      </div>

      <Tabs defaultValue="cantine-jour">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4 h-auto">
          <TabsTrigger value="cantine-jour" className="text-xs">Cantine du jour</TabsTrigger>
          <TabsTrigger value="transport-jour" className="text-xs">Transport du jour</TabsTrigger>
          <TabsTrigger value="garderie" className="text-xs">Garderie</TabsTrigger>
          <TabsTrigger value="abonnements" className="text-xs">Inscriptions &amp; bibliothèque</TabsTrigger>
        </TabsList>

        {/* ═══════════ O1 — CANTINE DU JOUR ═══════════ */}
        <TabsContent value="cantine-jour" className="space-y-4">
          <div>{cantineFb.Message}</div>

          {alertesAllergenes && alertesAllergenes.length > 0 && (
            <div role="alert" className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <strong>⚠ Allergènes détectés — {alertesAllergenes.length} alerte(s) :</strong>{' '}
              {alertesAllergenes.map((a, i) => (
                <span key={i}>{a.eleve} ({a.allergene}){i < alertesAllergenes.length - 1 ? ' · ' : ''}</span>
              ))}
            </div>
          )}

          <SectionBlock
            title="Menu du jour"
            description={menuDuJour ? 'Un menu existe déjà pour aujourd\'hui — le modifier remplace la version enregistrée.' : 'Aucun menu enregistré pour aujourd\'hui.'}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                cantineFb.run(() => comp.enregistrerMenu(new FormData(e.currentTarget)), 'Menu enregistré');
              }}
              className="space-y-3"
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <FormField label="Date" required>
                  <Input type="date" name="date" defaultValue={menuDuJour ? String(menuDuJour.date).slice(0, 10) : JOUR_ISO} required />
                </FormField>
                <FormField label="Plat principal" required>
                  <Input name="platPrincipal" defaultValue={menuDuJour?.platPrincipal ?? ''} placeholder="Thiéboudienne" required />
                </FormField>
                <FormField label="Accompagnement">
                  <Input name="accompagnement" defaultValue={menuDuJour?.accompagnement ?? ''} placeholder="Riz blanc, sauce tomate" />
                </FormField>
                <FormField label="Dessert">
                  <Input name="dessert" defaultValue={menuDuJour?.dessert ?? ''} placeholder="Fruit de saison" />
                </FormField>
                <FormField label="Allergènes (séparés par des virgules)">
                  <Input name="allergenes" defaultValue={menuDuJour ? parseIds(menuDuJour.allergenes).join(', ') : ''} placeholder="gluten, arachide, lactose" />
                </FormField>
              </div>
              <Button type="submit" disabled={cantineFb.pending} className="bg-emerald-600 hover:bg-emerald-700">
                {cantineFb.pending ? 'Enregistrement…' : menuDuJour ? 'Mettre à jour le menu' : 'Enregistrer le menu'}
              </Button>
            </form>
          </SectionBlock>

          <SectionBlock
            title={`Pointage des repas — ${formatDate(JOUR_ISO)}`}
            description={`${inscritsJour.length} élève(s) inscrit(s) à la cantine ce jour`}
            action={
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Présents : {presentsJour}</Badge>
                <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">Absents : {absentsJour}</Badge>
              </div>
            }
          >
            {inscritsJour.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Aucun élève inscrit à la cantine pour ce jour de la semaine.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  soumettreRepas(new FormData(e.currentTarget));
                }}
                className="space-y-3"
              >
                <input type="hidden" name="date" value={JOUR_ISO} />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {inscritsJour.map((c: any) => {
                    const existante = cantinePresences.find((p: any) => p.eleveId === c.eleveId);
                    const present = existante ? Boolean(existante.present) : true;
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 bg-white">
                        <span className="text-sm font-medium text-gray-800 truncate">{c.eleve?.prenom} {c.eleve?.nom}</span>
                        <span className="flex items-center gap-3 text-xs whitespace-nowrap">
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input type="radio" name={`repas_${c.eleveId}`} value="present" defaultChecked={present} className="accent-emerald-600" />
                            Présent
                          </label>
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input type="radio" name={`repas_${c.eleveId}`} value="absent" defaultChecked={!present} className="accent-rose-600" />
                            Absent
                          </label>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <Button type="submit" disabled={cantineFb.pending} className="bg-emerald-600 hover:bg-emerald-700">
                  {cantineFb.pending ? 'Enregistrement…' : 'Enregistrer le pointage'}
                </Button>
              </form>
            )}
          </SectionBlock>

          <SectionBlock title="Menus à venir" description="Deux semaines planifiées">
            <DataTable
              columns={[
                { key: 'date', label: 'Date', render: (m) => formatDate(m.date) },
                { key: 'platPrincipal', label: 'Plat principal' },
                { key: 'accompagnement', label: 'Accompagnement', render: (m) => m.accompagnement || '—' },
                { key: 'dessert', label: 'Dessert', render: (m) => m.dessert || '—' },
                { key: 'allergenes', label: 'Allergènes', render: (m) => { const l = parseIds(m.allergenes); return l.length ? <span className="text-amber-700">{l.join(', ')}</span> : '—'; } },
              ]}
              rows={cantineMenus}
              emptyLabel="Aucun menu planifié"
            />
          </SectionBlock>
        </TabsContent>

        {/* ═══════════ O2 — TRANSPORT DU JOUR ═══════════ */}
        <TabsContent value="transport-jour" className="space-y-4">
          <div>{transportFb.Message}</div>
          {retourArret && (
            <div role="status" className={`rounded-md border px-3 py-2 text-sm ${retourArret.alerte ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              {retourArret.alerte
                ? `⚠ Retard de ${retourArret.retardMin} min — la direction a été notifiée.`
                : `Passage pointé — retard de ${retourArret.retardMin} min.`}
            </div>
          )}

          {lignesTransport.length === 0 && (
            <p className="text-sm text-gray-500">Aucune ligne de transport. Créez-en une dans l'onglet « Inscriptions &amp; bibliothèque ».</p>
          )}

          {lignesTransport.map((l: any) => {
            const feuille = feuillesRoute.find((f: any) => f.ligneId === l.id);
            const retard = feuille?.retardMin ?? 0;
            return (
              <SectionBlock
                key={l.id}
                title={`Ligne ${l.nom}`}
                description={feuille
                  ? `Feuille du ${formatDate(feuille.date)} — ${(feuille.passages ?? []).length} arrêt(s)`
                  : `${(l.arrets ?? []).length} arrêt(s) — aucune feuille de route aujourd'hui`}
                action={
                  feuille ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge statut={feuille.statut} />
                      <Badge variant="outline" className={`text-xs ${retard > 15 ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        Retard : {retard} min
                      </Badge>
                      {feuille.statut !== 'terminee' && (
                        <Button size="sm" variant="outline" disabled={transportFb.pending} onClick={() => transportFb.run(() => comp.cloturerFeuilleRoute(feuille.id), 'Feuille de route clôturée')}>
                          Clôturer la feuille
                        </Button>
                      )}
                    </div>
                  ) : undefined
                }
              >
                {!feuille ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">Aucune feuille de route pour aujourd'hui.</p>
                    <Button size="sm" disabled={transportFb.pending} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => transportFb.run(() => comp.creerFeuilleRoute(l.id, JOUR_ISO), 'Feuille de route créée')}>
                      {transportFb.pending ? 'Création…' : 'Créer la feuille'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(feuille.passages ?? []).map((p: any) => {
                      const dernier = retourArret?.passageId === p.id ? retourArret : null;
                      return (
                        <form
                          key={p.id}
                          onSubmit={(e) => {
                            e.preventDefault();
                            pointerUnArret(new FormData(e.currentTarget));
                          }}
                          className="flex flex-wrap items-end gap-2 rounded-md border border-gray-200 bg-white px-3 py-2"
                        >
                          <input type="hidden" name="passageId" value={p.id} />
                          <div className="min-w-[140px]">
                            <p className="text-sm font-medium text-gray-800">{p.arret?.nom ?? '—'}</p>
                            <p className="text-xs text-gray-500">Prévu : {p.heurePrevue}{p.heureReelle ? ` · Réel : ${p.heureReelle}` : ''}</p>
                          </div>
                          <FormField label="Heure réelle" required>
                            <Input type="time" name="heureReelle" defaultValue={p.heureReelle ?? ''} required className="w-28" />
                          </FormField>
                          <FormField label="Montés (ids)">
                            <Input name="montes" defaultValue={parseIds(p.montes).join(',')} placeholder="id1,id2" className="w-36" />
                          </FormField>
                          <FormField label="Descendus (ids)">
                            <Input name="descendus" defaultValue={parseIds(p.descendus).join(',')} placeholder="id1,id2" className="w-36" />
                          </FormField>
                          <Button type="submit" size="sm" variant="outline" disabled={transportFb.pending}>
                            Pointer
                          </Button>
                          {dernier && (
                            <Badge variant="outline" className={`text-xs ${dernier.retardMin > 15 ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                              +{dernier.retardMin} min{dernier.alerte ? ' — direction notifiée' : ''}
                            </Badge>
                          )}
                        </form>
                      );
                    })}
                  </div>
                )}
              </SectionBlock>
            );
          })}
        </TabsContent>

        {/* ═══════════ M8 — GARDERIE ═══════════ */}
        <TabsContent value="garderie" className="space-y-4">
          <div>{garderieFb.Message}</div>
          {minutesDernierDepart && (
            <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Départ de <strong>{minutesDernierDepart.eleve}</strong> pointé — <strong>{minutesDernierDepart.minutes} minute(s)</strong> facturées pour la session.
            </div>
          )}

          <SectionBlock
            title="Inscriptions garderie"
            description="Élèves inscrits au périscolaire et tarif horaire"
            action={
              <ModalForm
                trigger={<CreateButton label="Inscrire en garderie" />}
                title="Inscription garderie"
                fields={[
                  { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
                  { name: 'tarifHoraire', label: 'Tarif horaire (XOF)', type: 'number', required: true },
                  { name: 'formule', label: 'Formule', type: 'select', options: [
                    { value: 'horaire', label: 'Horaires facturés' },
                    { value: 'forfait_mensuel', label: 'Forfait mensuel' },
                  ], defaultValue: 'horaire' },
                ]}
                action={comp.inscrireGarderie}
              />
            }
          >
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (g) => (g.eleve ? `${g.eleve.prenom} ${g.eleve.nom}` : '—') },
                { key: 'formule', label: 'Formule', render: (g) => g.formule === 'forfait_mensuel' ? 'Forfait mensuel' : 'Horaires facturés' },
                { key: 'tarifHoraire', label: 'Tarif horaire', render: (g) => formatXOF(g.tarifHoraire) },
                { key: 'actif', label: 'Statut', render: (g) => g.actif ? <StatusBadge statut="actif" /> : <StatusBadge statut="resilie" /> },
              ]}
              rows={garderieInscriptions}
              emptyLabel="Aucune inscription garderie"
            />
          </SectionBlock>

          <SectionBlock
            title={`Pointage du jour — ${formatDate(JOUR_ISO)}`}
            description="Arrivées et départs de garderie ; les minutes facturées alimentent la facturation mensuelle"
          >
            <h4 className="text-sm font-medium mb-2">Sessions ouvertes</h4>
            {sessionsOuvertes.length === 0 ? (
              <p className="text-sm text-gray-500 mb-4">Aucune session ouverte actuellement.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {sessionsOuvertes.map((s: any) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.eleve ? `${s.eleve.prenom} ${s.eleve.nom}` : '—'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Arrivé(e) à {heureCourte(s.heureArrivee)}</p>
                    </div>
                    <Button size="sm" disabled={garderieFb.pending} onClick={() => pointerGarderie(s.eleveId, 'depart', s.eleve ? `${s.eleve.prenom} ${s.eleve.nom}` : '')}>
                      Départ
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <h4 className="text-sm font-medium mb-2">Arrivées à pointer</h4>
            {sansSession.length === 0 ? (
              <p className="text-sm text-gray-500 mb-4">Tous les inscrits actifs ont une session aujourd'hui.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {sansSession.map((g: any) => (
                  <div key={g.id} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5">
                    <span className="text-sm text-gray-800">{g.eleve ? `${g.eleve.prenom} ${g.eleve.nom}` : '—'}</span>
                    <Button size="sm" variant="outline" disabled={garderieFb.pending} onClick={() => pointerGarderie(g.eleveId, 'arrivee', g.eleve ? `${g.eleve.prenom} ${g.eleve.nom}` : '')}>
                      Arrivée
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <h4 className="text-sm font-medium mb-2">Sessions closes du jour</h4>
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (s) => (s.eleve ? `${s.eleve.prenom} ${s.eleve.nom}` : '—') },
                { key: 'heureArrivee', label: 'Arrivée', render: (s) => heureCourte(s.heureArrivee) },
                { key: 'heureDepart', label: 'Départ', render: (s) => heureCourte(s.heureDepart) },
                { key: 'minutesFacturees', label: 'Minutes facturées', render: (s) => s.minutesFacturees ?? '—' },
              ]}
              rows={sessionsFermees}
              emptyLabel="Aucune session close aujourd'hui"
            />
          </SectionBlock>

          <SectionBlock title="Facturation mensuelle de la garderie" description="Génère une échéance par élève : minutes facturées du mois × tarif horaire">
            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="space-y-1.5">
                <label htmlFor="garderie-mois" className="text-xs font-medium text-gray-700 block">Mois à facturer</label>
                <Input
                  id="garderie-mois"
                  type="month"
                  value={moisGarderie}
                  onChange={(e) => setMoisGarderie(e.target.value)}
                  className="w-44"
                />
              </div>
              <Button
                disabled={garderieFb.pending || !moisGarderie}
                onClick={() => {
                  setRetourFactGarderie(null);
                  garderieFb.run(async () => {
                    const r: any = await comp.facturerGarderie(moisGarderie);
                    if (r?.ok) setRetourFactGarderie(`Garderie ${r.periode ?? moisGarderie} — ${r['échéancesCréées'] ?? 0} échéance(s) créée(s) (${r.totalMinutes ?? 0} minutes au total).`);
                    return r;
                  }, 'Facturation garderie générée');
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {garderieFb.pending ? 'Génération…' : 'Facturer le mois'}
              </Button>
            </div>
            {retourFactGarderie && (
              <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                {retourFactGarderie}
              </p>
            )}
          </SectionBlock>
        </TabsContent>

        {/* ═══════════ ABONNEMENTS / BIBLIOTHÈQUE / MANUELS ═══════════ */}
        <TabsContent value="abonnements" className="space-y-4">
          <SectionBlock
            title="Facturation mensuelle des services"
            description="Génère les échéances de cantine et de transport pour le mois choisi — elles apparaissent ensuite dans le module Finances"
          >
            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="space-y-1.5">
                <label htmlFor="facturation-mois" className="text-xs font-medium text-gray-700 block">Mois à facturer</label>
                <Input
                  id="facturation-mois"
                  type="month"
                  value={moisFacturation}
                  onChange={(e) => setMoisFacturation(e.target.value)}
                  className="w-44"
                />
              </div>
              <Button
                disabled={facturation.pending || !moisFacturation}
                onClick={() => facturer('cantine')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {facturation.pending ? 'Génération…' : 'Facturer la cantine'}
              </Button>
              <Button
                disabled={facturation.pending || !moisFacturation}
                onClick={() => facturer('transport')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {facturation.pending ? 'Génération…' : 'Facturer le transport'}
              </Button>
            </div>
            <div className="mt-2">{facturation.Message}</div>
            {retourFacturation && (
              <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                {retourFacturation}
              </p>
            )}
          </SectionBlock>

          <SectionBlock
            title="Cantine — inscriptions"
            description="Repas par élève et jours de la semaine"
            action={
              <ModalForm
                trigger={<CreateButton label="Inscrire à la cantine" />}
                title="Inscription cantine"
                fields={[
                  { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
                  { name: 'jours', label: 'Jours (1=lun … 6=sam, séparés par virgules)', placeholder: '1,3,5', required: true },
                  { name: 'tarifJournalier', label: 'Tarif journalier (XOF)', type: 'number', required: true },
                ]}
                action={actions.inscrireCantine}
              />
            }
          >
            <DataTable
              columns={[
                { key: 'eleve', label: 'Élève', render: (c) => { const e = eleves.find((x: any) => x.id === c.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
                { key: 'classe', label: 'Classe', render: (c) => classes.find((x: any) => x.id === c.classeId)?.libelle ?? '—' },
                { key: 'joursSemaine', label: 'Jours', render: (c) => parseJours(c.joursSemaine).map((j: number) => ['Lun','Mar','Mer','Jeu','Ven','Sam'][j-1] ?? j).join(', ') },
                { key: 'tarifJournalier', label: 'Tarif/jour', render: (c) => formatXOF(c.tarifJournalier) },
                { key: 'actif', label: 'Statut', render: (c) => c.actif ? <StatusBadge statut="actif" /> : <StatusBadge statut="resilie" /> },
                {
                  key: 'actions', label: 'Action', render: (c) => c.actif ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => actions.annulerCantine(c.id), 'Inscription désactivée')}>Désactiver</Button>
                  ) : null,
                },
              ]}
              rows={cantine}
              emptyLabel="Aucune inscription cantine"
            />
          </SectionBlock>

          <SectionBlock
            title="Transport — lignes et inscriptions"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <ModalForm
                  trigger={<CreateButton label="Nouvelle ligne" />}
                  title="Créer une ligne de transport"
                  fields={[
                    { name: 'nom', label: 'Nom de la ligne', required: true, placeholder: 'Ligne A — Plateau' },
                    { name: 'vehicule', label: 'Véhicule', placeholder: 'Minibus 20 places' },
                  ]}
                  action={ext.creerLigneTransport}
                />
                {lignesTransport.length > 0 && (
                  <ModalForm
                    trigger={<Button size="sm" variant="outline">Inscrire un élève</Button>}
                    title="Inscription au transport scolaire"
                    fields={[
                      { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
                      { name: 'ligneId', label: 'Ligne', type: 'select', options: lignesTransport.map((l: any) => ({ value: l.id, label: l.nom })), required: true },
                      { name: 'arretMonteeId', label: 'Arrêt de montée', type: 'select', options: arrets.map((a: any) => ({ value: a.id, label: a.ligne ? `${a.nom} (${a.ligne.nom})` : a.nom })) },
                      { name: 'arretDescenteId', label: 'Arrêt de descente', type: 'select', options: arrets.map((a: any) => ({ value: a.id, label: a.ligne ? `${a.nom} (${a.ligne.nom})` : a.nom })) },
                      { name: 'tarif', label: 'Tarif mensuel (XOF)', type: 'number', required: true },
                    ]}
                    action={ext.inscrireTransport}
                  />
                )}
              </div>
            }
          >
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <h4 className="text-sm font-medium mb-2">Lignes</h4>
                <DataTable
                  columns={[
                    { key: 'nom', label: 'Ligne' },
                    { key: 'vehicule', label: 'Véhicule' },
                    { key: 'arrets', label: 'Arrêts', render: (l) => arrets.filter((a: any) => a.ligneId === l.id).length },
                  ]}
                  rows={lignesTransport}
                  emptyLabel="Aucune ligne"
                />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Inscriptions transport</h4>
                <DataTable
                  columns={[
                    { key: 'eleve', label: 'Élève', render: (t) => { const e = eleves.find((x: any) => x.id === t.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
                    { key: 'ligne', label: 'Ligne', render: (t) => lignesTransport.find((l: any) => l.id === t.ligneId)?.nom ?? '—' },
                    { key: 'arretMontee', label: 'Montée', render: (t) => arrets.find((a: any) => a.id === t.arretMonteeId)?.nom ?? '—' },
                    { key: 'tarif', label: 'Tarif', render: (t) => formatXOF(t.tarif) },
                  ]}
                  rows={transports}
                  emptyLabel="Aucune inscription transport"
                />
              </div>
            </div>
          </SectionBlock>

          <SectionBlock
            title="Bibliothèque"
            description="Catalogue de livres et prêts en cours"
            action={
              <div className="flex items-center gap-2">
                <ModalForm
                  trigger={<CreateButton label="Nouveau livre" />}
                  title="Ajouter un livre au catalogue"
                  fields={[
                    { name: 'titre', label: 'Titre', required: true },
                    { name: 'auteur', label: 'Auteur', required: true },
                    { name: 'editeur', label: 'Éditeur' },
                    { name: 'isbn', label: 'ISBN' },
                    { name: 'anneePublication', label: 'Année de publication', type: 'number' },
                    { name: 'exemplairesTotal', label: 'Nombre d\'exemplaires', type: 'number', required: true },
                    { name: 'categorie', label: 'Catégorie' },
                    { name: 'cote', label: 'Cote' },
                  ]}
                  action={actions.creerLivreBiblio}
                />
                <ModalForm
                  trigger={<Button size="sm" variant="outline">Prêter un livre</Button>}
                  title="Prêt de livre"
                  fields={[
                    { name: 'livreId', label: 'Livre', type: 'select', options: biblioLivres.map((l: any) => ({ value: l.id, label: `${l.titre} (${l.exemplairesDisponibles} dispo)` })), required: true },
                    { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
                    { name: 'dureeJours', label: 'Durée (jours)', type: 'number', defaultValue: '14' },
                  ]}
                  action={actions.preterLivre}
                />
              </div>
            }
          >
            <DataTable
              columns={[
                { key: 'titre', label: 'Titre' },
                { key: 'auteur', label: 'Auteur' },
                { key: 'isbn', label: 'ISBN' },
                { key: 'disponibilite', label: 'Dispo', render: (l) => `${l.exemplairesDisponibles}/${l.exemplairesTotal}` },
                { key: 'cote', label: 'Cote' },
              ]}
              rows={biblioLivres}
              emptyLabel="Aucun livre au catalogue"
            />
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Prêts en cours</h4>
              {penaliteRetour != null && penaliteRetour > 0 && (
                <p className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Pénalité de retard appliquée : <strong>{formatXOF(penaliteRetour)}</strong>
                </p>
              )}
              <DataTable
                columns={[
                  { key: 'livre', label: 'Livre', render: (p) => biblioLivres.find((l: any) => l.id === p.livreId)?.titre ?? '—' },
                  { key: 'eleve', label: 'Élève', render: (p) => { const e = eleves.find((x: any) => x.id === p.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
                  { key: 'datePret', label: 'Prêté le', render: (p) => formatDate(p.datePret) },
                  { key: 'dateRetourPrevue', label: 'À rendre le', render: (p) => formatDate(p.dateRetourPrevue) },
                  { key: 'penaliteGeneree', label: 'Pénalité', render: (p) => (p.penaliteGeneree ?? 0) > 0 ? <span className="text-amber-700 font-medium">{formatXOF(p.penaliteGeneree)}</span> : '—' },
                  { key: 'statut', label: 'Statut', render: (p) => <StatusBadge statut={p.statut} /> },
                  { key: 'retour', label: 'Retour', render: (p) => p.statut === 'en_cours' ? (
                    <Button
                      size="sm" variant="outline" disabled={pending}
                      onClick={() => run(async () => {
                        setPenaliteRetour(null);
                        const r = await actions.retournerLivre(p.id);
                        if (r && r.ok) setPenaliteRetour((r as any).penalite ?? 0);
                        return r;
                      }, 'Livre rendu')}
                    >
                      Rendre
                    </Button>
                  ) : null },
                ]}
                rows={biblioPrets}
                emptyLabel="Aucun prêt en cours"
              />
            </div>
          </SectionBlock>

          <SectionBlock
            title="Manuels scolaires"
            description="Stock, attributions et retours"
            action={
              <ModalForm
                trigger={<CreateButton label="Attribuer un manuel" />}
                title="Attribution de manuel"
                fields={[
                  { name: 'manuelScolaireId', label: 'Manuel', type: 'select', options: manuels.map((m: any) => ({ value: m.id, label: `${m.titre} (${m.quantiteStock} en stock)` })), required: true },
                  { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
                  { name: 'etatRemise', label: 'État du manuel remis', type: 'select', options: [
                    { value: 'bon', label: 'Bon état' },
                    { value: 'usage', label: 'Usagé' },
                    { value: 'endommage', label: 'Endommagé' },
                  ], required: true },
                ]}
                action={actions.attribuerManuel}
              />
            }
          >
            <DataTable
              columns={[
                { key: 'titre', label: 'Titre' },
                { key: 'editeur', label: 'Éditeur' },
                { key: 'anneeEdition', label: 'Édition' },
                { key: 'quantiteStock', label: 'Stock' },
                { key: 'attributions', label: 'Attribués', render: (m) => attributionsManuel.filter((a: any) => a.manuelScolaireId === m.id).length },
              ]}
              rows={manuels}
              emptyLabel="Aucun manuel scolaire"
            />
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Attributions en cours</h4>
              <DataTable
                columns={[
                  { key: 'eleve', label: 'Élève', render: (a) => { const e = eleves.find((x: any) => x.id === a.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
                  { key: 'manuel', label: 'Manuel', render: (a) => manuels.find((m: any) => m.id === a.manuelScolaireId)?.titre ?? '—' },
                  { key: 'etatRemise', label: 'Remis en' },
                  { key: 'dateAttribution', label: 'Attribué le', render: (a) => formatDate(a.dateAttribution) },
                  { key: 'statut', label: 'Statut', render: (a) => <StatusBadge statut={a.statut} /> },
                  { key: 'actions', label: 'Action', render: (a) => a.statut === 'en_cours' ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => actions.retournerManuel(a.id, 'bon'), 'Manuel retourné (bon état)')}>Retour (bon état)</Button>
                  ) : null },
                ]}
                rows={attributionsManuel}
                emptyLabel="Aucune attribution de manuel"
              />
            </div>
          </SectionBlock>

          <SectionBlock title="Listes de fournitures" description="Fournitures demandées par niveau, publication aux familles">
            <DataTable
              columns={[
                { key: 'niveau', label: 'Niveau', render: (l) => niveaux.find((n: any) => n.id === l.niveauId)?.libelle ?? '—' },
                { key: 'articles', label: 'Articles', render: (l) => { try { return `${JSON.parse(l.contenu).length} article(s)`; } catch { return '—'; } } },
                { key: 'datePublication', label: 'Publiée le', render: (l) => l.datePublication ? formatDate(l.datePublication) : '—' },
                { key: 'publiee', label: 'Statut', render: (l) => <StatusBadge statut={l.publiee ? 'publie' : 'en_attente'} /> },
                {
                  key: 'detail', label: 'Détail', render: (l) => {
                    try {
                      const items = JSON.parse(l.contenu) as { article: string; quantite: number }[];
                      return <span className="text-xs text-gray-500">{items.slice(0, 3).map((i) => `${i.article} ×${i.quantite}`).join(', ')}{items.length > 3 ? '…' : ''}</span>;
                    } catch { return '—'; }
                  },
                },
              ]}
              rows={listesFourniture}
              emptyLabel="Aucune liste de fournitures"
            />
          </SectionBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}
