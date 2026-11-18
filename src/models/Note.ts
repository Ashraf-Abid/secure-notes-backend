import { Schema, model, Types } from 'mongoose';

export interface INote {
  user: Types.ObjectId;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 10000 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Compound index { user, _id desc } supports:
//  - User lists own notes, newest first, paginated:
//      find({ user }).sort({ _id: -1 }).skip().limit()
//    -> equality on `user`, then results already in sort order:
//       no in-memory SORT stage, and skip/limit walk the index.
//  - Pagination total: countDocuments({ user }) -> uses the `user` prefix.
//  - Admin views one user's notes: same query shape as above.
//
// Not indexed on purpose:
//  - GET/PATCH/DELETE a single note: findOne({ _id, user }) -> _id index
//    finds at most one document; the `user` check is applied to that one doc.
//  - Admin lists ALL notes, newest first: sort({ _id: -1 }) -> _id index.
//  - A separate { user: 1 } index would be redundant: it is a prefix of this one.
noteSchema.index({ user: 1, _id: -1 });

export const Note = model<INote>('Note', noteSchema);
