import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import prisma from "../../utils/db";
import { getAccessToken, indmoneyService } from "../../services/brokers/indmoney.service";

const mcpUrl = process.env.INDMONEY_MCP_URL || "https://mcp.indmoney.com/mcp";

async function createMcpClient(token: string): Promise<Client> {
  const client = new Client({ name: "azerro-ai-client", version: "1.0.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  return client;
}

/**
 * Checks connection status of INDMoney broker.
 */
async function getConnectionStatus(userId: string) {
  try {
    const status = await indmoneyService.getStatus(userId);
    if (!status.connected) {
      return { connected: false };
    }
    const token = await getAccessToken(userId);
    return {
      connected: true,
      token,
      mode: status.metadata?.mode || "real",
    };
  } catch {
    return { connected: false };
  }
}

/**
 * Searches for instruments (stocks/funds) using INDMoney MCP server or mock data.
 */
export async function searchInstrument(userId: string, query: string): Promise<any> {
  const status = await getConnectionStatus(userId);
  if (!status.connected) {
    throw new Error("INDMoney is not connected. Please connect first.");
  }

  if (status.mode === "mock") {
    const normalized = query.toUpperCase();
    const mockInstruments = [
      { symbol: "MSFT", name: "Microsoft Corporation", assetType: "STOCK", exchange: "NASDAQ", price: 420.00, currency: "USD" },
      { symbol: "AAPL", name: "Apple Inc.", assetType: "STOCK", exchange: "NASDAQ", price: 180.50, currency: "USD" },
      { symbol: "RELIANCE", name: "Reliance Industries Ltd", assetType: "STOCK", exchange: "NSE", price: 2520.00, currency: "INR" },
      { symbol: "TCS", name: "Tata Consultancy Services Ltd", assetType: "STOCK", exchange: "NSE", price: 3950.00, currency: "INR" },
      { symbol: "INFY", name: "Infosys Ltd", assetType: "STOCK", exchange: "NSE", price: 1420.00, currency: "INR" },
    ];

    return mockInstruments.filter(
      (inst) =>
        inst.symbol.includes(normalized) ||
        inst.name.toUpperCase().includes(normalized)
    );
  }

  // Real MCP call
  let client: Client | null = null;
  try {
    client = await createMcpClient(status.token!);

    // Try searching in IN_STOCKS first, then US_STOCKS
    const filterTypes = ["IN_STOCKS", "US_STOCKS"];
    let matches: any[] = [];
    let lastError: unknown = null;
    let anySucceeded = false;

    for (const filterType of filterTypes) {
      try {
        const response = await client.callTool({
          name: "lookup_ind_keys",
          arguments: {
            names: [query],
            filter_type: filterType
          },
        });

        anySucceeded = true;

        if (response && Array.isArray((response as any).content)) {
          const text = (response as any).content[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed && parsed.length > 0) {
              matches = parsed.map((m: any) => ({
                symbol: m.ind_key,
                name: m.name,
                assetType: "STOCK",
                exchange: filterType === "US_STOCKS" ? "US" : "NSE",
              }));
              break;
            }
          }
        }
      } catch (err) {
        lastError = err;
        console.error(`Failed to search in ${filterType}:`, err);
      }
    }

    if (!anySucceeded && lastError) {
      throw lastError;
    }

    return matches;
  } catch (error: any) {
    console.error("Failed to search instrument via INDMoney MCP:", error.message || error);
    throw new Error(`INDMoney search failed: ${error.message || error}`);
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * Gets details of a specific stock/fund instrument.
 */
export async function getInstrumentDetails(userId: string, symbol: string): Promise<any> {
  const status = await getConnectionStatus(userId);
  if (!status.connected) {
    throw new Error("INDMoney is not connected. Please connect first.");
  }

  if (status.mode === "mock") {
    const sym = symbol.toUpperCase();
    const detailsMap: Record<string, any> = {
      MSFT: {
        symbol: "MSFT",
        name: "Microsoft Corporation",
        price: 420.00,
        currency: "USD",
        peRatio: 32.5,
        pegRatio: 1.4,
        marketCap: "3.15T",
        fiftyTwoWeekRange: { low: 315.18, high: 430.82 },
        analystConsensus: "Strong Buy",
        buyPercentage: 88,
        targetPrice: 480.00,
        upsidePercentage: 14.2,
        news: [
          { title: "Microsoft launches new AI-powered cloud features, expanding enterprise margins.", sentiment: "Positive" },
          { title: "Analysts raise MSFT target price citing strong Copilot adoption.", sentiment: "Positive" }
        ]
      },
      AAPL: {
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 180.50,
        currency: "USD",
        peRatio: 28.2,
        pegRatio: 2.1,
        marketCap: "2.80T",
        fiftyTwoWeekRange: { low: 165.00, high: 199.62 },
        analystConsensus: "Buy",
        buyPercentage: 72,
        targetPrice: 210.00,
        upsidePercentage: 16.3,
        news: [
          { title: "Apple announces integration of OpenAI models into iOS.", sentiment: "Positive" },
          { title: "iPhone sales in China show signs of recovery.", sentiment: "Neutral" }
        ]
      },
      RELIANCE: {
        symbol: "RELIANCE",
        name: "Reliance Industries Ltd",
        price: 2520.00,
        currency: "INR",
        peRatio: 24.8,
        pegRatio: 1.6,
        marketCap: "17.05L Cr",
        fiftyTwoWeekRange: { low: 2180.00, high: 2630.00 },
        analystConsensus: "Buy",
        buyPercentage: 80,
        targetPrice: 2850.00,
        upsidePercentage: 13.1,
        news: [
          { title: "Reliance Retail expands warehouse footprint across tier-2 cities.", sentiment: "Positive" },
          { title: "Jio announces new tariff plans with 15% average increase.", sentiment: "Positive" }
        ]
      },
      TCS: {
        symbol: "TCS",
        name: "Tata Consultancy Services Ltd",
        price: 3950.00,
        currency: "INR",
        peRatio: 29.5,
        pegRatio: 1.9,
        marketCap: "14.45L Cr",
        fiftyTwoWeekRange: { low: 3150.00, high: 4100.00 },
        analystConsensus: "Hold",
        buyPercentage: 55,
        targetPrice: 4120.00,
        upsidePercentage: 4.3,
        news: [
          { title: "TCS signs $500M deal with leading European financial institution.", sentiment: "Positive" },
          { title: "IT sector facing temporary headwinds in discretionary spending.", sentiment: "Negative" }
        ]
      }
    };

    return detailsMap[sym] || {
      symbol: sym,
      name: `${sym} Corporation`,
      price: 150.00,
      currency: "INR",
      peRatio: 22.0,
      pegRatio: 1.5,
      marketCap: "Medium",
      fiftyTwoWeekRange: { low: 100.00, high: 180.00 },
      analystConsensus: "Buy",
      buyPercentage: 65,
      targetPrice: 175.00,
      upsidePercentage: 16.6,
      news: [
        { title: "Company reports steady quarterly earnings matching estimates.", sentiment: "Neutral" }
      ]
    };
  }

  // Real MCP call
  let client: Client | null = null;
  try {
    client = await createMcpClient(status.token!);

    let details: any = null;

    // 1. Try to resolve the symbol to an ind_key across different asset classes
    const filterTypes = ["IN_STOCKS", "US_STOCKS", "MF"];
    let indKey = symbol;
    let resolvedMarket = "US_STOCKS"; // Default fallback
    let resolved = false;

    for (const filterType of filterTypes) {
      try {
        const lookupResponse = await client.callTool({
          name: "lookup_ind_keys",
          arguments: {
            names: [symbol],
            filter_type: filterType
          },
        });

        if (lookupResponse && Array.isArray((lookupResponse as any).content)) {
          const text = (lookupResponse as any).content[0]?.text;
          if (text) {
            const matches = JSON.parse(text);
            if (matches && matches.length > 0) {
              // Try to find exact case-insensitive match for the ind_key or symbol
              const exactMatch = matches.find(
                (m: any) => m.ind_key.toUpperCase() === symbol.toUpperCase()
              );
              indKey = exactMatch ? exactMatch.ind_key : matches[0].ind_key;
              resolvedMarket = filterType;
              resolved = true;
              break;
            }
          }
        }
      } catch (err) {
        console.error(`Failed to lookup key in ${filterType}:`, err);
      }
    }

    // 2. Fetch details using the resolved market-specific tool
    if (resolvedMarket === "IN_STOCKS" || indKey.startsWith("INDS")) {
      // Call get_indian_stocks_details for Indian stocks
      const response = await client.callTool({
        name: "get_indian_stocks_details",
        arguments: {
          ind_keys: [indKey],
          segments: ["analyst", "news"]
        },
      });

      if (response && Array.isArray((response as any).content)) {
        const text = (response as any).content[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          details = parsed[indKey] || null;
        }
      }
    } else if (resolvedMarket === "MF") {
      // Call get_mf_funds_details for Mutual Funds
      const response = await client.callTool({
        name: "get_mf_funds_details",
        arguments: {
          fund_ids: [indKey],
          includes: ["fund_performance", "asset_allocation", "sector_allocation", "holdings"]
        },
      });

      if (response && Array.isArray((response as any).content)) {
        const text = (response as any).content[0]?.text;
        if (text) {
          details = JSON.parse(text);
        }
      }
    } else {
      // Try get_us_stocks_details for US stocks
      const response = await client.callTool({
        name: "get_us_stocks_details",
        arguments: {
          symbols: [indKey],
          segments: ["analyst", "news"]
        },
      });

      if (response && Array.isArray((response as any).content)) {
        const text = (response as any).content[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          details = parsed[indKey] || null;
        }
      }
    }

    return details;
  } catch (error: any) {
    console.error("Failed to fetch instrument details via INDMoney MCP:", error.message || error);
    throw new Error(`INDMoney fetch details failed: ${error.message || error}`);
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}
