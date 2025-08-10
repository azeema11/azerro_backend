import { Response } from "express";
import { Periodicity } from "@prisma/client";
import { detectRecurringTransactions, getAssetAllocation, getBudgetVsActual, getCategoryBreakdown, getExpenseSummary, getGoalProgressReport, getMonthlyIncomeVsExpense, getIncomeVsExpense } from "../services/report.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async_handler";

export const expenseSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { start, end } = req.query;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await getExpenseSummary(userId, start as string, end as string);
    res.status(200).json(result);
});

export const monthlyIncomeVsExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const report = await getMonthlyIncomeVsExpense(userId);
    res.status(200).json(report);
});

export const incomeVsExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { period, date } = req.query;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate and default the period parameter
    const validPeriod = period as Periodicity || Periodicity.MONTHLY;
    const referenceDate = date ? new Date(date as string) : new Date();

    const report = await getIncomeVsExpense(userId, validPeriod, referenceDate);
    res.status(200).json(report);
});

export const categoryBreakdown = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const report = await getCategoryBreakdown(userId, startDate as string, endDate as string);
    res.status(200).json(report);
});

export const assetAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { groupBy } = req.query;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const report = await getAssetAllocation(userId, groupBy as 'assetType' | 'platform' | 'ticker' || 'assetType');
    res.status(200).json(report);
});

export const budgetVsActual = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { period, date } = req.query;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate and default the period parameter
    const validPeriod = period as Periodicity || Periodicity.MONTHLY;
    const referenceDate = date ? new Date(date as string) : new Date();

    const report = await getBudgetVsActual(userId, validPeriod, referenceDate);
    res.status(200).json(report);
});

export const goalProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const report = await getGoalProgressReport(userId);
    res.status(200).json(report);
});

export const recurringTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const report = await detectRecurringTransactions(userId);
    res.status(200).json(report);
});