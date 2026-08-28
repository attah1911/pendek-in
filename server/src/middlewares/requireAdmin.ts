import type { RequestHandler } from 'express';

// Assumes requireAuth ran first and populated req.user.
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
    return;
  }
  next();
};
