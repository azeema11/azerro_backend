import { FunctionTool } from "@google/adk";
import { searchInstrument, getInstrumentDetails } from "../../services/indmoney_mcp.service";
import { searchMarketInstrumentSchema, getMarketInstrumentDetailsSchema } from "../../validations/market_tool.schema";
import { getUserId, withToolErrorHandling } from "../../utils/adk_context";

export const searchMarketInstrumentTool = new FunctionTool({
  name: "search_market_instrument",
  description:
    "Searches for a stock, mutual fund, or index by name or symbol to find its ticker symbol. " +
    "Use this before fetching details or analyzing an instrument the user mentions but does not own.",
  parameters: searchMarketInstrumentSchema,
  execute: withToolErrorHandling(async (input, ctx) => {
    const userId = getUserId(ctx);
    return await searchInstrument(userId, input.query);
  }, "An error occurred while searching for the instrument. Please try again later."),
});

export const getMarketInstrumentDetailsTool = new FunctionTool({
  name: "get_market_instrument_details",
  description:
    "Fetches live price, valuation metrics (P/E, PEG), analyst consensus, target prices, and recent news for a specific stock or mutual fund. " +
    "Use this to evaluate whether a stock is a good addition to the user's portfolio based on their preferences.",
  parameters: getMarketInstrumentDetailsSchema,
  execute: withToolErrorHandling(async (input, ctx) => {
    const userId = getUserId(ctx);
    return await getInstrumentDetails(userId, input.symbol);
  }, "An error occurred while fetching the instrument details. Please try again later."),
});

export const marketTools = [
  searchMarketInstrumentTool,
  getMarketInstrumentDetailsTool,
];
