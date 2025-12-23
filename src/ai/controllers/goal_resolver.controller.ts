import { Response } from 'express';
import { resolveGoalConflict } from '../services/goal_resolver.service';
import { asyncHandler } from '../../utils/async_handler';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const resolveGoalConflictController = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conflictingGoal, userMessage, history } = req.body;

    if (!conflictingGoal || !userMessage) {
        return res.status(400).json({ error: 'Missing required fields: conflictingGoal and userMessage are required.' });
    }

    const result = await resolveGoalConflict({
        userId: req.userId,
        conflictingGoal,
        userMessage,
        history
    });

    res.json(result);
});
