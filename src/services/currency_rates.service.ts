import prisma from '../utils/db';
import { safeGet, safeSetex, safeBatchSetex } from '../utils/redis';

type ExchangeRateResponse = {
    base: string;
    rates: Record<string, number>;
};

export async function updateCurrencyRates(base = 'USD') {
    try {
        // Validate base currency format (must be 3 uppercase letters)
        const currencyCodePattern = /^[A-Z]{3}$/;
        if (!currencyCodePattern.test(base)) {
            throw new Error(`Invalid base currency format: ${base}. Must be 3 uppercase letters (e.g., USD, EUR)`);
        }

        console.log(`Fetching currency rates for base: ${base}`);
        const response = await fetch(`https://api.fxratesapi.com/latest?base=${base}`);
        
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return await usePreviousDayRates(base);
        }

        const data: ExchangeRateResponse = await response.json();

        if (!data || !data.rates) {
            console.error('Invalid API response structure');
            return await usePreviousDayRates(base);
        }

        const rates = data.rates;
        console.log(`Found ${Object.keys(rates).length} exchange rates`);

        // Get today's date for historical record
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Set to UTC midnight for consistency

        // Filter out invalid currencies:
        // 1. Target equals base (database constraint prevents same currency pairs)
        // 2. Currency codes that don't match 3-letter format (database constraint requires ^[A-Z]{3}$)
        // Note: Same currency conversions (e.g., USD to USD) are handled in getHistoricalExchangeRate by returning 1.0
        const completeRates = Object.fromEntries(
            Object.entries(rates).filter(([target]) =>
                target !== base && currencyCodePattern.test(target)
            )
        );

        // Save to both current rates and historical rates
        const currentRateOps = Object.entries(completeRates).map(([target, rate]) =>
            prisma.currencyRate.upsert({
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
            })
        );

        const historicalRateOps = Object.entries(completeRates).map(([target, rate]) =>
            prisma.currencyRateHistory.upsert({
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
            })
        );

        await prisma.$transaction([...currentRateOps, ...historicalRateOps]);

        // Cache rates in Redis with expiration at UTC midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCHours(24, 0, 0, 0); // Midnight next day
        const ttlSeconds = Math.max(1, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));

        const entries = Object.entries(completeRates).map(([target, rate]) => ({
            key: `rate:${base}:${target}`,
            ttl: ttlSeconds,
            value: rate,
        }));
        await safeBatchSetex(entries);
        console.log(`✅ Currency rates cached in Redis for base ${base} (TTL: ${ttlSeconds}s)`);

        console.log(`✅ Currency rates updated successfully for base ${base} (current + historical)`);
        return true;
    } catch (err) {
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
        const mostRecentRateDate = await prisma.currencyRateHistory.findFirst({
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
        const previousRates = await prisma.currencyRateHistory.findMany({
            where: {
                base,
                rateDate: mostRecentRateDate.rateDate,
            },
        });

        if (previousRates.length === 0) {
            throw new Error(`No rates found for previous date ${mostRecentRateDate.rateDate}`);
        }

        // Copy previous rates to both current and today's historical records
        const currentRateOps = previousRates.map(prevRate =>
            prisma.currencyRate.upsert({
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
            })
        );

        const historicalRateOps = previousRates.map(prevRate =>
            prisma.currencyRateHistory.upsert({
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
            })
        );

        await prisma.$transaction([...currentRateOps, ...historicalRateOps]);

        // Cache rates in Redis with expiration at UTC midnight
        const nowTime = new Date();
        const tomorrowTime = new Date(nowTime);
        tomorrowTime.setUTCHours(24, 0, 0, 0);
        const ttlSeconds = Math.max(1, Math.floor((tomorrowTime.getTime() - nowTime.getTime()) / 1000));

        const entries = previousRates.map(prevRate => ({
            key: `rate:${prevRate.base}:${prevRate.target}`,
            ttl: ttlSeconds,
            value: typeof prevRate.rate === 'number' ? prevRate.rate : prevRate.rate.toNumber(),
        }));
        await safeBatchSetex(entries);
        console.log(`✅ Previous day currency rates cached in Redis for base ${base} (TTL: ${ttlSeconds}s)`);

        console.log(`✅ Used previous day's rates (${previousRates.length} rates) from ${mostRecentRateDate.rateDate.toISOString().split('T')[0]} for base ${base}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to use previous day's rates for base ${base}:`, err);
        return false;
    }
}

export async function ensureCurrencyRatesExist() {
    try {
        const currentRatesCount = await prisma.currencyRate.count();

        // Check if we have historical rates for today
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const todayHistoricalCount = await prisma.currencyRateHistory.count({
            where: { rateDate: today }
        });

        // If no current rates OR no historical rates for today, fetch fresh rates
        if (currentRatesCount === 0 || todayHistoricalCount === 0) {
            if (currentRatesCount === 0) {
                console.log('No current currency rates found, fetching initial rates...');
            } else {
                console.log(`Found ${currentRatesCount} current rates but no historical rates for today, fetching fresh rates...`);
            }

            const success = await updateCurrencyRates('USD');
            if (!success) {
                throw new Error('Failed to fetch currency rates and no existing rates available');
            }
        } else {
            console.log(`Found ${currentRatesCount} current currency rates and ${todayHistoricalCount} historical rates for today`);
        }
    } catch (err) {
        console.error(`❌ Failed to ensure currency rates exist:`, err);
        throw err; // Re-throw to indicate critical failure
    }
}

/**
 * Helper to fetch a single historical USD -> target rate with fallbacks
 */
async function getHistoricalUSDToTargetRate(target: string, targetDate: Date): Promise<number> {
    if (target === 'USD') return 1.0;

    const pairFilter = { base: 'USD', target };

    let record = await prisma.currencyRateHistory.findFirst({
        where: { rateDate: targetDate, ...pairFilter },
    });
    if (record) return typeof record.rate === 'number' ? record.rate : record.rate.toNumber();

    record = await prisma.currencyRateHistory.findFirst({
        where: { rateDate: { lte: targetDate }, ...pairFilter },
        orderBy: { rateDate: 'desc' },
    });
    if (record) return typeof record.rate === 'number' ? record.rate : record.rate.toNumber();

    record = await prisma.currencyRateHistory.findFirst({
        where: { rateDate: { gte: targetDate }, ...pairFilter },
        orderBy: { rateDate: 'asc' },
    });
    if (record) return typeof record.rate === 'number' ? record.rate : record.rate.toNumber();

    const currentRate = await prisma.currencyRate.findUnique({
        where: { base_target: { base: 'USD', target } }
    });
    if (currentRate) {
        return typeof currentRate.rate === 'number' ? currentRate.rate : currentRate.rate.toNumber();
    }

    throw new Error(`No exchange rate found from USD to ${target}. Ensure currency rates have been initialized.`);
}

/**
 * Get historical exchange rate for a specific date
 * Falls back to closest previous available date if exact date not found
 * Falls back to current rates if no historical data is available
 * Supports cross-currency derivation using USD-based rates stored in DB
 */
export async function getHistoricalExchangeRate(
    from: string,
    to: string,
    date: Date
): Promise<number> {
    try {
        if (from === to) return 1.0;

        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);

        const dateStr = targetDate.toISOString().split('T')[0];
        const cacheKey = `rate:historical:${from}:${to}:${dateStr}`;
        const cached = await safeGet(cacheKey);
        if (cached) {
            const num = parseFloat(cached);
            if (!isNaN(num)) return num;
        }

        let rate: number;

        if (from === 'USD') {
            rate = await getHistoricalUSDToTargetRate(to, targetDate);
        } else if (to === 'USD') {
            const baseRate = await getHistoricalUSDToTargetRate(from, targetDate);
            if (baseRate === 0) {
                throw new Error(`Invalid historical exchange rate of 0 from USD to ${from} on ${dateStr}.`);
            }
            rate = 1 / baseRate;
        } else {
            // Derived rate: from -> to = (USD -> to) / (USD -> from)
            const rateUSDToFrom = await getHistoricalUSDToTargetRate(from, targetDate);
            const rateUSDToTo = await getHistoricalUSDToTargetRate(to, targetDate);

            if (rateUSDToFrom === 0) {
                throw new Error(`Invalid historical exchange rate of 0 from USD to ${from} on ${dateStr}.`);
            }
            rate = rateUSDToTo / rateUSDToFrom;
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const isHistorical = targetDate.getTime() < today.getTime();
        const ttl = isHistorical
            ? 604800 // Cache historical rates for 7 days
            : Math.max(1, Math.floor(((new Date(today.getTime() + 86400000)).getTime() - Date.now()) / 1000));

        await safeSetex(cacheKey, ttl, rate);
        return rate;
    } catch (error) {
        console.error(`Error getting historical exchange rate from ${from} to ${to} for ${date}:`, error);
        throw error;
    }
}