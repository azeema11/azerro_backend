import prisma from "../../utils/db";
import { generateText } from "../utils/ai_provider";
import { extractJsonFromText } from "../utils/json_extractor";
import { toNumberSafe } from "../../utils/utils";
import { TransactionType } from "@prisma/client";

export const generatePredictiveInsights = async (userId: string): Promise<{ success: boolean, answer: any }> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true, monthlyIncome: true }
        });

        if (!user) throw new Error("User not found");

        // Fetch last 3 months of transactions for trend analysis
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: threeMonthsAgo }
            },
            select: {
                amount: true,
                type: true,
                category: true,
                date: true
            }
        });

        const activeGoals = await prisma.goal.findMany({
            where: { userId, completed: false }
        });

        // Basic aggregation for context
        let monthlyExpenses: Record<string, number> = {};
        let categoryTotals: Record<string, number> = {};

        transactions.forEach(t => {
            if (t.type === TransactionType.EXPENSE) {
                const amt = toNumberSafe(t.amount);
                const month = t.date.toISOString().slice(0, 7); // YYYY-MM

                monthlyExpenses[month] = (monthlyExpenses[month] || 0) + amt;
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
            }
        });

        const goalSummary = activeGoals.map(g => ({
            name: g.name,
            targetAmount: toNumberSafe(g.targetAmount),
            savedAmount: toNumberSafe(g.savedAmount),
            targetDate: g.targetDate.toISOString().split('T')[0]
        }));

        const prompt = `
You are an advanced financial AI for Azerro.
Your task is to generate "Predictive Insights" for the user based on their last 3 months of financial data.

Data Context:
- Base Currency: ${user.baseCurrency}
- Monthly Income: ${toNumberSafe(user.monthlyIncome || 0)}
- Monthly Expenses (Last 3 Months): ${JSON.stringify(monthlyExpenses)}
- Category Spending Totals (Last 3 Months): ${JSON.stringify(categoryTotals)}
- Active Goals: ${JSON.stringify(goalSummary)}

Task:
Forecast their financial trajectory for the next 3-6 months. Focus on:
1. Savings forecast (Will they save more or less based on trends?)
2. Spending trends (Are certain categories growing too fast?)
3. Goal completion (Are they on track to hit their target dates? If not, when will they realistically finish?)

Output Format (Strict JSON):
{
  "type": "predictive_insights",
  "savingsForecast": "A concise paragraph forecasting their ability to save over the next 3 months.",
  "spendingTrends": "A concise paragraph highlighting concerning or positive spending patterns.",
  "goalProjections": [
     { "goalName": "String", "onTrack": boolean, "projectedCompletionDate": "YYYY-MM-DD or 'Unknown'" }
  ],
  "recommendations": [
     "String proactive recommendation 1",
     "String proactive recommendation 2"
  ]
}
`;

        try {
            const responseText = await generateText(prompt);
            const parsedResponse = extractJsonFromText(responseText);

            if (parsedResponse) {
                return { success: true, answer: parsedResponse };
            } else {
                 return {
                    success: true,
                    answer: {
                        type: "predictive_insights",
                        savingsForecast: "Unable to parse forecast.",
                        spendingTrends: responseText, // Fallback
                        goalProjections: [],
                        recommendations: []
                    }
                };
            }
        } catch (error) {
            console.error("AI Predictive Insights Error:", error);
            return {
                success: false,
                answer: {
                    type: "predictive_insights",
                    savingsForecast: "Error generating forecast.",
                    spendingTrends: "Error analyzing trends.",
                    goalProjections: [],
                    recommendations: []
                }
            };
        }

    } catch (error) {
        console.error("Error in generatePredictiveInsights:", error);
        return {
            success: false,
            answer: {
                type: "predictive_insights",
                savingsForecast: "Error processing request.",
                spendingTrends: "Error processing request.",
                goalProjections: [],
                recommendations: []
            }
        };
    }
};
