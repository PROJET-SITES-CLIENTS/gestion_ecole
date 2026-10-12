'use client';

// ====================================================================
// FX — Bibliothèque d'effets ScolaGestion
// Le kit « interface scotchée » : compteurs animés, confettis, sons,
// skeletons shimmer, boutons magnétiques, indicateurs de frappe,
// fond aurore. Tout est léger, tout se greffe sur l'existant.
// ====================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView, useSpring, useTransform, animate } from 'motion/react';
import confetti from 'canvas-confetti';

// ═════════════════════════════════════════════════════════════════
// 1. COMPTEUR ANIMÉ — les chiffres montent de 0 à N en ~1 s
// ═════════════════════════════════════════════════════════════════

export function CountUp({ value, duration = 1, format }: { value: number; duration?: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const enVue = useInView(ref, { once: true, margin: '-40px' });
  const [affiche, setAffiche] = useState(0);

  useEffect(() => {
    if (!enVue) return;
    const controle = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // ease-out expo — rapide au début, douce à la fin
      onUpdate: (v) => setAffiche(v),
    });
    return () => controle.stop();
  }, [enVue, value, duration]);

  const formate = format ?? ((n: number) => Math.round(n).toLocaleString('fr-FR'));
  return <span ref={ref} className="tabular-nums">{formate(affiche)}</span>;
}

/** Variante montant FCFA — arrondit et ajoute le suffixe */
export function CountUpFCFA({ centimes }: { centimes: number }) {
  return <CountUp value={centimes / 100} format={(n) => `${Math.round(n).toLocaleString('fr-FR')} F`} />;
}

// ═════════════════════════════════════════════════════════════════
// 2. CONFETTIS — célébrer les moments de victoire
// ═════════════════════════════════════════════════════════════════

/** Explosion classique — validations, paiements complets */
export function celebrer(_intensite?: 'petite' | 'normale' | 'grande') { /* institutionnel : pas de confettis */ }

/** Pluie dorée — clôtures, réussites exceptionnelles */
export function pluieDoree() { /* institutionnel : pas de pluie dorée */ }

// ═════════════════════════════════════════════════════════════════
// 3. SONS UI — feedback multisensoriel (Web Audio, zéro fichier)
// ═════════════════════════════════════════════════════════════════

let ctxAudio: AudioContext | null = null;
let sonsActifs = false; // institutionnel : sons désactivés par défaut

export function reglerSons(actif: boolean) {
  sonsActifs = actif;
  if (typeof window !== 'undefined') localStorage.setItem('sg-sons', actif ? '1' : '0');
}

export function sonsEnabled() {
  if (typeof window === 'undefined') return false;
  return false; // institutionnel : sons coupés
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctxAudio) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctxAudio = new Ctor();
  }
  return ctxAudio;
}

/** Petit bip de synthèse — oscillateur + envelope ADSR minimal */
function bip(freq: number, duree: number, type: OscillatorType = 'sine', volume = 0.06) {
  if (!sonsActifs || !sonsEnabled()) return;
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duree);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duree + 0.05);
}

export const sons = {
  /** tic doux de validation */
  succes: () => { bip(880, 0.08, 'sine', 0.05); setTimeout(() => bip(1320, 0.12, 'sine', 0.04), 70); },
  /** note ascendante pour les victoires */
  victoire: () => { bip(523, 0.1, 'sine', 0.05); setTimeout(() => bip(659, 0.1, 'sine', 0.05), 100); setTimeout(() => bip(784, 0.18, 'sine', 0.05), 200); },
  /** feedback d'erreur discret */
  erreur: () => { bip(220, 0.15, 'triangle', 0.04); },
  /** pop d'ouverture */
  pop: () => { bip(600, 0.05, 'sine', 0.03); },
};

// ═════════════════════════════════════════════════════════════════
// 4. SKELETONS SHIMMER — chargements qui brillent
// ═════════════════════════════════════════════════════════════════

export function Skeleton({ className = '', largeurMax }: { className?: string; largeurMax?: string }) {
  return (
    <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`} style={largeurMax ? { maxWidth: largeurMax } : undefined}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
    </div>
  );
}

export function SkeletonCarte() {
  return (
    <div className="space-y-2 p-4 border border-gray-200 dark:border-gray-800">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  );
}

export function SkeletonLignes({ n = 5 }: { n?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-3 flex-1" largeurMax={`${70 - i * 8}%`} />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// 5. BOUTON MAGNÉTIQUE — s'incline vers le curseur
// ═════════════════════════════════════════════════════════════════

export function Magnetique({ children }: { children: React.ReactNode; force?: number }) { return <>{children}</>; }

// ═════════════════════════════════════════════════════════════════
// 6. INDICATEUR DE FRAPPE — ARIA réfléchit
// ═════════════════════════════════════════════════════════════════

export function PointsDeFrappe() {
  return (
    <div className="flex items-center gap-1.5 px-1" aria-label="En train d'écrire">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-current opacity-60"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// 7. FOND AURORE — la page de connexion vit
// ═════════════════════════════════════════════════════════════════

export function FondAurore() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="aurora-orbe aurora-1" />
      <div className="aurora-orbe aurora-2" />
      <div className="aurora-orbe aurora-3" />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// 8. BARRE DE PROGRESSION — fine ligne lumineuse en haut
// ═════════════════════════════════════════════════════════════════

export function BarreProgression() {
  const [visible, setVisible] = useState(false);
  const [largeur, setLargeur] = useState(0);

  useEffect(() => {
    const demarrer = () => { setVisible(true); setLargeur(15); setTimeout(() => setLargeur(70), 200); setTimeout(() => setLargeur(90), 600); };
    const finir = () => { setLargeur(100); setTimeout(() => setVisible(false), 300); };
    window.addEventListener('sg-action-debut', demarrer);
    window.addEventListener('sg-action-fin', finir);
    return () => { window.removeEventListener('sg-action-debut', demarrer); window.removeEventListener('sg-action-fin', finir); };
  }, []);

  if (!visible) return null;
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[9999] bg-blue-600 origin-left"
      style={{ width: `${largeur}%` }}
      transition={{ ease: 'easeOut' }}
    />
  );
}

// ═════════════════════════════════════════════════════════════════
// 9. HOOK — confettis + son automatiques sur feedback réussi
// ═════════════════════════════════════════════════════════════════

/** Mots-clés qui déclenchent les confettis selon l'action réussie */
const MOTS_CONFETTIS = /encaiss|valid|résolu|créé|inscrit|génér|clôtur|payé|complet|publi/i;
const MOTS_DOREE = /clôtur|exercice|année|parfait|100/i;

export function useCelebration() { return useCallback((_msg: string) => { /* institutionnel : pas de célébration */ }, []); }
