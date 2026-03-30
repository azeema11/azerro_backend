import { Request, Response } from "express";
import { analyzePlannedEventsImpact } from "../services/planned_event.service";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async_handler";

export const getPlannedEventImpactController = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await analyzePlannedEventsImpact(userId);
    res.status(200).json(result);
});
