"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const router = (0, express_1.Router)();
router.get("/expenses-summary", report_controller_1.expenseSummary);
router.get('/monthly-income-expense', report_controller_1.monthlyIncomeVsExpense); // Backward compatibility
router.get('/income-vs-expense', report_controller_1.incomeVsExpense); // New flexible endpoint
router.get("/category-breakdown", report_controller_1.categoryBreakdown);
router.get("/asset-allocation", report_controller_1.assetAllocation);
router.get("/budget-vs-actual", report_controller_1.budgetVsActual);
router.get("/goal-progress", report_controller_1.goalProgress);
router.get("/recurring-transactions", report_controller_1.recurringTransactions);
exports.default = router;
