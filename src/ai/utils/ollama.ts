export async function callOllama(prompt: string): Promise<string> {
    try {
        if (!process.env.OLLAMA_MODEL_ENDPOINT) {
            throw new Error("Ollama request failed");
        }
        const response = await fetch(process.env.OLLAMA_MODEL_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama3.1:8b", prompt, stream: false, temperature: 0 }),
        });
        const data = await response.json();
        return data.response.trim();
    } catch (err) {
        console.error("Ollama request failed:", err);
        throw new Error("AI summarization failed");
    }
}