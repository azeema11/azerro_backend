import { Router } from "express";
import { createBudget, deleteBudget, getBudgetPerformance, getBudgets, updateBudget } from "../controllers/budget.controller";

const router = Router();

router.get('/', getBudgets);
router.get('/performance', getBudgetPerformance);
router.post('/', createBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;