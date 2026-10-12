'use client';

// ====================================================================
// COMMAND PALETTE ⌘K — navigation à la vitesse de la pensée
// Ctrl+K / Cmd+K → spotlight : cherche modules, élèves, personnels,
// classes + actions rapides. Zéro clic pour aller n'importe où.
// ====================================================================

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowRight, User, Users, GraduationCap, School, Zap, CornerDownLeft } from 'lucide-react';
import { sons } from '@/components/fx';

type Entree = {
  id: string;
  type: 'module' | 'eleve' | 'personnel' | 'classe' | 'action';
  label: string;
  sub?: string;
  icone: 'module' | 'eleve' | 'personnel' | 'classe' | 'action';
  moduleCible?: string;
};

export function CommandPalette({
  ouvert,
  onFermer,
  modules,
  eleves,
  personnels,
  classes,
  onNaviguer,
}: {
  ouvert: boolean;
  onFermer: () => void;
  modules: Array<{ id: string; label: string; icon?: any }>;
  eleves: any[];
  personnels: any[];
  classes: any[];
  onNaviguer: (moduleId: string) => void;
}) {
  const [requete, setRequete] = useState('');
  const [selection, setSelection] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);

  // Construit l'index de recherche
  const index = useMemo<Entree[]>(() => {
    const entrees: Entree[] = [];

    // Modules
    for (const m of modules) {
      entrees.push({
        id: `mod-${m.id}`,
        type: 'module',
        label: m.label,
        sub: 'Module',
        icone: 'module',
        moduleCible: m.id,
      });
    }

    // Actions rapides
    const actions = [
      { id: 'act-dashboard', label: 'Aller au tableau de bord', moduleCible: 'dashboard' },
      { id: 'act-eleves', label: 'Gérer les élèves', moduleCible: 'eleves' },
      { id: 'act-personnel', label: 'Gérer le personnel', moduleCible: 'personnel' },
      { id: 'act-pedagogique', label: 'Pédagogie : notes, bulletins, programmes', moduleCible: 'pedagogique' },
      { id: 'act-finances', label: 'Finances : encaissements, dépenses', moduleCible: 'finances' },
      { id: 'act-compta', label: 'Comptabilité SYSCOHADA', moduleCible: 'compta' },
      { id: 'act-presences', label: 'Présences et absences', moduleCible: 'presences' },
      { id: 'act-communication', label: 'Communication et notifications', moduleCible: 'communication' },
      { id: 'act-documents', label: 'Documents officiels (77 modèles)', moduleCible: 'documents' },
      { id: 'act-securite', label: 'Sécurité : sessions, comptes, RGPD', moduleCible: 'securite' },
    ];
    for (const a of actions) {
      entrees.push({ id: a.id, type: 'action', label: a.label, sub: 'Action rapide', icone: 'action', moduleCible: a.moduleCible });
    }

    // Élèves
    for (const e of eleves.slice(0, 200)) {
      entrees.push({
        id: `el-${e.id}`,
        type: 'eleve',
        label: `${e.prenom ?? ''} ${e.nom ?? ''}`.trim(),
        sub: e.matricule ?? '—',
        icone: 'eleve',
        moduleCible: 'eleves',
      });
    }

    // Personnels
    for (const p of personnels.slice(0, 200)) {
      entrees.push({
        id: `pers-${p.id}`,
        type: 'personnel',
        label: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim(),
        sub: p.fonction ?? p.matricule ?? '—',
        icone: 'personnel',
        moduleCible: 'personnel',
      });
    }

    // Classes
    for (const c of classes.slice(0, 100)) {
      entrees.push({
        id: `cl-${c.id}`,
        type: 'classe',
        label: c.libelle ?? c.code ?? c.id,
        sub: `Niveau ${c.niveau?.libelle ?? '—'}`,
        icone: 'classe',
        moduleCible: 'eleves',
      });
    }

    return entrees;
  }, [modules, eleves, personnels, classes]);

  // Filtrage fuzzy simple (tous les mots doivent apparaître)
  const resultats = useMemo(() => {
    if (!requete.trim()) return index.slice(0, 12); // par défaut : les 12 premiers
    const q = requete.toLowerCase().split(/\s+/).filter(Boolean);
    return index
      .filter((e) => {
        const texte = `${e.label} ${e.sub ?? ''}`.toLowerCase();
        return q.every((mot) => texte.includes(mot));
      })
      .slice(0, 10);
  }, [index, requete]);

  // Reset à l'ouverture
  useEffect(() => {
    if (ouvert) {
      setRequete('');
      setSelection(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [ouvert]);

  // Navigation clavier
  const naviguerClavier = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelection((s) => Math.min(s + 1, resultats.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelection((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (resultats[selection]) {
        sons.pop();
        onNaviguer(resultats[selection].moduleCible ?? 'dashboard');
        onFermer();
      }
    } else if (e.key === 'Escape') {
      onFermer();
    }
  }, [resultats, selection, onNaviguer, onFermer]);

  const iconePour = (t: string) => {
    switch (t) {
      case 'eleve': return <User className="h-4 w-4" />;
      case 'personnel': return <Users className="h-4 w-4" />;
      case 'classe': return <School className="h-4 w-4" />;
      case 'action': return <Zap className="h-4 w-4" />;
      default: return <GraduationCap className="h-4 w-4" />;
    }
  };

  if (!ouvert) return null;

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onFermer}
        >
          <motion.div
            className="w-[min(560px,calc(100vw-2rem))] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden"
            initial={{ scale: 0.95, y: -16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Champ de recherche */}
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
              <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={requete}
                onChange={(e) => { setRequete(e.target.value); setSelection(0); }}
                onKeyDown={naviguerClavier}
                placeholder="Rechercher un élève, un personnel, une classe, un module…"
                className="flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-gray-400 dark:text-white"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold text-gray-400 border border-gray-300 dark:border-gray-600 px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            {/* Résultats */}
            <div ref={listeRef} className="max-h-[50vh] overflow-y-auto py-2">
              {resultats.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  Aucun résultat pour « {requete} »
                </div>
              ) : (
                resultats.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => { sons.pop(); onNaviguer(r.moduleCible ?? 'dashboard'); onFermer(); }}
                    onMouseEnter={() => setSelection(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-[0.85rem] transition-colors ${
                      i === selection
                        ? 'bg-[#2563EB] text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className={`h-7 w-7 border flex items-center justify-center flex-shrink-0 ${
                      i === selection ? 'border-white/40 bg-white/10 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-500'
                    }`}>
                      {iconePour(r.icone)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.label}</div>
                      {r.sub && <div className={`text-[11px] truncate ${i === selection ? 'text-white/70' : 'text-gray-400'}`}>{r.sub}</div>}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${i === selection ? 'text-white/60' : 'text-gray-300'}`}>
                      {r.type}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-[10px] text-gray-400">
              <span>↑↓ naviguer · ↴ ouvrir · ESC fermer</span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                ScolaGestion
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
