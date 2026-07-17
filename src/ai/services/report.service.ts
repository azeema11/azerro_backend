import { TransactionType, Periodicity } from "@prisma/client";
import prisma from "../../utils/db";
import { batchConvertCurrencyHistorical } from "../../utils/currency";
import { getPeriodDates, parseOptionalDateRange, formatDateKey, formatPeriodLabel } from "../../utils/date";
import { withCache } from "../../utils/redis";
import { toNumberSafe, roundTo, accumulateByKey } from "../../utils/utils";
import { NotFoundError } from "../../utils/prisma_errors";

export async function getIncomeVsExpense(
    userId: string,
    period: Periodicity = Periodicity.MONTHLY,
    date = new Date(),
) {
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
            category,
            amount: roundTo(amount),
        }));
        const total = breakdown.reduce((sum, entry) => sum + entry.amount, 0);

        return { total: roundTo(total), breakdown, currency: user.baseCurrency };
    });
}

export async function getBudgetVsActual(
    userId: string,
    period: Periodicity = Periodicity.MONTHLY,
    date = new Date(),
) {
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

        const budgetResult = budgets.map((budget) => ({
            category: budget.category,
            budgeted: roundTo(toNumberSafe(budget.amount)),
            spent: roundTo(actualsMap.get(budget.category) || 0),
        }));

        return { currency: user.baseCurrency, period, result: budgetResult };
    });
}
