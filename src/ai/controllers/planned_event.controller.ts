import { getPlannedEvents, createPlannedEvent, updatePlannedEvent } from "../services/planned_event.service";
import { withCache, safeDel } from "../../utils/redis";
import { toNumberSafe } from "../../utils/utils";

function validateDateString(value: string | undefined, label: string): void {
    if (value !== undefined && isNaN(Date.parse(value))) {
        throw new Error(`Invalid ${label} format: ${value}`);
    }
}

export async function handleGetPlannedEvents(userId: string, includeCompleted?: boolean) {
    const scope = includeCompleted ? "all" : "active";
    return withCache(`adk:events:${userId}:${scope}`, 180, async () => {
        const events = await getPlannedEvents(userId, includeCompleted);

        return events.map((e) => ({
            id: e.id,
            name: e.name,
            estimatedCost: toNumberSafe(e.estimatedCost),
            targetDate: e.targetDate.toISOString().split("T")[0],
            completed: e.completed,
            currency: e.currency,
            category: e.category,
        }));
    });
}

export async function handleCreatePlannedEvent(
    userId: string,
    input: {
        name: string;
        estimatedCost: number;
        targetDate: string;
        category: string;
        recurrence?: string;
        currency?: string;
    }
) {
    validateDateString(input.targetDate, "targetDate");

    const event = await createPlannedEvent(userId, {
        name: input.name,
        estimatedCost: input.estimatedCost,
        targetDate: input.targetDate,
        category: input.category,
        recurrence: input.recurrence,
        currency: input.currency,
    });

    await safeDel(`adk:events:${userId}:active`);
    await safeDel(`adk:events:${userId}:all`);

    return {
        status: "success",
        message: `Planned event "${input.name}" created: ${input.estimatedCost} ${event.currency} by ${input.targetDate}.`,
        eventId: event.id,
    };
}

export async function handleUpdatePlannedEvent(
    userId: string,
    input: {
        eventId: string;
        name?: string;
        estimatedCost?: number;
        targetDate?: string;
        savedSoFar?: number;
        completed?: boolean;
    }
) {
    validateDateString(input.targetDate, "targetDate");

    const result = await updatePlannedEvent(userId, input.eventId, {
        name: input.name,
        estimatedCost: input.estimatedCost,
        targetDate: input.targetDate,
        savedSoFar: input.savedSoFar,
        completed: input.completed,
    });

    if (!result) {
        return { status: "error", message: "Planned event not found, does not belong to this user, or no fields to update." };
    }

    await safeDel(`adk:events:${userId}:active`);
    await safeDel(`adk:events:${userId}:all`);

    return {
        status: "success",
        message: `Planned event "${result.original.name}" updated successfully.`,
        updatedFields: {
            ...(input.name !== undefined && { name: result.updated.name }),
            ...(input.estimatedCost !== undefined && { estimatedCost: toNumberSafe(result.updated.estimatedCost) }),
            ...(input.targetDate !== undefined && { targetDate: result.updated.targetDate.toISOString().split("T")[0] }),
            ...(input.savedSoFar !== undefined && { savedSoFar: toNumberSafe(result.updated.savedSoFar) }),
            ...(input.completed !== undefined && { completed: result.updated.completed }),
        },
    };
}
