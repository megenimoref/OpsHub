import { Router } from 'express';
import { getServiceCalls, createServiceCall, updateServiceCall } from '../controllers/serviceCallController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getServiceCalls);
router.post('/', createServiceCall);
router.put('/:id', updateServiceCall);

export default router;
