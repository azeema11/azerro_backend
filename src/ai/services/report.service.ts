import { Periodicity } from "@prisma/client";
import { getBudgetVsActual, getIncomeVsExpense, getCategoryBreakdown } from "../../services/report.service";
import { generateAiResponse } from "../utils/ai_provider";
import { extractJsonFromText } from "../utils/json_extractor";
import prisma from "../../utils/db";

export const summarizeReport = async (userId: string, reportType: string, options: any = {}): Promise<{ success: boolean, answer: any }> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true }
        });

        if (!user) throw new Error("User not found");

        let reportData: any;
        let promptContext = "";

        // 1. Fetch the specific report data based on the request
        if (reportType === 'budgetVsActual') {
            const period = options.period as Periodicity || Periodicity.MONTHLY;
            const date = options.date ? new Date(options.date) : new Date();
            reportData = await getBudgetVsActual(userId, period, date);
            promptContext = "Budget vs Actual Report";
        } else if (reportType === 'incomeVsExpense') {
            const period = options.period as Periodicity || Periodicity.MONTHLY;
            const date = options.date ? new Date(options.date) : new Date();
            reportData = await getIncomeVsExpense(userId, period, date);
            promptContext = "Income vs Expense Report";
        } else if (reportType === 'categoryBreakdown') {
            const { startDate, endDate } = options;
            reportData = await getCategoryBreakdown(userId, startDate, endDate);
            promptContext = "Category Breakdown Report";
        } else {
             return {
                 success: false,
                 answer: {
                     type: "report_summary",
                     error: "Invalid report type requested for summarization."
                 }
             };
        }

        // 2. Construct the prompt
        const prompt = `
You are an expert financial analyst for Azerro.
The user wants a summary of their ${promptContext}.

Data:
- Base Currency: ${user.baseCurrency}
- Report Data: ${JSON.stringify(reportData)}

Your Task:
Analyze the data and provide a concise, structured summary.
Specifically highlight (if applicable based on the data provided):
- Budget vs Actual performance
- Income vs Expense balance
- Category Breakdown and notable spending areas
- Overspending alerts or areas of concern
- Spending trends
- Savings insights

Output Format (Strict JSON):
{
  "type": "report_summary",
  "title": "A short, descriptive title for the summary",
  "summary": "A concise paragraph summarizing the overall financial health based on this report.",
  "highlights": [
     "String bullet point 1 (e.g., about overspending)",
     "String bullet point 2 (e.g., about trends)",
     "String bullet point 3 (e.g., about savings)"
  ],
  "recommendations": [
     "String recommendation 1",
     "String recommendation 2"
  ]
}
`;

        // 3. Generate response
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
                        type: "report_summary",
                        title: "Report Summary",
                        summary: responseText, // Fallback to raw text
                        highlights: [],
                        recommendations: []
                    }
                };
            }
        } catch (error) {
            console.error("AI Report Summarization Error:", error);
            return {
                success: false,
                answer: {
                    type: "report_summary",
                    title: "Error",
                    summary: "Error generating the report summary.",
                    highlights: [],
                    recommendations: []
                }
            };
        }

    } catch (error) {
        console.error("Error in summarizeReport:", error);
        return {
            success: false,
            answer: {
                type: "report_summary",
                title: "Error",
                summary: "Error processing your request.",
                highlights: [],
                recommendations: []
            }
        };
    }
};
