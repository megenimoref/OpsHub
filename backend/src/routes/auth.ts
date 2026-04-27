import { Router } from 'express';
import { login, forgotPassword, resetPassword, refreshToken, logDisconnect } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', authMiddleware, refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
// Diagnostic endpoint — receives client-side disconnect events.
// Intentionally unauthenticated: by the time it fires, the token is
// usually expired or missing.
router.post('/log-disconnect', logDisconnect);

export default router;
