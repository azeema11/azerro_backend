import { AccountType } from "@prisma/client";
import { getBankAccounts } from "../services/bank_account.service";
import { withCache } from "../../utils/redis";
import { toNumberSafe } from "../../utils/utils";

export async function handleGetBankAccounts(userId: string, type?: string) {
    const scope = type || "all";
    return withCache(`adk:accounts:${userId}:${scope}`, 180, async () => {
        const accounts = await getBankAccounts(userId, type as AccountType);

        return accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            balance: toNumberSafe(a.balance),
            currency: a.currency,
        }));
    });
}
