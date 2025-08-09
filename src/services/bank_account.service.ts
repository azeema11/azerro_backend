import { AccountType } from '@prisma/client';
import prisma from '../utils/db';
import { withNotFoundHandling, withPrismaErrorHandling, ValidationError } from '../utils/prisma_errors';
import { BankAccountUpdateData, CreateBankAccountInput } from '../types/service_types';

export const createBankAccount = async (
    userId: string,
    data: CreateBankAccountInput
) => {
    // Validation
    if (!data.name?.trim()) {
        throw new ValidationError(
            'Bank account name is required',
            'BankAccount',
            undefined,
            { field: 'name', validationType: 'business' }
        );
    }

    if (!data.type) {
        throw new ValidationError(
            'Account type is required',
            'BankAccount',
            undefined,
            { field: 'type', validationType: 'business' }
        );
    }

    if (data.balance !== undefined && data.balance < 0) {
        throw new ValidationError(
            'Balance must be a non-negative number',
            'BankAccount',
            undefined,
            { field: 'balance', validationType: 'business' }
        );
    }

    if (data.currency && !data.currency.trim()) {
        throw new ValidationError(
            'Currency cannot be empty',
            'BankAccount',
            undefined,
            { field: 'currency', validationType: 'business' }
        );
    }

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