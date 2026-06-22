import { AssetType } from "@prisma/client";
import { getHoldings } from "../services/holding.service";
import { withCache } from "../../utils/redis";
import { toNumberSafe } from "../../utils/utils";

export async function handleGetHoldings(userId: string, assetType?: string) {
    const scope = assetType || "all";
    return withCache(`adk:holdings:${userId}:${scope}`, 180, async () => {
        const holdings = await getHoldings(userId, assetType as AssetType);

        return holdings.map((h) => ({
            id: h.id,
            ticker: h.ticker,
            name: h.name,
            assetType: h.assetType,
            platform: h.platform,
            quantity: toNumberSafe(h.quantity),
            avgCost: toNumberSafe(h.avgCost),
            lastPrice: toNumberSafe(h.lastPrice),
            convertedValue: toNumberSafe(h.convertedValue),
            currency: h.holdingCurrency,
        }));
    });
}
