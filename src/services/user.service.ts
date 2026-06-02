import prisma from '../utils/db';
import { withNotFoundHandling } from '../utils/prisma_errors';
import { withCache, safeDel } from '../utils/redis';

export const getUserProfile = async (userId: string) => {
    return withCache(`user:profile:${userId}`, 3600, () =>
        withNotFoundHandling(async () => {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, name: true, baseCurrency: true, monthlyIncome: true }
            });
            if (!user) throw new Error('User not found');
            return user;
        }, 'User')
    );
};

export const updateUserPreferences = async (
    userId: string,
    baseCurrency?: string,
    monthlyIncome?: number
) => {
    await safeDel(`user:profile:${userId}`);
    return withNotFoundHandling(async () => {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                ...(baseCurrency && { baseCurrency }),
                ...(monthlyIncome !== undefined && { monthlyIncome }),
            },
            select: { id: true, baseCurrency: true, monthlyIncome: true }
        });
    }, 'User');
};
