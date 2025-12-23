import { GoogleGenerativeAI } from "@google/generative-ai";
import { callOllama } from "./ollama";

/**
 * Generates text using either Google Gemini (if API key is present) or local Ollama.
 * This function serves as the unified AI provider for the application.
 *
 * @param prompt The prompt to send to the AI.
 * @returns The generated text response.
 */
export async function generateText(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            // using gemini-2.5-flash for speed and cost effectiveness, can be swapped for pro
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error("Gemini API request failed, falling back to Ollama:", error);
            // Fallback to Ollama if Gemini fails
            return await callOllama(prompt);
        }
    } else {
        console.log("No GEMINI_API_KEY found, using local Ollama model.");
        return await callOllama(prompt);
    }
}
