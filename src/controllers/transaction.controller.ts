import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async_handler';
import { CreateTransactionInput, TransactionUpdateData } from '../types/service_types';
import { TransactionType } from '@prisma/client';
import {
  getTransactions as getTransactionsService,
  createTransaction as createTransactionService,
  updateTransaction as updateTransactionService,
  deleteTransaction as deleteTransactionService
} from '../services/transaction.service';

export const getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type } = req.query;

  const transactions = await getTransactionsService(req.userId, type as TransactionType);
  res.status(200).json(transactions);
});

export const createTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Create typed input object from request body
  const { amount, currency, category, type, description, date, bankAccountId } = req.body;

  const transactionInput: CreateTransactionInput = {
    amount,
    currency,
    category,
    date,
    type,
    description,
    bankAccountId
  };

  const txn = await createTransactionService(req.userId, transactionInput);
  res.status(201).json(txn);
});

export const updateTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  // Create typed update object from request body
  const { amount, currency, category, type, description, date, bankAccountId } = req.body;

  const updateData: TransactionUpdateData = {
    amount,
    currency,
    category,
    type,
    description,
    date,
    bankAccountId
  };

  const updated = await updateTransactionService(id, req.userId, updateData);
  res.status(200).json(updated);
});

export const deleteTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  await deleteTransactionService(id, req.userId);
  res.status(204).send();
});