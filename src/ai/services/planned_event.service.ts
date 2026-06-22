import { Category, Periodicity } from "@prisma/client";
import prisma from "../../utils/db";

export async function getPlannedEvents(userId: string, includeCompleted = false) {
    const where: Record<string, unknown> = { userId };
    if (!includeCompleted) where.completed = false;

    return prisma.plannedEvent.findMany({ where });
}

export interface CreatePlannedEventData {
    name: string;
    estimatedCost: number;
    targetDate: string;
    category: string;
    recurrence?: string;
    currency?: string;
}

export async function createPlannedEvent(userId: string, data: CreatePlannedEventData) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { baseCurrency: true },
    });

    return prisma.plannedEvent.create({
        data: {
            userId,
            name: data.name,
            estimatedCost: data.estimatedCost,
            currency: data.currency || user?.baseCurrency || "USD",
            targetDate: new Date(data.targetDate),
            category: data.category as Category,
            recurrence: (data.recurrence as Periodicity) || Periodicity.ONE_TIME,
            savedSoFar: 0,
        },
    });
}

export interface UpdatePlannedEventData {
    name?: string;
    estimatedCost?: number;
    targetDate?: string;
    savedSoFar?: number;
    completed?: boolean;
}

/**
 * Returns the original event (for name reference) and the updated record,
 * or null if the event was not found or no fields to update.
 */
export async function updatePlannedEvent(userId: string, eventId: string, data: UpdatePlannedEventData) {
    const event = await prisma.plannedEvent.findFirst({
        where: { id: eventId, userId },
    });

    if (!event) return null;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost;
    if (data.targetDate !== undefined) updateData.targetDate = new Date(data.targetDate);
    if (data.savedSoFar !== undefined) updateData.savedSoFar = data.savedSoFar;
    if (data.completed !== undefined) updateData.completed = data.completed;

    if (Object.keys(updateData).length === 0) return null;

    const updated = await prisma.plannedEvent.update({
        where: { id: eventId },
        data: updateData,
    });

    return { original: event, updated };
}
