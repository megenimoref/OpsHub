import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { issueTimetableSso } from '../controllers/timetableSsoController';

const router = Router();
router.use(authMiddleware);

// POST /timetable-sso  body: { role?: 'user' | 'admin' }
// Returns { url } — a short-lived, HMAC-signed link the browser can open in a
// new tab to land in TimeTable already-authenticated. role:'admin' requires
// the caller to be an OpsHub admin or super.
router.post('/', issueTimetableSso);

export default router;
