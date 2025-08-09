import { Response } from "express";
import { asyncHandler } from "../utils/async_handler";
import { AuthRequest } from "../middlewares/auth.middleware";
import { CreatePlannedEventInput, PlannedEventUpdateData } from "../types/service_types";
import {
    createPlannedEvent,
    listPlannedEvents,
    updatePlannedEvent,
    deletePlannedEvent,
    completePlannedEvent,
    undoCompletePlannedEvent,
} from "../services/planned_event.service";

export const addPlannedEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Create typed input object from request body
    const { name, targetDate, estimatedCost, savedSoFar, currency, category, recurrence } = req.body;

    const plannedEventInput: CreatePlannedEventInput = {
        name,
        targetDate,
        estimatedCost,
        savedSoFar,
        currency,
        category,
        recurrence
    };

    const event = await createPlannedEvent(userId, plannedEventInput);
    res.status(201).json(event);
});

export const getPlannedEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const events = await listPlannedEvents(userId);
    res.status(200).json(events);
});

export const editPlannedEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Create typed update object from request body
    const { name, targetDate, estimatedCost, savedSoFar, currency, category, recurrence, completed, completedTxId } = req.body;

    const updateData: PlannedEventUpdateData = {
        name,
        targetDate,
        estimatedCost,
        savedSoFar,
        currency,
        category,
        recurrence,
        completed,
        completedTxId
    };

    await updatePlannedEvent(userId, req.params.id, updateData);
    res.status(200).json({ success: true });
});

export const removePlannedEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await deletePlannedEvent(userId, req.params.id);
    res.status(204).end();
});

export const setPlannedEventComplete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await completePlannedEvent(userId, req.params.id);
    res.status(200).json({ success: true });
});

export const resetPlannedEventComplete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await undoCompletePlannedEvent(userId, req.params.id);
    res.status(200).json({ success: true });
});