import { AccountType } from '@prisma/client';
import prisma from '../utils/db';

export const createBankAccount = async (
    userId: string,
    name: string,
    type: AccountType,
    balance: number,
    currency: string
) => {
    try {
        if (!name || !type || balance === undefined || !currency) {
            throw new Error('Name, type, balance, and currency are required');
        }

        const account = await prisma.bankAccount.create({
            data: {
                name,
                type,
                balance,
                currency,
                userId,
            },
        });

        return account;
    } catch (err) {
        console.error('Failed to create bank account:', err);
        throw err;
    }
};

export const getBankAccounts = async (userId: string) => {
    try {
        const accounts = await prisma.bankAccount.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return accounts;
    } catch (err) {
        console.error('Failed to get bank accounts:', err);
        throw err;
    }
};

export const updateBankAccount = async (id: string, data: any) => {
    try {
        const updated = await prisma.bankAccount.update({
            where: { id },
            data,
        });

        return updated;
    } catch (err) {
        console.error('Failed to update bank account:', err);
        throw err;
    }
};

export const deleteBankAccount = async (id: string) => {
    try {
        await prisma.bankAccount.delete({ where: { id } });
    } catch (err) {
        console.error('Failed to delete bank account:', err);
        throw err;
    }
}; 