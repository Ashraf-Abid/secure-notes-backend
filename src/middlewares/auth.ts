import { NextFunction, Request, Response } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required');
  }

  let userId: string | undefined;
  try {
    userId = verifyToken(header.slice(7)).sub;
  } catch (err) {
    throw new AppError(401, err instanceof TokenExpiredError ? 'Token expired' : 'Invalid token');
  }

  const user = userId ? await User.findById(userId) : null;
  if (!user) {
    throw new AppError(401, 'User no longer exists');
  }

  req.user = user;
  next();
}
