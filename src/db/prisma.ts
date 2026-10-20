import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env';

// חיבור אחד למסד הנתונים לכל השרת
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, max: env.DATABASE_POOL_MAX });

export const prisma = new PrismaClient({ adapter });
