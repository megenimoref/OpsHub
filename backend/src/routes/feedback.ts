import { Router } from 'express';
import { getFeedbacks, createFeedback, updateFeedback, deleteFeedback } from '../controllers/feedbackController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getFeedbacks);
router.post('/', createFeedback);
router.put('/:id', updateFeedback);
router.delete('/:id', deleteFeedback);

export default router;
