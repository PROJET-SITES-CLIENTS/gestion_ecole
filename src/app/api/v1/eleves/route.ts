// ====================================================================
// B12 — API PUBLIQUE v1 (tokens ApiToken, lecture seule)
// GET /api/v1/eleves : liste élèves de l'école du token
//   Auth : Authorization: Bearer sg_live_<prefix><secret> (sha256 stocké)
//   Journalisation dans ApiTokenLog + compteur totalRequettes.
// ====================================================================

import { createHash } from 'crypto';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function authentifier(enTete: string | null) {
  if (!enTete?.startsWith('Bearer sg_')) return null;
  const brut = enTete.slice('Bearer '.length);
  const tokenHash = createHash('sha256').update(brut).digest('hex');
  const apiToken = await db.apiToken.findFirst({ where: { tokenHash, actif: true } });
  if (!apiToken) return null;
  if (apiToken.dateExpiration && apiToken.dateExpiration < new Date()) return null;
  const portées = JSON.parse(apiToken.scopes || '[]') as string[];
  if (!portées.includes('eleves:read')) return null;
  return apiToken;
}

export async function GET(requête: Request) {
  const debut = Date.now();
  const apiToken = await authentifier(requête.headers.get('authorization'));
  if (!apiToken || !apiToken.ecoleId) {
    return Response.json({ ok: false, error: 'Token invalide, inactif ou sans portée eleves:read.' }, { status: 401 });
  }

  const eleves = await db.eleve.findMany({
    where: { ecoleId: apiToken.ecoleId, deletedAt: null },
    select: { id: true, matricule: true, nom: true, prenom: true, statut: true, classeActuelleId: true },
    take: 500,
  });

  // Journalisation
  await db.apiTokenLog.create({
    data: { apiTokenId: apiToken.id, endpoint: '/api/v1/eleves', methode: 'GET', statut: 200, tempsReponse: Date.now() - debut },
  }).catch(() => {});
  await db.apiToken.update({
    where: { id: apiToken.id },
    data: { dernierUsage: new Date(), totalRequettes: { increment: 1 } },
  }).catch(() => {});

  return Response.json({ ok: true, total: eleves.length, eleves });
}
