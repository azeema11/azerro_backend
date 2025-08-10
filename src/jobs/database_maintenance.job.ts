import cron from 'node-cron';
import { performDatabaseMaintenance } from '../scripts/database_maintenance';

export const scheduleDatabaseMaintenance = () => {
    // Run on the 1st day of every month at 2:00 AM
    // Format: '0 2 1 * *' = minute hour day month dayOfWeek
    cron.schedule('0 2 1 * *', async () => {
        console.log('[Database Maintenance] Starting monthly maintenance job...');
        try {
            const results = await performDatabaseMaintenance();
            console.log('[Database Maintenance] Completed successfully');
            console.log(`[Database Maintenance] Results:`, {
                sizeBefore: results.sizeBefore,
                sizeAfter: results.sizeAfter,
                spaceSaved: results.spaceSaved
            });
        } catch (error) {
            console.error('[Database Maintenance] Error:', error);
            // Don't crash the application on maintenance failure
            console.error('[Database Maintenance] Continuing with application...');
        }
    }, {
        timezone: "UTC" // Use UTC to avoid timezone issues
    });

    console.log('📅 Monthly database maintenance scheduled for 1st of each month at 2:00 AM UTC');
};
