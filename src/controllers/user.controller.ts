import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async_handler";
import { getUserProfile as getUserProfileService, updateUserPreferences as updateUserPreferencesService } from "../services/user.service";

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await getUserProfileService(req.userId!);
  res.status(200).json(user);
});

export const updateUserPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { baseCurrency, monthlyIncome } = req.body;
  const updatedUser = await updateUserPreferencesService(req.userId!, baseCurrency, monthlyIncome);
  res.status(200).json(updatedUser);
});