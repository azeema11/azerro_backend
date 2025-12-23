import prisma from "../../utils/db";
import { generateText } from "../utils/ai_provider";
import { toNumberSafe } from "../../utils/utils";
import { ResolveGoalConflictInput } from "../../types/service_types";
import { extractJsonFromText } from "../utils/json_extractor";

export const resolveGoalConflict = async ({
    userId,
    conflictingGoal,
    userMessage,
    history = []
}: ResolveGoalConflictInput): Promise<{ success: boolean, answer: any }> => {
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
            id: g.id,
            name: g.name,
            targetAmount: toNumberSafe(g.targetAmount),
            savedAmount: toNumberSafe(g.savedAmount),
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
3. If you suggest a solution in the text (like moving a deadline or reducing an amount), you MUST provide the corresponding actionable update in the "proposal" field.
4. Calculate specific adjustments (e.g. specific new dates). Do not be vague (e.g. "adjust savings"). If you say "delay for 6 months", calculate the exact new date.
5. In the "message", always refer to goals by their NAME, never by their ID.

Output Format (Strict JSON):
{
  "type": "goal_conflict",
  "message": "Your helpful response to the user...",
  "proposal": null | { "id": "string", "goalName": "string", "targetAmount"?: number, "targetDate"?: "YYYY-MM-DD" }
}

Important:
- Output ONLY valid JSON.
- In "proposal", ONLY include fields that need to be changed. For example, if you are only extending the deadline, provide "targetDate" and OMIT "targetAmount".
- Do NOT change the target amount unless the solution specifically requires reducing the goal's total cost.
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
                        type: "goal_conflict",
                        message: responseText,
                        proposal: null
                    }
                };
            }
        } catch (error) {
            console.error("Failed to parse AI response as JSON:", error);
            // Fallback for chat-only response
            return {
                success: false,
                answer: {
                    type: "goal_conflict",
                    message: "Error processing your request.",
                    proposal: null
                }
            };
        }

    } catch (error) {
        console.error("Error in resolveGoalConflict:", error);
        return {
            success: false,
            answer: {
                type: "goal_conflict",
                message: "Error processing your request.",
                proposal: null
            }
        };
    }
};
