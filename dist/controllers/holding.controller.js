"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHolding = exports.updateHolding = exports.createHolding = exports.getHoldings = void 0;
const async_handler_1 = require("../utils/async_handler");
const holding_service_1 = require("../services/holding.service");
exports.getHoldings = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const holdings = await (0, holding_service_1.getHoldings)(req.userId);
    res.status(200).json(holdings);
});
exports.createHolding = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Create typed input object from request body
    const { platform, ticker, assetType, quantity, avgCost, holdingCurrency, name, } = req.body;
    const holdingInput = {
        platform,
        ticker,
        assetType,
        quantity,
        avgCost,
        holdingCurrency,
        name
    };
    const result = await (0, holding_service_1.createHolding)(req.userId, holdingInput);
    res.status(201).json(result);
});
exports.updateHolding = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    // Create typed update object from request body
    const { platform, ticker, assetType, name, quantity, avgCost, holdingCurrency, lastPrice, convertedValue } = req.body;
    const updateData = {
        platform,
        ticker,
        assetType,
        name,
        quantity,
        avgCost,
        holdingCurrency,
        lastPrice,
        convertedValue
    };
    const updated = await (0, holding_service_1.updateHolding)(id, req.userId, updateData);
    res.status(200).json(updated);
});
exports.deleteHolding = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await (0, holding_service_1.deleteHolding)(id, req.userId);
    res.status(204).send();
});
