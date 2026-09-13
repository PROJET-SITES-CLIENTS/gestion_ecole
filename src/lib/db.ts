import { PrismaClient } from '@prisma/client'

// ====================================================================
// CLIENT PRISMA — durci pour Neon / serverless
// ====================================================================

function urlDurcie(url) {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  const manquants = [
    !/connect_timeout=/.test(url) && 'connect_timeout=30',
    !/pool_timeout=/.test(url) && 'pool_timeout=60',
    !/connection_limit=/.test(url) && 'connection_limit=10',
  ].filter(Boolean);
  if (manquants.length === 0) return url;
  return url + sep + manquants.join('&');
}

const globalForPrisma = globalThis;
const urlBdd = urlDurcie(process.env.DATABASE_URL);

const prismaBase =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG_QUERY === '1' ? ['query'] : ['error'],
    datasources: urlBdd ? { db: { url: urlBdd } } : undefined,
  });

// ====================================================================
// EXTENSION AUTO-VERSIONING SSE (Correction critique de Performance)
// 
// Problème : /api/flux exécutait 8 COUNT(*) toutes les 10 secondes
// par utilisateur connecté = DDoS auto-infligé sur PostgreSQL.
//
// Solution : chaque mutation sur une table métier incrémente
// silencieusement Ecole.versionData.
// /api/flux ne lit QUE ce champ -> 1 requête SELECT ultra-légère.
// ====================================================================

function extraireEcoleId(args) {
  const data = args?.data;
  const where = args?.where;
  return (data?.ecoleId ?? where?.ecoleId ?? null);
}

const TABLES_SURVEILLEES = new Set([
  'paiement', 'depense', 'notification', 'incidentScolaire',
  'conge', 'passageInfirmerie', 'auditLog', 'visiteur',
  'presence', 'bulletin', 'message', 'evaluationCompetence',
]);

const MUTATIONS = new Set([
  'create', 'createMany', 'update', 'updateMany',
  'delete', 'deleteMany', 'upsert',
]);

export const db = prismaBase.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args);
        if (
          model &&
          TABLES_SURVEILLEES.has(model.charAt(0).toLowerCase() + model.slice(1)) &&
          MUTATIONS.has(operation)
        ) {
          const ecoleId = extraireEcoleId(args);
          if (ecoleId) {
            // Fire-and-forget : ne bloque JAMAIS le retour de la mutation métier
            prismaBase.ecole.updateMany({
              where: { id: ecoleId },
              data: { versionData: { increment: 1 } },
            }).catch(() => {});
          }
        }
        return result;
      },
    },
  },
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaBase;
