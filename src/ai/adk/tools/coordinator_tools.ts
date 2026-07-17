import { FunctionTool } from "@google/adk";
import { runFriday, runJarvis } from "../runner";
import { askFridaySchema, askJarvisSchema } from "../../validations/coordinator_tool.schema";
import { getSessionContext, withToolErrorHandling } from "../../utils/adk_context";

export const askFridayTool = new FunctionTool({
  name: "ask_friday",
  description:
    "Delegates personal finance, transaction, budget, goal, planned event, or reporting queries to Friday. " +
    "Use this for any questions about spending, budgets, goals, bank accounts, or financial reports.",
  parameters: askFridaySchema,
  execute: withToolErrorHandling(async (input, ctx) => {
    const { userId, sessionId, invocationId } = getSessionContext(ctx);
    const result = await runFriday(userId, input.message, sessionId, invocationId);
    return { response: result.message };
  }, "Failed to process request with Friday"),
});

export const askJarvisTool = new FunctionTool({
  name: "ask_jarvis",
  description:
    "Delegates investment advice, stock/fund research, wishlist, favourites, or portfolio analysis queries to Jarvis. " +
    "Use this for any questions about stock/mutual fund analysis, investment preferences, wishlists, or portfolio holdings.",
  parameters: askJarvisSchema,
  execute: withToolErrorHandling(async (input, ctx) => {
    const { userId, sessionId, invocationId } = getSessionContext(ctx);
    const result = await runJarvis(userId, input.message, sessionId, invocationId);
    return { response: result.message };
  }, "Failed to process request with Jarvis"),
});

export const coordinatorTools = [
  askFridayTool,
  askJarvisTool,
];
