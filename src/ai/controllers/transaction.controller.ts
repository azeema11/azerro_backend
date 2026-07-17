import { Category, TransactionType } from "@prisma/client";
import { getTransactions, createTransaction } from "../services/transaction.service";
import { withCache, safeDel } from "../../utils/redis";
import { validateDateString } from "../../utils/date";
import { presentTransaction } from "../utils/presenters";

export async function handleGetTransactions(
    userId: string,
    input: {
        category?: string;
        type?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }
) {
    validateDateString(input.startDate, "startDate");
    validateDateString(input.endDate, "endDate");

    const cacheKeySuffix = `${input.category || "all"}:${input.type || "all"}:${input.startDate || ""}:${input.endDate || ""}:${input.limit ?? 50}`;
    return withCache(`adk:txn:${userId}:${cacheKeySuffix}`, 300, async () => {
        const transactions = await getTransactions(userId, {
            category: input.category as Category,
            type: input.type as TransactionType,
            startDate: input.startDate,
            endDate: input.endDate,
            limit: input.limit,
        });

        return transactions.map(presentTransaction);
    });
}

export async function handleCreateTransaction(
    userId: string,
    input: {
        amount: number;
        category: string;
        type: string;
        description?: string;
        currency?: string;
        date?: string;
    }
) {
    validateDateString(input.date, "date");

    const transaction = await createTransaction(userId, {
        amount: input.amount,
        category: input.category,
        type: input.type,
        description: input.description,
        currency: input.currency,
        date: input.date,
    });

    await safeDel(`adk:txn:${userId}:all:all:50`);

    return {
        status: "success",
        message: `Transaction created: ${input.type} of ${input.amount} ${transaction.currency} in ${input.category}`,
        transactionId: transaction.id,
    };
}
