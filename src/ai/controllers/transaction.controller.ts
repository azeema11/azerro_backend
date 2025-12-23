import { Request, Response } from "express";
import { askQuestionToTransactionAgent } from "../services/transaction.service";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async_handler";

export const askTransactionAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { question } = req.body;
    const result = await askQuestionToTransactionAgent(userId, question);
    res.status(200).json(result);
});