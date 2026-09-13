// ====================================================================
// GÉNÉRATION DE DOCUMENTS — GET /api/documents/[code]?eleveId=…&auto=1
// Session requise + tenant + permission du modèle. Retourne une page
// HTML imprimable A4 (charte complète) et journalise la production.
// ====================================================================

import { getSessionCourante } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAction } from '@/lib/business/commun';
import { avecRetryBdd } from '@/lib/retry-bdd';
import { trouverModele } from '@/lib/documents/registre';
import { resoudreIdentite, enTeteMajeur, enTeteMineur, enTeteFinancier, piedDePage, pageHtml, reference } from '@/lib/documents/charte';

export async function GET(requête: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await getSessionCourante();
    if (!session) return new Response('Session requise.', { status: 401 });
    const ecoleId = session.utilisateur.ecoleId;
    if (!ecoleId) return new Response('Aucune école associée.', { status: 403 });

    const { code } = await params;
    const modele = trouverModele(code);
    if (!modele) return new Response('Type de document inconnu.', { status: 404 });

    // Permission (super_admin : tout voir)
    if (modele.permission && session.utilisateur.type !== 'super_admin' && !session.permissions.has(modele.permission)) {
      return new Response(`Permission requise : ${modele.permission}.`, { status: 403 });
    }

    // Paramètres depuis la query string
    const url = new URL(requête.url);
    const p: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { if (k !== 'auto' && v) p[k] = v; });
    for (const param of modele.parametres) {
      if (param.requis && !p[param.cle]) {
        return new Response(`Paramètre manquant : ${param.libelle} (${param.cle}).`, { status: 400 });
      }
    }

    const identite = await avecRetryBdd(() => resoudreIdentite(ecoleId), 3, 400);
    const ref = reference(modele.code);
    const r = await modele.generer({ ctx: { utilisateurId: session.utilisateur.id, ecoleId, type: session.utilisateur.type, permissions: session.permissions }, identite, p });

    // En-tête selon la variante du modèle
    const entete = modele.entete === 'mineur'
      ? enTeteMineur(identite, { type: modele.libelle, numero: ref })
      : modele.entete === 'financier'
        ? enTeteFinancier(identite, { type: modele.libelle, piece: ref })
        : enTeteMajeur(identite, { type: modele.libelle, ref, sousTitre: r.sousTitre });

    const html = pageHtml({
      identite,
      entete,
      titre: modele.entete === 'majeur' ? r.titre : undefined,
      corps: r.corps,
      pied: piedDePage(identite, { ref, confidentiel: modele.confidential, page: true }),
      autoImprimer: url.searchParams.get('auto') === '1',
      filigrane: modele.filigrane,
    });

    // Journaliser la production (DocumentGenere, sans fichier disque : HTML
    // rendu à la demande — la trace conserve cible + modèle + auteur)
    const cible = p.eleveId || p.personnelId || p.classeId || p.paiementId || '';
    await avecRetryBdd(() => db.documentGenere.create({
      data: {
        ecoleId,
        cibleType: modele.code,
        cibleId: cible,
        titre: `${modele.libelle}${r.sousTitre ? ' — ' + r.sousTitre : ''}`,
        format: 'html',
        fichierUrl: `/api/documents/${modele.code}?${url.searchParams.toString()}`,
        genereParId: session.utilisateur.id,
      },
    }).catch(() => {}), 2, 300);
    await logAction(db, ecoleId, session.utilisateur.id, 'document.generation', modele.code, cible || undefined, { ref }).catch(() => {});

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur de génération.';
    return new Response(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Document indisponible</title></head>
      <body style="font-family:sans-serif;padding:40px;text-align:center;color:#333">
        <h2 style="color:#b91c1c">Document indisponible</h2>
        <p style="max-width:520px;margin:14px auto">${message}</p>
        <p style="font-size:13px;color:#777">Corrigez les informations demandées puis relancez la génération.</p>
      </body></html>`, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
