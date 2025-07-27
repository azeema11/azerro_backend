import { Router } from "express";
import { createBudget, deleteBudget, getBudgetPerformance, getBudgets, updateBudget } from "../controllers/budget.controller";

const router = Router();

router.post('/', createBudget);
router.get('/', getBudgets);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);
router.get('/performance', getBudgetPerformance);

export default router;