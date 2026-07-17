import { z } from "zod";

export const searchMarketInstrumentSchema = z.object({
    query: z.string().describe("The search query (e.g., 'Microsoft', 'Reliance', 'TCS')"),
});

export const getMarketInstrumentDetailsSchema = z.object({
    symbol: z.string().describe("The ticker symbol of the instrument (e.g., 'MSFT', 'RELIANCE', 'TCS')"),
});
