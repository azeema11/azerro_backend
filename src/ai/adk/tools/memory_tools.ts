import { FunctionTool } from "@google/adk";
import { getMemories, saveMemory } from "../../services/user_memory.service";
import { UserMemory } from "@prisma/client";
import { getUserMemorySchema, saveUserMemorySchema } from "../../validations/memory_tool.schema";
import { getUserId, withToolErrorHandling } from "../../utils/adk_context";

export const getUserMemoryTool = new FunctionTool({
  name: "get_user_memory",
  description:
    "Fetches the user's stored personal preferences, risk profile, sector preferences, wishlists, or favourites. " +
    "Use this to personalize investment recommendations based on their specific rules (e.g. Max P/E, preferred sectors, etc.).",
  parameters: getUserMemorySchema,
  execute: withToolErrorHandling(async (input, ctx) => {
    const userId = getUserId(ctx);
    const memories = await getMemories(userId, input.category);
    return {
      memories: memories.map((m: UserMemory) => ({
        category: m.category,
        key: m.key,
        value: m.value,
        description: m.description,
        updatedAt: m.updatedAt,
      })),
    };
  }, "Failed to retrieve user memory. Please try again later."),
});

export const saveUserMemoryTool = new FunctionTool({
  name: "save_user_memory",
  description:
    "Saves or updates a user's personal preference, risk profile metric, sector preference, wishlist, or favourite. " +
    "Use this when the user explicitly tells you a preference or asks you to add something to their wishlist or favourites.",
  parameters: saveUserMemorySchema,
  execute: withToolErrorHandling(async (input, ctx) => {
    const userId = getUserId(ctx);
    const result = await saveMemory(userId, input);
    return {
      success: true,
      message: `Successfully saved memory for ${input.category}:${input.key}`,
      data: {
        category: result.category,
        key: result.key,
        value: result.value,
      },
    };
  }, "Failed to save user memory. Please try again later."),
});

export const memoryTools = [
  getUserMemoryTool,
  saveUserMemoryTool,
];
