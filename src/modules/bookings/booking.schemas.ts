import { dateSchema, limitSchema, pageSchema, uuidSchema, z } from '../../lib/zod';

export const BOOKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const MY_BOOKING_SORTS = ['createdAt_desc', 'createdAt_asc', 'checkIn_asc', 'checkIn_desc'] as const;
export const ADMIN_BOOKING_SORTS = ['status', ...MY_BOOKING_SORTS] as const;
export const MAX_NIGHTS = 30;
export const MAX_DAYS_AHEAD = 365;

const statusEnum = z.enum(BOOKING_STATUSES, { message: 'סטטוס לא תקין. אפשרויות: PENDING, APPROVED, REJECTED' });
const optionalText = (max: number, msg: string) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max, { message: msg }).optional());

export const createBookingSchema = z
  .object({
    roomId: uuidSchema,
    checkIn: dateSchema,
    checkOut: dateSchema,
    phone: z
      .string({ message: 'יש להזין מספר טלפון' })
      .trim()
      .regex(/^\+?[0-9][0-9\- ]{7,18}[0-9]$/, { message: 'מספר טלפון לא תקין (לדוגמה: 050-1234567)' }),
    guestName: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().min(2, { message: 'שם האורח חייב להכיל לפחות 2 תווים' }).max(100, { message: 'שם האורח ארוך מדי' }).optional(),
    ),
    notes: optionalText(500, 'ההערות ארוכות מדי (עד 500 תווים)'),
  })
  .refine((b) => b.checkOut > b.checkIn, { path: ['checkOut'], message: 'תאריך היציאה חייב להיות אחרי תאריך הכניסה' });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const myBookingsQuery = z.object({
  status: statusEnum.optional(),
  sort: z.enum(MY_BOOKING_SORTS, { message: `מיון לא תקין. אפשרויות: ${MY_BOOKING_SORTS.join(', ')}` }).default('createdAt_desc'),
  page: pageSchema,
  limit: limitSchema,
});
export type MyBookingsQuery = z.infer<typeof myBookingsQuery>;

export const adminBookingsQuery = z
  .object({
    status: statusEnum.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    roomId: uuidSchema.optional(),
    search: z.string().trim().max(100).optional(),
    sort: z.enum(ADMIN_BOOKING_SORTS, { message: `מיון לא תקין. אפשרויות: ${ADMIN_BOOKING_SORTS.join(', ')}` }).default('status'),
    page: pageSchema,
    limit: limitSchema,
  })
  .refine((q) => !q.from || !q.to || q.to >= q.from, { path: ['to'], message: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה' });
export type AdminBookingsQuery = z.infer<typeof adminBookingsQuery>;

export const decideBookingSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { message: 'יש לשלוח status עם הערך APPROVED (אישור) או REJECTED (דחייה)' }),
});
export type DecideBookingInput = z.infer<typeof decideBookingSchema>;
