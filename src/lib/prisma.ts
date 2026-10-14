import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In development, Next.js server fast-refresh keeps PrismaClient in global memory.
// If a new model (like projectExpense) was added, the stale instance causes PrismaClientValidationError.
// Detect if the in-memory client lacks projectExpense and re-instantiate it cleanly.
const isClientStale =
  globalForPrisma.prisma &&
  !('projectExpense' in (globalForPrisma.prisma as unknown as Record<string, unknown>));

if (isClientStale) {
  try {
    globalForPrisma.prisma.$disconnect();
  } catch {}
  delete (globalForPrisma as any).prisma;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

