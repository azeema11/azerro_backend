import prisma from '../utils/db';
import { TransactionType } from '@prisma/client';
import { withNotFoundHandling, withPrismaErrorHandling, ValidationError } from '../utils/prisma_errors';
import { TransactionUpdateData, CreateTransactionInput } from '../types/service_types';

export const getTransactions = async (userId: string, type?: TransactionType) => {
    return withPrismaErrorHandling(async () => {
        const whereClause: any = { userId };

        if (type && (type === TransactionType.INCOME || type === TransactionType.EXPENSE)) {
            whereClause.type = type;
        }

        return await prisma.transaction.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            include: {
                bankAccount: {
                    select: { name: true }
                }
            }
        });
    }, 'Transaction');
};

export const createTransaction = async (
    userId: string,
    data: CreateTransactionInput
) => {
    // Validation
    if (!data.amount || data.amount === 0) {
        throw new ValidationError(
            'Transaction amount is required and cannot be zero',
            'Transaction',
            undefined,
            { field: 'amount', validationType: 'business' }
        );
    }

    if (!data.currency?.trim()) {
        throw new ValidationError(
            'Currency is required',
            'Transaction',
            undefined,
            { field: 'currency', validationType: 'business' }
        );
    }

    if (!data.category) {
        throw new ValidationError(
            'Category is required',
            'Transaction',
            undefined,
            { field: 'category', validationType: 'business' }
        );
    }

    if (!data.date) {
        throw new ValidationError(
            'Transaction date is required',
            'Transaction',
            undefined,
            { field: 'date', validationType: 'business' }
        );
    }

    return withPrismaErrorHandling(async () => {
        return await prisma.transaction.create({
            data: {
                userId,
                amount: data.amount,
                currency: data.currency.trim().toUpperCase(),
                category: data.category,
                type: data.type || TransactionType.EXPENSE,
                description: data.description?.trim() || null,
                date: new Date(data.date),
                bankAccountId: data.bankAccountId,
            },
        });
    }, 'Transaction');
};

export const updateTransaction = async (id: string, userId: string, data: TransactionUpdateData) => {
    return withNotFoundHandling(async () => {
        return await prisma.transaction.update({
            where: {
                id_userId: { id, userId }
            },
            data,
        });
    }, 'Transaction');
};

export const deleteTransaction = async (id: string, userId: string) => {
    return withNotFoundHandling(async () => {
        await prisma.transaction.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Transaction');
}; 