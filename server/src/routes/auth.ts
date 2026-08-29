import { Router, type CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env, isProd } from '../config/env';
import { AppError } from '../lib/errors';
import { requireAuth } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimiter';
import { loginSchema, registerSchema } from '../validators/auth';

export const authRouter = Router();

const TOKEN_COOKIE = 'token';

// Attributes shared by the set- and clear-cookie calls — they must match or the browser
// keeps the cookie. maxAge belongs only on the set call: res.clearCookie ignores it (and
// warns) since its job is to expire the cookie immediately.
const cookieBase: CookieOptions = {
  httpOnly: true,
  // sameSite:'none' is only honoured with Secure — force it on regardless of NODE_ENV.
  secure: isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
};

// ponytail: maxAge pinned to the JWT_EXPIRES_IN default (7d); if you change that env var, update this too.
const cookieOptions: CookieOptions = { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 };

const invalidCredentials = new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

authRouter.post('/register', authLimiter, async (req, res) => {
  const { email, password } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  await prisma.user.create({ data: { email, password: passwordHash }, select: { id: true } });

  res.status(201).json({ message: 'Account created' });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true, role: true, banned: true },
  });
  if (!user) throw invalidCredentials;
  if (user.banned) throw new AppError(403, 'ACCOUNT_BANNED', 'This account has been suspended');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw invalidCredentials;

  const token = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });

  res.cookie(TOKEN_COOKIE, token, cookieOptions);
  res.json({ user: { id: user.id, email: user.email, role: user.role } });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(TOKEN_COOKIE, cookieBase);
  res.json({ message: 'Logged out' });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, role: true },
  });
  if (!user) throw new AppError(401, 'INVALID_SESSION', 'Session user no longer exists');

  res.json({ user });
});
