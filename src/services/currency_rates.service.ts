import axios from 'axios';
import prisma from '../utils/db';

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
        const res = await axios.get<ExchangeRateResponse>(`https://api.fxratesapi.com/latest?base=${base}`);

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
 * Get historical exchange rate for a specific date
 * Falls back to closest previous available date if exact date not found
 * Falls back to current rates if no historical data is available
 * Supports inverse rate calculation (e.g., INR->USD from USD->INR)
 */
export async function getHistoricalExchangeRate(
    from: string,
    to: string,
    date: Date
): Promise<number> {
    try {
        if (from === to) return 1.0;

        // Normalize date to UTC midnight
        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);

        // Helper to extract rate from record
        const extractRate = (record: any): number => {
            return typeof record.rate === 'number' ? record.rate : record.rate.toNumber();
        };

        // Try to find exact date first (direct)
        let rateRecord = await prisma.currencyRateHistory.findUnique({
            where: {
                base_target_rateDate: { base: from, target: to, rateDate: targetDate },
            },
        });
        if (rateRecord) return extractRate(rateRecord);

        // Try inverse rate for exact date (e.g., INR->USD from USD->INR)
        let inverseRecord = await prisma.currencyRateHistory.findUnique({
            where: {
                base_target_rateDate: { base: to, target: from, rateDate: targetDate },
            },
        });
        if (inverseRecord) return 1 / extractRate(inverseRecord);

        // Try closest previous date (direct)
        rateRecord = await prisma.currencyRateHistory.findFirst({
            where: { base: from, target: to, rateDate: { lte: targetDate } },
            orderBy: { rateDate: 'desc' },
        });
        if (rateRecord) return extractRate(rateRecord);

        // Try closest previous date (inverse)
        inverseRecord = await prisma.currencyRateHistory.findFirst({
            where: { base: to, target: from, rateDate: { lte: targetDate } },
            orderBy: { rateDate: 'desc' },
        });
        if (inverseRecord) return 1 / extractRate(inverseRecord);

        // Try closest future date (direct)
        rateRecord = await prisma.currencyRateHistory.findFirst({
            where: { base: from, target: to, rateDate: { gte: targetDate } },
            orderBy: { rateDate: 'asc' },
        });
        if (rateRecord) return extractRate(rateRecord);

        // Try closest future date (inverse)
        inverseRecord = await prisma.currencyRateHistory.findFirst({
            where: { base: to, target: from, rateDate: { gte: targetDate } },
            orderBy: { rateDate: 'asc' },
        });
        if (inverseRecord) return 1 / extractRate(inverseRecord);

        // Fall back to current rates (direct)
        const currentRate = await prisma.currencyRate.findUnique({
            where: { base_target: { base: from, target: to } }
        });
        if (currentRate) {
            console.log(`Using current rate for ${from} to ${to} (no historical data for ${targetDate.toISOString().split('T')[0]})`);
            return extractRate(currentRate);
        }

        // Fall back to current rates (inverse)
        const inverseCurrentRate = await prisma.currencyRate.findUnique({
            where: { base_target: { base: to, target: from } }
        });
        if (inverseCurrentRate) {
            console.log(`Using inverse current rate for ${from} to ${to} (no historical data for ${targetDate.toISOString().split('T')[0]})`);
            return 1 / extractRate(inverseCurrentRate);
        }

        throw new Error(
            `No exchange rate found for ${from} to ${to}. ` +
            `Ensure currency rates have been initialized.`
        );
    } catch (error) {
        console.error(`Error getting historical exchange rate from ${from} to ${to} for ${date}:`, error);
        throw error;
    }
}