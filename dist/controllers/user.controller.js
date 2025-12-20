"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPreferences = exports.getUserProfile = void 0;
const async_handler_1 = require("../utils/async_handler");
const user_service_1 = require("../services/user.service");
exports.getUserProfile = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await (0, user_service_1.getUserProfile)(req.userId);
    res.status(200).json(user);
});
exports.updateUserPreferences = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { baseCurrency, monthlyIncome } = req.body;
    const updatedUser = await (0, user_service_1.updateUserPreferences)(req.userId, baseCurrency, monthlyIncome);
    res.status(200).json(updatedUser);
});
