import { TransactionType, Periodicity } from "@prisma/client";
import prisma from "../utils/db";
import { convertCurrencyFromDB, batchConvertCurrencyHistorical } from "../utils/currency";
import { daysBetween, detectFrequency, getPeriodDates, parseOptionalDateRange, formatDateKey, formatPeriodLabel } from "../utils/date";
import { withCache } from "../utils/redis";
import { groupBy, toNumberSafe, calcGoalProgress, roundTo, accumulateByKey } from "../utils/utils";
import { NotFoundError } from "../utils/prisma_errors";

async function getTransactionSummaryByType(
    userId: string, type: TransactionType, start?: string, end?: string
) {
    const { startDate, endDate, startKey, endKey } = parseOptionalDateRange(start, end);
    const label = type === TransactionType.EXPENSE ? 'expense' : 'income';

    return withCache(`report:${label}:${userId}:${startKey}:${endKey}`, 600, async () => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundError('User');

        const transactions = await prisma.transaction.findMany({
            where: { userId, type, date: { gte: startDate, lte: endDate } }
        });

        const converted = await batchConvertCurrencyHistorical(
            transactions.map(t => ({ amount: t.amount, currency: t.currency, date: t.date })),
            user.baseCurrency
        );

        const categoryMap = new Map<string, number>();
        let total = 0;
        for (let i = 0; i < transactions.length; i++) {
            total += converted[i];
            accumulateByKey(categoryMap, transactions[i].category, converted[i]);
        }

        return {
            total: roundTo(total),
            currency: user.baseCurrency,
            byCategory: Array.from(categoryMap.entries()).map(([category, amount]) => ({
                category, total: roundTo(amount)
            }))
        };
    });
}

export async function getExpenseSummary(userId: string, start?: string, end?: string) {
    return getTransactionSummaryByType(userId, TransactionType.EXPENSE, start, end);
}

export async function getIncomeSummary(userId: string, start?: string, end?: string) {
    return getTransactionSummaryByType(userId, TransactionType.INCOME, start, end);
}

export async function getIncomeVsExpense(userId: string, period: Periodicity = Periodicity.MONTHLY, date = new Date()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    return withCache(`report:income-vs-expense:${userId}:${period}:${formatDateKey(date)}`, 600, async () => {
        const { start: from, end: to } = getPeriodDates(period, date);

        const transactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: from, lte: to } },
        });

        const converted = await batchConvertCurrencyHistorical(
            transactions.map(t => ({ amount: t.amount, currency: t.currency, date: t.date })),
            user.baseCurrency
        );

        let income = 0;
        let expense = 0;
        for (let i = 0; i < transactions.length; i++) {
            if (transactions[i].type === TransactionType.INCOME) { income += converted[i]; }
            else { expense += converted[i]; }
        }

        income = roundTo(income);
        expense = roundTo(expense);
        return { period: formatPeriodLabel(period, date, from), periodType: period, income, expense, net: roundTo(income - expense), currency: user.baseCurrency };
    });
}

// Backward compatibility alias
export async function getMonthlyIncomeVsExpense(userId: string) {
    return getIncomeVsExpense(userId, Periodicity.MONTHLY);
}

export async function getCategoryBreakdown(userId: string, startDate?: string, endDate?: string) {
    const { startDate: from, endDate: to, startKey, endKey } = parseOptionalDateRange(startDate, endDate);

    return withCache(`report:category:${userId}:${startKey}:${endKey}`, 600, async () => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundError('User');

        const transactions = await prisma.transaction.findMany({
            where: { userId, type: TransactionType.EXPENSE, date: { gte: from, lte: to } },
        });

        const converted = await batchConvertCurrencyHistorical(
            transactions.map(t => ({ amount: t.amount, currency: t.currency, date: t.date })),
            user.baseCurrency
        );

        const breakdownMap = new Map<string, number>();
        for (let i = 0; i < transactions.length; i++) {
            accumulateByKey(breakdownMap, transactions[i].category, converted[i]);
        }

        const breakdown = Array.from(breakdownMap.entries()).map(([category, amount]) => ({
            category, amount: roundTo(amount),
        }));
        const total = breakdown.reduce((sum, entry) => sum + entry.amount, 0);

        return { total: roundTo(total), breakdown, currency: user.baseCurrency };
    });
}

export async function getAssetAllocation(userId: string, groupByField: 'assetType' | 'platform' | 'ticker' = 'assetType') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    return withCache(`report:allocation:${userId}:${groupByField}`, 600, async () => {
        const holdings = await prisma.holding.findMany({ where: { userId } });

        const allocationMap = new Map<string, number>();
        for (const holding of holdings) {
            let convertedValueNumber = toNumberSafe(holding.convertedValue || 0);
            if (convertedValueNumber === 0) {
                const totalValue = toNumberSafe(holding.lastPrice) * toNumberSafe(holding.quantity);
                convertedValueNumber = await convertCurrencyFromDB(totalValue, holding.holdingCurrency, user.baseCurrency);
            }
            const key = holding[groupByField];
            accumulateByKey(allocationMap, key, convertedValueNumber);
        }

        const breakdown = Array.from(allocationMap.entries()).map(([group, value]) => ({
            group, value: roundTo(value),
        }));
        const total = breakdown.reduce((sum, entry) => sum + entry.value, 0);

        return { total: roundTo(total), breakdown, currency: user.baseCurrency, groupedBy: groupByField };
    });
}

export async function getBudgetVsActual(userId: string, period: Periodicity = Periodicity.MONTHLY, date = new Date()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    return withCache(`report:budget-vs-actual:${userId}:${period}:${formatDateKey(date)}`, 600, async () => {
        const { start: periodStart, end: periodEnd } = getPeriodDates(period, date);

        const [budgets, transactions, plannedEvents] = await Promise.all([
            prisma.budget.findMany({ where: { userId, period } }),
            prisma.transaction.findMany({
                where: { userId, type: TransactionType.EXPENSE, date: { gte: periodStart, lte: periodEnd } },
            }),
            prisma.plannedEvent.findMany({
                where: { userId, targetDate: { gte: periodStart, lte: periodEnd }, completed: false },
            }),
        ]);

        const allItems = [
            ...transactions.map(t => ({ amount: t.amount, currency: t.currency, date: t.date, category: t.category })),
            ...plannedEvents.map(pe => ({ amount: pe.estimatedCost, currency: pe.currency, date: pe.targetDate, category: pe.category })),
        ];
        const converted = await batchConvertCurrencyHistorical(
            allItems.map(i => ({ amount: i.amount, currency: i.currency, date: i.date })),
            user.baseCurrency
        );

        const actualsMap = new Map<string, number>();
        for (let i = 0; i < allItems.length; i++) {
            accumulateByKey(actualsMap, allItems[i].category, converted[i]);
        }

        const budgetResult = budgets.map(budget => ({
            category: budget.category,
            budgeted: roundTo(toNumberSafe(budget.amount)),
            spent: roundTo(actualsMap.get(budget.category) || 0),
        }));

        return { currency: user.baseCurrency, period, result: budgetResult };
    });
}

export async function getGoalProgressReport(userId: string) {
    return withCache(`report:goal-progress:${userId}`, 600, async () => {
        const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { targetDate: "asc" } });
        const today = new Date();

        return goals.map((goal) => ({
            id: goal.id, name: goal.name, targetAmount: goal.targetAmount,
            savedAmount: goal.savedAmount, currency: goal.currency, targetDate: goal.targetDate,
            progress: roundTo(calcGoalProgress(goal.savedAmount, goal.targetAmount)),
            daysLeft: daysBetween(today, goal.targetDate),
        }));
    });
}

export async function detectRecurringTransactions(userId: string) {
    return withCache(`report:recurring:${userId}`, 3600, async () => {
        const txns = await prisma.transaction.findMany({ where: { userId }, orderBy: { date: "asc" } });

        const primaryKey = (t: any) => `${t.amount}-${t.category}-${t.description ?? ''}`;
        const fallbackKey = (t: any) => `${t.amount}-${t.category}`;
        const results: any[] = [];

        const checkGroup = (group: any[], key: string) => {
            if (group.length < 3) return;
            const dates = group.map(txn => txn.date);
            const freq = detectFrequency(dates);
            if (freq) {
                results.push({
                    key, frequency: freq, count: group.length, amount: group[0].amount,
                    category: group[0].category, description: group[0].description,
                    transactions: group, grouping: key.includes('--') ? "PRIMARY" : "FALLBACK"
                });
            }
        };

        const primaryGroups = groupBy(txns, primaryKey);
        for (const [key, group] of Object.entries(primaryGroups)) checkGroup(group as any[], key + '--primary');

        const fallbackGroups = groupBy(txns, fallbackKey);
        for (const [key, group] of Object.entries(fallbackGroups)) {
            const already = results.some(r => r.key.startsWith(key) && r.grouping === 'PRIMARY');
            if (!already) checkGroup(group as any[], key);
        }

        return results;
    });
}