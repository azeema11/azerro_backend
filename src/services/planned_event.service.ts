import { Periodicity, Category } from "@prisma/client";
import prisma from "../utils/db";

export async function createPlannedEvent(userId: string, data: {
    name: string;
    targetDate: Date;
    estimatedCost: number;
    savedSoFar?: number;
    currency?: string;
    category?: Category;
    recurrence?: Periodicity;
}) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    return prisma.plannedEvent.create({
        data: {
            userId,
            name: data.name,
            targetDate: data.targetDate,
            estimatedCost: data.estimatedCost,
            savedSoFar: data.savedSoFar ?? 0,
            currency: data.currency ?? user.baseCurrency,
            category: data.category ?? Category.OTHER,
            recurrence: data.recurrence ?? Periodicity.ONE_TIME,
            createdAt: new Date()
        }
    });
}

export async function listPlannedEvents(userId: string) {
    return prisma.plannedEvent.findMany({ where: { userId } });
}

export async function updatePlannedEvent(userId: string, id: string, updates: Partial<{
    name: string;
    targetDate: Date;
    estimatedCost: number;
    savedSoFar: number;
    currency: string;
    category: Category;
    recurrence: Periodicity;
}>) {
    return prisma.plannedEvent.updateMany({
        where: { id, userId },
        data: updates
    });
}

export async function deletePlannedEvent(userId: string, id: string) {
    return prisma.plannedEvent.deleteMany({ where: { id, userId } });
}

export async function completePlannedEvent(userId: string, eventId: string) {
    const event = await prisma.plannedEvent.findFirst({
        where: { id: eventId, userId, completed: false }
    });
    if (!event) throw new Error("Event not found or already completed");

    const tx = await prisma.transaction.create({
        data: {
            userId,
            category: event.category,
            date: event.targetDate,
            amount: event.estimatedCost,
            description: `Planned Event: ${event.name}`,
            currency: event.currency,
        }
    });

    await prisma.plannedEvent.update({
        where: { id: event.id },
        data: { completed: true, completedTxId: tx.id }
    });

    return { eventId: event.id, transactionId: tx.id };
}

export async function undoCompletePlannedEvent(userId: string, eventId: string) {
    const event = await prisma.plannedEvent.findFirst({
        where: { id: eventId, userId, completed: true }
    });
    if (!event) throw new Error("Event not found or not completed");

    if (event.completedTxId) {
        await prisma.transaction.delete({
            where: { id: event.completedTxId }
        });
    }

    await prisma.plannedEvent.update({
        where: { id: event.id },
        data: { completed: false, completedTxId: null }
    });

    return { eventId: event.id };
}