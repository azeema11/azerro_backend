import { Request, Response } from "express";
import prisma from "../utils/db";
import { AuthRequest } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, baseCurrency: true, monthlyIncome: true }
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(user);
});

export const updateUserPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  
  const { baseCurrency, monthlyIncome } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(baseCurrency && { baseCurrency }),
      ...(monthlyIncome !== undefined && { monthlyIncome }),
    },
    select: { id: true, baseCurrency: true, monthlyIncome: true }
  });

  res.json(updatedUser);
});