/**
 * Configurações centralizadas do OficialAPI-Clerky
 */

import dotenv from 'dotenv';

dotenv.config();

export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || '4338', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

export const META_CONFIG = {
  ACCESS_TOKEN: process.env.META_SYSTEM_USER_TOKEN || '',
  GRAPH_API_BASE: 'https://graph.facebook.com/v21.0',
  /** App ID da Meta (necessário para Resumable Upload da foto de perfil). */
  APP_ID: process.env.META_APP_ID || '',
};

export const AUTH_CONFIG = {
  API_KEY: process.env.API_KEY || '',
};
