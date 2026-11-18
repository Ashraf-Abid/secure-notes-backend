import { Router } from 'express';
import { createPost, listPosts } from '../controllers/post.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createPostSchema } from '../validators/post.validator';

const router = Router();

router.use(authenticate);

router.post('/', validate(createPostSchema), createPost);
router.get('/', listPosts);

export default router;
