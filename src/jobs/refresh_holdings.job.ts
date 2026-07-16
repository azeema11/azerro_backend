import cron from 'node-cron';
import { updateHoldingPrices } from '../services/price.service';
import prisma from '../utils/db';
import { indmoneyService } from '../services/brokers/indmoney.service';

export const scheduleHoldingRefresh = () => {
  cron.schedule(process.env.HOLDING_REFRESH_CRON || '30 12,22 * * *', async () => {
    console.log('[Holdings Refresh] Started job...');
    try {
      // Define the general metal price update task
      const metalPricesTask = (async (): Promise<boolean> => {
        try {
          console.log('[Holdings Refresh] Starting general metal prices update...');
          await updateHoldingPrices();
          console.log('[Holdings Refresh] Completed general metal prices update');
          return true;
        } catch (err) {
          console.error('[Holdings Refresh] Error updating metal prices:', err);
          return false;
        }
      })();

      // Define the INDmoney sync task
      const indmoneySyncTask = (async (): Promise<boolean> => {
        try {
          console.log('[Holdings Refresh] Starting INDmoney background sync...');
          const connections = await prisma.userMemory.findMany({
            where: {
              category: 'broker_connection',
              key: 'indmoney',
            },
          });

          let successCount = 0;
          let failureCount = 0;

          // Sync users sequentially to prevent database/API concurrency issues
          for (const conn of connections) {
            const val = conn.value as any;
            if (val && val.connected) {
              try {
                console.log(`[Holdings Refresh] Syncing INDmoney for user ${conn.userId}...`);
                await indmoneyService.syncHoldings(conn.userId);
                successCount++;
              } catch (err) {
                console.error(`[Holdings Refresh] Failed to sync INDmoney for user ${conn.userId}:`, err);
                failureCount++;
              }
            }
          }

          console.log(`[Holdings Refresh] INDmoney background sync completed. Success: ${successCount}, Failures: ${failureCount}`);
          return failureCount === 0;
        } catch (err) {
          console.error('[Holdings Refresh] Error in INDmoney background sync:', err);
          return false;
        }
      })();

      // Execute both tasks in parallel
      const [metalSuccess, indmoneySuccess] = await Promise.all([metalPricesTask, indmoneySyncTask]);
      if (metalSuccess && indmoneySuccess) {
        console.log('[Holdings Refresh] All background refresh tasks completed successfully');
      } else if (!metalSuccess && !indmoneySuccess) {
        console.error('[Holdings Refresh] All background refresh tasks failed');
      } else {
        console.warn(`[Holdings Refresh] Background refresh completed with partial failures. Metal update: ${metalSuccess ? 'Success' : 'Failed'}, INDmoney sync: ${indmoneySuccess ? 'Success' : 'Failed'}`);
      }
    } catch (error) {
      console.error('[Holdings Refresh] Global job error:', error);
    }
  });
};