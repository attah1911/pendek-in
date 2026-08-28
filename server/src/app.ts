import 'express-async-errors';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { env } from './config/env';
import { AppError } from './lib/errors';
import { authRouter } from './routes/auth';
import { urlsRouter } from './routes/urls';
import { analyticsRouter } from './routes/analytics';
import { adminRouter } from './routes/admin';
import { redirectRouter } from './routes/redirect';

export const app = express();

// Deploys sit behind exactly one proxy (Railway/Render) — needed for correct req.ip in rate limiters.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/urls', urlsRouter);
app.use('/analytics', analyticsRouter);
app.use('/admin', adminRouter);

// Redirect is the catch-all short-code resolver — must stay last so it never shadows a real route.
app.use(redirectRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request', code: 'VALIDATION_ERROR' });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
};
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});
