import prisma from "../../utils/db";
import { DomainError } from "../../utils/prisma_errors";

export interface SaveMemoryInput {
  category: string;
  key: string;
  value: any;
  description?: string;
}

/**
 * Fetches all memory records for a given user.
 */
export async function getMemories(userId: string, category?: string) {
  const where: any = { userId };
  if (category) {
    where.category = category;
  }
  return prisma.userMemory.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Fetches a specific memory record by category and key.
 */
export async function getMemory(userId: string, category: string, key: string) {
  return prisma.userMemory.findUnique({
    where: {
      userId_category_key: {
        userId,
        category,
        key,
      },
    },
  });
}

/**
 * Saves or updates a memory record.
 */
export async function saveMemory(userId: string, input: SaveMemoryInput) {
  const { category, key, value, description } = input;

  if (category.length > 50) {
    throw new DomainError("Category exceeds maximum length of 50 characters.", 400, "UserMemory");
  }
  if (key.length > 100) {
    throw new DomainError("Key exceeds maximum length of 100 characters.", 400, "UserMemory");
  }
  if (description && description.length > 500) {
    throw new DomainError("Description exceeds maximum length of 500 characters.", 400, "UserMemory");
  }

  return prisma.userMemory.upsert({
    where: {
      userId_category_key: {
        userId,
        category,
        key,
      },
    },
    update: {
      value,
      description,
    },
    create: {
      userId,
      category,
      key,
      value,
      description,
    },
  });
}

/**
 * Deletes a specific memory record.
 */
export async function deleteMemory(userId: string, category: string, key: string) {
  return prisma.userMemory.delete({
    where: {
      userId_category_key: {
        userId,
        category,
        key,
      },
    },
  });
}
