import prisma from '../utils/db';
import { Holding } from '@prisma/client';
import { safeGet, safeSetex } from '../utils/redis';
import { convertCurrencyFromDB } from '../utils/currency';
import { getMetalSpotPrices, findMetalPrice } from '../utils/price';

async function updateHoldingPrice(h: Holding & { user: { baseCurrency: string } }, price: number) {
    const converted = await convertCurrencyFromDB(price, 'USD', h.user.baseCurrency);
    await prisma.holding.update({
        where: { id: h.id },
        data: { lastPrice: price, convertedValue: converted },
    });
}

export const updateHoldingPrices = async () => {
    try {
        const holdings = await prisma.holding.findMany({
            include: {
                user: {
                    select: { baseCurrency: true }
                }
            }
        });

        const stocks = holdings.filter(h => h.assetType === 'STOCK');
        const cryptos = holdings.filter(h => h.assetType === 'CRYPTO');
        const metals = holdings.filter(h => h.assetType === 'METAL');

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
    for (const h of stocks) {
        const symbol = h.ticker;
        try {
            let price: number | undefined;
            const cacheKey = `price:stock:${symbol.toLowerCase()}`;
            const cached = await safeGet(cacheKey);
            if (cached) {
                const num = parseFloat(cached);
                if (!isNaN(num)) price = num;
            }

            if (price === undefined) {
                const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                price = data.c;
                if (price !== undefined) await safeSetex(cacheKey, 1800, price);
            }

            if (price === undefined) continue;
            await updateHoldingPrice(h, price);
        } catch (e) {
            console.warn(`[Stock] Failed to update ${symbol}`, e instanceof Error ? e.message : String(e));
        }
    }
}

async function updateCryptoPrices(cryptos: (Holding & { user: { baseCurrency: string } })[]) {
    if (cryptos.length === 0) return;
    
    const ids = cryptos.map(c => c.ticker.toLowerCase()).join('%2C');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        for (const h of cryptos) {
            const price = data[h.ticker.toLowerCase()]?.usd;
            if (price) {
                await safeSetex(`price:crypto:${h.ticker.toLowerCase()}`, 1800, price);
                await updateHoldingPrice(h, price);
            }
        }
    } catch (e) {
        console.error(`[updateCryptoPrices] Failed to update crypto prices`, e instanceof Error ? e.message : String(e));
    }
}

async function updateMetalPrices(metals: (Holding & { user: { baseCurrency: string } })[]) {
    if (metals.length === 0) return;
    
    try {
        const spotData = await getMetalSpotPrices();
        if (!spotData) throw new Error('Failed to fetch metal spot prices');

        for (const h of metals) {
            try {
                const price = findMetalPrice(spotData, h.ticker);
                if (price) {
                    await safeSetex(`price:metal:${h.ticker.toLowerCase()}`, 21600, price);
                    await updateHoldingPrice(h, price);
                }
            } catch (e) {
                console.warn(`[Metal] Failed to update ${h.ticker}`, e instanceof Error ? e.message : String(e));
            }
        }
    } catch (e) {
        console.error(`[updateMetalPrices] Failed to update metal prices`, e instanceof Error ? e.message : String(e));
    }
}
