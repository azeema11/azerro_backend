import prisma from "../../utils/db";
import { toNumberSafe } from "../../utils/utils";
import { withPrismaErrorHandling } from "../../utils/prisma_errors";
import { generateAndParse } from "../utils/ai_provider";
import { withCache } from "../../utils/redis";

export const askQuestionToTransactionAgent = async (userId: string, question: string): Promise<{ success: boolean, answer: any }> => {
    const transactionContext = await withCache(`ai:txn-context:${userId}`, 300, async () => {
        const transactions = await withPrismaErrorHandling(async () => {
            return await prisma.transaction.findMany({
                where: { userId },
                select: {
                    id: true, date: true, amount: true, category: true,
                    description: true, currency: true, type: true
                },
                orderBy: { date: 'desc' }
            });
        }, 'Transaction');

        return transactions.map(t => ({
            id: t.id, date: t.date.toISOString(), amount: toNumberSafe(t.amount),
            category: t.category, description: t.description || '',
            currency: t.currency, type: t.type,
        }));
    });

    const prompt = `
You are a financial assistant. 
You will receive a user's transactions and a question.
Use ONLY the provided transactions to answer.
Do not make assumptions or invent numbers.
If unsure, reply: "I don't have enough data to answer."

Transactions:
${JSON.stringify(transactionContext, null, 2)}

Question: ${question}

Output Format (Strict JSON):
{
  "type": "chat",
  "message": "Your answer...",
  "action": null | { "type": "create_transaction", "amount": number, "category": "string", "description": "string" }
}
`;

    return generateAndParse(
        prompt,
        (raw) => ({ type: "chat", message: raw, action: null }),
        { type: "chat", message: "Error processing your request.", action: null }
    );
}
