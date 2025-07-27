import { asyncHandler } from "../utils/async_handler";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Response } from "express";
import { createNewBudget } from "../services/budget.service";

export const createBudget = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await createNewBudget(req.userId, req.body.category, req.body.amount, req.body.period);
    res.status(201).json(result);
});