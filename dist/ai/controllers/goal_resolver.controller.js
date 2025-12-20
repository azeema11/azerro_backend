"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveGoalConflictController = void 0;
const goal_resolver_service_1 = require("../services/goal_resolver.service");
const async_handler_1 = require("../../utils/async_handler");
exports.resolveGoalConflictController = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { conflictingGoal, userMessage, history } = req.body;
    if (!conflictingGoal || !userMessage) {
        return res.status(400).json({ error: 'Missing required fields: conflictingGoal and userMessage are required.' });
    }
    const result = await (0, goal_resolver_service_1.resolveGoalConflict)({
        userId: req.userId,
        conflictingGoal,
        userMessage,
        history
    });
    res.json(result);
});
