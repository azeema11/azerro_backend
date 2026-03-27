import { z } from 'zod';
import { Periodicity } from '@prisma/client';

export const createBudgetSchema = z.object({
    body: z.object({
        category: z.string().min(1),
        amount: z.number().positive(),
        currency: z.string().length(3).optional(),
        period: z.nativeEnum(Periodicity),
    }),
});

export const updateBudgetSchema = z.object({
    body: z.object({
        amount: z.number().positive().optional(),
        currency: z.string().length(3).optional(),
        period: z.nativeEnum(Periodicity).optional(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const budgetIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});
