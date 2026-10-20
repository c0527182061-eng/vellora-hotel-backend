import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { requireAuth } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as controller from './auth.controller';
import { loginSchema, registerSchema } from './auth.schemas';

// הגבלת ניסיונות: מגן מפני ניחוש סיסמאות
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.RATE_LIMIT_DISABLED || env.NODE_ENV === 'test',
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'יותר מדי ניסיונות. נסי שוב בעוד כמה דקות' } },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
authRouter.get('/me', requireAuth, controller.me);
