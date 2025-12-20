"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpenseSummary = getExpenseSummary;
exports.getIncomeSummary = getIncomeSummary;
exports.getIncomeVsExpense = getIncomeVsExpense;
exports.getMonthlyIncomeVsExpense = getMonthlyIncomeVsExpense;
exports.getCategoryBreakdown = getCategoryBreakdown;
exports.getAssetAllocation = getAssetAllocation;
exports.getBudgetVsActual = getBudgetVsActual;
exports.getGoalProgressReport = getGoalProgressReport;
exports.detectRecurringTransactions = detectRecurringTransactions;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../utils/db"));
const currency_1 = require("../utils/currency");
const date_1 = require("../utils/date");
const utils_1 = require("../utils/utils");
async function getExpenseSummary(userId, start, end) {
    // Validate date strings if provided
    if (start && isNaN(Date.parse(start))) {
        throw new Error('Invalid start date format');
    }
    if (end && isNaN(Date.parse(end))) {
        throw new Error('Invalid end date format');
    }
    const now = new Date();
    const startDate = start ? new Date(start) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = end ? new Date(end) : (() => {
        const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        date.setUTCHours(23, 59, 59, 999);
        return date;
    })();
    // Get user's base currency
    const user = await db_1.default.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    // Get individual transactions instead of groupBy to handle currency conversion
    const transactions = await db_1.default.transaction.findMany({
        where: {
            userId,
            type: client_1.TransactionType.EXPENSE,
            date: { gte: startDate, lte: endDate }
        }
    });
    // Group by category with proper historical currency conversion
    const categoryMap = new Map();
    let total = 0;
    for (const transaction of transactions) {
        const convertedAmount = await (0, currency_1.convertCurrencyFromDBHistorical)(transaction.amount, transaction.currency, user.baseCurrency, transaction.date);
        total += convertedAmount;
        categoryMap.set(transaction.category, (categoryMap.get(transaction.category) || 0) + convertedAmount);
    }
    return {
        total: parseFloat(total.toFixed(2)),
        currency: user.baseCurrency,
        byCategory: Array.from(categoryMap.entries()).map(([category, amount]) => ({
            category,
            total: parseFloat(amount.toFixed(2))
        }))
    };
}
async function getIncomeSummary(userId, start, end) {
    // Validate date strings if provided
    if (start && isNaN(Date.parse(start))) {
        throw new Error('Invalid start date format');
    }
    if (end && isNaN(Date.parse(end))) {
        throw new Error('Invalid end date format');
    }
    const now = new Date();
    const startDate = start ? new Date(start) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = end ? new Date(end) : (() => {
        const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        date.setUTCHours(23, 59, 59, 999);
        return date;
    })();
    // Get user's base currency
    const user = await db_1.default.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    // Get individual income transactions
    const transactions = await db_1.default.transaction.findMany({
        where: {
            userId,
            type: client_1.TransactionType.INCOME,
            date: { gte: startDate, lte: endDate }
        }
    });
    // Group by category with proper historical currency conversion
    const categoryMap = new Map();
    let total = 0;
    for (const transaction of transactions) {
        const convertedAmount = await (0, currency_1.convertCurrencyFromDBHistorical)(transaction.amount, transaction.currency, user.baseCurrency, transaction.date);
        total += convertedAmount;
        categoryMap.set(transaction.category, (categoryMap.get(transaction.category) || 0) + convertedAmount);
    }
    return {
        total: parseFloat(total.toFixed(2)),
        currency: user.baseCurrency,
        byCategory: Array.from(categoryMap.entries()).map(([category, amount]) => ({
            category,
            total: parseFloat(amount.toFixed(2))
        }))
    };
}
async function getIncomeVsExpense(userId, period = client_1.Periodicity.MONTHLY, date = new Date()) {
    const user = await db_1.default.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    // Use getPeriodDates helper to get correct date range for any period type
    const { start: from, end: to } = (0, date_1.getPeriodDates)(period, date);
    const transactions = await db_1.default.transaction.findMany({
        where: {
            userId,
            date: {
                gte: from,
                lte: to,
            },
        },
    });
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
        const amountInBase = await (0, currency_1.convertCurrencyFromDBHistorical)(tx.amount, tx.currency, user.baseCurrency, tx.date);
        if (tx.type === client_1.TransactionType.INCOME) {
            income += amountInBase;
        }
        else {
            expense += amountInBase;
        }
    }
    // Generate period label based on period type
    let periodLabel;
    switch (period) {
        case client_1.Periodicity.DAILY:
            periodLabel = date.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' });
            break;
        case client_1.Periodicity.WEEKLY:
            periodLabel = `Week of ${from.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            break;
        case client_1.Periodicity.MONTHLY:
            periodLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            break;
        case client_1.Periodicity.QUARTERLY:
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            periodLabel = `Q${quarter} ${date.getFullYear()}`;
            break;
        case client_1.Periodicity.HALF_YEARLY:
            const half = date.getMonth() < 6 ? 'H1' : 'H2';
            periodLabel = `${half} ${date.getFullYear()}`;
            break;
        case client_1.Periodicity.YEARLY:
            periodLabel = date.getFullYear().toString();
            break;
        default:
            periodLabel = period;
    }
    return {
        period: periodLabel,
        periodType: period,
        income,
        expense,
        net: income - expense,
        currency: user.baseCurrency,
    };
}
// Backward compatibility alias
async function getMonthlyIncomeVsExpense(userId) {
    return getIncomeVsExpense(userId, client_1.Periodicity.MONTHLY);
}
async function getCategoryBreakdown(userId, startDate, endDate) {
    // Validate date strings if provided
    if (startDate && isNaN(Date.parse(startDate))) {
        throw new Error('Invalid start date format');
    }
    if (endDate && isNaN(Date.parse(endDate))) {
        throw new Error('Invalid end date format');
    }
    const user = await db_1.default.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    const now = new Date();
    const from = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = endDate ? new Date(endDate) : (() => {
        const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        date.setUTCHours(23, 59, 59, 999);
        return date;
    })();
    const transactions = await db_1.default.transaction.findMany({
        where: {
            userId,
            type: client_1.TransactionType.EXPENSE,
            date: { gte: from, lte: to },
        },
    });
    const breakdownMap = new Map();
    for (const txn of transactions) {
        const converted = await (0, currency_1.convertCurrencyFromDBHistorical)(txn.amount, txn.currency, user.baseCurrency, txn.date);
        breakdownMap.set(txn.category, (breakdownMap.get(txn.category) || 0) + converted);
    }
    const breakdown = Array.from(breakdownMap.entries()).map(([category, amount]) => ({
        category,
        amount: parseFloat(amount.toFixed(2)),
    }));
    const total = breakdown.reduce((sum, entry) => sum + entry.amount, 0);
    return {
        total: parseFloat(total.toFixed(2)),
        breakdown,
        currency: user.baseCurrency,
    };
}
async function getAssetAllocation(userId, groupBy = 'assetType') {
    const user = await db_1.default.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    const holdings = await db_1.default.holding.findMany({
        where: { userId },
    });
    const allocationMap = new Map();
    for (const holding of holdings) {
        // Use pre-calculated convertedValue if available, otherwise calculate on the fly
        let convertedValueNumber = (0, utils_1.toNumberSafe)(holding.convertedValue || 0);
        // If convertedValue is 0 or missing, calculate it
        if (convertedValueNumber === 0) {
            const totalValue = (0, utils_1.toNumberSafe)(holding.lastPrice) * (0, utils_1.toNumberSafe)(holding.quantity);
            convertedValueNumber = await (0, currency_1.convertCurrencyFromDB)(totalValue, holding.holdingCurrency, user.baseCurrency);
        }
        const key = holding[groupBy];
        allocationMap.set(key, (allocationMap.get(key) || 0) + convertedValueNumber);
    }
    const breakdown = Array.from(allocationMap.entries()).map(([group, value]) => ({
        group,
        value: parseFloat(value.toFixed(2)),
    }));
    const total = breakdown.reduce((sum, entry) => sum + entry.value, 0);
    return {
        total: parseFloat(total.toFixed(2)),
        breakdown,
        currency: user.baseCurrency,
        groupedBy: groupBy,
    };
}
async function getBudgetVsActual(userId, period = client_1.Periodicity.MONTHLY, date = new Date()) {
    const user = await db_1.default.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    // Use getPeriodDates helper to get correct date range for any period type
    const { start: periodStart, end: periodEnd } = (0, date_1.getPeriodDates)(period, date);
    const [budgets, transactions, plannedEvents] = await Promise.all([
        db_1.default.budget.findMany({
            where: {
                userId,
                period
            },
        }),
        db_1.default.transaction.findMany({
            where: {
                userId,
                type: client_1.TransactionType.EXPENSE,
                date: {
                    gte: periodStart,
                    lte: periodEnd
                },
            },
        }),
        db_1.default.plannedEvent.findMany({
            where: { userId, targetDate: { gte: periodStart, lte: periodEnd }, completed: false },
        }),
    ]);
    const actualsMap = new Map();
    const addAmount = async (category, amount, currency, date) => {
        const converted = await (0, currency_1.convertCurrencyFromDBHistorical)(amount, currency, user.baseCurrency, date);
        actualsMap.set(category, (actualsMap.get(category) || 0) + converted);
    };
    for (const txn of transactions) {
        await addAmount(txn.category, (0, utils_1.toNumberSafe)(txn.amount), txn.currency, txn.date);
    }
    for (const pe of plannedEvents) {
        await addAmount(pe.category, (0, utils_1.toNumberSafe)(pe.estimatedCost), pe.currency, pe.targetDate);
    }
    const result = budgets.map(budget => ({
        category: budget.category,
        budgeted: parseFloat(budget.amount.toFixed(2)),
        spent: parseFloat((actualsMap.get(budget.category) || 0).toFixed(2)),
    }));
    return {
        currency: user.baseCurrency,
        period,
        result,
    };
}
async function getGoalProgressReport(userId) {
    const goals = await db_1.default.goal.findMany({
        where: { userId },
        orderBy: { targetDate: "asc" },
    });
    const today = new Date();
    return goals.map((goal) => {
        const progress = (0, utils_1.toNumberSafe)(goal.targetAmount) === 0
            ? 0
            : Math.min(((0, utils_1.toNumberSafe)(goal.savedAmount) / (0, utils_1.toNumberSafe)(goal.targetAmount)) * 100, 100);
        const daysLeft = (0, date_1.daysBetween)(today, goal.targetDate);
        return {
            id: goal.id,
            name: goal.name,
            targetAmount: goal.targetAmount,
            savedAmount: goal.savedAmount,
            currency: goal.currency,
            targetDate: goal.targetDate,
            progress: parseFloat(progress.toFixed(2)),
            daysLeft,
        };
    });
}
async function detectRecurringTransactions(userId) {
    const txns = await db_1.default.transaction.findMany({
        where: { userId },
        orderBy: { date: "asc" },
    });
    const primaryKey = (t) => `${t.amount}-${t.category}-${t.description ?? ''}`;
    const fallbackKey = (t) => `${t.amount}-${t.category}`;
    const results = [];
    const checkGroup = (group, key) => {
        if (group.length < 3)
            return;
        const dates = group.map(txn => txn.date);
        const freq = (0, date_1.detectFrequency)(dates);
        if (freq) {
            results.push({
                key,
                frequency: freq,
                count: group.length,
                amount: group[0].amount,
                category: group[0].category,
                description: group[0].description,
                transactions: group,
                grouping: key.includes('--') ? "PRIMARY" : "FALLBACK"
            });
        }
    };
    const primaryGroups = (0, utils_1.groupBy)(txns, primaryKey);
    for (const [key, group] of Object.entries(primaryGroups)) {
        checkGroup(group, key + '--primary');
    }
    const fallbackGroups = (0, utils_1.groupBy)(txns, fallbackKey);
    for (const [key, group] of Object.entries(fallbackGroups)) {
        const already = results.some(r => r.key.startsWith(key) && r.grouping === 'PRIMARY');
        if (!already)
            checkGroup(group, key);
    }
    return results;
}
