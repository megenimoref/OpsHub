import { Router } from 'express';
import { login, register, setupTotp, confirmTotp, verifyTotp, resetTotp } from '../controllers/authController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/setup-totp', authMiddleware, setupTotp);
router.post('/confirm-totp', authMiddleware, confirmTotp);
router.post('/verify-totp', verifyTotp);
router.delete('/reset-totp/:userId', authMiddleware, adminMiddleware, resetTotp);

export default router;
