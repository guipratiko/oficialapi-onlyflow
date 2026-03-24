import { Router } from 'express';
import multer from 'multer';
import { getProfile, patchProfile, getSettings, uploadProfilePicture } from '../controllers/phoneController';
import { authMiddleware } from '../middleware/auth';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB

const router = Router();

router.use(authMiddleware);

router.get('/:phone_number_id/profile', getProfile);
router.patch('/:phone_number_id/profile', patchProfile);
router.post('/:phone_number_id/profile-picture', upload.single('file'), uploadProfilePicture);
router.get('/:phone_number_id/settings', getSettings);

export default router;
