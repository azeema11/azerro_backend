import { Request, Response } from "express";
import { getAssetAllocation, getBudgetVsActual, getCategoryBreakdown, getExpenseSummary, getMonthlyIncomeVsExpense } from "../services/reports.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

export const expenseSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { start, end } = req.query;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await getExpenseSummary(userId, start as string, end as string);
    res.json(result);
});

export const monthlyIncomeVsExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const report = await getMonthlyIncomeVsExpense(userId);
    res.json(report);
});

export const categoryBreakdown = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const report = await getCategoryBreakdown(userId, startDate as string, endDate as string);
    res.json(report);
});

export const assetAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { groupBy } = req.query;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const report = await getAssetAllocation(userId, groupBy as 'assetType' | 'platform' | 'ticker' || 'assetType');
    res.json(report);
});

export const budgetVsActual = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { period } = req.query;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const report = await getBudgetVsActual(userId, period as 'MONTHLY' | 'WEEKLY' | 'ANNUAL' || 'MONTHLY');
    res.json(report);
});