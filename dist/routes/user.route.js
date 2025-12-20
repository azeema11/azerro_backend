"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const router = (0, express_1.Router)();
router.get("/me", user_controller_1.getUserProfile);
router.put("/preferences", user_controller_1.updateUserPreferences);
exports.default = router;
