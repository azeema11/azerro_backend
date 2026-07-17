import { Router } from "express";
import { categoryBreakdown, expenseSummary, monthlyIncomeVsExpense, incomeVsExpense, assetAllocation, budgetVsActual, goalProgress, recurringTransactions } from "../controllers/report.controller";
import { validate } from "../middlewares/validate.middleware";
import { dateRangeSchema, periodicReportSchema, dateRangeStartEndSchema, assetAllocationSchema } from "../validations/report.schema";

const router = Router();

router.get("/expenses-summary", validate(dateRangeSchema), expenseSummary);
router.get('/monthly-income-expense', monthlyIncomeVsExpense);
router.get('/income-vs-expense', validate(periodicReportSchema), incomeVsExpense);
router.get("/category-breakdown", validate(dateRangeStartEndSchema), categoryBreakdown);
router.get("/asset-allocation", validate(assetAllocationSchema), assetAllocation);
router.get("/budget-vs-actual", validate(periodicReportSchema), budgetVsActual);
router.get("/goal-progress", goalProgress);
router.get("/recurring-transactions", recurringTransactions);

export default router;