"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatBudgetAdvisorController = exports.getBudgetSummaryController = void 0;
const budget_advisor_service_1 = require("../services/budget_advisor.service");
const async_handler_1 = require("../../utils/async_handler");
exports.getBudgetSummaryController = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await (0, budget_advisor_service_1.getBudgetAnalysis)(req.userId);
    res.json(result);
});
exports.chatBudgetAdvisorController = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { message, history } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
    }
    const response = await (0, budget_advisor_service_1.chatBudgetAdvisor)(req.userId, message, history);
    res.json({ message: response });
});
