import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

// The global setup runs in a separate process in vitest,
// so process.env overrides here don't naturally propagate to test workers.
// We explicitly set the URL here so the prisma CLI operations work on the test db.
const TEST_DB_URL = 'postgresql://postgres:password@localhost:5433/azerro_test?schema=public';

export const setup = async () => {
    // We want to ensure that tests hitting a real DB use the test database
    console.log('Running test database setup...');

    // Temporarily point Prisma CLI to the test DB
    process.env.DATABASE_URL = TEST_DB_URL;

    // Push the schema directly to the test DB to ensure it matches current Prisma schema
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: TEST_DB_URL } });
    console.log('Test database setup complete.');
};

export const teardown = async () => {
    console.log('Tearing down test database...');
    // Ensure we are connecting to the test DB for teardown
    process.env.DATABASE_URL = TEST_DB_URL;
    const prisma = new PrismaClient({
        datasources: {
            db: { url: TEST_DB_URL }
        }
    });

    // Clean up all tables
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter((name) => name !== '_prisma_migrations')
        .map((name) => `"public"."${name}"`)
        .join(', ');

    try {
        if (tables.length > 0) {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
        }
    } catch (error) {
        console.error({ error });
    } finally {
        await prisma.$disconnect();
    }
    console.log('Test database teardown complete.');
};
