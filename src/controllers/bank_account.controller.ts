import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async_handler';
import {
  createBankAccount,
  getBankAccounts,
  updateBankAccount,
  deleteBankAccount
} from '../services/bank_account.service';

export const createAccount = asyncHandler(async (req: AuthRequest, res: Response) => {

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, type, balance, currency } = req.body;

  const account = await createBankAccount(req.userId, name, type, balance, currency);
  res.status(201).json(account);
});

export const getAccounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const accounts = await getBankAccounts(req.userId);
  res.status(200).json(accounts);
});

export const updateAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const data = req.body;

  const updated = await updateBankAccount(id, data);
  res.status(200).json(updated);
});

export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  await deleteBankAccount(id);
  res.status(204).send();
});