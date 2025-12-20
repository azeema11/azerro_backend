"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.signup = void 0;
const async_handler_1 = require("../utils/async_handler");
const auth_service_1 = require("../services/auth.service");
exports.signup = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { name, email, password } = req.body;
    const result = await (0, auth_service_1.createUser)(name, email, password);
    res.status(201).json(result);
});
exports.login = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const result = await (0, auth_service_1.authenticateUser)(email, password);
    res.status(200).json(result);
});
