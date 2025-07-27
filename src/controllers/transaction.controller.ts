import { Request, Response } from 'express';
import prisma from '../utils/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async_handler';
import { TransactionType } from '@prisma/client';

export const getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type } = req.query;

  const whereClause: any = { userId: req.userId };

  if (type && (type === TransactionType.INCOME || type === TransactionType.EXPENSE)) {
    whereClause.type = type;
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    orderBy: { date: 'desc' },
  });
  res.json(transactions);
});

export const createTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, currency, category, type, description, date, bankAccountId } = req.body;

  if (!amount || !currency || !category || !date) {
    return res.status(400).json({ error: 'Amount, currency, category, and date are required' });
  }

  const txn = await prisma.transaction.create({
    data: {
      userId: req.userId!,
      amount,
      currency,
      category,
      type: type || TransactionType.EXPENSE, // Default to EXPENSE if not provided
      description,
      date: new Date(date),
      bankAccountId,
    },
  });
  res.status(201).json(txn);
});

export const updateTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const updated = await prisma.transaction.update({
    where: { id },
    data,
  });
  res.json(updated);
});

export const deleteTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await prisma.transaction.delete({ where: { id } });
  res.status(204).send();
});