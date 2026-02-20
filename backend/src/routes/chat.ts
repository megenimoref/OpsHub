import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { chat } from '../controllers/chatController';

const router = Router();

router.post('/', authMiddleware, chat);

export default router;
