import { z } from "zod";

export const askFridaySchema = z.object({
    message: z.string().describe("The message or query to send to Friday"),
});

export const askJarvisSchema = z.object({
    message: z.string().describe("The message or query to send to Jarvis"),
});
