import { Router } from 'express';
import { createUser, getUsers, deleteUser, resetUserPassword, updateUser, sendTotpSetupEmail } from '../controllers/usersController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getUsers);

router.post('/', adminMiddleware, createUser);
router.put('/:id', adminMiddleware, updateUser);
router.delete('/:id', adminMiddleware, deleteUser);
router.put('/:id/reset-password', adminMiddleware, resetUserPassword);
router.post('/:id/send-totp-email', adminMiddleware, sendTotpSetupEmail);

export default router;
