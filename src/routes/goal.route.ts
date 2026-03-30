import { Router } from 'express';
import {
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    getGoalById,
    contributeToGoal,
    getGoalConflicts
} from '../controllers/goal.controller';

const router = Router();

router.get('/', getGoals);
router.get('/conflicts', getGoalConflicts);
router.get('/:id', getGoalById);
router.post('/', createGoal);
router.post('/:id/contribute', contributeToGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

export default router;
