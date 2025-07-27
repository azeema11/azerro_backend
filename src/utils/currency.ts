import prisma from "./db";

export async function convertCurrencyFromDB(
  value: number,
  from: string,
  to: string
): Promise<number> {
  try {
    if (from === to) return value;

    const rateRecord = await prisma.currencyRate.findUnique({
      where: {
        base_target: { base: from, target: to }
      }
    });

    if (!rateRecord) {
      throw new Error(`Missing exchange rate from ${from} to ${to}`);
    }

    return value * rateRecord.rate;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing exchange rate')) {
      // Re-throw business logic errors as-is
      throw error;
    }

    // Handle database or other unexpected errors
    console.error(`Error converting currency from ${from} to ${to}:`, error);
    throw new Error(`Failed to convert currency from ${from} to ${to}`);
  }
}

export async function getTotalConverted(amountsWithCurrency: { amount: number, currency: string }[], baseCurrency: string): Promise<number> {
  let total = 0;
  for (const amountWithCurrency of amountsWithCurrency) {
      const converted = await convertCurrencyFromDB(
          amountWithCurrency.amount,
          amountWithCurrency.currency,
          baseCurrency
      );
      total += converted;
  }
  return total;
}