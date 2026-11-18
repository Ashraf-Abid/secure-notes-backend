import { Types } from 'mongoose';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { buildPagination, PaginationQuery } from '../utils/pagination';
import { CreatePostInput } from '../validators/post.validator';

export function createPost(userId: Types.ObjectId, input: CreatePostInput) {
  return Post.create({ user: userId, title: input.title, content: input.content });
}

export async function listPosts(query: PaginationQuery) {
  const [posts, total] = await Promise.all([
    Post.find()
      .sort({ _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .select('-__v')
      .populate('user', 'name')
      .lean(),
    Post.estimatedDocumentCount(),
  ]);
  return { posts, pagination: buildPagination(query, total) };
}

export async function getUserPosts(userId: Types.ObjectId, query: PaginationQuery) {
  const [result] = await User.aggregate([
    { $match: { _id: userId } },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'user',
        pipeline: [
          { $sort: { _id: -1 } },
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          { $project: { title: 1, content: 1, createdAt: 1, updatedAt: 1 } },
        ],
        as: 'posts',
      },
    },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'user',
        pipeline: [{ $count: 'count' }],
        as: 'postCount',
      },
    },
    {
      $project: {
        user: { _id: '$_id', name: '$name' },
        posts: 1,
        total: { $ifNull: [{ $first: '$postCount.count' }, 0] },
      },
    },
  ]);

  if (!result) throw new AppError(404, 'User not found');
  return {
    user: result.user,
    posts: result.posts,
    pagination: buildPagination(query, result.total),
  };
}
