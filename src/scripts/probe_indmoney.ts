import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const url = "https://mcp.indmoney.com/mcp";
  console.log(`Probing INDMoney MCP server at ${url}...`);

  const connection = await prisma.userMemory.findFirst({
    where: { category: "broker_connection", key: "indmoney" },
  });

  if (!connection) {
    console.log("No INDMoney connection found in database.");
    await prisma.$disconnect();
    return;
  }

  const val = connection.value as any;
  if (!val.connected || !val.accessToken) {
    console.log("INDMoney is not connected or has no access token.");
    await prisma.$disconnect();
    return;
  }

  try {
    const client = new Client({
      name: "probe-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    console.log("Trying StreamableHTTPClientTransport with stored token...");
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${val.accessToken}`,
        },
      },
    });

    await client.connect(transport);
    console.log("Connected successfully via StreamableHTTPClientTransport!");
    
    const tools = await client.listTools();
    console.log("Tools:", JSON.stringify(tools, null, 2));
    
    await client.close();
  } catch (error: any) {
    console.log(`StreamableHTTP connection failed: ${error.message || error}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
