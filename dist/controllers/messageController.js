"use strict";
/**
 * Controller de envio de mensagens via WhatsApp Cloud API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendText = sendText;
exports.sendMedia = sendMedia;
exports.send = send;
exports.sendTemplate = sendTemplate;
const metaGraphAPI_1 = require("../services/metaGraphAPI");
/**
 * POST /message/send-text
 * Body: { phone_number_id, number, text }
 */
async function sendText(req, res) {
    try {
        const { phone_number_id, number, text } = req.body;
        if (!phone_number_id || !number || text == null) {
            res.status(400).json({
                status: 'error',
                message: 'phone_number_id, number e text são obrigatórios',
            });
            return;
        }
        const result = await (0, metaGraphAPI_1.sendTextMessage)(phone_number_id, number, String(text));
        res.status(200).json({ status: 'ok', data: result });
    }
    catch (error) {
        console.error('[OficialAPI] sendText error:', error);
        res.status(500).json({
            status: 'error',
            message: (0, metaGraphAPI_1.getMetaErrorMessage)(error),
        });
    }
}
/**
 * POST /message/send-media
 * Body: { phone_number_id, number, mediatype, media, caption?, fileName? }
 */
async function sendMedia(req, res) {
    try {
        const { phone_number_id, number, mediatype, media, caption, fileName } = req.body;
        if (!phone_number_id || !number || !mediatype || !media) {
            res.status(400).json({
                status: 'error',
                message: 'phone_number_id, number, mediatype e media são obrigatórios',
            });
            return;
        }
        const validTypes = ['image', 'video', 'audio', 'document'];
        if (!validTypes.includes(mediatype)) {
            res.status(400).json({
                status: 'error',
                message: `mediatype deve ser um de: ${validTypes.join(', ')}`,
            });
            return;
        }
        const result = await (0, metaGraphAPI_1.sendMediaMessage)(phone_number_id, number, mediatype, media, {
            caption,
            fileName,
        });
        res.status(200).json({ status: 'ok', data: result });
    }
    catch (error) {
        console.error('[OficialAPI] sendMedia error:', error);
        res.status(500).json({
            status: 'error',
            message: (0, metaGraphAPI_1.getMetaErrorMessage)(error),
        });
    }
}
/**
 * POST /message/send
 * Body compatível com Evolution: { phone_number_id, number, text?, image?, video?, audio?, document?, caption?, fileName? }
 */
async function send(req, res) {
    try {
        const { phone_number_id, number, ...rest } = req.body;
        if (!phone_number_id || !number) {
            res.status(400).json({
                status: 'error',
                message: 'phone_number_id e number são obrigatórios',
            });
            return;
        }
        const result = await (0, metaGraphAPI_1.sendMessage)(phone_number_id, number, rest);
        res.status(200).json({ status: 'ok', data: result });
    }
    catch (error) {
        console.error('[OficialAPI] send error:', error);
        res.status(500).json({
            status: 'error',
            message: (0, metaGraphAPI_1.getMetaErrorMessage)(error),
        });
    }
}
/**
 * POST /message/send-template
 * Body: { phone_number_id, to, template_name, language_code, body_params?: string[], access_token? }
 */
async function sendTemplate(req, res) {
    try {
        const { phone_number_id, to, template_name, language_code, body_params, access_token } = req.body;
        if (!phone_number_id || !to || !template_name || !language_code) {
            res.status(400).json({
                status: 'error',
                message: 'phone_number_id, to, template_name e language_code são obrigatórios',
            });
            return;
        }
        const result = await (0, metaGraphAPI_1.sendTemplateMessage)({
            phoneNumberId: phone_number_id,
            to,
            templateName: template_name,
            languageCode: language_code,
            bodyParams: Array.isArray(body_params) ? body_params : [],
            accessToken: access_token ?? null,
        });
        res.status(200).json({ status: 'ok', data: result });
    }
    catch (error) {
        console.error('[OficialAPI] sendTemplate error:', error);
        res.status(500).json({
            status: 'error',
            message: (0, metaGraphAPI_1.getMetaErrorMessage)(error),
        });
    }
}
