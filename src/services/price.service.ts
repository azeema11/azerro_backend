import prisma from '../utils/db';
import { Holding } from '@prisma/client';
import { convertCurrencyFromDB } from '../utils/currency';

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
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const price = data.c;

            const baseCurrency = h.user.baseCurrency;
            const converted = await convertCurrencyFromDB(price, 'USD', baseCurrency);

            await prisma.holding.update({
                where: { id: h.id },
                data: {
                    lastPrice: price,
                    convertedValue: converted,
                },
            });
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
                const baseCurrency = h.user.baseCurrency;
                const converted = await convertCurrencyFromDB(price, 'USD', baseCurrency);

                await prisma.holding.update({
                    where: { id: h.id },
                    data: {
                        lastPrice: price,
                        convertedValue: converted,
                    },
                });
            }
        }
    } catch (e) {
        console.error(`[updateCryptoPrices] Failed to update crypto prices`, e instanceof Error ? e.message : String(e));
    }
}

async function updateMetalPrices(metals: (Holding & { user: { baseCurrency: string } })[]) {
    if (metals.length === 0) return;
    
    try {
        const response = await fetch(`https://api.metals.live/v1/spot`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        for (const h of metals) {
            try {
                const priceObj = data.find((item: any) => item[h.ticker.toLowerCase()]);
                const price = priceObj?.[h.ticker.toLowerCase()];
                if (price) {
                    const baseCurrency = h.user.baseCurrency;
                    const converted = await convertCurrencyFromDB(price, 'USD', baseCurrency);

                    await prisma.holding.update({
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
        }
    } catch (e) {
        console.error(`[updateMetalPrices] Failed to update metal prices`, e instanceof Error ? e.message : String(e));
    }
}
