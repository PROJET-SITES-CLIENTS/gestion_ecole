'use client';

// ====================================================================
// Module Élèves — fiche élève + besoins spécifiques + aménagements +
// consentements mineurs (Partie C.2 + C.8 du cahier des charges)
// ====================================================================

import { useState } from 'react';
import { KeyRound, Users, Plus, Eye, Accessibility, FileCheck, AlertTriangle, Shield, BookMarked, FileText, Pencil, ArrowRightLeft, DoorOpen, UserPlus, Download, Trash2 } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, InfoRow, EmptyState, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import * as actions from '@/app/actions';
import { formatDate, formatDateTime, initiales } from '@/lib/format';
import * as ext from '@/app/actions/completions';

export default function ElevesModule({ initialData }: { initialData: any }) {
  const eleves = initialData.eleves ?? [];
  const classes = initialData.classes ?? [];
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
  const [selectedEleveId, setSelectedEleveId] = useState<string | null>(eleves[0]?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const consentementFb = useActionFeedback();
  const rgpdFb = useActionFeedback();

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

  const consentementsEnAttente = eleves.filter((e: any) => !e.consentementPortailEleve).length;
  const elevesAvecBesoin = eleves.filter((e: any) => besoinsSpecifiques.some((b: any) => b.eleveId === e.id)).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Élèves"
        subtitle={`${eleves.length} élèves · ${classes.length} classes`}
        actions={
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
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Élèves actifs" value={eleves.length} icon={Users} color="emerald" />
        <StatCard title="Besoins spécifiques" value={elevesAvecBesoin} sub="élèves concernés" icon={Accessibility} color="amber" />
        <StatCard title="Consentements en attente" value={consentementsEnAttente} sub="portail élève mineur" icon={FileCheck} color="rose" />
        <StatCard title="Dernière inscription" value={eleves.length ? formatDate(eleves[eleves.length - 1].dateInscription) : '—'} icon={Users} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste des élèves */}
        <div className="lg:col-span-1">
          <SectionBlock title="Liste des élèves" description={`${eleves.length} au total`}>
            <div className="max-h-[60vh] overflow-y-auto -mx-2">
              {eleves.map((e: any) => (
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
                  <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-2 h-auto">
                    <TabsTrigger value="identite" className="text-xs">Identité</TabsTrigger>
                    <TabsTrigger value="besoins" className="text-xs">Besoins</TabsTrigger>
                    <TabsTrigger value="manuels" className="text-xs">Manuels</TabsTrigger>
                    <TabsTrigger value="securite" className="text-xs">Sécurité</TabsTrigger>
                  </TabsList>

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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Naissance</div><div className="text-sm font-medium">{formatDate(eleve.dateNaissance)}</div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Statut</div><div><StatusBadge statut={eleve.statut} /></div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Portail élève</div><div>{eleve.consentementPortailEleve ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Activé</Badge> : <Badge variant="outline" className="bg-amber-50 text-amber-700">En attente</Badge>}</div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-gray-500">Besoins</div><div className="text-sm font-medium">{eleveBesoinSpec.length > 0 ? `${eleveBesoinSpec.length} déclaré(s)` : 'Aucun'}</div></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
