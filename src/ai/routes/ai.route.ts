import { Router } from "express";
import { askTransactionAgent } from "../controllers/transaction.controller";
import { resolveGoalConflictController } from "../controllers/goal.controller";
import { getBudgetSummaryController, chatBudgetAdvisorController } from "../controllers/budget.controller";

const router = Router();

router.post("/transactionAgent", askTransactionAgent);

// Goal Conflict Resolver
router.post("/goals/resolve", resolveGoalConflictController);

// Budget Advisor
router.get("/budget/summary", getBudgetSummaryController);
router.post("/budget/chat", chatBudgetAdvisorController);

export default router;
