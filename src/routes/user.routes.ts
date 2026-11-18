import { Router } from 'express';
import { createUser, deleteUser, getMe, getUser, listUsers, updateUser } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

const router = Router();

router.get('/me', authenticate, getMe);

router.get('/', authenticate, authorize('ADMIN'), listUsers);
router.post('/', authenticate, authorize('ADMIN'), validate(createUserSchema), createUser);
router.get('/:id', authenticate, authorize('ADMIN'), getUser);
router.patch('/:id', authenticate, authorize('ADMIN'), validate(updateUserSchema), updateUser);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);

export default router;
