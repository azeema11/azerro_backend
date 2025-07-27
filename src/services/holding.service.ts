import prisma from '../utils/db';
import { convertCurrencyFromDB } from '../utils/currency';
import { AssetType } from '@prisma/client';
import axios from 'axios';

// Helper function to fetch current price
export const fetchCurrentPrice = async (ticker: string, assetType: string): Promise<number | null> => {
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
};

export const getHoldings = async (userId: string) => {
    try {
        const holdings = await prisma.holding.findMany({
            where: { userId },
        });

        return holdings;
    } catch (err) {
        console.error('Failed to get holdings:', err);
        throw err;
    }
};

export const createHolding = async (
    userId: string,
    platform: string,
    ticker: string,
    assetType: AssetType,
    quantity: number,
    avgCost: number,
    holdingCurrency: string,
    name: string
) => {
    try {
        if (!platform || !ticker || !assetType || !quantity || !avgCost || !holdingCurrency || !name) {
            throw new Error('Platform, ticker, asset type, quantity, average cost, name, and holding currency are required');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
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
                userId,
            },
        });

        return {
            ...holding,
            note: currentPrice
                ? 'Current price fetched automatically'
                : 'Price will be updated in next refresh cycle'
        };
    } catch (err) {
        console.error('Failed to create holding:', err);
        throw err;
    }
};

export const updateHolding = async (id: string, data: any) => {
    try {
        const updated = await prisma.holding.update({
            where: { id },
            data,
        });

        return updated;
    } catch (err) {
        console.error('Failed to update holding:', err);
        throw err;
    }
};

export const deleteHolding = async (id: string) => {
    try {
        await prisma.holding.delete({ where: { id } });
    } catch (err) {
        console.error('Failed to delete holding:', err);
        throw err;
    }
}; 