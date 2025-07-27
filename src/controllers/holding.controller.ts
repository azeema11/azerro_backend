import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async_handler';
import {
  getHoldings as getHoldingsService,
  createHolding as createHoldingService,
  updateHolding as updateHoldingService,
  deleteHolding as deleteHoldingService
} from '../services/holding.service';

export const getHoldings = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const holdings = await getHoldingsService(req.userId);
  res.status(200).json(holdings);
});

export const createHolding = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    platform,
    ticker,
    assetType,
    quantity,
    avgCost,
    holdingCurrency,
    name,
  } = req.body;

  const result = await createHoldingService(
    req.userId,
    platform,
    ticker,
    assetType,
    quantity,
    avgCost,
    holdingCurrency,
    name
  );
  res.status(201).json(result);
});

export const updateHolding = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const data = req.body;

  const updated = await updateHoldingService(id, data);
  res.status(200).json(updated);
});

export const deleteHolding = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  await deleteHoldingService(id);
  res.status(204).send();
});
