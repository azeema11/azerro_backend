import { monthsBetween, recurrenceToMonthlyFactor } from "../utils/date";
import prisma from "../utils/db";
import { convertCurrencyFromDB } from "../utils/currency";
import { withNotFoundHandling, withPrismaErrorHandling, ValidationError } from '../utils/prisma_errors';
import { GoalUpdateData, CreateGoalInput } from '../types/service_types';
import { toNumberSafe, subtractDecimal } from '../utils/utils';

export const getGoals = async (userId: string) => {
    return withPrismaErrorHandling(async () => {
        const goals = await prisma.goal.findMany({
            where: { userId }
        });

        const goalsWithProgress = goals.map(goal => ({
            ...goal,
            progress: toNumberSafe(goal.targetAmount) === 0
                ? 0
                : Math.min(100, (toNumberSafe(goal.savedAmount) / toNumberSafe(goal.targetAmount)) * 100)
        }));

        return goalsWithProgress;
    }, 'Goal');
};

export const createGoal = async (
    userId: string,
    data: CreateGoalInput
) => {
    // Business logic validation using enhanced ValidationError
    if (!data.name?.trim()) {
        throw new ValidationError(
            'Goal name is required',
            'Goal',
            undefined,
            { field: 'name', validationType: 'business' }
        );
    }

    if (!data.targetAmount || data.targetAmount <= 0) {
        throw new ValidationError(
            'Target amount must be greater than 0',
            'Goal',
            undefined,
            { field: 'targetAmount', validationType: 'business' }
        );
    }

    if (!data.targetDate) {
        throw new ValidationError(
            'Target date is required',
            'Goal',
            undefined,
            { field: 'targetDate', validationType: 'business' }
        );
    }

    if (new Date(data.targetDate) <= new Date()) {
        throw new ValidationError(
            'Target date must be in the future',
            'Goal',
            undefined,
            { field: 'targetDate', validationType: 'business' }
        );
    }

    // Database operation with Prisma error handling
    return withPrismaErrorHandling(async () => {
        // Get user's base currency
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true }
        });

        const currency = user?.baseCurrency ?? 'INR';

        return await prisma.goal.create({
            data: {
                userId,
                name: data.name.trim(),
                description: data.description?.trim() || null,
                targetAmount: data.targetAmount,
                savedAmount: data.savedAmount || 0,
                currency,
                targetDate: new Date(data.targetDate)
            }
        });
    }, 'Goal');
};

export const updateGoal = async (id: string, userId: string, data: GoalUpdateData) => {
    return withNotFoundHandling(async () => {
        return await prisma.goal.update({
            where: {
                id_userId: { id, userId }
            },
            data
        });
    }, 'Goal');
};

export const deleteGoal = async (id: string, userId: string) => {
    return withNotFoundHandling(async () => {
        await prisma.goal.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Goal');
};

export const getGoalById = async (id: string, userId: string) => {
    const goal = await prisma.goal.findUnique({
        where: {
            id_userId: { id, userId }
        },
        select: {
            id: true,
            name: true,
            description: true,
            targetAmount: true,
            savedAmount: true,
            currency: true,
            targetDate: true,
            createdAt: true,
            updatedAt: true,
            completed: true
        }
    });

    if (!goal) {
        throw new Error('Goal not found');
    }

    const targetAmount = toNumberSafe(goal.targetAmount);
    const progress = targetAmount === 0 ? 0 : Math.min(100, (toNumberSafe(goal.savedAmount) / targetAmount) * 100);
    return { ...goal, progress };
};

export const contributeToGoal = async (id: string, userId: string, amount: number) => {
    if (!amount || amount <= 0) {
        throw new ValidationError('Valid contribution amount is required', 'Goal');
    }

    // Get goal and user info for currency conversion using optimized queries
    const [existingGoal, user] = await Promise.all([
        prisma.goal.findUnique({
            where: { id_userId: { id, userId } },
            select: { currency: true }
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true }
        })
    ]);

    if (!existingGoal) {
        throw new ValidationError('Goal not found or access denied', 'Goal');
    }

    const finalContributionCurrency = user?.baseCurrency ?? 'INR';

    // Convert contribution amount to goal's currency if needed
    const convertedAmount = await convertCurrencyFromDB(
        amount,
        finalContributionCurrency,
        existingGoal.currency
    );

    return withNotFoundHandling(async () => {
        const goal = await prisma.goal.update({
            where: {
                id_userId: { id, userId }
            },
            data: {
                savedAmount: {
                    increment: convertedAmount
                }
            }
        });

        const targetAmount = toNumberSafe(goal.targetAmount);
        const progress = targetAmount === 0 ? 0 : Math.min(100, (toNumberSafe(goal.savedAmount) / targetAmount) * 100);
        return { ...goal, progress };
    }, 'Goal');
};

export async function checkGoalConflicts(userId: string) {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const goals = await prisma.goal.findMany({
            where: { userId, completed: false }
        });

        const events = await prisma.plannedEvent.findMany({
            where: { userId, completed: false }
        });

        const now = new Date();
        let totalRequired = 0;
        const detailed = [];

        // --- Goals ---
        for (const g of goals) {
            const monthsLeft = monthsBetween(now, g.targetDate);
            const amountLeft = toNumberSafe(subtractDecimal(g.targetAmount, g.savedAmount));
            const perMonthInGoalCurrency = monthsLeft > 0 ? amountLeft / monthsLeft : amountLeft;

            // Convert to user's base currency
            const perMonth = await convertCurrencyFromDB(
                perMonthInGoalCurrency,
                g.currency,
                user.baseCurrency
            );

            totalRequired += perMonth;

            detailed.push({
                type: "GOAL",
                id: g.id,
                name: g.name,
                perMonth: parseFloat(perMonth.toFixed(2)),
                monthsLeft,
                originalCurrency: g.currency
            });
        }

        // --- Planned Events ---
        for (const e of events) {
            let perMonthInEventCurrency = 0;

            if (e.recurrence === "ONE_TIME") {
                const monthsLeft = monthsBetween(now, e.targetDate);
                const amountLeft = toNumberSafe(subtractDecimal(e.estimatedCost, e.savedSoFar));
                perMonthInEventCurrency = monthsLeft > 0 ? amountLeft / monthsLeft : amountLeft;
            } else {
                // Recurring → convert to monthly equivalent
                const factor = recurrenceToMonthlyFactor(e.recurrence);
                perMonthInEventCurrency = toNumberSafe(e.estimatedCost) * factor;
            }

            // Convert to user's base currency
            const perMonth = await convertCurrencyFromDB(
                perMonthInEventCurrency,
                e.currency,
                user.baseCurrency
            );

            totalRequired += perMonth;

            detailed.push({
                type: "PLANNED_EVENT",
                id: e.id,
                name: e.name,
                perMonth: parseFloat(perMonth.toFixed(2)),
                recurrence: e.recurrence,
                originalCurrency: e.currency
            });
        }

        const conflict = totalRequired > toNumberSafe(user?.monthlyIncome ?? 0);
        const difference = totalRequired - toNumberSafe(user?.monthlyIncome ?? 0);

        return {
            conflict,
            totalRequiredPerMonth: parseFloat(totalRequired.toFixed(2)),
            availableMonthlyIncome: user?.monthlyIncome ?? 0,
            overBudgetBy: difference > 0 ? parseFloat(difference.toFixed(2)) : null,
            belowBudgetBy: difference < 0 ? parseFloat(Math.abs(difference).toFixed(2)) : null,
            currency: user.baseCurrency,
            breakdown: detailed
        };
    } catch (error) {
        console.error("Error in checkGoalConflicts:", error);
        throw error;
    }
}