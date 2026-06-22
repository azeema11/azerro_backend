import { Gemini } from "@google/adk";

export interface ModelConfig {
    model: string | Gemini;
    provider: "gemini" | "ollama";
}

/**
 * Resolves the LLM model configuration from environment variables.
 *
 * AI_PROVIDER = "gemini" (default) | "ollama"
 * AI_MODEL    = model name string (defaults per provider)
 *
 * For Gemini, the model string is passed directly to the ADK assistant (ADK handles auth
 * via GEMINI_API_KEY or GOOGLE_API_KEY env vars).
 *
 * For Ollama, returns the model string prefixed for future LiteLLM/custom
 * BaseLlm integration. Phase 1 only supports Gemini; Ollama support is
 * prepared but not yet wired.
 */
export function getModelConfig(): ModelConfig {
    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase() as ModelConfig["provider"];
    const defaultModel = provider === "gemini" ? "gemini-2.5-flash" : "llama3.1:8b";
    const model = process.env.AI_MODEL || defaultModel;

    return { model, provider };
}
