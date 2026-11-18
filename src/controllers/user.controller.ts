import { Request, Response } from 'express';

export function getMe(req: Request, res: Response) {
  res.json({ success: true, data: req.user });
}
