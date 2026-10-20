import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { hashPassword } from '../lib/auth';
import { emailSchema, passwordSchema } from '../lib/zod';
import { demoRooms } from './demoData';

/**
 * יצירת המנהל הראשון בעליית השרת – בלי סיסמאות קבועות בקוד.
 * פועל רק אם הוגדרו INITIAL_ADMIN_EMAIL ו־INITIAL_ADMIN_PASSWORD, ורק אם המשתמש עוד לא קיים.
 */
export async function ensureInitialAdmin(): Promise<void> {
  if (!env.INITIAL_ADMIN_EMAIL || !env.INITIAL_ADMIN_PASSWORD) return;

  const email = emailSchema.safeParse(env.INITIAL_ADMIN_EMAIL);
  const password = passwordSchema.safeParse(env.INITIAL_ADMIN_PASSWORD);
  if (!email.success || !password.success) {
    console.warn('⚠️  INITIAL_ADMIN_EMAIL או INITIAL_ADMIN_PASSWORD לא תקינים (סיסמה: 8 תווים לפחות, אות וספרה). המנהל לא נוצר.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: email.data } });
  if (existing) return;

  await prisma.user.create({
    data: { email: email.data, fullName: env.INITIAL_ADMIN_NAME, role: 'ADMIN', passwordHash: await hashPassword(password.data) },
  });
  console.log(`👤 נוצר מנהל ראשון: ${email.data}`);
}

/** חדרי הדגמה – רק אם SEED_DEMO_ROOMS=true ורק אם אין עדיין אף חדר */
export async function ensureDemoRooms(): Promise<void> {
  if (!env.SEED_DEMO_ROOMS) return;
  if ((await prisma.room.count()) > 0) return;
  await prisma.room.createMany({ data: demoRooms });
  console.log(`🛏️  נוספו ${demoRooms.length} חדרי הדגמה`);
}
