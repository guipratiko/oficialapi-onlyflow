import { Router } from 'express';
import messageRoutes from './message.routes';
import phoneRoutes from './phone.routes';
import templateRoutes from './template.routes';

const router = Router();

router.use('/message', messageRoutes);
router.use('/phone', phoneRoutes);
router.use('/templates', templateRoutes);

export default router;
