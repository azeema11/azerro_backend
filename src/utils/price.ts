import { safeGet, safeSetex, safeDel } from './redis';

/**
 * Fetches and caches metal spot prices from metals.live API.
 * Shared between holding.service and price.service to avoid duplicate fetches.
 */
export async function getMetalSpotPrices(): Promise<any[] | null> {
    const spotCacheKey = 'price:metal:spot';
    const cached = await safeGet(spotCacheKey);
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch {
            await safeDel(spotCacheKey);
        }
    }

    try {
        const response = await fetch('https://api.metals.live/v1/spot');
        if (!response.ok) return null;
        const data = await response.json();
        await safeSetex(spotCacheKey, 21600, JSON.stringify(data));
        return data;
    } catch {
        return null;
    }
}

/**
 * Looks up a specific metal's price from spot data.
 */
export function findMetalPrice(spotData: any[], ticker: string): number | null {
    const priceObj = spotData.find((item: any) => item[ticker.toLowerCase()]);
    return priceObj?.[ticker.toLowerCase()] || null;
}
