import { z } from 'zod';

export const createGoalSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        targetAmount: z.number().positive(),
        currency: z.string().length(3),
        targetDate: z.string().datetime(),
    }),
});

export const updateGoalSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        targetAmount: z.number().positive().optional(),
        currency: z.string().length(3).optional(),
        targetDate: z.string().datetime().optional(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const goalIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const contributeGoalSchema = z.object({
    body: z.object({
        amount: z.number().positive(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});
