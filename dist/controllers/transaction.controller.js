"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.getTransactions = void 0;
const async_handler_1 = require("../utils/async_handler");
const transaction_service_1 = require("../services/transaction.service");
exports.getTransactions = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { type } = req.query;
    const transactions = await (0, transaction_service_1.getTransactions)(req.userId, type);
    res.status(200).json(transactions);
});
exports.createTransaction = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Create typed input object from request body
    const { amount, currency, category, type, description, date, bankAccountId } = req.body;
    const transactionInput = {
        amount,
        currency,
        category,
        date,
        type,
        description,
        bankAccountId
    };
    const txn = await (0, transaction_service_1.createTransaction)(req.userId, transactionInput);
    res.status(201).json(txn);
});
exports.updateTransaction = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    // Create typed update object from request body
    const { amount, currency, category, type, description, date, bankAccountId } = req.body;
    const updateData = {
        amount,
        currency,
        category,
        type,
        description,
        date,
        bankAccountId
    };
    const updated = await (0, transaction_service_1.updateTransaction)(id, req.userId, updateData);
    res.status(200).json(updated);
});
exports.deleteTransaction = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await (0, transaction_service_1.deleteTransaction)(id, req.userId);
    res.status(204).send();
});
