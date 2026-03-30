// This file runs before each test file worker starts.
// By overriding environment variables here, we ensure that any test
// that initializes the Prisma client will connect to the test database.
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5433/azerro_test?schema=public';
