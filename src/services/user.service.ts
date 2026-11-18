import mongoose from 'mongoose';
import { Note } from '../models/Note';
import { Post } from '../models/Post';
import { User, UserDocument } from '../models/User';
import { AppError } from '../utils/AppError';
import { buildPagination, PaginationQuery } from '../utils/pagination';
import { CreateUserInput, UpdateUserInput } from '../validators/user.validator';

export function createUser(input: CreateUserInput) {
  return User.create({
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role,
    interests: input.interests,
  });
}

export async function listUsers(query: PaginationQuery) {
  const [users, total] = await Promise.all([
    User.find()
      .sort({ _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .select('-__v')
      .lean(),
    User.estimatedDocumentCount(),
  ]);
  return { users, pagination: buildPagination(query, total) };
}

export async function getUser(id: string) {
  const user = await User.findById(id);
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export async function updateUser(actor: UserDocument, id: string, input: UpdateUserInput) {
  if (actor.id === id && input.role && input.role !== actor.role) {
    throw new AppError(400, 'You cannot change your own role');
  }

  const user = await getUser(id);
  user.set(input);
  await user.save();
  return user;
}

export async function deleteUser(actor: UserDocument, id: string) {
  if (actor.id === id) {
    throw new AppError(400, 'You cannot delete your own account');
  }

  await mongoose.connection.transaction(async (session) => {
    const user = await User.findByIdAndDelete(id, { session });
    if (!user) throw new AppError(404, 'User not found');
    await Note.deleteMany({ user: user._id }, { session });
    await Post.deleteMany({ user: user._id }, { session });
  });
}
