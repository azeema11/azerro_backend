import { FunctionTool, Context } from "@google/adk";
import { runFriday, runJarvis } from "../runner";
import { askFridaySchema, askJarvisSchema } from "../../validations/coordinator_tool.schema";

export const askFridayTool = new FunctionTool({
  name: "ask_friday",
  description:
    "Delegates personal finance, transaction, budget, goal, planned event, or reporting queries to Friday. " +
    "Use this for any questions about spending, budgets, goals, bank accounts, or financial reports.",
  parameters: askFridaySchema,
  execute: async (input, ctx) => {
    const userId = ctx?.state.get<string>("userId");
    const sessionId = ctx?.state.get<string>("sessionId");
    const invocationId = ctx?.state.get<string>("invocationId");
    if (!userId || !sessionId) {
      throw new Error("userId or sessionId not found in session state");
    }
    const result = await runFriday(userId, input.message, sessionId, invocationId);
    return { response: result.message };
  },
});

export const askJarvisTool = new FunctionTool({
  name: "ask_jarvis",
  description:
    "Delegates investment advice, stock/fund research, wishlist, favourites, or portfolio analysis queries to Jarvis. " +
    "Use this for any questions about stock/mutual fund analysis, investment preferences, wishlists, or portfolio holdings.",
  parameters: askJarvisSchema,
  execute: async (input, ctx) => {
    const userId = ctx?.state.get<string>("userId");
    const sessionId = ctx?.state.get<string>("sessionId");
    const invocationId = ctx?.state.get<string>("invocationId");
    if (!userId || !sessionId) {
      throw new Error("userId or sessionId not found in session state");
    }
    const result = await runJarvis(userId, input.message, sessionId, invocationId);
    return { response: result.message };
  },
});

export const coordinatorTools = [
  askFridayTool,
  askJarvisTool,
];
