import { describe, it, expect } from 'vitest';
import { extractJsonFromText } from '../../utils/json_extractor';

describe('JSON Extractor Utility', () => {
    it('should extract JSON from markdown code block', () => {
        const text = `Here is your JSON:
\`\`\`json
{
  "type": "chat",
  "message": "Hello!"
}
\`\`\`
Have a good day!`;
        const result = extractJsonFromText(text);
        expect(result).toEqual({ type: 'chat', message: 'Hello!' });
    });

    it('should parse raw JSON string', () => {
        const text = `{"type": "chat", "message": "Raw JSON"}`;
        const result = extractJsonFromText(text);
        expect(result).toEqual({ type: 'chat', message: 'Raw JSON' });
    });

    it('should return null for invalid JSON format', () => {
        const text = `Here is some text with no valid JSON inside.`;
        const result = extractJsonFromText(text);
        expect(result).toBeNull();
    });
});
