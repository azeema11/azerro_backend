import cron from 'node-cron';
import { updateCurrencyRates } from '../services/currency_rates.service';

export const scheduleCurrencyRateRefresh = () => {
    // Run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log('[Currency Rates Refresh] Started job...');
        try {
            await updateCurrencyRates();
            console.log('[Currency Rates Refresh] Completed successfully');
        } catch (error) {
            console.error('[Currency Rates Refresh] Error:', error);
        }
    });
}; 