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
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);
router.get('/:id', getGoalById);
router.post('/:id/contribute', contributeToGoal);
router.get('/conflicts', getGoalConflicts);

export default router;
