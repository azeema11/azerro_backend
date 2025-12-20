"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCurrencyRateRefresh = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const currency_rates_service_1 = require("../services/currency_rates.service");
const scheduleCurrencyRateRefresh = () => {
    // Run every 6 hours
    node_cron_1.default.schedule('0 */6 * * *', async () => {
        console.log('[Currency Rates Refresh] Started job...');
        try {
            await (0, currency_rates_service_1.updateCurrencyRates)();
            console.log('[Currency Rates Refresh] Completed successfully');
        }
        catch (error) {
            console.error('[Currency Rates Refresh] Error:', error);
        }
    });
};
exports.scheduleCurrencyRateRefresh = scheduleCurrencyRateRefresh;
