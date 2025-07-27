import prisma from '../utils/db';
import { Category, TransactionType } from '@prisma/client';

export const getTransactions = async (userId: string, type?: TransactionType) => {
    try {
        const whereClause: any = { userId };

        if (type && (type === TransactionType.INCOME || type === TransactionType.EXPENSE)) {
            whereClause.type = type;
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
        });

        return transactions;
    } catch (err) {
        console.error('Failed to get transactions:', err);
        throw err;
    }
};

export const createTransaction = async (
    userId: string,
    amount: number,
    currency: string,
    category: Category,
    date: string,
    type?: TransactionType,
    description?: string,
    bankAccountId?: string
) => {
    try {
        if (!amount || !currency || !category || !date) {
            throw new Error('Amount, currency, category, and date are required');
        }

        const txn = await prisma.transaction.create({
            data: {
                userId,
                amount,
                currency,
                category,
                type: type || TransactionType.EXPENSE, // Default to EXPENSE if not provided
                description,
                date: new Date(date),
                bankAccountId,
            },
        });

        return txn;
    } catch (err) {
        console.error('Failed to create transaction:', err);
        throw err;
    }
};

export const updateTransaction = async (id: string, data: any) => {
    try {
        const updated = await prisma.transaction.update({
            where: { id },
            data,
        });

        return updated;
    } catch (err) {
        console.error('Failed to update transaction:', err);
        throw err;
    }
};

export const deleteTransaction = async (id: string) => {
    try {
        await prisma.transaction.delete({ where: { id } });
    } catch (err) {
        console.error('Failed to delete transaction:', err);
        throw err;
    }
}; 