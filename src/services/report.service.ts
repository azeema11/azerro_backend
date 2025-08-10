import { TransactionType, Periodicity } from "@prisma/client";
import prisma from "../utils/db";
import { convertCurrencyFromDB, convertCurrencyFromDBHistorical } from "../utils/currency";
import { daysBetween, detectFrequency, getPeriodDates } from "../utils/date";
import { groupBy } from "../utils/utils";

export async function getExpenseSummary(userId: string, start?: string, end?: string) {
    // Validate date strings if provided
    if (start && isNaN(Date.parse(start))) {
        throw new Error('Invalid start date format');
    }
    if (end && isNaN(Date.parse(end))) {
        throw new Error('Invalid end date format');
    }

    const startDate = start ? new Date(start) : new Date("2000-01-01");
    const endDate = end ? new Date(end) : new Date();

    // Get user's base currency
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Get individual transactions instead of groupBy to handle currency conversion
    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            type: TransactionType.EXPENSE,
            date: { gte: startDate, lte: endDate }
        }
    });

    // Group by category with proper historical currency conversion
    const categoryMap = new Map<string, number>();
    let total = 0;

    for (const transaction of transactions) {
        const convertedAmount = await convertCurrencyFromDBHistorical(
            transaction.amount,
            transaction.currency,
            user.baseCurrency,
            transaction.date
        );

        total += convertedAmount;
        categoryMap.set(
            transaction.category,
            (categoryMap.get(transaction.category) || 0) + convertedAmount
        );
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

export async function getIncomeSummary(userId: string, start?: string, end?: string) {
    // Validate date strings if provided
    if (start && isNaN(Date.parse(start))) {
        throw new Error('Invalid start date format');
    }
    if (end && isNaN(Date.parse(end))) {
        throw new Error('Invalid end date format');
    }

    const startDate = start ? new Date(start) : new Date("2000-01-01");
    const endDate = end ? new Date(end) : new Date();

    // Get user's base currency
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Get individual income transactions
    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            type: TransactionType.INCOME,
            date: { gte: startDate, lte: endDate }
        }
    });

    // Group by category with proper historical currency conversion
    const categoryMap = new Map<string, number>();
    let total = 0;

    for (const transaction of transactions) {
        const convertedAmount = await convertCurrencyFromDBHistorical(
            transaction.amount,
            transaction.currency,
            user.baseCurrency,
            transaction.date
        );

        total += convertedAmount;
        categoryMap.set(
            transaction.category,
            (categoryMap.get(transaction.category) || 0) + convertedAmount
        );
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

export async function getIncomeVsExpense(userId: string, period: Periodicity = Periodicity.MONTHLY, date = new Date()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Use getPeriodDates helper to get correct date range for any period type
    const { start: from, end: to } = getPeriodDates(period, date);

    const transactions = await prisma.transaction.findMany({
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
        const amountInBase = await convertCurrencyFromDBHistorical(tx.amount, tx.currency, user.baseCurrency, tx.date);

        if (tx.type === TransactionType.INCOME) {
            income += amountInBase;
        } else {
            expense += amountInBase;
        }
    }

    // Generate period label based on period type
    let periodLabel: string;
    switch (period) {
        case Periodicity.DAILY:
            periodLabel = date.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' });
            break;
        case Periodicity.WEEKLY:
            periodLabel = `Week of ${from.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            break;
        case Periodicity.MONTHLY:
            periodLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            break;
        case Periodicity.QUARTERLY:
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            periodLabel = `Q${quarter} ${date.getFullYear()}`;
            break;
        case Periodicity.HALF_YEARLY:
            const half = date.getMonth() < 6 ? 'H1' : 'H2';
            periodLabel = `${half} ${date.getFullYear()}`;
            break;
        case Periodicity.YEARLY:
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
export async function getMonthlyIncomeVsExpense(userId: string) {
    return getIncomeVsExpense(userId, Periodicity.MONTHLY);
}

export async function getCategoryBreakdown(userId: string, startDate?: string, endDate?: string) {
    // Validate date strings if provided
    if (startDate && isNaN(Date.parse(startDate))) {
        throw new Error('Invalid start date format');
    }
    if (endDate && isNaN(Date.parse(endDate))) {
        throw new Error('Invalid end date format');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const now = new Date();
    const from = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = endDate ? new Date(endDate) : (() => {
        const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        date.setUTCHours(23, 59, 59, 999);
        return date;
    })();

    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            type: TransactionType.EXPENSE,
            date: { gte: from, lte: to },
        },
    });

    const breakdownMap = new Map<string, number>();

    for (const txn of transactions) {
        const converted = await convertCurrencyFromDBHistorical(txn.amount, txn.currency, user.baseCurrency, txn.date);
        breakdownMap.set(
            txn.category,
            (breakdownMap.get(txn.category) || 0) + converted
        );
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

export async function getAssetAllocation(userId: string, groupBy: 'assetType' | 'platform' | 'ticker' = 'assetType') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const holdings = await prisma.holding.findMany({
        where: { userId },
    });

    const allocationMap = new Map<string, number>();

    for (const holding of holdings) {
        // Use pre-calculated convertedValue if available, otherwise calculate on the fly
        let convertedValue = holding.convertedValue;

        // If convertedValue is 0 or missing, calculate it
        if (!convertedValue || convertedValue === 0) {
            const totalValue = holding.lastPrice * holding.quantity;
            convertedValue = await convertCurrencyFromDB(totalValue, holding.holdingCurrency, user.baseCurrency);
        }

        const key = holding[groupBy];
        allocationMap.set(key, (allocationMap.get(key) || 0) + convertedValue);
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

export async function getBudgetVsActual(userId: string, period: Periodicity = Periodicity.MONTHLY, date = new Date()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // Use getPeriodDates helper to get correct date range for any period type
    const { start: periodStart, end: periodEnd } = getPeriodDates(period, date);

    const [budgets, transactions, plannedEvents] = await Promise.all([
        prisma.budget.findMany({
            where: {
                userId,
                period
            },
        }),
        prisma.transaction.findMany({
            where: {
                userId,
                type: TransactionType.EXPENSE,
                date: {
                    gte: periodStart,
                    lte: periodEnd
                },
            },
        }),
        prisma.plannedEvent.findMany({
            where: { userId, targetDate: { gte: periodStart, lte: periodEnd }, completed: false },
        }),
    ]);

    const actualsMap = new Map<string, number>();

    const addAmount = async (category: string, amount: number, currency: string, date: Date) => {
        const converted = await convertCurrencyFromDBHistorical(amount, currency, user.baseCurrency, date);
        actualsMap.set(category, (actualsMap.get(category) || 0) + converted);
    };

    for (const txn of transactions) {
        await addAmount(txn.category, txn.amount, txn.currency, txn.date);
    }
    for (const pe of plannedEvents) {
        await addAmount(pe.category, pe.estimatedCost, pe.currency, pe.targetDate);
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

export async function getGoalProgressReport(userId: string) {
    const goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: { targetDate: "asc" },
    });

    const today = new Date();

    return goals.map((goal) => {
        const progress = goal.targetAmount === 0
            ? 0
            : Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);

        const daysLeft = daysBetween(today, goal.targetDate);

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

export async function detectRecurringTransactions(userId: string) {
    const txns = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "asc" },
    });

    const primaryKey = (t: any) => `${t.amount}-${t.category}-${t.description ?? ''}`;
    const fallbackKey = (t: any) => `${t.amount}-${t.category}`;

    const results: any[] = [];

    const checkGroup = (group: any[], key: string) => {
        if (group.length < 3) return;

        const dates = group.map(txn => txn.date);
        const freq = detectFrequency(dates);
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

    const primaryGroups = groupBy(txns, primaryKey);
    for (const [key, group] of Object.entries(primaryGroups)) {
        checkGroup(group as any[], key + '--primary');
    }

    const fallbackGroups = groupBy(txns, fallbackKey);
    for (const [key, group] of Object.entries(fallbackGroups)) {
        const already = results.some(r => r.key.startsWith(key) && r.grouping === 'PRIMARY');
        if (!already) checkGroup(group as any[], key);
    }

    return results;
}