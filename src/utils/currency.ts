import { Decimal } from "@prisma/client/runtime";
import prisma from "./db";
import { getHistoricalExchangeRate } from "../services/currency_rates.service";

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
    if (from === to) return typeof value === 'number' ? value : value.toNumber();

    const rateRecord = await prisma.currencyRate.findUnique({
      where: {
        base_target: { base: from, target: to }
      }
    });

    if (!rateRecord) {
      throw new Error(
        `Missing current exchange rate from ${from} to ${to}. ` +
        `Ensure currency rates are properly initialized and updated.`
      );
    }

    const numValue = typeof value === 'number' ? value : value.toNumber();
    const numRate = typeof rateRecord.rate === 'number' ? rateRecord.rate : rateRecord.rate.toNumber();
    return numValue * numRate;
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
    if (from === to) return typeof value === 'number' ? value : value.toNumber();

    const rate = await getHistoricalExchangeRate(from, to, date);
    const numValue = typeof value === 'number' ? value : value.toNumber();
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

  let total = 0;
  for (const amountWithCurrency of amountsWithCurrency) {
    const isValidAmount = typeof amountWithCurrency.amount === 'number' ||
      (amountWithCurrency.amount && typeof amountWithCurrency.amount.toNumber === 'function');

    if (!isValidAmount || !amountWithCurrency.currency) {
      throw new Error('Invalid amount or currency in conversion data');
    }

    const converted = await convertCurrencyFromDB(
      amountWithCurrency.amount,
      amountWithCurrency.currency,
      baseCurrency
    );
    total += converted;
  }
  return total;
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

  let total = 0;
  for (const item of amountsWithCurrencyAndDate) {
    const isValidAmount = typeof item.amount === 'number' ||
      (item.amount && typeof item.amount.toNumber === 'function');

    if (!isValidAmount || !item.currency || !(item.date instanceof Date)) {
      throw new Error('Invalid amount, currency, or date in historical conversion data');
    }

    const converted = await convertCurrencyFromDBHistorical(
      item.amount,
      item.currency,
      baseCurrency,
      item.date
    );
    total += converted;
  }
  return total;
}

/**
 * Batch convert currencies using current exchange rates
 * Optimized to fetch all required rates in a single query
 */
export async function batchConvertCurrency(
  items: { amount: number | Decimal, currency: string }[],
  baseCurrency: string
): Promise<number[]> {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }

  // Get unique currency pairs needed
  const uniquePairs = new Set<string>();
  for (const item of items) {
    if (item.currency !== baseCurrency) {
      uniquePairs.add(`${item.currency}_${baseCurrency}`);
    }
  }

  // Fetch all required rates in a single query
  const rateRecords = uniquePairs.size > 0 ? await prisma.currencyRate.findMany({
    where: {
      OR: Array.from(uniquePairs).map(pair => {
        const [base, target] = pair.split('_');
        return { base, target };
      })
    }
  }) : [];

  // Create a rate lookup map
  const rateMap = new Map<string, number>();
  for (const record of rateRecords) {
    const key = `${record.base}_${record.target}`;
    const rate = typeof record.rate === 'number' ? record.rate : record.rate.toNumber();
    rateMap.set(key, rate);
  }

  // Convert all amounts
  const results: number[] = [];
  for (const item of items) {
    const numValue = typeof item.amount === 'number' ? item.amount : item.amount.toNumber();

    if (item.currency === baseCurrency) {
      results.push(numValue);
    } else {
      const rateKey = `${item.currency}_${baseCurrency}`;
      const rate = rateMap.get(rateKey);

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
      const normalizedDate = new Date(item.date);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      // Keep the earliest date for each currency pair (for fallback logic)
      const existingDate = rateQueries.get(key);
      if (!existingDate || normalizedDate < existingDate) {
        rateQueries.set(key, normalizedDate);
      }
    }
  }

  // Fetch all required historical rates
  const rateMap = new Map<string, number>();

  for (const [currencyPair, earliestDate] of rateQueries) {
    const [fromCurrency, toCurrency] = currencyPair.split('_');

    // For each item with this currency pair, get the appropriate rate
    const itemsForPair = items.filter(item =>
      item.currency === fromCurrency && item.currency !== baseCurrency
    );

    for (const item of itemsForPair) {
      const normalizedDate = new Date(item.date);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      const rateKey = `${fromCurrency}_${toCurrency}_${normalizedDate.getTime()}`;

      if (!rateMap.has(rateKey)) {
        try {
          const rate = await getHistoricalExchangeRate(fromCurrency, toCurrency, normalizedDate);
          rateMap.set(rateKey, rate);
        } catch (error) {
          console.error(`Failed to get historical rate for ${fromCurrency} to ${toCurrency} on ${normalizedDate}:`, error);
          throw error;
        }
      }
    }
  }

  // Convert all amounts
  const results: number[] = [];
  for (const item of items) {
    const numValue = typeof item.amount === 'number' ? item.amount : item.amount.toNumber();

    if (item.currency === baseCurrency) {
      results.push(numValue);
    } else {
      const normalizedDate = new Date(item.date);
      normalizedDate.setUTCHours(0, 0, 0, 0);
      const rateKey = `${item.currency}_${baseCurrency}_${normalizedDate.getTime()}`;
      const rate = rateMap.get(rateKey);

      if (rate === undefined) {
        throw new Error(
          `Missing historical exchange rate from ${item.currency} to ${baseCurrency} for ${normalizedDate.toISOString().split('T')[0]}`
        );
      }

      results.push(numValue * rate);
    }
  }

  return results;
}