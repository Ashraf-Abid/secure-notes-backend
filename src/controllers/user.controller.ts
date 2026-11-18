import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { paginationSchema } from '../utils/pagination';
import { interestGroupsQuerySchema } from '../validators/user.validator';

export function getMe(req: Request, res: Response) {
  res.json({ success: true, data: req.user });
}

export async function createUser(req: Request, res: Response) {
  const user = await userService.createUser(req.body);
  res.status(201).json({ success: true, data: user });
}

export async function listUsers(req: Request, res: Response) {
  const query = paginationSchema.parse(req.query);
  const { users, pagination } = await userService.listUsers(query);
  res.json({ success: true, data: users, pagination });
}

export async function getUsersGroupedByInterests(req: Request, res: Response) {
  const query = interestGroupsQuerySchema.parse(req.query);
  const { groups, pagination } = await userService.getUsersGroupedByInterests(query);
  res.json({ success: true, data: groups, pagination });
}

export async function getUser(req: Request<{ id: string }>, res: Response) {
  const user = await userService.getUser(req.params.id);
  res.json({ success: true, data: user });
}

export async function updateUser(req: Request<{ id: string }>, res: Response) {
  const user = await userService.updateUser(req.user!, req.params.id, req.body);
  res.json({ success: true, data: user });
}

export async function deleteUser(req: Request<{ id: string }>, res: Response) {
  await userService.deleteUser(req.user!, req.params.id);
  res.json({ success: true, message: 'User deleted' });
}
