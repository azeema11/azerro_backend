"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHoldingPrices = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("../utils/db"));
const currency_1 = require("../utils/currency");
const updateHoldingPrices = async () => {
    try {
        // ✅ Fix: Single query with user data included (no N+1 queries)
        const holdings = await db_1.default.holding.findMany({
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
    }
    catch (e) {
        console.error(`[updateHoldingPrices] Failed to update holding prices`, e instanceof Error ? e.message : String(e));
    }
};
exports.updateHoldingPrices = updateHoldingPrices;
async function updateStockPrices(stocks) {
    for (const h of stocks) {
        const symbol = h.ticker;
        try {
            const res = await axios_1.default.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
            const price = res.data.c;
            // ✅ Fix: No more N+1 queries, use included user data
            const baseCurrency = h.user.baseCurrency;
            // ✅ Fix: Finnhub returns prices in USD for most stocks
            // TODO: For non-US stocks, you may need to determine the actual currency
            const converted = await (0, currency_1.convertCurrencyFromDB)(price, 'USD', baseCurrency);
            await db_1.default.holding.update({
                where: { id: h.id },
                data: {
                    lastPrice: price,
                    convertedValue: converted,
                },
            });
        }
        catch (e) {
            console.warn(`[Stock] Failed to update ${symbol}`, e instanceof Error ? e.message : String(e));
        }
    }
}
async function updateCryptoPrices(cryptos) {
    const ids = cryptos.map(c => c.ticker.toLowerCase()).join('%2C');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    try {
        const res = await axios_1.default.get(url);
        for (const h of cryptos) {
            const price = res.data[h.ticker.toLowerCase()]?.usd;
            if (price) {
                // ✅ Fix: No more N+1 queries, use included user data
                const baseCurrency = h.user.baseCurrency;
                // ✅ Fix: CoinGecko returns prices in USD
                const converted = await (0, currency_1.convertCurrencyFromDB)(price, 'USD', baseCurrency);
                await db_1.default.holding.update({
                    where: { id: h.id },
                    data: {
                        lastPrice: price,
                        convertedValue: converted,
                    },
                });
            }
        }
    }
    catch (e) {
        console.error(`[updateCryptoPrices] Failed to update crypto prices`, e instanceof Error ? e.message : String(e));
    }
}
async function updateMetalPrices(metals) {
    try {
        const res = await axios_1.default.get(`https://api.metals.live/v1/spot`);
        for (const h of metals) {
            try {
                const priceObj = res.data.find((item) => item[h.ticker.toLowerCase()]);
                const price = priceObj?.[h.ticker.toLowerCase()];
                if (price) {
                    // ✅ Fix: No more N+1 queries, use included user data
                    const baseCurrency = h.user.baseCurrency;
                    // ✅ Fix: metals.live returns prices in USD
                    const converted = await (0, currency_1.convertCurrencyFromDB)(price, 'USD', baseCurrency);
                    await db_1.default.holding.update({
                        where: { id: h.id },
                        data: {
                            lastPrice: price,
                            convertedValue: converted,
                        },
                    });
                }
            }
            catch (e) {
                console.warn(`[Metal] Failed to update ${h.ticker}`, e instanceof Error ? e.message : String(e));
            }
        }
    }
    catch (e) {
        console.error(`[updateMetalPrices] Failed to update metal prices`, e instanceof Error ? e.message : String(e));
    }
}
