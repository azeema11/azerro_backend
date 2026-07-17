import { FunctionTool, Context } from "@google/adk";
import { getMemories, saveMemory } from "../../services/user_memory.service";
import { UserMemory } from "@prisma/client";
import { getUserMemorySchema, saveUserMemorySchema } from "../../validations/memory_tool.schema";

function getUserId(ctx?: Context): string {
  const userId = ctx?.state.get<string>("userId");
  if (!userId) throw new Error("userId not found in session state");
  return userId;
}

export const getUserMemoryTool = new FunctionTool({
  name: "get_user_memory",
  description:
    "Fetches the user's stored personal preferences, risk profile, sector preferences, wishlists, or favourites. " +
    "Use this to personalize investment recommendations based on their specific rules (e.g. Max P/E, preferred sectors, etc.).",
  parameters: getUserMemorySchema,
  execute: async (input, ctx) => {
    const userId = getUserId(ctx);
    try {
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
    } catch (err: any) {
      console.error("Error in get_user_memory tool:", err);
      return { memories: [], error: "Failed to retrieve user memory. Please try again later." };
    }
  },
});

export const saveUserMemoryTool = new FunctionTool({
  name: "save_user_memory",
  description:
    "Saves or updates a user's personal preference, risk profile metric, sector preference, wishlist, or favourite. " +
    "Use this when the user explicitly tells you a preference or asks you to add something to their wishlist or favourites.",
  parameters: saveUserMemorySchema,
  execute: async (input, ctx) => {
    const userId = getUserId(ctx);
    try {
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
    } catch (err: any) {
      console.error("Error in save_user_memory tool:", err);
      return { error: err.message || "Failed to save user memory. Please try again later." };
    }
  },
});

export const memoryTools = [
  getUserMemoryTool,
  saveUserMemoryTool,
];
