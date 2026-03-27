import { z } from 'zod';

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        baseCurrency: z.string().length(3).optional(),
        monthlyIncome: z.number().positive().optional(),
    }),
});
