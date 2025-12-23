import cron from 'node-cron';
import { updateHoldingPrices } from '../services/price.service';

export const scheduleHoldingRefresh = () => {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Holdings Refresh] Started job...');
    try {
      await updateHoldingPrices();
      console.log('[Holdings Refresh] Completed successfully');
    } catch (error) {
      console.error('[Holdings Refresh] Error:', error);
    }
  });
};