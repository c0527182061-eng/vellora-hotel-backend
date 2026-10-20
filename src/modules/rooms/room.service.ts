import { prisma } from '../../db/prisma';
import { formatDate, parseDate, todayInHotel } from '../../lib/dates';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { Prisma, type Room } from '../../generated/prisma/client';
import { imageUrl, removeImageQuietly, storage, type UploadInput } from '../../storage';
import type { CreateRoomInput, ListRoomsQuery, UpdateRoomInput } from './room.schemas';

// הזמנה "פעילה" = ממתינה או מאושרת, שתאריך היציאה שלה עוד לא עבר
export const BLOCKING_STATUSES = ['PENDING', 'APPROVED'] as const;

export function toRoomDto(room: Room) {
  return {
    id: room.id,
    roomNumber: room.roomNumber,
    name: room.name,
    type: room.type,
    pricePerNight: room.pricePerNight.toNumber(),
    maxGuests: room.maxGuests,
    floor: room.floor,
    description: room.description,
    imageUrl: imageUrl(room.imageKey),
    status: room.status,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}
export type RoomDto = ReturnType<typeof toRoomDto>;

/** נועל את החדר עד סוף הטרנזקציה – מונע מצב ששתי בקשות מתנגשות עוברות בו־זמנית */
export async function lockRoom(tx: Prisma.TransactionClient, roomId: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${roomId}))) AS l`;
}

const duplicateRoomNumber = () => conflict('ROOM_NUMBER_TAKEN', 'מספר החדר כבר קיים במערכת');

export async function listRooms(q: ListRoomsQuery, asAdmin: boolean) {
  const where: Prisma.RoomWhereInput = {};

  // מבקרים ולקוחות רואים רק חדרים זמינים. רק מנהל יכול לסנן לפי סטטוס
  if (!asAdmin) where.status = 'AVAILABLE';
  else if (q.status) where.status = q.status;

  if (q.type) where.type = q.type;
  if (q.guests) where.maxGuests = { gte: q.guests };
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.pricePerNight = { ...(q.minPrice !== undefined && { gte: q.minPrice }), ...(q.maxPrice !== undefined && { lte: q.maxPrice }) };
  }
  if (q.search) where.name = { contains: q.search, mode: 'insensitive' };

  if (q.checkIn && q.checkOut) {
    const checkIn = parseDate(q.checkIn);
    const checkOut = parseDate(q.checkOut);
    if (checkIn < todayInHotel()) throw badRequest('הנתונים שנשלחו אינם תקינים', [{ field: 'checkIn', message: 'תאריך הכניסה לא יכול להיות בעבר' }]);
    // רק חדרים שאין להם הזמנה ממתינה/מאושרת שחופפת לתאריכים
    where.bookings = { none: { status: { in: [...BLOCKING_STATUSES] }, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } } };
  }

  const orderBy: Prisma.RoomOrderByWithRelationInput[] = {
    roomNumber_asc: [{ roomNumber: 'asc' as const }],
    price_asc: [{ pricePerNight: 'asc' as const }, { roomNumber: 'asc' as const }],
    price_desc: [{ pricePerNight: 'desc' as const }, { roomNumber: 'asc' as const }],
    name_asc: [{ name: 'asc' as const }, { roomNumber: 'asc' as const }],
  }[q.sort];

  const [items, total] = await Promise.all([
    prisma.room.findMany({ where, orderBy, skip: (q.page - 1) * q.limit, take: q.limit }),
    prisma.room.count({ where }),
  ]);

  return { items: items.map(toRoomDto), page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) };
}

export async function getRoom(id: string, asAdmin: boolean) {
  const room = await prisma.room.findUnique({ where: { id } });
  // חדר לא זמין מוסתר לגמרי ממי שאינו מנהל
  if (!room || (!asAdmin && room.status !== 'AVAILABLE')) throw notFound('החדר לא נמצא');
  return toRoomDto(room);
}

export async function createRoom(input: CreateRoomInput, image?: UploadInput) {
  const imageKey = image ? await storage.upload(image) : null;
  try {
    const room = await prisma.room.create({ data: { ...input, description: input.description ?? null, imageKey } });
    return toRoomDto(room);
  } catch (err) {
    await removeImageQuietly(imageKey);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw duplicateRoomNumber();
    throw err;
  }
}

export async function updateRoom(id: string, input: UpdateRoomInput, image?: UploadInput) {
  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) throw notFound('החדר לא נמצא');

  const data: Prisma.RoomUpdateInput = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) (data as Record<string, unknown>)[key] = value;
  }
  if (input.description !== undefined) data.description = input.description === '' ? null : input.description;
  if (Object.keys(data).length === 0 && !image) {
    throw badRequest('לא נשלחו שדות לעדכון', [{ field: 'body', message: 'יש לשלוח לפחות שדה אחד או תמונה חדשה' }]);
  }

  const newKey = image ? await storage.upload(image) : null;
  if (newKey) data.imageKey = newKey;
  try {
    const room = await prisma.room.update({ where: { id }, data });
    if (newKey) await removeImageQuietly(existing.imageKey); // התמונה הישנה כבר לא בשימוש
    return toRoomDto(room);
  } catch (err) {
    await removeImageQuietly(newKey);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw duplicateRoomNumber();
    throw err;
  }
}

export async function deleteRoom(id: string) {
  const deleted = await prisma.$transaction(async (tx) => {
    await lockRoom(tx, id);
    const room = await tx.room.findUnique({ where: { id } });
    if (!room) throw notFound('החדר לא נמצא');

    const today = todayInHotel();
    const active = await tx.booking.findFirst({
      where: { roomId: id, status: { in: [...BLOCKING_STATUSES] }, checkOut: { gt: today } },
      orderBy: { checkIn: 'asc' },
    });
    if (active) {
      throw conflict(
        'ROOM_HAS_ACTIVE_BOOKINGS',
        `לא ניתן למחוק את החדר: יש לו הזמנה פעילה (${formatDate(active.checkIn)} עד ${formatDate(active.checkOut)}). אפשר לסמן אותו כ"לא זמין" במקום.`,
      );
    }
    // ההזמנות הישנות נשארות בהיסטוריה (roomId מתרוקן, פרטי החדר שמורים בהזמנה)
    await tx.room.delete({ where: { id } });
    return room;
  });
  await removeImageQuietly(deleted.imageKey);
}
