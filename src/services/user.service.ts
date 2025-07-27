import prisma from '../utils/db';

export const getUserProfile = async (userId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, baseCurrency: true, monthlyIncome: true }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    } catch (err) {
        console.error('Failed to get user profile:', err);
        throw err;
    }
};

export const updateUserPreferences = async (
    userId: string,
    baseCurrency?: string,
    monthlyIncome?: number
) => {
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(baseCurrency && { baseCurrency }),
                ...(monthlyIncome !== undefined && { monthlyIncome }),
            },
            select: { id: true, baseCurrency: true, monthlyIncome: true }
        });

        return updatedUser;
    } catch (err) {
        console.error('Failed to update user preferences:', err);
        throw err;
    }
}; 