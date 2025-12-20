"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askQuestionToTransactionAgent = void 0;
const ollama_1 = require("../utils/ollama");
const db_1 = __importDefault(require("../../utils/db"));
const utils_1 = require("../../utils/utils");
const prisma_errors_1 = require("../../utils/prisma_errors");
const askQuestionToTransactionAgent = async (userId, question) => {
    // Fetch all user transactions with only the fields needed for AI context
    const transactions = await (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return await db_1.default.transaction.findMany({
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
        amount: (0, utils_1.toNumberSafe)(t.amount),
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
`;
    try {
        const response = await (0, ollama_1.callOllama)(prompt);
        return {
            success: true,
            answer: response,
        };
    }
    catch (error) {
        console.error("AI Transaction Q&A Error:", error);
        return { success: false, answer: "Error processing your request." };
    }
};
exports.askQuestionToTransactionAgent = askQuestionToTransactionAgent;
