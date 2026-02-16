import { Router } from 'express';
import {
  getPeople,
  getPersonById,
  getBattalions,
  createPerson,
  updatePerson,
  deletePerson,
} from '../controllers/peopleController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getPeople);
router.get('/battalions', getBattalions);
router.get('/:id', getPersonById);
router.post('/', createPerson);
router.put('/:id', updatePerson);
router.delete('/:id', deletePerson);

export default router;
