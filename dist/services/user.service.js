"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPreferences = exports.getUserProfile = void 0;
const db_1 = __importDefault(require("../utils/db"));
const prisma_errors_1 = require("../utils/prisma_errors");
const getUserProfile = async (userId) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, baseCurrency: true, monthlyIncome: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }, 'User');
};
exports.getUserProfile = getUserProfile;
const updateUserPreferences = async (userId, baseCurrency, monthlyIncome) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        return await db_1.default.user.update({
            where: { id: userId },
            data: {
                ...(baseCurrency && { baseCurrency }),
                ...(monthlyIncome !== undefined && { monthlyIncome }),
            },
            select: { id: true, baseCurrency: true, monthlyIncome: true }
        });
    }, 'User');
};
exports.updateUserPreferences = updateUserPreferences;
