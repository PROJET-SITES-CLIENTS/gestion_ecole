import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG_QUERY === '1' ? ['query'] : ['error'],
  })

// pas besoin des pragmas SQLite (WAL/busy_timeout).

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
