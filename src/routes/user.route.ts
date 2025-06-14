import { Router } from "express";
import { getUserProfile, updateUserPreferences } from "../controllers/user.controller";

const router = Router();

router.get("/me", getUserProfile);
router.put("/preferences", updateUserPreferences);

export default router;