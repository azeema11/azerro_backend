"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlannedEvent = createPlannedEvent;
exports.listPlannedEvents = listPlannedEvents;
exports.updatePlannedEvent = updatePlannedEvent;
exports.deletePlannedEvent = deletePlannedEvent;
exports.completePlannedEvent = completePlannedEvent;
exports.undoCompletePlannedEvent = undoCompletePlannedEvent;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../utils/db"));
const prisma_errors_1 = require("../utils/prisma_errors");
async function createPlannedEvent(userId, data) {
    // Validation
    if (!data.name?.trim()) {
        throw new prisma_errors_1.ValidationError('Planned event name is required', 'PlannedEvent', undefined, { field: 'name', validationType: 'business' });
    }
    if (!data.estimatedCost || data.estimatedCost <= 0) {
        throw new prisma_errors_1.ValidationError('Estimated cost must be greater than 0', 'PlannedEvent', undefined, { field: 'estimatedCost', validationType: 'business' });
    }
    if (!data.targetDate) {
        throw new prisma_errors_1.ValidationError('Target date is required', 'PlannedEvent', undefined, { field: 'targetDate', validationType: 'business' });
    }
    if (data.targetDate <= new Date()) {
        throw new prisma_errors_1.ValidationError('Target date must be in the future', 'PlannedEvent', undefined, { field: 'targetDate', validationType: 'business' });
    }
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new prisma_errors_1.NotFoundError('User');
        return await db_1.default.plannedEvent.create({
            data: {
                userId,
                name: data.name.trim(),
                targetDate: data.targetDate,
                estimatedCost: data.estimatedCost,
                savedSoFar: data.savedSoFar ?? 0,
                currency: data.currency ?? user.baseCurrency,
                category: data.category ?? client_1.Category.OTHER,
                recurrence: data.recurrence ?? client_1.Periodicity.ONE_TIME,
                createdAt: new Date()
            }
        });
    }, 'PlannedEvent');
}
async function listPlannedEvents(userId) {
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return await db_1.default.plannedEvent.findMany({
            where: { userId },
            orderBy: { targetDate: 'asc' }
        });
    }, 'PlannedEvent');
}
async function updatePlannedEvent(userId, id, updates) {
    if (updates.targetDate) {
        if (updates.targetDate <= new Date()) {
            throw new prisma_errors_1.ValidationError('Target date must be in the future', 'PlannedEvent', undefined, { field: 'targetDate', validationType: 'business' });
        }
    }
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        return await db_1.default.plannedEvent.update({
            where: {
                id_userId: { id, userId }
            },
            data: updates
        });
    }, 'Planned event');
}
async function deletePlannedEvent(userId, id) {
    return (0, prisma_errors_1.withNotFoundHandling)(async () => {
        await db_1.default.plannedEvent.delete({
            where: {
                id_userId: { id, userId }
            }
        });
    }, 'Planned event');
}
async function completePlannedEvent(userId, eventId) {
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return db_1.default.$transaction(async (tx) => {
            const event = await tx.plannedEvent.findFirst({
                where: { id: eventId, userId, completed: false }
            });
            if (!event) {
                throw new prisma_errors_1.NotFoundError("Incomplete planned event");
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
                throw new prisma_errors_1.ValidationError("Event concurrently updated; try again", 'PlannedEvent', undefined, { field: 'id', validationType: 'business' });
            }
            return { eventId: event.id, transactionId: createdTx.id };
        });
    }, 'PlannedEvent');
}
async function undoCompletePlannedEvent(userId, eventId) {
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        return db_1.default.$transaction(async (tx) => {
            const event = await tx.plannedEvent.findFirst({
                where: { id: eventId, userId, completed: true }
            });
            if (!event)
                throw new prisma_errors_1.NotFoundError("Completed planned event");
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
