import { z } from 'zod';
import { TransactionType } from '@prisma/client';

export const createTransactionSchema = z.object({
    body: z.object({
        accountId: z.string().uuid(),
        type: z.nativeEnum(TransactionType),
        amount: z.number().positive(),
        currency: z.string().length(3),
        category: z.string().min(1),
        description: z.string().optional(),
        date: z.string().datetime().optional(),
    }),
});

export const updateTransactionSchema = z.object({
    body: z.object({
        accountId: z.string().uuid().optional(),
        type: z.nativeEnum(TransactionType).optional(),
        amount: z.number().positive().optional(),
        currency: z.string().length(3).optional(),
        category: z.string().min(1).optional(),
        description: z.string().optional(),
        date: z.string().datetime().optional(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const transactionIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});
