import { InMemoryRunner, isFinalResponse, stringifyContent, getFunctionCalls, getFunctionResponses, createEvent } from "@google/adk";
import { createUserContent, createModelContent } from "@google/genai";
import { financeAssistant } from "./assistants/finance.assistant";
import { getRecentChatHistory, persistChatHistory } from "../services/chat.service";

const APP_NAME = "azerro";
const HISTORY_LOAD_LIMIT = 20;

const ACTION_TOOL_NAMES = new Set(["create_transaction", "update_goal", "create_goal", "create_budget", "create_planned_event", "update_planned_event"]);

const runner = new InMemoryRunner({
    agent: financeAssistant,
    appName: APP_NAME,
});

export interface ExecutedAction {
    tool: string;
    args: Record<string, unknown>;
    result: unknown;
}

export interface AssistantResponse {
    success: boolean;
    message: string;
    actions: ExecutedAction[];
    events: Array<{
        author: string;
        text: string;
        isFinal: boolean;
    }>;
}

/**
 * Runs the unified assistant for a given user and message, returning the
 * final text response. Persists the conversation to the chatMessage table
 * and tracks any write actions executed by the assistant.
 *
 * When a session doesn't exist (e.g. after server restart), recent chat
 * history is loaded from PostgreSQL and injected into the new session so
 * the assistant retains conversational context.
 */
export async function runAssistant(
    userId: string,
    message: string,
    sessionId?: string
): Promise<AssistantResponse> {
    const sid = sessionId || `session_${userId}`;

    let sessionExists = false;
    try {
        const existing = await runner.sessionService.getSession({
            appName: APP_NAME,
            userId,
            sessionId: sid,
        });
        sessionExists = !!existing;
    } catch {
        sessionExists = false;
    }

    if (!sessionExists) {
        const session = await runner.sessionService.createSession({
            appName: APP_NAME,
            userId,
            sessionId: sid,
            state: { "temp:userId": userId },
        });

        await seedSessionFromDb(session, userId, sid);
    }

    const userContent = createUserContent(message);
    const collectedEvents: AssistantResponse["events"] = [];
    const executedActions: ExecutedAction[] = [];
    let finalText = "";

    const pendingCalls = new Map<string, { tool: string; args: Record<string, unknown> }>();

    for await (const event of runner.runAsync({
        userId,
        sessionId: sid,
        newMessage: userContent,
    })) {
        const text = stringifyContent(event);
        const final = isFinalResponse(event);

        if (text) {
            collectedEvents.push({
                author: event.author || "assistant",
                text,
                isFinal: final,
            });

            if (final) {
                finalText = text;
            }
        }

        for (const fc of getFunctionCalls(event)) {
            if (fc.name && ACTION_TOOL_NAMES.has(fc.name)) {
                pendingCalls.set(fc.id || fc.name, {
                    tool: fc.name,
                    args: (fc.args as Record<string, unknown>) || {},
                });
            }
        }

        for (const fr of getFunctionResponses(event)) {
            const pending = pendingCalls.get(fr.id || fr.name || "");
            if (pending) {
                executedActions.push({
                    ...pending,
                    result: fr.response,
                });
                pendingCalls.delete(fr.id || fr.name || "");
            }
        }
    }

    if (!finalText && collectedEvents.length > 0) {
        finalText = collectedEvents[collectedEvents.length - 1].text;
    }

    const allToolCalls = collectedEvents
        .filter(e => e.author !== "user")
        .map(e => e.text)
        .length > 0 ? collectToolNames(pendingCalls, executedActions) : undefined;

    await persistChatHistory({
        userId,
        sessionId: sid,
        userMessage: message,
        aiResponse: finalText,
        toolCalls: allToolCalls,
        executedActions,
    }).catch((err) =>
        console.error("Failed to persist chat:", err)
    );

    return {
        success: true,
        message: finalText || "No response generated.",
        actions: executedActions,
        events: collectedEvents,
    };
}

/**
 * Loads recent chat messages from the database and appends them as events
 * to a freshly created ADK session. Filters by sessionId first, falling
 * back to the most recent assistant messages for this user.
 */
async function seedSessionFromDb(session: any, userId: string, sessionId: string): Promise<void> {
    try {
        const recentMessages = await getRecentChatHistory(userId, sessionId, HISTORY_LOAD_LIMIT);

        if (recentMessages.length === 0) return;

        const chronological = [...recentMessages].reverse();

        for (const msg of chronological) {
            const content = msg.role === "user"
                ? createUserContent(msg.content)
                : createModelContent(msg.content);

            const event = createEvent({
                author: msg.role === "user" ? "user" : financeAssistant.name,
                content,
            });

            await runner.sessionService.appendEvent({ session, event });
        }
    } catch (err) {
        console.error("Failed to seed session from DB:", err);
    }
}

function collectToolNames(
    pending: Map<string, { tool: string }>,
    executed: ExecutedAction[]
): string[] {
    const names = new Set<string>();
    for (const [, v] of pending) names.add(v.tool);
    for (const a of executed) names.add(a.tool);
    return [...names];
}

export { runner, APP_NAME };
