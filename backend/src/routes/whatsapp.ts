import { Router } from 'express';
import { sendBulk } from '../controllers/whatsappController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/send-bulk', sendBulk);

export default router;
