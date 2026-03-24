import { Router } from 'express';
import { list, create, getOne, update, remove } from '../controllers/templateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.post('/:id', update);
router.delete('/', remove);

export default router;
