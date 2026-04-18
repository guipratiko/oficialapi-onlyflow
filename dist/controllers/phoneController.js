"use strict";
/**
 * Controller para perfil e configurações do número (WhatsApp Business Profile API / Settings)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.patchProfile = patchProfile;
exports.getSettings = getSettings;
exports.uploadProfilePicture = uploadProfilePicture;
const metaGraphAPI_1 = require("../services/metaGraphAPI");
/**
 * GET /phone/:phone_number_id/profile
 */
async function getProfile(req, res) {
    try {
        const phoneNumberId = req.params.phone_number_id;
        if (!phoneNumberId) {
            res.status(400).json({ status: 'error', message: 'phone_number_id é obrigatório' });
            return;
        }
        const profile = await (0, metaGraphAPI_1.getWhatsAppBusinessProfile)(phoneNumberId);
        res.status(200).json({ status: 'ok', data: profile ?? {} });
    }
    catch (error) {
        console.error('[OficialAPI] getProfile error:', error);
        res.status(500).json({
            status: 'error',
            message: (0, metaGraphAPI_1.getMetaErrorMessage)(error),
        });
    }
}
/**
 * PATCH /phone/:phone_number_id/profile
 * Body: { about?, address?, description?, email?, vertical?, websites? }
 */
async function patchProfile(req, res) {
    try {
        const phoneNumberId = req.params.phone_number_id;
        if (!phoneNumberId) {
            res.status(400).json({ status: 'error', message: 'phone_number_id é obrigatório' });
            return;
        }
        const body = req.body;
        await (0, metaGraphAPI_1.updateWhatsAppBusinessProfile)(phoneNumberId, body);
        res.status(200).json({ status: 'ok', message: 'Perfil atualizado' });
    }
    catch (error) {
        console.error('[OficialAPI] patchProfile error:', error);
        res.status(500).json({
            status: 'error',
            message: (0, metaGraphAPI_1.getMetaErrorMessage)(error),
        });
    }
}
/**
 * GET /phone/:phone_number_id/settings
 */
async function getSettings(req, res) {
    try {
        const phoneNumberId = req.params.phone_number_id;
        if (!phoneNumberId) {
            res.status(400).json({ status: 'error', message: 'phone_number_id é obrigatório' });
            return;
        }
        const settings = await (0, metaGraphAPI_1.getPhoneNumberSettings)(phoneNumberId);
        res.status(200).json({ status: 'ok', data: settings });
    }
    catch (error) {
        console.error('[OficialAPI] getSettings error:', error);
        res.status(500).json({
            status: 'error',
            message: (0, metaGraphAPI_1.getMetaErrorMessage)(error),
        });
    }
}
/**
 * POST /phone/:phone_number_id/profile-picture
 * multipart/form-data com campo 'file' (imagem jpeg/png)
 */
async function uploadProfilePicture(req, res) {
    try {
        const phoneNumberId = req.params.phone_number_id;
        if (!phoneNumberId) {
            res.status(400).json({ status: 'error', message: 'phone_number_id é obrigatório' });
            return;
        }
        const file = req.file;
        if (!file?.buffer) {
            res.status(400).json({ status: 'error', message: 'Envie um arquivo (campo "file")' });
            return;
        }
        const mime = file.mimetype === 'image/png' ? 'image/png' : 'image/jpeg';
        const handle = await (0, metaGraphAPI_1.uploadProfilePictureToMeta)(file.buffer, mime, file.originalname || 'profile.jpg');
        await (0, metaGraphAPI_1.updateWhatsAppBusinessProfile)(phoneNumberId, { profile_picture_handle: handle });
        res.status(200).json({ status: 'ok', message: 'Foto do perfil atualizada' });
    }
    catch (error) {
        console.error('[OficialAPI] uploadProfilePicture error:', error);
        res.status(500).json({
            status: 'error',
            message: (0, metaGraphAPI_1.getMetaErrorMessage)(error),
        });
    }
}
