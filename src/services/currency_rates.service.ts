import prisma from '../utils/db';
import { safeGet, safeSetex, safeBatchSetex } from '../utils/redis';
import { getSecondsUntilMidnight, startOfUtcDay, formatDateKey } from '../utils/date';
import { toNumberSafe } from '../utils/utils';

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

        const today = startOfUtcDay(new Date());

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

        const ttlSeconds = getSecondsUntilMidnight();
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

        const today = startOfUtcDay(new Date());

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

        const ttlSeconds = getSecondsUntilMidnight();
        const entries = previousRates.map(prevRate => ({
            key: `rate:${prevRate.base}:${prevRate.target}`,
            ttl: ttlSeconds,
            value: toNumberSafe(prevRate.rate),
        }));
        await safeBatchSetex(entries);
        console.log(`✅ Previous day currency rates cached in Redis for base ${base} (TTL: ${ttlSeconds}s)`);

        console.log(`✅ Used previous day's rates (${previousRates.length} rates) from ${formatDateKey(mostRecentRateDate.rateDate)} for base ${base}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to use previous day's rates for base ${base}:`, err);
        return false;
    }
}

export async function ensureCurrencyRatesExist() {
    try {
        const today = startOfUtcDay(new Date());

        const [currentRatesCount, todayHistoricalCount] = await Promise.all([
            prisma.currencyRate.count(),
            prisma.currencyRateHistory.count({ where: { rateDate: today } }),
        ]);

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
 * Find the closest common historical date where both targets have records in currencyRateHistory
 */
async function findCommonHistoricalDate(from: string, to: string, targetDate: Date): Promise<Date | null> {
    // 1. Try exact date
    const countExact = await prisma.currencyRateHistory.count({
        where: {
            rateDate: targetDate,
            base: 'USD',
            target: { in: [from, to] }
        }
    });
    if (countExact === 2) {
        return targetDate;
    }

    // 2. Find the most recent date <= targetDate where both exist
    const pastDates = await prisma.currencyRateHistory.findMany({
        where: {
            rateDate: { lte: targetDate },
            base: 'USD',
            target: from
        },
        orderBy: { rateDate: 'desc' },
        select: { rateDate: true },
        take: 10
    });

    for (const d of pastDates) {
        const count = await prisma.currencyRateHistory.count({
            where: {
                rateDate: d.rateDate,
                base: 'USD',
                target: to
            }
        });
        if (count > 0) {
            return d.rateDate;
        }
    }

    // 3. Find the closest future date >= targetDate where both exist
    const futureDates = await prisma.currencyRateHistory.findMany({
        where: {
            rateDate: { gte: targetDate },
            base: 'USD',
            target: from
        },
        orderBy: { rateDate: 'asc' },
        select: { rateDate: true },
        take: 10
    });

    for (const d of futureDates) {
        const count = await prisma.currencyRateHistory.count({
            where: {
                rateDate: d.rateDate,
                base: 'USD',
                target: to
            }
        });
        if (count > 0) {
            return d.rateDate;
        }
    }

    return null;
}

/**
 * Helper to fetch a single historical USD -> target rate with fallbacks and validation
 */
async function getHistoricalUSDToTargetRate(target: string, targetDate: Date): Promise<number> {
    if (target === 'USD') return 1.0;

    const pairFilter = { base: 'USD', target };

    // 1. Exact date lookup
    let record = await prisma.currencyRateHistory.findFirst({
        where: { rateDate: targetDate, ...pairFilter },
    });
    if (record) {
        const rate = toNumberSafe(record.rate);
        if (Number.isFinite(rate) && rate > 0) {
            return rate;
        }
    }

    // 2. Fallback lookup (lte targetDate)
    const pastRecords = await prisma.currencyRateHistory.findMany({
        where: { rateDate: { lte: targetDate }, ...pairFilter },
        orderBy: { rateDate: 'desc' },
        take: 5,
    });
    for (const r of pastRecords) {
        const rate = toNumberSafe(r.rate);
        if (Number.isFinite(rate) && rate > 0) {
            return rate;
        }
    }

    // 3. Fallback lookup (gte targetDate)
    const futureRecords = await prisma.currencyRateHistory.findMany({
        where: { rateDate: { gte: targetDate }, ...pairFilter },
        orderBy: { rateDate: 'asc' },
        take: 5,
    });
    for (const r of futureRecords) {
        const rate = toNumberSafe(r.rate);
        if (Number.isFinite(rate) && rate > 0) {
            return rate;
        }
    }

    // 4. Current rate fallback
    const currentRate = await prisma.currencyRate.findUnique({
        where: { base_target: { base: 'USD', target } }
    });
    if (currentRate) {
        const rate = toNumberSafe(currentRate.rate);
        if (Number.isFinite(rate) && rate > 0) {
            return rate;
        }
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

        const targetDate = startOfUtcDay(date);
        const dateStr = formatDateKey(targetDate);
        const cacheKey = `rate:historical:${from}:${to}:${dateStr}`;
        const cached = await safeGet(cacheKey);
        if (cached) {
            const num = parseFloat(cached);
            if (Number.isFinite(num) && num > 0) return num;
        }

        let rate: number;

        if (from === 'USD') {
            rate = await getHistoricalUSDToTargetRate(to, targetDate);
        } else if (to === 'USD') {
            const baseRate = await getHistoricalUSDToTargetRate(from, targetDate);
            if (!Number.isFinite(baseRate) || baseRate <= 0) {
                throw new Error(`Invalid historical exchange rate of ${baseRate} from USD to ${from} on ${dateStr}.`);
            }
            rate = 1 / baseRate;
        } else {
            // Derived rate: from -> to = (USD -> to) / (USD -> from)
            // Select the common applicable rateDate first, then fetch both targets using that date
            const commonDate = await findCommonHistoricalDate(from, to, targetDate);

            let rateUSDToFrom: number;
            let rateUSDToTo: number;

            if (commonDate) {
                const [fromRecord, toRecord] = await Promise.all([
                    prisma.currencyRateHistory.findFirst({ where: { rateDate: commonDate, base: 'USD', target: from } }),
                    prisma.currencyRateHistory.findFirst({ where: { rateDate: commonDate, base: 'USD', target: to } }),
                ]);

                if (!fromRecord || !toRecord) {
                    throw new Error(`Failed to load historical records on common date ${formatDateKey(commonDate)}`);
                }

                rateUSDToFrom = toNumberSafe(fromRecord.rate);
                rateUSDToTo = toNumberSafe(toRecord.rate);
            } else {
                const [fromRecord, toRecord] = await Promise.all([
                    prisma.currencyRate.findUnique({ where: { base_target: { base: 'USD', target: from } } }),
                    prisma.currencyRate.findUnique({ where: { base_target: { base: 'USD', target: to } } }),
                ]);

                if (!fromRecord || !toRecord) {
                    throw new Error(`No current exchange rates found to derive ${from} to ${to}. Ensure currency rates are initialized.`);
                }

                rateUSDToFrom = toNumberSafe(fromRecord.rate);
                rateUSDToTo = toNumberSafe(toRecord.rate);
            }

            if (!Number.isFinite(rateUSDToFrom) || rateUSDToFrom <= 0) {
                throw new Error(`Invalid historical exchange rate of ${rateUSDToFrom} from USD to ${from}.`);
            }
            if (!Number.isFinite(rateUSDToTo) || rateUSDToTo <= 0) {
                throw new Error(`Invalid historical exchange rate of ${rateUSDToTo} from USD to ${to}.`);
            }

            rate = rateUSDToTo / rateUSDToFrom;
        }

        if (!Number.isFinite(rate) || rate <= 0) {
            throw new Error(`Invalid computed historical exchange rate of ${rate} from ${from} to ${to} on ${dateStr}.`);
        }

        const today = startOfUtcDay(new Date());
        const isHistorical = targetDate.getTime() < today.getTime();
        const ttl = isHistorical ? 604800 : getSecondsUntilMidnight();

        await safeSetex(cacheKey, ttl, rate);
        return rate;
    } catch (error) {
        console.error(`Error getting historical exchange rate from ${from} to ${to} for ${date}:`, error);
        throw error;
    }
}