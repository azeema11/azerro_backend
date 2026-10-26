import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transaction.controller';
import { validate } from '../middlewares/validate.middleware';
import { getTransactionsSchema, createTransactionSchema, updateTransactionSchema, transactionIdSchema } from '../validations/transaction.schema';

const router = Router();

router.get('/', validate(getTransactionsSchema), getTransactions);
router.post('/', validate(createTransactionSchema), createTransaction);
router.put('/:id', validate(updateTransactionSchema), updateTransaction);
router.delete('/:id', validate(transactionIdSchema), deleteTransaction);

export default router;
