"use strict";
/**
 * Servidor do microserviço API oficial WhatsApp Cloud (OnlyFlow)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const constants_1 = require("./config/constants");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
const PORT = constants_1.SERVER_CONFIG.PORT;
app.use((0, cors_1.default)({
    origin: constants_1.SERVER_CONFIG.CORS_ORIGIN,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'oficial-api-onlyflow', timestamp: new Date().toISOString() });
});
app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        message: 'OnlyFlow — API oficial WhatsApp Cloud',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            sendText: 'POST /api/message/send-text',
            sendMedia: 'POST /api/message/send-media',
            send: 'POST /api/message/send',
        },
    });
});
app.use('/api', routes_1.default);
app.listen(PORT, () => {
    console.log(`API oficial WhatsApp Cloud (OnlyFlow) rodando na porta ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
});
