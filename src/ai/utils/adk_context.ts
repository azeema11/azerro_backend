import { Context } from "@google/adk";

export function getUserId(ctx?: Context): string {
    const userId = ctx?.state.get<string>("userId");
    if (!userId) throw new Error("userId not found in session state");
    return userId;
}

export function getSessionContext(ctx?: Context): { userId: string; sessionId: string; invocationId?: string } {
    const userId = ctx?.state.get<string>("userId");
    const sessionId = ctx?.state.get<string>("sessionId");
    const invocationId = ctx?.state.get<string>("invocationId");
    if (!userId || !sessionId) {
        throw new Error("userId or sessionId not found in session state");
    }
    return { userId, sessionId, invocationId };
}

export function withToolErrorHandling<TInput, TResult>(
    fn: (input: TInput, ctx?: Context) => Promise<TResult>,
    fallbackMessage: string
): (input: TInput, ctx?: Context) => Promise<TResult | { error: string }> {
    return async (input, ctx) => {
        try {
            return await fn(input, ctx);
        } catch (err: any) {
            console.error(`Error in tool:`, err);
            return { error: fallbackMessage };
        }
    };
}
