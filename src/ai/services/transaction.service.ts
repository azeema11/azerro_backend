import { Category, TransactionType } from "@prisma/client";
import prisma from "../../utils/db";
import { withPrismaErrorHandling } from "../../utils/prisma_errors";

export interface GetTransactionsFilter {
    category?: Category;
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
    limit?: number;
}

export async function getTransactions(userId: string, filter: GetTransactionsFilter = {}) {
    const where: Record<string, unknown> = { userId };
    if (filter.category) where.category = filter.category;
    if (filter.type) where.type = filter.type;

    if (filter.startDate || filter.endDate) {
        const dateFilter: Record<string, Date> = {};
        if (filter.startDate) dateFilter.gte = new Date(filter.startDate);
        if (filter.endDate) dateFilter.lte = new Date(filter.endDate);
        where.date = dateFilter;
    }

    return withPrismaErrorHandling(
        () =>
            prisma.transaction.findMany({
                where,
                select: {
                    id: true,
                    date: true,
                    amount: true,
                    category: true,
                    description: true,
                    currency: true,
                    type: true,
                },
                orderBy: { date: "desc" },
                take: filter.limit ?? 50,
            }),
        "Transaction",
    );
}

export interface CreateTransactionData {
    amount: number;
    category: string;
    type: string;
    description?: string;
    currency?: string;
    date?: string;
}

export async function createTransaction(userId: string, data: CreateTransactionData) {
    return withPrismaErrorHandling(async () => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true },
        });

        return prisma.transaction.create({
            data: {
                userId,
                amount: data.amount,
                currency: data.currency || user?.baseCurrency || "USD",
                category: data.category as Category,
                type: data.type as TransactionType,
                description: data.description || null,
                date: data.date ? new Date(data.date) : new Date(),
            },
        });
    }, "Transaction");
}
