import prisma from "../../utils/db";
import { generateAiResponse } from "../utils/ai_provider";
import { toNumberSafe } from "../../utils/utils";
import { extractJsonFromText } from "../utils/json_extractor";

export const analyzePlannedEventsImpact = async (userId: string): Promise<{ success: boolean, answer: any }> => {
    try {
        // 1. Fetch User Data (Income and Base Currency)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true, monthlyIncome: true }
        });

        if (!user) throw new Error("User not found");

        // 2. Fetch Active Planned Events
        const events = await prisma.plannedEvent.findMany({
            where: { userId, completed: false },
            orderBy: { targetDate: 'asc' }
        });

        // 3. Fetch Active Goals
        const goals = await prisma.goal.findMany({
            where: { userId, completed: false },
            orderBy: { targetDate: 'asc' }
        });

        // 4. Summarize Data for AI
        const income = toNumberSafe(user.monthlyIncome || 0);
        const baseCurrency = user.baseCurrency;

        const eventSummary = events.map(e => ({
            name: e.name,
            cost: toNumberSafe(e.estimatedCost),
            date: e.targetDate.toISOString().split('T')[0]
        }));

        const goalSummary = goals.map(g => ({
            name: g.name,
            targetAmount: toNumberSafe(g.targetAmount),
            savedAmount: toNumberSafe(g.savedAmount),
            remaining: toNumberSafe(g.targetAmount) - toNumberSafe(g.savedAmount),
            date: g.targetDate.toISOString().split('T')[0]
        }));

        // 5. Build Prompt
        const prompt = `
You are an expert financial advisor AI for Azerro.
The user wants an analysis of the impact of their "Planned Events" on their budget and existing goals.

Data Context:
- Base Currency: ${baseCurrency}
- Monthly Income: ${income}
- Planned Events (Upcoming Expenses): ${JSON.stringify(eventSummary)}
- Active Savings Goals: ${JSON.stringify(goalSummary)}

Your Task:
Analyze how the upcoming planned events will impact the user's cash flow, savings, and ability to reach their goals on time.
Calculate and provide an estimate of the extra monthly savings required to meet these upcoming planned event costs on top of their goals.

Output Format (Strict JSON):
{
  "type": "event_impact_analysis",
  "monthlySavingsRequiredForEvents": number,
  "impactOnGoals": "A concise paragraph explaining if the events put any goals at risk.",
  "impactOnIncome": "A concise paragraph explaining the proportion of income needed.",
  "recommendations": [
    "String recommendation 1",
    "String recommendation 2"
  ]
}
`;

        try {
            const responseText = await generateAiResponse(prompt);
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
                        type: "event_impact_analysis",
                        monthlySavingsRequiredForEvents: 0,
                        impactOnGoals: "Unable to parse precise impact.",
                        impactOnIncome: responseText, // Fallback
                        recommendations: []
                    }
                };
            }
        } catch (error) {
            console.error("AI Planned Event Impact Analysis Error:", error);
            return {
                success: false,
                answer: {
                    type: "event_impact_analysis",
                    monthlySavingsRequiredForEvents: 0,
                    impactOnGoals: "Error analyzing impact.",
                    impactOnIncome: "Error analyzing impact.",
                    recommendations: []
                }
            };
        }

    } catch (error) {
        console.error("Error in analyzePlannedEventsImpact:", error);
        return {
            success: false,
            answer: {
                type: "event_impact_analysis",
                monthlySavingsRequiredForEvents: 0,
                impactOnGoals: "Error processing request.",
                impactOnIncome: "Error processing request.",
                recommendations: []
            }
        };
    }
};
