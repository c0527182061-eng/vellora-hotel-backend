import { prisma } from '../../db/prisma';
import { hashPassword } from '../../lib/auth';
import { conflict } from '../../lib/errors';
import { Prisma, type Role } from '../../generated/prisma/client';
import type { NewUserInput } from '../../lib/zod';

// השדות היחידים של משתמש שמוחזרים ב־API – בלי passwordHash
export const publicUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

/** יצירת משתמש (לקוח או מנהל). אימייל קיים => 409 */
export async function createUser(input: Omit<NewUserInput, 'confirmPassword'>, role: Role): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: { fullName: input.fullName, email: input.email, passwordHash, role },
      select: publicUserSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('EMAIL_TAKEN', 'כתובת האימייל כבר רשומה במערכת');
    }
    throw err;
  }
}
