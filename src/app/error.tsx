'use client';

// Écran d'erreur — AUTO-RETRY après 3 secondes (le réveil Supabase prend
// 10-30 s mais le second appel réussit presque toujours). L'utilisateur
// voit un bref écran de reconnexion au lieu d'une erreur bloquante.

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErreurApplication({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [compte, setCompte] = useState(3);
  const [essais, setEssais] = useState(0);

  // AUTO-RETRY : compte à rebours puis retry automatique (max 3 essais)
  useEffect(() => {
    if (essais >= 3) return; // après 3 essais, on laisse l'utilisateur décider
    if (compte <= 0) {
      setEssais((e) => e + 1);
      setCompte(3);
      reset();
      return;
    }
    const id = setTimeout(() => setCompte((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [compte, essais, reset]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-4 ${essais > 0 ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
          {essais > 0 ? <RefreshCw className="h-6 w-6 animate-spin" /> : <AlertTriangle className="h-6 w-6" />}
        </div>
        {essais === 0 ? (
          <>
            <h1 className="text-lg font-semibold">Reconnexion en cours…</h1>
            <p className="mt-2 text-sm text-gray-500">
              Le serveur se réveille. Nouvelle tentative automatique dans{' '}
              <span className="font-bold text-blue-600">{compte}</span> s.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">Reconnexion… (essai {essais + 1}/3)</h1>
            <p className="mt-2 text-sm text-gray-500">
              Le serveur démarre. Cela prend parfois 10-20 secondes.
            </p>
          </>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {essais >= 3 && (
            <>
              <p className="text-xs text-gray-400 mb-2">
                Si le problème persiste, la base de données est peut-être en pause prolongée.
              </p>
              <button
                onClick={() => { setEssais(0); setCompte(3); }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" /> Réessayer manuellement
              </button>
            </>
          )}
          <a href="/" className="text-sm text-gray-500 hover:underline">Retour à l&apos;accueil</a>
          <a href="/login" className="text-sm text-gray-400 hover:underline">Retour à la connexion</a>
        </div>
      </div>
    </div>
  );
}
