/**
 * Extracts and parses a JSON object from a text string that might contain other content.
 * Handles Markdown code blocks and surrounding text.
 *
 * @param text The text response from the AI which may contain JSON.
 * @returns The parsed object or null if parsing fails.
 */
export function extractJsonFromText(text: string): any {
    try {
        let jsonString = text.trim();

        // 1. Try to extract from Markdown code blocks ```json ... ```
        const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
        const codeBlockMatch = text.match(codeBlockRegex);

        if (codeBlockMatch && codeBlockMatch[1]) {
            jsonString = codeBlockMatch[1].trim();
        } else {
            // 2. If no code block, try to find the outer-most JSON object {...}
            // This is a greedy match from the first { to the last }
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                jsonString = text.substring(firstBrace, lastBrace + 1);
            }
            // 3. Fallback: assume the whole string might be JSON (or let JSON.parse fail)
        }

        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to extract/parse JSON from text:", error);
        return null;
    }
}
