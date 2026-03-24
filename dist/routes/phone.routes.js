"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const phoneController_1 = require("../controllers/phoneController");
const auth_1 = require("../middleware/auth");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/:phone_number_id/profile', phoneController_1.getProfile);
router.patch('/:phone_number_id/profile', phoneController_1.patchProfile);
router.post('/:phone_number_id/profile-picture', upload.single('file'), phoneController_1.uploadProfilePicture);
router.get('/:phone_number_id/settings', phoneController_1.getSettings);
exports.default = router;
