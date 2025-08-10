import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Perform database maintenance operations to reclaim space and optimize performance
 * 
 * Environment Variables:
 * - DB_MAINTENANCE_FULL_VACUUM: Enable VACUUM FULL (blocking, requires exclusive lock)
 *   Default: false in production. Causes significant downtime as it rebuilds entire tables.
 *   Use only during maintenance windows.
 * 
 * - DB_MAINTENANCE_REINDEX: Enable REINDEX DATABASE (blocking, requires exclusive lock)
 *   Default: false in production. Causes downtime as it rebuilds all indexes.
 *   Use only during maintenance windows.
 * 
 * When these flags are disabled, safer alternatives are used:
 * - VACUUM (ANALYZE) instead of VACUUM FULL (non-blocking, reclaims some space)
 * - Individual REINDEX operations can be done later if needed
 */
export async function performDatabaseMaintenance() {
    console.log('🧹 Starting database maintenance operations...');

    // Read environment variables for blocking operations (default to false for safety)
    const enableFullVacuum = process.env.DB_MAINTENANCE_FULL_VACUUM?.toLowerCase() === 'true';
    const enableReindex = process.env.DB_MAINTENANCE_REINDEX?.toLowerCase() === 'true';

    console.log(`🔧 Configuration:`);
    console.log(`   VACUUM FULL enabled: ${enableFullVacuum} ${!enableFullVacuum ? '(using safer VACUUM ANALYZE)' : '(⚠️  BLOCKING OPERATION)'}`);
    console.log(`   REINDEX enabled: ${enableReindex} ${!enableReindex ? '(skipping for safety)' : '(⚠️  BLOCKING OPERATION)'}`);

    try {
        // Get database size before maintenance
        const sizeBefore = await getDatabaseSize();
        console.log(`📊 Database size before maintenance: ${sizeBefore}`);

        // Step 1: VACUUM operations
        if (enableFullVacuum) {
            // BLOCKING: VACUUM FULL requires exclusive lock, prevents all database access
            // Expected downtime: Several minutes to hours depending on database size
            console.log('🗑️  Running VACUUM FULL to reclaim deleted space (⚠️  BLOCKING - DATABASE UNAVAILABLE)...');
            await executeDbCommand('VACUUM FULL;');
            console.log('✅ VACUUM FULL completed');
        } else {
            // NON-BLOCKING: VACUUM (ANALYZE) is safe for production use
            console.log('🗑️  Running VACUUM (ANALYZE) to reclaim space and update statistics (non-blocking)...');
            await executeDbCommand('VACUUM (ANALYZE);');
            console.log('✅ VACUUM (ANALYZE) completed');
        }

        // Step 2: REINDEX operations
        if (enableReindex) {
            // BLOCKING: REINDEX DATABASE requires exclusive locks on all indexes
            // Expected downtime: Several minutes depending on index sizes
            console.log('🔧 Rebuilding indexes for optimal storage (⚠️  BLOCKING - DATABASE UNAVAILABLE)...');
            await executeDbCommand('REINDEX DATABASE azerro;');
            console.log('✅ REINDEX completed');
        } else {
            console.log('🔧 Skipping REINDEX DATABASE (use DB_MAINTENANCE_REINDEX=true to enable during maintenance window)');
        }

        // Step 3: ANALYZE to update table statistics (always safe to run)
        console.log('📈 Updating table statistics...');
        await executeDbCommand('ANALYZE;');
        console.log('✅ ANALYZE completed');

        // Get database size after maintenance
        const sizeAfter = await getDatabaseSize();
        console.log(`📊 Database size after maintenance: ${sizeAfter}`);

        // Calculate space saved
        const spaceSaved = calculateSpaceSaved(sizeBefore, sizeAfter);
        console.log(`💰 Space reclaimed: ${spaceSaved}`);

        console.log('🎉 Database maintenance completed successfully!');

        return {
            sizeBefore,
            sizeAfter,
            spaceSaved
        };

    } catch (error) {
        console.error('❌ Database maintenance failed:', error);
        throw error;
    }
}

/**
 * Create database connection using environment variables
 */
function createDbConnection(): Client {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    return new Client({
        connectionString: databaseUrl,
    });
}

/**
 * Execute a SQL command using the PostgreSQL client
 */
async function executeDbCommand(sql: string): Promise<string> {
    const client = createDbConnection();

    try {
        await client.connect();
        const result = await client.query(sql);

        // Handle different types of query results
        if (result.rows && result.rows.length > 0) {
            // For SELECT queries, format the output similar to psql
            if (result.rows.length === 1 && Object.keys(result.rows[0]).length === 1) {
                // Single column, single row result (like database size)
                return Object.values(result.rows[0])[0] as string;
            } else {
                // Multi-column or multi-row results
                const header = Object.keys(result.rows[0]).join(' | ');
                const rows = result.rows.map(row => {
                    return Object.values(row).join(' | ');
                }).join('\n');
                return header + '\n' + rows;
            }
        } else {
            // For DDL/DML queries, return the command tag
            return result.command || 'Command executed successfully';
        }
    } catch (error) {
        console.error(`❌ Failed to execute: ${sql}`);
        throw error;
    } finally {
        await client.end();
    }
}

async function getDatabaseSize(): Promise<string> {
    const sql = `SELECT pg_size_pretty(pg_database_size('azerro')) as size;`;
    const result = await executeDbCommand(sql);

    // With the new pg client implementation, single column results are returned directly
    return result.trim() || 'Unknown';
}

function calculateSpaceSaved(before: string, after: string): string {
    try {
        const beforeBytes = parseSizeToBytes(before);
        const afterBytes = parseSizeToBytes(after);

        if (beforeBytes === null || afterBytes === null) {
            return 'Unable to calculate space savings';
        }

        const savedBytes = beforeBytes - afterBytes;

        if (savedBytes > 0) {
            const percentage = Math.round((savedBytes / beforeBytes) * 100);
            const formattedSize = formatBytesToReadableSize(savedBytes);
            return `${formattedSize} (${percentage}% reduction)`;
        } else {
            return 'No significant space reduction detected';
        }
    } catch (error) {
        return 'Unable to calculate space savings';
    }
}

function parseSizeToBytes(sizeString: string): number | null {
    // Match numbers followed by optional whitespace and unit
    const match = sizeString.match(/(\d+(?:\.\d+)?)\s*(bytes?|kB|MB|GB)?/i);

    if (!match) {
        return null;
    }

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'bytes').toLowerCase();

    switch (unit) {
        case 'bytes':
        case 'byte':
            return value;
        case 'kb':
            return value * 1024;
        case 'mb':
            return value * 1024 * 1024;
        case 'gb':
            return value * 1024 * 1024 * 1024;
        default:
            return null;
    }
}

function formatBytesToReadableSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(2)} kB`;
    } else {
        return `${bytes} bytes`;
    }
}

/**
 * Get detailed table size information
 */
export async function getTableSizeReport(): Promise<void> {
    console.log('📊 Generating table size report...');

    const sql = `
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size((quote_ident(schemaname) || '.' || quote_ident(tablename))::regclass)) as size,
            pg_total_relation_size((quote_ident(schemaname) || '.' || quote_ident(tablename))::regclass) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size((quote_ident(schemaname) || '.' || quote_ident(tablename))::regclass) DESC;
    `;

    try {
        const result = await executeDbCommand(sql);
        console.log('📋 Table sizes:');
        console.log(result);
    } catch (error) {
        console.error('❌ Failed to get table size report:', error);
    }
}

/**
 * Get index size information
 */
export async function getIndexSizeReport(): Promise<void> {
    console.log('🔍 Generating index size report...');

    const sql = `
        SELECT 
            indexname,
            pg_size_pretty(pg_relation_size(to_regclass('public.' || quote_ident(indexname)))) as index_size,
            pg_relation_size(to_regclass('public.' || quote_ident(indexname))) as size_bytes
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND to_regclass('public.' || quote_ident(indexname)) IS NOT NULL
        AND pg_relation_size(to_regclass('public.' || quote_ident(indexname))) > 0
        ORDER BY pg_relation_size(to_regclass('public.' || quote_ident(indexname))) DESC;
    `;

    try {
        const result = await executeDbCommand(sql);
        console.log('📋 Index sizes:');
        console.log(result);
    } catch (error) {
        console.error('❌ Failed to get index size report:', error);
    }
}

// Run if called directly
if (require.main === module) {
    const main = async () => {
        try {
            // Show current state
            await getTableSizeReport();
            await getIndexSizeReport();

            console.log('\n' + '='.repeat(50));

            // Perform maintenance
            const results = await performDatabaseMaintenance();

            console.log('\n' + '='.repeat(50));

            // Show final state
            await getTableSizeReport();
            await getIndexSizeReport();

            console.log('\n🎯 Maintenance Summary:');
            console.log(`   Before: ${results.sizeBefore}`);
            console.log(`   After:  ${results.sizeAfter}`);
            console.log(`   Saved:  ${results.spaceSaved}`);

        } catch (error) {
            console.error('💥 Maintenance script failed:', error);
            process.exit(1);
        }
    };

    main();
}
