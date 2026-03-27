import { z } from 'zod';
import { AssetType } from '@prisma/client';

export const createHoldingSchema = z.object({
    body: z.object({
        assetType: z.nativeEnum(AssetType),
        ticker: z.string().min(1),
        quantity: z.number().positive(),
        purchasePrice: z.number().positive(),
        currency: z.string().length(3),
        platform: z.string().optional(),
    }),
});

export const updateHoldingSchema = z.object({
    body: z.object({
        quantity: z.number().positive().optional(),
        purchasePrice: z.number().positive().optional(),
        currency: z.string().length(3).optional(),
        platform: z.string().optional(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const holdingIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});
