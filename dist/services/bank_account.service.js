"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBankAccount = exports.updateBankAccount = exports.getBankAccounts = exports.createBankAccount = void 0;
const db_1 = __importDefault(require("../utils/db"));
const prisma_errors_1 = require("../utils/prisma_errors");
const createBankAccount = async (userId, data) => {
    // Validation
    if (!data.name?.trim()) {
        throw new prisma_errors_1.ValidationError('Bank account name is required', 'BankAccount', undefined, { field: 'name', validationType: 'business' });
    }
    if (!data.type) {
        throw new prisma_errors_1.ValidationError('Account type is required', 'BankAccount', undefined, { field: 'type', validationType: 'business' });
    }
    if (data.balance !== undefined && data.balance < 0) {
        throw new prisma_errors_1.ValidationError('Balance must be a non-negative number', 'BankAccount', undefined, { field: 'balance', validationType: 'business' });
    }
    if (data.currency && !data.currency.trim()) {
        throw new prisma_errors_1.ValidationError('Currency cannot be empty', 'BankAccount', undefined, { field: 'currency', validationType: 'business' });
    }
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return await db_1.default.bankAccount.create({
            data: {
                name: data.name.trim(),
                type: data.type,
                balance: data.balance || 0,
                currency: data.currency?.trim().toUpperCase() || 'USD',
                userId,
            },
        });
    }, 'BankAccount');
};
exports.createBankAccount = createBankAccount;
const getBankAccounts = async (userId) => {
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return await db_1.default.bankAccount.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }, 'BankAccount');
};
exports.getBankAccounts = getBankAccounts;
const updateBankAccount = async (id, userId, data) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        return await db_1.default.bankAccount.update({
            where: {
                id_userId: { id, userId }
            },
            data,
        });
    }, 'Bank account');
};
exports.updateBankAccount = updateBankAccount;
const deleteBankAccount = async (id, userId) => {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        await db_1.default.bankAccount.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Bank account');
};
exports.deleteBankAccount = deleteBankAccount;
