import prisma from "../utils/db";
import { Category, Periodicity } from "@prisma/client";

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