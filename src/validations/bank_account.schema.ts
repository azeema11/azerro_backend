import { z } from 'zod';
import { AccountType } from '@prisma/client';

export const createBankAccountSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        type: z.nativeEnum(AccountType),
        balance: z.number(),
        currency: z.string().length(3),
    }),
});

export const updateBankAccountSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        type: z.nativeEnum(AccountType).optional(),
        balance: z.number().optional(),
        currency: z.string().length(3).optional(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const bankAccountIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});
