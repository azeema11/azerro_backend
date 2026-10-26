import { Response } from "express";
import { Periodicity } from "@prisma/client";
import { detectRecurringTransactions, getAssetAllocation, getBudgetVsActual, getCategoryBreakdown, getExpenseSummary, getGoalProgressReport, getMonthlyIncomeVsExpense, getIncomeVsExpense } from "../services/report.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async_handler";

export const expenseSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { start, end } = req.query;
    const result = await getExpenseSummary(req.userId!, start as string, end as string);
    res.status(200).json(result);
});

export const monthlyIncomeVsExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await getMonthlyIncomeVsExpense(req.userId!);
    res.status(200).json(report);
});

export const incomeVsExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period, date } = req.query;
    const validPeriod = period as Periodicity || Periodicity.MONTHLY;
    const referenceDate = date ? new Date(date as string) : new Date();
    const report = await getIncomeVsExpense(req.userId!, validPeriod, referenceDate);
    res.status(200).json(report);
});

export const categoryBreakdown = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const report = await getCategoryBreakdown(req.userId!, startDate as string, endDate as string);
    res.status(200).json(report);
});

export const assetAllocation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { groupBy } = req.query;
    const report = await getAssetAllocation(req.userId!, groupBy as 'assetType' | 'platform' | 'ticker' || 'assetType');
    res.status(200).json(report);
});

export const budgetVsActual = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period, date } = req.query;
    const validPeriod = period as Periodicity || Periodicity.MONTHLY;
    const referenceDate = date ? new Date(date as string) : new Date();
    const report = await getBudgetVsActual(req.userId!, validPeriod, referenceDate);
    res.status(200).json(report);
});

export const goalProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await getGoalProgressReport(req.userId!);
    res.status(200).json(report);
});

export const recurringTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await detectRecurringTransactions(req.userId!);
    res.status(200).json(report);
});