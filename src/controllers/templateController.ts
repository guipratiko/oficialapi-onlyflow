/**
 * Controller de templates de mensagem (Meta message_templates API)
 */

import { Request, Response } from 'express';
import {
  listMessageTemplates,
  createMessageTemplate,
  getMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  getMetaErrorMessage,
  CreateTemplateBody,
} from '../services/metaGraphAPI';

/** GET /templates?waba_id=xxx — lista templates da WABA */
export async function list(req: Request, res: Response): Promise<void> {
  try {
    const waba_id = (req.query.waba_id as string)?.trim();
    const access_token = (req.query.access_token as string) || (req.body?.access_token as string) || null;
    if (!waba_id) {
      res.status(400).json({ status: 'error', message: 'waba_id é obrigatório' });
      return;
    }
    const data = await listMessageTemplates(waba_id, access_token);
    res.status(200).json({ status: 'ok', data });
  } catch (error) {
    console.error('[OficialAPI] list templates error:', error);
    res.status(500).json({ status: 'error', message: getMetaErrorMessage(error) });
  }
}

/** POST /templates — criar template. Body: { waba_id, access_token?, ...CreateTemplateBody } */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { waba_id, access_token, ...body } = req.body as { waba_id: string; access_token?: string } & CreateTemplateBody;
    if (!waba_id || !body.name || !body.language || !body.category || !Array.isArray(body.components)) {
      res.status(400).json({
        status: 'error',
        message: 'waba_id, name, language, category e components são obrigatórios',
      });
      return;
    }
    console.log('[OficialAPI] Template create request', {
      waba_id,
      name: body.name,
      language: body.language,
      category: body.category,
      componentsCount: body.components?.length ?? 0,
    });
    const result = await createMessageTemplate(waba_id, body, access_token);
    console.log('[OficialAPI] Template create success', {
      templateId: result.id,
      templateStatus: result.templateStatus,
      ...(result.templateStatus?.toUpperCase() === 'REJECTED' && {
        note: 'Template rejeitado na revisão; ver Meta Business Suite para detalhes.',
      }),
    });
    res.status(200).json({ status: 'ok', data: result });
  } catch (error) {
    console.error('[OficialAPI] create template error:', error);
    res.status(500).json({ status: 'error', message: getMetaErrorMessage(error) });
  }
}

/** GET /templates/:id — obter um template por ID */
export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    const access_token = (req.query.access_token as string) || null;
    if (!id) {
      res.status(400).json({ status: 'error', message: 'id do template é obrigatório' });
      return;
    }
    const data = await getMessageTemplate(id, access_token);
    res.status(200).json({ status: 'ok', data });
  } catch (error) {
    console.error('[OficialAPI] get template error:', error);
    res.status(500).json({ status: 'error', message: getMetaErrorMessage(error) });
  }
}

/** POST /templates/:id — editar template. Body: CreateTemplateBody + access_token? */
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    const { access_token, ...body } = req.body as { access_token?: string } & CreateTemplateBody;
    if (!id || !body.name || !body.language || !body.category || !Array.isArray(body.components)) {
      res.status(400).json({
        status: 'error',
        message: 'id, name, language, category e components são obrigatórios',
      });
      return;
    }
    await updateMessageTemplate(id, body, access_token);
    res.status(200).json({ status: 'ok', data: { success: true } });
  } catch (error) {
    console.error('[OficialAPI] update template error:', error);
    res.status(500).json({ status: 'error', message: getMetaErrorMessage(error) });
  }
}

/** DELETE /templates — query: waba_id, name; opcional: access_token, hsm_id (ID do template para excluir só esse). */
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const waba_id = (req.query.waba_id as string)?.trim();
    const name = (req.query.name as string)?.trim();
    const access_token = (req.query.access_token as string) || (req.body?.access_token as string) || null;
    const hsm_id = (req.query.hsm_id as string)?.trim() || null;
    if (!waba_id || !name) {
      res.status(400).json({ status: 'error', message: 'waba_id e name são obrigatórios' });
      return;
    }
    await deleteMessageTemplate(waba_id, name, access_token, hsm_id);
    res.status(200).json({ status: 'ok', data: { deleted: true } });
  } catch (error) {
    console.error('[OficialAPI] delete template error:', error);
    res.status(500).json({ status: 'error', message: getMetaErrorMessage(error) });
  }
}
