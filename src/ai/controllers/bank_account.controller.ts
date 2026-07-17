import { AccountType } from "@prisma/client";
import { getBankAccounts } from "../services/bank_account.service";
import { withCache } from "../../utils/redis";
import { presentBankAccount } from "../utils/presenters";

export async function handleGetBankAccounts(userId: string, type?: string) {
    const scope = type || "all";
    return withCache(`adk:accounts:${userId}:${scope}`, 180, async () => {
        const accounts = await getBankAccounts(userId, type as AccountType);
        return accounts.map(presentBankAccount);
    });
}
