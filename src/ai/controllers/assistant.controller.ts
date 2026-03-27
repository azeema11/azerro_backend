import { Request, Response } from "express";
import { unifiedAssistantQuery } from "../services/assistant.service";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async_handler";

export const postUnifiedAssistant = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Missing 'message' in request body." });
    }

    const result = await unifiedAssistantQuery(userId, message);
    res.status(200).json(result);
});
