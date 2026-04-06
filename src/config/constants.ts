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

const graphVersionRaw = (process.env.META_GRAPH_API_VERSION || 'v25.0').trim();
const graphVersion = graphVersionRaw.startsWith('v') ? graphVersionRaw : `v${graphVersionRaw}`;

export const META_CONFIG = {
  ACCESS_TOKEN: process.env.META_SYSTEM_USER_TOKEN || '',
  /** v21+ depreciadas pela Meta; padrão v25. Sobrescreva com META_GRAPH_API_VERSION=v26.0 se precisar */
  GRAPH_API_BASE: `https://graph.facebook.com/${graphVersion}`,
  /** App ID da Meta (necessário para Resumable Upload da foto de perfil). */
  APP_ID: process.env.META_APP_ID || '',
};

export const AUTH_CONFIG = {
  API_KEY: process.env.API_KEY || '',
};
