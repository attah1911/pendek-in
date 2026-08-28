import { Router } from 'express';
import { redirectLimiter } from '../middlewares/rateLimiter';
import { AppError } from '../lib/errors';
import { shortCodeParamSchema } from '../validators/urls';
import * as urlService from '../services/urlService';
import * as clickService from '../services/clickService';

export const redirectRouter = Router();

// A short link is opened directly in a browser, so a dead one gets a styled HTML page, not JSON.
function linkErrorPage(title: string, message: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; background: #0C0C0E; color: #EAEAEC;
    font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px; }
  h1 { margin: 0; font-size: 1.5rem; }
  p { margin: 0; color: #8A8A96; font-size: .9rem; }
  a { margin-top: 8px; color: #6E6BF0; text-decoration: none; font-size: .9rem; }
</style></head>
<body><h1>${title}</h1><p>${message}</p></body></html>`;
}

// ponytail: 302 not 301 — a cached 301 would never re-hit the server and click analytics would flatline.
redirectRouter.get('/:shortCode', redirectLimiter, async (req, res) => {
  const { shortCode } = shortCodeParamSchema.parse(req.params);

  try {
    const { id, originalUrl } = await urlService.getByShortCode(shortCode);
    void clickService.record(id, req).catch((err) => {
      console.error('failed to record click', err);
    });
    res.redirect(302, originalUrl);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 404) {
      res.status(404).type('html').send(linkErrorPage('Link not found.', 'This short link does not exist.'));
      return;
    }
    if (err instanceof AppError && err.statusCode === 410) {
      res
        .status(410)
        .type('html')
        .send(linkErrorPage('Link unavailable.', 'This link has expired or been deactivated.'));
      return;
    }
    throw err;
  }
});
