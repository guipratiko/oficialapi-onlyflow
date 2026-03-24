"use strict";
/**
 * Controller de templates de mensagem (Meta message_templates API)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.create = create;
exports.getOne = getOne;
exports.update = update;
exports.remove = remove;
const metaGraphAPI_1 = require("../services/metaGraphAPI");
/** GET /templates?waba_id=xxx — lista templates da WABA */
async function list(req, res) {
    try {
        const waba_id = req.query.waba_id?.trim();
        const access_token = req.query.access_token || req.body?.access_token || null;
        if (!waba_id) {
            res.status(400).json({ status: 'error', message: 'waba_id é obrigatório' });
            return;
        }
        const data = await (0, metaGraphAPI_1.listMessageTemplates)(waba_id, access_token);
        res.status(200).json({ status: 'ok', data });
    }
    catch (error) {
        console.error('[OficialAPI-Clerky] list templates error:', error);
        res.status(500).json({ status: 'error', message: (0, metaGraphAPI_1.getMetaErrorMessage)(error) });
    }
}
/** POST /templates — criar template. Body: { waba_id, access_token?, ...CreateTemplateBody } */
async function create(req, res) {
    try {
        const { waba_id, access_token, ...body } = req.body;
        if (!waba_id || !body.name || !body.language || !body.category || !Array.isArray(body.components)) {
            res.status(400).json({
                status: 'error',
                message: 'waba_id, name, language, category e components são obrigatórios',
            });
            return;
        }
        console.log('[OficialAPI-Clerky] Template create request', {
            waba_id,
            name: body.name,
            language: body.language,
            category: body.category,
            componentsCount: body.components?.length ?? 0,
        });
        const result = await (0, metaGraphAPI_1.createMessageTemplate)(waba_id, body, access_token);
        console.log('[OficialAPI-Clerky] Template create success', {
            templateId: result.id,
            templateStatus: result.templateStatus,
            ...(result.templateStatus?.toUpperCase() === 'REJECTED' && {
                note: 'Template rejeitado na revisão; ver Meta Business Suite para detalhes.',
            }),
        });
        res.status(200).json({ status: 'ok', data: result });
    }
    catch (error) {
        console.error('[OficialAPI-Clerky] create template error:', error);
        res.status(500).json({ status: 'error', message: (0, metaGraphAPI_1.getMetaErrorMessage)(error) });
    }
}
/** GET /templates/:id — obter um template por ID */
async function getOne(req, res) {
    try {
        const id = req.params.id;
        const access_token = req.query.access_token || null;
        if (!id) {
            res.status(400).json({ status: 'error', message: 'id do template é obrigatório' });
            return;
        }
        const data = await (0, metaGraphAPI_1.getMessageTemplate)(id, access_token);
        res.status(200).json({ status: 'ok', data });
    }
    catch (error) {
        console.error('[OficialAPI-Clerky] get template error:', error);
        res.status(500).json({ status: 'error', message: (0, metaGraphAPI_1.getMetaErrorMessage)(error) });
    }
}
/** POST /templates/:id — editar template. Body: CreateTemplateBody + access_token? */
async function update(req, res) {
    try {
        const id = req.params.id;
        const { access_token, ...body } = req.body;
        if (!id || !body.name || !body.language || !body.category || !Array.isArray(body.components)) {
            res.status(400).json({
                status: 'error',
                message: 'id, name, language, category e components são obrigatórios',
            });
            return;
        }
        await (0, metaGraphAPI_1.updateMessageTemplate)(id, body, access_token);
        res.status(200).json({ status: 'ok', data: { success: true } });
    }
    catch (error) {
        console.error('[OficialAPI-Clerky] update template error:', error);
        res.status(500).json({ status: 'error', message: (0, metaGraphAPI_1.getMetaErrorMessage)(error) });
    }
}
/** DELETE /templates — query: waba_id, name; opcional: access_token, hsm_id (ID do template para excluir só esse). */
async function remove(req, res) {
    try {
        const waba_id = req.query.waba_id?.trim();
        const name = req.query.name?.trim();
        const access_token = req.query.access_token || req.body?.access_token || null;
        const hsm_id = req.query.hsm_id?.trim() || null;
        if (!waba_id || !name) {
            res.status(400).json({ status: 'error', message: 'waba_id e name são obrigatórios' });
            return;
        }
        await (0, metaGraphAPI_1.deleteMessageTemplate)(waba_id, name, access_token, hsm_id);
        res.status(200).json({ status: 'ok', data: { deleted: true } });
    }
    catch (error) {
        console.error('[OficialAPI-Clerky] delete template error:', error);
        res.status(500).json({ status: 'error', message: (0, metaGraphAPI_1.getMetaErrorMessage)(error) });
    }
}
