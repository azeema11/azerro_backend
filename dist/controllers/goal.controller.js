"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoalConflicts = exports.contributeToGoal = exports.getGoalById = exports.deleteGoal = exports.updateGoal = exports.createGoal = exports.getGoals = void 0;
const async_handler_1 = require("../utils/async_handler");
const goal_service_1 = require("../services/goal.service");
exports.getGoals = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const goals = await (0, goal_service_1.getGoals)(req.userId);
    res.status(200).json(goals);
});
exports.createGoal = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Create typed input object from request body
    const { name, description, targetAmount, savedAmount, targetDate } = req.body;
    const goalInput = {
        name,
        targetAmount,
        targetDate,
        description,
        savedAmount
    };
    const goal = await (0, goal_service_1.createGoal)(req.userId, goalInput);
    res.status(201).json(goal);
});
exports.updateGoal = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    // Create typed update object from request body
    const { name, description, targetAmount, savedAmount, currency, targetDate, completed } = req.body;
    const updateData = {
        name,
        description,
        targetAmount,
        savedAmount,
        currency,
        targetDate,
        completed
    };
    const updated = await (0, goal_service_1.updateGoal)(id, req.userId, updateData);
    res.status(200).json(updated);
});
exports.deleteGoal = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await (0, goal_service_1.deleteGoal)(id, req.userId);
    res.status(204).send();
});
exports.getGoalById = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const goal = await (0, goal_service_1.getGoalById)(id, req.userId);
    res.status(200).json(goal);
});
exports.contributeToGoal = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { amount } = req.body;
    const goal = await (0, goal_service_1.contributeToGoal)(id, req.userId, amount);
    res.status(200).json(goal);
});
exports.getGoalConflicts = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await (0, goal_service_1.checkGoalConflicts)(req.userId);
    res.status(200).json(result);
});
