import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
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

const router = Router();

// OAuth Callback endpoint (unauthenticated)
router.get("/indmoney/callback", indmoneyCallback);

// Broker connection and sync endpoints
router.post("/:broker/connect", authMiddleware, connectBroker);
router.get("/:broker/status", authMiddleware, getBrokerStatus);
router.post("/:broker/sync", authMiddleware, syncBrokerHoldings);
router.post("/:broker/disconnect", authMiddleware, disconnectBroker);

// Market data endpoints
router.get("/:broker/search", authMiddleware, searchMarketInstrument);
router.get("/:broker/instrument/:symbol", authMiddleware, getInstrumentDetails);

// User Memory / Preference endpoints
router.get("/memory/all", authMiddleware, getMemories);
router.post("/memory/save", authMiddleware, saveMemory);
router.delete("/memory/:category/:key", authMiddleware, deleteMemory);

export default router;
