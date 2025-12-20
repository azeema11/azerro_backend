"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askTransactionAgent = void 0;
const transactionQA_service_1 = require("../services/transactionQA.service");
const async_handler_1 = require("../../utils/async_handler");
exports.askTransactionAgent = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { question } = req.body;
    const result = await (0, transactionQA_service_1.askQuestionToTransactionAgent)(userId, question);
    res.status(200).json(result);
});
