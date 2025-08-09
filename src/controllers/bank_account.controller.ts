import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async_handler';
import { BankAccountUpdateData, CreateBankAccountInput } from '../types/service_types';
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

  // Create typed input object from request body
  const { name, type, balance, currency } = req.body;

  const accountInput: CreateBankAccountInput = {
    name,
    type,
    balance,
    currency
  };

  const account = await createBankAccount(req.userId, accountInput);
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

  // Create typed update object from request body
  const { name, type, balance, currency } = req.body;

  const updateData: BankAccountUpdateData = {
    name,
    type,
    balance,
    currency
  };

  const updated = await updateBankAccount(id, req.userId, updateData);
  res.status(200).json(updated);
});

export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  await deleteBankAccount(id, req.userId);
  res.status(204).send();
});