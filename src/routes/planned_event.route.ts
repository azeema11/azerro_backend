import { Router } from "express";
import {
    addPlannedEvent,
    getPlannedEvents,
    editPlannedEvent,
    removePlannedEvent,
    setPlannedEventComplete,
    resetPlannedEventComplete
} from "../controllers/planned_event.controller";
import { validate } from "../middlewares/validate.middleware";
import { createPlannedEventSchema, updatePlannedEventSchema, plannedEventIdSchema, completePlannedEventSchema } from "../validations/planned_event.schema";

const router = Router();

router.get("/", getPlannedEvents);
router.post("/", validate(createPlannedEventSchema), addPlannedEvent);
router.put("/complete/:id", validate(completePlannedEventSchema), setPlannedEventComplete);
router.put("/reset/:id", validate(plannedEventIdSchema), resetPlannedEventComplete);
router.put("/:id", validate(updatePlannedEventSchema), editPlannedEvent);
router.delete("/:id", validate(plannedEventIdSchema), removePlannedEvent);

export default router;