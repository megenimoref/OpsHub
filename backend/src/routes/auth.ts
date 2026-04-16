import { Router } from 'express';
import { login, forgotPassword, resetPassword, refreshToken } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', authMiddleware, refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
