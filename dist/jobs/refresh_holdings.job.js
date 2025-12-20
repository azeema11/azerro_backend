"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleHoldingRefresh = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const price_service_1 = require("../services/price.service");
const scheduleHoldingRefresh = () => {
    // Run every 6 hours
    node_cron_1.default.schedule('0 */6 * * *', async () => {
        console.log('[Holdings Refresh] Started job...');
        try {
            await (0, price_service_1.updateHoldingPrices)();
            console.log('[Holdings Refresh] Completed successfully');
        }
        catch (error) {
            console.error('[Holdings Refresh] Error:', error);
        }
    });
};
exports.scheduleHoldingRefresh = scheduleHoldingRefresh;
