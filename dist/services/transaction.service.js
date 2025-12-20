"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.getTransactions = void 0;
const db_1 = __importDefault(require("../utils/db"));
const client_1 = require("@prisma/client");
const prisma_errors_1 = require("../utils/prisma_errors");
const getTransactions = async (userId, type) => {
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        const whereClause = { userId };
        if (type && (type === client_1.TransactionType.INCOME || type === client_1.TransactionType.EXPENSE)) {
            whereClause.type = type;
        }
        return await db_1.default.transaction.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            include: {
                bankAccount: {
                    select: { name: true }
                }
            }
        });
    }, 'Transaction');
};
exports.getTransactions = getTransactions;
const createTransaction = async (userId, data) => {
    // Validation
    if (!data.amount || data.amount === 0) {
        throw new prisma_errors_1.ValidationError('Transaction amount is required and cannot be zero', 'Transaction', undefined, { field: 'amount', validationType: 'business' });
    }
    if (!data.currency?.trim()) {
        throw new prisma_errors_1.ValidationError('Currency is required', 'Transaction', undefined, { field: 'currency', validationType: 'business' });
    }
    if (!data.category) {
        throw new prisma_errors_1.ValidationError('Category is required', 'Transaction', undefined, { field: 'category', validationType: 'business' });
    }
    if (!data.date) {
        throw new prisma_errors_1.ValidationError('Transaction date is required', 'Transaction', undefined, { field: 'date', validationType: 'business' });
    }
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return await db_1.default.transaction.create({
            data: {
                userId,
                amount: data.amount,
                currency: data.currency.trim().toUpperCase(),
                category: data.category,
                type: data.type || client_1.TransactionType.EXPENSE,
                description: data.description?.trim() || null,
                date: new Date(data.date),
                bankAccountId: data.bankAccountId,
            },
        });
    }, 'Transaction');
};
exports.createTransaction = createTransaction;
const updateTransaction = async (id, userId, data) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        return await db_1.default.transaction.update({
            where: {
                id_userId: { id, userId }
            },
            data,
        });
    }, 'Transaction');
};
exports.updateTransaction = updateTransaction;
const deleteTransaction = async (id, userId) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        await db_1.default.transaction.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Transaction');
};
exports.deleteTransaction = deleteTransaction;
