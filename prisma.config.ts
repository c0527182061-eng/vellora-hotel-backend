import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// הגדרות Prisma: מיקום הסכמה, ה־Migrations, קובץ ה־Seed וכתובת מסד הנתונים
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // לא זורקים שגיאה אם חסר – כך `prisma generate` עובד גם בשלב ה־Build בלי מסד נתונים
    url: process.env.DATABASE_URL ?? '',
  },
});
