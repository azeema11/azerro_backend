import prisma from "../utils/db";
import { Category, Periodicity, TransactionType } from "@prisma/client";
import { withNotFoundHandling, withPrismaErrorHandling, ValidationError } from '../utils/prisma_errors';
import { CreateBudgetInput, BudgetUpdateData } from '../types/service_types';
import { getPeriodDates } from "../utils/date";
import { getTotalConverted } from "../utils/currency";

export const createNewBudget = async (userId: string, data: CreateBudgetInput) => {
    // Validation
    if (!data.category) {
        throw new ValidationError(
            'Category is required',
            'Budget',
            undefined,
            { field: 'category', validationType: 'business' }
        );
    }

    if (!data.amount || data.amount <= 0) {
        throw new ValidationError(
            'Amount must be greater than 0',
            'Budget',
            undefined,
            { field: 'amount', validationType: 'business' }
        );
    }

    if (!data.period) {
        throw new ValidationError(
            'Period is required',
            'Budget',
            undefined,
            { field: 'period', validationType: 'business' }
        );
    }

    return withPrismaErrorHandling(async () => {
        return await prisma.budget.create({
            data: {
                userId,
                category: data.category,
                amount: data.amount,
                period: data.period,
            },
        });
    }, 'Budget');
};

export const getUserBudgets = async (userId: string) => {
    return withPrismaErrorHandling(async () => {
        return await prisma.budget.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }, 'Budget');
};

export const updateUserBudget = async (id: string, userId: string, data: BudgetUpdateData) => {
    return withNotFoundHandling(async () => {
        return await prisma.budget.update({
            where: {
                id_userId: { id, userId }
            },
            data,
        });
    }, 'Budget');
};

export const deleteUserBudget = async (id: string, userId: string) => {
    return withNotFoundHandling(async () => {
        await prisma.budget.delete({
            where: {
                id_userId: { id, userId }
            }
        });

        return { success: true };
    }, 'Budget');
};

export const getUserBudgetPerformance = async (userId: string) => {
    return withPrismaErrorHandling(async () => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new ValidationError(
            'User not found',
            'Budget',
            undefined,
            { field: 'userId', validationType: 'business' }
        );

        const budgets = await prisma.budget.findMany({ where: { userId } });

        const results = await Promise.all(
            budgets.map(async (budget) => {
                const { category, period, amount: budgetAmount } = budget;

                const dateRange = getPeriodDates(period);

                const [transactions, plannedEvents] = await Promise.all([
                    prisma.transaction.findMany({
                        where: {
                            userId,
                            type: TransactionType.EXPENSE,
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
    }, 'Budget');
};