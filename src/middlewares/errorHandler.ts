import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Invalid JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }

  // Unknown error: log it, but never leak details in production
  console.error(err);
  res.status(500).json({
    success: false,
    message: env.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
}
