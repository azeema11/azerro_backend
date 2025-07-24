import { TransactionType } from "@prisma/client";
import prisma from "../utils/db";
import { convertCurrencyFromDB } from "../utils/currency";

export async function getExpenseSummary(userId: string, start?: string, end?: string) {
    const startDate = start ? new Date(start) : new Date("2000-01-01");
    const endDate = end ? new Date(end) : new Date();

    const transactions = await prisma.transaction.groupBy({
        by: ['category'],
        where: {
            userId,
            type: TransactionType.EXPENSE,
            date: { gte: startDate, lte: endDate }
        },
        _sum: {
            amount: true
        }
    });

    const total = transactions.reduce((sum, t) => sum + (t._sum.amount ?? 0), 0);

    return {
        total,
        byCategory: transactions.map(t => ({
            category: t.category,
            total: t._sum.amount ?? 0
        }))
    };
}

export async function getMonthlyIncomeVsExpense(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

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
        const amountInBase = await convertCurrencyFromDB(tx.amount, tx.currency, user.baseCurrency);

        if (tx.type === TransactionType.INCOME) {
            income += amountInBase;
        } else {
            expense += amountInBase;
        }
    }

    return {
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        income,
        expense,
        net: income - expense,
        currency: user.baseCurrency,
    };
}

export async function getCategoryBreakdown(userId: string, startDate?: string, endDate?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const now = new Date();
    const from = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            date: { gte: from, lte: to },
            amount: { gt: 0 }, // Expense is positive outflow
        },
    });

    const breakdownMap = new Map<string, number>();

    for (const txn of transactions) {
        const converted = await convertCurrencyFromDB(txn.amount, txn.currency, user.baseCurrency);
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
        const totalValue = holding.lastPrice * holding.quantity;
        const convertedValue = await convertCurrencyFromDB(totalValue, holding.holdingCurrency, user.baseCurrency);

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

export async function getBudgetVsActual(userId: string, period: 'MONTHLY' | 'WEEKLY' | 'ANNUAL' = 'MONTHLY', date = new Date()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // For now only supporting MONTHLY
    const periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const [budgets, transactions] = await Promise.all([
        prisma.budget.findMany({
            where: {
                userId,
                period,
            },
        }),
        prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: periodStart,
                    lte: periodEnd,
                },
            },
        }),
    ]);

    const actualsMap = new Map<string, number>();

    for (const txn of transactions) {
        const converted = await convertCurrencyFromDB(txn.amount, txn.currency, user.baseCurrency);
        const current = actualsMap.get(txn.category) || 0;
        actualsMap.set(txn.category, current + converted);
    }

    const result = budgets.map(budget => {
        const actual = actualsMap.get(budget.category) || 0;
        return {
            category: budget.category,
            budgeted: parseFloat(budget.amount.toFixed(2)),
            spent: parseFloat(actual.toFixed(2)),
        };
    });

    return {
        currency: user.baseCurrency,
        period,
        result,
    };
}