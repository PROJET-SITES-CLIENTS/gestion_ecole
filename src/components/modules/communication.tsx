'use client';

// ====================================================================
// Module Communication — notifications + modèles de messages (B) et
// messagerie interne / annonces / tickets support (B7).
// ====================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, FileText, MessagesSquare, LifeBuoy, AlertTriangle } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import * as ext from '@/app/actions/extensions';
import { formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// --------------------------------------------------------------------
// B7 — Messagerie interne : conversations, fil de messages, création
// (titre + type + participants cochés → FormData « donnees » JSON).
// --------------------------------------------------------------------
function SectionMessagerie({ conversations, utilisateurs }: { conversations: any[]; utilisateurs: any[] }) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState<any | null>(null);
  const [brouillon, setBrouillon] = useState('');
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [nouveauTitre, setNouveauTitre] = useState('');
  const [nouveauType, setNouveauType] = useState('direct');
  const [participantsCoches, setParticipantsCoches] = useState<string[]>([]);
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);
  const [pendingEnvoi, startEnvoi] = useTransition();
  const [pendingCreation, startCreation] = useTransition();

  const nomUtilisateur = (id: string) => {
    const u = utilisateurs.find((x: any) => x.id === id);
    return u ? `${u.prenom} ${u.nom}` : 'Utilisateur';
  };

  function ouvrirConversation(c: any) {
    setOuverte(c);
    setBrouillon('');
    setErreurEnvoi(null);
    // Accusé de lecture (sans bloquer l'ouverture du fil)
    void ext.marquerConversationLue(c.id).then(() => router.refresh());
  }

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!ouverte || !brouillon.trim()) return;
    const id = ouverte.id;
    const contenu = brouillon.trim();
    setErreurEnvoi(null);
    startEnvoi(async () => {
      const r = await ext.envoyerMessage(id, contenu);
      if (r && r.ok === false) {
        setErreurEnvoi(r.error ?? 'Envoi refusé.');
        return;
      }
      setBrouillon('');
      router.refresh();
    });
  }

  function creerConversation(e: React.FormEvent) {
    e.preventDefault();
    setErreurCreation(null);
    if (!nouveauTitre.trim()) { setErreurCreation('Le titre est obligatoire.'); return; }
    if (participantsCoches.length === 0) { setErreurCreation('Sélectionnez au moins un participant.'); return; }
    startCreation(async () => {
      const fd = new FormData();
      fd.set('donnees', JSON.stringify({ titre: nouveauTitre.trim(), type: nouveauType, participantIds: participantsCoches }));
      const r = await ext.creerConversation(fd);
      if (r && r.ok === false) { setErreurCreation(r.error ?? 'Création refusée.'); return; }
      setCreationOuverte(false);
      setNouveauTitre(''); setNouveauType('direct'); setParticipantsCoches([]);
      router.refresh();
    });
  }

  return (
    <SectionBlock
      title="Messagerie interne"
      description="Conversations 1-à-1 et de groupe — cliquez sur une conversation pour lire et répondre"
      action={
        <CreateButton label="Nouvelle conversation" onClick={() => setCreationOuverte(true)} />
      }
    >
      <DataTable
        columns={[
          {
            key: 'titre', label: 'Conversation', render: (c) => (
              <button className="text-left font-medium text-emerald-700 hover:underline" onClick={() => ouvrirConversation(c)}>
                {c.titre}
              </button>
            ),
          },
          { key: 'type', label: 'Type', render: (c) => <Badge variant="outline" className="text-xs">{c.type}</Badge> },
          { key: 'participants', label: 'Participants', render: (c) => (c.participants ?? []).map((p: any) => nomUtilisateur(p.utilisateurId)).join(', ') || '—' },
          {
            key: 'dernier', label: 'Dernier message', render: (c) => {
              const msgs = [...(c.messages ?? [])].sort((a: any, b: any) => new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime());
              const derniere = msgs[0];
              return derniere
                ? <span className="text-xs text-gray-600">{derniere.contenu.slice(0, 60)}{derniere.contenu.length > 60 ? '…' : ''} · {formatDateTime(derniere.dateEnvoi)}</span>
                : <span className="text-xs text-gray-400">Aucun message</span>;
            },
          },
        ]}
        rows={conversations}
        emptyLabel="Aucune conversation"
      />

      {/* Fil de messages d'une conversation */}
      <Dialog open={Boolean(ouverte)} onOpenChange={(o) => { if (!o) setOuverte(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessagesSquare className="h-4 w-4 text-emerald-600" />{ouverte?.titre}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
            {[...(ouverte?.messages ?? [])]
              .sort((a: any, b: any) => new Date(a.dateEnvoi).getTime() - new Date(b.dateEnvoi).getTime())
              .map((m: any) => (
                <div key={m.id} className={`rounded-lg border px-3 py-2 ${m.supprime ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-800">{nomUtilisateur(m.expediteurId)}</span>
                    <span className="text-[10px] text-gray-400">{formatDateTime(m.dateEnvoi)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{m.supprime ? '(message supprimé)' : m.contenu}</p>
                </div>
              ))}
            {(ouverte?.messages ?? []).length === 0 && <p className="text-sm text-gray-500 text-center py-6">Aucun message dans cette conversation.</p>}
          </div>
          {erreurEnvoi && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 mb-2" role="alert">{erreurEnvoi}</div>}
          <form onSubmit={envoyer} className="flex items-center gap-2 border-t border-gray-100 pt-3">
            <Input value={brouillon} onChange={(e) => setBrouillon(e.target.value)} placeholder="Écrire un message…" disabled={pendingEnvoi} />
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pendingEnvoi || !brouillon.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mini-formulaire de création (participants en cases à cocher) */}
      <Dialog open={creationOuverte} onOpenChange={(o) => { setCreationOuverte(o); if (!o) setErreurCreation(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle conversation</DialogTitle></DialogHeader>
          {erreurCreation && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{erreurCreation}</div>}
          <form onSubmit={creerConversation} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Titre</Label>
              <Input value={nouveauTitre} onChange={(e) => setNouveauTitre(e.target.value)} placeholder="Ex. : Coordination 6ème A" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Type</Label>
              <select
                value={nouveauType}
                onChange={(e) => setNouveauType(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="direct">Direct (1-à-1)</option>
                <option value="groupe">Groupe</option>
                <option value="annonce">Annonce</option>
                <option value="classe">Classe</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Participants</Label>
              <div className="border border-gray-200 rounded-md p-2 max-h-48 overflow-y-auto space-y-1.5">
                {utilisateurs.map((u: any) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                    <Checkbox
                      checked={participantsCoches.includes(u.id)}
                      onCheckedChange={(c) => setParticipantsCoches((prev) => c ? [...prev, u.id] : prev.filter((id) => id !== u.id))}
                    />
                    <span>{u.prenom} {u.nom} <span className="text-xs text-gray-400">({u.email})</span></span>
                  </label>
                ))}
                {utilisateurs.length === 0 && <p className="text-xs text-gray-500">Aucun utilisateur disponible.</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" disabled={pendingCreation} onClick={() => setCreationOuverte(false)}>Annuler</Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pendingCreation}>
                {pendingCreation ? 'Création…' : 'Créer la conversation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// B7 — Annonces : brouillons, publication ciblée, épinglage.
// --------------------------------------------------------------------
function SectionAnnonces({ annonces }: { annonces: any[] }) {
  const retour = useActionFeedback();
  return (
    <SectionBlock
      title="Annonces"
      description="Publications ciblées (école entière, niveau, classe, personnel, parents) avec épinglage"
      action={
        <ModalForm
          trigger={<CreateButton label="Nouvelle annonce" />}
          title="Créer une annonce"
          fields={[
            { name: 'titre', label: 'Titre', required: true },
            { name: 'contenu', label: 'Contenu', type: 'textarea', required: true },
            { name: 'cible', label: 'Cible', type: 'select', required: true, options: [
              { value: 'toute_ecole', label: 'Toute l\'école' },
              { value: 'cycle', label: 'Cycle' },
              { value: 'niveau', label: 'Niveau' },
              { value: 'classe', label: 'Classe' },
              { value: 'personnel', label: 'Personnel' },
              { value: 'parents', label: 'Parents' },
            ] },
            { name: 'pinned', label: 'Épingler en haut du fil', type: 'checkbox' },
            { name: 'publier', label: 'Publier immédiatement (sinon brouillon)', type: 'checkbox' },
          ]}
          action={ext.creerAnnonce}
        />
      }
    >
      {retour.Message}
      <DataTable
        columns={[
          { key: 'titre', label: 'Titre', render: (a) => <span className="font-medium">{a.pinned ? '📌 ' : ''}{a.titre}</span> },
          { key: 'cible', label: 'Cible', render: (a) => <Badge variant="outline" className="text-xs">{a.cible}</Badge> },
          { key: 'statut', label: 'Statut', render: (a) => <StatusBadge statut={a.statut} /> },
          { key: 'datePublication', label: 'Publication', render: (a) => a.datePublication ? formatDateTime(a.datePublication) : '—' },
          {
            key: 'actions', label: 'Action', render: (a) => a.statut === 'brouillon' ? (
              <Button size="sm" variant="outline" disabled={retour.pending} onClick={() => retour.run(() => ext.publierAnnonce(a.id), 'Annonce publiée')}>
                Publier
              </Button>
            ) : null,
          },
        ]}
        rows={annonces}
        emptyLabel="Aucune annonce"
      />
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// B7 — Tickets support : KPI (ouverts, SLA dépassé), création, fil de
// discussion avec réponse et changement de statut.
// --------------------------------------------------------------------
const STATUTS_TICKET = ['ouvert', 'en_cours', 'en_attente_client', 'resolu', 'ferme'] as const;

function SectionTickets({ tickets }: { tickets: any[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<any | null>(null);
  const [reponse, setReponse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [pendingReponse, startReponse] = useTransition();
  const [pendingStatut, startStatut] = useTransition();

  const maintenant = Date.now();
  const ticketsOuverts = tickets.filter((t: any) => t.statut === 'ouvert' || t.statut === 'en_cours').length;
  const slaDepasses = tickets.filter((t: any) =>
    t.slaEcheance && new Date(t.slaEcheance).getTime() < maintenant && (t.statut === 'ouvert' || t.statut === 'en_cours'),
  ).length;

  function repondre(e: React.FormEvent) {
    e.preventDefault();
    if (!ouvert || !reponse.trim()) return;
    const id = ouvert.id;
    const message = reponse.trim();
    setErreur(null);
    startReponse(async () => {
      const r = await ext.repondreTicket(id, message);
      if (r && r.ok === false) {
        setErreur(r.error ?? 'Réponse refusée.');
        return;
      }
      setReponse('');
      router.refresh();
    });
  }

  function changerStatut(id: string, statut: string) {
    setErreur(null);
    startStatut(async () => {
      const r = await ext.changerStatutTicket(id, statut);
      if (r && r.ok === false) {
        setErreur(r.error ?? 'Changement de statut refusé.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <SectionBlock
      title="Tickets support"
      description="Demandes d'assistance à l'éditeur de la plateforme — SLA contractuel suivi automatiquement"
      action={
        <ModalForm
          trigger={<CreateButton label="Ouvrir un ticket" />}
          title="Ouvrir un ticket support"
          fields={[
            { name: 'sujet', label: 'Sujet', required: true },
            { name: 'description', label: 'Description détaillée', type: 'textarea', required: true },
            { name: 'categorie', label: 'Catégorie', type: 'select', required: true, options: [
              { value: 'fonctionnel', label: 'Fonctionnel' },
              { value: 'technique', label: 'Technique' },
              { value: 'facturation', label: 'Facturation' },
              { value: 'demande', label: 'Demande' },
            ] },
            { name: 'priorite', label: 'Priorité', type: 'select', required: true, options: [
              { value: 'basse', label: 'Basse' },
              { value: 'normale', label: 'Normale' },
              { value: 'haute', label: 'Haute' },
              { value: 'critique', label: 'Critique' },
            ] },
          ]}
          action={ext.creerTicket}
        />
      }
    >
      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatCard title="Tickets ouverts" value={ticketsOuverts} icon={LifeBuoy} color="blue" />
        <StatCard title="SLA dépassé" value={slaDepasses} sub="échéance dépassée, non résolus" icon={AlertTriangle} color={slaDepasses > 0 ? 'rose' : 'emerald'} />
      </div>
      <DataTable
        columns={[
          { key: 'sujet', label: 'Sujet', render: (t) => <span className="font-medium">{t.sujet}</span> },
          { key: 'categorie', label: 'Catégorie' },
          { key: 'priorite', label: 'Priorité', render: (t) => (
            <Badge variant="outline" className={`text-xs ${t.priorite === 'critique' ? 'bg-rose-50 text-rose-700 border-rose-200' : t.priorite === 'haute' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}`}>{t.priorite}</Badge>
          ) },
          { key: 'statut', label: 'Statut', render: (t) => <StatusBadge statut={t.statut} /> },
          { key: 'slaEcheance', label: 'SLA', render: (t) => !t.slaEcheance ? '—' : t.slaEcheance && new Date(t.slaEcheance).getTime() < maintenant && (t.statut === 'ouvert' || t.statut === 'en_cours')
            ? <span className="text-xs font-medium text-rose-600">Dépassé ({formatDateTime(t.slaEcheance)})</span>
            : <span className="text-xs text-gray-600">{formatDateTime(t.slaEcheance)}</span> },
          { key: 'dateCreation', label: 'Créé le', render: (t) => formatDateTime(t.dateCreation) },
          {
            key: 'actions', label: 'Action', render: (t) => (
              <Button size="sm" variant="outline" onClick={() => { setOuvert(t); setReponse(''); setErreur(null); }}>
                Ouvrir ({(t.messages ?? []).length})
              </Button>
            ),
          },
        ]}
        rows={tickets}
        emptyLabel="Aucun ticket"
      />

      {/* Fil d'un ticket : messages + réponse + statut */}
      <Dialog open={Boolean(ouvert)} onOpenChange={(o) => { if (!o) setOuvert(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-emerald-600" />{ouvert?.sujet}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">{ouvert?.description}</p>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[150px]">
            {[...(ouvert?.messages ?? [])]
              .sort((a: any, b: any) => new Date(a.dateEnvoi).getTime() - new Date(b.dateEnvoi).getTime())
              .map((m: any) => (
                <div key={m.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-800">{m.auteurRole}{m.interne ? ' · note interne' : ''}</span>
                    <span className="text-[10px] text-gray-400">{formatDateTime(m.dateEnvoi)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{m.message}</p>
                </div>
              ))}
            {(ouvert?.messages ?? []).length === 0 && <p className="text-sm text-gray-500 text-center py-4">Aucun message sur ce ticket.</p>}
          </div>
          {erreur && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 mb-2" role="alert">{erreur}</div>}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <select
              value={ouvert?.statut ?? 'ouvert'}
              disabled={pendingStatut}
              onChange={(e) => ouvert && changerStatut(ouvert.id, e.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {STATUTS_TICKET.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <form onSubmit={repondre} className="flex flex-1 items-center gap-2 min-w-[240px]">
              <Input value={reponse} onChange={(e) => setReponse(e.target.value)} placeholder="Répondre au ticket…" disabled={pendingReponse} />
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pendingReponse || !reponse.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </SectionBlock>
  );
}

export default function CommunicationModule({ initialData }: { initialData: any }) {
  const notifications = initialData.notifications ?? [];
  const modeles = initialData.modelesMessage ?? [];
  const utilisateurs = initialData.utilisateurs ?? [];
  const classes = initialData.classes ?? [];
  const niveaux = initialData.niveaux ?? [];
  const conversations = initialData.conversations ?? [];
  const annonces = initialData.annonces ?? [];
  const tickets = initialData.tickets ?? [];

  const notifEnvoyees = notifications.filter((n: any) => n.statut === 'envoye').length;
  const notifLues = notifications.filter((n: any) => n.dateLecture).length;

  // Cibles de l'envoi en masse : personnel/parents + une option par classe et par niveau
  // (si les listes sont vides — portail restreint — seules les deux cibles globales restent).
  const ciblesMasse = [
    { value: 'tous_personnel', label: 'Tout le personnel' },
    { value: 'tous_parents', label: 'Tous les parents' },
    ...classes.map((c: any) => ({ value: 'classe:' + c.id, label: 'Classe ' + c.libelle })),
    ...niveaux.map((n: any) => ({ value: 'niveau:' + n.id, label: 'Niveau ' + n.libelle })),
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Communication & Notifications"
        subtitle="Messagerie interne, annonces, tickets support et moteur de notifications multi-canaux"
        actions={
          <ModalForm
            trigger={<CreateButton label="Envoyer en masse" />}
            title="Envoyer une notification en masse"
            fields={[
              { name: 'cible', label: 'Cible', type: 'select', required: true, options: ciblesMasse },
              { name: 'sujet', label: 'Sujet', required: true },
              { name: 'corps', label: 'Message', type: 'textarea', required: true },
            ]}
            action={actions.envoyerNotificationMasse}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Notifications envoyées" value={notifEnvoyees} icon={Send} color="emerald" />
        <StatCard title="Notifications lues" value={notifLues} sub={`${notifEnvoyees > 0 ? Math.round(notifLues / notifEnvoyees * 100) : 0}% de taux de lecture`} icon={MessageSquare} color="blue" />
        <StatCard title="Modèles actifs" value={modeles.filter((m: any) => m.actif).length} icon={FileText} color="purple" />
        <StatCard title="Canaux" value="1+" sub="in_app actif · email/SMS s'activent à la configuration (SG_EMAIL_API_URL, SG_SMS_API_URL)" icon={Send} color="amber" />
      </div>

      <SectionMessagerie conversations={conversations} utilisateurs={utilisateurs} />

      <SectionAnnonces annonces={annonces} />

      <SectionTickets tickets={tickets} />

      <SectionBlock
        title="Notifications récentes"
        description="Toutes notifications émises"
        action={
          <ModalForm
            trigger={<CreateButton label="Envoyer une notification" />}
            title="Envoyer une notification"
            fields={[
              { name: 'destinataireType', label: 'Type destinataire', type: 'select', options: [
                { value: 'personnel', label: 'Personnel' },
                { value: 'parent', label: 'Parent' },
                { value: 'eleve', label: 'Élève' },
              ], required: true },
              { name: 'destinataireId', label: 'Destinataire (optionnel)', type: 'select', options: utilisateurs.map((u: any) => ({ value: u.id, label: `${u.prenom} ${u.nom}` })) },
              { name: 'sujet', label: 'Sujet', required: true },
              { name: 'corps', label: 'Message', type: 'textarea', required: true },
              { name: 'canal', label: 'Canal', type: 'select', options: [
                { value: 'in_app', label: 'In-app' },
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
                { value: 'push', label: 'Push' },
              ], required: true },
            ]}
            action={actions.envoyerNotification}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'sujet', label: 'Sujet' },
            { key: 'corps', label: 'Message', render: (n) => <span className="line-clamp-2 text-xs text-gray-600">{n.corps}</span> },
            { key: 'canal', label: 'Canal', render: (n) => <Badge variant="outline" className="text-xs">{n.canal}</Badge> },
            { key: 'statut', label: 'Statut', render: (n) => <StatusBadge statut={n.statut} /> },
            { key: 'dateEnvoi', label: 'Date', render: (n) => formatDateTime(n.dateEnvoi) },
          ]}
          rows={notifications}
          emptyLabel="Aucune notification envoyée"
        />
      </SectionBlock>

      <SectionBlock
        title="Modèles de messages"
        description="Templates paramétrables avec placeholders {{eleve_nom}}, {{echeance_montant}}, etc."
        action={
          <ModalForm
            trigger={<CreateButton label="Créer un modèle" />}
            title="Créer un modèle de message"
            fields={[
              { name: 'code', label: 'Code unique', required: true, placeholder: 'rappel_echeance' },
              { name: 'sujet', label: 'Sujet', required: true, placeholder: 'Rappel : échéance de {{frais_libelle}}' },
              { name: 'corps', label: 'Corps du message', type: 'textarea', required: true, placeholder: 'Bonjour {{parent_prenom}}, ...' },
              { name: 'canaux', label: 'Canaux (séparés par virgule)', defaultValue: 'in_app', placeholder: 'sms,email,in_app' },
            ]}
            action={actions.creerModeleMessage}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'sujet', label: 'Sujet' },
            { key: 'canaux', label: 'Canaux', render: (m) => JSON.parse(m.canaux || '[]').join(', ') },
            { key: 'langue', label: 'Langue' },
            { key: 'actif', label: 'Statut', render: (m) => m.actif ? <StatusBadge statut="actif" /> : <StatusBadge statut="resilie" /> },
          ]}
          rows={modeles}
          emptyLabel="Aucun modèle défini"
        />
      </SectionBlock>
    </div>
  );
}
