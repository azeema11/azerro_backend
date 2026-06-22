import { Category, Periodicity } from "@prisma/client";
import prisma from "../../utils/db";

export async function getBudgets(userId: string, category?: Category) {
    const where: Record<string, unknown> = { userId };
    if (category) where.category = category;

    return prisma.budget.findMany({ where });
}

export interface UpsertBudgetData {
    category: string;
    amount: number;
    period: string;
}

/**
 * Finds an existing budget by (userId, category, period) and updates it,
 * or creates a new one. Returns the record and whether it was an update or create.
 */
export async function upsertBudget(userId: string, data: UpsertBudgetData) {
    const existing = await prisma.budget.findFirst({
        where: {
            userId,
            category: data.category as Category,
            period: data.period as Periodicity,
        },
    });

    if (existing) {
        const updated = await prisma.budget.update({
            where: { id: existing.id },
            data: { amount: data.amount },
        });
        return { record: updated, action: "updated" as const };
    }

    const created = await prisma.budget.create({
        data: {
            userId,
            category: data.category as Category,
            amount: data.amount,
            period: data.period as Periodicity,
        },
    });
    return { record: created, action: "created" as const };
}
