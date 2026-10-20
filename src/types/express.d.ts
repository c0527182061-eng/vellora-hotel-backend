import type { Role } from '../generated/prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** המשתמש המחובר – נקבע רק לפי ה־Token */
      user?: { id: string; role: Role; fullName: string; email: string };
      /** נתונים אחרי ולידציה של Zod */
      valid: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}

export {};
