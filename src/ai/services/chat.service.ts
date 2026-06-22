import prisma from "../../utils/db";

export interface PersistChatHistoryData {
    userId: string;
    sessionId: string;
    userMessage: string;
    aiResponse: string;
    toolCalls?: string[];
    executedActions?: any[];
}

/**
 * Fetches recent chat messages for a user and session from the database.
 * Falls back to general assistant messages if no session-specific messages are found.
 */
export async function getRecentChatHistory(userId: string, sessionId: string, limit: number) {
    let recentMessages = await prisma.chatMessage.findMany({
        where: { userId, sessionId },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    if (recentMessages.length === 0) {
        recentMessages = await prisma.chatMessage.findMany({
            where: { userId, intent: "assistant" },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }

    return recentMessages;
}

/**
 * Persists both the user's message and the AI's response in a single transaction.
 */
export async function persistChatHistory(data: PersistChatHistoryData): Promise<void> {
    const { userId, sessionId, userMessage, aiResponse, toolCalls, executedActions } = data;
    if (!aiResponse) return;

    await prisma.$transaction([
        prisma.chatMessage.create({
            data: {
                userId,
                role: "user",
                content: userMessage,
                intent: "assistant",
                sessionId,
            },
        }),
        prisma.chatMessage.create({
            data: {
                userId,
                role: "ai",
                content: aiResponse.substring(0, 10000),
                intent: "assistant",
                sessionId,
                toolCalls: toolCalls ? JSON.parse(JSON.stringify(toolCalls)) : undefined,
                actions: executedActions && executedActions.length > 0
                    ? JSON.parse(JSON.stringify(executedActions))
                    : undefined,
            },
        }),
    ]);
}
