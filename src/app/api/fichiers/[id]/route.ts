// ====================================================================
// A3 — LECTURE D'UN FICHIER STOCKÉ : sert le fichier APRÈS vérification de
// session + appartenance école. Les fichiers confidentiels ne sont JAMAIS
// dans /public : impossible de les deviner, impossible de les lier.
// ====================================================================

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getSessionCourante } from '@/lib/auth';
import { db } from '@/lib/db';

const DOSSIER_RACINE = join(process.cwd(), 'stockage');

export async function GET(requête: Request, contexte: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await getSessionCourante();
    if (!session) return new Response('Session requise.', { status: 401 });
    const { id } = await contexte.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return new Response('Identifiant invalide.', { status: 400 });

    const meta = await db.stockageFichier.findUnique({ where: { id } });
    if (!meta) return new Response('Fichier introuvable.', { status: 404 });

    // Cloisonnement : seul un membre de l'école (ou le super-admin) accède au fichier
    if (session.utilisateur.type !== 'super_admin' && session.utilisateur.ecoleId !== meta.ecoleId) {
      return new Response('Accès refusé.', { status: 403 });
    }

    const chemin = join(DOSSIER_RACINE, meta.chemin);
    if (!existsSync(chemin)) return new Response('Fichier absent du stockage.', { status: 404 });
    const contenu = readFileSync(chemin);
    return new Response(new Uint8Array(contenu), {
      headers: {
        'Content-Type': meta.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(meta.nomFichier)}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (e) {
    console.error('[fichiers GET]', e);
    return new Response('Erreur de lecture.', { status: 500 });
  }
}
