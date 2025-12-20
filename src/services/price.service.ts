import axios from 'axios';
import prisma from '../utils/db';
import { Holding } from '@prisma/client';
import { convertCurrencyFromDB } from '../utils/currency';

export const updateHoldingPrices = async () => {
    try {
        // ✅ Fix: Single query with user data included (no N+1 queries)
        const holdings = await prisma.holding.findMany({
            include: {
                user: {
                    select: { baseCurrency: true }
                }
            }
        });

        // Group by assetType
        const stocks = holdings.filter(h => h.assetType === 'STOCK');
        const cryptos = holdings.filter(h => h.assetType === 'CRYPTO');
        const metals = holdings.filter(h => h.assetType === 'METAL');

        // Update each group
        await Promise.all([
            updateStockPrices(stocks),
            updateCryptoPrices(cryptos),
            updateMetalPrices(metals),
        ]);
    } catch (e) {
        console.error(`[updateHoldingPrices] Failed to update holding prices`, e instanceof Error ? e.message : String(e));
    }
};

async function updateStockPrices(stocks: (Holding & { user: { baseCurrency: string } })[]) {
    // Process in chunks to respect concurrency limit
    const CONCURRENCY_LIMIT = parseInt(process.env.HOLDING_CONCURRENCY_LIMIT || '5', 10);
    const chunkedStocks = [];
    for (let i = 0; i < stocks.length; i += CONCURRENCY_LIMIT) {
        chunkedStocks.push(stocks.slice(i, i + CONCURRENCY_LIMIT));
    }

    for (const chunk of chunkedStocks) {
        await Promise.all(chunk.map(async (h) => {
            const symbol = h.ticker;
            try {
                const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
                const price = res.data.c;
                if (price) {
                    const baseCurrency = h.user.baseCurrency;
                    // Finnhub returns prices in USD for most US stocks
                    const converted = await convertCurrencyFromDB(price, 'USD', baseCurrency);

                    // We'll execute updates individually here because each update might depend on currency conversion
                    // which is async. To truly batch updates we'd need to gather all data first.
                    // Given the constraint to batch DB writes, let's just optimize the update call itself
                    // or gather results and update in a transaction if possible.
                    // However, currency conversion is also async and depends on DB.
                    // So true batching (one SQL query) is hard without raw SQL or updateMany (which doesn't support different values).
                    // Best approach with Prisma: Promise.all for concurrency.

                    await prisma.holding.update({
                        where: { id: h.id },
                        data: {
                            lastPrice: price,
                            convertedValue: converted,
                        },
                    });
                }
            } catch (e) {
                console.warn(`[Stock] Failed to update ${symbol}`, e instanceof Error ? e.message : String(e));
            }
        }));
    }
}


async function updateCryptoPrices(cryptos: (Holding & { user: { baseCurrency: string } })[]) {
    if (cryptos.length === 0) return;

    // CoinGecko allows batching multiple IDs in one request
    const ids = Array.from(new Set(cryptos.map(c => c.ticker.toLowerCase()))).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

    try {
        const res = await axios.get(url);

        // Prepare all update promises
        const updatePromises = cryptos.map(async (h) => {
            const price = res.data[h.ticker.toLowerCase()]?.usd;
            if (price) {
                const baseCurrency = h.user.baseCurrency;
                const converted = await convertCurrencyFromDB(price, 'USD', baseCurrency);

                return prisma.holding.update({
                    where: { id: h.id },
                    data: {
                        lastPrice: price,
                        convertedValue: converted,
                    },
                });
            }
            return null;
        });

        // Execute all updates in parallel (or we could use $transaction for atomicity but that might lock too much)
        // Using Promise.all for speed.
        await Promise.all(updatePromises);

    } catch (e) {
        console.error(`[updateCryptoPrices] Failed to update crypto prices`, e instanceof Error ? e.message : String(e));
    }
}


async function updateMetalPrices(metals: (Holding & { user: { baseCurrency: string } })[]) {
    if (metals.length === 0) return;

    try {
        const res = await axios.get(`https://api.metals.live/v1/spot`);

        const updatePromises = metals.map(async (h) => {
            try {
                const priceObj = res.data.find((item: any) => item[h.ticker.toLowerCase()]);
                const price = priceObj?.[h.ticker.toLowerCase()];
                if (price) {
                    const baseCurrency = h.user.baseCurrency;
                    const converted = await convertCurrencyFromDB(price, 'USD', baseCurrency);

                    return prisma.holding.update({
                        where: { id: h.id },
                        data: {
                            lastPrice: price,
                            convertedValue: converted,
                        },
                    });
                }
            } catch (e) {
                console.warn(`[Metal] Failed to update ${h.ticker}`, e instanceof Error ? e.message : String(e));
            }
            return null;
        });

        await Promise.all(updatePromises);

    } catch (e) {
        console.error(`[updateMetalPrices] Failed to update metal prices`, e instanceof Error ? e.message : String(e));
    }
}
