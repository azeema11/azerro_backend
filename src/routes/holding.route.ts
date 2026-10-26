import { Router } from 'express';
import {
  getHoldings,
  createHolding,
  updateHolding,
  deleteHolding,
  getHoldingHistory,
} from '../controllers/holding.controller';
import { validate } from '../middlewares/validate.middleware';
import { getHoldingsSchema, getHoldingHistorySchema, createHoldingSchema, updateHoldingSchema, holdingIdSchema } from '../validations/holding.schema';

const router = Router();

router.get('/', validate(getHoldingsSchema), getHoldings);
router.get('/history', validate(getHoldingHistorySchema), getHoldingHistory);
router.post('/', validate(createHoldingSchema), createHolding);
router.put('/:id', validate(updateHoldingSchema), updateHolding);
router.delete('/:id', validate(holdingIdSchema), deleteHolding);

export default router;
