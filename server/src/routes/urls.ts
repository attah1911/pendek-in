import { Router, type RequestHandler } from 'express';
import { optionalAuth, requireAuth } from '../middlewares/auth';
import { shortenGuestLimiter, shortenUserLimiter } from '../middlewares/rateLimiter';
import { createUrlSchema, urlIdParamSchema } from '../validators/urls';
import { shortUrlFor } from '../lib/shortUrl';
import * as urlService from '../services/urlService';

export const urlsRouter = Router();

// Both guest and user paths are rate-limited; the user's identity only decides which bucket.
const pickShortenLimiter: RequestHandler = (req, res, next) => {
  const limiter = req.user ? shortenUserLimiter : shortenGuestLimiter;
  limiter(req, res, next);
};

urlsRouter.post('/', optionalAuth, pickShortenLimiter, async (req, res) => {
  const body = createUrlSchema.parse(req.body);
  const created = await urlService.create({
    originalUrl: body.originalUrl,
    alias: body.alias,
    expiresAt: body.expiresAt,
    userId: req.user?.id,
  });

  res.status(201).json({ shortUrl: shortUrlFor(req, created.shortCode), shortCode: created.shortCode });
});

urlsRouter.get('/', requireAuth, async (req, res) => {
  const urls = await urlService.listByUser(req.user!.id);
  res.json({ urls });
});

urlsRouter.delete('/:id', requireAuth, async (req, res) => {
  const { id } = urlIdParamSchema.parse(req.params);
  await urlService.deleteById(id, req.user!.id);
  res.json({ message: 'Link deleted' });
});
