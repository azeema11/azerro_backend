import { callOllama } from "../utils/ollama";
import prisma from "../../utils/db";
import { toNumberSafe } from "../../utils/utils";
import { withPrismaErrorHandling } from "../../utils/prisma_errors";
import { generateText } from "../utils/ai_provider";
import { extractJsonFromText } from "../utils/json_extractor";

export const askQuestionToTransactionAgent = async (userId: string, question: string): Promise<{ success: boolean, answer: any }> => {

    // Fetch all user transactions with only the fields needed for AI context
    const transactions = await withPrismaErrorHandling(async () => {
        return await prisma.transaction.findMany({
            where: {
                userId
            },
            select: {
                id: true,
                date: true,
                amount: true,
                category: true,
                description: true,
                currency: true,
                type: true
            },
            orderBy: {
                date: 'desc'
            }
        });
    }, 'Transaction');

    // Convert transactions to a format suitable for AI processing
    // Convert Decimal amounts to numbers and format dates
    const transactionContext = transactions.map(t => ({
        id: t.id,
        date: t.date.toISOString(),
        amount: toNumberSafe(t.amount),
        category: t.category,
        description: t.description || '',
        currency: t.currency,
        type: t.type,
    }));

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

    try {
        const responseText = await generateText(prompt);
        const parsedResponse = extractJsonFromText(responseText);

        if (parsedResponse) {
             return {
                success: true,
                answer: parsedResponse,
            };
        } else {
             return {
                success: true,
                answer: {
                    type: "chat",
                    message: responseText,
                    action: null
                }
            };
        }

    } catch (error) {
        console.error("AI Transaction Q&A Error:", error);
        return {
            success: false,
            answer: {
                type: "chat",
                message: "Error processing your request.",
                action: null
            }
        };
    }
}
