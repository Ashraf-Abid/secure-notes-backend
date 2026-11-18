import { Schema, model, Types } from 'mongoose';

// Posts are public (visible to everyone), unlike Notes which are private.
export interface IPost {
  user: Types.ObjectId;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
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

// Compound index { user, _id desc } supports the "posts of a user" aggregation:
//   users.aggregate([ { $match: { _id } },
//                     { $lookup: { from: 'posts', localField: '_id',
//                                  foreignField: 'user', ... sort _id desc } } ])
//  - $lookup runs an equality match on posts.user (the foreignField).
//    Without this index every lookup is a full scan of the posts collection.
//  - The `_id: -1` suffix returns that user's posts newest-first straight from
//    the index, so the sort/skip/limit inside the lookup need no in-memory sort.
//
// Not indexed on purpose:
//  - Public list of all posts, newest first: sort({ _id: -1 }) -> _id index.
postSchema.index({ user: 1, _id: -1 });

export const Post = model<IPost>('Post', postSchema);
