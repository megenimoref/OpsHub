import { Router } from 'express';
import { login, register, setupTotp, confirmTotp, verifyTotp, resetTotp, forgotPassword, resetPassword } from '../controllers/authController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/setup-totp', authMiddleware, setupTotp);
router.post('/confirm-totp', authMiddleware, confirmTotp);
router.post('/verify-totp', verifyTotp);
router.delete('/reset-totp/:userId', authMiddleware, adminMiddleware, resetTotp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
