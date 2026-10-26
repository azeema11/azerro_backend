import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  connectBroker,
  getBrokerStatus,
  syncBrokerHoldings,
  disconnectBroker,
  searchMarketInstrument,
  getInstrumentDetails,
  getMemories,
  saveMemory,
  deleteMemory,
  indmoneyCallback,
} from "../controllers/broker.controller";
import {
  connectBrokerSchema,
  brokerStatusSchema,
  syncBrokerSchema,
  disconnectBrokerSchema,
  searchInstrumentSchema,
  instrumentDetailsSchema,
  getMemoriesSchema,
  saveMemorySchema,
  deleteMemorySchema,
} from "../validations/broker.schema";

const router = Router();

// OAuth Callback endpoint (unauthenticated)
router.get("/indmoney/callback", indmoneyCallback);

// Broker connection and sync endpoints
router.post("/:broker/connect", authMiddleware, validate(connectBrokerSchema), connectBroker);
router.get("/:broker/status", authMiddleware, validate(brokerStatusSchema), getBrokerStatus);
router.post("/:broker/sync", authMiddleware, validate(syncBrokerSchema), syncBrokerHoldings);
router.post("/:broker/disconnect", authMiddleware, validate(disconnectBrokerSchema), disconnectBroker);

// Market data endpoints
router.get("/:broker/search", authMiddleware, validate(searchInstrumentSchema), searchMarketInstrument);
router.get("/:broker/instrument/:symbol", authMiddleware, validate(instrumentDetailsSchema), getInstrumentDetails);

// User Memory / Preference endpoints
router.get("/memory/all", authMiddleware, validate(getMemoriesSchema), getMemories);
router.post("/memory/save", authMiddleware, validate(saveMemorySchema), saveMemory);
router.delete("/memory/:category/:key", authMiddleware, validate(deleteMemorySchema), deleteMemory);

export default router;
