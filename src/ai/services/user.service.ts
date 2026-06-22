import prisma from "../../utils/db";

export async function getUserProfile(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            baseCurrency: true,
            monthlyIncome: true,
        },
    });
}
