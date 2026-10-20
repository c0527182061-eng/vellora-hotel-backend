import 'dotenv/config';
import { z } from 'zod';

// כל ההגדרות של השרת מגיעות ממשתני סביבה, ונבדקות כאן פעם אחת בעלייה
const bool = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL חסר'),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET חייב להכיל לפחות 32 תווים'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    HOTEL_TIMEZONE: z.string().default('Asia/Jerusalem'),
    PUBLIC_SERVER_URL: z.string().optional(),

    STORAGE_PROVIDER: z.enum(['r2', 'cloudinary', 'local']).default('local'),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER: z.string().default('vellora-hotel'),
    LOCAL_UPLOAD_DIR: z.string().default('uploads'),

    INITIAL_ADMIN_EMAIL: z.string().optional(),
    INITIAL_ADMIN_PASSWORD: z.string().optional(),
    INITIAL_ADMIN_NAME: z.string().default('מנהל המלון'),
    SEED_DEMO_ROOMS: bool,
    RATE_LIMIT_DISABLED: bool,
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_PROVIDER === 'r2') {
      for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'] as const) {
        if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${key} חסר (נדרש כש־STORAGE_PROVIDER=r2)` });
      }
    }
    if (env.STORAGE_PROVIDER === 'cloudinary') {
      for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const) {
        if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${key} חסר (נדרש כש־STORAGE_PROVIDER=cloudinary)` });
      }
    }
    if (env.NODE_ENV === 'production' && env.CORS_ORIGINS.trim() === '*') {
      ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'בפרודקשן יש להגדיר כתובות מפורשות ב־CORS_ORIGINS' });
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  // הודעה ברורה במקום קריסה לא מובנת
  console.error(`\n❌ הגדרות סביבה שגויות:\n${lines.join('\n')}\n\nבדקי את קובץ .env או את משתני הסביבה ב־Render.\n`);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);
