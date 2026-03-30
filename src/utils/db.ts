import { PrismaClient } from '@prisma/client';

// Determine the correct connection string based on the environment
const databaseUrl = process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

// Initialize Prisma with the determined connection URL
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
});

export default prisma;
