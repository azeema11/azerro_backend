import { Router } from "express";
import { postUnifiedAssistant } from "../controllers/assistant.controller";
import { validate } from "../../middlewares/validate.middleware";
import { aiAssistantSchema } from "../../validations/ai.schema";

const router = Router();

router.post("/assistant", validate(aiAssistantSchema), postUnifiedAssistant);

export default router;
