import { z } from 'zod';

const brokerParamSchema = z.object({
    params: z.object({
        broker: z.string().min(1),
    }),
});

export const connectBrokerSchema = z.object({
    params: z.object({
        broker: z.string().min(1),
    }),
    body: z.object({}).passthrough(),
});

export const brokerStatusSchema = brokerParamSchema;

export const syncBrokerSchema = brokerParamSchema;

export const disconnectBrokerSchema = brokerParamSchema;

export const searchInstrumentSchema = z.object({
    params: z.object({
        broker: z.string().min(1),
    }),
    query: z.object({
        query: z.string().min(1, "Query parameter is required"),
    }),
});

export const instrumentDetailsSchema = z.object({
    params: z.object({
        broker: z.string().min(1),
        symbol: z.string().min(1),
    }),
});

export const saveMemorySchema = z.object({
    body: z.object({
        category: z.string().min(1, "Category is required"),
        key: z.string().min(1, "Key is required"),
        value: z.unknown(),
        description: z.string().optional(),
    }),
});

export const deleteMemorySchema = z.object({
    params: z.object({
        category: z.string().min(1),
        key: z.string().min(1),
    }),
});

export const getMemoriesSchema = z.object({
    query: z.object({
        category: z.string().optional(),
    }),
});
