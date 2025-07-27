import { monthsBetween } from "../utils/date";
import prisma from "../utils/db";

export const getGoals = async (userId: string) => {
    try {
        const goals = await prisma.goal.findMany({
            where: { userId }
        });

        const goalsWithProgress = goals.map(goal => ({
            ...goal,
            progress: Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
        }));

        return goalsWithProgress;
    } catch (err) {
        console.error('Failed to get goals:', err);
        throw err;
    }
};

export const createGoal = async (
    userId: string,
    name: string,
    targetAmount: number,
    targetDate: string,
    description?: string,
    savedAmount?: number
) => {
    try {
        if (!name || !targetAmount || !targetDate) {
            throw new Error('Name, target amount, and target date are required');
        }

        // Get user's base currency
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true }
        });

        const currency = user?.baseCurrency ?? 'INR';

        const goal = await prisma.goal.create({
            data: {
                userId,
                name,
                description,
                targetAmount,
                savedAmount: savedAmount || 0,
                currency,
                targetDate: new Date(targetDate)
            }
        });

        return goal;
    } catch (err) {
        console.error('Failed to create goal:', err);
        throw err;
    }
};

export const updateGoal = async (id: string, data: any) => {
    try {
        const updated = await prisma.goal.update({
            where: { id },
            data: {
                ...data,
            }
        });

        return updated;
    } catch (err) {
        console.error('Failed to update goal:', err);
        throw err;
    }
};

export const deleteGoal = async (id: string) => {
    try {
        await prisma.goal.delete({ where: { id } });
    } catch (err) {
        console.error('Failed to delete goal:', err);
        throw err;
    }
};

export const getGoalById = async (id: string, userId: string) => {
    try {
        const goal = await prisma.goal.findFirst({
            where: {
                id,
                userId
            }
        });

        if (!goal) {
            throw new Error('Goal not found');
        }

        const progress = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
        return { ...goal, progress };
    } catch (err) {
        console.error('Failed to get goal by id:', err);
        throw err;
    }
};

export const contributeToGoal = async (id: string, amount: number) => {
    try {
        if (!amount || amount <= 0) {
            throw new Error('Valid contribution amount is required');
        }

        const goal = await prisma.goal.update({
            where: { id },
            data: {
                savedAmount: {
                    increment: amount
                }
            }
        });

        const progress = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
        return { ...goal, progress };
    } catch (err) {
        console.error('Failed to contribute to goal:', err);
        throw err;
    }
};

export async function checkGoalConflicts(userId: string) {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const goals = await prisma.goal.findMany({
            where: { userId, completed: false }
        });

        const now = new Date();
        let totalRequired = 0;
        const detailed = [];

        for (const g of goals) {
            const monthsLeft = monthsBetween(now, g.targetDate);
            const amountLeft = g.targetAmount - g.savedAmount;
            const perMonth = monthsLeft > 0 ? amountLeft / monthsLeft : amountLeft;
            totalRequired += perMonth;

            detailed.push({ goalId: g.id, name: g.name, perMonth, monthsLeft });
        }

        const conflict = totalRequired > (user?.monthlyIncome ?? 0);

        return {
            conflict,
            totalRequiredPerMonth: totalRequired,
            availableMonthlyIncome: user?.monthlyIncome ?? 0,
            overBudgetBy: totalRequired - (user?.monthlyIncome ?? 0),
            breakdown: detailed
        };
    } catch (error) {
        console.error("Error in checkGoalConflicts:", error);
        throw error;
    }
}