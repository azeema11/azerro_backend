"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBudgetPerformance = exports.deleteBudget = exports.updateBudget = exports.getBudgets = exports.createBudget = void 0;
const async_handler_1 = require("../utils/async_handler");
const budget_service_1 = require("../services/budget.service");
exports.createBudget = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { category, amount, period } = req.body;
    const result = await (0, budget_service_1.createNewBudget)(req.userId, { category, amount, period });
    res.status(201).json(result);
});
exports.getBudgets = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const budgets = await (0, budget_service_1.getUserBudgets)(req.userId);
    res.status(200).json(budgets);
});
exports.updateBudget = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Create typed update object from request body
    const { amount, category, period } = req.body;
    const updateData = {
        amount,
        category,
        period
    };
    const updatedBudget = await (0, budget_service_1.updateUserBudget)(req.params.id, req.userId, updateData);
    res.status(200).json(updatedBudget);
});
exports.deleteBudget = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await (0, budget_service_1.deleteUserBudget)(req.params.id, req.userId);
    res.status(200).json(result);
});
exports.getBudgetPerformance = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const performance = await (0, budget_service_1.getUserBudgetPerformance)(req.userId);
    res.status(200).json(performance);
});
