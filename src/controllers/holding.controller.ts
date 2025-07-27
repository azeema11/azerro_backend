import { Request, Response } from 'express';
import prisma from '../utils/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { convertCurrencyFromDB } from '../utils/currency';
import { asyncHandler } from '../utils/async_handler';
import axios from 'axios';

export const getHoldings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const holdings = await prisma.holding.findMany({
    where: { userId: req.userId },
  });
  res.json(holdings);
});

// Helper function to fetch current price
async function fetchCurrentPrice(ticker: string, assetType: string): Promise<number | null> {
  try {
    switch (assetType) {
      case 'STOCK':
        const stockRes = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`);
        return stockRes.data.c || null;

      case 'CRYPTO':
        const cryptoRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ticker.toLowerCase()}&vs_currencies=usd`);
        return cryptoRes.data[ticker.toLowerCase()]?.usd || null;

      case 'METAL':
        const metalRes = await axios.get(`https://api.metals.live/v1/spot`);
        const metalData = metalRes.data.find((item: any) => item[ticker.toLowerCase()]);
        return metalData?.[ticker.toLowerCase()] || null;

      default:
        return null;
    }
  } catch (error) {
    console.warn(`Failed to fetch price for ${ticker}:`, error);
    return null;
  }
}

export const createHolding = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    platform,
    ticker,
    assetType,
    quantity,
    avgCost,
    holdingCurrency,
    name,
  } = req.body;

  if (!platform || !ticker || !assetType || !quantity || !avgCost || !holdingCurrency || !name) {
    return res.status(400).json({
      error: 'Platform, ticker, asset type, quantity, average cost, name, and holding currency are required'
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { baseCurrency: true },
  });

  const baseCurrency = user?.baseCurrency ?? 'INR';

  // Fetch current price automatically
  const currentPrice = await fetchCurrentPrice(ticker, assetType);
  const lastPrice = currentPrice || 0; // Default to 0 if price fetch fails

  // Calculate converted value using current price (in USD from APIs)
  const convertedValue = currentPrice
    ? await convertCurrencyFromDB(quantity * currentPrice, 'USD', baseCurrency)
    : 0;

  const holding = await prisma.holding.create({
    data: {
      platform,
      ticker,
      assetType,
      quantity,
      avgCost,
      holdingCurrency,
      lastPrice,
      convertedValue,
      name,
      userId: req.userId!,
    },
  });

  res.status(201).json({
    ...holding,
    note: currentPrice
      ? 'Current price fetched automatically'
      : 'Price will be updated in next refresh cycle'
  });
});

export const updateHolding = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const updated = await prisma.holding.update({
    where: { id },
    data,
  });

  res.json(updated);
});

export const deleteHolding = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await prisma.holding.delete({ where: { id } });
  res.status(204).send();
});
