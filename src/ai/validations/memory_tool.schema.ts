import { z } from "zod";

export const getUserMemorySchema = z.object({
    category: z.string().optional().describe("Optional category to filter memories (e.g., 'risk_profile', 'wishlist', 'investment_preferences')"),
});

export const saveUserMemorySchema = z.object({
    category: z.string().describe("The category of memory (e.g., 'risk_profile', 'wishlist', 'favourites', 'investment_preferences')"),
    key: z.string().describe("The specific key for this memory (e.g., 'tolerance', 'stocks', 'sectors')"),
    value: z.any().describe("The JSON value or array to store"),
    description: z.string().optional().describe("An optional description explaining what this preference is"),
});
