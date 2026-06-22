import { AccountType } from "@prisma/client";
import prisma from "../../utils/db";

export async function getBankAccounts(userId: string, type?: AccountType) {
    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;

    return prisma.bankAccount.findMany({ where });
}
