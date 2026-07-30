import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: any;
};

function getOrCreatePrisma(): any {
    if (!globalForPrisma.prisma || !globalForPrisma.prisma.topic) {
        globalForPrisma.prisma = new PrismaClient({
            log: ['error'],
        });
    }
    return globalForPrisma.prisma;
}

const prismaHandler: ProxyHandler<object> = {
    get(_target: object, prop: string | symbol) {
        const client = getOrCreatePrisma();
        const value = client[prop as keyof typeof client];
        if (value !== undefined) {
            if (typeof value === 'function') {
                return value.bind(client);
            }
            return value;
        }
        // Fallback case: match case-insensitively if property delegate is somehow detached
        if (typeof prop === 'string') {
            const lowerProp = prop.toLowerCase();
            for (const key of Object.keys(client)) {
                if (key.toLowerCase() === lowerProp) {
                    const model = client[key];
                    return typeof model === 'function' ? model.bind(client) : model;
                }
            }
        }
        return undefined;
    }
};

const prisma = new Proxy({}, prismaHandler) as unknown as PrismaClient;

export default prisma;
