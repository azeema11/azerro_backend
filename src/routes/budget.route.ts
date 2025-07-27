import { Router } from "express";
import { createBudget } from "../controllers/budget.controller";

const router = Router();

router.post('/', createBudget);

export default router;