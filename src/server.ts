/**
 * Servidor do microserviço OficialAPI-Clerky (WhatsApp Cloud API)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { SERVER_CONFIG } from './config/constants';
import routes from './routes';

const app = express();
const PORT = SERVER_CONFIG.PORT;

app.use(
  cors({
    origin: SERVER_CONFIG.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'oficial-api-clerky', timestamp: new Date().toISOString() });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'OficialAPI-Clerky (WhatsApp Cloud API)',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      sendText: 'POST /api/message/send-text',
      sendMedia: 'POST /api/message/send-media',
      send: 'POST /api/message/send',
    },
  });
});

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`OficialAPI-Clerky rodando na porta ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});
