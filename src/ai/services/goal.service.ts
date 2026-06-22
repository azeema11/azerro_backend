import prisma from "../../utils/db";

export async function getGoals(userId: string, includeCompleted = false) {
    const where: Record<string, unknown> = { userId };
    if (!includeCompleted) where.completed = false;

    return prisma.goal.findMany({ where });
}

export interface CreateGoalData {
    name: string;
    targetAmount: number;
    targetDate: string;
    description?: string;
    currency?: string;
}

export async function createGoal(userId: string, data: CreateGoalData) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { baseCurrency: true },
    });

    return prisma.goal.create({
        data: {
            userId,
            name: data.name,
            targetAmount: data.targetAmount,
            savedAmount: 0,
            currency: data.currency || user?.baseCurrency || "USD",
            targetDate: new Date(data.targetDate),
            description: data.description || null,
        },
    });
}

export interface UpdateGoalData {
    targetAmount?: number;
    targetDate?: string;
    savedAmount?: number;
    completed?: boolean;
    name?: string;
    description?: string;
}

/**
 * Returns the original goal (for name reference) and the updated record,
 * or null if the goal was not found or no fields to update.
 */
export async function updateGoal(userId: string, goalId: string, data: UpdateGoalData) {
    const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId },
    });

    if (!goal) return null;

    const updateData: Record<string, unknown> = {};
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
    if (data.targetDate !== undefined) updateData.targetDate = new Date(data.targetDate);
    if (data.savedAmount !== undefined) updateData.savedAmount = data.savedAmount;
    if (data.completed !== undefined) updateData.completed = data.completed;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    if (Object.keys(updateData).length === 0) return null;

    const updated = await prisma.goal.update({
        where: { id: goalId },
        data: updateData,
    });

    return { original: goal, updated };
}
