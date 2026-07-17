import { Category } from "@prisma/client";
import { getBudgets, upsertBudget } from "../services/budget.service";
import { withCache, safeDel } from "../../utils/redis";
import { presentBudget } from "../utils/presenters";

export async function handleGetBudgets(userId: string, category?: string) {
    const cat = category || "all";
    return withCache(`adk:budgets:${userId}:${cat}`, 180, async () => {
        const budgets = await getBudgets(userId, category as Category);

        return budgets.map(presentBudget);
    });
}

export async function handleCreateBudget(
    userId: string,
    input: {
        category: string;
        amount: number;
        period: string;
    }
) {
    const { action } = await upsertBudget(userId, {
        category: input.category,
        amount: input.amount,
        period: input.period,
    });

    await safeDel(`adk:budgets:${userId}:all`);
    await safeDel(`adk:budgets:${userId}:${input.category}`);

    if (action === "updated") {
        return {
            status: "success",
            message: `Budget for ${input.category} (${input.period}) updated to ${input.amount}.`,
            action: "updated",
        };
    }

    return {
        status: "success",
        message: `Budget created: ${input.amount} ${input.period} for ${input.category}.`,
        action: "created",
    };
}
