import { Request, Response } from "express";
import { generatePredictiveInsights } from "../services/predictive.service";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async_handler";

export const getPredictiveInsightsController = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await generatePredictiveInsights(userId);
    res.status(200).json(result);
});
