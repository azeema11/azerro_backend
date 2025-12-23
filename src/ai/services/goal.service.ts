import prisma from "../../utils/db";
import { generateText } from "../utils/ai_provider";
import { toNumberSafe } from "../../utils/utils";
import { ResolveGoalConflictInput } from "../../types/service_types";

export const resolveGoalConflict = async ({
    userId,
    conflictingGoal,
    userMessage,
    history = []
}: ResolveGoalConflictInput) => {
    try {
        // 1. Fetch User Context (Income & Base Currency)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true, monthlyIncome: true }
        });

        if (!user) throw new Error("User not found");

        // 2. Fetch Existing Active Goals
        const goals = await prisma.goal.findMany({
            where: { userId, completed: false }
        });

        // 3. Fetch Planned Events
        const events = await prisma.plannedEvent.findMany({
            where: { userId, completed: false }
        });

        // 4. Construct Context Summary
        const income = toNumberSafe(user.monthlyIncome || 0);
        const baseCurrency = user.baseCurrency;

        const goalSummary = goals.map(g => ({
            name: g.name,
            remaining: toNumberSafe(g.targetAmount) - toNumberSafe(g.savedAmount),
            date: g.targetDate.toISOString().split('T')[0]
        }));

        const eventSummary = events.map(e => ({
            name: e.name,
            cost: toNumberSafe(e.estimatedCost),
            date: e.targetDate.toISOString().split('T')[0]
        }));

        // 5. Build Prompt
        const systemPrompt = `
You are a financial conflict resolver AI for Azerro.
The user wants to add a NEW GOAL but it conflicts with their budget or existing goals.

User's Financial Context:
- Monthly Income: ${income} ${baseCurrency}
- Existing Goals: ${JSON.stringify(goalSummary)}
- Planned Events: ${JSON.stringify(eventSummary)}

The NEW Goal causing conflict:
${JSON.stringify(conflictingGoal)}

Your Task:
1. Analyze the situation.
2. Suggest solutions (e.g., extend the date of the new goal, reduce the amount, or prioritize/delay other goals).
3. If you find a specific, viable solution that the user seems to agree to, output a "proposal".
4. If checking for conflicts or discussing, just provide "message".

Output Format (Strict JSON):
{
  "message": "Your helpful response to the user...",
  "proposal": null | { "targetAmount": number, "targetDate": "YYYY-MM-DD" }
}

Important:
- Output ONLY valid JSON.
- "proposal" should be null unless the user has explicitly agreed to a modified plan or you are offering a concrete fix they can click to apply.
- Be concise and empathetic.
`;

        const conversationHistory = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n');

        const fullPrompt = `
${systemPrompt}

Conversation History:
${conversationHistory}

User's Latest Input: "${userMessage}"

Response (JSON):
`;

        try {
            const responseText = await generateText(fullPrompt);
            return {
                success: true,
                answer: responseText,
            };
        } catch (error) {
            console.error("Failed to parse AI response as JSON:", error);
            // Fallback for chat-only response
            return { success: false, answer: "Error processing your request." };
        }

    } catch (error) {
        console.error("Error in resolveGoalConflict:", error);
        return { success: false, answer: "Error processing your request." };
    }
};
