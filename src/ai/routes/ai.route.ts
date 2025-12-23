import { Router } from "express";
import { askTransactionAgent } from "../controllers/transaction.controller";
import { resolveGoalConflictController } from "../controllers/goal.controller";
import { getBudgetSummaryController, chatBudgetAdvisorController } from "../controllers/budget.controller";

const router = Router();

// Create separate routers for each group
const transactionRouter = Router();
const goalRouter = Router();
const budgetRouter = Router();

// Mount sub-routers to the main router
router.use("/transaction", transactionRouter);
router.use("/goal", goalRouter);
router.use("/budget", budgetRouter);

// Transaction Agent
transactionRouter.post("/agent", askTransactionAgent);

// Goal Conflict Resolver
goalRouter.post("/resolve", resolveGoalConflictController);

// Budget Advisor
budgetRouter.get("/summary", getBudgetSummaryController);
budgetRouter.post("/chat", chatBudgetAdvisorController);

export default router;
