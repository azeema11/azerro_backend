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

router.post("/", addPlannedEvent);
router.get("/", getPlannedEvents);
router.put("/:id", editPlannedEvent);
router.delete("/:id", removePlannedEvent);
router.put("/complete/:id", setPlannedEventComplete);
router.put("/reset/:id", resetPlannedEventComplete);

export default router;