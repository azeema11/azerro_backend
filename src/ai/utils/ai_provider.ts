import { GoogleGenerativeAI } from "@google/generative-ai";
import { callOllama } from "./ollama";
import { extractJsonFromText } from "./json_extractor";
import crypto from 'crypto';
import { safeGet, safeSetex } from "../../utils/redis";

interface AiResult {
    success: boolean;
    answer: any;
}

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

    const cachedResponse = await safeGet(cacheKey);
    if (cachedResponse) {
        console.log("Serving AI response from cache.");
        return cachedResponse;
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

    if (responseText && responseText.trim()) {
        await safeSetex(cacheKey, 10800, responseText);
    }

    return responseText;
}

/**
 * Generates an AI response, extracts JSON, and returns a standardised { success, answer } result.
 * On parse failure, uses fallbackFn to build a best-effort answer from the raw text.
 * Optionally caches the parsed response.
 */
export async function generateAndParse(
    prompt: string,
    fallbackFn: (rawText: string) => any,
    errorFallback: any,
    cacheKey?: string,
    cacheTtl?: number
): Promise<AiResult> {
    try {
        const responseText = await generateAiResponse(prompt);
        const parsed = extractJsonFromText(responseText);

        if (parsed) {
            if (cacheKey && cacheTtl) {
                await safeSetex(cacheKey, cacheTtl, JSON.stringify(parsed));
            }
            return { success: true, answer: parsed };
        }

        return { success: true, answer: fallbackFn(responseText) };
    } catch (error) {
        console.error("AI response error:", error);
        return { success: false, answer: errorFallback };
    }
}
