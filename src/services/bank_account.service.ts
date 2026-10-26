import prisma from '../utils/db';
import { withNotFoundHandling, withPrismaErrorHandling } from '../utils/prisma_errors';
import { BankAccountUpdateData, CreateBankAccountInput } from '../types/service_types';

export const createBankAccount = async (
    userId: string,
    data: CreateBankAccountInput
) => {
    return withPrismaErrorHandling(async () => {
        return await prisma.bankAccount.create({
            data: {
                name: data.name.trim(),
                type: data.type,
                balance: data.balance || 0,
                currency: data.currency?.trim().toUpperCase() || 'USD',
                userId,
            },
        });
    }, 'BankAccount');
};

export const getBankAccounts = async (userId: string) => {
    return withPrismaErrorHandling(async () => {
        return await prisma.bankAccount.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }, 'BankAccount');
};

export const updateBankAccount = async (id: string, userId: string, data: BankAccountUpdateData) => {
    return withNotFoundHandling(async () => {
        return await prisma.bankAccount.update({
            where: {
                id_userId: { id, userId }
            },
            data,
        });
    }, 'Bank account');
};

export const deleteBankAccount = async (id: string, userId: string) => {
    return withNotFoundHandling(async () => {
        await prisma.bankAccount.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Bank account');
}; 