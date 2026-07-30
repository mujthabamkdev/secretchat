import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
});

// Always assign so it persists across Next.js hot reloads
globalForPrisma.prisma = prisma;

export default prisma;
