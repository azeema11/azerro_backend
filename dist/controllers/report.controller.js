"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recurringTransactions = exports.goalProgress = exports.budgetVsActual = exports.assetAllocation = exports.categoryBreakdown = exports.incomeVsExpense = exports.monthlyIncomeVsExpense = exports.expenseSummary = void 0;
const client_1 = require("@prisma/client");
const report_service_1 = require("../services/report.service");
const async_handler_1 = require("../utils/async_handler");
exports.expenseSummary = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { start, end } = req.query;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await (0, report_service_1.getExpenseSummary)(userId, start, end);
    res.status(200).json(result);
});
exports.monthlyIncomeVsExpense = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const report = await (0, report_service_1.getMonthlyIncomeVsExpense)(userId);
    res.status(200).json(report);
});
exports.incomeVsExpense = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { period, date } = req.query;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    // Validate and default the period parameter
    const validPeriod = period || client_1.Periodicity.MONTHLY;
    const referenceDate = date ? new Date(date) : new Date();
    const report = await (0, report_service_1.getIncomeVsExpense)(userId, validPeriod, referenceDate);
    res.status(200).json(report);
});
exports.categoryBreakdown = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { startDate, endDate } = req.query;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const report = await (0, report_service_1.getCategoryBreakdown)(userId, startDate, endDate);
    res.status(200).json(report);
});
exports.assetAllocation = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { groupBy } = req.query;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const report = await (0, report_service_1.getAssetAllocation)(userId, groupBy || 'assetType');
    res.status(200).json(report);
});
exports.budgetVsActual = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { period, date } = req.query;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    // Validate and default the period parameter
    const validPeriod = period || client_1.Periodicity.MONTHLY;
    const referenceDate = date ? new Date(date) : new Date();
    const report = await (0, report_service_1.getBudgetVsActual)(userId, validPeriod, referenceDate);
    res.status(200).json(report);
});
exports.goalProgress = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const report = await (0, report_service_1.getGoalProgressReport)(userId);
    res.status(200).json(report);
});
exports.recurringTransactions = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const report = await (0, report_service_1.detectRecurringTransactions)(userId);
    res.status(200).json(report);
});
