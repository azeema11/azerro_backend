import { Router } from "express";
import { createBudget, deleteBudget, getBudgetPerformance, getBudgets, updateBudget } from "../controllers/budget.controller";
import { validate } from "../middlewares/validate.middleware";
import { createBudgetSchema, updateBudgetSchema, budgetIdSchema } from "../validations/budget.schema";

const router = Router();

router.get('/', getBudgets);
router.get('/performance', getBudgetPerformance);
router.post('/', validate(createBudgetSchema), createBudget);
router.put('/:id', validate(updateBudgetSchema), updateBudget);
router.delete('/:id', validate(budgetIdSchema), deleteBudget);

export default router;