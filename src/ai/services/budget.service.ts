import prisma from "../../utils/db";
import { generateText } from "../utils/ai_provider";
import { toNumberSafe } from "../../utils/utils";

/**
 * Generates a passive budget analysis summary for the user.
 */
export const getBudgetAnalysis = async (userId: string) => {
    try {
        // 1. Fetch User Data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true, monthlyIncome: true }
        });

        if (!user) throw new Error("User not found");

        // 2. Fetch Recent Transactions (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: thirtyDaysAgo }
            },
            select: {
                amount: true,
                currency: true,
                category: true,
                type: true,
                date: true
            }
        });

        // 3. Fetch Active Budgets
        const budgets = await prisma.budget.findMany({
            where: { userId }
        });

        // 4. Summarize Data for AI
        const income = toNumberSafe(user.monthlyIncome || 0);

        // Group spending by category
        const spendingByCategory: Record<string, number> = {};
        let totalSpent = 0;

        transactions.forEach(t => {
            if (t.type === 'EXPENSE') {
                const amt = toNumberSafe(t.amount);
                spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + amt;
                totalSpent += amt;
            }
        });

        // 5. Build Prompt
        const prompt = `
You are the Budget Advisor for Azerro.
Analyze the user's financial data for the last 30 days.

Data:
- Base Currency: ${user.baseCurrency}
- Monthly Income: ${income}
- Total Spent (Last 30d): ${totalSpent}
- Spending by Category: ${JSON.stringify(spendingByCategory)}
- Active Budgets: ${JSON.stringify(budgets.map(b => ({ category: b.category, limit: toNumberSafe(b.amount), period: b.period })))}

Your Task:
Provide a JSON summary with:
1. "status": "Good" | "Warning" | "Critical"
2. "insights": An array of 3 short, actionable bullet points strings.
3. "recommendation": A short paragraph of advice.

Output Format (Strict JSON):
{
  "status": "string",
  "insights": ["string", "string", "string"],
  "recommendation": "string"
}
`;

        try {
            const responseText = await generateText(prompt);
            return {
                success: true,
                answer: responseText,
            };
        } catch (error) {
            console.error("AI Budget Analysis Error:", error);
            return { success: false, answer: "Error processing your request." };
        }

    } catch (error) {
        console.error("Error in getBudgetAnalysis:", error);
        return { success: false, answer: "Error processing your request." };
    }
};

/**
 * Handles interactive chat with the Budget Advisor.
 */
export const chatBudgetAdvisor = async (userId: string, message: string, history: { role: string, content: string }[] = []) => {
    try {
        // Fetch context (similar to above, but maybe less aggregated to allow deeper questions)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true }
        });

        // Fetch recent transactions (last 60 days for broader context in chat)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const transactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: sixtyDaysAgo } },
            orderBy: { date: 'desc' },
            take: 50 // Limit to last 50 for prompt size
        });

        const budgets = await prisma.budget.findMany({ where: { userId } });

        const context = {
            currency: user?.baseCurrency,
            transactions: transactions.map(t => ({
                date: t.date.toISOString().split('T')[0],
                amount: toNumberSafe(t.amount),
                cat: t.category,
                type: t.type,
                desc: t.description
            })),
            budgets: budgets.map(b => ({ cat: b.category, amt: toNumberSafe(b.amount), period: b.period }))
        };

        const systemPrompt = `
You are the Budget Advisor Chatbot.
Answer the user's question based on their recent financial data.
Be helpful, specific, and data-driven.
If the answer isn't in the data, say "I don't have enough data to answer that."

Data Context:
${JSON.stringify(context)}
`;

        const conversationHistory = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n');

        const fullPrompt = `
${systemPrompt}

Conversation:
${conversationHistory}

User Question: "${message}"

Answer:
`;

        try {
            const responseText = await generateText(fullPrompt);
            return {
                success: true,
                answer: responseText,
            };
        } catch (error) {
            console.error("AI Budget Advisor Error:", error);
            return { success: false, answer: "Error processing your request." };
        }

    } catch (error) {
        console.error("Error in chatBudgetAdvisor:", error);
        return { success: false, answer: "Error processing your request." };
    }
};
