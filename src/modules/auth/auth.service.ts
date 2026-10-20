import { prisma } from '../../db/prisma';
import { hashPassword, signToken, verifyPassword } from '../../lib/auth';
import { notFound, unauthorized } from '../../lib/errors';
import type { NewUserInput } from '../../lib/zod';
import { createUser, publicUserSelect } from '../users/user.service';
import type { LoginInput } from './auth.schemas';

// Hash קבוע להשוואה כשהמשתמש לא קיים – כדי שזמן התגובה לא יגלה אילו אימיילים רשומים
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword('not-a-real-password-0'));

/** הרשמה של לקוח חדש. תמיד נוצר כ־CUSTOMER */
export async function register(input: NewUserInput) {
  const user = await createUser(input, 'CUSTOMER');
  return { token: signToken(user.id, user.role), user };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw unauthorized('אימייל או סיסמה שגויים');
  const { passwordHash: _omit, updatedAt: _u, ...rest } = user;
  return { token: signToken(user.id, user.role), user: rest };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw notFound('המשתמש לא נמצא');
  return user;
}
