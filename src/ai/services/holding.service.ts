import { AssetType } from "@prisma/client";
import prisma from "../../utils/db";

export async function getHoldings(userId: string, assetType?: AssetType) {
    const where: Record<string, unknown> = { userId };
    if (assetType) where.assetType = assetType;

    return prisma.holding.findMany({ where });
}
