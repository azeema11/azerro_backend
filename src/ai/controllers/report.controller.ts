import { Request, Response } from "express";
import { summarizeReport } from "../services/report.service";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async_handler";

export const getReportSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { reportType, options } = req.body;

    if (!reportType) {
        return res.status(400).json({ error: "Missing 'reportType' in request body." });
    }

    const result = await summarizeReport(userId, reportType, options || {});
    res.status(200).json(result);
});
