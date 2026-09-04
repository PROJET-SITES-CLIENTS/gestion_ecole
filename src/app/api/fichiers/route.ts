// ====================================================================
// A3 — TÉLÉVERSEMENT DE FICHIERS (documents élèves, justificatifs…)
// POST /api/fichiers (multipart) : stocke sous stockage/<ecole>/ avec nom
// aléatoire, journalise dans StockageFichier, retourne { url }.
// ====================================================================

import { mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';
import { getSessionCourante } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAction, ActionError } from '@/lib/business/commun';

const DOSSIER_RACINE = process.env.SG_STOCKAGE_DIR || join(process.cwd(), 'stockage');
const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo
const EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];

export async function POST(requête: Request) {
  try {
    const session = await getSessionCourante();
    if (!session) return Response.json({ ok: false, error: 'Session requise.' }, { status: 401 });
    const ecoleId = session.utilisateur.ecoleId;
    if (!ecoleId) return Response.json({ ok: false, error: 'Aucune école associée.' }, { status: 403 });

    const formulaire = await requête.formData();
    const fichier = formulaire.get('fichier');
    if (!(fichier instanceof File)) return Response.json({ ok: false, error: 'Fichier manquant.' }, { status: 400 });
    if (fichier.size > TAILLE_MAX) return Response.json({ ok: false, error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 400 });
    const ext = extname(fichier.name).toLowerCase();
    if (!EXTENSIONS.includes(ext)) {
      return Response.json({ ok: false, error: `Extension non autorisée (${ext}). Autorisées : ${EXTENSIONS.join(', ')}` }, { status: 400 });
    }

    // Répertoire propre à l'école + nom aléatoire (anti-traversée, anti-collision)
    const dossier = join(DOSSIER_RACINE, ecoleId);
    try { mkdirSync(dossier, { recursive: true }); } catch { return Response.json({ ok: false, error: 'Stockage non disponible sur cet hébergeur (read-only).' }, { status: 503 }); }
    const nomStocké = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}${ext}`;
    const chemin = join(dossier, nomStocké);
    writeFileSync(chemin, Buffer.from(await fichier.arrayBuffer()));

    const enregistré = await db.stockageFichier.create({
      data: {
        ecoleId,
        nomFichier: fichier.name.slice(0, 200),
        chemin: `${ecoleId}/${nomStocké}`,
        mimeType: fichier.type || 'application/octet-stream',
        tailleOctets: fichier.size,
        confidentiel: formulaire.get('confidentiel') !== 'false',
        cibleType: (formulaire.get('cibleType') as string) || null,
        cibleId: (formulaire.get('cibleId') as string) || null,
        uploadeParId: session.utilisateur.id,
      },
    });
    await logAction(db, ecoleId, session.utilisateur.id, 'fichier.televersement', 'stockage_fichier', enregistré.id, {
      nom: fichier.name, taille: fichier.size,
    });
    return Response.json({ ok: true, id: enregistré.id, url: `/api/fichiers/${enregistré.id}`, nomFichier: enregistré.nomFichier });
  } catch (e) {
    if (e instanceof ActionError) return Response.json({ ok: false, error: e.message }, { status: 400 });
    console.error('[fichiers POST]', e);
    return Response.json({ ok: false, error: 'Échec du téléversement.' }, { status: 500 });
  }
}
