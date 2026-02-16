import { Router } from 'express';
import { createTicket, getTickets } from '../controllers/ticketController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getTickets);
router.post('/', createTicket);

export default router;
