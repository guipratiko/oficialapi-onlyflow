/**
 * Autenticação: Bearer (token OnlyFlow) ou x-api-key
 */

import { Request, Response, NextFunction } from 'express';
import { AUTH_CONFIG } from '../config/constants';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (AUTH_CONFIG.API_KEY && apiKey === AUTH_CONFIG.API_KEY) {
    (req as Request & { authType: string }).authType = 'api_key';
    next();
    return;
  }

  if (bearer) {
    (req as Request & { authType: string; bearerToken: string }).authType = 'bearer';
    (req as Request & { bearerToken: string }).bearerToken = bearer;
    next();
    return;
  }

  if (!AUTH_CONFIG.API_KEY) {
    next();
    return;
  }

  res.status(401).json({ status: 'error', message: 'Não autorizado' });
}
