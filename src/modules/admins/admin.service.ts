import { prisma } from '../../db/prisma';
import type { NewUserInput } from '../../lib/zod';
import { createUser, publicUserSelect } from '../users/user.service';

export function listAdmins() {
  return prisma.user.findMany({ where: { role: 'ADMIN' }, select: publicUserSelect, orderBy: { createdAt: 'asc' } });
}

export function createAdmin(input: NewUserInput) {
  return createUser(input, 'ADMIN');
}
