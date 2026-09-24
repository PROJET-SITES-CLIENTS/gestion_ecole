'use client';

// ====================================================================
// ASSISTANT IA — interface conversationnelle (texte + VOIX).
// Reconnaissance vocale (Web Speech API) + synthèse vocale des réponses.
// Flottant, accessible depuis tous les portails — le serveur limite
// l'agent aux permissions réelles de la session.
// FIX: Le contexte technique (tool_calls) est conservé dans l'historique
// pour éviter l'amnésie de l'IA lors des conversations multi-tours.
// ====================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Mic, MicOff, Volume2, VolumeX, Loader2, CheckCircle2, XCircle } from 'lucide-react';
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

export default function AssistantIA({ prenom }: { prenom?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [tours, setTours] = useState<Tour[]>([{
    role: 'assistant',
    content: `Bonjour ${prenom ?? ''} 👋 Je suis votre assistant. Parlez-moi ou écrivez : « Qui sont les absents aujourd'hui ? », « Inscrit l'élève Awa Diop en 6ème A », « Combien d'impayés en scolarité ? », « Encaisse 50 000 F de Malick Sow en espèces »… J'agis directement dans votre périmètre.`,
  }]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [ecoute, setEcoute] = useState(false);
  const [voixActive, setVoixActive] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const recoRef = useRef<any>(null);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [tours, enCours]);

  const parler = useCallback((texte: string) => {
    if (!voixActive || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte.replace(/[*_#`]/g, '').slice(0, 600));
    u.lang = 'fr-FR';
    window.speechSynthesis.speak(u);
  }, [voixActive]);

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
      parler(reponse);
    } catch (e: any) {
      setTours([...nouvelleHistorique, { role: 'assistant', content: `⚠️ ${e?.message ?? 'Erreur réseau.'}` }]);
    } finally {
      setEnCours(false);
    }
  }, [saisie, tours, enCours, parler]);

  const basculerEcoute = useCallback(() => {
    if (typeof window === 'undefined' || !(window as any).webkitSpeechRecognition) {
      alert('La reconnaissance vocale nécessite Chrome ou Edge.');
      return;
    }
    if (ecoute) { recoRef.current?.stop(); setEcoute(false); return; }
    const reco = new (window as any).webkitSpeechRecognition();
    reco.lang = 'fr-FR';
    reco.interimResults = false;
    reco.continuous = false;
    reco.onresult = (e: any) => {
      const texte = e.results[0][0].transcript as string;
      setEcoute(false);
      envoyer(texte);
    };
    reco.onerror = () => setEcoute(false);
    reco.onend = () => setEcoute(false);
    recoRef.current = reco;
    reco.start();
    setEcoute(true);
  }, [ecoute, envoyer]);

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
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
            <div className="font-semibold text-sm">Assistant ScolaGestion</div>
            <div className="text-[10px] opacity-80">vos informations & actions — dans votre périmètre</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setVoixActive(!voixActive); if (voixActive) window.speechSynthesis?.cancel(); }} title={voixActive ? 'Couper la voix' : 'Lire les réponses à voix haute'} className="p-1.5 hover:bg-emerald-700 rounded">
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
        <div className="flex items-end gap-1.5">
          <button
            onClick={basculerEcoute}
            className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ecoute ? 'bg-rose-600 text-white animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            title="Commande vocale (français)"
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
