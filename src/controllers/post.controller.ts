import { Request, Response } from 'express';
import * as postService from '../services/post.service';
import { toObjectId } from '../utils/objectId';
import { paginationSchema } from '../utils/pagination';

export async function createPost(req: Request, res: Response) {
  const post = await postService.createPost(req.user!._id, req.body);
  res.status(201).json({ success: true, data: post });
}

export async function listPosts(req: Request, res: Response) {
  const query = paginationSchema.parse(req.query);
  const { posts, pagination } = await postService.listPosts(query);
  res.json({ success: true, data: posts, pagination });
}

export async function getUserPosts(req: Request<{ id: string }>, res: Response) {
  const query = paginationSchema.parse(req.query);
  const { user, posts, pagination } = await postService.getUserPosts(toObjectId(req.params.id), query);
  res.json({ success: true, data: { user, posts }, pagination });
}
