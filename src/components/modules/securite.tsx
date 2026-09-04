'use client';

// ====================================================================
// Module Sécurité — sécurité physique du site (visiteurs, autorisations
// de sortie, sorties anticipées) + exploitation :
//  - A1  : sauvegardes (manuelle + automatique quotidienne, restauration
//          super_admin avec double confirmation)
//  - A4  : mon compte (changement de mot de passe)
//  - C3  : sessions actives révocables
//  - C4  : 2FA et réinitialisation admin par utilisateur
//  - C5  : demandes d'effacement RGPD (anonymisation)
//  - D5  : multi-écoles (accès et bascule)
// ====================================================================

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Shield, UserCheck, LogOut, AlertTriangle, KeyRound, Smartphone, DatabaseBackup, HardDriveDownload, Building2 } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import * as actions from '@/app/actions';
import * as ext from '@/app/actions/extensions';
import { formatDate, formatDateTime } from '@/lib/format';

/** Formate une taille d'octets en Ko/Mo lisible. */
function formatTaille(octets: number): string {
  if (octets >= 1024 * 1024) return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

// --------------------------------------------------------------------
// Boîte « affiché UNE seule fois » — secret 2FA, mot de passe
// temporaire… La valeur n'est jamais re-demandée au serveur.
// --------------------------------------------------------------------
function DialogAffichageUnique({ valeur, titre, description, onFermer }: {
  valeur: string | null;
  titre: string;
  description: string;
  onFermer: () => void;
}) {
  return (
    <Dialog open={Boolean(valeur)} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-emerald-600" />{titre}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500">{description}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-mono break-all select-all">{valeur}</code>
          <Button type="button" size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(valeur ?? ''); }}>Copier</Button>
        </div>
        <p className="text-[11px] text-rose-600">⚠ Cette valeur ne sera plus jamais affichée : copiez-la maintenant.</p>
        <DialogFooter>
          <Button type="button" size="sm" onClick={onFermer}>J'ai copié, fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------------
// A1 — Sauvegardes : création manuelle, automatique quotidienne,
// restauration (super_admin, double confirmation texte « RESTAURER »).
// --------------------------------------------------------------------
function SectionSauvegardes({ portal }: { portal?: string }) {
  const retour = useActionFeedback();
  const [sauvegardes, setSauvegardes] = useState<{ nom: string; taille: number; date: string }[]>([]);
  const [aRestaurer, setARestaurer] = useState<{ nom: string; taille: number; date: string } | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [erreurRestauration, setErreurRestauration] = useState<string | null>(null);
  const [pendingRestauration, startRestauration] = useTransition();

  const estSuperAdmin = portal === 'super_admin';

  const charger = useCallback(() => {
    if (!estSuperAdmin) return;
    fetch('/api/sauvegardes', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { sauvegardes: [] }))
      .then((j) => setSauvegardes(j.sauvegardes ?? []))
      .catch(() => setSauvegardes([]));
  }, [estSuperAdmin]);

  useEffect(() => { charger(); }, [charger]);

  function restaurer() {
    if (!aRestaurer) return;
    setErreurRestauration(null);
    startRestauration(async () => {
      const r = await ext.restaurerSauvegardeAction(aRestaurer.nom);
      if (r && r.ok === false) {
        setErreurRestauration(r.error ?? 'Restauration refusée.');
        return;
      }
      setARestaurer(null);
      setConfirmation('');
      charger();
    });
  }

  return (
    <SectionBlock
      title="Sauvegardes de la base"
      description="Copies cohérentes VACUUM INTO (sans interruption) · sauvegarde automatique quotidienne + au démarrage (instrumentation) · rétention 30 fichiers"
      action={
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={retour.pending}
          onClick={() => retour.run(async () => {
            const r = await ext.creerSauvegardeAction();
            charger();
            return r;
          }, 'Sauvegarde créée')}
        >
          <DatabaseBackup className="h-4 w-4 mr-1" />Créer une sauvegarde
        </Button>
      }
    >
      {retour.Message}
      <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 mb-3">
        <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>Une sauvegarde <strong>automatique</strong> est créée chaque jour et au démarrage du serveur — aucune action requise. La restauration est réservée au super-administrateur et crée d&apos;abord une sauvegarde de sécurité.</span>
      </div>
      {estSuperAdmin ? (
        <DataTable
          columns={[
            { key: 'nom', label: 'Fichier', render: (s) => <span className="font-mono text-xs">{s.nom}</span> },
            { key: 'taille', label: 'Taille', render: (s) => formatTaille(s.taille) },
            { key: 'date', label: 'Créée le', render: (s) => formatDateTime(s.date) },
            {
              key: 'actions', label: 'Action', render: (s) => (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => { setARestaurer(s); setConfirmation(''); setErreurRestauration(null); }}
                >
                  <HardDriveDownload className="h-3 w-3 mr-1" />Restaurer
                </Button>
              ),
            },
          ]}
          rows={sauvegardes}
          emptyLabel="Aucun fichier de sauvegarde sur disque pour l'instant"
        />
      ) : (
        <p className="text-xs text-gray-500">La liste des fichiers de sauvegarde et la restauration sont réservées au portail super-administrateur.</p>
      )}

      {/* Double confirmation : saisie littérale « RESTAURER » */}
      <Dialog open={Boolean(aRestaurer)} onOpenChange={(o) => { if (!o) { setARestaurer(null); setConfirmation(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700"><AlertTriangle className="h-4 w-4" />Restaurer cette sauvegarde ?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-600">
            La base actuelle sera <strong>remplacée</strong> par <code className="font-mono text-[11px] bg-gray-100 px-1 rounded">{aRestaurer?.nom}</code> ({aRestaurer ? formatTaille(aRestaurer.taille) : ''}).
            Une sauvegarde de sécurité de l&apos;état actuel est créée avant. Cette opération est destructive.
          </p>
          {erreurRestauration && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{erreurRestauration}</div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Tapez « RESTAURER » pour confirmer</Label>
            <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="RESTAURER" autoComplete="off" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => { setARestaurer(null); setConfirmation(''); }} disabled={pendingRestauration}>Annuler</Button>
            <Button
              type="button"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={pendingRestauration || confirmation !== 'RESTAURER'}
              onClick={restaurer}
            >
              {pendingRestauration ? 'Restauration…' : 'Restaurer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// A4 — Mon compte : changement de mot de passe (confirmation saisie
// deux fois, vérifiée côté client avant l'appel serveur).
// --------------------------------------------------------------------
function SectionMonCompte() {
  const [ouvert, setOuvert] = useState(false);
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (nouveau.length < 8) { setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    if (nouveau !== confirmation) { setErreur('Les deux saisies du nouveau mot de passe ne correspondent pas.'); return; }
    start(async () => {
      const fd = new FormData();
      fd.set('ancien', ancien);
      fd.set('nouveau', nouveau);
      const r = await ext.changerMotDePasse(fd);
      if (r && r.ok === false) { setErreur(r.error ?? 'Changement refusé.'); return; }
      setOuvert(false);
      setAncien(''); setNouveau(''); setConfirmation('');
    });
  }

  return (
    <SectionBlock
      title="Mon compte"
      description="Changement de mot de passe de la session courante (l'ancien est exigé, les autres sessions restent valides)"
      action={
        <Button size="sm" variant="outline" onClick={() => { setOuvert(true); setErreur(null); }}>
          <KeyRound className="h-4 w-4 mr-1" />Changer mon mot de passe
        </Button>
      }
    >
      <p className="text-xs text-gray-500">
        Mot de passe oublié ? La réinitialisation se lance depuis la <a className="text-emerald-600 underline" href="/login">page de connexion</a>.
      </p>
      <Dialog open={ouvert} onOpenChange={(o) => { setOuvert(o); if (!o) { setAncien(''); setNouveau(''); setConfirmation(''); setErreur(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Changer mon mot de passe</DialogTitle></DialogHeader>
          {erreur && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{erreur}</div>}
          <form onSubmit={soumettre} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700" htmlFor="ancien-mdp">Mot de passe actuel</Label>
              <Input id="ancien-mdp" type="password" autoComplete="current-password" value={ancien} onChange={(e) => setAncien(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700" htmlFor="nouveau-mdp">Nouveau mot de passe</Label>
              <Input id="nouveau-mdp" type="password" autoComplete="new-password" minLength={8} value={nouveau} onChange={(e) => setNouveau(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700" htmlFor="confirmation-mdp">Confirmer le nouveau mot de passe</Label>
              <Input id="confirmation-mdp" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setOuvert(false)}>Annuler</Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending}>
                {pending ? 'Enregistrement…' : 'Changer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// C4 — Comptes utilisateurs : activation 2FA par un admin et
// réinitialisation du mot de passe (temporaire affiché UNE fois).
// --------------------------------------------------------------------
function SectionUtilisateurs({ utilisateurs }: { utilisateurs: any[] }) {
  const retour = useActionFeedback();
  const [secret2FA, setSecret2FA] = useState<string | null>(null);
  const [mdpTemporaire, setMdpTemporaire] = useState<string | null>(null);
  const [utilisateurConcerne, setUtilisateurConcerne] = useState<string | null>(null);

  return (
    <SectionBlock
      title="Comptes utilisateurs"
      description="Activation de la double authentification et réinitialisation de mot de passe par l'administration"
    >
      {retour.Message}
      <DataTable
        columns={[
          { key: 'nom', label: 'Utilisateur', render: (u) => <span className="font-medium">{u.prenom} {u.nom}</span> },
          { key: 'email', label: 'Email' },
          { key: 'type', label: 'Type', render: (u) => <Badge variant="outline" className="text-xs">{u.type}</Badge> },
          { key: 'actif', label: 'État', render: (u) => u.actif ? <StatusBadge statut="actif" /> : <StatusBadge statut="suspendu" /> },
          { key: 'derniereConnexion', label: 'Dernière connexion', render: (u) => u.derniereConnexion ? formatDateTime(u.derniereConnexion) : 'Jamais' },
          {
            key: 'actions', label: 'Actions', render: (u) => (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm" variant="outline" disabled={retour.pending}
                  title="Générer un secret TOTP pour cet utilisateur (affiché une fois)"
                  onClick={() => retour.run(async () => {
                    const r = await ext.activer2FAPourUtilisateur(u.id);
                    if (r && r.ok !== false && r.secret) { setUtilisateurConcerne(`${u.prenom} ${u.nom}`); setSecret2FA(String(r.secret)); }
                    return r;
                  }, '2FA activée pour cet utilisateur')}
                >
                  <Smartphone className="h-3 w-3 mr-1" />2FA
                </Button>
                <Button
                  size="sm" variant="outline" disabled={retour.pending}
                  title="Générer un mot de passe temporaire (affiché une fois)"
                  onClick={() => retour.run(async () => {
                    const r = await ext.reinitialiserMotDePasseAdmin(u.id);
                    if (r && r.ok !== false && r.motDePasseTemporaire) { setUtilisateurConcerne(`${u.prenom} ${u.nom}`); setMdpTemporaire(String(r.motDePasseTemporaire)); }
                    return r;
                  }, 'Mot de passe réinitialisé')}
                >
                  <KeyRound className="h-3 w-3 mr-1" />Réinit. mdp
                </Button>
              </div>
            ),
          },
        ]}
        rows={utilisateurs}
        emptyLabel="Aucun utilisateur"
      />

      <DialogAffichageUnique
        valeur={secret2FA}
        titre={`Secret 2FA — ${utilisateurConcerne ?? ''}`}
        description="Secret TOTP (base32) à communiquer à l'utilisateur pour qu'il l'ajoute dans son application d'authentification."
        onFermer={() => { setSecret2FA(null); setUtilisateurConcerne(null); }}
      />
      <DialogAffichageUnique
        valeur={mdpTemporaire}
        titre={`Mot de passe temporaire — ${utilisateurConcerne ?? ''}`}
        description="Communiquez ce mot de passe temporaire à l'utilisateur par un canal sûr ; il devra le changer à sa prochaine connexion."
        onFermer={() => { setMdpTemporaire(null); setUtilisateurConcerne(null); }}
      />
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// C5 — RGPD : demandes d'effacement (anonymisation réelle, confirmée).
// --------------------------------------------------------------------
function SectionRgpd({ demandes }: { demandes: any[] }) {
  const [aAnonymiser, setAAnonymiser] = useState<any | null>(null);
  const [pending, start] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function anonymiser() {
    if (!aAnonymiser) return;
    setErreur(null);
    start(async () => {
      const r = await ext.traiterDemandeEffacement(aAnonymiser.id);
      if (r && r.ok === false) { setErreur(r.error ?? 'Traitement refusé.'); return; }
      setAAnonymiser(null);
    });
  }

  return (
    <SectionBlock
      title="RGPD — demandes d'effacement"
      description="Droit à l'effacement : les données de la personne sont anonymisées (remplacées, jamais simplement masquées)"
    >
      <DataTable
        columns={[
          { key: 'cibleType', label: 'Cible', render: (d) => <Badge variant="outline" className="text-xs">{d.cibleType}</Badge> },
          { key: 'motif', label: 'Motif' },
          { key: 'description', label: 'Description', render: (d) => <span className="text-xs text-gray-600 line-clamp-2">{d.description ?? '—'}</span> },
          { key: 'statut', label: 'Statut', render: (d) => <StatusBadge statut={d.statut === 'anonymise' ? 'actif' : d.statut} label={d.statut === 'anonymise' ? 'Anonymisé' : d.statut === 'refuse' ? 'Refusé' : d.statut === 'en_cours' ? 'En cours' : 'Reçu'} /> },
          { key: 'dateDemande', label: 'Demandée le', render: (d) => formatDateTime(d.dateDemande) },
          {
            key: 'actions', label: 'Action', render: (d) => (d.statut === 'recu' || d.statut === 'en_cours') ? (
              <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { setAAnonymiser(d); setErreur(null); }}>
                Anonymiser
              </Button>
            ) : null,
          },
        ]}
        rows={demandes}
        emptyLabel="Aucune demande d'effacement"
      />

      <Dialog open={Boolean(aAnonymiser)} onOpenChange={(o) => { if (!o) setAAnonymiser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700"><AlertTriangle className="h-4 w-4" />Anonymiser définitivement ?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-600">
            Les données personnelles de la cible (<strong>{aAnonymiser?.cibleType}</strong>) seront remplacées par des valeurs
            anonymes et l&apos;opération sera journalisée. Cette action est irréversible.
          </p>
          {erreur && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{erreur}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setAAnonymiser(null)}>Annuler</Button>
            <Button type="button" size="sm" className="bg-rose-600 hover:bg-rose-700" disabled={pending} onClick={anonymiser}>
              {pending ? 'Anonymisation…' : 'Confirmer l\'anonymisation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// D5 — Multi-écoles : accès de l'utilisateur connecté + (super_admin)
// accord d'un accès à un autre utilisateur.
// --------------------------------------------------------------------
function SectionMultiEcoles({ portal, ecoles, utilisateurs, ecoleActiveId }: {
  portal?: string;
  ecoles: any[];
  utilisateurs: any[];
  ecoleActiveId?: string;
}) {
  const retour = useActionFeedback();
  const [mesEcoles, setMesEcoles] = useState<{ id: string; nom: string; slug: string; devise?: string }[] | null>(null);

  useEffect(() => {
    let vivant = true;
    ext.ecolesAccessibles()
      .then((r) => { if (vivant) setMesEcoles(r && r.ok !== false ? (r.ecoles as any[]) ?? [] : []); })
      .catch(() => { if (vivant) setMesEcoles([]); });
    return () => { vivant = false; };
  }, []);

  const estSuperAdmin = portal === 'super_admin';

  return (
    <SectionBlock
      title="Multi-écoles"
      description="Établissements accessibles avec ce compte — la bascule d'école active se fait depuis l'en-tête de l'application"
      action={estSuperAdmin && ecoles.length > 0 ? (
        <ModalForm
          trigger={<CreateButton label="Accorder un accès" />}
          title="Accorder l'accès à une école"
          fields={[
            { name: 'utilisateurId', label: 'Utilisateur', type: 'select', required: true, options: utilisateurs.map((u: any) => ({ value: u.id, label: `${u.prenom} ${u.nom} (${u.email})` })) },
            { name: 'ecoleId', label: 'École', type: 'select', required: true, options: ecoles.map((e: any) => ({ value: e.id, label: e.nom })) },
            { name: 'roleLibelle', label: 'Rôle dans cette école (optionnel)', placeholder: 'Directeur adjoint…' },
          ]}
          action={(fd) => ext.accorderAccesEcole(
            String(fd.get('utilisateurId') ?? ''),
            String(fd.get('ecoleId') ?? ''),
            String(fd.get('roleLibelle') ?? '') || undefined,
          )}
        />
      ) : undefined}
    >
      {retour.Message}
      {mesEcoles === null ? (
        <p className="text-xs text-gray-500">Chargement des accès…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {mesEcoles.map((e) => (
            <Badge
              key={e.id}
              variant="outline"
              className={`text-xs ${e.id === ecoleActiveId ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              <Building2 className="h-3 w-3 mr-1" />{e.nom}{e.id === ecoleActiveId ? ' · active' : ''}
            </Badge>
          ))}
          {mesEcoles.length === 0 && <p className="text-xs text-gray-500">Aucune école accessible listée.</p>}
        </div>
      )}
    </SectionBlock>
  );
}

export default function SecuriteModule({ initialData }: { initialData: any }) {
  const portal: string | undefined = initialData?.session?.portal;
  const directionOuPlus = portal === 'super_admin' || portal === 'direction';

  const visiteurs = initialData.visiteurs ?? [];
  const autorisations = initialData.autorisationsSortie ?? [];
  const sorties = initialData.sortiesAnticipees ?? [];
  const eleves = initialData.eleves ?? [];
  const roles = initialData.roles ?? [];
  const permissions = initialData.permissions ?? [];
  const rolePermissions = initialData.rolePermissions ?? [];
  const utilisateurRoles = initialData.utilisateurRoles ?? [];
  const utilisateurs = initialData.utilisateurs ?? [];
  const sessions = initialData.sessionsUtilisateur ?? [];
  const tentativesConnexion = initialData.tentativesConnexion ?? [];
  const demandesEffacement = initialData.demandesEffacement ?? [];
  const ecoles = initialData.ecoles ?? [];
  const retourVisiteurs = useActionFeedback();
  const retourAutorisations = useActionFeedback();
  const retourSessions = useActionFeedback();

  const visiteursPresents = visiteurs.filter((v: any) => !v.dateHeureSortie).length;
  const sortiesExceptionnelles = sorties.filter((s: any) => s.validationExceptionnelle).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Sécurité du site & du compte"
        subtitle="Registre visiteurs, autorisations de sortie, sauvegardes, sessions, RGPD et multi-écoles"
        actions={
          <ModalForm
            trigger={<CreateButton label="Enregistrer un visiteur" />}
            title="Enregistrer un visiteur"
            fields={[
              { name: 'nom', label: 'Nom complet', required: true },
              { name: 'motif', label: 'Motif de la visite', required: true },
              { name: 'pieceVerifiee', label: 'Pièce d\'identité vérifiée', type: 'checkbox' },
            ]}
            action={actions.enregistrerVisiteur}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Visiteurs présents" value={visiteursPresents} icon={UserCheck} color="emerald" />
        <StatCard title="Total visiteurs" value={visiteurs.length} icon={Shield} color="blue" />
        <StatCard title="Autorisations actives" value={autorisations.filter((a: any) => a.active).length} icon={UserCheck} color="purple" />
        <StatCard title="Sorties exceptionnelles" value={sortiesExceptionnelles} sub="validation double requise" icon={AlertTriangle} color="rose" />
      </div>

      {directionOuPlus && <SectionSauvegardes portal={portal} />}

      <SectionMonCompte />

      <SectionBlock title="Registre des visiteurs" description="Entrées et sorties tracées à l'accueil">
        {retourVisiteurs.Message}
        <DataTable
          columns={[
            { key: 'nom', label: 'Nom' },
            { key: 'motifVisite', label: 'Motif' },
            { key: 'badgeNumero', label: 'Badge' },
            { key: 'pieceIdentiteVerifiee', label: 'PI vérifiée', render: (v) => v.pieceIdentiteVerifiee ? <span className="text-emerald-600 text-xs">✓</span> : <span className="text-rose-600 text-xs">✗</span> },
            { key: 'dateHeureEntree', label: 'Entrée', render: (v) => formatDateTime(v.dateHeureEntree) },
            { key: 'dateHeureSortie', label: 'Sortie', render: (v) => v.dateHeureSortie ? formatDateTime(v.dateHeureSortie) : <span className="text-emerald-600 text-xs">Présent</span> },
            {
              key: 'actions', label: 'Action', render: (v) => !v.dateHeureSortie ? (
                <Button size="sm" variant="outline" disabled={retourVisiteurs.pending} onClick={() => retourVisiteurs.run(() => actions.sortieVisiteur(v.id), 'Sortie enregistrée')}>
                  Sortie
                </Button>
              ) : null,
            },
          ]}
          rows={visiteurs}
          emptyLabel="Aucun visiteur enregistré"
        />
      </SectionBlock>


      <SectionBlock
        title="Autorisations de sortie"
        description="Personnes autorisées à récupérer les élèves"
        action={
          <ModalForm
            trigger={<CreateButton label="Ajouter une autorisation" />}
            title="Créer une autorisation de sortie"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'nomPersonneAutorisee', label: 'Nom de la personne autorisée', required: true },
              { name: 'lienAvecEleve', label: 'Lien avec l\'élève', type: 'select', options: [
                { value: 'pere', label: 'Père' },
                { value: 'mere', label: 'Mère' },
                { value: 'tuteur_legal', label: 'Tuteur légal' },
                { value: 'oncle', label: 'Oncle' },
                { value: 'tante', label: 'Tante' },
                { value: 'grand_parent', label: 'Grand-parent' },
                { value: 'autre', label: 'Autre' },
              ] },
              { name: 'telephone', label: 'Téléphone', placeholder: '+229 90 00 00 00' },
            ]}
            action={actions.creerAutorisationSortie}
          />
        }
      >
        {retourAutorisations.Message}
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (a) => { const e = eleves.find((x: any) => x.id === a.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'nomPersonneAutorisee', label: 'Personne autorisée' },
            { key: 'lienAvecEleve', label: 'Lien' },
            { key: 'telephone', label: 'Téléphone' },
            { key: 'active', label: 'Statut', render: (a) => a.active ? <StatusBadge statut="actif" /> : <StatusBadge statut="resilie" /> },
            {
              key: 'actions', label: 'Action', render: (a) => a.active ? (
                <Button size="sm" variant="outline" disabled={retourAutorisations.pending} onClick={() => retourAutorisations.run(() => actions.desactiverAutorisationSortie(a.id), 'Autorisation désactivée')}>
                  Désactiver
                </Button>
              ) : null,
            },
          ]}
          rows={autorisations}
          emptyLabel="Aucune autorisation de sortie"
        />
      </SectionBlock>

      <SectionBlock
        title="Sorties anticipées"
        description="Toute sortie non pré-autorisée déclenche une double validation + notification immédiate aux parents"
        action={
          <ModalForm
            trigger={<CreateButton label="Enregistrer une sortie" />}
            title="Enregistrer une sortie anticipée"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'autorisationId', label: 'Autorisation pré-existante (optionnel)', type: 'select', options: autorisations.filter((a: any) => a.active).map((a: any) => ({ value: a.id, label: a.nomPersonneAutorisee })) },
              { name: 'recupereParNom', label: 'Récupéré par (nom)', required: true },
              { name: 'date', label: 'Date', type: 'date', required: true },
              { name: 'heure', label: 'Heure', required: true, placeholder: '15:30' },
              { name: 'validationExceptionnelle', label: 'Validation exceptionnelle direction (sans autorisation parentale)', type: 'checkbox' },
              { name: 'motifException', label: 'Motif de la validation exceptionnelle', type: 'textarea', placeholder: 'Obligatoire si validation exceptionnelle' },
            ]}
            action={actions.sortieEleve}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (s) => { const e = eleves.find((x: any) => x.id === s.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'recupereParNom', label: 'Récupéré par' },
            { key: 'date', label: 'Date', render: (s) => formatDate(s.date) },
            { key: 'heure', label: 'Heure' },
            { key: 'validationExceptionnelle', label: 'Type', render: (s) => s.validationExceptionnelle ? <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">Exceptionnelle</Badge> : <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Pré-autorisée</Badge> },
            { key: 'parentsNotifies', label: 'Parents notifiés', render: (s) => s.parentsNotifies ? <span className="text-emerald-600 text-xs">✓</span> : '—' },
          ]}
          rows={sorties}
          emptyLabel="Aucune sortie anticipée enregistrée"
        />
      </SectionBlock>


      <SectionBlock
        title="Sessions & journal des connexions"
        description="Sessions actives (8 h max, cookie HttpOnly) et tentatives de connexion (succès et échecs) — révocation immédiate possible"
      >
        {retourSessions.Message}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-2">Sessions actives</h4>
            <DataTable
              columns={[
                { key: 'utilisateur', label: 'Utilisateur', render: (s) => { const u = utilisateurs.find((x: any) => x.id === s.utilisateurId); return u ? `${u.prenom} ${u.nom}` : s.utilisateurId.slice(0, 8) + '…'; } },
                { key: 'adresseIp', label: 'IP', render: (s) => s.adresseIp ? <span className="font-mono text-xs">{s.adresseIp}</span> : '—' },
                { key: 'dateCreation', label: 'Ouverte', render: (s) => formatDateTime(s.dateCreation) },
                { key: 'dateDerniereActivite', label: 'Dernière activité', render: (s) => s.dateDerniereActivite ? formatDateTime(s.dateDerniereActivite) : '—' },
                { key: 'dateExpiration', label: 'Expire', render: (s) => formatDateTime(s.dateExpiration) },
                { key: 'active', label: 'État', render: (s) => s.active && new Date(s.dateExpiration) > new Date() ? <StatusBadge statut="actif" /> : <StatusBadge statut="expire" /> },
                {
                  key: 'actions', label: 'Action', render: (s) => (s.active && new Date(s.dateExpiration) > new Date()) ? (
                    <Button
                      size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      disabled={retourSessions.pending}
                      onClick={() => retourSessions.run(() => ext.revoquerSession(s.id), 'Session révoquée')}
                    >
                      Révoquer
                    </Button>
                  ) : null,
                },
              ]}
              rows={sessions.filter((s: any) => s.active)}
              emptyLabel="Aucune session active"
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Dernières tentatives de connexion</h4>
            <DataTable
              columns={[
                { key: 'email', label: 'Email' },
                { key: 'succes', label: 'Résultat', render: (t) => t.succes ? <StatusBadge statut="payee" label="Succès" /> : <StatusBadge statut="impayee" label="Échec" /> },
                { key: 'motifEchec', label: 'Motif', render: (t) => t.motifEchec ?? '—' },
                { key: 'date', label: 'Quand', render: (t) => formatDateTime(t.date) },
              ]}
              rows={tentativesConnexion.slice(0, 15)}
              emptyLabel="Aucune tentative enregistrée"
            />
          </div>
        </div>
      </SectionBlock>

      <Section2FA />

      {directionOuPlus && utilisateurs.length > 0 && <SectionUtilisateurs utilisateurs={utilisateurs} />}

      {directionOuPlus && <SectionRgpd demandes={demandesEffacement} />}

      {directionOuPlus && (
        <SectionMultiEcoles portal={portal} ecoles={ecoles} utilisateurs={utilisateurs} ecoleActiveId={initialData?.ecole?.id} />
      )}

      <SectionBlock
        title="Habilitations & rôles (RBAC)"
        description="Matrice des permissions par rôle et utilisateurs habilités"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Permission</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Module</th>
                {roles.map((r: any) => (
                  <th key={r.id} className="py-2 px-3 font-medium text-gray-700 text-center">{r.libelle}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{p.libelle}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{p.code}</div>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{p.module}</td>
                  {roles.map((r: any) => {
                    const has = rolePermissions.some((rp: any) => rp.roleId === r.id && rp.permissionId === p.id);
                    return (
                      <td key={r.id} className="py-2 px-3 text-center">
                        {has ? <span className="text-emerald-600">✓</span> : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Utilisateurs par rôle</h4>
          <div className="flex flex-wrap gap-2">
            {utilisateurRoles.map((ur: any) => {
              const u = utilisateurs.find((x: any) => x.id === ur.utilisateurId);
              const r = roles.find((x: any) => x.id === ur.roleId);
              if (!u || !r) return null;
              return (
                <Badge key={`${ur.utilisateurId}-${ur.roleId}`} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  <KeyRound className="h-3 w-3 mr-1" />{u.prenom} {u.nom} — {r.libelle}
                </Badge>
              );
            })}
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}

// --------------------------------------------------------------------
// F10 — Double authentification (TOTP) : initiation, confirmation et
// désactivation. Les codes de secours ne sont JAMAIS affichés ici :
// le serveur ne stocke que leur hash.
// --------------------------------------------------------------------
function Section2FA() {
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function lancer(fn: () => Promise<any>, succes: (r: any) => string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await fn();
        if (r && r.ok === false) {
          setMessage(`✗ ${r.error ?? 'Opération refusée.'}`);
          return;
        }
        setMessage(succes(r));
      } catch {
        setMessage('✗ Une erreur est survenue. Réessayez.');
      }
    });
  }

  return (
    <SectionBlock
      title="Double authentification (2FA)"
      description="Application d'authentification TOTP (à 6 chiffres, renouvelée toutes les 30 s) exigée à la connexion en plus du mot de passe"
    >
      {message && (
        <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm" role="status">{message}</div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activation */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-600" /> Activer la 2FA
          </h4>
          <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
            <li>Générez un secret puis ajoutez-le dans votre application d&apos;authentification.</li>
            <li>Saisissez le code à 6 chiffres généré, puis confirmez l&apos;activation.</li>
          </ol>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => lancer(
              () => actions.initier2FA(),
              (r) => { setSecret(r?.secret ?? null); return '✓ Secret généré — ajoutez-le dans votre application d\'authentification.'; },
            )}
          >
            <KeyRound className="h-3 w-3 mr-1" />Générer un secret
          </Button>
          {secret && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Secret (base32)</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono break-all select-all">{secret}</code>
                <Button type="button" size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(secret); }}>
                  Copier
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700" htmlFor="code-2fa">Code à 6 chiffres</Label>
            <Input
              id="code-2fa"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-32 font-mono tracking-widest"
            />
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={pending || code.length !== 6}
            onClick={() => lancer(() => actions.confirmer2FA(code), () => { setSecret(null); setCode(''); return '✓ 2FA activée. Codes de secours générés — consultables lors de l\'activation, stockés de façon chiffrée côté serveur.'; })}
          >
            Activer
          </Button>
        </div>
        {/* Désactivation */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <LogOut className="h-4 w-4 text-rose-600" /> Désactiver la 2FA
          </h4>
          <p className="text-xs text-gray-600">
            La désactivation requiert la confirmation de votre mot de passe. Le compte redevient protégé par le seul mot de passe.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700" htmlFor="mdp-2fa">Mot de passe du compte</Label>
            <Input
              id="mdp-2fa"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full max-w-xs"
              autoComplete="current-password"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !motDePasse}
            onClick={() => lancer(() => actions.desactiver2FAAction(motDePasse), () => { setMotDePasse(''); setSecret(null); return '✓ 2FA désactivée pour ce compte.'; })}
          >
            Désactiver
          </Button>
        </div>
      </div>
    </SectionBlock>
  );
}
