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
import { validate } from '../middlewares/validate.middleware';
import { createGoalSchema, updateGoalSchema, goalIdSchema, contributeGoalSchema } from '../validations/goal.schema';

const router = Router();

router.get('/', getGoals);
router.get('/conflicts', getGoalConflicts);
router.get('/:id', validate(goalIdSchema), getGoalById);
router.post('/', validate(createGoalSchema), createGoal);
router.post('/:id/contribute', validate(contributeGoalSchema), contributeToGoal);
router.put('/:id', validate(updateGoalSchema), updateGoal);
router.delete('/:id', validate(goalIdSchema), deleteGoal);

export default router;
