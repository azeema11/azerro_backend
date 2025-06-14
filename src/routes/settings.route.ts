import { Router } from 'express';
import { updateUserPreferences } from '../controllers/user.controller';

const router = Router();

router.put('/preferences', updateUserPreferences);

export default router;