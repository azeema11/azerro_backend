import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async_handler';
import { createUser, authenticateUser } from '../services/auth.service';

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const result = await createUser(name, email, password);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await authenticateUser(email, password);
  res.status(200).json(result);
});