import { Router } from "express";
import { askTransactionAgent } from "../controllers/transaction.controller";
import { resolveGoalConflictController } from "../controllers/goal.controller";
import { getBudgetSummaryController, chatBudgetAdvisorController } from "../controllers/budget.controller";

const router = Router();

const transactionRouter = Router();
const goalRouter = Router();
const budgetRouter = Router();

transactionRouter.post("/agent", askTransactionAgent);

goalRouter.post("/resolve", resolveGoalConflictController);

budgetRouter.get("/summary", getBudgetSummaryController);
budgetRouter.post("/chat", chatBudgetAdvisorController);

router.use("/transaction", transactionRouter);
router.use("/goal", goalRouter);
router.use("/budget", budgetRouter);

export default router;
