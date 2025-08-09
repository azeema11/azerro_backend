import { Response } from "express";
import { asyncHandler } from "../utils/async_handler";
import { AuthRequest } from "../middlewares/auth.middleware";
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

    const event = await createPlannedEvent(userId, req.body);
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

    await updatePlannedEvent(userId, req.params.id, req.body);
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