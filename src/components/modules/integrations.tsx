'use client';

// ====================================================================
// Module Intégrations (direction / super_admin) — B12 :
//  - Webhooks sortants (secret HMAC affiché UNE fois à la création)
//  - Jetons API (token complet affiché UNE fois, révocation)
//  - Thème & white-label (aperçu en direct des couleurs)
//  - Domaines personnalisés (vérification DNS CNAME)
//  - Feature flags par école
// ====================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Webhook, KeyRound, Palette, Globe, ToggleRight, AlertTriangle, Terminal } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock, useActionFeedback } from '@/components/shared-ui';
import * as ext from '@/app/actions/extensions';
import { formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/** Parse un champ events/scopes JSON stocké en texte. */
function parseJsonListe(v: unknown): string[] {
  try {
    const p = JSON.parse(String(v ?? '[]'));
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

/** Boîte « affiché UNE seule fois » — secret de webhook, token API… */
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
          <Button type="button" size="sm" onClick={onFermer}>J&apos;ai copié, fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------------
// B12 — Webhooks sortants.
// --------------------------------------------------------------------
function SectionWebhooks({ webhooks }: { webhooks: any[] }) {
  const retour = useActionFeedback();
  const [secret, setSecret] = useState<string | null>(null);

  return (
    <SectionBlock
      title="Webhooks sortants"
      description="Notifications HTTP signées HMAC-SHA256 (en-tête X-ScolaGestion-Signature) vers vos systèmes externes"
      action={
        <ModalForm
          trigger={<CreateButton label="Créer un webhook" />}
          title="Créer un webhook"
          fields={[
            { name: 'url', label: 'URL de réception (https://…)', required: true, placeholder: 'https://exemple.com/hooks/scolagestion' },
            { name: 'events', label: 'Événements (séparés par des virgules)', required: true, defaultValue: 'eleve.inscription,paiement.encaissement', placeholder: 'eleve.inscription,paiement.encaissement' },
          ]}
          action={(fd) => ext.creerWebhook(fd).then((r) => {
            if (r && r.ok !== false && r.secret) setSecret(String(r.secret));
            return r;
          })}
        />
      }
    >
      {retour.Message}
      <DataTable
        columns={[
          { key: 'url', label: 'URL', render: (w) => <span className="font-mono text-xs break-all">{w.url}</span> },
          { key: 'events', label: 'Événements', render: (w) => parseJsonListe(w.events).map((e) => <Badge key={e} variant="outline" className="text-[10px] mr-1">{e}</Badge>) },
          { key: 'dernierEnvoi', label: 'Dernier envoi', render: (w) => w.dernierEnvoi ? formatDateTime(w.dernierEnvoi) : 'Jamais' },
          {
            key: 'livraisons', label: 'Livraisons', render: (w) => {
              const livraisons: any[] = w.livraisons ?? null;
              if (!livraisons) return <span className="text-xs text-gray-400">—</span>;
              const ok = livraisons.filter((l) => l.statut === 'livre').length;
              const ko = livraisons.filter((l) => l.statut === 'echec').length;
              return <span className="text-xs"><span className="text-emerald-600">{ok} ok</span> · <span className="text-rose-600">{ko} échec(s)</span></span>;
            },
          },
          { key: 'actif', label: 'État', render: (w) => w.actif ? <StatusBadge statut="actif" /> : <StatusBadge statut="resilie" /> },
          {
            key: 'actions', label: 'Action', render: (w) => (
              <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" disabled={retour.pending} onClick={() => retour.run(() => ext.supprimerWebhook(w.id), 'Webhook supprimé')}>
                Supprimer
              </Button>
            ),
          },
        ]}
        rows={webhooks}
        emptyLabel="Aucun webhook configuré"
      />
      <DialogAffichageUnique
        valeur={secret}
        titre="Secret du webhook"
        description="Sert à vérifier la signature HMAC-SHA256 des requêtes reçues sur votre endpoint."
        onFermer={() => setSecret(null)}
      />
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// B12 — Jetons API (scopes, expiration, révocation).
// --------------------------------------------------------------------
function SectionApiTokens({ apiTokens }: { apiTokens: any[] }) {
  const retour = useActionFeedback();
  const [token, setToken] = useState<string | null>(null);

  return (
    <SectionBlock
      title="API & jetons d'accès"
      description="API REST v1 authentifiée par jetons — testez : GET /api/v1/eleves avec l'en-tête Authorization: Bearer <token>"
      action={
        <ModalForm
          trigger={<CreateButton label="Créer un jeton" />}
          title="Créer un jeton API"
          fields={[
            { name: 'nom', label: 'Nom du jeton', required: true, placeholder: 'Intégration SI' },
            { name: 'description', label: 'Description (optionnel)' },
            { name: 'scopes', label: 'Scopes (séparés par des virgules)', defaultValue: 'eleves:read', placeholder: 'eleves:read,paiements:read' },
            { name: 'joursValidite', label: 'Validité en jours (optionnel)', type: 'number', placeholder: '90' },
          ]}
          action={(fd) => ext.creerApiToken(fd).then((r) => {
            if (r && r.ok !== false && r.token) setToken(String(r.token));
            return r;
          })}
        />
      }
    >
      {retour.Message}
      <DataTable
        columns={[
          { key: 'nom', label: 'Nom', render: (t) => <span className="font-medium">{t.nom}</span> },
          { key: 'prefix', label: 'Préfixe', render: (t) => <code className="font-mono text-xs">{t.prefix}…</code> },
          { key: 'scopes', label: 'Scopes', render: (t) => parseJsonListe(t.scopes).join(', ') || '—' },
          { key: 'dateCreation', label: 'Créé le', render: (t) => formatDateTime(t.dateCreation) },
          { key: 'dateExpiration', label: 'Expire le', render: (t) => t.dateExpiration ? formatDateTime(t.dateExpiration) : 'Jamais' },
          { key: 'actif', label: 'État', render: (t) => t.actif ? <StatusBadge statut="actif" /> : <StatusBadge statut="resilie" label="Révoqué" /> },
          {
            key: 'actions', label: 'Action', render: (t) => t.actif ? (
              <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" disabled={retour.pending} onClick={() => retour.run(() => ext.revoquerApiToken(t.id), 'Jeton révoqué')}>
                Révoquer
              </Button>
            ) : null,
          },
        ]}
        rows={apiTokens}
        emptyLabel="Aucun jeton API"
      />
      <div className="mt-3 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <Terminal className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>Endpoint public : <code className="font-mono bg-white rounded border px-1">GET /api/v1/eleves</code> avec l&apos;en-tête <code className="font-mono bg-white rounded border px-1">Authorization: Bearer &lt;token&gt;</code> — limité aux scopes du jeton.</span>
      </div>
      <DialogAffichageUnique
        valeur={token}
        titre="Jeton API (token complet)"
        description="Unique occurrence du token : côté serveur, seul son hash SHA-256 est conservé."
        onFermer={() => setToken(null)}
      />
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// B12 — Thème & white-label : 4 couleurs + nom produit, aperçu direct.
// --------------------------------------------------------------------
function SectionTheme() {
  const [couleurs, setCouleurs] = useState({ primaire: '#059669', secondaire: '#0ea5e9', accent: '#f59e0b', fond: '#f9fafb' });
  const [nomProduit, setNomProduit] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Aperçu en direct : la variable CSS pilote la palette de l'application.
  function apercevoir(cle: keyof typeof couleurs, valeur: string) {
    setCouleurs((c) => ({ ...c, [cle]: valeur }));
    const variable: Record<keyof typeof couleurs, string> = {
      primaire: '--couleur-primaire',
      secondaire: '--couleur-secondaire',
      accent: '--couleur-accent',
      fond: '--couleur-fond',
    };
    document.documentElement.style.setProperty(variable[cle], valeur);
  }

  function enregistrer() {
    setMessage(null);
    start(async () => {
      const fd = new FormData();
      fd.set('couleurPrimaire', couleurs.primaire);
      fd.set('couleurSecondaire', couleurs.secondaire);
      fd.set('couleurAccent', couleurs.accent);
      fd.set('couleurFond', couleurs.fond);
      if (nomProduit.trim()) fd.set('nomProduit', nomProduit.trim());
      const r = await ext.majThemeEcole(fd);
      setMessage(r && r.ok === false ? `✗ ${r.error ?? 'Enregistrement refusé.'}` : '✓ Thème enregistré pour cette école.');
    });
  }

  const champs: { cle: keyof typeof couleurs; label: string }[] = [
    { cle: 'primaire', label: 'Couleur primaire' },
    { cle: 'secondaire', label: 'Couleur secondaire' },
    { cle: 'accent', label: 'Couleur d\'accent' },
    { cle: 'fond', label: 'Couleur de fond' },
  ];

  return (
    <SectionBlock
      title="Thème & white-label"
      description="Personnalisation par école : couleurs de la charte et nom du produit — l'aperçu s'applique en direct, l'enregistrement vaut pour toute l'école"
    >
      {message && <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm" role="status">{message}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {champs.map(({ cle, label }) => (
          <div key={cle} className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">{label}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={couleurs[cle]}
                onChange={(e) => apercevoir(cle, e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-gray-200 bg-white p-1"
                aria-label={label}
              />
              <Input value={couleurs[cle]} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && apercevoir(cle, e.target.value)} className="font-mono text-xs" />
            </div>
          </div>
        ))}
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
          <Label className="text-xs font-medium text-gray-700">Nom du produit (white-label, optionnel)</Label>
          <Input value={nomProduit} onChange={(e) => setNomProduit(e.target.value)} placeholder="Ex. : Lycée Vinci — Espace École" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending} onClick={enregistrer}>
          <Palette className="h-4 w-4 mr-1" />{pending ? 'Enregistrement…' : 'Enregistrer le thème'}
        </Button>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          Aperçu :
          <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: couleurs.primaire }} title="Primaire" />
          <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: couleurs.secondaire }} title="Secondaire" />
          <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: couleurs.accent }} title="Accent" />
          <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: couleurs.fond }} title="Fond" />
        </div>
      </div>
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// B12 — Domaines personnalisés (CNAME vers la plateforme + SSL auto).
// --------------------------------------------------------------------
function SectionDomaines({ domaines }: { domaines: any[] }) {
  const router = useRouter();
  const [nouveauDomaine, setNouveauDomaine] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function ajouter() {
    setMessage(null);
    const domaine = nouveauDomaine.trim().toLowerCase();
    if (!domaine) return;
    start(async () => {
      const r = await ext.ajouterDomaine(domaine);
      if (r && r.ok === false) { setMessage(`✗ ${r.error ?? 'Ajout refusé.'}`); return; }
      setNouveauDomaine('');
      router.refresh();
    });
  }

  function verifier(id: string) {
    setMessage(null);
    start(async () => {
      const r = await ext.verifierDomaine(id);
      if (r && r.ok === false) { setMessage(`✗ ${r.error ?? 'Vérification refusée.'}`); return; }
      setMessage(r?.verifie
        ? '✓ Domaine vérifié — le CNAME pointe bien vers la plateforme.'
        : '✗ Vérification échouée : le CNAME attendu n\'a pas été trouvé (dns.google consulté).');
      router.refresh();
    });
  }

  return (
    <SectionBlock
      title="Domaines personnalisés"
      description="Servez l'école sur votre propre nom de domaine : ajoutez un CNAME vers ecoles.scalagestion.app, puis lancez la vérification (certificat SSL émis automatiquement)"
    >
      {message && <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm" role="status">{message}</div>}
      <div className="flex items-end gap-2 mb-4">
        <div className="space-y-1.5 flex-1 max-w-md">
          <Label className="text-xs font-medium text-gray-700">Nouveau domaine</Label>
          <Input value={nouveauDomaine} onChange={(e) => setNouveauDomaine(e.target.value)} placeholder="ecole-exemple.com" disabled={pending} />
        </div>
        <Button size="sm" variant="outline" disabled={pending || !nouveauDomaine.trim()} onClick={ajouter}>
          <Globe className="h-4 w-4 mr-1" />Ajouter
        </Button>
      </div>
      <DataTable
        columns={[
          { key: 'domaine', label: 'Domaine', render: (d) => <span className="font-mono text-sm">{d.domaine}</span> },
          { key: 'verifie', label: 'Vérifié', render: (d) => d.verifie ? <StatusBadge statut="actif" label="Vérifié" /> : <StatusBadge statut="en_attente" label={d.enAttente ? 'En attente' : 'Non vérifié'} /> },
          { key: 'dateAjout', label: 'Ajouté le', render: (d) => formatDateTime(d.dateAjout) },
          { key: 'dateVerification', label: 'Dernière vérification', render: (d) => d.dateVerification ? formatDateTime(d.dateVerification) : '—' },
          {
            key: 'actions', label: 'Action', render: (d) => !d.verifie ? (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => verifier(d.id)}>
                Vérifier
              </Button>
            ) : null,
          },
        ]}
        rows={domaines}
        emptyLabel="Aucun domaine personnalisé"
      />
    </SectionBlock>
  );
}

// --------------------------------------------------------------------
// B12 — Feature flags par école. Le dataset n'est pas exposé par le
// chargeur : on s'appuie sur la liste codée des codes connus.
// --------------------------------------------------------------------
const CODES_FLAGS_CONNUS = ['module_paie'];

function SectionFeatureFlags() {
  const router = useRouter();
  const [etats, setEtats] = useState<Record<string, boolean>>({});
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function basculer(code: string, actif: boolean) {
    setMessage(null);
    setEtats((e) => ({ ...e, [code]: actif }));
    start(async () => {
      const r = await ext.majFeatureFlagEcole(code, actif);
      if (r && r.ok === false) {
        setMessage(`✗ ${r.error ?? 'Modification refusée.'}`);
        setEtats((e) => ({ ...e, [code]: !actif }));
        return;
      }
      router.refresh();
    });
  }

  return (
    <SectionBlock
      title="Feature flags"
      description="Activation sélective des modules pour cette école (rollout progressif)"
    >
      {message && <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm" role="status">{message}</div>}
      <div className="flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800 mb-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>Liste des codes connus de la plateforme ; l&apos;état affiché repart de zéro à chaque chargement (le chargeur de données n&apos;expose pas encore les activations par école).</span>
      </div>
      <div className="space-y-2">
        {CODES_FLAGS_CONNUS.map((code) => (
          <label key={code} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50">
            <span className="flex items-center gap-2 text-sm">
              <ToggleRight className={`h-4 w-4 ${etats[code] ? 'text-emerald-600' : 'text-gray-300'}`} />
              <code className="font-mono text-xs">{code}</code>
              {code === 'module_paie' && <span className="text-xs text-gray-500">— module de paie RH</span>}
            </span>
            <input
              type="checkbox"
              checked={Boolean(etats[code])}
              onChange={(e) => basculer(code, e.target.checked)}
              disabled={pending}
              className="h-4 w-4 accent-emerald-600"
            />
          </label>
        ))}
      </div>
    </SectionBlock>
  );
}

export default function IntegrationsModule({ initialData }: { initialData: any }) {
  const webhooks = initialData.webhooksSortants ?? [];
  const apiTokens = initialData.apiTokens ?? [];
  const domaines = initialData.domainePersonnalises ?? [];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Intégrations"
        subtitle="Webhooks sortants, API & jetons, thème white-label, domaines personnalisés et feature flags"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Webhooks actifs" value={webhooks.filter((w: any) => w.actif).length} icon={Webhook} color="emerald" />
        <StatCard title="Jetons API actifs" value={apiTokens.filter((t: any) => t.actif).length} icon={KeyRound} color="blue" />
        <StatCard title="Domaines vérifiés" value={domaines.filter((d: any) => d.verifie).length} icon={Globe} color="purple" />
        <StatCard title="Flags connus" value={CODES_FLAGS_CONNUS.length} sub="activation par école" icon={ToggleRight} color="amber" />
      </div>

      <SectionWebhooks webhooks={webhooks} />
      <SectionApiTokens apiTokens={apiTokens} />
      <SectionTheme />
      <SectionDomaines domaines={domaines} />
      <SectionFeatureFlags />
    </div>
  );
}
