import { Router } from 'express';
import { createUser, getUsers, deleteUser } from '../controllers/usersController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getUsers);

router.post('/', adminMiddleware, createUser);
router.delete('/:id', adminMiddleware, deleteUser);

export default router;
