import { monthsBetween } from "../utils/date";
import prisma from "../utils/db";

export async function checkGoalConflicts(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const goals = await prisma.goal.findMany({
        where: { userId, completed: false }
    });

    const now = new Date();
    let totalRequired = 0;
    const detailed = [];

    for (const g of goals) {
        const monthsLeft = monthsBetween(now, g.targetDate);
        const amountLeft = g.targetAmount - g.savedAmount;
        const perMonth = monthsLeft > 0 ? amountLeft / monthsLeft : amountLeft;
        totalRequired += perMonth;

        detailed.push({ goalId: g.id, name: g.name, perMonth, monthsLeft });
    }

    const conflict = totalRequired > (user?.monthlyIncome ?? 0);

    return {
        conflict,
        totalRequiredPerMonth: totalRequired,
        availableMonthlyIncome: user?.monthlyIncome ?? 0,
        overBudgetBy: totalRequired - (user?.monthlyIncome ?? 0),
        breakdown: detailed
    };
}