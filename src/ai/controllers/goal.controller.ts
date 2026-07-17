import { getGoals, createGoal, updateGoal } from "../services/goal.service";
import { withCache, safeDel } from "../../utils/redis";
import { toNumberSafe } from "../../utils/utils";
import { validateDateString, formatDateKey } from "../../utils/date";
import { presentGoal } from "../utils/presenters";

export async function handleGetGoals(userId: string, includeCompleted?: boolean) {
    const scope = includeCompleted ? "all" : "active";
    return withCache(`adk:goals:${userId}:${scope}`, 180, async () => {
        const goals = await getGoals(userId, includeCompleted);

        return goals.map(presentGoal);
    });
}

export async function handleCreateGoal(
    userId: string,
    input: {
        name: string;
        targetAmount: number;
        targetDate: string;
        description?: string;
        currency?: string;
    }
) {
    validateDateString(input.targetDate, "targetDate");

    const goal = await createGoal(userId, {
        name: input.name,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate,
        description: input.description,
        currency: input.currency,
    });

    await safeDel(`adk:goals:${userId}:active`);
    await safeDel(`adk:goals:${userId}:all`);

    return {
        status: "success",
        message: `Goal "${input.name}" created with a target of ${input.targetAmount} ${goal.currency} by ${input.targetDate}.`,
        goalId: goal.id,
    };
}

export async function handleUpdateGoal(
    userId: string,
    input: {
        goalId: string;
        targetAmount?: number;
        targetDate?: string;
        savedAmount?: number;
        completed?: boolean;
        name?: string;
        description?: string;
    }
) {
    validateDateString(input.targetDate, "targetDate");

    const result = await updateGoal(userId, input.goalId, {
        targetAmount: input.targetAmount,
        targetDate: input.targetDate,
        savedAmount: input.savedAmount,
        completed: input.completed,
        name: input.name,
        description: input.description,
    });

    if (!result) {
        return { status: "error", message: "Goal not found, does not belong to this user, or no fields to update." };
    }

    await safeDel(`adk:goals:${userId}:active`);
    await safeDel(`adk:goals:${userId}:all`);

    return {
        status: "success",
        message: `Goal "${result.original.name}" updated successfully.`,
        updatedFields: {
            ...(input.targetAmount !== undefined && { targetAmount: toNumberSafe(result.updated.targetAmount) }),
            ...(input.targetDate !== undefined && { targetDate: formatDateKey(result.updated.targetDate) }),
            ...(input.savedAmount !== undefined && { savedAmount: toNumberSafe(result.updated.savedAmount) }),
            ...(input.completed !== undefined && { completed: result.updated.completed }),
            ...(input.name !== undefined && { name: result.updated.name }),
            ...(input.description !== undefined && { description: result.updated.description }),
        },
    };
}
