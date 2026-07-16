import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { IBrokerService } from "./types";
import prisma from "../../utils/db";
import { AssetType } from "@prisma/client";
import { convertCurrencyFromDB } from "../../utils/currency";
import { DomainError } from "../../utils/prisma_errors";
import crypto from "crypto";
import { safeGet, safeSetex } from "../../utils/redis";

/**
 * Helper to cache INDMoney access token in Redis with a 5-minute buffer.
 */
export async function cacheAccessToken(userId: string, accessToken: string, expiresInSeconds: number): Promise<void> {
  const bufferSeconds = 5 * 60;
  if (expiresInSeconds > bufferSeconds) {
    const ttlSeconds = expiresInSeconds - bufferSeconds;
    await safeSetex(`indmoney:token:${userId}`, ttlSeconds, accessToken);
  }
}

const mcpUrl = process.env.INDMONEY_MCP_URL || "https://mcp.indmoney.com/mcp";

const INDMONEY_AUTH_URL = process.env.INDMONEY_AUTH_URL;
const INDMONEY_TOKEN_URL = process.env.INDMONEY_TOKEN_URL;
const CLIENT_ID = process.env.INDMONEY_CLIENT_ID;
const CLIENT_SECRET = process.env.INDMONEY_CLIENT_SECRET;

function validateCredentials() {
  if (!CLIENT_ID || !CLIENT_SECRET || !INDMONEY_AUTH_URL || !INDMONEY_TOKEN_URL) {
    throw new DomainError(
      "INDMoney credentials or URLs are not fully configured in environment variables.",
      500,
      "BrokerConnection"
    );
  }
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("hex"); // 64 chars
}

function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest()
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Checks connection status of INDMoney broker.
 */
async function getStatus(userId: string) {
  const memory = await prisma.userMemory.findUnique({
    where: {
      userId_category_key: {
        userId,
        category: "broker_connection",
        key: "indmoney",
      },
    },
  });

  if (!memory || !(memory.value as any).connected) {
    return { connected: false };
  }

  const val = memory.value as any;
  return {
    connected: true,
    lastSyncedAt: val.lastSyncedAt ? new Date(val.lastSyncedAt) : undefined,
    metadata: {
      mode: val.mode,
      connectedAt: val.connectedAt,
    },
  };
}

/**
 * Connects a broker service.
 */
async function connect(userId: string, data?: any) {
  // Support direct token connections (e.g., mock or manual token input)
  if (data?.token) {
    const token = data.token;
    if (typeof token !== "string") {
      throw new DomainError("Invalid token format. Token must be a string.", 400, "BrokerConnection");
    }

    const isMock = token.startsWith("mock");

    // Restrict direct-token path to non-production use only
    if (process.env.NODE_ENV === "production") {
      throw new DomainError(
        "Direct token connection is not allowed in production. Please use the OAuth flow.",
        403,
        "BrokerConnection"
      );
    }

    if (!isMock) {
      // Validate the real token against INDMoney before writing userMemory or returning connected
      const client = new Client({ name: "indmoney-validator", version: "1.0.0" }, { capabilities: {} });
      try {
        const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
          requestInit: { headers: { Authorization: `Bearer ${token}` } },
        });
        await client.connect(transport);
        await client.listTools();
      } catch (error: any) {
        throw new DomainError(
          `Token validation failed: ${error.message || error}`,
          401,
          "BrokerConnection"
        );
      } finally {
        await client.close().catch(() => { });
      }
    }

    await prisma.userMemory.upsert({
      where: {
        userId_category_key: {
          userId,
          category: "broker_connection",
          key: "indmoney",
        },
      },
      update: {
        value: {
          connected: true,
          accessToken: token,
          connectedAt: new Date().toISOString(),
          lastSyncedAt: null,
          mode: isMock ? "mock" : "real",
        },
        description: "INDMoney broker connection details",
      },
      create: {
        userId,
        category: "broker_connection",
        key: "indmoney",
        value: {
          connected: true,
          accessToken: token,
          connectedAt: new Date().toISOString(),
          lastSyncedAt: null,
          mode: isMock ? "mock" : "real",
        },
        description: "INDMoney broker connection details",
      },
    });

    return {
      status: "connected",
      mode: isMock ? "mock" : "real",
    };
  }

  // Otherwise, initiate the full OAuth 2.1 with PKCE flow
  validateCredentials();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString("hex");

  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new DomainError(
      "API_BASE_URL environment variable is not configured.",
      500,
      "BrokerConnection"
    );
  }
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/brokers/indmoney/callback`;

  // Cleanup expired PKCE states for this user
  try {
    const oldPkceRecords = await prisma.userMemory.findMany({
      where: {
        userId,
        category: "broker_connection_temp",
        key: { startsWith: "pkce_" },
      },
    });
    for (const record of oldPkceRecords) {
      const val = record.value as any;
      if (val && val.expiresAt && new Date(val.expiresAt) < new Date()) {
        await prisma.userMemory.delete({ where: { id: record.id } }).catch(() => { });
      }
    }
  } catch (err) {
    console.error("Failed to cleanup expired PKCE states:", err);
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

  // Save the temporary PKCE state in UserMemory (mapped to state)
  // Since we need to query this during callback without userId, we use key: `pkce_${state}`
  await prisma.userMemory.upsert({
    where: {
      userId_category_key: {
        userId,
        category: "broker_connection_temp",
        key: `pkce_${state}`,
      },
    },
    update: {
      value: {
        codeVerifier,
        state,
        userId,
        redirectUri,
        expiresAt,
      },
      description: "Temporary INDMoney PKCE state",
    },
    create: {
      userId,
      category: "broker_connection_temp",
      key: `pkce_${state}`,
      value: {
        codeVerifier,
        state,
        userId,
        redirectUri,
        expiresAt,
      },
      description: "Temporary INDMoney PKCE state",
    },
  });

  const authUrl = `${INDMONEY_AUTH_URL!}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}&scope=${encodeURIComponent("portfolio:read market:read")}`;

  return {
    status: "redirecting",
    redirectUrl: authUrl,
  };
}

/**
 * Handles the OAuth 2.1 callback and exchanges code for access and refresh tokens.
 */
export async function handleIndmoneyCallback(code: string, state: string) {
  validateCredentials();
  // Find the temporary PKCE record
  const tempMemory = await prisma.userMemory.findFirst({
    where: {
      category: "broker_connection_temp",
      key: `pkce_${state}`,
    },
  });

  if (!tempMemory) {
    throw new DomainError(
      "Invalid state or session expired. Please try connecting again.",
      400,
      "BrokerConnection"
    );
  }

  const { codeVerifier, userId, redirectUri: savedRedirectUri, expiresAt } = tempMemory.value as any;

  if (expiresAt && new Date(expiresAt) < new Date()) {
    // Delete expired PKCE record
    await prisma.userMemory.delete({
      where: { id: tempMemory.id },
    }).catch(() => { });

    throw new DomainError(
      "Connection session expired. Please try connecting again.",
      400,
      "BrokerConnection"
    );
  }

  const redirectUri = savedRedirectUri || `${process.env.API_BASE_URL}/brokers/indmoney/callback`;

  try {
    // Exchange auth code for tokens
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("client_id", CLIENT_ID!);
    params.append("client_secret", CLIENT_SECRET!);
    params.append("code_verifier", codeVerifier);

    const response = await fetch(INDMONEY_TOKEN_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed with status ${response.status}: ${errorText}`);
    }

    const responseData = await response.json() as any;
    const { access_token, refresh_token, expires_in } = responseData;

    // Save connection state in UserMemory
    await prisma.userMemory.upsert({
      where: {
        userId_category_key: {
          userId,
          category: "broker_connection",
          key: "indmoney",
        },
      },
      update: {
        value: {
          connected: true,
          accessToken: access_token,
          refreshToken: refresh_token || null,
          expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
          connectedAt: new Date().toISOString(),
          lastSyncedAt: null,
          mode: "real",
        },
        description: "INDMoney broker connection details",
      },
      create: {
        userId,
        category: "broker_connection",
        key: "indmoney",
        value: {
          connected: true,
          accessToken: access_token,
          refreshToken: refresh_token || null,
          expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
          connectedAt: new Date().toISOString(),
          lastSyncedAt: null,
          mode: "real",
        },
        description: "INDMoney broker connection details",
      },
    });

    // Cache the new token in Redis using helper
    if (expires_in) {
      await cacheAccessToken(userId, access_token, expires_in);
    }

    // Delete the temporary PKCE record
    await prisma.userMemory.delete({
      where: { id: tempMemory.id },
    });

    return { success: true, userId };
  } catch (error: any) {
    // Delete the temporary PKCE record on failure to prevent leaks
    await prisma.userMemory.delete({
      where: { id: tempMemory.id },
    }).catch(() => { });

    console.error("Failed to exchange INDMoney auth code:", error.response?.data || error.message || error);
    throw new DomainError(
      `INDMoney token exchange failed: ${error.response?.data?.error_description || error.message || error}`,
      500,
      "BrokerConnection",
      error
    );
  }
}

const activeRefreshes = new Map<string, Promise<string>>();

async function performRefresh(userId: string, memoryId: string, refreshToken: string, currentVal: any): Promise<string> {
  validateCredentials();
  try {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);
    params.append("client_id", CLIENT_ID!);
    params.append("client_secret", CLIENT_SECRET!);

    const response = await fetch(INDMONEY_TOKEN_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let isDefinitive = false;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error === "invalid_grant" || parsed.error === "invalid_client" || parsed.error === "unauthorized_client") {
          isDefinitive = true;
        }
      } catch (e) {
        // Not JSON
      }
      if (response.status >= 400 && response.status < 500) {
        isDefinitive = true;
      }

      const err = new Error(`Token refresh failed with status ${response.status}: ${errorText}`);
      (err as any).isDefinitive = isDefinitive;
      (err as any).status = response.status;
      throw err;
    }

    const responseData = await response.json() as any;
    const { access_token, refresh_token, expires_in } = responseData;
    const newExpiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

    await prisma.userMemory.update({
      where: { id: memoryId },
      data: {
        value: {
          ...currentVal,
          accessToken: access_token,
          refreshToken: refresh_token || currentVal.refreshToken,
          expiresAt: newExpiresAt,
        },
      },
    });

    // Cache the refreshed token in Redis using helper
    if (expires_in) {
      await cacheAccessToken(userId, access_token, expires_in);
    }

    return access_token;
  } catch (error: any) {
    console.error("Failed to refresh INDMoney token:", error.message || error);

    // Only set connected: false for definitive auth failures (4xx or explicit invalid_grant)
    const isDefinitive = error.isDefinitive || (error.status >= 400 && error.status < 500);

    if (isDefinitive) {
      await prisma.userMemory.update({
        where: { id: memoryId },
        data: {
          value: {
            ...currentVal,
            connected: false,
          },
        },
      });
    }

    throw new DomainError(
      isDefinitive
        ? "INDMoney session expired. Please reconnect your account."
        : "Failed to refresh INDMoney token due to a temporary network or server error. Please try again later.",
      401,
      "BrokerConnection",
      error
    );
  }
}

async function refreshAccessToken(userId: string, memoryId: string, refreshToken: string, currentVal: any): Promise<string> {
  let promise = activeRefreshes.get(userId);
  if (!promise) {
    promise = performRefresh(userId, memoryId, refreshToken, currentVal).finally(() => {
      activeRefreshes.delete(userId);
    });
    activeRefreshes.set(userId, promise);
  }
  return promise;
}

/**
 * Retrieves a valid access token for INDMoney, automatically refreshing it if expired.
 */
export async function getAccessToken(userId: string): Promise<string> {
  // 1. Try to fetch from Redis Cache first
  const cachedToken = await safeGet(`indmoney:token:${userId}`);
  if (cachedToken) {
    return cachedToken;
  }

  // 2. Cache miss: Fetch from Database
  const memory = await prisma.userMemory.findUnique({
    where: {
      userId_category_key: {
        userId,
        category: "broker_connection",
        key: "indmoney",
      },
    },
  });

  if (!memory) {
    throw new DomainError("INDMoney is not connected. Please connect first.", 401, "BrokerConnection");
  }

  const val = memory.value as any;
  if (!val.connected) {
    throw new DomainError("INDMoney is not connected. Please connect first.", 401, "BrokerConnection");
  }

  // If it's mock mode, return the access token directly
  if (val.mode === "mock") {
    return val.accessToken;
  }

  // Check if expired (with a 5-minute buffer)
  const expiresAt = val.expiresAt ? new Date(val.expiresAt) : null;
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

  let tokenToUse = val.accessToken;

  if (expiresAt && expiresAt.getTime() - Date.now() < bufferTime && val.refreshToken) {
    tokenToUse = await refreshAccessToken(userId, memory.id, val.refreshToken, val);
  } else {
    // If token is still valid, cache it in Redis for the remaining duration (using helper)
    const remainingTimeMs = expiresAt ? expiresAt.getTime() - Date.now() : 0;
    const expiresInSeconds = Math.floor(remainingTimeMs / 1000);
    await cacheAccessToken(userId, val.accessToken, expiresInSeconds);
  }

  return tokenToUse;
}

/**
 * Syncs holdings from a broker.
 */
async function syncHoldings(userId: string) {
  const status = await getStatus(userId);
  if (!status.connected) {
    throw new Error("INDMoney is not connected. Please connect first.");
  }

  const isMock = status.metadata?.mode === "mock";
  let rawHoldings: any[] = [];

  if (isMock) {
    // Return realistic mock holdings for testing
    rawHoldings = [
      {
        ticker: "RELIANCE",
        name: "Reliance Industries Ltd",
        assetType: "STOCK",
        quantity: 15,
        avgCost: 2450.50,
        holdingCurrency: "INR",
        lastPrice: 2520.00,
        platform: "INDMoney",
      },
      {
        ticker: "TCS",
        name: "Tata Consultancy Services Ltd",
        assetType: "STOCK",
        quantity: 8,
        avgCost: 3820.00,
        holdingCurrency: "INR",
        lastPrice: 3950.00,
        platform: "INDMoney",
      },
      {
        ticker: "MSFT",
        name: "Microsoft Corporation",
        assetType: "STOCK",
        quantity: 5,
        avgCost: 380.00, // USD
        holdingCurrency: "USD",
        lastPrice: 420.00,
        platform: "INDMoney",
      },
      {
        ticker: "PARAG_PARIKH_FLEXI",
        name: "Parag Parikh Flexi Cap Fund - Direct Growth",
        assetType: "STOCK", // Mutual funds are mapped to STOCK asset type in our schema or we can use STOCK
        quantity: 1250.45,
        avgCost: 45.20,
        holdingCurrency: "INR",
        lastPrice: 62.80,
        platform: "INDMoney",
      },
    ];
  } else {
    // Get a valid access token (automatically refreshed if needed)
    const token = await getAccessToken(userId);

    try {
      const client = new Client({
        name: "azerro-client",
        version: "1.0.0",
      }, {
        capabilities: {},
      });

      const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      await client.connect(transport);

      const { tools } = await client.listTools();

      const assetTypes: string[] = tools.filter((tool) => tool.name.startsWith("networth_holdings"))
        .map((tool) => (tool.inputSchema?.properties as Record<string, any>)?.asset_type)
        .map((assetType: any) => assetType?.enum).flat();

      for (const assetType of assetTypes) {
        try {
          const response = await client.callTool({
            name: "networth_holdings",
            arguments: { asset_type: assetType },
          });

          if (response && Array.isArray((response as any).content)) {
            const contentText = (response as any).content[0]?.text;
            if (contentText) {
              const parsed = JSON.parse(contentText);
              const holdings = parsed.holdings || [];
              for (const h of holdings) {
                rawHoldings.push({
                  ...h,
                  _assetTypeContext: assetType,
                });
              }
            }
          }
        } catch (err: any) {
          console.error(`Failed to fetch holdings for asset type ${assetType}:`, err.message || err);
        }
      }

      await client.close();
    } catch (error: any) {
      console.error("Failed to fetch real INDMoney holdings via MCP:", error.message || error);

      const errorMsg = error.message || String(error);
      const isAuthError = errorMsg.includes("invalid_token") ||
        errorMsg.includes("Authentication required") ||
        errorMsg.includes("unauthorized") ||
        errorMsg.includes("invalid token");

      if (isAuthError) {
        // Automatically mark as disconnected in UserMemory
        const memory = await prisma.userMemory.findUnique({
          where: {
            userId_category_key: {
              userId,
              category: "broker_connection",
              key: "indmoney",
            },
          },
        });
        if (memory) {
          await prisma.userMemory.update({
            where: { id: memory.id },
            data: {
              value: {
                ...(memory.value as any),
                connected: false,
                lastSyncedAt: null,
              },
            },
          });
        }

        throw new DomainError(
          "INDMoney authentication failed. Please reconnect your account.",
          401,
          "BrokerConnection",
          error
        );
      }

      throw new Error(`INDMoney sync failed: ${error.message || error}`);
    }
  }

  // Sync to PostgreSQL database
  const syncedHoldings: any[] = [];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  const baseCurrency = user?.baseCurrency || "INR";

  // Precompute and cache conversion rates for each unique holdingCurrency -> baseCurrency pair
  const uniqueCurrencies = Array.from(new Set(rawHoldings.map((h) => h.holdingCurrency ?? "INR")));
  const rateMap = new Map<string, number>();
  await Promise.all(
    uniqueCurrencies.map(async (currency) => {
      const rate = await convertCurrencyFromDB(1, currency, baseCurrency);
      rateMap.set(currency, rate);
    })
  );

  // Prepare all upsert data first
  const upsertDataList = rawHoldings.map((h) => {
    // Detect if it's a real holding from MCP or a mock holding
    const isReal = h.investment_code !== undefined;

    const ticker = isReal ? h.investment_code : h.ticker;
    const name = isReal ? h.investment : h.name;

    let assetType: AssetType = "STOCK";
    if (isReal) {
      if (h._assetTypeContext === "CRYPTO") {
        assetType = "CRYPTO";
      }
      if (h._assetTypeContext === "EPF") {
        assetType = "LIQUID";
      }
    } else {
      assetType = h.assetType as AssetType;
    }

    let quantity = isReal ? (h.total_units || 0) : h.quantity;
    let lastPrice = isReal ? (h.unit_price || 0) : h.lastPrice;

    // If it's real data from INDMoney, the raw amounts are already in INR.
    // We fall back to INR if h.holdingCurrency is not provided (which is the case for real holdings).
    const holdingCurrency = h.holdingCurrency ?? "INR";

    let avgCost = 0;

    // Lump-sum assets (e.g. EPF) arrive with quantity=0, unit_price=0, invested_amount=0
    // but have a valid market_value. Treat them as 1 unit worth the market_value.
    if (isReal && quantity === 0) {
      const marketValue = typeof h.market_value === "number" ? h.market_value : 0;
      if (marketValue > 0) {
        quantity = 1;
        lastPrice = marketValue;
        avgCost = marketValue;
      }
    }

    if (avgCost === 0) {
      if (isReal) {
        const investedAmount = typeof h.invested_amount === "number" ? h.invested_amount : 0;
        avgCost = quantity > 0 ? (investedAmount > 0 ? investedAmount / quantity : lastPrice) : 0;
      } else {
        avgCost = h.avgCost;
      }
    }

    // If the real lastPrice is 0 or not provided (common for crypto/alternate assets),
    // calculate it from market_value, or fall back to avgCost so it is never valued at 0.
    if (isReal && lastPrice === 0) {
      const marketValue = typeof h.market_value === "number" ? h.market_value : 0;
      if (marketValue > 0 && quantity > 0) {
        lastPrice = marketValue / quantity;
      } else {
        lastPrice = avgCost;
      }
    }

    let finalLastPrice = lastPrice;
    let finalAvgCost = avgCost;

    // Convert values to baseCurrency using precomputed rate
    const totalValueInHoldingCurrency = quantity * finalLastPrice;
    const rate = rateMap.get(holdingCurrency) ?? 1;
    const convertedValue = totalValueInHoldingCurrency * rate;

    return {
      ticker,
      assetType,
      name,
      quantity,
      finalAvgCost,
      holdingCurrency,
      finalLastPrice,
      convertedValue,
    };
  });

  // Aggregate entries that share the same ticker (e.g. multiple EPF accounts).
  // For normal holdings: sum quantities, weighted-average avgCost & lastPrice.
  // For lump-sum holdings (qty=1, avgCost===lastPrice): sum values, keep qty=1.
  const aggregated = new Map<string, typeof upsertDataList[number]>();
  for (const entry of upsertDataList) {
    const existing = aggregated.get(entry.ticker);
    if (!existing) {
      aggregated.set(entry.ticker, { ...entry });
      continue;
    }

    const isLumpSum = existing.quantity === 1 && existing.finalAvgCost === existing.finalLastPrice
      && entry.quantity === 1 && entry.finalAvgCost === entry.finalLastPrice;

    if (isLumpSum) {
      existing.finalAvgCost += entry.finalAvgCost;
      existing.finalLastPrice += entry.finalLastPrice;
      existing.convertedValue += entry.convertedValue;
    } else {
      const totalQty = existing.quantity + entry.quantity;
      if (totalQty > 0) {
        existing.finalAvgCost = (existing.finalAvgCost * existing.quantity + entry.finalAvgCost * entry.quantity) / totalQty;
        existing.finalLastPrice = (existing.finalLastPrice * existing.quantity + entry.finalLastPrice * entry.quantity) / totalQty;
      }
      existing.quantity = totalQty;
      existing.convertedValue += entry.convertedValue;
    }
  }
  const upsertDataListFinal = Array.from(aggregated.values());

  // Fetch existing holdings for this user on the "INDMoney" platform to identify deleted (sold) ones
  const existingHoldings = await prisma.holding.findMany({
    where: {
      userId,
      platform: "INDMoney",
    },
  });

  const syncedTickers = new Set(upsertDataListFinal.map((d) => d.ticker));
  const holdingsToDelete = existingHoldings.filter((h) => !syncedTickers.has(h.ticker));

  // Run database operations inside a Prisma transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete holdings that are no longer present in the sync
    if (holdingsToDelete.length > 0) {
      await tx.holding.deleteMany({
        where: {
          userId,
          id: { in: holdingsToDelete.map((h) => h.id) },
        },
      });
    }

    // 2. Upsert currently active holdings
    for (const data of upsertDataListFinal) {
      const holding = await tx.holding.upsert({
        where: {
          id_userId: {
            id: `${userId}_indmoney_${data.ticker}`,
            userId,
          },
        },
        update: {
          quantity: data.quantity,
          avgCost: data.finalAvgCost,
          holdingCurrency: data.holdingCurrency,
          lastPrice: data.finalLastPrice,
          convertedValue: data.convertedValue,
          name: data.name,
          assetType: data.assetType,
          platform: "INDMoney",
        },
        create: {
          id: `${userId}_indmoney_${data.ticker}`,
          userId,
          platform: "INDMoney",
          ticker: data.ticker,
          assetType: data.assetType,
          name: data.name,
          quantity: data.quantity,
          avgCost: data.finalAvgCost,
          holdingCurrency: data.holdingCurrency,
          lastPrice: data.finalLastPrice,
          convertedValue: data.convertedValue,
        },
      });
      syncedHoldings.push(holding);
    }

    // 3. Record snapshots of active holdings in HoldingHistory
    if (syncedHoldings.length > 0) {
      const activeSnapshots = syncedHoldings.map((h) => ({
        userId,
        holdingId: h.id,
        platform: h.platform,
        ticker: h.ticker,
        assetType: h.assetType,
        name: h.name,
        quantity: h.quantity,
        avgCost: h.avgCost,
        holdingCurrency: h.holdingCurrency,
        lastPrice: h.lastPrice,
        convertedValue: h.convertedValue,
      }));
      await tx.holdingHistory.createMany({
        data: activeSnapshots,
      });
    }

    // 4. Record snapshots with quantity 0 for deleted holdings in HoldingHistory
    if (holdingsToDelete.length > 0) {
      const deletedSnapshots = holdingsToDelete.map((h) => ({
        userId,
        holdingId: h.id,
        platform: h.platform,
        ticker: h.ticker,
        assetType: h.assetType,
        name: h.name,
        quantity: 0,
        avgCost: h.avgCost,
        holdingCurrency: h.holdingCurrency,
        lastPrice: h.lastPrice,
        convertedValue: 0,
      }));
      await tx.holdingHistory.createMany({
        data: deletedSnapshots,
      });
    }

    // Update lastSyncedAt in UserMemory inside the transaction
    const memory = await tx.userMemory.findUnique({
      where: {
        userId_category_key: {
          userId,
          category: "broker_connection",
          key: "indmoney",
        },
      },
    });

    if (memory) {
      await tx.userMemory.update({
        where: { id: memory.id },
        data: {
          value: {
            ...(memory.value as any),
            lastSyncedAt: new Date().toISOString(),
          },
        },
      });
    }
  }, { timeout: 30000 });

  return {
    syncedCount: syncedHoldings.length,
    holdings: syncedHoldings,
  };
}

/**
 * Disconnects a broker.
 */
async function disconnect(userId: string) {
  await prisma.userMemory.deleteMany({
    where: {
      userId,
      category: "broker_connection",
      key: "indmoney",
    },
  });
}

export const indmoneyService: IBrokerService = {
  connect,
  getStatus,
  syncHoldings,
  disconnect,
};
