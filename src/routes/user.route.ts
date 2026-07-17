import { Router } from "express";
import { getUserProfile, updateUserPreferences } from "../controllers/user.controller";
import { validate } from "../middlewares/validate.middleware";
import { updateProfileSchema } from "../validations/user.schema";

const router = Router();

router.get("/me", getUserProfile);
router.put("/preferences", validate(updateProfileSchema), updateUserPreferences);

export default router;