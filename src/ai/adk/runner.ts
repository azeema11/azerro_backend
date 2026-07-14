import { InMemoryRunner, isFinalResponse, stringifyContent, getFunctionCalls, getFunctionResponses, createEvent } from "@google/adk";
import { createUserContent, createModelContent } from "@google/genai";
import { financeAssistant } from "./assistants/finance.assistant";
import { investmentAssistant } from "./assistants/investment.assistant";
import { azerroAssistant } from "./assistants/azerro.assistant";
import { getRecentChatHistory, persistChatHistory } from "../services/chat.service";
import crypto from "crypto";

const APP_NAME = "azerro";
const HISTORY_LOAD_LIMIT = 20;

const ACTION_TOOL_NAMES = new Set([
  "create_transaction",
  "update_goal",
  "create_goal",
  "create_budget",
  "create_planned_event",
  "update_planned_event",
  "save_user_memory",
]);

// Map to track executed actions from sub-assistants during a parent run
const activeParentSessionActions = new Map<string, ExecutedAction[]>();

function trackToolCalls(
  event: any,
  pendingCalls: Map<string, { tool: string; args: Record<string, unknown> }>,
  executedActions: ExecutedAction[]
): void {
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

const azerroRunner = new InMemoryRunner({
  agent: azerroAssistant,
  appName: APP_NAME,
});

const financeRunner = new InMemoryRunner({
  agent: financeAssistant,
  appName: APP_NAME,
});

const investmentRunner = new InMemoryRunner({
  agent: investmentAssistant,
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
 * Runs the main parent assistant Azerro, which coordinates Friday and Jarvis.
 */
export async function runAssistant(
  userId: string,
  message: string,
  sessionId?: string
): Promise<AssistantResponse> {
  const sid = sessionId || `session_${userId}`;

  // Initialize tracking for sub-assistant actions for this session using a unique invocation ID
  const invocationId = `inv_${crypto.randomBytes(16).toString("hex")}`;
  activeParentSessionActions.set(invocationId, []);

  const collectedEvents: AssistantResponse["events"] = [];
  const executedActions: ExecutedAction[] = [];
  let finalText = "";

  const pendingCalls = new Map<string, { tool: string; args: Record<string, unknown> }>();

  try {
    let sessionExists = false;
    try {
      const existing = await azerroRunner.sessionService.getSession({
        appName: APP_NAME,
        userId,
        sessionId: sid,
      });
      sessionExists = !!existing;
    } catch {
      sessionExists = false;
    }

    if (!sessionExists) {
      const session = await azerroRunner.sessionService.createSession({
        appName: APP_NAME,
        userId,
        sessionId: sid,
        state: {
          "userId": userId,
          "sessionId": sid,
        },
      });

      await seedSessionFromDb(azerroRunner, session, userId, sid, azerroAssistant.name);
    }

    const userContent = createUserContent(message);

    for await (const event of azerroRunner.runAsync({
      userId,
      sessionId: sid,
      newMessage: userContent,
      stateDelta: {
        "invocationId": invocationId,
      },
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

      trackToolCalls(event, pendingCalls, executedActions);
    }
  } finally {
    // Retrieve and merge any actions executed by sub-assistants (Friday/Jarvis) during this run
    const subActions = activeParentSessionActions.get(invocationId) || [];
    activeParentSessionActions.delete(invocationId);
    executedActions.push(...subActions);
  }

  if (!finalText && collectedEvents.length > 0) {
    finalText = collectedEvents[collectedEvents.length - 1].text;
  }

  const allToolCalls = collectedEvents
    .filter((e) => e.author !== "user")
    .map((e) => e.text)
    .length > 0
    ? collectToolNames(pendingCalls, executedActions)
    : undefined;

  await persistChatHistory({
    userId,
    sessionId: sid,
    userMessage: message,
    aiResponse: finalText,
    toolCalls: allToolCalls,
    executedActions,
  }).catch((err) => console.error("Failed to persist chat:", err));

  return {
    success: true,
    message: finalText || "No response generated.",
    actions: executedActions,
    events: collectedEvents,
  };
}

/**
 * Runs the Friday (finance) sub-assistant in-memory.
 */
export async function runFriday(
  userId: string,
  message: string,
  sessionId: string,
  parentInvocationId?: string
): Promise<AssistantResponse> {
  return runSubAssistant(userId, message, sessionId, "finance", parentInvocationId);
}

/**
 * Runs the Jarvis (investment) sub-assistant in-memory.
 */
export async function runJarvis(
  userId: string,
  message: string,
  sessionId: string,
  parentInvocationId?: string
): Promise<AssistantResponse> {
  return runSubAssistant(userId, message, sessionId, "investment", parentInvocationId);
}

/**
 * Helper to run a sub-assistant in-memory without persisting to the database.
 */
async function runSubAssistant(
  userId: string,
  message: string,
  sessionId: string,
  type: "finance" | "investment",
  parentInvocationId?: string
): Promise<AssistantResponse> {
  const activeRunner = type === "investment" ? investmentRunner : financeRunner;
  const activeAssistant = type === "investment" ? investmentAssistant : financeAssistant;

  let sessionExists = false;
  try {
    const existing = await activeRunner.sessionService.getSession({
      appName: APP_NAME,
      userId,
      sessionId,
    });
    sessionExists = !!existing;
  } catch {
    sessionExists = false;
  }

  if (!sessionExists) {
    await activeRunner.sessionService.createSession({
      appName: APP_NAME,
      userId,
      sessionId,
      state: {
        "userId": userId,
        "sessionId": sessionId,
      },
    });
  }

  const userContent = createUserContent(message);
  const collectedEvents: AssistantResponse["events"] = [];
  const executedActions: ExecutedAction[] = [];
  let finalText = "";

  const pendingCalls = new Map<string, { tool: string; args: Record<string, unknown> }>();

  for await (const event of activeRunner.runAsync({
    userId,
    sessionId,
    newMessage: userContent,
  })) {
    const text = stringifyContent(event);
    const final = isFinalResponse(event);

    if (text) {
      collectedEvents.push({
        author: event.author || activeAssistant.name,
        text,
        isFinal: final,
      });

      if (final) {
        finalText = text;
      }
    }

    trackToolCalls(event, pendingCalls, executedActions);
  }

  if (!finalText && collectedEvents.length > 0) {
    finalText = collectedEvents[collectedEvents.length - 1].text;
  }

  // Push executed actions to parent session so they can be bubbled up
  const parentActions = activeParentSessionActions.get(parentInvocationId || sessionId);
  if (parentActions) {
    parentActions.push(...executedActions);
  }

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
async function seedSessionFromDb(
  runner: any,
  session: any,
  userId: string,
  sessionId: string,
  assistantName: string
): Promise<void> {
  try {
    const recentMessages = await getRecentChatHistory(userId, sessionId, HISTORY_LOAD_LIMIT);

    if (recentMessages.length === 0) return;

    const chronological = [...recentMessages].reverse();

    for (const msg of chronological) {
      const content =
        msg.role === "user" ? createUserContent(msg.content) : createModelContent(msg.content);

      const event = createEvent({
        author: msg.role === "user" ? "user" : assistantName,
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

export { azerroRunner, financeRunner, investmentRunner, APP_NAME };
