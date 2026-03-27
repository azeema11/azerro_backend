import { Router } from "express";
import { askTransactionAgent } from "../controllers/transaction.controller";
import { resolveGoalConflictController } from "../controllers/goal.controller";
import { getBudgetSummaryController, chatBudgetAdvisorController } from "../controllers/budget.controller";
import { getReportSummary } from "../controllers/report.controller";
import { getPlannedEventImpactController } from "../controllers/planned_event.controller";
import { postUnifiedAssistant } from "../controllers/assistant.controller";
import { getPredictiveInsightsController } from "../controllers/predictive.controller";
import { validate } from "../../middlewares/validate.middleware";
import { aiAssistantSchema, aiTransactionAgentSchema, aiGoalConflictSchema, aiBudgetChatSchema, aiReportSummarizeSchema } from "../../validations/ai.schema";

const router = Router();

const transactionRouter = Router();
const goalRouter = Router();
const budgetRouter = Router();
const reportRouter = Router();
const plannedEventRouter = Router();
const predictiveRouter = Router();

transactionRouter.post("/agent", validate(aiTransactionAgentSchema), askTransactionAgent);

goalRouter.post("/resolve", resolveGoalConflictController);

budgetRouter.get("/summary", getBudgetSummaryController);
budgetRouter.post("/chat", validate(aiBudgetChatSchema), chatBudgetAdvisorController);

reportRouter.post("/summarize", validate(aiReportSummarizeSchema), getReportSummary);

plannedEventRouter.get("/impact", getPlannedEventImpactController);

predictiveRouter.get("/insights", getPredictiveInsightsController);

router.post("/assistant", validate(aiAssistantSchema), postUnifiedAssistant);

router.use("/transaction", transactionRouter);
router.use("/goal", goalRouter);
router.use("/budget", budgetRouter);
router.use("/report", reportRouter);
router.use("/planned-event", plannedEventRouter);
router.use("/predictive", predictiveRouter);

export default router;
