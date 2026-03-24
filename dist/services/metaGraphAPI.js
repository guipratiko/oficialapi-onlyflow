"use strict";
/**
 * Cliente para WhatsApp Cloud API (Meta Graph API)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTextMessage = sendTextMessage;
exports.uploadMediaToMeta = uploadMediaToMeta;
exports.sendMediaMessage = sendMediaMessage;
exports.sendMessage = sendMessage;
exports.getWhatsAppBusinessProfile = getWhatsAppBusinessProfile;
exports.updateWhatsAppBusinessProfile = updateWhatsAppBusinessProfile;
exports.getPhoneNumberSettings = getPhoneNumberSettings;
exports.uploadProfilePictureToMeta = uploadProfilePictureToMeta;
exports.isMetaAPIError = isMetaAPIError;
exports.getMetaErrorMessage = getMetaErrorMessage;
exports.listMessageTemplates = listMessageTemplates;
exports.createMessageTemplate = createMessageTemplate;
exports.getMessageTemplate = getMessageTemplate;
exports.updateMessageTemplate = updateMessageTemplate;
exports.deleteMessageTemplate = deleteMessageTemplate;
exports.sendTemplateMessage = sendTemplateMessage;
const form_data_1 = __importDefault(require("form-data"));
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../config/constants");
const BASE_URL = `${constants_1.META_CONFIG.GRAPH_API_BASE}`;
const ACCESS_TOKEN = constants_1.META_CONFIG.ACCESS_TOKEN;
/**
 * Normaliza número para formato Meta (apenas dígitos, sem + ou @s.whatsapp.net)
 */
function normalizePhoneForMeta(number) {
    let normalized = number.replace(/\D/g, '');
    if (normalized.startsWith('@'))
        return number.replace('@s.whatsapp.net', '').trim();
    return normalized;
}
/**
 * Envia mensagem de texto
 */
async function sendTextMessage(phoneNumberId, to, text) {
    const url = `${BASE_URL}/${phoneNumberId}/messages`;
    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizePhoneForMeta(to),
        type: 'text',
        text: {
            preview_url: false,
            body: text,
        },
    };
    const response = await axios_1.default.post(url, body, {
        params: { access_token: ACCESS_TOKEN },
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
    });
    const messages = response.data?.messages;
    const messageId = messages?.[0]?.id || response.data?.message_id || '';
    return { messageId };
}
const MEDIA_MIME = {
    image: 'image/jpeg',
    video: 'video/mp4',
    audio: 'audio/ogg',
    document: 'application/pdf',
};
const META_AUDIO_OGG = 'audio/ogg';
const META_SUPPORTED_AUDIO = ['audio/aac', 'audio/amr', 'audio/mpeg', 'audio/mp4', 'audio/ogg'];
function normalizeAudioMimeForMeta(mime) {
    const base = mime.split(';')[0].trim().toLowerCase();
    return META_SUPPORTED_AUDIO.includes(base) ? base : META_AUDIO_OGG;
}
function getUploadExtension(mediaType, mime) {
    if (mediaType === 'audio')
        return mime?.includes('webm') ? 'webm' : mime?.includes('mp4') ? 'm4a' : 'ogg';
    if (mediaType === 'image')
        return 'jpg';
    if (mediaType === 'video')
        return 'mp4';
    return 'bin';
}
/**
 * Faz upload de mídia para a Meta (POST /PHONE_NUMBER_ID/media).
 * Retorna o media_id para uso em mensagens.
 * Ref: https://developers.facebook.com/documentation/whatsapp/cloud-api/reference/media
 */
async function uploadMediaToMeta(phoneNumberId, fileBuffer, mimeType, fileName) {
    const typeForMeta = mimeType.startsWith('audio/') ? normalizeAudioMimeForMeta(mimeType) : mimeType;
    const form = new form_data_1.default();
    // Ordem recomendada: file primeiro, depois messaging_product e type
    form.append('file', fileBuffer, {
        filename: fileName || 'file',
        contentType: typeForMeta,
    });
    form.append('messaging_product', 'whatsapp');
    form.append('type', typeForMeta);
    const url = `${BASE_URL}/${phoneNumberId}/media`;
    try {
        const response = await axios_1.default.post(url, form, {
            params: { access_token: ACCESS_TOKEN },
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000,
        });
        const id = response.data?.id;
        if (!id)
            throw new Error('Meta não retornou id do upload de mídia');
        console.log('[OficialAPI-Clerky] Meta media upload OK', { mediaId: id, type: typeForMeta });
        return id;
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response?.status === 400 && err.response?.data) {
            const metaError = err.response.data;
            const msg = metaError.error?.message || JSON.stringify(metaError.error);
            const code = metaError.error?.code;
            console.error('[OficialAPI-Clerky] Meta media upload 400:', { code, message: msg, typeSent: typeForMeta, originalType: mimeType });
            throw new Error(`Meta rejeitou o upload de mídia (${code || '400'}): ${msg}. Use áudio em formato suportado: ${META_AUDIO_OGG}, audio/mp4, audio/mpeg.`);
        }
        throw err;
    }
}
/** Garante URL HTTPS (Meta exige HTTPS para link de mídia). */
function ensureHttpsLink(url) {
    if (url.startsWith('http://'))
        return 'https://' + url.slice(7);
    return url;
}
/**
 * Envia mídia (imagem, vídeo, áudio ou documento).
 * - Se media for URL (http/https): envia com link (Meta busca no MidiaService), como na Evolution API.
 * - Se mediaBuffer for passado: faz upload na Meta e envia por id (fallback quando não há URL acessível).
 * - Se media for id: envia diretamente por id.
 */
async function sendMediaMessage(phoneNumberId, to, mediaType, media, options, mediaBuffer, mediaMimeType) {
    const url = `${BASE_URL}/${phoneNumberId}/messages`;
    const toNumber = normalizePhoneForMeta(to);
    let mediaPayload;
    const isUrl = media.startsWith('http://') || media.startsWith('https://');
    if (mediaBuffer && mediaBuffer.length > 0) {
        const mime = mediaMimeType || MEDIA_MIME[mediaType] || 'application/octet-stream';
        const ext = getUploadExtension(mediaType, mime);
        const fileName = options?.fileName || `file-${Date.now()}.${ext}`;
        const mediaId = await uploadMediaToMeta(phoneNumberId, mediaBuffer, mime, fileName);
        mediaPayload = { id: mediaId };
    }
    else if (isUrl) {
        mediaPayload = { link: ensureHttpsLink(media) };
        console.log('[OficialAPI-Clerky] Enviando mídia por link (MidiaService)', { mediaType, to: toNumber });
    }
    else {
        mediaPayload = { id: media };
    }
    if (options?.caption && (mediaType === 'image' || mediaType === 'video')) {
        mediaPayload.caption = options.caption;
    }
    if (options?.fileName && mediaType === 'document') {
        mediaPayload.filename = options.fileName;
    }
    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNumber,
        type: mediaType,
        [mediaType]: mediaPayload,
    };
    try {
        const response = await axios_1.default.post(url, body, {
            params: { access_token: ACCESS_TOKEN },
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000,
        });
        const messages = response.data?.messages;
        const messageId = messages?.[0]?.id || response.data?.message_id || '';
        if (isUrl || (mediaBuffer && mediaBuffer.length > 0)) {
            console.log('[OficialAPI-Clerky] Mídia enviada à Meta com sucesso', { to: toNumber, messageId });
        }
        return { messageId };
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response?.data) {
            const data = err.response.data;
            console.error('[OficialAPI-Clerky] Meta send message error:', {
                status: err.response.status,
                code: data.error?.code,
                message: data.error?.message,
                to: toNumber,
            });
        }
        throw err;
    }
}
/**
 * Wrapper que escolhe sendText ou sendMedia conforme payload (compatível com Evolution)
 */
async function sendMessage(phoneNumberId, number, payload) {
    if (payload.text) {
        return sendTextMessage(phoneNumberId, number, payload.text);
    }
    if (payload.image) {
        return sendMediaMessage(phoneNumberId, number, 'image', payload.image, {
            caption: payload.caption,
        });
    }
    if (payload.video) {
        return sendMediaMessage(phoneNumberId, number, 'video', payload.video, {
            caption: payload.caption,
        });
    }
    if (payload.audio && (payload.audio.startsWith('http://') || payload.audio.startsWith('https://'))) {
        return sendMediaMessage(phoneNumberId, number, 'audio', payload.audio);
    }
    if (payload.audio_base64) {
        const buffer = Buffer.from(payload.audio_base64, 'base64');
        console.log('[OficialAPI-Clerky] Enviando áudio via base64 (fallback)', { bufferLen: buffer.length, to: number });
        return sendMediaMessage(phoneNumberId, number, 'audio', payload.audio || '', { fileName: payload.fileName || 'audio.ogg' }, buffer, payload.audio_mimetype);
    }
    if (payload.audio) {
        return sendMediaMessage(phoneNumberId, number, 'audio', payload.audio);
    }
    if (payload.document) {
        return sendMediaMessage(phoneNumberId, number, 'document', payload.document, {
            fileName: payload.fileName || 'arquivo',
        });
    }
    throw new Error('Tipo de mensagem não especificado');
}
const PROFILE_FIELDS = 'about,address,description,email,profile_picture_url,vertical,websites';
/**
 * GET perfil de negócio do número (WhatsApp Business Profile API).
 * É obrigatório passar fields para a Meta devolver os dados (about, descrição, foto, etc.).
 * Ref: https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account-to-number-current-status/whatsapp_business_profile/
 */
async function getWhatsAppBusinessProfile(phoneNumberId) {
    const url = `${BASE_URL}/${phoneNumberId}/whatsapp_business_profile`;
    const response = await axios_1.default.get(url, {
        params: {
            access_token: ACCESS_TOKEN,
            fields: PROFILE_FIELDS,
        },
        timeout: 15000,
    });
    const list = response.data?.data;
    if (Array.isArray(list) && list.length > 0) {
        return list[0];
    }
    return null;
}
/**
 * POST atualizar perfil de negócio (WhatsApp Business Profile API)
 */
async function updateWhatsAppBusinessProfile(phoneNumberId, body) {
    const url = `${BASE_URL}/${phoneNumberId}/whatsapp_business_profile`;
    const payload = {
        messaging_product: 'whatsapp',
        ...body,
    };
    const response = await axios_1.default.post(url, payload, {
        params: { access_token: ACCESS_TOKEN },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
    });
    return { success: response.data?.success ?? true };
}
/**
 * GET configurações do número (campos do nó, ex.: messaging_limit_tier)
 */
async function getPhoneNumberSettings(phoneNumberId) {
    const url = `${BASE_URL}/${phoneNumberId}`;
    const response = await axios_1.default.get(url, {
        params: {
            access_token: ACCESS_TOKEN,
            fields: 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,throughput',
        },
        timeout: 15000,
    });
    return response.data;
}
/**
 * Resumable Upload (Meta): inicia sessão e envia arquivo; retorna o handle para profile_picture_handle.
 * Ref: https://developers.facebook.com/docs/graph-api/guides/upload
 */
async function uploadProfilePictureToMeta(fileBuffer, mimeType, fileName) {
    const appId = constants_1.META_CONFIG.APP_ID;
    if (!appId)
        throw new Error('META_APP_ID não configurado');
    const fileType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const urlStart = `${BASE_URL}/${appId}/uploads`;
    const sessionRes = await axios_1.default.post(urlStart, null, {
        params: {
            access_token: ACCESS_TOKEN,
            file_name: fileName || 'profile.jpg',
            file_length: fileBuffer.length,
            file_type: fileType,
        },
        timeout: 15000,
    });
    const sessionId = sessionRes.data?.id;
    if (!sessionId || !sessionId.startsWith('upload:')) {
        throw new Error('Resposta da Meta sem upload session id');
    }
    const urlUpload = `${BASE_URL}/${sessionId}`;
    const uploadRes = await axios_1.default.post(urlUpload, fileBuffer, {
        headers: {
            Authorization: `OAuth ${ACCESS_TOKEN}`,
            'file_offset': '0',
            'Content-Type': 'application/octet-stream',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000,
    });
    const handle = uploadRes.data?.h;
    if (!handle)
        throw new Error('Meta não retornou handle do upload');
    return handle;
}
function isMetaAPIError(error) {
    return axios_1.default.isAxiosError(error);
}
function getMetaErrorMessage(error) {
    if (isMetaAPIError(error) && error.response?.data?.error?.message) {
        return error.response.data.error.message;
    }
    if (error instanceof Error)
        return error.message;
    return String(error);
}
function getToken(accessToken) {
    return accessToken && accessToken.trim() ? accessToken.trim() : ACCESS_TOKEN;
}
const metaTemplatePayload_1 = require("./metaTemplatePayload");
/** GET lista de templates da WABA. Inclui todos os status (APPROVED, PENDING, REJECTED, DISABLED). */
async function listMessageTemplates(wabaId, accessToken) {
    const url = `${BASE_URL}/${wabaId}/message_templates`;
    const token = getToken(accessToken);
    const seen = new Set();
    const allTemplates = [];
    for (const status of ['APPROVED', 'PENDING', 'REJECTED', 'DISABLED']) {
        const res = await axios_1.default.get(url, {
            params: { access_token: token, status },
            timeout: 15000,
        });
        const list = res.data?.data ?? [];
        if (list.length > 0) {
            console.log('[Meta Templates] LIST by status', { wabaId, status, count: list.length });
        }
        for (const t of list) {
            if (t.id && !seen.has(t.id)) {
                seen.add(t.id);
                allTemplates.push(t);
            }
        }
    }
    const byStatus = allTemplates.reduce((acc, t) => {
        const s = (t.status || 'UNKNOWN').toUpperCase();
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
    }, {});
    console.log('[Meta Templates] LIST summary', { wabaId, total: allTemplates.length, byStatus });
    if (allTemplates.some((t) => (t.status || '').toUpperCase() === 'REJECTED')) {
        console.log('[Meta Templates] REJECTED templates (ver detalhes no Meta Business Suite / Business Support)', allTemplates
            .filter((t) => (t.status || '').toUpperCase() === 'REJECTED')
            .map((t) => ({ id: t.id, name: t.name, language: t.language, category: t.category })));
    }
    return allTemplates;
}
/** POST criar template */
async function createMessageTemplate(wabaId, body, accessToken) {
    (0, metaTemplatePayload_1.validateTemplateCreate)(body);
    const url = `${BASE_URL}/${wabaId}/message_templates`;
    const payload = (0, metaTemplatePayload_1.buildMessageTemplatePayload)(body);
    console.log('[Meta Templates] CREATE request', {
        wabaId,
        name: body.name,
        language: body.language,
        category: body.category,
        componentTypes: (body.components || []).map((c) => c.type),
        payloadForMeta: JSON.stringify(payload, null, 2),
    });
    try {
        const res = await axios_1.default.post(url, payload, {
            params: { access_token: getToken(accessToken) },
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
        console.log('[Meta Templates] CREATE response (raw)', {
            status: res.status,
            data: res.data,
        });
        const id = res.data?.id;
        if (res.data?.error) {
            const e = res.data.error;
            const msg = e.error_user_msg || e.message || 'Invalid parameter';
            console.warn('[Meta Templates] CREATE rejected by Meta', {
                name: body.name,
                category: body.category,
                error_message: e.message,
                error_user_msg: e.error_user_msg,
                error_code: e.code,
                error_subcode: e.error_subcode,
            });
            throw new Error(`Meta: ${msg}`);
        }
        if (!id)
            throw new Error('Meta não retornou id do template');
        const templateStatus = res.data?.status ?? undefined;
        if ((templateStatus || '').toUpperCase() === 'REJECTED') {
            console.warn('[Meta Templates] CREATE: template criado mas REJEITADO na revisão da Meta', {
                id,
                name: body.name,
                language: body.language,
                category: body.category,
                hint: 'Ver motivo em Meta Business Suite > Message Templates ou no e-mail da Meta.',
            });
        }
        console.log('[Meta Templates] CREATE success', { id, status: templateStatus, category: res.data?.category });
        return { id, templateStatus };
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response) {
            const data = err.response.data;
            const errorObj = data?.error;
            const subcode = errorObj?.error_subcode;
            console.warn('[Meta Templates] CREATE HTTP error', {
                status: err.response.status,
                data,
                name: body.name,
                category: body.category,
                hint: subcode === 2388024
                    ? 'Nome+idioma já existem (mesmo rejeitado). Use outro nome ou edite o template existente (POST /templates/:id).'
                    : undefined,
            });
            if (data?.error && typeof data.error === 'object') {
                const metaErr = data.error;
                const msg = metaErr.error_user_msg || metaErr.message || err.message;
                throw new Error(`Meta: ${msg}`);
            }
        }
        throw err;
    }
}
/** GET template por ID */
async function getMessageTemplate(templateId, accessToken) {
    const url = `${BASE_URL}/${templateId}`;
    const res = await axios_1.default.get(url, {
        params: { access_token: getToken(accessToken), fields: 'id,name,status,category,language,components' },
        timeout: 15000,
    });
    return res.data;
}
/** POST editar template (mesmo body que criar) */
async function updateMessageTemplate(templateId, body, accessToken) {
    (0, metaTemplatePayload_1.validateTemplateCreate)(body);
    const url = `${BASE_URL}/${templateId}`;
    const payload = (0, metaTemplatePayload_1.buildMessageTemplatePayload)(body);
    console.log('[Meta Templates] UPDATE request', {
        templateId,
        name: body.name,
        language: body.language,
        category: body.category,
        payloadForMeta: JSON.stringify(payload, null, 2),
    });
    try {
        const res = await axios_1.default.post(url, payload, {
            params: { access_token: getToken(accessToken) },
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
        console.log('[Meta Templates] UPDATE response', { status: res.status, data: res.data });
        return { success: true };
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response) {
            console.warn('[Meta Templates] UPDATE HTTP error', {
                templateId,
                status: err.response.status,
                data: err.response.data,
            });
        }
        throw err;
    }
}
/** DELETE template por nome ou por hsm_id+name. Doc Meta: name obrigatório; hsm_id opcional (exclui só aquele ID). */
async function deleteMessageTemplate(wabaId, name, accessToken, hsmId) {
    const url = `${BASE_URL}/${wabaId}/message_templates`;
    const token = (accessToken && accessToken.trim()) || (ACCESS_TOKEN || '').trim();
    if (!token) {
        console.warn('[Meta Templates] DELETE: access_token da instância ou META_SYSTEM_USER_TOKEN é obrigatório.');
        throw new Error('Envie o token da instância (meta_access_token) ou configure META_SYSTEM_USER_TOKEN no OficialAPI-Clerky.');
    }
    const tokenSource = accessToken && accessToken.trim() ? 'instance' : 'META_SYSTEM_USER_TOKEN';
    const params = { name };
    if (hsmId && hsmId.trim())
        params.hsm_id = hsmId.trim();
    console.log('[Meta Templates] DELETE', { wabaId, name, hsm_id: params.hsm_id ?? undefined, tokenSource });
    await axios_1.default.delete(url, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
    });
}
/**
 * Envia mensagem de template (início de conversa) via Meta Cloud API.
 * Ref: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
async function sendTemplateMessage(params) {
    const { phoneNumberId, to, templateName, languageCode, bodyParams = [], accessToken } = params;
    const url = `${BASE_URL}/${phoneNumberId}/messages`;
    const components = [];
    if (bodyParams.length > 0) {
        components.push({
            type: 'body',
            parameters: bodyParams.map((text, idx) => ({
                type: 'text',
                text,
                parameter_name: `var_${idx + 1}`,
            })),
        });
    }
    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizePhoneForMeta(to),
        type: 'template',
        template: {
            name: templateName,
            language: { code: languageCode },
            ...(components.length > 0 && { components }),
        },
    };
    console.log('[Meta Templates] SEND template', { phoneNumberId, to: body.to, templateName, languageCode });
    try {
        const response = await axios_1.default.post(url, body, {
            params: { access_token: getToken(accessToken) },
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
        const messages = response.data?.messages;
        const messageId = messages?.[0]?.id || response.data?.message_id || '';
        const messageStatus = messages?.[0]?.message_status;
        console.log('[Meta Templates] SEND response', {
            messageId,
            message_status: messageStatus,
            hint: messageStatus === 'held_for_quality_assessment' ? 'Template em pacing; mensagem pode ser entregue depois.' : undefined,
        });
        return { messageId };
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response?.data) {
            const data = err.response.data;
            const code = data?.error?.code;
            console.warn('[Meta Templates] SEND error', {
                status: err.response.status,
                code,
                message: data?.error?.message,
                error_user_msg: data?.error?.error_user_msg,
                hint: code === 131049
                    ? 'Limite de marketing por usuário (per-user limit). Aguarde 24h antes de reenviar.'
                    : code === 131050
                        ? 'Usuário parou de receber mensagens de marketing (opt-out).'
                        : undefined,
            });
        }
        throw err;
    }
}
