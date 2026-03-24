"use strict";
/**
 * Autenticação: Bearer (token OnlyFlow) ou x-api-key
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const constants_1 = require("../config/constants");
function authMiddleware(req, res, next) {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null;
    const apiKey = req.headers['x-api-key'];
    if (constants_1.AUTH_CONFIG.API_KEY && apiKey === constants_1.AUTH_CONFIG.API_KEY) {
        req.authType = 'api_key';
        next();
        return;
    }
    if (bearer) {
        req.authType = 'bearer';
        req.bearerToken = bearer;
        next();
        return;
    }
    if (!constants_1.AUTH_CONFIG.API_KEY) {
        next();
        return;
    }
    res.status(401).json({ status: 'error', message: 'Não autorizado' });
}
