import { Response } from 'express';
import { getBudgetAnalysis, chatBudgetAdvisor } from '../services/budget_advisor.service';
import { asyncHandler } from '../../utils/async_handler';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getBudgetSummaryController = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await getBudgetAnalysis(req.userId);
    res.json(result);
});

export const chatBudgetAdvisorController = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const response = await chatBudgetAdvisor(req.userId, message, history);
    res.json({ message: response });
});
