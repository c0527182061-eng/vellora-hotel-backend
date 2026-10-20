import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../generated/prisma/client';

const BCRYPT_ROUNDS = env.NODE_ENV === 'test' ? 4 : 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type TokenPayload = { sub: string; role: Role };

export function signToken(userId: string, role: Role): string {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/** מחזיר את המזהה מתוך ה־Token, או זורק שגיאה אם ה־Token לא תקין / פג תוקף */
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { sub: decoded.sub, role: decoded.role as Role };
}
