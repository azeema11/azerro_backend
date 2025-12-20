"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateText = generateText;
const generative_ai_1 = require("@google/generative-ai");
const ollama_1 = require("./ollama");
/**
 * Generates text using either Google Gemini (if API key is present) or local Ollama.
 * This function serves as the unified AI provider for the application.
 *
 * @param prompt The prompt to send to the AI.
 * @returns The generated text response.
 */
async function generateText(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        try {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            // using gemini-1.5-flash for speed and cost effectiveness, can be swapped for pro
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            console.error("Gemini API request failed, falling back to Ollama:", error);
            // Fallback to Ollama if Gemini fails
            return await (0, ollama_1.callOllama)(prompt);
        }
    }
    else {
        console.log("No GEMINI_API_KEY found, using local Ollama model.");
        return await (0, ollama_1.callOllama)(prompt);
    }
}
