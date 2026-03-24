import { Router } from 'express';
import { sendText, sendMedia, send, sendTemplate } from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/send-text', sendText);
router.post('/send-media', sendMedia);
router.post('/send', send);
router.post('/send-template', sendTemplate);

export default router;
