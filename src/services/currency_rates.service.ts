import axios from 'axios';
import prisma from '../utils/db';

type ExchangeRateResponse = {
    base: string;
    rates: Record<string, number>;
};

export async function updateCurrencyRates(base = 'USD') {
    try {
        console.log(`Fetching currency rates for base: ${base}`);
        const res = await axios.get<ExchangeRateResponse>(`https://api.fxratesapi.com/latest?base=${base}`);

        if (!res.data || !res.data.rates) {
            console.error('Invalid API response structure');
            await addFallbackRates();
            return;
        }

        const rates = res.data.rates;
        console.log(`Found ${Object.keys(rates).length} exchange rates`);

        const operations = Object.entries(rates).map(([target, rate]) =>
            prisma.currencyRate.upsert({
                where: {
                    base_target: {
                        base,
                        target,
                    },
                },
                update: { rate },
                create: {
                    base,
                    target,
                    rate,
                },
            })
        );

        await Promise.all(operations);
        console.log(`✅ Currency rates updated successfully for base ${base}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to fetch currency rates:`, err);
        await addFallbackRates();
        return false;
    }
}

async function addFallbackRates() {
    console.log('Adding fallback currency rates...');
    const fallbackRates = {
        'INR': 83.12,
        'EUR': 0.85,
        'GBP': 0.73,
        'JPY': 110.0,
        'CAD': 1.25,
        'AUD': 1.35,
        'CHF': 0.88,
        'CNY': 6.45
    };

    const fallbackOps = Object.entries(fallbackRates).map(([target, rate]) =>
        prisma.currencyRate.upsert({
            where: {
                base_target: {
                    base: 'USD',
                    target,
                },
            },
            update: { rate },
            create: {
                base: 'USD',
                target,
                rate,
            },
        })
    );

    await Promise.all(fallbackOps);
    console.log('✅ Fallback currency rates added');
}

export async function ensureCurrencyRatesExist() {
    const count = await prisma.currencyRate.count();
    if (count === 0) {
        console.log('No currency rates found, fetching initial rates...');
        await updateCurrencyRates('USD');
    } else {
        console.log(`Found ${count} existing currency rates`);
    }
} 