import { Decimal } from "@prisma/client/runtime";
import prisma from "./db";
import { safeGet, safeMget, safeSetex } from "./redis";
import { getHistoricalExchangeRate } from "../services/currency_rates.service";
import { getSecondsUntilMidnight, startOfUtcDay, formatDateKey } from "./date";
import { toNumberSafe } from "./utils";

/**
 * Get current exchange rate with USD-based derivation and caching
 */
export async function getCurrentExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1.0;

  const cacheKey = `rate:${from}:${to}`;
  const cached = await safeGet(cacheKey);
  if (cached) {
    const num = parseFloat(cached);
    if (Number.isFinite(num) && num > 0) return num;
  }

  let rate: number;

  if (from === 'USD') {
    const record = await prisma.currencyRate.findUnique({
      where: {
        base_target: { base: 'USD', target: to }
      }
    });
    if (!record) {
      throw new Error(`Missing current exchange rate from USD to ${to}. Ensure currency rates are properly initialized.`);
    }
    rate = toNumberSafe(record.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Invalid exchange rate of ${rate} from USD to ${to}.`);
    }
  } else if (to === 'USD') {
    const record = await prisma.currencyRate.findUnique({
      where: {
        base_target: { base: 'USD', target: from }
      }
    });
    if (!record) {
      throw new Error(`Missing current exchange rate from USD to ${from}. Ensure currency rates are properly initialized.`);
    }
    const baseRate = toNumberSafe(record.rate);
    if (!Number.isFinite(baseRate) || baseRate <= 0) {
      throw new Error(`Invalid exchange rate of ${baseRate} from USD to ${from}.`);
    }
    rate = 1 / baseRate;
  } else {
    // Derived rate: from -> to = (USD -> to) / (USD -> from)
    const records = await prisma.currencyRate.findMany({
      where: {
        base: 'USD',
        target: { in: [from, to] }
      }
    });

    const fromRecord = records.find(r => r.target === from);
    const toRecord = records.find(r => r.target === to);

    if (!fromRecord || !toRecord) {
      throw new Error(
        `Missing current exchange rates to derive ${from} to ${to}. ` +
        `Required USD->${from} and USD->${to}. Ensure currency rates are properly initialized.`
      );
    }

    const rateUSDToFrom = toNumberSafe(fromRecord.rate);
    const rateUSDToTo = toNumberSafe(toRecord.rate);

    if (!Number.isFinite(rateUSDToFrom) || rateUSDToFrom <= 0) {
      throw new Error(`Invalid exchange rate of ${rateUSDToFrom} from USD to ${from}.`);
    }
    if (!Number.isFinite(rateUSDToTo) || rateUSDToTo <= 0) {
      throw new Error(`Invalid exchange rate of ${rateUSDToTo} from USD to ${to}.`);
    }

    rate = rateUSDToTo / rateUSDToFrom;
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid computed exchange rate of ${rate} from ${from} to ${to}.`);
  }

  await safeSetex(cacheKey, getSecondsUntilMidnight(), rate);
  return rate;
}

/**
 * Convert currency using current exchange rates
 * Throws error if exchange rate is not available
 */
export async function convertCurrencyFromDB(
  value: number | Decimal,
  from: string,
  to: string
): Promise<number> {
  try {
    if (from === to) return toNumberSafe(value);

    const numValue = toNumberSafe(value);
    const rate = await getCurrentExchangeRate(from, to);
    return numValue * rate;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing current exchange rate')) {
      // Re-throw business logic errors as-is
      throw error;
    }

    // Handle database or other unexpected errors
    console.error(`Error converting currency from ${from} to ${to}:`, error);
    throw new Error(`Failed to convert currency from ${from} to ${to}`);
  }
}

/**
 * Convert currency using historical exchange rates for a specific date
 * Uses closest available historical rate if exact date not found
 * Throws error if no historical data is available
 */
export async function convertCurrencyFromDBHistorical(
  value: number | Decimal,
  from: string,
  to: string,
  date: Date
): Promise<number> {
  try {
    if (from === to) return toNumberSafe(value);

    const rate = await getHistoricalExchangeRate(from, to, date);
    const numValue = toNumberSafe(value);
    return numValue * rate;
  } catch (error) {
    console.error(`Error converting currency from ${from} to ${to} for date ${date}:`, error);
    throw error; // Re-throw to maintain error context
  }
}

/**
 * Get total converted amount using current exchange rates
 */
export async function getTotalConverted(
  amountsWithCurrency: { amount: number | Decimal, currency: string }[],
  baseCurrency: string
): Promise<number> {
  if (!Array.isArray(amountsWithCurrency)) {
    throw new Error('amountsWithCurrency must be an array');
  }

  if (amountsWithCurrency.length === 0) return 0;

  const converted = await batchConvertCurrency(amountsWithCurrency, baseCurrency);
  return converted.reduce((sum, val) => sum + val, 0);
}

/**
 * Get total converted amount using historical exchange rates for each transaction date
 */
export async function getTotalConvertedHistorical(
  amountsWithCurrencyAndDate: { amount: number | Decimal, currency: string, date: Date }[],
  baseCurrency: string
): Promise<number> {
  if (!Array.isArray(amountsWithCurrencyAndDate)) {
    throw new Error('amountsWithCurrencyAndDate must be an array');
  }

  if (amountsWithCurrencyAndDate.length === 0) return 0;

  const converted = await batchConvertCurrencyHistorical(amountsWithCurrencyAndDate, baseCurrency);
  return converted.reduce((sum, val) => sum + val, 0);
}

/**
 * Batch convert currencies using current exchange rates
 * Optimized to fetch all required rates in a single query with USD-based derivation
 */
export async function batchConvertCurrency(
  items: { amount: number | Decimal, currency: string }[],
  baseCurrency: string
): Promise<number[]> {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }

  // Get unique currencies that need conversion
  const uniqueFromCurrencies = Array.from(new Set(
    items.map(item => item.currency).filter(curr => curr !== baseCurrency)
  ));

  const rateMap = new Map<string, number>();

  if (uniqueFromCurrencies.length > 0) {
      // Try to get all rates from Redis at once
      const redisKeys = uniqueFromCurrencies.map(from => `rate:${from}:${baseCurrency}`);
      const cachedRates = await safeMget(redisKeys);
      const missingFromCurrencies: string[] = [];

      for (let i = 0; i < uniqueFromCurrencies.length; i++) {
          const from = uniqueFromCurrencies[i];
          const cachedRate = cachedRates[i];
          if (cachedRate) {
              const numRate = parseFloat(cachedRate);
              if (Number.isFinite(numRate) && numRate > 0) {
                  rateMap.set(from, numRate);
                  continue;
              }
          }
          missingFromCurrencies.push(from);
      }

      // Fetch any missing rates from DB using USD-based derivation
      if (missingFromCurrencies.length > 0) {
          const neededTargets = new Set<string>();
          for (const from of missingFromCurrencies) {
              if (from !== 'USD') neededTargets.add(from);
              if (baseCurrency !== 'USD') neededTargets.add(baseCurrency);
          }

          const usdRatesMap = new Map<string, number>();

          if (neededTargets.size > 0) {
              const rateRecords = await prisma.currencyRate.findMany({
                where: {
                  base: 'USD',
                  target: { in: Array.from(neededTargets) }
                }
              });

              for (const record of rateRecords) {
                const rate = toNumberSafe(record.rate);
                if (Number.isFinite(rate) && rate > 0) {
                    usdRatesMap.set(record.target, rate);
                }
              }
          }

          // Compute and cache the missing rates
          for (const from of missingFromCurrencies) {
              let rate: number;

              if (from === 'USD') {
                  const baseRate = usdRatesMap.get(baseCurrency);
                  if (baseRate === undefined || !Number.isFinite(baseRate) || baseRate <= 0) {
                      throw new Error(`Missing current exchange rate from USD to ${baseCurrency}. Ensure currency rates are properly initialized.`);
                  }
                  rate = baseRate;
              } else if (baseCurrency === 'USD') {
                  const baseRate = usdRatesMap.get(from);
                  if (baseRate === undefined || !Number.isFinite(baseRate) || baseRate <= 0) {
                      throw new Error(`Missing or invalid current exchange rate from USD to ${from}. Ensure currency rates are properly initialized.`);
                  }
                  rate = 1 / baseRate;
              } else {
                  const rateUSDToFrom = usdRatesMap.get(from);
                  const rateUSDToTo = usdRatesMap.get(baseCurrency);

                  if (rateUSDToFrom === undefined || rateUSDToTo === undefined || !Number.isFinite(rateUSDToFrom) || rateUSDToFrom <= 0 || !Number.isFinite(rateUSDToTo) || rateUSDToTo <= 0) {
                      throw new Error(
                          `Missing current exchange rates to derive ${from} to ${baseCurrency}. ` +
                          `Required USD->${from} and USD->${baseCurrency}. Ensure currency rates are properly initialized.`
                      );
                  }
                  rate = rateUSDToTo / rateUSDToFrom;
              }

              if (!Number.isFinite(rate) || rate <= 0) {
                  throw new Error(`Invalid computed exchange rate of ${rate} from ${from} to ${baseCurrency}.`);
              }

              rateMap.set(from, rate);
              // Cache in Redis expiring at next UTC midnight
              await safeSetex(`rate:${from}:${baseCurrency}`, getSecondsUntilMidnight(), rate);
          }
      }
  }

  const results: number[] = [];
  for (const item of items) {
    const numValue = toNumberSafe(item.amount);

    if (item.currency === baseCurrency) {
      results.push(numValue);
    } else {
      const rate = rateMap.get(item.currency);

      if (rate === undefined) {
        throw new Error(
          `Missing current exchange rate from ${item.currency} to ${baseCurrency}. ` +
          `Ensure currency rates are properly initialized and updated.`
        );
      }

      results.push(numValue * rate);
    }
  }

  return results;
}

/**
 * Batch convert currencies using historical exchange rates
 * Optimized to fetch all required rates efficiently
 */
export async function batchConvertCurrencyHistorical(
  items: { amount: number | Decimal, currency: string, date: Date }[],
  baseCurrency: string
): Promise<number[]> {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }

  // Group items by currency and date for efficient querying
  const rateQueries = new Map<string, Date>();
  for (const item of items) {
    if (item.currency !== baseCurrency) {
      const key = `${item.currency}_${baseCurrency}`;
      const normalizedDate = startOfUtcDay(item.date);

      const existingDate = rateQueries.get(key);
      if (!existingDate || normalizedDate < existingDate) {
        rateQueries.set(key, normalizedDate);
      }
    }
  }

  // Fetch all required historical rates
  const rateMap = new Map<string, number>();

  const uniqueFetches: { rateKey: string; fromCurrency: string; toCurrency: string; date: Date }[] = [];

  for (const [currencyPair] of rateQueries) {
    const [fromCurrency, toCurrency] = currencyPair.split('_');

    const itemsForPair = items.filter(item =>
      item.currency === fromCurrency && item.currency !== baseCurrency
    );

    for (const item of itemsForPair) {
      const normalizedDate = startOfUtcDay(item.date);
      const rateKey = `${fromCurrency}_${toCurrency}_${normalizedDate.getTime()}`;

      if (!rateMap.has(rateKey) && !uniqueFetches.some(f => f.rateKey === rateKey)) {
        uniqueFetches.push({ rateKey, fromCurrency, toCurrency, date: normalizedDate });
      }
    }
  }

  const RATE_FETCH_CONCURRENCY = 10;
  const fetchedRates: { rateKey: string; rate: number }[] = [];
  for (let i = 0; i < uniqueFetches.length; i += RATE_FETCH_CONCURRENCY) {
    const chunk = uniqueFetches.slice(i, i + RATE_FETCH_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async ({ rateKey, fromCurrency, toCurrency, date }) => {
        const rate = await getHistoricalExchangeRate(fromCurrency, toCurrency, date);
        return { rateKey, rate };
      })
    );
    fetchedRates.push(...chunkResults);
  }

  for (const { rateKey, rate } of fetchedRates) {
    rateMap.set(rateKey, rate);
  }

  const results: number[] = [];
  for (const item of items) {
    const numValue = toNumberSafe(item.amount);

    if (item.currency === baseCurrency) {
      results.push(numValue);
    } else {
      const normalizedDate = startOfUtcDay(item.date);
      const rateKey = `${item.currency}_${baseCurrency}_${normalizedDate.getTime()}`;
      const rate = rateMap.get(rateKey);

      if (rate === undefined) {
        throw new Error(
          `Missing historical exchange rate from ${item.currency} to ${baseCurrency} for ${formatDateKey(normalizedDate)}`
        );
      }

      results.push(numValue * rate);
    }
  }

  return results;
}