"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionQA_controller_1 = require("../controllers/transactionQA.controller");
const goal_resolver_controller_1 = require("../controllers/goal_resolver.controller");
const budget_advisor_controller_1 = require("../controllers/budget_advisor.controller");
const router = (0, express_1.Router)();
router.post("/transactionAgent", transactionQA_controller_1.askTransactionAgent);
// Goal Conflict Resolver
router.post("/goals/resolve", goal_resolver_controller_1.resolveGoalConflictController);
// Budget Advisor
router.get("/budget/summary", budget_advisor_controller_1.getBudgetSummaryController);
router.post("/budget/chat", budget_advisor_controller_1.chatBudgetAdvisorController);
exports.default = router;
