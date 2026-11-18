import { Types } from 'mongoose';
import { Note } from '../models/Note';
import { UserDocument } from '../models/User';
import { AppError } from '../utils/AppError';
import { buildPagination, PaginationQuery } from '../utils/pagination';
import { CreateNoteInput, UpdateNoteInput } from '../validators/note.validator';

export function createNote(userId: Types.ObjectId, input: CreateNoteInput) {
  return Note.create({ user: userId, title: input.title, content: input.content });
}

export async function listUserNotes(userId: Types.ObjectId, query: PaginationQuery) {
  const filter = { user: userId };
  const [notes, total] = await Promise.all([
    Note.find(filter)
      .sort({ _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .select('-__v')
      .lean(),
    Note.countDocuments(filter),
  ]);
  return { notes, pagination: buildPagination(query, total) };
}

export async function getNote(user: UserDocument, noteId: string) {
  const filter = user.role === 'ADMIN' ? { _id: noteId } : { _id: noteId, user: user._id };
  const note = await Note.findOne(filter);
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

export async function updateNote(userId: Types.ObjectId, noteId: string, input: UpdateNoteInput) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, user: userId },
    { $set: input },
    { new: true, runValidators: true },
  );
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

export async function deleteNote(userId: Types.ObjectId, noteId: string) {
  const note = await Note.findOneAndDelete({ _id: noteId, user: userId });
  if (!note) throw new AppError(404, 'Note not found');
}
