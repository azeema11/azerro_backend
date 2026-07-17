import { Router } from 'express';
import {
  createAccount,
  getAccounts,
  updateAccount,
  deleteAccount,
} from '../controllers/bank_account.controller';
import { validate } from '../middlewares/validate.middleware';
import { createBankAccountSchema, updateBankAccountSchema, bankAccountIdSchema } from '../validations/bank_account.schema';

const router = Router();

router.get('/', getAccounts);
router.post('/', validate(createBankAccountSchema), createAccount);
router.put('/:id', validate(updateBankAccountSchema), updateAccount);
router.delete('/:id', validate(bankAccountIdSchema), deleteAccount);

export default router;