import cron from 'node-cron';
import { updateHoldingPrices } from '../services/price.service';

export const scheduleHoldingRefresh = () => {
  cron.schedule(process.env.HOLDING_REFRESH_CRON || '0 */6 * * *', async () => {
    console.log('[Holdings Refresh] Started job...');
    try {
      await updateHoldingPrices();
      console.log('[Holdings Refresh] Completed successfully');
    } catch (error) {
      console.error('[Holdings Refresh] Error:', error);
    }
  });
};