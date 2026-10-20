import { dateSchema, limitSchema, pageSchema, z } from '../../lib/zod';

export const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'FAMILY', 'SUITE'] as const;
export const ROOM_STATUSES = ['AVAILABLE', 'UNAVAILABLE'] as const;
export const ROOM_SORTS = ['roomNumber_asc', 'price_asc', 'price_desc', 'name_asc'] as const;

// בטופס עם קובץ (multipart) כל השדות מגיעים כטקסט – לכן משתמשים ב־coerce
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const roomNumber = z.coerce
  .number({ message: 'מספר חדר חייב להיות מספר' })
  .int({ message: 'מספר חדר חייב להיות מספר שלם' })
  .min(1, { message: 'מספר חדר חייב להיות בין 1 ל־9999' })
  .max(9999, { message: 'מספר חדר חייב להיות בין 1 ל־9999' });
const name = z.string({ message: 'יש להזין שם חדר' }).trim().min(2, { message: 'שם החדר חייב להכיל לפחות 2 תווים' }).max(100, { message: 'שם החדר ארוך מדי (עד 100 תווים)' });
const type = z.enum(ROOM_TYPES, { message: 'סוג חדר לא תקין. אפשרויות: SINGLE, DOUBLE, FAMILY, SUITE' });
const pricePerNight = z.coerce
  .number({ message: 'מחיר ללילה חייב להיות מספר' })
  .positive({ message: 'מחיר ללילה חייב להיות גדול מ־0' })
  .max(100000, { message: 'מחיר ללילה גבוה מדי' })
  .refine((n) => Math.round(n * 100) === n * 100, { message: 'מחיר יכול לכלול עד 2 ספרות אחרי הנקודה' });
const maxGuests = z.coerce.number({ message: 'מספר אורחים חייב להיות מספר' }).int({ message: 'מספר אורחים חייב להיות מספר שלם' }).min(1, { message: 'מספר אורחים חייב להיות בין 1 ל־10' }).max(10, { message: 'מספר אורחים חייב להיות בין 1 ל־10' });
const floor = z.coerce.number({ message: 'קומה חייבת להיות מספר' }).int({ message: 'קומה חייבת להיות מספר שלם' }).min(0, { message: 'קומה חייבת להיות בין 0 ל־100' }).max(100, { message: 'קומה חייבת להיות בין 0 ל־100' });
const description = z.string().trim().max(1000, { message: 'התיאור ארוך מדי (עד 1000 תווים)' });
const status = z.enum(ROOM_STATUSES, { message: 'סטטוס לא תקין. אפשרויות: AVAILABLE, UNAVAILABLE' });

export const createRoomSchema = z.object({
  roomNumber,
  name,
  type,
  pricePerNight,
  maxGuests,
  floor,
  description: z.preprocess(emptyToUndefined, description.optional()),
  status: z.preprocess(emptyToUndefined, status.default('AVAILABLE')),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

// בעדכון כל השדות רשות. description ריק ("") מוחק את התיאור
export const updateRoomSchema = z.object({
  roomNumber: z.preprocess(emptyToUndefined, roomNumber.optional()),
  name: z.preprocess(emptyToUndefined, name.optional()),
  type: z.preprocess(emptyToUndefined, type.optional()),
  pricePerNight: z.preprocess(emptyToUndefined, pricePerNight.optional()),
  maxGuests: z.preprocess(emptyToUndefined, maxGuests.optional()),
  floor: z.preprocess(emptyToUndefined, floor.optional()),
  description: description.optional(),
  status: z.preprocess(emptyToUndefined, status.optional()),
});
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const listRoomsQuery = z
  .object({
    checkIn: dateSchema.optional(),
    checkOut: dateSchema.optional(),
    type: type.optional(),
    minPrice: z.coerce.number({ message: 'מחיר מינימלי חייב להיות מספר' }).min(0).optional(),
    maxPrice: z.coerce.number({ message: 'מחיר מקסימלי חייב להיות מספר' }).min(0).optional(),
    guests: z.coerce.number({ message: 'מספר אורחים חייב להיות מספר' }).int().min(1).max(10).optional(),
    search: z.string().trim().max(100).optional(),
    status: status.optional(),
    sort: z.enum(ROOM_SORTS, { message: `מיון לא תקין. אפשרויות: ${ROOM_SORTS.join(', ')}` }).default('roomNumber_asc'),
    page: pageSchema,
    limit: limitSchema,
  })
  .refine((q) => !!q.checkIn === !!q.checkOut, { path: ['checkOut'], message: 'לסינון לפי תאריכים יש לשלוח גם checkIn וגם checkOut' })
  .refine((q) => !q.checkIn || !q.checkOut || q.checkOut > q.checkIn, { path: ['checkOut'], message: 'תאריך היציאה חייב להיות אחרי תאריך הכניסה' })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, { path: ['maxPrice'], message: 'מחיר מקסימלי חייב להיות גדול או שווה למחיר המינימלי' });
export type ListRoomsQuery = z.infer<typeof listRoomsQuery>;
