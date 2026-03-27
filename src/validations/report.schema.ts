import { z } from 'zod';
import { Periodicity } from '@prisma/client';

export const dateRangeSchema = z.object({
    query: z.object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
    }),
});

export const dateRangeStartEndSchema = z.object({
    query: z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
    }),
});

export const periodicReportSchema = z.object({
    query: z.object({
        period: z.nativeEnum(Periodicity).optional(),
        date: z.string().datetime().optional(),
    }),
});

export const assetAllocationSchema = z.object({
    query: z.object({
        groupBy: z.enum(['assetType', 'platform', 'ticker']).optional(),
    }),
});
