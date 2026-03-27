import { generateText } from "../utils/ai_provider";
import { extractJsonFromText } from "../utils/json_extractor";
import { askQuestionToTransactionAgent } from "./transaction.service";
import { resolveGoalConflict } from "./goal.service";
import { chatBudgetAdvisor } from "./budget.service";
import { summarizeReport } from "./report.service";
import prisma from "../../utils/db";

/**
 * Single entry point for general AI chat queries.
 * Evaluates the user's intent and routes it to the correct specialized service.
 */
export const unifiedAssistantQuery = async (userId: string, message: string): Promise<{ success: boolean, answer: any }> => {

    // 1. Fetch recent chat history
    const recentMessages = await prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    // Reverse to get chronological order
    const historyContext = recentMessages.reverse().map(msg => `${msg.role === 'user' ? 'User' : 'AI'} (${msg.intent || 'general'}): ${msg.content}`).join('\n');

    const prompt = `
You are the intent router for Azerro, a personal finance assistant.
Analyze the user's message and determine what they want to do.

Recent Conversation History:
${historyContext}

Analyze the user's message and determine what they want to do.

User Message: "${message}"

Categories:
1. "transaction": Questions about past spending, finding specific transactions, or transaction summaries.
2. "goal": Questions about savings goals, creating goals, or resolving goal conflicts.
3. "budget": Questions about current budgets, overspending, or setting new budget limits.
4. "report": Requests to analyze or summarize a broader financial report (like income vs expense, or category breakdown).
5. "general": General financial advice or questions that don't fit the above or require specific user data.

Output Format (Strict JSON):
{
  "intent": "transaction" | "goal" | "budget" | "report" | "general",
  "confidence": number (0 to 1),
  "extractedParams": {
      // Any parameters that might be useful for the target service.
      // E.g., for "report", try to guess which report: { "reportType": "budgetVsActual" | "incomeVsExpense" | "categoryBreakdown" }
  }
}
`;

    try {
        const responseText = await generateText(prompt);
        const parsedIntent = extractJsonFromText(responseText);

        if (!parsedIntent || !parsedIntent.intent) {
             return await fallbackGeneralQuery(userId, message, historyContext);
        }

        const intent = parsedIntent.intent;

        let result;

        if (intent === "transaction") {
             result = await askQuestionToTransactionAgent(userId, message);
        } else if (intent === "budget") {
             result = await chatBudgetAdvisor(userId, message);
        } else if (intent === "goal") {
             // For general goal chat, we might just use the conflict resolver prompt as it's the most robust right now,
             // or ideally create a generic goal chat function. Let's use the conflict resolver for now with a dummy goal to trigger chat.
             result = await resolveGoalConflict({
                 userId,
                 conflictingGoal: { name: "General Inquiry", targetAmount: 0, targetDate: new Date().toISOString(), currency: "USD" },
                 userMessage: message,
                 history: recentMessages.map(m => ({ role: m.role as "user" | "ai", content: m.content }))
             });
        } else if (intent === "report") {
             const reportType = parsedIntent.extractedParams?.reportType || 'categoryBreakdown'; // Default
             result = await summarizeReport(userId, reportType, {});
        } else {
             result = await fallbackGeneralQuery(userId, message, historyContext);
        }

        // Save conversation to memory
        await prisma.chatMessage.createMany({
            data: [
                { userId, role: 'user', content: message, intent },
                { userId, role: 'ai', content: typeof result.answer?.message === 'string' ? result.answer.message : JSON.stringify(result.answer), intent }
            ]
        });

        return result;

    } catch (error) {
        console.error("AI Unified Assistant Error:", error);
         return {
            success: false,
            answer: {
                type: "chat",
                message: "Error processing your request.",
                action: null
            }
        };
    }
};

const fallbackGeneralQuery = async (userId: string, message: string, historyContext: string): Promise<{ success: boolean, answer: any }> => {
     // A simple fallback if intent is general or routing fails
      const prompt = `
You are Azerro, a helpful personal finance AI.
Answer the user's general financial question.
Do not assume specific details about their finances unless they tell you.

Recent Conversation History:
${historyContext}

User: "${message}"

Output Format (Strict JSON):
{
  "type": "chat",
  "message": "Your helpful response...",
  "action": null
}
`;
    const responseText = await generateText(prompt);
    const parsedResponse = extractJsonFromText(responseText);

    if (parsedResponse) {
        return { success: true, answer: parsedResponse };
    } else {
        return {
            success: true,
            answer: { type: "chat", message: responseText, action: null }
        };
    }
};
