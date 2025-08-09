import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async_handler';
import { HoldingUpdateData, CreateHoldingInput } from '../types/service_types';
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

  // Create typed input object from request body
  const {
    platform,
    ticker,
    assetType,
    quantity,
    avgCost,
    holdingCurrency,
    name,
  } = req.body;

  const holdingInput: CreateHoldingInput = {
    platform,
    ticker,
    assetType,
    quantity,
    avgCost,
    holdingCurrency,
    name
  };

  const result = await createHoldingService(req.userId, holdingInput);
  res.status(201).json(result);
});

export const updateHolding = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  // Create typed update object from request body
  const { platform, ticker, assetType, name, quantity, avgCost, holdingCurrency, lastPrice, convertedValue } = req.body;

  const updateData: HoldingUpdateData = {
    platform,
    ticker,
    assetType,
    name,
    quantity,
    avgCost,
    holdingCurrency,
    lastPrice,
    convertedValue
  };

  const updated = await updateHoldingService(id, req.userId, updateData);
  res.status(200).json(updated);
});

export const deleteHolding = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  await deleteHoldingService(id, req.userId);
  res.status(204).send();
});
