'use client';

// Écran d'erreur FRANÇAIS de l'application (remplace la page anglaise
// « This page couldn't load » de Vercel). Retry en un clic.

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErreurApplication({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">La page n&apos;a pas pu se charger</h1>
        <p className="mt-2 text-sm text-gray-500">
          Le serveur n&apos;a pas répondu à temps (il se réveille parfois après une
          période d&apos;inactivité). Réessayez — le second essai fonctionne presque
          toujours.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <RefreshCw className="h-4 w-4" /> Réessayer
          </button>
          <a href="/" className="text-sm text-gray-500 hover:underline">Retour à l&apos;accueil</a>
          <a href="/login" className="text-sm text-gray-400 hover:underline">Retour à la connexion</a>
        </div>
      </div>
    </div>
  );
}
