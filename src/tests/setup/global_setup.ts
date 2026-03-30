import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load variables from .env if running locally
dotenv.config();

export const setup = async () => {
    // We want to ensure that tests hitting a real DB use the test database
    console.log('Running test database setup...');

    // Fallback URL for safety if the user forgot to add it to .env
    const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5433/azerro_test?schema=public';

    // Push the schema directly to the test DB to ensure it matches current Prisma schema
    // We override DATABASE_URL here specifically for the Prisma CLI since `npx prisma`
    // reads from DATABASE_URL.

    // In CI or sandbox environments where test DB isn't running, we catch the error
    // so unit tests can still run without a DB
    try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'pipe', env: { ...process.env, DATABASE_URL: testDbUrl } });
        console.log('Test database setup complete.');
    } catch (e) {
        console.log('Could not connect to test database. Integration tests may fail, but unit tests will run.');
    }
};

export const teardown = async () => {
    console.log('Tearing down test database...');

    const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5433/azerro_test?schema=public';

    const prisma = new PrismaClient({
        datasources: {
            db: { url: testDbUrl }
        }
    });

    try {
        // Clean up all tables
        const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

        const tables = tablenames
            .map(({ tablename }) => tablename)
            .filter((name) => name !== '_prisma_migrations')
            .map((name) => `"public"."${name}"`)
            .join(', ');

        if (tables.length > 0) {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
        }
        console.log('Test database teardown complete.');
    } catch (error) {
        console.log('Skipping test database teardown: Database not reachable.');
    } finally {
        await prisma.$disconnect();
    }
};
