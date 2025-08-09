import { Router } from "express";
import {
    addPlannedEvent,
    getPlannedEvents,
    editPlannedEvent,
    removePlannedEvent,
    setPlannedEventComplete,
    resetPlannedEventComplete
} from "../controllers/planned_event.controller";

const router = Router();

router.get("/", getPlannedEvents);
router.post("/", addPlannedEvent);
router.put("/complete/:id", setPlannedEventComplete);
router.put("/reset/:id", resetPlannedEventComplete);
router.put("/:id", editPlannedEvent);
router.delete("/:id", removePlannedEvent);

export default router;