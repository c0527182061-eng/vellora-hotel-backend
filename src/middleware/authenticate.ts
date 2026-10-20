import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { verifyToken } from '../lib/auth';
import { forbidden, unauthorized } from '../lib/errors';
import type { Role } from '../generated/prisma/client';

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return '';
  return token;
}

async function loadUser(token: string) {
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return null;
  }
  // טוענים את המשתמש ממסד הנתונים – כך תפקיד מעודכן תמיד, ומשתמש שנמחק לא נכנס
  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, fullName: true, email: true },
  });
}

/** מחייב Token תקין. ללא Token או עם Token לא תקין => 401 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (token === null) return next(unauthorized('נדרשת התחברות. יש לשלוח Authorization: Bearer <token>'));
  if (token === '') return next(unauthorized('כותרת Authorization לא תקינה. הפורמט הנכון: Bearer <token>'));
  const user = await loadUser(token);
  if (!user) return next(unauthorized('ה־Token לא תקין או שפג תוקפו. יש להתחבר מחדש'));
  req.user = user;
  next();
}

/**
 * למסלולים ציבוריים: אם נשלח Token תקין – מזהים את המשתמש (למשל מנהל רואה יותר).
 * אם ה־Token חסר או לא תקין – ממשיכים כמבקר רגיל, בלי שגיאה.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (token) {
    const user = await loadUser(token);
    if (user) req.user = user;
  }
  next();
}

/** מחייב תפקיד מסוים. מחובר בלי הרשאה => 403 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export const isAdmin = (req: Request) => req.user?.role === 'ADMIN';
