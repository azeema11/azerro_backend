import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Determine the correct connection string based on the environment
const databaseUrl = process.env.NODE_ENV === 'test'
    ? (process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5433/azerro_test?schema=public')
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
