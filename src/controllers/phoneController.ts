/**
 * Controller para perfil e configurações do número (WhatsApp Business Profile API / Settings)
 */

import { Request, Response } from 'express';
import {
  getWhatsAppBusinessProfile,
  updateWhatsAppBusinessProfile,
  getPhoneNumberSettings,
  uploadProfilePictureToMeta,
  getMetaErrorMessage,
  UpdateWhatsAppBusinessProfileBody,
} from '../services/metaGraphAPI';

/**
 * GET /phone/:phone_number_id/profile
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const phoneNumberId = req.params.phone_number_id;
    if (!phoneNumberId) {
      res.status(400).json({ status: 'error', message: 'phone_number_id é obrigatório' });
      return;
    }
    const profile = await getWhatsAppBusinessProfile(phoneNumberId);
    res.status(200).json({ status: 'ok', data: profile ?? {} });
  } catch (error) {
    console.error('[OficialAPI-Clerky] getProfile error:', error);
    res.status(500).json({
      status: 'error',
      message: getMetaErrorMessage(error),
    });
  }
}

/**
 * PATCH /phone/:phone_number_id/profile
 * Body: { about?, address?, description?, email?, vertical?, websites? }
 */
export async function patchProfile(req: Request, res: Response): Promise<void> {
  try {
    const phoneNumberId = req.params.phone_number_id;
    if (!phoneNumberId) {
      res.status(400).json({ status: 'error', message: 'phone_number_id é obrigatório' });
      return;
    }
    const body = req.body as UpdateWhatsAppBusinessProfileBody;
    await updateWhatsAppBusinessProfile(phoneNumberId, body);
    res.status(200).json({ status: 'ok', message: 'Perfil atualizado' });
  } catch (error) {
    console.error('[OficialAPI-Clerky] patchProfile error:', error);
    res.status(500).json({
      status: 'error',
      message: getMetaErrorMessage(error),
    });
  }
}

/**
 * GET /phone/:phone_number_id/settings
 */
export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const phoneNumberId = req.params.phone_number_id;
    if (!phoneNumberId) {
      res.status(400).json({ status: 'error', message: 'phone_number_id é obrigatório' });
      return;
    }
    const settings = await getPhoneNumberSettings(phoneNumberId);
    res.status(200).json({ status: 'ok', data: settings });
  } catch (error) {
    console.error('[OficialAPI-Clerky] getSettings error:', error);
    res.status(500).json({
      status: 'error',
      message: getMetaErrorMessage(error),
    });
  }
}

/**
 * POST /phone/:phone_number_id/profile-picture
 * multipart/form-data com campo 'file' (imagem jpeg/png)
 */
export async function uploadProfilePicture(req: Request, res: Response): Promise<void> {
  try {
    const phoneNumberId = req.params.phone_number_id;
    if (!phoneNumberId) {
      res.status(400).json({ status: 'error', message: 'phone_number_id é obrigatório' });
      return;
    }
    const file = req.file as Express.Multer.File | undefined;
    if (!file?.buffer) {
      res.status(400).json({ status: 'error', message: 'Envie um arquivo (campo "file")' });
      return;
    }
    const mime = file.mimetype === 'image/png' ? 'image/png' : 'image/jpeg';
    const handle = await uploadProfilePictureToMeta(file.buffer, mime, file.originalname || 'profile.jpg');
    await updateWhatsAppBusinessProfile(phoneNumberId, { profile_picture_handle: handle });
    res.status(200).json({ status: 'ok', message: 'Foto do perfil atualizada' });
  } catch (error) {
    console.error('[OficialAPI-Clerky] uploadProfilePicture error:', error);
    res.status(500).json({
      status: 'error',
      message: getMetaErrorMessage(error),
    });
  }
}
