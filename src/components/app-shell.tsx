'use client';

// ====================================================================
// Shell applicatif principal — navigation entre modules.
// Portail dérivé du COMPTE CONNECTÉ (session) : chaque métier de
// l'école (direction, comptable, RH, censeur, surveillant,
// secrétariat, infirmier, enseignant, parent, élève) voit SES
// modules uniquement. Déconnexion réelle. Recherche globale.
// Temps réel : /api/pulse sondé toutes les 15 s → rafraîchissement
// automatique dès qu'une donnée change (paiement, absence…).
// ====================================================================

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, Users, GraduationCap, ClipboardList, CalendarDays,
  BookOpen, Bus, BookMarked, Calendar, FileCheck, MessageSquare, Shield,
  ScrollText, Wallet, School, ChevronDown, Bell, Menu, X,
  CheckCircle2, HeartPulse, LogOut, Search, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import SaasModule from './modules/saas';
import DirectionModule from './modules/direction';
import ElevesModule from './modules/eleves';
import PersonnelModule from './modules/personnel';
import PedagogiqueModule from './modules/pedagogique';
import PresencesModule from './modules/presences';
import VieScolaireModule from './modules/vie-scolaire';
import FinancesModule from './modules/finances';
import ServicesModule from './modules/services';
import SallesModule from './modules/salles';
import ExamensModule from './modules/examens';
import RdvModule from './modules/rdv';
import SecuriteModule from './modules/securite';
import CommunicationModule from './modules/communication';
import AuditModule from './modules/audit';
import ParentPortalModule from './modules/parent-portal';
import ElevePortalModule from './modules/eleve-portal';
import V4ModulesModule from './modules/v4-modules';
import SanteModule from './modules/sante';
import PortailMetiers from './modules/portail-metiers';

export type Portal =
  | 'super_admin' | 'direction' | 'enseignant' | 'parent' | 'eleve'
  | 'comptabilite' | 'rh' | 'vie_scolaire' | 'secretariat' | 'sante' | 'assistant';

export type ModuleId =
  | 'dashboard' | 'saas' | 'eleves' | 'personnel' | 'pedagogique' | 'presences'
  | 'vie_scolaire' | 'finances' | 'services' | 'salles' | 'examens'
  | 'rdv' | 'securite' | 'communication' | 'audit' | 'sante' | 'parent_portal' | 'eleve_portal' | 'v4_modules';

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
  { id: 'presences', label: 'Présences', icon: ClipboardList, portals: ['super_admin', 'direction', 'enseignant', 'vie_scolaire', 'assistant'] },
  { id: 'vie_scolaire', label: 'Vie scolaire', icon: Shield, portals: ['super_admin', 'direction', 'enseignant', 'vie_scolaire', 'assistant'] },
  { id: 'finances', label: 'Finances', icon: Wallet, portals: ['super_admin', 'direction', 'comptabilite'] },
  { id: 'services', label: 'Services', icon: Bus, portals: ['super_admin', 'direction'] },
  { id: 'sante', label: 'Santé & Infirmerie', icon: HeartPulse, portals: ['super_admin', 'direction', 'sante'] },
  { id: 'salles', label: 'Salles & Calendrier', icon: School, portals: ['super_admin', 'direction', 'vie_scolaire'] },
  { id: 'examens', label: 'Examens officiels', icon: FileCheck, portals: ['super_admin', 'direction', 'vie_scolaire'] },
  { id: 'rdv', label: 'RDV parents-profs', icon: CalendarDays, portals: ['super_admin', 'direction', 'enseignant', 'parent', 'secretariat'] },
  { id: 'securite', label: 'Sécurité site', icon: Shield, portals: ['super_admin', 'direction', 'vie_scolaire'] },
  { id: 'communication', label: 'Communication', icon: MessageSquare, portals: ['super_admin', 'direction', 'comptabilite', 'rh', 'secretariat', 'assistant'] },
  { id: 'audit', label: "Journal d'audit", icon: ScrollText, portals: ['super_admin', 'direction'] },
  { id: 'v4_modules', label: 'Modules V4 (37 failles)', icon: CheckCircle2, portals: ['super_admin', 'direction'] },
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

  // ---- Temps réel : /api/pulse toutes les 15 s ----
  // Dès qu'un compteur bouge (paiement, présence, notification…),
  // la page est re-rendue côté serveur → données fraîches partout.
  useEffect(() => {
    let dernier: number | null = null;
    let vivant = true;
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
    void sonder();
    const id = setInterval(sonder, 15_000);
    return () => { vivant = false; clearInterval(id); };
  }, [router]);

  const visibleModules = useMemo(() => MODULES.filter((m) => m.portals.includes(portal)), [portal]);

  const school = initialData.ecole;
  const notifications = initialData.notifications ?? [];
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
      case 'presences': return <PresencesModule {...props} />;
      case 'vie_scolaire': return <VieScolaireModule {...props} />;
      case 'finances': return <FinancesModule {...props} />;
      case 'services': return <ServicesModule {...props} />;
      case 'sante': return <SanteModule {...props} />;
      case 'salles': return <SallesModule {...props} />;
      case 'examens': return <ExamensModule {...props} />;
      case 'rdv': return <RdvModule {...props} />;
      case 'securite': return <SecuriteModule {...props} />;
      case 'communication': return <CommunicationModule {...props} />;
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

          <GlobalSearch initialData={initialData} onNavigate={(m) => setActive(m)} />

          <div className="flex-1 text-sm text-gray-600 min-w-0 truncate">
            <span className="text-gray-400">{PORTAL_LABELS[portal]}</span>
            <span className="mx-2 text-gray-300">/</span>
            <span className="font-medium text-gray-900">{MODULES.find((m) => m.id === active)?.label}</span>
          </div>

          {/* Indicateur temps réel */}
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              enDirect ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
            title={enDirect ? 'Connecté au flux temps réel — rafraîchissement automatique' : 'Flux temps réel indisponible'}
          >
            <Activity className={`h-3 w-3 ${enDirect ? 'animate-pulse' : ''}`} />
            {enDirect ? 'En direct' : 'Hors ligne'}
          </span>

          {/* Notifications du compte connecté */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications ({notifications.length})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.slice(0, 5).map((n: any) => (
                <DropdownMenuItem key={n.id} className="flex-col items-start py-2">
                  <div className="text-sm font-medium">{n.sujet}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">{n.corps}</div>
                </DropdownMenuItem>
              ))}
              {notifications.length === 0 && (
                <DropdownMenuItem className="text-gray-500 text-sm">Aucune notification</DropdownMenuItem>
              )}
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
