import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getSpousesByBattalion, getCommunityContacts, upsertCommunityContact, getCommunityUsers } from '../controllers/communityController';

const router = Router();

router.use(authMiddleware);

router.get('/spouses/:battalion', getSpousesByBattalion);
router.get('/contacts', getCommunityContacts);
router.put('/contacts', upsertCommunityContact);
router.get('/users', getCommunityUsers);

export default router;
