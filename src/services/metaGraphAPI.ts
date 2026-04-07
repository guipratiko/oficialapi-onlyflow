/**
 * Cliente para WhatsApp Cloud API (Meta Graph API)
 */

import FormData from 'form-data';
import axios, { AxiosError } from 'axios';
import { META_CONFIG } from '../config/constants';
import { validateTemplateCreate, buildMessageTemplatePayload } from './metaTemplatePayload';

const BASE_URL = `${META_CONFIG.GRAPH_API_BASE}`;
const ACCESS_TOKEN = META_CONFIG.ACCESS_TOKEN;

const PLACEHOLDER_TOKENS = ['SEU_TOKEN_META', 'YOUR_TOKEN', '<ACCESS_TOKEN>', 'EAAJB...'];

function isPlaceholderToken(t: string): boolean {
  const s = t.trim();
  if (!s) return true;
  return PLACEHOLDER_TOKENS.some((p) => s === p || s.startsWith(p) || s === 'SEU_TOKEN_META');
}

/** Token enviado por requisição (instância OAuth) substitui META_ACCESS_TOKEN do .env */
function getToken(accessToken?: string | null): string {
  const t = accessToken?.trim();
  if (!t || isPlaceholderToken(t)) return ACCESS_TOKEN;
  return t;
}

/**
 * Normaliza número para formato Meta (apenas dígitos, sem + ou @s.whatsapp.net)
 */
function normalizePhoneForMeta(number: string): string {
  let normalized = number.replace(/\D/g, '');
  if (normalized.startsWith('@')) return number.replace('@s.whatsapp.net', '').trim();
  return normalized;
}

/**
 * Envia mensagem de texto
 */
export async function sendTextMessage(
  phoneNumberId: string,
  to: string,
  text: string
): Promise<{ messageId: string }> {
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

  const response = await axios.post(url, body, {
    params: { access_token: ACCESS_TOKEN },
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  const messages = response.data?.messages;
  const messageId = messages?.[0]?.id || response.data?.message_id || '';
  return { messageId };
}

export type MediaType = 'image' | 'video' | 'audio' | 'document';

const MEDIA_MIME: Record<MediaType, string> = {
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/ogg',
  document: 'application/pdf',
};

const META_AUDIO_OGG = 'audio/ogg';
const META_SUPPORTED_AUDIO: string[] = ['audio/aac', 'audio/amr', 'audio/mpeg', 'audio/mp4', 'audio/ogg'];

function normalizeAudioMimeForMeta(mime: string): string {
  const base = mime.split(';')[0].trim().toLowerCase();
  return META_SUPPORTED_AUDIO.includes(base) ? base : META_AUDIO_OGG;
}

function getUploadExtension(mediaType: MediaType, mime?: string): string {
  if (mediaType === 'audio') return mime?.includes('webm') ? 'webm' : mime?.includes('mp4') ? 'm4a' : 'ogg';
  if (mediaType === 'image') return 'jpg';
  if (mediaType === 'video') return 'mp4';
  return 'bin';
}

/**
 * Faz upload de mídia para a Meta (POST /PHONE_NUMBER_ID/media).
 * Retorna o media_id para uso em mensagens.
 * Ref: https://developers.facebook.com/documentation/whatsapp/cloud-api/reference/media
 */
export async function uploadMediaToMeta(
  phoneNumberId: string,
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const typeForMeta = mimeType.startsWith('audio/') ? normalizeAudioMimeForMeta(mimeType) : mimeType;
  const form = new FormData();
  // Ordem recomendada: file primeiro, depois messaging_product e type
  form.append('file', fileBuffer, {
    filename: fileName || 'file',
    contentType: typeForMeta,
  });
  form.append('messaging_product', 'whatsapp');
  form.append('type', typeForMeta);
  const url = `${BASE_URL}/${phoneNumberId}/media`;
  try {
    const response = await axios.post<{ id?: string }>(url, form, {
      params: { access_token: ACCESS_TOKEN },
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });
    const id = response.data?.id;
    if (!id) throw new Error('Meta não retornou id do upload de mídia');
    console.log('[OficialAPI-Clerky] Meta media upload OK', { mediaId: id, type: typeForMeta });
    return id;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 400 && err.response?.data) {
      const metaError = err.response.data as { error?: { message?: string; code?: number; error_user_msg?: string } };
      const msg = metaError.error?.message || JSON.stringify(metaError.error);
      const code = metaError.error?.code;
      console.error('[OficialAPI-Clerky] Meta media upload 400:', { code, message: msg, typeSent: typeForMeta, originalType: mimeType });
      throw new Error(`Meta rejeitou o upload de mídia (${code || '400'}): ${msg}. Use áudio em formato suportado: ${META_AUDIO_OGG}, audio/mp4, audio/mpeg.`);
    }
    throw err;
  }
}

/** Garante URL HTTPS (Meta exige HTTPS para link de mídia). */
function ensureHttpsLink(url: string): string {
  if (url.startsWith('http://')) return 'https://' + url.slice(7);
  return url;
}

/**
 * Envia mídia (imagem, vídeo, áudio ou documento).
 * - Se media for URL (http/https): envia com link (Meta busca no MidiaService), como na Evolution API.
 * - Se mediaBuffer for passado: faz upload na Meta e envia por id (fallback quando não há URL acessível).
 * - Se media for id: envia diretamente por id.
 */
export async function sendMediaMessage(
  phoneNumberId: string,
  to: string,
  mediaType: MediaType,
  media: string,
  options?: { caption?: string; fileName?: string },
  mediaBuffer?: Buffer,
  mediaMimeType?: string
): Promise<{ messageId: string }> {
  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  const toNumber = normalizePhoneForMeta(to);

  let mediaPayload: Record<string, unknown>;
  const isUrl = media.startsWith('http://') || media.startsWith('https://');

  if (mediaBuffer && mediaBuffer.length > 0) {
    const mime = mediaMimeType || MEDIA_MIME[mediaType] || 'application/octet-stream';
    const ext = getUploadExtension(mediaType, mime);
    const fileName = options?.fileName || `file-${Date.now()}.${ext}`;
    const mediaId = await uploadMediaToMeta(phoneNumberId, mediaBuffer, mime, fileName);
    mediaPayload = { id: mediaId };
  } else if (isUrl) {
    mediaPayload = { link: ensureHttpsLink(media) };
    console.log('[OficialAPI-Clerky] Enviando mídia por link (MidiaService)', { mediaType, to: toNumber });
  } else {
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
    const response = await axios.post(url, body, {
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
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as { error?: { message?: string; code?: number } };
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
export async function sendMessage(
  phoneNumberId: string,
  number: string,
  payload: {
    text?: string;
    image?: string;
    video?: string;
    audio?: string;
    audio_base64?: string;
    audio_mimetype?: string;
    document?: string;
    caption?: string;
    fileName?: string;
  }
): Promise<{ messageId: string }> {
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
    return sendMediaMessage(
      phoneNumberId,
      number,
      'audio',
      payload.audio || '',
      { fileName: payload.fileName || 'audio.ogg' },
      buffer,
      payload.audio_mimetype
    );
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

type MetaErrorBody = {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
};

export function isMetaAPIError(error: unknown): error is AxiosError<MetaErrorBody> {
  return axios.isAxiosError(error);
}

const META_PROFILE_PERMISSION_HINT_PT =
  ' Verifique no Meta Developers: permissão whatsapp_business_management com Advanced Access; System User com papel na WABA (ex.: Admin); token gerado para esse app e com escopos corretos. Tokens só de mensagens (whatsapp_business_messaging) não editam perfil.';

/** Graph devolve 400 invalid_request quando o token não “enxerga” o phone_number_id (WABA errada, ID trocado ou só system token sem vínculo). */
const META_GRAPH_OBJECT_INACCESSIBLE_HINT_PT =
  ' O token usado não tem acesso a esse Phone number ID na Graph API. Em business.facebook.com: associe o System User do seu app à mesma WABA desse número (Admin), gere token com whatsapp_business_management, ou conclua o OAuth do Embedded Signup para gravar meta_access_token na instância. Confira se o ID salvo é o Phone number ID da Cloud API (não o WABA ID).';

export function getMetaErrorMessage(error: unknown): string {
  if (!isMetaAPIError(error)) {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  const res = error.response;
  const body = res?.data as MetaErrorBody | undefined;
  const errObj = body?.error;
  const msg = errObj?.message || error.message;
  const wwwAuth = res?.headers?.['www-authenticate'];
  const wwwAuthStr = typeof wwwAuth === 'string' ? wwwAuth : Array.isArray(wwwAuth) ? wwwAuth.join(' ') : '';

  const objectInaccessible =
    wwwAuthStr.includes('invalid_request') &&
    (/does not exist|Unsupported get request|cannot be loaded due to missing permissions/i.test(msg || '') ||
      /does not exist|Unsupported get request|missing permissions/i.test(wwwAuthStr));

  if (objectInaccessible) {
    return (msg || 'Objeto não encontrado ou inacessível na Graph API.') + META_GRAPH_OBJECT_INACCESSIBLE_HINT_PT;
  }

  const insufficientScope =
    wwwAuthStr.includes('insufficient_scope') ||
    /permission|permissions error|insufficient/i.test(msg || '') ||
    (errObj?.code === 200 && /permission/i.test(msg || ''));

  if (insufficientScope) {
    return (msg || 'Permissão insuficiente na Meta (OAuth).') + META_PROFILE_PERMISSION_HINT_PT;
  }

  if (errObj?.message) return errObj.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

// --- Message Templates (Meta message_templates API) ---

export type TemplateCategory = 'authentication' | 'marketing' | 'utility';

/** Componente de template (body, header, button, footer) conforme API Meta. Botões: um componente por botão com sub_type e index. */
export interface MetaTemplateComponent {
  type: 'header' | 'body' | 'button' | 'footer';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  sub_type?: 'quick_reply' | 'url' | 'copy_code' | 'phone_number';
  index?: string;
  text?: string;
  url?: string;
  example?: {
    body_text?: string[][];
    header_text?: string[];
    header_handle?: string[];
    header_image?: string[];
    header_video?: string[];
    header_document?: string[];
    button_url?: string[];
    button_text?: string[];
  };
  buttons?: Array<{
    type: 'quick_reply' | 'url' | 'copy_code' | 'phone_number';
    text?: string;
    url?: string;
    example?: string[];
  }>;
  add_security_recommendation?: boolean;
  code_expiration_minutes?: number;
}

/** Body para criar template (POST message_templates) */
export interface CreateTemplateBody {
  name: string;
  language: string;
  category: TemplateCategory;
  components: MetaTemplateComponent[];
  parameter_format?: 'positional' | 'named';
}

/** Template retornado pela Meta (list/get) */
export interface MetaMessageTemplate {
  id?: string;
  name?: string;
  status?: string;
  category?: string;
  language?: string;
  components?: MetaTemplateComponent[];
}

/** GET lista de templates da WABA. Inclui todos os status (APPROVED, PENDING, REJECTED, DISABLED). */
export async function listMessageTemplates(
  wabaId: string,
  accessToken?: string | null
): Promise<MetaMessageTemplate[]> {
  const url = `${BASE_URL}/${wabaId}/message_templates`;
  const token = getToken(accessToken);
  const seen = new Set<string>();
  const allTemplates: MetaMessageTemplate[] = [];
  for (const status of ['APPROVED', 'PENDING', 'REJECTED', 'DISABLED']) {
    const res = await axios.get<{ data?: MetaMessageTemplate[] }>(url, {
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
  const byStatus = allTemplates.reduce<Record<string, number>>((acc, t) => {
    const s = (t.status || 'UNKNOWN').toUpperCase();
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  console.log('[Meta Templates] LIST summary', { wabaId, total: allTemplates.length, byStatus });
  if (allTemplates.some((t) => (t.status || '').toUpperCase() === 'REJECTED')) {
    console.log(
      '[Meta Templates] REJECTED templates (ver detalhes no Meta Business Suite / Business Support)',
      allTemplates
        .filter((t) => (t.status || '').toUpperCase() === 'REJECTED')
        .map((t) => ({ id: t.id, name: t.name, language: t.language, category: t.category }))
    );
  }
  return allTemplates;
}

/** POST criar template */
export async function createMessageTemplate(
  wabaId: string,
  body: CreateTemplateBody,
  accessToken?: string | null
): Promise<{ id: string; templateStatus?: string }> {
  validateTemplateCreate(body as Parameters<typeof validateTemplateCreate>[0]);
  const url = `${BASE_URL}/${wabaId}/message_templates`;
  const payload = buildMessageTemplatePayload(body as Parameters<typeof buildMessageTemplatePayload>[0]);

  console.log('[Meta Templates] CREATE request', {
    wabaId,
    name: body.name,
    language: body.language,
    category: body.category,
    componentTypes: (body.components || []).map((c) => c.type),
    payloadForMeta: JSON.stringify(payload, null, 2),
  });

  try {
    const res = await axios.post<{
      id?: string;
      status?: string;
      category?: string;
      error?: { message?: string; code?: number; error_user_msg?: string; error_subcode?: number };
    }>(url, payload, {
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
    if (!id) throw new Error('Meta não retornou id do template');
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
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const data = err.response.data as Record<string, unknown> | undefined;
      const errorObj = data?.error as { error_subcode?: number; error_user_msg?: string } | undefined;
      const subcode = errorObj?.error_subcode;
      console.warn('[Meta Templates] CREATE HTTP error', {
        status: err.response.status,
        data,
        name: body.name,
        category: body.category,
        hint:
          subcode === 2388024
            ? 'Nome+idioma já existem (mesmo rejeitado). Use outro nome ou edite o template existente (POST /templates/:id).'
            : undefined,
      });
      if (data?.error && typeof data.error === 'object') {
        const metaErr = data.error as { message?: string; error_user_msg?: string; code?: number };
        const msg = metaErr.error_user_msg || metaErr.message || err.message;
        throw new Error(`Meta: ${msg}`);
      }
    }
    throw err;
  }
}

/** GET template por ID */
export async function getMessageTemplate(
  templateId: string,
  accessToken?: string | null
): Promise<MetaMessageTemplate> {
  const url = `${BASE_URL}/${templateId}`;
  const res = await axios.get<MetaMessageTemplate>(url, {
    params: { access_token: getToken(accessToken), fields: 'id,name,status,category,language,components' },
    timeout: 15000,
  });
  return res.data;
}

/** POST editar template (mesmo body que criar) */
export async function updateMessageTemplate(
  templateId: string,
  body: CreateTemplateBody,
  accessToken?: string | null
): Promise<{ success: boolean }> {
  validateTemplateCreate(body as Parameters<typeof validateTemplateCreate>[0]);
  const url = `${BASE_URL}/${templateId}`;
  const payload = buildMessageTemplatePayload(body as Parameters<typeof buildMessageTemplatePayload>[0]);
  console.log('[Meta Templates] UPDATE request', {
    templateId,
    name: body.name,
    language: body.language,
    category: body.category,
    payloadForMeta: JSON.stringify(payload, null, 2),
  });
  try {
    const res = await axios.post(url, payload, {
      params: { access_token: getToken(accessToken) },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    console.log('[Meta Templates] UPDATE response', { status: res.status, data: res.data });
    return { success: true };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
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
export async function deleteMessageTemplate(
  wabaId: string,
  name: string,
  accessToken?: string | null,
  hsmId?: string | null
): Promise<void> {
  const url = `${BASE_URL}/${wabaId}/message_templates`;
  const token = getToken(accessToken)?.trim() || '';
  if (!token) {
    console.warn('[Meta Templates] DELETE: access_token da instância ou META_SYSTEM_USER_TOKEN é obrigatório.');
    throw new Error('Envie o token da instância (meta_access_token) ou configure META_SYSTEM_USER_TOKEN no OficialAPI-Clerky.');
  }
  const tokenSource = accessToken && accessToken.trim() ? 'instance' : 'META_SYSTEM_USER_TOKEN';
  const params: Record<string, string> = { name };
  if (hsmId && hsmId.trim()) params.hsm_id = hsmId.trim();
  console.log('[Meta Templates] DELETE', { wabaId, name, hsm_id: params.hsm_id ?? undefined, tokenSource });
  await axios.delete(url, {
    params,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
}

// --- Envio de mensagem de template (conversation start) ---

export interface SendTemplateMessageParams {
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode: string;
  /** Parâmetros do body na ordem ({{1}}, {{2}}, ...). Pode ser vazio se o template não tiver variáveis. */
  bodyParams?: string[];
  accessToken?: string | null;
}

/**
 * Envia mensagem de template (início de conversa) via Meta Cloud API.
 * Ref: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
export async function sendTemplateMessage(params: SendTemplateMessageParams): Promise<{ messageId: string }> {
  const { phoneNumberId, to, templateName, languageCode, bodyParams = [], accessToken } = params;
  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  const components: Record<string, unknown>[] = [];
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
    const response = await axios.post(url, body, {
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
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as { error?: { code?: number; message?: string; error_user_msg?: string } };
      const code = data?.error?.code;
      console.warn('[Meta Templates] SEND error', {
        status: err.response.status,
        code,
        message: data?.error?.message,
        error_user_msg: data?.error?.error_user_msg,
        hint:
          code === 131049
            ? 'Limite de marketing por usuário (per-user limit). Aguarde 24h antes de reenviar.'
            : code === 131050
              ? 'Usuário parou de receber mensagens de marketing (opt-out).'
              : undefined,
      });
    }
    throw err;
  }
}
