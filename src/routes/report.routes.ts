import { Router } from "express";
import { categoryBreakdown, expenseSummary, monthlyIncomeVsExpense, assetAllocation, budgetVsActual, goalProgress, recurringTransactions } from "../controllers/report.controller";

const router = Router();

router.get("/expenses-summary", expenseSummary);
router.get('/monthly-income-expense', monthlyIncomeVsExpense);
router.get("/category-breakdown", categoryBreakdown);
router.get("/asset-allocation", assetAllocation);
router.get("/budget-vs-actual", budgetVsActual);
router.get("/goal-progress", goalProgress);
router.get("/recurring-transactions", recurringTransactions);

export default router;