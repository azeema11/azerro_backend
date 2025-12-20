"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPlannedEventComplete = exports.setPlannedEventComplete = exports.removePlannedEvent = exports.editPlannedEvent = exports.getPlannedEvents = exports.addPlannedEvent = void 0;
const async_handler_1 = require("../utils/async_handler");
const planned_event_service_1 = require("../services/planned_event.service");
exports.addPlannedEvent = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    // Create typed input object from request body
    const { name, targetDate, estimatedCost, savedSoFar, currency, category, recurrence } = req.body;
    const plannedEventInput = {
        name,
        targetDate,
        estimatedCost,
        savedSoFar,
        currency,
        category,
        recurrence
    };
    const event = await (0, planned_event_service_1.createPlannedEvent)(userId, plannedEventInput);
    res.status(201).json(event);
});
exports.getPlannedEvents = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    const events = await (0, planned_event_service_1.listPlannedEvents)(userId);
    res.status(200).json(events);
});
exports.editPlannedEvent = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    // Create typed update object from request body
    const { name, targetDate, estimatedCost, savedSoFar, currency, category, recurrence, completed, completedTxId } = req.body;
    const updateData = {
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
    await (0, planned_event_service_1.updatePlannedEvent)(userId, req.params.id, updateData);
    res.status(200).json({ success: true });
});
exports.removePlannedEvent = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    await (0, planned_event_service_1.deletePlannedEvent)(userId, req.params.id);
    res.status(204).end();
});
exports.setPlannedEventComplete = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    await (0, planned_event_service_1.completePlannedEvent)(userId, req.params.id);
    res.status(200).json({ success: true });
});
exports.resetPlannedEventComplete = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    await (0, planned_event_service_1.undoCompletePlannedEvent)(userId, req.params.id);
    res.status(200).json({ success: true });
});
