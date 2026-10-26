import { monthsBetween, recurrenceToMonthlyFactor } from "../utils/date";
import prisma from "../utils/db";
import { convertCurrencyFromDB, batchConvertCurrency } from "../utils/currency";
import { withNotFoundHandling, withPrismaErrorHandling, ValidationError, NotFoundError } from '../utils/prisma_errors';
import { GoalUpdateData, CreateGoalInput } from '../types/service_types';
import { withCache, safeDel } from '../utils/redis';
import { toNumberSafe, subtractDecimal, calcGoalProgress } from '../utils/utils';

async function invalidateGoalCaches(userId: string) {
    await safeDel(`goal:conflicts:${userId}`);
}

export const getGoals = async (userId: string) => {
    return withPrismaErrorHandling(async () => {
        const goals = await prisma.goal.findMany({
            where: { userId }
        });

        const goalsWithProgress = goals.map(goal => ({
            ...goal,
            progress: calcGoalProgress(goal.savedAmount, goal.targetAmount)
        }));

        return goalsWithProgress;
    }, 'Goal');
};

export const createGoal = async (
    userId: string,
    data: CreateGoalInput
) => {
    // Business logic validation: target date must be in the future
    if (new Date(data.targetDate) <= new Date()) {
        throw new ValidationError(
            'Target date must be in the future',
            'Goal',
            undefined,
            { field: 'targetDate', validationType: 'business' }
        );
    }

    return withPrismaErrorHandling(async () => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true }
        });

        const currency = user?.baseCurrency ?? 'INR';

        const goal = await prisma.goal.create({
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
        await invalidateGoalCaches(userId);
        return goal;
    }, 'Goal');
};

export const updateGoal = async (id: string, userId: string, data: GoalUpdateData) => {
    return withNotFoundHandling(async () => {
        const goal = await prisma.goal.update({
            where: {
                id_userId: { id, userId }
            },
            data
        });
        await invalidateGoalCaches(userId);
        return goal;
    }, 'Goal');
};

export const deleteGoal = async (id: string, userId: string) => {
    return withNotFoundHandling(async () => {
        await prisma.goal.delete({
            where: {
                id_userId: { id, userId }
            }
        });
        await invalidateGoalCaches(userId);
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
        throw new NotFoundError('Goal');
    }

    return { ...goal, progress: calcGoalProgress(goal.savedAmount, goal.targetAmount) };
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

        await invalidateGoalCaches(userId);
        return { ...goal, progress: calcGoalProgress(goal.savedAmount, goal.targetAmount) };
    }, 'Goal');
};

export async function checkGoalConflicts(userId: string) {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundError('User');

        return withCache(`goal:conflicts:${userId}`, 600, async () => {
            const [goals, events] = await Promise.all([
                prisma.goal.findMany({ where: { userId, completed: false } }),
                prisma.plannedEvent.findMany({ where: { userId, completed: false } }),
            ]);

            const now = new Date();
            const detailed: any[] = [];

            // Pre-compute per-month amounts in original currencies
            const goalAmounts = goals.map(g => {
                const monthsLeft = monthsBetween(now, g.targetDate);
                const amountLeft = toNumberSafe(subtractDecimal(g.targetAmount, g.savedAmount));
                return { amount: monthsLeft > 0 ? amountLeft / monthsLeft : amountLeft, currency: g.currency };
            });

            const eventAmounts = events.map(e => {
                let perMonth = 0;
                if (e.recurrence === "ONE_TIME") {
                    const monthsLeft = monthsBetween(now, e.targetDate);
                    const amountLeft = toNumberSafe(subtractDecimal(e.estimatedCost, e.savedSoFar));
                    perMonth = monthsLeft > 0 ? amountLeft / monthsLeft : amountLeft;
                } else {
                    perMonth = toNumberSafe(e.estimatedCost) * recurrenceToMonthlyFactor(e.recurrence);
                }
                return { amount: perMonth, currency: e.currency };
            });

            // Batch convert all amounts in a single optimized call
            const allAmounts = [...goalAmounts, ...eventAmounts];
            const converted = await batchConvertCurrency(allAmounts, user.baseCurrency);

            let totalRequired = 0;

            for (let i = 0; i < goals.length; i++) {
                const perMonth = converted[i];
                totalRequired += perMonth;
                const g = goals[i];
                detailed.push({
                    type: "GOAL", id: g.id, name: g.name, perMonth: parseFloat(perMonth.toFixed(2)),
                    monthsLeft: monthsBetween(now, g.targetDate), originalCurrency: g.currency, targetDate: g.targetDate,
                });
            }

            for (let i = 0; i < events.length; i++) {
                const perMonth = converted[goals.length + i];
                totalRequired += perMonth;
                const e = events[i];
                detailed.push({
                    type: "PLANNED_EVENT", id: e.id, name: e.name, perMonth: parseFloat(perMonth.toFixed(2)),
                    recurrence: e.recurrence, originalCurrency: e.currency, targetDate: e.targetDate,
                });
            }

            const conflict = totalRequired > toNumberSafe(user?.monthlyIncome ?? 0);
            const difference = totalRequired - toNumberSafe(user?.monthlyIncome ?? 0);

            return {
                conflict, totalRequiredPerMonth: parseFloat(totalRequired.toFixed(2)),
                availableMonthlyIncome: user?.monthlyIncome ?? 0,
                overBudgetBy: difference > 0 ? parseFloat(difference.toFixed(2)) : null,
                belowBudgetBy: difference < 0 ? parseFloat(Math.abs(difference).toFixed(2)) : null,
                currency: user.baseCurrency, breakdown: detailed,
            };
        });
    } catch (error) {
        console.error("Error in checkGoalConflicts:", error);
        throw error;
    }
}