"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const currency_rates_service_1 = require("../services/currency_rates.service");
const db_1 = __importDefault(require("../utils/db"));
// Simple seed script that uses the unified service
(0, currency_rates_service_1.updateCurrencyRates)('USD')
    .then(() => {
    console.log('Seed completed successfully');
})
    .catch((error) => {
    console.error('Seed failed:', error);
})
    .finally(() => db_1.default.$disconnect());
