// ====================================================================
// A3 — LECTURE D'UN FICHIER STOCKÉ : sert le fichier APRÈS vérification de
// session + appartenance école. Les fichiers confidentiels ne sont JAMAIS
// dans /public : impossible de les deviner, impossible de les lier.
// ====================================================================

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getSessionCourante } from '@/lib/auth';
import { db } from '@/lib/db';

const DOSSIER_RACINE = process.env.SG_STOCKAGE_DIR || join(process.cwd(), 'stockage');

export async function GET(requête: Request, contexte: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await getSessionCourante();
    if (!session) return new Response('Session requise.', { status: 401 });
    const { id } = await contexte.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return new Response('Identifiant invalide.', { status: 400 });

    const meta = await db.stockageFichier.findUnique({ where: { id } });
    if (!meta) {
      // AUDIT DOSSIER — fallback : pièce du dossier élève stockée en base
      // (DocumentEleve.contenu) — sert les imports numériques sans dépendre
      // d'un disque (compatible Vercel serverless).
      return await servirDocumentEleve(id, session);
    }

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

/** Sert une pièce importée du dossier d'un élève (contenu en base). */
async function servirDocumentEleve(id: string, session: NonNullable<Awaited<ReturnType<typeof getSessionCourante>>>) {
  const doc = await db.documentEleve.findUnique({
    where: { id },
    include: { eleve: { select: { id: true, ecoleId: true } } },
  });
  if (!doc || !doc.contenu) return new Response('Fichier introuvable.', { status: 404 });

  const u = session.utilisateur;
  let autorisé = u.type === 'super_admin';
  if (!autorisé && u.type !== 'eleve' && u.ecoleId === doc.eleve.ecoleId) autorisé = true;
  if (!autorisé && u.type === 'parent') {
    const parent = await db.parentTuteur.findFirst({ where: { utilisateurId: u.id } });
    if (parent) {
      const lien = await db.eleveParent.findUnique({
        where: { eleveId_parentId: { eleveId: doc.eleveId, parentId: parent.id } },
      });
      autorisé = Boolean(lien);
    }
  }
  if (!autorisé) return new Response('Accès refusé.', { status: 403 });

  const octets = Buffer.from(doc.contenu);
  return new Response(new Uint8Array(octets), {
    headers: {
      'Content-Type': doc.mimeType ?? 'application/octet-stream',
      'Content-Length': String(octets.length),
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.nomFichier ?? 'document')}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
