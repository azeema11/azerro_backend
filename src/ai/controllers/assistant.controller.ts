import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async_handler";
import { runAssistant } from "../adk/runner";

export const postUnifiedAssistant = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { message, sessionId } = req.body;

    const result = await runAssistant(userId, message, sessionId);

    return res.status(200).json(result);
});
