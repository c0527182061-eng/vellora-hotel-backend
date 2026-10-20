import { emailSchema, newUserSchema, z } from '../../lib/zod';

export const registerSchema = newUserSchema;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ message: 'יש להזין סיסמה' }).min(1, { message: 'יש להזין סיסמה' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
