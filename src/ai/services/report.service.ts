import { TransactionType, Periodicity } from "@prisma/client";
import prisma from "../../utils/db";
import { convertCurrencyFromDBHistorical } from "../../utils/currency";
import { getPeriodDates } from "../../utils/date";
import { withCache } from "../../utils/redis";
import { toNumberSafe } from "../../utils/utils";

function validateAndParseOptionalDateRange(start?: string, end?: string) {
    if (start && isNaN(Date.parse(start))) throw new Error("Invalid start date format");
    if (end && isNaN(Date.parse(end))) throw new Error("Invalid end date format");
    const now = new Date();
    const startDate = start ? new Date(start) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = end
        ? new Date(end)
        : (() => {
              const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              date.setUTCHours(23, 59, 59, 999);
              return date;
          })();
    return {
        startDate,
        endDate,
        startKey: startDate.toISOString().split("T")[0],
        endKey: endDate.toISOString().split("T")[0],
    };
}

export async function getIncomeVsExpense(
    userId: string,
    period: Periodicity = Periodicity.MONTHLY,
    date = new Date(),
) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    return withCache(`report:income-vs-expense:${userId}:${period}:${date.toISOString().split("T")[0]}`, 600, async () => {
        const { start: from, end: to } = getPeriodDates(period, date);

        const transactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: from, lte: to } },
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

        let periodLabel: string;
        switch (period) {
            case Periodicity.DAILY:
                periodLabel = date.toLocaleString("default", { month: "short", day: "numeric", year: "numeric" });
                break;
            case Periodicity.WEEKLY:
                periodLabel = `Week of ${from.toLocaleString("default", { month: "short", day: "numeric", year: "numeric" })}`;
                break;
            case Periodicity.MONTHLY:
                periodLabel = date.toLocaleString("default", { month: "long", year: "numeric" });
                break;
            case Periodicity.QUARTERLY:
                periodLabel = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
                break;
            case Periodicity.HALF_YEARLY:
                periodLabel = `${date.getMonth() < 6 ? "H1" : "H2"} ${date.getFullYear()}`;
                break;
            case Periodicity.YEARLY:
                periodLabel = date.getFullYear().toString();
                break;
            default:
                periodLabel = period;
        }

        return { period: periodLabel, periodType: period, income, expense, net: income - expense, currency: user.baseCurrency };
    });
}

export async function getCategoryBreakdown(userId: string, startDate?: string, endDate?: string) {
    const { startDate: from, endDate: to, startKey, endKey } = validateAndParseOptionalDateRange(startDate, endDate);

    return withCache(`report:category:${userId}:${startKey}:${endKey}`, 600, async () => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const transactions = await prisma.transaction.findMany({
            where: { userId, type: TransactionType.EXPENSE, date: { gte: from, lte: to } },
        });

        const breakdownMap = new Map<string, number>();
        for (const txn of transactions) {
            const converted = await convertCurrencyFromDBHistorical(txn.amount, txn.currency, user.baseCurrency, txn.date);
            breakdownMap.set(txn.category, (breakdownMap.get(txn.category) || 0) + converted);
        }

        const breakdown = Array.from(breakdownMap.entries()).map(([category, amount]) => ({
            category,
            amount: parseFloat(amount.toFixed(2)),
        }));
        const total = breakdown.reduce((sum, entry) => sum + entry.amount, 0);

        return { total: parseFloat(total.toFixed(2)), breakdown, currency: user.baseCurrency };
    });
}

export async function getBudgetVsActual(
    userId: string,
    period: Periodicity = Periodicity.MONTHLY,
    date = new Date(),
) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    return withCache(`report:budget-vs-actual:${userId}:${period}:${date.toISOString().split("T")[0]}`, 600, async () => {
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

        const actualsMap = new Map<string, number>();
        const addAmount = async (category: string, amount: number, currency: string, txDate: Date) => {
            const converted = await convertCurrencyFromDBHistorical(amount, currency, user.baseCurrency, txDate);
            actualsMap.set(category, (actualsMap.get(category) || 0) + converted);
        };

        for (const txn of transactions) await addAmount(txn.category, toNumberSafe(txn.amount), txn.currency, txn.date);
        for (const pe of plannedEvents) await addAmount(pe.category, toNumberSafe(pe.estimatedCost), pe.currency, pe.targetDate);

        const budgetResult = budgets.map((budget) => ({
            category: budget.category,
            budgeted: parseFloat(toNumberSafe(budget.amount).toFixed(2)),
            spent: parseFloat((actualsMap.get(budget.category) || 0).toFixed(2)),
        }));

        return { currency: user.baseCurrency, period, result: budgetResult };
    });
}
