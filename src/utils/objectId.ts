import { Types } from 'mongoose';
import { AppError } from './AppError';

export function toObjectId(id: string): Types.ObjectId {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new AppError(400, 'Invalid id');
  return new Types.ObjectId(id);
}
