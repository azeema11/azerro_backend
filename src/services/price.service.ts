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
            where: { assetType: 'METAL' },
            include: {
                user: {
                    select: { baseCurrency: true }
                }
            }
        });

        await updateMetalPrices(holdings);
    } catch (e) {
        console.error(`[updateHoldingPrices] Failed to update holding prices`, e instanceof Error ? e.message : String(e));
    }
};

const PRICE_UPDATE_CONCURRENCY = 5;

async function updateMetalPrices(metals: (Holding & { user: { baseCurrency: string } })[]) {
    if (metals.length === 0) return;
    
    try {
        const spotData = await getMetalSpotPrices();
        if (!spotData) throw new Error('Failed to fetch metal spot prices');

        for (let i = 0; i < metals.length; i += PRICE_UPDATE_CONCURRENCY) {
            const chunk = metals.slice(i, i + PRICE_UPDATE_CONCURRENCY);
            await Promise.all(chunk.map(async (h) => {
                try {
                    const price = findMetalPrice(spotData, h.ticker);
                    if (price) {
                        await Promise.all([
                            safeSetex(`price:metal:${h.ticker.toLowerCase()}`, 21600, price),
                            updateHoldingPrice(h, price),
                        ]);
                    }
                } catch (e) {
                    console.warn(`[Metal] Failed to update ${h.ticker}`, e instanceof Error ? e.message : String(e));
                }
            }));
        }
    } catch (e) {
        console.error(`[updateMetalPrices] Failed to update metal prices`, e instanceof Error ? e.message : String(e));
    }
}
