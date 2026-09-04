import { PrismaClient } from '@prisma/client'

// ====================================================================
// CLIENT PRISMA — durci pour Neon / serverless :
//  • connect_timeout=30  : tolère le réveil du compute Neon (autosuspend)
//  • pool_timeout=60     : attend une connexion du pool avant d'échouer
//  • connection_limit=10 : borne la rafale de connexions parallèles
//    (le pooler Neon multiplexe de toute façon au-delà)
// Les paramètres sont AJOUTÉS à l'URL existante sans la modifier.
// ====================================================================

function urlDurcie(url: string | undefined): string | undefined {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  const manquants = [
    !/connect_timeout=/.test(url) && 'connect_timeout=30',
    !/pool_timeout=/.test(url) && 'pool_timeout=60',
    !/connection_limit=/.test(url) && 'connection_limit=10',
  ].filter(Boolean) as string[];
  if (manquants.length === 0) return url;
  return url + sep + manquants.join('&');
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const urlBdd = urlDurcie(process.env.DATABASE_URL)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG_QUERY === '1' ? ['query'] : ['error'],
    datasources: urlBdd ? { db: { url: urlBdd } } : undefined,
  })

// pas besoin des pragmas SQLite (WAL/busy_timeout).

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
