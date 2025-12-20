"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCurrencyRates = updateCurrencyRates;
exports.ensureCurrencyRatesExist = ensureCurrencyRatesExist;
exports.getHistoricalExchangeRate = getHistoricalExchangeRate;
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("../utils/db"));
async function updateCurrencyRates(base = 'USD') {
    try {
        // Validate base currency format (must be 3 uppercase letters)
        const currencyCodePattern = /^[A-Z]{3}$/;
        if (!currencyCodePattern.test(base)) {
            throw new Error(`Invalid base currency format: ${base}. Must be 3 uppercase letters (e.g., USD, EUR)`);
        }
        console.log(`Fetching currency rates for base: ${base}`);
        const res = await axios_1.default.get(`https://api.fxratesapi.com/latest?base=${base}`);
        if (!res.data || !res.data.rates) {
            console.error('Invalid API response structure');
            return await usePreviousDayRates(base);
        }
        const rates = res.data.rates;
        console.log(`Found ${Object.keys(rates).length} exchange rates`);
        // Get today's date for historical record
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Set to UTC midnight for consistency
        // Filter out invalid currencies:
        // 1. Target equals base (database constraint prevents same currency pairs)
        // 2. Currency codes that don't match 3-letter format (database constraint requires ^[A-Z]{3}$)
        // Note: Same currency conversions (e.g., USD to USD) are handled in getHistoricalExchangeRate by returning 1.0
        const completeRates = Object.fromEntries(Object.entries(rates).filter(([target]) => target !== base && currencyCodePattern.test(target)));
        // Save to both current rates and historical rates
        const currentRateOps = Object.entries(completeRates).map(([target, rate]) => db_1.default.currencyRate.upsert({
            where: {
                base_target: {
                    base,
                    target,
                },
            },
            update: { rate },
            create: {
                base,
                target,
                rate,
            },
        }));
        const historicalRateOps = Object.entries(completeRates).map(([target, rate]) => db_1.default.currencyRateHistory.upsert({
            where: {
                base_target_rateDate: {
                    base,
                    target,
                    rateDate: today,
                },
            },
            update: { rate },
            create: {
                base,
                target,
                rate,
                rateDate: today,
            },
        }));
        await db_1.default.$transaction([...currentRateOps, ...historicalRateOps]);
        console.log(`✅ Currency rates updated successfully for base ${base} (current + historical)`);
        return true;
    }
    catch (err) {
        console.error(`❌ Failed to fetch currency rates:`, err);
        return await usePreviousDayRates(base);
    }
}
/**
 * Use previous day's rates when current day's API fetch fails
 * Copies the most recent historical rates to today's date
 */
async function usePreviousDayRates(base = 'USD') {
    try {
        console.log(`Using previous day's rates for base: ${base}...`);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        // Find the most recent date before today that has rates
        const mostRecentRateDate = await db_1.default.currencyRateHistory.findFirst({
            where: {
                base,
                rateDate: { lt: today },
            },
            orderBy: { rateDate: 'desc' },
            select: { rateDate: true },
        });
        if (!mostRecentRateDate) {
            throw new Error(`No previous rates found for base ${base}`);
        }
        // Get all rates from the most recent date
        const previousRates = await db_1.default.currencyRateHistory.findMany({
            where: {
                base,
                rateDate: mostRecentRateDate.rateDate,
            },
        });
        if (previousRates.length === 0) {
            throw new Error(`No rates found for previous date ${mostRecentRateDate.rateDate}`);
        }
        // Copy previous rates to both current and today's historical records
        const currentRateOps = previousRates.map(prevRate => db_1.default.currencyRate.upsert({
            where: {
                base_target: {
                    base: prevRate.base,
                    target: prevRate.target,
                },
            },
            update: { rate: prevRate.rate },
            create: {
                base: prevRate.base,
                target: prevRate.target,
                rate: prevRate.rate,
            },
        }));
        const historicalRateOps = previousRates.map(prevRate => db_1.default.currencyRateHistory.upsert({
            where: {
                base_target_rateDate: {
                    base: prevRate.base,
                    target: prevRate.target,
                    rateDate: today,
                },
            },
            update: { rate: prevRate.rate },
            create: {
                base: prevRate.base,
                target: prevRate.target,
                rate: prevRate.rate,
                rateDate: today,
            },
        }));
        await db_1.default.$transaction([...currentRateOps, ...historicalRateOps]);
        console.log(`✅ Used previous day's rates (${previousRates.length} rates) from ${mostRecentRateDate.rateDate.toISOString().split('T')[0]} for base ${base}`);
        return true;
    }
    catch (err) {
        console.error(`❌ Failed to use previous day's rates for base ${base}:`, err);
        return false;
    }
}
async function ensureCurrencyRatesExist() {
    try {
        const currentRatesCount = await db_1.default.currencyRate.count();
        // Check if we have historical rates for today
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayHistoricalCount = await db_1.default.currencyRateHistory.count({
            where: { rateDate: today }
        });
        // If no current rates OR no historical rates for today, fetch fresh rates
        if (currentRatesCount === 0 || todayHistoricalCount === 0) {
            if (currentRatesCount === 0) {
                console.log('No current currency rates found, fetching initial rates...');
            }
            else {
                console.log(`Found ${currentRatesCount} current rates but no historical rates for today, fetching fresh rates...`);
            }
            const success = await updateCurrencyRates('USD');
            if (!success) {
                throw new Error('Failed to fetch currency rates and no existing rates available');
            }
        }
        else {
            console.log(`Found ${currentRatesCount} current currency rates and ${todayHistoricalCount} historical rates for today`);
        }
    }
    catch (err) {
        console.error(`❌ Failed to ensure currency rates exist:`, err);
        throw err; // Re-throw to indicate critical failure
    }
}
/**
 * Get historical exchange rate for a specific date
 * Falls back to closest previous available date if exact date not found
 * Throws error if no rate is available (ensures data integrity)
 */
async function getHistoricalExchangeRate(from, to, date) {
    try {
        if (from === to)
            return 1.0;
        // Normalize date to UTC midnight
        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);
        // Try to find exact date first
        let rateRecord = await db_1.default.currencyRateHistory.findUnique({
            where: {
                base_target_rateDate: {
                    base: from,
                    target: to,
                    rateDate: targetDate,
                },
            },
        });
        // If exact date not found, try to find the closest previous date
        if (!rateRecord) {
            rateRecord = await db_1.default.currencyRateHistory.findFirst({
                where: {
                    base: from,
                    target: to,
                    rateDate: { lte: targetDate },
                },
                orderBy: { rateDate: 'desc' },
            });
        }
        // If still no historical rate found, this indicates a data integrity issue
        if (!rateRecord) {
            throw new Error(`No historical exchange rate found for ${from} to ${to} on or before ${targetDate.toISOString().split('T')[0]}. ` +
                `This indicates missing currency rate data that should be populated during deployment.`);
        }
        return typeof rateRecord.rate === 'number' ? rateRecord.rate : rateRecord.rate.toNumber();
    }
    catch (error) {
        console.error(`Error getting historical exchange rate from ${from} to ${to} for ${date}:`, error);
        throw error; // Re-throw to maintain error context
    }
}
