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