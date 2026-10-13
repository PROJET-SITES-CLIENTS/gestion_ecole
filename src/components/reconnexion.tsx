'use client';

// Écran de reconnexion — auto-retry client-side avec compte à rebours.
// Utilisé quand la BD est injoignable mais que la session est préservée.

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function Reconnexion({ message }: { message: string }) {
  const [compte, setCompte] = useState(5);

  useEffect(() => {
    if (compte <= 0) {
      window.location.reload();
      return;
    }
    const id = setTimeout(() => setCompte((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [compte]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
        <h1 className="text-lg font-semibold text-slate-800">Reconnexion au serveur…</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <p className="mt-3 text-sm font-medium text-blue-600">
          Nouvelle tentative dans {compte} s
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" /> Réessayer maintenant
        </button>
        <noscript>
          <p className="mt-4">
            <a href="/" className="text-sm text-blue-600 underline">Cliquer ici pour réessayer</a>
          </p>
        </noscript>
      </div>
    </div>
  );
}
