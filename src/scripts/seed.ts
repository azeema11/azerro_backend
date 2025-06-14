import { updateCurrencyRates } from '../services/currency_rates.service';
import prisma from '../utils/db';

// Simple seed script that uses the unified service
updateCurrencyRates('USD')
    .then(() => {
        console.log('Seed completed successfully');
    })
    .catch((error) => {
        console.error('Seed failed:', error);
    })
    .finally(() => prisma.$disconnect());
