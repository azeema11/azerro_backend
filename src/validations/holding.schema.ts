import { z } from 'zod';
import { AssetType } from '@prisma/client';

export const createHoldingSchema = z.object({
    body: z.object({
        platform: z.string().optional(),
        ticker: z.string().min(1),
        assetType: z.enum(AssetType),
        name: z.string().min(1),
        quantity: z.number().positive(),
        avgCost: z.number().positive(),
        holdingCurrency: z.string().length(3),
    }),
});

export const updateHoldingSchema = z.object({
    body: z.object({
        platform: z.string().optional(),
        ticker: z.string().optional(),
        assetType: z.enum(AssetType).optional(),
        name: z.string().optional(),
        quantity: z.number().positive().optional(),
        avgCost: z.number().positive().optional(),
        holdingCurrency: z.string().length(3).optional(),
        lastPrice: z.number().positive().optional(),
        convertedValue: z.number().optional(),
    }),
    params: z.object({
        id: z.uuid(),
    }),
});

export const holdingIdSchema = z.object({
    params: z.object({
        id: z.uuid(),
    }),
});
