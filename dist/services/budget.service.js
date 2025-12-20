"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBudgetPerformance = exports.deleteUserBudget = exports.updateUserBudget = exports.getUserBudgets = exports.createNewBudget = void 0;
const db_1 = __importDefault(require("../utils/db"));
const client_1 = require("@prisma/client");
const prisma_errors_1 = require("../utils/prisma_errors");
const date_1 = require("../utils/date");
const currency_1 = require("../utils/currency");
const utils_1 = require("../utils/utils");
const createNewBudget = async (userId, data) => {
    // Validation
    if (!data.category) {
        throw new prisma_errors_1.ValidationError('Category is required', 'Budget', undefined, { field: 'category', validationType: 'business' });
    }
    if (!data.amount || data.amount <= 0) {
        throw new prisma_errors_1.ValidationError('Amount must be greater than 0', 'Budget', undefined, { field: 'amount', validationType: 'business' });
    }
    if (!data.period) {
        throw new prisma_errors_1.ValidationError('Period is required', 'Budget', undefined, { field: 'period', validationType: 'business' });
    }
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return await db_1.default.budget.create({
            data: {
                userId,
                category: data.category,
                amount: data.amount,
                period: data.period,
            },
        });
    }, 'Budget');
};
exports.createNewBudget = createNewBudget;
const getUserBudgets = async (userId) => {
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return await db_1.default.budget.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }, 'Budget');
};
exports.getUserBudgets = getUserBudgets;
const updateUserBudget = async (id, userId, data) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        return await db_1.default.budget.update({
            where: {
                id_userId: { id, userId }
            },
            data,
        });
    }, 'Budget');
};
exports.updateUserBudget = updateUserBudget;
const deleteUserBudget = async (id, userId) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        await db_1.default.budget.delete({
            where: {
                id_userId: { id, userId }
            }
        });
        return { success: true };
    }, 'Budget');
};
exports.deleteUserBudget = deleteUserBudget;
const getUserBudgetPerformance = async (userId) => {
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new prisma_errors_1.ValidationError('User not found', 'Budget', undefined, { field: 'userId', validationType: 'business' });
        const budgets = await db_1.default.budget.findMany({ where: { userId } });
        const results = await Promise.all(budgets.map(async (budget) => {
            const { category, period, amount: budgetAmount } = budget;
            const dateRange = (0, date_1.getPeriodDates)(period);
            const [transactions, plannedEvents] = await Promise.all([
                db_1.default.transaction.findMany({
                    where: {
                        userId,
                        type: client_1.TransactionType.EXPENSE,
                        category,
                        date: { gte: dateRange.start, lte: dateRange.end },
                    },
                }),
                db_1.default.plannedEvent.findMany({
                    where: {
                        userId,
                        category,
                        targetDate: { gte: dateRange.start, lte: dateRange.end },
                        completed: false,
                    },
                }),
            ]);
            const totalSpent = await (0, currency_1.getTotalConvertedHistorical)([
                ...transactions.map(t => ({ amount: t.amount, currency: t.currency, date: t.date })),
                ...plannedEvents.map(pe => ({ amount: pe.estimatedCost, currency: pe.currency, date: pe.targetDate })),
            ], user.baseCurrency);
            return {
                category,
                period,
                budgetAmount,
                actualSpending: totalSpent,
                currency: user.baseCurrency,
                withinBudget: totalSpent <= (0, utils_1.toNumberSafe)(budgetAmount),
            };
        }));
        return results;
    }, 'Budget');
};
exports.getUserBudgetPerformance = getUserBudgetPerformance;
