import prisma from "../utils/db";
import { Category, Periodicity } from "@prisma/client";
import { getPeriodDates } from "../utils/date";
import { getTotalConverted } from "../utils/currency";

export const createNewBudget = async (userId: string, category: Category, amount: number, period: Periodicity) => {
    try {
        if (!category || !amount || !period) {
            throw new Error('category, amount, and period are required');
        }

        const newBudget = await prisma.budget.create({
            data: {
                userId,
                category,
                amount,
                period,
            },
        });

        return newBudget;
    } catch (err) {
        console.error('Failed to create budget:', err);
        throw err;
    }
};

export const getUserBudgets = async (userId: string) => {
    try {
        const budgets = await prisma.budget.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return budgets;
    } catch (err) {
        console.error('Failed to fetch budgets:', err);
        throw err;
    }
};

export const updateUserBudget = async (id: string, amount: number, category: Category, period: Periodicity) => {
    try {
        const existingBudget = await prisma.budget.findUnique({
            where: { id },
        });

        if (!existingBudget) {
            throw new Error('Budget not found');
        }

        const updatedBudget = await prisma.budget.update({
            where: { id },
            data: {
                amount,
                category,
                period,
            },
        });

        return updatedBudget;
    } catch (err) {
        console.error('Failed to update budget:', err);
        throw err;
    }
};

export const deleteUserBudget = async (id: string, userId: string) => {
    try {

        const existingBudget = await prisma.budget.findUnique({
            where: { id },
        });

        if (!existingBudget || existingBudget.userId !== userId) {
            throw new Error('Budget not found');
        }

        await prisma.budget.delete({
            where: { id },
        });

        return { success: true };
    } catch (err) {
        console.error('Failed to delete budget:', err);
        throw err;
    }
};

export const getUserBudgetPerformance = async (userId: string) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const budgets = await prisma.budget.findMany({ where: { userId } });

        const results = await Promise.all(
            budgets.map(async (budget) => {
                const { category, period, amount: budgetAmount } = budget;

                const dateRange = getPeriodDates(period);

                const [transactions, plannedEvents] = await Promise.all([
                    prisma.transaction.findMany({
                        where: {
                            userId,
                            category,
                            date: { gte: dateRange.start, lte: dateRange.end },
                        },
                    }),
                    prisma.plannedEvent.findMany({
                        where: {
                            userId,
                            category,
                            targetDate: { gte: dateRange.start, lte: dateRange.end },
                            completed: false,
                        },
                    }),
                ]);

                const totalSpent = await getTotalConverted(
                    [
                        ...transactions.map(t => ({ amount: t.amount, currency: t.currency })),
                        ...plannedEvents.map(pe => ({ amount: pe.estimatedCost, currency: pe.currency })),
                    ],
                    user.baseCurrency
                );

                return {
                    category,
                    period,
                    budgetAmount,
                    actualSpending: totalSpent,
                    currency: user.baseCurrency,
                    withinBudget: totalSpent <= budgetAmount,
                };
            })
        );

        return results;
    } catch (err) {
        console.error('Failed to fetch budget performance:', err);
        throw err;
    }
};