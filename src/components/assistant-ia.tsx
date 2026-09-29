'use client';

// ====================================================================
// ASSISTANT IA — interface conversationnelle (texte + VOIX).
// MODE CONVERSATION MAINS LIBRES : l'utilisateur parle, ARIA répond à
// voix haute puis rouvre le micro automatiquement — un vrai dialogue
// continu, sans jamais toucher l'écran.
//  - Reconnaissance vocale : Web Speech API (Chrome/Edge/Safari 14.5+),
//    transcription partielle en direct dans le champ de saisie ;
//  - Synthèse vocale fr-FR avec voix française si disponible ;
//  - relance automatique du micro après chaque réponse (garde-fous :
//    arrêt sur silence répété, permission refusée ou panneau fermé).
// FIX historique conservé : le contexte technique (tool_calls) reste
// dans l'historique pour éviter l'amnésie de l'IA en multi-tours.
// ====================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Mic, MicOff, Volume2, VolumeX, Headphones, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { demanderAssistant } from '@/app/actions/ia';

// Tour affiché à l'écran (le champ outils_ctx est technique, jamais affiché)
type Tour = {
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{ outil: string; resume: string; ok: boolean }>;
  // Contexte technique conservé pour renvoyer au serveur l'historique complet
  outils_ctx?: Array<{ role: string; content: string; tool_call_id?: string; name?: string; tool_calls?: unknown[] }>;
};

// Construit la liste de messages à envoyer au serveur (incluant le contexte technique)
function versMessagesServeur(tours: Tour[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const msgs: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const t of tours) {
    // Si ce tour assistant a du contexte technique (tool_calls), on l'injecte AVANT le message visible
    if (t.role === 'assistant' && t.outils_ctx && t.outils_ctx.length > 0) {
      for (const ctx of t.outils_ctx) {
        // On passe le contexte brut comme un message encodé JSON pour que le serveur le reconstruise
        msgs.push({ role: ctx.role as 'user' | 'assistant', content: ctx.content });
      }
    } else {
      msgs.push({ role: t.role, content: t.content });
    }
  }
  return msgs;
}

/** Support de la reconnaissance vocale (préfixes navigateurs). */
function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function AssistantIA({ prenom }: { prenom?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [tours, setTours] = useState<Tour[]>([{
    role: 'assistant',
    content: `Bonjour ${prenom ?? ''} 👋 Je suis ARIA. Activez le mode conversation 🎧 pour me parler sans toucher l'écran, ou écrivez : « Qui sont les absents aujourd'hui ? », « Inscrit l'élève Awa Diop en 6ème A », « Combien d'impayés en scolarité ? », « Encaisse 50 000 F de Malick Sow en espèces »…`,
  }]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [ecoute, setEcoute] = useState(false);
  const [voixActive, setVoixActive] = useState(false);
  // MODE CONVERSATION : micro + voix enchaînés automatiquement
  const [modeConv, setModeConv] = useState(false);
  const [parle, setParle] = useState(false);

  const finRef = useRef<HTMLDivElement>(null);
  const recoRef = useRef<any>(null);
  // Réfs anti-closurs figées : les callbacks longévifs (reconnaissance,
  // synthèse) lisent toujours l'état courant via ces réfs.
  const modeConvRef = useRef(false);
  const voixRef = useRef(false);
  const ouvertRef = useRef(true);
  const envoyerRef = useRef<(t?: string) => void>(() => {});
  const relancesVidesRef = useRef(0);
  const resultatRecuRef = useRef(false);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [tours, enCours]);
  useEffect(() => { modeConvRef.current = modeConv; }, [modeConv]);
  useEffect(() => { voixRef.current = voixActive; }, [voixActive]);
  useEffect(() => { ouvertRef.current = ouvert; }, [ouvert]);

  /** Choisit une voix française si le navigateur en propose une. */
  const voixFrancaise = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voix = window.speechSynthesis.getVoices();
    return voix.find((v) => v.lang?.toLowerCase().startsWith('fr')) ?? null;
  }, []);

  /** Prononce un texte (markdown nettoyé). `aLaFin` est appelé à la fin
   *  de la prononciation — c'est là que le mode conversation rouvre le micro. */
  const parler = useCallback((texte: string, aLaFin?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { aLaFin?.(); return; }
    window.speechSynthesis.cancel();
    // En conversation on prononce toujours ; sinon seulement si voix active
    if (!modeConvRef.current && !voixRef.current) { aLaFin?.(); return; }
    const u = new SpeechSynthesisUtterance(texte.replace(/[*_#`•]/g, ' ').replace(/\s+/g, ' ').slice(0, 600));
    u.lang = 'fr-FR';
    const vf = voixFrancaise();
    if (vf) u.voice = vf;
    u.rate = 1.05;
    u.onstart = () => setParle(true);
    u.onend = () => { setParle(false); aLaFin?.(); };
    u.onerror = () => { setParle(false); aLaFin?.(); };
    window.speechSynthesis.speak(u);
  }, [voixFrancaise]);

  // ── Reconnaissance vocale ──────────────────────────────────────────
  /** Ouvre le micro. En mode conversation, se relance seule sur silence
   *  (garde-fou : 8 relances vides consécutives → arrêt du mode). */
  const demarrerEcoute = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      alert('La reconnaissance vocale nécessite Chrome, Edge ou Safari récent.');
      setModeConv(false);
      return;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); // on n'écoute pas pendant qu'ARIA parle
    resultatRecuRef.current = false;
    const reco = new Ctor();
    reco.lang = 'fr-FR';
    reco.interimResults = true;   // transcription en direct dans le champ
    reco.continuous = false;
    reco.maxAlternatives = 1;
    reco.onresult = (e: any) => {
      let finale = '';
      let partielle = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finale += r[0].transcript;
        else partielle += r[0].transcript;
      }
      if (partielle) setSaisie(partielle);
      if (finale.trim()) {
        resultatRecuRef.current = true;
        relancesVidesRef.current = 0;
        setEcoute(false);
        setSaisie('');
        envoyerRef.current(finale.trim());
      }
    };
    reco.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        alert('Accès au micro refusé — autorisez le microphone dans votre navigateur pour parler à ARIA.');
        setModeConv(false);
      }
      // « no-speech » / « aborted » : silence géré par onend
    };
    reco.onend = () => {
      setEcoute(false);
      // MODE CONVERSATION — relance automatique sur silence
      if (modeConvRef.current && ouvertRef.current && !resultatRecuRef.current) {
        relancesVidesRef.current += 1;
        if (relancesVidesRef.current <= 8) {
          setTimeout(() => { if (modeConvRef.current && ouvertRef.current) demarrerEcoute(); }, 350);
        } else {
          setModeConv(false); // silence prolongé : on repasse en mode ponctuel
        }
      }
    };
    try { reco.start(); recoRef.current = reco; setEcoute(true); } catch { /* déjà démarré */ }
  }, []);

  const arreterVoix = useCallback(() => {
    modeConvRef.current = false;
    setModeConv(false);
    try { recoRef.current?.stop(); } catch { /* ignoré */ }
    recoRef.current = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setEcoute(false);
    setParle(false);
    relancesVidesRef.current = 0;
  }, []);

  /** Bascule le mode conversation mains libres. */
  const basculerConversation = useCallback(() => {
    if (modeConv) { arreterVoix(); return; }
    relancesVidesRef.current = 0;
    modeConvRef.current = true;
    setModeConv(true);
    setVoixActive(true);
    voixRef.current = true;
    parler('Mode conversation activé. Je vous écoute.', () => {
      if (modeConvRef.current) demarrerEcoute();
    });
  }, [modeConv, arreterVoix, parler, demarrerEcoute]);

  // ── Envoi d'un message (texte ou vocal) ───────────────────────────
  const envoyer = useCallback(async (texte?: string) => {
    const message = (texte ?? saisie).trim();
    if (!message || enCours) return;
    setSaisie('');
    const nouvelleHistorique: Tour[] = [...tours, { role: 'user', content: message }];
    setTours([...nouvelleHistorique, { role: 'assistant', content: '…' }]);
    setEnCours(true);
    try {
      // On envoie l'historique COMPLET incluant le contexte technique pour éviter l'amnésie
      const r = await demanderAssistant(versMessagesServeur(nouvelleHistorique));
      const reponse = r && r.ok
        ? (r as any).reponse ?? ''
        : (r as any)?.error ?? 'Erreur inattendue.';
      setTours([...nouvelleHistorique, { role: 'assistant', content: reponse, actions: (r as any)?.actions }]);
      // CONVERSATION : la réponse est prononcée puis le micro se rouvre
      parler(reponse, () => {
        if (modeConvRef.current && ouvertRef.current) {
          setTimeout(() => { if (modeConvRef.current && ouvertRef.current) demarrerEcoute(); }, 250);
        }
      });
    } catch (e: any) {
      setTours([...nouvelleHistorique, { role: 'assistant', content: `⚠️ ${e?.message ?? 'Erreur réseau.'}` }]);
      if (modeConvRef.current) demarrerEcoute();
    } finally {
      setEnCours(false);
    }
  }, [saisie, tours, enCours, parler, demarrerEcoute]);

  // Le micro lit toujours la dernière version d'envoyer via la réf
  useEffect(() => { envoyerRef.current = envoyer; }, [envoyer]);

  // Fermer le panneau coupe proprement la conversation
  useEffect(() => {
    if (!ouvert && modeConvRef.current) arreterVoix();
  }, [ouvert, arreterVoix]);

  // Précharge les voix du navigateur (arrivent de façon asynchrone)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="fixed bottom-20 lg:bottom-5 right-4 lg:right-5 z-50 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        title="Assistant IA — parlez-lui ou écrivez"
        aria-label="Ouvrir l'assistant IA"
      >
        <Bot className="h-7 w-7" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(420px,calc(100vw-2.5rem))] h-[min(600px,calc(100vh-2.5rem))] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
      <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <div>
            <div className="font-semibold text-sm">ARIA — Assistant ScolaGestion</div>
            <div className="text-[10px] opacity-80">
              {modeConv
                ? ecoute ? '🎧 Je vous écoute…' : parle ? '🔊 ARIA parle…' : enCours ? '⏳ J\'analyse…' : '🎧 Conversation active'
                : 'vos informations & actions — dans votre périmètre'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={basculerConversation}
            title={modeConv ? 'Arrêter la conversation vocale' : 'Mode conversation mains libres (je parle, ARIA répond à voix haute et réécoute)'}
            className={`p-1.5 rounded ${modeConv ? 'bg-white text-emerald-700 animate-pulse' : 'hover:bg-emerald-700'}`}
            aria-label="Mode conversation vocale"
          >
            <Headphones className="h-4 w-4" />
          </button>
          <button onClick={() => { setVoixActive(!voixActive); if (voixActive) { window.speechSynthesis?.cancel(); if (modeConv) arreterVoix(); } }} title={voixActive ? 'Couper la voix' : 'Lire les réponses à voix haute'} className="p-1.5 hover:bg-emerald-700 rounded">
            {voixActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button onClick={() => setOuvert(false)} className="p-1.5 hover:bg-emerald-700 rounded" title="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {tours.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${t.role === 'user' ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 rounded-bl-sm'}`}>
              {t.content}
              {t.actions && t.actions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                  {t.actions.map((a, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                      {a.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0 mt-0.5" />}
                      <span><b>{a.outil}</b> — {a.resume}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {enCours && (
          <div className="flex items-center gap-2 text-sm text-gray-500 pl-2">
            <Loader2 className="h-4 w-4 animate-spin" /> j'analyse et j'agis…
          </div>
        )}
        <div ref={finRef} />
      </div>

      <div className="p-2 border-t bg-white">
        {modeConv && (
          <div className="flex items-center justify-between px-2 pb-1.5">
            <span className="text-[11px] text-emerald-700">
              {ecoute ? '🎧 Parlez — je transcris en direct…' : parle ? '🔊 Réponse en cours de lecture…' : '⏳ Prêt à réécouter…'}
            </span>
            <button onClick={arreterVoix} className="text-[11px] text-rose-600 hover:underline">
              Arrêter la conversation
            </button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <button
            onClick={modeConv ? arreterVoix : demarrerEcoute}
            className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ecoute ? 'bg-rose-600 text-white animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            title={modeConv ? 'Arrêter l\'écoute' : 'Commande vocale ponctuelle (français)'}
            aria-label="Parler à l'assistant"
          >
            {ecoute ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <textarea
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
            rows={1}
            placeholder={ecoute ? 'Je vous écoute…' : 'Écrivez votre demande… (Entrée pour envoyer)'}
            className="flex-1 resize-none border rounded-xl px-3 py-2 text-sm max-h-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={() => envoyer()}
            disabled={enCours || !saisie.trim()}
            className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            title="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
