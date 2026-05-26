import { GoogleGenerativeAI } from "@google/generative-ai";
import { callOllama } from "./ollama";
import crypto from 'crypto';
import redisClient from "../../utils/redis";

/**
 * Generates text using either Google Gemini (if API key is present) or local Ollama.
 * This function serves as the unified AI provider for the application.
 *
 * @param prompt The prompt to send to the AI.
 * @returns The generated text response.
 */
export async function generateAiResponse(prompt: string): Promise<string> {
    const hash = crypto.createHash('sha256').update(prompt).digest('hex');
    const cacheKey = `ai_response:${hash}`;

    try {
        const cachedResponse = await redisClient.get(cacheKey);
        if (cachedResponse) {
            console.log("Serving AI response from cache.");
            return cachedResponse;
        }
    } catch (err) {
        console.error("Redis cache get error in generateAiResponse:", err);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let responseText = "";

    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            // using gemini-2.5-flash-lite for speed and cost effectiveness, can be swapped for pro
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const result = await model.generateContent(prompt);
            responseText = result.response.text();
        } catch (error) {
            console.error("Gemini API request failed, falling back to Ollama:", error);
            // Fallback to Ollama if Gemini fails
            responseText = await callOllama(prompt);
        }
    } else {
        console.log("No GEMINI_API_KEY found, using local Ollama model.");
        responseText = await callOllama(prompt);
    }

    try {
        // Cache response for 3 hours (10800 seconds)
        await redisClient.setex(cacheKey, 10800, responseText);
    } catch (err) {
        console.error("Redis cache set error in generateAiResponse:", err);
    }

    return responseText;
}
