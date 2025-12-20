"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.updateAccount = exports.getAccounts = exports.createAccount = void 0;
const async_handler_1 = require("../utils/async_handler");
const bank_account_service_1 = require("../services/bank_account.service");
exports.createAccount = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Create typed input object from request body
    const { name, type, balance, currency } = req.body;
    const accountInput = {
        name,
        type,
        balance,
        currency
    };
    const account = await (0, bank_account_service_1.createBankAccount)(req.userId, accountInput);
    res.status(201).json(account);
});
exports.getAccounts = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const accounts = await (0, bank_account_service_1.getBankAccounts)(req.userId);
    res.status(200).json(accounts);
});
exports.updateAccount = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    // Create typed update object from request body
    const { name, type, balance, currency } = req.body;
    const updateData = {
        name,
        type,
        balance,
        currency
    };
    const updated = await (0, bank_account_service_1.updateBankAccount)(id, req.userId, updateData);
    res.status(200).json(updated);
});
exports.deleteAccount = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await (0, bank_account_service_1.deleteBankAccount)(id, req.userId);
    res.status(204).send();
});
