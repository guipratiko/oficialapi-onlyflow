"use strict";
/**
 * Configurações centralizadas do OficialAPI-Clerky
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_CONFIG = exports.META_CONFIG = exports.SERVER_CONFIG = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.SERVER_CONFIG = {
    PORT: parseInt(process.env.PORT || '4338', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
exports.META_CONFIG = {
    ACCESS_TOKEN: process.env.META_SYSTEM_USER_TOKEN || '',
    GRAPH_API_BASE: 'https://graph.facebook.com/v21.0',
    /** App ID da Meta (necessário para Resumable Upload da foto de perfil). */
    APP_ID: process.env.META_APP_ID || '',
};
exports.AUTH_CONFIG = {
    API_KEY: process.env.API_KEY || '',
};
