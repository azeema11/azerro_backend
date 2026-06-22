import { Periodicity } from "@prisma/client";
import { getBudgetVsActual, getIncomeVsExpense, getCategoryBreakdown } from "../services/report.service";

export async function handleGetReport(
    userId: string,
    input: {
        reportType: "budget_vs_actual" | "income_vs_expense" | "category_breakdown";
        period?: string;
        date?: string;
        startDate?: string;
        endDate?: string;
    }
) {
    if (input.reportType === "budget_vs_actual") {
        const period = (input.period as Periodicity) || Periodicity.MONTHLY;
        const date = input.date ? new Date(input.date) : new Date();
        return await getBudgetVsActual(userId, period, date);
    }

    if (input.reportType === "income_vs_expense") {
        const period = (input.period as Periodicity) || Periodicity.MONTHLY;
        const date = input.date ? new Date(input.date) : new Date();
        return await getIncomeVsExpense(userId, period, date);
    }

    if (input.reportType === "category_breakdown") {
        return await getCategoryBreakdown(userId, input.startDate, input.endDate);
    }

    return { error: "Unknown report type" };
}
