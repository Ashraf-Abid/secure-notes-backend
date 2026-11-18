import { Request, Response } from 'express';
import * as noteService from '../services/note.service';
import { paginationSchema } from '../utils/pagination';

export async function createNote(req: Request, res: Response) {
  const note = await noteService.createNote(req.user!._id, req.body);
  res.status(201).json({ success: true, data: note });
}

export async function listMyNotes(req: Request, res: Response) {
  const query = paginationSchema.parse(req.query);
  const { notes, pagination } = await noteService.listUserNotes(req.user!._id, query);
  res.json({ success: true, data: notes, pagination });
}

export async function getNote(req: Request<{ id: string }>, res: Response) {
  const note = await noteService.getNote(req.user!, req.params.id);
  res.json({ success: true, data: note });
}

export async function updateNote(req: Request<{ id: string }>, res: Response) {
  const note = await noteService.updateNote(req.user!._id, req.params.id, req.body);
  res.json({ success: true, data: note });
}

export async function deleteNote(req: Request<{ id: string }>, res: Response) {
  await noteService.deleteNote(req.user!._id, req.params.id);
  res.json({ success: true, message: 'Note deleted' });
}
