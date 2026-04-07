import { Router } from 'express';
import messageRoutes from './message.routes';
import templateRoutes from './template.routes';

const router = Router();

router.use('/message', messageRoutes);
/** Perfil/número/registro: use o Backend OnlyFlow (Graph API direta em services/whatsappCloud). */
router.use('/templates', templateRoutes);

export default router;
