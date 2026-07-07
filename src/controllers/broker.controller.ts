import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async_handler";
import { getBrokerService } from "../services/brokers/factory";
import { searchInstrument, getInstrumentDetails as getInstrumentDetailsMcp } from "../ai/services/indmoney_mcp.service";
import { getMemories as getMemoriesService, saveMemory as saveMemoryService, deleteMemory as deleteMemoryService } from "../ai/services/user_memory.service";
import { handleIndmoneyCallback } from "../services/brokers/indmoney.service";

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Handles the OAuth 2.1 callback from INDMoney.
 * GET /brokers/indmoney/callback
 */
export const indmoneyCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== "string" || !state || typeof state !== "string") {
    res.setHeader("Content-Type", "text/html");
    return res.status(400).send(`
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 50px; background-color: #f9fafb; color: #111827; }
            .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: inline-block; max-width: 400px; }
            h1 { color: #EF4444; margin-bottom: 10px; }
            p { color: #4B5563; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Connection Failed</h1>
            <p>Missing authorization code or state parameter.</p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    await handleIndmoneyCallback(code, state);

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(`
      <html>
        <head>
          <title>Connection Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 50px; background-color: #f9fafb; color: #111827; }
            .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: inline-block; max-width: 400px; }
            h1 { color: #10B981; margin-bottom: 10px; }
            p { color: #4B5563; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Connection Successful!</h1>
            <p>Your INDMoney portfolio has been successfully connected to Azerro.</p>
            <p>You can close this browser window and return to the app.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    const rawMessage = error.message || "An error occurred during token exchange.";
    const sanitizedMessage = escapeHtml(rawMessage);
    res.setHeader("Content-Type", "text/html");
    return res.status(500).send(`
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 50px; background-color: #f9fafb; color: #111827; }
            .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: inline-block; max-width: 400px; }
            h1 { color: #EF4444; margin-bottom: 10px; }
            p { color: #4B5563; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Connection Failed</h1>
            <p>${sanitizedMessage}</p>
          </div>
        </body>
      </html>
    `);
  }
});

/**
 * Connects a broker service.
 * POST /brokers/:broker/connect
 */
export const connectBroker = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { broker } = req.params;
  const userId = req.userId!;

  const service = getBrokerService(broker);
  const result = await service.connect(userId, req.body);

  return res.status(200).json({
    success: true,
    message: `Successfully connected to ${broker}`,
    ...result,
  });
});

/**
 * Gets the connection status of a broker.
 * GET /brokers/:broker/status
 */
export const getBrokerStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { broker } = req.params;
  const userId = req.userId!;

  const service = getBrokerService(broker);
  const result = await service.getStatus(userId);

  return res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * Syncs holdings from a broker.
 * POST /brokers/:broker/sync
 */
export const syncBrokerHoldings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { broker } = req.params;
  const userId = req.userId!;

  const service = getBrokerService(broker);
  const result = await service.syncHoldings(userId);

  return res.status(200).json({
    success: true,
    message: `Successfully synced holdings from ${broker}`,
    ...result,
  });
});

/**
 * Disconnects a broker.
 * POST /brokers/:broker/disconnect
 */
export const disconnectBroker = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { broker } = req.params;
  const userId = req.userId!;

  const service = getBrokerService(broker);
  await service.disconnect(userId);

  return res.status(200).json({
    success: true,
    message: `Successfully disconnected from ${broker}`,
  });
});

/**
 * Searches for market instruments using INDMoney MCP service.
 * GET /brokers/:broker/search
 */
export const searchMarketInstrument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { broker } = req.params;
  const { query } = req.query;
  const userId = req.userId!;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ success: false, error: "Query parameter is required" });
  }

  if (broker.toLowerCase() !== "indmoney") {
    return res.status(400).json({ success: false, error: `Broker ${broker} does not support search` });
  }

  const result = await searchInstrument(userId, query);
  return res.status(200).json({
    success: true,
    results: result,
  });
});

/**
 * Gets detailed fundamentals and live data for a specific symbol.
 * GET /brokers/:broker/instrument/:symbol
 */
export const getInstrumentDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { broker, symbol } = req.params;
  const userId = req.userId!;

  if (broker.toLowerCase() !== "indmoney") {
    return res.status(400).json({ success: false, error: `Broker ${broker} does not support fetching instrument details` });
  }

  const result = await getInstrumentDetailsMcp(userId, symbol);
  return res.status(200).json({
    success: true,
    details: result,
  });
});

/**
 * Gets all user memories / preferences.
 * GET /brokers/memory
 */
export const getMemories = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { category } = req.query;

  const result = await getMemoriesService(userId, category as string);
  return res.status(200).json({
    success: true,
    memories: result,
  });
});

/**
 * Saves or updates a user memory / preference.
 * POST /brokers/memory
 */
export const saveMemory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { category, key, value, description } = req.body;

  if (!category || !key || value === undefined) {
    return res.status(400).json({ success: false, error: "category, key, and value are required" });
  }

  const result = await saveMemoryService(userId, { category, key, value, description });
  return res.status(200).json({
    success: true,
    message: "Memory saved successfully",
    memory: result,
  });
});

/**
 * Deletes a specific memory.
 * DELETE /brokers/memory/:category/:key
 */
export const deleteMemory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { category, key } = req.params;

  await deleteMemoryService(userId, category, key);
  return res.status(200).json({
    success: true,
    message: "Memory deleted successfully",
  });
});
