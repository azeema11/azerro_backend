import { AssetType } from "@prisma/client";
import { getHoldings, getHoldingHistory } from "../services/holding.service";
import { withCache } from "../../utils/redis";
import { toNumberSafe } from "../../utils/utils";

export async function handleGetHoldings(userId: string, assetType?: string, onlyWithBalance = false) {
    const scope = `${assetType || "all"}:${onlyWithBalance}`;
    return withCache(`adk:holdings:${userId}:${scope}`, 180, async () => {
        const holdings = await getHoldings(userId, assetType as AssetType, onlyWithBalance);

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

export async function handleGetHoldingHistory(
    userId: string,
    limit?: number,
    sinceDays?: number,
    ticker?: string
) {
    const scope = `${limit || "all"}:${sinceDays || "all"}:${ticker || "all"}`;
    return withCache(`adk:holding_history:${userId}:${scope}`, 180, async () => {
        const history = await getHoldingHistory(userId, limit, sinceDays, ticker);

        return history.map((h) => ({
            id: h.id,
            holdingId: h.holdingId,
            ticker: h.ticker,
            name: h.name,
            assetType: h.assetType,
            platform: h.platform,
            quantity: toNumberSafe(h.quantity),
            avgCost: toNumberSafe(h.avgCost),
            lastPrice: toNumberSafe(h.lastPrice),
            convertedValue: toNumberSafe(h.convertedValue),
            currency: h.holdingCurrency,
            recordedAt: h.recordedAt,
        }));
    });
}
