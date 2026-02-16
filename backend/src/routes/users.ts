import { Router } from 'express';
import { createUser, getUsers } from '../controllers/usersController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', getUsers);
router.post('/', createUser);

export default router;
