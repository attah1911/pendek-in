import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { analyticsQuerySchema, shortCodeParamSchema } from '../validators/urls';
import { shortUrlFor } from '../lib/shortUrl';
import * as analyticsService from '../services/analyticsService';

export const analyticsRouter = Router();

// Must be registered before /:shortCode so "summary" isn't read as a short code.
analyticsRouter.get('/summary', requireAuth, async (req, res) => {
  res.json(await analyticsService.getAggregate(req.user!.id));
});

analyticsRouter.get('/:shortCode', requireAuth, async (req, res) => {
  const { shortCode } = shortCodeParamSchema.parse(req.params);
  const { range } = analyticsQuerySchema.parse(req.query);
  const data = await analyticsService.getUrlAnalytics(shortCode, req.user!, range);
  res.json({ ...data, shortUrl: shortUrlFor(req, data.shortCode) });
});
