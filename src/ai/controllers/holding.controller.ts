import { AssetType } from "@prisma/client";
import { getHoldings, getHoldingHistory } from "../services/holding.service";
import { withCache } from "../../utils/redis";
import { presentHolding, presentHoldingHistory } from "../utils/presenters";

export async function handleGetHoldings(userId: string, assetType?: string, onlyWithBalance = false) {
    const scope = `${assetType || "all"}:${onlyWithBalance}`;
    return withCache(`adk:holdings:${userId}:${scope}`, 180, async () => {
        const holdings = await getHoldings(userId, assetType as AssetType, onlyWithBalance);

        return holdings.map(presentHolding);
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

        return history.map(presentHoldingHistory);
    });
}
