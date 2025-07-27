import { Request, Response } from 'express';
import prisma from '../utils/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async_handler';

export const createAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, type, balance, currency } = req.body;

  if (!name || !type || balance === undefined || !currency) {
    return res.status(400).json({ error: 'Name, type, balance, and currency are required' });
  }

  const account = await prisma.bankAccount.create({
    data: {
      name,
      type,
      balance,
      currency,
      userId: req.userId!,
    },
  });
  res.status(201).json(account);
});

export const getAccounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const accounts = await prisma.bankAccount.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(accounts);
});

export const updateAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const updated = await prisma.bankAccount.update({
    where: { id },
    data,
  });
  res.json(updated);
});

export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await prisma.bankAccount.delete({ where: { id } });
  res.status(204).send();
});