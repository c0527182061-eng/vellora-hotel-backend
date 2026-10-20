import { z } from 'zod';
import { isValidDateString } from './dates';

// הודעות שגיאה של Zod בעברית
z.config(z.locales.he());

export { z };

export const uuidSchema = z.uuid({ message: 'מזהה לא תקין' });
export const idParams = z.object({ id: uuidSchema });

export const emailSchema = z
  .string({ message: 'יש להזין אימייל' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'כתובת אימייל לא תקינה' }).max(255, { message: 'כתובת האימייל ארוכה מדי' }));

export const passwordSchema = z
  .string({ message: 'יש להזין סיסמה' })
  .min(8, { message: 'הסיסמה חייבת להכיל לפחות 8 תווים' })
  .max(72, { message: 'הסיסמה ארוכה מדי (עד 72 תווים)' })
  .regex(/[A-Za-z]/, { message: 'הסיסמה חייבת להכיל לפחות אות אחת באנגלית' })
  .regex(/[0-9]/, { message: 'הסיסמה חייבת להכיל לפחות ספרה אחת' });

export const fullNameSchema = z
  .string({ message: 'יש להזין שם מלא' })
  .trim()
  .min(2, { message: 'השם חייב להכיל לפחות 2 תווים' })
  .max(100, { message: 'השם ארוך מדי (עד 100 תווים)' });

export const dateSchema = z
  .string({ message: 'יש להזין תאריך' })
  .refine(isValidDateString, { message: 'תאריך לא תקין. הפורמט הנדרש: YYYY-MM-DD' });

export const pageSchema = z.coerce.number().int().min(1, { message: 'מספר העמוד חייב להיות 1 ומעלה' }).default(1);
export const limitSchema = z.coerce.number().int().min(1).max(50, { message: 'אפשר לבקש עד 50 פריטים בעמוד' }).default(10);

/** טופס עם סיסמה ואימות סיסמה – הרשמה והוספת מנהל */
export const newUserSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ message: 'יש להזין אימות סיסמה' }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'הסיסמאות אינן תואמות' });
export type NewUserInput = z.infer<typeof newUserSchema>;
