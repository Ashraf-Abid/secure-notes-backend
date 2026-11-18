import { Router } from 'express';
import { listAllNotes } from '../controllers/note.controller';
import { getUsersGroupedByInterests } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/notes', listAllNotes);
router.get('/users/grouped-by-interests', getUsersGroupedByInterests);

export default router;
