import cron from 'node-cron';
import { updateHoldingPrices } from '../services/price.service';

export const scheduleHoldingRefresh = () => {
  // Run every 6 hours by default, or use env variable
  const schedule = process.env.HOLDING_REFRESH_CRON || '0 */6 * * *';

  cron.schedule(schedule, async () => {
    console.log('[Holdings Refresh] Started job...');
    try {
      await updateHoldingPrices();
      console.log('[Holdings Refresh] Completed successfully');
    } catch (error) {
      console.error('[Holdings Refresh] Error:', error);
    }
  });
};