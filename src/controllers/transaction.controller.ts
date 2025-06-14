import { Request, Response } from 'express';
import prisma from '../utils/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId },
    orderBy: { date: 'desc' },
  });
  res.json(transactions);
});

export const createTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, currency, category, description, date, bankAccountId } = req.body;

  if (!amount || !currency || !category || !date) {
    return res.status(400).json({ error: 'Amount, currency, category, and date are required' });
  }

  const txn = await prisma.transaction.create({
    data: {
      userId: req.userId!,
      amount,
      currency,
      category,
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