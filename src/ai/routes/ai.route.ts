import { Router } from "express";
import { askTransactionAgent } from "../controllers/transactionQA.controller";

const router = Router();

router.post("/transactionAgent", askTransactionAgent);

export default router;