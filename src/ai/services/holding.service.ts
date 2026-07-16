import { AssetType } from "@prisma/client";
import prisma from "../../utils/db";

export async function getHoldings(userId: string, assetType?: AssetType, onlyWithBalance = false) {
    const where: Record<string, any> = { userId };
    if (assetType) where.assetType = assetType;
    if (onlyWithBalance) {
        where.quantity = { gt: 0 };
    }

    return prisma.holding.findMany({ where });
}

export async function getHoldingHistory(
    userId: string,
    limit?: number,
    sinceDays?: number,
    ticker?: string
) {
    const where: Record<string, any> = { userId };
    if (ticker) {
        where.ticker = ticker.toUpperCase();
    }
    if (sinceDays) {
        const date = new Date();
        date.setDate(date.getDate() - sinceDays);
        where.recordedAt = { gte: date };
    }
    return prisma.holdingHistory.findMany({
        where,
        orderBy: { recordedAt: "desc" },
        take: limit,
    });
}
