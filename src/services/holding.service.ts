import prisma from '../utils/db';
import { convertCurrencyFromDB } from '../utils/currency';
import { AssetType } from '@prisma/client';
import { withNotFoundHandling, withPrismaErrorHandling, ValidationError } from '../utils/prisma_errors';
import { HoldingUpdateData, CreateHoldingInput } from '../types/service_types';
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
    return withPrismaErrorHandling(async () => {
        return await prisma.holding.findMany({
            where: { userId },
        });
    }, 'Holding');
};

export const createHolding = async (
    userId: string,
    data: CreateHoldingInput
) => {
    // Validation
    if (!data.platform?.trim()) {
        throw new ValidationError(
            'Platform is required',
            'Holding',
            undefined,
            { field: 'platform', validationType: 'business' }
        );
    }

    if (!data.ticker?.trim()) {
        throw new ValidationError(
            'Ticker is required',
            'Holding',
            undefined,
            { field: 'ticker', validationType: 'business' }
        );
    }

    if (!data.assetType) {
        throw new ValidationError(
            'Asset type is required',
            'Holding',
            undefined,
            { field: 'assetType', validationType: 'business' }
        );
    }

    if (!data.quantity || data.quantity <= 0) {
        throw new ValidationError(
            'Quantity must be greater than 0',
            'Holding',
            undefined,
            { field: 'quantity', validationType: 'business' }
        );
    }

    if (!data.avgCost || data.avgCost <= 0) {
        throw new ValidationError(
            'Average cost must be greater than 0',
            'Holding',
            undefined,
            { field: 'avgCost', validationType: 'business' }
        );
    }

    if (!data.holdingCurrency?.trim()) {
        throw new ValidationError(
            'Holding currency is required',
            'Holding',
            undefined,
            { field: 'holdingCurrency', validationType: 'business' }
        );
    }

    if (!data.name?.trim()) {
        throw new ValidationError(
            'Name is required',
            'Holding',
            undefined,
            { field: 'name', validationType: 'business' }
        );
    }

    return withPrismaErrorHandling(async () => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true },
        });

        const baseCurrency = user?.baseCurrency ?? 'INR';

        // Fetch current price automatically
        const currentPrice = await fetchCurrentPrice(data.ticker, data.assetType);
        const lastPrice = currentPrice || 0; // Default to 0 if price fetch fails

        // Calculate converted value using current price (in USD from APIs)
        const convertedValue = currentPrice
            ? await convertCurrencyFromDB(data.quantity * currentPrice, 'USD', baseCurrency)
            : 0;

        const holding = await prisma.holding.create({
            data: {
                platform: data.platform.trim(),
                ticker: data.ticker.trim().toUpperCase(),
                assetType: data.assetType,
                quantity: data.quantity,
                avgCost: data.avgCost,
                holdingCurrency: data.holdingCurrency.trim().toUpperCase(),
                lastPrice,
                convertedValue,
                name: data.name.trim(),
                userId,
            },
        });

        return {
            ...holding,
            note: currentPrice
                ? 'Current price fetched automatically'
                : 'Price will be updated in next refresh cycle'
        };
    }, 'Holding');
};

export const updateHolding = async (id: string, userId: string, data: HoldingUpdateData) => {
    return withNotFoundHandling(async () => {
        return await prisma.holding.update({
            where: {
                id_userId: { id, userId }
            },
            data,
        });
    }, 'Holding');
};

export const deleteHolding = async (id: string, userId: string) => {
    return withNotFoundHandling(async () => {
        await prisma.holding.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Holding');
}; 