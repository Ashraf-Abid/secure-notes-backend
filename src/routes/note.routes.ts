import { Router } from 'express';
import { createNote, deleteNote, getNote, listMyNotes, updateNote } from '../controllers/note.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createNoteSchema, updateNoteSchema } from '../validators/note.validator';

const router = Router();

router.use(authenticate);

router.post('/', validate(createNoteSchema), createNote);
router.get('/', listMyNotes);
router.get('/:id', getNote);
router.patch('/:id', validate(updateNoteSchema), updateNote);
router.delete('/:id', deleteNote);

export default router;
