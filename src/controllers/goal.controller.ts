import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async_handler';
import { CreateGoalInput, GoalUpdateData } from '../types/service_types';
import {
    getGoals as getGoalsService,
    createGoal as createGoalService,
    updateGoal as updateGoalService,
    deleteGoal as deleteGoalService,
    getGoalById as getGoalByIdService,
    contributeToGoal as contributeToGoalService,
    checkGoalConflicts
} from '../services/goal.service';

export const getGoals = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const goals = await getGoalsService(req.userId);

    res.status(200).json(goals);
});

export const createGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create typed input object from request body
    const { name, description, targetAmount, savedAmount, targetDate } = req.body;

    const goalInput: CreateGoalInput = {
        name,
        targetAmount,
        targetDate,
        description,
        savedAmount
    };

    const goal = await createGoalService(req.userId, goalInput);

    res.status(201).json(goal);
});

export const updateGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Create typed update object from request body
    const { name, description, targetAmount, savedAmount, currency, targetDate, completed } = req.body;

    const updateData: GoalUpdateData = {
        name,
        description,
        targetAmount,
        savedAmount,
        currency,
        targetDate,
        completed
    };

    const updated = await updateGoalService(id, req.userId, updateData);

    res.status(200).json(updated);
});

export const deleteGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    await deleteGoalService(id, req.userId);

    res.status(204).send();
});

export const getGoalById = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const goal = await getGoalByIdService(id, req.userId);

    res.status(200).json(goal);
});

export const contributeToGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const { amount } = req.body;

    const goal = await contributeToGoalService(id, req.userId, amount);

    res.status(200).json(goal);
});

export const getGoalConflicts = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await checkGoalConflicts(req.userId);

    res.status(200).json(result);
});