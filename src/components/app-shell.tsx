'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// ====================================================================
// CODE SPLITTING — Chargement à la demande (lazy loading)
// Les modules sont téléchargés UNIQUEMENT quand l'utilisateur y accède.
// Le bundle initial passe de plusieurs Mo à quelques Ko → TTI mobile x3.
// ====================================================================
const SaasModule = dynamic(() => import('./modules/saas'), { ssr: false });
const DirectionModule = dynamic(() => import('./modules/direction'), { ssr: false });
const ElevesModule = dynamic(() => import('./modules/eleves'), { ssr: false });
const PersonnelModule = dynamic(() => import('./modules/personnel'), { ssr: false });
const PedagogiqueModule = dynamic(() => import('./modules/pedagogique'), { ssr: false });
const ConseilsModule = dynamic(() => import('./modules/conseils'), { ssr: false });
const PresencesModule = dynamic(() => import('./modules/presences'), { ssr: false });
const VieScolaireModule = dynamic(() => import('./modules/vie-scolaire'), { ssr: false });
const FinancesModule = dynamic(() => import('./modules/finances'), { ssr: false });
const ServicesModule = dynamic(() => import('./modules/services'), { ssr: false });
const SallesModule = dynamic(() => import('./modules/salles'), { ssr: false });
const ExamensModule = dynamic(() => import('./modules/examens'), { ssr: false });
const RdvModule = dynamic(() => import('./modules/rdv'), { ssr: false });
const SecuriteModule = dynamic(() => import('./modules/securite'), { ssr: false });
const CommunicationModule = dynamic(() => import('./modules/communication'), { ssr: false });
const IntegrationsModule = dynamic(() => import('./modules/integrations'), { ssr: false });
const AuditModule = dynamic(() => import('./modules/audit'), { ssr: false });
const ParentPortalModule = dynamic(() => import('./modules/parent-portal'), { ssr: false });
const ElevePortalModule = dynamic(() => import('./modules/eleve-portal'), { ssr: false });
const V4ModulesModule = dynamic(() => import('./modules/v4-modules'), { ssr: false });
const SanteModule = dynamic(() => import('./modules/sante'), { ssr: false });
const AdmissionsModule = dynamic(() => import('./modules/admissions'), { ssr: false });
const ProtectionModule = dynamic(() => import('./modules/protection'), { ssr: false });
const PortailMetiers = dynamic(() => import('./modules/portail-metiers'), { ssr: false });

// ====================================================================
// Shell applicatif principal — navigation entre modules.
// Portail dérivé du COMPTE CONNECTÉ (session) : chaque métier de
// l'école (direction, comptable, RH, censeur, surveillant,
// secrétariat, infirmier, enseignant, parent, élève) voit SES
// modules uniquement. Déconnexion réelle. Recherche globale.
// Temps réel : /api/pulse sondé toutes les 15 s → rafraîchissement
// automatique dès qu'une donnée change (paiement, absence…).
// D1 : SSE /api/flux — le serveur POUSSE les changements, le polling
// 15 s reste en repli. D4 : PWA (manifest + service worker). D5 :
// sélecteur multi-écoles. C2 : notifications non lues marquables lues.
// ====================================================================

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, Users, GraduationCap, ClipboardList, CalendarDays,
  BookOpen, Bus, BookMarked, Calendar, FileCheck, MessageSquare, Shield,
  ScrollText, Wallet, School, ChevronDown, Bell, Menu, X,
  CheckCircle2, HeartPulse, LogOut, Search, Activity, Gavel, Plug, CheckCheck,
  UserPlus, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import * as ext from '@/app/actions/extensions';

export type Portal =
  | 'super_admin' | 'direction' | 'enseignant' | 'parent' | 'eleve'
  | 'comptabilite' | 'rh' | 'vie_scolaire' | 'secretariat' | 'sante' | 'assistant';

export type ModuleId =
  | 'dashboard' | 'saas' | 'eleves' | 'personnel' | 'pedagogique' | 'presences'
  | 'vie_scolaire' | 'finances' | 'services' | 'salles' | 'examens'
  | 'rdv' | 'securite' | 'communication' | 'integrations' | 'audit' | 'sante' | 'parent_portal' | 'eleve_portal' | 'v4_modules' | 'conseils'
  | 'admissions' | 'protection';

type ModuleDef = {
  id: ModuleId;
  label: string;
  icon: any;
  portals: Portal[];
};

const MODULES: ModuleDef[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, portals: ['super_admin', 'direction', 'enseignant', 'parent', 'eleve', 'comptabilite', 'rh', 'vie_scolaire', 'secretariat', 'sante', 'assistant'] },
  { id: 'saas', label: 'Couche SaaS', icon: Building2, portals: ['super_admin'] },
  { id: 'eleves', label: 'Élèves', icon: Users, portals: ['super_admin', 'direction', 'enseignant', 'secretariat', 'assistant'] },
  { id: 'personnel', label: 'Personnel', icon: GraduationCap, portals: ['super_admin', 'direction', 'rh'] },
  { id: 'pedagogique', label: 'Pédagogique', icon: BookOpen, portals: ['super_admin', 'direction', 'enseignant'] },
  { id: 'conseils', label: 'Conseils de classe', icon: Gavel, portals: ['direction', 'super_admin'] },
  { id: 'presences', label: 'Présences', icon: ClipboardList, portals: ['super_admin', 'direction', 'enseignant', 'vie_scolaire', 'assistant'] },
  { id: 'vie_scolaire', label: 'Vie scolaire', icon: Shield, portals: ['super_admin', 'direction', 'enseignant', 'vie_scolaire', 'assistant'] },
  { id: 'finances', label: 'Finances', icon: Wallet, portals: ['super_admin', 'direction', 'comptabilite'] },
  { id: 'services', label: 'Services', icon: Bus, portals: ['super_admin', 'direction'] },
  { id: 'sante', label: 'Santé & Infirmerie', icon: HeartPulse, portals: ['super_admin', 'direction', 'sante'] },
  { id: 'salles', label: 'Salles & Calendrier', icon: School, portals: ['super_admin', 'direction', 'vie_scolaire'] },
  { id: 'examens', label: 'Examens officiels', icon: FileCheck, portals: ['super_admin', 'direction', 'vie_scolaire'] },
  { id: 'rdv', label: 'RDV parents-profs', icon: CalendarDays, portals: ['super_admin', 'direction', 'enseignant', 'parent', 'secretariat'] },
  { id: 'admissions', label: 'Admissions', icon: UserPlus, portals: ['direction', 'secretariat', 'super_admin'] },
  { id: 'protection', label: 'Protection enfance', icon: ShieldAlert, portals: ['direction', 'super_admin'] },
  { id: 'securite', label: 'Sécurité site', icon: Shield, portals: ['super_admin', 'direction', 'vie_scolaire'] },
  { id: 'communication', label: 'Communication', icon: MessageSquare, portals: ['super_admin', 'direction', 'comptabilite', 'rh', 'secretariat', 'assistant'] },
  { id: 'integrations', label: 'Intégrations', icon: Plug, portals: ['direction', 'super_admin'] },
  { id: 'audit', label: "Journal d'audit", icon: ScrollText, portals: ['super_admin', 'direction'] },
  { id: 'v4_modules', label: 'Catalogue complémentaire', icon: CheckCircle2, portals: ['super_admin', 'direction'] },
  { id: 'parent_portal', label: 'Portail Parent', icon: Users, portals: ['parent'] },
  { id: 'eleve_portal', label: 'Portail Élève', icon: GraduationCap, portals: ['eleve'] },
];

const PORTAL_LABELS: Record<Portal, string> = {
  super_admin: 'Super-Admin Éditeur',
  direction: 'Direction',
  enseignant: 'Enseignant',
  parent: 'Parent',
  eleve: 'Élève',
  comptabilite: 'Comptabilité',
  rh: 'Ressources Humaines',
  vie_scolaire: 'Vie Scolaire & Surveillance',
  secretariat: 'Secrétariat',
  sante: 'Infirmerie & Santé',
  assistant: 'Assistant de Direction',
};

// --------------------------------------------------------------------
// Recherche globale — réflexe n°1 du directeur : « tapez un nom ».
// Cherche élèves, parents, personnels, classes, échéances, paiements.
// --------------------------------------------------------------------
function GlobalSearch({ initialData, onNavigate }: { initialData: any; onNavigate: (m: ModuleId) => void }) {
  const [q, setQ] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const boiteRef = useRef<HTMLDivElement>(null);

  const resultats = useMemo(() => {
    const terme = q.trim().toLowerCase();
    if (terme.length < 2) return null;
    const match = (...vals: any[]) => vals.some((v) => v && String(v).toLowerCase().includes(terme));

    const eleves = (initialData.eleves ?? []).filter((e: any) => match(e.prenom, e.nom, e.matricule)).slice(0, 5)
      .map((e: any) => ({ module: 'eleves' as ModuleId, titre: `${e.prenom} ${e.nom}`, detail: `Élève · ${e.matricule ?? '—'}`, id: e.id }));
    const parents = (initialData.parents ?? []).filter((p: any) => match(p.prenom, p.nom, p.email)).slice(0, 3)
      .map((p: any) => ({ module: 'eleves' as ModuleId, titre: `${p.prenom ?? ''} ${p.nom ?? ''}`, detail: `Parent · ${p.email ?? '—'}`, id: p.id }));
    const personnels = (initialData.personnels ?? []).filter((p: any) => match(p.prenom, p.nom, p.matricule, p.email)).slice(0, 5)
      .map((p: any) => ({ module: 'personnel' as ModuleId, titre: `${p.prenom} ${p.nom}`, detail: `Personnel · ${p.matricule ?? '—'}`, id: p.id }));
    const classes = (initialData.classes ?? []).filter((c: any) => match(c.code, c.libelle)).slice(0, 3)
      .map((c: any) => ({ module: 'salles' as ModuleId, titre: c.libelle ?? c.code, detail: `Classe · ${c.code}`, id: c.id }));
    const echeances = (initialData.echeances ?? []).filter((e: any) => {
      const el = (initialData.eleves ?? []).find((x: any) => x.id === e.eleveId);
      return el && match(el.prenom, el.nom) && (e.statut === 'impayee' || e.statut === 'partiel');
    }).slice(0, 3)
      .map((e: any) => {
        const el = (initialData.eleves ?? []).find((x: any) => x.id === e.eleveId);
        return { module: 'finances' as ModuleId, titre: `${el.prenom} ${el.nom}`, detail: `Échéance ${e.statut} · ${e.montant - (e.montantPaye ?? 0)} restant`, id: e.id };
      });
    const paiements = (initialData.paiements ?? []).filter((p: any) => {
      const el = (initialData.eleves ?? []).find((x: any) => x.id === p.eleveId);
      return el && match(el.prenom, el.nom);
    }).slice(0, 3)
      .map((p: any) => {
        const el = (initialData.eleves ?? []).find((x: any) => x.id === p.eleveId);
        return { module: 'finances' as ModuleId, titre: `${el.prenom} ${el.nom}`, detail: `Paiement ${p.montant} ${p.devise ?? ''}`, id: p.id };
      });

    return { eleves, parents, personnels, classes, echeances, paiements, total: eleves.length + parents.length + personnels.length + classes.length + echeances.length + paiements.length };
  }, [q, initialData]);

  // Fermeture au clic extérieur
  useEffect(() => {
    const fermer = (ev: MouseEvent) => {
      if (boiteRef.current && !boiteRef.current.contains(ev.target as Node)) setOuvert(false);
    };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, []);

  return (
    <div ref={boiteRef} className="relative hidden md:block w-72">
      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOuvert(true); }}
        onFocus={() => setOuvert(true)}
        placeholder="Rechercher un élève, un parent, un prof…"
        className="pl-9 h-9 text-sm bg-gray-50"
      />
      {ouvert && resultats && (
        <div className="absolute top-10 left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[70vh] overflow-y-auto">
          {resultats.total === 0 && (
            <p className="p-3 text-sm text-gray-500">Aucun résultat pour « {q} »</p>
          )}
          {resultats.total > 0 && (['eleves', 'parents', 'personnels', 'classes', 'echeances', 'paiements'] as const).map((grp) => {
            const items = (resultats as any)[grp];
            if (!items?.length) return null;
            const titres: Record<string, string> = { eleves: 'Élèves', parents: 'Parents', personnels: 'Personnels', classes: 'Classes', echeances: 'Échéances de scolarité', paiements: 'Paiements' };
            return (
              <div key={grp} className="border-b border-gray-100 last:border-0">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{titres[grp]}</p>
                {items.map((r: any) => (
                  <button
                    key={`${grp}-${r.id}`}
                    onClick={() => { onNavigate(r.module); setOuvert(false); setQ(''); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 truncate">{r.titre}</div>
                      <div className="text-[11px] text-gray-500 truncate">{r.detail}</div>
                    </div>
                    <span className="text-[10px] text-emerald-600 whitespace-nowrap">ouvrir →</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AppShell({ initialData }: { initialData: any }) {
  const router = useRouter();
  // Portail imposé par la SESSION (P0) — plus de bascule de démonstration.
  const portal: Portal = initialData?.session?.portal ?? 'direction';
  const [active, setActive] = useState<ModuleId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingLogout, startLogout] = useTransition();
  const [enDirect, setEnDirect] = useState(false);
  const [tempsReel, setTempsReel] = useState(false); // D1 — SSE connecté
  const [pendingEcole, startEcole] = useTransition(); // D5 — bascule d'école
  const [pendingNotifs, startNotifs] = useTransition(); // C2 — tout marquer lu

  // ---- Temps réel : SSE /api/flux (D1) + polling /api/pulse en repli ----
  // Le serveur pousse « changement » dès qu'un compteur bouge →
  // router.refresh() immédiat. En cas d'erreur SSE (proxy, coupure),
  // on ferme le flux et on se rabat sur le sondage 15 s existant,
  // avec une nouvelle tentative d'abonnement 30 s plus tard.
  useEffect(() => {
    let dernier: number | null = null;
    let vivant = true;
    let flux: EventSource | null = null;
    let reprise: ReturnType<typeof setTimeout> | null = null;

    const sonder = async () => {
      try {
        const r = await fetch('/api/pulse', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!vivant) return;
        if (j.auth === false) { router.replace('/login'); return; }
        if (dernier != null && j.v !== dernier) router.refresh();
        dernier = j.v;
        setEnDirect(true);
      } catch {
        if (vivant) setEnDirect(false);
      }
    };

    const abonnerFlux = () => {
      if (!vivant || typeof EventSource === 'undefined') return;
      flux = new EventSource('/api/flux');
      flux.addEventListener('init', () => { if (vivant) setTempsReel(true); });
      flux.addEventListener('ping', () => { if (vivant) setTempsReel(true); });
      flux.addEventListener('changement', () => {
        if (!vivant) return;
        setTempsReel(true);
        router.refresh();
      });
      flux.onerror = () => {
        if (!vivant) return;
        setTempsReel(false);
        flux?.close();
        flux = null;
        // Repli : le polling 15 s reste actif ; on retente le SSE après 30 s.
        reprise = setTimeout(abonnerFlux, 30_000);
      };
    };
    abonnerFlux();

    void sonder();
    const id = setInterval(sonder, 15_000);
    return () => {
      vivant = false;
      clearInterval(id);
      if (reprise) clearTimeout(reprise);
      flux?.close();
    };
  }, [router]);

  // ---- D4 — PWA : enregistrement du service worker (best effort) ----
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => { /* hors ligne/unsupported : silencieux */ });
  }, []);

  // ---- D5 — Multi-écoles : liste des établissements accessibles ----
  const [ecolesAccessibles, setEcolesAccessibles] = useState<{ id: string; nom: string; slug: string; devise?: string }[] | null>(null);
  useEffect(() => {
    let vivant = true;
    ext.ecolesAccessibles()
      .then((r) => { if (vivant && r && r.ok !== false) setEcolesAccessibles(((r as any).ecoles ?? []) as any); })
      .catch(() => { /* périmètre mono-école : silencieux */ });
    return () => { vivant = false; };
  }, []);

  // Options du sélecteur : la liste renvoyée par le serveur fait foi
  // (la bascule y est vérifiée) ; repli sur initialData.ecoles.
  const optionsEcoles = ecolesAccessibles ?? (initialData.ecoles ?? []);
  const plusieursEcoles = (initialData.ecoles?.length ?? 0) > 1 || optionsEcoles.length > 1;

  function changerEcoleActive(ecoleId: string) {
    startEcole(async () => {
      const r = await ext.changerEcoleActive(ecoleId);
      if (r && r.ok === false) return;
      router.refresh();
    });
  }

  const visibleModules = useMemo(() => MODULES.filter((m) => m.portals.includes(portal)), [portal]);

  const school = initialData.ecole;
  const notifications = initialData.notifications ?? [];
  const nonLues = notifications.filter((n: any) => !n.dateLecture).length; // C2
  const sessionUser = initialData.session?.utilisateur;
  const initiales = sessionUser
    ? `${sessionUser.prenom?.[0] ?? ''}${sessionUser.nom?.[0] ?? ''}`.toUpperCase()
    : 'SG';

  const renderModule = () => {
    const props = { initialData };
    switch (active) {
      case 'dashboard':
        if (portal === 'super_admin') return <SaasModule {...props} mode="dashboard" />;
        if (portal === 'parent') return <ParentPortalModule {...props} mode="dashboard" />;
        if (portal === 'eleve') return <ElevePortalModule {...props} mode="dashboard" />;
        // Portails métiers dédiés (comptable, RH, vie scolaire, secrétariat, santé, assistant)
        if (['comptabilite', 'rh', 'vie_scolaire', 'secretariat', 'sante', 'assistant'].includes(portal)) {
          return <PortailMetiers {...props} portal={portal as 'comptabilite' | 'rh' | 'vie_scolaire' | 'secretariat' | 'sante' | 'assistant'} />;
        }
        return <DirectionModule {...props} mode="dashboard" portalLabel={portal === 'enseignant' ? 'Enseignant' : 'Direction'} />;
      case 'saas': return <SaasModule {...props} mode="full" />;
      case 'eleves': return <ElevesModule {...props} />;
      case 'personnel': return <PersonnelModule {...props} />;
      case 'pedagogique': return <PedagogiqueModule {...props} />;
      case 'conseils': return <ConseilsModule {...props} />;
      case 'presences': return <PresencesModule {...props} />;
      case 'vie_scolaire': return <VieScolaireModule {...props} />;
      case 'finances': return <FinancesModule {...props} />;
      case 'services': return <ServicesModule {...props} />;
      case 'sante': return <SanteModule {...props} />;
      case 'salles': return <SallesModule {...props} />;
      case 'examens': return <ExamensModule {...props} />;
      case 'rdv': return <RdvModule {...props} />;
      case 'admissions': return <AdmissionsModule {...props} />;
      case 'protection': return <ProtectionModule {...props} />;
      case 'securite': return <SecuriteModule {...props} />;
      case 'communication': return <CommunicationModule {...props} />;
      case 'integrations': return <IntegrationsModule {...props} />;
      case 'audit': return <AuditModule {...props} />;
      case 'v4_modules': return <V4ModulesModule {...props} />;
      case 'parent_portal': return <ParentPortalModule {...props} mode="full" />;
      case 'eleve_portal': return <ElevePortalModule {...props} mode="full" />;
      default: return null;
    }
  };

  function deconnexion() {
    startLogout(async () => {
      const { deconnexion: seDeconnecter } = await import('@/app/actions');
      await seDeconnecter();
      router.replace('/login');
      router.refresh();
    });
  }

  // C2 — marquer toutes les notifications du compte comme lues
  function toutMarquerLu() {
    startNotifs(async () => {
      const r = await ext.marquerNotificationsLues();
      if (r && r.ok === false) return;
      router.refresh();
    });
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform`}>
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200">
          <div className="h-8 w-8 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            SG
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold leading-tight">ScolaGestion</div>
            <div className="text-xs text-gray-500">{PORTAL_LABELS[portal]}</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {visibleModules.map((m) => {
            const Icon = m.icon;
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { setActive(m.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-700 font-medium border-r-2 border-emerald-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">École courante</div>
          <div className="text-sm font-medium truncate">{school?.nom ?? '—'}</div>
          <div className="text-xs text-gray-500 truncate">{school?.slug}.platforme.com</div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu className="h-5 w-5" />
          </button>

          {/* Recherche globale : masquée pour les portails élève/parent, dont le
              périmètre est déjà réduit (listes globales vides par conception). */}
          {portal !== 'eleve' && portal !== 'parent' && (
            <GlobalSearch initialData={initialData} onNavigate={(m) => setActive(m)} />
          )}

          <div className="flex-1 text-sm text-gray-600 min-w-0 truncate">
            <span className="text-gray-400">{PORTAL_LABELS[portal]}</span>
            <span className="mx-2 text-gray-300">/</span>
            <span className="font-medium text-gray-900">{MODULES.find((m) => m.id === active)?.label}</span>
          </div>

          {/* D5 — Sélecteur multi-écoles (affiché si plusieurs établissements accessibles) */}
          {plusieursEcoles && optionsEcoles.length > 0 && (
            <select
              value={school?.id ?? ''}
              onChange={(e) => changerEcoleActive(e.target.value)}
              disabled={pendingEcole}
              title="Changer l'école active de la session"
              className="hidden md:block h-8 max-w-[180px] truncate rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {optionsEcoles.map((e: any) => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          )}

          {/* Indicateur temps réel — D1 : badge « Temps réel » quand le SSE est connecté */}
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              tempsReel ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : enDirect ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
            title={tempsReel ? 'Connecté au flux SSE — les changements sont poussés par le serveur' : enDirect ? 'Sondage périodique (15 s) — flux SSE indisponible' : 'Flux temps réel indisponible'}
          >
            <Activity className={`h-3 w-3 ${tempsReel || enDirect ? 'animate-pulse' : ''}`} />
            {tempsReel ? 'Temps réel' : enDirect ? 'En direct' : 'Hors ligne'}
          </span>

          {/* Notifications du compte connecté — C2 : badge = non lues */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {nonLues > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                    {nonLues}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications ({nonLues} non lue{nonLues > 1 ? 's' : ''} sur {notifications.length})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.slice(0, 5).map((n: any) => (
                <DropdownMenuItem key={n.id} className="flex-col items-start py-2">
                  <div className="flex items-center gap-1.5 w-full">
                    {!n.dateLecture && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" aria-label="non lue" />}
                    <div className="text-sm font-medium">{n.sujet}</div>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">{n.corps}</div>
                </DropdownMenuItem>
              ))}
              {notifications.length === 0 && (
                <DropdownMenuItem className="text-gray-500 text-sm">Aucune notification</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={toutMarquerLu}
                disabled={pendingNotifs || nonLues === 0}
                className="text-emerald-700 focus:text-emerald-700 text-sm"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {pendingNotifs ? 'Marquage…' : 'Tout marquer comme lu'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Compte connecté (session) + déconnexion */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{initiales}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline max-w-[140px] truncate">{sessionUser ? `${sessionUser.prenom} ${sessionUser.nom}` : PORTAL_LABELS[portal]}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="text-sm font-medium">{sessionUser ? `${sessionUser.prenom} ${sessionUser.nom}` : '—'}</div>
                <div className="text-xs text-gray-500 font-normal">{sessionUser?.email}</div>
                <div className="mt-1"><Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">{PORTAL_LABELS[portal]}</Badge></div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={deconnexion} disabled={pendingLogout} className="text-rose-600 focus:text-rose-600">
                <LogOut className="h-4 w-4 mr-2" />
                {pendingLogout ? 'Déconnexion…' : 'Se déconnecter'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto">
          {renderModule()}
        </main>

        <footer className="bg-white border-t border-gray-200 py-2 px-4 text-xs text-gray-500 flex items-center justify-between">
          <span>ScolaGestion — Plateforme SaaS de Gestion Scolaire · Version 4 (cahier des charges complet)</span>
          <span>Session authentifiée · École : {school?.nom ?? '—'}</span>
        </footer>
      </div>
    </div>
  );
}
