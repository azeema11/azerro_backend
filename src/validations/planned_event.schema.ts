import { z } from 'zod';
import { Periodicity } from '@prisma/client';

export const createPlannedEventSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        estimatedCost: z.number().positive(),
        currency: z.string().length(3).optional(),
        targetDate: z.string().datetime(),
        category: z.string().min(1),
        recurrence: z.nativeEnum(Periodicity).optional().nullable(),
    }),
});

export const updatePlannedEventSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        estimatedCost: z.number().positive().optional(),
        currency: z.string().length(3).optional(),
        targetDate: z.string().datetime().optional(),
        category: z.string().min(1).optional(),
        recurrence: z.nativeEnum(Periodicity).optional().nullable(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const plannedEventIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const completePlannedEventSchema = z.object({
    body: z.object({
        actualCost: z.number().positive().optional(),
        accountId: z.string().uuid(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});
