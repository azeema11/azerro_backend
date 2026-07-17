import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const mcpUrl = process.env.INDMONEY_MCP_URL || "https://mcp.indmoney.com/mcp";

export async function createIndmoneyMcpClient(token: string, clientName = "azerro-client"): Promise<Client> {
    const client = new Client({ name: clientName, version: "1.0.0" }, { capabilities: {} });
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    return client;
}

export function parseMcpToolJson<T = unknown>(response: unknown): T | null {
    if (response && Array.isArray((response as any).content)) {
        const text = (response as any).content[0]?.text;
        if (text) {
            return JSON.parse(text) as T;
        }
    }
    return null;
}
