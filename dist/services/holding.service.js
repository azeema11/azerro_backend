"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHolding = exports.updateHolding = exports.createHolding = exports.getHoldings = exports.fetchCurrentPrice = void 0;
const db_1 = __importDefault(require("../utils/db"));
const currency_1 = require("../utils/currency");
const prisma_errors_1 = require("../utils/prisma_errors");
const axios_1 = __importDefault(require("axios"));
// Helper function to fetch current price
const fetchCurrentPrice = async (ticker, assetType) => {
    try {
        switch (assetType) {
            case 'STOCK':
                const stockRes = await axios_1.default.get(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`);
                return stockRes.data.c || null;
            case 'CRYPTO':
                const cryptoRes = await axios_1.default.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ticker.toLowerCase()}&vs_currencies=usd`);
                return cryptoRes.data[ticker.toLowerCase()]?.usd || null;
            case 'METAL':
                const metalRes = await axios_1.default.get(`https://api.metals.live/v1/spot`);
                const metalData = metalRes.data.find((item) => item[ticker.toLowerCase()]);
                return metalData?.[ticker.toLowerCase()] || null;
            default:
                return null;
        }
    }
    catch (error) {
        console.warn(`Failed to fetch price for ${ticker}:`, error);
        return null;
    }
};
exports.fetchCurrentPrice = fetchCurrentPrice;
const getHoldings = async (userId) => {
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return await db_1.default.holding.findMany({
            where: { userId },
        });
    }, 'Holding');
};
exports.getHoldings = getHoldings;
const createHolding = async (userId, data) => {
    // Validation
    if (!data.platform?.trim()) {
        throw new prisma_errors_1.ValidationError('Platform is required', 'Holding', undefined, { field: 'platform', validationType: 'business' });
    }
    if (!data.ticker?.trim()) {
        throw new prisma_errors_1.ValidationError('Ticker is required', 'Holding', undefined, { field: 'ticker', validationType: 'business' });
    }
    if (!data.assetType) {
        throw new prisma_errors_1.ValidationError('Asset type is required', 'Holding', undefined, { field: 'assetType', validationType: 'business' });
    }
    if (!data.quantity || data.quantity <= 0) {
        throw new prisma_errors_1.ValidationError('Quantity must be greater than 0', 'Holding', undefined, { field: 'quantity', validationType: 'business' });
    }
    if (!data.avgCost || data.avgCost <= 0) {
        throw new prisma_errors_1.ValidationError('Average cost must be greater than 0', 'Holding', undefined, { field: 'avgCost', validationType: 'business' });
    }
    if (!data.holdingCurrency?.trim()) {
        throw new prisma_errors_1.ValidationError('Holding currency is required', 'Holding', undefined, { field: 'holdingCurrency', validationType: 'business' });
    }
    if (!data.name?.trim()) {
        throw new prisma_errors_1.ValidationError('Name is required', 'Holding', undefined, { field: 'name', validationType: 'business' });
    }
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true },
        });
        const baseCurrency = user?.baseCurrency ?? 'INR';
        // Fetch current price automatically
        const currentPrice = await (0, exports.fetchCurrentPrice)(data.ticker, data.assetType);
        const lastPrice = currentPrice || 0; // Default to 0 if price fetch fails
        // Calculate converted value using current price (in USD from APIs)
        const convertedValue = currentPrice
            ? await (0, currency_1.convertCurrencyFromDB)(data.quantity * currentPrice, 'USD', baseCurrency)
            : 0;
        const holding = await db_1.default.holding.create({
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
exports.createHolding = createHolding;
const updateHolding = async (id, userId, data) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        return await db_1.default.holding.update({
            where: {
                id_userId: { id, userId }
            },
            data,
        });
    }, 'Holding');
};
exports.updateHolding = updateHolding;
const deleteHolding = async (id, userId) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        await db_1.default.holding.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Holding');
};
exports.deleteHolding = deleteHolding;
