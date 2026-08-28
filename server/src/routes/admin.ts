import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/requireAdmin';
import { AppError } from '../lib/errors';
import { addBlacklistSchema, idParamSchema } from '../validators/admin';
import * as adminService from '../services/adminService';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', async (_req, res) => {
  res.json({ users: await adminService.listUsers() });
});

adminRouter.post('/users/:id/ban', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  if (id === req.user!.id) {
    throw new AppError(400, 'CANNOT_BAN_SELF', 'You cannot ban your own account');
  }
  await adminService.banUser(id);
  res.json({ message: 'User banned' });
});

adminRouter.get('/links', async (_req, res) => {
  res.json({ links: await adminService.listUrls() });
});

adminRouter.post('/links/:id/deactivate', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await adminService.deactivateUrl(id);
  res.json({ message: 'Link deactivated' });
});

adminRouter.post('/links/:id/reactivate', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await adminService.reactivateUrl(id);
  res.json({ message: 'Link reactivated' });
});

adminRouter.post('/blacklist', async (req, res) => {
  const { domain, reason } = addBlacklistSchema.parse(req.body);
  const entry = await adminService.addToBlacklist(domain, reason);
  res.status(201).json({ blacklist: entry });
});

adminRouter.get('/stats', async (_req, res) => {
  res.json(await adminService.getGlobalStats());
});
