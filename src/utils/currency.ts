import prisma from "./db";

export async function convertCurrencyFromDB(
  value: number,
  from: string,
  to: string
): Promise<number> {
  if (from === to) return value;

  const rateRecord = await prisma.currencyRate.findUnique({
    where: {
      base_target: { base: from, target: to }
    }
  });

  if (!rateRecord) throw new Error(`Missing exchange rate from ${from} to ${to}`);

  return value * rateRecord.rate;
}