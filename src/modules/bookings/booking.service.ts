import { prisma } from '../../db/prisma';
import { addDays, formatDate, nightsBetween, parseDate, todayInHotel } from '../../lib/dates';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { Prisma } from '../../generated/prisma/client';
import { imageUrl } from '../../storage';
import { BLOCKING_STATUSES, lockRoom } from '../rooms/room.service';
import {
  MAX_DAYS_AHEAD,
  MAX_NIGHTS,
  type AdminBookingsQuery,
  type CreateBookingInput,
  type DecideBookingInput,
  type MyBookingsQuery,
} from './booking.schemas';

const bookingInclude = {
  room: { select: { id: true, roomNumber: true, name: true, type: true, imageKey: true, maxGuests: true, floor: true } },
  user: { select: { id: true, fullName: true, email: true } },
  decidedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.BookingInclude;

type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export function toBookingDto(b: BookingWithRelations) {
  return {
    id: b.id,
    status: b.status,
    checkIn: formatDate(b.checkIn),
    checkOut: formatDate(b.checkOut),
    nights: b.nights,
    pricePerNight: b.pricePerNight.toNumber(),
    totalPrice: b.totalPrice.toNumber(),
    guestName: b.guestName,
    phone: b.phone,
    notes: b.notes,
    // פרטי החדר: אם החדר נמחק – מוחזרים הפרטים שנשמרו בהזמנה, בלי תמונה
    room: {
      id: b.room?.id ?? null,
      roomNumber: b.room?.roomNumber ?? b.roomNumber,
      name: b.room?.name ?? b.roomName,
      type: b.room?.type ?? null,
      maxGuests: b.room?.maxGuests ?? null,
      floor: b.room?.floor ?? null,
      imageUrl: imageUrl(b.room?.imageKey),
      deleted: !b.room,
    },
    customer: b.user,
    decidedBy: b.decidedBy,
    decidedAt: b.decidedAt,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}
export type BookingDto = ReturnType<typeof toBookingDto>;

const sortMap: Record<string, Prisma.BookingOrderByWithRelationInput[]> = {
  status: [{ status: 'asc' }, { createdAt: 'desc' }], // ממתינות קודם
  createdAt_desc: [{ createdAt: 'desc' }],
  createdAt_asc: [{ createdAt: 'asc' }],
  checkIn_asc: [{ checkIn: 'asc' }, { createdAt: 'asc' }],
  checkIn_desc: [{ checkIn: 'desc' }, { createdAt: 'desc' }],
};

/** שליחת בקשת הזמנה. הלקוח נקבע לפי ה־Token בלבד */
export async function createBooking(user: { id: string; fullName: string }, input: CreateBookingInput) {
  const checkIn = parseDate(input.checkIn);
  const checkOut = parseDate(input.checkOut);
  const today = todayInHotel();
  const nights = nightsBetween(checkIn, checkOut);

  const dateErrors = [];
  if (checkIn < today) dateErrors.push({ field: 'checkIn', message: 'תאריך הכניסה לא יכול להיות בעבר' });
  if (checkIn > addDays(today, MAX_DAYS_AHEAD)) dateErrors.push({ field: 'checkIn', message: 'אפשר להזמין עד שנה קדימה' });
  if (nights > MAX_NIGHTS) dateErrors.push({ field: 'checkOut', message: `אפשר להזמין עד ${MAX_NIGHTS} לילות` });
  if (dateErrors.length) throw badRequest('הנתונים שנשלחו אינם תקינים', dateErrors);

  const booking = await prisma.$transaction(async (tx) => {
    // נעילה: שתי בקשות לאותו חדר מטופלות אחת אחרי השנייה, ולא יחד
    await lockRoom(tx, input.roomId);

    const room = await tx.room.findUnique({ where: { id: input.roomId } });
    if (!room || room.status !== 'AVAILABLE') throw notFound('החדר לא נמצא או שאינו זמין להזמנה');

    const overlap = await tx.booking.findFirst({
      where: { roomId: room.id, status: { in: [...BLOCKING_STATUSES] }, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
      select: { id: true },
    });
    if (overlap) throw conflict('ROOM_NOT_AVAILABLE_FOR_DATES', 'החדר כבר תפוס בחלק מהתאריכים שנבחרו. נסי תאריכים אחרים');

    return tx.booking.create({
      data: {
        userId: user.id,
        roomId: room.id,
        roomNumber: room.roomNumber,
        roomName: room.name,
        pricePerNight: room.pricePerNight,
        checkIn,
        checkOut,
        nights,
        totalPrice: room.pricePerNight.mul(nights),
        guestName: input.guestName ?? user.fullName,
        phone: input.phone,
        notes: input.notes ?? null,
      },
      include: bookingInclude,
    });
  });

  return toBookingDto(booking);
}

async function paginate(where: Prisma.BookingWhereInput, sort: string, page: number, limit: number) {
  const [items, total] = await Promise.all([
    prisma.booking.findMany({ where, include: bookingInclude, orderBy: sortMap[sort], skip: (page - 1) * limit, take: limit }),
    prisma.booking.count({ where }),
  ]);
  return { items: items.map(toBookingDto), page, limit, total, totalPages: Math.ceil(total / limit) };
}

/** ההזמנות של הלקוח המחובר בלבד */
export function listMyBookings(userId: string, q: MyBookingsQuery) {
  return paginate({ userId, ...(q.status && { status: q.status }) }, q.sort, q.page, q.limit);
}

/** כל ההזמנות – למנהל */
export function listAllBookings(q: AdminBookingsQuery) {
  const where: Prisma.BookingWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.roomId) where.roomId = q.roomId;
  // הזמנות שהשהות שלהן חופפת לטווח from–to (כולל)
  if (q.from) where.checkOut = { gt: parseDate(q.from) };
  if (q.to) where.checkIn = { lte: parseDate(q.to) };
  if (q.search) {
    const contains = { contains: q.search, mode: 'insensitive' as const };
    where.OR = [{ guestName: contains }, { user: { fullName: contains } }, { user: { email: contains } }];
  }
  return paginate(where, q.sort, q.page, q.limit);
}

/** לקוח רואה רק הזמנה שלו (הזמנה של אחר => 404, כדי לא לחשוף שהיא קיימת). מנהל רואה הכול */
export async function getBooking(id: string, viewer: { id: string; role: string }) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking || (viewer.role !== 'ADMIN' && booking.userId !== viewer.id)) throw notFound('ההזמנה לא נמצאה');
  return toBookingDto(booking);
}

/** אישור או דחייה של בקשה ממתינה. ההחלטה סופית */
export async function decideBooking(id: string, adminId: string, input: DecideBookingInput) {
  // עדכון מותנה: מצליח רק אם ההזמנה עדיין ממתינה – כך שני מנהלים לא יכולים להחליט בו־זמנית
  const result = await prisma.booking.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: input.status, decidedById: adminId, decidedAt: new Date() },
  });
  if (result.count === 0) {
    const existing = await prisma.booking.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw notFound('ההזמנה לא נמצאה');
    const label = existing.status === 'APPROVED' ? 'אושרה' : 'נדחתה';
    throw conflict('BOOKING_ALREADY_DECIDED', `ההזמנה כבר ${label}. אי אפשר לשנות החלטה`);
  }
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id }, include: bookingInclude });
  return toBookingDto(booking);
}
