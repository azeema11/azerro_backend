import { Router } from 'express';
import {
  createAccount,
  getAccounts,
  updateAccount,
  deleteAccount,
} from '../controllers/bank_account.controller';

const router = Router();

router.get('/', getAccounts);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;