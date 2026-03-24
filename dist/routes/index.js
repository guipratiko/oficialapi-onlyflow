"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_routes_1 = __importDefault(require("./message.routes"));
const phone_routes_1 = __importDefault(require("./phone.routes"));
const template_routes_1 = __importDefault(require("./template.routes"));
const router = (0, express_1.Router)();
router.use('/message', message_routes_1.default);
router.use('/phone', phone_routes_1.default);
router.use('/templates', template_routes_1.default);
exports.default = router;
