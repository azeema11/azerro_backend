"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contributeToGoal = exports.getGoalById = exports.deleteGoal = exports.updateGoal = exports.createGoal = exports.getGoals = void 0;
exports.checkGoalConflicts = checkGoalConflicts;
const date_1 = require("../utils/date");
const db_1 = __importDefault(require("../utils/db"));
const currency_1 = require("../utils/currency");
const prisma_errors_1 = require("../utils/prisma_errors");
const utils_1 = require("../utils/utils");
const getGoals = async (userId) => {
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        const goals = await db_1.default.goal.findMany({
            where: { userId }
        });
        const goalsWithProgress = goals.map(goal => ({
            ...goal,
            progress: (0, utils_1.toNumberSafe)(goal.targetAmount) === 0
                ? 0
                : Math.min(100, ((0, utils_1.toNumberSafe)(goal.savedAmount) / (0, utils_1.toNumberSafe)(goal.targetAmount)) * 100)
        }));
        return goalsWithProgress;
    }, 'Goal');
};
exports.getGoals = getGoals;
const createGoal = async (userId, data) => {
    // Business logic validation using enhanced ValidationError
    if (!data.name?.trim()) {
        throw new prisma_errors_1.ValidationError('Goal name is required', 'Goal', undefined, { field: 'name', validationType: 'business' });
    }
    if (!data.targetAmount || data.targetAmount <= 0) {
        throw new prisma_errors_1.ValidationError('Target amount must be greater than 0', 'Goal', undefined, { field: 'targetAmount', validationType: 'business' });
    }
    if (!data.targetDate) {
        throw new prisma_errors_1.ValidationError('Target date is required', 'Goal', undefined, { field: 'targetDate', validationType: 'business' });
    }
    if (new Date(data.targetDate) <= new Date()) {
        throw new prisma_errors_1.ValidationError('Target date must be in the future', 'Goal', undefined, { field: 'targetDate', validationType: 'business' });
    }
    // Database operation with Prisma error handling
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        // Get user's base currency
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true }
        });
        const currency = user?.baseCurrency ?? 'INR';
        return await db_1.default.goal.create({
            data: {
                userId,
                name: data.name.trim(),
                description: data.description?.trim() || null,
                targetAmount: data.targetAmount,
                savedAmount: data.savedAmount || 0,
                currency,
                targetDate: new Date(data.targetDate)
            }
        });
    }, 'Goal');
};
exports.createGoal = createGoal;
const updateGoal = async (id, userId, data) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        return await db_1.default.goal.update({
            where: {
                id_userId: { id, userId }
            },
            data
        });
    }, 'Goal');
};
exports.updateGoal = updateGoal;
const deleteGoal = async (id, userId) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        await db_1.default.goal.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Goal');
};
exports.deleteGoal = deleteGoal;
const getGoalById = async (id, userId) => {
    const goal = await db_1.default.goal.findUnique({
        where: {
            id_userId: { id, userId }
        },
        select: {
            id: true,
            name: true,
            description: true,
            targetAmount: true,
            savedAmount: true,
            currency: true,
            targetDate: true,
            createdAt: true,
            updatedAt: true,
            completed: true
        }
    });
    if (!goal) {
        throw new Error('Goal not found');
    }
    const targetAmount = (0, utils_1.toNumberSafe)(goal.targetAmount);
    const progress = targetAmount === 0 ? 0 : Math.min(100, ((0, utils_1.toNumberSafe)(goal.savedAmount) / targetAmount) * 100);
    return { ...goal, progress };
};
exports.getGoalById = getGoalById;
const contributeToGoal = async (id, userId, amount) => {
    if (!amount || amount <= 0) {
        throw new prisma_errors_1.ValidationError('Valid contribution amount is required', 'Goal');
    }
    // Get goal and user info for currency conversion using optimized queries
    const [existingGoal, user] = await Promise.all([
        db_1.default.goal.findUnique({
            where: { id_userId: { id, userId } },
            select: { currency: true }
        }),
        db_1.default.user.findUnique({
            where: { id: userId },
            select: { baseCurrency: true }
        })
    ]);
    if (!existingGoal) {
        throw new prisma_errors_1.ValidationError('Goal not found or access denied', 'Goal');
    }
    const finalContributionCurrency = user?.baseCurrency ?? 'INR';
    // Convert contribution amount to goal's currency if needed
    const convertedAmount = await (0, currency_1.convertCurrencyFromDB)(amount, finalContributionCurrency, existingGoal.currency);
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        const goal = await db_1.default.goal.update({
            where: {
                id_userId: { id, userId }
            },
            data: {
                savedAmount: {
                    increment: convertedAmount
                }
            }
        });
        const targetAmount = (0, utils_1.toNumberSafe)(goal.targetAmount);
        const progress = targetAmount === 0 ? 0 : Math.min(100, ((0, utils_1.toNumberSafe)(goal.savedAmount) / targetAmount) * 100);
        return { ...goal, progress };
    }, 'Goal');
};
exports.contributeToGoal = contributeToGoal;
async function checkGoalConflicts(userId) {
    try {
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        const goals = await db_1.default.goal.findMany({
            where: { userId, completed: false }
        });
        const events = await db_1.default.plannedEvent.findMany({
            where: { userId, completed: false }
        });
        const now = new Date();
        let totalRequired = 0;
        const detailed = [];
        // --- Goals ---
        for (const g of goals) {
            const monthsLeft = (0, date_1.monthsBetween)(now, g.targetDate);
            const amountLeft = (0, utils_1.toNumberSafe)((0, utils_1.subtractDecimal)(g.targetAmount, g.savedAmount));
            const perMonthInGoalCurrency = monthsLeft > 0 ? amountLeft / monthsLeft : amountLeft;
            // Convert to user's base currency
            const perMonth = await (0, currency_1.convertCurrencyFromDB)(perMonthInGoalCurrency, g.currency, user.baseCurrency);
            totalRequired += perMonth;
            detailed.push({
                type: "GOAL",
                id: g.id,
                name: g.name,
                perMonth: parseFloat(perMonth.toFixed(2)),
                monthsLeft,
                originalCurrency: g.currency,
                targetDate: g.targetDate,
            });
        }
        // --- Planned Events ---
        for (const e of events) {
            let perMonthInEventCurrency = 0;
            if (e.recurrence === "ONE_TIME") {
                const monthsLeft = (0, date_1.monthsBetween)(now, e.targetDate);
                const amountLeft = (0, utils_1.toNumberSafe)((0, utils_1.subtractDecimal)(e.estimatedCost, e.savedSoFar));
                perMonthInEventCurrency = monthsLeft > 0 ? amountLeft / monthsLeft : amountLeft;
            }
            else {
                // Recurring → convert to monthly equivalent
                const factor = (0, date_1.recurrenceToMonthlyFactor)(e.recurrence);
                perMonthInEventCurrency = (0, utils_1.toNumberSafe)(e.estimatedCost) * factor;
            }
            // Convert to user's base currency
            const perMonth = await (0, currency_1.convertCurrencyFromDB)(perMonthInEventCurrency, e.currency, user.baseCurrency);
            totalRequired += perMonth;
            detailed.push({
                type: "PLANNED_EVENT",
                id: e.id,
                name: e.name,
                perMonth: parseFloat(perMonth.toFixed(2)),
                recurrence: e.recurrence,
                originalCurrency: e.currency,
                targetDate: e.targetDate,
            });
        }
        const conflict = totalRequired > (0, utils_1.toNumberSafe)(user?.monthlyIncome ?? 0);
        const difference = totalRequired - (0, utils_1.toNumberSafe)(user?.monthlyIncome ?? 0);
        return {
            conflict,
            totalRequiredPerMonth: parseFloat(totalRequired.toFixed(2)),
            availableMonthlyIncome: user?.monthlyIncome ?? 0,
            overBudgetBy: difference > 0 ? parseFloat(difference.toFixed(2)) : null,
            belowBudgetBy: difference < 0 ? parseFloat(Math.abs(difference).toFixed(2)) : null,
            currency: user.baseCurrency,
            breakdown: detailed,
        };
    }
    catch (error) {
        console.error("Error in checkGoalConflicts:", error);
        throw error;
    }
}
