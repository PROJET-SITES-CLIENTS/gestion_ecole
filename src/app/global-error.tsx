'use client';

// Dernier recours : erreur globale (layout inclus) — écran français + rechargement.

export default function ErreurGlobale({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, padding: 32, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Une erreur inattendue est survenue</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
            Le serveur n&apos;a pas répondu correctement. Réessayez — cela revient généralement en ordre.
          </p>
          <button
            onClick={() => reset()}
            style={{ marginTop: 20, background: '#059669', color: '#fff', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14 }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
