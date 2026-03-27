import { Router } from 'express';
import {
  getHoldings,
  createHolding,
  updateHolding,
  deleteHolding,
} from '../controllers/holding.controller';
import { validate } from '../middlewares/validate.middleware';
import { createHoldingSchema, updateHoldingSchema, holdingIdSchema } from '../validations/holding.schema';

const router = Router();

router.get('/', getHoldings);
router.post('/', validate(createHoldingSchema), createHolding);
router.put('/:id', validate(updateHoldingSchema), updateHolding);
router.delete('/:id', validate(holdingIdSchema), deleteHolding);

export default router;
