import { asyncHandler } from "../utils/async_handler";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Response } from "express";
import { createNewBudget, deleteUserBudget, getUserBudgetPerformance, getUserBudgets, updateUserBudget } from "../services/budget.service";

export const createBudget = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await createNewBudget(req.userId, req.body.category, req.body.amount, req.body.period);
    res.status(201).json(result);
});

export const getBudgets = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const budgets = await getUserBudgets(req.userId);
    res.status(200).json(budgets);
});

export const updateBudget = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const updatedBudget = await updateUserBudget(req.params.id, req.body.amount, req.body.category, req.body.period);
    res.status(200).json(updatedBudget);
});

export const deleteBudget = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await deleteUserBudget(req.params.id, req.userId);
    res.status(200).json(result);
});

export const getBudgetPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const performance = await getUserBudgetPerformance(req.userId);
    res.status(200).json(performance);
});