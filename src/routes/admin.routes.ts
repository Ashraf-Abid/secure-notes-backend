import { Router } from 'express';
import { listAllNotes } from '../controllers/note.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/notes', listAllNotes);

export default router;
