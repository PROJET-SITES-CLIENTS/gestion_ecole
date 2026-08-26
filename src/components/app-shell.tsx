'use client';

// ====================================================================
// Shell applicatif principal — gère la navigation entre les modules
// et le sélecteur de "portail" (super-admin éditeur, direction, enseignant,
// parent, élève) pour la démonstration de bout en bout.
// ====================================================================

import { useState, useMemo } from 'react';
import {
  LayoutDashboard, Building2, Users, GraduationCap, ClipboardList, CalendarDays,
  BookOpen, Bus, BookMarked, Calendar, FileCheck, MessageSquare, Shield,
  ScrollText, Wallet, School, User as UserIcon, ChevronDown, Bell, Menu, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

export type Portal = 'super_admin' | 'direction' | 'enseignant' | 'parent' | 'eleve';

export type ModuleId =
  | 'dashboard' | 'saas' | 'eleves' | 'personnel' | 'pedagogique' | 'presences'
  | 'vie_scolaire' | 'finances' | 'services' | 'salles' | 'examens'
  | 'rdv' | 'securite' | 'communication' | 'audit' | 'parent_portal';

type ModuleDef = {
  id: ModuleId;
  label: string;
  icon: any;
  portals: Portal[];
};

const MODULES: ModuleDef[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, portals: ['super_admin', 'direction', 'enseignant', 'parent'] },
  { id: 'saas', label: 'Couche SaaS', icon: Building2, portals: ['super_admin'] },
  { id: 'eleves', label: 'Élèves', icon: Users, portals: ['super_admin', 'direction', 'enseignant'] },
  { id: 'personnel', label: 'Personnel', icon: GraduationCap, portals: ['super_admin', 'direction'] },
  { id: 'pedagogique', label: 'Pédagogique', icon: BookOpen, portals: ['super_admin', 'direction', 'enseignant'] },
  { id: 'presences', label: 'Présences', icon: ClipboardList, portals: ['super_admin', 'direction', 'enseignant'] },
  { id: 'vie_scolaire', label: 'Vie scolaire', icon: Shield, portals: ['super_admin', 'direction', 'enseignant'] },
  { id: 'finances', label: 'Finances', icon: Wallet, portals: ['super_admin', 'direction'] },
  { id: 'services', label: 'Services', icon: Bus, portals: ['super_admin', 'direction'] },
  { id: 'salles', label: 'Salles & Calendrier', icon: School, portals: ['super_admin', 'direction'] },
  { id: 'examens', label: 'Examens officiels', icon: FileCheck, portals: ['super_admin', 'direction'] },
  { id: 'rdv', label: 'RDV parents-profs', icon: CalendarDays, portals: ['super_admin', 'direction', 'enseignant', 'parent'] },
  { id: 'securite', label: 'Sécurité site', icon: Shield, portals: ['super_admin', 'direction'] },
  { id: 'communication', label: 'Communication', icon: MessageSquare, portals: ['super_admin', 'direction'] },
  { id: 'audit', label: "Journal d'audit", icon: ScrollText, portals: ['super_admin', 'direction'] },
  { id: 'parent_portal', label: 'Portail Parent (démonstration)', icon: UserIcon, portals: ['parent'] },
];

const PORTAL_LABELS: Record<Portal, string> = {
  super_admin: 'Super-Admin Éditeur',
  direction: 'Direction',
  enseignant: 'Enseignant',
  parent: 'Parent',
  eleve: 'Élève',
};

export default function AppShell({ initialData }: { initialData: any }) {
  const [portal, setPortal] = useState<Portal>('direction');
  const [active, setActive] = useState<ModuleId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleModules = useMemo(() => MODULES.filter(m => m.portals.includes(portal)), [portal]);

  // Si l'utilisateur change de portail, on bascule sur le dashboard si le module actuel n'est pas accessible
  const handlePortalChange = (p: Portal) => {
    setPortal(p);
    if (!MODULES.find(m => m.id === active)?.portals.includes(p)) {
      setActive('dashboard');
    }
  };

  // Pour le portail parent, on bascule directement sur le portail parent
  const handlePortalParent = () => {
    setPortal('parent');
    setActive('parent_portal');
  };

  const school = initialData.ecole;
  const notifications = initialData.notifications ?? [];

  const renderModule = () => {
    const props = { initialData };
    switch (active) {
      case 'dashboard':
        if (portal === 'super_admin') return <SaasModule {...props} mode="dashboard" />;
        if (portal === 'parent') return <ParentPortalModule {...props} mode="dashboard" />;
        return <DirectionModule {...props} mode="dashboard" />;
      case 'saas': return <SaasModule {...props} mode="full" />;
      case 'eleves': return <ElevesModule {...props} />;
      case 'personnel': return <PersonnelModule {...props} />;
      case 'pedagogique': return <PedagogiqueModule {...props} />;
      case 'presences': return <PresencesModule {...props} />;
      case 'vie_scolaire': return <VieScolaireModule {...props} />;
      case 'finances': return <FinancesModule {...props} />;
      case 'services': return <ServicesModule {...props} />;
      case 'salles': return <SallesModule {...props} />;
      case 'examens': return <ExamensModule {...props} />;
      case 'rdv': return <RdvModule {...props} />;
      case 'securite': return <SecuriteModule {...props} />;
      case 'communication': return <CommunicationModule {...props} />;
      case 'audit': return <AuditModule {...props} />;
      case 'parent_portal': return <ParentPortalModule {...props} mode="full" />;
      default: return null;
    }
  };

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
            <div className="text-xs text-gray-500">Plateforme SaaS</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {visibleModules.map(m => {
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
          <div className="text-xs text-gray-500 mb-1">École courante (démo)</div>
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

          <div className="flex-1 text-sm text-gray-600">
            <span className="text-gray-400">{PORTAL_LABELS[portal]}</span>
            <span className="mx-2 text-gray-300">/</span>
            <span className="font-medium text-gray-900">{MODULES.find(m => m.id === active)?.label}</span>
          </div>

          {/* Notifications */}
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

          {/* Sélecteur de portail (démo) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                    {PORTAL_LABELS[portal].split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{PORTAL_LABELS[portal]}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Changer de portail (démo)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['super_admin', 'direction', 'enseignant', 'parent', 'eleve'] as Portal[]).map(p => (
                <DropdownMenuItem key={p} onClick={() => p === 'parent' ? handlePortalParent() : handlePortalChange(p)}>
                  <div className="flex items-center gap-2">
                    {portal === p && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
                    <span>{PORTAL_LABELS[p]}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto">
          {renderModule()}
        </main>

        <footer className="bg-white border-t border-gray-200 py-2 px-4 text-xs text-gray-500 flex items-center justify-between">
          <span>ScolaGestion — Plateforme SaaS de Gestion Scolaire · Version 4 (cahier des charges complet)</span>
          <span>Démo multi-tenant · École : {school?.nom ?? '—'}</span>
        </footer>
      </div>
    </div>
  );
}
