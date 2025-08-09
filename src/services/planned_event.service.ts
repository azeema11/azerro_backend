import { Periodicity, Category } from "@prisma/client";
import prisma from "../utils/db";
import { withNotFoundHandling, withPrismaErrorHandling, ValidationError, NotFoundError } from '../utils/prisma_errors';
import { PlannedEventUpdateData, CreatePlannedEventInput } from '../types/service_types';

export async function createPlannedEvent(userId: string, data: CreatePlannedEventInput) {
    // Validation
    if (!data.name?.trim()) {
        throw new ValidationError(
            'Planned event name is required',
            'PlannedEvent',
            undefined,
            { field: 'name', validationType: 'business' }
        );
    }

    if (!data.estimatedCost || data.estimatedCost <= 0) {
        throw new ValidationError(
            'Estimated cost must be greater than 0',
            'PlannedEvent',
            undefined,
            { field: 'estimatedCost', validationType: 'business' }
        );
    }

    if (!data.targetDate) {
        throw new ValidationError(
            'Target date is required',
            'PlannedEvent',
            undefined,
            { field: 'targetDate', validationType: 'business' }
        );
    }

    if (data.targetDate <= new Date()) {
        throw new ValidationError(
            'Target date must be in the future',
            'PlannedEvent',
            undefined,
            { field: 'targetDate', validationType: 'business' }
        );
    }

    return withPrismaErrorHandling(async () => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundError('User');

        return await prisma.plannedEvent.create({
            data: {
                userId,
                name: data.name.trim(),
                targetDate: data.targetDate,
                estimatedCost: data.estimatedCost,
                savedSoFar: data.savedSoFar ?? 0,
                currency: data.currency ?? user.baseCurrency,
                category: data.category ?? Category.OTHER,
                recurrence: data.recurrence ?? Periodicity.ONE_TIME,
                createdAt: new Date()
            }
        });
    }, 'PlannedEvent');
}

export async function listPlannedEvents(userId: string) {
    return withPrismaErrorHandling(async () => {
        return await prisma.plannedEvent.findMany({
            where: { userId },
            orderBy: { targetDate: 'asc' }
        });
    }, 'PlannedEvent');
}

export async function updatePlannedEvent(userId: string, id: string, updates: PlannedEventUpdateData) {
    if (updates.targetDate) {
        if (updates.targetDate <= new Date()) {
            throw new ValidationError(
                'Target date must be in the future',
                'PlannedEvent',
                undefined,
                { field: 'targetDate', validationType: 'business' }
            );
        }
    }

    return withNotFoundHandling(async () => {
        return await prisma.plannedEvent.update({
            where: {
                id_userId: { id, userId }
            },
            data: updates
        });
    }, 'Planned event');
}

export async function deletePlannedEvent(userId: string, id: string) {
    return withNotFoundHandling(async () => {
        await prisma.plannedEvent.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Planned event');
}

export async function completePlannedEvent(
    userId: string,
    eventId: string
): Promise<{ eventId: string; transactionId: string }> {
    return withPrismaErrorHandling(async () => {
        return prisma.$transaction(async (tx) => {
            const event = await tx.plannedEvent.findFirst({
                where: { id: eventId, userId, completed: false }
            });
            if (!event) {
                throw new NotFoundError("Incomplete planned event");
            }
            const createdTx = await tx.transaction.create({
                data: {
                    userId,
                    category: event.category,
                    date: event.targetDate,
                    amount: event.estimatedCost,
                    description: `Planned Event: ${event.name}`,
                    currency: event.currency,
                }
            });
            const { count } = await tx.plannedEvent.updateMany({
                where: { id: event.id, userId, completed: false },
                data: { completed: true, completedTxId: createdTx.id }
            });
            if (count === 0) {
                throw new ValidationError(
                    "Event concurrently updated; try again",
                    'PlannedEvent',
                    undefined,
                    { field: 'id', validationType: 'business' }
                );
            }
            return { eventId: event.id, transactionId: createdTx.id };
        });
    }, 'PlannedEvent');
}

export async function undoCompletePlannedEvent(userId: string, eventId: string) {
    return withPrismaErrorHandling(async () => {
        return prisma.$transaction(async (tx) => {
            const event = await tx.plannedEvent.findFirst({
                where: { id: eventId, userId, completed: true }
            });
            if (!event) throw new NotFoundError("Completed planned event");

            if (event.completedTxId) {
                await tx.transaction.delete({
                    where: { id: event.completedTxId }
                });
            }

            await tx.plannedEvent.update({
                where: { id: event.id },
                data: { completed: false, completedTxId: null }
            });

            return { eventId: event.id };
        });
    }, 'PlannedEvent');
}