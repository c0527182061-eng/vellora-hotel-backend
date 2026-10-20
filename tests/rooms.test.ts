import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { api, createRoom, createUser, day, resetDb, tinyPng } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const roomForm = { roomNumber: '501', name: 'סוויטת בדיקה', type: 'SUITE', pricePerNight: '1200.50', maxGuests: '4', floor: '5', description: 'תיאור' };

function postRoom(auth: Record<string, string>, fields: Record<string, string>, image?: { buf: Buffer; name: string }) {
  let req = api().post('/api/rooms').set(auth);
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  if (image) req = req.attach('image', image.buf, image.name);
  return req;
}

describe('GET /api/rooms – צפייה ציבורית', () => {
  it('מבקר רואה רק חדרים זמינים', async () => {
    await createRoom({ roomNumber: 1, status: 'AVAILABLE' });
    await createRoom({ roomNumber: 2, status: 'UNAVAILABLE' });
    const res = await api().get('/api/rooms');
    expect(res.status).toBe(200);
    expect(res.body.items.map((r: { roomNumber: number }) => r.roomNumber)).toEqual([1]);
    expect(res.body.total).toBe(1);
  });

  it('לקוח שמבקש status=UNAVAILABLE עדיין לא רואה חדרים לא זמינים', async () => {
    await createRoom({ roomNumber: 2, status: 'UNAVAILABLE' });
    const { auth } = await createUser('CUSTOMER');
    const res = await api().get('/api/rooms?status=UNAVAILABLE').set(auth);
    expect(res.body.items).toHaveLength(0);
  });

  it('מנהל רואה הכול ויכול לסנן לפי סטטוס', async () => {
    await createRoom({ roomNumber: 1 });
    await createRoom({ roomNumber: 2, status: 'UNAVAILABLE' });
    const { auth } = await createUser('ADMIN');
    expect((await api().get('/api/rooms').set(auth)).body.total).toBe(2);
    const filtered = await api().get('/api/rooms?status=UNAVAILABLE').set(auth);
    expect(filtered.body.items.map((r: { roomNumber: number }) => r.roomNumber)).toEqual([2]);
  });

  it('Token לא תקין במסלול ציבורי – ממשיך כמבקר', async () => {
    await createRoom({ roomNumber: 1 });
    const res = await api().get('/api/rooms').set('Authorization', 'Bearer broken');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('סינון לפי סוג, מחיר, אורחים וחיפוש בשם', async () => {
    await createRoom({ roomNumber: 1, type: 'SINGLE', pricePerNight: 300, maxGuests: 1, name: 'חדר יחיד' });
    await createRoom({ roomNumber: 2, type: 'FAMILY', pricePerNight: 800, maxGuests: 5, name: 'חדר משפחתי גן' });
    await createRoom({ roomNumber: 3, type: 'FAMILY', pricePerNight: 950, maxGuests: 6, name: 'חדר משפחתי גדול' });
    const nums = async (qs: string) => (await api().get(`/api/rooms?${qs}`)).body.items.map((r: { roomNumber: number }) => r.roomNumber);
    expect(await nums('type=FAMILY')).toEqual([2, 3]);
    expect(await nums('minPrice=400&maxPrice=900')).toEqual([2]);
    expect(await nums('guests=6')).toEqual([3]);
    expect(await nums(`search=${encodeURIComponent('גן')}`)).toEqual([2]);
  });

  it('מיון לפי מחיר ועימוד', async () => {
    await createRoom({ roomNumber: 1, pricePerNight: 500 });
    await createRoom({ roomNumber: 2, pricePerNight: 900 });
    await createRoom({ roomNumber: 3, pricePerNight: 300 });
    const res = await api().get('/api/rooms?sort=price_desc&limit=2&page=1');
    expect(res.body.items.map((r: { pricePerNight: number }) => r.pricePerNight)).toEqual([900, 500]);
    expect(res.body).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    const page2 = await api().get('/api/rooms?sort=price_desc&limit=2&page=2');
    expect(page2.body.items.map((r: { pricePerNight: number }) => r.pricePerNight)).toEqual([300]);
  });

  it('סינון לפי תאריכים מסתיר חדרים תפוסים (ממתין ומאושר) אבל לא נדחה', async () => {
    const { user } = await createUser('CUSTOMER');
    const free = await createRoom({ roomNumber: 1 });
    const pending = await createRoom({ roomNumber: 2 });
    const rejected = await createRoom({ roomNumber: 3 });
    const base = { userId: user.id, nights: 3, totalPrice: 1500, pricePerNight: 500, guestName: 'אורח', phone: '0501234567' };
    await prisma.booking.create({ data: { ...base, roomId: pending.id, roomNumber: 2, roomName: 'x', checkIn: new Date(`${day(10)}T00:00:00Z`), checkOut: new Date(`${day(13)}T00:00:00Z`), status: 'PENDING' } });
    await prisma.booking.create({ data: { ...base, roomId: rejected.id, roomNumber: 3, roomName: 'x', checkIn: new Date(`${day(10)}T00:00:00Z`), checkOut: new Date(`${day(13)}T00:00:00Z`), status: 'REJECTED' } });

    const overlapping = await api().get(`/api/rooms?checkIn=${day(12)}&checkOut=${day(15)}`);
    expect(overlapping.body.items.map((r: { id: string }) => r.id).sort()).toEqual([free.id, rejected.id].sort());

    // יציאה ביום שמישהו אחר נכנס – לא נחשב חפיפה
    const touching = await api().get(`/api/rooms?checkIn=${day(13)}&checkOut=${day(14)}`);
    expect(touching.body.total).toBe(3);
  });

  it('תאריכים לא תקינים בסינון => 400', async () => {
    expect((await api().get(`/api/rooms?checkIn=${day(5)}`)).status).toBe(400);
    expect((await api().get(`/api/rooms?checkIn=${day(5)}&checkOut=${day(3)}`)).status).toBe(400);
    expect((await api().get('/api/rooms?checkIn=2026-02-30&checkOut=2026-03-02')).status).toBe(400);
    expect((await api().get(`/api/rooms?checkIn=${day(-2)}&checkOut=${day(1)}`)).status).toBe(400);
    expect((await api().get('/api/rooms?sort=bad')).status).toBe(400);
  });
});

describe('GET /api/rooms/:id', () => {
  it('מחזיר חדר זמין', async () => {
    const room = await createRoom({ roomNumber: 7, pricePerNight: 610.5 });
    const res = await api().get(`/api/rooms/${room.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: room.id, roomNumber: 7, pricePerNight: 610.5, imageUrl: null });
    expect(res.body.imageKey).toBeUndefined();
  });

  it('חדר לא זמין – 404 למבקר, 200 למנהל', async () => {
    const room = await createRoom({ status: 'UNAVAILABLE' });
    expect((await api().get(`/api/rooms/${room.id}`)).status).toBe(404);
    const { auth } = await createUser('ADMIN');
    expect((await api().get(`/api/rooms/${room.id}`).set(auth)).status).toBe(200);
  });

  it('מזהה לא תקין => 400, מזהה שלא קיים => 404', async () => {
    expect((await api().get('/api/rooms/123')).status).toBe(400);
    expect((await api().get('/api/rooms/7f3d1c2a-1111-4222-8333-944455556666')).status).toBe(404);
  });
});

describe('POST /api/rooms – הוספת חדר', () => {
  it('מנהל מוסיף חדר עם תמונה', async () => {
    const { auth } = await createUser('ADMIN');
    const res = await postRoom(auth, roomForm, { buf: tinyPng, name: 'room.png' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ roomNumber: 501, name: 'סוויטת בדיקה', type: 'SUITE', pricePerNight: 1200.5, maxGuests: 4, floor: 5, status: 'AVAILABLE' });
    expect(res.body.imageUrl).toMatch(/^http:\/\/localhost:4000\/uploads\/rooms\/.+\.png$/);
    const key = res.body.imageUrl.split('/uploads/')[1];
    expect(fs.existsSync(path.resolve('.test-uploads', key))).toBe(true);
    // התמונה נגישה בכתובת שהוחזרה
    const img = await api().get(`/uploads/${key}`);
    expect(img.status).toBe(200);
  });

  it('אפשר להוסיף גם בלי תמונה, ב־JSON', async () => {
    const { auth } = await createUser('ADMIN');
    const res = await api().post('/api/rooms').set(auth).send({ roomNumber: 10, name: 'חדר', type: 'DOUBLE', pricePerNight: 400, maxGuests: 2, floor: 1 });
    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toBeNull();
  });

  it('לקוח => 403, מבקר => 401', async () => {
    const { auth } = await createUser('CUSTOMER');
    expect((await postRoom(auth, roomForm)).status).toBe(403);
    expect((await postRoom({}, roomForm)).status).toBe(401);
    expect(await prisma.room.count()).toBe(0);
  });

  it('שדות לא תקינים => 400', async () => {
    const { auth } = await createUser('ADMIN');
    const res = await postRoom(auth, { ...roomForm, type: 'PALACE', pricePerNight: '-5', maxGuests: '20', roomNumber: 'abc' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['type', 'pricePerNight', 'maxGuests', 'roomNumber']));
  });

  it('קובץ שאינו תמונה => 400 ולא נשמר דבר', async () => {
    const { auth } = await createUser('ADMIN');
    const res = await postRoom(auth, roomForm, { buf: Buffer.from('hello, I am text'), name: 'fake.png' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('image');
    expect(await prisma.room.count()).toBe(0);
  });

  it('תמונה גדולה מ־5MB => 413', async () => {
    const { auth } = await createUser('ADMIN');
    const big = Buffer.concat([tinyPng, Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const res = await postRoom(auth, roomForm, { buf: big, name: 'big.png' });
    expect(res.status).toBe(413);
  });

  it('מספר חדר כפול => 409', async () => {
    const { auth } = await createUser('ADMIN');
    await createRoom({ roomNumber: 501 });
    const res = await postRoom(auth, roomForm);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_NUMBER_TAKEN');
  });
});

describe('PATCH /api/rooms/:id – עריכת חדר', () => {
  it('מנהל מעדכן שדות וסטטוס', async () => {
    const { auth } = await createUser('ADMIN');
    const room = await createRoom({ roomNumber: 20 });
    const res = await api().patch(`/api/rooms/${room.id}`).set(auth).field('pricePerNight', '777').field('status', 'UNAVAILABLE');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ pricePerNight: 777, status: 'UNAVAILABLE', roomNumber: 20 });
  });

  it('החלפת תמונה מוחקת את הישנה', async () => {
    const { auth } = await createUser('ADMIN');
    const created = await postRoom(auth, roomForm, { buf: tinyPng, name: 'a.png' });
    const oldKey = created.body.imageUrl.split('/uploads/')[1];
    const res = await api().patch(`/api/rooms/${created.body.id}`).set(auth).attach('image', tinyPng, 'b.png');
    expect(res.status).toBe(200);
    const newKey = res.body.imageUrl.split('/uploads/')[1];
    expect(newKey).not.toBe(oldKey);
    expect(fs.existsSync(path.resolve('.test-uploads', oldKey))).toBe(false);
    expect(fs.existsSync(path.resolve('.test-uploads', newKey))).toBe(true);
  });

  it('description ריק מוחק את התיאור', async () => {
    const { auth } = await createUser('ADMIN');
    const room = await prisma.room.create({ data: { roomNumber: 30, name: 'חדר', type: 'SINGLE', pricePerNight: 100, maxGuests: 1, floor: 0, description: 'ישן' } });
    const res = await api().patch(`/api/rooms/${room.id}`).set(auth).send({ description: '' });
    expect(res.body.description).toBeNull();
  });

  it('בלי שדות => 400; חדר לא קיים => 404; לקוח => 403', async () => {
    const admin = await createUser('ADMIN');
    const customer = await createUser('CUSTOMER');
    const room = await createRoom();
    expect((await api().patch(`/api/rooms/${room.id}`).set(admin.auth).send({})).status).toBe(400);
    expect((await api().patch('/api/rooms/7f3d1c2a-1111-4222-8333-944455556666').set(admin.auth).send({ name: 'חדש' })).status).toBe(404);
    expect((await api().patch(`/api/rooms/${room.id}`).set(customer.auth).send({ name: 'חדש' })).status).toBe(403);
  });

  it('שינוי למספר חדר קיים => 409', async () => {
    const { auth } = await createUser('ADMIN');
    await createRoom({ roomNumber: 40 });
    const room = await createRoom({ roomNumber: 41 });
    const res = await api().patch(`/api/rooms/${room.id}`).set(auth).send({ roomNumber: 40 });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/rooms/:id – מחיקת חדר', () => {
  async function addBooking(roomId: string, userId: string, from: number, to: number, status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return prisma.booking.create({
      data: {
        userId, roomId, roomNumber: 1, roomName: 'חדר', pricePerNight: 500, nights: to - from, totalPrice: 500 * (to - from),
        checkIn: new Date(`${day(from)}T00:00:00Z`), checkOut: new Date(`${day(to)}T00:00:00Z`), guestName: 'אורח', phone: '0501234567', status,
      },
    });
  }

  it('חסום כשיש הזמנה ממתינה או מאושרת עתידית', async () => {
    const admin = await createUser('ADMIN');
    const customer = await createUser('CUSTOMER');
    const room = await createRoom();
    await addBooking(room.id, customer.user.id, 5, 7, 'PENDING');
    const res = await api().delete(`/api/rooms/${room.id}`).set(admin.auth);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_HAS_ACTIVE_BOOKINGS');
    expect(await prisma.room.count()).toBe(1);
  });

  it('חסום גם כשהאורח נמצא בחדר עכשיו', async () => {
    const admin = await createUser('ADMIN');
    const customer = await createUser('CUSTOMER');
    const room = await createRoom();
    await addBooking(room.id, customer.user.id, -1, 2, 'APPROVED');
    expect((await api().delete(`/api/rooms/${room.id}`).set(admin.auth)).status).toBe(409);
  });

  it('מותר כשיש רק הזמנות שהסתיימו או נדחו – וההיסטוריה נשמרת', async () => {
    const admin = await createUser('ADMIN');
    const customer = await createUser('CUSTOMER');
    const created = await postRoom(admin.auth, roomForm, { buf: tinyPng, name: 'a.png' });
    const key = created.body.imageUrl.split('/uploads/')[1];
    const past = await addBooking(created.body.id, customer.user.id, -10, -7, 'APPROVED');
    await addBooking(created.body.id, customer.user.id, 5, 7, 'REJECTED');

    const res = await api().delete(`/api/rooms/${created.body.id}`).set(admin.auth);
    expect(res.status).toBe(204);
    expect(await prisma.room.count()).toBe(0);
    expect(fs.existsSync(path.resolve('.test-uploads', key))).toBe(false);

    const history = await api().get(`/api/bookings/${past.id}`).set(customer.auth);
    expect(history.status).toBe(200);
    expect(history.body.room).toMatchObject({ id: null, roomNumber: 1, name: 'חדר', deleted: true, imageUrl: null });
  });

  it('לקוח => 403; חדר לא קיים => 404', async () => {
    const admin = await createUser('ADMIN');
    const customer = await createUser('CUSTOMER');
    const room = await createRoom();
    expect((await api().delete(`/api/rooms/${room.id}`).set(customer.auth)).status).toBe(403);
    expect((await api().delete('/api/rooms/7f3d1c2a-1111-4222-8333-944455556666').set(admin.auth)).status).toBe(404);
  });
});
