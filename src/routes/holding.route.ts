import { Router } from 'express';
import {
  getHoldings,
  createHolding,
  updateHolding,
  deleteHolding,
} from '../controllers/holding.controller';

const router = Router();

router.get('/', getHoldings);
router.post('/', createHolding);
router.put('/:id', updateHolding);
router.delete('/:id', deleteHolding);

export default router;
