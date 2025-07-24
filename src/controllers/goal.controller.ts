import { Request, Response } from 'express';
import prisma from '../utils/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { checkGoalConflicts } from '../services/goal.service';
import { asyncHandler } from '../utils/asyncHandler';

export const getGoals = asyncHandler(async (req: AuthRequest, res: Response) => {
    const goals = await prisma.goal.findMany({
        where: { userId: req.userId }
    });

    const goalsWithProgress = goals.map(goal => ({
        ...goal,
        progress: Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
    }));

    res.json(goalsWithProgress);
});

export const createGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, targetAmount, savedAmount, targetDate } = req.body;

    if (!name || !targetAmount || !targetDate) {
        return res.status(400).json({ error: 'Name, target amount, and target date are required' });
    }

    // Get user's base currency
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { baseCurrency: true }
    });

    const currency = user?.baseCurrency ?? 'INR';

    const goal = await prisma.goal.create({
        data: {
            userId: req.userId!,
            name,
            description,
            targetAmount,
            savedAmount,
            currency,
            targetDate: new Date(targetDate)
        }
    });
    res.status(201).json(goal);
});

export const updateGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.goal.update({
        where: { id },
        data: {
            ...data,
        }
    });
    res.json(updated);
});

export const deleteGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await prisma.goal.delete({ where: { id } });
    res.status(204).send();
});

export const getGoalById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const goal = await prisma.goal.findFirst({
        where: {
            id: req.params.id,
            userId: req.userId
        }
    });

    if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
    }

    const progress = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
    res.json({ ...goal, progress });
});

export const contributeToGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid contribution amount is required' });
    }

    const goal = await prisma.goal.update({
        where: { id },
        data: {
            savedAmount: {
                increment: amount
            }
        }
    });

    const progress = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
    res.json({ ...goal, progress });
});

export const getGoalConflicts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const result = await checkGoalConflicts(userId);
    res.json(result);
});