import { z } from 'zod';

export const aiAssistantSchema = z.object({
    body: z.object({
        message: z.string().trim().min(1, "Message is required"),
        sessionId: z.string().optional(),
    }),
});
